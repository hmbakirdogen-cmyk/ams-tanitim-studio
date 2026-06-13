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
## 4) İLGİLİ DOSYALAR
- `bridge/opcua-bridge.mjs` (köprü: bağlantı+ölçek+oto-node+durum+PKI) · `bridge/pki/` (.gitignore, kalıcı cert)
- `src/components/DeviceFlowChart.tsx` (cihaz görseli — A2/A5-A9 burada) · `src/data/{types,liveSource,connection,metrics,model}.ts`
- `src/components/Hero3DChart.tsx` (3D akış grafiği, lite-mod var) · `public/products/{ams-flow,regulator-itv-hd,regulator-ar-hd}.png`
- `CIHAZ-GERCEK-REFERANS.md` (fuar gerçek foto referansı) · `paket/SMC-AMS-Kopru/` (tek-tık paket) · `FUAR-SABAH-NOTU.md`
