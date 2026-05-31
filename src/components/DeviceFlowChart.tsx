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

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

// Cihaz canvas'i neredeyse doldurur (kirpilmis icerik → cok BUYUK)
const DEV_FILL = 0.985
// KABLO KIRPMA (Mehmet Abi): alttan sarkan kabloyu kes → cihaza yer açılır. Çizilen kaynak yükseklik oranı (üst kısım).
const CABLE_CROP = 0.74
// CİHAZI AŞAĞI AL (Mehmet Abi: bu kadar yukarıda olmasın). Görünen bölge dikey ORTALANIR + bu kadar (H oranı) aşağı kayar.
const DEV_DROP = 0.02
// DEBİMETRE ODAKLI hafif zoom (Mehmet Abi): dış çerçeve/oranlar SABİT, içerik LCD'ye doğru birazcık büyür
const ZOOM = 1.12
const FOCUS_U = 0.49, FOCUS_V = 0.205   // debimetre LCD merkezi (zoom odağı; image #1)
// Fallback port ekseni/capi/uclari (olcum tutmazsa)
const FB_AXIS = 0.19, FB_PIPE = 0.06, FB_IN = 0.03, FB_OUT = 0.95  // image #1 (AMS40A): hava yolu ÜSTTE (yatay manifold)
// Hub LCD camı (tum-foto orani) — FOTO-ÖLÇÜM (tools/_lcdalign.py: morfolojik kapama + en büyük koyu bileşen → gerçek cam sınırı).
//   Mehmet Abi: "overlay ölçüleri gerçek ekranla TAM örtüşsün" → değerler artık ekranın TAM içinde (eski kutu sağdan tuşlara taşıyordu).
const FB_DISPLAYS = [{ x: 0.4304, y: 0.1742, w: 0.1414, h: 0.0842 }]  // image #1: üst-orta dijital monitör LCD (gerçek camla BİREBİR — foto-ölçüm; Mehmet Abi onayladı)
// PDF'e gore modul bolgeleri (tum-foto x/y orani)
const REG_FRAC: [number, number] = [0.155, 0.305] // standby/oransal regülatör — regüle hücresi (Mehmet Abi: biraz genişletildi)
const REG_DISP: [number, number, number, number] = [0.198, 0.450, 0.073, 0.022] // regülatör KIRMIZI dijital LCD (image #1, foto-ölçüm) [x,y,w,h]
const VALVE_CX = 0.74                            // tahliye valfi merkezi (image #1: sağ modül)
const EXHAUST_CX = 0.76, EXHAUST_CY = 0.335      // egzoz = valf orta-ekseninin BİRAZ SAĞINDAKİ siyah parça (Mehmet Abi); hava AŞAĞI atılır
// PDF LED konumu (tum-foto orani): SADECE regülatör POWER LED'i (valf LED'i Mehmet Abi kararıyla KALDIRILDI).
const LED_REG: [number, number] = [0.258, 0.478]  // regülatör POWER LED (image #1: ekranın ALTINDA, foto-ölçüm) — YEŞİL, devredeyken parlar

