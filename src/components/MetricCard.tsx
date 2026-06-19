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
type Size = 'lg' | 'md' | 'sm' | 'xs'
const NUM_SIZE: Record<Size, string> = { lg: 'text-5xl', md: 'text-4xl', sm: 'text-3xl', xs: 'text-[1.45rem]' }

export function MetricCard({ def, history, size = 'md', total, onClick }: { def: MetricDef; history: Reading[]; size?: Size; total?: number; onClick?: () => void }) {
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

  return (
    <Tilt3D onClick={onClick} className={`glass relative flex h-full flex-col gap-2 overflow-hidden rounded-2xl p-4 ${onClick ? 'cursor-pointer transition hover:brightness-110' : ''}`}>
      {depthLayer}
      {/* Ust renk seridi - grafikteki cizgiyle BIREBIR ayni renk */}
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: def.color, boxShadow: `0 0 18px ${def.color}` }} />
      {onClick && <Maximize2 size={13} className="pointer-events-none absolute right-2.5 top-2.5 text-[var(--ink-soft)] opacity-50" style={{ transform: 'translateZ(20px)' }} />}

      {/* Başlık */}
      <div className="flex items-center gap-2" style={{ transform: 'translateZ(22px)' }}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${def.color}1f`, color: def.color }}>
          <Icon size={17} />
        </span>
        <span className="text-sm font-semibold text-[var(--ink)]">{t(def.name)}</span>
        {def.key === 'pressure' && <PressureUnitToggle color={def.color} />}
      </div>

      {/* ANLIK değer + TOPLAM AYNI SATIRDA (Mehmet Abi: kartta da grafik görünmez oluyordu) → dikey yer açılır, grafik HER ZAMAN sığar. */}
      <div className="flex items-end justify-between gap-2" style={{ transform: 'translateZ(14px)' }}>
        <div className="flex items-baseline gap-1.5">
          <span className={`num ${NUM_SIZE[size]} font-bold leading-none text-white`} style={{ textShadow: `0 0 24px ${def.color}66` }}>{text}</span>
          <span className="text-xs font-medium text-[var(--ink-soft)]">{t(def.unitShort)}</span>
        </div>
        {totalText != null && (
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: TOTAL_AMBER }}>{t('Toplam')}</span>
            <span className="num text-base font-bold leading-none text-white tabular-nums" style={{ textShadow: `0 0 14px ${TOTAL_AMBER}55` }}>{totalText} <span className="text-[9px] font-medium text-[var(--ink-soft)]">Litre</span></span>
          </div>
        )}
      </div>

      {/* Kendi mini canli grafigi — kalan alanı DOLDURUR + GARANTİ min yükseklik (kart kısa olsa bile HER ZAMAN görünür) */}
      <div className="mt-0.5 min-h-[44px] flex-1">
        <Sparkline values={series} color={def.color} min={def.min} max={def.max} fill head pulse baseline />
      </div>
    </Tilt3D>
  )
}
