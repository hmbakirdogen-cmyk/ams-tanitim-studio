/*
 * NE      : "Cihaz Akışı" - Canlı Panel'in 2. canlı görünümü. GERÇEK SMC AMS ünitesinin ÖNDEN fotosu OLDUĞU GİBİ (arka planı
 *           kırpılmadan/knockout YAPILMADAN) gösterilir; üzerinde cihazın gerçek hava yolu boyunca top-seviye canlı animasyon.
 *           Her hücre CANLI veriden beslenir. Boru = cihazın giriş/çıkış portu ekseni+ölçüsü (fotodan ölçülür, görüntüye dokunulmaz).
 *
 * NEDEN   : Mehmet Abi: "resmi olduğu gibi getir, arka planını kırpma; duman tam egzoz portundan çıksın; LED'ler yapay ışık gibi
 *           değil, ürünün KENDİ ışığıymış gibi gerçek yerlerinde yansın." → konumlar TAHMİN değil, fotodan TESPİT edilir.
 *
 * NASIL   : Saf Canvas 2D, dt-bazlı (144Hz güvenli), sabit havuz (kare-başı tahsis yok).
 *           Foto offscreen'e ÇİZİLİR ve OLDUĞU GİBİ gösterilir. Ayrı bir piksel taraması (görüntüyü DEĞİŞTİRMEDEN) şunları ölçer:
 *             - içerik sınırı + port ekseni/çapı (boru hizası),
 *             - koyu bağlı-bileşenler → LCD ekran(lar)ı + valf egzoz konnektörü konumu.
 *           LED'ler bu TESPİT edilen özelliklere bağlanır (hub LED satırı LCD'nin altında, valf LED'i konnektörde), küçük + sönük
 *           (cihazın kendi göstergesi gibi). Egzoz dumanı tespit edilen konnektörün dibinden, dar ağızdan aşağı çıkar.
 *           Sıcaklık = dünya std mavi→kırmızı (genişletilmiş + hafif sıcak bias). Her sensör kendi karakteristik rengini taşır.
 * YAN ETKI: Offline (foto gömülü). Üstüne PipeOverlay biner (mod + anlık değer + eşik + giriş/çıkış + "devrede" rozeti).
 */
import { useEffect, useMemo, useRef } from 'react'
import { asset } from '@/lib/asset'
import type { Reading, Mode } from '@/data/types'
import { METRICS, type MetricDef } from '@/data/metrics'

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

const DEV_FILL = 0.985
const FB_AXIS = 0.72, FB_PIPE = 0.07, FB_IN = 0.03, FB_OUT = 0.97
const REG_FRAC: [number, number] = [0.12, 0.34]
const REG_CX = 0.22
const VALVE_CX = 0.80
// Fallback ekran + egzoz + LED konumlari (tum-foto orani) — tespit tutmazsa
const FB_DISPLAY = { x: 0.42, y: 0.27, w: 0.15, h: 0.16 }
const FB_EXHAUST: [number, number] = [0.78, 0.60]

