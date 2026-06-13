# AMS Cihazı — GERÇEK Referans (fuar fotoları, 2026-06-13) → "birebir" için tek doğruluk

> Mehmet abi'nin fuarda çektiği gerçek cihaz fotolarından. Canlı Panel görselini (DeviceFlowChart)
> bununla BİREBİR yapacağız. Demo veri + canlı veri ikisi de bu görünüme uymalı.

## İki model (fuarda)
- **AMS30A-R03D-SA-KLG** (Remote ünite, **Tip A**): regülatör = **IO-Link / oransal** (dijital **MPa** ekranı, ör. `2.87`).
  Hub LED etiketleri: **ST · SA · PWR · MODE · SIG**. (VOL. DC24V, CLASS2; MAX PRESS 0.8 MPa)
- **AMS30B-R03C-PN-KLG** (**Tip B**): regülatör = **elle ayar (AR)** — üstte gri **ayar düğmesi** + yuvarlak **analog basınç saati** (0–1.0 MPa).
  Hub LED etiketleri: **SF · BF · PWR · MODE · SIG**. (MAX PRESS 0.7 MPa) — **fuarda bağlandığımız cihaz BU.**

## HUB LCD — gerçek yerleşim (4 alan, çoğunlukla KIRMIZI 7-segment)
| Konum | Değer | Birim | Not |
|---|---|---|---|
| Üst-sol | Basınç | **bar** (ör. `2.91`, `5.17`) | hub ana ekran **bar** gösteriyor (regülatör ise MPa) |
| Üst-sağ | Anlık debi | **L/min** | yanında **STD** etiketi + **I / II** çıkış ikonları; `0` iken yeşil olabilir |
| Alt-sol | Sıcaklık | **°C** (ör. `26.8`, `28.6`) | |
| Alt-sağ | TOPLAM debi | **L** (çarpan **x10²**, ör. `1440 x10² L`) | totalizer = cihazın AccumFlow değeri |

## Regülatör ekranı
- **Tip A (IO-Link):** kırmızı dijital, **MPa** (ör. `2.87`). "IO-Link REGULATOR MPa" + COMMUNICATION/POWER LED.
- **Tip B (AR/elle):** dijital YOK → **analog saat** (0–1.0 MPa, ibre) — **ÇALIŞACAK: ibre canlı basınçla döner (statik değil).**

### Analog saat — BİREBİR spec (Mehmet abi net SMC görseli verdi: "Square embedded type pressure gauge")
- **Tip:** SMC "Square embedded type pressure gauge" (Right angle) — KARE açık-gri gövde içine gömülü YUVARLAK kadran.
- **Kadran:** beyaz; ölçek **0 – 1.0 MPa**; rakamlar **0 · 0.2 · 0.4 · 0.6 · 0.8 · 1**; ortada **"MPa"** + altında **"SMC" logo**.
- **Yerleşim/sweep:** 0 = SOL-ALT (~7 yön), saat yönünde yukarı; 0.2 sol-üst, 0.4-0.6 üst, 0.8 sağ-üst, 1 = SAĞ-ALT (~5 yön). Toplam yay ≈ **270° saat yönü**.
- **İbre:** SİYAH, merkez göbekten; **ucu uzun** (ölçüm) + **kısa kuyruk** (karşı yön). İnce, keskin.
- **Tikler:** her rakam arası **majör** + aralarda **minör** çizgiler. Üstte "OPEN", sağ-altta "COVER" yazısı + iki yeşil tırnak (üst).
- **NASIL (çalışan):** prosedürel Canvas çiz (bu otantik SMC görünümünü birebir taklit) → ibre açısı = pressure'ı 0..1.0 MPa → 270° yay'a eşle, canlı veriyle yumuşak (lerp) dön. Statik resim DEĞİL; "yaşayan" saat.

## ÖLÇEK/BİRİM düzeltmesi (kritik)
- Ham `514` → gerçek **5.14 bar = 0.514 MPa**. Yani: **bar = ham÷100**, **MPa = ham÷1000** (aynı fiziksel değer).
  Hub görünümü için **bar** (÷100) doğru; bizim mevcut SCALE MPa (÷1000) — değer doğru, BİRİM hub'da bar olmalı.
- Sıcaklık: ham `286` → **28.6 °C** (÷10). ✓ (Mehmet abi onayladı)
- Toplam: AccumFlow → **L**, gerekiyorsa **x10²** çarpanıyla göster (gerçek hub gibi).

## Anlık durum kanıtı (fuar)
- Hava kesik anı: anlık debi **0 L/min** (yeşil) · toplam **70 L** (kırmızı) · sıcaklık 28.6°C · basınç ~5.17 bar.
- Hub LED'leri gerçekte: bazıları **yeşil**, bazıları **turuncu** yanıyor (ST/SA/SF/BF/PWR/MODE/SIG) → bunları cihazın
  gerçek durum etiketlerine bağlayacağız (Standby/ForcedStandby/DO/Operation...).

## YAPILACAK (birebir + optimize) — çok-açılı analiz workflow'u bunu işliyor
1. Regülatör komponenti **model.type A↔B** ile değişsin (A=IO-Link görseli, B=AR/analog görseli).
2. Hub LCD birebir: bar/L-min/°C/L(x10²) birim+renk+yerleşim; toplam = AccumFlow.
3. LED'ler **gerçek durum etiketlerine** bağlı (simülasyon değil); etiket yoksa Demo davranışı.
4. Sonuna kadar optimize (60fps, sıfır kare-başı tahsis).
