/*
 * NE      : React giris noktasi - uygulamayi #root'a baglar; offline font + global stilleri yukler.
 *           PWA: CANLI (GitHub Pages) surumde otomatik-yenileme; PAKET (offline, VITE_NO_PWA) surumde SW KAPALI + eski SW/cache temizligi.
 * NEDEN   : Tek giris; font @fontsource ile GOMULU (internetsiz arkadas bilgisayarinda calisir).
 *           CANLI: yeni deploy gelince kullanici ESKI cache'i gormesin -> sekme kendiliginden yenilensin.
 *           PAKET: server.mjs zaten offline servis ediyor + guncellemeyi updater.mjs yapiyor -> SW GEREKSIZ. Ustelik bir kez kurulan SW
 *                  saha makinesinde paketin ESKI surumunu cache'ten serve ediyordu (Efekan: "eski hali aciliyor / toplam tuketim 5 L")
 *                  -> SW'yi paketten kaldirdik + acilista kurulu kalmis eski SW + cache'i TEMIZLEYIP bir kez yeniliyoruz -> cift tik = HER ZAMAN guncel.
 * NASIL   : VITE_NO_PWA (paket build) -> registerSW YOK; navigator.serviceWorker kayitlarini unregister + caches temizle + (gercekten varsa)
 *           tek reload (sessionStorage guard -> sonsuz reload dongusu YOK). Aksi halde (canli) registerSW({immediate}) -> autoUpdate.
 * YAN ETKI: StrictMode dev'de efektleri iki kez kosturur. Paket reload yalnizca eski SW/cache GERCEKTEN varsa + oturumda BIR kez olur.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/inter'
import './index.css'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'

// PAKET (offline) build mi, CANLI (Pages) build mi? VITE_NO_PWA paketle-kopru.ps1'de set edilir.
// DEV de dahil (Mehmet abi 2026-06-20): localhost dev'de vite SW URETMEZ ama onceki preview/build'ten KURULU KALMIS eski SW,
//   dev sunucunun GUNCEL CSS/JS'ini cache'ten ESKI surumle golgeleyip "icerik kuculmuyor/ayni" yasatiyordu -> dev'de de eski SW/cache TEMIZLE.
if (import.meta.env.VITE_NO_PWA === 'true' || import.meta.env.DEV) {
  // PAKET: server.mjs zaten offline servis ediyor -> SW gereksiz. Saha makinesinde KURULU KALMIS eski SW, paketin eski surumunu
  // cache'ten veriyordu -> hepsini unregister et + tum cache'leri sil -> her acilista server'dan TAZE (guncel). Eski SW/cache
  // GERCEKTEN varsa BIR kez yenile (sessionStorage guard -> sonsuz reload dongusu YOK; SW yoksa hicbir sey yapmaz).
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(async (regs) => {
      let dirty = regs.length > 0
      await Promise.all(regs.map((r) => r.unregister().catch(() => {})))
      try { const ks = await caches.keys(); dirty = dirty || ks.length > 0; await Promise.all(ks.map((k) => caches.delete(k))) } catch { /* caches API yok */ }
      if (dirty && !sessionStorage.getItem('ams_sw_cleaned')) { sessionStorage.setItem('ams_sw_cleaned', '1'); location.reload() }
    }).catch(() => { /* SW API yoksa sorun degil */ })
  }
} else {
  // CANLI: autoUpdate + workbox skipWaiting/clientsClaim -> yeni deploy gelince sekme kendiliginden guncellenir (bayat cache biter).
  registerSW({ immediate: true })
}

// KÖK HATA KALKANI: hangi katmanda olursa olsun yakalanamayan bir render hatası TÜM uygulamayı çökertip
// PWA'yı "yeni pencerede yeniden açtırmasın" (Mehmet Abi'nin gördüğü sorun) → yerinde sakin "Tekrar Dene" göster.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary variant="fullscreen">
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
