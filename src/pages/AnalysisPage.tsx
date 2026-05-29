/*
 * NE      : Gecmis Analizi sayfasi - TUM veri gecmisinden (canli gunluk) rahatca zaman araligi secip, o araligin TUM analizleri tek ekranda.
 * NEDEN   : Mehmet Bey: "ayri ekranda tum veri gecmisinden zaman araligini ayarla; o araligin tum analizleri orada olsun, cok detayli".
 * NASIL   : data.log uzerinde baslangic/bitis % + presetler; secili pencere icin: sure/olcum, mod dagilimi, tasarruf, her sensor stat+grafik.
 * YAN ETKI: Birim her yerde (KATI). Ekonomi varsayimlariyla (useEconomy) tasarruf hesaplanir. Saf gorsel; veri App'ten.
 */
import { useState } from 'react'
import { Clock, Layers, PiggyBank } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Tilt3D } from '@/components/Tilt3D'
import { Sparkline } from '@/components/Sparkline'
import { METRICS } from '@/data/metrics'
import { MODE_LABEL, type Mode } from '@/data/types'
import { useEconomy } from '@/data/economy'
import { litersToSavings, tickLitersSaved } from '@/lib/savings'
import { fmtInt, fmt1, fmtCompact, fmtTLCompact } from '@/lib/format'
import type { Reading } from '@/data/types'
import type { LiveState } from '@/hooks/useLiveReadings'

const fmt = (v: number, d: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)

const MODE_COLOR: Record<Mode, string> = { normal: '#2E9BFF', standby: '#41E08A', isolation: '#FFB04D' }

const PRESETS: { label: string; start: number; end: number }[] = [
  { label: 'Tümü', start: 0, end: 100 },
  { label: 'İlk Yarı', start: 0, end: 50 },
  { label: 'Son Yarı', start: 50, end: 100 },
  { label: 'Son Çeyrek', start: 75, end: 100 },
]

function stats(series: number[]) {
  if (!series.length) return { min: 0, max: 0, avg: 0, cur: 0 }
  let min = series[0]
  let max = series[0]
  let sum = 0
  for (const v of series) {
    if (v < min) min = v
    if (v > max) max = v
    sum += v
  }
  return { min, max, avg: sum / series.length, cur: series[series.length - 1] }
}

export function AnalysisPage({ data }: { data: LiveState }) {
  const { economy } = useEconomy()
  const [startPct, setStartPct] = useState(0)
  const [endPct, setEndPct] = useState(100)

  const log = data.log
  const n = log.length
  const si = Math.floor((startPct / 100) * Math.max(0, n - 1))
  const ei = Math.ceil((endPct / 100) * Math.max(0, n - 1))
  const win: Reading[] = log.slice(si, ei + 1)
  const spanSec = win.length > 1 ? (win[win.length - 1].t - win[0].t) / 1000 : 0

  // Mod dagilimi
  const modeCount: Record<Mode, number> = { normal: 0, standby: 0, isolation: 0 }
  win.forEach((r) => (modeCount[r.mode] += 1))
  const total = win.length || 1

  // Secili aralikta tasarruf
  let liters = 0
  for (let i = 1; i < win.length; i++) {
    const dt = (win[i].t - win[i - 1].t) / 1000
    if (dt > 0 && dt < 5) liters += tickLitersSaved(win[i].flow, dt, economy.baselineFlow)
  }
  const sv = litersToSavings(liters, economy)

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      <PageHeader title="Geçmiş Analizi" subtitle="Tüm veri geçmişinden bir zaman aralığı seçin — o aralığın tüm analizleri" />

      {n < 2 ? (
        <div className="glass flex flex-1 items-center justify-center rounded-2xl p-10 text-sm text-[var(--ink-soft)]">
          Henüz yeterli veri yok — Canlı Panel bir süre açık kalsın, sonra burada analiz edin.
        </div>
      ) : (
        <>
          {/* Aralik secici */}
          <div className="glass rounded-2xl p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => { setStartPct(p.start); setEndPct(p.end) }}
                  className="rounded-lg border border-[var(--hair)] px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition hover:text-[var(--ink)]"
                >
                  {p.label}
                </button>
              ))}
              <span className="ml-auto flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
                <Clock size={13} /> Seçili: <b className="num text-[var(--ink)]">{fmt(spanSec, 1)} sn</b> · {win.length} ölçüm
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

          {/* Ozet: mod dagilimi + tasarruf */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Tilt3D className="glass rounded-2xl p-5 lg:col-span-2" max={4}>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]"><Layers size={16} className="text-[var(--smc-bright)]" /> Mod Dağılımı (süre payı)</div>
              <div className="space-y-2.5">
                {(['normal', 'standby', 'isolation'] as Mode[]).map((m) => {
                  const pct = (modeCount[m] / total) * 100
                  return (
                    <div key={m} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-xs text-[var(--ink-soft)]">{MODE_LABEL[m]}</span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: MODE_COLOR[m], boxShadow: `0 0 12px ${MODE_COLOR[m]}` }} />
                      </div>
                      <span className="num w-12 text-right text-sm font-semibold text-[var(--ink)]">%{fmt1(pct)}</span>
                    </div>
                  )
                })}
              </div>
            </Tilt3D>

            <Tilt3D className="glass relative overflow-hidden rounded-2xl p-5" max={5}>
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-25 blur-3xl" style={{ background: 'var(--c-saving)' }} />
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]"><PiggyBank size={16} className="text-[var(--c-saving)]" /> Bu Aralıktaki Tasarruf</div>
              <div className="num mt-2 text-3xl font-bold text-[var(--c-saving)]">{fmtTLCompact(sv.tl)}</div>
              <div className="num mt-1 text-sm text-[var(--ink-soft)]">{fmtCompact(sv.kwh)} kWh · {fmtCompact(sv.co2)} kg CO₂</div>
            </Tilt3D>
          </div>

          {/* Her sensor: secili aralik detayli */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {METRICS.map((m) => {
              const series = win.map(m.get)
              const s = stats(series)
              const Icon = m.icon
              return (
                <Tilt3D key={m.key} className="glass relative flex flex-col gap-3 overflow-hidden rounded-2xl p-5" max={4}>
                  <span className="absolute inset-x-0 top-0 h-1" style={{ background: m.color, boxShadow: `0 0 18px ${m.color}` }} />
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${m.color}1f`, color: m.color }}><Icon size={18} /></span>
                    <span className="text-sm font-semibold text-[var(--ink)]">{m.name}</span>
                    <span className="ml-auto flex items-baseline gap-1">
                      <span className="num text-2xl font-bold text-white" style={{ textShadow: `0 0 18px ${m.color}66` }}>{fmt(s.cur, m.digits)}</span>
                      <span className="text-xs text-[var(--ink-soft)]">{m.unitShort}</span>
                    </span>
                  </div>
                  <Sparkline values={series} color={m.color} min={m.min} max={m.max} height={50} />
                  <div className="grid grid-cols-3 gap-2">
                    {([['En düşük', s.min], ['Ortalama', s.avg], ['En yüksek', s.max]] as const).map(([label, val]) => (
                      <div key={label}>
                        <div className="text-[10px] text-[var(--ink-soft)]">{label}</div>
                        <div className="num text-sm font-semibold text-white">
                          {fmt(val, m.digits)} <span className="text-[10px] font-normal text-[var(--ink-soft)]">{m.unitShort}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Tilt3D>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
