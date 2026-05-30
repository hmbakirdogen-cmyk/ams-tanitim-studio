# HANDOFF — AMS Tanıtım Stüdyosu

**Son güncelleme:** 2026-05-30 (Cihaz Akışı TAM elden geçti — gerçek AMS40A görseli + venturi + egzoz + nem + regülatör LED/ekran)
**Durum:** Çalışıyor + CANLI yayında. `npm run dev` → http://localhost:5180 · `npm run build` ✅ (offline).
**Canlı:** https://hmbakirdogen-cmyk.github.io/ams-tanitim-studio/ · Repo (public): github.com/hmbakirdogen-cmyk/ams-tanitim-studio · **master push → otomatik deploy** (`.github/workflows/deploy.yml`, `VITE_BASE=/ams-tanitim-studio/`).
**Giriş:** Halil İbrahim Karakelle · şifre **`smc`** (varsayılan avatar gömülü: `public/users/halil.jpg`).
**Hitabet (CC↔kullanıcı):** **Mehmet Abi**.

## 🟢 EN SON NEREDE KALDIK (2026-05-30) — "Cihaz Akışı" tam elden geçti (gerçek AMS40A görseli)
Canlı Panel → "Akış" görünümü (`DeviceFlowChart.tsx`, saf Canvas 2D) bu oturumda baştan sona iyileştirildi. Mehmet Abi **tek tek yönlendirdi, her adım `npm run dev`'de onaylandı** (eski loop tuzağına girilmedi). Hepsi typecheck+build temiz.

**Arka plan görseli:** Mehmet'in masaüstünden verdiği **gerçek AMS40A fotosu** (`1.jpg`) → `public/products/ams-flow.png`. Zemin **`tools/clean-image.py`** (Python + numpy/scipy/Pillow) ile TİTİZ temizlendi: dış zemin + KAPALI montaj delikleri + kablo-içi + parlak kenar halesi → şeffaf, "kırpılmış durmaz". Runtime'da ön-temiz PNG algılanır → flood-fill atlanır (alfa bozulmaz). **Giriş ekranı görseli ESKİ haline döndürüldü** (`ams-diagram.jpg`, object-cover). SMC afişi `ams-overview.jpg` repo'da duruyor ama KULLANILMIYOR.

**Yerleşim T-tipi:** hava yolu ÜSTTE (yatay manifold, portlar otomatik ölçülür), regülatör SOL-ALT, valf SAĞ. Konum sabitleri foto-ölçümle: `REG_FRAC`/`LED_REG`/`LED_VALVE`/`VALVE_CX`/`EXHAUST_*`/`REG_DISP`/`FOCUS_*`. **Tahmini/ölçüm — gözle son nudge gerekebilir.**

**Akış (hepsi onaylı):**
- **Laminar/karışmaz:** hız parçacığa değil ŞERİDE bağlı (parabolik profil) → aynı şeritte aynı hız, asla geçişmez. Renk **ağırlıklı MAVİ**, tema-duyarlı (gece additif / gündüz koyu-mavi source-over). 224 molekül.
- **Nem:** dipte damla DEĞİL → havada süspanse **buhar zerreleri** (akışla sürüklenir) + nem tülü; **buhar rengi** (gece buz-beyazı / gündüz teal) akış mavisinden AYRI; crisp çekirdek (yoğun ama karışmaz).
- **Sıcaklık:** ısı tülü eşikli/soluk + tam hızda boru camı ÇOK hafif kızarır (gece kısık).
- **Egzoz:** valfin TAM ORTA EKSENİNDE alttaki SİYAH parçadan; DUMAN değil **HAVA jeti** (geniş yelpaze). İzolasyon GERİ-AKIŞI: yatay → yumuşak çeyrek DİRSEK (bezier) → dik iniş; kesit Y→X döner, porta funnel; dirsek+iniş yavaşlatıldı (graceful), portta sönüp jete bağlanır.
- **Regülatör molekülleri = AKICI VENTURI:** dar hücrede giriş→çıkış süzülür, orifiste kesit DARALIR (hourglass) + HIZLANIR; devredeyken çıkış hızlı→seyrek (continuity ⇒ P1>P2). Animasyon **rahatlatıldı** (az/seyrek, sakin). `REG_FRAC` 0.155–0.305.
- **Regülatör LED'i:** yüzen halka KALDIRILDI → ışık gerçek **POWER LED'inde** (ekran altı), ÇOK küçük + gerçekçi + **yanıp söner**. Valf devrede-halkası duruyor (turuncu, biraz sağ).
- **Regülatör kırmızı dijital ekranı:** CANLI basınç (MPa) — orijinal foto çerçevesi korunur, statik ".200" koyu camla gizlenir. Cihaz **TERS monteli** ⇒ rakamlar **180° döndürülmüş + DAHA KOYU kırmızı**.
- **Debimetre LCD:** rakamlar büyük/okunaklı (P/Q/T kalktı, birim ölçülerek). **Debimetre odaklı hafif zoom** (`ZOOM`=1.12, dış çerçeve sabit).

