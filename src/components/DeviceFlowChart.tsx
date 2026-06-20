/*
 * NE      : "Cihaz Akışı" - Canlı Panel'in 2. canlı görünümü. GERÇEK SMC AMS ünitesinin TEMİZ ÖNDEN fotosu üzerinde, cihazın
 *           GERÇEK hava yolu boyunca soldan sağa akan hava + her sensörün KENDİ karakteristik rengiyle top-seviye animasyon.
 *           Boru = cihazın giriş/çıkış portuyla AYNI EKSEN ve AYNI ÖLÇÜ (portlar fotodan piksel taramasıyla ölçülür).
 *
 * PDF YERLEŞİMİ (CAT.ES100-155A / OMA1007, sol→sağ): Giriş(~0.02) → Standby/Oransal REGÜLATÖR(~0.22, basınç burada regüle) →
 *           Hub/LCD(~0.50, sadece ölçer) → Tahliye Valfi (Residual Pressure Relief, ~0.80; İZOLASYONda AŞAĞI egzoz eder) → Çıkış(~0.98).
 *           Valf fiziği (Mehmet Abi): valf tam kapanınca beslemeyi keser, ÇIKIŞ tarafındaki hava basıncını yitirerek valften
 *           AŞAĞI egzozdan dışarı çıkar (non-relief regülatör; tahliye yalnız valfte).
 *
 * RENK     : Sıcaklık = DÜNYA STANDARDI rampa (mavi→camgöbeği→yeşil→sarı→turuncu→kırmızı). Her sensör KENDİ rengini taşır:
 *           debi=metrics flow rengi, basınç=pressure rengi, nem=humidity rengi (metrics.ts'ten okunur → tek dogruluk).
 *           Sıcaklık ayrıca boru boyunca ince "ısı tülü" olarak dünya-standart renkle görünür.
 *
 * CANLANDIRMA: Cihazın kendi dijital LCD'leri (hub: basınç/debi/sıcaklık) GERÇEK verilerle yazılır (her satır kendi renginde + birim).
 *           REGÜLATÖR LED'i çalışma durumuna göre yeşil yanıp söner (standby'da parlar). (Valf LED'i kaldırıldı.)
 *           Valf = SOFT-STARTER (kademeli verir/keser; ani değil) → yumuşak rampa.
 * NASIL   : Saf Canvas 2D, dt-bazlı (144Hz güvenli), sabit havuz (kare-başı tahsis yok), additive glow + motion-blur iz.
 *           Ekran dikdörtgenleri fotodan KOYU bağlı-bileşen taramasıyla tespit (tutmazsa FB_DISPLAYS fallback).
 * YAN ETKI: Offline (foto gömülü). Üstüne PipeOverlay biner (mod + anlık değer + eşik + giriş/çıkış + "devrede" rozeti).
 * AYAR     : REG_FRAC / VALVE_FRAC / display ile bölge yerleri; port ekseni+çapı fotodan ölçülür (measure), tutmazsa fallback.
 */
import { useEffect, useMemo, useRef } from 'react'
import { asset } from '@/lib/asset'
import type { Reading, Mode } from '@/data/types'
import { METRICS, type MetricDef } from '@/data/metrics'
import { getActiveModel } from '@/data/model'
import { publishTotalizer } from '@/data/totalizer'   // toplam debi (totalizer) -> sag kol "Toplam Tuketim" karti AYNI degeri okur
import { drawSevenSeg, measureSevenSeg, type RGB } from '@/lib/sevenSeg'
import { sampleCurl } from '@/lib/flowField'   // curl-noise akış alanı (divergence-free, TAHSİSSİZ) — geri-dönüş sink + egzoz round-jet doğal salınımı

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
// Hermite smoothstep — yumuşak uç-maskesi (sert doğum/ölüm çizgisi YOK). Modül kapsamı → kare-başı alloc YOK.
const sstep = (x: number) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x) }
// sampleCurl çıktı tamponu — TEK paylaşılan 2'li tuple (geri-dönüş + egzoz ardışık kullanır; değer anında okunur → çakışma yok, alloc yok).
const _cv: [number, number] = [0, 0]

// Cihaz canvas'i KIRPMADAN panele en buyuk oturur (contain-fit). 2026-06-20: 0.985 -> 1.0 (Mehmet abi "urunu kirpma" + buyuk olsun) —
// ZOOM=1.0 ile birlikte cihaz panel kenarina tam dayar ama TASMAZ/kirpilmaz. Buyutme yan/dikey bosluk panel oraniyla kapanir.
const DEV_FILL = 1.0
// KABLO KIRPMA (Mehmet Abi): alttan sarkan kabloyu kes → cihaza yer açılır. Çizilen kaynak yükseklik oranı (üst kısım).
const CABLE_CROP = 0.74
// CİHAZI AŞAĞI AL (Mehmet Abi: bu kadar yukarıda olmasın). Görünen bölge dikey ORTALANIR + bu kadar (H oranı) aşağı kayar.
const DEV_DROP = 0.02
// DEBİMETRE ODAKLI zoom (Mehmet Abi): dış çerçeve/oranlar SABİT, içerik LCD'ye doğru büyür.
// 2026-06-20: 1.0→1.16→1.20 (Mehmet abi: "ürünü biraz daha büyült") — cihaz yatay, contain'de YAN boşluk vardı; bu zoom o boşluğu
//   yiyerek cihazı büyütür, esas gövde kırpılmaz (kenar boşluğu kapanır). Fazlası kenar kırpar → ekran kanıtıyla sınırda tut.
const ZOOM = 1.20
const FOCUS_U = 0.49, FOCUS_V = 0.205   // debimetre LCD merkezi (zoom odağı; image #1)
// Fallback port ekseni/capi/uclari (olcum tutmazsa)
const FB_AXIS = 0.19, FB_PIPE = 0.06, FB_IN = 0.03, FB_OUT = 0.95  // image #1 (AMS40A): hava yolu ÜSTTE (yatay manifold)
// Hub LCD camı (tum-foto orani) — FOTO-ÖLÇÜM (tools/_lcdalign.py: morfolojik kapama + en büyük koyu bileşen → gerçek cam sınırı).
//   Mehmet Abi: "overlay ölçüleri gerçek ekranla TAM örtüşsün" → değerler artık ekranın TAM içinde (eski kutu sağdan tuşlara taşıyordu).
const FB_DISPLAYS = [{ x: 0.4304, y: 0.1742, w: 0.1414, h: 0.0842 }]  // image #1: üst-orta dijital monitör LCD (gerçek camla BİREBİR — foto-ölçüm; Mehmet Abi onayladı)
// PDF'e gore modul bolgeleri (tum-foto x/y orani)
const REG_FRAC: [number, number] = [0.15, 0.33] // oransal regülatör GÖVDE hücresi — Mehmet abi: merkez 0.24 TAM + "biraz genişlet" → [0.15,0.33] (merkez 0.24 sabit, genişlik 0.18); animasyon gövdeye ortalı
const REG_DISP: [number, number, number, number] = [0.211, 0.4467, 0.0624, 0.0233] // regülatör KIRMIZI dijital LCD — BİREBİR foto-ölçüm (tools/_regscreen.py: ışın-tarama, siyah cam kenarı) [x,y,w,h]
const VALVE_CX = 0.74                            // tahliye valfi merkezi (image #1: sağ modül)
const EXHAUST_CX = 0.775, EXHAUST_CY = 0.39      // egzoz/dönüş/halka EKSENİ = valf düşey ekseni (mavi düğme). Mehmet abi: 0.785 çıkış eksenini kötüleştirdi → 0.775 (sevdiği eksen); hava bu eksende AŞAĞI atılır
// PDF LED konumu (tum-foto orani): SADECE regülatör POWER LED'i (valf LED'i Mehmet Abi kararıyla KALDIRILDI).
const LED_REG: [number, number] = [0.258, 0.478]  // regülatör POWER LED (image #1: ekranın ALTINDA, foto-ölçüm) — YEŞİL, devredeyken parlar
// REGÜLATÖR KOMPONENT DEĞİŞİMİ (model.type): temel foto Tip A (IO-Link/oransal) → Tip A'da DOKUNULMAZ (risksiz).
//   Tip B (elle-ayar/AR) seçilince: regülatör bölgesi temizlenip AR görseli (knob+analog saat) BİNDİRİLİR + dijital LCD/LED gizlenir.
//   Mehmet Abi: "bağlantı/ayak konumu ürüne göre değişebilir" → birebir hizalama şart değil; konum gözle ayarlanabilir (tunable).
// TİP B (elle-ayar AR regülatör) — Mehmet abi tarifi: ITV'yi GÖVDESİYLE kaldır → AR'yi bağlantı-aparatı ölçeğinde bindir → montaj BİRLİKTE.
//   Tüm konum/ölçek tek yerde (kolay ince ayar; hepsi cihaz-oranı dw/dh).
// 2026-06-14 OTONOM KALİBRASYON (Mehmet abi canlı: "oransal kalkmamış + AR çok büyük/yanlış yerde"):
//   maske Y alt sınırı 0.615→0.80 (oransal SARKAN modülü TAM ört) + AR ölçek 0.42→0.21 (oransal ölçeği) + TOP 0.370→0.405.
//   shot ile yakınsanıyor; tutmazsa bu 5 değer birlikte ince ayarlanır.
// 2026-06-15: Mehmet abi montaj stüdyosuyla (tip-b-montaj.html, ayrı port 5181) GÖZÜYLE oturttu → birebir değerler.
//   Araç ams-flow tam görsel oranını kullanır = kod dw/dh oranı (624/500≈1.248 ↔ dh/dw≈1.247) → DÖNÜŞÜM GEREKMEZ.
const REG_B_MASK_X: [number, number] = [0.16, 0.31]  // oransal ITV REGÜLATÖR dikey modülü örtücü (yatay) — ölçüm: x≈0.17-0.31. Hub'a (x>0.40) dokunmaz.
const REG_B_MASK_Y: [number, number] = [0.27, 0.59]  // ITV modülü (gövde + '.200' ekran + IO-Link konnektörler) — AR-altı kısmı örtülür; üstü AR foto kapatır
const REG_B_CX = 0.198   // AR merkez X (cihaz-oranı) — Mehmet abi montaj aracı
const REG_B_TOP = -0.003 // AR üst kenar Y — Mehmet abi montaj aracı
const REG_B_W = 0.536    // AR genişliği (yükseklik kareden) — Mehmet abi montaj aracı
// GÜVENLİK BAYRAĞI: regülatör overlay'i DOĞRULANMADAN (Mehmet abi gözüyle konum + ekran kanıtı) AÇILMAZ.
//   false iken program BİLİNEN-İYİ hâlinde (temel foto + orijinal LCD/LED) → bozuk/yarım görüntü ASLA gösterilmez.
//   Konum REG_SWAP_X/Y birlikte ayarlanıp gözle doğrulanınca true yapılacak.
const REG_SWAP_ENABLED = true // Tip B: AR (elle-ayar) regülatör takası AÇIK — Mehmet abi ile montaj (REG_B_CX/TOP/W) birlikte ince ayarlanıyor
// NE: AR arkasındaki gövde-tonu örtü plakası KAPALI. NEDEN: Mehmet abi (2026-06-15) "AR'nin arkasındaki boş pencereyi kaldır" —
//   AR'nin şeffaf köşelerinden taşan gri plaka "boş pencere" gibi duruyordu. AR kendi gövdesiyle binince temiz. true: plaka geri gelir.
const REG_B_MASK_ENABLED = true
// NE: Tip-B montaj GÖRÜNÜMÜ canlı panelde GİZLİ → cihaz çizimi HER ZAMAN Tip-A (eski temiz hal). NEDEN: Mehmet abi (2026-06-14)
//   "Tip-B'yi canlı panelde hiç gösterme, eskisi gibi olsun; ama tüm veriler/model yerli yerinde kalsın." NASIL: aşağıda dType bu
//   bayrağa göre A'ya sabitlenir; metrics/demoSource/analiz (model.type) DOKUNULMAZ. YAN ETKİ: yok. true yapınca Tip-B görünümü geri açılır.
const SHOW_TYPE_B_DEVICE_VIEW = false // Mehmet abi 2026-06-19: elle-ayar (Tip-B) cihaz görünümü HENÜZ optimize değil → KOMPLE GİZLE. Tip-B model seçilse de çizim TEMİZ Tip-A + dijital LCD kalır; model/veri/analiz yerinde. (AR montajı sonra yapılacak.)
// TİP B ANALOG SAAT GÜVENLİK BAYRAĞI: çalışan 270° saat HAZIR (drawAnalogGauge) ama temel foto Tip A olduğundan saat gövdeye oturmuyor
//   ("havada" görünür — Mehmet abi "bu ne?"). false iken Tip B de orijinal dijital LCD'yi gösterir (BİLİNEN-İYİ; tuhaf görüntü YOK).
//   Tip-B cihaz fotoğrafı gelince + konum (GAUGE_B_POS) Mehmet abi gözüyle doğrulanınca true yapılır.
// NE: Tip-B analog saat KAPALI (güvene alındı). NEDEN: 2026-06-14 ekran kanıtı → çizilen saat HAVADA (cihaz sağ-üstünde,
//   gerçek manometreden kopuk); Mehmet abi onayıyla bilinen-iyi dijital ekrana döndürüldü (Japonya teslim → havada/kırık görüntü ASLA).
//   NASIL: false iken satır ~910 koşulu çizmez → Tip-B dijital LCD gösterir. YAN ETKI yok (bilinen-iyi hâl). Tip-B foto gelince GAUGE_B_POS gözle oturtulup true.
const DEVICE_B_GAUGE_ENABLED = false
const GAUGE_B_POS: [number, number, number] = [0.242, 0.452, 0.052] // [x, y, r] device-oranı (Tip-B foto gelince ayarlanacak)

