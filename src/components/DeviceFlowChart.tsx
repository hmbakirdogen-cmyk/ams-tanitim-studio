/*
 * NE      : "Cihaz Akışı" - Canlı Panel'in 2. canlı görünümü. GERÇEK SMC AMS ünitesi (ams-front.jpg) olduğu gibi gösterilir;
 *           üzerinde ÇOK SADE bir akış: boru ekseninde soldan sağa akan ışık noktaları. Molekül/duman/LED/LCD YOK.
 *
 * NEDEN   : Mehmet Abi (16 denemeden sonra net karar): "çok sade — sadece akan ışık noktaları". Hız=debi, renk=sıcaklık.
 *           Abartı yok; temiz, okunur, gerçekçi-yeterli.
 *
 * NASIL   : Saf Canvas 2D, dt-bazlı (144Hz güvenli), sabit havuz (kare-başı tahsis yok), ön-render gauss sprite.
 *           Foto fotodan port ekseni/çapı ölçülür (boru hizası). Boru içi hafif koyu cam → açık ürün üstünde noktalar görünür.
 *           Nokta: additive gauss blob, sıcaklık renginde; hız ∝ debi; merkez hızlı/çeper yavaş (parabolik); panel kenar-adaptasyonu.
 * YAN ETKI: Offline (foto gömülü). Üstüne PipeOverlay biner (mod + anlık değer + eşik + giriş/çıkış).
 */
import { useEffect, useMemo, useRef } from 'react'
import { asset } from '@/lib/asset'
import type { Reading, Mode } from '@/data/types'
import { METRICS, type MetricDef } from '@/data/metrics'

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const DEV_FILL = 0.985
const FB_AXIS = 0.72, FB_PIPE = 0.07, FB_IN = 0.03, FB_OUT = 0.97
const DOT_COUNT = 90

