# HANDOFF — AMS Tanıtım Stüdyosu

> Bu dosya, yeni Claude Code oturumunun "neredeyim" sorusuna ilk cevabıdır. **Güncel tut.**

## ŞU AN NEREDEYIZ (2026-06-04 — MOBİL-CANLI + PERF/REFRESH + ANİMASYON + KUSURSUZLAŞTIRMA)

**Durum:** Bugünkü canlı demo (TR; PC + mobil; **GERÇEK cihaz LAN köprüsüyle**) için kusursuzlaştırma turu. `typecheck` + `build` **SIFIR hata**. Test: yerelde Vite `:5180` + köprü `:4841`. **Paket/Release YAPILMADI** (Mehmet Abi onayı bekliyor).

> ⚠️ **Eski "Mobil = yalnız demo / mobilde canlı mod gizli / mobil=demo kilidi korunur" ifadeleri (aşağıdaki 2026-06-02 vb. bölümlerde) ARTIK GEÇERSİZ.** Mobil de canlı moda geçebilir — aşağıya bakın.

**MOBİL-CANLI (Mehmet Abi onayı):**
- Köprü WS artık `0.0.0.0` dinler (LAN açık) — `bridge/opcua-bridge.mjs` (`WS_HOST='0.0.0.0'`) + `bridge/server.mjs` (`HTTP_HOST='0.0.0.0'`).
- Uygulama köprü adresini **host'tan türetir**: `src/data/connection.ts` → `BRIDGE_URL = ws://<location.hostname>:4841` (PC'de `localhost`, telefonda PC'nin LAN IP'si).
- `ProductSettingsPage`'de **Demo/Canlı seçimi + bağlanma kılavuzu MOBİLDE de görünür** (artık `isMobileDevice` ile gizlenmiyor).
- `connection.ts`'teki **"mobil=demo zorlaması" KALDIRILDI** → telefon, PC'deki köprüden CANLI cihaz verisi görür + set ayarı yapar.
- **GÜVENLİK:** güvenilir saha ağı varsayımı (aynı Wi-Fi'daki cihazlar köprüye/cihaza yazabilir). İlk `0.0.0.0` açılışında Windows Güvenlik Duvarı tek seferlik izin sorabilir.

**PERF/REFRESH (mobil):**
- `Hero3DChart` mobilde **yansıma (MeshReflector) / Bloom / multisampling / yüksek dpr KAPALI** + WebGL bağlam-kaybı remount **TAVANLI** → "ekran kendini yeniliyor / zoom" sorunu KÖKTEN bitti.
- `AmbientScene` mobilde az parçacık + **2. örnek çizilmiyor**; `CinematicBackground` aurora mobilde hafif.
- **Canlı Panel'e geçiş:** ağır katmanlar geçiş bitince mount + `ams-fade-in` (takılma yok).

**ANİMASYON:**
- `DeviceFlowChart` **rekorları KALDIRILDI** (boru tek tüp).
- Valf egzozu artık **GEÇİŞTE fışkırıp İZOLASYONDA sakinleşir** (gerçekçi).
- Regülatör continuity tutarlı (dokunulmadı).

**YERLEŞİM/TEMA:**
- Modallar (`RangeAnalysisModal` / `LiveSetupGuide`) `fixed inset-0 z-[70]` → mobilde **tam ekran**.
- Mobil panel yükseklikleri küçültüldü; `PipeOverlay` mobilde **tek sütun**.
- Gece/gündüz okunmazlığı gideren `force-dark-surface` (4 input + çipler).
- `Tilt3D` mobilde **pasif**; 5 sayfaya **FAB alt boşluğu**; Analiz mod-sayımı **NaN guard**.

**i18n:** 41 eksik anahtar **EN + JA** eklendi.
- **BEKLEYEN (demo-engeli DEĞİL):** tam sayı / tarih / % locale (EN/JA) refactor **ertelendi** (TR demoda görünmez).

---

## ŞU AN NEREDEYIZ (2026-06-03 — STABİLİTE/PERFORMANS TURU + premium giriş + hitap)

**Durum:** Canlı demo üzerinde Mehmet Abi ile hızlı iterasyon; `typecheck`+`build` sıfır hata; push'lı (`4b75a7d`→`fbaaf4f`→`ae82548`→bu turun commit'i).

**Kök neden:** ağır 3D (zemin yansıması+bloom+yüksek dpr) → Windows GPU süreç reseti (TDR) → "görüntü bozuluyor/ürün kayboluyor" + yüksek RAM/yavaşlık.

