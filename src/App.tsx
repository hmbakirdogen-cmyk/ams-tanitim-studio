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
import { AdminUsers } from './components/AdminUsers'
import { ProfileEditor } from './components/ProfileEditor'
import { LivePage } from './pages/LivePage'
import { SensorsPage } from './pages/SensorsPage'
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

export default function App() {
  const data = useLiveReadings()
  const auth = useAuth()
  const { theme, toggle: toggleTheme } = useTheme()
  const [page, setPage] = useState<Page>('live')
  const [muted, setMuted] = useState(true)
  const [intro, setIntro] = useState(true)
  const [showUsers, setShowUsers] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [navOpen, setNavOpen] = useState(false) // mobil kenar menu cekmecesi

  const toggleSound = () => {
    const next = !muted
    setMuted(next)
    sound.setMuted(next)
    if (!next) sound.click()
  }

  // MOBIL ŞİMDİLİK KAPALI: telefon/tablette uygulama yerine "bilgisayardan açın" ekranı (Mehmet Abi kararı).
  // Geri açmak için: aşağıdaki tek satırı kaldır (mobil responsive + demo kilidi kodu yerinde duruyor).
  if (isMobileDevice()) return <MobileBlocked />

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden">
      <CinematicBackground />

      <AnimatePresence>
        {intro && <IntroSplash key="intro" onDone={() => setIntro(false)} />}
      </AnimatePresence>

      {/* Giris kapisi: oturum yoksa giris ekrani */}
      {auth.ready && !auth.user && <LoginScreen auth={auth} />}

      {/* Oturum acik: uygulama kabugu */}
      {auth.ready && auth.user && (
        <div className="flex h-full w-full flex-col md:flex-row">
          {/* MOBIL üst çubuk: menü düğmesi + logo (md'de gizli) */}
          <div className="flex shrink-0 items-center gap-3 px-4 py-2.5 md:hidden">
            <button
              onClick={() => { sound.click(); setNavOpen(true) }}
              aria-label="Menü"
              className="glass grid h-10 w-10 place-items-center rounded-xl text-[var(--ink)]"
            >
              <Menu size={20} />
            </button>
            <SmcLogo size={30} withText={false} />
            <span className="text-sm font-semibold text-white">Hava Yönetim Sistemi</span>
          </div>

          <Sidebar
            page={page}
            navOpen={navOpen}
            onPage={(p) => { sound.click(); setPage(p); setNavOpen(false) }}
            muted={muted}
            onToggleSound={toggleSound}
            user={auth.user}
            onLogout={() => { sound.click(); auth.logout() }}
            onManageUsers={() => { setShowUsers(true); setNavOpen(false) }}
            onProfile={() => { setShowProfile(true); setNavOpen(false) }}
            theme={theme}
            onToggleTheme={toggleTheme}
          />

          {/* Mobil çekmece arka planı (dokununca kapanır) */}
          {navOpen && <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setNavOpen(false)} />}

          <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden p-3 md:p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                className="h-full"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                {page === 'live' && <LivePage data={data} greetName={auth.user.firstName} theme={theme} />}
                {page === 'sensors' && <SensorsPage data={data} />}
                {page === 'analysis' && <AnalysisPage data={data} />}
                {page === 'savings' && <SavingsPage data={data} />}
                {page === 'product' && <ProductPage />}
                {page === 'settings' && <ProductSettingsPage />}
                {page === 'records' && <RecordsPage data={data} />}
              </motion.div>
            </AnimatePresence>
          </main>

          <AnimatePresence>
            {showUsers && auth.user.role === 'admin' && (
              <AdminUsers key="admin-users" auth={auth} onClose={() => setShowUsers(false)} />
            )}
            {showProfile && <ProfileEditor key="profile" auth={auth} onClose={() => setShowProfile(false)} />}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