// Sıcaklık rampası (dünya std mavi→kırmızı) — nokta rengi
const TEMP_STOPS: { t: number; c: [number, number, number] }[] = [
  { t: 0.0, c: [70, 150, 245] }, { t: 0.35, c: [40, 205, 205] }, { t: 0.55, c: [110, 225, 110] },
  { t: 0.72, c: [235, 215, 70] }, { t: 0.86, c: [248, 150, 50] }, { t: 1.0, c: [230, 70, 45] },
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

export function DeviceFlowChart({
  reading, metrics = METRICS, theme = 'dark',
}: { reading: Reading | null; metrics?: MetricDef[]; mode?: Mode; theme?: 'dark' | 'light' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const byKey = useMemo(() => Object.fromEntries(metrics.map((m) => [m.key, m])) as Record<string, MetricDef>, [metrics])
  const targetRef = useRef({ flow: 0, temp: 0 })
  {
    const nv = (k: string) => { const m = byKey[k]; return !m || !reading ? 0 : clamp01((m.get(reading) - m.min) / (m.max - m.min)) }
    targetRef.current = { flow: nv('flow'), temp: nv('temperature') }
  }
  const themeRef = useRef(theme); themeRef.current = theme

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')!

    // Foto + port ekseni/çapı ölçümü (görüntüye dokunma)
    const img = new Image()
    let deviceCanvas: HTMLCanvasElement | null = null
    let devAR = 1
    const meas = { axis: FB_AXIS, pipe: FB_PIPE, inX: FB_IN, outX: FB_OUT }
    img.onload = () => {
      devAR = img.width / img.height
      const oc = document.createElement('canvas'); oc.width = img.width; oc.height = img.height
      oc.getContext('2d')!.drawImage(img, 0, 0)
      deviceCanvas = oc
      try {
        const Wp = img.width, Hp = img.height
        const a = oc.getContext('2d')!.getImageData(0, 0, Wp, Hp).data
        const N = Wp * Hp
        const isContent = (p: number) => { const i = p * 4; return Math.min(a[i], a[i + 1], a[i + 2]) < 238 }
        let minX = Wp, maxX = 0, minY = Hp, maxY = 0
        for (let p = 0; p < N; p++) if (isContent(p)) { const x = p % Wp, y = (p - x) / Wp; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y }
        if (maxX > minX && maxY > minY) {
          const cw = maxX - minX + 1, ch = maxY - minY + 1
          const port = (xc: number) => { let b = -1; for (let y = maxY; y >= minY; y--) if (isContent(y * Wp + xc)) { b = y; break }; if (b < 0) return null; let tY = b; for (let y = b; y >= minY; y--) { if (isContent(y * Wp + xc)) tY = y; else break }; return { c: (tY + b) / 2, h: b - tY + 1 } }
          const lp = port(minX + Math.round(cw * 0.03)), rp = port(maxX - Math.round(cw * 0.03))
          const ps = [lp, rp].filter(Boolean) as { c: number; h: number }[]
          if (ps.length) {
            meas.axis = ps.reduce((s, p) => s + p.c, 0) / ps.length / Hp
            meas.pipe = Math.max(0.03, Math.min(0.14, ps.reduce((s, p) => s + p.h, 0) / ps.length / Hp))
            meas.inX = (minX + cw * 0.01) / Wp; meas.outX = (maxX - cw * 0.01) / Wp
          }
        }
      } catch { /* taint → fallback */ }
    }
    img.src = asset('products/ams-front.jpg')

    // Ön-render yumuşak ışık noktası (beyaz; renk additive tülden gelir)
    const makeDot = () => {
      const s = 48, c = document.createElement('canvas'); c.width = s; c.height = s
      const g = c.getContext('2d')!
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
      grd.addColorStop(0, 'rgba(255,255,255,0.95)'); grd.addColorStop(0.4, 'rgba(220,235,255,0.4)'); grd.addColorStop(1, 'rgba(220,235,255,0)')
      g.fillStyle = grd; g.fillRect(0, 0, s, s)
      return c
    }
    let dot = makeDot()

    const sig = { flow: 0, temp: 0 }
    const dPhase = Float32Array.from({ length: DOT_COUNT }, () => Math.random())
    const dLane = Float32Array.from({ length: DOT_COUNT }, () => Math.random() * 2 - 1)
    const dSpd = Float32Array.from({ length: DOT_COUNT }, () => 0.8 + Math.random() * 0.4)
    const dSz = Float32Array.from({ length: DOT_COUNT }, () => 0.7 + Math.random() * 0.7)

    let W = 0, H = 0, dpr = 1
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = wrap.clientWidth; H = wrap.clientHeight
      canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr))
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      dot = makeDot()
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(wrap)

    let raf = 0, last = performance.now()
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const t = targetRef.current, k = Math.min(1, dt * 4)
      sig.flow += (t.flow - sig.flow) * k
      sig.temp += (t.temp - sig.temp) * k
      const [tr, tg, tb] = tempRGB(clamp01(0.5 + (sig.temp - 0.5) * 1.2 + 0.04))
      const dark = themeRef.current !== 'light'
      const panel = dark ? '6,12,26' : '231,240,249'

      // temiz (cizgi izi yok — sade)
      ctx.clearRect(0, 0, W, H)

      let dw = W * DEV_FILL, dh = dw / devAR
      if (dh > H * DEV_FILL) { dh = H * DEV_FILL; dw = dh * devAR }
      const dx = (W - dw) / 2, dy = (H - dh) / 2
      const axisY = dy + dh * meas.axis
      const pipeH = Math.max(10, dh * meas.pipe)
      const top = axisY - pipeH / 2, bot = axisY + pipeH / 2
      const inX = dx + dw * meas.inX, outX = dx + dw * meas.outX
      const span = outX - inX

      // 1) GERÇEK ÜRÜN
      if (deviceCanvas) ctx.drawImage(deviceCanvas, dx, dy, dw, dh)

      // 1b) KENAR ADAPTASYONU (panel rengine yumuşak geçiş — çerçeveyle kaynaşır)
      const fadeW = Math.min(W, H) * 0.14
      const edge = (gx0: number, gy0: number, gx1: number, gy1: number, rx: number, ry: number, rw: number, rh: number) => {
        const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1)
        g.addColorStop(0, `rgba(${panel},1)`); g.addColorStop(1, `rgba(${panel},0)`)
        ctx.fillStyle = g; ctx.fillRect(rx, ry, rw, rh)
      }
      edge(0, 0, fadeW, 0, 0, 0, fadeW, H)
      edge(W, 0, W - fadeW, 0, W - fadeW, 0, fadeW, H)
      edge(0, 0, 0, fadeW, 0, 0, W, fadeW)
      edge(0, H, 0, H - fadeW, 0, H - fadeW, W, fadeW)

      // 2) BORU içi — hafif koyu cam (açık ürün üstünde noktalar görünür)
      const pg = ctx.createLinearGradient(0, top, 0, bot)
      pg.addColorStop(0, 'rgba(150,175,210,0.30)'); pg.addColorStop(0.5, 'rgba(12,20,38,0.42)'); pg.addColorStop(1, 'rgba(6,10,22,0.34)')
      ctx.fillStyle = pg; ctx.fillRect(inX, top, span, pipeH)

      // 3) AKAN IŞIK NOKTALARI — sade. hız ∝ debi, renk = sıcaklık, merkez hızlı (parabolik), additive ışıma.
      const baseV = 0.05 + 0.95 * sig.flow
      ctx.globalCompositeOperation = 'lighter'
      const pr = pipeH * 0.4
      for (let i = 0; i < DOT_COUNT; i++) {
        const laneN = dLane[i]
        const prof = 0.3 + 0.7 * (1 - laneN * laneN) // merkez hızlı, çeper yavaş
        dPhase[i] += (baseV * dSpd[i] * prof * 0.5 + 0.005) * dt
        if (dPhase[i] > 1) dPhase[i] -= 1
        const x = inX + dPhase[i] * span
        const y = axisY + laneN * pr
        const sz = (2.5 + dSz[i] * 3) * (0.7 + sig.flow * 0.6)
        const al = (0.25 + 0.55 * sig.flow)
        ctx.globalAlpha = al
        // beyaz nokta + sıcaklık tülü (renk için): noktayı renkli göstermek için önce renkli alt-glow
        ctx.fillStyle = `rgba(${tr},${tg},${tb},${al})`
        ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = al * 0.7
        ctx.drawImage(dot, (x - sz) | 0, (y - sz) | 0, (sz * 2) | 0, (sz * 2) | 0) // beyaz çekirdek parlaması
      }
      ctx.globalAlpha = 1
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
