# HANDOFF — AMS Tanıtım Stüdyosu

> Bu dosya, yeni Claude Code oturumunun "neredeyim" sorusuna ilk cevabıdır. **Güncel tut.**

## ŞU AN NEREDEYIZ (2026-06-20 — BAŞTAN AŞAĞI TEMİZLİK + PERF SERTLEŞTİRME) ⭐⭐⭐ EN GÜNCEL
> Mehmet abi: "ams'i baştan aşağı kontrol et, en ufak hatayı söyle, tüm yamaları en baştan yapılmış gibi düzenle, hiçbir yerde kasma/yavaşlama/RAM yememe olmasın, tertemiz olsun. Japonya vitrinim." YAPILDI (tsc 0 + build 0 + görsel BİREBİR + RAM 17MB stabil + 3-ajanlı düşmanca review). Dal `gece-fuar-fix`, **push YOK** (Mehmet abi onayıyla).
- **PERF (davranış BİREBİR):** DeviceFlowChart `document.hidden` freni — totalizer/sinyal matematiğinin ARDINA, çizimden önce (ağır canvas ~520 parçacık gizliyken boşa dönmez; review "doğru yerde" dedi). LiveChart2D + MetricDetailModal kare-başı `new Array(N)` → KALICI `ptsBuf` tampon (GC churn yok). LiveChart2D shadowBlur 4K'da hafif (`dpr>=1.75?5:9`; normal ekranda 9 = BİREBİR). [MetricDetailModal'ın hidden-guard'ı review sonrası KALDIRILDI — transient pencerede smoothing'i duraksatıyordu, faydası minikti.]
- **BUG (tek gerçek):** LivePage karşılama "Bey" honorifiki `t()` ile sarıldı (EN→''/JA→'様'; eskiden Japonca/İngilizce ekranda "Bey" sızıyordu).
- **ÖLÜ KOD SÖKÜLDÜ (~1.610 satır net):** 4 ölü dosya (Hero3DChart, AmbientScene, ModeStrip, deviceVariants) + **three.js/R3F/postprocessing = 71 npm paketi** (uygulama 2D Canvas'a geçmişti, 3D motoru tamamen ölüydü → RAM/boyut kazancı). 5 ölü getter, 6 kullanılmayan import, 4 ölü CSS bloğu. **Önemli:** canlı grafikler artık SAF Canvas 2D; WebGL yok → eski "TV'de görüntü kayboluyor" (context-loss) riski KÖKTEN gitti.
- **SERTLEŞTİRME:** tsconfig `noUnusedLocals`+`noUnusedParameters`=true (çöp birikimini build yakalar); vite manualChunks sadeleşti (vendor-react+motion; ölü three/antd/charts/grid/excel satırları); CLAUDE.md "3D" notu → 2D Canvas gerçeğine çekildi.
- **DOĞRULAMA:** 4 ekran görüntüsü öncesi/sonrası BİREBİR + 4K (3840×2160) render temiz; RAM 52sn boyunca 17MB sabit (GC sonrası +0.20MB = gürültü, sızıntı YOK); 3-ajanlı düşmanca review (dangling-ref/build TEMİZ, davranış ajanının 1 bulgusu düzeltildi).
- **AÇIK — Mehmet abi "son gaz devam" CILA TURU (sırayla):** (1) kart sayıları tatlı/momentumlu hareket, (2) MPa/bar sekmesi premium, (3) 4 kart yükseklik + kendi eksenli mini grafik, (4) cihaz bağlantı "kabloyu tak-bağlan" kolaylığı, (5) AMS görseli fringe + kolaj kesme hataları. **HeroKPI truncate denemesi** (commitlenmemiş, "KISALTMA YOK" notuyla çelişiyor) → kart cila turunda Mehmet abi'nin gözüyle çözülecek. **Paket en sonda, hepsi bitince tek seferde** tazelenecek (masaüstündeki zip 19 Haz'dan eski).

