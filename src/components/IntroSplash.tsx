/*
 * NE      : Sinematik acilis animasyonu - SMC logosu/baslik bulanıklıktan netlesir + isik cubugu dolar, sonra uygulamaya gecer.
 * NEDEN   : Mehmet Bey: "muhtesem tanitim animasyonlari". Arkadas programi acinca premium bir giris karsilasin.
 * NASIL   : framer-motion ile kademeli (stagger) reveal; ilerleme cubugu dolunca onDone -> splash AnimatePresence ile kapanir.
 * YAN ETKI: Sadece ilk acilista; bittikten sonra DOM'dan kalkar. Performansli (sadece transform/opacity/filter).
 */
import { motion } from 'framer-motion'
import { SmcLogo } from './SmcLogo'

export function IntroSplash({ onDone }: { onDone: () => void }) {
  return (
    <motion.div
      className="force-dark-surface fixed inset-0 z-50 grid place-items-center"
      style={{ background: 'radial-gradient(circle at 50% 38%, #0a2148, #04060f 70%)' }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.6 } }}
    >
      <div className="flex flex-col items-center gap-7">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, filter: 'blur(14px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <SmcLogo size={92} withText={false} />
        </motion.div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.8 }}
        >
          <div className="text-3xl font-bold text-white">Hava Yönetim Sistemi</div>
          <div className="mt-1.5 text-xs font-medium uppercase tracking-[0.3em] text-[var(--ink-soft)]">
            Canlı Tanıtım Stüdyosu
          </div>
        </motion.div>

        <div className="h-0.5 w-52 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #0072CE, #2E9BFF)' }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2, ease: 'easeInOut' }}
            onAnimationComplete={onDone}
          />
        </div>
      </div>
    </motion.div>
  )
}
