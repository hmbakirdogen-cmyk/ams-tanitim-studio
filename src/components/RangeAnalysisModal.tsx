/*
 * NE      : Cok ozel ZAMAN ARALIGI analiz penceresi - bir veri kumesinde araik secip (slider/preset) o araligi inceler.
 * NEDEN   : Mehmet Bey: "hangi zaman araliginda veriler nasil; belli araliklari kolay sec/filtrele; cok ozel bir pencere".
 * NASIL   : baslangic/bitis % ile pencere; her sensor icin secili aralik Sparkline + en dusuk/ort/en yuksek + birim (KATI).
 * YAN ETKI: Saf gorsel; canli gunluk ya da kayitli oturum (Reading[]) ile calisir.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Clock } from 'lucide-react'
import { Sparkline } from './Sparkline'
import { METRICS } from '@/data/metrics'
import type { Reading } from '@/data/types'

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

const PRESETS: { label: string; start: number; end: number }[] = [
  { label: 'Tümü', start: 0, end: 100 },
  { label: 'Son Yarı', start: 50, end: 100 },
  { label: 'Son Çeyrek', start: 75, end: 100 },
]

export function RangeAnalysisModal({ points, title, onClose }: { points: Reading[]; title: string; onClose: () => void }) {
  const [startPct, setStartPct] = useState(0)
  const [endPct, setEndPct] = useState(100)

  const n = points.length
  const si = Math.floor((startPct / 100) * Math.max(0, n - 1))
  const ei = Math.ceil((endPct / 100) * Math.max(0, n - 1))
  const win = points.slice(si, ei + 1)
  const spanSec = win.length > 1 ? (win[win.length - 1].t - win[0].t) / 1000 : 0

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
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--ink-soft)]">Zaman Aralığı Analizi</div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--hair)] text-[var(--ink-soft)] transition hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Aralik secimi */}
        <div className="mt-5 rounded-2xl border border-[var(--hair)] p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => { setStartPct(p.start); setEndPct(p.end) }}
                className="rounded-lg border border-[var(--hair)] px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition hover:text-white"
              >
                {p.label}
              </button>
            ))}
            <span className="ml-auto flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
              <Clock size={13} /> Seçili aralık: <b className="num text-white">{fmt(spanSec, 1)} sn</b> · {win.length} ölçüm
            </span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="mb-1 text-[11px] text-[var(--ink-soft)]">Başlangıç (%{startPct})</div>
              <input type="range" min={0} max={99} value={startPct} onChange={(e) => setStartPct(Math.min(parseInt(e.target.value, 10), endPct - 1))} className="w-full" style={{ accentColor: '#2E9BFF' }} />
            </div>
            <div>
              <div className="mb-1 text-[11px] text-[var(--ink-soft)]">Bitiş (%{endPct})</div>
              <input type="range" min={1} max={100} value={endPct} onChange={(e) => setEndPct(Math.max(parseInt(e.target.value, 10), startPct + 1))} className="w-full" style={{ accentColor: '#41E08A' }} />
            </div>
          </div>
        </div>

        {/* Sensor bazli secili aralik analizi */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {METRICS.map((m) => {
            const series = win.map(m.get)
            const s = stats(series)
            return (
              <div key={m.key} className="rounded-2xl border border-[var(--hair)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color, boxShadow: `0 0 10px ${m.color}` }} />
                  <span className="text-sm font-semibold text-white">{m.name}</span>
                  <span className="ml-auto text-[11px] text-[var(--ink-soft)]">{m.unitShort}</span>
                </div>
                <Sparkline values={series} color={m.color} min={m.min} max={m.max} height={48} />
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {([['En düşük', s.min], ['Ortalama', s.avg], ['En yüksek', s.max]] as const).map(([label, val]) => (
                    <div key={label}>
                      <div className="text-[10px] text-[var(--ink-soft)]">{label}</div>
                      <div className="num text-sm font-semibold text-white">
                        {fmt(val, m.digits)} <span className="text-[10px] font-normal text-[var(--ink-soft)]">{m.unitShort}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}
