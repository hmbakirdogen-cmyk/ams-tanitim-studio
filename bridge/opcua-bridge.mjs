/*
 * NE      : Yerel OPC UA <-> WebSocket KOPRUSU. Gercek SMC AMS cihazindan (opc.tcp) okur, tarayicidaki uygulamaya (ws) JSON aktarir.
 * NEDEN   : Tarayici dogrudan opc.tcp konusamaz. Personelin bilgisayarinda bu kopru calisir; uygulama ws://localhost:4841'e baglanir,
 *           "Canli Cihaz" modunda gercek debi/basinc/sicaklik/nem buradan gelir. (Uygulama tarafi HAZIR; bu dosya cihaz olunca calistirilir.)
 * NASIL   : ws sunucu (4841). Uygulama {type:'connect', endpoint} gonderir -> node-opcua ile cihaza baglan + 4 dugumu (NODE_IDS) izle/oku ->
 *           her okumayi {flow,pressure,temperature,humidity,mode} JSON olarak ws'e gonder. {type:'setMode'} -> cihaza yaz (istege bagli).
 * YAN ETKI: OFFLINE - tamamen yerel (internet yok). Kurulum tek sefer (internetli makinede): `npm i node-opcua ws`. Calistir: `node bridge/opcua-bridge.mjs`.
 *
 * !! CIHAZA GORE AYARLA: Asagidaki NODE_IDS, gercek AMS cihazinin OPC UA adres uzayindaki dugum kimlikleridir.
 *    Cihaza baglanip (UaExpert vb.) dogru NodeId'leri buraya yazin. Ornek degerler placeholder'dir.
 */
import { WebSocketServer } from 'ws'
import { OPCUAClient, AttributeIds, TimestampsToReturn } from 'node-opcua'

const WS_PORT = 4841
const POLL_MS = 200 // cihaz okuma araligi (uygulamadaki akisla uyumlu)

// Cihazin OPC UA dugum kimlikleri - GERCEK CIHAZA GORE GUNCELLENECEK
const NODE_IDS = {
  flow: 'ns=2;s=AMS.FlowRate',
  pressure: 'ns=2;s=AMS.Pressure',
  temperature: 'ns=2;s=AMS.Temperature',
  humidity: 'ns=2;s=AMS.Humidity',
}

const wss = new WebSocketServer({ port: WS_PORT })
console.log(`[kopru] WebSocket hazir: ws://localhost:${WS_PORT}`)

wss.on('connection', (socket) => {
  console.log('[kopru] uygulama baglandi')
  let client = null
  let session = null
  let timer = null

  const send = (obj) => { try { socket.send(JSON.stringify(obj)) } catch {} }

  async function connectDevice(endpoint) {
    await cleanup()
    send({ type: 'status', connected: false })
    client = OPCUAClient.create({ endpointMustExist: false })
    try {
      await client.connect(endpoint)
      session = await client.createSession()
      send({ type: 'status', connected: true })
      console.log('[kopru] cihaza baglandi:', endpoint)
      // Periyodik oku (basit ve saglam; istenirse subscription'a cevrilebilir)
      timer = setInterval(async () => {
        try {
          const ids = Object.values(NODE_IDS)
          const res = await session.read(ids.map((nodeId) => ({ nodeId, attributeId: AttributeIds.Value })))
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
    if (msg.type === 'connect' && msg.endpoint) await connectDevice(msg.endpoint)
    else if (msg.type === 'setMode' && session) {
      // Istege bagli: moda gore cihaza yazma (cihazin yazilabilir dugumune gore uyarlanir)
      console.log('[kopru] setMode istegi:', msg.mode)
    }
  })

  socket.on('close', async () => { console.log('[kopru] uygulama ayrildi'); await cleanup() })
})
