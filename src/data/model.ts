/*
 * NE      : Aktif AMS modeli (tam kod) deposu + hook - AMS20/30/40/60 x A/B; her modelin kendi debi/basinc araligi.
 * NEDEN   : Mehmet Bey: "Urun Ayarlari'ndan urun tam koduyla secilsin, tum degerler o modele gore optimize edilsin".
 * NASIL   : Katalog araliklari (20:5-500, 30:10-1000, 40:20-2000, 60:40-4000 l/dak; A:0.8 / B:0.7 MPa). localStorage'da saklanir.
 *           demoSource normal/bekleme/kesinti hedeflerini, grafik debi olcegini, tasarruf baseline'ini bu modelden alir.
 * YAN ETKI: Model degisince demo verisi + grafik olcegi + tasarruf hesabi otomatik o modele uyar (getActiveModel React disindan okunur).
 */
import { useCallback, useEffect, useState } from 'react'

export interface AmsModel {
  code: string // tam kod, or. "AMS40A"
  size: 20 | 30 | 40 | 60
  type: 'A' | 'B' // A: Elektro-pnomatik regulator · B: Regulator
  flowMin: number // l/dak
  flowMax: number // l/dak (anma)
  baselineFlow: number // normal hava tuketimi varsayimi (l/dak)
  pressureMax: number // MPa
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

// React disindan (demoSource) okunabilen guncel model
let cache: AmsModel = load()
export function getActiveModel(): AmsModel {
  return cache
}

export function useModel() {
  const [model, setModelState] = useState<AmsModel>(() => cache)
  useEffect(() => {
    cache = model
    localStorage.setItem(KEY, model.code)
  }, [model])
  const setModel = useCallback((code: string) => {
    const m = AMS_MODELS.find((x) => x.code === code)
    if (m) setModelState(m)
  }, [])
  return { model, setModel }
}
