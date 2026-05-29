/*
 * NE      : Grafik aciklama katmani - UST yatay serit (sol: akis suresi · sag: anlik degerler) + seviye cizgileri + X/Y eksen basliklari.
 * NEDEN   : Mehmet Bey: "anlik degerler daha mantikli yerde olsun, arka plandaki cizgilerin gorunumunu ETKILEMESIN".
 *           Cizgiler sag uca (en guncel) akiyor -> okuma paneli ust seride alindi; cizgilerin ustunu kapatmaz.
 * NASIL   : Ust margin'de (cizgi alaninin ustunde) koyu cam serit; force-dark-surface ile metin daima acik/net.
 * YAN ETKI: pointer-events yok. Renkler metrics.ts cizgi renkleriyle birebir (kimlik bagi).
 */
import { METRICS, type MetricDef } from '@/data/metrics'
import type { Reading } from '@/data/types'

const LEVELS = [100, 75, 50, 25, 0]
const shadow = { textShadow: '0 1px 5px rgba(2,4,10,0.95), 0 0 2px rgba(2,4,10,0.9)' }

function fmtElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`
}

export function ChartOverlay({ reading, metrics = METRICS }: { reading: Reading | null; metrics?: MetricDef[] }) {
  const elapsed = fmtElapsed(reading?.t ?? 0)
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

      {/* X ekseni basligi - alt orta */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-widest text-[var(--ink-soft)]" style={shadow}>
        Zaman →
      </div>

      {/* Alt aciklama */}
      <div className="absolute bottom-5 left-12 text-[11px] text-[var(--ink-soft)]" style={shadow}>
        Her sensör kendi ölçeğinde · dikey eksen = seviye (%0–%100)
      </div>
    </div>
  )
}
