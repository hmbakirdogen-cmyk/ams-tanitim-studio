/*
 * NE      : Basınç BİRİMİ anahtarı (MPa ↔ bar) — paylaşılan tek-doğruluk store + hook (model.ts deseniyle birebir).
 * NEDEN   : Mehmet abi (2026-06-19): "basınçla alakalı bütün kartlara bar/MPa ayrımı için ufak buton." SMC dünyası ikisini de kullanır
 *           (1 MPa = 10 bar). Tek anahtar → metrics.ts pressure metriğini dönüştürür → kart/grafik/overlay/detay/analiz HEPSİ otomatik uyar.
 * NASIL   : useSyncExternalStore ile tüm usePressureUnit() tüketicileri aynı anda reaktif güncellenir. localStorage'da kalıcı (offline).
 *           Dönüşüm sadece GÖSTERİMDE: reading.pressure HAM MPa kalır; metric.get() değeri ×factor (bar→10) çevirir.
 * YAN ETKI: Saf veri. Cihaz LCD'si (donanım, gerçek MPa) ayrı; bu anahtar uygulama gösterimini etkiler. Ayar eşikleri ayrı katman.
 */
import { useSyncExternalStore } from 'react'

export type PressureUnit = 'MPa' | 'bar'
const KEY = 'ams_pressure_unit_v1'

function load(): PressureUnit {
  try { return localStorage.getItem(KEY) === 'bar' ? 'bar' : 'MPa' } catch { return 'MPa' }
}

let current: PressureUnit = load()
const listeners = new Set<() => void>()

// 1 MPa = 10 bar → bar modunda değer/ölçek ×10
export function pressureFactor(u: PressureUnit = current): number {
  return u === 'bar' ? 10 : 1
}
export function getPressureUnit(): PressureUnit {
  return current
}
export function setPressureUnit(u: PressureUnit): void {
  if (u === current) return
  current = u
  try { localStorage.setItem(KEY, u) } catch { /* offline/private — sessizce geç */ }
  listeners.forEach((l) => l())
}

// Bileşenler birim değişince otomatik yeniden render olur (uygulama geneli reaktif)
export function usePressureUnit() {
  const unit = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => current,
    () => current,
  )
  return { unit, setUnit: setPressureUnit }
}
