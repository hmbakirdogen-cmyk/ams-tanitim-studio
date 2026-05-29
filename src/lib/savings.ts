/*
 * NE      : Enerji/para/karbon tasarruf hesabi - akan debiyi (litre/dak) somut kazanca cevirir; varsayimlar DUZENLENEBILIR (Economy).
 * NEDEN   : Satis tezi + Mehmet Bey: "kullanici elektrik fiyatini girip tasarrufu ona gore hesaplasin".
 * NASIL   : Economy nesnesi (fiyat/saat/baseline/enerji/CO2). Fonksiyonlar eco parametresi alir (varsayilan DEFAULT_ECONOMY).
 * YAN ETKI: Katsayilar tek tip (Economy) altinda; economy.ts bunu localStorage'da saklar. metrics.ts BASELINE_FLOW'u kullanir.
 */
export const BASELINE_FLOW = 1800 // litre/dakika - AMS olmadan normal hava tuketimi varsayimi
export const ENERGY_KWH_PER_M3 = 0.11 // 1 m3 sikistirilmis hava ~ 0.11 kWh (7 bar civari)
export const PRICE_TL_PER_KWH = 3.5 // sanayi elektrigi (TL/kWh) varsayim
export const CO2_KG_PER_KWH = 0.42 // TR sebeke ortalama (kg CO2/kWh) varsayim
export const OP_HOURS_PER_YEAR = 16 * 300 // 16 saat/gun x 300 gun varsayim

export interface Economy {
  priceTL: number // elektrik fiyati (TL/kWh)
  opHoursPerYear: number // yillik calisma suresi (saat)
  baselineFlow: number // normal hava tuketimi (litre/dakika)
  energyKwhPerM3: number // enerji katsayisi (kWh/m3)
  co2PerKwh: number // karbon katsayisi (kg CO2/kWh)
}

export const DEFAULT_ECONOMY: Economy = {
  priceTL: PRICE_TL_PER_KWH,
  opHoursPerYear: OP_HOURS_PER_YEAR,
  baselineFlow: BASELINE_FLOW,
  energyKwhPerM3: ENERGY_KWH_PER_M3,
  co2PerKwh: CO2_KG_PER_KWH,
}

export interface Savings {
  liters: number
  m3: number
  kwh: number
  tl: number
  co2: number
}

// Birikmis litreyi tum kazanc birimlerine cevirir (girilen ekonomi varsayimlariyla)
export function litersToSavings(liters: number, eco: Economy = DEFAULT_ECONOMY): Savings {
  const m3 = liters / 1000
  const kwh = m3 * eco.energyKwhPerM3
  return { liters, m3, kwh, tl: kwh * eco.priceTL, co2: kwh * eco.co2PerKwh }
}

// Bir tick'te biriken tasarruf (litre): baseline altindaki her litre/dak, gecen sureyle (saniye) carpilir
export function tickLitersSaved(flow: number, dtSeconds: number, baseline: number = DEFAULT_ECONOMY.baselineFlow): number {
  return Math.max(0, baseline - flow) * (dtSeconds / 60)
}

// Anlik tasarruf yuzdesi (baseline'e gore)
export function savingPercent(flow: number, baseline: number = DEFAULT_ECONOMY.baselineFlow): number {
  if (baseline <= 0) return 0
  return Math.max(0, Math.min(100, ((baseline - flow) / baseline) * 100))
}

// O anki tasarruf hizini (litre/dak) yillik kazanca yansitir
export function annualProjection(savedFlowPerMin: number, eco: Economy = DEFAULT_ECONOMY): Savings {
  const litersYear = Math.max(0, savedFlowPerMin) * 60 * eco.opHoursPerYear
  return litersToSavings(litersYear, eco)
}
