/*
 * NE      : Veri kaynagi rozeti - "DEMO VERİSİ" (amber) / "CANLI CİHAZ" (yesil) / baglaniyor / baglanti yok. Bir bakista belli.
 * NEDEN   : Mehmet Abi: "demo mu canli mi oldugunu BIR BAKISTA anlamaliyim". PageHeader'da her sayfada gorunur -> kacirilmaz.
 * NASIL   : useConnection (mode+status). Renk + ikon + nabiz atan nokta + KALIN etiket. force-dark-surface degil; tema-uyumlu.
 * YAN ETKI: Saf gorsel. Sidebar'daki kucuk rozetle ayni dogruluk kaynagi (useConnection).
 */
import { useConnection, type ConnStatus } from '@/data/connection'
import { FlaskConical, Wifi, WifiOff, Radio, type LucideIcon } from 'lucide-react'
import { useLang } from '@/i18n'

const UI: Record<ConnStatus, { label: string; color: string; icon: LucideIcon; title: string }> = {
  demo: { label: 'DEMO VERİSİ', color: '#FFB04D', icon: FlaskConical, title: 'Örnek/simülasyon verisi — gerçek cihaza bağlı değil' },
  connecting: { label: 'CANLI · BAĞLANIYOR', color: '#2E9BFF', icon: Radio, title: 'Gerçek cihaza bağlanılıyor…' },
  connected: { label: 'CANLI CİHAZ', color: '#41E08A', icon: Wifi, title: 'Gerçek cihazdan canlı veri' },
  error: { label: 'CANLI · BAĞLANTI YOK', color: '#ff6b6b', icon: WifiOff, title: 'Canlı mod seçili ama cihaza ulaşılamıyor' },
}

export function DataModeBadge() {
  const { settings, status } = useConnection()
  const { t } = useLang()
  // Demo modunda daima 'demo' goster (gec gelen canli durumu ezse bile)
  const key: ConnStatus = settings.mode === 'demo' ? 'demo' : status
  const s = UI[key]
  const Icon = s.icon
  return (
    <span
      title={t(s.title)}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide"
      style={{ background: `${s.color}22`, color: s.color, boxShadow: `inset 0 0 0 1px ${s.color}66` }}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: s.color }} />
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: s.color }} />
      </span>
      <Icon size={13} />
      {t(s.label)}
    </span>
  )
}
