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
import { PRODUCT } from '@/data/product'
import { useModel } from '@/data/model'
import { asset } from '@/lib/asset'
import { Lock, ArrowRight, ShieldCheck, User as UserIcon, ChevronLeft } from 'lucide-react'
import type { Auth } from '@/auth/useAuth'
import type { User } from '@/auth/users'

export function LoginScreen({ auth }: { auth: Auth }) {
  const { model } = useModel()
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
        className="glass w-full max-w-5xl rounded-3xl p-6 sm:p-8"
      >
        <div className="grid gap-6 lg:grid-cols-2 lg:items-center lg:gap-10">
          {/* SOL: SMC bagli sistem diyagrami (smcusa.com Best Practices gorseli, yuksek kalite) */}
          <div className="relative h-52 overflow-hidden rounded-2xl border border-[var(--hair)] bg-[#0a1424] sm:h-60 lg:h-[380px]">
            {/* Urun adi etiketi (eski "Bagli Sistem" yerine - markaya uygun) */}
            <span className="absolute left-3 top-3 z-10 rounded-md px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: '#0072CE', boxShadow: '0 4px 14px -4px rgba(0,114,206,0.9)' }}>SMC · AMS Hava Yönetim Sistemi</span>
            {/* NET yuksek-coz urun + sevilen FABRIKA arka plani (yumusatilmis) birlesik = ams-hero.jpg */}
            <img
              src={asset('products/ams-hero.jpg')}
              alt="SMC AMS — Hava Yönetim Sistemi (gerçek ürün, fabrika arka planı)"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: 'center' }}
              loading="lazy"
            />
          </div>

          {/* SAG: personel girisi */}
          <div>
            <div className="flex flex-col items-center text-center">
              <SmcLogo size={92} withText={false} slogan />
              <h1 className="mt-4 text-2xl font-bold text-white">{PRODUCT.name}</h1>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-sm text-[var(--ink-soft)]">{PRODUCT.brand} · Personel Girişi</span>
                <span className="num rounded-full border border-[var(--hair)] px-2 py-0.5 text-[11px] font-semibold text-[var(--smc-bright)]">{model.code}</span>
              </div>
            </div>

        <AnimatePresence mode="wait">
          {!sel ? (
            <motion.div
              key="cards"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              /* ORTALANAN, DENGELI DUZEN: sabit izgara yerine flex-wrap -> 1 kullanici ortada,
                 cogaldikca esit-genislikli kartlar dengeli sarar (yarim-genislik sag panelde sikismaz). */
              className="mt-8 flex flex-wrap items-stretch justify-center gap-3.5"
            >
              {auth.users.map((u) => {
                const admin = u.role === 'admin'
                return (
                  <motion.button
                    key={u.id}
                    onClick={() => pick(u)}
                    onMouseEnter={() => sound.hover()}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.97 }}
                    className="glass flex w-[168px] flex-col items-center gap-3 rounded-2xl px-4 py-6 text-center transition hover:bg-white/5"
                    /* Yonetici karti hafif SMC-mavisi cerceve + glow ile one cikar (kibar vurgu) */
                    style={admin ? { boxShadow: 'inset 0 0 0 1px rgba(46,155,255,0.45), 0 0 30px -10px rgba(46,155,255,0.65)' } : undefined}
                  >
                    <Avatar user={u} size={84} />
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold leading-tight text-white">{u.firstName} Bey</div>
                      {u.title && <div className="mt-1 line-clamp-2 text-[11px] leading-snug text-[var(--ink-soft)]">{u.title}</div>}
                    </div>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium"
                      style={admin ? { background: 'rgba(46,155,255,0.16)', color: '#2E9BFF' } : { background: 'rgba(126,170,230,0.12)', color: 'var(--ink-soft)' }}
                    >
                      {admin ? <ShieldCheck size={12} /> : <UserIcon size={12} />}
                      {admin ? 'Yönetici' : 'Personel'}
                    </span>
                  </motion.button>
                )
              })}
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
                <div className="text-lg font-semibold text-white">Hoş geldiniz, {sel.firstName} Bey</div>
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
                  className="keep-white grid h-8 w-8 place-items-center rounded-lg text-white transition disabled:opacity-50"
                  style={{ background: 'var(--smc)' }}
                >
                  <ArrowRight size={16} />
                </button>
              </motion.div>
              {error && <div className="mt-2 text-center text-xs text-[#ff8a8a]">Şifre hatalı, tekrar deneyin</div>}
            </motion.form>
          )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
