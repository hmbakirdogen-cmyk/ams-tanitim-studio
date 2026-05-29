/*
 * NE      : Grafik aciklama katmani - X/Y eksen basliklari + seviye cizgileri (%0-100) + sag CANLI okuma paneli + zaman ekseni.
 * NEDEN   : Grafik kendini aciklasin; "ustteki anlik veriler arka planla KARISMASIN" -> koyu net zemin + metin golgesi (yuksek kontrast).
 * NASIL   : Sag okumalar tek koyu cam panelde (okunakli); tum etiketlerde metin golgesi; eksen basliklari net.
 * YAN ETKI: pointer-events yok (3D etkilesimi engellemez). Renkler metrics.ts cizgi renkleriyle birebir (kimlik bagi).
 */
import { METRICS, type MetricDef } from '@/data/metrics'
import type { Reading } from '@/data/types'

const LEVELS = [100, 75, 50, 25, 0]
const shadow = { textShadow: '0 1px 5px rgba(2,4,10,0.95), 0 0 2px rgba(2,4,10,0.9)' }

// Akis suresini MM:SS (uzunsa HH:MM:SS) bicimler
function fmtElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`
}

export function ChartOverlay({ reading }: { reading: Reading | null }) {
  const elapsed = fmtElapsed(reading?.t ?? 0)
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Canli zaman sayaci - akisin basindan beri gecen sure (sol ust) */}
      <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-[#050b18]/80 px-3 py-1.5 backdrop-blur-md">
        <span className="relative grid h-2.5 w-2.5 place-items-center">
          <span className="live-ring absolute h-2.5 w-2.5 rounded-full bg-[var(--c-saving)]" />
        </span>
        <span className="text-[11px] font-semibold tracking-wide text-[var(--c-saving)]">CANLI</span>
        <span className="num text-sm font-bold text-white">{elapsed}</span>
        <span className="text-[10px] text-[var(--ink-soft)]">akış süresi</span>
      </div>

      {/* Y ekseni basligi - dikey, net */}
      <div
        className="absolute left-1 top-1/2 text-[10px] font-semibold uppercase tracking-widest text-[var(--ink-soft)]"
        style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)', ...shadow }}
      >
        Seviye (%)
      </div>

      {/* Seviye cizgileri - her sensor kendi araliginda %0-100 */}
      <div className="absolute inset-x-0 bottom-16 top-16">
        {LEVELS.map((g) => (
          <div key={g} className="absolute inset-x-12 flex items-center" style={{ top: `${100 - g}%` }}>
            <span className="-translate-y-1/2 rounded bg-[#04060f]/70 px-1 text-[10px] font-medium text-[var(--ink)]" style={shadow}>
              %{g}
            </span>
            <div className="ml-2 h-px flex-1" style={{ background: 'var(--hair)' }} />
          </div>
        ))}
      </div>

      {/* Sag CANLI okuma paneli - tek koyu cam panel (yuksek kontrast, arka planla karismaz) */}
      <div className="absolute right-5 top-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#050b18]/80 p-2.5 backdrop-blur-md" style={{ boxShadow: '0 10px 40px -12px rgba(0,0,0,0.8)' }}>
        <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--ink-soft)]">Anlık Değerler</div>
        <div className="flex flex-col gap-1.5">
          {METRICS.map((m) => {
            const v = reading ? m.get(reading) : m.min
            const txt = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: m.digits, maximumFractionDigits: m.digits }).format(v)
            return (
              <div key={m.key} className="flex items-center gap-2 rounded-lg px-2 py-1" style={{ boxShadow: `inset 3px 0 0 ${m.color}` }}>
                <span className="h-2 w-2 rounded-full" style={{ background: m.color, boxShadow: `0 0 8px ${m.color}` }} />
                <span className="text-[11px] font-medium text-[var(--ink-soft)]">{m.name}</span>
                <span className="num ml-auto text-sm font-bold text-white">{txt}</span>
                <span className="w-12 text-[10px] text-[var(--ink-soft)]">{m.unitShort}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* X ekseni basligi - alt orta, net */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-widest text-[var(--ink-soft)]" style={shadow}>
        Zaman →
      </div>

      {/* Alt aciklama - olcek mantigi */}
      <div className="absolute bottom-5 left-12 text-[11px] text-[var(--ink-soft)]" style={shadow}>
        Her sensör kendi ölçeğinde · dikey eksen = seviye (%0–%100)
      </div>
    </div>
  )
}
