/*
 * NE      : Sensor gorunurluk deposu + PAYLASILAN store + hook - hangi sensorlerin grafik/kartlarda gosterilecegini belirler.
 * NEDEN   : Mehmet Bey: "Urun Ayarlari'ndan hangi sensorler varsa secilebilir/gorunumu ayarlanabilir; su an 4'u etkin".
 *           ESKIDEN her bilesen kendi useState'ini tutuyordu -> Urun Ayarlari'nda sensor kapatilinca Canli Panel YENIDEN YUKLENENE
 *           kadar yansimiyordu. ARTIK tek dogruluk (deviceSettings/model deseni) -> degisiklik tum sayfalara ANLIK yansir.
 * NASIL   : useSyncExternalStore + dinleyiciler; Record<MetricKey, boolean> localStorage'da; eksik anahtarlar varsayilan (true)
 *           ile tamamlanir -> yeni sensor otomatik gorunur gelir. getSensorVisibility() React disindan okunur.
 * YAN ETKI: Offline. Canli panel/urun ayarlari bu gorunurlugu uygular; kapatilan sensor cizilmez/karta dusmez.
 */
import { useSyncExternalStore } from 'react'
import { METRICS, type MetricKey } from '@/data/metrics'

export type Visibility = Record<MetricKey, boolean>

const DEFAULT: Visibility = Object.fromEntries(METRICS.map((m) => [m.key, true])) as Visibility
const KEY = 'ams_sensor_vis_v1'

function load(): Visibility {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<Visibility>) } : { ...DEFAULT }
  } catch {
    return { ...DEFAULT }
  }
}

// --- Paylasilan store (tek dogruluk + dinleyiciler) ---
let current: Visibility = load()
const listeners = new Set<() => void>()

export function getSensorVisibility(): Visibility {
  return current
}

function commit(next: Visibility) {
  current = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* offline */ }
  listeners.forEach((l) => l())
}

export function toggleSensor(k: MetricKey): void {
  commit({ ...current, [k]: !current[k] })
}
export function showAllSensors(): void {
  commit({ ...DEFAULT })
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useSensorVisibility() {
  const visible = useSyncExternalStore(
    (cb) => subscribe(cb),
    () => current,
    () => current,
  )
  return { visible, toggle: toggleSensor, showAll: showAllSensors }
}
