/*
 * NE      : Aktif AMS modeli (tam kod) deposu + PAYLASILAN store + hook - AMS20/30/40/60 x A/B; her modelin debi/basinc araligi
 *           ve o modele en uygun (mantikli) varsayilan calisma degerleri (defaultsForModel).
 * NEDEN   : Mehmet Bey: "Urun Ayarlari'ndan urun tam koduyla secilsin, TUM degerler o modele gore optimize/mantikli gelsin"
 *           + "varsayilanlar en mantikli sekilde kullanicinin karsisina ciksin". Tek model degisimi -> tum uygulama tepki versin.
 * NASIL   : Modul-seviyesi tek dogruluk (current) + dinleyici kumesi; useSyncExternalStore ile TUM useModel() tuketicileri
 *           (grafik olcegi, PageHeader, metrics) ayni anda reaktif guncellenir. setActiveModel React disindan da cagrilabilir.
 *           defaultsForModel(): o modele uygun calisma basinci/bekleme basinci/bekleme esigi -> ProductSettings bunlari uygular.
 * YAN ETKI: Model degisince -> demoSource hedefleri (getActiveModel), grafik debi/basinc olcegi (buildMetrics/useMetrics),
 *           PageHeader kodu ve (ProductSettings araciligiyla) economy.baselineFlow + device esikleri otomatik o modele uyar.
 */
import { useSyncExternalStore } from 'react'

export interface AmsModel {
  code: string // tam kod, or. "AMS40A"
  size: 20 | 30 | 40 | 60
  type: 'A' | 'B' // A: Elektro-pnomatik regulator (uzaktan) · B: Regulator (elle)
  flowMin: number // l/dak (anma alt)
  flowMax: number // l/dak (anma ust)
  baselineFlow: number // normal hava tuketimi varsayimi (l/dak)
  pressureMax: number // MPa (modelin azami calisma basinci)
}

// Kullaniciya gosterilen tip aciklamasi (kisaltma yok - KATI kural)
export const TYPE_LABEL: Record<'A' | 'B', string> = {
  A: 'Elektro-pnömatik regülatör (uzaktan ayar)',
  B: 'Regülatör (elle ayar)',
}

const SIZES: { size: 20 | 30 | 40 | 60; flowMin: number; flowMax: number }[] = [
  { size: 20, flowMin: 5, flowMax: 500 },
  { size: 30, flowMin: 10, flowMax: 1000 },
  { size: 40, flowMin: 20, flowMax: 2000 },
  { size: 60, flowMin: 40, flowMax: 4000 },
]

export const AMS_MODELS: AmsModel[] = SIZES.flatMap((s) =>
  (['A', 'B'] as const).map((type) => ({
    code: `AMS${s.size}${type}`,
    size: s.size,
    type,
    flowMin: s.flowMin,
    flowMax: s.flowMax,
    baselineFlow: Math.round(s.flowMax * 0.9),
    pressureMax: type === 'A' ? 0.8 : 0.7,
  })),
)

const DEFAULT_CODE = 'AMS40A'
const KEY = 'ams_model_v1'

function findByCode(code: string | null): AmsModel {
  return AMS_MODELS.find((m) => m.code === code) ?? AMS_MODELS.find((m) => m.code === DEFAULT_CODE)!
}
function load(): AmsModel {
  try {
    return findByCode(localStorage.getItem(KEY))
  } catch {
    return findByCode(DEFAULT_CODE)
  }
}

/*
 * Modele en uygun (mantikli) calisma varsayilanlari - ProductSettings bunlari uygular ki
 * model degisince kullanici karsisina HER ZAMAN o urune uygun, anlamli degerler gelsin.
 *  - workingPressure : normal calisma basinci (azami basincin altinda, makul pay)
 *  - standbyPressure : tasarruf modunda dusurulen hedef basinc
 *  - standbyThreshold: debi bu altina dusunce bekleme moduna gec (baseline'in makul bir orani)
 */
export function defaultsForModel(m: AmsModel): {
  baselineFlow: number
  workingPressure: number
  standbyPressure: number
  standbyThreshold: number
} {
  const round2 = (v: number) => Math.round(v * 100) / 100
  const round05 = (v: number) => Math.round(v / 0.05) * 0.05
  const round10 = (v: number) => Math.round(v / 10) * 10
  return {
    baselineFlow: m.baselineFlow,
    workingPressure: round2(m.pressureMax * 0.7), // A:0,56 · B:0,49 MPa
    standbyPressure: Math.max(0.1, round05(m.pressureMax * 0.28)), // ~0,20 MPa
    standbyThreshold: Math.max(10, round10(m.baselineFlow * 0.17)), // baseline'in ~%17'si
  }
}

// --- Paylasilan store (tek dogruluk + dinleyiciler) ---
let current: AmsModel = load()
const listeners = new Set<() => void>()

// React disindan (demoSource, useLiveReadings) okunabilen guncel model
export function getActiveModel(): AmsModel {
  return current
}

// Modeli degistir - localStorage'a yaz + TUM useModel() tuketicilerini uyandir
export function setActiveModel(code: string): void {
  const m = AMS_MODELS.find((x) => x.code === code)
  if (!m || m.code === current.code) return
  current = m
  try {
    localStorage.setItem(KEY, m.code)
  } catch {
    /* offline/private mode - sessizce gec */
  }
  listeners.forEach((l) => l())
}

// Bilesenler model degisikliginde otomatik yeniden render olur (uygulama geneli reaktif)
export function useModel() {
  const model = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
    () => current,
  )
  return { model, setModel: setActiveModel }
}
