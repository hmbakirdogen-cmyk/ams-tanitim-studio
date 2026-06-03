# SMC AMS — Tek-Tık Tanıtım Paketi (gömülü Node + cihaz köprüsü)

Bu klasör, saha mühendisinin **hiçbir şey kurmadan** SMC AMS Tanıtım Stüdyosu'nu çalıştırması için
gereken her şeyi içerir: gömülü Node çalışma zamanı, offline uygulama ve gerçek cihaz köprüsü.

> Hedef kitle: SMC mühendisleri. Geliştirici aracı (VS Code, Node kurulumu vb.) **gerekmez**.

## Kullanım (tek tık)
1. **`Baslat.bat`** dosyasına **çift tıklayın**.
2. Birkaç saniye içinde tarayıcı **otomatik açılır** (`http://localhost:5180`).
3. Açılan **siyah pencereyi KAPATMAYIN** — kapatırsanız uygulama ve canlı bağlantı durur.

Kurulum yok, internet yok. Node `runtime\node.exe` olarak **gömülüdür**; paketler `node_modules\` içinde hazırdır.

## Gerçek cihaza bağlanma (otomatik bulma)
1. Cihazı bu bilgisayarla **aynı ağa** bağlayın (Ethernet kablosu / switch).
2. Uygulamada **Ürün Ayarları → Canlı Cihaza Bağlanma Kılavuzu** → **“Cihazı Otomatik Bul”**.
   - Köprü ağı tarar, OPC UA cihazını bulur; tıklayınca **adres + sensör kimlikleri kendiliğinden dolar**.
   - Bulamazsa **“Elle gir / Gelişmiş”** ile OPC UA endpoint ve düğüm kimliklerini elle girebilirsiniz.
3. **“Canlı Moda Geç”** → durum **Bağlı ✓** olur. İstediğiniz an **Demo**'ya dönebilirsiniz.

## İçerik
| Dosya/Klasör | Ne işe yarar |
|---|---|
| `Baslat.bat` | Tek-tık başlatıcı (gömülü Node ile `server.mjs`'i çalıştırır) |
| `runtime\node.exe` | Gömülü Node (kurulum gerektirmez) |
| `server.mjs` | Uygulamayı yerelden servis eder + cihaz köprüsü + tarayıcıyı açar |
| `opcua-bridge.mjs` | OPC UA ⇄ WebSocket köprü + otomatik cihaz keşfi (`discoverDevices`/`browseNodeHints`) |
| `node_modules\` | `node-opcua` + `ws` (offline, hazır) |
| `app\` | Build edilmiş tanıtım uygulaması (offline) |
| `geri-bildirimler.json` | Kullanıcı geri bildirimleri burada **toplanır** (çalışınca oluşur) |

## Teknik notlar
- WebSocket köprüsü yalnız `127.0.0.1:4841` dinler (ağdan yetkisiz erişim yok). Uygulama: `127.0.0.1:5180`.
- Düğüm kimlikleri **koddan değil uygulamadan** gelir (Kılavuz ekranı). Gerekirse `opcua-bridge.mjs` içindeki
  `OPCUA_PORTS` / `HINT_PATTERNS` gerçek cihaz özelliğine göre daraltılabilir.
- Paketi yeniden üretmek için (geliştirici makinesinde): `scripts/paketle-kopru.ps1`.

## Sorun giderme
- **Tarayıcı açılmadı:** elle `http://localhost:5180` adresine gidin.
- **Cihaz bulunamıyor:** cihazın açık ve **aynı ağda** olduğundan emin olun; kabloyu kontrol edin; tekrar tarayın.
- Cihaz olmadan da **Demo** modunda her şey çalışır.
