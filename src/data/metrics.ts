/*
 * NE      : MERKEZI sensor kaydi - her olcumun kimligi (ad, birim, ikon, renk, olcek, 3D derinlik) tek yerde.
 * NEDEN   : Mehmet Bey: "her grafik 'ben suyum' diye bagirsin" + "yeni sensor eklenince otomatik kendi kimligiyle gelsin".
 *           Grafik + kartlar + efsane + ileride sekmeler HEPSI buradan beslenir -> tek satir eklemek = yeni sensor.
 *           Model degisince debi ve basinc olcegi otomatik o modele uyar (buildMetrics + useMetrics).
 * NASIL   : MetricDef[] dizisi; renk hem 3D cizgide hem kartta AYNI -> efsane bagi nettir. get(): okumadan degeri ceker.
 *           METRICS = varsayilan (geriye uyum); useMetrics() = aktif modele gore reaktif dizi.
 * YAN ETKI: Renkler --c-* token'lariyla uyumlu; yeni sensor eklemek icin sadece BASE_METRICS'e kayit eklenir.
 */
import type { LucideIcon } from 'lucide-react'
import { Wind, Gauge, Thermometer, Droplets } from 'lucide-react'
import { useMemo } from 'react'
import type { Reading } from './types'
import { getActiveModel, useModel, type AmsModel } from './model'
import { getPressureUnit, pressureFactor, usePressureUnit, type PressureUnit } from './pressureUnit'

export type MetricKey = 'flow' | 'pressure' | 'temperature' | 'humidity'

export interface MetricDef {
  key: MetricKey
  name: string // kullaniciya gorunen TAM ad (kisaltma yok)
  unit: string // acik birim ("litre / dakika")
  unitShort: string // kisa birim (rozet/eksen)
  icon: LucideIcon
  color: string // 3D cizgi + kart AYNI renk
  digits: number // ondalik basamak
  min: number
  max: number // kendi olcegi
  z: number // 3D derinlik katmani
  width: number // 3D cizgi kalinligi (dunya birimi)
  hero?: boolean // ana metrik (buyuk gosterim + comet)
  get: (r: Reading) => number
}

// Modelden bagimsiz sabitler (max alanlari modele gore buildMetrics'te uretilir)
const BASE: Omit<MetricDef, 'max'>[] = [
  {
    key: 'flow', name: 'Hava Tüketimi', unit: 'litre / dakika', unitShort: 'l/dak',
    icon: Wind, color: '#2E9BFF', digits: 0, min: 0,
    z: 1.5, width: 0.13, hero: true, get: (r) => r.flow,
  },
  {
    key: 'pressure', name: 'Basınç', unit: 'megapaskal', unitShort: 'MPa',
    // KIRMIZI (Efekan Bey/saha isteği: "basınç çizgisi kırmızı olsun"). Tek kaynak → grafik borusu + kart + overlay BİREBİR kırmızı (kimlik bağı korunur).
    icon: Gauge, color: '#FF453A', digits: 2, min: 0,
    z: 0.5, width: 0.085, get: (r) => r.pressure,
  },
  {
    key: 'temperature', name: 'Sıcaklık', unit: 'santigrat derece', unitShort: '°C',
    icon: Thermometer, color: '#FFB04D', digits: 1, min: 18,
    z: -0.5, width: 0.085, get: (r) => r.temperature,
  },
  {
    key: 'humidity', name: 'Nem', unit: 'bağıl nem yüzdesi', unitShort: '%',
    icon: Droplets, color: '#7CE0FF', digits: 0, min: 35,
    z: -1.5, width: 0.075, get: (r) => r.humidity,
  },
]

// Model + BASINÇ BİRİMİ bazlı ölçek üretir: debi tepe = flowMax; basınç tepe = pressureMax × birim-faktörü (bar→×10).
export function buildMetrics(model: AmsModel, pUnit: PressureUnit = getPressureUnit()): MetricDef[] {
  const pf = pressureFactor(pUnit) // MPa→1, bar→10
  return BASE.map((b) => {
    // Mehmet abi 2026-06-19: grafik/ölçek tepesi = ÜRÜN max debisi (flowMax) → "max debi 2000 ise 2500/6000 görünmesin", eksen tam üründe biter.
    if (b.key === 'flow') return { ...b, max: model.flowMax }
    // Mehmet abi 2026-06-19: BASINÇ birime göre (bar/MPa). Değer/ölçek/birim/ondalık birimden türer → kart/grafik/overlay/detay/analiz HEPSİ otomatik uyar.
    if (b.key === 'pressure') return {
      ...b,
      max: model.pressureMax * pf,
      unit: pUnit === 'bar' ? 'bar' : 'megapaskal',
      unitShort: pUnit === 'bar' ? 'bar' : 'MPa',
      digits: pUnit === 'bar' ? 1 : 2, // 0,49 MPa = 4,9 bar
      get: (r) => r.pressure * pf,     // reading.pressure HAM MPa → gösterimde çevrilir
    }
    if (b.key === 'temperature') return { ...b, max: 30 }
    return { ...b, max: 60 }
  })
}

// Aktif model anlik snapshot (React disindan kullanim icin - or. demoSource ileride okumasi gerekirse)
export const METRICS: MetricDef[] = buildMetrics(getActiveModel())

// Bilesenlerin model VEYA basınç birimi degisikliginde otomatik yeniden render olmasi icin reaktif dizi
export function useMetrics(): MetricDef[] {
  const { model } = useModel()
  const { unit } = usePressureUnit()
  return useMemo(() => buildMetrics(model, unit), [model, unit])
}
