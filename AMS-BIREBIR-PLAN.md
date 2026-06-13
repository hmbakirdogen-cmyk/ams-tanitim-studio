# AMS — "Cihazla BİREBİR" + Canlı Bağlantı + Mobil — AYRINTILI TODO (kompakta dayanıklı)

> Mehmet abi (2026-06-13): "kompakttan sonra AMS ile ilgili eksik kalmasın." Bu dosya = AMS'in TEK doğruluk listesi.
> Her madde bitince ✅ işaretle. Gerçek cihaz referansı: **`CIHAZ-GERCEK-REFERANS.md`**. Tam analiz (A1-A9 ham):
> `~/.claude/projects/c--Users-Admin-Projeler-konsey/.../tasks/wn844nd8x.output` (çok-açılı sentez).
> Dal: **gece-fuar-fix** (fuar bitti → istenirse master'a merge/push). Köprü: `bridge/opcua-bridge.mjs`.

---
## 0) BUGÜN KÖKTEN ÇÖZÜLENLER (canlı bağlantı) — ✅ tekrar gelmez
- ✅ **Yanlış port (4840→4843):** `parseEndpoint()` her adresi (slash/iki-nokta/portsuz/bozuk `/4843:4840`) temizler → `opc.tcp://IP:PORT`, 4843-önce.
- ✅ **None+admin kimliği:** UaExpert'in kanıtladığı kombinasyon zincirde ilk; şifreli denemeler `OPCUA_TRY_ENCRYPTED=1` arkasında.
- ✅ **Kalıcı sertifika (premature disconnection):** `OPCUACertificateManager(bridge/pki)` + sabit `applicationUri` → cihaz bir kez güvenince kalıcı.
- ✅ **Yanlış sensör isimleri:** bağlanınca oto-browse gerçek düğümleri bulur + siyah pencerede DEĞERİYLE listeler + otomatik kullanır.
- ✅ **Ölçek (mis-scale):** `SCALE` (sıcaklık ÷10, basınç ÷1000) + `OPCUA_SCALE_*` env (paket gerektirmeden ayar).
- ✅ **Tanı:** Türkçe "NEDEN" teşhisi + endpoint/token logu → her hata kendini açıklar ("başka program oturumu tutuyor" dahil).
### ⚠️ Dürüst kalan nüanslar (bizim bug DEĞİL, bilinmeli)
- **Başka OPC UA programı (UaExpert/atvise) cihazın oturumunu tutarsa** bizimki bekler — cihaz sınırı. Artık ekranda net yazar + yer boşalınca otomatik bağlanır.
- **Farklı AMS modeli** ölçeği bir tık şaşarsa → tek `OPCUA_SCALE_*` env / 1 satır (bağlantı+node kendiliğinden oturur).
- **En güncel paket henüz sahada baştan-sona YENİDEN test edilmedi** (Efekan en son `opcua-bridge.mjs`'i kurunca kesinleşir). Bağlantının kendisi kanıtlı (BAGLANDI + veri aktı).

---
## 1) MOBİL TAKİP (aynı Wi-Fi'daki telefon) — ✅ altyapı hazır
- ✅ `MOBILE_BLOCKED=false` (config.ts) — mobil engeli yok.
- ✅ `BRIDGE_URL = ws://${location.hostname}:4841` (connection.ts) — telefon `http://<PC-IP>:5180` açınca PC'nin köprüsüne bağlanır.
- ✅ Köprü `WS_HOST=0.0.0.0` — LAN'a açık. ✅ connection.ts'te mobil=demo KİLİDİ YOK (mobil de Canlı seçebilir).
- ⬜ **"Telefonda aç" yardımcısı (en iyi altyapı dokunuşu):** köprü kendi LAN IP'sini app'e göndersin → app'te **`http://<PC-IP>:5180` + QR kod** göster (IP aramasınlar). (qrcode mini lib ya da inline SVG QR.)

---
## 2) BİREBİR OVERHAUL (DeviceFlowChart cihazla 1:1) — workflow planı A1→A9
**Bitti:**
- ✅ **A1** `src/data/types.ts`: `Reading.totalFlow?` + `Reading.status?{standby,forcedStandby,valveOpen,doOut,operation}` (opsiyonel → demo bozulmaz).
- ✅ **A3** `bridge/opcua-bridge.mjs`: DEFAULT_NODE_IDS'e `accumFlow/standby/forcedStandby/vpDvNo/doOut` + `SCALE.accumFlow` + readOnce 10 düğüm okur → `out.totalFlow` + `out.status` (yoksa göndermez=demo fallback) + browse merged'e accumFlow.
- ✅ **A4** `src/data/liveSource.ts`: `status` + `totalFlow` Reading'e taşınır (yalnız cihaz gönderince).

**Sırada (riski düşük→yüksek):**
- ⬜ **A2 — OPTİMİZASYON** `DeviceFlowChart.tsx` (görsel değişiklik YOK, önce yap → 60fps headroom):
  - Akış(~413-473)/molekül(~502-525)/nem(~562-591) sıcak döngülerinde template-literal `rgb()` string üretimini KALDIR → kare-başı sabit `rgb(r,g,b)` + `ctx.globalAlpha` (≈1000-1500 string/kare → ~0).
  - `isLiteForced()` → lite'ta FLOW/MOLE/PUFF üst sınırları ×0.5 (havuz boyutu sabit, tahsis yok); `dpr=lite?dprBudget(2,1_000_000):min(2,dpr)`.
  - `visibilitychange`: hidden iken `cancelAnimationFrame`+accum kaydet; görününce `last=now()` (dt-clamp sıçrama korur); cleanup'ta listener kaldır.
- ⬜ **A5 — Regülatör görselleri yükle** `DeviceFlowChart.tsx`: `useModel()` import + `modelTypeRef` (RAF yeniden kurulMAZ, `useEffect([])` aynen); effect'te `regA/regB` Image yükle (`products/regulator-itv-hd.png`=A, `...-ar-hd.png`=B), onCtxRestored'da da yükle. (Sadece YÜKLE, çizme → kırılma yok.)
- ⬜ **A6 — Regülatör overlay A↔B** `DeviceFlowChart.tsx` (RİSK: konum Mehmet abi gözüyle): foto basıldıktan sonra (≈satır 380, borudan ÖNCE) swap dikdörtgenini (`REG_SWAP_X=[0.150,0.310]`, `REG_SWAP_Y=[0.30,0.66]` — FOTO-ÖLÇÜM/göz) `clearRect` → seçili tip (`A=regA/B=regB`) contain-fit `drawImage` (ezme yok). Yüklenmediyse clearRect ATLA. **Tip B'de** regülatör dijital LCD (~736-768) + regülatör LED'leri (~629-644, 822-825) çizimini `if(type==='A')` ile atla (B=analog saat, dijital yok). NOT: bağlantı/ayak konumu ürüne göre değişebilir (Mehmet abi onayı → birebir hizalama şart değil).
- ⬜ **A7 — LED'ler GERÇEK BOOL'a** `DeviceFlowChart.tsx` (~774+): `readoutRef.status = reading?.status ?? null`. CANLI=gerçek, DEMO/yoksa=mod-türetimli. MODE dot→standby?amber:forcedStandby?kırmızı:yeşil; SIG→doOut; regülatör POWER + hub PWR→operation (steady, blink yok); Operation(hub üst-orta)→status. **COMM/PORT/BF = haberleşme heartbeat AYNEN** (gerçek paket akışı — ayrı kategori).
- ⬜ **A8 — HUB LCD birebir** `DeviceFlowChart.tsx`: TOTALIZER (~684) = `reading?.totalFlow` (canlı=cihaz sayacı, modulo YOK; demo=mevcut). 2-renk (~135 mainRed) = `status.forcedStandby||status.valveOpen` varsa ondan, yoksa mode. **FOTO-TEYİTLİ (Mehmet abi onayıyla):** basınç birimi gerçek hub'da **bar** (ham÷100), bizde MPa (÷1000) — değer aynı, birim kararı; basınç toFixed(2)+REF '0.20'; toplam **x10²** çarpanı; anlık debi ondalık? (bkz CIHAZ-GERCEK-REFERANS.md). Sabitleri foto teyidi olmadan DEĞİŞTİRME (gerileme riski).
- ⬜ **A9 — Regülatör KIRMIZI LCD = SET basıncı** (anlık hat basıncı değil; hub sol-üstle çakışmasın). Tip A'da göster, Tip B'de gizle (analog saat).

**Bağlantı tipi:** `src/data/connection.ts` `NodeIds` arayüzüne opsiyonel `accumFlow/standby/forcedStandby/vpDvNo/doOut` eklenebilir (tamlık; şart değil — köprü defaults+browse hallediyor).

---
## 3) TEST / DOĞRULAMA (her şey bitince)
- ⬜ `npm run build` (tsc+vite) SIFIR hata + `node --check bridge/opcua-bridge.mjs`.
- ⬜ Demo modu BOZULMADI (cihazsız açılır, LED/LCD eski davranış).
- ⬜ Canlı: gerçek cihazda değerler birebir (basınç/sıcaklık/debi/toplam) + LED'ler gerçek duruma göre + regülatör model A/B doğru.
- ⬜ Telefonda (LAN) canlı takip + (eklenirse) QR ile aç.
- ⬜ Paketi yenile (`paket/SMC-AMS-Kopru.zip` + masaüstü) → Efekan/arkadaşlar "herhangi bir AMS"e bağla-çalıştır.
- ⬜ İstenirse `gece-fuar-fix` → master merge + push (fuar bitti).

---
## 3c) YENİ İSTEKLER (2026-06-13 gece, Mehmet abi) — DERİN TODO
> Bunlar "## 2 birebir"in ÜSTÜNE gelen yeni kapsam. Çok-açılı analiz workflow'u (variant+animasyon) bunlara plan çıkarıyor.

### ✅ Yapıldı (bu oturum)
- ✅ **A5+A6 regülatör A↔B swap** (commit 07b91f1): Tip A risksiz (temel foto), Tip B'de AR görseli bindir + dijital reg LCD/LED gizle. `REG_SWAP_X/Y` tunable. getActiveModel() RAF'ta canlı.

### ⬜ TAM VARIANT (sadece regülatör DEĞİL — parça koduna göre HER komponent)
- Mehmet abi: "tüm resimleri analiz et, tam kodlarıyla ürünü kıyasla." İki gerçek variant:
  **AMS30A-R03D-SA-KLG** (Tip A): IO-Link/oransal regülatör · hub LED **ST/SA**/PWR/MODE/SIG · IO-Link konnektör.
  **AMS30B-R03C-PN-KLG** (Tip B): elle-ayar regülatör (knob+analog saat) · hub LED **SF/BF**/PWR/MODE/SIG · **PROFINET PORT1/PORT2** (M12).
- Değişmesi gerekenler: regülatör ✅ + **hub/haberleşme modülü** (LED etiketleri + konnektör tipi) + olası valf/govde/port. Mimari: analiz önerecek (çok-foto / komponent-overlay katmanı / parametrik LED-konnektör çizimi). getActiveModel()'e bağlı.

### ⬜ ÇALIŞAN ANALOG SAAT (Tip B regülatör)
- Mehmet abi: "analog saat bile çalışsın, net orijinal SMC saati." Spec → **CIHAZ-GERCEK-REFERANS.md → Analog saat**.
- Otantik SMC "square embedded" saatini **prosedürel** çiz (beyaz kadran, 0–1.0 MPa, 0/.2/.4/.6/.8/1, MPa+SMC, ~270° yay) → **ibre canlı basınçla döner** (lerp, statik değil).

### ⬜ HAVA AKIŞ ANİMASYONU — TOP-SEVİYE OVERHAUL
- Mehmet abi: "bu akış animasyonunu sevmiyorum; özellikle **geri dönüş** + **egzozdan çıkış** hareketleri/görselleri çok kötü."
- Hedef: kullanıcının gözüne hitap + **her sensörün karakteristiğini** yansıt (debi→hız/yoğunluk, basınç→sıkışma, sıcaklık→ısı/renk, nem→damla/buğu) + **TÜM verilere TAM SENKRON** + **veri ŞİDDETİNE göre** otomatik ayrışma.
- "En iyi araçlar/yazılımlar çekinmeden kullan" (Mehmet abi) → analiz: ileri Canvas 2D (curl-noise/flow-field) vs WebGL (regl/PixiJS/three points/GPU particles). Offline + 60fps.

### ⬜ TAK-ÇALIŞTIR + TÜM AYARLAR OPTİMİZE (Mehmet abi: "bütün ama bütün ayarlar en optimize, tak çalıştır kıvamı")
- Açan kişi (Japonya) HİÇ uğraşmadan, EN İYİ ayarlarla çalışsın: cihaz oto-bulunur / oto-node / cihaz yoksa zarif Demo (zaten var) · dil seçimi net · sıfır kurulum.
- **Açılış HIZI:** build tek parça 1.48MB (gzip 426KB) → **kod-bölme** (vite manualChunks: react/antd/three/recharts/ag-grid ayrı) → şimşek açılış (PWA offline korunur). [perf audit kesinleştirecek]
- Tüm varsayılanlar "en mantıklı" (model/economy/ekran/performans lite-eşiği) → out-of-the-box premium. Build SIFIR hata/uyarı hedefi (chunk uyarısı kod-bölmeyle de kapanır).

### ⬜ KÜTÜPHANE
- Mehmet abi: "en iyi toolları çekinmeden kullan, **kütüphanemizi genişlet**." Kullanılan her elit araç/teknik → `Projeler/cephanelik/ARAÇLAR.md` (+ proje notu). Compound.

### ⬜ Devam (önceki birebir): A2 optimizasyon · A7 gerçek-LED · A8 hub LCD birebir (bar/x10²) · A9 reg LCD set-basınç · mobil QR/IP · paket yenile · merge/push

## 3d) VARIANT + ANİMASYON ANALİZ SONUCU (workflow w1g4crbfp) — UYGULAMA PLANI
> KARARLAR: (1) Canvas 2D'de KAL (WebGL fuar-PC bağlam-düşüşü riski; ~560 partikül 2D yeter). (2) Yeni `src/lib/flowField.ts` = analitik hız-alanı + curl-noise (sıfır kare-başı alloc). (3) Yeni `src/data/deviceVariants.ts` = dağınık konum sabitlerini TEK variant tablosuna topla.
> KRİTİK BULGU: `ams-flow.png` KARMA — regülatör tarafı Tip A (IO-Link), hub tarafı Tip B (SF/BF + PROFINET PORT1/PORT2). "Base = Tip A" varsayımı hub'da YANLIŞ.
> PARÇA KODU: AMS[boyut][A/B]-[diş+port][C/D]-[PROTOKOL]-[braket]. SA=Standalone/kablosuz (fieldbus YOK, A-coded tek konnektör) · PN=PROFINET (D-coded PORT1/PORT2 çift). TYPE A=ITV oransal(dijital LCD) / B=AR elle(analog saat). Protokol → hub LED etiketleri + konnektör.
> ⚠️ NÜANS (Mehmet abi fuar fotosuyla TEYİT): "A=ST/SA" basit; ST aslında EtherCAT etiketi. SA-variant paneli SF/MS/ST + BF/NS/DIAG taşır. Yanlış donanım terimi yazma.

### UYGULAMA SIRASI (riski düşük→yüksek; göz gerekenler işaretli)
1. ⬜ **deviceVariants.ts omurga** (davranış-koruyan refaktor: literaller→tablo; görsel AYNI). risk orta · göz: hayır → build+karşılaştır.
2. ⬜ **flowField.ts** (saf TS, kütüphanesiz, sıfır-alloc; görsel değiştirmez). risk düşük · göz: hayır.
3. ⬜ **EGZOZ round-jet overhaul** (koni-açılım + mesafeyle hız düşüşü + curl türbülans + fiziksel sönüm + çift-geçiş; sig.pressure çarpanı; renk cS/cP+tempRGB). risk orta · **göz: EVET** (en çok şikâyet edilen → en görünür kazanım).
3b. ⬜ **GERİ DÖNÜŞ sink modeli** (sahte dirsek/ışınlama SİL; valf-ağzı çekiş kuyusu + doğal girdap). risk yüksek · **göz: EVET**.
4. ⬜ **İLERİ AKIŞ şiddet eğrisi** sertleştir + 4-sensör sentezi (debi→hız/sayı, basınç→çap/parlaklık, sıcaklık→renk, nem→doku). risk orta · **göz: EVET**.
5. ⬜ **Çalışan analog saat** (Tip B): regulator-ar-hd.png üstüne prosedürel ibre, açı=pressure/1.0×270°, canlı lerp. risk yüksek · **göz: EVET**.
6. ⬜ **HUB LED etiketleri** variant-bağlı (Tip A=ST/SA, B=SF/BF — fuar fotosuyla teyit) — opak kutu + canvas metin. risk orta · **göz: EVET**.
7. ⬜ **KONNEKTÖR** variant-bağlı (A=tek IO-Link A-coded / B=PROFINET PORT1+PORT2 D-coded; satır 849-851 yorumu yanlış). risk orta · **göz: EVET**.
8. ⬜ **HUB LCD birimi** bar/MPa (hub=bar ham÷100; regülatör=MPa). YALNIZ Mehmet abi onayıyla (deger×10 hatası riski). risk orta · **göz: EVET**.
9. ⬜ **DOĞRULAMA**: tsc 0 + build 0 + Demo=Canlı aynı + A↔B anında + 60fps + lite/fuar-PC bozulmadı.
> KORUNACAK: mevcut Float32Array havuz + fade-rect motion-blur + 'lighter' glow + GPU-reset dayanıklılık + Tip B reg overlay (şu an bayrak KAPALI, doğrulanınca aç). Mehmet abi'nin BEĞENDİĞİ ekran yapısı BOZULMAZ.

## 3e) KOMPAKT-DEVİR NOTU (2026-06-13 — CC'nin kaldığı yer; kompakttan sonra BURADAN devam)
> Dal: **gece-fuar-fix** (fuar bitti, teslim Mehmet abi onayıyla). AMS dev: `npm run dev -- --port 5190` (M3MO, cihazsız=Demo).
> **ARAÇ:** `scripts/shot.mjs` — headless Chrome screenshot (CC kendi gözüyle doğrular). `node scripts/shot.mjs <url> <out.png> "giriş" 1600 1000` → DemoWelcome'a tıklayıp Canlı Panel'i çeker. Read ile gör. ÇOKLU boyutta çek → askeri nizam (üst-üste binme) tara.
> **İLKELER (kalıcı):** ASKERİ NİZAM (hiç üst-üste binme; ekran-görüntüsüyle doğrula) + KALİTE+RAM+JANK (kalite tavan, düşük RAM, sıfır jank; ucuza-elit). Beğenilen ekran yapısını BOZMA; kör değişiklik YOK.

### BU OTURUMDA YAPILANLAR (commit'li, gece-fuar-fix)
- ✅ Bağlantı kökten + kalibrasyon + oto-node + mobil + 3 analiz + dil(ja/tr/en) + ErrorBoundary i18n + Japonca font + SHOWCASE_MODE + caption pill (okunabilirlik) + kod-bölme + flowField.ts.
- ✅ Regülatör molekül **edge-fade** (uçlarda yumuşak belir/sön — "belli çizgide belirip yok olma" çözüldü). İri/Bernoulli denemesi GERİ ALINDI (Mehmet abi orijinali sevdi).
- ⏳ **Görünürlük pası (Mehmet abi EYE-CONFIRM BEKLİYOR, commit 721e09c):** grafik sensör çizgileri tüm-gövde görünür (Hero3DChart kuyruk-alfa 0.06→0.22); CinematicBackground 3D-ızgara belirgin (--grid-line 0.26, zemin 58vh). Mehmet abi "halen göremiyorum" dedi → Canlı Panel YOĞUN (içerik bg'yi örtüyor); muhtemel doğru hedef = grafiğin sensör ÇİZGİLERİ (her renk) daha belirgin + gerçekçi. SONRAKİ: çizgi parlaklığı/genişliği + her sensör renginin netliği (screenshot ile doğrula); gerekirse Mehmet abi'ye 3 seçenek sun.

### AÇIK İNCE-AYARLAR (Mehmet abi gözüyle)
- ⬜ **Regülatör REG_FRAC sınırı** gövdeye tam otursun (animasyon nerede başlıyor/bitiyor = gerçek regülatör gövde kenarları). reg-cands.png ile aday çizgiler çizildi; ölç + REG_FRAC/chokeF ayarla + screenshot.
- ⬜ **Canlı Panel arka plan derinliği** — Mehmet abi net görmek istiyor; sayfa yoğun. Karar: global derinlik mi / sayfaya-özel mi / referans-sayfa mı (sor).
- ⬜ **Grafik sensör çizgileri** "her etiket kendi renginde + görünür + gerçekçi" (devam).

## 4) İLGİLİ DOSYALAR
- `bridge/opcua-bridge.mjs` (köprü: bağlantı+ölçek+oto-node+durum+PKI) · `bridge/pki/` (.gitignore, kalıcı cert)
- `src/components/DeviceFlowChart.tsx` (cihaz görseli — A2/A5-A9 burada) · `src/data/{types,liveSource,connection,metrics,model}.ts`
- `src/components/Hero3DChart.tsx` (3D akış grafiği, lite-mod var) · `public/products/{ams-flow,regulator-itv-hd,regulator-ar-hd}.png`
- `CIHAZ-GERCEK-REFERANS.md` (fuar gerçek foto referansı) · `paket/SMC-AMS-Kopru/` (tek-tık paket) · `FUAR-SABAH-NOTU.md`
