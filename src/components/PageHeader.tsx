/*
 * NE      : Sayfa basligi - ust kucuk SMC etiketi + buyuk baslik + alt aciklama + sag aksiyon yuvasi.
 * NEDEN   : Tum sayfalarda tutarli, kullanici dostu baslik; "her yerde SMC".
 * NASIL   : Basit duzen; right slot'a kontrol (ornegin ModeStrip) konabilir.
 * YAN ETKI: Saf gorsel/duzen bileseni.
 */
import type { ReactNode } from 'react'
import { PRODUCT } from '@/data/product'
import { useModel } from '@/data/model'
import { useLang } from '@/i18n'
import { DataModeBadge } from './DataModeBadge'

export function PageHeader({
  title,
  subtitle,
  right,
  dense = false,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
  // KOMPAKT baslik (Mehmet abi 2026-06-20): Canli Panel'de baslik dikeyde fazla yer yiyordu -> urun/grafige alan acmak icin
  //   etiket+baslik kuculur, alt aciklama lg'de GIZLENIR (mobilde kalir). Diger sayfalar dense=false -> aynen onceki ferah baslik.
  dense?: boolean
}) {
  // Ust etikette SECILI modelin TAM kodu (Urun Ayarlari'ndan degisince her sayfada aninda guncellenir)
  const { model } = useModel()
  const { t } = useLang()
  return (
    <header className={`flex shrink-0 flex-col items-start sm:flex-row sm:items-end sm:justify-between sm:gap-4 ${dense ? 'gap-1' : 'gap-3'}`}>
      <div>
        <div className={`flex flex-wrap items-center gap-2.5 ${dense ? 'mb-0.5' : ''}`}>
          <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--ink-soft)]">
            {PRODUCT.brand} · {t(PRODUCT.name)} · <span className="text-[var(--smc-bright)]">{model.code}</span>
          </div>
          {/* Veri kaynagi - bir bakista DEMO mu CANLI mi (her sayfada) */}
          <DataModeBadge />
        </div>
        <h1 className={`font-bold leading-tight text-white ${dense ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'}`}>{t(title)}</h1>
        {subtitle && <p className={`mt-0.5 text-sm text-[var(--ink-soft)] ${dense ? 'hidden sm:block lg:hidden' : ''}`}>{t(subtitle)}</p>}
      </div>
      {right}
    </header>
  )
}