const FLOW_COUNT = 240       // akan hava molekülü havuzu — Mehmet abi 2026-06-19: mantıklı yoğunluk (280→240, ferah ama zengin); GÖRÜNEN sayı debiyle ölçeklenir (flowN)
const FLOW_LANES = 14        // paralel laminar şerit; aynı şeritteki moleküller AYNI hızda → asla karışmaz
const MOLE_COUNT = 120   // regülatör sıkışma molekülleri — Mehmet Abi: daha çok kendini belli etsin (çoğaltıldı)
const DROPLET_MAX = 60
const PUFF_COUNT = 100  // egzoz jeti yoğunluğu — Mehmet Abi: daha dolgun/sürekli çıkış (80→100)

// --- HUB LCD RENKLERİ (GERÇEK SMC AMS hub ekranı — Mehmet Abi fotosu + kullanım kılavuzu om_ams_20-30-40-60, sayfa 19) ---
//   ANA EKRAN (üst satır: basınç MPa + anlık debi L/min) = "2 colour display": OPERASYON modunda YEŞİL; çıkış aktifken
//   (debi set-eşiğe inip standby/izolasyona geçince) KIRMIZI. ALT EKRAN (alt satır: sıcaklık °C + toplam debi L) = TURUNCU (tek renk).
const LCD_GREEN: RGB = [42, 226, 90]   // ana ekran normal (LED yeşili)
const LCD_RED: RGB = [255, 58, 46]     // ana ekran çıkış-aktif (LED kırmızısı)
const LCD_AMBER: RGB = [255, 118, 30]  // alt ekran (LED turuncusu)

// --- Toplam debi TOTALIZER (kalıcı biriktirici) — gerçek cihaz: güç kesilince son kayıttan devam eder (om sayfa 98). ---
//   Demo'da her kare flow(l/dak)*dt/60 L biriktirilir; localStorage'da kalıcı (oturumlar arası BÜYÜR). Foto'daki "2400 L" gibi
//   inandırıcı 4-6 haneli bir değer gösterir. İlk açılışta model debisinden tohumlanır (büyük model = büyük totalizer).
const ACCUM_KEY = 'ams_accum_l_v1'
function loadAccum(seed: number): number {
  try { const r = localStorage.getItem(ACCUM_KEY); if (r != null) { const n = parseFloat(r); if (Number.isFinite(n) && n >= 0) return n } } catch { /* offline */ }
  return seed
}
function saveAccum(v: number): void { try { localStorage.setItem(ACCUM_KEY, String(Math.round(v))) } catch { /* offline */ } }

// DÜNYA STANDARDI sıcaklık rampası (mavi→kırmızı; Turbo-türevi, renk körü güvenli)
const TEMP_STOPS: { t: number; c: [number, number, number] }[] = [
  { t: 0.0, c: [48, 96, 220] }, { t: 0.2, c: [56, 170, 235] }, { t: 0.4, c: [27, 207, 200] },
  { t: 0.55, c: [110, 230, 90] }, { t: 0.7, c: [225, 220, 50] }, { t: 0.85, c: [250, 150, 40] }, { t: 1.0, c: [220, 40, 20] },
]
function tempRGB(t: number): [number, number, number] {
  t = clamp01(t)
  for (let i = 1; i < TEMP_STOPS.length; i++) {
    if (t <= TEMP_STOPS[i].t) {
      const a = TEMP_STOPS[i - 1], b = TEMP_STOPS[i], f = (t - a.t) / (b.t - a.t || 1)
      return [Math.round(a.c[0] + (b.c[0] - a.c[0]) * f), Math.round(a.c[1] + (b.c[1] - a.c[1]) * f), Math.round(a.c[2] + (b.c[2] - a.c[2]) * f)]
    }
  }
  return TEMP_STOPS[TEMP_STOPS.length - 1].c
}
function hexRGB(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0]
}

// 270° SMC kare-gömme ANALOG BASINÇ SAATİ (Tip B regülatör — elle ayar): krem kadran + tik/rakam + CANLI iğne (basınçla).
//   Yay alt-sol(0) → üstten → alt-sağ(dialMax), 270° (canvas saat yönü). v01 = basınç/dialMax (0..1). Kare bezel + cam parıltısı (premium).
//   SAF çizim (foto-overlay değil) → kendi gövdesiyle bütün; kare-başı sabit çağrı (RAM-safe). Mehmet abi: "iğne canlı basınçla çalışsın".
function drawAnalogGauge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, v01: number, dialMax: number, accent: string): void {
  v01 = v01 < 0 ? 0 : v01 > 1 ? 1 : v01
  const A0 = Math.PI * 0.75, SWEEP = Math.PI * 1.5
  const rr = (ctx as CanvasRenderingContext2D & { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect
  // 1) KARE BEZEL (gömme metalik gövde)
  const sq = r * 1.32
  ctx.fillStyle = '#0b0e13'
  if (rr) { ctx.beginPath(); rr.call(ctx, cx - sq, cy - sq, sq * 2, sq * 2, r * 0.18); ctx.fill() } else ctx.fillRect(cx - sq, cy - sq, sq * 2, sq * 2)
  ctx.lineWidth = Math.max(1, r * 0.05); ctx.strokeStyle = 'rgba(185,195,210,0.35)'
  if (rr) { ctx.beginPath(); rr.call(ctx, cx - sq, cy - sq, sq * 2, sq * 2, r * 0.18); ctx.stroke() }
  // 2) KADRAN yüzü (krem radyal)
  const fg = ctx.createRadialGradient(cx, cy - r * 0.25, r * 0.1, cx, cy, r * 1.05)
  fg.addColorStop(0, '#fcf8ee'); fg.addColorStop(0.7, '#efe9da'); fg.addColorStop(1, '#cfc8b6')
  ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
  ctx.lineWidth = Math.max(1, r * 0.045); ctx.strokeStyle = '#20242b'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
  // 3) KIRMIZI EMNİYET yayı (son ~%20)
  ctx.lineWidth = r * 0.07; ctx.strokeStyle = 'rgba(206,40,40,0.85)'
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.86, A0 + SWEEP * 0.8, A0 + SWEEP); ctx.stroke()
  // 4) TİKLER + RAKAMLAR (büyük 0.2 / küçük 0.1)
  const steps = Math.max(2, Math.round(dialMax / 0.1))
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  for (let i = 0; i <= steps; i++) {
    const f = i / steps, a = A0 + f * SWEEP, major = i % 2 === 0
    const r1 = r * (major ? 0.72 : 0.81), r2 = r * 0.9
    ctx.lineWidth = major ? Math.max(1, r * 0.055) : Math.max(0.6, r * 0.025); ctx.strokeStyle = '#191c21'
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke()
    if (major) {
      const val = f * dialMax, lbl = Number.isInteger(val) ? String(val) : val.toFixed(1)
      ctx.fillStyle = '#191c21'; ctx.font = `700 ${Math.max(6, r * 0.19)}px ui-sans-serif, system-ui, sans-serif`
      ctx.fillText(lbl, cx + Math.cos(a) * r * 0.56, cy + Math.sin(a) * r * 0.56)
    }
  }
  // 5) "MPa"
  ctx.fillStyle = '#5a6470'; ctx.font = `600 ${Math.max(5, r * 0.15)}px ui-sans-serif, system-ui, sans-serif`
  ctx.fillText('MPa', cx, cy + r * 0.5)
  // 6) İĞNE (canlı basınç) + merkez göbek
  const a = A0 + v01 * SWEEP, nx = Math.cos(a), ny = Math.sin(a)
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#b21f2a'; ctx.lineWidth = Math.max(1.4, r * 0.06)
  ctx.beginPath(); ctx.moveTo(cx - nx * r * 0.14, cy - ny * r * 0.14); ctx.lineTo(cx + nx * r * 0.84, cy + ny * r * 0.84); ctx.stroke()
  ctx.fillStyle = '#15181d'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.1, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(cx, cy, r * 0.05, 0, Math.PI * 2); ctx.fill()
  // 7) CAM parıltısı (üst yarım highlight)
  const gl = ctx.createLinearGradient(cx, cy - r, cx, cy + r * 0.2)
  gl.addColorStop(0, 'rgba(255,255,255,0.28)'); gl.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, Math.PI * 2); ctx.fill()
  ctx.lineCap = 'butt'
}

