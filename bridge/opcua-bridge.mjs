/*
 * NE      : Yerel OPC UA <-> WebSocket KOPRUSU + OTOMATIK CIHAZ KESFI. Gercek SMC AMS cihazindan (opc.tcp) okur, tarayicidaki
 *           uygulamaya (ws) JSON aktarir; ayrica agdaki cihazi KENDISI bulur (subnet tarama + getEndpoints) ve dugumleri tahmin eder (browse).
 * NEDEN   : Tarayici dogrudan opc.tcp konusamaz. Mehmet Abi: "kullaniciyi 'su adresi yaz, su node'u gir' diye UGRASTIRMA - kabloyu
 *           taksin, cihazi BIZ bulalim." Personel IP/endpoint/nodeId yazmadan, "Cihazi Bul" -> sec -> "Canli Moda Gec" yapsin.
 * NASIL   : (a) handleAppConnection(socket): app baglaninca {type:'connect'|'setMode'|'setSettings'|'discover'|'browse'} mesajlarini isler.
 *           (b) discoverDevices(): yerel IPv4 /24 subnet'i OPC UA portlarindan (4840 vb.) TCP tarar -> acik olanlara getEndpoints -> dogrulanan
 *               OPC UA sunucularini dondurur. (c) browseNodeHints(): cihaza baglanip adres uzayini gezerek flow/pressure/temperature/humidity
 *               dugumlerini ISIMDEN tahmin eder (TR+EN). Hepsi zaman-kutulu (timeout) + maxRetry:0 -> takilmaz.
 * YAN ETKI: OFFLINE - tamamen yerel (kesif yalniz LAN'i tarar, internet yok). WS 0.0.0.0'da dinler (LAN ACIK - Mehmet Abi onayi: telefon de baglanir; guvenilir saha agi varsayimi).
 *           Cihaz olmadan da app calisir; bulamazsa kullanici elle girebilir (kilavuz korunur).
 *
 * !! UYARLANABILIR: Node kimlikleri UYGULAMADAN (Kilavuz) gelir; koddan elle degistirme GEREKMEZ. Uygulama gondermezse asagidaki
 *    DEFAULT_NODE_IDS (placeholder) kullanilir. Kesif portlari/desenleri gercek cihaz ozelligine gore daraltilabilir (bkz OPCUA_PORTS, HINT_PATTERNS).
 */
import net from 'node:net'
import os from 'node:os'
import { WebSocketServer } from 'ws'
import { OPCUAClient, AttributeIds, DataType, BrowseDirection, NodeClass, MessageSecurityMode, SecurityPolicy } from 'node-opcua'

const WS_HOST = '0.0.0.0' // LAN ACIK (Mehmet Abi onayi): ayni Wi-Fi'daki telefon/tablet de PC'deki kopruye baglanip CANLI veri gorur + set ayari yapar. GUVENLIK: guvenilir saha agi varsayilir (ayni agdaki cihazlar cihaza yazabilir).
const WS_PORT = 4841
const POLL_MS = 200 // cihaz okuma araligi (uygulamadaki akisla uyumlu)
const MAX_ERR = 4 // ardisik okuma hatasi tavani -> yeniden baglan (gecici tek hatada titreme/log spam yok)

// Kesifte denenecek OPC UA portlari. 4840 = IANA varsayilani (cogu cihaz). Digerleri yaygin (guvenli/uretici varyantlari).
// Gercek AMS portu netlesince burayi tek porta indirmek taramayi hizlandirir.
// GENIS port listesi: cihazin OPC UA portu standart 4840 olmayabilir (Mehmet Abi sahada ":5..." gordu).
// 5xxx + yaygin uretici portlari eklendi -> "Cihazi Otomatik Bul" non-standart portu da yakalar.
const OPCUA_PORTS = [4840, 4843, 4855, 48010, 48020, 49320, 51210, 53530, 62541, 5000, 5001, 50000]

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

// Dugum ISIMDEN tahmin desenleri (TR+EN). Cihazin browseName/displayName'i bunlara uyarsa o olcume atanir.
const HINT_PATTERNS = {
  flow: /(flow|debi|ak[ıi][şs]|t[üu]ket|m3|nm3|sm3)/i,
  pressure: /(press|bas[ıi]n[çc]|bar(?![a-z])|kpa|mpa)/i,
  temperature: /(temp|s[ıi]cakl|deg.?c|celsius|°c)/i,
  humidity: /(humid|nem|moist|\brh\b)/i,
  mode: /(\bmode\b|\bmod\b|durum|state|status)/i,
}

// --- yardimcilar -----------------------------------------------------------

// Bir promise'i zaman-kutula (cihaz cevap vermezse sonsuza kadar beklemesin)
function withTimeout(promise, ms, label = 'timeout') {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(label)), ms)
    promise.then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
  })
}

