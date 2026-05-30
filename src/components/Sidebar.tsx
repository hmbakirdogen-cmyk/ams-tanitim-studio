/*
 * NE      : Sol menu - SMC 3D logo + slogan + sayfa navigasyonu + giris yapan kullanici (foto/Soyad Bey/unvan) + Profilim/Kullanicilar/Cikis + ses/saat.
 * NEDEN   : Cok sayfali mimari; "her yerden SMC belli" (3D logo+slogan); kullanici dostu gezinme + kimlik/profil/oturum.
 * NASIL   : NAV dizisi; aktif oge SMC mavisi parilti; kullanici karti tiklayinca Profilim; yonetici Kullanicilar; saat/ses altta.
 * YAN ETKI: Sayfa/oturum/profil state'i App'te; secimler yukari bildirilir.
 */
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Activity, LineChart, PiggyBank, Package, SlidersHorizontal, Database,
  Radio, Wifi, Volume2, VolumeX, LogOut, Users, Sun, Moon,
  type LucideIcon,
} from 'lucide-react'
import { SmcLogo } from './SmcLogo'
import { ProductBadge } from './ProductBadge'
import { LangSwitcher } from './LangSwitcher'
import { Signature } from './Signature'
import { useConnection } from '@/data/connection'
import { useLang } from '@/i18n'
import { Avatar } from './Avatar'
import type { User } from '@/auth/users'
import type { Theme } from '@/hooks/useTheme'

export type Page = 'live' | 'sensors' | 'analysis' | 'savings' | 'product' | 'settings' | 'records'

const NAV: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: 'live', label: 'Canlı Panel', icon: LayoutDashboard },
  { id: 'sensors', label: 'Sensör Detayları', icon: Activity },
  { id: 'analysis', label: 'Geçmiş Analizi', icon: LineChart },
  { id: 'savings', label: 'Tasarruf Analizi', icon: PiggyBank },
  { id: 'product', label: 'Ürün & Teknoloji', icon: Package },
  { id: 'settings', label: 'Ürün Ayarları', icon: SlidersHorizontal },
  { id: 'records', label: 'Kayıtlar', icon: Database },
]

interface SidebarProps {
  page: Page
  onPage: (p: Page) => void
  muted: boolean
  onToggleSound: () => void
  user: User
  onLogout: () => void
  onManageUsers: () => void
  onProfile: () => void
  theme: Theme
  onToggleTheme: () => void
  navOpen?: boolean // mobilde cekmece acik mi (masaustunde her zaman gorunur)
}

export function Sidebar({ page, onPage, muted, onToggleSound, user, onLogout, onManageUsers, onProfile, theme, onToggleTheme, navOpen = false }: SidebarProps) {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const time = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const { t } = useLang()

  // Veri kaynagi rozeti - Demo mu Canli cihaz mi (Urun Ayarlari'ndan)
  const { settings: conn, status: connStatus } = useConnection()
  const live = conn.mode === 'live'
  const connColor = connStatus === 'connected' ? 'var(--c-saving)' : connStatus === 'error' ? '#ff6b6b' : live ? 'var(--smc-bright)' : 'var(--c-temp)'
  const connLabel = !live ? 'DEMO VERİSİ' : connStatus === 'connected' ? 'CANLI · BAĞLI' : connStatus === 'error' ? 'CANLI · YOK' : 'CANLI · …'

  return (
    <aside
      /* MOBIL: soldan acilir cekmece (fixed, kayar). MASAUSTU (md): statik kenar - birebir eski hal. */
      className={`glass fixed inset-y-0 left-0 z-40 m-2 flex w-[260px] shrink-0 flex-col overflow-y-auto rounded-3xl p-5 transition-transform duration-300 md:static md:z-10 md:m-5 md:mr-0 md:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="px-1">
        {/* Mehmet Abi: paneldeki SMC logosunu BUYUT; yazi logonun ALTINDA 2 satir (stack). */}
        <SmcLogo size={84} stack />
      </div>

      {/* URUN KIMLIGI - her sayfada gorunur (gorsel + ad + aktif model); "ne tanittigimiz her yerde belli" */}
      <div className="mt-4">
        <ProductBadge />
      </div>

      {/* DIL ANAHTARI - TR (asil 3B dalgalanan) / EN / JA */}
      <div className="mt-3 flex justify-start">
        <LangSwitcher />
      </div>

      <nav className="mt-6 flex flex-col gap-1.5">
        {NAV.map(({ id, label, icon: Icon }) => {
          const on = page === id
          return (
            <button
              key={id}
              onClick={() => onPage(id)}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition ${
                on ? 'text-white' : 'text-[var(--ink-soft)] hover:bg-white/5 hover:text-[var(--ink)]'
              }`}
              style={
                on
                  ? {
                      background: 'linear-gradient(135deg, rgba(0,114,206,0.30), rgba(0,114,206,0.08))',
                      boxShadow: 'inset 0 0 0 1px rgba(46,155,255,0.45), 0 0 26px -8px rgba(46,155,255,0.8)',
                    }
                  : undefined
              }
            >
              <Icon size={18} style={{ color: on ? 'var(--smc-bright)' : undefined }} />
              {t(label)}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-6">
        {/* Giris yapan kullanici - karta tiklayinca Profilim acilir */}
        <button
          onClick={onProfile}
          className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--hair)] p-2.5 text-left transition hover:bg-white/5"
        >
          <Avatar user={user} size={38} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-white">{user.firstName} Bey</div>
            <div className="truncate text-[11px] text-[var(--ink-soft)]">
              {user.title ?? t(user.role === 'admin' ? 'Yönetici' : 'Personel')}
            </div>
          </div>
        </button>

        <div className="flex gap-2">
          {user.role === 'admin' && (
            <button
              onClick={onManageUsers}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--hair)] py-2 text-xs font-medium text-[var(--ink-soft)] transition hover:text-white"
            >
              <Users size={14} /> {t('Kullanıcılar')}
            </button>
          )}
          <button
            onClick={onLogout}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--hair)] py-2 text-xs font-medium text-[var(--ink-soft)] transition hover:text-white"
          >
            <LogOut size={14} /> {t('Çıkış')}
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[var(--hair)] px-3 py-2">
          {live ? <Wifi size={14} style={{ color: connColor }} /> : <Radio size={14} style={{ color: connColor }} />}
          <span className="text-xs font-semibold tracking-wide" style={{ color: connColor }}>{t(connLabel)}</span>
          <span className="num ml-auto text-xs font-medium text-[var(--ink-soft)]">{time}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onToggleSound}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--hair)] px-2 py-2.5 text-xs font-medium text-[var(--ink-soft)] transition hover:bg-white/5 hover:text-[var(--ink)]"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            {muted ? t('Sesi Aç') : t('Ses Açık')}
          </button>
          <button
            onClick={onToggleTheme}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--hair)] px-2 py-2.5 text-xs font-medium text-[var(--ink-soft)] transition hover:bg-white/5 hover:text-[var(--ink)]"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? t('Gündüz') : t('Gece')}
          </button>
        </div>

        {/* İMZA - her sayfada görünür (Sidebar tüm sayfalarda mount). Hep İngilizce. */}
        <div className="border-t border-[var(--hair)] pt-2.5">
          <Signature compact />
        </div>
      </div>
    </aside>
  )
}