**Bu turda yapılan:**
- **GPU-reset SELF-HEAL (3 canvas):** Hero3DChart (WebGL) bağlam kaybında Canvas remount (`ctxKey++`); DeviceFlowChart (2D) `contextrestored`→`loadDevice()` (ürün fotosu offscreen'i geri yüklenir); **AmbientScene (2D) `contextlost`+preventDefault** — yoksa context geri yüklenmez → arka plan KALICI boşalır (= "ürünün arka planı hiçbir şey gözükmüyor"). → **manuel refresh GEREKMEZ.**
- **RENDER YÜKÜ AZALTILDI (RAM/yavaşlık):** Hero3DChart dpr 2→1.5, MeshReflector resolution 512→256 + blur yarı, EffectComposer MSAA 4→2, Environment 256→128, Sparkles 70→36; DeviceFlowChart dpr 3→2. ⚠️ **BU DEĞERLERİ GERİ ARTIRMA** → bozulma/RAM geri gelir.
- **Premium/kibar giriş:** "Demo'ya Gir"→**"Giriş Yap"**; "demo/tanıtım" ibareleri kalktı (yazılım demo gibi algılanmasın); giriş resmi büyütüldü + etiket sol-alt; panel selamı isimsiz ama kibar (saatlik). NOT: `DemoWelcome`/`DEMO_OPEN` İÇ isimler (kullanıcı görmez).
- **Debimetre LCD:** rakamlar biraz büyütüldü (`hBudget` 0.50→0.56) + sütunlar açıldı (`cgap` 0.09→0.12, `iconW` küçültüldü).

**BEKLEYEN (kozmetik — görsel iterasyon, Mehmet Abi gözüyle):**
- Ürün kenarındaki ince **beyaz çizgiler** (fringe; `ams-flow.png` — runtime defringe denenebilir).
- Geri-akışta **düz giden zerrecikler** (`DeviceFlowChart` back-flow elbow — "en riskli", dikkatli dokun).

**ROBUSTLUK DENETİMİ:** Tüm animasyon yüzeyleri tarandı → rAF/listener temizliği ✓ (DeviceFlowChart/AmbientScene/useSmoothNumber), Three.js `dispose` ✓ (Hero3DChart), context-loss TÜM canvas'larda ✓. Per-frame `createGradient` GC churn var ama sızıntı değil (bozulma sebebi değildi).

---

## ŞU AN NEREDEYIZ (2026-06-02 — TEK-TIK OFFLINE PAKET + OTOMATİK CİHAZ KEŞFİ + DEMO GİRİŞ + FEEDBACK)

**Durum:** Kod yazıldı, `typecheck` + `build` **SIFIR hata**, tek-tık paket üretildi, sunucu/feedback/ws **yerelde doğrulandı**, Mehmet Abi **ekran onayı verdi** → **commit + push edildi (master)**.
**2. parti (mobil + gece düzeltme) — ✅ push edildi:**
- **Mobil web + PWA AÇIK:** `src/config.ts` `MOBILE_BLOCKED=false` (MobileBlocked korundu, geri kapatılabilir). `bridge/server.mjs` HTTP `0.0.0.0` → aynı Wi-Fi'daki telefon `http://<LAN-IP>:5180` ile açar (LAN IP konsola yazılır). ~~ws köprü hâlâ 127.0.0.1; Mobil=demo kilidi (`connection.ts`) korunur.~~ **⚠️ GÜNCELLENDİ (2026-06-04): ws köprü artık `0.0.0.0`; mobil=demo kilidi KALDIRILDI — bkz. en üstteki 2026-06-04 bölümü.**
- **Gece modu okunabilirlik:** gece `--glass-bg` çok şeffaftı → modal/çekmece metni okunmuyordu. Yeni `.glass-solid` (opak panel, gece+gündüz token) → `LiveSetupGuide` + `FeedbackDrawer`'a uygulandı.
- ⚠️ İlk `0.0.0.0` açılışında Windows Güvenlik Duvarı "node.exe izin" sorabilir (tek seferlik). Mobil 3D perf gerçek cihazda izlenmeli (gerekirse mobile-özel hafifletme).

**Bu oturumda yapılan (Mehmet Abi istekleri):**
1. **Tek-tık OFFLINE paket** → `paket/SMC-AMS-Kopru.zip` (~46 MB): gömülü `runtime/node.exe` (v24.14.0) + hazır `node_modules` (node-opcua/ws) + build app.
   Saha mühendisi **hiçbir şey kurmaz/indirmez** → `Baslat.bat` çift tık → `server.mjs` uygulamayı (`:5180`) + cihaz köprüsünü (`:4841`) çalıştırır + tarayıcıyı açar.
2. **Otomatik cihaz keşfi** (`bridge/opcua-bridge.mjs`): `discoverDevices` (LAN /24 subnet TCP tarama + getEndpoints) + `browseNodeHints` (ölçüm düğümlerini İSİMDEN tahmin). Kılavuzda **"Cihazı Otomatik Bul"** → seç → endpoint+nodeId otomatik dolar (elle giriş yedek).
   ⚠️ **Gerçek AMS cihazı YOK** → keşif KÖR yazıldı (her ihtimali dener, bulamazsa elle). İlk donanımda Halil İbrahim Bey ile ince ayar. `OPCUA_PORTS`/`HINT_PATTERNS` daraltılabilir.
3. **Giriş sadeleşti** (`src/config.ts` `DEMO_OPEN=true`): Halil'e özel personel girişi yerine basit **"Demo'ya Gir"** (DemoWelcome) — herkese tanıtım. Auth kodu **SİLİNMEDİ**; `DEMO_OPEN=false` eski girişi (LoginScreen+auth) aynen geri getirir. Sidebar'da demo iken kullanıcı kartı/Kullanıcılar/Çıkış gizli.
4. **Geri Bildirim** (Teklif programındaki gibi): sağ-alt FAB → çekmece (Hata/Öneri/Mesaj + mesaj + "Önceki Bildirimlerim"). Offline: `localStorage` + en-iyi-çaba `POST /api/feedback` → host'ta `geri-bildirimler.json` toplar. AMS dili (Tailwind/lucide/framer, Antd değil).

**Yerel doğrulama (headless):** `GET /`=200 (app servis), `POST`+`GET /api/feedback` OK + dosya yazıldı, ws `4841` dinliyor, SPA fallback OK, ws `browse` ölü-endpoint → `nodeHints {}` (graceful), gömülü node node-opcua'yı yüklüyor.
**Henüz GÖRSEL doğrulanmadı:** DemoWelcome / feedback drawer / yeni kılavuz tarayıcıda Mehmet Abi'ye gösterilecek.

**Yeni/değişen dosyalar:** `src/config.ts`, `src/components/DemoWelcome.tsx`, `src/components/FeedbackFab.tsx`, `src/components/FeedbackDrawer.tsx`, `src/data/feedback.ts`, `src/components/LiveSetupGuide.tsx` (yeniden), `src/App.tsx`+`Sidebar.tsx` (demo), `bridge/server.mjs` (yeni), `bridge/opcua-bridge.mjs` (keşif), `bridge/baslat.bat`, `bridge/README.md`, `scripts/paketle-kopru.ps1`.
**Paketi yeniden üret:** `scripts/paketle-kopru.ps1` (ağır dosyalar gitignore: `bridge/runtime/`, `node_modules`, `/paket/`, `bridge/geri-bildirimler.json`).

---

## ŞU AN NEREDEYIZ (2026-06-01 — görsel/analiz/perf turu TAMAMLANDI + PUSH edildi)

**Durum:** origin/master ile senkron (push edildi → canlı deploy). typecheck + build sıfır hata.

**Bu oturum(lar)da BİTEN + EKRANLA DOĞRULANAN + PUSH'lı:**
- **Şeffaf ürün render'ları (exa1-hub, regulator-itv/ar, valve-vp, ams-system):** beyaz kenar halesi (matte fringe) temizlendi — "nearest-opaque renk dekontaminasyonu" (alpha/silüet/detay korunarak). `tools/defringe.py`.
- **Ürün render'ları ÇOK NAZIK unsharp:** üzerindeki gerçek baskılı yazı/logo kenarları keskin, hale YOK, orijinallik korundu (Mehmet: "düzeltilmiş gibi durmasın, çocuk oyuncağı olmasın"). Yakın zoom'da doğrulandı.
- **ams-industry40 hero:** sol 49px tam-beyaz şerit → komşu gerçek sahne aynalanarak kapatıldı (soyutlama yok). `tools/fix-heroes.py`.
- **ams-flow (canlı panel):** defringe foto ayak diplerinde renk kaydırdı → **orijinaline geri alındı**. Foto'lara agresif defringe UYGULAMA.
- **Sidebar:** renkli bayraklar kaldırıldı → sade TR/EN/JA; dil+ses+tema EN ALTA taşındı.
- **İmza:** "Crafted … by **Mehmet Bakırdöğen**" (isim `whitespace-nowrap` = asla bölünmez) + BadgeCheck ikonlu "SMC Kayseri · Authorized Regional Partner". Hep İngilizce.
- **Analiz — dönem göstergesi:** üst şeritte zaman aralığı (başlangıç→bitiş) + süre + ölçüm + TOPLAM hava tüketimi (karmaşasız).
- **Analiz — Tarihsel Rapor:** sağ üst "Tarihsel rapor al" butonu → kalıcı geçmişten (demo/canlı) takvimle gün+saat seç → mevcut `RangeAnalysisModal`+`ReportView` (yazdırılabilir + CSV/JSON). 722 ölçümlü demo ile doğrulandı.
- **Alt grafik ADAPTİF auto-range** (Hero3DChart): görünen pencere min/max → büyük değişimde hızlı genişle (geçiş kırpılmaz), sakinde yavaş daral (küçük dalga canlı). Ağır lerp + minSpan.
- **Sekme geçiş "kambur"u:** `App.tsx` page transition transform→opacity (0.22s). Canlı panelin 3 ağır katmanı (WebGL + 2 canvas) artık geçişte takılmıyor.

## ⚠️ DİKKAT — bir sonraki oturum İLK okusun
- **GERÇEK MİMARİ (commit'li/derlenen) ≠ CLAUDE.md'deki "DemoDataSource".** Bu repoda (HEAD):
  - `AnalysisPage({ data }: { data: LiveState })` → `data.log` üzerinde **% slider** + presetler + dönem göstergesi + Tarihsel Rapor butonu (DemoDataSource/`useHistory`/recharts YOK).
  - Geçmiş katmanı: `src/data/history.ts` = `queryHistory`/`seedDemoHistory`/`historyExtent` (localStorage, takvimsel). `RangeAnalysisModal` + `ReportView` MEVCUT ve analiz + kayıtlar sayfasında kullanılıyor.
  - `src/data/datasource.ts` **yok**. `src/data/metrics.ts` → `useMetrics` hook.
- **Oturumlar arası git/Read kararsızlığı yaşandı** (ara commit'ler/Read'ler tutarsız döndü, mükerrer commit oluştu). Kod yazmadan önce dosyayı **python ile dump edip** byte-doğru teyit et; `git log`/`git status` ile gerçek HEAD'i doğrula; tek Read'e güvenme. Bkz [[repo-gercek-mimari]].

## BEKLEYEN (Mehmet kararıyla ERTELENDİ — animasyon turu)
1. **Hava akış animasyonu** fizik-doğru iyileştir (GERÇEK ürün fotosu KALIR, soyut şema YOK) + giriş/çıkışa SMC rekoru. Mehmet "şimdilik animasyonları kenara koyalım" dedi. Bkz [[hava-akis-animasyonu-vizyon]]. (En riskli — "geri dönelim dedirtme".)
2. **Cihazdaki dijital ekran + LED ince ayar** (DeviceFlowChart). Hub LCD + regülatör ekranı/LED gerçek/çalışır; kalan: hub altı durum LED şeridi (SF/BF/PWR/MODE/SIG) statik — istenirse canlandırılır. Animasyon turuyla birlikte.

## Mimari (özet)
- Vite + React + TS + Tailwind v4 + Framer Motion + three/R3F/drei/postprocessing.
- Offline: font gömülü, durum localStorage (`ams_*`). Sayfalar `src/pages/`, bileşenler `src/components/`, veri `src/data`/`src/lib`/`src/hooks`.

## KATİ kurallar (özet — tam liste CLAUDE.md)
- Hitabet: kullanıcıya "Mehmet Abi", ben "CC". Uygulama içi personel "[Soyad] Bey".
- Her edit blok yorum (NE/NEDEN/NASIL/YAN ETKI). Push öncesi `typecheck` + `build` (sıfır hata).
- Birimli her değer + birim; kompakt büyük sayı. Offline; 3D akıcı/yuvarlak; DB/script/deploy CC çalıştırır.
- **Yerel onay sonra push:** değişiklikleri önce localhost:5180'de göster, onay al, sonra push.

## Komutlar
`npm run dev` (5180) · `npm run build` · `npm run typecheck` · `npm run preview`
