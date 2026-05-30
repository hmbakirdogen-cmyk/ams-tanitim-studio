/*
 * NE      : Yerel OPC UA <-> WebSocket KOPRUSU. Gercek SMC AMS cihazindan (opc.tcp) okur, tarayicidaki uygulamaya (ws) JSON aktarir.
 * NEDEN   : Tarayici dogrudan opc.tcp konusamaz. Personelin bilgisayarinda bu kopru calisir; uygulama ws://localhost:4841'e baglanir,
 *           "Canli Cihaz" modunda gercek debi/basinc/sicaklik/nem buradan gelir. (Uygulama tarafi HAZIR; bu dosya cihaz olunca calistirilir.)
 * NASIL   : ws sunucu (4841). Uygulama {type:'connect', endpoint, nodeIds} gonderir -> node-opcua ile cihaza baglan + dugumleri izle/oku ->
 *           her okumayi {flow,pressure,temperature,humidity} JSON olarak ws'e gonder. {type:'setMode'} -> cihaza yaz (donanim gelince).
 * YAN ETKI: OFFLINE - tamamen yerel (internet yok). Kurulum tek sefer (internetli makinede): `npm i node-opcua ws`. Calistir: `node bridge/opcua-bridge.mjs`.
 *
 * !! UYARLANABILIR: Node kimlikleri artik UYGULAMADAN (Urun Ayarlari > Canli Cihaza Baglanma Kilavuzu) gonderilir -> koddan
 *    elle degistirmeye GEREK YOK. Uygulama gondermezse asagidaki DEFAULT_NODE_IDS (placeholder) kullanilir.
 */
import { WebSocketServer } from 'ws'
import { OPCUAClient, AttributeIds, DataType, TimestampsToReturn } from 'node-opcua'

const WS_PORT = 4841
const POLL_MS = 200 // cihaz okuma araligi (uygulamadaki akisla uyumlu)

// Uygulama gondermezse kullanilacak placeholder node kimlikleri (uyumluluk icin)
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

const wss = new WebSocketServer({ port: WS_PORT })
console.log(`[kopru] WebSocket hazir: ws://localhost:${WS_PORT}`)

wss.on('connection', (socket) => {
  console.log('[kopru] uygulama baglandi')
  let client = null
  let session = null
  let timer = null
  let nodeIds = { ...DEFAULT_NODE_IDS } // uygulamanin gonderdigi (ekrandan girilen) kimliklerle guncellenir

  const send = (obj) => { try { socket.send(JSON.stringify(obj)) } catch {} }

  async function connectDevice(endpoint, ids) {
    await cleanup()
    if (ids) nodeIds = { ...DEFAULT_NODE_IDS, ...ids } // EKRANDAN gelen node kimlikleri (uyarlanabilir)
    send({ type: 'status', connected: false })
    client = OPCUAClient.create({ endpointMustExist: false })
    try {
      await client.connect(endpoint)
      session = await client.createSession()
      send({ type: 'status', connected: true })
      console.log('[kopru] cihaza baglandi:', endpoint, '| node:', nodeIds)
      // HIBRIT: cihazin MEVCUT ayarlarini bir kez OKU → uygulamaya gonder (Urun Ayarlari o degerlerle devam etsin)
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
      // Periyodik oku (basit ve saglam; istenirse subscription'a cevrilebilir)
      timer = setInterval(async () => {
        try {
          const order = [nodeIds.flow, nodeIds.pressure, nodeIds.temperature, nodeIds.humidity]
          const res = await session.read(order.map((nodeId) => ({ nodeId, attributeId: AttributeIds.Value })))
          send({
            flow: res[0]?.value?.value ?? 0,
            pressure: res[1]?.value?.value ?? 0,
            temperature: res[2]?.value?.value ?? 0,
            humidity: res[3]?.value?.value ?? 0,
          })
        } catch (e) {
          console.error('[kopru] okuma hatasi:', e.message)
          send({ type: 'status', connected: false })
        }
      }, POLL_MS)
      void TimestampsToReturn // (subscription'a gecilirse kullanilir)
    } catch (e) {
      console.error('[kopru] baglanti hatasi:', e.message)
      send({ type: 'status', connected: false })
    }
  }

  async function cleanup() {
    if (timer) { clearInterval(timer); timer = null }
    try { if (session) await session.close() } catch {}
    try { if (client) await client.disconnect() } catch {}
    session = null; client = null
  }

  socket.on('message', async (raw) => {
    let msg
    try { msg = JSON.parse(raw.toString()) } catch { return }
    if (msg.type === 'connect' && msg.endpoint) await connectDevice(msg.endpoint, msg.nodeIds)
    else if (msg.type === 'setMode' && session) {
      // Moda gore cihaza yazma (donanim gelince): mode dugumune string yaz. Cihaz tipine gore uyarlanabilir.
      const MODE_CODE = { normal: 0, standby: 1, isolation: 2 }
      try {
        await session.write({
          nodeId: nodeIds.mode,
          attributeId: AttributeIds.Value,
          value: { value: { dataType: DataType.Int16, value: MODE_CODE[msg.mode] ?? 0 } },
        })
        console.log('[kopru] setMode yazildi:', msg.mode)
      } catch (e) {
        console.error('[kopru] setMode yazma hatasi:', e.message)
      }
    }
    else if (msg.type === 'setSettings' && session && msg.settings) {
      // HIBRIT: Urun Ayarlari'nda degisen degerleri cihaza YAZ (donanim gelince). Cihaz tipine gore dataType uyarlanabilir.
      const s = msg.settings
      const writes = []
      if (typeof s.standbyPressure === 'number') writes.push({ nodeId: nodeIds.standbyPressure, attributeId: AttributeIds.Value, value: { value: { dataType: DataType.Double, value: s.standbyPressure } } })
      if (typeof s.standbyThreshold === 'number') writes.push({ nodeId: nodeIds.standbyThreshold, attributeId: AttributeIds.Value, value: { value: { dataType: DataType.Int32, value: Math.round(s.standbyThreshold) } } })
      if (typeof s.autoIsolationSec === 'number') writes.push({ nodeId: nodeIds.autoIsolationSec, attributeId: AttributeIds.Value, value: { value: { dataType: DataType.Int32, value: Math.round(s.autoIsolationSec) } } })
      if (s.valveMode) writes.push({ nodeId: nodeIds.valveMode, attributeId: AttributeIds.Value, value: { value: { dataType: DataType.Int16, value: s.valveMode === 'NO' ? 1 : 0 } } })
      for (const w of writes) { try { await session.write(w) } catch (e) { console.error('[kopru] ayar yazma hatasi:', e.message) } }
      console.log('[kopru] ayarlar cihaza yazildi:', s)
    }
  })

  socket.on('close', async () => { console.log('[kopru] uygulama ayrildi'); await cleanup() })
})
