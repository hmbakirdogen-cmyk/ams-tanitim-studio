/*
 * NE      : "Programı Kur" düğmesi — PWA'yı tek tıkla bilgisayara kuran kenar-menü düğmesi. Yalnız KURULABİLİRKEN görünür.
 * NEDEN   : Mehmet Abi: arkadaşı "otomatik kur çıkacaktı, çıkmadı" dedi. Chrome artık otomatik "kur" balonunu kaldırdı (adres
 *           çubuğu ikonuna indirgedi) → kullanıcı nereye basacağını göremiyor. Bu düğme o otomatik deneyimi geri getirir:
 *           tarayıcının beforeinstallprompt olayını yakalar, belirgin bir düğme gösterir, tıklayınca yerleşik kurulumu açar.
 * NASIL   : beforeinstallprompt → preventDefault (tarayıcının kendi balonunu bastır) + olayı sakla → düğmeyi göster. Tıklayınca
 *           deferred.prompt() yerleşik kurulum penceresini açar. appinstalled VEYA zaten standalone → düğme gizlenir (tek kullanımlık).
 *           Chromium dışı (Firefox/Safari) olayı tetiklemez → düğme hiç çıkmaz (null), yani zarar vermez.
 * YAN ETKI: Sadece kurulabilir Chromium tarayıcılarda + henüz kurulu değilken render olur; aksi halde hiç DOM basmaz.
 */
import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { useLang } from '@/i18n'

// beforeinstallprompt standart DOM tiplerinde yok → minimal arayüz (yalnız kullandığımız alanlar).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>
}

export function InstallButton(): React.ReactElement | null {
  const { t } = useLang()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Zaten kuruluysa (ayrı pencere/standalone) hiç gösterme.
    const installed =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari'de standalone bayrağı navigator'da (tip dışı) → güvenli okuma.
      (navigator as unknown as { standalone?: boolean }).standalone === true
    if (installed) return

    const onPrompt = (e: Event): void => {
      e.preventDefault() // tarayıcının kendi mini-balonunu bastır → kurulumu BİZİM düğmemiz tetiklesin
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = (): void => setDeferred(null) // kurulduktan sonra düğme kaybolsun
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!deferred) return null

  const install = async (): Promise<void> => {
    await deferred.prompt() // yerleşik kurulum penceresini aç
    await deferred.userChoice // kullanıcı seçimini bekle (kuruldu / vazgeçti)
    setDeferred(null) // beforeinstallprompt TEK kullanımlık → her iki durumda da düğmeyi kaldır
  }

  return (
    <button
      onClick={install}
      title={t('Bilgisayara kur — sonrası tamamen çevrimdışı çalışır')}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
      style={{
        background: 'linear-gradient(135deg, #0072CE, #2E9BFF)',
        boxShadow: '0 0 26px -8px rgba(46,155,255,0.9)',
      }}
    >
      <Download size={17} /> {t('Programı Kur')}
    </button>
  )
}
