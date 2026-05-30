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
 *           Modül LED'leri çalışma durumuna göre KENDİ renkleriyle yanıp söner (hub=yeşil RUN nabız + mavi COMM; regülatör=yeşil
 *           standby'da; valf=amber izolasyonda). Valf = SOFT-STARTER (kademeli verir/keser; ani değil) → yumuşak rampa.
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
// DEBİMETRE ODAKLI hafif zoom (Mehmet Abi): dış çerçeve/oranlar SABİT, içerik LCD'ye doğru birazcık büyür
const ZOOM = 1.12
const FOCUS_U = 0.49, FOCUS_V = 0.205   // debimetre LCD merkezi (zoom odağı; image #1)
// Fallback port ekseni/capi/uclari (olcum tutmazsa)
const FB_AXIS = 0.19, FB_PIPE = 0.06, FB_IN = 0.03, FB_OUT = 0.95  // image #1 (AMS40A): hava yolu ÜSTTE (yatay manifold)
// Fallback dijital ekran dikdortgenleri (tum-foto orani) — tespit tutmazsa (hub LCD + ikincil)
const FB_DISPLAYS = [{ x: 0.41, y: 0.165, w: 0.16, h: 0.095 }]  // image #1: üst-orta dijital monitör LCD
// PDF'e gore modul bolgeleri (tum-foto x/y orani)
const REG_FRAC: [number, number] = [0.12, 0.34] // standby/oransal regülatör (basınç regüle bölgesi)
const REG_CX = 0.22                              // regülatör merkezi (devrede halkası)
const VALVE_CX = 0.74                            // tahliye valfi merkezi (image #1: sağ modül)
const EXHAUST_CX = 0.76, EXHAUST_CY = 0.335      // egzoz = valf orta-ekseninin BİRAZ SAĞINDAKİ siyah parça (Mehmet Abi); hava AŞAĞI atılır
// PDF LED konumlari (tum-foto orani; araştırma OMA1007/EXA1/VP): hub LCD altı 5'li satır + port LED + valf konnektör kırmızı + regülatör 2 yeşil
const LED_VALVE: [number, number] = [0.72, 0.31]  // valf solenoid konnektör LED (image #1: sağ modül alt siyah konnektör) — KIRMIZI
const LED_REG: [number, number] = [0.21, 0.365]   // regülatör IO-Link COMM/POWER LED satırı (image #1: kırmızı ekran altı) — YEŞİL

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
          const cw = maxX - minX + 1, ch = maxY - minY + 1
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

          // DİJİTAL EKRAN tespiti: KOYU (display cami) dikdörtgen bölgeler. Bağlı-bileşen (4-yön) ile kümele, makul kutuları al.
          const isDark = (p: number) => { const i = p * 4; return a[i + 3] > 60 && a[i] < 95 && a[i + 1] < 105 && a[i + 2] < 115 }
          const lab = new Int32Array(N).fill(-1)
          const boxes: { x0: number; y0: number; x1: number; y1: number; n: number }[] = []
          const qs: number[] = []
          for (let p = 0; p < N; p++) {
            if (lab[p] !== -1 || !isDark(p)) continue
            const id = boxes.length
            let x0 = Wp, y0 = Hp, x1 = 0, y1 = 0, cnt = 0
            lab[p] = id; qs.length = 0; qs.push(p)
            while (qs.length) {
              const q = qs.pop()!
              const x = q % Wp, y = (q - x) / Wp
              if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; cnt++
              const nb = [x > 0 ? q - 1 : -1, x < Wp - 1 ? q + 1 : -1, y > 0 ? q - Wp : -1, y < Hp - 1 ? q + Wp : -1]
              for (const r of nb) if (r >= 0 && lab[r] === -1 && isDark(r)) { lab[r] = id; qs.push(r) }
            }
            boxes.push({ x0, y0, x1, y1, n: cnt })
          }
          // Ekran adayi: alanin makul kismini dolduran, ust-orta bolgede, kare-ish dikdortgenler
          const cand = boxes
            .map((b) => ({ x: b.x0, y: b.y0, w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1, n: b.n }))
            .filter((b) => b.w > Wp * 0.05 && b.h > Hp * 0.03 && b.w < Wp * 0.32 && b.h < Hp * 0.30 && b.n > b.w * b.h * 0.45)
            .sort((p, q) => q.w * q.h - p.w * p.h)
            .slice(0, 3)
          if (cand.length) displays = cand.map((b) => ({ x: b.x / Wp, y: b.y / Hp, w: b.w / Wp, h: b.h / Hp }))
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
      dpr = Math.min(2, window.devicePixelRatio || 1)
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

      let dw0 = W * DEV_FILL, dh0 = dw0 / devAR
      if (dh0 > H * DEV_FILL) { dh0 = H * DEV_FILL; dw0 = dh0 * devAR }
      const dx0 = (W - dw0) / 2, dy0 = (H - dh0) / 2
      // DEBİMETRE ODAKLI zoom: odağı (LCD) ekranda SABİT tutarak içeriği ZOOM kadar büyüt → dış çerçeve ölçüsü değişmez
      const fpx = dx0 + FOCUS_U * dw0, fpy = dy0 + FOCUS_V * dh0
      const dw = dw0 * ZOOM, dh = dh0 * ZOOM
      const dx = fpx - FOCUS_U * dw, dy = fpy - FOCUS_V * dh
      const axisY = dy + dh * meas.axis
      const pipeH = Math.max(9, dh * meas.pipe)
      const top = axisY - pipeH / 2, bot = axisY + pipeH / 2
      const inX = dx + dw * meas.inX, outX = dx + dw * meas.outX
      const regX0 = dx + dw * REG_FRAC[0], regX1 = dx + dw * REG_FRAC[1]
      const regCx = dx + dw * REG_CX, regCy = dy + dh * 0.345   // image #1: sol-alt regülatör modülü merkezi
      const valveCx = dx + dw * VALVE_CX, valveCy = dy + dh * 0.24 // image #1: sağ valf modülü
      // EGZOZ PORTU: valf modülünün ALT-orta noktası (PDF: tahliye aşağı, susturucu valfin altında). Duman TAM buradan çıkar.
      const exOx = dx + dw * EXHAUST_CX, exOy = dy + dh * EXHAUST_CY
      const markR = Math.min(dw, dh) * 0.11

      // 1) GERÇEK CİHAZ FOTOSU — ARKA PLAN, TAM görünür (atlanmaz). Tüm animasyon bunun üstüne biner.
      if (deviceCanvas) { ctx.globalAlpha = 1; ctx.drawImage(deviceCanvas, dx, dy, dw, dh) }

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
          const ELBW = 0.07                      // dirsek fphase genişliği (yavaş, düzgün dönüş)
          const elbStart = exFrac + ELBW         // dirsek başlangıcı (egzozun biraz sağı)
          const elbY = axisY + pipeH * 1.35      // dirsek bitiş y (dik inişin başı)
          fPhase[i] -= (0.10 + 0.5 * sig.valve) * prof * dt
          if (fPhase[i] <= vFrac) { fPhase[i] = (W - 2) / W; continue } // egzoza ulaştı → çıkış ucuna ışınla (döngü)
          let px: number, py: number, dirx: number, diry: number, fade = 1
          if (fPhase[i] > elbStart) {
            // YATAY geri-akış (pipe boyunca, sağdan sola)
            px = fPhase[i] * W; py = axisY + lane * pr * 0.32
            dirx = -1; diry = 0
          } else if (fPhase[i] > exFrac) {
            // DİRSEK — quadratic bezier P0=(elbStart·W,axisY) sol→, C=(exOx,axisY), P1=(exOx,elbY)↓ : düzgün çeyrek dönüş
            const tt = (elbStart - fPhase[i]) / ELBW, omt = 1 - tt, p0x = elbStart * W
            px = omt * omt * p0x + (1 - omt * omt) * exOx
            py = axisY + (elbY - axisY) * tt * tt
            dirx = 2 * omt * (exOx - p0x); diry = 2 * tt * (elbY - axisY)
            const m = Math.hypot(dirx, diry) || 1; dirx /= m; diry /= m
          } else {
            // DİK İNİŞ → egzoz portuna; porta yaklaşınca SÖN (jet devralır → bağlantılı)
            const d = clamp01((exFrac - fPhase[i]) / (exFrac - vFrac))
            px = exOx; py = elbY + (exOy - elbY) * d
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

      // 4) REGÜLATÖR sıkışma bölgesi: DİATOMİK moleküller (BASINÇ renginde) İKİ bağlantı aparatı ARASINDA sıkışır (Mehmet Abi:
      //   arada KALSIN, taşmasın + daha çok kendini belli etsin). Yoğunluk/jitter/boyut/parlaklık ∝ basınç + sıkışma ışıması.
      const regW = regX1 - regX0
      const moleVisible = Math.round(MOLE_COUNT * (0.30 + 0.70 * sig.pressure))
      const jitter = 0.4 + 2.2 * sig.pressure
      // sıkışma ışıması — bölgeyi belirgin yapar (basınç yüksekken)
      if (sig.pressure > 0.05) {
        const cgx = regX0 + regW * 0.5, gr = ctx.createRadialGradient(cgx, axisY, 0, cgx, axisY, regW * 0.62)
        gr.addColorStop(0, cP(0.10 + 0.20 * sig.pressure)); gr.addColorStop(1, cP(0))
        ctx.fillStyle = gr; ctx.fillRect(regX0 - 4, top, regW + 8, pipeH)
      }
      for (let i = 0; i < moleVisible; i++) {
        const u = Math.pow(mU[i], 1 + sig.pressure * 1.3) // basınç artınca girişe doğru sıkış
        let x = regX0 + u * regW + (Math.random() - 0.5) * jitter
        x = Math.max(regX0 + 2, Math.min(regX1 - 2, x))   // İKİ aparat ARASINDA KAL (kesinlikle taşma yok)
        const y = axisY + mLane[i] * pr * 0.8 + (Math.random() - 0.5) * jitter
        const a = 0.5 + 0.5 * sig.pressure
        const rot = mRot[i] + now * 0.001, dxm = Math.cos(rot) * 2.6, dym = Math.sin(rot) * 2.6
        ctx.strokeStyle = cP(a * 0.7); ctx.lineWidth = 1.4
        ctx.beginPath(); ctx.moveTo(x - dxm, y - dym); ctx.lineTo(x + dxm, y + dym); ctx.stroke()
        ctx.fillStyle = cP(a)
        ctx.beginPath(); ctx.arc(x - dxm, y - dym, 2.1, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(x + dxm, y + dym, 2.1, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      // 5) DEVREYE GİRME halkalari — regülatör (BASINÇ renginde) / valf (turuncu-amber)
      const pulse = now * 0.006
      drawEngage(regCx, regCy, `${pc[0]},${pc[1]},${pc[2]}`, sig.reg, pulse, markR)
      drawEngage(valveCx, valveCy, '255,150,40', sig.valve, pulse + 1.5, markR)

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

      // 8) CİHAZ LED'LERİ — modüller çalışma durumuna göre KENDİ gerçek renkleriyle yanıp söner
      //   hub: çalışıyor → YEŞİL nabız (her zaman aktif). regülatör: devredeyse (standby) yeşil. valf: izolasyonda amber.
      const blink = 0.55 + 0.45 * Math.sin(now * 0.009)       // hizli nabiz (calisma kalp atisi)
      const slowBlink = 0.4 + 0.6 * Math.sin(now * 0.005)
      const led = (cx: number, cy: number, rgb: string, on: number, r: number) => {
        if (on < 0.05) return
        ctx.globalCompositeOperation = 'lighter'
        const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3.2)
        g2.addColorStop(0, `rgba(${rgb},${0.9 * on})`); g2.addColorStop(0.4, `rgba(${rgb},${0.35 * on})`); g2.addColorStop(1, `rgba(${rgb},0)`)
        ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, r * 3.2, 0, Math.PI * 2); ctx.fill()
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = `rgba(${rgb},${Math.min(1, 0.5 + on)})`
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
      }
      const ledR = Math.max(1.5, dh * 0.011)
      // SADECE İKİ LED (Mehmet Abi kararı): ORANSAL REGÜLATÖR + VALF. Hub status satırı (PWR/MODE/SIG) ve port LED'leri KALDIRILDI.
      // REGÜLATÖR (oransal) güç/iletişim LED'i — devredeyken (standby/iso) yeşil nabız, boştayken sönük.
      led(dx + dw * LED_REG[0], dy + dh * LED_REG[1], '65,224,138', 0.35 + 0.55 * sig.reg * slowBlink, ledR)
      // VALF solenoid konnektör LED'i — KIRMIZI; enerjilenince (izolasyon) soft-start ile yumuşak yanar.
      led(dx + dw * LED_VALVE[0], dy + dh * LED_VALVE[1], '255,60,48', sig.valve * (0.6 + 0.4 * blink), ledR)

      // 9) CİHAZ LCD'si (debimetre/hub ekranı) — SMC EXA1 düzenine BİREBİR yakın, HER HÜCRE CANLI VERİ.
      //   Gerçek ekran: koyu zemin, sol küçük etiket, sağda büyük rakam + birim; satırlar: Basınç(MPa) · Debi(L/min) · Sıcaklık(°C).
      const ro2 = readoutRef.current
      const hub = displays[0]
      if (hub && ro2.length) {
        const rx = dx + hub.x * dw, ry = dy + hub.y * dh, rw = hub.w * dw, rh = hub.h * dh
        const rad = Math.min(4, rh * 0.1)
        // koyu LCD cam (gerçek ekran gibi) + ince çerçeve
        ctx.fillStyle = 'rgba(3,8,16,0.80)'
        if ((ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect) { ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, rad); ctx.fill() } else ctx.fillRect(rx, ry, rw, rh)
        ctx.strokeStyle = 'rgba(110,150,200,0.55)'; ctx.lineWidth = 1; ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1)
        const rows = ro2.slice(0, 3)
        const padX = rw * 0.07
        const lh = (rh - rh * 0.06) / rows.length
        ctx.textBaseline = 'middle'
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i], cy = ry + rh * 0.03 + lh * (i + 0.5)
          const [rr, gg, bb] = r.rgb
          // ayraç çizgi (satırlar arası, gerçek segment ekran hissi)
          if (i > 0) { ctx.strokeStyle = 'rgba(120,160,210,0.18)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(rx + padX, ry + rh * 0.03 + lh * i); ctx.lineTo(rx + rw - padX, ry + rh * 0.03 + lh * i); ctx.stroke() }
          // BÜYÜK CANLI rakam + birim (Mehmet Abi: DAHA BÜYÜK/okunaklı). P/Q/T etiketi KALDIRILDI → rakama yer; birim metriği ayırt eder.
          const fs = Math.max(9, Math.min(lh * 0.84, rw * 0.24))
          const uf = Math.max(6, fs * 0.44)
          ctx.font = `600 ${uf}px ui-monospace, Menlo, monospace`
          const uw = ctx.measureText(r.unit).width
          const ux = rx + rw - padX - uw            // birim sağa yaslı; rakam ONUN soluna ölçülerek konumlanır (taşma yok)
          ctx.font = `800 ${fs}px ui-monospace, Menlo, monospace`
          ctx.textAlign = 'right'
          ctx.shadowColor = `rgba(${rr},${gg},${bb},0.95)`; ctx.shadowBlur = fs * 0.5
          ctx.fillStyle = `rgb(${rr},${gg},${bb})`
          ctx.fillText(r.value, ux - fs * 0.18, cy)
          ctx.shadowBlur = 0
          ctx.font = `600 ${uf}px ui-monospace, Menlo, monospace`
          ctx.textAlign = 'left'
          ctx.fillStyle = `rgba(${rr},${gg},${bb},0.9)`
          ctx.fillText(r.unit, ux, cy)
        }
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
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
