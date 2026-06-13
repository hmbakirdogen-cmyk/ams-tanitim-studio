/*
 * NE      : CANLI veri kaynagi - gercek SMC AMS cihazindan OPC UA verisini yerel KOPRU uzerinden (WebSocket) okur.
 * NEDEN   : Tarayici dogrudan opc.tcp konusamaz; personelin bilgisayarinda calisan kucuk kopru (bridge/opcua-bridge.mjs)
 *           cihaza node-opcua ile baglanip okumalari WebSocket ile bu uygulamaya JSON olarak aktarir. UI ayni DataSource'u kullanir.
 * NASIL   : start() koprune baglanir (ws://localhost:4841), acilinca cihaz endpoint'ini gonderir; gelen JSON -> Reading.
 *           Otomatik yeniden baglanma; durum connection store'a yazilir. stop() sonrasi GEC gelen olaylar durumu EZMEZ (stopped + handler null).
 * YAN ETKI: Offline (yerel kopru, internet yok). DemoDataSource ile AYNI sozlesme -> sayfalar degismeden canli veriyi cizer.
 */
import type { DataSource, Mode, Reading } from './types'
import { setConnStatus, BRIDGE_URL, type ConnStatus, type NodeIds } from './connection'
import type { DeviceSettings } from './deviceSettings'

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
  private stopped = false

  // onDeviceSettings: HIBRIT senkron — kopru baglaninca cihazin MEVCUT ayarlarini gonderince cagrilir (cihazdan oku → devam et).
  constructor(private endpoint: string, private nodeIds?: NodeIds, private onDeviceSettings?: (s: Partial<DeviceSettings>) => void) {}

  // Durum yalnizca AKTIF (durdurulmamis) kaynaktan yazilir -> Demo'ya gecince geç callback ezmez
  private setStatus(s: ConnStatus): void {
    if (!this.stopped) setConnStatus(s)
  }

  start(onReading: (r: Reading) => void): void {
    this.cb = onReading
    this.t0 = Date.now()
    this.stopped = false
    this.open()
  }

  private open(): void {
    if (this.stopped) return
    this.setStatus('connecting')
    let ws: WebSocket
    try {
      ws = new WebSocket(BRIDGE_URL)
    } catch {
      this.scheduleReconnect()
      return
    }
    this.ws = ws

    ws.onopen = () => {
      // endpoint + EKRANDAN girilen node kimliklerini kopruye gonder (uyarlanabilir) -> kopru bunlari okur
      try { ws.send(JSON.stringify({ type: 'connect', endpoint: this.endpoint, nodeIds: this.nodeIds })) } catch { /* yok */ }
    }
    ws.onmessage = (ev) => {
      if (this.stopped) return
      try {
        const d = JSON.parse(ev.data as string)
        if (d.type === 'status') {
          this.setStatus(d.connected ? 'connected' : 'connecting')
          return
        }
        // HIBRIT: kopru cihazin mevcut ayarlarini gonderdi → uygula (Urun Ayarlari o degerlerle devam etsin)
        if (d.type === 'settings') {
          if (d.settings && this.onDeviceSettings) this.onDeviceSettings(d.settings as Partial<DeviceSettings>)
          return
        }
        // Number.isFinite → GERÇEK 0 ile geçersiz/eksik (NaN/undefined) ayrımı korunur; yalnız geçersiz değer 0'a düşer
        const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
        const flow = num(d.flow)
        const pressure = num(d.pressure)
        const reading: Reading = {
          t: Date.now() - this.t0,
          flow,
          pressure,
          temperature: num(d.temperature),
          humidity: num(d.humidity),
          mode: (d.mode as Mode) ?? deriveMode(flow, pressure),
          // OPSIYONEL gercek-cihaz alanlari (yoksa Reading'e KOYMA -> DeviceFlowChart eski/demo davranisina duser):
          ...(Number.isFinite(Number(d.totalFlow)) ? { totalFlow: Number(d.totalFlow) } : {}),
          ...(d.status && typeof d.status === 'object' ? { status: d.status as Reading['status'] } : {}),
        }
        this.setStatus('connected')
        this.cb?.(reading)
      } catch {
        /* bozuk mesaj - atla */
      }
    }
    ws.onerror = () => this.setStatus('error')
    ws.onclose = () => {
      this.ws = null
      if (!this.stopped) {
        this.setStatus('error')
        this.scheduleReconnect()
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnect !== null || this.stopped) return
    this.reconnect = window.setTimeout(() => {
      this.reconnect = null
      if (!this.stopped) this.open()
    }, RECONNECT_MS)
  }

  stop(): void {
    this.stopped = true
    if (this.reconnect !== null) { window.clearTimeout(this.reconnect); this.reconnect = null }
    if (this.ws) {
      // Handler'lari nötrle -> close oncesi/sirasinda gelen onerror/onmessage durumu EZMEZ
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onerror = null
      this.ws.onclose = null
      try { this.ws.close() } catch { /* yok */ }
      this.ws = null
    }
  }

  // Mod secimi cihaza yazilir (kopru OPC UA write yapar)
  setMode(mode: Mode): void {
    try { this.ws?.send(JSON.stringify({ type: 'setMode', mode })) } catch { /* yok */ }
  }

  // HIBRIT: kullanici Urun Ayarlari'nda degistirince ayarlar cihaza yazilir (kopru OPC UA write yapar)
  setSettings(settings: DeviceSettings): void {
    try { this.ws?.send(JSON.stringify({ type: 'setSettings', settings })) } catch { /* yok */ }
  }
}
