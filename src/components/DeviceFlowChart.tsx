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
 * NASIL   : Saf Canvas 2D, dt-bazlı (144Hz güvenli), sabit havuz (kare-başı tahsis yok), additive glow + motion-blur iz.
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
// Fallback port ekseni/capi/uclari (olcum tutmazsa)
const FB_AXIS = 0.78, FB_PIPE = 0.085, FB_IN = 0.02, FB_OUT = 0.98
// PDF'e gore modul bolgeleri (kirpilmis icerik x orani)
const REG_FRAC: [number, number] = [0.12, 0.34] // standby/oransal regülatör (basınç regüle bölgesi)
const REG_CX = 0.22                              // regülatör merkezi (devrede halkası)
const VALVE_CX = 0.80                            // tahliye valfi merkezi (devrede halkası + egzoz kaynağı)

const FLOW_COUNT = 160
const MOLE_COUNT = 90
const DROPLET_MAX = 60
const PUFF_COUNT = 56

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
  {
    const nv = (k: string) => { const m = byKey[k]; return !m || !reading ? 0 : clamp01((m.get(reading) - m.min) / (m.max - m.min)) }
    targetRef.current = { flow: nv('flow'), pressure: nv('pressure'), temp: nv('temperature'), hum: nv('humidity'), mode }
    if (byKey.flow) colorRef.current.flow = hexRGB(byKey.flow.color)
    if (byKey.pressure) colorRef.current.pressure = hexRGB(byKey.pressure.color)
    if (byKey.humidity) colorRef.current.hum = hexRGB(byKey.humidity.color)
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
        // hafif kenar feather (saydam komşusu olan opak beyazları yumuşat)
        octx.putImageData(d, 0, 0)
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
        }
      } catch { /* taint → orijinal goster, fallback oranlar */ }
    }
    img.src = asset('products/ams-front.jpg')

    const sig = { flow: 0, pressure: 0, temp: 0, hum: 0, exhaust: 0, reg: 0, valve: 0 }

    const fLayer = Int8Array.from({ length: FLOW_COUNT }, () => (Math.random() < 0.4 ? 0 : Math.random() < 0.6 ? 1 : 2))
    const fPhase = Float32Array.from({ length: FLOW_COUNT }, () => Math.random())
    const fLane = Float32Array.from({ length: FLOW_COUNT }, () => Math.random() * 2 - 1)
    const fSpd = Float32Array.from({ length: FLOW_COUNT }, () => 0.82 + Math.random() * 0.4)
    const mU = Float32Array.from({ length: MOLE_COUNT }, () => Math.random())
    const mLane = Float32Array.from({ length: MOLE_COUNT }, () => Math.random() * 2 - 1)
    const mRot = Float32Array.from({ length: MOLE_COUNT }, () => Math.random() * Math.PI)
    const dX = Float32Array.from({ length: DROPLET_MAX }, () => Math.random())
    const dLane = Float32Array.from({ length: DROPLET_MAX }, () => Math.random())
    const dR = Float32Array.from({ length: DROPLET_MAX }, () => 1.5 + Math.random() * Math.random() * 4.5)
    const dSlide = new Float32Array(DROPLET_MAX)
    const pX = new Float32Array(PUFF_COUNT), pY = new Float32Array(PUFF_COUNT)
    const pVx = new Float32Array(PUFF_COUNT), pVy = new Float32Array(PUFF_COUNT)
    const pLife = Float32Array.from({ length: PUFF_COUNT }, () => Math.random()), pR = new Float32Array(PUFF_COUNT)

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
      sig.valve += (valveTarget - sig.valve) * Math.min(1, dt * 2.5)
      // Egzoz = valf kapaninca cikis tarafindaki basinci tahliye (Mehmet Abi fizigi): valf ne kadar kapaliysa o kadar guclu
      const exTarget = sig.valve
      sig.exhaust += (exTarget - sig.exhaust) * Math.min(1, dt * 2.4)

      const fc = colorRef.current.flow, pc = colorRef.current.pressure, hc = colorRef.current.hum
      const [tr, tg, tb] = tempRGB(sig.temp)
      const cF = (a: number) => `rgba(${fc[0]},${fc[1]},${fc[2]},${a})` // debi rengi
      const cP = (a: number) => `rgba(${pc[0]},${pc[1]},${pc[2]},${a})` // basinc rengi
      const cH = (a: number) => `rgba(${hc[0]},${hc[1]},${hc[2]},${a})` // nem rengi
      const cT = (a: number) => `rgba(${tr},${tg},${tb},${a})`          // sicaklik (dunya std)
      const dark = themeRef.current !== 'light'

      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = dark ? 'rgba(6,10,22,0.32)' : 'rgba(225,235,247,0.40)'
      ctx.fillRect(0, 0, W, H)

      let dw = W * DEV_FILL, dh = dw / devAR
      if (dh > H * DEV_FILL) { dh = H * DEV_FILL; dw = dh * devAR }
      const dx = (W - dw) / 2, dy = (H - dh) / 2
      const axisY = dy + dh * meas.axis
      const pipeH = Math.max(9, dh * meas.pipe)
      const top = axisY - pipeH / 2, bot = axisY + pipeH / 2
      const inX = dx + dw * meas.inX, outX = dx + dw * meas.outX
      const regX0 = dx + dw * REG_FRAC[0], regX1 = dx + dw * REG_FRAC[1]
      const regCx = dx + dw * REG_CX, regCy = dy + dh * 0.40
      const valveCx = dx + dw * VALVE_CX, valveCy = dy + dh * 0.42
      const exOx = dx + dw * VALVE_CX, exOy = bot // egzoz boru ALT kenarindan asagi
      const markR = Math.min(dw, dh) * 0.11

      // 1) GERÇEK CİHAZ FOTOSU — arka plan
      if (deviceCanvas) { ctx.globalAlpha = dark ? 0.82 : 0.92; ctx.drawImage(deviceCanvas, dx, dy, dw, dh); ctx.globalAlpha = 1 }

      // 2) BORU + giris/cikis hortumu (UÇTAN UCA, port ile AYNI EKSEN+ÇAP). Debi renginde hafif kenar.
      const grad = ctx.createLinearGradient(0, top, 0, bot)
      grad.addColorStop(0, cF(0.14)); grad.addColorStop(0.5, dark ? 'rgba(8,16,28,0.05)' : 'rgba(255,255,255,0.05)'); grad.addColorStop(1, cF(0.09))
      ctx.fillStyle = grad; ctx.fillRect(0, top, W, pipeH)
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

      // 2b) SICAKLIK ısı tülü (dünya std renk) — boru boyunca ince, nefes alan dolgu (sicaklik her yere yansisin)
      ctx.globalCompositeOperation = 'lighter'
      const haze = (0.05 + 0.18 * sig.temp) * (0.92 + 0.08 * Math.sin(now * 0.0016))
      const hg = ctx.createLinearGradient(0, top, 0, bot)
      hg.addColorStop(0, cT(0)); hg.addColorStop(0.5, cT(haze)); hg.addColorStop(1, cT(0))
      ctx.fillStyle = hg; ctx.fillRect(0, top, W, pipeH)

      // 3) AKAN HAVA — debi renginde streak (uzunluk∝hız) + sıcakta sıcaklık-renkli glow başı. İzolasyonda valf SONRASI akış söner.
      const pr = pipeH * 0.4
      const baseV = 0.05 + 0.95 * sig.flow
      ctx.lineCap = 'round'
      for (let i = 0; i < FLOW_COUNT; i++) {
        const layer = fLayer[i], depth = layer === 0 ? 0.55 : layer === 1 ? 0.8 : 1.15
        fPhase[i] += (baseV * fSpd[i] * depth * 0.55 + 0.008) * dt
        if (fPhase[i] > 1) fPhase[i] -= 1
        const x = fPhase[i] * W
        // valf kapali (izolasyon): valf SONRASI (cikisa dogru) akis kesilir
        const afterValve = x > valveCx
        const cut = afterValve ? (1 - sig.valve) : 1
        if (cut < 0.06) continue
        const y = axisY + fLane[i] * pr * (0.6 + 0.4 * depth)
        const len = (6 + baseV * 34) * depth
        const a = (0.10 + 0.55 * sig.flow) * (layer === 0 ? 0.45 : layer === 1 ? 0.8 : 1) * cut
        ctx.strokeStyle = cF(a); ctx.lineWidth = (1.4 + 1.2 * depth) * (0.6 + sig.flow * 0.8)
        ctx.beginPath(); ctx.moveTo(x - len, y); ctx.lineTo(x, y); ctx.stroke()
        if (layer === 2 && sig.temp > 0.45) { // sicak → sicaklik renginde uc glow
          const gl = (sig.temp - 0.45) * 9
          const rg = ctx.createRadialGradient(x, y, 0, x, y, gl)
          rg.addColorStop(0, cT(0.6 * a)); rg.addColorStop(1, cT(0))
          ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, gl, 0, Math.PI * 2); ctx.fill()
        }
      }

      // 4) REGÜLATÖR bölgesi: DİATOMİK moleküller (BASINÇ renginde) sıkışır (yoğunluk+jitter∝basınç)
      const moleVisible = Math.round(MOLE_COUNT * (0.16 + 0.84 * sig.pressure))
      const jitter = 0.4 + 2.4 * sig.pressure
      const regW = regX1 - regX0
      for (let i = 0; i < moleVisible; i++) {
        const u = Math.pow(mU[i], 1 + sig.pressure * 1.3) // basinc artinca girise dogru sikis
        const x = regX0 + u * regW + (Math.random() - 0.5) * jitter
        const y = axisY + mLane[i] * pr * 0.85 + (Math.random() - 0.5) * jitter
        const a = 0.4 + 0.5 * sig.pressure
        const rot = mRot[i] + now * 0.001, dxm = Math.cos(rot) * 2.2, dym = Math.sin(rot) * 2.2
        ctx.strokeStyle = cP(a * 0.7); ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x - dxm, y - dym); ctx.lineTo(x + dxm, y + dym); ctx.stroke()
        ctx.fillStyle = cP(a)
        ctx.beginPath(); ctx.arc(x - dxm, y - dym, 1.6, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(x + dxm, y + dym, 1.6, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      // 5) DEVREYE GİRME halkalari — regülatör (BASINÇ renginde) / valf (turuncu-amber)
      const pulse = now * 0.006
      drawEngage(regCx, regCy, `${pc[0]},${pc[1]},${pc[2]}`, sig.reg, pulse, markR)
      drawEngage(valveCx, valveCy, '255,150,40', sig.valve, pulse + 1.5, markR)

      // 6) SU DAMLALARI (nem) — NEM renginde, yassı elips + üst-sol highlight + büyüyünce kayar
      const wantActive = Math.round(sig.hum * DROPLET_MAX)
      for (let i = 0; i < wantActive; i++) {
        if (dR[i] > 4.6) dSlide[i] = Math.min(1, dSlide[i] + dt * 0.6)
        dX[i] += (0.004 + dSlide[i] * 0.05) * dt * 60 / W
        if (dX[i] > 1) { dX[i] -= 1; dSlide[i] = 0 }
        const x = dX[i] * W, y = bot - dR[i] * 0.7 - dLane[i] * 2
        const rw = dR[i] * (1.3 + dR[i] * 0.05), rh = dR[i]
        ctx.fillStyle = cH(0.4)
        ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = cH(0.5); ctx.lineWidth = 0.6
        ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2); ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,0.82)'
        ctx.beginPath(); ctx.arc(x - rw * 0.3, y - rh * 0.35, Math.max(0.6, rw * 0.22), 0, Math.PI * 2); ctx.fill()
      }

      // 7) VALF EGZOZU — valf kapaninca CIKIS tarafi basincini yitirip valften AŞAĞI tahliye (koni, additive)
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < PUFF_COUNT; i++) {
        pLife[i] -= dt / (0.6 + Math.random() * 0.6)
        if (pLife[i] <= 0) {
          if (sig.exhaust > 0.08) {
            const sp = (150 + Math.random() * 190) * (0.5 + sig.exhaust)
            pX[i] = exOx + (Math.random() - 0.5) * pipeH * 0.5
            pY[i] = exOy
            pVx[i] = (Math.random() - 0.5) * 70
            pVy[i] = sp // asagi
            pR[i] = 2; pLife[i] = 1
          } else continue
        }
        pVx[i] *= 0.94; pVy[i] = pVy[i] * 0.95 + 40 * dt
        pX[i] += pVx[i] * dt; pY[i] += pVy[i] * dt
        pR[i] += (18 - pR[i]) * dt * 2.2
        const l = Math.max(0, pLife[i])
        const a = (l < 0.9 ? l : (1 - l) * 9) * 0.55 * sig.exhaust
        if (a <= 0.01) continue
        const rg = ctx.createRadialGradient(pX[i], pY[i], 0, pX[i], pY[i], pR[i])
        rg.addColorStop(0, `rgba(215,232,255,${a})`); rg.addColorStop(1, 'rgba(215,232,255,0)')
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
