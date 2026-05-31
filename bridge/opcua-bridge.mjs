/*
 * NE      : Yerel OPC UA <-> WebSocket KOPRUSU. Gercek SMC AMS cihazindan (opc.tcp) okur, tarayicidaki uygulamaya (ws) JSON aktarir.
 * NEDEN   : Tarayici dogrudan opc.tcp konusamaz. Personelin bilgisayarinda bu kopru calisir; uygulama ws://localhost:4841'e baglanir,
 *           "Canli Cihaz" modunda gercek debi/basinc/sicaklik/nem buradan gelir. (Uygulama tarafi HAZIR; bu dosya cihaz olunca calistirilir.)
 * NASIL   : ws sunucu (4841, YALNIZ 127.0.0.1 -> agdan yetkisiz cihaz yazimi engellenir). Uygulama {type:'connect', endpoint, nodeIds} gonderir
 *           -> node-opcua ile cihaza baglan + dugumleri KENDINI-ZAMANLAYAN dongu ile oku (cakisma yok) -> {flow,pressure,temperature,humidity}
 *           JSON ws'e gonderilir. {type:'setMode'/'setSettings'} -> cihaza yaz (donanim gelince). Hata/durum uygulamaya net raporlanir.
 * YAN ETKI: OFFLINE - tamamen yerel. Kurulum (internetli makinede, bir kez): bridge/ icinde `npm install`. Calistir: `node bridge/opcua-bridge.mjs`.
 *
 * !! UYARLANABILIR: Node kimlikleri UYGULAMADAN (Urun Ayarlari > Canli Cihaza Baglanma Kilavuzu) gonderilir; koddan elle degistirme GEREKMEZ.
 *    Uygulama gondermezse asagidaki DEFAULT_NODE_IDS (placeholder) kullanilir. mode/ayar DataType'lari da ileride uygulamadan uyarlanabilir.
 */
import { WebSocketServer } from 'ws'
import { OPCUAClient, AttributeIds, DataType } from 'node-opcua'

const WS_HOST = '127.0.0.1' // YALNIZ loopback: kopru + tarayici ayni makinede; agdan erisim/yetkisiz cihaz yazimi engellenir
const WS_PORT = 4841
const POLL_MS = 200 // cihaz okuma araligi (uygulamadaki akisla uyumlu)
const MAX_ERR = 4 // ardisik okuma hatasi tavani -> yeniden baglan (gecici tek hatada titreme/log spam yok)

const DEFAULT_NODE_IDS = {
  flow: 'ns=2;s=AMS.FlowRate',
  pressure: 'ns=2;s=AMS.Pressure',
  temperature: 'ns=2;s=AMS.Temperature',
  humidity: 'ns=2;s=AMS.Humidity',
  mode: 'ns=2;s=AMS.Mode',
  // HIBRIT ayar senkronu (cihazda yoksa okuma/yazma sessizce atlanir)
  standbyPressure: 'ns=2;s=AMS.StandbyPressure',
  standbyThreshold: 'ns=2;s=AMS.StandbyThreshold',
  autoIsolationSec: 'ns=2;s=AMS.AutoIsolationSec',
  valveMode: 'ns=2;s=AMS.ValveMode',
}

const wss = new WebSocketServer({ host: WS_HOST, port: WS_PORT })
console.log(`[kopru] WebSocket hazir: ws://${WS_HOST}:${WS_PORT}`)