// Tek host:port'a kisa TCP baglanti denemesi (acik mi?) - tarama bunun uzerine kurulur
function tcpProbe(host, port, timeout = 350) {
  return new Promise((resolve) => {
    const sock = new net.Socket()
    let done = false
    const finish = (ok) => { if (done) return; done = true; try { sock.destroy() } catch {} ; resolve(ok) }
    sock.setTimeout(timeout)
    sock.once('connect', () => finish(true))
    sock.once('timeout', () => finish(false))
    sock.once('error', () => finish(false))
    try { sock.connect(port, host) } catch { finish(false) }
  })
}

// Yerel (internal olmayan) IPv4 arayuzlerinden /24 subnet adaylari cikar (LAN'da en yaygin maske).
function localSubnets() {
  const out = []
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal && typeof ni.address === 'string') {
        const p = ni.address.split('.')
        if (p.length === 4) out.push({ base: `${p[0]}.${p[1]}.${p[2]}`, self: Number(p[3]), address: ni.address })
      }
    }
  }
  return out
}

// Bir endpoint GERCEKTEN OPC UA sunucusu mu? Baglan + getEndpoints -> sunucu adini dondur (degilse null).
async function getEndpointsSafe(endpoint, timeoutMs = 2500) {
  const client = OPCUAClient.create({ endpointMustExist: false, securityMode: MessageSecurityMode.None, securityPolicy: SecurityPolicy.None, connectionStrategy: { maxRetry: 0 } })
  try {
    await withTimeout(client.connect(endpoint), timeoutMs, 'connect-timeout')
    const eps = await withTimeout(client.getEndpoints(), timeoutMs, 'endpoints-timeout')
    const ep0 = Array.isArray(eps) ? eps[0] : null
    const name = ep0?.server?.applicationName?.text || ep0?.server?.applicationUri || null
    return { name }
  } catch {
    return null
  } finally {
    try { await client.disconnect() } catch {}
  }
}

/*
 * OTOMATIK KESIF: yerel agdaki OPC UA cihazlarini bul.
 * 1) Yerel /24 subnet(ler)indeki tum host'lara OPCUA_PORTS'tan TCP dene (parti parti, kisa timeout).
 * 2) Acik bulunanlara getEndpoints ile "sen OPC UA misin?" diye sor; dogrulananlari dondur.
 * onProgress({scanned,total}) ile UI'ye ilerleme bildirir. Toplam ~birkac saniye.
 */
async function discoverDevices({ onProgress } = {}) {
  const subnets = localSubnets()
  const candidates = []
  for (const sn of subnets) {
    for (let h = 1; h <= 254; h++) {
      if (h === sn.self) continue // kendini tarama
      for (const port of OPCUA_PORTS) candidates.push({ host: `${sn.base}.${h}`, port })
    }
  }
  const total = candidates.length
  if (total === 0) return [] // hic LAN arayuzu yok (yalniz loopback) -> bulunacak cihaz yok

  // Asama 1: TCP tarama (parti parti -> ag/soket bogulmaz)
  const openHosts = new Set()
  const BATCH = 128
  let scanned = 0
  for (let i = 0; i < candidates.length; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH)
    const res = await Promise.all(batch.map((c) => tcpProbe(c.host, c.port).then((ok) => ({ ...c, ok }))))
    for (const r of res) if (r.ok) openHosts.add(`${r.host}:${r.port}`)
    scanned += batch.length
    onProgress?.({ scanned, total })
  }

  // Asama 2: OPC UA dogrulama (sirayla; genelde 0-1 aday) -> {endpoint, host, port, name}
  const found = []
  for (const hp of openHosts) {
    const idx = hp.lastIndexOf(':')
    const host = hp.slice(0, idx)
    const port = Number(hp.slice(idx + 1))
    const endpoint = `opc.tcp://${host}:${port}`
    const ok = await getEndpointsSafe(endpoint)
    if (ok) found.push({ endpoint, host, port, name: ok.name || `OPC UA (${host})` })
  }
  return found
}

/*
 * DUGUM TAHMINI: bir cihaza baglanip adres uzayini gezerek (browse) olcum dugumlerini ISIMDEN bul.
 * ObjectsFolder'dan baslayarak sinirli (visited<=500) BFS; degisken (Variable) dugumlerin adi HINT_PATTERNS'a uyarsa atar.
 * Tahmin -> UI Kilavuzu'na onerilir (kullanici onaylar/duzeltir). Bulamazsa {} doner; var olan elle giris korunur.
 */
