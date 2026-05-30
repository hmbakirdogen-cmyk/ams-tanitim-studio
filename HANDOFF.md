# HANDOFF — AMS Tanıtım Stüdyosu

**Son güncelleme:** 2026-05-30 (uzun otonom oturum — Mehmet Abi tam yetki)
**Durum:** Çalışıyor + CANLI yayında. `npm run dev` → http://localhost:5180 · `npm run build` ✅ (offline).
**Canlı:** https://hmbakirdogen-cmyk.github.io/ams-tanitim-studio/ · Repo (public): github.com/hmbakirdogen-cmyk/ams-tanitim-studio · **master push → otomatik deploy** (`.github/workflows/deploy.yml`, `VITE_BASE=/ams-tanitim-studio/`).
**Giriş:** Halil İbrahim Karakelle · şifre **`smc`** (varsayılan avatar gömülü: `public/users/halil.jpg`).
**Hitabet (CC↔kullanıcı):** **Mehmet Abi**.

## ✅ TAMAMLANDI: Çok dilli (i18n) — FAZ 2 (TR / EN / **JA**) — TÜM PROGRAM
"Dil değişince HER YER değişsin." **Almanca yerine Japonca** (Mehmet Abi değiştirdi) — bayrak Hinomaru, sözlük JA.
- **Mimari:** `src/i18n/index.tsx` — anahtar = TÜRKÇE metin; `useLang().t("...")` → EN/JA sözlükten, yoksa TR'ye düşer (kırılmaz). Dil kalıcı (`ams_lang_v1`). **357 anahtar, EN/JA tam parite** (doğrulandı; 0 eksik `t()` literal).
- **Bayrak anahtarı:** `LangSwitcher.tsx` (TR dalgalanan SVG + GB + **JP Hinomaru**). Switcher: Sidebar + **Giriş ekranı**.
- **Kapsandı:** çekirdek + Sidebar + PageHeader + LoginScreen + ModeStrip + DataModeBadge + 7 sayfa + 5 modal (AdminUsers/ProfileEditor/RangeAnalysis/ReportView/LiveSetupGuide) + IntroSplash/MobileBlocked/ProductBadge/SmcLogo/TopBar + HeroKPI/ChartOverlay/PipeOverlay/MetricCard + App mobil çubuk. Metrik/modül/model adları data'da TR kalır, gösterimde `t()`.
- **İmza:** `Signature.tsx` — "This software is crafted with precision & passion by **Mehmet Bakırdöğen**" (HEP İngilizce, çevrilmez). Her sayfada: Sidebar altı + Giriş ekranı.
- **Logo:** Paneldeki SMC logosu büyütüldü (60→**84px**, `stack`: yazı logonun altında 2 satır).

