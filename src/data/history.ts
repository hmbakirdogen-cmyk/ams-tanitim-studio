/*
 * NE      : KALICI GECMIS deposu - olcumleri zamanla biriktirir (dakikada 1 ornek) ki "gecen Sali 09:00-12:00" gibi
 *           TAKVIMSEL rapor alinabilsin. Ayrica sunum icin gercekci DEMO gecmisi tohumlar (gun/gece+hafta sonu ritmi).
 * NEDEN   : Mehmet Abi: "kayit katmani olsun; SMC calisani musteriye DEMO ile gecmis raporu gosterebilsin AMA cihaza
 *           baglaninca da gercek canli veri biriksin/gorulsun". Mevcut RangeAnalysisModal+ReportView "noktalar+startedAt"
 *           aldigi icin bu depo dogrudan onlari besler. OFFLINE: tamami localStorage (CDN/online yok).
 * NASIL   : Demo ve Canli AYRI kova ('ams_history_demo_v1' / '..._live_v1') -> demo tohumu gercek cihaz verisini KIRLETMEZ.
 *           Ornek = kompakt sayi tuple'i [absMs, debi, basinc, sicaklik, nem, modIdx] (yer tasarrufu). Dakikalik kovaya
 *           seyreltme (appendReading ayni dakikayi atlar) -> 30 gun ~43 bin ornek, ~2 MB. Budama: retention + tavan.
 * YAN ETKI: appendReading bellek-ici onbellekle calisir; localStorage'a EN COK dakikada 1 yazar (80ms tikte perf sorunu yok).
 *           query/seed React disindan da cagrilabilir (saf). Tarih: cagiran Date.now()/absMs verir (app calismasinda serbest).
 */
import type { Mode, Reading } from './types'
import { getActiveModel, defaultsForModel, type AmsModel } from './model'

export type HistorySource = 'demo' | 'live'

// Mod <-> kucuk indeks (kompakt saklama)
const MODES: Mode[] = ['normal', 'standby', 'isolation']
const modeToIdx = (m: Mode) => Math.max(0, MODES.indexOf(m))
const idxToMode = (i: number): Mode => MODES[i] ?? 'normal'

// [absMs, debi(l/dak), basinc(MPa), sicaklik(C), nem(%), modIdx]
type Sample = [number, number, number, number, number, number]

const BUCKET_MS = 60_000 // dakikada 1 ornek (seyreltme adimi)
const RETENTION_DAYS = 30 // Mehmet Abi karari: 30 gun geriye sakla
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000
const MAX_SAMPLES = 50_000 // emniyet tavani (~34 gun @1dk) -> localStorage sismez

const keyFor = (src: HistorySource) => `ams_history_${src}_v1`

const round1 = (v: number) => Math.round(v * 10) / 10
const round2 = (v: number) => Math.round(v * 100) / 100
const round3 = (v: number) => Math.round(v * 1000) / 1000

// --- localStorage okuma/yazma ---
function read(src: HistorySource): Sample[] {
  try {
    const raw = localStorage.getItem(keyFor(src))
    return raw ? (JSON.parse(raw) as Sample[]) : []
  } catch {
    return []
  }
}
function write(src: HistorySource, rows: Sample[]): void {
  try {
    localStorage.setItem(keyFor(src), JSON.stringify(rows))
  } catch {
    /* offline / kota dolu - sessizce gec */
  }
}

// Budama: retention penceresinden eski + tavanin ustu atilir
function prune(rows: Sample[], nowMs: number): Sample[] {
  const cutoff = nowMs - RETENTION_MS
  let out = rows
  if (rows.length && rows[0][0] < cutoff) out = rows.filter((s) => s[0] >= cutoff)
  if (out.length > MAX_SAMPLES) out = out.slice(out.length - MAX_SAMPLES)
  return out
}

// --- Bellek-ici onbellek (her tikte localStorage parse/stringify yapmamak icin) ---
interface Cache {
  rows: Sample[]
  loaded: boolean
  lastBucket: number
}
const cache: Record<HistorySource, Cache> = {
  demo: { rows: [], loaded: false, lastBucket: -1 },
  live: { rows: [], loaded: false, lastBucket: -1 },
}

function ensureLoaded(src: HistorySource): Cache {
  const c = cache[src]
  if (!c.loaded) {
    c.rows = read(src)
    c.lastBucket = c.rows.length ? Math.floor(c.rows[c.rows.length - 1][0] / BUCKET_MS) : -1
    c.loaded = true
  }
  return c
}

/*
 * Bir okumayi gecmise yazar. Seyreltme: ayni dakika kovasi zaten yazildiysa atlar (en cok dakikada 1 yazma).
 * absMs = okumaya ait gercek duvar saati (useLiveReadings: startedAt + reading.t).
 */
export function appendReading(src: HistorySource, r: Reading, absMs: number): void {
  const c = ensureLoaded(src)
  const bucket = Math.floor(absMs / BUCKET_MS)
  if (bucket === c.lastBucket) return // ayni dakika -> seyrelt, atla
  c.lastBucket = bucket
  c.rows.push([Math.round(absMs), round1(r.flow), round3(r.pressure), round2(r.temperature), round1(r.humidity), modeToIdx(r.mode)])
  c.rows = prune(c.rows, absMs)
  write(src, c.rows)
}

export interface HistoryResult {
  points: Reading[] // RangeAnalysisModal/ReportView icin: t = startedAt'tan beri gecen ms
  startedAt: number // t=0 mutlak duvar saati (ilk ornek) -> rapor gercek tarih/saati gosterir
}

