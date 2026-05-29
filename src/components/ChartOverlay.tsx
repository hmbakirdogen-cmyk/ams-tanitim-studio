/*
 * NE      : Grafik aciklama katmani - UST yatay serit (sol: akis suresi · sag: anlik degerler) + seviye cizgileri + X/Y eksen basliklari.
 * NEDEN   : Mehmet Bey: "anlik degerler daha mantikli yerde olsun, arka plandaki cizgilerin gorunumunu ETKILEMESIN".
 *           Cizgiler sag uca (en guncel) akiyor -> okuma paneli ust seride alindi; cizgilerin ustunu kapatmaz.
 * NASIL   : Ust margin'de (cizgi alaninin ustunde) koyu cam serit; force-dark-surface ile metin daima acik/net.
 * YAN ETKI: pointer-events yok. Renkler metrics.ts cizgi renkleriyle birebir (kimlik bagi).
 */
import { METRICS, type MetricDef } from '@/data/metrics'
import { WINDOW_POINTS } from './Hero3DChart'
import type { Reading } from '@/data/types'

const LEVELS = [100, 75, 50, 25, 0]
const TICKS = [0, 0.25, 0.5, 0.75, 1] // X ekseni zaman etiketleri (sol=eski, sag=simdi)
const shadow = { textShadow: '0 1px 5px rgba(2,4,10,0.95), 0 0 2px rgba(2,4,10,0.9)' }

function fmtElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`
}

// Ekranda cizilen pencerenin (son WINDOW_POINTS okuma) zaman uzunlugu (saniye)
function windowSpanSec(history: Reading[]): number {
  const win = history.slice(-WINDOW_POINTS)
  return win.length > 1 ? (win[win.length - 1].t - win[0].t) / 1000 : 0
}

export function ChartOverlay({ reading, history = [], metrics = METRICS }: { reading: Reading | null; history?: Reading[]; metrics?: MetricDef[] }) {
  const elapsed = fmtElapsed(reading?.t ?? 0)
  const spanSec = windowSpanSec(history)
  return (
    <div className="force-dark-surface pointer-events-none absolute inset-0">
      {/* UST YATAY SERIT - cizgilerin ustunde, gorunumu etkilemez */}
      <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-3">
        {/* Sol: canli akis suresi */}
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-[#050b18]/75 px-3 py-1.5 backdrop-blur-md">
          <span className="relative grid h-2.5 w-2.5 place-items-center">
            <span className="live-ring absolute h-2.5 w-2.5 rounded-full bg-[var(--c-saving)]" />
          </span>
          <span className="text-[11px] font-semibold tracking-wide text-[var(--c-saving)]">CANLI</span>
          <span className="num text-sm font-bold text-white">{elapsed}</span>
          <span className="text-[10px] text-[var(--ink-soft)]">akış süresi</span>
        </div>

        {/* Sag: anlik degerler (yatay, kompakt) */}
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 rounded-2xl border border-white/10 bg-[#050b18]/75 px-3 py-1.5 backdrop-blur-md">
          {metrics.map((m) => {
            const v = reading ? m.get(reading) : m.min
            const txt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: m.digits, maximumFractionDigits: m.digits }).format(v)
            return (
              <div key={m.key} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: m.color, boxShadow: `0 0 8px ${m.color}` }} />
                <span className="text-[11px] font-medium text-[var(--ink-soft)]">{m.name}</span>
                <span className="num text-sm font-bold text-white">{txt}</span>
                <span className="text-[10px] text-[var(--ink-soft)]">{m.unitShort}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Y ekseni basligi - dikey */}
      <div
        className="absolute left-1 top-1/2 text-[10px] font-semibold uppercase tracking-widest text-[var(--ink-soft)]"
        style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)', ...shadow }}
      >
        Seviye (%)
      </div>

      {/* Seviye cizgileri - her sensor kendi araliginda %0-100 */}
      <div className="absolute inset-x-0 bottom-16 top-20">
        {LEVELS.map((g) => (
          <div key={g} className="absolute inset-x-12 flex items-center" style={{ top: `${100 - g}%` }}>
            <span className="-translate-y-1/2 rounded bg-[#04060f]/40 px-1 text-[10px] font-medium text-[var(--ink)]" style={shadow}>
              %{g}
            </span>
            <div className="ml-2 h-px flex-1" style={{ background: 'var(--hair)' }} />
          </div>
        ))}
      </div>

      {/* X ekseni CANLI zaman etiketleri - sol=eski, sag=simdi (kullanici kolay anlasin) */}
      <div className="absolute inset-x-12 bottom-7 h-6">
        {TICKS.map((f) => {
          const secsAgo = spanSec * (1 - f)
          const label = f === 1 ? 'şimdi' : `−${Math.round(secsAgo)} sn`
          return (
            <div key={f} className="absolute flex -translate-x-1/2 flex-col items-center gap-0.5" style={{ left: `${f * 100}%` }}>
              <span className="h-2 w-px" style={{ background: 'var(--hair)' }} />
              <span className={`num rounded bg-[#04060f]/55 px-1.5 py-0.5 text-[10px] font-semibold ${f === 1 ? 'text-[var(--c-saving)]' : 'text-[var(--ink)]'}`} style={shadow}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Alt aciklama - zaman ekseni + seviye */}
      <div className="absolute inset-x-12 bottom-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-[var(--ink-soft)]" style={shadow}>
        <span>← geçmiş</span>
        <span>Zaman ekseni · dikey: seviye (%0–%100)</span>
        <span>şimdi →</span>
      </div>
    </div>
  )
}
