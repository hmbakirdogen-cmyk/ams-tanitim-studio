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
import { PressureUnitToggle } from './PressureUnitToggle'
import { useLang } from '@/i18n'
import { localeOf } from '@/lib/format'
import type { Reading } from '@/data/types'

const TICKS = Array.from({ length: 17 }, (_, i) => i / 16) // X ekseni — 2 KAT sık (17 nokta) gerçek saat + düşey çizgi (Mehmet Abi)
// Mehmet abi 2026-06-19: gölge TEMA-DUYARLI — gündüz açık zeminde koyu gölge metni BULANIKLAŞTIRIYORDU; gündüz beyaz halo, gece koyu gölge.
const shadowDark = { textShadow: '0 1px 5px rgba(2,4,10,0.95), 0 0 2px rgba(2,4,10,0.9)' }
const shadowLight = { textShadow: '0 0 2px rgba(255,255,255,0.95), 0 0 1px rgba(255,255,255,0.95)' }
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

export function ChartOverlay({ reading, history = [], startedAt = 0, windowMs, onWindowChange, tabs, activeTab = 0, onTabChange, showPressureToggle = true, theme = 'dark' }: { reading: Reading | null; history?: Reading[]; startedAt?: number; windowMs?: number; onWindowChange?: (ms: number) => void; tabs?: string[]; activeTab?: number; onTabChange?: (i: number) => void; showPressureToggle?: boolean; theme?: 'dark' | 'light' }) {
  const { t } = useLang()
  const shadow = theme === 'light' ? shadowLight : shadowDark // gündüz/gece okunurluk (Mehmet abi)
  const elapsed = fmtElapsed(reading?.t ?? 0)
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
      <div
        /*
         * NE      : Mobil grafik kontrol satiri; dar ekranda iki satira nefesli akar, masaustunde eski konumunu korur.
         * NEDEN   : iPhone'da CANLI rozeti + sekmeler + zaman pencereleri ayni hatta sikisip grafik etiketlerinin ustune biniyordu.
         * NASIL   : Mobilde left/right siniri verilir, cip padding/fontlari kuculur; sm ve ustunde eski ferah olculere doner.
         * YAN ETKI: Grafik fonksiyonu degismez; sadece kontrol ciplerinin mobil yerlesimi daha guvenli olur.
         */
        className="absolute left-2 right-2 top-2 flex flex-wrap items-center gap-1.5 sm:left-3 sm:right-auto sm:top-3 sm:gap-2"
      >
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-[#050b18]/75 px-2 py-1 backdrop-blur-md sm:gap-2 sm:px-3 sm:py-1.5">
          <span className="relative grid h-2 w-2 place-items-center sm:h-2.5 sm:w-2.5">
            <span className="live-ring absolute h-2 w-2 rounded-full bg-[var(--c-saving)] sm:h-2.5 sm:w-2.5" />
          </span>
          <span className="text-[10px] font-semibold tracking-wide text-[var(--c-saving)] sm:text-[11px]">{t('CANLI')}</span>
          <span className="num text-xs font-bold text-white sm:text-sm">{elapsed}</span>
        </div>
        {/* SEKME (Mehmet abi 2026-06-19): Hava&Basınç ↔ Sıcaklık&Nem — grafik içeriğini değiştirir (aynı görünüm mantığı) */}
        {tabs && tabs.length > 1 && onTabChange && (
          <div className="pointer-events-auto flex shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-[#050b18]/75 p-0.5 backdrop-blur-md">
            {tabs.map((tb, i) => {
              const on = i === activeTab
              return (
                <button
                  key={tb}
                  onClick={() => onTabChange(i)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition sm:px-3.5 sm:text-[11px] ${on ? 'text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'}`}
                  style={on ? { background: 'linear-gradient(135deg, rgba(0,114,206,0.5), rgba(0,114,206,0.18))', boxShadow: 'inset 0 0 0 1px rgba(46,155,255,0.5)' } : undefined}
                >
                  {t(tb)}
                </button>
              )
            })}
          </div>
        )}
        {onWindowChange && windowMs != null && (
          <div className="pointer-events-auto flex shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-[#050b18]/75 p-0.5 backdrop-blur-md">
            {WINDOWS.map((w) => {
              const on = Math.abs(windowMs - w.ms) < 1
              return (
                <button
                  key={w.ms}
                  onClick={() => onWindowChange(w.ms)}
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold transition sm:px-2 sm:text-[10px] ${on ? 'text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'}`}
                  style={on ? { background: 'linear-gradient(135deg, rgba(0,114,206,0.5), rgba(0,114,206,0.18))', boxShadow: 'inset 0 0 0 1px rgba(46,155,255,0.5)' } : undefined}
                >
                  {t(w.label)}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* SAĞ-ÜST: BASINÇ BİRİMİ (MPa/bar) — Mehmet abi 2026-06-19: grafikten de değiştirilebilsin. YALNIZ basınç içeren sekmede (Sıcaklık/Nem'de gizli). */}
      {showPressureToggle && (
        <div className="pointer-events-auto absolute right-2 top-[4.6rem] sm:right-3 sm:top-3">
          <PressureUnitToggle />
        </div>
      )}

      {/* DÜŞEY zaman çizgileri (tüm şeritleri keser) — yatay ızgara + sol ölçek artık CANVAS'ta (her şerit kendi Y-ekseniyle, lane düzeni). */}
      <div className="absolute left-[42px] right-[42px] top-24 bottom-11 sm:left-[60px] sm:right-[60px] sm:top-16">
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
      <div
        /*
         * NE      : Mobilde seyreltilmis X-ekseni etiketleri.
         * NEDEN   : 390px iPhone genisliginde 17 saat etiketi yan yana okunamaz ve ust uste biner.
         * NASIL   : Tum dikey izgaralar kalir; metin etiketlerinde mobilde yalniz 0/4/8/12/16 tick'leri gorunur, sm+ eski 17 etiket.
         * YAN ETKI: Mobil daha temiz; masaustunde ayrintili saat skalasi aynen korunur.
         */
        className="absolute left-[42px] right-[42px] bottom-5 h-5 sm:left-[60px] sm:right-[60px]"
      >
        {TICKS.map((f, i) => {
          const edge = i === 0 ? 'translate-x-0' : i === TICKS.length - 1 ? '-translate-x-full' : '-translate-x-1/2'
          const mobileTick = i === 0 || i === TICKS.length - 1 || i % 4 === 0
          return (
            <div key={f} className={`absolute ${mobileTick ? 'flex' : 'hidden sm:flex'} flex-col items-center gap-0.5 ${edge}`} style={{ left: `${f * 100}%` }}>
              {/* Mehmet abi 2026-06-20: zaman scalası fontu ~%18 büyütüldü (8→9.5px saat, 7→8.5px göreli süre) → okunurluk arttı, çeviri/hiza aynı. */}
              <span className={`num whitespace-nowrap text-[8px] font-semibold sm:text-[9.5px] ${f === 1 ? 'text-[var(--c-saving)]' : 'text-[var(--ink-soft)]'}`} style={shadow}>{clockAt(f)}</span>
              <span className={`num whitespace-nowrap text-[7px] font-medium sm:text-[8.5px] ${f === 1 ? 'text-[var(--c-saving)]' : 'text-[var(--ink-soft)]'} opacity-75`} style={shadow}>{relAt(f)}</span>
            </div>
          )
        })}
      </div>

      {/* Alt aciklama (SOL=geçmiş, SAĞ=şimdi) */}
      <div className="absolute left-[60px] right-[60px] bottom-0.5 hidden items-center justify-between text-[9px] font-medium uppercase tracking-widest text-[var(--ink-soft)] sm:flex" style={shadow}>
        <span>← {t('geçmiş')}</span>
        <span>{t('şimdi')} →</span>
      </div>
    </div>
  )
}
