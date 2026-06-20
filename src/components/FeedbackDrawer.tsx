/*
 * NE      : Geri Bildirim cekmecesi (sagdan kayar) - tur secimi (Hata/Oneri/Mesaj) + mesaj + Gonder + "Onceki Bildirimlerim".
 * NEDEN   : Mehmet Abi: "Teklif programindaki gibi feedback." Teklif Antd Drawer; burada AMS'in dili (Tailwind+lucide+framer,
 *           glass, SMC mavisi, i18n t()) ile birebir akis. Offline mimaride admin-cevap yok (rol/merkezi sunucu yok) - kullanici
 *           gonderir + kendi gecmisini gorur (host dosyada toplar). Bkz data/feedback.ts.
 * NASIL   : AnimatePresence cocugu (mount -> kayar gir, unmount -> kayar cik). Gonder -> addFeedback (localStorage + en-iyi-caba POST)
 *           -> "tesekkurler" + liste tazelenir. Mesaj bos ise gondermez.
 * YAN ETKI: Saf UI; ses (tikla). Veri data/feedback.ts'te.
 */
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Send, Bug, Lightbulb, MessageSquare, CheckCircle2 } from 'lucide-react'
import { addFeedback, listFeedback, type Feedback, type FeedbackTur } from '@/data/feedback'
import { sound } from '@/lib/sound'
import { useLang } from '@/i18n'
import { localeOf } from '@/lib/format'

const TURLER: { tur: FeedbackTur; label: string; icon: typeof Bug; color: string }[] = [
  { tur: 'hata', label: 'Hata', icon: Bug, color: '#ff6b6b' },
  { tur: 'oneri', label: 'Öneri', icon: Lightbulb, color: '#FFB04D' },
  { tur: 'mesaj', label: 'Mesaj', icon: MessageSquare, color: '#2E9BFF' },
]
const TUR_BY = Object.fromEntries(TURLER.map((x) => [x.tur, x])) as Record<FeedbackTur, (typeof TURLER)[number]>
const MAX = 1000

function formatTarih(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(localeOf(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function FeedbackDrawer({ onClose, sayfa }: { onClose: () => void; sayfa: string }) {
  const { t } = useLang()
  const [tur, setTur] = useState<FeedbackTur>('hata')
  const [mesaj, setMesaj] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [basarili, setBasarili] = useState(false)
  const [liste, setListe] = useState<Feedback[]>([])
  const successTimerRef = useRef<number | null>(null)

  useEffect(() => { setListe(listFeedback()) }, [])
  useEffect(() => () => {
    if (successTimerRef.current !== null) window.clearTimeout(successTimerRef.current)
  }, [])

  const gonder = async () => {
    const text = mesaj.trim()
    if (!text || gonderiliyor) return
    setGonderiliyor(true)
    await addFeedback({ tur, mesaj: text, sayfa })
    sound.click()
    setMesaj(''); setTur('hata'); setBasarili(true)
    setListe(listFeedback())
    setGonderiliyor(false)
    if (successTimerRef.current !== null) window.clearTimeout(successTimerRef.current)
    successTimerRef.current = window.setTimeout(() => {
      setBasarili(false)
      successTimerRef.current = null
    }, 2800)
  }

  const field = 'force-dark-surface w-full rounded-xl border border-[var(--hair)] bg-[#0a1424] px-3 py-2.5 text-[13px] text-white outline-none transition focus:border-[var(--smc-bright)] resize-none'

  return (
    <motion.div className="fixed inset-0 z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.aside
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.28, ease: 'easeOut' }}
        className="glass-solid absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-hidden rounded-l-3xl"
      >
        {/* Baslik */}
        <div className="flex items-center justify-between border-b border-[var(--hair)] px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <MessageSquare size={18} className="text-[var(--smc-bright)]" /> {t('Geri Bildirim')}
          </h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--hair)] text-[var(--ink-soft)] transition hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {/* Yeni bildirim formu */}
          <div className="text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{t('Yeni Bildirim')}</div>

          {/* Tur secimi */}
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {TURLER.map(({ tur: tt, label, icon: Icon, color }) => {
              const on = tur === tt
              return (
                <button
                  key={tt}
                  onClick={() => { sound.hover(); setTur(tt) }}
                  className="flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[12px] font-medium transition"
                  style={on
                    ? { borderColor: color, background: `${color}1f`, color: '#fff', boxShadow: `inset 0 0 0 1px ${color}66` }
                    : { borderColor: 'var(--hair)', color: 'var(--ink-soft)' }}
                >
                  <Icon size={16} style={{ color: on ? color : undefined }} />
                  {t(label)}
                </button>
              )
            })}
          </div>

          {/* Mesaj */}
          <div className="relative mt-2.5">
            <textarea
              rows={4}
              value={mesaj}
              maxLength={MAX}
              onChange={(e) => setMesaj(e.target.value)}
              placeholder={t('Sorunu veya önerinizi detaylıca yazın…')}
              className={field}
            />
            <span className="num pointer-events-none absolute bottom-2 right-3 text-[10px] text-[var(--ink-soft)]">{mesaj.length}/{MAX}</span>
          </div>

          <button
            onClick={gonder}
            disabled={gonderiliyor || !mesaj.trim()}
            className="keep-white mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#0072CE,#2E9BFF)' }}
          >
            <Send size={15} /> {t('Gönder')}
          </button>

          {basarili && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12.5px]"
              style={{ background: 'rgba(65,224,138,0.10)', border: '1px solid rgba(65,224,138,0.4)', color: 'var(--ink)' }}
            >
              <CheckCircle2 size={16} style={{ color: '#41E08A' }} />
              {t('Bildiriminiz tarafımıza ulaştı. Teşekkür ederiz.')}
            </motion.div>
          )}

          {/* Onceki bildirimler */}
          <div className="mt-7 text-[12px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{t('Önceki Bildirimlerim')}</div>
          {liste.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[var(--hair)] py-6 text-center text-[12.5px] text-[var(--ink-soft)]">
              {t('Henüz bildirim yok.')}
            </div>
          ) : (
            <div className="mt-2.5 flex flex-col gap-2.5">
              {liste.map((g) => {
                const meta = TUR_BY[g.tur]
                const Icon = meta?.icon ?? MessageSquare
                return (
                  <div key={g.id} className="rounded-xl border border-[var(--hair)] bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: `${meta?.color ?? '#2E9BFF'}1f`, color: meta?.color ?? '#2E9BFF' }}>
                        <Icon size={12} /> {t(meta?.label ?? 'Mesaj')}
                      </span>
                      <span className="num text-[10.5px] text-[var(--ink-soft)]">{formatTarih(g.tarih)}</span>
                    </div>
                    <div className="mt-1.5 text-[10.5px] text-[var(--ink-soft)]">{t(g.sayfa)}</div>
                    <div className="mt-1 whitespace-pre-wrap text-[13px] text-white">{g.mesaj}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.aside>
    </motion.div>
  )
}