const FLOW_COUNT = 160
const MOLE_COUNT = 90
const DROPLET_MAX = 60
const PUFF_COUNT = 56

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
  const targetRef = useRef({ flow: 0, pressure: 0, temp: 0, hum: 0, mode })
  const colorRef = useRef({ flow: [46, 155, 255], pressure: [54, 224, 200], hum: [124, 224, 255] as number[] })
  const readoutRef = useRef<{ value: string; unit: string; rgb: number[] }[]>([])
  {
    const nv = (k: string) => { const m = byKey[k]; return !m || !reading ? 0 : clamp01((m.get(reading) - m.min) / (m.max - m.min)) }
    targetRef.current = { flow: nv('flow'), pressure: nv('pressure'), temp: nv('temperature'), hum: nv('humidity'), mode }
    if (byKey.flow) colorRef.current.flow = hexRGB(byKey.flow.color)
    if (byKey.pressure) colorRef.current.pressure = hexRGB(byKey.pressure.color)
    if (byKey.humidity) colorRef.current.hum = hexRGB(byKey.humidity.color)
    const fmt = (m: MetricDef | undefined) => {
      if (!m || !reading) return null
      const v = m.get(reading)
      return { value: new Intl.NumberFormat('tr-TR', { minimumFractionDigits: m.digits, maximumFractionDigits: m.digits }).format(v), unit: m.unitShort, rgb: hexRGB(m.color) }
    }
    readoutRef.current = [fmt(byKey.pressure), fmt(byKey.flow), fmt(byKey.temperature)].filter(Boolean) as { value: string; unit: string; rgb: number[] }[]
  }
  const themeRef = useRef(theme)
  themeRef.current = theme

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')!

    const img = new Image()
    let deviceCanvas: HTMLCanvasElement | null = null
    let devAR = 1
    const meas = { axis: FB_AXIS, pipe: FB_PIPE, inX: FB_IN, outX: FB_OUT }
    let lcd = { ...FB_DISPLAY }       // ana hub LCD (tum-foto orani)
    let exhaust: [number, number] = FB_EXHAUST // valf egzoz konnektörü merkezi (tum-foto orani)
    let exhaustR = 0.04               // konnektör yaricapi orani
    img.onload = () => {
      devAR = img.width / img.height
      const oc = document.createElement('canvas')
      oc.width = img.width; oc.height = img.height
      oc.getContext('2d')!.drawImage(img, 0, 0)
      deviceCanvas = oc // OLDUĞU GİBİ göster — knockout/kırpma YOK
      try {
        const Wp = img.width, Hp = img.height
        // ANALIZ icin AYRI okuma (goruntuyu DEĞİŞTİRMEZ)
        const a = oc.getContext('2d')!.getImageData(0, 0, Wp, Hp).data
        const N = Wp * Hp
        const bright = (p: number) => { const i = p * 4; return Math.min(a[i], a[i + 1], a[i + 2]) }
        const isContent = (p: number) => bright(p) < 238 // beyaz olmayan = cihaz
        const isDark = (p: number) => { const i = p * 4; return a[i] < 100 && a[i + 1] < 110 && a[i + 2] < 125 } // koyu (ekran/konnektör)
        // icerik siniri
        let minX = Wp, maxX = 0, minY = Hp, maxY = 0
        for (let p = 0; p < N; p++) if (isContent(p)) { const x = p % Wp, y = (p - x) / Wp; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y }
        if (maxX > minX && maxY > minY) {
          const cw = maxX - minX + 1, ch = maxY - minY + 1
          // port ekseni/capi: kenar seritlerinde (sol/sag) EN ALT surekli icerik bandi
          const measurePort = (xc: number) => {
            let bottom = -1
            for (let y = maxY; y >= minY; y--) { if (isContent(y * Wp + xc)) { bottom = y; break } }
            if (bottom < 0) return null
            let topY = bottom
            for (let y = bottom; y >= minY; y--) { if (isContent(y * Wp + xc)) topY = y; else break }
            return { center: (topY + bottom) / 2, height: bottom - topY + 1 }
          }
          const lp = measurePort(minX + Math.round(cw * 0.03)), rp = measurePort(maxX - Math.round(cw * 0.03))
          const ports = [lp, rp].filter(Boolean) as { center: number; height: number }[]
          if (ports.length) {
            meas.axis = ports.reduce((s, p) => s + p.center, 0) / ports.length / Hp
            meas.pipe = Math.max(0.03, Math.min(0.16, ports.reduce((s, p) => s + p.height, 0) / ports.length / Hp))
            meas.inX = (minX + cw * 0.01) / Wp; meas.outX = (maxX - cw * 0.01) / Wp
          }
        }
        // KOYU bağlı-bileşenler (LCD + konnektörler)
        const lab = new Int32Array(N).fill(-1)
        const comps: { cx: number; cy: number; w: number; h: number; n: number }[] = []
        const qs: number[] = []
        for (let p = 0; p < N; p++) {
          if (lab[p] !== -1 || !isDark(p)) continue
          const id = comps.length; lab[p] = id; qs.length = 0; qs.push(p)
          let x0 = Wp, y0 = Hp, x1 = 0, y1 = 0, cnt = 0
          while (qs.length) {
            const q = qs.pop()!; const x = q % Wp, y = (q - x) / Wp
            if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; cnt++
            const nb = [x > 0 ? q - 1 : -1, x < Wp - 1 ? q + 1 : -1, y > 0 ? q - Wp : -1, y < Hp - 1 ? q + Wp : -1]
            for (const r of nb) if (r >= 0 && lab[r] === -1 && isDark(r)) { lab[r] = id; qs.push(r) }
          }
          comps.push({ cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0 + 1, h: y1 - y0 + 1, n: cnt })
        }
        // LCD: ust-merkez bolgede, makul dikdortgen, en buyuk
        const lcdC = comps
          .filter((c) => c.w > Wp * 0.06 && c.h > Hp * 0.04 && c.w < Wp * 0.34 && c.h < Hp * 0.34 && c.cy < Hp * 0.55 && c.cx > Wp * 0.30 && c.cx < Wp * 0.72 && c.n > c.w * c.h * 0.35)
          .sort((p, q) => q.n - p.n)[0]
        if (lcdC) lcd = { x: (lcdC.cx - lcdC.w / 2) / Wp, y: (lcdC.cy - lcdC.h / 2) / Hp, w: lcdC.w / Wp, h: lcdC.h / Hp }
        // VALF EGZOZ KONNEKTÖRÜ: sag bolgede (cx>0.6), en ALTTAKI yuvarlakca koyu blob
        const conn = comps
          .filter((c) => c.cx > Wp * 0.6 && c.w > Wp * 0.04 && c.h > Hp * 0.04 && c.w < Wp * 0.2 && c.h < Hp * 0.2)
          .sort((p, q) => q.cy - p.cy)[0]
        if (conn) { exhaust = [conn.cx / Wp, conn.cy / Hp]; exhaustR = Math.max(conn.w, conn.h) / 2 / Hp }
      } catch { /* taint → fallback */ }
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

    // LED: cihazın KENDİ göstergesi gibi — küçük çekirdek + KISA, sönük hale (yapay orb değil)
    const led = (cx: number, cy: number, rgb: string, on: number, r: number) => {
      if (on < 0.05) return
      ctx.globalCompositeOperation = 'lighter'
      const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.0)
      g2.addColorStop(0, `rgba(${rgb},${0.85 * on})`); g2.addColorStop(0.5, `rgba(${rgb},${0.2 * on})`); g2.addColorStop(1, `rgba(${rgb},0)`)
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, r * 2.0, 0, Math.PI * 2); ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = `rgba(${rgb},${Math.min(1, 0.6 + 0.4 * on)})`
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
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
      sig.valve += (valveTarget - sig.valve) * Math.min(1, dt * 0.9) // soft-starter: kademeli
      sig.exhaust += (sig.valve * (1 - sig.valve * 0.15) - sig.exhaust) * Math.min(1, dt * 1.1)

      const fc = colorRef.current.flow, pc = colorRef.current.pressure, hc = colorRef.current.hum
      // Isı rengi: YUMUŞAK (Mehmet Abi "çok kırmızı oldu, tamamen yumuşalt") — ölçülü genişletme + minik bias
      const tempEff = clamp01(0.5 + (sig.temp - 0.5) * 1.35 + 0.06)
      const [tr, tg, tb] = tempRGB(tempEff)
      const cP = (al: number) => `rgba(${pc[0]},${pc[1]},${pc[2]},${al})`
      const cH = (al: number) => `rgba(${hc[0]},${hc[1]},${hc[2]},${al})`
      const cT = (al: number) => `rgba(${tr},${tg},${tb},${al})`
      const dark = themeRef.current !== 'light'

      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = dark ? 'rgba(6,10,22,0.34)' : 'rgba(225,235,247,0.42)'
      ctx.fillRect(0, 0, W, H)

      let dw = W * DEV_FILL, dh = dw / devAR
      if (dh > H * DEV_FILL) { dh = H * DEV_FILL; dw = dh * devAR }
      const dx = (W - dw) / 2, dy = (H - dh) / 2
      const axisY = dy + dh * meas.axis
      const pipeH = Math.max(8, dh * meas.pipe)
      const top = axisY - pipeH / 2, bot = axisY + pipeH / 2
      const inX = dx + dw * meas.inX, outX = dx + dw * meas.outX
      const regX0 = dx + dw * REG_FRAC[0], regX1 = dx + dw * REG_FRAC[1]
      const regCx = dx + dw * REG_CX, regCy = dy + dh * 0.40
      const valveCx = dx + dw * VALVE_CX
      const exOx = dx + dw * exhaust[0], exOy = dy + dh * (exhaust[1] + exhaustR) // konnektör DİBİ
      const markR = Math.min(dw, dh) * 0.10

      // 1) GERÇEK CİHAZ FOTOSU — OLDUĞU GİBİ (arka planı dahil, kırpma yok), tam görünür
      if (deviceCanvas) ctx.drawImage(deviceCanvas, dx, dy, dw, dh)

      // 2) BORU + giriş/çıkış (port ekseni+çapı). source-over → beyaz foto üstünde de görünür.
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = cT(0.10); ctx.fillRect(0, top, W, pipeH)
      ctx.strokeStyle = cT(0.5); ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(W, top); ctx.moveTo(0, bot); ctx.lineTo(W, bot); ctx.stroke()
      const coupler = (cx: number) => {
        const cwd = Math.max(7, pipeH * 0.22)
        const cgr = ctx.createLinearGradient(0, top, 0, bot)
        cgr.addColorStop(0, 'rgba(150,168,190,0.95)'); cgr.addColorStop(0.5, 'rgba(80,98,122,0.95)'); cgr.addColorStop(1, 'rgba(130,148,172,0.95)')
        ctx.fillStyle = cgr
        if ((ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect) { ctx.beginPath(); ctx.roundRect(cx - cwd / 2, top - 3, cwd, pipeH + 6, 3); ctx.fill() }
        else ctx.fillRect(cx - cwd / 2, top - 3, cwd, pipeH + 6)
      }
      coupler(inX); coupler(outX)

      // 3) AKAN HAVA — SICAKLIK renginde streak (source-over → beyaz üstünde de okunur), uzunluk∝debi. Valf kapanınca geri-akış.
      const pr = pipeH * 0.42
      const baseV = 0.05 + 0.95 * sig.flow
      ctx.lineCap = 'round'
      for (let i = 0; i < FLOW_COUNT; i++) {
        const layer = fLayer[i], depth = layer === 0 ? 0.55 : layer === 1 ? 0.8 : 1.15
        const x0 = fPhase[i] * W
        if (sig.valve > 0.12 && x0 > valveCx) {
          // GERİ AKIŞ: çıkış havası valfe geri akar → valfte aşağı kıvrılıp egzoza dökülür
          fPhase[i] -= (0.10 + 0.45 * sig.valve) * fSpd[i] * dt
          let x = fPhase[i] * W
          if (x <= valveCx) { fPhase[i] = (W - 2) / W; x = fPhase[i] * W }
          const prog = clamp01((x - valveCx) / Math.max(1, outX - valveCx))
          const dropY = (1 - prog) * pipeH * 0.9 * sig.valve
          const y = axisY + fLane[i] * pr * 0.5 + dropY
          const al = (0.30 + 0.45 * sig.valve) * (layer === 0 ? 0.55 : 1)
          ctx.strokeStyle = cT(al); ctx.lineWidth = 1.4 + 1.0 * depth
          const len = (5 + 12 * sig.valve) * depth
          ctx.beginPath(); ctx.moveTo(x + len, y - dropY * 0.25); ctx.lineTo(x, y); ctx.stroke()
          continue
        }
        fPhase[i] += (baseV * fSpd[i] * depth * 0.55 + 0.008) * dt
        if (fPhase[i] > 1) fPhase[i] -= 1
        const x = fPhase[i] * W
        if (x > valveCx && sig.valve > 0.12) continue
        const y = axisY + fLane[i] * pr * (0.6 + 0.4 * depth)
        const len = (6 + baseV * 34) * depth
        const al = (0.32 + 0.5 * sig.flow) * (layer === 0 ? 0.5 : layer === 1 ? 0.8 : 1)
        ctx.strokeStyle = cT(al); ctx.lineWidth = (1.4 + 1.2 * depth) * (0.6 + sig.flow * 0.8)
        ctx.beginPath(); ctx.moveTo(x - len, y); ctx.lineTo(x, y); ctx.stroke()
      }

      // 4) REGÜLATÖR — diatomik moleküller (BASINÇ renginde) sıkışır
      const moleVisible = Math.round(MOLE_COUNT * (0.16 + 0.84 * sig.pressure))
      const jitter = 0.4 + 2.4 * sig.pressure, regW = regX1 - regX0
      for (let i = 0; i < moleVisible; i++) {
        const u = Math.pow(mU[i], 1 + sig.pressure * 1.3)
        const x = regX0 + u * regW + (Math.random() - 0.5) * jitter
        const y = axisY + mLane[i] * pr * 0.85 + (Math.random() - 0.5) * jitter
        const al = 0.4 + 0.5 * sig.pressure
        const rot = mRot[i] + now * 0.001, dxm = Math.cos(rot) * 2.2, dym = Math.sin(rot) * 2.2
        ctx.strokeStyle = cP(al * 0.7); ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x - dxm, y - dym); ctx.lineTo(x + dxm, y + dym); ctx.stroke()
        ctx.fillStyle = cP(al)
        ctx.beginPath(); ctx.arc(x - dxm, y - dym, 1.5, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(x + dxm, y + dym, 1.5, 0, Math.PI * 2); ctx.fill()
      }

      // 5) SU DAMLALARI (nem) — boru ALT iç çeperinde, GERÇEKÇİ: yumuşak radyal dolgu (cam damla), ince çift highlight, yavaş süzülme.
      //   Çizgifilm hissi yok → düz renk yerine gradient, sert daire highlight yerine yumuşak, çoğu küçük & sabit (yer çekimiyle nadiren kayar).
      const wantActive = Math.round(sig.hum * DROPLET_MAX)
      for (let i = 0; i < wantActive; i++) {
        if (dR[i] > 5.0) dSlide[i] = Math.min(1, dSlide[i] + dt * 0.4) // sadece büyükler, yavaşça
        dX[i] += (0.0015 + dSlide[i] * 0.03) * dt * 60 / W // çoğu neredeyse sabit (gerçek kondensasyon)
        if (dX[i] > 1) { dX[i] -= 1; dSlide[i] = 0 }
        const x = dX[i] * W, y = bot - dR[i] * 0.55 - dLane[i] * 1.5
        const rw = dR[i] * (1.18 + dR[i] * 0.03), rh = dR[i] // hafif yassı (yer çekimi)
        // gövde: merkeze yakın saydam, kenara doğru nem renginde → camsı hacim
        const g = ctx.createRadialGradient(x - rw * 0.25, y - rh * 0.3, rh * 0.1, x, y, rw)
        g.addColorStop(0, cH(0.10)); g.addColorStop(0.55, cH(0.34)); g.addColorStop(1, cH(0.5))
        ctx.fillStyle = g
        ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2); ctx.fill()
        // alt-sağ koyu kırılma kenarı (hacim) + üst-sol yumuşak speküler
        ctx.strokeStyle = cH(0.22); ctx.lineWidth = 0.5
        ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke()
        const hl = ctx.createRadialGradient(x - rw * 0.32, y - rh * 0.38, 0, x - rw * 0.32, y - rh * 0.38, rw * 0.45)
        hl.addColorStop(0, 'rgba(255,255,255,0.6)'); hl.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.fillStyle = hl
        ctx.beginPath(); ctx.arc(x - rw * 0.32, y - rh * 0.38, rw * 0.45, 0, Math.PI * 2); ctx.fill()
      }

      // 6) VALF EGZOZU — TESPİT EDİLEN konnektörün dibinden, DAR ağızdan AŞAĞI (gerçek port)
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < PUFF_COUNT; i++) {
        pLife[i] -= dt / (0.6 + Math.random() * 0.6)
        if (pLife[i] <= 0) {
          if (sig.exhaust > 0.08) {
            const sp = (140 + Math.random() * 180) * (0.5 + sig.exhaust)
            pX[i] = exOx + (Math.random() - 0.5) * Math.max(2.5, dh * exhaustR * 0.8)
            pY[i] = exOy
            pVx[i] = (Math.random() - 0.5) * 28
            pVy[i] = sp; pR[i] = 1.4; pLife[i] = 1
          } else continue
        }
        pVx[i] *= 0.94; pVy[i] = pVy[i] * 0.95 + 42 * dt
        pX[i] += pVx[i] * dt; pY[i] += pVy[i] * dt
        pR[i] += (16 - pR[i]) * dt * 2.2
        const l = Math.max(0, pLife[i])
        const al = (l < 0.9 ? l : (1 - l) * 9) * 0.5 * sig.exhaust
        if (al <= 0.01) continue
        const rg = ctx.createRadialGradient(pX[i], pY[i], 0, pX[i], pY[i], pR[i])
        rg.addColorStop(0, `rgba(220,235,255,${al})`); rg.addColorStop(1, 'rgba(220,235,255,0)')
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(pX[i], pY[i], pR[i], 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      // 7) CİHAZ LED'LERİ — TESPİT edilen LCD/konnektöre bağlı, KÜÇÜK+sönük (ürünün kendi göstergesi gibi)
      const blink = 0.55 + 0.45 * Math.sin(now * 0.009)
      const slowBlink = 0.45 + 0.55 * Math.sin(now * 0.005)
      const ledR = Math.max(1.3, dh * 0.009)
      const isStandby = t.mode === 'standby', isIso = t.mode === 'isolation'
      // Hub LED satırı: LCD'nin hemen ALTINDA, LCD genişliğine yayılı (PWR · MODE · SIG)
      const rowY = dy + (lcd.y + lcd.h) * dh + dh * 0.012
      const lcdL = dx + lcd.x * dw, lcdR = dx + (lcd.x + lcd.w) * dw
      const lxAt = (f: number) => lcdL + (lcdR - lcdL) * (0.25 + 0.5 * f)
      led(lxAt(0), rowY, '65,224,138', 0.8, ledR)                                                       // PWR yeşil sabit
      led(lxAt(0.5), rowY, isStandby || isIso ? '255,150,40' : '65,224,138', isIso ? blink : 0.8, ledR) // MODE
      led(lxAt(1), rowY, isIso ? '255,150,40' : '65,224,138', (isStandby || isIso) ? blink : 0.3, ledR) // SIG
      // Regülatör LED (Tip A ITV) yeşil — sol modül
      led(regCx, regCy, '65,224,138', 0.55 + 0.45 * sig.reg * slowBlink, ledR)
      // Valf solenoid LED — TESPİT edilen konnektör ÜSTÜ, KIRMIZI (izolasyonda enerji)
      led(dx + dw * exhaust[0], dy + dh * (exhaust[1] - exhaustR), '255,60,48', sig.valve * (0.6 + 0.4 * blink), ledR)

      // 8) CİHAZ LCD'si — SMC hub düzeni, HER HÜCRE CANLI (P/Q/T + büyük rakam + birim)
      const ro2 = readoutRef.current
      if (ro2.length) {
        const rx = dx + lcd.x * dw, ry = dy + lcd.y * dh, rw = lcd.w * dw, rh = lcd.h * dh
        ctx.fillStyle = 'rgba(3,8,16,0.80)'
        if ((ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect) { ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, Math.min(4, rh * 0.1)); ctx.fill() } else ctx.fillRect(rx, ry, rw, rh)
        ctx.strokeStyle = 'rgba(110,150,200,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1)
        const rows = ro2.slice(0, 3), padX = rw * 0.07, lh = (rh - rh * 0.06) / rows.length
        ctx.textBaseline = 'middle'
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i], cy = ry + rh * 0.03 + lh * (i + 0.5), [rr, gg, bb] = r.rgb
          if (i > 0) { ctx.strokeStyle = 'rgba(120,160,210,0.16)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(rx + padX, ry + rh * 0.03 + lh * i); ctx.lineTo(rx + rw - padX, ry + rh * 0.03 + lh * i); ctx.stroke() }
          const fsLab = Math.max(5, Math.min(lh * 0.32, rw * 0.1))
          ctx.font = `600 ${fsLab}px ui-monospace, Menlo, monospace`; ctx.textAlign = 'left'
          ctx.fillStyle = `rgba(${rr},${gg},${bb},0.7)`; ctx.fillText(['P', 'Q', 'T'][i] ?? '', rx + padX, cy)
          const fs = Math.max(8, Math.min(lh * 0.62, rw * 0.2))
          ctx.font = `700 ${fs}px ui-monospace, Menlo, monospace`; ctx.textAlign = 'right'
          ctx.shadowColor = `rgba(${rr},${gg},${bb},0.95)`; ctx.shadowBlur = fs * 0.5
          ctx.fillStyle = `rgb(${rr},${gg},${bb})`; ctx.fillText(r.value, rx + rw - rw * 0.30, cy)
          ctx.shadowBlur = 0
          ctx.font = `500 ${fs * 0.55}px ui-monospace, Menlo, monospace`; ctx.textAlign = 'left'
          ctx.fillStyle = `rgba(${rr},${gg},${bb},0.85)`; ctx.fillText(r.unit, rx + rw - rw * 0.27, cy)
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
