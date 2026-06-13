/*
 * NE      : Tanitim karsilama ekrani - sifre/personel girisi YERINE tek "Demo'ya Gir" butonu (SMC logo + urun gorseli + slogan).
 * NEDEN   : Mehmet Abi: "giris Halil'e ozel olmasin; herkese tanitim - basit 'Demo'ya Gir' butonu olsun." Surtunmesiz ama
 *           kucuk bir SMC vitrini hissi versin (LoginScreen'in sicak/sinematik dilini korur, kimlik sormaz).
 * NASIL   : LoginScreen ile AYNI duzen/gorsel (sol ams-diagram, sag SMC logo+ad+slogan) ama form yerine tek buton -> onEnter().
 *           Yalniz DEMO_OPEN iken App tarafindan gosterilir; config.ts'te kapatilirsa LoginScreen geri gelir.
 * YAN ETKI: Saf UI; ses (tikla/hover) + i18n (t). Oturum/sifre YOK.
 */
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { SmcLogo } from './SmcLogo'
import { Signature } from './Signature'
import { LangSwitcher } from './LangSwitcher'
import { PRODUCT } from '@/data/product'
import { asset } from '@/lib/asset'
import { sound } from '@/lib/sound'
import { useLang } from '@/i18n'

export function DemoWelcome({ onEnter }: { onEnter: () => void }) {
  const { t } = useLang()
  return (
    <div className="absolute inset-0 z-20 grid place-items-center p-6">
      {/* Dil anahtari sag ustte (her ekranda, giris dahil) */}
      <div className="absolute right-5 top-5 z-30">
        <LangSwitcher />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass w-full max-w-4xl rounded-3xl p-6 sm:p-8"
      >
        <div className="grid grid-cols-1 items-center gap-7 lg:grid-cols-[1.4fr_1fr]">
          {/* SOL: urunun gercek gorseli (LoginScreen ile birebir) */}
          <div className="relative w-full overflow-hidden rounded-2xl border border-[var(--hair)] bg-[#0a1424]" style={{ aspectRatio: '1380 / 660' }}>
            <span className="absolute bottom-3 left-3 z-10 rounded-md px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: '#0072CE', boxShadow: '0 4px 14px -4px rgba(0,114,206,0.9)' }}>
              SMC · AMS {t('Hava Yönetim Sistemi')}
            </span>
            <img
              src={asset('products/ams-diagram.jpg')}
              alt={t('SMC AMS — Hava Yönetim Sistemi')}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ transform: 'scale(1.16)', objectPosition: 'center 38%' }}
              loading="lazy"
            />
          </div>

          {/* SAG: marka + tek "Demo'ya Gir" butonu */}
          <div className="flex flex-col items-center text-center">
            <SmcLogo size={92} withText={false} slogan />
            <h1 className="mt-4 text-2xl font-bold text-white">{t(PRODUCT.name)}</h1>
            <div className="mt-1.5 text-sm text-[var(--ink-soft)]">{PRODUCT.brand} · {t('Hava Yönetim Sistemi')}</div>
            <p className="mt-3 max-w-xs text-[13px] leading-snug text-[var(--ink-soft)]">
              {t('Hoş geldiniz. Hava Yönetim Sistemi’ni canlı verilerle inceleyebilirsiniz.')}
            </p>
            <motion.button
              onClick={() => { sound.click(); onEnter() }}
              onMouseEnter={() => sound.hover()}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              className="keep-white mt-7 flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-semibold text-white transition"
              style={{ background: 'linear-gradient(135deg,#0072CE,#2E9BFF)', boxShadow: '0 12px 32px -10px rgba(46,155,255,0.85)' }}
            >
              {t('Giriş Yap')} <ArrowRight size={18} />
            </motion.button>
          </div>
        </div>

        {/* Imza - her ekranda (her sayfada gorunur). Hep Ingilizce. */}
        <div className="mt-6 border-t border-[var(--hair)] pt-4">
          <Signature />
        </div>
      </motion.div>
    </div>
  )
}
