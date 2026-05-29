/*
 * NE      : Sayfa basligi - ust kucuk SMC etiketi + buyuk baslik + alt aciklama + sag aksiyon yuvasi.
 * NEDEN   : Tum sayfalarda tutarli, kullanici dostu baslik; "her yerde SMC".
 * NASIL   : Basit duzen; right slot'a kontrol (ornegin ModeStrip) konabilir.
 * YAN ETKI: Saf gorsel/duzen bileseni.
 */
import type { ReactNode } from 'react'
import { PRODUCT } from '@/data/product'
import { useModel } from '@/data/model'

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  // Ust etikette SECILI modelin TAM kodu (Urun Ayarlari'ndan degisince her sayfada aninda guncellenir)
  const { model } = useModel()
  return (
    <header className="flex shrink-0 items-end justify-between gap-4">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--ink-soft)]">
          {PRODUCT.brand} · {PRODUCT.name} · <span className="text-[var(--smc-bright)]">{model.code}</span>
        </div>
        <h1 className="text-3xl font-bold leading-tight text-white">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-[var(--ink-soft)]">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}
