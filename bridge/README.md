# SMC AMS — Canlı Cihaz Köprüsü (OPC UA ⇄ WebSocket)

Bu küçük köprü, gerçek SMC AMS cihazından **OPC UA** ile veri okuyup tarayıcıdaki AMS Tanıtım Stüdyosu uygulamasına **WebSocket** ile aktarır. (Tarayıcı doğrudan `opc.tcp` konuşamaz.) Tamamen **yerel** çalışır — kurulum dışında internet gerekmez.

> Hedef kitle: SMC mühendisleri. Geliştirici aracı (VS Code vb.) gerekmez.

## Hızlı başlangıç (önerilen)
1. Bu bilgisayar cihazla **aynı ağda** olsun (kablo/anahtar/switch).
2. **Node.js** kurulu olsun — yoksa [nodejs.org](https://nodejs.org) (LTS) → kur.
3. Bu klasördeki **`baslat.bat`** dosyasına **çift tıklayın**.
   - İlk açılışta gerekli paketleri (`node-opcua`, `ws`) **kendisi** yükler (tek seferlik, internet gerekir).
   - Sonra köprüyü başlatır. Açılan **pencere açık kalsın**.
4. Uygulamada **Ürün Ayarları → Canlı Cihaza Bağlanma Kılavuzu**'ndan cihaz adresini (OPC UA endpoint) ve düğüm kimliklerini girin, **Canlı Moda Geç** deyin.
5. Bağlandığında uygulamadaki durum **Bağlı ✓** olur.

## Manuel başlatma (alternatif)
```bat
cd bridge
npm install node-opcua ws   :: tek seferlik
node opcua-bridge.mjs
```
Köprü `ws://localhost:4841` adresinde dinler. `WebSocket hazır: ws://localhost:4841` satırını görmelisiniz.

## Düğüm kimlikleri (Node IDs)
Cihazın OPC UA düğüm kimlikleri **koddan değil, uygulamadan** (Kılavuz ekranından) gönderilir — kod düzenlemeye gerek yok. UaExpert gibi bir araçla cihazdan okunup girilir.

- Ölçümler: `flow`, `pressure`, `temperature`, `humidity`
- Mod yazma: `mode`
- **Hibrit ayar senkronu** (opsiyonel): `standbyPressure`, `standbyThreshold`, `autoIsolationSec`, `valveMode`
  - Bağlanınca cihazın mevcut ayarları **okunur** (Ürün Ayarları onlarla devam eder); kullanıcı değiştirince cihaza **yazılır**. Cihazda bu düğümler yoksa sessizce atlanır.

## Sorun giderme
- **Bağlanamıyor:** cihaz adresi/düğüm kimliklerini ve aynı ağda olunduğunu kontrol edin; köprü penceresi açık mı?
- **`node bulunamadı`:** Node.js kurulu değil → nodejs.org'dan kurun.
- İstediğiniz an uygulamadan **Demo**'ya dönebilirsiniz (cihaz olmadan da her şey çalışır).