## ŞU AN NEREDEYIZ (2026-06-19 — CANLI UI MARATONU + bar/MPa + EFEKAN PAKETİ) ⭐⭐ ÖNCEKİ
> Mehmet abi ile uzun canlı oturum (M3MO). HER değişiklik **tsc 0 + build 0 + headless screenshot** ile doğrulandı. Dal `gece-fuar-fix` (commit+push edildi). Paket masaüstünde.
- **Canlı Panel grafiği:** ısı+nem KALDIRILDI → yalnız **Hava Tüketimi + Basınç**, 2 eşit AYRI şerit. Skala **yuvarlak/sabit** (auto-range yerine): Hava Tük. 0…flowMax (ürün max debisi, taşma yok), Basınç **MPa 0…0,6 / bar 0…6**. Rakamlar ince (bold değil) + çizgide ortalı; şerit başlığı (ad+birim); gutter ferah (PAD 60, ChartOverlay eşli). Zaman ekseni saat + altında **göreli süre (60sn+ = dk+sn)**; **10 dk** penceresi eklendi. Uç rozetleri premium pill (glow+cam+bullet+birim).
- **Arka planlar sade:** panel-içi 60fps AmbientScene KALDIRILDI. Cihaz arka planı = DeviceFlowChart İÇİNDE statik **perspektif space ızgarası** (scrim üstü/cihaz altı; düz kare değil).
- **Sağ panel hiyerarşi:** Tasarruf (HeroKPI küçük) > Hava Tük. (sm+toplam) > Basınç (sm) > Sıcaklık/Nem (xs büyütüldü, veri hep görünür).
- **Akış/molekül:** hava debiyle orantılı, nem azınlık, **geri-akışta hava belirgin** ("sadece nem" düzeldi); egzoz dumanı **miktar değişkenliği** (şiddet+nabız).
- **Detay penceresi (MetricDetailModal):** yağ-gibi açılış; grafik **akıcı (sabit-N + lerp)**; ortalama çizgisi, kesik zaman çizgileri, birimli baloncuk, derinlik arka plan.
- **Geçmiş Analizi:** grafikler **nice auto-range** (sabit ölçek tepe-kırpma düzeldi). **Sparkline üst/alt PAY (PADV=7)** → rapor/analiz/kart grafik tepesi ARTIK KIRPILMAZ.
- **bar/MPa (YENİ):** `data/pressureUnit.ts` merkezi anahtar → metrics.ts pressure metriği birime göre (get×10/birim/ondalık/ölçek) → TÜM basınç gösterimleri otomatik uyar. Ufak **MPa|bar toggle** (`PressureUnitToggle.tsx`) basınç kartlarında + grafikte. Float-yuvarlama bug (0,8×0,75→0,8) **epsilon** ile düzeldi (niceAxis).
- **Tip-B (elle-ayar) görünümü KOMPLE GİZLENDİ** (`SHOW_TYPE_B_DEVICE_VIEW=false`): optimize değil; Tip-B seçilse de çizim temiz Tip-A + dijital LCD (model/veri yerinde). **AR montajı SONRA.**
- **Efekan düzeltmesi:** OPC UA debimetre düğümü **PF34→PF3A** (accumFlow/doOut) — "toplam harcanan hava" gelmiyordu, düzeldi (opcua-bridge.mjs + types.ts).
- **Veri denetimi (ajan):** akış tutarlı (tek reading/totalizer). Not: model↔economy.baselineFlow senkronu AMS40A dışında elle (düşük risk).
- **Paket:** `paket/SMC-AMS-Tanitim.zip` (~46MB, gömülü node+bridge+app) + **masaüstüne kopyalandı**. GitHub Release adımı ATLANDI (Mehmet abi WeTransfer/WhatsApp ile gönderir).
- **Grafik SEKMESİ (YENİ):** Canlı Panel grafiğinde **Hava & Basınç ↔ Sıcaklık & Nem** sekmesi (aynı görünüm mantığı; LiveChart2D `groups` prop + ChartOverlay `tabs`). bar/MPa toggle YALNIZ basınç sekmesinde. Detay penceresi **ortalama çizgisi de yağ-gibi (lerp)**.
- **CİHAZ KONTROL (YENİ — cihaza OPC UA WRITE):** Ana ekran başlık sağında **3 KARE toggle** — TR "Tasarrufa Al / Zorunlu Tasarruf / Havayı Kes" · EN "Standby Input / Force Standby / Isolation" · JA "スタンバイ入力 / 強制スタンバイ / アイソレーション" (AÇIK/KAPALI·ON/OFF·オン/オフ). Tıkla → köprü → cihaza **BOOLEAN OPC UA write**. Yol: `DeviceCommands.tsx` + bridge `command` mesajı (`session.write` Boolean) + `liveSource/demoSource.sendCommand` + `useLiveReadings.sendCommand` + types `CommandKey` + connection `cmdStandby/cmdForceStandby/cmdIsolation` düğümleri. Durum CİHAZDAN (`reading.status`) yanar. **ModeStrip (Normal/Tasarruf/Kesinti) KALDIRILDI** (komutlarla örtüşüyordu; Normal = üçü kapalı; mod HeroKPI'da görünür) — `ModeStrip.tsx` artık DEAD (silinebilir). Komut düğümleri **VARSAYILAN** (AMS30_Standby/ForcedStandBy/Isolation) → cihazda test edip koddan/Ayar'dan netleştirilecek (PF3A gibi). shot.mjs `SHOT_THEME` (gündüz/gece testi) de eklendi.
- **AÇIK (sonra):** Tip-B AR regülatör montaj optimizasyonu · model↔economy senkron sağlamlaştırma · gerçek cihaz OPC UA testi (komut düğüm adları onayı) · Kurulum Kılavuzu'na komut düğümü 3 alanı · ModeStrip.tsx dead dosya temizliği · shot.mjs `SHOT_CLICK2` (2. tık).

## ŞU AN NEREDEYIZ (2026-06-15 — EFEKAN BEY PAKETİ: temiz program + Tip-B gizli) ⭐⭐ ÖNCEKİ
> Mehmet abi: "AMS'yi her yönüyle temiz tamamla, Efekan Bey'e yeni paket göndereyim." YAPILDI:
> - **Tip-B canlı panel görünümü GİZLENDİ** (`SHOW_TYPE_B_DEVICE_VIEW=false` + `dType`) → cihaz çizimi hep Tip-A (eski temiz); model/veri/analiz Tip-B YERİNDE.
> - Kapsamlı 5-cephe denetim + **ModeStrip dar-ekran fix** + bozuk kod temizliği (yok lint script + ölü `'olmalı:'` çeviri) + **~26MB çöp** + **circular chunk fix** (vite.config).
> - `_smc_certgen.txt` (SMC EXA1 dok.) konsey'den AMS köküne taşındı.
> - **YEREL paket üretildi:** `paket/SMC-AMS-Kopru.zip` (45.8MB, sürüm `99e4e4f`) — **bridge dahil** (a6990dc, Efekan'dakiyle birebir), GitHub yayını YOK (Mehmet abi WeTransfer/WhatsApp ile gönderecek). `paketle-kopru.ps1` GitHub Release YAPIYOR → otonom çalıştırma YOK; yerel adımlar elle yapıldı.
> - Commit'ler (dal `gece-fuar-fix`, **push YOK**): `99e4e4f` Tip-B gizle, `f07f6ab` vite circular, `10781d1` toparlama.
> - **EFEKAN bağlamı (WhatsApp):** Efekan'a 13 Haz sabahı WeTransfer tam zip + öğle bridge tek-dosya gönderilmişti (cihaz bağlantı bridge'le çözüldü). Yeni paket = o tarihten bu yana TÜM UI iyileştirmeleri + güncel bridge içeride → tek paketle hepsi.
>
> **⏳ AÇIK İŞ — SİYAH PENCERE GİZLEME (Mehmet abi 2026-06-15 onaylı, SONRAKİ sürüm):** `Baslat.bat` node motorunu ARKA PLANDA görünmez
>   çalıştırsın (VBS/gizli launcher) + **"AMS'yi Kapat" kısayolu** (motor düzgün dursun) + teşhis logları **dosyaya** (şu an siyah pencerede;
>   fuarda NEDEN mesajları işe yaradı, kaybetme). Mehmet abi: "bu paket böyle gitsin (siyah pencere kalsın, çalışıyor), sonra temizle." → şu anki pakette BİLİNÇLİ bırakıldı.
> **⏳ AÇIK (Mehmet abi gözü/cihazı gerek):** kolaj ana görsel (`ams-system-hd.png` — gerçek SMC ünite görseli), Tip-B montaj ince ayar (K3 hazır, foto gelince `SHOW_TYPE_B_DEVICE_VIEW=true`), OPC UA gerçek cihaz testi.

## ŞU AN NEREDEYIZ (2026-06-14 — TİP-B MONTAJ + SAAT + KOLAJ; Mehmet abi ile canlı) ⭐⭐ ÖNCEKİ
> **Bağlam:** Mehmet abi "AMS'yi HER YÖNÜYLE kusursuz tamamlayalım — Turgay Bey Japonya'ya gönderebilir" dedi. İş Konsey
> penceresinde başladı; o pencere AMS geçmişini taşımadığı için Mehmet abi haklı olarak "gerçek CC değilsin / unutmuşsun"
> dedi → AMS **kendi penceresine** taşındı. **Bu HANDOFF'u oku, Mehmet abi'yi TANIYARAK devam et (yabancı karşılama YOK).**

**ÇÖZÜLDÜ (bu oturum, ekran kanıtlı):**
- 🕐 **Tip-B "havada saat" çözüldü.** Kök sebep: AR görseli (`regulator-ar-hd.png`) ZATEN kendi ön manometresini içeriyor;
  önceki (Konsey penceresi) oturum bunun ÜSTÜNE ayrı bir `drawAnalogGauge` daha çizmiş (`DEVICE_B_GAUGE_ENABLED=true`,
  commitlenmemiş) → çift saat, biri havada. Mehmet abi'nin "3 ürün üst üste / bu ne?" dediği buydu. →
  **`DEVICE_B_GAUGE_ENABLED=false`** (DeviceFlowChart.tsx ~75) + yorum; saat gitti, doğrulandı. typecheck 0. (commitlenmemiş)

**MEHMET ABİ'NİN MONTAJ TARİFİ (KRİTİK — aynen uygula):**
- *"B'yi A'nın üstüne GİYDİRME. Oransal regülatörü KOMPLE SÖK, yerine elle-ayar regülatörü (AR) ÖLÇEKLERİNİ ayarlayarak
  MONTE ET."* = gerçek parça değişimi (bindirme değil).
- AR = `regulator-ar-hd.png` (ürün özelliklerinde de var — Mehmet abi: "AR resmini sen bulup getirmiştin"); KENDİ ön
  saatini (SMC manometre 0-1 MPa) içerir → ayrı saate gerek yok. Mehmet abi o saatin "güzel fotosu"nu verdi (kare bezel,
  yeşil işaret, OPEN/COVER) ama diske düşmedi (panodan); `drawAnalogGauge` zaten birebir çizimi. Gerekirse Mehmet abi public/products'a sürükler.

**MEHMET ABİ'NİN TEŞHİSİ (görsel kalite — çözülecek):**
- `ams-system-hd.png` + canlı panel cihazı = KÖTÜ KOLAJ (katman üstüne katman, kesme hataları): sol regülatör+altındaki
  "I/O Link T-REGULATOR" modül kesik/ayrı; beyaz braketler düzensiz üst üste; orta-alt Hub gövdeye saplanmış; sağ valf
  konnektörü yarım. Tek döküm ürün hissi yok. Temel görsel kusurlu + üstüne kopya-oturum yaması.

**AÇIK İŞ (sıradaki — Mehmet abi'nin GÖZÜYLE, iteratif, her adımı `code <png>` ile VS Code'da GÖSTER):**
1. AR'yi oransal yerine TAM oturt: ITV mask temiz (`REG_B_MASK_X/Y`) + AR ölçek/konum (`REG_B_CX/TOP/W`) — DeviceFlowChart.tsx ~465-482.
   - **CANLI GÖZLEM (2026-06-14, Mehmet abi tarayıcıda Tip-B):** Şu an AR oransal'ın YERİNE geçmiyor → sol-alta EKSTRA blok gibi biniyor, oransal hâlâ görünür (maske `REG_B_MASK_X=[0.12,0.30]/Y=[0.395,0.615]` boşa düşüyor, oransal'ı bulmuyor). AR **çok büyük** (`REG_B_W=0.42`). Mevcut değerler: `REG_B_CX=0.225, REG_B_TOP=0.370, REG_B_W=0.42`; oransal foto bölgesi `REG_FRAC=[0.15,0.33]` (merkez 0.24), oransal LCD `REG_DISP=[0.211,0.4467,...]`. → **FOTO-ÖLÇÜMLE** (tools/_diag) oransal'ın gerçek bbox'ını bul, maskeyi oraya tam oturt + AR'yi o yere doğru ölçekte (W muhtemelen ~0.18-0.22) koy. Kör tahmin DEĞİL — Mehmet abi gözüyle, ekran kanıtlı, Japonya kalitesi.
   - **🔩 KRİTİK ÜRÜN BİLGİSİ (Mehmet abi 2026-06-14):** Montaj AYAKLARI + BRAKETLER (beyaz delikli plakalar) modüllerden AYRI PARÇALAR. Maske/parça-değişimi bunları **ÖRTMEZ/SİLMEZ** — sadece regülatör GÖVDESİ değişir (oransal→AR); braketler ve montaj ayakları YERİNDE KALIR. Maskeyi yalnız gövde dikdörtgenine sınırla, braketlere taşırma.