**Ses/Sidebar (bu oturum):** ses **VARSAYILAN AÇIK** (load'da çalmaz; ilk harekette AudioContext); ses+tema küçük ikon olarak **dil satırına** taşındı; nav/aralık sıkıştırıldı → scroll azaldı.

**Eski ders (hâlâ geçerli):** akışta tek tek deneyip durMA — netleştir, küçük adım, onay al. Bu oturum böyle yürüdü.
**SIRADAKİ (yeni oturum):** konumları (egzoz/LED/`REG_DISP`/`ZOOM`/`REG_FRAC`) gözle son rötuş → beğeni sonrası **`git push`** = canlı deploy.

## ✅ TAMAMLANDI: Çok dilli (i18n) — FAZ 2 (TR / EN / **JA**) — TÜM PROGRAM
"Dil değişince HER YER değişsin." **Almanca yerine Japonca** (Mehmet Abi değiştirdi) — bayrak Hinomaru, sözlük JA.
- **Mimari:** `src/i18n/index.tsx` — anahtar = TÜRKÇE metin; `useLang().t("...")` → EN/JA sözlükten, yoksa TR'ye düşer (kırılmaz). Dil kalıcı (`ams_lang_v1`). **357 anahtar, EN/JA tam parite** (doğrulandı; 0 eksik `t()` literal).
- **Bayrak anahtarı:** `LangSwitcher.tsx` (TR dalgalanan SVG + GB + **JP Hinomaru**). Switcher: Sidebar + **Giriş ekranı**.
- **Kapsandı:** çekirdek + Sidebar + PageHeader + LoginScreen + ModeStrip + DataModeBadge + 7 sayfa + 5 modal (AdminUsers/ProfileEditor/RangeAnalysis/ReportView/LiveSetupGuide) + IntroSplash/MobileBlocked/ProductBadge/SmcLogo/TopBar + HeroKPI/ChartOverlay/PipeOverlay/MetricCard + App mobil çubuk. Metrik/modül/model adları data'da TR kalır, gösterimde `t()`.
- **İmza:** `Signature.tsx` — "This software is crafted with precision & passion by **Mehmet Bakırdöğen**" (HEP İngilizce, çevrilmez). Her sayfada: Sidebar altı + Giriş ekranı.
- **Logo:** Paneldeki SMC logosu büyütüldü (60→**84px**, `stack`: yazı logonun altında 2 satır).

## ✅ Canlı grafik 2. görünüm — "Cihaz Akışı" (LivePage: Akış / Klasik)
`DeviceFlowChart.tsx` = saf Canvas 2D; gerçek cihaz fotosu (`ams-flow.png`) üstüne tüm animasyon biner; üstünde PipeOverlay (mod+değer+eşik+giriş/çıkış+"devrede" rozeti). **Güncel hal yukarıdaki EN SON bölümünde.** Mimari: merkezi sensör `src/data/metrics.ts`; görsel yolları base-uyumlu `src/lib/asset.ts`. Eski tasarım notu: hafıza [[live-chart-pnomatik-hat]].

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
