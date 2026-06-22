/*
 * NE      : Tek sensor kimlik karosu - ust renk seridi + ikon + ad + sayacli rakam + acik birim + KENDI mini canli grafigi.
 * NEDEN   : "her veri ikonu ile GRAFIK GORSELI ile kendi karakteristigini yansitsin" + "kartlar ayni boyutta olmasin" (size prop).
 * NASIL   : Dikey karo (h-full -> mozaik hucresini doldurur); Tilt3D ile 3D egim; Sparkline gecmisten kendi renginde mini grafik.
 * YAN ETKI: history'den son ~60 okuma alinir; metrics.ts'e sensor eklenince App'te karo eklemek yeterli.
 */
import { useMemo } from 'react'
import { Maximize2, Wind } from 'lucide-react'
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
  // Mini grafik EKSEN ipucu formatı (Mehmet abi: "kendi eksenleri ile") — birim-duyarlı: def (MPa/bar) değişince yeniden kurulur → eksen otomatik doğru.
  const axFmt = (v: number) => new Intl.NumberFormat(localeOf(), { maximumFractionDigits: def.digits }).format(v)
  // Basınç grafiği TEPESİ = çalışma aralığı (m.max×0.75 = 0,6 MPa / 6 bar) — büyük grafikle (LiveChart2D) BİREBİR scala (Mehmet abi 2026-06-20).
  const chartMax = def.key === 'pressure' ? def.max * 0.75 : def.max
  // SENKRON (#3): HAM son okuma değeri — useSmoothNumber lerp'i KALDIRILDI. Kart, PipeOverlay ve hub LCD aynı reading'i
  // aynı tikte tükettiği için artık ekranda TEK sayı görünür (eskiden kart geriden gelip "aynı veri farklı sayı" oluyordu).
  // Demo kaynağı zaten ease ile yumuşak akıyor; ekstra lerp gereksiz + tutarsızdı.
  const v = series.length ? series[series.length - 1] : def.min
  const text = new Intl.NumberFormat(localeOf(), {
    minimumFractionDigits: def.digits,
    maximumFractionDigits: def.digits,
  }).format(v)
  const Icon = def.icon
  const compact = size === 'sm' || tight
  const compactPressureToggle = def.key === 'pressure' && compact

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

  /*
   * NE      : Kartin ic yuzeyini opaklastiran okunurluk kalkani.
   * NEDEN   : Kartlar cam oldugu icin AMS sahnesindeki zemin/arka plan cizgileri kart icinden gorunuyordu.
   * NASIL   : Icerigin en altina koyu, neredeyse opak bir gradient yerlestirilir; metrik rengi/depth/hud katmanlari ustte kalir.
   * YAN ETKI: Kartlar daha net okunur; alttaki cihaz/uzay cizgileri kart icine sizmaz, deger ve mini grafik davranisi degismez.
   */
  const readabilityLayer = (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
      style={{
        background: 'linear-gradient(160deg, rgba(8,18,38,0.96), rgba(4,10,24,0.93))',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -16px 26px -20px rgba(0,0,0,0.65)',
      }}
    />
  )

  // UZAY KONSOLU dokunuşu — AĞIRBAŞLI (Mehmet abi 2026-06-20: "uzay üssü hissi AMA asla şımarıklık YOK; JP SMC'ye gidiyor"):
  //   Kartın 4 köşesinde FISILTI gibi ince L işaretleri → "hassas gösterge/enstrüman" çerçevesi. Parlak/gamer HUD DEĞİL: çok sönük
  //   (opacity ~0.2), küçük, metrik renginde (kartın kimliğiyle uyumlu ama bağırmayan). Scanline vb. gösterişli doku YOK.
  //   Saf CSS statik katman (kare-başı tahsis/rAF YOK; GPU compositor) → RAM bedava, perf işiyle uyumlu.
  const hudLayer = (
    <span aria-hidden className="pointer-events-none absolute inset-2" style={{ color: def.color }}>
      <span className="absolute left-0 top-0 h-2 w-2 border-l border-t" style={{ borderColor: 'currentColor', opacity: 0.2 }} />
      <span className="absolute right-0 top-0 h-2 w-2 border-r border-t" style={{ borderColor: 'currentColor', opacity: 0.2 }} />
      <span className="absolute bottom-0 left-0 h-2 w-2 border-b border-l" style={{ borderColor: 'currentColor', opacity: 0.2 }} />
      <span className="absolute bottom-0 right-0 h-2 w-2 border-b border-r" style={{ borderColor: 'currentColor', opacity: 0.2 }} />
    </span>
  )

  /*
   * NE      : Kart icindeki perspektif/zemin cizgilerini kapat.
   * NEDEN   : Mehmet Abi: kartlarin icinde AMS cihazinin arka plan cizgileri gorunmesin; veri alani temiz ve okunur kalsin.
   * NASIL   : Eski spaceLayer render edilmez; kartin cam/renk/hud katmanlari ve mini grafikler aynen korunur.
   * YAN ETKI: Kart ici daha sade olur; masaustu ve mobilde deger, birim, toplam ve grafik alanlari etkilenmez.
   */
  const spaceLayer = null

  // KOMPAKT (xs) — Mehmet Abi: "küçük kartlarda grafik görünmüyor." KÖK ÇÖZÜM: değer ile grafik YAN YANA → kart kısa olsa bile
  //   grafik SABİT yükseklikte, ASLA çökmez/gizlenmez. Üstte ad (ikincil), altta solda değer + sağda akan grafik. Detay = TIKLA.
  if (size === 'xs') {
    return (
      <Tilt3D onClick={onClick} className={`glass relative flex h-full flex-col justify-center overflow-hidden rounded-xl px-3 py-2 ${onClick ? 'cursor-pointer transition hover:brightness-110' : ''}`}>
        {readabilityLayer}{depthLayer}{spaceLayer}{hudLayer}
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
            <Sparkline values={series} color={def.color} min={def.min} max={chartMax} fill head pulse baseline />
          </div>
        </div>
      </Tilt3D>
    )
  }

  // GRAFİK KALDIRILDI (Mehmet abi 2026-06-20: "kartlardaki grafik akışlarını kaldır") → sade premium: başlık ÜSTTE (ikincil),
  //   BÜYÜK değer ALTTA (dominant, göze hitap). justify-between → dikey denge. Sabit ölçü (h dışarıdan) + tabular-nums → oynamaz.
  return (
    // NE      : Kart ic iskeleti dar pencerede de bozulmadan kalir: baslik tasmaz, deger-birim hizasi korunur, toplam satiri carpismadan akar.
    // NEDEN   : Mehmet abi geri bildirimi: pencere daralinca kart ici yazi/rakam yapisi dagiliyordu.
    // NASIL   : sm/tight modda daha kompakt bosluklar, truncate baslik, deger satirinda min-w-0 + tabular hiza; toplam satiri daha guvenli.
    // YAN ETKI: Gorsel dil korunur; yalnizca ic yerlesim daha stabil hale gelir.
    <Tilt3D onClick={onClick} className={`glass relative flex h-full flex-col overflow-hidden rounded-2xl ${compact ? 'p-2.5' : 'p-4'} ${onClick ? 'cursor-pointer transition hover:brightness-110' : ''}`}>
      {readabilityLayer}{depthLayer}{spaceLayer}{hudLayer}
      {/* Ust renk seridi - grafikteki cizgiyle BIREBIR ayni renk */}
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: def.color, boxShadow: `0 0 18px ${def.color}` }} />
      {onClick && <Maximize2 size={13} className="pointer-events-none absolute right-2.5 top-2.5 text-[var(--ink-soft)] opacity-50" style={{ transform: 'translateZ(20px)' }} />}
      {compactPressureToggle && (
        <div className="absolute right-2 top-2 z-[2]" style={{ transform: 'translateZ(24px)' }}>
          <PressureUnitToggle color={def.color} />
        </div>
      )}

      {/* Başlık — RESPONSIVE (Mehmet abi 2026-06-20: "sayı/yazı büyüklükleri + kart ölçüleri OTOMATİK, üst üste binmesin"): ikon kutusu +
          ad fontu pencereyle clamp; ad truncate + min-w-0 → dar pencerede taşmaz/çakışmaz. shrink-0 (kart sıkışsa kaybolmaz). */}
      <div className="flex min-w-0 shrink-0 items-center gap-1.5" style={{ transform: 'translateZ(22px)' }}>
        <span className={`grid shrink-0 place-items-center rounded-lg ${compact ? 'h-5 w-5' : 'h-[clamp(14px,3.4cqw,32px)] w-[clamp(14px,3.4cqw,32px)]'}`} style={{ background: `${def.color}1f`, color: def.color }}>
          <Icon className={tight ? 'h-3.5 w-3.5' : 'h-[58%] w-[58%]'} />
        </span>
        <span className="min-w-0 truncate text-[clamp(7px,1.7cqw,14px)] font-semibold text-[var(--ink)]">{t(def.name)}</span>
        {def.key === 'pressure' && !compact && <PressureUnitToggle color={def.color} />}
      </div>

      {/* BÜYÜK anlık değer (dominant) SAĞA YASLI — başlığın hemen ALTINDA, SABİT konum → tüm kartlarda anlık değerler AYNI yatay hizada.
          Değer + birim pencereyle clamp (otomatik) + min-w-0/tabular-nums → küçük pencerede çakışmaz. */}
      <div className={`flex min-w-0 shrink-0 items-baseline justify-end gap-1 ${compact ? 'mt-1 min-h-[15px]' : 'mt-2'}`} style={{ transform: 'translateZ(14px)' }}>
        <span className={`num min-w-0 ${NUM_SIZE[size]} font-bold leading-none text-white tabular-nums`} style={{ textShadow: `0 0 24px ${def.color}66` }}>{text}</span>
        <span className="shrink-0 text-[clamp(6px,1.5cqw,13px)] font-medium text-[var(--ink-soft)]">{t(def.unitShort)}</span>
      </div>
      {/* KENDİ MİNİ GRAFİĞİ (Mehmet abi 2026-06-20: "her karta kendi eksenleri ile grafik akışını koyalım"): sensörün son okumaları —
          yuvarlak alan+çizgi + canlı nabız noktası. flex-1 → değer ile (varsa) TOPLAM arasını doldurur; kart uzadıkça grafik büyür.
          Saf SVG (rAF YOK; nabız CSS) → RAM bedava. (Eksen rakamları birim-duyarlı olarak sonraki turda eklenecek.) */}
      <div className="relative mt-1.5 min-h-0 flex-1">
        <Sparkline values={series} color={def.color} min={def.min} max={chartMax} fill head pulse baseline />
        {/* KENDİ EKSENİ (Mehmet abi: "her karta kendi eksenleri ile") — üst=max, alt=min; birim-duyarlı (MPa/bar otomatik), kendi renginde, ÇOK sönük (sade). */}
        <span className="num pointer-events-none absolute left-0.5 top-0 text-[7px] font-semibold leading-none tabular-nums" style={{ color: def.color, opacity: 0.5 }}>{axFmt(chartMax)}</span>
        <span className="num pointer-events-none absolute bottom-0 left-0.5 text-[7px] font-semibold leading-none tabular-nums" style={{ color: def.color, opacity: 0.5 }}>{axFmt(def.min)}</span>
      </div>
      {/* TOPLAM (yalnız flow kartı) — PRESTİJLİ (Mehmet abi 2026-06-20): SABİT yükseklik (h-clamp = Hava ile yan kartların yükseklik FARKI)
          → üstündeki AYRAÇ çizgisi yandaki kısa kartların ALT kenarıyla yatayda HİZALI. Dikey şık dizilim: etiket (harf aralıklı) üstte,
          sayı + birim altta — birim (Litre) sayıyla AYNI renk (turuncu). Flow kartında sayı = anlık değer sayısıyla AYNI BOYUT (NUM_SIZE[size]). */}
      {totalText != null && (
        <div className={`flex shrink-0 border-t border-white/10 ${compact ? 'mt-1 min-h-[40px] flex-col justify-center gap-1 pt-1.5' : 'h-[clamp(52px,7.2vh,78px)] flex-col justify-center gap-0.5'}`} style={{ transform: 'translateZ(14px)' }}>
          {/* Mehmet abi 2026-06-20: "TOPLAM" yazısı SOLA yaslı (self-start), rakam SAĞA yaslı (self-end) + rakam üstteki anlık değerle
              AYNI BOYUT (NUM_SIZE[size]) ve sağ kenarda TAM HİZALI (ikisi de justify/self-end + aynı birim boyutu). */}
          {/* TOPLAM + küçük hava ikonu (Mehmet abi 2026-06-20: "toplam hava miktarını anlatan küçük ikon") — toplam tüketilen havayı simgeler. */}
          <span className="flex items-center gap-1 self-start text-[9px] font-bold uppercase tracking-[0.16em]" style={{ color: TOTAL_AMBER, opacity: 0.82 }}><Wind size={9} className="shrink-0" /> {t('Toplam')}</span>
          <div className={`flex w-full items-baseline justify-end gap-1 ${compact ? 'min-w-0' : ''}`}>
            <span className={`num font-bold leading-none tabular-nums ${compact && def.key === 'flow' ? 'text-[clamp(0.54rem,2.625cqw,1.575rem)]' : compact ? 'text-[clamp(0.58rem,2.05cqw,1.02rem)]' : 'text-[clamp(0.62rem,2.9cqw,1.8rem)]'}`} style={{ color: TOTAL_AMBER, textShadow: `0 0 18px ${TOTAL_AMBER}88` }}>{totalText}</span>
            <span className={`font-medium ${compact ? 'text-[clamp(6px,1.5cqw,13px)]' : 'text-[clamp(6px,1.5cqw,13px)]'}`} style={{ color: TOTAL_AMBER }}>Litre</span>
          </div>
        </div>
      )}

    </Tilt3D>
  )
}
