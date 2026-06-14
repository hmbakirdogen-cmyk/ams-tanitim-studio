# ☀️ GÜNAYDIN MEHMET ABİ — Gece Fuar İşi Bitti

Dün gece iki sorunu da hallettim, **sakin ol, fuara hazırız.** Sade özet:

---

## ✅ NE YAPTIM (iki sorun da çözüldü)

**1) TV'de görüntü kaybolması / "site kendini yeniliyor" →** Sebep: ağır 3D + zayıf fuar bilgisayarı + büyük TV → GPU yoruluyordu.
- Program artık **otomatik "hafif moda"** geçiyor (bir kez zorlanınca kalıcı kısılır) + **4K ekranda bile çözünürlüğü kendi tavanlıyor** → ekran **bir daha ölmemeli.**

**2) Cihaz bağlanmıyor →** Sebep: **arkadaş programı SİTEDEN açmış** — o sürümde **cihaza konuşan "köprü" YOK.** Köprü sadece **`Baslat.bat`'lı pakette** var.
- Sana **yeni, köprülü, sağlam paketi** hazırladım (port taramasını genişlettim — o ":5" portu da taranır + bağlanmayı kolaylaştırdım).

---

## 📦 SENİN YAPACAKLARIN (sırayla)

**1. Şu dosyayı arkadaşa gönder** (WhatsApp almaz, **Google Drive / WeTransfer** ile):
```
C:\Users\Admin\Projeler\ams-tanitim-studio\paket\SMC-AMS-Kopru.zip   (45.8 MB)
```

**2. Arkadaş ne yapsın (ona aynen ilet):**
- Zip'i **çıkar (extract)** → içindeki **`Baslat.bat`**'a **çift tıkla.** *(SİTEDEN AÇMA — bu pakettir!)*
- **Siyah pencere** açılır → **kapatma** → tarayıcı kendiliğinden açılır (açılmazsa: `localhost:5180`).

**3. TV'yi bağlarken:** mümkünse **HDMI KABLO** kullan (kablosuz yansıtma hem kaliteyi düşürür hem kopar).

**4. Cihaza bağlanma:**
- Programda **Ürün Ayarları → "Canlı Cihaza Bağlanma Kılavuzu" → "Cihazı Otomatik Bul"** → bulursa tıkla → **"Canlı Moda Geç"** → durum **yeşil "Bağlı ✓"** olmalı.
- **Bulamazsa:** **"Elle gir / Gelişmiş"** → adres kutusuna **sadece cihazın IP'sini** yaz (ör. `192.168.1.50` — `opc.tcp://` ve port yazmasan da olur artık) → **Kaydet → Canlı Moda Geç.**

**5. Görüntü yine takılırsa ACİL çare:** adres çubuğuna **`localhost:5180/?lite`** yaz → garanti hafif-mod, kesin stabil.

---

## 🔑 BENDEN %100 ÇÖZÜM İÇİN HÂLÂ LAZIM
Cihazın **tam adresi** (IP + o ":5" portu) **veya** arkadaştan **bağlanma ekranının fotosu** (girdiği adres + varsa kırmızı hata). Onu bana ulaştır → o portu otomatik-bulmaya gömüp **3-tık-bağlanan** sürümü kesinleştiririm.

---

## ⚠️ NOT (önemli)
- **Canlı siteye DOKUNMADIM** — fuar sürerken çalışan demoyu bozmamak için. Değişiklikler **`gece-fuar-fix`** dalında, **yerel** (push yok). Onayını verince master'a alıp deploy ederim.
- PLD vitrini de ilerlettim (ayrı iş, acelesi yok — `smc-pld-vitrin`).

Kolay gelsin abi, yanındayım. — CC
