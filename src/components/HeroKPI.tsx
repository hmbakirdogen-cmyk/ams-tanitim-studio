/*
 * NE      : Mesaj kahramani panel - anlik tasarruf yuzdesi (buyuk) + o anki calisma modu rozeti. 3D derinlikli (Tilt3D).
 * NEDEN   : Onem hiyerarsisi: tasarruf mesaji ferah, prominent, koseye sikismadan; "her yerde 3D".
 * NASIL   : useSmoothNumber ile akan %; mod rengine gore rozet; Tilt3D ile fareyle egilir, ic elemanlar translateZ ile one cikar.
 *           % rakami SABIT GENISLIKTE (Mehmet Abi: "yazi degisince olcusu degismesin"): tabular-nums + min-genislik -> ziplamaz.
 *           MOD BLOGU da SABIT YUKSEKLIKTE (Mehmet Abi: "mode degisince kartin olcusu degismesin"): mod aciklamasi (MODE_DESC)
 *           modlar arasi 1-2 satir degisebiliyordu -> kart yuksekligi oynuyordu; alt blok h-[fixed]+overflow-hidden -> kart HEP ayni olcu.
 *           Arka planda hafif 3D DERINLIK: radyal vurgu + ust-ic isik + alt-ic golge (Tilt3D ile birlikte panel "yuzer" hisseder.
 * YAN ETKI: Saf gorsel; deger App'ten (reading.flow -> savingPercent).
 */
import { useSmoothNumber } from '@/hooks/useSmoothNumber'
import { MODE_LABEL, MODE_DESC, MODE_COLOR, type Mode } from '@/data/types'
import { fmt1 } from '@/lib/format'
import { Tilt3D } from './Tilt3D'
import { useLang } from '@/i18n'

export function HeroKPI({ percent, mode }: { percent: number; mode: Mode }) {
  const { t } = useLang()
  const p = useSmoothNumber(percent, 0.1)
  const c = MODE_COLOR[mode]
  return (
    <Tilt3D className="glass relative flex h-full flex-col justify-between overflow-hidden rounded-2xl p-6">
      {/* 3D DERİNLİK arka planı: radyal tasarruf-yeşili vurgu + ust-ic isik / alt-ic golge (panel boşlukta yüzer hissi) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 78% -10%, rgba(65,224,138,0.16), transparent 60%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -22px 40px -24px rgba(0,0,0,0.55)' }}
      />
      <div className="relative" style={{ transform: 'translateZ(22px)' }}>
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--ink-soft)]">{t('Anlık Tasarruf')}</div>
        <div
          className="num mt-1 inline-flex items-baseline text-5xl font-extrabold leading-none text-[var(--c-saving)] glow-text"
          style={{ ['--glow' as string]: 'rgba(65,224,138,0.5)' }}
        >
          {/* SABİT GENİŞLİK: % işareti + sağa hizalı sabit-genişlik rakam alanı → ondalık/hane değişince blok ZIPLAMAZ */}
          <span>%</span>
          <span className="inline-block text-right tabular-nums" style={{ minWidth: '2.6ch' }}>{fmt1(p)}</span>
        </div>
        <div className="mt-2 text-xs text-[var(--ink-soft)]">{t('Normal çalışmaya göre daha az hava tüketimi')}</div>
      </div>
      {/* MOD BLOĞU SABİT YÜKSEKLİK (Mehmet Abi: mod değişince kart boyu DEĞİŞMESİN → alttaki kartlar kaymasın):
          MODE_DESC modlar arası 1-2 satır oynuyordu; h-[3.6em]+overflow-hidden ile blok hep aynı → kart HEP aynı ölçü. */}
      <div className="h-[3.6em] overflow-hidden" style={{ transform: 'translateZ(12px)' }}>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c, boxShadow: `0 0 10px ${c}` }} />
          <span className="truncate text-base font-semibold text-white">{t(MODE_LABEL[mode])}</span>
        </div>
        <div className="mt-0.5 text-xs leading-snug text-[var(--ink-soft)]">{t(MODE_DESC[mode])}</div>
      </div>
    </Tilt3D>
  )
}
