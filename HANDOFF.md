# HANDOFF — AMS Tanıtım Stüdyosu

**Son güncelleme:** 2026-05-29 (otonom gece oturumu — Mehmet Bey tam yetki verdi)
**Durum:** Çalışıyor. `npm run dev` → http://localhost:5180 · `npm run build` ✅ (offline, fontlar gömülü).
**Giriş:** Halil İbrahim Karakelle · şifre **`smc`** (yönetici).

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