const FLOW_COUNT = 224       // akan molekül sayısı — Mehmet Abi: çoğaltıldı (160→224)
const FLOW_LANES = 14        // paralel laminar şerit; aynı şeritteki moleküller AYNI hızda → asla karışmaz
const MOLE_COUNT = 120   // regülatör sıkışma molekülleri — Mehmet Abi: daha çok kendini belli etsin (çoğaltıldı)
const DROPLET_MAX = 60
const PUFF_COUNT = 80   // egzoz jeti yoğunluğu — Mehmet Abi: izler bindirsin (bağlantılı/sürekli görünsün)

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
  const colorRef = useRef({ flow: [46, 155, 255], pressure: [54, 224, 200], hum: [124, 224, 255] as number[] })
  // Cihaz LCD'lerine basilacak GERÇEK rakamlar (deger + birim + renk) — PDF: hub ekrani basinc/debi/sicaklik gosterir
  const readoutRef = useRef<{ label: string; value: string; unit: string; rgb: number[] }[]>([])
  {
    const nv = (k: string) => { const m = byKey[k]; return !m || !reading ? 0 : clamp01((m.get(reading) - m.min) / (m.max - m.min)) }
    targetRef.current = { flow: nv('flow'), pressure: nv('pressure'), temp: nv('temperature'), hum: nv('humidity'), mode }
    if (byKey.flow) colorRef.current.flow = hexRGB(byKey.flow.color)
    if (byKey.pressure) colorRef.current.pressure = hexRGB(byKey.pressure.color)
    if (byKey.humidity) colorRef.current.hum = hexRGB(byKey.humidity.color)
    // Ekran satirlari (hub LCD): PDF sirasi basinc / debi / sicaklik
    const fmt = (m: MetricDef | undefined) => {
      if (!m || !reading) return null
      const v = m.get(reading)
      return { label: m.name, value: new Intl.NumberFormat('tr-TR', { minimumFractionDigits: m.digits, maximumFractionDigits: m.digits }).format(v), unit: m.unitShort, rgb: hexRGB(m.color) }
    }
    readoutRef.current = [fmt(byKey.pressure), fmt(byKey.flow), fmt(byKey.temperature)].filter(Boolean) as { label: string; value: string; unit: string; rgb: number[] }[]
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
    const img = new Image()
    let deviceCanvas: HTMLCanvasElement | null = null
    let devAR = 1
    const meas = { axis: FB_AXIS, pipe: FB_PIPE, inX: FB_IN, outX: FB_OUT }
    // Tespit edilen dijital ekran dikdortgenleri (tum-foto orani 0..1)
    let displays: { x: number; y: number; w: number; h: number }[] = FB_DISPLAYS
    img.onload = () => {
      devAR = img.width / img.height
      const oc = document.createElement('canvas')
      oc.width = img.width; oc.height = img.height
      const octx = oc.getContext('2d')!
      octx.drawImage(img, 0, 0)
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
    img.src = asset('products/ams-flow.png')   // ÖN-TEMİZ şeffaf PNG (tools/clean-image.py)

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
      dpr = Math.min(3, window.devicePixelRatio || 1)
      W = wrap.clientWidth; H = wrap.clientHeight
      canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr))
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(wrap)

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

    let raf = 0, last = performance.now()
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const t = targetRef.current
      const k = Math.min(1, dt * 4)
      sig.flow += (t.flow - sig.flow) * k; sig.pressure += (t.pressure - sig.pressure) * k
      sig.temp += (t.temp - sig.temp) * k; sig.hum += (t.hum - sig.hum) * k
      const regTarget = t.mode === 'standby' ? 1 : t.mode === 'isolation' ? 0.4 : 0
      const valveTarget = t.mode === 'isolation' ? 1 : 0
      sig.reg += (regTarget - sig.reg) * Math.min(1, dt * 2.5)
      // SOFT-STARTER valfi: basinci KADEMELI verir/keser (ani DEĞİL) → yavaş rampa (dt*0.9)
      sig.valve += (valveTarget - sig.valve) * Math.min(1, dt * 0.9)
      // Egzoz = valf kapanirken cikis basincini KADEMELI tahliye (soft-start): yavasca yukselip biter
      const exTarget = sig.valve * (1 - sig.valve * 0.15) // tam kapaninca tahliye biter (basinc tukendi)
      sig.exhaust += (exTarget - sig.exhaust) * Math.min(1, dt * 1.1)

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
      const inX = dx + dw * meas.inX, outX = dx + dw * meas.outX
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

      // 2) BORU + giris/cikis hortumu (UÇTAN UCA, port ile AYNI EKSEN+ÇAP). Debi renginde hafif kenar.
      const grad = ctx.createLinearGradient(0, top, 0, bot)
      grad.addColorStop(0, cF(0.14)); grad.addColorStop(0.5, dark ? 'rgba(8,16,28,0.05)' : 'rgba(255,255,255,0.05)'); grad.addColorStop(1, cF(0.09))
      ctx.fillStyle = grad; ctx.fillRect(0, top, W, pipeH)
      // BORU CAMI: akış TAM HIZDA olunca (ısı↑ çağrışımı) ÇOK HAFİF kırmızıya meyil. Mehmet Abi: gece çok fazlaydı → kısıldı (tema-duyarlı).
      const glassWarm = (dark ? 0.018 : 0.04) * sig.flow * sig.flow
      if (glassWarm > 0.003) { ctx.fillStyle = `rgba(228,72,56,${glassWarm})`; ctx.fillRect(0, top, W, pipeH) }
      ctx.strokeStyle = cF(0.45); ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(W, top); ctx.moveTo(0, bot); ctx.lineTo(W, bot); ctx.stroke()
      const coupler = (cx: number) => {
        const cwd = Math.max(7, pipeH * 0.2)
        const cgr = ctx.createLinearGradient(0, top, 0, bot)
        cgr.addColorStop(0, 'rgba(196,212,230,0.92)'); cgr.addColorStop(0.5, 'rgba(96,116,140,0.92)'); cgr.addColorStop(1, 'rgba(165,183,203,0.92)')
        ctx.fillStyle = cgr
        if ((ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect) { ctx.beginPath(); ctx.roundRect(cx - cwd / 2, top - 4, cwd, pipeH + 8, 3); ctx.fill() }
        else ctx.fillRect(cx - cwd / 2, top - 4, cwd, pipeH + 8)
      }
      coupler(inX); coupler(outX)

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
      const aK = dark ? 1 : 1.4   // GÜNDÜZ alfa biraz yüksek → translucent mavi açık zeminde net okunur
      ctx.lineCap = 'round'
      for (let i = 0; i < FLOW_COUNT; i++) {
        const lane = fLane[i]
        const prof = 1 - 0.5 * lane * lane   // parabolik laminar hız: merkez hızlı, cidar yavaş (hız YALNIZCA lane'e bağlı)
        const x0 = fPhase[i] * W
        // GERİ AKIŞ (izolasyon): valf SAĞINDAKI trapped basınçlı hava valfe doğru akar, egzozun üstünde DÜZGÜN DİRSEKLE döner ve
        //   egzoz portundan aşağı çıkar. Mehmet Abi: dönüş animasyonu OPTİMİZE → yatay geri-akış → yumuşak çeyrek dirsek (bezier)
        //   → dik iniş; porta yaklaşınca söner, section-7 jeti devralır (kesintisiz/bağlantılı). Tüm faz x ≥ valf (sınıflama temiz).
        if (sig.valve > 0.12 && x0 > valveCx) {
          const exFrac = exOx / W, vFrac = valveCx / W
          const ELBW = 0.08                      // dirsek fphase genişliği
          const elbStart = exFrac + ELBW         // dirsek başlangıcı (egzozun biraz sağı)
          const elbY = axisY + pipeH * 1.35      // dirsek bitiş y (dik inişin başı)
          const off = lane * pr * 0.4            // kesit-içi konum (laminar şerit) — köşede Y→X döner, porta funnel ile daralır
          // FAZ HIZI: yatay HIZLI; dirsek+iniş YAVAŞ (graceful dönüş + iniş görünür olsun)
          let dec = (0.11 + 0.5 * sig.valve) * prof
          if (fPhase[i] <= elbStart) dec *= 0.4
          fPhase[i] -= dec * dt
          if (fPhase[i] <= vFrac) { fPhase[i] = (W - 2) / W; continue } // egzoza indi → çıkış ucuna ışınla (döngü)
          let px: number, py: number, dirx: number, diry: number, fade = 1
          if (fPhase[i] > elbStart) {
            // YATAY geri-akış — kesit Y'de yayılı (şerit), sağdan sola
            px = fPhase[i] * W; py = axisY + off
            dirx = -1; diry = 0
          } else if (fPhase[i] > exFrac) {
            // DİRSEK — bezier çeyrek dönüş; KESİT yayılımı Y→X döner (akış köşeyi dönerken kesiti de döner)
            const tt = (elbStart - fPhase[i]) / ELBW, omt = 1 - tt, p0x = elbStart * W
            const bx = omt * omt * p0x + (1 - omt * omt) * exOx
            const by = axisY + (elbY - axisY) * tt * tt
            px = bx + off * 0.7 * tt              // X yayılımı büyür
            py = by + off * (1 - tt)              // Y yayılımı söner
            dirx = 2 * omt * (exOx - p0x); diry = 2 * tt * (elbY - axisY)
            const m = Math.hypot(dirx, diry) || 1; dirx /= m; diry /= m
          } else {
            // DİK İNİŞ — kesit X'te yayılı, porta doğru FUNNEL ile daralır; porta yaklaşınca söner (jet devralır → bağlantılı)
            const d = clamp01((exFrac - fPhase[i]) / (exFrac - vFrac))
            px = exOx + off * 0.7 * (1 - d)
            py = elbY + (exOy - elbY) * d
            dirx = 0; diry = 1; fade = 1 - d * 0.85
          }
          const a = (0.26 + 0.5 * sig.valve) * (0.5 + 0.5 * prof) * aK * fade
          const len = (6 + 13 * sig.valve) * (0.72 + 0.5 * prof)
          ctx.strokeStyle = cS(a); ctx.lineWidth = 1.2 + 1.4 * prof
          ctx.beginPath(); ctx.moveTo(px - dirx * len, py - diry * len); ctx.lineTo(px, py); ctx.stroke()
          continue
        }
        // NORMAL ileri akış — hız=lane profili (per-molekül rastgele hız YOK) → AYNI lane = AYNI hız → karışma İMKANSIZ
        fPhase[i] += (baseV * prof * 0.5 + 0.006) * dt
        if (fPhase[i] > 1) fPhase[i] -= 1
        const x = fPhase[i] * W
        if (x > valveCx && sig.valve > 0.12) continue   // valf kapanınca çıkış tarafı ileri-akış almaz (yumuşak kesme)
        const y = axisY + lane * pr                      // SABİT şerit (Y salınımı YOK → izler asla kesişmez)
        const a = (0.12 + 0.55 * sig.flow) * (0.5 + 0.5 * prof) * aK   // merkez şerit daha parlak (tüp derinliği)
        const len = (7 + Math.min(baseV, 0.8) * 18) * (0.72 + 0.5 * prof)
        const lw = (1.0 + 1.3 * prof) * (0.62 + sig.flow * 0.7)        // merkez şerit daha kalın
        // ZARİF taper (kare-başı tahsis YOK): soluk uzun kuyruk + parlak kısa baş = molekül başı + hareket izi
        ctx.strokeStyle = cS(a * 0.34); ctx.lineWidth = lw
        ctx.beginPath(); ctx.moveTo(x - len, y); ctx.lineTo(x, y); ctx.stroke()
        ctx.strokeStyle = cS(a); ctx.lineWidth = lw
        ctx.beginPath(); ctx.moveTo(x - len * 0.42, y); ctx.lineTo(x, y); ctx.stroke()
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
        const a = Math.min(0.92, (0.28 + 0.42 * local) + near * 0.12)        // orifiste hafif parlak (yumuşatıldı)
        mol(x, y, sz, a, mRot[i] + now * (0.0004 + 0.0006 * local))          // daha yavaş/sakin dönüş
      }
      ctx.globalCompositeOperation = 'source-over'

      // 5) DEVREYE GİRME halkalari — regülatör (BASINÇ renginde) / valf (turuncu-amber)
      const pulse = now * 0.006
      // Regülatör DEVREYE GİRME halkaları (Mehmet Abi: "valf devreye girince olan yuvarlak animasyonların hepsi regülatörde de olsun") —
      //   TEAL ("Regülatör devrede" rengi), regüle hücresi merkezinde, sig.reg yoğunluğunda. Valfle AYNI drawEngage; farklı faz (sync olmasın).
      const regCx = (regX0 + regX1) / 2
      drawEngage(regCx, axisY, '54,224,200', sig.reg, pulse, markR)                          // regülatör halkası — devredeyken (standby) parlar
      drawEngage(valveCx + dw * 0.045, valveCy, '255,150,40', sig.valve, pulse + 1.5, markR) // valf halkası biraz SAĞ (flow sınırı/egzoz dokunulmadan)

      // 6) NEM — havada SÜSPANSE su buharı/mikro-damlacık (NEM renginde): akışLA birlikte (sol→sağ) sürüklenir, boru kesitine
      //   YAYILIR, hafif salınır. Yoğunluk + tül ∝ nem. Kullanıcı "bu akışta nem var" diye NET anlar.
      //   (Eski: dipte kayan iri damlalar = cam üstü yağmur gibi saçmaydı; akıştaki nemi anlatmıyordu → kaldırıldı, Mehmet Abi.)
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over'
      if (sig.hum > 0.04) { // hafif NEM TÜLÜ — nemli hava hissi (yoğunluk ∝ nem)
        const mistA = (dark ? 0.04 : 0.075) + 0.10 * sig.hum
        const mg = ctx.createLinearGradient(0, top, 0, bot)
        mg.addColorStop(0, cH(0)); mg.addColorStop(0.5, cH(mistA)); mg.addColorStop(1, cH(0))
        ctx.fillStyle = mg; ctx.fillRect(0, top, W, pipeH)
      }
      const humN = Math.round((0.06 + 0.94 * sig.hum) * DROPLET_MAX) // kuru havada birkaç zerre, nemli havada yoğun
      const humDrift = (0.05 + 0.95 * sig.flow) * 0.5 + 0.03          // akışLA sürüklenir (durağanken hafif süzülür)
      for (let i = 0; i < humN; i++) {
        dX[i] += humDrift * (0.7 + dR[i] * 0.06) * dt
        if (dX[i] > 1) dX[i] -= 1
        const bob = Math.sin(now * 0.0016 + dLane[i] * 11) * pipeH * 0.07 // hafif yukarı-aşağı salınım (asılı buhar)
        const x = dX[i] * W
        const y = axisY + (dLane[i] * 2 - 1) * pr * 0.8 + bob             // boru KESİTİNE yayıl (dipte değil)
        const r = 0.85 + dR[i] * 0.4                                       // KÜÇÜK buhar zerresi
        const a = (0.16 + 0.4 * sig.hum) * aK
        // küçük + DÜŞÜK alfa hale (karışmaz) + CRISP parlak çekirdek (her zerre AYRI okunur → yoğun ama net)
        ctx.fillStyle = cH(a * 0.3); ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = cH(Math.min(1, a * 1.7)); ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      // 7) VALF EGZOZU — valf kapanınca ÇIKIŞ basıncı siyah parçadan atılan HAVA jeti (izolasyonda).
      //   "Duman" DEĞİL (Mehmet Abi): HAVA gibi belir→söner. Biraz SAĞA eğilimli, DAHA BÜYÜK, ve akış BÜKÜMÜ düzgün/bağlantılı:
      //   tüm partiküller AYNI parabolik yörüngede (sabit sağa sürüklenme + yerçekimi) → uzun bindirmeli izler sürekli eğri kurar.
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over'
      ctx.lineCap = 'round'
      for (let i = 0; i < PUFF_COUNT; i++) {
        pLife[i] -= dt / (0.55 + Math.random() * 0.35)   // biraz daha uzun ömür → jet uzanır (büyük)
        if (pLife[i] <= 0) {
          if (sig.exhaust > 0.08) {
            const sp = (210 + Math.random() * 150) * (0.6 + sig.exhaust)
            pX[i] = exOx + (Math.random() - 0.5) * Math.max(2, dh * 0.012)  // dar ağız → tutarlı kolon
            pY[i] = exOy
            pVx[i] = -24 + Math.random() * 82   // GENİŞ yelpaze (Mehmet Abi), hafif SAĞA kaymalı; her partikül kendi parabolünde
            pVy[i] = sp * (0.78 + 0.4 * Math.random())
            pLife[i] = 1
          } else continue
        }
        // BÜKÜM: yatay yavaş sürüklenir + yerçekimi aşağı bükülür → düzgün parabol (partiküller aynı eğride → bağlantılı)
        pVx[i] *= 0.992
        pVy[i] = pVy[i] * 0.992 + 88 * dt
        pX[i] += pVx[i] * dt; pY[i] += pVy[i] * dt
        const l = Math.max(0, pLife[i])
        const a = (l < 0.85 ? l : (1 - l) * 6.7) * 0.46 * sig.exhaust   // belir → söner (hava gibi)
        if (a <= 0.01) continue
        const spd = Math.hypot(pVx[i], pVy[i]) || 1
        const vlen = Math.min(34, spd * dt * 2.4 + 6)   // DAHA BÜYÜK iz (uzun → bindirir → sürekli akış)
        const ux = pVx[i] / spd, uy = pVy[i] / spd
        ctx.strokeStyle = `rgba(206,226,255,${a})`; ctx.lineWidth = 1.7
        ctx.beginPath(); ctx.moveTo(pX[i] - ux * vlen, pY[i] - uy * vlen); ctx.lineTo(pX[i], pY[i]); ctx.stroke()
      }
      ctx.globalCompositeOperation = 'source-over'

      // 8) CİHAZ LED'i — REGÜLATÖR güç/durum LED'i (valf LED'i kaldırıldı): devredeyse (standby) yeşil yanıp söner.
      // SADECE REGÜLATÖR LED'i (Mehmet Abi: valf LED'i kaldırıldı). KONUM SABİT (LED_REG); ÇOK KÜÇÜK + gerçekçi, YANIP SÖNER.
      //   Devredeyken (standby/iso) yeşil nabız, boştayken sönük.
      {
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

      // 9) CİHAZ LCD'si (debimetre/hub ekranı) — Mehmet Abi: "ilk çalışırkenki dijital hali en iyisiydi" → o orijinal düzene dönüldü.
      //   Koyu LCD cam + 3 satır (Basınç/Debi/Sıcaklık) sağa yaslı BÜYÜK canlı rakam + birim; satır arası ayraç.
      //   KÖŞE RADÜSÜ (Mehmet Abi: "köşesindeki radüslere kadar tam örtüşsün"): gerçek ekran köşeleri belirgin yuvarlak → rad=rh*0.16;
      //   çerçeve de roundRect (kare strokeRect KALDIRILDI → köşeler birebir oturur).
      const ro2 = readoutRef.current
      const hub = displays[0]
      if (hub && ro2.length) {
        const rx = dx + hub.x * dw, ry = dy + hub.y * dh, rw = hub.w * dw, rh = hub.h * dh
        // KÖŞE RADÜSÜ YENİDEN OPTİMİZE (Mehmet Abi): KÜÇÜK kenara (min) bağlı → ekranın gerçek köşesiyle örtüşür (yükseklik tek başına
        //   sürüklemesin); regülatör ekranıyla AYNI mantık (oran 0.18). Çerçeve de aynı radüsle yuvarlak.
        const rad = Math.min(rw, rh) * 0.18
        const rnd = !!(ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect
        // koyu LCD cam (gerçek ekran gibi) + ince çerçeve — ikisi de YUVARLAK köşeli (fotodaki ekranla örtüşür).
        // TAM OPAK (Mehmet Abi: foto'nun statik çok-kolonlu değeri ".200/265" camdan SIZIP HAYALET yapıyordu → tam opak cam onu TAMAMEN gizler).
        ctx.fillStyle = 'rgb(5,10,20)'
        if (rnd) { ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, rad); ctx.fill() } else ctx.fillRect(rx, ry, rw, rh)
        ctx.strokeStyle = 'rgba(110,150,200,0.55)'; ctx.lineWidth = 1
        if (rnd) { ctx.beginPath(); ctx.roundRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1, rad); ctx.stroke() } else ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1)
        const rows = ro2.slice(0, 3)
        // KONUM OPTİMİZE (Mehmet Abi): satırlar dikey ortalı + ekran içine simetrik PADDING (üst/alt eşit) → ekran kenarına yapışmaz.
        const padX = rw * 0.10                       // yatay iç boşluk (biraz arttı → rakam kenara değmez)
        const padY = rh * 0.10                       // dikey iç boşluk (üst+alt eşit → satırlar dikey ortalı)
        const lh = (rh - padY * 2) / rows.length
        ctx.textBaseline = 'middle'
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i], cy = ry + padY + lh * (i + 0.5)
          const [rr, gg, bb] = r.rgb
          // ayraç çizgi (satırlar arası, gerçek segment ekran hissi)
          if (i > 0) { ctx.strokeStyle = 'rgba(120,160,210,0.18)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(rx + padX, ry + padY + lh * i); ctx.lineTo(rx + rw - padX, ry + padY + lh * i); ctx.stroke() }
          // CANLI rakam + birim — ekranda YATAY ORTALI (Mehmet Abi: değerler sağa yaslıydı, sol yarı boş kalıyordu → grup ortalanır, dengeli).
          const fs = Math.max(8, Math.min(lh * 0.72, rw * 0.205))
          const uf = Math.max(6, fs * 0.46)
          const gap = fs * 0.22
          ctx.font = `800 ${fs}px ui-monospace, Menlo, monospace`
          const vw = ctx.measureText(r.value).width
          ctx.font = `600 ${uf}px ui-monospace, Menlo, monospace`
          const uw = ctx.measureText(r.unit).width
          const startX = rx + Math.max(padX, (rw - (vw + gap + uw)) / 2)   // value+unit grubu ekranda ORTALI (taşmazsa)
          ctx.textAlign = 'left'
          // CANLI rakam — SÖNÜK glow (Mehmet Abi: çok ışık saçmasın); rakam rengi hafif düşük (×0.86)
          ctx.font = `800 ${fs}px ui-monospace, Menlo, monospace`
          ctx.shadowColor = `rgba(${rr},${gg},${bb},0.45)`; ctx.shadowBlur = fs * 0.18
          ctx.fillStyle = `rgb(${Math.round(rr * 0.86)},${Math.round(gg * 0.86)},${Math.round(bb * 0.86)})`
          ctx.fillText(r.value, startX, cy)
          ctx.shadowBlur = 0
          // birim — rakamın hemen sağında
          ctx.font = `600 ${uf}px ui-monospace, Menlo, monospace`
          ctx.fillStyle = `rgba(${rr},${gg},${bb},0.72)`
          ctx.fillText(r.unit, startX + vw + gap, cy)
        }
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
      }

      // 9b) REGÜLATÖR KIRMIZI dijital ekranı CANLI — orijinal yapı KORUNUR (foto çerçeve/etiketler kalır); statik ".200" gizlenip
      //   yerine CANLI basınç (MPa, kırmızı 7-seg, lider sıfırsız ".62" stili) yazılır. Mehmet Abi: "kendi göstergesi ama canlı".
      {
        const pv0 = readoutRef.current[0]
        if (pv0) {
          let pv = pv0.value.replace(',', '.')
          if (pv.startsWith('0.')) pv = pv.slice(1)
          const gx = dx + dw * REG_DISP[0], gy = dy + dh * REG_DISP[1], gw = dw * REG_DISP[2], gh = dh * REG_DISP[3]
          // KÖŞE RADÜSÜ — debimetreyle AYNI optimizasyon (Mehmet Abi: "köşe radüsüne kadar uygula"): kırpma KALDIRILDI → oranlı,
          //   küçük kenara (min) bağlı → ekran köşesiyle örtüşür. Ayrıca ince BEZEL (gerçek ekran kenarı) + simetrik padding.
          const gRad = Math.min(gw, gh) * 0.30
          const gRnd = !!(ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect
          ctx.fillStyle = 'rgb(50,53,59)' // ekran koyu camını eşle → statik rakamı gizle (çerçeve foto'dan kalır)
          if (gRnd) { ctx.beginPath(); ctx.roundRect(gx, gy, gw, gh, gRad); ctx.fill() } else ctx.fillRect(gx, gy, gw, gh)
          // ince bezel — koyu kırmızımsı kenar (debimetredeki çerçeve mantığı; foto çerçevesini bozmadan ekran camı hissi)
          ctx.strokeStyle = 'rgba(120,40,46,0.45)'; ctx.lineWidth = 0.75
          if (gRnd) { ctx.beginPath(); ctx.roundRect(gx + 0.4, gy + 0.4, gw - 0.8, gh - 0.8, gRad); ctx.stroke() }
          const fs = Math.max(7, Math.min(gh * 0.78, gw * 0.26))   // padding payı → rakam kenara değmez (debimetre gibi)
          // Regülatör TERS monteli (Mehmet Abi) → rakamlar 180° döndürülür; DAHA KOYU kırmızı.
          ctx.save()
          ctx.translate(gx + gw / 2, gy + gh / 2)
          ctx.rotate(Math.PI)
          ctx.font = `800 ${fs}px ui-monospace, Menlo, monospace`
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
          // VİŞNE KIRMIZISI + SÖNÜK (Mehmet Abi): turuncu-kırmızıdan koyu, mora çalan kızıla; debimetreyle AYNI optimizasyon
          //   (glow kısık: 0.4→0.16 + alfa 0.85→0.4 → çok ışık saçmaz). İki geçiş: yumuşak hale + keskin çekirdek (net okunur).
          ctx.shadowColor = 'rgba(120,8,28,0.4)'; ctx.shadowBlur = fs * 0.16
          ctx.fillStyle = 'rgba(150,18,42,0.55)'
          ctx.fillText(pv, 0, 0)
          ctx.shadowBlur = 0
          ctx.fillStyle = 'rgb(158,20,46)'   // vişne kırmızısı çekirdek
          ctx.fillText(pv, 0, 0)
          ctx.restore()
        }
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