export function DeviceFlowChart({
  reading,
  metrics = METRICS,
  mode = 'normal',
  theme = 'dark',
}: {
  reading: Reading | null
  metrics?: MetricDef[]
  mode?: Mode
  theme?: 'dark' | 'light'
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const byKey = useMemo(() => Object.fromEntries(metrics.map((m) => [m.key, m])) as Record<string, MetricDef>, [metrics])
  // Anlik hedef degerler + her sensorun KENDI rengi (metrics.ts → tek dogruluk) — her render guncellenir
  const targetRef = useRef({ flow: 0, pressure: 0, temp: 0, hum: 0, mode })
  // GEÇİCİ varsayılan RGB (metrics gelene kadar); satır 101-103'te metrics.ts renkleriyle (tek doğruluk) üzerine yazılır.
  const colorRef = useRef<{ flow: number[]; pressure: number[]; hum: number[] }>({ flow: [46, 155, 255], pressure: [54, 224, 200], hum: [124, 224, 255] })
  // Hub LCD'sine basilacak GERÇEK ham degerler + ana ekran 2-renk durumu. Birim/renk/cozunurluk cizimde GERCEK cihaza gore
  //   sabittir (MPa/L/min/°C/L; ust=yesil-kirmizi, alt=turuncu) — kullanim kilavuzu om_ams_20-30-40-60. Toplam debi totalizer'dan.
  // total: CANLI cihazin GERCEK toplam debisi (AccumFlow / reading.totalFlow). Kopru gonderirse LCD sag-alt totalizer BUNU gosterir
  //   (yerel uydurma DEGIL). Yoksa null -> demo/yerel biriktirmeye duser. (Saha: "toplam veri gorunmuyor" -> totalizer cihaza bagli degildi.)
  const readoutRef = useRef<{ pressure: number | null; flow: number | null; temp: number | null; total: number | null; mainRed: boolean }>({ pressure: null, flow: null, temp: null, total: null, mainRed: false })
  // VERİ KALP ATIŞI — GERÇEK-veri tahrikli LED'ler için: reading her degistiginde (yeni paket) say + performance.now damgala.
  //   Boylece COMM/SIG/PORT vb. SAHTE timer yerine GERÇEK veri akisina gore yanip soner; veri durursa LED de durur.
  const dataRef = useRef({ prevT: -1, n: 0, lastT: 0 })
  {
    const nv = (k: string) => { const m = byKey[k]; return !m || !reading ? 0 : clamp01((m.get(reading) - m.min) / (m.max - m.min)) }
    targetRef.current = { flow: nv('flow'), pressure: nv('pressure'), temp: nv('temperature'), hum: nv('humidity'), mode }
    if (byKey.flow) colorRef.current.flow = hexRGB(byKey.flow.color)
    if (byKey.pressure) colorRef.current.pressure = hexRGB(byKey.pressure.color)
    if (byKey.humidity) colorRef.current.hum = hexRGB(byKey.humidity.color)
    // Ham degerler (cizimde gercek cihaz cozunurlugu ile bicimlenir: basinc 3 hane, debi tam, sicaklik 1 hane).
    // ANA EKRAN 2-RENK (SMC marketing/kilavuz uyumu): NORMAL + STANDBY = YESIL (izleme); sadece IZOLASYON (hava kesildi,
    //   esik/alarm durumu = cikis aktif) KIRMIZI. Onceden standby de kirmiziydi; gercek ekranda standby YESIL kaliyor (foto 05/06).
    readoutRef.current = {
      pressure: reading ? reading.pressure : null,
      flow: reading ? reading.flow : null,
      temp: reading ? reading.temperature : null,
      // CANLI cihaz totalFlow (AccumFlow) gonderdiyse YAKALA -> totalizer cihazin GERCEK totalini gosterir. Yoksa null (demo/yerel).
      total: reading && reading.totalFlow != null && Number.isFinite(reading.totalFlow) ? reading.totalFlow : null,
      mainRed: mode === 'isolation',
    }
    // Yeni veri paketi geldi mi? reading.t her tikte (80ms / canlı cihaz hızı) degisir → GERÇEK paket sayaci + zaman damgasi.
    if (reading && reading.t !== dataRef.current.prevT) {
      dataRef.current.prevT = reading.t
      dataRef.current.n = (dataRef.current.n + 1) % 100000
      dataRef.current.lastT = performance.now()
    }
  }
  const themeRef = useRef(theme)
  themeRef.current = theme

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')!

    // Foto → SADECE dış arka planı KENARDAN flood-fill ile saydamlaştır (cihazın açık-gri/beyaz GÖVDESİNE dokunma; görüntü bozulmaz,
    // zorla kırpma yok). En-boy korunur. Sonra port ekseni/çapı ölçülür (giriş/çıkış portu = boru ile AYNI eksen+ölçü).
    // GPU RESET (TDR) DAYANIKLILIĞI (Mehmet Abi: "görüntü bozulunca AMS ürünü komple kayboluyor"): foto offscreen canvas'ta bir
    //   kez işlenip her kare çizilir; GPU süreci sıfırlanınca bu offscreen içeriği UÇAR → ürün kaybolur (akış animasyonu sürer).
    //   ÇÖZÜM: loadDevice() yeniden çağrılabilir → context 'restored' olunca foto yeniden çözülüp işlenir (ürün KENDİ KENDİNE geri gelir).
    let img: HTMLImageElement | null = null
    let deviceCanvas: HTMLCanvasElement | null = null
    let devAR = 1
    let regB: HTMLImageElement | null = null // Tip B (elle-ayar) regülatör görseli — yüklenince, model B ise bindirilir
    let regBSil: HTMLCanvasElement | null = null // AR-şekilli gövde-tonu siluet (cache) — oransalı AR'nin KENDİ konturu boyunca örter (dikdörtgen "boş pencere" yok)
    const meas = { axis: FB_AXIS, pipe: FB_PIPE, inX: FB_IN, outX: FB_OUT }
    // Dijital ekran dikdortgenleri (tum-foto orani 0..1) — SABIT foto-olcum (otomatik tespit kaldirildi → const)
    const displays: { x: number; y: number; w: number; h: number }[] = FB_DISPLAYS
    const loadDevice = () => {
     const im = new Image()
     img = im
     im.onload = () => {
      if (img !== im) return // daha yeni bir yükleme başladıysa bu eskiyi yok say
      devAR = im.width / im.height
      const oc = document.createElement('canvas')
      oc.width = im.width; oc.height = im.height
      const octx = oc.getContext('2d')!
      octx.drawImage(im, 0, 0)
      deviceCanvas = oc // taint olursa bile orijinali oldugu gibi goster (bozma)
      try {
        const Wp = oc.width, Hp = oc.height
        const d = octx.getImageData(0, 0, Wp, Hp)
        const a = d.data
        const N = Wp * Hp
        // ÖN-TEMİZ PNG mi? (ams-flow.png zaten şeffaf zeminli — tools/clean-image.py ile delik/kablo-içi/hale temizlendi).
        // Varsa runtime flood-fill'i ATLA (özenle temizlenmiş alfayı bozma); ölçüm yine native alfadan yapılır.
        let preCleaned = false
        for (let p = 3; p < a.length; p += 4) { if (a[p] < 250) { preCleaned = true; break } }
        if (!preCleaned) {
          const isBg = (p: number) => { const i = p * 4; return a[i] > 238 && a[i + 1] > 238 && a[i + 2] > 238 } // ~beyaz arka plan
          // Flood-fill kenarlardan (sadece DIŞ beyaz; içteki beyaz gövde KORUNUR)
          const visited = new Uint8Array(N)
          const stack: number[] = []
          for (let x = 0; x < Wp; x++) { stack.push(x); stack.push((Hp - 1) * Wp + x) }
          for (let y = 0; y < Hp; y++) { stack.push(y * Wp); stack.push(y * Wp + Wp - 1) }
          while (stack.length) {
            const p = stack.pop()!
            if (p < 0 || p >= N || visited[p]) continue
            visited[p] = 1
            if (!isBg(p)) continue
            a[p * 4 + 3] = 0 // dış arka plan → saydam
            const x = p % Wp, y = (p - x) / Wp
            if (x > 0) stack.push(p - 1); if (x < Wp - 1) stack.push(p + 1)
            if (y > 0) stack.push(p - Wp); if (y < Hp - 1) stack.push(p + Wp)
          }
          octx.putImageData(d, 0, 0)
        }
        // İçerik sınırı (ölçüm için; GÖRÜNTÜYÜ KIRPMIYORUZ, sadece port/eksen hesabı)
        let minX = Wp, maxX = 0, minY = Hp, maxY = 0
        for (let p = 0; p < N; p++) if (a[p * 4 + 3] > 40) { const x = p % Wp, y = (p - x) / Wp; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y }
        if (maxX > minX && maxY > minY) {
          const cw = maxX - minX + 1   // içerik genişliği (port x oranları için); yükseklik kullanılmıyordu → kaldırıldı (ölü değişken)
          const alpha = (x: number, y: number) => a[(y * Wp + x) * 4 + 3]
          const measurePort = (xc: number) => {
            let bottom = -1
            for (let y = maxY; y >= minY; y--) { if (alpha(xc, y) > 40) { bottom = y; break } }
            if (bottom < 0) return null
            let topY = bottom
            for (let y = bottom; y >= minY; y--) { if (alpha(xc, y) > 40) topY = y; else break }
            return { center: (topY + bottom) / 2, height: bottom - topY + 1 }
          }
          const lp = measurePort(minX + Math.round(cw * 0.025))
          const rp = measurePort(maxX - Math.round(cw * 0.025))
          const ports = [lp, rp].filter(Boolean) as { center: number; height: number }[]
          if (ports.length) {
            const cAvg = ports.reduce((s, p) => s + p.center, 0) / ports.length
            const hAvg = ports.reduce((s, p) => s + p.height, 0) / ports.length
            // oranlar TÜM foto (Hp/Wp) bazında — cunku goruntuyu kirpmiyoruz, oldugu gibi cizecegiz
            meas.axis = cAvg / Hp
            meas.pipe = Math.max(0.035, Math.min(0.18, hAvg / Hp))
            meas.inX = (minX + cw * 0.012) / Wp
            meas.outX = (maxX - cw * 0.012) / Wp
          }

          // DİJİTAL EKRAN tespiti KALDIRILDI (Mehmet Abi): otomatik koyu-kutu tespiti bazen sağ modüldeki SİYAH KONNEKTÖRÜ "ekran"
          //   sanıp canlı değerleri (basınç/debi...) ÜRÜN DIŞINA, sağ-üst köşeye UÇURUYORDU. Artık hub LCD'si tek doğruluk olan
          //   SABİT foto-ölçümlü konuma (FB_DISPLAYS = gerçek üst-orta monitör) kilitli → değerler HER ZAMAN ürünün gerçek ekranında.
        }
      } catch { /* taint → orijinal goster, fallback oranlar */ }
     }
     im.src = asset('products/ams-flow.png')   // ÖN-TEMİZ şeffaf PNG (tools/clean-image.py)
    }
    loadDevice()
    // Tip B (elle-ayar) regülatör görselini yükle (şeffaf AR PNG). Tip A temel fotoda zaten var → yalnız B'de bindirilir.
    const loadRegB = () => {
      const r = new Image()
      r.onload = () => {
        regB = r
        // AR-şekilli gövde-tonu siluet'i BİR KEZ hazırla (RAM-safe; kare-başı tahsis yok): AR çiz → source-in → gövde-tonu doldur → AR konturu siluet.
        const o = document.createElement('canvas'); o.width = r.naturalWidth; o.height = r.naturalHeight
        const oc = o.getContext('2d')
        if (oc) { oc.drawImage(r, 0, 0); oc.globalCompositeOperation = 'source-in'; oc.fillStyle = 'rgb(228,230,228)'; oc.fillRect(0, 0, o.width, o.height); regBSil = o }
      }
      r.src = asset('products/regulator-ar-hd.png')
    }
    loadRegB()

    const sig = { flow: 0, pressure: 0, temp: 0, hum: 0, exhaust: 0, reg: 0, valve: 0 }

    // Her molekül SABİT bir lane'e (paralel şerit) ait. fPhase = şerit boyunca konum. Hız SADECE lane'e bağlı (parabolik laminar
    // profil: merkez hızlı / cidar yavaş) → aynı şeritteki moleküller AYNI hızda akar, ASLA birbirini geçmez; şeritler Y'de ayrık
    // → borunun aynı (x,y) noktasında farklı hızda iki molekül OLAMAZ (Mehmet Abi: kesinlikle karışma yok).
    const fPhase = Float32Array.from({ length: FLOW_COUNT }, () => Math.random())
    const fLane = Float32Array.from({ length: FLOW_COUNT }, (_, i) => (((i % FLOW_LANES) + 0.5) / FLOW_LANES) * 2 - 1)
    const mU = Float32Array.from({ length: MOLE_COUNT }, () => Math.random())
    const mLane = Float32Array.from({ length: MOLE_COUNT }, () => Math.random() * 2 - 1)
    const mRot = Float32Array.from({ length: MOLE_COUNT }, () => Math.random() * Math.PI)
    const dX = Float32Array.from({ length: DROPLET_MAX }, () => Math.random())
    const dLane = Float32Array.from({ length: DROPLET_MAX }, () => Math.random())
    const dR = Float32Array.from({ length: DROPLET_MAX }, () => 1.5 + Math.random() * Math.random() * 4.5)
    const pX = new Float32Array(PUFF_COUNT), pY = new Float32Array(PUFF_COUNT)
    const pVx = new Float32Array(PUFF_COUNT), pVy = new Float32Array(PUFF_COUNT)
    const pLife = Float32Array.from({ length: PUFF_COUNT }, () => Math.random())

    let W = 0, H = 0, dpr = 1
    const resize = () => {
      // ÇÖZÜNÜRLÜK (Mehmet Abi: debimetre dijital karakterleri daha NET): tavan 2→3.
      //   cap yalnız ÜST sınır → standart ekranda (dpr≈1–1.5) hiçbir değişiklik/maliyet yok; yüksek-DPI ekranda (2–3x,
      //   4K/retina) canvas native çözünürlüğe çıkar → LCD rakamları + akış keskinleşir. Foto/akış da yararlanır.
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = wrap.clientWidth; H = wrap.clientHeight
      canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr))
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(wrap)
    // 2D canvas GPU-reset dayanikligi: context geri gelince fotoyu YENIDEN isle (urun kaybolmasin → manuel refresh GEREKMEZ)
    const onCtxLost = (e: Event) => { e.preventDefault() }
    const onCtxRestored = () => { loadDevice(); loadRegB() }
    canvas.addEventListener('contextlost', onCtxLost)
    canvas.addEventListener('contextrestored', onCtxRestored)

    const drawEngage = (cx: number, cy: number, rgb: string, intensity: number, pulse: number, radius: number) => {
      if (intensity < 0.04) return
      const pr2 = radius * (1 + 0.12 * Math.sin(pulse))
      ctx.globalCompositeOperation = 'lighter'
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, pr2 * 1.7)
      rg.addColorStop(0, `rgba(${rgb},${0.32 * intensity})`); rg.addColorStop(0.55, `rgba(${rgb},${0.13 * intensity})`); rg.addColorStop(1, `rgba(${rgb},0)`)
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, pr2 * 1.7, 0, Math.PI * 2); ctx.fill()
      ctx.lineWidth = 2.5; ctx.strokeStyle = `rgba(${rgb},${0.8 * intensity})`
      ctx.beginPath(); ctx.arc(cx, cy, pr2, 0, Math.PI * 2); ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
    }

    // TOTALIZER (toplam debi L) — kalıcı; ilk açılışta model debisinden tohumlanır (inandırıcı 4 haneli başlangıç).
    let accumL = loadAccum(Math.round(getActiveModel().baselineFlow))
    let accumSaveT = 0   // periyodik kalıcılaştırma sayacı (saniye)
    let pubT = 0         // "Toplam Tüketim" kartı yayın sayacı (saniye) — ~1sn'de bir publishTotalizer (60fps'te her kare DEĞİL)
    publishTotalizer(accumL)  // ilk değer: kart 0 yerine gerçek başlangıcı göstersin (cihaz bağlandığında ilk tikle gerçeğe güncellenir)
    // NE: Önceki karenin valf sinyali. NEDEN: Egzoz, valfin KAPANMA HIZINA bağlanacak (sürekli fışkırma değil, geçişte fışkırma).
    //   NASIL: Her karede sig.valve ile farkı alınıp valveRate hesaplanır. YAN ETKİ: effect-scoped (kare-başı alloc YOK, sadece sayı).
    let prevValveSig = 0

    let raf = 0, last = performance.now()
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const t = targetRef.current
      // TOPLAM debi (totalizer) KAYNAGI:
      //   • CANLI CIHAZ totalFlow (AccumFlow) gonderiyorsa → BIREBIR onu goster (cihazin GERCEK totali; olcek kopruDE kalibre edilir).
      //     BUG (saha: "toplam veri gorunmuyor"): bu deger eskiden HIC okunmuyordu → LCD'de basinc/debi/sicaklik cihazdan gelirken
      //     toplam YEREL uydurmaydi (cihaza bagli OLMAYAN tek alan). Artik cihaz totali varsa o gosterilir.
      //   • Yoksa (demo / cihazda accum dugumu yok) → anlik debi(l/dak) × dt/60 ile YEREL biriktir (eski demo davranisi korunur).
      const devTotal = readoutRef.current.total
      if (devTotal != null) accumL = devTotal
      else accumL += (readoutRef.current.flow ?? 0) * dt / 60
      accumSaveT += dt
      if (accumSaveT >= 3) { saveAccum(accumL); accumSaveT = 0 }
      pubT += dt
      if (pubT >= 1) { publishTotalizer(accumL); pubT = 0 }   // sağ kol "Toplam Tüketim" kartı ~1sn'de bir güncellenir (LCD ile AYNI değer)
      const k = Math.min(1, dt * 4)
      sig.flow += (t.flow - sig.flow) * k; sig.pressure += (t.pressure - sig.pressure) * k
      sig.temp += (t.temp - sig.temp) * k; sig.hum += (t.hum - sig.hum) * k
      // İZOLASYONDA regülatör devrede DEĞİL (valf havayı keser) -> halka 0. Eskiden 0.4 idi; PipeOverlay "sadece Valf devrede"
      // derken teal regülatör halkası çiziliyordu = çelişki (senkron denetimi #4). Sadece STANDBY'da regülatör devrede.
      const regTarget = t.mode === 'standby' ? 1 : 0
      const valveTarget = t.mode === 'isolation' ? 1 : 0
      sig.reg += (regTarget - sig.reg) * Math.min(1, dt * 2.5)
      // SOFT-STARTER valfi: basinci KADEMELI verir/keser (ani DEĞİL) → yavaş rampa (dt*0.9)
      sig.valve += (valveTarget - sig.valve) * Math.min(1, dt * 0.9)
      // NE: Egzoz = gerçek rezidüel-basınç tahliye valfi gibi — KAPANMA GEÇİŞİNDE hapsolan basıncı boşaltır, sonra SAKİNLEŞİR.
      // NEDEN: Eski hesap (sig.valve*(1-0.15)) tam kapalıda bile ~0.85'te SÜREKLİ fışkırıyordu; oysa yorum "tam kapanınca tahliye biter".
      // NASIL: valveRate = valfin sadece ARTARKEN (kapanırken) hızı → geçişte güçlü egzoz; izolasyon yerleşince yalnız hafif kalıcı tahliye.
      // YAN ETKİ: prevValveSig effect-scoped (alloc yok); kapanma anında pik, sabit izolasyonda söner (sonsuz fışkırma DEĞİL).
      const valveRate = Math.max(0, sig.valve - prevValveSig) / Math.max(dt, 1e-3) // valf kapanma hızı (sadece artarken)
      prevValveSig = sig.valve
      const exTarget = clamp01(valveRate * 0.6 + sig.valve * 0.30) // GEÇİŞTE güçlü fışkırma + izolasyonda SÜREKLİ GÖRÜNÜR hafif tahliye (Mehmet abi: egzoz net görünsün)
      sig.exhaust += (exTarget - sig.exhaust) * Math.min(1, dt * 2.2)

      const fc = colorRef.current.flow, pc = colorRef.current.pressure, hc = colorRef.current.hum
      // ISI RANGE GENİŞLETME: dar sensör bandını orta etrafında AÇ → soğukta daha mavi, sıcakta daha kırmızı (fark net)
      // + SICAK BIAS (Mehmet Abi: daha da kırmızıya) — +0.24 ile rampa belirgin şekilde ısıya kayar
      const tempEff = clamp01(0.5 + (sig.temp - 0.5) * 1.7 + 0.24)
      const [tr, tg, tb] = tempRGB(tempEff)
      const cF = (a: number) => `rgba(${fc[0]},${fc[1]},${fc[2]},${a})` // debi rengi
      const cP = (a: number) => `rgba(${pc[0]},${pc[1]},${pc[2]},${a})` // basinc rengi
      const cT = (a: number) => `rgba(${tr},${tg},${tb},${a})`          // sicaklik (dunya std)
      const dark = themeRef.current !== 'light'
      // NEM = BUHAR tonu — AKIŞ mavisinden AYRIŞIR (Mehmet Abi): gece soluk buz-beyazı buhar; gündüz teal (açık zeminde net, maviden ayrı).
      const vr = dark ? Math.round(hc[0] + (255 - hc[0]) * 0.62) : Math.round(hc[0] * 0.30)
      const vg = dark ? Math.round(hc[1] + (255 - hc[1]) * 0.45) : Math.round(hc[1] * 0.66)
      const vb = dark ? Math.round(hc[2] + (255 - hc[2]) * 0.20) : Math.round(hc[2] * 0.62)
      const cH = (a: number) => `rgba(${vr},${vg},${vb},${a})` // nem (buhar) — akış mavisinden ayrı
      // AKAN HAVA rengi: AĞIRLIKLI MAVİ (Mehmet Abi). TEMA-DUYARLI taban → GECE additif parlak mavi; GÜNDÜZ daha KOYU/doygun mavi
      // (açık zeminde okunsun, katmanlar birbirini engellemesin). Sıcaklık yalnızca ÇOK ısındıkça (≤~%22) hafif sıcak tona kaydırır.
      const airB = dark ? [70, 150, 255] : [18, 96, 205]
      const warmW = clamp01((sig.temp - 0.55) * 1.6) * 0.3
      const sr = Math.round(airB[0] + (tr - airB[0]) * warmW), sg = Math.round(airB[1] + (tg - airB[1]) * warmW), sb = Math.round(airB[2] + (tb - airB[2]) * warmW)
      const cS = (a: number) => `rgba(${sr},${sg},${sb},${a})` // akan hava (mavi-ağırlıklı; gece/gündüz ayrı taban)

      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = dark ? 'rgba(6,10,22,0.32)' : 'rgba(225,235,247,0.40)'
      ctx.fillRect(0, 0, W, H)

      // SPACE DERİNLİĞİ — PERSPEKTİF zemin ızgarası (Mehmet abi 2026-06-19: "düz kareler değil, space derinliği"): ufuktan derinliğe KAÇAN
      //   yatay + dikey çizgiler (3D kanal/zemin hissi) + ufuk ışık bandı. Koyu scrim'in ÜSTÜNE, cihaz fotosunun ALTINA; statik (animasyon yok),
      //   kenara/uzağa solar. Cihaz (opak) üstüne biner → cihazın olduğu yerde görünmez, yalnız çevrede derinlik hissi verir. RAM-safe.
      {
        const col = dark ? '110,160,230' : '60,110,180'
        const cxC = W / 2, horizon = H * 0.34
        const edgeFade = (x: number) => 1 - Math.min(1, Math.abs(x - W / 2) / (W / 2)) * 0.5
        ctx.lineWidth = 1
        for (let i = 1; i <= 9; i++) {
          const f = i / 9
          const yy = horizon + Math.pow(f, 2.1) * (H - horizon) * 1.06 // ufuk ALTI: derinliğe açılan zemin çizgileri
          if (yy <= H + 2) { ctx.strokeStyle = `rgba(${col},${(dark ? 0.15 : 0.12) * (1 - f * 0.5)})`; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke() }
          const yu = horizon - Math.pow(f, 2.1) * horizon * 1.02 // ufuk ÜSTÜ: simetrik tavan kanalı
          if (yu >= -2) { ctx.strokeStyle = `rgba(${col},${(dark ? 0.09 : 0.07) * (1 - f * 0.5)})`; ctx.beginPath(); ctx.moveTo(0, yu); ctx.lineTo(W, yu); ctx.stroke() }
        }
        const spread = W * 0.92
        for (let i = -6; i <= 6; i++) { // kaçış noktasına yakınsayan dikey çizgiler (derinlik)
          const xb = cxC + (i / 6) * spread
          ctx.strokeStyle = `rgba(${col},${(dark ? 0.12 : 0.10) * (1 - Math.abs(i) / 7) * edgeFade(xb)})`
          ctx.beginPath(); ctx.moveTo(cxC + (i / 6) * spread * 0.08, horizon); ctx.lineTo(xb, H); ctx.stroke()
        }
        const hg = ctx.createLinearGradient(0, horizon - H * 0.14, 0, horizon + H * 0.07) // ufuk ışık bandı = derinlik kapanışı
        hg.addColorStop(0, `rgba(${col},0)`); hg.addColorStop(0.6, `rgba(${col},${dark ? 0.10 : 0.06})`); hg.addColorStop(1, `rgba(${col},0)`)
        ctx.fillStyle = hg; ctx.fillRect(0, horizon - H * 0.14, W, H * 0.21)
      }

      // CİHAZ ÖLÇÜ+KONUM: kablo kırpıldığı için GÖRÜNEN bölge = üst CABLE_CROP. Bu GÖRÜNEN bölgeyi panele BÜYÜK contain-fit oturt
      //   (Mehmet Abi: ürünü büyüt) → tam görsel yüksekliği görünenin 1/CABLE_CROP'u (≈%35 daha iri). Görünen bölge dikey ORTALANIR
      //   + DEV_DROP kadar aşağı (bu kadar yukarıda olmasın). visAR = görünen bölgenin en/boy oranı.
      const visAR = devAR / CABLE_CROP
      let visW = W * DEV_FILL
      let visH = visW / visAR
      if (visH > H * DEV_FILL) { visH = H * DEV_FILL; visW = visH * visAR }
      const dw0 = visW
      const dh0 = visH / CABLE_CROP                       // tam görsel yüksekliği (görünen = üst CABLE_CROP'u)
      const dx0 = (W - dw0) / 2
      const dy0 = (H - visH) / 2 + H * DEV_DROP           // görünen bölge dikey ortalı + biraz aşağı (kırpılan kablo boşluğu yukarı taşmaz)
      // DEBİMETRE ODAKLI zoom: odağı (LCD) ekranda SABİT tutarak içeriği ZOOM kadar büyüt → dış çerçeve ölçüsü değişmez
      const fpx = dx0 + FOCUS_U * dw0, fpy = dy0 + FOCUS_V * dh0
      const dw = dw0 * ZOOM, dh = dh0 * ZOOM
      const dx = fpx - FOCUS_U * dw, dy = fpy - FOCUS_V * dh
      const axisY = dy + dh * meas.axis
      const pipeH = Math.max(9, dh * meas.pipe)
      const top = axisY - pipeH / 2, bot = axisY + pipeH / 2
      // Cihaz ÇİZİM tipi: Tip-B görünümü gizliyse (SHOW_TYPE_B_DEVICE_VIEW=false) her zaman 'A' → oransal foto + canlı LCD + ITV LED (eski temiz).
      const dType: 'A' | 'B' = SHOW_TYPE_B_DEVICE_VIEW ? getActiveModel().type : 'A'
      const regX0 = dx + dw * REG_FRAC[0], regX1 = dx + dw * REG_FRAC[1]
      const valveCx = dx + dw * VALVE_CX, valveCy = dy + dh * 0.24 // image #1: sağ valf modülü
      // EGZOZ PORTU: valf modülünün ALT-orta noktası (PDF: tahliye aşağı, susturucu valfin altında). Duman TAM buradan çıkar.
      const exOx = dx + dw * EXHAUST_CX, exOy = dy + dh * EXHAUST_CY
      const markR = Math.min(dw, dh) * 0.11

      // 0) ARKA SAHNE artık ORTAK AmbientScene bileşeninde (iki grafik paylaşır) — burada çizilmez (Mehmet Abi).

      // 1) GERÇEK CİHAZ FOTOSU — ARKA PLAN. Tüm animasyon bunun üstüne biner.
      //   KABLO KIRPMA: kaynağın ALT (1−CABLE_CROP) kadarı (sarkan kablo) çizilmez. Kaynak-dikdörtgeni üst CABLE_CROP'tan alıp
      //   HEDEFE dh*CABLE_CROP yüksekliğinde basarız → ölçek 1:1 korunur; tüm iç ölçüm sabitleri (REG/VALVE/LED/EXHAUST, y<0.5) kaymaz.
      if (deviceCanvas) {
        ctx.globalAlpha = 1
        const srcH = Math.round(deviceCanvas.height * CABLE_CROP)
        ctx.drawImage(deviceCanvas, 0, 0, deviceCanvas.width, srcH, dx, dy, dw, dh * CABLE_CROP)
      }

      // 1b) REGÜLATÖR KOMPONENT (model.type): Tip A → DOKUNMA (temel foto zaten oransal/ITV). getActiveModel() canlı okunur.
      //   Tip B (elle-ayar) — Mehmet abi tarifi: (a) oransal ITV regülatörü GÖVDESİYLE kaldır (temizle) →
      //   (b) AR (elle-ayar) regülatörü BAĞLANTI-APARATI ölçeğinde (REG_B_W) bindir → AR orantılı büyür. Montaj birlikte ince ayar.
      if (REG_SWAP_ENABLED && dType === 'B') {
        // (a) ITV'yi örten gövde-tonu plaka — Mehmet abi isteğiyle KAPALI (REG_B_MASK_ENABLED=false): "AR arkasındaki boş pencereyi kaldır".
        if (REG_B_MASK_ENABLED) {
          const mx = dx + dw * REG_B_MASK_X[0], my = dy + dh * REG_B_MASK_Y[0]
          const mw = dw * (REG_B_MASK_X[1] - REG_B_MASK_X[0]), mh = dh * (REG_B_MASK_Y[1] - REG_B_MASK_Y[0])
          const mg = ctx.createLinearGradient(0, my, 0, my + mh)
          mg.addColorStop(0, 'rgb(237,238,236)'); mg.addColorStop(1, 'rgb(208,210,208)')
          ctx.fillStyle = mg
          const mrad = Math.min(mw, mh) * 0.12
          if ((ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect) { ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, mrad); ctx.fill() } else ctx.fillRect(mx, my, mw, mh)
        }
        // (b) AR-SİLUET (gövde-tonu) + gerçek AR fotosu. Siluet, alttaki oransalı AR'nin KENDİ konturu boyunca örter →
        //     Mehmet abi "boş pencere" (dikdörtgen köşe) sorunu çözülür; oransal, AR'nin altında temiz kapanır. Sonra AR fotosu üstüne biner.
        if (regB && regB.complete && regB.naturalWidth) {
          const iw = dw * REG_B_W, ih = iw * (regB.naturalHeight / regB.naturalWidth)
          const rx = dx + dw * REG_B_CX - iw / 2, ry = dy + dh * REG_B_TOP
          if (regBSil) ctx.drawImage(regBSil, rx, ry, iw, ih) // AR-şekilli gövde-tonu örtü (oransalı kontur boyunca gizler)
          ctx.drawImage(regB, rx, ry, iw, ih)                 // gerçek AR fotosu üstüne
        }
      }

      // (KENAR-YUMUŞATMA gradyan şeritleri KALDIRILDI — Mehmet Abi: "dikey kalın çizgiler" olarak görünüyordu; ters tepen düzeltmeydi.)

      // 2) BORU + giris/cikis hortumu (UÇTAN UCA, port ile AYNI EKSEN+ÇAP). Debi renginde hafif kenar.
      const grad = ctx.createLinearGradient(0, top, 0, bot)
      grad.addColorStop(0, cF(0.14)); grad.addColorStop(0.5, dark ? 'rgba(8,16,28,0.05)' : 'rgba(255,255,255,0.05)'); grad.addColorStop(1, cF(0.09))
      const glassWarm = (dark ? 0.018 : 0.04) * sig.flow * sig.flow  // BORU CAMI: tam hızda hafif kırmızı (tema-duyarlı)
      // BORU tam genişlikte SÜREKLİ çizilir (Mehmet Abi: rekorlar KALDIRILDI → hava yolu uçtan uca tek tüp; parçalı/atlamalı çizim gerekmez).
      ctx.fillStyle = grad; ctx.fillRect(0, top, W, pipeH)
      if (glassWarm > 0.003) { ctx.fillStyle = `rgba(228,72,56,${glassWarm})`; ctx.fillRect(0, top, W, pipeH) }
      ctx.strokeStyle = cF(0.45); ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(W, top); ctx.moveTo(0, bot); ctx.lineTo(W, bot); ctx.stroke()

      // 2b) BORU ısı tülü — ÇOK AZ ve sadece ISINDIKÇA (Mehmet Abi: hızlı akışta arka plan kırmızı OLMASIN; boru ısındıkça birazcık
      //     kızarsın). Eşik (0.42) altında tamamen görünmez; üstünde düşük alfa → yumuşak kırmızı/turuncu film. Değer LCD'de net.
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over'
      const heatA = Math.max(0, sig.temp - 0.42) * 0.30 * (0.92 + 0.08 * Math.sin(now * 0.0016))
      if (heatA > 0.004) {
        const hg = ctx.createLinearGradient(0, top, 0, bot)
        hg.addColorStop(0, cT(0)); hg.addColorStop(0.5, cT(heatA)); hg.addColorStop(1, cT(0))
        ctx.fillStyle = hg; ctx.fillRect(0, top, W, pipeH)
      }

      // 3) AKAN HAVA — streak rengi SICAKLIĞA göre (dünya std mavi→kırmızı) → akışa bakınca sıcaklık net okunur.
      //   (uzunluk∝debi hızı, parlaklık∝debi). Debi rengi boru gövdesinde kalır; havanın KENDİSİ ısındıkça kızarır.
      //   VALF KAPANINCA (izolasyon): valf SONRASI (çıkış/ön) hava GERİ akar (sağdan→valfe) ve valfte AŞAĞI egzoza dökülür.
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over'   // tema-duyarlı: gece additif, gündüz source-over (yıkanmasın)
      const pr = pipeH * 0.42
      const baseV = 0.05 + 0.95 * sig.flow
      const flowN = Math.round((0.25 + 0.75 * sig.flow) * FLOW_COUNT) // MİKTAR DEBİYLE ORANTILI (Mehmet abi 2026-06-19 mantıklı): düşük debi belirgin SEYREK (%25), tam debi YOĞUN — hava az→molekül az
      const aK = dark ? 1 : 1.4   // GÜNDÜZ alfa biraz yüksek → translucent mavi açık zeminde net okunur
      ctx.lineCap = 'round'
      for (let i = 0; i < FLOW_COUNT; i++) {
        const lane = fLane[i]
        const prof = 1 - 0.5 * lane * lane   // parabolik laminar hız: merkez hızlı, cidar yavaş (hız YALNIZCA lane'e bağlı)
        const x0 = fPhase[i] * W
        // GERİ AKIŞ (izolasyon) — Mehmet abi: "hava valfin biraz daha İÇİNE girip ordan DAR radüsle kıvrılmalı aşağıya".
        //   (1) BORU İÇİ yatay geri-akış (boru dışına çıkmaz) → valf eksenine kadar; (2) valf ekseninde DAR yarıçaplı ÇEYREK-TUR
        //   yatay→aşağı; (3) EKSEN boyunca DİK iniş egzoza (izler dikeyde KISA → düşey çizgi yok); son %28'de fade → jet devralır. Recycle gizli.
        if (sig.valve > 0.12 && x0 > valveCx) {
          const R = pipeH * 0.85                              // ÇOK DAR dönüş yarıçapı (px) — hava TA EKSENE kadar gelip orada sıkıca döner (Mehmet abi)
          const entryX = exOx + R                             // tur valf ekseninin hemen sağında (R küçük) → yatay akış eksene ULAŞIR, ordan döner
          const exFrac = exOx / W
          const vDrop = Math.max(0, (exOy - axisY) - R)       // tur sonrası EKSENDE dik iniş (egzoza kadar)
          const vSpan = 0.05                                  // dik iniş fphase bandı (akış hızı)
          const dec = (0.12 + 0.5 * sig.valve) * prof         // sağ→sol geri-akış hızı (laminar; per-molekül rastgele YOK → karışmaz)
          fPhase[i] -= dec * dt
          const fp = fPhase[i]
          if (fp <= exFrac - vSpan) { fPhase[i] = 1 - ((i % 41) * 0.0006); continue }  // egzoza indi → GÖRÜNMEZ recycle
          const pxr = fp * W
          let pxc: number, py: number, txu: number, tyu: number, cs: number, dnv: number
          if (pxr >= entryX) {
            pxc = pxr; py = axisY; txu = -1; tyu = 0; cs = 1; dnv = 0                   // (1) BORU İÇİ yatay
          } else if (fp >= exFrac) {
            let sn = (entryX - pxr) / R; if (sn > 1) sn = 1                             // (2) DAR çeyrek-tur (sin θ)
            cs = Math.sqrt(1 - sn * sn)
            pxc = pxr; py = axisY + R * (1 - cs); txu = -cs; tyu = sn; dnv = R * (1 - cs)
          } else {
            const vd = Math.min(1, (exFrac - fp) / vSpan)                               // (3) eksende DİK iniş (0→1)
            pxc = exOx; py = axisY + R + vDrop * vd; txu = 0; tyu = 1; cs = 0; dnv = R + vDrop * vd
          }
          const off = lane * pr * cs                          // kesit (laminar şerit) — tur/inişte daralır
          const dpx = pxc + off * tyu, dpy = py - off * txu   // perp = (tyu, −txu)
          const bornFade = sstep((1 - fp) / 0.10)             // sağ uçta yumuşak doğum
          const nearPort = dnv / Math.max(1, exOy - axisY)    // 0 boru .. 1 egzoz ağzı
          const drainFade = 1 - sstep((nearPort - 0.72) / 0.28)  // son ~%28'de sön → egzoz jeti devralır (görünmez geçiş)
          const a = (0.26 + 0.62 * sig.valve) * (0.5 + 0.5 * prof) * aK * bornFade * drainFade // Mehmet abi 2026-06-19: geri-akış HAVASI belirgin (yoksa "geri dönüşte sadece nem akıyor" görünüyordu)
          if (a <= 0.012) continue
          const len = (7 + 12 * sig.valve) * (0.72 + 0.5 * prof) * (0.4 + 0.6 * cs)  // DİKEYde KISA iz (düşey çizgi olmasın)
          const lw = 1.0 + 1.3 * prof
          ctx.strokeStyle = cS(a * 0.4); ctx.lineWidth = lw   // soluk uzun kuyruk
          ctx.beginPath(); ctx.moveTo(dpx - txu * len, dpy - tyu * len); ctx.lineTo(dpx, dpy); ctx.stroke()
          ctx.strokeStyle = cS(a); ctx.lineWidth = lw         // parlak kısa baş
          ctx.beginPath(); ctx.moveTo(dpx - txu * len * 0.42, dpy - tyu * len * 0.42); ctx.lineTo(dpx, dpy); ctx.stroke()
          continue
        }
        // NORMAL ileri akış — hız=lane profili (per-molekül rastgele hız YOK) → AYNI lane = AYNI hız → karışma İMKANSIZ
        fPhase[i] += (baseV * prof * 0.5 + 0.006) * dt
        if (fPhase[i] > 1) fPhase[i] -= 1
        const x = fPhase[i] * W
        // GELİŞ-GİDİŞ ÇARPIŞMA (Mehmet abi): valf kapalıyken supply havası valf YÜZÜNE çarpıp BİRİKİR → eski SERT kesme yerine
        //   valf yüzüne yaklaşınca YUMUŞAK sönüm (yutulma/birikme hissi). Valfin SAĞI ileri-akış almaz (return devralır).
        let collF = 1
        if (sig.valve > 0.12) {
          const vF = valveCx / W
          if (fPhase[i] > vF) continue                   // valf sağı: ileri-akış geçmez
          collF = sstep((vF - fPhase[i]) / 0.07)         // valf yüzünde yumuşak sön (çarpıp birikme)
        }
        if (i >= flowN) continue                          // MİKTAR: debiye göre seyrelt (faz ilerledi ama bu zerre çizilmez → düşük debide ferah)
        const y = axisY + lane * pr                      // SABİT şerit (Y salınımı YOK → izler asla kesişmez)
        const a = (0.12 + 0.55 * sig.flow) * (0.5 + 0.5 * prof) * aK * collF   // çarpışma fade'i (valf yüzünde birikip söner)
        const len = (8 + Math.min(baseV, 0.85) * 22) * (0.72 + 0.5 * prof)   // hızlı akışta DAHA UZUN iz (akıcı "hücum" hissi)
        const lw = (1.0 + 1.3 * prof) * (0.62 + sig.flow * 0.7)        // merkez şerit daha kalın
        // ZARİF taper (kare-başı tahsis YOK): soluk uzun kuyruk + parlak kısa baş = molekül başı + hareket izi
        ctx.strokeStyle = cS(a * 0.34); ctx.lineWidth = lw
        ctx.beginPath(); ctx.moveTo(x - len, y); ctx.lineTo(x, y); ctx.stroke()
        ctx.strokeStyle = cS(a); ctx.lineWidth = lw
        ctx.beginPath(); ctx.moveTo(x - len * 0.42, y); ctx.lineTo(x, y); ctx.stroke()
      }

      // GELİŞ-GİDİŞ ÇARPIŞMA — valf YÜZÜNDE basınç birikme parıltısı (Mehmet abi: çarpışma animasyonu): supply havası kapalı valfe
      //   çarpıp sıkışınca yumuşak NABIZ atan ışık (yoğunluk ∝ valf×debi). Döngü DIŞI → kare-başı tek gradient (RAM-bedava). Additif.
      if (sig.valve > 0.12 && sig.flow > 0.05) {
        const cg = (0.10 + 0.26 * sig.flow) * sig.valve * (0.82 + 0.18 * Math.sin(now * 0.006))
        const cr = pipeH * (0.9 + 0.5 * sig.flow)
        const g = ctx.createRadialGradient(valveCx, axisY, 0, valveCx, axisY, cr)
        g.addColorStop(0, cS(cg)); g.addColorStop(1, cS(0))
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(valveCx, axisY, cr, 0, Math.PI * 2); ctx.fill()
      }

      // 4) REGÜLATÖR ORİFİS (venturi) — moleküller DAR hücrede GİRİŞ→ÇIKIŞ süzülür; orifiste kesit DARALIR (pinch) ve HIZLANIR.
      //   Devredeyken (sig.reg) çıkış HIZLI→SEYREK (düşük P2), giriş YAVAŞ→YOĞUN (yüksek P1) — SÜREKLİLİK (continuity) ile fark.
      //   Reg=0'da hız düz → iki taraf eşit. Hepsi iki aparat (regX0..regX1) arası. Göze hitap eden akıcı regülasyon (Mehmet Abi).
      const regW = regX1 - regX0
      const chokeF = 0.52                                  // orifis konumu (hücre içi 0..1)
      const p1 = sig.pressure                              // GİRİŞ basıncı
      const p2 = sig.pressure * (1 - 0.65 * sig.reg)       // ÇIKIŞ basıncı (devredeyken düşer)
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over'
      // 4a) BASINÇ GRADYANI — orifiste KESKİN düşüş (fark görünür; reg=0'da düz)
      {
        const g = ctx.createLinearGradient(regX0, 0, regX1, 0)
        g.addColorStop(0, cP(0.06 + 0.22 * p1)); g.addColorStop(Math.max(0, chokeF - 0.02), cP(0.05 + 0.20 * p1))
        g.addColorStop(chokeF, cP(0.04 + 0.12 * p2)); g.addColorStop(1, cP(0.03 + 0.06 * p2))
        ctx.fillStyle = g; ctx.fillRect(regX0 - 3, top, regW + 6, pipeH)
      }
      // 4b) MOLEKÜL (diatomik) çizici
      const mol = (mx: number, my: number, sz: number, ma: number, rot: number) => {
        const dxm = Math.cos(rot) * sz, dym = Math.sin(rot) * sz
        ctx.strokeStyle = cP(ma * 0.7); ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.moveTo(mx - dxm, my - dym); ctx.lineTo(mx + dxm, my + dym); ctx.stroke()
        ctx.fillStyle = cP(ma)
        ctx.beginPath(); ctx.arc(mx - dxm, my - dym, sz * 0.78, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(mx + dxm, my + dym, sz * 0.78, 0, Math.PI * 2); ctx.fill()
      }
      // AKIŞ: TÜM moleküllerin fazı ilerler (giriş→çıkış); orifis SONRASI devredeyken hızlanır → çıkış SEYREK. Çizilen sayı ∝ basınç.
      const moleN = Math.round(MOLE_COUNT * (0.18 + 0.58 * sig.pressure)) // Mehmet Abi: biraz rahat (daha az/seyrek molekül)
      const vBase = 0.2 + 0.24 * p1                                        // daha sakin akış hızı
      for (let i = 0; i < MOLE_COUNT; i++) {
        const v = vBase * (mU[i] < chokeF ? 1 : (1 + 2.6 * sig.reg)) // orifis sonrası HIZLI (devredeyken) → seyrekleşir
        let u = mU[i] + v * dt
        if (u >= 1) u -= 1
        mU[i] = u
        if (i >= moleN) continue
        const x = regX0 + u * regW
        const pinch = 0.30 + 0.70 * Math.min(1, Math.abs(u - chokeF) / 0.40) // VENTURI: orifiste kesit DAR (hourglass)
        const near = 1 - Math.min(1, Math.abs(u - chokeF) / 0.16)            // orifise yakınlık (squeeze vurgusu)
        const local = u < chokeF ? p1 : p2
        const jit = (0.18 + 0.8 * local) * pinch                            // daha az çalkantı (rahat)
        const y = axisY + mLane[i] * pr * 0.86 * pinch + (Math.random() - 0.5) * jit
        const sz = (1.5 + 0.8 * local) + near * 0.35                         // orifiste hafif iri (squeeze yumuşatıldı)
        // Mehmet Abi: "molekül belli bir çizgide belirip belli bir çizgide yok olmasın — hepsi aynı hava içinde cereyan ediyor" →
        //   uçlarda YUMUŞAK belir/sön (opaklık rampası): giriş ucu (u→0) + çıkış ucu (u→1) fade → sert doğum/ölüm ÇİZGİSİ YOK, sürekli hava hissi.
        const edgeFade = Math.min(1, u / 0.14) * Math.min(1, (1 - u) / 0.14)
        const a = Math.min(0.92, (0.28 + 0.42 * local) + near * 0.12) * edgeFade
        // HIZLANMA İZİ (Mehmet Abi: regülatör animasyonunu geliştir) — orifis SONRASI hızlanan molekül arkasında kısa iz bırakır
        //   → venturi "fışkırma"sı belirginleşir (hız ∝ iz uzunluğu). Yalnız hızlananlarda (devredeyken çıkış tarafı).
        const spd = v / vBase
        if (spd > 1.25) {
          const tl = sz * (1.6 + 2.6 * (spd - 1))
          ctx.lineCap = 'round'; ctx.strokeStyle = cP(a * 0.3); ctx.lineWidth = sz * 0.85
          ctx.beginPath(); ctx.moveTo(x - tl, y); ctx.lineTo(x, y); ctx.stroke()
        }
        mol(x, y, sz, a, mRot[i] + now * (0.0004 + 0.0006 * local))          // daha yavaş/sakin dönüş
      }
      // ORİFİS BOĞAZ PARILTISI (Mehmet Abi: regülatör animasyonunu geliştir) — choke noktasında devredeyken NABIZ atan ince ışık
      //   → venturi boğazı vurgulanır (yoğunluk ∝ sig.reg). Additif ('lighter' hâlâ aktif).
      if (sig.reg > 0.05) {
        const tcx = regX0 + chokeF * regW
        const tg = (0.10 + 0.20 * sig.reg) * (0.82 + 0.18 * Math.sin(now * 0.005))
        const rg2 = ctx.createRadialGradient(tcx, axisY, 0, tcx, axisY, pipeH * 0.62)
        rg2.addColorStop(0, cP(tg)); rg2.addColorStop(1, cP(0))
        ctx.fillStyle = rg2; ctx.beginPath(); ctx.arc(tcx, axisY, pipeH * 0.62, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      // 5) DEVREYE GİRME halkalari — regülatör (BASINÇ renginde) / valf (turuncu-amber)
      const pulse = now * 0.006
      // Regülatör DEVREYE GİRME halkaları (Mehmet Abi: "valf devreye girince olan yuvarlak animasyonların hepsi regülatörde de olsun") —
      //   TEAL ("Regülatör devrede" rengi), regüle hücresi merkezinde, sig.reg yoğunluğunda. Valfle AYNI drawEngage; farklı faz (sync olmasın).
      const regCx = (regX0 + regX1) / 2
      drawEngage(regCx, axisY, '54,224,200', sig.reg, pulse, markR)                          // regülatör halkası — devredeyken (standby) parlar
      drawEngage(dx + dw * EXHAUST_CX, valveCy, '255,150,40', sig.valve, pulse + 1.5, markR) // valf halkası DÜŞEY EKSENİ = mavi düğme/egzoz ekseni (Mehmet abi: yanıp sönen daireyi de düğmeye baz al)

      // 6) NEM — havada SÜSPANSE su buharı/mikro-damlacık (NEM renginde): akışLA birlikte (sol→sağ) sürüklenir, boru kesitine
      //   YAYILIR, hafif salınır. Yoğunluk + tül ∝ nem. Kullanıcı "bu akışta nem var" diye NET anlar.
      //   (Eski: dipte kayan iri damlalar = cam üstü yağmur gibi saçmaydı; akıştaki nemi anlatmıyordu → kaldırıldı, Mehmet Abi.)
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over'
      if (sig.hum > 0.04) { // hafif NEM TÜLÜ — nemli hava hissi (yoğunluk ∝ nem)
        const mistA = (dark ? 0.025 : 0.05) + 0.06 * sig.hum               // nem tülü DAHA HAFİF (hava baskın — Mehmet abi "havadan çok nem varmış gibi")
        const mg = ctx.createLinearGradient(0, top, 0, bot)
        mg.addColorStop(0, cH(0)); mg.addColorStop(0.5, cH(mistA)); mg.addColorStop(1, cH(0))
        ctx.fillStyle = mg; ctx.fillRect(0, top, W, pipeH)
      }
      const humN = Math.round((0.03 + 0.34 * sig.hum) * DROPLET_MAX) // Mehmet abi 2026-06-19: nem AZINLIK (hava baskın); geri-akışta nem baskın görünmesin diye biraz daha kısıldı
      const humDrift = (0.05 + 0.95 * sig.flow) * 0.5 + 0.03          // akışLA sürüklenir (durağanken hafif süzülür)
      // GERİ AKIŞ (izolasyon): nem de HAVA gibi davranır — valf SAĞINDAKİ nem valfe/egzoza doğru GERİ akar, egzoz ağzında
      //   aşağı süzülüp söner (havayla birlikte çıkar) ve sağ uca recycle olur; valf SOLUNDAKİ ileri nem valfi geçmez.
      //   (Mehmet Abi: "geri dönüş hava akışında nem partikülleri ters akışa girmiyor".)
      const humBack = sig.valve > 0.12
      const vFracH = valveCx / W, exFracH = exOx / W
      for (let i = 0; i < humN; i++) {
        const bob = Math.sin(now * 0.0016 + dLane[i] * 11) * pipeH * 0.07 // hafif yukarı-aşağı salınım (asılı buhar)
        let x: number, y: number, fade = 1
        if (humBack && dX[i] > vFracH) {
          // GERİ akış hızı — hava izleriyle UYUMLU tempo: valf yoğunluğuna bağlı (izolasyonda flow≈0 olduğundan humDrift
          //   kullanılırsa nem sürünür). Hafif per-zerre çeşitleme (dLane) → tek hatta donuk görünmez. Hava back-flow (0.11+0.5·valve) ile aynı bantta.
          const backSpd = (0.12 + 0.46 * sig.valve) * (0.88 + dLane[i] * 0.24)
          dX[i] -= backSpd * dt                                          // GERİ akış (sağdan sola, valfe/egzoza doğru)
          if (dX[i] <= vFracH) { dX[i] = (W - 2) / W; continue }          // egzoza indi → sağ uca recycle (döngü)
          x = dX[i] * W
          if (dX[i] > exFracH) {
            y = axisY + (dLane[i] * 2 - 1) * pr * 0.8 + bob               // egzoz sağı: yatay geri akış (boru kesitine yayılı)
          } else {
            const d = clamp01((exFracH - dX[i]) / Math.max(1e-4, exFracH - vFracH))
            y = axisY + (dLane[i] * 2 - 1) * pr * 0.6 + (exOy - axisY) * d + bob // egzoz ağzı: aşağı süzül (havayla çıkış)
            fade = 1 - d * 0.85                                           // çıkışa yaklaşınca söner
          }
        } else {
          dX[i] += humDrift * (0.7 + dR[i] * 0.06) * dt                   // NORMAL ileri akış (sol→sağ)
          if (dX[i] > 1) dX[i] -= 1
          if (humBack && dX[i] > vFracH) continue                        // izolasyonda ileri nem valfi GEÇMEZ (hava ile tutarlı)
          x = dX[i] * W
          y = axisY + (dLane[i] * 2 - 1) * pr * 0.8 + bob                // boru KESİTİNE yayıl (dipte değil)
        }
        const r = 0.85 + dR[i] * 0.4                                       // KÜÇÜK buhar zerresi
        const a = (0.09 + 0.26 * sig.hum) * aK * fade                       // nem zerresi DAHA SÖNÜK (hava baskın kalsın — Mehmet abi)
        // küçük + DÜŞÜK alfa hale (karışmaz) + CRISP parlak çekirdek (her zerre AYRI okunur → yoğun ama net)
        ctx.fillStyle = cH(a * 0.3); ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = cH(Math.min(1, a * 1.7)); ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      // 7) VALF EGZOZU — GERÇEK ROUND-JET: valf kapanınca çıkış basıncı port ağzından (exOx,exOy) AŞAĞI fışkırır. Ağızda DAR parlak
      //   çekirdek (potential core); mesafeyle koni AÇILIR (radyal dışa-itme + curl entrainment); hız mesafeyle SÖNER (~core/(core+d));
      //   yumuşak yuvarlaklar additif 'lighter' ile belir→söner ("yaşayan hava"). Renk cS (SMC mavisi). Şiddet ∝ sig.exhaust.
      //   (Eski aşağı "puf çizgisi" duşu KALDIRILDI — Mehmet Abi "egzozdan çıkış çok kötü". Sıfır kare-başı tahsis: pX..pLife havuzu + _cv.)
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over'
      const exA = sig.exhaust
      if (exA > 0.02) {
        const coreLen = Math.max(8, dh * 0.018)            // potential core (parlak çekirdek) uzunluğu
        const coreR = Math.max(3.5, dh * 0.014)            // ağız çekirdek yarıçapı (Mehmet abi: biraz büyüt)
        const SPREAD = 0.28                                // tan(~15.6°) yarı-koni açılımı (Mehmet abi: biraz genişlet)
        // DUMAN MİKTARI DEĞİŞKENLİĞİ (Mehmet abi 2026-06-19): aktif puff sayısı egzoz ŞİDDETİYLE orantılı (az egzoz→ince duman, çok→yoğun) —
        //   eskiden hep PUFF_COUNT doğuyordu (tekdüze) → sadece hız/parlaklık değişiyordu. + hafif püskürtme nabzı (mekanik değil) → miktar
        //   canlı oynar. i>=puffN partikülleri YENİDEN doğmaz; yaşayanlar söner → yumuşak geçiş (ani kesilme yok).
        const burst = 0.82 + 0.18 * Math.sin(now * 0.0026)
        const puffN = Math.round(PUFF_COUNT * Math.min(1, Math.max(0, (0.18 + 0.82 * exA) * burst)))
        // (A) AĞIZ ÇEKİRDEK PARILTISI KALDIRILDI (Mehmet abi: "egzozun çıktığı yerde nokta parlamasına gerek yok").
        //     Ağızda sahte "nokta" lekesi YOK; jet sadece kendi akan partikülleriyle (B) belirir.
        // (B) JET PARTİKÜLLERİ — çekirdek dar/hızlı → mesafeyle koni açılır, hız söner, boyut büyür
        for (let i = 0; i < PUFF_COUNT; i++) {
          pLife[i] -= dt / (0.5 + Math.random() * 0.45)    // kısa ömür → belir/söner (jet uzanır)
          if (pLife[i] <= 0) {
            if (exA > 0.06 && i < puffN) {                  // i < puffN → MİKTAR şiddetle değişir (Mehmet abi: duman miktarı değişkenliği)
              const sp = (150 + Math.random() * 120) * (0.55 + exA)            // ağız hızı ∝ şiddet
              pX[i] = exOx + (Math.random() - 0.5) * coreR * 1.2               // DAR ağız → parlak çekirdek
              pY[i] = exOy + coreR * 0.3
              pVx[i] = (Math.random() - 0.5) * 30                              // ağızda yanal (koni sonra açılır) — Mehmet abi: biraz genişlet
              pVy[i] = sp * (0.8 + 0.35 * Math.random())                       // AŞAĞI fışkırma
              pLife[i] = 1
            } else continue
          }
          const dist = pY[i] - exOy > 0 ? pY[i] - exOy : 0                     // ağızdan aşağı mesafe
          const spread = dist / Math.max(1, dh)
          // TURBULANS: divergence-free curl (alloc yok) → koni içinde girdap ("yaşayan hava")
          sampleCurl(pX[i] * 0.02, pY[i] * 0.02, now * 0.0012, _cv)
          const turb = (120 + 240 * spread) * exA                             // mesafeyle daha çalkantılı (entrainment)
          // KONİ AÇILIMI: curl yanal + merkezden radyal dışa-itme (öz-benzer ~12° koni)
          pVx[i] += (_cv[0] * turb + (pX[i] - exOx) * SPREAD * 28) * dt
          pVx[i] *= 0.985
          // HIZ SÖNÜMÜ (~core/(core+d)) + hafif sürüklenme/yerçekimi
          const decay = coreLen / (coreLen + dist)
          pVy[i] = pVy[i] * (0.985 - 0.05 * spread) + 70 * dt
          pX[i] += pVx[i] * dt; pY[i] += pVy[i] * dt
          const l = pLife[i] > 0 ? pLife[i] : 0
          const born = l > 0.85 ? (1 - l) * 6.67 : 1                          // doğumda 0'dan aç
          const die = l < 0.5 ? l * 2 : 1                                     // ölürken 0'a in
          const core = dist < coreLen ? 1 : decay                            // çekirdekte parlak, sonra 1/d söner
          const a = born * die * (0.12 + 0.55 * exA) * core
          if (a <= 0.012) continue
          const r = coreR * (0.6 + 1.9 * (1 - l) + 1.8 * spread)             // mesafe/yaşla BÜYÜR (koni şişmesi) — Mehmet abi: biraz büyüt
          // YAĞ-GİBİ yuvarlak: 2 ucuz fill (geniş sönük hale + dar parlak çekirdek), createRadialGradient YOK
          ctx.fillStyle = cS(a * 0.45)
          ctx.beginPath(); ctx.arc(pX[i], pY[i], r, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = cS(Math.min(0.9, a * 1.5))
          ctx.beginPath(); ctx.arc(pX[i], pY[i], r * 0.45, 0, Math.PI * 2); ctx.fill()
        }
      }
      ctx.globalCompositeOperation = 'source-over'

      // 8) CİHAZ LED'i — REGÜLATÖR güç/durum LED'i (valf LED'i kaldırıldı): devredeyse (standby) yeşil yanıp söner.
      // SADECE REGÜLATÖR LED'i (Mehmet Abi: valf LED'i kaldırıldı). KONUM SABİT (LED_REG); ÇOK KÜÇÜK + gerçekçi, YANIP SÖNER.
      //   Devredeyken (standby/iso) yeşil nabız, boştayken sönük.
      if (!(REG_SWAP_ENABLED && dType === 'B')) { // overlay aktif + Tip B değilse orijinal güç LED'i gösterilir
        const lx = dx + dw * LED_REG[0], ly = dy + dh * LED_REG[1]
        const rr0 = Math.max(0.9, dh * 0.0055)                  // çok küçük dot (gerçek LED ölçeği)
        const regBlink = (now % 1150) < 820 ? 1 : 0.06          // ~0.87Hz yanıp sönme (açık ~0.82s / kapalı ~0.33s)
        const lit = (0.3 + 0.7 * sig.reg) * regBlink            // devredeyken parlak; her durumda yanıp söner
        if (lit > 0.05) {
          // DAHA ZAYIF + GERÇEKÇİ (Mehmet Abi): glow yarıçap+alfa kısıldı (2.4→1.9, 0.5→0.28); çekirdek sönük yeşil, taban parlaklık düşük.
          ctx.globalCompositeOperation = 'lighter'
          const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, rr0 * 1.9)
          g.addColorStop(0, `rgba(70,210,120,${0.28 * lit})`); g.addColorStop(1, 'rgba(70,210,120,0)')
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, rr0 * 1.9, 0, Math.PI * 2); ctx.fill()
          ctx.globalCompositeOperation = 'source-over'
          ctx.fillStyle = `rgba(120,225,150,${Math.min(0.85, 0.3 + 0.55 * lit)})`
          ctx.beginPath(); ctx.arc(lx, ly, rr0, 0, Math.PI * 2); ctx.fill()
        }
      }
      // VALF LED'i KALDIRILDI (Mehmet Abi: "led işini beceremedik, valf LED'iyle ilgili ne varsa temizle"). Tek gösterge: REGÜLATÖR LED'i.

      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1   // LCD/LED öncesi state garanti (orphan ctx.restore KALDIRILDI — clip yok)

      // 9) HUB LCD'si (debimetre ekranı) — GERÇEK SMC AMS hub ekranı BİREBİR (Mehmet Abi fotosu + kullanım kılavuzu
      //   om_ams_20-30-40-60, sayfa 19): 2×2 grid + 7-segment LED (sevenSeg.ts), TAM OPAK siyah cam (foto'nun statik değerini gizler).
      //   ANA EKRAN (ÜST): SOL=Basınç MPa, SAĞ=Anlık debi L/min → "2 colour display": OPERASYONda YEŞİL, çıkış aktifken
      //   (debi set-eşiğe inip standby/izolasyona geçince) KIRMIZI. ALT EKRAN (ALT): SOL=Sıcaklık °C, SAĞ=Toplam debi L → TURUNCU.
      //   Operation LED üst-ortada çıkış ON'da yanar. Birimler GERÇEK cihazda SABİT (MPa/L/min/°C/L — i18n YOK; donanım sabiti).
      const ro2 = readoutRef.current
      const hub = displays[0]
      if (hub) {
        const rx = dx + hub.x * dw, ry = dy + hub.y * dh, rw = hub.w * dw, rh = hub.h * dh
        // KÖŞE RADÜSÜ — GERÇEK ekrandan FOTO-ÖLÇÜM (tools: ams-flow.png koyu cam maskesi): gerçek radüs ~6px / min ≈ 0.06.
        //   Eskiden 0.18 idi (3× fazla yuvarlak → köşeler gerçekten sapıyordu). Artık gerçek ekranla birebir oturur.
        const rad = Math.min(rw, rh) * 0.06
        const rnd = !!(ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect
        ctx.fillStyle = 'rgb(6,9,13)'
        if (rnd) { ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, rad); ctx.fill() } else ctx.fillRect(rx, ry, rw, rh)
        ctx.strokeStyle = 'rgba(110,150,200,0.5)'; ctx.lineWidth = 1
        if (rnd) { ctx.beginPath(); ctx.roundRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1, rad); ctx.stroke() } else ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1)

        const mainCol: RGB = ro2.mainRed ? LCD_RED : LCD_GREEN
        // Mehmet Abi: "rakamlar köşelere yanaşsın, birbirinden ayrı dursun, biraz daha büyük + çok rahat."
        //   → 4-KÖŞE YERLEŞİMİ: SOL sütun SOLA, SAĞ sütun SAĞA yaslı → 4 değer ZIT köşelere çekilir (maksimum ayrım,
        //     köşelere yanaşık). Eski tasarım sol sütunu MERKEZE sağa-hizalıyordu → değerler ortaya toplanıyordu.
        //   → RAKAM BOYU CANLI değerden DEĞİL, SABİT referanstan ölçülür → totalizer (toplam debi) hane sayısı artsa bile
        //     rakamlar KÜÇÜLMEZ. ("Daha önce güzeldi, sonradan bozuldu" = totalizer uzayınca tüm 7-seg küçülüyordu; kök neden buydu.)
        const pad = Math.min(rw, rh) * 0.03          // kenar boşluğu küçük → grid camın köşelerine yanaşır (Mehmet Abi: köşelere it)
        const ix = rx + pad, iy = ry + pad, iw = rw - pad * 2, ih = rh - pad * 2
        const rowH = ih / 2
        const GLOW = 0.1                             // LED hâlesi ÇOK KISIK → keskin, haneler karışmaz
        const edge = iw * 0.045                      // yan kenar payı (Mehmet Abi: "yan kenarlardan birazcık mesafe") → rakamlar kenara değmez
        const leftX = ix + edge                      // SOL sütun SOLA yaslı  → basınç(üst) + sıcaklık(alt) SOL köşelerde
        const rightX = ix + iw - edge                // SAĞ sütun SAĞA yaslı → debi(üst) + toplam(alt) SAĞ köşelerde
        // GERÇEK cihaz çözünürlüğü ile değer string'leri (totalizer 5 hane ile sınırlı → en geniş sabit referansla uyumlu)
        const pStr = ro2.pressure != null ? ro2.pressure.toFixed(3) : '---'   // basınç 0.200
        const fStr = ro2.flow != null ? String(Math.round(ro2.flow)) : '---'  // anlık debi 300
        const tStr = ro2.temp != null ? ro2.temp.toFixed(1) : '---'           // sıcaklık 26.5
        // GUARD: accumL non-finite olursa (NaN) 7-seg cizemez → sag-alt BOS gorunur (saha "gorunmuyor" sikayetinin olasi kaynagi).
        //   → daima sonlu bir string; en kotu halde "0". Boylece totalizer ASLA bos kalmaz.
        const aStr = Number.isFinite(accumL) ? String(Math.floor(accumL) % 100000) : '0'   // toplam debi (totalizer; ≤5 hane → taşmaz/küçültmez)
        // RAKAM BOYU — SABİT referanstan (tüm 7-seg AYNI boyut, gerçek cihaz). SOL en geniş "0.200", SAĞ en geniş 5-hane "88888".
        //   → digH artık canlı veriye bağlı DEĞİL → zamanla küçülmez/oynamaz (kararlı/sabit görünüm).
        const REF_L = measureSevenSeg('0.200', 1)    // sol sütun en geniş sabit referans
        const REF_R = measureSevenSeg('88888', 1)    // sağ sütun (totalizer) en geniş sabit referans
        const centerCh = iw * 0.05                   // merkez kanal (sığdırma payı) DARALTILDI → sütunlar genişler → rakam BÜYÜR (ayrım köşe-yaslamadan gelir)
        const colTotal = iw - edge * 2 - centerCh    // iki sütunun paylaştığı genişlik (referans oranında bölünür → eşit digH)
        const leftColW = colTotal * REF_L / (REF_L + REF_R)
        const rightColW = colTotal * REF_R / (REF_L + REF_R)
        const hBudget = rowH * 0.50                  // dikey rakam bütçesi (Mehmet Abi: 0.50 yap)
        const digH = Math.min(hBudget, leftColW / REF_L, rightColW / REF_R)   // tek boy; genişlik İZİN verir, yükseklik tavanı koyar
        // DİKEY KONUM (gerçek foto-oran): üst satır AYNI Y, alt satır AYNI Y. Birimler boşluklara serpiştirilir (üst-üste binmez):
        //   MPa üst-sol değerin ÜSTÜNDE; L/min üst-sağ değerin ALTINDA (satır arası sağ boşluk); °C/L alt değerlerin ALTINDA.
        const uf = Math.max(6, digH * 0.30)          // birim fontu KÜÇÜLTÜLDÜ → dikey yer açıldı → rakam daha BÜYÜK olabildi
        const topNumY = iy + ih * 0.12               // üst satır YUKARI çekildi (üstte MPa + kenar payı tam sığar)
        const botNumY = iy + ih * 0.575              // alt satır — satır arası L/min'e boşluk + altta °C/L pad içinde kalır (taşma/kesilme yok)

        const unit = (txt: string, ux: number, uy: number, col: RGB, align: CanvasTextAlign) => {
          ctx.font = `700 ${uf}px ui-sans-serif, system-ui, sans-serif`
          ctx.textAlign = align; ctx.textBaseline = 'alphabetic'
          ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},0.95)`   // net/parlak — birim okunur
          ctx.fillText(txt, ux, uy)
        }

        // TL: Basınç (SOL köşe, SOLA yaslı) — "MPa" değerin ÜSTÜNDE-solunda
        drawSevenSeg(ctx, pStr, leftX, topNumY, digH, mainCol, { glow: GLOW, align: 'left' })
        unit('MPa', leftX, topNumY - uf * 0.32, mainCol, 'left')
        // TR: Anlık debi (SAĞ köşe, SAĞA yaslı) — "L/min" ALTINDA-sağında (satır arası sağ boşluk)
        drawSevenSeg(ctx, fStr, rightX, topNumY, digH, mainCol, { glow: GLOW, align: 'right' })
        unit('L/min', rightX, topNumY + digH + uf * 1.0, mainCol, 'right')
        // BL: Sıcaklık (SOL köşe, SOLA yaslı) — TURUNCU; "°C" değerin ALTINDA-solunda
        drawSevenSeg(ctx, tStr, leftX, botNumY, digH, LCD_AMBER, { glow: GLOW, align: 'left' })
        unit('°C', leftX, botNumY + digH + uf * 1.0, LCD_AMBER, 'left')
        // BR: Toplam debi/totalizer (SAĞ köşe, SAĞA yaslı) — TURUNCU; "L" değerin ALTINDA-sağında
        drawSevenSeg(ctx, aStr, rightX, botNumY, digH, LCD_AMBER, { glow: GLOW, align: 'right' })
        unit('L', rightX, botNumY + digH + uf * 1.0, LCD_AMBER, 'right')

        // Operation LED — üst-ortada küçük nokta; çıkış ON (standby/izolasyon) yanar (foto/kılavuz: "indicates output status of OUT")
        {
          const lx = rx + rw / 2, ly = ry + rh * 0.08, lr = Math.max(1, rh * 0.028)
          if (ro2.mainRed) { ctx.shadowColor = 'rgba(255,80,40,0.8)'; ctx.shadowBlur = lr * 2.4; ctx.fillStyle = 'rgba(255,84,44,0.95)' }
          else ctx.fillStyle = 'rgba(90,110,120,0.3)'
          ctx.beginPath(); ctx.arc(lx, ly, lr, 0, Math.PI * 2); ctx.fill()
          ctx.shadowBlur = 0
        }
        // (Sağ dekoratif ikon şeridi KALDIRILDI — Mehmet Abi: "rakamlar köşelere yanaşsın." Sağ sütun değerleri artık sağ kenara
        //   yaslı; küçük kutu/ok ikonları rakamlarla çakışıyordu + sahada okunabilirliğe katkısı yoktu. Köşe ferahlığı öncelik.)
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
      }

      // 9b) REGÜLATÖR KIRMIZI dijital ekranı CANLI — orijinal yapı KORUNUR (foto çerçeve/etiketler kalır); statik ".200" gizlenip
      //   yerine CANLI basınç (MPa, kırmızı 7-seg, lider sıfırsız ".62" stili) yazılır. Mehmet Abi: "kendi göstergesi ama canlı".
      if (dType === 'A') { // dijital kırmızı LCD: SADECE Tip A (E/P). Tip B → AR regülatör (kendi analog saati) → dijital gizli.
        const pPa = readoutRef.current.pressure
        if (pPa != null) {
          let pv = pPa.toFixed(3)             // regülatör ekranı: MPa, 3 hane (gerçek E/P ekranı foto: ".287")
          if (pv.startsWith('0.')) pv = pv.slice(1)
          const gx = dx + dw * REG_DISP[0], gy = dy + dh * REG_DISP[1], gw = dw * REG_DISP[2], gh = dh * REG_DISP[3]
          // KÖŞE RADÜSÜ — debimetreyle AYNI optimizasyon (Mehmet Abi: "köşe radüsüne kadar uygula"): kırpma KALDIRILDI → oranlı,
          //   küçük kenara (min) bağlı → ekran köşesiyle örtüşür. Ayrıca ince BEZEL (gerçek ekran kenarı) + simetrik padding.
          const gRad = Math.min(gw, gh) * 0.30
          const gRnd = !!(ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect
          ctx.fillStyle = 'rgb(30,23,19)' // ekran camını BİREBİR eşle (foto-ölçüm medyan rgb) → statik ".200" tamamen gizlenir
          if (gRnd) { ctx.beginPath(); ctx.roundRect(gx, gy, gw, gh, gRad); ctx.fill() } else ctx.fillRect(gx, gy, gw, gh)
          // ince bezel — koyu kırmızımsı kenar (debimetredeki çerçeve mantığı; foto çerçevesini bozmadan ekran camı hissi)
          ctx.strokeStyle = 'rgba(120,40,46,0.45)'; ctx.lineWidth = 0.75
          if (gRnd) { ctx.beginPath(); ctx.roundRect(gx + 0.4, gy + 0.4, gw - 0.8, gh - 0.8, gRad); ctx.stroke() }
          // FOTO-BİREBİR (Mehmet abi gerçek IO-Link E/P REGULATOR ekranı fotosu): rakamlar GERÇEK 7-SEGMENT LED —
          //   düz monospace yazı yerine drawSevenSeg → fotodaki kırmızı dijitlerin segment hissi + lider-sıfırsız ".287" stili.
          // RENK: VİŞNE kırmızısı (Mehmet abi: "kırmızı vişne renk yap") — derin/koyu kızıl, turuncuya/parlağa kaçmaz; glow kısık.
          const segCol: RGB = [172, 26, 50]                          // vişne (deep cherry) — yeşil/mavi düşük, kızıl baskın
          // ÜRÜN-ŞEKLİ (Mehmet abi: "ürüne göre şeklini ayarla"): gerçek E/P regülatör dijiti hub'ınkinden GENİŞ/DOLGUN → ekranı
          //   daha çok doldurur. Bu metrik SADECE regülatöre geçer; debimetre LCD'si (override'sız) BİT BİT AYNI kalır.
          const segM = { digitW: 0.54, dotW: 0.30, gap: 0.10, thick: 0.15 }
          const segW1 = measureSevenSeg(pv, 1, segM) || 1           // birim-yükseklikte genişlik → ölçekli sığdırma (hangi değer olursa taşmaz)
          const segH = Math.min(gh * 0.80, (gw * 0.92) / segW1)     // hem dikey hem yatay sığar (en büyük okunur boy; ekranı dolu doldurur)
          // YÖN: Mehmet abi "ters çevir" → 180° rotation KALDIRILDI (düz/upright). Ekran camına ortalı. (gözle DOĞRULANIR — screenshot)
          ctx.save()
          ctx.translate(gx + gw / 2, gy + gh / 2)
          drawSevenSeg(ctx, pv, -measureSevenSeg(pv, segH, segM) / 2, -segH / 2, segH, segCol, { glow: 0.38, ...segM })
          ctx.restore()
        }
      }

      // 9b-B) TİP B (elle-ayar regülatör) — dijital ekran yerine ÇALIŞAN ANALOG BASINÇ SAATİ: 270° SMC kare-gömme manometre,
      //   İĞNE CANLI BASINÇLA (Mehmet abi referans görseli). Saat kendi gövdesiyle bütün (foto-overlay DEĞİL → temiz, kırık görüntü yok).
      if (dType === 'B' && DEVICE_B_GAUGE_ENABLED) {
        const gcx = dx + dw * GAUGE_B_POS[0], gcy = dy + dh * GAUGE_B_POS[1], gr = dw * GAUGE_B_POS[2]
        drawAnalogGauge(ctx, gcx, gcy, gr, (readoutRef.current.pressure ?? 0) / 1.0, 1.0, pc ? `rgb(${pc[0]},${pc[1]},${pc[2]})` : '#36E0C8')
      }

      // 9c) DURUM LED'leri CANLI (Mehmet Abi: "üründeki tüm LED ekran/ışıklar gerçekte çalıştığı gibi olsun; gerçek görünümden şaşma"):
      //   Konum/renk FOTO-ÖLÇÜM (parlak blob centroid + ince ızgara, tools/_diag) → birebir. Foto zaten gerçek normal durumu gösterir
      //   (SF kapalı=arıza yok, BF/PWR yeşil, MODE/SIG amber) → aynı renk/konum korunur, üzerine CANLILIK: SIG sinyal verisiyle nabız,
      //   COMM IO-Link trafiğiyle blink; PWR/POWER/BF/MODE sabit (hafif shimmer). Off/dim'de foto LED'i koyu noktayla örtülür.
      {
        // Parlaklık OPTİMİZE (Mehmet Abi: "gerçek üründen parladığı gibi — ne çok ne az"): renkler foto tonuna yaklaştırıldı,
        //   yarıçap foto LED boyutuna indirildi, glow+çekirdek kısıldı → kompakt, lit ama abartısız (foto LED'leriyle yan yana doğrulandı).
        const GRN: RGB = [150, 214, 150]                 // yeşil LED (foto-ölçüm tonu, yumuşak/lit)
        const AMB: RGB = [228, 188, 112]                 // amber LED (foto-ölçüm tonu)
        const rHub = Math.max(1.4, dw * 0.0038)          // hub LED yarıçapı (foto blob boyutu — kompakt)
        const rReg = Math.max(1.2, dw * 0.0032)          // regülatör LED'i biraz daha küçük (foto-ölçüm)
        const rPort = Math.max(1.4, dw * 0.0042)         // merkez modül PORT LED'i (foto-ölçüm: dot ~0.0042R)
        // YANIP-SÖNME MODELİ (Mehmet Abi: "COMM LED'in konum+şiddeti çok güzel; diğerlerini ona göre optimize et; her LED GERÇEK
        //   görevini yapsın"). COMM nabzı = referans "veri blink"i. GERÇEK işlev: güç/durum (PWR/POWER/BF/MODE) SABİT yanar (kesintisiz;
        //   yanıp sönerse arıza/kopma gibi görünür); haberleşme/sinyal/port (COMM/SIG/PORT1/PORT2) COMM tarzı BLINK — her biri farklı
        //   faz/hız (bağımsız veri akışı, kilitlenmiş değil). SF arıza yok → kapalı.
        // GERÇEK-VERİ TAHRİKLİ (Mehmet Abi: "gerçekten gerçek veriye göre mi yanıyor?"). Eskiden sahte sin() timer'dı; ARTIK reading
        //   paket akışına bağlı: COMM/POWER/PORT gerçek paket sayacıyla blink (veri DURURSA söner = gerçek haberleşme göstergesi),
        //   SIG parlaklığı gerçek DEBİYE bağlı, BF gerçek haberleşme durumuna bağlı. PWR/MODE = güç/mod → SABİT (veriden bağımsız).
        const d = dataRef.current
        const dataFlowing = (now - d.lastT) < 600    // son 600ms'de paket geldi mi = gerçek haberleşme var mı
        const pkt = d.n                              // gerçek paket sayısı (her reading +1)
        const beat = (period: number, on: number, ph: number) => (dataFlowing && ((pkt + ph) % period) < on ? 1 : 0.06)  // gerçek pakete bağlı blink
        const steady = 0.92 + 0.08 * Math.sin(now * 0.004)                 // güç/mod LED'i: her zaman yanık (güç ⟂ veri)
        const commI = beat(5, 3, 0)          // COMMUNICATION — gerçek paket akışı (veri durursa söner)
        const powI = beat(5, 3, 2)           // POWER — COMM ile aynı stil (Mehmet Abi), hafif faz farkı
        const sigI = dataFlowing && (pkt % 4 < 2) ? (0.32 + 0.68 * sig.flow) : 0.06  // SIG — blink + parlaklık GERÇEK debiye bağlı
        const p1I = beat(6, 3, 0)            // PORT1 — gerçek paket akışı (bağımsız periyot)
        const p2I = beat(7, 3, 3)            // PORT2 — gerçek paket akışı (bağımsız periyot)
        const bfI = dataFlowing ? steady : 0.30   // BF — bus OK: veri akarken yeşil, haberleşme koparsa söner
        const lighten = (c: number) => Math.round(c + (255 - c) * 0.5)  // sıcak merkez için açık ton
        const dot = (fx: number, fy: number, col: RGB, lit: number, r: number) => {
          const cx = dx + dw * fx, cy = dy + dh * fy
          if (lit > 0.06) {
            // 1) yumuşak hale (glow)
            ctx.save()
            ctx.shadowColor = `rgba(${col[0]},${col[1]},${col[2]},${0.5 * lit})`
            ctx.shadowBlur = r * 2.0
            // 2) NEREDEYSE OPAK lens → altındaki foto'nun KOYU deliği görünmez. (Yarı-saydam olunca orta koyu kalıp "halka / 2 ışık"
            //    görünüyordu — Mehmet Abi'nin bildirdiği hata.) Tam yanıkta opak.
            ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${Math.min(1, 0.82 + 0.25 * lit)})`
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
            ctx.restore()
            // 3) sıcak AÇIK merkez → DOLU lit LED hissi (halka değil, ortası parlak)
            ctx.fillStyle = `rgba(${lighten(col[0])},${lighten(col[1])},${lighten(col[2])},${0.6 * lit})`
            ctx.beginPath(); ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2); ctx.fill()
          } else {
            ctx.fillStyle = 'rgba(24,27,33,0.92)'                        // sönük: foto LED'ini koyu noktayla ört
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
          }
        }
        // Hub durum LED satırı (y=0.404 foto-ölçüm). SF foto'da zaten kapalı (arıza yok) → DOKUNULMAZ (şaşma yok).
        dot(0.504, 0.404, GRN, bfI, rHub)      // BF   — bus OK (veri akarken yeşil, haberleşme koparsa söner)
        dot(0.519, 0.404, GRN, steady, rHub)   // PWR  — güç var → yeşil SABİT
        dot(0.535, 0.404, AMB, steady, rHub)   // MODE — mod → amber SABİT
        dot(0.551, 0.404, AMB, sigI, rHub)     // SIG  — sinyal/veri → COMM tarzı BLINK
        // Regülatör LED'leri (foto-ölçüm çekirdek merkezi: COMM x0.230, POWER x0.254, y0.476). İKİSİ DE solid + blink → birebir eşleşir.
        if (dType === 'A') { // ITV regülatör LED'leri — SADECE Tip A (Tip B AR elle-ayar → IO-Link LED yok)
          dot(0.230, 0.476, GRN, commI, rReg)    // COMMUNICATION — IO-Link BLINK (referans)
          dot(0.254, 0.476, GRN, powI, rReg)     // POWER — soldaki (COMM) ile AYNI: solid yapı + blink + yuvada tam ortalı
        }
        // Merkez modül PORT durum LED'leri (foto-ölçüm x0.487/0.553, y0.522). IO-Link port trafiği → COMM tarzı blink.
        dot(0.487, 0.522, GRN, p1I, rPort)     // PORT1 — IO-Link port → COMM tarzı BLINK
        dot(0.553, 0.522, GRN, p2I, rPort)     // PORT2 — IO-Link port → COMM tarzı BLINK
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf); ro.disconnect()
      canvas.removeEventListener('contextlost', onCtxLost)
      canvas.removeEventListener('contextrestored', onCtxRestored)
      if (img) img.onload = null // foto gec yuklenirse unmount sonrasi bos is yapmasin
      saveAccum(accumL)          // totalizer son degeri kalici
    }
  }, [])

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
