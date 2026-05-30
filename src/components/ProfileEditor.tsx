/*
 * NE      : "Profilim" - kullanici kendi FOTOGRAF + unvan + telefon + e-posta + tanitim girer; SIFRESINI degistirir.
 * NEDEN   : Mehmet Bey: "her kullanici kendi resmini/bilgilerini girsin; herkes kendi sifresini degistirebilsin".
 * NASIL   : foto processPortrait ile karizmatik islenir; profil auth.updateProfile; sifre auth.changePassword (mevcut dogrulanir).
 * YAN ETKI: KATI: sifre degisiminde basari sonrasi guvenlik icin kisa gecikme + otomatik cikis (yeniden giris).
 */
import { useRef, useState, type ChangeEvent } from 'react'
import { motion } from 'framer-motion'
import { X, Camera } from 'lucide-react'
import { Avatar } from './Avatar'
import { processPortrait } from '@/lib/image'
import { sound } from '@/lib/sound'
import { useLang } from '@/i18n'
import type { Auth } from '@/auth/useAuth'

const field = 'w-full rounded-lg border border-[var(--hair)] bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--ink-soft)]'

export function ProfileEditor({ auth, onClose }: { auth: Auth; onClose: () => void }) {
  const { t } = useLang()
  const current = auth.user
  const [photo, setPhoto] = useState<string | undefined>(current?.photo)
  const [title, setTitle] = useState(current?.title ?? '')
  const [phone, setPhone] = useState(current?.phone ?? '')
  const [email, setEmail] = useState(current?.email ?? '')
  const [bio, setBio] = useState(current?.bio ?? '')
  const [busy, setBusy] = useState(false)
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!current) return null

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setBusy(true)
    try {
      setPhoto(await processPortrait(f))
    } finally {
      setBusy(false)
    }
  }
  const save = () => {
    auth.updateProfile({ photo, title, phone, email, bio })
    sound.click()
    onClose()
  }
  const changePw = async () => {
    if (!curPw || !newPw) return
    const ok = await auth.changePassword(curPw, newPw)
    if (ok) {
      setPwMsg({ ok: true, text: t('Şifreniz değişti — güvenlik için yeniden giriş yapın') })
      sound.click()
      window.setTimeout(() => auth.logout(), 1300)
    } else {
      setPwMsg({ ok: false, text: t('Mevcut şifre hatalı') })
    }
  }

  return (
    <motion.div
      className="absolute inset-0 z-40 grid place-items-center bg-black/55 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass max-h-[88vh] w-full max-w-md overflow-y-auto rounded-3xl p-7"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{t('Profilim')}</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--hair)] text-[var(--ink-soft)] transition hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar user={{ firstName: current.firstName, lastName: current.lastName, photo }} size={120} />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full text-white"
              style={{ background: 'var(--smc)', boxShadow: '0 0 18px -2px rgba(46,155,255,0.8)' }}
            >
              <Camera size={18} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          </div>
          <div className="text-lg font-semibold text-white">{current.firstName} Bey</div>
          <div className="text-xs text-[var(--ink-soft)]">
            {busy ? t('Fotoğraf işleniyor…') : t('Fotoğrafı en karizmatik biçimde otomatik yerleştiririm')}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--ink-soft)]">{t('Ünvan / Görev')}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('örn. SMC Satış Destek Uzmanı')} className={field} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-[var(--ink-soft)]">{t('Telefon')}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0 5xx xxx xx xx" className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--ink-soft)]">{t('E‑posta')}</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ad@firma.com" className={field} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--ink-soft)]">{t('Kendini Tanıtım')}</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder={t('Kısa bir tanıtım…')} className={`${field} resize-none`} />
          </div>
        </div>

        <button onClick={save} disabled={busy} className="keep-white mt-5 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#0072CE,#2E9BFF)' }}>
          {t('Kaydet')}
        </button>

        {/* Sifre degistir */}
        <div className="mt-6 rounded-2xl border border-[var(--hair)] p-4">
          <div className="mb-3 text-sm font-semibold text-white">{t('Şifre Değiştir')}</div>
          <div className="grid grid-cols-2 gap-3">
            <input type="password" value={curPw} onChange={(e) => { setCurPw(e.target.value); setPwMsg(null) }} placeholder={t('Mevcut şifre')} className={field} />
            <input type="password" value={newPw} onChange={(e) => { setNewPw(e.target.value); setPwMsg(null) }} placeholder={t('Yeni şifre')} className={field} />
          </div>
          {pwMsg && (
            <div className={`mt-2 text-xs ${pwMsg.ok ? 'text-[var(--c-saving)]' : 'text-[#ff8a8a]'}`}>{pwMsg.text}</div>
          )}
          <button onClick={changePw} className="mt-3 w-full rounded-lg border border-[var(--hair)] py-2 text-sm font-medium text-[var(--ink-soft)] transition hover:text-white">
            {t('Şifreyi Değiştir')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
