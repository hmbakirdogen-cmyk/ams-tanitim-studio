/*
 * NE      : Sag-alt sabit (floating) Geri Bildirim butonu -> tiklayinca FeedbackDrawer acar (Teklif programindaki gibi).
 * NEDEN   : Her sayfadan tek tikla geri bildirim. Aktif sayfa adi baglamiyla gonderilir (bildirim hangi ekrandan geldi belli olsun).
 * NASIL   : page anahtarini okunabilir TR sayfa adina cevirir; AnimatePresence ile cekmece acilis/kapanis animasyonu.
 * YAN ETKI: Saf UI; ses (tikla). z-index cekmeceden (60) dusuk (55) -> acikken cekmece ustte.
 */
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MessageSquarePlus } from 'lucide-react'
import { FeedbackDrawer } from './FeedbackDrawer'
import { sound } from '@/lib/sound'
import { useLang } from '@/i18n'

const SAYFA_AD: Record<string, string> = {
  live: 'Canlı Panel',
  analysis: 'Geçmiş Analizi',
  savings: 'Tasarruf Analizi',
  product: 'Ürün & Teknoloji',
  settings: 'Ürün Ayarları',
  records: 'Kayıtlar',
}

export function FeedbackFab({ page }: { page: string }) {
  const { t } = useLang()
  const [acik, setAcik] = useState(false)
  const sayfa = SAYFA_AD[page] ?? page

  return (
    <>
      <button
        onClick={() => { sound.click(); setAcik(true) }}
        title={t('Geri Bildirim')}
        aria-label={t('Geri Bildirim')}
        className="keep-white fixed bottom-5 right-5 z-[55] grid h-12 w-12 place-items-center rounded-full text-white transition hover:scale-105"
        style={{ background: 'linear-gradient(135deg,#0072CE,#2E9BFF)', boxShadow: '0 8px 22px -6px rgba(46,155,255,0.85)' }}
      >
        <MessageSquarePlus size={20} />
      </button>
      <AnimatePresence>
        {acik && <FeedbackDrawer key="fb-drawer" onClose={() => setAcik(false)} sayfa={sayfa} />}
      </AnimatePresence>
    </>
  )
}
