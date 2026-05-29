# AMS Tanıtım Stüdyosu

**SMC Hava Yönetim Sistemi (AMS20/30/40/60)** için sinematik, **offline** çalışan canlı tanıtım & demo uygulaması. Saha satış‑destek personelinin müşteride cihazı bağlayıp verileri görkemli 3D grafiklerle göstermesi için tasarlandı. Çekirdek **ürün‑bağımsız** — ileride başka SMC ürünleri için de kullanılabilir.

## Çalıştırma
```bash
npm install
npm run dev        # http://localhost:5180  (telefon: http://<LAN-IP>:5180)
npm run build      # production (fontlar gömülü, offline)
npm run preview
npm run typecheck
```

## Giriş
İlk yönetici: **Halil İbrahim Karakelle** · varsayılan şifre **`smc`** (Profilim'den değiştirilebilir). Yönetici, Kullanıcılar panelinden personel ekleyip detay/şifre tanımlar. Tüm veriler **yerel** (localStorage) — sunucu/internet yok.

## Sayfalar
- **Canlı Panel** — gerçek WebGL 3D çok‑çizgili akan grafik (Debi/Basınç/Sıcaklık/Nem), kendini açıklayan eksenler + canlı okuma paneli + akış süresi sayacı; altta önem‑hiyerarşili mozaik kartlar; mod kontrolü (Normal/Tasarruf/Kesinti) + ses.
- **Sensör Detayları** — sensör başına anlık değer + mini grafik + min/ort/max.
- **Tasarruf Analizi** — yıllık ₺/kWh/CO₂ projeksiyonu; **elektrik fiyatı vb. düzenlenebilir**.
- **Ürün & Teknoloji** — AMS'i tüm yönleriyle anlatan animasyonlu vitrin.
- **Ürün Ayarları** — bekleme basıncı / otomatik kesinti süresi / eşik / valf modu (demo senaryosunu sürer; canlıda OPC UA write) + sensör görünürlüğü.
- **Kayıtlar** — oturum kaydet/sil + CSV/JSON dışa aktar + zaman‑aralığı analiz penceresi.

## Stack
Vite · React · TypeScript · Tailwind v4 · Framer Motion · three + @react-three/fiber + drei + postprocessing (gerçek 3D/bloom) · offline (Inter gömülü).

> Detaylı durum ve sıradaki adımlar: [HANDOFF.md](HANDOFF.md) · Repo kuralları: [CLAUDE.md](CLAUDE.md)
