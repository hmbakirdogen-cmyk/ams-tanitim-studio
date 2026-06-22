/*
 * NE      : Sol-altta kucuk cam cip — "Telefon/tablet" baglanti adresi (LAN IP:5180) + tek tikla kopyala.
 * NEDEN   : Mehmet abi "mobilde localhost girmiyor." Telefonda localhost = telefonun kendisi; BILGISAYARIN IP'si gerekir.
 *           Paket artik uygulama-penceresi modunda actigi icin SIYAH KONSOL YOK -> IP eskiden konsolda gorunuyordu, artik YOK.
 *           Cozum: sunucudan /api/netinfo ile LAN adres(ler)ini al, uygulamada goster (ayni Wi-Fi'daki telefon bunu yazar).
 * NASIL   : Mount'ta /api/netinfo fetch -> urls. Adres yoksa (LAN yok) HIC render etme. Tikla -> panoya kopyala (kisa "Kopyalandi").
 * YAN ETKI: Yok; salt-okuma bilgi. Localhost-only ortamda (LAN kapali) gorunmez. Cam dil korunur.
 */
import { useEffect, useState } from 'react'
import { Smartphone, Copy, Check } from 'lucide-react'
import { useLang } from '@/i18n'

export function PhoneConnect() {
  const { t } = useLang()
  const [urls, setUrls] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/netinfo')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d?.urls?.length) setUrls(d.urls) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  if (!urls.length) return null
  const primary = urls[0]
  const shown = primary.replace(/^https?:\/\//, '') // kullaniciya sade: 192.168.x.x:5180

  const copy = () => {
    try {
      navigator.clipboard?.writeText(primary)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch { /* pano yoksa elle yazilir */ }
  }

  return (
    <div className="fixed bottom-3 left-3 z-40 select-none">
      {open ? (
        <div className="glass flex flex-col gap-1.5 rounded-2xl p-3 text-left shadow-xl" style={{ maxWidth: 'min(86vw, 320px)' }}>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#0072CE]/20 text-[#7cc0ff]"><Smartphone size={15} /></span>
            <span className="text-xs font-semibold text-white">{t('Telefon / tablet ile bağlan')}</span>
            <button onClick={() => setOpen(false)} className="ml-auto text-white/40 transition hover:text-white/80" aria-label={t('Kapat')}>✕</button>
          </div>
          <p className="text-[11px] leading-relaxed text-white/60">{t('Aynı Wi-Fi’deki telefonun tarayıcısına yazın:')}</p>
          <button onClick={copy} className="flex items-center justify-between gap-2 rounded-lg bg-black/30 px-2.5 py-1.5 text-left transition hover:bg-black/45">
            <span className="num text-sm font-semibold tabular-nums text-[#9fd0ff]">{shown}</span>
            {copied ? <Check size={14} className="shrink-0 text-emerald-400" /> : <Copy size={14} className="shrink-0 text-white/45" />}
          </button>
          {urls.length > 1 && <p className="text-[10px] text-white/35">{t('Bağlanmazsa diğer adres')}: {urls[1].replace(/^https?:\/\//, '')}</p>}
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="glass flex items-center gap-2 rounded-full py-2 pl-2.5 pr-3.5 text-xs font-medium text-white/85 shadow-lg transition hover:text-white"
          title={t('Telefon / tablet ile bağlan')}
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#0072CE]/25 text-[#7cc0ff]"><Smartphone size={14} /></span>
          {t('Telefon')}
        </button>
      )}
    </div>
  )
}
