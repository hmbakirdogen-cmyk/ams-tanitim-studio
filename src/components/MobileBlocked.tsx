/*
 * NE      : Mobil engel ekrani - telefon/tablette uygulama yerine kibar "bilgisayardan acin" bildirimi gosterir.
 * NEDEN   : Mehmet Abi: "mobili simdilik tamamen devre disi birakalim; kimse veriye erisim/toplama cabasi sanmasin".
 *           Mobilde yukleme daveti + uygulama gizlenir -> sade, guven veren bir mesaj. PC surumu aynen calisir.
 * NASIL   : App, isMobileDevice() ise bu ekrani dondurur. Geri acmak icin App'teki tek kosul kaldirilir.
 * YAN ETKI: Saf gorsel. Offline/online fark etmez. SMC kimligi korunur (logo + urun adi).
 */
import { SmcLogo } from './SmcLogo'
import { Monitor } from 'lucide-react'
import { PRODUCT } from '@/data/product'
import { useLang } from '@/i18n'

export function MobileBlocked() {
  const { t } = useLang()
  return (
    <div
      className="force-dark-surface fixed inset-0 z-50 grid place-items-center p-8 text-center"
      style={{ background: 'radial-gradient(circle at 50% 35%, #08183a, #02030a 72%)' }}
    >
      <div className="flex max-w-sm flex-col items-center gap-5">
        <SmcLogo size={88} withText={false} slogan />
        <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: 'rgba(46,155,255,0.14)', boxShadow: 'inset 0 0 0 1px rgba(46,155,255,0.4)' }}>
          <Monitor size={26} className="text-[var(--smc-bright)]" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-white">{t(PRODUCT.name)}</h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
            {t('Bu tanıtım uygulaması şu anda')} <b className="text-white">{t('yalnızca bilgisayarda')}</b> {t('çalışmaktadır. Lütfen bir')} <b className="text-white">{t('bilgisayar (PC)')}</b> {t('üzerinden açın.')}
          </p>
          <p className="mt-2 text-xs text-[var(--ink-soft)]">{t('Mobil sürüm hazırlanıyor.')}</p>
        </div>
      </div>
    </div>
  )
}
