/*
 * NE      : Uygulama kabugu - acilis (intro) + GIRIS KAPISI (auth) + sol menu + aktif sayfa (gecis animasyonlu) + yonetici modal.
 * NEDEN   : Cok sayfali "yazilim devi" mimarisi; personel girisi (Karakelle Bey yonetici); veri tek yerde, tum sayfalara dagilir.
 * NASIL   : useAuth giris kapisini acar (oturum yoksa LoginScreen); useLiveReadings veri akitir; AnimatePresence ile gecisler.
 * YAN ETKI: Intro yalnizca ilk acilista. Ses varsayilan kapali. Yeni sayfa = Page tipi + Sidebar + switch.
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { CinematicBackground } from './components/CinematicBackground'
import { Sidebar, type Page } from './components/Sidebar'
import { SmcLogo } from './components/SmcLogo'
import { IntroSplash } from './components/IntroSplash'
import { LoginScreen } from './components/LoginScreen'
import { MobileBlocked } from './components/MobileBlocked'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AdminUsers } from './components/AdminUsers'
import { ProfileEditor } from './components/ProfileEditor'
import { LivePage } from './pages/LivePage'
import { AnalysisPage } from './pages/AnalysisPage'
import { SavingsPage } from './pages/SavingsPage'
import { ProductPage } from './pages/ProductPage'
import { ProductSettingsPage } from './pages/ProductSettingsPage'
import { RecordsPage } from './pages/RecordsPage'
import { useLiveReadings } from './hooks/useLiveReadings'
import { useAuth } from './auth/useAuth'
import { useTheme } from './hooks/useTheme'
import { isMobileDevice } from './lib/device'
import { sound } from './lib/sound'
import { useLang } from './i18n'
import { DEMO_OPEN, MOBILE_BLOCKED, SHOWCASE_MODE } from './config'
import { DemoWelcome } from './components/DemoWelcome'
import { FeedbackFab } from './components/FeedbackFab'
import { PhoneConnect } from './components/PhoneConnect'
import type { User } from './auth/users'

export default function App() {
  const { t } = useLang()
  const data = useLiveReadings()
  const auth = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const [page, setPage] = useState<Page>('live')
  const [muted, setMuted] = useState(false)   // Mehmet Abi: ses VARSAYILAN AÇIK (load'da çalmaz; ilk kullanıcı hareketinde AudioContext açılır)
  const [intro, setIntro] = useState(true)
  const [showUsers, setShowUsers] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [navOpen, setNavOpen] = useState(false) // mobil kenar menu cekmecesi
  const [entered, setEntered] = useState(false) // DEMO_OPEN: "Demo'ya Gir" karsilamasi gecildi mi

  const toggleSound = () => {
    const next = !muted
    setMuted(next)
    sound.setMuted(next)
    if (!next) sound.click()
  }

  // MOBIL AÇIK (Mehmet Abi: "mobil uygulamasını da açalım"): telefon/tablet responsive demo'yu gösterir + PWA.
  // Geri kapatmak: config.ts MOBILE_BLOCKED=true (mobil=demo kilidi connection.ts'te; canlı cihaz yalnız PC'de).
  if (MOBILE_BLOCKED && isMobileDevice()) return <MobileBlocked />

  // GIRIS (DEMO_OPEN — Mehmet Abi: "Halil'e ozel olmasin; herkese tanitim"): sifre/personel girisi YOK.
  // Basit "Demo'ya Gir" karsilamasi (DemoWelcome) gecilince uygulama acilir; kullanici = isimsiz misafir.
  // config.ts'te DEMO_OPEN=false -> ESKI personel girisi (LoginScreen + auth) AYNEN geri gelir (kod silinmedi).
  const demoUser: User = { id: 'demo', firstName: '', lastName: '', role: 'user', hash: '' }
  const sessionUser = DEMO_OPEN ? demoUser : auth.user
  const shellReady = DEMO_OPEN ? entered : auth.ready && !!auth.user

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden">
      <CinematicBackground />

      <AnimatePresence>
        {intro && <IntroSplash key="intro" onDone={() => setIntro(false)} />}
      </AnimatePresence>

      {/* Giris kapisi */}
      {DEMO_OPEN
        ? !entered && <DemoWelcome onEnter={() => { sound.click(); setEntered(true) }} />
        : auth.ready && !auth.user && <LoginScreen auth={auth} />}

      {/* Uygulama kabugu */}
      {shellReady && sessionUser && (
        <div className="flex h-full w-full flex-col md:flex-row">
          {/* MOBIL üst çubuk: menü düğmesi + logo (md'de gizli) */}
          <div className="flex shrink-0 items-center gap-3 px-4 py-2.5 md:hidden">
            <button
              onClick={() => { sound.click(); setNavOpen(true) }}
              aria-label={t('Menü')}
              className="glass grid h-10 w-10 place-items-center rounded-xl text-[var(--ink)]"
            >
              <Menu size={20} />
            </button>
            <SmcLogo size={30} withText={false} />
            <span className="text-sm font-semibold text-white">{t('Hava Yönetim Sistemi')}</span>
          </div>

          <Sidebar
            page={page}
            navOpen={navOpen}
            onPage={(p) => { sound.click(); setPage(p); setNavOpen(false) }}
            muted={muted}
            onToggleSound={toggleSound}
            user={sessionUser}
            demo={DEMO_OPEN}
            onLogout={() => { sound.click(); if (!DEMO_OPEN) auth.logout() }}
            onManageUsers={() => { setShowUsers(true); setNavOpen(false) }}
            onProfile={() => { setShowProfile(true); setNavOpen(false) }}
            theme={theme}
            onToggleTheme={toggleTheme}
          />

          {/* Mobil çekmece arka planı (dokununca kapanır) */}
          {navOpen && <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setNavOpen(false)} />}

          <main className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 lg:overflow-hidden md:p-5">
            {/* Sayfa geçişi: SADECE opacity (transform YOK) — Mehmet Abi "canlı panele geçerken kambur/zorlanma".
                Canlı panel 3 ağır katman (WebGL Hero3DChart + DeviceFlowChart + AmbientScene) mount eder; y/transform
                animasyonu bu canvas'ları her karede composite ettirip takıyordu. Opacity GPU-ucuz → akıcı geçiş. */}
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                className="relative h-full"
                style={{ willChange: 'opacity' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {/* SAYFA HATA KALKANI: bir sayfa render'ı hata verirse SADECE o alan "Tekrar Dene" gösterir;
                    sol menü + kabuk ayakta kalır (kullanıcı başka sayfaya geçebilir). key={page} → sayfa değişince sıfırlanır. */}
                <ErrorBoundary variant="inline" label={t('Bu sayfa')}>
                  {page === 'live' && <LivePage data={data} greetName={DEMO_OPEN ? undefined : sessionUser.firstName} theme={theme} />}
                  {page === 'analysis' && <AnalysisPage data={data} />}
                  {page === 'savings' && <SavingsPage data={data} />}
                  {page === 'product' && <ProductPage />}
                  {page === 'settings' && <ProductSettingsPage />}
                  {page === 'records' && <RecordsPage data={data} />}
                </ErrorBoundary>
              </motion.div>
            </AnimatePresence>
          </main>

          {/* GERI BILDIRIM (Teklif programindaki gibi): sag-alt sabit buton -> cekmece. SHOWCASE/vitrin modunda (Japonya HQ) GIZLI. */}
          {!SHOWCASE_MODE && <FeedbackFab page={page} />}

          {!DEMO_OPEN && (
            <AnimatePresence>
              {showUsers && auth.user?.role === 'admin' && (
                <AdminUsers key="admin-users" auth={auth} onClose={() => setShowUsers(false)} />
              )}
              {showProfile && <ProfileEditor key="profile" auth={auth} onClose={() => setShowProfile(false)} />}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* Telefon/tablet baglanti adresi (LAN IP) — konsol gizli oldugu icin IP'yi uygulama gosterir. LAN yoksa kendini gizler. */}
      <PhoneConnect />
    </div>
  )
}
