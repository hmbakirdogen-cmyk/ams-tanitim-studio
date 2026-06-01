# HANDOFF — AMS Tanıtım Stüdyosu

> Bu dosya, yeni Claude Code oturumunun "neredeyim" sorusuna ilk cevabıdır. **Güncel tut.**

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
