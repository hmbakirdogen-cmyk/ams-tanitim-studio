/*
 * NE      : React giris noktasi - uygulamayi #root'a baglar; offline font + global stilleri yukler + PWA otomatik-yenileme.
 * NEDEN   : Tek giris; font @fontsource ile GOMULU (internetsiz arkadas bilgisayarinda calisir).
 *           PWA: yeni surum yayinlaninca (master push -> deploy) kullanici ESKI cache'i gormesin -> sekme KENDILIGINDEN yenilensin.
 *           (Mehmet Abi tekrar tekrar "cok eski versiyon / akis gelmedi" yasadi -> bayat service worker; bu onu kokten bitirir.)
 * NASIL   : @fontsource-variable/inter import + index.css + App. registerSW (virtual:pwa-register): immediate kayit;
 *           yeni surum hazir olunca updateSW(true) -> skipWaiting + sayfa otomatik reload. Sadece build'de aktif (dev'de SW yok).
 * YAN ETKI: StrictMode dev'de efektleri iki kez kosturur. Otomatik reload yalnizca GERCEK yeni deploy'da olur (tek sefer, sessiz).
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'

// PWA: yeni surum gelince sekmeyi otomatik yenile (bayat cache = "eski versiyon" sorununu kokten bitirir).
// onNeedRefresh normalde 'prompt' icindir; registerType:'autoUpdate' zaten oto uygular ama updateSW(true)'i acikca
// cagirmak ilk yuklemeden sonra da garanti reload saglar. registerSW build'de gercek, dev'de no-op.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() { updateSW(true) },
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
