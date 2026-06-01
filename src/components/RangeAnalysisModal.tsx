/*
 * NE      : ZAMAN ARALIGI analiz penceresi - bir veri kumesinde TARIH+SAAT araligi secip (baslangic-bitis) o araligi inceler;
 *           "Rapor Ver" ile secili araligin TUM analizini yazdirilabilir ayri rapora (ReportView) dokulur.
 * NEDEN   : Mehmet Bey: "basit tarih+saat araligi sec; o araligin tum analizleri; CIKTI alinabilsin (yazdir/PDF)".
 * NASIL   : startedAt (t=0 duvar saati) ile her okuma mutlak zamana cevrilir; datetime-local giris + presetler; secili pencere
 *           icin her sensor Sparkline + en dusuk/ort/en yuksek + birim (KATI). "Rapor Ver" -> ReportView (yazdirilabilir).
 * YAN ETKI: Saf gorsel; canli gunluk ya da kayitli oturum (Reading[]) ile calisir.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Clock, FileBarChart } from 'lucide-react'
import { Sparkline } from './Sparkline'
import { ReportView } from './ReportView'
import { useMetrics } from '@/data/metrics'
import { toLocalInputValue, fromLocalInputValue } from '@/lib/datetime'
import { downsample } from '@/lib/series'
import { useLang } from '@/i18n'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import type { Reading } from '@/data/types'

// Hazir aralik dugmesi (mutlak ms). Canli oturum varsayilanini kullanir; tarihsel rapor takvim presetleri verir.
export interface RangePreset { label: string; start: number; end: number }

const fmt = (v: number, d: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)

function stats(series: number[]) {
  if (!series.length) return { min: 0, max: 0, avg: 0 }
  let min = series[0]
  let max = series[0]
  let sum = 0
  for (const v of series) {
    if (v < min) min = v
    if (v > max) max = v
    sum += v
  }
  return { min, max, avg: sum / series.length }
}

export function RangeAnalysisModal({
  points,
  startedAt,
  title,
  customer,
  onClose,
  presets,
  initialStart,
  initialEnd,
}: {
  points: Reading[]
  startedAt: number
  title: string
  customer?: import('@/data/recordings').CustomerInfo // saha/musteri bilgisi -> rapora basilir
  onClose: () => void
  presets?: RangePreset[] // verilmezse canli oturum varsayilanlari (Tumu/Son Yari/Son Ceyrek)
  initialStart?: number // acilis secimi (verilmezse tum aralik) - tarihsel raporda or. son 24 saat
  initialEnd?: number
}) {
  const { t } = useLang()
  useEscapeKey(onClose) // Escape ile kapat (QA)
  const metrics = useMetrics()
  const n = points.length
  const firstAbs = n ? startedAt + points[0].t : startedAt
  const lastAbs = n ? startedAt + points[n - 1].t : startedAt
  const clampAbs = (ms: number) => Math.max(firstAbs, Math.min(ms, lastAbs))

  const [startMs, setStartMs] = useState(() => clampAbs(initialStart ?? firstAbs))
  const [endMs, setEndMs] = useState(() => clampAbs(initialEnd ?? lastAbs))
  const [report, setReport] = useState<{ at: number } | null>(null)

  // Secili tarih/saat araligindaki noktalar.
  // datetime-local saniyeye yuvarlar -> secili saniyenin SONUNU da kapsa (son okumalar dusmesin).
  const endInclusive = endMs + 999
  const win = points.filter((p) => {
    const ab = startedAt + p.t
    return ab >= startMs && ab <= endInclusive
  })
  const spanSec = win.length > 1 ? (win[win.length - 1].t - win[0].t) / 1000 : 0

  const clampStart = (ms: number) => setStartMs(Math.max(firstAbs, Math.min(ms, endMs - 1000)))
  const clampEnd = (ms: number) => setEndMs(Math.min(lastAbs, Math.max(ms, startMs + 1000)))

  const span = lastAbs - firstAbs
  const PRESETS: RangePreset[] = presets ?? [
    { label: 'Tümü', start: firstAbs, end: lastAbs },
    { label: 'Son Yarı', start: firstAbs + span * 0.5, end: lastAbs },
    { label: 'Son Çeyrek', start: firstAbs + span * 0.75, end: lastAbs },
  ]

  return (
    <motion.div
      className="absolute inset-0 z-50 grid place-items-center bg-black/60 p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-3xl p-7"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--ink-soft)]">{t('Zaman Aralığı Analizi')}</div>
            <h2 className="text-xl font-bold text-white">{t(title)}</h2>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--hair)] text-[var(--ink-soft)] transition hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Tarih + saat araligi secimi */}
        <div className="mt-5 rounded-2xl border border-[var(--hair)] p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => { setStartMs(clampAbs(Math.min(p.start, p.end - 1000))); setEndMs(clampAbs(p.end)) }}
                className="rounded-lg border border-[var(--hair)] px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition hover:text-white"
              >
                {t(p.label)}
              </button>
            ))}
            <span className="ml-auto flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
              <Clock size={13} /> {t('Seçili aralık')}: <b className="num text-white">{fmt(spanSec, 1)} {t('sn')}</b> · {win.length} {t('ölçüm')}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] text-[var(--ink-soft)]">{t('Başlangıç (tarih + saat)')}</label>
              <input
                type="datetime-local"
                step={1}
                value={toLocalInputValue(startMs)}
                min={toLocalInputValue(firstAbs)}
                max={toLocalInputValue(lastAbs)}
                onChange={(e) => { const v = fromLocalInputValue(e.target.value); if (!Number.isNaN(v)) clampStart(v) }}
                className="num w-full rounded-lg border border-[var(--hair)] bg-[#0a1424] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--smc-bright)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--ink-soft)]">{t('Bitiş (tarih + saat)')}</label>
              <input
                type="datetime-local"
                step={1}
                value={toLocalInputValue(endMs)}
                min={toLocalInputValue(firstAbs)}
                max={toLocalInputValue(lastAbs)}
                onChange={(e) => { const v = fromLocalInputValue(e.target.value); if (!Number.isNaN(v)) clampEnd(v) }}
                className="num w-full rounded-lg border border-[var(--hair)] bg-[#0a1424] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--smc-bright)]"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setReport({ at: Date.now() })}
              disabled={win.length < 2}
              className="keep-white flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg,#0072CE,#2E9BFF)' }}
            >
              <FileBarChart size={16} /> {t('Rapor Ver')}
            </button>
          </div>
        </div>

        {/* Sensor bazli secili aralik onizleme */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {metrics.map((m) => {
            const series = win.map(m.get)
            const s = stats(series)
            return (
              <div key={m.key} className="rounded-2xl border border-[var(--hair)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color, boxShadow: `0 0 10px ${m.color}` }} />
                  <span className="text-sm font-semibold text-white">{t(m.name)}</span>
                  <span className="ml-auto text-[11px] text-[var(--ink-soft)]">{t(m.unitShort)}</span>
                </div>
                <Sparkline values={downsample(series)} color={m.color} min={m.min} max={m.max} height={48} />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {([['En düşük', s.min], ['Ortalama', s.avg], ['En yüksek', s.max]] as const).map(([label, val]) => (
                    <div key={label}>
                      <div className="text-[10px] text-[var(--ink-soft)]">{t(label)}</div>
                      <div className="num text-sm font-semibold text-white">
                        {fmt(val, m.digits)} <span className="text-[10px] font-normal text-[var(--ink-soft)]">{t(m.unitShort)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Yazdirilabilir rapor - secili araligin TUM analizi */}
      {report && (
        <ReportView
          points={win}
          startedAt={startedAt}
          rangeStart={startMs}
          rangeEnd={endMs}
          title={title}
          customer={customer}
          generatedAt={report.at}
          onClose={() => setReport(null)}
        />
      )}
    </motion.div>
  )
}
