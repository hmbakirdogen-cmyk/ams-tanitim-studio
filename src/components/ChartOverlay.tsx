/*
 * NE      : Canlı 3D grafik açıklama katmanı — SOL: her sensörün KENDİ renginde değeri + ölçeği (min–max); ALT: GERÇEK SAAT (sık);
 *           grafik üstünde yatay seviye + DÜŞEY ışık çizgileri (tatlı ızgara); SOL-ÜST: CANLI süre + ZAMAN PENCERESİ seçici.
 * NEDEN   : Efekan Bey/saha + Mehmet Abi: "yüzde değil HER borunun değer skalası dikey eksende, kolay ayırt edilen rahat görünüm;
 *           gerçek saat daha sık; düşey çizgilerle tatlı görünüm; üst üste binen etiket OLMASIN." → değerler artık SOL eksende
 *           düzenli (çakışmaz), renklerle ayrışır; boru ucundaki yüzen etiketler kaldırıldı.
 * NASIL   : Saf overlay (pointer-events yok; yalnız pencere seçici tıklanır). Renkler metrics.ts ile birebir (kimlik bağı).
 *           Saat = startedAt + gösterilen pencere (LivePage'de seçili aralığa kırpılmış trend) göreli t.
 * YAN ETKI: Arkadaki 3D boru görünümünü etkilemez (üstte, şeffaf). i18n korunur.
 */
import { METRICS, type MetricDef } from '@/data/metrics'
import { PressureUnitToggle } from './PressureUnitToggle'
import { useLang } from '@/i18n'
import { localeOf } from '@/lib/format'
import type { Reading } from '@/data/types'

const TICKS = Array.from({ length: 17 }, (_, i) => i / 16) // X ekseni — 2 KAT sık (17 nokta) gerçek saat + düşey çizgi (Mehmet Abi)
const shadow = { textShadow: '0 1px 5px rgba(2,4,10,0.95), 0 0 2px rgba(2,4,10,0.9)' }
// ZAMAN PENCERESI secenekleri (Mehmet Abi: "15 dk'lik araligi sifira dogru kolayca ayarlayabilelim") — 15 dk'dan asagi.
const WINDOWS = [
  { ms: 30_000, label: '30 sn' },
  { ms: 60_000, label: '1 dk' },
  { ms: 5 * 60_000, label: '5 dk' },
  { ms: 10 * 60_000, label: '10 dk' }, // Mehmet abi 2026-06-19
  { ms: 15 * 60_000, label: '15 dk' },
]

function fmtElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`
}

export function ChartOverlay({ reading, history = [], metrics = METRICS, startedAt = 0, windowMs, onWindowChange }: { reading: Reading | null; history?: Reading[]; metrics?: MetricDef[]; startedAt?: number; windowMs?: number; onWindowChange?: (ms: number) => void }) {
  const { t } = useLang()
  const elapsed = fmtElapsed(reading?.t ?? 0)
  const nf = (v: number, d = 0) => new Intl.NumberFormat(localeOf(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
  // GERÇEK SAAT (Efekan Bey): history = gösterilen pencere → X tikinin duvar saati = startedAt + göreli t.
  const win = history
  const hasWin = win.length > 1
  const win0t = hasWin ? win[0].t : 0
  const winNt = hasWin ? win[win.length - 1].t : (reading?.t ?? 0)
  const clockAt = (f: number): string =>
    new Date(startedAt + win0t + f * (winNt - win0t)).toLocaleTimeString(localeOf(), { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  // Mehmet abi 2026-06-19: her saat etiketinin ALTINA ŞİMDİ'ye göre göreli süre (sağ uç 0, sola geçmiş). 60 sn ve üstü DAKİKA+SANİYE
  //   (geniş pencerede 600 sn yerine "−10 dk" okunaklı); 60 sn altı sadece saniye.
  const relAt = (f: number): string => {
    const s = Math.round(((1 - f) * (winNt - win0t)) / 1000)
    if (s <= 0) return `0 ${t('sn')}`
    if (s < 60) return `−${s} ${t('sn')}`
    const m = Math.floor(s / 60), ss = s % 60
    return ss === 0 ? `−${m} ${t('dk')}` : `−${m} ${t('dk')} ${ss} ${t('sn')}`
  }

  return (
    <div className="force-dark-surface pointer-events-none absolute inset-0">
      {/* SOL-ÜST: CANLI süre + ZAMAN PENCERESİ seçici */}
      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
        <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-[#050b18]/75 px-3 py-1.5 backdrop-blur-md">
          <span className="relative grid h-2.5 w-2.5 place-items-center">
            <span className="live-ring absolute h-2.5 w-2.5 rounded-full bg-[var(--c-saving)]" />
          </span>
          <span className="text-[11px] font-semibold tracking-wide text-[var(--c-saving)]">{t('CANLI')}</span>
          <span className="num text-sm font-bold text-white">{elapsed}</span>
        </div>
        {onWindowChange && windowMs != null && (
          <div className="pointer-events-auto flex shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-[#050b18]/75 p-0.5 backdrop-blur-md">
            {WINDOWS.map((w) => {
              const on = Math.abs(windowMs - w.ms) < 1
              return (
                <button
                  key={w.ms}
                  onClick={() => onWindowChange(w.ms)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${on ? 'text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'}`}
                  style={on ? { background: 'linear-gradient(135deg, rgba(0,114,206,0.5), rgba(0,114,206,0.18))', boxShadow: 'inset 0 0 0 1px rgba(46,155,255,0.5)' } : undefined}
                >
                  {t(w.label)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* SAĞ-ÜST: BASINÇ BİRİMİ (MPa/bar) — Mehmet abi 2026-06-19: grafikten de değiştirilebilsin (kartlarla aynı global anahtar). */}
      <div className="pointer-events-auto absolute right-3 top-3">
        <PressureUnitToggle />
      </div>

      {/* DÜŞEY zaman çizgileri (tüm şeritleri keser) — yatay ızgara + sol ölçek artık CANVAS'ta (her şerit kendi Y-ekseniyle, lane düzeni). */}
      <div className="absolute left-[60px] right-[60px] top-16 bottom-11">
        {TICKS.map((f) => (
          <div
            key={`v${f}`}
            className="absolute top-0 bottom-0 w-px"
            style={
              f === 1
                ? { left: '100%', background: 'rgba(65,224,138,0.55)' } // "şimdi" → belirgin yeşil
                : { left: `${f * 100}%`, backgroundImage: 'repeating-linear-gradient(180deg, rgba(130,175,235,0.5) 0 4px, transparent 4px 9px)', opacity: 0.7 } // düşey kesik ışık çizgisi
            }
          />
        ))}
      </div>

      {/* X ekseni — GERÇEK SAAT (sık), plot ile hizalı. Uç etiketler KENARDAN TAŞMASIN (Mehmet Abi: yeşil "şimdi" saati tam görünsün):
          ilk=sola, son=sağa hizalı; ortadakiler ortalı. */}
      <div className="absolute left-[60px] right-[60px] bottom-5 h-5">
        {TICKS.map((f, i) => {
          const edge = i === 0 ? 'translate-x-0' : i === TICKS.length - 1 ? '-translate-x-full' : '-translate-x-1/2'
          return (
            <div key={f} className={`absolute flex flex-col items-center gap-0.5 ${edge}`} style={{ left: `${f * 100}%` }}>
              <span className={`num whitespace-nowrap text-[8px] font-semibold ${f === 1 ? 'text-[var(--c-saving)]' : 'text-[var(--ink-soft)]'}`} style={shadow}>{clockAt(f)}</span>
              <span className={`num whitespace-nowrap text-[7px] font-medium ${f === 1 ? 'text-[var(--c-saving)]' : 'text-[var(--ink-soft)]'} opacity-75`} style={shadow}>{relAt(f)}</span>
            </div>
          )
        })}
      </div>

      {/* Alt aciklama (SOL=geçmiş, SAĞ=şimdi) */}
      <div className="absolute left-[60px] right-[60px] bottom-0.5 flex items-center justify-between text-[9px] font-medium uppercase tracking-widest text-[var(--ink-soft)]" style={shadow}>
        <span>← {t('geçmiş')}</span>
        <span>{t('şimdi')} →</span>
      </div>
    </div>
  )
}
