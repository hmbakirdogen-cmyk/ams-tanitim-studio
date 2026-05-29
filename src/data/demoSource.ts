/*
 * NE      : Demo veri kaynagi - gercek cihaz yokken bile kusursuz, gercekci akan veri uretir.
 * NEDEN   : Surpriz oldugu icin canli cihazi test edemiyoruz; demo KAHRAMAN. Acilir acilmaz "hemen veriler aksin" hedefi.
 * NASIL   : Her mod icin hedef degerler (TARGETS); her tick mevcut deger hedefe yumusak yaklasir (ease) + gercekci gurultu.
 *           Otomatik tur (Normal->Tasarruf->Kesinti) oynar; setMode ile kullanici (butonlar) elle modu degistirebilir.
 * YAN ETKI: Sadece zamana/etkilesime bagli; saf istemci. Gercek cihaz adaptoru ileride ayni DataSource sozlesmesini doldurur.
 */
import type { DataSource, Mode, Reading } from './types'
import { getDeviceSettings } from './deviceSettings'
import { getActiveModel, defaultsForModel, type AmsModel } from './model'

interface Targets { flow: number; pressure: number; temperature: number; humidity: number }

/*
 * Mod bazli hedef olcumler AKTIF MODELDEN turetilir (Mehmet Bey: "tum degerler secilen modele uysun").
 *  - normal   : tam calisma -> debi = modelin baseline'i, basinc = modele uygun calisma basinci
 *  - standby  : basinc kullanici ayarindan (bekleme basinci); debi basinca oranli (tickte hesaplanir)
 *  - isolation: hava kesintisi -> sifira yakin
 * Sicaklik/nem fiziksel ortam degerleri (modelden bagimsiz).
 */
function targetsForModel(m: AmsModel): Record<Mode, Targets> {
  const d = defaultsForModel(m)
  return {
    normal: { flow: m.baselineFlow, pressure: d.workingPressure, temperature: 24.5, humidity: 46 },
    standby: { flow: Math.max(m.flowMin, Math.round(m.baselineFlow * 0.12)), pressure: 0.2, temperature: 23.5, humidity: 47 },
    isolation: { flow: Math.max(0, Math.round(m.flowMin * 0.2)), pressure: 0.02, temperature: 23.0, humidity: 47 },
  }
}

// Otomatik tur sirasi + her modda kalma suresi (ms)
const CYCLE: { mode: Mode; hold: number }[] = [
  { mode: 'normal', hold: 9000 },
  { mode: 'standby', hold: 9000 },
  { mode: 'isolation', hold: 6000 },
]

export class DemoDataSource implements DataSource {
  readonly kind = 'demo' as const

  private timer: number | null = null
  private autoResume: number | null = null
  private cb: ((r: Reading) => void) | null = null
  private cur: Targets = { ...targetsForModel(getActiveModel()).normal }
  private target: Mode = 'normal'
  private autoCycle = true
  private cycleIdx = 0
  private cycleElapsed = 0
  private t0 = 0
  private readonly tickMs = 80 // daha sik veri -> grafikte daha ince/akici adimlar (duraksama hissi azalir)

  start(onReading: (r: Reading) => void): void {
    this.cb = onReading
    this.t0 = Date.now()
    this.timer = window.setInterval(() => this.tick(), this.tickMs)
    this.tick()
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer)
    if (this.autoResume !== null) window.clearTimeout(this.autoResume)
    this.timer = null
    this.autoResume = null
  }

  // Kullanici modu sectiginde: otomatik turu gecici durdur, secilen moda yonel, sonra turu kaldigi yerden surdur
  setMode(mode: Mode): void {
    this.target = mode
    this.autoCycle = false
    if (this.autoResume !== null) window.clearTimeout(this.autoResume)
    this.autoResume = window.setTimeout(() => {
      const i = CYCLE.findIndex((c) => c.mode === this.target)
      this.cycleIdx = i >= 0 ? i : 0
      this.cycleElapsed = 0
      this.autoCycle = true
    }, 13000)
  }

  private tick(): void {
    const s = getDeviceSettings()
    const model = getActiveModel()
    const TARGETS = targetsForModel(model) // model degisirse hedefler aninda o modele uyar
    if (this.autoCycle) {
      this.cycleElapsed += this.tickMs
      // Bekleme suresi kullanici ayarindan (otomatik kesintiye kadar); diger modlar sabit
      const hold = CYCLE[this.cycleIdx].mode === 'standby' ? s.autoIsolationSec * 1000 : CYCLE[this.cycleIdx].hold
      if (this.cycleElapsed >= hold) {
        this.cycleElapsed = 0
        this.cycleIdx = (this.cycleIdx + 1) % CYCLE.length
      }
      this.target = CYCLE[this.cycleIdx].mode
    }

    // Bekleme hedefleri kullanici ayarindan: bekleme basinci -> tahmini bekleme debisi (modele oranli)
    const base = TARGETS[this.target]
    const tg =
      this.target === 'standby'
        ? { ...base, pressure: s.standbyPressure, flow: Math.max(model.flowMin, Math.round(s.standbyPressure * model.baselineFlow * 0.58)) }
        : base
    const ease = 0.09 // hedefe yumusak yaklasma (akan his)
    this.cur.flow += (tg.flow - this.cur.flow) * ease
    this.cur.pressure += (tg.pressure - this.cur.pressure) * ease
    this.cur.temperature += (tg.temperature - this.cur.temperature) * ease
    this.cur.humidity += (tg.humidity - this.cur.humidity) * ease

    const noise = (amp: number) => (Math.random() - 0.5) * amp
    const reading: Reading = {
      t: Date.now() - this.t0,
      flow: Math.max(0, this.cur.flow + noise(Math.max(3, this.cur.flow * 0.006))),
      pressure: Math.max(0, this.cur.pressure + noise(0.0025)),
      temperature: this.cur.temperature + noise(0.06),
      humidity: this.cur.humidity + noise(0.2),
      mode: this.target,
    }
    this.cb?.(reading)
  }
}