async function browseNodeHints(endpoint, timeoutMs = 9000) {
  const client = OPCUAClient.create({ endpointMustExist: false, securityMode: MessageSecurityMode.None, securityPolicy: SecurityPolicy.None, connectionStrategy: { maxRetry: 0 } })
  const hints = {}
  try {
    await withTimeout(client.connect(endpoint), timeoutMs, 'connect-timeout')
    const session = await withTimeout(client.createSession(), timeoutMs, 'session-timeout')
    const queue = ['ns=0;i=85'] // ObjectsFolder
    const seen = new Set()
    let visited = 0
    const wantKeys = Object.keys(HINT_PATTERNS)
    while (queue.length && visited < 500) {
      if (wantKeys.every((k) => hints[k])) break // hepsi bulundu -> erken cik
      const nodeId = queue.shift()
      if (seen.has(nodeId)) continue
      seen.add(nodeId); visited++
      let refs
      try {
        const b = await session.browse({
          nodeId,
          referenceTypeId: 'HierarchicalReferences',
          includeSubtypes: true,
          browseDirection: BrowseDirection.Forward,
          resultMask: 63,
        })
        refs = b?.references || []
      } catch { continue }
      for (const ref of refs) {
        const childId = ref.nodeId?.toString?.()
        if (!childId) continue
        const label = ref.displayName?.text || ref.browseName?.name || ''
        if (ref.nodeClass === NodeClass.Variable) {
          for (const key of wantKeys) {
            if (!hints[key] && HINT_PATTERNS[key].test(label)) hints[key] = childId
          }
        } else if (ref.nodeClass === NodeClass.Object && !seen.has(childId)) {
          queue.push(childId)
        }
      }
    }
    try { await session.close() } catch {}
    return hints
  } catch {
    return hints
  } finally {
    try { await client.disconnect() } catch {}
  }
}

// --- app baglantisi (per-socket) -------------------------------------------

/*
 * Bir app (tarayici) baglantisini yonetir. server.mjs (tek-tik) VEYA standalone main() bunu wss'e baglar.
 * Mesajlar: connect / setMode / setSettings / discover / browse. Cihaz okuma dongusu self-scheduling (cakisma yok).
 */
export function handleAppConnection(socket) {
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
    // Guvenlik None + anonim: demo/saha cihazinda en uyumlu (Sign&Encrypt el-sikismasi takilmasin). Cihaz guvenlik
    // isterse yine de baglanamaz ama None cogu yerel OPC UA sunucusunda CALISAN en genis yoldur.
    client = OPCUAClient.create({ endpointMustExist: false, securityMode: MessageSecurityMode.None, securityPolicy: SecurityPolicy.None })
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

    // OTOMATIK KESIF: agi tara, bulunanlari uygulamaya gonder (ilerleme + sonuc). Kesif sirasinda canli okuma bagimsiz.
    if (msg.type === 'discover') {
      send({ type: 'discoverProgress', scanned: 0, total: 0, scanning: true })
      try {
        const devices = await discoverDevices({ onProgress: (p) => send({ type: 'discoverProgress', ...p, scanning: true }) })
        send({ type: 'discovered', devices })
        console.log(`[kopru] kesif bitti: ${devices.length} cihaz`, devices.map((d) => d.endpoint))
      } catch (e) {
        send({ type: 'discovered', devices: [], error: e.message })
      }
      return
    }
    // DUGUM TAHMINI: secilen cihaza baglanip olcum dugumlerini isimden bul, uygulamaya oner
    if (msg.type === 'browse' && msg.endpoint) {
      send({ type: 'nodeHints', hints: {}, browsing: true })
      try {
        const hints = await browseNodeHints(msg.endpoint)
        send({ type: 'nodeHints', hints })
        console.log('[kopru] dugum tahmini:', msg.endpoint, hints)
      } catch (e) {
        send({ type: 'nodeHints', hints: {}, error: e.message })
      }
      return
    }

    if (msg.type === 'connect' && msg.endpoint) {
      // FOOLPROOF: kullanici sadece IP yazsa bile (or. "192.168.1.50") tam endpoint'e cevir; port yoksa :4840 ekle.
      let ep = String(msg.endpoint).trim()
      if (!ep.startsWith('opc.tcp://')) ep = 'opc.tcp://' + ep.replace(/^opc\.tcp:\/\//, '')
      const after = ep.slice('opc.tcp://'.length)
      if (after && !after.includes(':')) ep = ep + ':4840'
      await connectDevice(ep, msg.nodeIds); return
    }
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
}

export { discoverDevices, browseNodeHints, DEFAULT_NODE_IDS, WS_HOST, WS_PORT }

// --- standalone calistirma (geriye uyum) -----------------------------------
// `node opcua-bridge.mjs` ile dogrudan calistirilirsa kendi WS sunucusunu kurar (eski "elle baslatma" yolu korunur).
// Tek-tik paket ise server.mjs uzerinden gelir (o da handleAppConnection'i kullanir + uygulamayi servis eder).
const isMain = (() => {
  try { return import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/')) } catch { return false }
})()
if (isMain) {
  const wss = new WebSocketServer({ host: WS_HOST, port: WS_PORT })
  console.log(`[kopru] WebSocket hazir: ws://${WS_HOST}:${WS_PORT}`)
  wss.on('connection', handleAppConnection)
}
