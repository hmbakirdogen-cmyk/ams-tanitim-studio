/*
 * NE      : "Cihaz Akışı" - Canlı Panel'in 2. canlı görünümü (Klasik'in yanında). GERÇEK SMC AMS ünitesinin TEMİZ ÖNDEN fotosu
 *           (public/products/ams-front.jpg; beyaz zemin koda gömülü şeffaflaştırılır → koyu sahnede yüzer). Cihaz BÜYÜK; cihazın
 *           giriş/çıkış hattı, animasyon borusuyla AYNI EKSENde; hortum çapı = boru çapı (o yüzden cihaz iri görünür).
 *           İçinden soldan sağa TOP-SEVİYE animasyonla hava akar; valf/regülatör devreye girince foto üzerinde gösterilir.
 *
 * NEDEN   : Mehmet Abi: "katalog fotosu değil internetten bulunan temiz ÖNDEN görünüm; giriş hattı boru kadar büyük → cihaz iri;
 *           giriş/çıkış hatları animasyon hattıyla aynı eksende; molekül/renk/su damlası/hareket en üst seviye gerçekçi."
 *
 * NASIL   : Saf Canvas 2D (akıcı, foto ile bütünleşir). Araştırma-temelli spec:
 *             - Akış (debi): streak (uzunluk ∝ hız) + yoğunluk + 3 parallax katman + additive glow.  dt-bazlı (144Hz güvenli).
 *             - Basınç: regülatör bölgesinde DİATOMİK "dumbbell" moleküller sıkışır (yoğunluk+jitter+parlaklık ∝ basınç).
 *             - Sıcaklık: Turbo rampası (mavi→kırmızı) parçacık renginde + sıcak yarıda glow.
 *             - Nem: boru altında YASSI elips su damlaları (sayı ∝ nem) + üst-sol speküler highlight + yavaş kayma.
 *             - Valf: mod normal değilken egzoz KONİSİ (hızlı çıkış + genişleyip sönme).
 *           Beyaz zemin knockout: foto bir kez offscreen'e çizilir, ~beyaz pikseller saydamlaştırılır (yerel asset → taint yok).
 *           60fps: havuzlar sabit, kare-başı tahsis yok; translucent-clear ile iz (motion-blur) + hafif koyu sahne (glow patlar).
 *
 * YAN ETKI: Offline (foto gömülü). Üstüne PipeOverlay biner (mod + anlık değer + eşik + giriş/çıkış + "devrede" rozeti).
 * AYAR     : AXIS_FRAC / DEV_FRAC / PIPE_FRAC sabitleri ile hizalama-ölçek kolayca rötuşlanır (Mehmet Abi geri bildirimi için).
 */
import { useEffect, useMemo, useRef } from 'react'
import { asset } from '@/lib/asset'
import type { Reading, Mode } from '@/data/types'
import { METRICS, type MetricDef } from '@/data/metrics'

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

// --- Olcek (rotuslanabilir). Eksen/port/boru artik FOTODAN PIKSEL TARAMASIYLA olculur (measureDevice); asagidakiler fallback. ---
const DEV_FILL = 0.985 // cihaz, canvas'i neredeyse DOLDURUR (kirpilmis icerik; cok BUYUK gorunsun)
const FB_AXIS = 0.62   // (fallback) hava-eksen Y orani — olcum basarisizsa
const FB_PIPE = 0.14   // (fallback) boru capi orani
const FB_IN = 0.04, FB_OUT = 0.96 // (fallback) giris/cikis x orani
const REG_FRAC: [number, number] = [0.05, 0.28] // regulator (sikisma) bolgesi (kirpilmis icerikte x orani)
const VALVE_FRAC = 0.86 // valf modulu x orani (kirpilmis icerikte)

// Parcacik havuzlari
const FLOW_COUNT = 150
const MOLE_COUNT = 90      // regulator bolgesi diatomik molekulleri
const DROPLET_MAX = 60
const PUFF_COUNT = 48

