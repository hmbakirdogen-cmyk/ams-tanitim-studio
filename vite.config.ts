/*
 * NE      : Vite (web) yapilandirmasi - React + Tailwind v4 + "@" alias + ag erisimli dev sunucu + PWA (kurulabilir + offline).
 * NEDEN   : Lovable-uyumlu web-first cekirdek; telefon ayni WiFi'den acabilsin; PWA ile "Yukle" + tam offline (Mehmet Bey: mobil app + offline).
 * NASIL   : host:true (LAN), strictPort sabit 5180, "@" -> ./src. VitePWA: manifest + servis worker (build'de tum varliklari onbelleğe alir).
 * YAN ETKI: Electron yok; saf web. Servis worker yalnizca build'de aktif (dev etkilenmez). Canli OPC UA okuma sonra ince masaustu kopru ile.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  // GitHub Pages alt-yolda yayinlar (or. /ams-tanitim-studio/). CI build'de VITE_BASE verilir; yerelde '/' kalir.
  // vite-plugin-pwa bu base'i otomatik kullanir (SW scope + varlik yollari). Offline korunur.
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    tailwindcss(),
    // NO_PWA (paketle-kopru.ps1 -> VITE_NO_PWA=true): PAKET/offline build. SW kendini-imha-eden (selfDestroying) +
    //   plugin register script ENJEKTE ETMEZ (injectRegister:false) -> paket SW'siz; eski SW/cache temizligi main.tsx'te.
    //   CANLI (Pages, CI) build'de VITE_NO_PWA yok -> normal autoUpdate PWA (offline + 'Yukle' korunur).
    VitePWA({
      selfDestroying: process.env.VITE_NO_PWA === 'true',
      injectRegister: process.env.VITE_NO_PWA === 'true' ? false : 'auto',
      registerType: 'autoUpdate',
      includeAssets: ['smc-logo.svg', 'icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'SMC Hava Yönetim Sistemi',
        short_name: 'AMS Stüdyo',
        description: 'SMC Hava Yönetim Sistemi — canlı tanıtım & demo (offline)',
        theme_color: '#0072CE',
        background_color: '#04060f',
        display: 'standalone',
        orientation: 'any',
        lang: 'tr',
        // PNG ikon seti: iOS apple-touch ayrica index.html'de baglanir.
        // "any" (yuvarlak kose) + "maskable" (Android adaptive) ayri PNG'ler;
        // SVG en sona fallback olarak kalir (vektor olcekleme).
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        // OFFLINE icin TUM varliklar onbellege alinir - JPG eklendi (urun/personel fotolari .jpg; yoksa offline gorunmezdi)
        globPatterns: ['**/*.{js,css,html,woff,woff2,svg,png,jpg,jpeg,webp,ico}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // BAYAT CACHE'I KOKTEN BITIR: yeni SW aktif olunca eski precache'leri sil + hemen devral + bekleme.
        // (Mehmet Abi "cok eski versiyon" gormesin -> deploy sonrasi sekme guncel icerige gecsin.)
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  build: {
    // OPTIMIZE (Mehmet abi: "tak-çalıştır + en optimize"): tek 1.48MB parça yerine büyük kütüphaneleri AYRI parçalara böl
    //   -> tarayıcı paralel indirir + önbellekler, ana uygulama parçası küçülür -> ŞİMŞEK açılış. PWA hepsini precache eder (offline korunur).
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          // Yalnız GERÇEKTEN kurulu büyük kütüphaneler ayrı parçada (react, framer-motion). Gerisini 'return undefined' ile Vite
          //   otomatik/döngüsüz böler — zorla tek 'vendor'da toplamak eskiden circular-chunk hatası verip paket build'ini durduruyordu.
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'vendor-react'
          if (/[\\/]node_modules[\\/](framer-motion|motion)[\\/]/.test(id)) return 'vendor-motion'
          return undefined
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5180,
    strictPort: true,
  },
})
