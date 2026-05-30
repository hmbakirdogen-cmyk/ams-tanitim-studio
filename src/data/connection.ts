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

// Cihazin OPC UA dugum kimlikleri - UYARLANABILIR: koddan degil EKRANDAN girilir, kopruye 'connect' ile gider.
export interface NodeIds {
  flow: string
  pressure: string
  temperature: string
  humidity: string
  mode: string // mod yazma (donanim gelince)
}

export interface ConnSettings {
  mode: ConnMode
  endpoint: string // cihaz OPC UA adresi, or. opc.tcp://192.168.1.50:4840
  nodeIds: NodeIds // cihaza gore (UaExpert'ten okunup ekrandan girilir)
}

// Placeholder node kimlikleri - kullanici kendi cihazina gore Kurulum Kilavuzu'ndan degistirir
export const DEFAULT_NODE_IDS: NodeIds = {
  flow: 'ns=2;s=AMS.FlowRate',
  pressure: 'ns=2;s=AMS.Pressure',
  temperature: 'ns=2;s=AMS.Temperature',
  humidity: 'ns=2;s=AMS.Humidity',
  mode: 'ns=2;s=AMS.Mode',
}

export const DEFAULT_CONN: ConnSettings = { mode: 'demo', endpoint: 'opc.tcp://192.168.1.50:4840', nodeIds: { ...DEFAULT_NODE_IDS } }
const KEY = 'ams_connection_v1'

function load(): ConnSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_CONN, nodeIds: { ...DEFAULT_NODE_IDS } }
    const p = JSON.parse(raw) as Partial<ConnSettings>
    // nodeIds derin birlestir (eski kayitlarda yoksa varsayilanla tamamla - geriye uyum)
    return { ...DEFAULT_CONN, ...p, nodeIds: { ...DEFAULT_NODE_IDS, ...(p.nodeIds ?? {}) } }
  } catch {
    return { ...DEFAULT_CONN, nodeIds: { ...DEFAULT_NODE_IDS } }
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
// Node kimliklerini (cihaza gore) guncelle - Kurulum Kilavuzu'ndan
export function setNodeIds(patch: Partial<NodeIds>): void {
  settings = { ...settings, nodeIds: { ...settings.nodeIds, ...patch } }
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
  return { settings: s.settings, status: s.status, setMode: setConnMode, setEndpoint: setConnEndpoint, setNodeIds }
}
