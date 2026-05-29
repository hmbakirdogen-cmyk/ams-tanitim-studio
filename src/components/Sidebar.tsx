/*
 * NE      : Sol menu - SMC 3D logo + slogan + sayfa navigasyonu + giris yapan kullanici (foto/Soyad Bey/unvan) + Profilim/Kullanicilar/Cikis + ses/saat.
 * NEDEN   : Cok sayfali mimari; "her yerden SMC belli" (3D logo+slogan); kullanici dostu gezinme + kimlik/profil/oturum.
 * NASIL   : NAV dizisi; aktif oge SMC mavisi parilti; kullanici karti tiklayinca Profilim; yonetici Kullanicilar; saat/ses altta.
 * YAN ETKI: Sayfa/oturum/profil state'i App'te; secimler yukari bildirilir.
 */
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Activity, PiggyBank, Package, SlidersHorizontal, Database,
  Radio, Volume2, VolumeX, LogOut, Users,
  type LucideIcon,
} from 'lucide-react'
import { SmcLogo } from './SmcLogo'
import { Avatar } from './Avatar'
import type { User } from '@/auth/users'

export type Page = 'live' | 'sensors' | 'savings' | 'product' | 'settings' | 'records'

const NAV: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: 'live', label: 'Canlı Panel', icon: LayoutDashboard },
  { id: 'sensors', label: 'Sensör Detayları', icon: Activity },
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
}

export function Sidebar({ page, onPage, muted, onToggleSound, user, onLogout, onManageUsers, onProfile }: SidebarProps) {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const time = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <aside className="glass z-10 m-5 mr-0 flex w-[260px] shrink-0 flex-col rounded-3xl p-5">
      <div className="px-1">
        <SmcLogo size={52} />
      </div>

      <nav className="mt-8 flex flex-col gap-1.5">
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
              {label}
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
              {user.title ?? (user.role === 'admin' ? 'Yönetici' : 'Personel')}
            </div>
          </div>
        </button>

        <div className="flex gap-2">
          {user.role === 'admin' && (
            <button
              onClick={onManageUsers}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--hair)] py-2 text-xs font-medium text-[var(--ink-soft)] transition hover:text-white"
            >
              <Users size={14} /> Kullanıcılar
            </button>
          )}
          <button
            onClick={onLogout}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--hair)] py-2 text-xs font-medium text-[var(--ink-soft)] transition hover:text-white"
          >
            <LogOut size={14} /> Çıkış
          </button>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[var(--hair)] px-3 py-2">
          <Radio size={14} className="text-[var(--c-temp)]" />
          <span className="text-xs font-semibold tracking-wide text-[var(--ink-soft)]">DEMO VERİSİ</span>
          <span className="num ml-auto text-xs font-medium text-[var(--ink-soft)]">{time}</span>
        </div>

        <button
          onClick={onToggleSound}
          className="flex w-full items-center gap-2.5 rounded-xl border border-[var(--hair)] px-3 py-2.5 text-sm font-medium text-[var(--ink-soft)] transition hover:bg-white/5 hover:text-[var(--ink)]"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          {muted ? 'Sesi Aç' : 'Sesi Kapat'}
        </button>
      </div>
    </aside>
  )
}
