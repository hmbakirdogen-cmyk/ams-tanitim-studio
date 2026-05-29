/*
 * NE      : Sinematik personel giris ekrani - kullanici kartlari (KARIZMATIK avatar + soyad Bey + unvan + rol); secince sifre paneli.
 * NEDEN   : Mehmet Bey: "giris kartlari her yonuyle kullaniciyi etkilesin"; foto/unvan kartta; hitabet "[Soyad] Bey".
 * NASIL   : auth.users'tan kartlar (Avatar ile islenmis foto); secim -> animasyonlu sifre formu; hatali -> sallanma. SMC 3D logo + slogan.
 * YAN ETKI: Basarili giriste auth.login oturum acar. Sifre dogrulama async (Web Crypto).
 */
import { useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SmcLogo } from './SmcLogo'
import { Avatar } from './Avatar'
import { sound } from '@/lib/sound'
import { Lock, ArrowRight, ShieldCheck, User as UserIcon, ChevronLeft } from 'lucide-react'
import type { Auth } from '@/auth/useAuth'
import type { User } from '@/auth/users'

export function LoginScreen({ auth }: { auth: Auth }) {
  const [sel, setSel] = useState<User | null>(null)
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const pick = (u: User) => {
    sound.click()
    setSel(u)
    setPw('')
    setError(false)
  }
  const back = () => {
    setSel(null)
    setPw('')
    setError(false)
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!sel || busy) return
    setBusy(true)
    const ok = await auth.login(sel.id, pw)
    setBusy(false)
    if (!ok) {
      setError(true)
      setPw('')
    }
  }

  return (
    <div className="absolute inset-0 z-20 grid place-items-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="glass w-full max-w-2xl rounded-3xl p-8"
      >
        <div className="flex flex-col items-center text-center">
          <SmcLogo size={56} withText={false} slogan />
          <h1 className="mt-4 text-2xl font-bold text-white">Hava Yönetim Sistemi</h1>
          <p className="text-sm text-[var(--ink-soft)]">Personel Girişi</p>
        </div>

        <AnimatePresence mode="wait">
          {!sel ? (
            <motion.div
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3"
            >
              {auth.users.map((u) => (
                <motion.button
                  key={u.id}
                  onClick={() => pick(u)}
                  onMouseEnter={() => sound.hover()}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  className="glass flex flex-col items-center gap-3 rounded-2xl p-5 transition hover:bg-white/5"
                >
                  <Avatar user={u} size={66} />
                  <div>
                    <div className="text-sm font-semibold text-white">{u.lastName} Bey</div>
                    {u.title && <div className="mt-0.5 text-[10px] text-[var(--ink-soft)]">{u.title}</div>}
                    <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-[var(--ink-soft)]">
                      {u.role === 'admin' ? <ShieldCheck size={12} /> : <UserIcon size={12} />}
                      {u.role === 'admin' ? 'Yönetici' : 'Personel'}
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.form
              key="pw"
              onSubmit={submit}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mx-auto mt-8 max-w-sm"
            >
              <button
                type="button"
                onClick={back}
                className="mb-4 flex items-center gap-1 text-xs text-[var(--ink-soft)] transition hover:text-white"
              >
                <ChevronLeft size={14} /> geri
              </button>
              <div className="mb-4 flex flex-col items-center gap-2">
                <Avatar user={sel} size={72} />
                <div className="text-lg font-semibold text-white">Hoş geldiniz, {sel.lastName} Bey</div>
                <div className="text-xs text-[var(--ink-soft)]">Şifrenizi girin</div>
              </div>
              <motion.div
                animate={error ? { x: [0, -8, 8, -6, 6, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2 rounded-xl border px-3 py-3"
                style={{ borderColor: error ? '#ff6b6b' : 'var(--hair)' }}
              >
                <Lock size={16} className="text-[var(--ink-soft)]" />
                <input
                  autoFocus
                  type="password"
                  value={pw}
                  onChange={(e) => {
                    setPw(e.target.value)
                    setError(false)
                  }}
                  placeholder="••••••"
                  className="w-full bg-transparent text-white outline-none placeholder:text-[var(--ink-soft)]"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="grid h-8 w-8 place-items-center rounded-lg text-white transition disabled:opacity-50"
                  style={{ background: 'var(--smc)' }}
                >
                  <ArrowRight size={16} />
                </button>
              </motion.div>
              {error && <div className="mt-2 text-center text-xs text-[#ff8a8a]">Şifre hatalı, tekrar deneyin</div>}
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
