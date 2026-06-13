/*
 * NE      : Tek sensor kimlik karosu - ust renk seridi + ikon + ad + sayacli rakam + acik birim + KENDI mini canli grafigi.
 * NEDEN   : "her veri ikonu ile GRAFIK GORSELI ile kendi karakteristigini yansitsin" + "kartlar ayni boyutta olmasin" (size prop).
 * NASIL   : Dikey karo (h-full -> mozaik hucresini doldurur); Tilt3D ile 3D egim; Sparkline gecmisten kendi renginde mini grafik.
 * YAN ETKI: history'den son ~60 okuma alinir; metrics.ts'e sensor eklenince App'te karo eklemek yeterli.
 */
import { useMemo } from 'react'
import type { MetricDef } from '@/data/metrics'
import type { Reading } from '@/data/types'
import { Tilt3D } from './Tilt3D'
import { Sparkline } from './Sparkline'
import { useLang } from '@/i18n'
import { localeOf } from '@/lib/format'

// 'xs' = birleşik Canlı Panel sağ kolonu için KOMPAKT karo (Mehmet Abi: kartlar büyük olmasın) — sıkı, hiyerarşik düzen.
type Size = 'lg' | 'md' | 'sm' | 'xs'
const NUM_SIZE: Record<Size, string> = { lg: 'text-5xl', md: 'text-4xl', sm: 'text-3xl', xs: 'text-[1.7rem]' }
const SPARK_H: Record<Size, number> = { lg: 56, md: 44, sm: 38, xs: 30 }

// Eksen ucu etiketi (min/max) — kısa/okunaklı: gereksiz ondalık basmaz (örn. 0 / 8 / 100 / 0,9)
const rangeFmt = (v: number) => new Intl.NumberFormat(localeOf(), { maximumFractionDigits: 1 }).format(v)

export function MetricCard({ def, history, size = 'md' }: { def: MetricDef; history: Reading[]; size?: Size }) {
  const { t } = useLang()
  const series = useMemo(() => history.slice(-60).map(def.get), [history, def])
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

  // KOMPAKT (xs) — hiyerarşik: 1) üstte ikon+ad (ikincil, küçük), 2) BÜYÜK değer+birim (baskın), 3) altta detaylı-ferah sparkline.
  //   Dar sağ kolonda ferah durur; göz sırayla ad → değer → trend okur. Kart büyük değil; bilgi hiyerarşisi net.
  if (size === 'xs') {
    return (
      <Tilt3D className="glass relative flex h-full flex-col overflow-hidden rounded-xl px-3.5 py-2.5">
        {depthLayer}
        <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: def.color, boxShadow: `0 0 12px ${def.color}` }} />
        {/* 3D DERİNLİK (Mehmet Abi): köşeden metrik renginde hafif radyal vurgu + ust-ic isik / alt-ic golge → kart boşlukta yüzer */}
        <span
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{ background: `radial-gradient(90% 70% at 85% 0%, ${def.color}1f, transparent 62%)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -16px 26px -20px rgba(0,0,0,0.5)' }}
        />
        {/* 1) Kimlik şeridi (ikincil) */}
        <div className="relative flex items-center gap-2" style={{ transform: 'translateZ(14px)' }}>
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg" style={{ background: `${def.color}1f`, color: def.color }}>
            <Icon size={13} />
          </span>
          <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{t(def.name)}</span>
        </div>
        {/* 2) Baskın değer */}
        <div className="relative mt-1 flex items-baseline gap-1" style={{ transform: 'translateZ(18px)' }}>
          <span className={`num ${NUM_SIZE.xs} font-bold leading-none text-white tabular-nums`} style={{ textShadow: `0 0 18px ${def.color}66` }}>{text}</span>
          <span className="text-[10px] font-medium text-[var(--ink-soft)]">{t(def.unitShort)}</span>
        </div>
        {/* 3) Trend + EKSEN GÖSTERGESİ (Mehmet Abi: hareket + eksenler ne ifade ediyor): canlı nokta+nabız (hareket);
            SOL Y-ekseni = değer aralığı (max üst / min alt, birimiyle); ALT X-ekseni = zaman (geçmiş → şimdi). Ferah, kalabalıksız. */}
        <div className="relative mt-auto pt-1.5">
          <div className="flex items-stretch gap-1.5">
            {/* Y EKSENİ: değerin hangi aralıkta gezdiği (üst=max, alt=min) */}
            <div className="num flex flex-col justify-between py-0.5 text-right text-[8px] leading-none text-[var(--ink-soft)]">
              <span>{rangeFmt(def.max)}</span>
              <span>{rangeFmt(def.min)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <Sparkline values={series} color={def.color} min={def.min} max={def.max} height={SPARK_H.xs} head pulse baseline />
            </div>
          </div>
          {/* X EKSENİ: zaman yönü + Y ekseni birimi (eksenlerin ne ifade ettiği net) */}
          <div className="mt-1 flex items-center justify-between text-[8px] uppercase tracking-wide text-[var(--ink-soft)]/80">
            <span>{t(def.unitShort)}</span>
            <span>← {t('zaman')} · {t('şimdi')} →</span>
          </div>
        </div>
      </Tilt3D>
    )
  }

  return (
    <Tilt3D className="glass relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl p-5">
      {depthLayer}
      {/* Ust renk seridi - grafikteki cizgiyle BIREBIR ayni renk */}
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: def.color, boxShadow: `0 0 18px ${def.color}` }} />

      <div className="flex items-center gap-2.5" style={{ transform: 'translateZ(22px)' }}>
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          style={{ background: `${def.color}1f`, color: def.color }}
        >
          <Icon size={20} />
        </span>
        <span className="text-sm font-semibold text-[var(--ink)]">{t(def.name)}</span>
      </div>

      <div className="flex items-baseline gap-1.5" style={{ transform: 'translateZ(14px)' }}>
        <span
          className={`num ${NUM_SIZE[size]} font-bold leading-none text-white`}
          style={{ textShadow: `0 0 24px ${def.color}66` }}
        >
          {text}
        </span>
        <span className="text-xs font-medium text-[var(--ink-soft)]">{t(def.unitShort)}</span>
      </div>

      {/* Kendi mini canli grafigi - her veri kendi karakterini gosterir */}
      <div className="mt-auto -mb-1">
        <Sparkline values={series} color={def.color} min={def.min} max={def.max} height={SPARK_H[size]} />
      </div>
    </Tilt3D>
  )
}