## ✅ YAPILDI (v1): Canlı grafik 2. görünüm — "Cihaz Akışı"
**"Boru" kaldırıldı; "Klasik" kaldı; yeni "Akış" eklendi** (LivePage view anahtarı: Akış / Klasik). `DeviceFlowChart.tsx` = **Canvas 2B** (procedural 3B Mehmet Abi'nin isteğiyle ATILDI). **Gerçek AMS fotosu** `public/products/ams-product.png` (şeffaf zemin) yarı şeffaf arkada; uçtan uca tek **şeffaf boru** içinde soldan sağa akan hava. Giriş/çıkış hortumları **boru ile aynı çap** + içinde de akış (birleşim kelepçeli). **Debi**→akış hızı/parlaklık · **basınç**→regülatör bölgesinde sıkışma · **sıcaklık**→renk (soğuk→sıcak) · **nem**→su damlaları · **valf/regülatör DEVREYE GİRİNCE** foto üzerinde nabız halka (Tasarruf=regülatör/yeşil, Kesinti=valf/amber) + **valf egzoz püskürtme**. Üstünde PipeOverlay (mod+değer+eşik+giriş/çıkış+"devrede" rozeti). **Açık:** Mehmet Abi 1 saatlik işe gitti — dönüşte canlıyı görüp rötuş/geri bildirim verecek. Detay: hafıza [[live-chart-pnomatik-hat]].

## 🟢 KARARLAR + İSKELETLER (bu oturum)
- **Cihaz ayar senkronu = HİBRİT (iskelet HAZIR, donanımla aktif):** Bağlanınca cihaz ayarları **okunur** (Ürün Ayarları o değerlerle devam), kullanıcı değiştirince cihaza **yazılır** (echo-write korumalı). Kod: `deviceSettings.ts` (paylaşılan store + `applyDeviceSettingsFromDevice`), `liveSource.ts` (`setSettings`/`onDeviceSettings`), `bridge/opcua-bridge.mjs` (bağlanınca ayar oku→gönder + `setSettings` yaz; ayar node'ları cihazda yoksa atlar), `useLiveReadings.ts` köprüleme. Bkz [[cihaz-ayar-senkron-karari]].
- **Arkadaşların kendi kurulumu (mühendis seviyesi):** **`bridge/baslat.bat`** = çift tıkla (Node kontrol + ilk kurulum + köprüyü başlat). `bridge/README.md` mühendis seviyesi rehber. LiveSetupGuide'da "kolay yol" notu. (Daha fazla paketleme/portable node gerekirse ileride.)

## 💡 SIRADAKİ FİKİRLER (Mehmet Abi istedi, henüz başlanmadı)
- **Canlı Panel'de zaman çubuğu (tutup-çekme):** Klasik grafiğin zaman aralığını geçmişe çek (−10sn → saatler/günler, retention=30 gün). **Veri hazır** (`history.ts` `queryHistory`); LivePage scrubber + Hero3DChart pencere + ChartOverlay etiketleri.
- **Giriş ürün görseli netliği kararı:** ams-diagram düşük çöz; net+arka plan için birleştirme ya da yüksek-çöz SMC orijinali. Karar bekliyor.

## ⏳ Bekleyenler
1. **Cihaza YAZMA (gerçek OPC UA write)** — DONANIM gelince (köprüde `setMode` write iskeleti hazır).
2. **Mobil tekrar açma** — şu an `App.tsx`'te `if (isMobileDevice()) return <MobileBlocked/>` (tek satır). Responsive çekmece menü + demo kilidi kodu YERİNDE; tek satırı kaldırınca mobil geri gelir.
3. **Pnömatik Hat grafiği rötuşu** — Mehmet Abi ile birlikte (boru/akış/renk).

## ✅ Bu oturumda tamamlananlar (özet)
PWA kurulabilir · Kalıcı geçmiş + **tarihsel rapor** (Kayıtlar; 30 gün; Ürün Ayarları'nda "Demo geçmişi oluştur") · Giriş kartları (ortalı/iri/yönetici vurgulu) · **Ürün kimliği her yerde** (Sidebar rozet) · **Her sayfada DEMO/CANLI rozeti** · **Canlı Pnömatik Hat** grafiği (Boru/Klasik geçişli) · **Canlı Cihaz Kurulum Kılavuzu** (uyarlanabilir node, ekrandan) · **Halil Bey foto** (varsayılan avatar) · **Tam Yedek** (personel + TÜM `ams_*` veriler) · logo büyütme + arka plan koyulaştırma · **mobil devre dışı** (PC'den açın ekranı) + yükle daveti kaldırıldı · Ürün sayfası gerçek bileşen fotoğrafları + komple ünite vitrini (ams-system 2800px) + regülatör iki varyant · 3D render DPR 2 · GitHub Pages canlı.

## Komutlar / Mimari
`npm run dev` (5180) · `build` · `preview` (4173) · `typecheck`. Köprü: `cd bridge` → `npm i node-opcua ws` → `node opcua-bridge.mjs`.
Tüm durum localStorage (`ams_*`), offline. Merkezi sensör: `src/data/metrics.ts`. Görsel yolları base-uyumlu: `src/lib/asset.ts`. Mobil sezimi: `src/lib/device.ts`.
KATİ kurallar: [CLAUDE.md](CLAUDE.md). Hafıza: hitabet-mehmet-abi · live-chart-pnomatik-hat · deploy-github-pages · platform-yeni-urun-recetesi · chart-look-emissive-not-pbr · cihaz-ayar-senkron-karari.
i18n: tek dosya `src/i18n/index.tsx` (TR/EN/JA). Yeni metin = görünen yeri `t()` ile sar + EN&JA sözlüğüne ekle (parite koru).
