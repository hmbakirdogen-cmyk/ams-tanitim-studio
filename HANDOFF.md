# HANDOFF — AMS Tanıtım Stüdyosu

**Son güncelleme:** 2026-05-30 (büyük otonom oturum — Mehmet Abi tam yetki)
**Durum:** Çalışıyor. `npm run dev` → http://localhost:5180 · `npm run build` ✅ (offline, fontlar gömülü). PWA kurulabilir (önizleme: `npm run preview` → :4173).
**Giriş:** Halil İbrahim Karakelle · şifre **`smc`** (yönetici). Uygulama içi hitabet **AD ile** ("Halil İbrahim Bey").
**Hitabet (CC↔kullanıcı):** Mehmet Abi (bkz. hafıza `hitabet-mehmet-abi`).

## 🔧 BU OTURUMDA EKLENENLER (2026-05-30)
- **✅ PWA / mobil kurulum:** `useInstallPrompt` + `InstallPrompt` (Android tek tık "Yükle", iOS "Ana Ekrana Ekle" adımları), PNG ikonlar (`public/pwa-192/512`, `pwa-maskable-512`, `apple-touch-icon`), iOS meta + manifest. Offline korundu. (Tam offline kurulum HTTPS deploy ister; localhost güvenli.)
- **✅ KALICI GEÇMİŞ + TARİHSEL RAPOR:** `src/data/history.ts` — dakikalık seyreltme, **30 gün** retention, demo/canlı AYRI kova. `useLiveReadings` her okumayı yazar. Ürün Ayarları > Veri Bağlantısı'nda **"Demo geçmişi oluştur (30 gün)"** (gün/gece + hafta sonu ritmi) + temizle. Kayıtlar'da **"Tarihsel rapor al"** → takvim ön-ayarlı (`Bugün/Dün/Son 7 gün/Tümü`) `RangeAnalysisModal` → geçmiş günlerin raporu. `ReportView` tasarruf dt eşiği 120 sn'ye çekildi (dakikalık geçmiş sayılır, büyük boşluklar sayılmaz). Geniş seriler için `src/lib/series.ts` `downsample` (sparkline).
- **✅ Giriş kartları:** sabit ızgara → ortalanan flex-wrap (tek kişi ortada, dengeli), iri kart (avatar 84), yönetici SMC-mavisi vurgulu; başlıkta ürün adı + model rozeti.
- **✅ Ürün kimliği her yerde:** `ProductBadge` (sidebar her sayfada: ürün görseli + ad + aktif model). **Tüm ürün görselleri = giriş görseli** (`ams-diagram.jpg`, fabrikadaki gerçek AMS) — hero + rozet `object-cover` ile dolu/belirgin.
- **✅ Halil Bey fotoğrafı:** `public/users/halil.jpg` (yüz odaklı kare, `scripts/make-halil-avatar.py`), tohum kullanıcıya **varsayılan avatar** (+ geriye-uyumlu backfill). Profilim'den değiştirilebilir.
- **✅ TAM YEDEK:** `src/data/backup.ts` — **personel + TÜM veriler** (kayıtlar/geçmiş/ayarlar/ekonomi/model/modüller/bağlantı/tema) tek dosyada. Kullanıcılar paneli: "Tam Dışa/İçe Aktar" (onaylı, sonra reload) + eski "Sadece personel (birleştir)" korundu.
- **✅ CANLI CİHAZ KURULUM KILAVUZU:** `src/components/LiveSetupGuide.tsx` (Ürün Ayarları > "Canlı cihaza bağlanma kılavuzu") — 5 adım, kopyala-yapıştır komut. **Uyarlanabilir:** OPC UA node kimlikleri **ekrandan** girilir (`connection.ts` `NodeIds` + `setNodeIds`), `liveSource` köprüye `connect`'te gönderir, `bridge/opcua-bridge.mjs` bunları okur (mod-yazma iskeleti de eklendi).
- **✅ Logolar büyütüldü** (rozet içindeki marka iri, footprint sabit → taşmaz; intro/login/ürün boyutları arttı). **Arka plan koyulaştırıldı** (sahne gradyanı + token'lar + intro + vinyet).
- **🅿️ Canlı "Pnömatik Hat" grafiği:** `PipeFlowChart` + `PipeOverlay` (yatay cam boru + akan hava + mod/eşik/anlık değer), Canlı Panel'de **Boru/Klasik geçiş** anahtarı (eski `Hero3DChart` silinmedi). **Mehmet Abi ile birlikte rötuş edilecek** (park).

## ✅ Önceki temel (özet)
Canlı Panel (klasik 3D akan grafik + mozaik kartlar + mod kontrolü) · Sensör Detayları · Tasarruf Analizi · Ürün & Teknoloji · Ürün Ayarları (model/modüller/cihaz parametreleri/sensör görünürlüğü) · Kayıtlar (kaydet/sil/CSV/JSON/aralık analizi) · Giriş/Yetki (offline SHA-256, profil/foto/şifre) · gündüz-gece teması · marka (SmcLogo).

## ⏳ Bekleyenler / Sıradaki
1. **Cihaza YAZMA (gerçek OPC UA write)** — DONANIM gelince. Köprüde `setMode` write iskeleti hazır; diğer setup'lar (bekleme basıncı/eşik/kesinti/valf) için write eklenecek. (Şu an setup'lar yalnız DEMO senaryosunu sürüyor; canlıda sadece okuma + mod komutu.)
2. **GitHub push + Lovable** — `gh` kurulu (`C:\Program Files\GitHub CLI\gh.exe`) ama **giriş YAPILMADI** + uzak depo yok. Tek seferlik `gh auth login` (Mehmet Abi). Sonra CC: `hmbakirdogen-cmyk` altında repo + `git remote add origin` + `git push`.
3. **Pnömatik Hat grafiği rötuşu** — Mehmet Abi ile birlikte (boru kalınlığı/akış/renk/hizalama).
4. PWA tam offline kurulum için HTTPS deploy (Lovable/Pages).

## Komutlar
`npm run dev` (5180) · `npm run build` · `npm run preview` (4173) · `npm run typecheck`. Köprü: `cd bridge` → `npm i node-opcua ws` → `node opcua-bridge.mjs`.

## Notlar
- KATİ kurallar [CLAUDE.md](CLAUDE.md). Mimari: `src/data/metrics.ts` merkezi sensör kaydı. Tüm durum localStorage (`ams_*`), offline.
- Hafıza: `live-chart-pnomatik-hat`, `hitabet-mehmet-abi`, `chart-look-emissive-not-pbr`.
