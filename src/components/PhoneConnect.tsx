/*
 * NE      : Sidebar-ici tek satir — "Mobil" cihaz baglanti adresi (LAN IP:5180) + tek tikla kopyala.
 * NEDEN   : Mehmet abi "mobilde localhost girmiyor." Telefonda localhost = telefonun kendisi; BILGISAYARIN IP'si gerekir.
 *           Paket uygulama-penceresi modunda actigi icin SIYAH KONSOL YOK -> IP eskiden konsoldaydi, artik YOK.
 *           Cozum: /api/netinfo ile LAN adresini al, SIDEBAR'da goster (Mehmet abi: "telefon yerine MOBIL yaz + baska
 *           yazilarin uzerine basmasin" -> eski sol-alt sabit cip canli paneldeki kartlarla cakisiyordu; Sidebar satirina tasindi).
 * NASIL   : Mount'ta /api/netinfo fetch -> urls. Adres yoksa (LAN yok) HIC render etme. Tikla -> panoya kopyala.
 * YAN ETKI: Salt-okuma bilgi. Sidebar icinde akar (fixed/overlay DEGIL) -> hicbir ogeyle cakismaz.
 */
import { useEffect, useRef, useState } from 'react'
import { Smartphone, Copy, Check } from 'lucide-react'
import { useLang } from '@/i18n'

export function PhoneConnect() {
  const { t } = useLang()
  const [urls, setUrls] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/netinfo')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.urls?.length) setUrls(d.urls) })
      .catch(() => {})
    return () => {
      alive = false
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
    }
  }, [])

  if (!urls.length) return null
  const primary = urls[0]
  const shown = primary.replace(/^https?:\/\//, '') // sade: 192.168.x.x:5180

  const copy = () => {
    try {
      navigator.clipboard?.writeText(primary)
      setCopied(true)
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => {
        setCopied(false)
        copyTimerRef.current = null
      }, 1600)
    } catch { /* pano yoksa elle yazilir */ }
  }

  return (
    <button
      onClick={copy}
      title={t('Aynı Wi-Fi’deki telefon/tabletten bu adresi açın')}
      className="flex w-full items-center gap-2 rounded-xl border border-[var(--hair)] px-3 py-2 text-left transition hover:bg-white/5"
    >
      <Smartphone size={14} className="shrink-0 text-[#7cc0ff]" />
      <span className="shrink-0 text-xs font-medium text-[var(--ink-soft)]">{t('Mobil')}</span>
      <span className="num ml-auto truncate text-xs font-semibold text-[#9fd0ff]">{shown}</span>
      {copied ? <Check size={13} className="shrink-0 text-emerald-400" /> : <Copy size={13} className="shrink-0 text-[var(--ink-soft)] opacity-60" />}
    </button>
  )
}
