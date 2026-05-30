/*
 * NE      : PWA kurulum durumu hook'u - "Yukle" daveti icin gereken her seyi tek yerden verir.
 * NEDEN   : Mehmet Abi: telefondan kurulabilir offline app. Android/Chrome `beforeinstallprompt` olayini yakalar;
 *           iOS Safari bu olayi YOK -> elle "Ana Ekrana Ekle" yonergesi gerekir; zaten kuruluysa hic gosterme.
 * NASIL   : beforeinstallprompt'u saklar (promptInstall() ile tetikler); platform (ios) + standalone (kurulu) algilanir;
 *           kullanici kapatirsa localStorage'a yazilir (tekrar tekrar rahatsiz etme). Tumu offline, harici bagimlilik yok.
 * YAN ETKI: Olay yalnizca guvenli baglamda (https veya localhost) + servis worker varken tetiklenir (build/preview).
 *           Dev http LAN'da otomatik davet cikmaz; iOS elle ekleme her durumda calisir.
 */
import { useEffect, useState } from 'react'

// beforeinstallprompt tarayici olayinin tipi (TS lib'de standart degil)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'ams_pwa_install_dismissed_v1'

// Uygulama "kurulu" (standalone) modda mi acildi?
function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari'ye ozgu bayrak
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

// iOS (iPhone/iPad) Safari mi? (beforeinstallprompt desteklenmez -> elle yonerge)
function isIOS(): boolean {
  const ua = window.navigator.userAgent
  const iOSDevice = /iphone|ipad|ipod/i.test(ua)
  // iPadOS 13+ masaustu UA verir -> dokunmatik Mac'i de yakala
  const iPadOS = navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1
  return iOSDevice || iPadOS
}

export type InstallState = {
  canInstall: boolean // Android/Chrome: dogrudan yukleyebiliriz
  isIOS: boolean // iOS: elle "Ana Ekrana Ekle" yonergesi goster
  installed: boolean // zaten kurulu (standalone) -> hic gosterme
  dismissed: boolean // kullanici daveti kapatti
  promptInstall: () => Promise<void> // Android/Chrome yerlesik kurulum diyalogunu ac
  dismiss: () => void // daveti kapat (kalici)
}

export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState<boolean>(() => isStandalone())
  const [dismissed, setDismissed] = useState<boolean>(() => localStorage.getItem(DISMISS_KEY) === '1')

  useEffect(() => {
    // Android/Chrome: tarayici "yuklenebilir" deyince olayi sakla, kendi UI'mizi gosterelim
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    // Kurulum tamamlaninca daveti kaldir
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)

    // Standalone moda gecisi (kurulum sonrasi) canli yakala
    const mq = window.matchMedia('(display-mode: standalone)')
    const onMode = () => setInstalled(isStandalone())
    mq.addEventListener?.('change', onMode)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
      mq.removeEventListener?.('change', onMode)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferred) return
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setDeferred(null) // olay tek kullanimlik
  }

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return {
    canInstall: !!deferred,
    isIOS: isIOS(),
    installed,
    dismissed,
    promptInstall,
    dismiss,
  }
}
