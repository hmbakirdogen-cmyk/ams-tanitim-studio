/*
 * NE      : Vite (web) yapilandirmasi - React + Tailwind v4 + "@" alias + ag erisimli dev sunucu.
 * NEDEN   : Lovable-uyumlu web-first cekirdek; ayni uygulamayi telefon ayni WiFi'den acabilsin (gorerek/mobil).
 * NASIL   : host:true (LAN'a acik), strictPort + sabit port 5180 (tek URL disiplini), "@" -> ./src.
 * YAN ETKI: Electron yok; saf web. Canli kablo (OPC UA) okuma sonradan ince masaustu kopru ile eklenecek.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true,
    port: 5180,
    strictPort: true
  }
})
