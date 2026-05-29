/*
 * NE      : CANLI veri kaynagi - gercek SMC AMS cihazindan OPC UA verisini yerel KOPRU uzerinden (WebSocket) okur.
 * NEDEN   : Tarayici dogrudan opc.tcp konusamaz; personelin bilgisayarinda calisan kucuk kopru (bridge/opcua-bridge.mjs)
 *           cihaza node-opcua ile baglanip okumalari WebSocket ile bu uygulamaya JSON olarak aktarir. UI ayni DataSource'u kullanir.
 * NASIL   : start() koprune baglanir (ws://localhost:4841), acilinca cihaz endpoint'ini gonderir; gelen JSON -> Reading.
 *           Otomatik yeniden baglanma; durum connection store'a yazilir (Bagli/Baglaniyor/Baglanti yok). Cihaz yoksa uygulama KIRILMAZ.
 * YAN ETKI: Offline (yerel kopru, internet yok). DemoDataSource ile AYNI sozlesme -> sayfalar degismeden canli veriyi cizer.
 */
import type { DataSource, Mode, Reading } from './types'
import { setConnStatus } from './connection'

const BRIDGE_URL = 'ws://localhost:4841' // personelin bilgisayarindaki yerel OPC UA koprusu
const RECONNECT_MS = 2500

// Cihaz mod bilgisi vermezse debiden kabaca turet (gorsel tutarlilik)
function deriveMode(flow: number, pressure: number): Mode {
  if (pressure < 0.05 || flow < 20) return 'isolation'
  if (flow < 400) return 'standby'
  return 'normal'
}

export class LiveDataSource implements DataSource {
  readonly kind = 'live' as const

  private ws: WebSocket | null = null
  private cb: ((r: Reading) => void) | null = null
  private t0 = 0
  private reconnect: number | null = null
  private closedByUs = false

  constructor(private endpoint: string) {}

  start(onReading: (r: Reading) => void): void {
    this.cb = onReading
    this.t0 = Date.now()
    this.closedByUs = false
    this.open()
  }

  private open(): void {
    setConnStatus('connecting')
    let ws: WebSocket
    try {
      ws = new WebSocket(BRIDGE_URL)
    } catch {
      this.scheduleReconnect()
      return
    }
    this.ws = ws

    ws.onopen = () => {
      // Hangi cihaza baglanilacagini koprune bildir
      try { ws.send(JSON.stringify({ type: 'connect', endpoint: this.endpoint })) } catch { /* yok */ }
    }
    ws.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data as string)
        if (d.type === 'status') {
          setConnStatus(d.connected ? 'connected' : 'connecting')
          return
        }
        // Olcum mesaji
        const flow = Number(d.flow) || 0
        const pressure = Number(d.pressure) || 0
        const reading: Reading = {
          t: Date.now() - this.t0,
          flow,
          pressure,
          temperature: Number(d.temperature) || 0,
          humidity: Number(d.humidity) || 0,
          mode: (d.mode as Mode) ?? deriveMode(flow, pressure),
        }
        setConnStatus('connected')
        this.cb?.(reading)
      } catch {
        /* bozuk mesaj - atla */
      }
    }
    ws.onerror = () => setConnStatus('error')
    ws.onclose = () => {
      this.ws = null
      if (!this.closedByUs) {
        setConnStatus('error')
        this.scheduleReconnect()
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnect !== null) return
    this.reconnect = window.setTimeout(() => {
      this.reconnect = null
      if (!this.closedByUs) this.open()
    }, RECONNECT_MS)
  }

  stop(): void {
    this.closedByUs = true
    if (this.reconnect !== null) { window.clearTimeout(this.reconnect); this.reconnect = null }
    if (this.ws) {
      try { this.ws.close() } catch { /* yok */ }
      this.ws = null
    }
  }

  // Mod secimi cihaza yazilir (kopru OPC UA write yapar)
  setMode(mode: Mode): void {
    try { this.ws?.send(JSON.stringify({ type: 'setMode', mode })) } catch { /* yok */ }
  }
}
