# HANDOFF — AMS Tanıtım Stüdyosu

> Bu dosya, yeni Claude Code oturumunun "neredeyim" sorusuna ilk cevabıdır. **Güncel tut.**

## ŞU AN NEREDEYIZ (2026-06-01, gece/sabah oturumu)

**Son commit:** `8f3e21a` — fix(gorsel+panel): ürün render beyaz-kenar temizliği + hero sol beyaz şerit + dil/ses/tema sidebar altına + imza.

**Bu oturumda BİTEN + DOĞRULANAN (ekran görüntüsüyle teyitli, commit'li):**
- **Şeffaf ürün render'ları (exa1-hub, regulator-itv/ar, valve-vp, ams-system):** beyaz kenar halesi (matte fringe) temizlendi — "nearest-opaque renk dekontaminasyonu" (alpha/silüet/detay korunarak). `tools/defringe.py`.
- **ams-industry40 hero:** sol 49px tam-beyaz şerit → komşu gerçek sahne aynalanarak kapatıldı (soyutlama yok). `tools/fix-heroes.py`.
- **ams-flow (canlı panel):** defringe foto ayak diplerinde renk kaydırdı → **orijinaline geri alındı** (regresyon önlendi). Foto'lara agresif defringe UYGULAMA.
- **Sidebar:** renkli bayraklar kaldırıldı → sade TR/EN/JA; dil+ses+tema EN ALTA taşındı.
- **İmza:** "Crafted … by **Mehmet Bakırdöğen**" (isim `whitespace-nowrap` = asla bölünmez) + BadgeCheck ikonlu "SMC Kayseri · Authorized Regional Partner" (geniş-aralıklı caps kaldırıldı). Hep İngilizce.

## ⚠️ DİKKAT — bir sonraki oturum İLK okusun
- **GERÇEK MİMARİ (commit'li/derlenen) ≠ CLAUDE.md'deki "DemoDataSource".** Bu repoda (HEAD):
  - `AnalysisPage({ data }: { data: LiveState })` → `data.log` üzerinde **% slider** + presetler (DemoDataSource/`useHistory`/recharts YOK).
  - Geçmiş katmanı: `src/data/history.ts` = `queryHistory`/`seedDemoHistory`/`historyExtent` (localStorage, takvimsel). `RangeAnalysisModal` + `ReportView` bileşenleri MEVCUT.
  - `src/data/datasource.ts` **yok**. `src/data/metrics.ts` → `useMetrics` hook.
  - → Analiz/rapor isteğini yaparken bu gerçek mimariyi kullan. Bkz hafıza [[repo-gercek-mimari]].
- **Bu oturumda ortam kararsızdı:** komut çıktıları bozuldu, bazı Read'ler eski içerik döndürdü, ara commit'ler kayboldu. Kod yazmadan önce dosyayı **python ile dump edip** (byte-doğru) teyit et; tek Read'e güvenme.

## MEHMET'İN BEKLEYEN İSTEKLERİ (bu oturumda yapılmadı — riskli/kararsız zemin)
1. **Analiz sayfası:** belli zaman dilimini KOLAY ayarlayıp **rapor** alma + ekranda **TOPLAM veri + zaman aralığı** göstergesi (karmaşasız). → Muhtemelen `RangeAnalysisModal`/`ReportView`/`history.ts` ile KISMEN VAR; önce mevcudu Mehmet'le gözden geçir, sonra eksiği ekle/yüzeye çıkar.
2. **Ürün üzerindeki gerçek baskılı yazılar okunur olsun** — Mehmet seçimi: **yüksek-çöz orijinal bul** (+hafif keskinlik). ASLA "düzeltilmiş gibi"/çocuk oyuncağı olmayacak, orijinallik şart. Programın HER yeri.
3. **Cihazdaki TÜM dijital ekran + LED'ler** gerçek/çalışır (debimetre LCD gibi) — `DeviceFlowChart.tsx`. Hub LCD yapıldı; regülatör ekranı/LED + diğerleri kaldı. (Yüksek regresyon riski — dikkatli, ekranla doğrula.)
4. **Hava akış animasyonu** fizik-doğru iyileştir (GERÇEK ürün fotosu KALIR, soyut şema YOK) + giriş/çıkışa SMC rekoru + **alt grafik adaptif scale**. Bkz [[hava-akis-animasyonu-vizyon]], [[grafik-adaptif-scale-fikri]]. (En riskli — "geri dönelim dedirtme".)
5. **Canlı panel arka planı + sekme geçiş performansı** (kambur temizliği).
6. **Tüm yazılarda mantıklı satır bölünmesi** (özel ad asla bölünmez) — sürekli ilke (imzada uygulandı).

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
