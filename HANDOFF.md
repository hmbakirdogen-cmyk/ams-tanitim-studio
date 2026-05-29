# HANDOFF — AMS Tanıtım Stüdyosu

**Son güncelleme:** 2026-05-29 (otonom oturum — Mehmet Bey tam yetki; model+grafik+rapor+modül+ürün görseli + 2 review turu)
**Durum:** Çalışıyor. `npm run dev` → http://localhost:5180 · `npm run build` ✅ (offline, fontlar gömülü).
**Giriş:** Halil İbrahim Karakelle · şifre **`smc`** (yönetici). Uygulama içi hitabet **AD ile** ("Halil İbrahim Bey", soyad değil).

## 🔧 DEVAM NOTLARI (2026-05-29 gece-3 — büyük oturum: model + 3D boru grafik + rapor + modüller)
- **✅ Model seçimi TAM:** `src/data/model.ts` artık **paylaşılan store** (useSyncExternalStore — model değişince tüm uygulama reaktif) + `defaultsForModel()` (modele en mantıklı çalışma basıncı/bekleme/eşik). `useMetrics()` reaktif dizi tüm tüketicilere bağlı (debi/basınç ölçeği modelle gelir). Ürün Ayarları'nda **model seçici (tam kod dropdown)** — seçince `economy.baselineFlow` + device eşikleri mantıklı varsayılana güncellenir, slider aralıkları modele uyar. PageHeader aktif model kodunu gösterir. demoSource hedefleri `getActiveModel()`'den.
- **✅ Bağlı modüller TAM:** `src/data/modules.ts` (EXW1 kablosuz, yumuşak başlatma, ek basınç sensörü, IO-Link hub, web sunucu) — Ürün Ayarları'nda seç, Ürün & Teknoloji vitrinine yansır.
- **✅ Canlı grafik — `Hero3DChart.tsx` SIFIRDAN TEMİZ yazıldı (çok iterasyon → ONAYLI son hal):** her sensör **TEK gerçek 3D boru** (THREE.TubeGeometry); renk **EMISSIVE** (kendi renginde ışır → koyu sahnede asla SİYAH değil — ⚠️ PBR/metalik/clearcoat DENEME, defalarca karattı, bkz. memory `chart-look-emissive-not-pbr`); `side=DoubleSide` (garanti görünür); **vertexColors RGBA** ile kuyruk izi (uç opak → kuyruk saydam = kuyruklu‑yıldız); uçta küçük **additive komet başı**; `frustumCulled=false`. **60fps:** geometri bir kez kurulur, her karede position/normal **yerinde** yazılır (sıfır tahsis). **L=125 nokta = ~10 sn pencere** @80ms tik; ChartOverlay X ekseni **canlı zaman etiketleri** (şimdi ↔ −10 sn).
- **✅ Rapor ekranı TAM:** `ReportView.tsx` (yazdırılabilir kurumsal belge: özet KPI + mod dağılımı + tasarruf ₺/kWh/CO₂ + sensör grafikleri). RangeAnalysisModal'a **tarih+saat aralığı (datetime-local)** + **"Rapor Ver"** (+999ms son‑saniye toleransı). `useLiveReadings.startedAt` (ilk okumada tam zaman) + `recordings.startedAt` (geriye uyumlu) + `lib/datetime.ts` + `pointsToCSV` (yerel saat). `@media print` → sadece rapor, çok sayfaya yayılır.
- **✅ Gerçek ürün görseli:** SMC AMS katalog PDF'i (`Desktop/AMS-Da_EU.pdf`) kapağındaki render → beyaz zemin **şeffaflaştırılıp** kırpıldı (`public/products/ams-product.png`), **katalog mavisi gradyan + desen** hücreye büyük yerleştirildi (Ürün & Teknoloji hero). (Python/PyMuPDF+Pillow kuruldu; çıkarma scripti `%TEMP%`'te.)
- **✅ İKİ review turu:** Tur‑1: 8 bulgu (60fps perf×3, rapor print kırpma, ölü‑kod, birim/yerel‑saat, datetime kenar) — hepsi düzeltildi. Tur‑2 (baştan tam tarama): 7 düşük bulgu — hepsi düzeltildi (frustumCull, **economy de paylaşılan store**, tam startedAt, **MODE_COLOR types.ts'te merkezi**, debi kimlik rengi). typecheck+build temiz.
- **Ürün & Teknoloji:** TÜM katalog özellikleri (kestirimci bakım, güvenlik, sürdürülebilirlik vb.) eklenebilir (sıradaki).

## ✅ Tamamlananlar
- **Canlı Panel:** gerçek WebGL 3D çok‑çizgili **akan** grafik (Debi/Basınç/Sıcaklık/Nem); bloom, yansıyan zemin, prosedürel stüdyo ışıkları + Sparkles, fareyle parallax; 60fps emniyetli; yuvarlak/kırılmasız çizgiler. Kendini açıklayan: X/Y eksen başlıkları, %0–100 seviye çizgileri, sağda koyu‑net **canlı okuma paneli**, sol üstte **canlı akış süresi sayacı**. Altta **eşit‑olmayan mozaik** kartlar (her biri kendi mini grafiği + sayaçlı rakam + birim). Mod kontrolü (Normal/Tasarruf/Kesinti) + Web Audio ses (mute).
- **Çok sayfalı kabuk:** Sidebar + sinematik açılış (intro) + sayfa geçiş animasyonları.
- **Sayfalar:** Sensör Detayları · Tasarruf Analizi (**elektrik fiyatı vb. düzenlenebilir**, kompakt ₺/kWh/CO₂) · Ürün & Teknoloji (AMS vitrini) · Ürün Ayarları (bekleme basıncı/oto‑kesinti süresi/eşik/valf modu → **demo senaryosunu canlı sürer**; + sensör görünürlüğü) · Kayıtlar (kaydet/sil + CSV/JSON + **zaman‑aralığı analiz penceresi**).
- **Giriş/Yetki:** sinematik kullanıcı kartları (foto+ünvan+rol); offline SHA‑256; yönetici kullanıcı ekler + detay (ünvan/telefon/e‑posta) + şifre tanımlar; herkes Profilim'den foto (otomatik karizmatik kırpma) + bilgi + **kendi şifresini** değiştirir.
- **Marka:** gerçek SMC logosu `public/smc-logo.svg` → bombeli cam 3D rozet, her sayfada; slogan "Expertise – Passion – Automation".
- **Birim her yerde**, kafa karıştıran kısaltma yok, büyük değerler kompakt.

## ⏳ Bekleyenler / Sıradaki
1. **GitHub push + Lovable bağlama** — `gh` kurulu: **`C:\Program Files\GitHub CLI\gh.exe` (v2.93.0)** ama PATH'te değil + **giriş YAPILMAMIŞ**. KALAN: Mehmet Bey tek seferlik `& "C:\Program Files\GitHub CLI\gh.exe" auth login`. Sonra CC: `hmbakirdogen-cmyk` altında repo aç + `git remote add origin … && git push` (dal: master). Ardından Lovable'da **"Import GitHub repository"**.
2. **✅ Gündüz/Gece teması** — toggle + yumuşak geçiş (sahne iki katman cross-fade + aurora opacity) + gündüz kontrast/okunaklılık rötuşu. (Tamam)
3. **✅ Gerçek görseller** — Ürün hero: katalog render şeffaf kesim (`ams-product.png`) mavi gradyan hücrede; Login: smcusa.com bağlı sistem diyagramı (`ams-diagram.jpg`, 2x upscale). Bileşen kartlarına ek görseller (exa1/regülatör/valf) ileride bağlanabilir.
4. **🟡 Canlı cihaz adaptörü (OPC UA) — UYGULAMA HAZIR:** Ürün Ayarları > Veri Bağlantısı (Demo/Canlı + cihaz IP + durum); `src/data/liveSource.ts` (WebSocket→köprü, reconnect, demo fallback). KALAN (donanım): internetli makinede `npm i node-opcua ws`, cihaza göre `bridge/opcua-bridge.mjs` içindeki NODE_IDS'i ayarla, `node bridge/opcua-bridge.mjs` çalıştır → "Canlı" moda geç. Cihaz olmadan test edilemedi.
5. **GitHub push + Lovable** — `gh` kurulu, **giriş YAPILMADI** (Mehmet Bey tek seferlik `gh auth login`). Sonra repo+push+Lovable import.
6. **PWA / mobil** — telefondan kurulabilir; offline (mevcut).

## Çalıştırma
`npm install` → `npm run dev`. Yerel git geçmişi var (4+ commit); uzak depo henüz yok.

## Notlar
- Tüm KATİ kurallar [CLAUDE.md](CLAUDE.md)'de. Mimari: `src/data/metrics.ts` merkezi sensör kaydı (yeni sensör = tek satır).
- Memory: `project_ams_smc_yazilim` + `reference_smc_ams_katalog` (kullanıcının kalıcı hafızasında).
