/*
 * NE      : Tek sensor kimlik karosu - ust renk seridi + ikon + ad + sayacli rakam + acik birim + KENDI mini canli grafigi.
 * NEDEN   : "her veri ikonu ile GRAFIK GORSELI ile kendi karakteristigini yansitsin" + "kartlar ayni boyutta olmasin" (size prop).
 * NASIL   : Dikey karo (h-full -> mozaik hucresini doldurur); Tilt3D ile 3D egim; Sparkline gecmisten kendi renginde mini grafik.
 * YAN ETKI: history'den son ~60 okuma alinir; metrics.ts'e sensor eklenince App'te karo eklemek yeterli.
 */
import { useMemo } from 'react'
import { Maximize2 } from 'lucide-react'
import type { MetricDef } from '@/data/metrics'
import type { Reading } from '@/data/types'
import { Tilt3D } from './Tilt3D'
import { Sparkline } from './Sparkline'
import { PressureUnitToggle } from './PressureUnitToggle'
import { useLang } from '@/i18n'
import { localeOf, fmtInt, fmtCompact } from '@/lib/format'

// Cihaz LCD'sindeki "toplam debi" (totalizer) ile BIREBIR ayni turuncu → kart içindeki Toplam satiri ekranla görsel olarak bağlanır.
const TOTAL_AMBER = '#FF761E'

// 'xs' = birleşik Canlı Panel sağ kolonu için KOMPAKT karo (Mehmet Abi: kartlar büyük olmasın) — sıkı, hiyerarşik düzen.
// 2026-06-20: kart grafiği kaldırılınca değer DOMINANT (büyük). sm RESPONSIVE (Mehmet abi: "sayfa küçülünce kart ölçüleri de o derece
//   küçülsün") → clamp(min, vw, max): geniş ekranda iri, pencere küçülünce orantılı küçülür (kart h clamp ile uyumlu, taşma yok).
type Size = 'lg' | 'md' | 'sm' | 'xs'
// sm değeri cqw (container query) — Canlı Panel kartları SAHNE genişliğine göre küçülür (vw=pencere değil; sol menü/dar alan sorunu çözülür).
const NUM_SIZE: Record<Size, string> = { lg: 'text-5xl', md: 'text-4xl', sm: 'text-[clamp(0.72rem,3.5cqw,2.1rem)]', xs: 'text-[1.45rem]' }

