/*
 * NE      : MERKEZI sensor kaydi - her olcumun kimligi (ad, birim, ikon, renk, olcek, 3D derinlik) tek yerde.
 * NEDEN   : Mehmet Bey: "her grafik 'ben suyum' diye bagirsin" + "yeni sensor eklenince otomatik kendi kimligiyle gelsin".
 *           Grafik + kartlar + efsane + ileride sekmeler HEPSI buradan beslenir -> tek satir eklemek = yeni sensor.
 * NASIL   : MetricDef[] dizisi; renk hem 3D cizgide hem kartta AYNI -> efsane bagi nettir. get(): okumadan degeri ceker.
 * YAN ETKI: Renkler --c-* token'lariyla uyumlu; yeni sensor eklemek icin sadece bu diziye kayit eklenir.
 */
import type { LucideIcon } from 'lucide-react'
import { Wind, Gauge, Thermometer, Droplets } from 'lucide-react'
import type { Reading } from './types'
import { BASELINE_FLOW } from '@/lib/savings'

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

export const METRICS: MetricDef[] = [
  {
    key: 'flow', name: 'Hava Tüketimi', unit: 'litre / dakika', unitShort: 'l/dak',
    icon: Wind, color: '#2E9BFF', digits: 0, min: 0, max: Math.round(BASELINE_FLOW * 1.12),
    z: 1.5, width: 0.13, hero: true, get: (r) => r.flow,
  },
  {
    key: 'pressure', name: 'Basınç', unit: 'megapaskal', unitShort: 'MPa',
    icon: Gauge, color: '#36E0C8', digits: 2, min: 0, max: 0.8,
    z: 0.5, width: 0.085, get: (r) => r.pressure,
  },
  {
    key: 'temperature', name: 'Sıcaklık', unit: 'santigrat derece', unitShort: '°C',
    icon: Thermometer, color: '#FFB04D', digits: 1, min: 18, max: 30,
    z: -0.5, width: 0.085, get: (r) => r.temperature,
  },
  {
    key: 'humidity', name: 'Nem', unit: 'bağıl nem yüzdesi', unitShort: '%',
    icon: Droplets, color: '#7CE0FF', digits: 0, min: 35, max: 60,
    z: -1.5, width: 0.075, get: (r) => r.humidity,
  },
]