// Turbo (truncated) sicaklik rampasi: mavi → kirmizi (arastirma onerisi)
const TEMP_STOPS: { t: number; c: [number, number, number] }[] = [
  { t: 0.0, c: [58, 79, 196] },
  { t: 0.2, c: [70, 117, 237] },
  { t: 0.4, c: [27, 207, 212] },
  { t: 0.55, c: [97, 252, 108] },
  { t: 0.7, c: [209, 232, 52] },
  { t: 0.85, c: [254, 155, 45] },
  { t: 1.0, c: [177, 25, 1] },
]
function tempRGB(t: number): [number, number, number] {
  t = clamp01(t)
  for (let i = 1; i < TEMP_STOPS.length; i++) {
    if (t <= TEMP_STOPS[i].t) {
      const a = TEMP_STOPS[i - 1], b = TEMP_STOPS[i]
      const f = (t - a.t) / (b.t - a.t || 1)
      return [Math.round(a.c[0] + (b.c[0] - a.c[0]) * f), Math.round(a.c[1] + (b.c[1] - a.c[1]) * f), Math.round(a.c[2] + (b.c[2] - a.c[2]) * f)]
    }
  }
  return TEMP_STOPS[TEMP_STOPS.length - 1].c
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
  const targetRef = useRef({ flow: 0, pressure: 0, temp: 0, hum: 0, mode })
  {
    const nv = (k: string) => {
      const m = byKey[k]
      if (!m || !reading) return 0
      return clamp01((m.get(reading) - m.min) / (m.max - m.min))
    }
    targetRef.current = { flow: nv('flow'), pressure: nv('pressure'), temp: nv('temperature'), hum: nv('humidity'), mode }
  }
  const themeRef = useRef(theme)
  themeRef.current = theme

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')!

    // Gercek cihaz fotosu → beyaz zemini saydamlastir + icerigi KIRP + gercek PORT EKSENI/UCLARINI olc (bir kez, offscreen'e)
    const img = new Image()
    let deviceCanvas: HTMLCanvasElement | null = null
    let devAR = 1
    // Olculen yerlesim (kirpilmis cihaz icinde 0..1 oranlar): axis=hava ekseni Y, inX/outX=giris/cikis ucu X, pipe=boru capi
    const meas = { axis: FB_AXIS, pipe: FB_PIPE, inX: FB_IN, outX: FB_OUT, ok: false }
    img.onload = () => {
      const oc = document.createElement('canvas')
      oc.width = img.width; oc.height = img.height
      const octx = oc.getContext('2d')!
      octx.drawImage(img, 0, 0)
      try {
        const Wp = oc.width, Hp = oc.height
        const d = octx.getImageData(0, 0, Wp, Hp)
        const a = d.data
        // opak (cihaz) maskesi + satir/sutun yogunlugu
        const colCount = new Int32Array(Wp)
        const rowCount = new Int32Array(Hp)
        let minX = Wp, maxX = 0, minY = Hp, maxY = 0
        for (let y = 0; y < Hp; y++) {
          for (let x = 0; x < Wp; x++) {
            const i = (y * Wp + x) * 4
            const r = a[i], g = a[i + 1], b = a[i + 2]
            const mn = Math.min(r, g, b)
            if (r > 244 && g > 244 && b > 244) { a[i + 3] = 0; continue } // ~beyaz → saydam
            if (mn > 232) a[i + 3] = Math.round(a[i + 3] * (1 - (mn - 232) / (245 - 232))) // kenar feather
            if (a[i + 3] > 40) { // opak cihaz pikseli
              colCount[x]++; rowCount[y]++
              if (x < minX) minX = x; if (x > maxX) maxX = x
              if (y < minY) minY = y; if (y > maxY) maxY = y
            }
          }
        }
        octx.putImageData(d, 0, 0)
        if (maxX > minX && maxY > minY) {
          // KIRP: cihazi sıkı sınırına al → buyuk gorunur
          const cw = maxX - minX + 1, ch = maxY - minY + 1
          const cropped = document.createElement('canvas')
          cropped.width = cw; cropped.height = ch
          cropped.getContext('2d')!.drawImage(oc, minX, minY, cw, ch, 0, 0, cw, ch)
          deviceCanvas = cropped
          devAR = cw / ch

          // GIRIS/CIKIS UCLARI: cihazin en sol/sag opak sutunlari (kirpilmis icinde 0 ve ~1)
          meas.inX = 0.012
          meas.outX = 0.988
          // HAVA EKSENI: alt yariyi tarayip ALT (manifold/gecis) blogunun en YOGUN tam-genislik satirini bul.
          // Once en genis dolu sutunlarin oldugu satir araligini (alt blok) bul:
          let bestY = minY + Math.round(ch * FB_AXIS)
          let bestScore = -1
          const yStart = minY + Math.round(ch * 0.40) // ust modulleri atla, alt hava blogu
          for (let y = yStart; y <= maxY; y++) {
            // bu satirda dolu sutun orani + sol/sag uca yakinlik (port hatti uctan uca uzar)
            let filled = 0, leftFill = 0, rightFill = 0
            for (let x = minX; x <= maxX; x++) if (a[(y * Wp + x) * 4 + 3] > 40) {
              filled++
              if (x < minX + cw * 0.12) leftFill++
              if (x > maxX - cw * 0.12) rightFill++
            }
            // port hatti: hem genis dolu HEM iki uca da deger → leftFill*rightFill agirlikli
            const score = filled * (1 + (leftFill + rightFill) / (cw * 0.24 + 1))
            if (score > bestScore) { bestScore = score; bestY = y }
          }
          meas.axis = (bestY - minY) / ch
          // BORU CAPI: eksen satirinda dikey olarak opak kalinligi olc (alt blok yuksekligi)
          let up = 0, dn = 0
          for (let y = bestY; y >= minY; y--) { if (a[(y * Wp + (minX + Math.round(cw * 0.5))) * 4 + 3] > 40) up++; else break }
          for (let y = bestY; y <= maxY; y++) { if (a[(y * Wp + (minX + Math.round(cw * 0.5))) * 4 + 3] > 40) dn++; else break }
          const thick = (up + dn) / ch
          meas.pipe = Math.max(0.06, Math.min(0.22, thick * 0.62)) // blok yuksekliginin bir kismi = ic hava kanali
          meas.ok = true
        }
      } catch { /* taint → fallback oranlar */ }
      if (!deviceCanvas) { deviceCanvas = oc; devAR = img.width / img.height }
    }
    img.src = asset('products/ams-front.jpg')

    const sig = { flow: 0, pressure: 0, temp: 0, hum: 0, exhaust: 0, reg: 0, valve: 0 }

    // Akan hava (3 parallax katman: 0=arka soluk/yavas, 2=on parlak/hizli)
    const fLayer = Int8Array.from({ length: FLOW_COUNT }, () => (Math.random() < 0.4 ? 0 : Math.random() < 0.6 ? 1 : 2))
    const fPhase = Float32Array.from({ length: FLOW_COUNT }, () => Math.random())
    const fLane = Float32Array.from({ length: FLOW_COUNT }, () => Math.random() * 2 - 1)
    const fSpd = Float32Array.from({ length: FLOW_COUNT }, () => 0.82 + Math.random() * 0.4)
    // Regulator diatomik molekulleri (dumbbell) - reg bolgesinde sikisir
    const mU = Float32Array.from({ length: MOLE_COUNT }, () => Math.random()) // 0..1 reg bolgesi boyunca
    const mLane = Float32Array.from({ length: MOLE_COUNT }, () => Math.random() * 2 - 1)
    const mRot = Float32Array.from({ length: MOLE_COUNT }, () => Math.random() * Math.PI)
    // Su damlalari
    const dActive = new Uint8Array(DROPLET_MAX)
    const dX = Float32Array.from({ length: DROPLET_MAX }, () => Math.random())
    const dLane = Float32Array.from({ length: DROPLET_MAX }, () => Math.random())
    const dR = Float32Array.from({ length: DROPLET_MAX }, () => 1.5 + Math.random() * Math.random() * 4.5) // cogu kucuk
    const dSlide = new Float32Array(DROPLET_MAX)
    // Egzoz pufleri
    const pX = new Float32Array(PUFF_COUNT), pY = new Float32Array(PUFF_COUNT)
    const pVx = new Float32Array(PUFF_COUNT), pVy = new Float32Array(PUFF_COUNT)
    const pLife = Float32Array.from({ length: PUFF_COUNT }, () => Math.random())
    const pR = new Float32Array(PUFF_COUNT)

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
      const pr = radius * (1 + 0.12 * Math.sin(pulse))
      ctx.globalCompositeOperation = 'lighter'
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, pr * 1.7)
      rg.addColorStop(0, `rgba(${rgb},${0.32 * intensity})`); rg.addColorStop(0.55, `rgba(${rgb},${0.13 * intensity})`); rg.addColorStop(1, `rgba(${rgb},0)`)
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, pr * 1.7, 0, Math.PI * 2); ctx.fill()
      ctx.lineWidth = 2.5; ctx.strokeStyle = `rgba(${rgb},${0.8 * intensity})`
      ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2); ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
    }

    let raf = 0, last = performance.now()
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const t = targetRef.current
      const k = Math.min(1, dt * 4)
      sig.flow += (t.flow - sig.flow) * k
      sig.pressure += (t.pressure - sig.pressure) * k
      sig.temp += (t.temp - sig.temp) * k
      sig.hum += (t.hum - sig.hum) * k
      const regTarget = t.mode === 'standby' ? 1 : t.mode === 'isolation' ? 0.35 : 0
      const valveTarget = t.mode === 'isolation' ? 1 : t.mode === 'standby' ? 0.5 : 0
      sig.reg += (regTarget - sig.reg) * Math.min(1, dt * 2.5)
      sig.valve += (valveTarget - sig.valve) * Math.min(1, dt * 2.5)
      const exTarget = t.mode === 'normal' ? 0 : 0.4 + 0.6 * sig.valve
      sig.exhaust += (exTarget - sig.exhaust) * Math.min(1, dt * 2.2)

      const [cr, cg, cb] = tempRGB(sig.temp)
      const col = (a: number) => `rgba(${cr},${cg},${cb},${a})`
      const dark = themeRef.current !== 'light'

      // Iz (motion-blur) + hafif koyu sahne → glow patlar (translucent clear)
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = dark ? 'rgba(6,10,22,0.32)' : 'rgba(225,235,247,0.40)'
      ctx.fillRect(0, 0, W, H)

      // Cihaz cizim dikdortgeni (KIRPILMIS icerik → canvas'i neredeyse DOLDURUR, cok BUYUK)
      let dw = W * DEV_FILL, dh = dw / devAR
      if (dh > H * DEV_FILL) { dh = H * DEV_FILL; dw = dh * devAR }
      const dx = (W - dw) / 2, dy = (H - dh) / 2
      // OLCULEN port ekseni/uclari/capi (kirpilmis icerik oranlari)
      const axisY = dy + dh * meas.axis
      const pipeH = Math.max(10, dh * meas.pipe)
      const top = axisY - pipeH / 2, bot = axisY + pipeH / 2
      const inX = dx + dw * meas.inX, outX = dx + dw * meas.outX
      // Regulator/valf hizalari (kirpilmis icerikte)
      const regX0 = dx + dw * REG_FRAC[0], regX1 = dx + dw * REG_FRAC[1]
      const regCx = dx + dw * 0.16, regCy = dy + dh * 0.40
      const valveCx = dx + dw * VALVE_FRAC, valveCy = dy + dh * 0.42
      const exOx = dx + dw * VALVE_FRAC, exOy = dy + dh * 0.64
      const markR = Math.min(dw, dh) * 0.11

      // 1) GERÇEK CİHAZ FOTOSU — ARKA PLAN (yari saydam; akis ÜSTÜNE binip "rontgen/icinden geciyor" hissi verir)
      if (deviceCanvas) {
        ctx.globalAlpha = dark ? 0.82 : 0.92
        ctx.drawImage(deviceCanvas, dx, dy, dw, dh)
        ctx.globalAlpha = 1
      }

      // 2) BORU + giris/cikis hortumu (UÇTAN UCA tek surekli, AYNI cap, OLCULEN port EKSENINDE). Dusuk alpha → cihaz okunur kalir.
      // Sol kenardan giris ucuna (inX) ve cikis ucundan (outX) sag kenara = giris/cikis hortumlari; arasi = cihaz ici hatti.
      const grad = ctx.createLinearGradient(0, top, 0, bot)
      grad.addColorStop(0, col(0.16)); grad.addColorStop(0.5, dark ? 'rgba(8,16,28,0.06)' : 'rgba(255,255,255,0.06)'); grad.addColorStop(1, col(0.10))
      ctx.fillStyle = grad; ctx.fillRect(0, top, W, pipeH)
      ctx.strokeStyle = col(0.5); ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(W, top); ctx.moveTo(0, bot); ctx.lineTo(W, bot); ctx.stroke()
      // Hortum birlesim kelepceleri TAM giris/cikis port ucunda (olculen inX/outX)
      const coupler = (cx: number) => {
        const cw = Math.max(7, pipeH * 0.16)
        const cgr = ctx.createLinearGradient(0, top, 0, bot)
        cgr.addColorStop(0, 'rgba(196,212,230,0.92)'); cgr.addColorStop(0.5, 'rgba(96,116,140,0.92)'); cgr.addColorStop(1, 'rgba(165,183,203,0.92)')
        ctx.fillStyle = cgr
        if ((ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect) { ctx.beginPath(); ctx.roundRect(cx - cw / 2, top - 4, cw, pipeH + 8, 3); ctx.fill() }
        else ctx.fillRect(cx - cw / 2, top - 4, cw, pipeH + 8)
      }
      coupler(inX); coupler(outX)

      // 3) AKAN HAVA — streak (uzunluk ∝ hiz), 3 parallax katman, additive (cihazin ÜSTÜNDE → icinden geciyor hissi)
      const pr = pipeH * 0.38
      const baseV = (0.05 + 0.95 * sig.flow) // 0..1
      ctx.lineCap = 'round'
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < FLOW_COUNT; i++) {
        const layer = fLayer[i] // 0 arka .. 2 on
        const depth = layer === 0 ? 0.55 : layer === 1 ? 0.8 : 1.15
        const inReg = false // akis genelde; reg sikismasi molekul katmaninda
        const v = baseV * fSpd[i] * depth * (inReg ? 0.5 : 1)
        fPhase[i] += (v * 0.55 + 0.01) * dt
        if (fPhase[i] > 1) fPhase[i] -= 1
        const x = fPhase[i] * W
        const y = axisY + fLane[i] * pr * (0.6 + 0.4 * depth)
        const len = (6 + baseV * 34) * depth
        const a = (0.10 + 0.55 * sig.flow) * (layer === 0 ? 0.45 : layer === 1 ? 0.8 : 1)
        const w = (1.4 + 1.2 * depth) * (0.6 + sig.flow * 0.8)
        ctx.strokeStyle = col(a)
        ctx.lineWidth = w
        ctx.beginPath(); ctx.moveTo(x - len, y); ctx.lineTo(x, y); ctx.stroke()
        // on katman parlak basa hafif glow noktasi
        if (layer === 2 && sig.temp > 0.5) {
          const gl = (sig.temp - 0.5) * 2 * 5
          const rg = ctx.createRadialGradient(x, y, 0, x, y, gl)
          rg.addColorStop(0, col(0.5 * a)); rg.addColorStop(1, col(0))
          ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, gl, 0, Math.PI * 2); ctx.fill()
        }
      }

      // 3) REGÜLATÖR bölgesi: DİATOMİK moleküller sıkışır (yoğunluk+jitter ∝ basınç)
      const moleVisible = Math.round(MOLE_COUNT * (0.18 + 0.82 * sig.pressure))
      const jitter = 0.4 + 2.2 * sig.pressure
      const regW = regX1 - regX0
      for (let i = 0; i < moleVisible; i++) {
        // basinc artinca sol tarafa (giris) dogru sikis: u^p ile yogunlastir
        const u = Math.pow(mU[i], 1 + sig.pressure * 1.2)
        const x = regX0 + u * regW + (Math.random() - 0.5) * jitter
        const y = axisY + mLane[i] * pr * 0.85 + (Math.random() - 0.5) * jitter
        const a = 0.4 + 0.5 * sig.pressure
        const rot = mRot[i] + now * 0.001
        const dxm = Math.cos(rot) * 2.2, dym = Math.sin(rot) * 2.2
        const rr = 1.6
        ctx.strokeStyle = col(a * 0.7); ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x - dxm, y - dym); ctx.lineTo(x + dxm, y + dym); ctx.stroke()
        ctx.fillStyle = col(a)
        ctx.beginPath(); ctx.arc(x - dxm, y - dym, rr, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(x + dxm, y + dym, rr, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      // 4) DEVREYE GİRME halkalari (regülatör yeşil / valf amber) — foto üzerinde
      const pulse = now * 0.006
      drawEngage(regCx, regCy, '54,224,200', sig.reg, pulse, markR)
      drawEngage(valveCx, valveCy, '255,176,77', sig.valve, pulse + 1.5, markR)

      // 6) SU DAMLALARI (nem) — boru altinda, yassi elips + speküler highlight + yavas kayma
      const wantActive = Math.round((sig.hum) * DROPLET_MAX)
      for (let i = 0; i < DROPLET_MAX; i++) {
        if (i < wantActive) {
          if (!dActive[i]) { dActive[i] = 1 }
          // buyukler kayar
          if (dR[i] > 4.6) dSlide[i] = Math.min(1, dSlide[i] + dt * 0.6)
          dX[i] += (0.004 + dSlide[i] * 0.05) * dt * 60 / W
          if (dX[i] > 1) { dX[i] -= 1; dSlide[i] = 0 }
          const x = dX[i] * W
          const y = bot - dR[i] * 0.7 - dLane[i] * 2
          const rw = dR[i] * (1.3 + dR[i] * 0.05), rh = dR[i]
          ctx.fillStyle = 'rgba(170,205,232,0.40)'
          ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2); ctx.fill()
          ctx.strokeStyle = 'rgba(120,150,180,0.45)'; ctx.lineWidth = 0.6
          ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2); ctx.stroke()
          // ust-sol highlight
          ctx.fillStyle = 'rgba(255,255,255,0.8)'
          ctx.beginPath(); ctx.arc(x - rw * 0.3, y - rh * 0.35, Math.max(0.6, rw * 0.22), 0, Math.PI * 2); ctx.fill()
        } else { dActive[i] = 0 }
      }

      // 7) VALF EGZOZU — koni: hizli cikis + genisleyip sonme (additive)
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < PUFF_COUNT; i++) {
        pLife[i] -= dt / (0.6 + Math.random() * 0.6)
        if (pLife[i] <= 0) {
          if (sig.exhaust > 0.08) {
            // koni: asagi-disa, ~20° yari aci, hafif yukari bias degil (egzoz asagi)
            const ang = Math.PI * 0.5 + (Math.random() - 0.5) * 0.7 // ~asagi ±20°
            const sp = (140 + Math.random() * 180) * (0.5 + sig.exhaust)
            pX[i] = exOx + (Math.random() - 0.5) * 10
            pY[i] = exOy
            pVx[i] = Math.cos(ang) * sp * (Math.random() < 0.5 ? 1 : -1) * 0.5 + (Math.random() - 0.5) * 40
            pVy[i] = Math.sin(ang) * sp
            pR[i] = 2; pLife[i] = 1
          } else { continue }
        }
        pVx[i] *= 0.94; pVy[i] = pVy[i] * 0.94 + 30 * dt
        pX[i] += pVx[i] * dt; pY[i] += pVy[i] * dt
        pR[i] += (16 - pR[i]) * dt * 2.2 // grow
        const l = Math.max(0, pLife[i])
        const a = (l < 0.9 ? l : (1 - l) * 9) * 0.55 * sig.exhaust
        if (a <= 0.01) continue
        const rg = ctx.createRadialGradient(pX[i], pY[i], 0, pX[i], pY[i], pR[i])
        rg.addColorStop(0, `rgba(210,230,255,${a})`); rg.addColorStop(1, 'rgba(210,230,255,0)')
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(pX[i], pY[i], pR[i], 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

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