export function MetricCard({ def, history, size = 'md', total, onClick, tight = false }: { def: MetricDef; history: Reading[]; size?: Size; total?: number; onClick?: () => void; tight?: boolean }) {
  const { t } = useLang()
  const series = useMemo(() => history.slice(-60).map(def.get), [history, def])
  // TOPLAM (totalizer) — yalniz verildiginde (Canli Panel'de flow karti) gosterilir. Buyukse kompakt (1,2 Mn), degilse binlik ayracli.
  const totalText = total != null ? (total >= 1_000_000 ? fmtCompact(total) : fmtInt(total)) : null
  // SENKRON (#3): HAM son okuma değeri — useSmoothNumber lerp'i KALDIRILDI. Kart, PipeOverlay ve hub LCD aynı reading'i
  // aynı tikte tükettiği için artık ekranda TEK sayı görünür (eskiden kart geriden gelip "aynı veri farklı sayı" oluyordu).
  // Demo kaynağı zaten ease ile yumuşak akıyor; ekstra lerp gereksiz + tutarsızdı.
  const v = series.length ? series[series.length - 1] : def.min
  const text = new Intl.NumberFormat(localeOf(), {
    minimumFractionDigits: def.digits,
    maximumFractionDigits: def.digits,
  }).format(v)
  const Icon = def.icon

  // HAFİF ÇİZGİLERLE DERİNLİK (Mehmet Abi: "dot'ları boşver sevmedim; hafif çizgilerle derinlik hissi ver yeter"):
  //   kart yüzeyine 2 ince cam-parıltısı ışık bandı (diyagonal) → yüzey "ışığı yakalayan cam" gibi derinlik/eğim kazanır.
  //   Kart KENDİ renginde, çok sönük. RAM-bedava: tek statik inline katman (kare-başı canvas/tahsis YOK).
  const depthLayer = (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      style={{
        color: def.color,
        backgroundImage:
          'linear-gradient(118deg, transparent 22%, currentColor 36%, transparent 45%, transparent 64%, currentColor 76%, transparent 89%)',
        opacity: 0.08,
      }}
    />
  )

  // KOMPAKT (xs) — Mehmet Abi: "küçük kartlarda grafik görünmüyor." KÖK ÇÖZÜM: değer ile grafik YAN YANA → kart kısa olsa bile
  //   grafik SABİT yükseklikte, ASLA çökmez/gizlenmez. Üstte ad (ikincil), altta solda değer + sağda akan grafik. Detay = TIKLA.
  if (size === 'xs') {
    return (
      <Tilt3D onClick={onClick} className={`glass relative flex h-full flex-col justify-center overflow-hidden rounded-xl px-3 py-2 ${onClick ? 'cursor-pointer transition hover:brightness-110' : ''}`}>
        {depthLayer}
        <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: def.color, boxShadow: `0 0 12px ${def.color}` }} />
        {onClick && <Maximize2 size={11} className="pointer-events-none absolute right-2 top-2 text-[var(--ink-soft)] opacity-50" style={{ transform: 'translateZ(20px)' }} />}
        {/* 3D DERİNLİK: köşeden metrik renginde hafif radyal vurgu + ust-ic isik / alt-ic golge → kart boşlukta yüzer */}
        <span
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{ background: `radial-gradient(90% 70% at 85% 0%, ${def.color}1f, transparent 62%)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -16px 26px -20px rgba(0,0,0,0.5)' }}
        />
        {/* Ad (kompakt) */}
        <div className="relative flex items-center gap-1.5" style={{ transform: 'translateZ(14px)' }}>
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md" style={{ background: `${def.color}1f`, color: def.color }}>
            <Icon size={12} />
          </span>
          <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{t(def.name)}</span>
        </div>
        {/* Değer + GRAFİK YAN YANA → grafik her zaman görünür (kart kısa olsa bile çökmez). Grafik sabit 32px yükseklikte akar. */}
        <div className="relative mt-1 flex items-center gap-2" style={{ transform: 'translateZ(16px)' }}>
          <div className="flex shrink-0 items-baseline gap-0.5">
            <span className={`num ${NUM_SIZE.xs} font-bold leading-none text-white tabular-nums`} style={{ textShadow: `0 0 16px ${def.color}66` }}>{text}</span>
            <span className="text-[9px] font-medium text-[var(--ink-soft)]">{t(def.unitShort)}</span>
          </div>
          <div className="relative h-[32px] min-w-0 flex-1">
            <Sparkline values={series} color={def.color} min={def.min} max={def.max} fill head pulse baseline />
          </div>
        </div>
      </Tilt3D>
    )
  }

  // GRAFİK KALDIRILDI (Mehmet abi 2026-06-20: "kartlardaki grafik akışlarını kaldır") → sade premium: başlık ÜSTTE (ikincil),
  //   BÜYÜK değer ALTTA (dominant, göze hitap). justify-between → dikey denge. Sabit ölçü (h dışarıdan) + tabular-nums → oynamaz.
  return (
    <Tilt3D onClick={onClick} className={`glass relative flex h-full flex-col overflow-hidden rounded-2xl ${tight ? 'p-3' : 'p-4'} ${onClick ? 'cursor-pointer transition hover:brightness-110' : ''}`}>
      {depthLayer}
      {/* Ust renk seridi - grafikteki cizgiyle BIREBIR ayni renk */}
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: def.color, boxShadow: `0 0 18px ${def.color}` }} />
      {onClick && <Maximize2 size={13} className="pointer-events-none absolute right-2.5 top-2.5 text-[var(--ink-soft)] opacity-50" style={{ transform: 'translateZ(20px)' }} />}

      {/* Başlık — RESPONSIVE (Mehmet abi 2026-06-20: "sayı/yazı büyüklükleri + kart ölçüleri OTOMATİK, üst üste binmesin"): ikon kutusu +
          ad fontu pencereyle clamp; ad truncate + min-w-0 → dar pencerede taşmaz/çakışmaz. shrink-0 (kart sıkışsa kaybolmaz). */}
      <div className="flex min-w-0 shrink-0 items-center gap-1.5" style={{ transform: 'translateZ(22px)' }}>
        <span className={`grid shrink-0 place-items-center rounded-lg ${tight ? 'h-6 w-6' : 'h-[clamp(14px,3.4cqw,32px)] w-[clamp(14px,3.4cqw,32px)]'}`} style={{ background: `${def.color}1f`, color: def.color }}>
          <Icon className={tight ? 'h-3.5 w-3.5' : 'h-[58%] w-[58%]'} />
        </span>
        <span className="whitespace-nowrap text-[clamp(6px,1.7cqw,14px)] font-semibold text-[var(--ink)]">{t(def.name)}</span>
        {def.key === 'pressure' && <PressureUnitToggle color={def.color} />}
      </div>

      {/* BÜYÜK anlık değer (dominant) SAĞA YASLI — başlığın hemen ALTINDA, SABİT konum → tüm kartlarda anlık değerler AYNI yatay hizada.
          Değer + birim pencereyle clamp (otomatik) + min-w-0/tabular-nums → küçük pencerede çakışmaz. */}
      <div className="mt-2 flex min-w-0 shrink-0 items-baseline justify-end gap-1" style={{ transform: 'translateZ(14px)' }}>
        <span className={`num ${NUM_SIZE[size]} font-bold leading-none text-white tabular-nums`} style={{ textShadow: `0 0 24px ${def.color}66` }}>{text}</span>
        <span className="shrink-0 text-[clamp(6px,1.5cqw,13px)] font-medium text-[var(--ink-soft)]">{t(def.unitShort)}</span>
      </div>
      {/* esnek boşluk → TOPLAM'ı (varsa) kartın ALTINA iter; anlık değer üstte sabit kalır */}
      <div className="min-h-0 flex-1" />
      {/* TOPLAM (yalnız flow kartı) — PRESTİJLİ (Mehmet abi 2026-06-20): SABİT yükseklik (h-clamp = Hava ile yan kartların yükseklik FARKI)
          → üstündeki AYRAÇ çizgisi yandaki kısa kartların ALT kenarıyla yatayda HİZALI. Dikey şık dizilim: etiket (harf aralıklı) üstte,
          sayı + birim altta — birim (Litre) sayıyla AYNI renk (turuncu). Sayı KÜÇÜLMEDİ (clamp aynı). */}
      {totalText != null && (
        <div className="flex h-[clamp(52px,7.2vh,78px)] shrink-0 flex-col justify-center gap-0.5 border-t border-white/10" style={{ transform: 'translateZ(14px)' }}>
          {/* Mehmet abi 2026-06-20: "TOPLAM" yazısı SOLA yaslı (self-start), rakam SAĞA yaslı (self-end) + rakam üstteki anlık değerle
              AYNI BOYUT (NUM_SIZE[size]) ve sağ kenarda TAM HİZALI (ikisi de justify/self-end + aynı birim boyutu). */}
          <span className="self-start text-[9px] font-bold uppercase tracking-[0.22em]" style={{ color: TOTAL_AMBER, opacity: 0.82 }}>{t('Toplam')}</span>
          <div className="flex items-baseline gap-1.5 self-end">
            <span className="num text-[clamp(0.62rem,2.9cqw,1.8rem)] font-bold leading-none tabular-nums" style={{ color: TOTAL_AMBER, textShadow: `0 0 18px ${TOTAL_AMBER}88` }}>{totalText}</span>
            <span className="text-[clamp(6px,1.5cqw,13px)] font-medium" style={{ color: TOTAL_AMBER }}>Litre</span>
          </div>
        </div>
      )}

    </Tilt3D>
  )
}
