# HANDOFF — AMS Tanıtım Stüdyosu

**Son güncelleme:** 2026-05-31 (4. tur — KALAN düşük-öncelik kapatıldı: sensorVisibility paylaşımlı-store + 2 bayat yorum; açık görsel kararları karara bağlandı. Hepsi push → canlı)
**Durum:** Çalışıyor + CANLI yayında. `npm run dev` → http://localhost:5180 · `npm run build` ✅ (offline). typecheck+build sıfır hata.

## 🟢 EN SON NEREDE KALDIK (2026-05-31, 4. tur) — KALAN düşük-öncelik kapatıldı + açık kararlar karara bağlandı
Mehmet Abi: *"sen hepsini kafana göre sıraya koy ve hallet."* → açık işler sıralanıp çözüldü:
- **sensorVisibility = PAYLAŞILAN STORE** (`useSyncExternalStore`, deviceSettings deseni): eskiden her sayfa kendi `useState`'iydi → Ürün Ayarları'nda sensör aç/kapat Canlı Panel'e ancak reload'da yansıyordu; **artık ANLIK** yansır. Hook imzası aynı (`{visible, toggle, showAll}`) → tüketici sayfalar değişmedi. `getSensorVisibility()` React-dışı okuma eklendi.
- **2 bayat yorum belgelendi:** `demoSource` standby.pressure=0.2 = yer tutucu (tickte `s.standbyPressure` ile ezilir); `deviceSettings.wasLastChangeFromDevice` senkron-dağıtım bağımlılığı not edildi. (App muted yorumu doğruydu; connection mobil-override yorumu zaten yok → dokunulmadı.)
- **Açık görsel kararları karara bağlandı** (aşağıda, KALAN bölümünde): egzoz = mevcut dikişsiz jet hali korundu; grafik perspektifi mevcut bırakıldı (ikisi de Mehmet'in gözüne).
- **metrics temp/humidity max = BİLEREK ERTELENDİ:** şimdi genişletmek demo grafik ölçeğini bozar; canlı cihaz yok → donanımda model/bağlantı-duyarlı yapılacak.
typecheck+build ✅ sıfır hata → push → canlı deploy.

## 🟢 ÖNCEKİ TUR (2026-05-31, 3. tur) — DERİN DENETİM + 30+ DÜZELTME + grafik optimizasyonu
**Çok-ajanlı denetim** (Workflow, 12 dilim × denetim+adversaryal-doğrula): **60 doğrulanmış bulgu, KRİTİK YOK.** Hepsi düzeltildi (aşağıda). Kritik olanlar:
- **DeviceFlowChart metrik eşleme:** LivePage artık DeviceFlowChart'a TAM `metrics` geçiriyor (eskiden `visibleMetrics` → sensör gizlenince regülatör/hub LCD index kayıp yanlış metrik/birim gösteriyordu). readoutRef anahtar-bazlı.
- **Tasarruf %:** LivePage `savingPercent(flow, economy.baselineFlow)` (eskiden sabit 1800 → model değişince yanlıştı; SavingsPage ile tutarlı).
- **useSmoothNumber:** hedefe oturunca rAF DURUR (boşta sonsuz 60fps yanmıyordu).
- **Auth güvenlik:** `removeUser` SON YÖNETİCİYİ silmez (boolean) + AdminUsers son-admin sil-butonu gizli; `importUsers` rol/soyad doğrular + mevcut rolü korur; AdminUsers şifre alanları `type=password`.
- **Köprü (`bridge/opcua-bridge.mjs`) baştan sertleştirildi:** WS **127.0.0.1** (ağdan yetkisiz cihaz yazımı engellendi), kendini-zamanlayan okuma (çakışma yok), ardışık-hata sayacı+yeniden bağlan, StatusCode kontrolü (Bad→uyarı), session-yok'ta uygulamaya hata, cleanup race düzeltildi, `bridge/package.json` (sabit sürüm) + `baslat.bat` ws kontrolü.
**Grafik (Hero3DChart) — Mehmet Abi istekleri:**
- Fare ile 3D oynamıyor (kamera sabit). Perspektif YUMUŞATILDI (kamera z 9→13, fov 42→30) → "şimdi" uçları daha hizalı. `SPAN_X` 17→21 (uçlar panel kenarına/"şimdi"ye uzanır).
- **GENİŞ zaman penceresi** (Mehmet Abi sevdi): `L` 200→600, `MAX_POINTS` 210→620 → **~48 sn** pencere (eskiden 16sn). Not: arka-plan sekmede tarayıcı throttle ettiği için ~56sn görünebiliyordu; artık kalıcı geniş.
**Diğer düzeltmeler (düşük):** ölü kod (TopBar silindi, react-router-dom kaldırıldı, registerSW sadeleşti, `label`/`displays` temizliği), perf (sampleY çift-hesap, visibleMetrics memo), i18n (`unitShort` t() ile tüm tüketicilerde → l/dak EN/JA çevrilir; %-etiketi dile göre), dayanıklılık (recordings/history try-catch + monotonluk + şekil-doğrulama, liveSource Number.isFinite, sound ilk-ses guard, AmbientScene blur, clipboard fallback, backup TAM-değiştir, reduced-motion a11y, HeroKPI mod bloğu SABİT yükseklik → kartlar kaymaz).
**⏳ KALAN düşük-öncelik (opsiyonel, yeni pencere):** metrics temp/humidity max'ı canlı cihaz için genişlet (BİLEREK ERTELENDİ — şu an genişletmek demo grafik ölçeğini bozar; donanım gelince model/bağlantı-duyarlı yap); şifre saltsız SHA-256 (demo geçidi, kabul edilmiş).
**Açık görsel kararları (Mehmet Abi gözle son söz):** (1) Egzoz/geri-dönüş animasyonu — kod zaten DİKİŞSİZ jet hali (yatay→bezier dirsek→dik iniş→portta sönüp jet devralır); körlemesine değiştirilmedi, mevcut hal korundu. (2) Grafik perspektifi "çok düz mü" — estetik, mevcut hal (z=13/fov=30) bırakıldı; istersen tek satır.
**Canlı:** https://hmbakirdogen-cmyk.github.io/ams-tanitim-studio/ · Repo (public): github.com/hmbakirdogen-cmyk/ams-tanitim-studio · **master push → otomatik deploy** (`.github/workflows/deploy.yml`, `VITE_BASE=/ams-tanitim-studio/`).
**Giriş:** Halil İbrahim Karakelle · şifre **`smc`** (varsayılan avatar gömülü: `public/users/halil.jpg`).
**Hitabet (CC↔kullanıcı):** **Mehmet Abi**.

## 🟢 EN SON NEREDE KALDIK (2026-05-31, 2. tur) — Canlı Panel UI turu + PWA bayat-cache KÖKTEN çözüldü
**PWA (önemli):** "çok eski versiyon / akış gelmedi" tekrarlayan sorunu = bayat service worker. ÇÖZÜM: `main.tsx` `registerSW({immediate, onNeedRefresh:()=>updateSW(true)})` + `vite.config` workbox `cleanupOutdatedCaches/skipWaiting/clientsClaim` → yeni deploy gelince sekme KENDİLİĞİNDEN yenilenir. (İlk sefer eski SW için bir kez hard-refresh/gizli-pencere gerekir; sonra otomatik.) Tanı aracı: `tools/_shot.mjs` (puppeteer-core, login'i tohumla atlayıp Canlı Panel'i çeker — `SHOT=device|lcd|reg|socket|full`).
**Canlı Panel UI (hepsi `npm run dev` + headless screenshot ile doğrulandı):**
- **Cihaz penceresi readout'ları SAĞDAN SOLA** (`PipeOverlay`): opak `bg-[#050b18]` kart → ARKASINDA akış animasyonu görünmez (Mehmet Abi). Mod rozeti üstte, sol-hizalı.
- **HeroKPI (Anlık Tasarruf):** mod değişince boyut DEĞİŞMEZ (alt mod bloğu sabit yükseklik) + sayı küçültüldü (text-6xl→5xl).
- **Debimetre LCD:** köşe radüsü yeniden optimize (min-kenara oranlı 0.18) + statik ".200/265" HAYALETİ tam-opak camla (`rgb(5,10,20)`) tamamen gizlendi.
- **Regülatör kırmızı ekranı:** debimetre paritesi — oranlı köşe radüsü (kırpma kaldırıldı) + ince bezel + padding.
- **Valf LED'i KALDIRILDI** (Mehmet Abi: "led işini beceremedik, valf LED'iyle ilgili ne varsa temizle"). DeviceFlowChart'tan tüm valf-LED kodu (LED_VALVE/SLOT/çizim) + öksüz `led()`/`blink`/`ledR` + tools/_vslot/_vshow/_sock/_bluescrew/_slots scratch dosyaları silindi. Tek cihaz göstergesi: **regülatör yeşil LED'i**.

## 🟢 ÖNCEKİ TUR (2026-05-31) — İki grafiğe ORTAK ambiyans sahnesi (AmbientScene)
Mehmet Abi: *"iki grafiğin (Akış + Klasik) ortak arka planı; uçan parlak şeyler, teknolojik hava akış sistemine bakıyormuşuz gibi."* → **`AmbientScene.tsx`** (yeni): saf Canvas 2D, 60fps sabit havuz, derin boşluk + perspektif sistem ızgarası + yatay süzülen parlak hava zerreleri (parallax) + nefes alan glow küreleri; tema-duyarlı; `pointer-events` yok (tıklama panellere geçer). **Canlı debiyle hızlanır** (`LivePage` → `flowNorm`, `AmbientScene:71`). DeviceFlowChart kendi arka planını bıraktı (artık ortak sahne). Yanında Canlı Panel sadeleştirildi (LivePage −124 satır), MetricCard/Sparkline/LangSwitcher/HeroKPI rötuş, **SensorsPage kaldırıldı**. typecheck+build ✅ sıfır hata, **commit `7f22497` push edildi → canlı deploy**. SIRADAKİ: canlıda gözle bak, zerre yoğunluğu/renk son rötuş gerekirse.

## 📦 ESKİ EN SON (2026-05-30) — "Cihaz Akışı" tam elden geçti (gerçek AMS40A görseli)
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
