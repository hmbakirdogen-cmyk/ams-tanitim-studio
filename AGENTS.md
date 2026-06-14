# AMS Tanıtım Stüdyosu — repo rehberi (AGENTS.md)

> Yeni Codex oturumuna "neredeyim" der. Güncel durum: [HANDOFF.md](HANDOFF.md).

## Kimlik
- **Proje:** SMC **Hava Yönetim Sistemi (AMS20/30/40/60)** için sinematik, **offline** canlı tanıtım & demo stüdyosu.
- **Klasör:** `C:\Users\Admin\Projeler\ams-tanitim-studio` (diğer projelerin yanında).
- **İlk kullanıcı:** SMC personeli **Halil İbrahim Karakelle** (ücretsiz pilot). **Hedef:** SMC'ye yazılım satan iş kolunun vitrin/kanıt eseri ("yazılım devi başlangıcı").

## Bu repo NEDİR / NE DEĞİLDİR
- ✅ **Bağımsız** bir SMC ürün tanıtım/demo uygulaması + ürün‑bağımsız platform.
- ❌ MEBA Komuta Merkezi / Grup Finans Paneli / Teklif Sistemi **DEĞİL** — karıştırma.

## Stack
Vite + React + TS + Tailwind v4 + Framer Motion + **three/@react-three/fiber/drei/postprocessing** (gerçek WebGL 3D + bloom). **Offline:** Inter fontu gömülü; tüm durum localStorage (auth/economy/device/sensorVisibility/recordings). Veri kaynağı soyut: `DemoDataSource` (şimdi) ↔ canlı OPC UA adaptörü (sonra).

## Mimari ilkeler
- **Merkezi sensör kaydı** `src/data/metrics.ts` — yeni sensör = tek satır (grafik/kart/efsane/detay otomatik gelir).
- **Çekirdek ürün‑bağımsız** — AMS = ilk veri seti; başka ürün = veri/config eklemek.
- Sayfalar `src/pages/`, paylaşılan bileşenler `src/components/`, veri/iş mantığı `src/data` + `src/lib` + `src/hooks`.

## KATİ kurallar (carried)
- **Hitabet (ÇAKIŞMADA BU GEÇERLİ):** Kullanıcıya **DAİMA "Mehmet Abi"** de; ben kendimi **"CC"** olarak konumlarım (sıcak/samimi CC tonu). Kullanıcı için **"Bakırdöğen Bey"/"Mehmet Bey" KULLANMA.** — "[Soyad] Bey" kuralı YALNIZCA **uygulama İÇİNDEKİ** SMC personeli hitabı içindir (örn. arayüzde "Halil İbrahim Bey"); sohbette kullanıcı = Mehmet Abi.
- Her edit'te **blok yorum**: NE+NEDEN+NASIL+YAN ETKİ.
- **Push öncesi** tam tarama: `npm run typecheck` + `npm run build` (sıfır hata).
- **Birimi olan her sayının yanında birimi** görünür; **kafa karıştıran kısaltma yok** (büyük değerler kompakt: 1,2 Mn ₺).
- Grafikler **gerçek 3D, akıcı (60fps), yuvarlak**; sahte/pikselli ışık yok. Her yüzeyde 3D derinlik (Tilt3D).
- **Offline** korunur (CDN/online bağımlılık ekleme; fontlar/varlıklar gömülü).
- **Mobil de CANLI moda geçebilir** (LAN köprü, 2026-06-04 Mehmet Abi kararı): köprü WS `0.0.0.0` dinler, uygulama köprü adresini host'tan türetir (`connection.ts` `BRIDGE_URL`), telefon PC'deki köprüden canlı cihaz verisi görür + set ayarı yapar. Güvenilir saha ağı varsayımı. (Eski "mobil = yalnız demo" yaklaşımı GEÇERSİZ.)
- DB/script/terminal/deploy işlerini **CC çalıştırır**.

## Marka
- Gerçek SMC logosu: `public/smc-logo.svg` (smc.eu resmî, beyaz) → cam/bombeli 3D rozet (`SmcLogo`). Slogan: **"Expertise – Passion – Automation"**. SMC mavisi `#0072CE`.

## Komutlar
`npm run dev` (5180, strictPort) · `npm run build` · `npm run preview` · `npm run typecheck`.
