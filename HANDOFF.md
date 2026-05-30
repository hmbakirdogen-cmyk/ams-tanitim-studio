# HANDOFF — AMS Tanıtım Stüdyosu

**Son güncelleme:** 2026-05-30 (uzun otonom oturum — Mehmet Abi tam yetki)
**Durum:** Çalışıyor + CANLI yayında. `npm run dev` → http://localhost:5180 · `npm run build` ✅ (offline).
**Canlı:** https://hmbakirdogen-cmyk.github.io/ams-tanitim-studio/ · Repo (public): github.com/hmbakirdogen-cmyk/ams-tanitim-studio · **master push → otomatik deploy** (`.github/workflows/deploy.yml`, `VITE_BASE=/ams-tanitim-studio/`).
**Giriş:** Halil İbrahim Karakelle · şifre **`smc`** (varsayılan avatar gömülü: `public/users/halil.jpg`).
**Hitabet (CC↔kullanıcı):** **Mehmet Abi**.

## 🔴 ŞU AN DEVAM EDEN: Çok dilli (i18n) — FAZ 2 (sırayla + sağlam tamamlanacak)
Mehmet Abi: "tüm programın dilini bayrak butonlarıyla değiştir (TR/EN/DE); Türk bayrağı asil 3B dalgalansın; **parça parça değil, hepsini sırayla ve sağlam yap**."
- **Mimari:** `src/i18n/index.tsx` — anahtar = TÜRKÇE metin; `useLang().t("Türkçe metin")` → EN/DE sözlükten, yoksa Türkçe'ye düşer (asla kırılmaz). Dil kalıcı (`ams_lang_v1`). Sözlük (EN+DE) hep bu dosyada.
- **Bayrak anahtarı:** `src/components/LangSwitcher.tsx` (TR dalgalanan SVG + GB + DE). CSS dalga: `index.css` `.flag-wave`/`.flag-sheen`.
- **✅ Bitti:** i18n çekirdek + LangSwitcher + **Sidebar** (menü/aksiyon/rozet) + **PageHeader** (başlık/alt başlık/ürün adı). Switcher Sidebar'da mount.
- **⏳ KALAN (sırayla, her birinde: görünen Türkçe stringleri `t()` ile sar + EN/DE'yi `src/i18n` sözlüğüne ekle):**
  1. **LoginScreen** — switcher'ı GİRİŞ ekranına da mount et ("giriş dahil") + stringler (Personel Girişi, Hoş geldiniz, Şifrenizi girin, geri, hata, Yönetici/Personel).
  2. **ModeStrip** + **DataModeBadge** (mod etiketleri MODE_LABEL/DESC — types.ts'te Türkçe kalsın, component'te `t()` ile çevir).
  3. Sayfalar: **LivePage, SensorsPage, AnalysisPage, SavingsPage, RecordsPage, ProductSettingsPage, ProductPage** (uzun açıklamalar dahil).
  4. Modaller: **AdminUsers, ProfileEditor, RangeAnalysisModal, ReportView, LiveSetupGuide**.
  5. **IntroSplash, MobileBlocked, ProductBadge, SmcLogo** (slogan/alt yazı).
  6. **Metrik adları/birimleri** (`metrics.ts` Türkçe kalsın; gösterim yerlerinde `t()`) + **modules.ts** ad/açıklama.
- Bitince `npm run typecheck` + `build` + push (otomatik deploy).

## 💡 SIRADAKİ FİKİRLER (Mehmet Abi istedi, henüz başlanmadı)
- **Canlı Panel'de zaman çubuğu (tutup-çekme):** Klasik akan grafiğin zaman aralığını kolayca geçmişe çek (−10sn → saatler/günler, retention=30 gün). **Veri hazır** (`src/data/history.ts` `queryHistory(src,start,end)`); LivePage'e scrubber/preset + Hero3DChart'a seçili pencereyi besleme + ChartOverlay zaman etiketleri. **Mümkün, sıraya alındı.**
- **Giriş ürün görseli netliği kararı:** ams-diagram (1380px, fabrika arka planı — şu anki) düşük çöz; net+arka plan için ya birleştirme (sharp ürün+bulanık fabrika) ya yüksek-çöz SMC orijinali. Karar bekliyor.

## ⏳ Bekleyenler
1. **Cihaza YAZMA (gerçek OPC UA write)** — DONANIM gelince (köprüde `setMode` write iskeleti hazır).
2. **Mobil tekrar açma** — şu an `App.tsx`'te `if (isMobileDevice()) return <MobileBlocked/>` (tek satır). Responsive çekmece menü + demo kilidi kodu YERİNDE; tek satırı kaldırınca mobil geri gelir.
3. **Pnömatik Hat grafiği rötuşu** — Mehmet Abi ile birlikte (boru/akış/renk).

## ✅ Bu oturumda tamamlananlar (özet)
PWA kurulabilir · Kalıcı geçmiş + **tarihsel rapor** (Kayıtlar; 30 gün; Ürün Ayarları'nda "Demo geçmişi oluştur") · Giriş kartları (ortalı/iri/yönetici vurgulu) · **Ürün kimliği her yerde** (Sidebar rozet) · **Her sayfada DEMO/CANLI rozeti** · **Canlı Pnömatik Hat** grafiği (Boru/Klasik geçişli) · **Canlı Cihaz Kurulum Kılavuzu** (uyarlanabilir node, ekrandan) · **Halil Bey foto** (varsayılan avatar) · **Tam Yedek** (personel + TÜM `ams_*` veriler) · logo büyütme + arka plan koyulaştırma · **mobil devre dışı** (PC'den açın ekranı) + yükle daveti kaldırıldı · Ürün sayfası gerçek bileşen fotoğrafları + komple ünite vitrini (ams-system 2800px) + regülatör iki varyant · 3D render DPR 2 · GitHub Pages canlı.

## Komutlar / Mimari
`npm run dev` (5180) · `build` · `preview` (4173) · `typecheck`. Köprü: `cd bridge` → `npm i node-opcua ws` → `node opcua-bridge.mjs`.
Tüm durum localStorage (`ams_*`), offline. Merkezi sensör: `src/data/metrics.ts`. Görsel yolları base-uyumlu: `src/lib/asset.ts`. Mobil sezimi: `src/lib/device.ts`.
KATİ kurallar: [CLAUDE.md](CLAUDE.md). Hafıza: hitabet-mehmet-abi · live-chart-pnomatik-hat · deploy-github-pages · platform-yeni-urun-recetesi · chart-look-emissive-not-pbr.