2. AR ön saatini büyük/net göster: `drawAnalogGauge`'u AR manometre yerine doğru `GAUGE_B_POS` ile oturt → sonra enable=true (AR'nin kendi küçük saatiyle çakışmasın).
3. Temel kolaj görselin (ams-system/ams-flow) kesme/katman hatalarını düzelt (en zor — gerçek/temiz birleştirme).
- Araç: `scripts/shot.mjs` (`SHOT_MODEL=AMS40B`=Tip B), kırp+zoom PowerShell System.Drawing. dev: `npm run dev -- --port 5190` (Konsey penceresinden başlatılmıştı; port çakışırsa kapat/değiştir).

## ŞU AN NEREDEYIZ (2026-06-13 — JAPONYA TESLİM HAZIRLIĞI + AKIŞ OVERHAUL maratonu)
**Bağlam:** Turgay Bey "bu programı SMC Japonya'ya gönderin" dedi → kusursuz olmalı. Dal **`gece-fuar-fix`** (canlıya PUSH YOK). Dev: `npm run dev -- --port 5190` (M3MO, cihazsız=Demo). Tüm iş Mehmet abi ile **canlı, gözüyle, iteratif** yapıldı; her görsel ekran-görüntüsüyle doğrulandı.

**BİTTİ ve COMMIT'Lİ (bu maraton):**
- 🎬 **Cihaz akışı OVERHAUL** (`DeviceFlowChart.tsx`): egzoz gerçek **round-jet** (genişleyen koni, ağız nokta-parlaması yok); geri-dönüş **dar-radüs çeyrek-elbow** valf ekseninde (hava boruda yatay gelir, valf ekseninde döner, eksen boyunca egzoza iner — eski sahte dirsek+ışınlama + "düşey çizgiler" + "saçma" GİTTİ); geliş-gidiş **çarpışma** (supply valf yüzünde yumuşak birikir + basınç parıltısı); **nem azaltıldı** (hava baskın). Egzoz ekseni 0.775 (valf "mavi düğme" düşey ekseni); halka da o eksende. Mehmet abi: **"tamam"**. Sıfır kare-başı tahsis.
- 🔧 **Regülatör REG_FRAC gövdeye ortalı** `[0.15,0.33]` (Mehmet abi kırmızı-çizgi referansı + canlı ince-ayar "merkez 0.24 tam") → molekül/orifis/venturi/halka gövde merkezinde.
- 🇯🇵 **Japonya i18n** (`i18n/index.tsx` + 8 bileşen): 12 görünür Türkçe kalıntı `t()` ile sarıldı + 7 yeni EN/JA anahtar (3-ajan workflow denetimi). 'Bey'→EN:''/JA:'様'. **JA modda GÖRSEL doğrulandı** (welcome + Canlı Panel Japonca render, layout temiz).
- 🖥️ **Askeri nizam TAM:** tüm sayfalar **narrow(900)+wide(1120/1280)** TEMİZ. Dar-pencere grafik çakışması düzeltildi (`ChartOverlay`: uzun açıklama + dikey 'Seviye' etiketi yalnız lg+ + nowrap). **DERS: nizamı SADECE geniş değil, NARROW/stacked'te de kontrol et.**
- 🔧 **Cihaz birebir-DOĞRULAMA:** temel foto = **AMS40A-R04C-PN-MLG** (Tip A, PROFINET) = varsayılan model AMS40A → **birebir uyuşuyor** (varsayılan/teslim görünümü gerçek üniteyle aynı). `deviceVariants.ts` omurgası kuruldu.
- ⏱️ **Tip B çalışan analog saat** (`drawAnalogGauge`, 270° SMC, iğne canlı basınçla) HAZIR ama **`DEVICE_B_GAUGE_ENABLED=false` (guard'lı)** — temel foto Tip A olduğundan saat "havada" duruyor (Mehmet abi "bu ne?"). Guard kapalıyken Tip B de dijital LCD gösterir (bilinen-iyi, tuhaf görüntü YOK). Oransal (Tip A) DOKUNULMADI.

**AÇIK İŞLER (Mehmet abi girdisi/son adım):**
1. **Tip-B analog saat AÇ:** Mehmet abi **Tip-B (elle-ayar, analog saatli) AMS fotoğrafı** atınca → `GAUGE_B_POS` ([x,y,r]) gözle oturt + `DEVICE_B_GAUGE_ENABLED=true`. Kod hazır.
2. **Para birimi (₺→¥ JPY?):** Japonya ¥ ister; offline kur sabit mi/ayarlanabilir mi → **Mehmet abi yaklaşımı seçecek** (finansal varsayım, onun kararı).
3. **Offline paket yenile:** `scripts/paketle-kopru.ps1` (build → `paket/SMC-AMS-Kopru/app` → zip). **Son adım** (tüm görseller kilitlenince, KAPANIŞ).
4. **PLD vitrin gerçeklik pas 2** (ayrı).

**ARAÇLAR (CC kendi gözüyle doğrular):** `scripts/shot.mjs` (+ `SHOT_LANG=ja-JP` dil, `SHOT_MODEL=AMS40B` variant), `shot-frames.mjs` (çok-kare, hareket/izolasyon), `shot-pages.mjs` (çok-sayfa nav). Hepsi headless Chrome CDP, kütüphanesiz. Kırpma+zoom: PowerShell System.Drawing.

**İLKE (acı derslerle):** Asla kırık/tuhaf görüntü → doğrulanmamış görsel **guard'lı** (REG_SWAP_ENABLED / DEVICE_B_GAUGE_ENABLED = false). Her görsel **ekran-görüntüsüyle** doğrula. RAM-safe (sıfır kare-başı tahsis, sabit havuz). Mehmet abi'ye az soru — **sen karar ver, yap, kanıt göster.**

---

## ŞU AN NEREDEYIZ (2026-06-13 gece — FUAR SAHA: TV stabilite + cihaz bağlantı)
**Bağlam:** SMC uluslararası fuar standında AMS yazılımı büyük ekranda + GERÇEK AMS donanımı (foto var). İki saha sorunu:
(1) TV'de görüntü bir süre sonra kayboluyor / "site kendini yeniliyor" → zayıf fuar-PC + büyük/4K TV → WebGL GPU context-loss.
(2) Cihaz bağlanmıyor → arkadaş uygulamayı **SİTEDEN (PWA)** açmış → köprü yok; köprü YALNIZ `Baslat.bat` paketinde.

**Yapıldı (otonom gece — `gece-fuar-fix` dalı, canlıya PUSH YOK / fuar sürüyor):**
- **TV stabilite** (`Hero3DChart.tsx` + `lib/device.ts`): otomatik HAFİF-MOD (context-loss'ta kalıcı `markLite()`) + `isLiteForced()` (`?lite/?safe/?kiosk` URL veya `localStorage ams_lite`) + `dprBudget()` piksel-bütçesi (4K'da render çözünürlüğü tavanlı). Ağır yol (reflector/bloom/yüksek dpr) artık yalnız güçlü PC'de; zayıf PC'de kendini kısar → "yenilenme/kaybolma" kökten biter.
- **Cihaz bağlantı** (`bridge/opcua-bridge.mjs`): `OPCUA_PORTS` genişledi (5xxx dahil — saha ":5" portu yakalansın), OPC UA güvenlik **None/anonim** (Sign&Encrypt el-sıkışma takılmasın), elle giriş **foolproof** (bare IP → `opc.tcp://IP:4840`).
- **Paket** yeniden üretildi + DOĞRULANDI: `paket/SMC-AMS-Kopru.zip` (45.8MB; köprü/server sözdizimi OK, node-opcua importları geçerli, gömülü node v24). typecheck + build **SIFIR hata**.

**Mehmet abi'ye:** kökteki **`FUAR-SABAH-NOTU.md`** → arkadaşa zip'i gönder + `Baslat.bat` (siteden DEĞİL) + HDMI kablo + "Cihazı Otomatik Bul". **Hâlâ lazım:** cihazın IP / ":5" portu veya bağlanma ekranı fotosu → 3-tık-bağlanan sürüm kesinleşir.

---

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
