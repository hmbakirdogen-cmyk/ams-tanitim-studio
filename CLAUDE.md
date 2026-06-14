# AMS Tanıtım Studio — oda kartı

> SMC Hava Yönetim Sistemi için offline 3D saha/fuar demosu. Genel çalışma tarzı üst `~/.claude/CLAUDE.md`'de. Detay: [HANDOFF.md](HANDOFF.md).

## Amaç
SMC **AMS** (Air Management System; ünite AMS40A/AMS30B, EXA1 hub) için offline, sinematik, foto-gerçek 3D saha satış/fuar demosu. SMC personeli müşteride cihazı bağlayıp canlı tasarrufu gösterir; cihaz gelince gerçek **OPC UA** verisiyle çalışır. İş hedefi: SMC'ye yazılım satan iş kolunun vitrini.

## Teknik yığın (package.json)
React + TypeScript + Vite (dev **5180**, strictPort) + Tailwind v4 + framer-motion. 3D: `three` + `@react-three/fiber`+`drei`+`postprocessing` (gerçek WebGL + bloom). Font `@fontsource-variable/inter` **gömülü (offline)**. Canlı cihaz: **OPC UA** (`node-opcua`) + ayrı Node köprüsü (`bridge/`, WebSocket `ws://localhost:4841`). PWA (offline-first, precache). i18n TR/EN/JA. Deploy: **GitHub Pages** (repo public, master, Actions otomatik). Doğrulama: `npm run typecheck` + `npm run build` (test runner yok).

## Bu repo NEDİR / NE DEĞİLDİR
- ✅ Bağımsız SMC ürün tanıtım/demo uygulaması + ürün-bağımsız platform.
- ❌ MEBA Komuta / Grup Finans / Teklif DEĞİL. Teslim/köprü paketi `Desktop\SMC-AMS-Kopru` bu projenin türevidir.

## Önemli kararlar + neden
- **Merkezi sensör kaydı** (`src/data/metrics.ts`) — yeni sensör/ürün = tek satır (grafik/kart/efsane otomatik). Çekirdek ürün-bağımsız (AMS = ilk veri seti).
- **Boru malzemesi emissive (kendi rengiyle ışıyan)** — PBR/metalik koyu sahnede boruları siyaha düşürüyordu (#1 şikayet, defalarca). **Bir daha karartan PBR denemesi yapma.**
- **Fizik-doğru yerleşim resmi SMC kataloğundan** (Giriş→Regülatör→Hub/LCD→Tahliye Valfi→Çıkış; izolasyonda valf kapanır + geri-akış). Debimetre LCD gerçek SMC davranışı (7-segment, totalizer).
- **Gerçek ürün fotosu/CAD render** — soyut/şematik kesit reddedildi ("ürünün GERÇEK görünümünü istiyorum"). Gerçek FOTO'ya agresif defringe YOK (montaj diplerini bozdu — geri alındı).
- **Görsel yolları base-uyumlu** (`import.meta.env.BASE_URL`) — Pages alt-klasöründe mutlak yol 404; `.jpg` PWA precache'e dahil (offline'da görsel kaybolmasın).
- **Lovable'a dönülmedi** — ağır R3F/WebGL'i bozar, offline kuralıyla çatışır, OPC UA'ya dokunamaz → statik GitHub Pages.
- **Para birimi otomatik kur YOK → dile bağlı** (JA→¥, TR/EN→₺); ayrı seçici söküldü.

## Çözülen önemli sorunlar
- **OPC UA fuar bağlantısı (13 Haz) çözüldü, gerçek veri aktı:** yanlış port (4840→4843) + bozuk adres → kurşungeçirmez parser; anonim reddi → Security None+admin; "premature disconnection" → başka istemci (UaExpert/atvise) tek oturumu tutuyordu, kapatılınca BAĞLANDI; veri 0 → otomatik browse gerçek düğüm isimlerini buldu → **VERİ AKTI** (cihaz LCD = ekran birebir); ölçek → kalibrasyon köprüde.
- "Değişikliği göremiyorum" = çoğunlukla **PWA service worker eski cache** (explicit registration + anında reload + cleanupOutdatedCaches). TV/4K context-loss "ekran yenileniyor" döngüsü → auto-lite + ErrorBoundary + WebGL self-heal.

## Şu anki durum
Demo CANLI, GitHub Pages otomatik deploy; **sürpriz YAPILDI** (link SMC arkadaşına gönderildi). Fuar bağlantısı çözüldü, gerçek veri akıyor. Tam köprülü paket `SMC-AMS-Kopru.zip` (~46MB) hazır. tsc+build 0, TR/EN/JA tam. Fuar dalı `gece-fuar-fix` yerel commit; fuar bitti → push kısıtı kalktı.

## Açık işler
- Dalı birleştir/push. Anlık/toplam debi düğüm eşleşmesi son teyidi (Efekan fotosu).
- **Tip-B analog gauge** (Mehmet abi foto atınca; `DEVICE_B_GAUGE_ENABLED`). Cihaza gerçek OPC UA **yazma** (donanım gelince; iskelet hazır).
- Söz: başka SMC ürününe "AMS reçetesi" (hangi dosya değişir); fizik-doğru hava akışı yeniden kurma (araştırma hazır); Electron .exe (köprüsüz) onay bekliyor.

## Projeye özel kural
- **Hitap ayrımı:** CC↔Mehmet abi sohbeti = "Mehmet abi". "[Ad] Bey" YALNIZCA uygulama içindeki SMC personeli hitabı (ör. arayüzde "Halil İbrahim Bey").
- **Offline korunur** — CDN/online bağımlılık ekleme; font/varlık gömülü, veri buluta gitmez.
- **Mobil de CANLI moda geçebilir** (LAN köprü kararı): köprü WS `0.0.0.0` dinler, uygulama köprü adresini host'tan türetir.
- **Birimi olan her sayıda birim** görünür (l/dak, MPa, °C, %); kafa karıştıran kısaltma yok. Grafikler gerçek 3D, 60fps, yuvarlak.
- Marka: gerçek SMC logosu (`public/smc-logo.svg`, smc.eu resmî) → cam 3D rozet; slogan **"Expertise – Passion – Automation"**; SMC mavisi **#0072CE**.