/*
 * Gecmisi RangeAnalysisModal/ReportView'in bekledigi sekle cevirir.
 * startedAt = ilk ornegin mutlak zamani; her noktanin t'si buna gore RELATIF (modal mutlak zamani startedAt+t ile hesaplar).
 * start/end verilmezse TUM extent dondurulur (modal icinde alt-aralik secilir).
 */
export function queryHistory(src: HistorySource, startMs?: number, endMs?: number): HistoryResult {
  const c = ensureLoaded(src)
  const rows = c.rows
  if (!rows.length) return { points: [], startedAt: startMs ?? rows[0]?.[0] ?? 0 }
  const startedAt = rows[0][0]
  const s = startMs ?? startedAt
  const e = endMs ?? rows[rows.length - 1][0]
  const points: Reading[] = []
  for (const row of rows) {
    if (row[0] < s || row[0] > e) continue
    points.push({ t: row[0] - startedAt, flow: row[1], pressure: row[2], temperature: row[3], humidity: row[4], mode: idxToMode(row[5]) })
  }
  return { points, startedAt }
}

// Kayitli verinin kapsami (ilk/son zaman + adet) - UI "X gun · N olcum" gosterir
export function historyExtent(src: HistorySource): { first: number; last: number; count: number } | null {
  const c = ensureLoaded(src)
  if (!c.rows.length) return null
  return { first: c.rows[0][0], last: c.rows[c.rows.length - 1][0], count: c.rows.length }
}

export function clearHistory(src: HistorySource): void {
  const c = ensureLoaded(src)
  c.rows = []
  c.lastBucket = -1
  write(src, [])
}

// =====================  DEMO GECMISI TOHUMU (sunum icin)  =====================

interface T {
  flow: number
  pressure: number
  temperature: number
  humidity: number
}

// Mod bazli hedefler - demoSource ile AYNI mantik (model + bekleme ayarindan turetilir; tutarlilik icin)
function targetsFor(model: AmsModel): Record<Mode, T> {
  const d = defaultsForModel(model)
  return {
    normal: { flow: model.baselineFlow, pressure: d.workingPressure, temperature: 24.5, humidity: 46 },
    standby: { flow: Math.max(model.flowMin, Math.round(model.baselineFlow * 0.12)), pressure: d.standbyPressure, temperature: 23.5, humidity: 47 },
    isolation: { flow: Math.max(0, Math.round(model.flowMin * 0.2)), pressure: 0.02, temperature: 23.0, humidity: 47 },
  }
}

/*
 * Gunun saati + haftanin gunune gore GERCEKCI calisma modu - bir fabrika ritmi:
 *  - Hafta ici: gece kesinti -> sabah devreye girme -> mesai normal -> ogle/aksam tasarruf -> gece kesinti.
 *  - Hafta sonu: cogunlukla kesinti (Cmt sabahi kisa bakim/tasarruf).
 */
function scheduleMode(d: Date): Mode {
  const day = d.getDay() // 0=Paz .. 6=Cmt
  const hour = d.getHours() + d.getMinutes() / 60
  const weekend = day === 0 || day === 6
  if (weekend) {
    if (day === 6 && hour >= 9 && hour < 13) return 'standby' // Cmt sabahi kisa calisma/bakim
    return 'isolation'
  }
  if (hour < 6) return 'isolation' // gece
  if (hour < 7.5) return 'standby' // devreye girme/isinma
  if (hour >= 12 && hour < 13) return 'standby' // ogle molasi
  if (hour >= 18 && hour < 20) return 'standby' // mesai sonu
  if (hour >= 20) return 'isolation' // gece
  return 'normal' // mesai
}

function syntheticAt(absMs: number, model: AmsModel, targets: Record<Mode, T>): Sample {
  const d = new Date(absMs)
  const mode = scheduleMode(d)
  const base = targets[mode]
  const hour = d.getHours() + d.getMinutes() / 60
  const dayWarm = Math.sin(((hour - 6) / 24) * Math.PI * 2) // gunluk sicaklik ritmi (~14:00 tepe)
  const workWave = mode === 'normal' ? Math.sin(hour * 1.7) * 0.05 + 1 : 1 // mesai ici hafif debi dalgasi
  const noise = (a: number) => (Math.random() - 0.5) * a
  return [
    Math.round(absMs),
    round1(Math.max(0, base.flow * workWave + noise(Math.max(2, base.flow * 0.04)))),
    round3(Math.max(0, base.pressure + noise(0.01))),
    round2(base.temperature + dayWarm * 1.8 + noise(0.3)),
    round1(base.humidity - dayWarm * 2 + noise(0.6)),
    modeToIdx(mode),
  ]
}

/*
 * DEMO kovasina, simdiden geriye `days` gunluk gercekci gecmis uretir (dakikalik). Sunum tusu bunu cagirir.
 * Mevcut demo verisini TAZELER (ustune yazar) ki sunum her seferinde temiz/inandirici baslasin.
 */
export function seedDemoHistory(days: number, nowMs: number): { count: number } {
  const model = getActiveModel()
  const targets = targetsFor(model)
  const rows: Sample[] = []
  const start = nowMs - days * 24 * 60 * 60 * 1000
  let t = Math.ceil(start / BUCKET_MS) * BUCKET_MS
  for (; t <= nowMs; t += BUCKET_MS) rows.push(syntheticAt(t, model, targets))
  const pruned = prune(rows, nowMs)
  write('demo', pruned)
  const c = cache.demo
  c.rows = pruned
  c.lastBucket = pruned.length ? Math.floor(pruned[pruned.length - 1][0] / BUCKET_MS) : -1
  c.loaded = true
  return { count: pruned.length }
}
