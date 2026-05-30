/*
 * NE      : Uygulama kabugu - acilis (intro) + GIRIS KAPISI (auth) + sol menu + aktif sayfa (gecis animasyonlu) + yonetici modal.
 * NEDEN   : Cok sayfali "yazilim devi" mimarisi; personel girisi (Karakelle Bey yonetici); veri tek yerde, tum sayfalara dagilir.
 * NASIL   : useAuth giris kapisini acar (oturum yoksa LoginScreen); useLiveReadings veri akitir; AnimatePresence ile gecisler.
 * YAN ETKI: Intro yalnizca ilk acilista. Ses varsayilan kapali. Yeni sayfa = Page tipi + Sidebar + switch.
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CinematicBackground } from './components/CinematicBackground'
import { Sidebar, type Page } from './components/Sidebar'
import { IntroSplash } from './components/IntroSplash'
import { LoginScreen } from './components/LoginScreen'
import { InstallPrompt } from './components/InstallPrompt'
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

  const toggleSound = () => {
    const next = !muted
    setMuted(next)
    sound.setMuted(next)
    if (!next) sound.click()
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <CinematicBackground />

      <AnimatePresence>
        {intro && <IntroSplash key="intro" onDone={() => setIntro(false)} />}
      </AnimatePresence>

      {/* PWA kurulum daveti - giris ekraninda da gorunur (musteri ilk anda telefona kurabilir). */}
      <InstallPrompt />

      {/* Giris kapisi: oturum yoksa giris ekrani */}
      {auth.ready && !auth.user && <LoginScreen auth={auth} />}

      {/* Oturum acik: uygulama kabugu */}
      {auth.ready && auth.user && (
        <div className="flex h-full w-full">
          <Sidebar
            page={page}
            onPage={(p) => { sound.click(); setPage(p) }}
            muted={muted}
            onToggleSound={toggleSound}
            user={auth.user}
            onLogout={() => { sound.click(); auth.logout() }}
            onManageUsers={() => setShowUsers(true)}
            onProfile={() => setShowProfile(true)}
            theme={theme}
            onToggleTheme={toggleTheme}
          />

          <main className="relative min-w-0 flex-1 overflow-hidden p-5">
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
