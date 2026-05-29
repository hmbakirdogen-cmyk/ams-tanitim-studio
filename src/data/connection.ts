/*
 * NE      : Veri kaynagi BAGLANTI deposu + PAYLASILAN store + hook - mod (demo/canli), cihaz OPC UA adresi ve canli baglanti durumu.
 * NEDEN   : Mehmet Bey: "cihaza baglandiginda ayni ekranlar canli cihaz verisini gostersin". Personel sahada Demo ya da Canli secer.
 * NASIL   : model.ts/economy.ts ile AYNI desen (useSyncExternalStore). Ayarlar (mod+endpoint) localStorage'da kalici; status runtime.
 *           Tarayici dogrudan OPC UA (opc.tcp) konusamaz -> yerel KOPRU (bridge/opcua-bridge.mjs) uzerinden WebSocket ile baglanir.
 * YAN ETKI: Offline (yerel koprü; internet yok). Mod degisince useLiveReadings kaynagi (Demo/Canli) yeniden secer.
 */
import { useSyncExternalStore } from 'react'

export type ConnMode = 'demo' | 'live'
export type ConnStatus = 'demo' | 'connecting' | 'connected' | 'error'

export interface ConnSettings {
  mode: ConnMode
  endpoint: string // cihaz OPC UA adresi, or. opc.tcp://192.168.1.50:4840
}

export const DEFAULT_CONN: ConnSettings = { mode: 'demo', endpoint: 'opc.tcp://192.168.1.50:4840' }
const KEY = 'ams_connection_v1'

function load(): ConnSettings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_CONN, ...(JSON.parse(raw) as Partial<ConnSettings>) } : { ...DEFAULT_CONN }
  } catch {
    return { ...DEFAULT_CONN }
  }
}

// --- Paylasilan store: ayarlar (kalici) + canli durum (runtime) ---
let settings: ConnSettings = load()
let status: ConnStatus = settings.mode === 'live' ? 'connecting' : 'demo'
const listeners = new Set<() => void>()
// Tek anlik nesne (useSyncExternalStore getSnapshot KARARLI olmali - her cagrida yeni nesne sonsuz dongu yapar)
let snap: { settings: ConnSettings; status: ConnStatus } = { settings, status }

function notify() {
  snap = { settings, status }
  listeners.forEach((l) => l())
}

export function getConnection(): ConnSettings {
  return settings
}
export function getConnStatus(): ConnStatus {
  return status
}

export function setConnMode(mode: ConnMode): void {
  if (mode === settings.mode) return
  settings = { ...settings, mode }
  status = mode === 'live' ? 'connecting' : 'demo'
  try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* offline */ }
  notify()
}
export function setConnEndpoint(endpoint: string): void {
  settings = { ...settings, endpoint }
  try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* offline */ }
  notify()
}
// Canli kaynak (LiveDataSource) baglanti durumunu buradan gunceller
export function setConnStatus(s: ConnStatus): void {
  if (s === status) return
  status = s
  notify()
}

export function useConnection() {
  const s = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => snap,
    () => snap,
  )
  return { settings: s.settings, status: s.status, setMode: setConnMode, setEndpoint: setConnEndpoint }
}
