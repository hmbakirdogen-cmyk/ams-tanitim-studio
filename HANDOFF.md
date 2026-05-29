# HANDOFF — AMS Tanıtım Stüdyosu

**Son güncelleme:** 2026-05-29 (otonom gece oturumu — Mehmet Bey tam yetki verdi)
**Durum:** Çalışıyor. `npm run dev` → http://localhost:5180 · `npm run build` ✅ (offline, fontlar gömülü).
**Giriş:** Halil İbrahim Karakelle · şifre **`smc`** (yönetici). Uygulama içi hitabet **AD ile** ("Halil İbrahim Bey", soyad değil).

## 🔧 DEVAM NOTLARI (yarım kalan iş — buradan sürdür, 2026-05-29 gece-2)
- **Gerçek görseller indirildi → `public/products/`:** `ams-system.jpg` (2800×1867, ANA AMS render), `exa1-hub.jpg`, `regulator-itv.jpg`, `regulator-ar.jpg`, `valve-vp.jpg`. → Ürün & Teknoloji (hero vitrin + bileşen kartları) ve Login'e tasteful gömülecek. (smc.eu/smcetech doğrulanmış URL'ler.)
- **Model seçimi (YARIM):** `src/data/model.ts` oluşturuldu (AMS20/30/40/60 × A/B; debi 5–4000 + basınç A:0.8/B:0.7). YAPILACAK: (1) demoSource hedefleri `getActiveModel()`'den (normal=baselineFlow, bekleme/kesinti ölçekli, basınç modelden); (2) flow metrik `max` modele göre ölçek (metricsForModel → LivePage/AnalysisPage/SensorsPage); (3) Ürün Ayarları'na **model seçici (tam kod dropdown)** + seçince `economy.baselineFlow` güncelle; (4) PageHeader aktif model kodunu göstersin (şu an PRODUCT.code statik).
- **Mehmet Bey yeni istek:** model seçilirken **ek modüler bağlı ürünler** de seçilebilsin (kablosuz adaptör EXW1, ek sensörler, regülatör A/B, valf, soft-start) → özellik/görünürlük/spec'i etkilesin.
- **Ürün & Teknoloji:** TÜM özellikler eklenecek (WiFi/kablosuz EXW1 100m şifreli + OPC UA + IO-Link + Endüstriyel Ethernet + web sunucu + kestirimci bakım + güvenlik + sürdürülebilirlik) — katalogdan.
- **Yapıldı ✅:** başlıklara ürün kimliği (`data/product.ts` + PageHeader).

## ✅ Tamamlananlar
- **Canlı Panel:** gerçek WebGL 3D çok‑çizgili **akan** grafik (Debi/Basınç/Sıcaklık/Nem); bloom, yansıyan zemin, prosedürel stüdyo ışıkları + Sparkles, fareyle parallax; 60fps emniyetli; yuvarlak/kırılmasız çizgiler. Kendini açıklayan: X/Y eksen başlıkları, %0–100 seviye çizgileri, sağda koyu‑net **canlı okuma paneli**, sol üstte **canlı akış süresi sayacı**. Altta **eşit‑olmayan mozaik** kartlar (her biri kendi mini grafiği + sayaçlı rakam + birim). Mod kontrolü (Normal/Tasarruf/Kesinti) + Web Audio ses (mute).
- **Çok sayfalı kabuk:** Sidebar + sinematik açılış (intro) + sayfa geçiş animasyonları.
- **Sayfalar:** Sensör Detayları · Tasarruf Analizi (**elektrik fiyatı vb. düzenlenebilir**, kompakt ₺/kWh/CO₂) · Ürün & Teknoloji (AMS vitrini) · Ürün Ayarları (bekleme basıncı/oto‑kesinti süresi/eşik/valf modu → **demo senaryosunu canlı sürer**; + sensör görünürlüğü) · Kayıtlar (kaydet/sil + CSV/JSON + **zaman‑aralığı analiz penceresi**).
- **Giriş/Yetki:** sinematik kullanıcı kartları (foto+ünvan+rol); offline SHA‑256; yönetici kullanıcı ekler + detay (ünvan/telefon/e‑posta) + şifre tanımlar; herkes Profilim'den foto (otomatik karizmatik kırpma) + bilgi + **kendi şifresini** değiştirir.
- **Marka:** gerçek SMC logosu `public/smc-logo.svg` → bombeli cam 3D rozet, her sayfada; slogan "Expertise – Passion – Automation".
- **Birim her yerde**, kafa karıştıran kısaltma yok, büyük değerler kompakt.

## ⏳ Bekleyenler / Sıradaki
1. **GitHub push + Lovable bağlama** — `gh` kurulu DEĞİL, hesap yetkisi yok. Mehmet Bey döndüğünde: (a) `gh` kur + `gh auth login`, ya da (b) `hmbakirdogen-cmyk` altında boş repo aç + URL ver → CC `git remote add origin … && git push` yapar. Sonra Lovable'da **"Import GitHub repository"**. (Web çekirdeği Lovable‑uyumlu; iki‑yönlü senkron, CC kontrolünde.)
2. **Gündüz/Gece teması** — toggle + ışık modu (koyu varsayılan; kontrast korunarak).
3. **Gerçek SMC ürün görselleri** (AMS hub/regülatör/valf) — Ürün sayfasında şu an zarif placeholder; smc.eu/smcusa ürün sayfalarından eklenecek.
4. **Canlı cihaz adaptörü (OPC UA)** — `opc.tcp://<IP>:4840`, node‑opcua; otomatik bağlan zinciri. Masaüstü (Electron) köprü gerektirir; cihaza takılınca doğrulanır. Şu an demo veri.
5. **PWA / mobil** — telefondan kurulabilir; offline.

## Çalıştırma
`npm install` → `npm run dev`. Yerel git geçmişi var (4+ commit); uzak depo henüz yok.

## Notlar
- Tüm KATİ kurallar [CLAUDE.md](CLAUDE.md)'de. Mimari: `src/data/metrics.ts` merkezi sensör kaydı (yeni sensör = tek satır).
- Memory: `project_ams_smc_yazilim` + `reference_smc_ams_katalog` (kullanıcının kalıcı hafızasında).
