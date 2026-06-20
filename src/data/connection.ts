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
  // HIBRIT ayar senkronu (donanim gelince - opsiyonel; cihazda yoksa kopru atlar)
  standbyPressure?: string
  standbyThreshold?: string
  autoIsolationSec?: string
  valveMode?: string
  // KOMUT YAZMA düğümleri (Mehmet abi: ana ekrandan cihaz kontrolü — boolean write). Cihazda yoksa köprü sessizce atlar; Ayar'dan düzeltilir.
  cmdStandby?: string      // Standby Input sinyali (DI)
  cmdForceStandby?: string // Force Standby
  cmdIsolation?: string    // Isolation (havayı kes)
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
  // Komut yazma varsayılanları (cihazda test edilip Ayar'dan netleştirilecek — durum okuma düğümleriyle aynı isimden başlanır)
  cmdStandby: 'ns=2;s=AMS30_Standby',
  cmdForceStandby: 'ns=2;s=AMS30_ForcedStandBy',
  cmdIsolation: 'ns=2;s=AMS30_Isolation',
}

export const DEFAULT_CONN: ConnSettings = { mode: 'demo', endpoint: 'opc.tcp://192.168.1.50:4840', nodeIds: { ...DEFAULT_NODE_IDS } }
const KEY = 'ams_connection_v1'

// Yerel OPC UA koprusu WS adresi — uygulamayi SERVIS EDEN host'a baglanir (location.hostname):
//   PC'de (localhost:5180) → ws://localhost:4841 ; telefon PC'nin IP'sinden acinca (http://<PC-IP>:5180) → ws://<PC-IP>:4841.
//   Boylece MOBIL de PC'deki kopru uzerinden CANLI cihaz verisi gorur (kopru 0.0.0.0 dinler; Mehmet Abi onayi).
export const BRIDGE_URL: string =
  typeof window !== 'undefined' && window.location?.hostname
    ? `ws://${window.location.hostname}:4841`
    : 'ws://localhost:4841'

function load(): ConnSettings {
  let s: ConnSettings
  try {
    const raw = localStorage.getItem(KEY)
    const p = raw ? (JSON.parse(raw) as Partial<ConnSettings>) : {}
    // nodeIds derin birlestir (eski kayitlarda yoksa varsayilanla tamamla - geriye uyum)
    s = { ...DEFAULT_CONN, ...p, nodeIds: { ...DEFAULT_NODE_IDS, ...(p.nodeIds ?? {}) } }
  } catch {
    s = { ...DEFAULT_CONN, nodeIds: { ...DEFAULT_NODE_IDS } }
  }
  // Mobil de CANLI moda gecebilir (Mehmet Abi: telefon, uygulamayi acan PC'deki kopruye LAN uzerinden baglanip canli cihaz
  //   verisi gorur + set ayari yapar). Varsayilan yine DEMO (DEFAULT_CONN); kullanici Canli'yi secince mobilde de aktif olur.
  return s
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
