/*
 * NE      : Urun kimlik rozeti - tanitilan urunun GORSELI + ADI + aktif MODEL kodu tek, kompakt kartta.
 * NEDEN   : Mehmet Abi: "ne tanittigimiz/tanitacagimiz urun hem resimle hem isimle HER YERDE belli olsun".
 *           Sidebar her sayfada gorundugu icin buraya konunca urun kimligi tum uygulamada kalici gorunur.
 * NASIL   : PRODUCT (ad) + useModel (aktif tam kod) + public/products/ams-product.png katalog render (seffaf) kucuk thumbnail.
 *           Model degisince (Urun Ayarlari) kod aninda guncellenir. Birim/kisaltma kurallari etkilenmez.
 * YAN ETKI: Saf gorsel; offline (gorsel public/'te gomulu). Baska SMC urunu icin PRODUCT + gorsel degisir, rozet ayni kalir.
 */
import { PRODUCT } from '@/data/product'
import { useModel } from '@/data/model'

export function ProductBadge() {
  const { model } = useModel()
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[var(--hair)] bg-white/[0.03] p-2">
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10">
        {/* Giris sayfasiyla AYNI gorsel; kucuk karede urunu ortalayan object-cover (net/belirgin) */}
        <img
          src="/products/ams-diagram.jpg"
          alt={`${PRODUCT.brand} ${PRODUCT.name} — ${model.code}`}
          className="h-full w-full object-cover"
          style={{ objectPosition: 'center' }}
          loading="lazy"
        />
      </span>
      <div className="min-w-0">
        <div className="truncate text-[12px] font-semibold leading-tight text-white">{PRODUCT.name}</div>
        <div className="num text-[11px] font-semibold leading-tight text-[var(--smc-bright)]">{PRODUCT.brand} · {model.code}</div>
      </div>
    </div>
  )
}
