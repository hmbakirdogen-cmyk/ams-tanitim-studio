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
  })

  socket.on('close', async () => { console.log('[kopru] uygulama ayrildi'); await cleanup() })
})
