/*
 * NE      : Anlik tasarruf yuzdesi karosu (sol-ust kose) — SOL'da yazilar (etiket + aciklama), SAG'da buyuk % degeri; ikisi dikey HIZALI. 3D (Tilt3D).
 * NEDEN   : 2026-06-20 (Mehmet abi): "yuzdelik veri SAGDA, yazilar SOLDA olsun ama birbirine gore hizalansin" -> yatay flex + items-center.
 *           Kart akis animasyonunun uzerine BASMASIN (kisa kalir). Mod bilgisi sag-ust ayri kartta -> burada TEKRAR YOK.
 * NASIL   : flex-row + items-center + justify-between. SOL blok: etiket(ust) + kisa aciklama(alt). SAG blok: % (iri, tabular-nums -> ziplamaz).
 * YAN ETKI: Saf gorsel; deger App'ten (reading.flow -> savingPercent). mode prop tip imzasinda kalir (cagri uyumu) ama gorselde kullanilmaz.
 */
import { useSmoothNumber } from '@/hooks/useSmoothNumber'
import type { Mode } from '@/data/types'
import { fmt1 } from '@/lib/format'
import { Tilt3D } from './Tilt3D'
import { useLang } from '@/i18n'

export function HeroKPI({ percent }: { percent: number; mode: Mode }) {
  const { t } = useLang()
  const p = useSmoothNumber(percent, 0.1)
  return (
    <Tilt3D className="glass relative flex h-full flex-row items-center justify-between gap-3 overflow-hidden rounded-2xl p-3.5">
      {/* 3D DERİNLİK arka planı: radyal tasarruf-yeşili vurgu + ust-ic isik / alt-ic golge (panel boşlukta yüzer hissi) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 88% -10%, rgba(65,224,138,0.16), transparent 60%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -22px 40px -24px rgba(0,0,0,0.55)' }}
      />
      {/* SOL: yazılar (etiket + açıklama) sola hizalı — Mehmet abi 2026-06-20: KISALTMA YOK (truncate/line-clamp kaldırıldı → tam metin). */}
      <div className="relative min-w-0" style={{ transform: 'translateZ(22px)' }}>
        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--ink-soft)]">{t('Anlık Tasarruf')}</div>
        <div className="mt-0.5 text-[10px] leading-snug text-[var(--ink-soft)]">{t('Normal çalışmaya göre daha az hava tüketimi')}</div>
      </div>
      {/* SAĞ: % değeri — Mehmet abi 2026-06-20: % sembolü rakama YAPIŞIK; sabit-genişlik alan KALDIRILDI → sembol-rakam mesafesi rakam
          genişliğine göre OTOMATIK (rakam değiştikçe sembol yapışık kalır). tabular-nums → rakamlar eşit genişlik (zıplamaz). */}
      <div
        className="num relative inline-flex shrink-0 items-baseline gap-0.5 text-[clamp(1.3rem,2.4vw,2.05rem)] font-extrabold leading-none text-[var(--c-saving)] glow-text"
        style={{ transform: 'translateZ(22px)', ['--glow' as string]: 'rgba(65,224,138,0.5)' }}
      >
        <span>%</span>
        <span className="tabular-nums">{fmt1(p)}</span>
      </div>
    </Tilt3D>
  )
}
