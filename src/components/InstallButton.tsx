/*
 * NE      : "Programı Kur / Ana Ekrana Ekle" düğmesi — PWA'yı kurar (Android/masaüstü Chromium'da tek tık) ya da kuramayan
 *           tarayıcılarda (iOS Safari + bazı Android) tıklanınca ADIM ADIM kurulum talimatı açar. Kurulu değilken görünür.
 * NEDEN   : Mehmet abi (2026-06-22): "mobilde butona basmama rağmen kısayol oluşmuyor." Kök sebep: iOS Safari
 *           `beforeinstallprompt` olayını DESTEKLEMEZ (Apple kuralı — JS ile otomatik ana-ekran kısayolu İMKANSIZ). Eski kod
 *           iOS'ta sadece pasif bir ipucu KUTUSU gösteriyordu (tıklanınca hiçbir şey olmuyordu) → "basıyorum olmuyor". Artık
 *           buton her platformda ANLAMLI: kurulabiliyorsa kurar; kurulamıyorsa ne yapılacağını net adımlarla GÖSTERİR.
 * NASIL   : beforeinstallprompt yakalanırsa → tek tık prompt(). Yoksa platforma göre (iOS: Paylaş→Ana Ekrana Ekle · diğer:
 *           tarayıcı menüsü → Yükle) açılır-kapanır talimat paneli. Zaten standalone kuruluysa hiç render olmaz (null).
 * YAN ETKI: Offline; i18n (t). Yalnız henüz kurulu değilken görünür. Eskisinden farkı: artık beforeinstallprompt gelmeden de
 *           buton görünür (talimat verir) → Mehmet abi'nin arkadaşının "kur çıkmadı" sorunu da kapanır.
 */
import { useEffect, useState } from 'react'
import { Download, Share2, Plus, MoreVertical } from 'lucide-react'
import { useLang } from '@/i18n'

// beforeinstallprompt standart DOM tiplerinde yok → minimal arayüz (yalnız kullandığımız alanlar).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>
}

export function InstallButton(): React.ReactElement | null {
  const { t } = useLang()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [platform, setPlatform] = useState<'ios' | 'other'>('other') // beforeinstallprompt YOKsa hangi talimat gösterilir
  const [installed, setInstalled] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    // Zaten kuruluysa (ayrı pencere/standalone) hiç gösterme.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari'de standalone bayrağı navigator'da (tip dışı) → güvenli okuma.
      (navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) { setInstalled(true); return }

    // iOS tespiti (iPhone/iPad — iPadOS masaüstü modunda MacIntel + dokunmatik görünür).
    const nav = navigator as Navigator & { standalone?: boolean; maxTouchPoints?: number }
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1)
    setPlatform(isIos ? 'ios' : 'other')

    const onPrompt = (e: Event): void => {
      e.preventDefault() // tarayıcının kendi mini-balonunu bastır → kurulumu BİZİM düğmemiz tetiklesin
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = (): void => { setDeferred(null); setInstalled(true) } // kurulduktan sonra düğme kaybolsun
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null

  // 1) Tek-tık kurulum (Android/Chromium/masaüstü) — beforeinstallprompt yakalandıysa yerleşik kurulum penceresini aç.
  const install = async (): Promise<void> => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null) // beforeinstallprompt TEK kullanımlık → her iki durumda da düğmeyi kaldır
  }

  // 2) beforeinstallprompt YOKSA platforma göre adım-adım talimat (iOS hep böyle; bazı Android/masaüstü de).
  const guideSteps = platform === 'ios'
    ? [
        { Icon: Share2, text: t('Alttaki Paylaş düğmesine dokunun') },
        { Icon: Plus, text: t('“Ana Ekrana Ekle”ye dokunun') },
      ]
    : [
        { Icon: MoreVertical, text: t('Tarayıcı menüsünü (⋮) açın') },
        { Icon: Plus, text: t('“Uygulamayı yükle / Ana ekrana ekle”ye dokunun') },
      ]

  return (
    <div className="mt-3">
      <button
        onClick={() => { if (deferred) install(); else setShowGuide((s) => !s) }}
        title={t('Telefona/bilgisayara kur — sonrası tamamen çevrimdışı çalışır')}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
        style={{ background: 'linear-gradient(135deg, #0072CE, #2E9BFF)', boxShadow: '0 0 26px -8px rgba(46,155,255,0.9)' }}
      >
        <Download size={17} /> {t('Programı Kur')}
      </button>

      {/* beforeinstallprompt desteklemeyen tarayıcı (iOS Safari her zaman) → tıklanınca net adımlar. Apple JS ile otomatik kısayola izin vermez. */}
      {!deferred && showGuide && (
        <div
          className="mt-2 rounded-xl border border-[var(--hair)] p-3 text-xs leading-relaxed text-[var(--ink)]"
          style={{ background: 'linear-gradient(135deg, rgba(0,114,206,0.14), rgba(46,155,255,0.05))' }}
        >
          <div className="mb-1.5 font-semibold text-[var(--smc-bright)]">{t('Ana ekrana kısayol ekleyin')}</div>
          {guideSteps.map(({ Icon, text }, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-[var(--smc-bright)]/15 text-[var(--smc-bright)]">{i + 1}</span>
              <Icon size={14} className="shrink-0 text-[var(--smc-bright)]" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
