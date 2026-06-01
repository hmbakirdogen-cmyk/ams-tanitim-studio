/*
 * NE      : React giris noktasi - uygulamayi #root'a baglar; offline font + global stilleri yukler + PWA otomatik-yenileme.
 * NEDEN   : Tek giris; font @fontsource ile GOMULU (internetsiz arkadas bilgisayarinda calisir).
 *           PWA: yeni surum yayinlaninca (master push -> deploy) kullanici ESKI cache'i gormesin -> sekme KENDILIGINDEN yenilensin.
 *           (Mehmet Abi tekrar tekrar "cok eski versiyon / akis gelmedi" yasadi -> bayat service worker; bu onu kokten bitirir.)
 * NASIL   : @fontsource-variable/inter import + index.css + App. registerSW({immediate}) (virtual:pwa-register): SW'yi kaydeder.
 *           registerType:'autoUpdate' + workbox skipWaiting/clientsClaim → yeni deploy gelince SW kendiliğinden devralır + sayfa reload eder.
 *           (onNeedRefresh autoUpdate'te tetiklenmez/gereksiz olduğu için kaldırıldı.) Sadece build'de aktif (dev'de SW yok).
 * YAN ETKI: StrictMode dev'de efektleri iki kez kosturur. Otomatik reload yalnizca GERCEK yeni deploy'da olur (tek sefer, sessiz).
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

// PWA: SW'yi kaydet. autoUpdate + workbox skipWaiting/clientsClaim → yeni deploy gelince sekme kendiliğinden güncellenir
// (bayat cache = "eski versiyon" sorununu kökten bitirir). registerSW build'de gerçek, dev'de no-op.
registerSW({ immediate: true })

// KÖK HATA KALKANI: hangi katmanda olursa olsun yakalanamayan bir render hatası TÜM uygulamayı çökertip
// PWA'yı "yeni pencerede yeniden açtırmasın" (Mehmet Abi'nin gördüğü sorun) → yerinde sakin "Tekrar Dene" göster.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary variant="fullscreen">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