wss.on('connection', (socket) => {
  console.log('[kopru] uygulama baglandi')
  let client = null
  let session = null
  let timer = null // self-scheduling setTimeout handle
  let stopped = false // okuma dongusu durdu mu (cleanup sonrasi)
  let nodeIds = { ...DEFAULT_NODE_IDS }

  // ws kapali/kapaniyorsa gonderme (kapanan sokette gereksiz throw yutmayi azalt)
  const send = (obj) => { if (socket.readyState !== socket.OPEN) return; try { socket.send(JSON.stringify(obj)) } catch {} }

  async function connectDevice(endpoint, ids) {
    await cleanup()
    stopped = false
    if (ids) nodeIds = { ...DEFAULT_NODE_IDS, ...ids } // EKRANDAN gelen node kimlikleri (uyarlanabilir)
    send({ type: 'status', connected: false })
    client = OPCUAClient.create({ endpointMustExist: false })
    try {
      await client.connect(endpoint)
      session = await client.createSession()
      send({ type: 'status', connected: true })
      console.log('[kopru] cihaza baglandi:', endpoint, '| node:', nodeIds)
      // HIBRIT: cihazin MEVCUT ayarlarini bir kez OKU -> uygulamaya gonder (Urun Ayarlari o degerlerle devam etsin)
      try {
        const sids = [nodeIds.standbyPressure, nodeIds.standbyThreshold, nodeIds.autoIsolationSec, nodeIds.valveMode]
        const sres = await session.read(sids.map((nodeId) => ({ nodeId, attributeId: AttributeIds.Value })))
        const out = {}
        const sp = Number(sres[0]?.value?.value); if (Number.isFinite(sp)) out.standbyPressure = sp
        const st = Number(sres[1]?.value?.value); if (Number.isFinite(st)) out.standbyThreshold = st
        const ai = Number(sres[2]?.value?.value); if (Number.isFinite(ai)) out.autoIsolationSec = ai
        const vm = Number(sres[3]?.value?.value); if (Number.isFinite(vm)) out.valveMode = vm ? 'NO' : 'NC'
        if (Object.keys(out).length) { send({ type: 'settings', settings: out }); console.log('[kopru] cihaz ayarlari okundu:', out) }
      } catch (e) { console.log('[kopru] ayar dugumleri okunamadi (cihazda yok olabilir):', e.message) }
      // KENDINI-ZAMANLAYAN okuma dongusu: bir okuma BITMEDEN yenisini baslatmaz (async-setInterval cakismasi YOK).
      let errStreak = 0
      const readOnce = async () => {
        if (stopped || !session) return
        try {
          const order = [nodeIds.flow, nodeIds.pressure, nodeIds.temperature, nodeIds.humidity, nodeIds.mode]
          const res = await session.read(order.map((nodeId) => ({ nodeId, attributeId: AttributeIds.Value })))
          // StatusCode kontrolu: Bad/Uncertain dugumu uyari olarak bildir (sessizce 0'a dusurup "kesinti" sanmayalim)
          const good = (r) => !r?.statusCode || r.statusCode.isGood?.() !== false
          const bad = ['flow', 'pressure', 'temperature', 'humidity'].filter((_, i) => !good(res[i]))
          const num = (r) => { const n = Number(r?.value?.value); return Number.isFinite(n) ? n : 0 }
          const out = { flow: num(res[0]), pressure: num(res[1]), temperature: num(res[2]), humidity: num(res[3]) }
          if (res[4]?.value?.value != null) { const m = Number(res[4].value.value); out.mode = m === 2 ? 'isolation' : m === 1 ? 'standby' : 'normal' }
          if (bad.length) out.warning = `Okunamayan dugum(ler): ${bad.join(', ')} (nodeId/StatusCode kontrol edin)`
          send(out)
          errStreak = 0
        } catch (e) {
          errStreak++
          if (errStreak === 1) console.error('[kopru] okuma hatasi:', e.message) // spam yerine yalniz ilk hatada logla
          if (errStreak >= MAX_ERR) {
            console.error(`[kopru] ${MAX_ERR} ardisik hata -> yeniden baglaniliyor`)
            send({ type: 'status', connected: false, error: 'cihaz okunamiyor, yeniden baglaniliyor' })
            void connectDevice(endpoint, ids) // session/client'i kapatip bastan baglan
            return // bu dongu sonlanir (yeni connectDevice taze dongu kurar)
          }
        }
        if (!stopped) timer = setTimeout(readOnce, POLL_MS)
      }
      timer = setTimeout(readOnce, POLL_MS)
    } catch (e) {
      console.error('[kopru] baglanti hatasi:', e.message)
      send({ type: 'status', connected: false, error: `baglanti basarisiz: ${e.message}` })
      await cleanup() // BASARISIZ denemede dangling client kalmasin
    }
  }

  async function cleanup() {
    stopped = true
    // AWAIT'ten ONCE referanslari yakala + null'la -> yeni connectDevice taze alanlarla baslar (race onlenir)
    const s = session, c = client, tm = timer
    session = null; client = null; timer = null
    if (tm) clearTimeout(tm)
    try { if (s) await s.close() } catch {}
    try { if (c) await c.disconnect() } catch {}
  }

  socket.on('message', async (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { return }
    if (msg.type === 'connect' && msg.endpoint) { await connectDevice(msg.endpoint, msg.nodeIds); return }
    // Yazma komutlari: session yoksa SESSIZCE yutma -> uygulamaya hata bildir
    if (msg.type === 'setMode' || msg.type === 'setSettings') {
      if (!session) { send({ type: 'status', error: 'cihaz bagli degil, komut uygulanamadi' }); return }
    }
    if (msg.type === 'setMode') {
      const MODE_CODE = { normal: 0, standby: 1, isolation: 2 } // cihaz tipine gore ileride uyarlanabilir
      try {
        await session.write({ nodeId: nodeIds.mode, attributeId: AttributeIds.Value, value: { value: { dataType: DataType.Int16, value: MODE_CODE[msg.mode] ?? 0 } } })
        console.log('[kopru] setMode yazildi:', msg.mode)
      } catch (e) { console.error('[kopru] setMode yazma hatasi:', e.message); send({ type: 'status', error: `mod yazilamadi: ${e.message}` }) }
    } else if (msg.type === 'setSettings' && msg.settings) {
      const s = msg.settings
      const writes = []
      if (typeof s.standbyPressure === 'number') writes.push({ nodeId: nodeIds.standbyPressure, attributeId: AttributeIds.Value, value: { value: { dataType: DataType.Double, value: s.standbyPressure } } })
      if (typeof s.standbyThreshold === 'number') writes.push({ nodeId: nodeIds.standbyThreshold, attributeId: AttributeIds.Value, value: { value: { dataType: DataType.Int32, value: Math.round(s.standbyThreshold) } } })
      if (typeof s.autoIsolationSec === 'number') writes.push({ nodeId: nodeIds.autoIsolationSec, attributeId: AttributeIds.Value, value: { value: { dataType: DataType.Int32, value: Math.round(s.autoIsolationSec) } } })
      if (s.valveMode) writes.push({ nodeId: nodeIds.valveMode, attributeId: AttributeIds.Value, value: { value: { dataType: DataType.Int16, value: s.valveMode === 'NO' ? 1 : 0 } } })
      let err = null
      for (const w of writes) { try { await session.write(w) } catch (e) { err = e.message; console.error('[kopru] ayar yazma hatasi:', e.message) } }
      if (err) send({ type: 'status', error: `ayar yazilamadi: ${err}` }); else console.log('[kopru] ayarlar cihaza yazildi:', s)
    }
  })

  socket.on('close', async () => { console.log('[kopru] uygulama ayrildi'); await cleanup() })
})
