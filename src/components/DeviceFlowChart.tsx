/*
 * NE      : "Cihaz Akışı" - Canlı Panel'in 2. canlı görünümü. GERÇEK SMC AMS ünitesi (yüksek çöz. render) OLDUĞU GİBİ gösterilir
 *           (kırpma/knockout YOK); üzerinde FOTOREALIST, araştırma-temelli canlı animasyon (renksiz wispy akış, sis regülasyonu,
 *           3-bölge türbülanslı egzoz dumanı). Her hücre CANLI veriden beslenir. İki görsel adayı (A/B) köşeden değiştirilebilir.
 *
 * NEDEN   : Mehmet Abi: "gerçek ürünün üzerinde animasyonlar komik kaldı; tek derdim GERÇEKÇİLİK; akışta/egzozda bile."
 *           → çizgifilm streak/molekül/puff BIRAKILDI. Schlieren/curl-noise/vapor spec'leri (silikon-vadisi pratik) uygulandı.
 *
 * NASIL   : Saf Canvas 2D, dt-bazlı (144Hz güvenli), SABİT havuz + ÖN-RENDER sprite (kare-başı createGradient YOK).
 *   AKIŞ  : renksiz (near-white) yumuşak gauss bloblar, ÇOK düşük alpha (0.02–0.10), additive; hıza göre uzar; parabolik hız
 *           profili (merkez hızlı, çepere yavaş); curl-ish gezinme (2 sinüs oktav); 3 parallax katman (arka blur/sönük/yavaş).
 *           Sıcaklık SADECE ≤%10 tint (renksiz hava). Boru içi yuvarlak: üst glint + alt iç gölge gradyanı.
 *   REGÜL : molekül YOK → ince sis (sub-pixel speck) yoğunluk farkı; basınçla upstream YOĞUN+titrek → orifis → downstream SEYREK.
 *   EGZOZ : 3-bölge türbülanslı tüy: çekirdek (additive, sıcak) + bulut (normal, soğuk-beyaz), drag + curl + büyü-sön; soft-start.
 * YAN ETKI: Offline (görseller gömülü). Üstüne PipeOverlay biner. Görsel seçimi localStorage 'ams_flow_variant'.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { asset } from '@/lib/asset'
import type { Reading, Mode } from '@/data/types'
import { METRICS, type MetricDef } from '@/data/metrics'

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const VARIANT_KEY = 'ams_flow_variant'

const DEV_FILL = 0.97
const FB_AXIS = 0.5, FB_PIPE = 0.055, FB_IN = 0.03, FB_OUT = 0.97
const REG_FRAC: [number, number] = [0.14, 0.34]
const REG_CX = 0.22, VALVE_CX = 0.80
const FB_EXHAUST: [number, number] = [0.80, 0.62]

const FLOW_COUNT = 300
const HAZE_COUNT = 240
const PUFF_COUNT = 150

// Sıcaklık rampası (dünya std mavi→kırmızı) — yalnızca tint için
const TEMP_STOPS: { t: number; c: [number, number, number] }[] = [
  { t: 0.0, c: [60, 120, 230] }, { t: 0.3, c: [40, 200, 210] }, { t: 0.5, c: [110, 225, 110] },
  { t: 0.7, c: [230, 215, 70] }, { t: 0.85, c: [245, 150, 50] }, { t: 1.0, c: [225, 70, 45] },
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
// Ön-render yumuşak gauss sprite (kare-başı gradient YOK)
function gaussSprite(rPx: number, rgb: [number, number, number], inner: number): HTMLCanvasElement {
  const s = Math.max(2, Math.round(rPx * 2))
  const c = document.createElement('canvas'); c.width = s; c.height = s
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
  grd.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${inner})`)
  grd.addColorStop(0.4, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${inner * 0.45})`)
  grd.addColorStop(0.7, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${inner * 0.12})`)
  grd.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`)
  g.fillStyle = grd; g.fillRect(0, 0, s, s)
  return c
}
// cheap 2-oktav curl-ish gürültü (alloc yok)
function curlX(x: number, y: number) { return Math.sin(x * 1.3 + y * 0.7) + 0.5 * Math.sin(x * 2.7 - y * 1.9) }
function curlY(x: number, y: number) { return Math.cos(x * 0.9 - y * 1.5) + 0.5 * Math.cos(x * 2.1 + y * 1.1) }

export function DeviceFlowChart({
  reading, metrics = METRICS, mode = 'normal', theme = 'dark',
}: { reading: Reading | null; metrics?: MetricDef[]; mode?: Mode; theme?: 'dark' | 'light' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [variant, setVariant] = useState<'a' | 'b'>(() => (localStorage.getItem(VARIANT_KEY) === 'b' ? 'b' : 'a'))
  useEffect(() => { localStorage.setItem(VARIANT_KEY, variant) }, [variant])

  const byKey = useMemo(() => Object.fromEntries(metrics.map((m) => [m.key, m])) as Record<string, MetricDef>, [metrics])
  const targetRef = useRef({ flow: 0, pressure: 0, temp: 0, hum: 0, mode })
  const colorRef = useRef({ pressure: [54, 224, 200], hum: [124, 224, 255] as number[] })
  const readoutRef = useRef<{ value: string; unit: string; rgb: number[] }[]>([])
  {
    const nv = (k: string) => { const m = byKey[k]; return !m || !reading ? 0 : clamp01((m.get(reading) - m.min) / (m.max - m.min)) }
    targetRef.current = { flow: nv('flow'), pressure: nv('pressure'), temp: nv('temperature'), hum: nv('humidity'), mode }
    if (byKey.pressure) colorRef.current.pressure = hexRGB(byKey.pressure.color)
    if (byKey.humidity) colorRef.current.hum = hexRGB(byKey.humidity.color)
    const fmt = (m?: MetricDef) => { if (!m || !reading) return null; const v = m.get(reading); return { value: new Intl.NumberFormat('tr-TR', { minimumFractionDigits: m.digits, maximumFractionDigits: m.digits }).format(v), unit: m.unitShort, rgb: hexRGB(m.color) } }
    readoutRef.current = [fmt(byKey.pressure), fmt(byKey.flow), fmt(byKey.temperature)].filter(Boolean) as { value: string; unit: string; rgb: number[] }[]
  }
  const themeRef = useRef(theme); themeRef.current = theme

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')!

    const img = new Image()
    let deviceCanvas: HTMLCanvasElement | null = null
    let devAR = 1
    const meas = { axis: FB_AXIS, pipe: FB_PIPE, inX: FB_IN, outX: FB_OUT }
    let exhaust: [number, number] = FB_EXHAUST
    let lcd = { x: 0.43, y: 0.26, w: 0.14, h: 0.1 }
    img.onload = () => {
      devAR = img.width / img.height
      const oc = document.createElement('canvas'); oc.width = img.width; oc.height = img.height
      oc.getContext('2d')!.drawImage(img, 0, 0)
      deviceCanvas = oc // OLDUĞU GİBİ (kırpma yok)
      try {
        const Wp = img.width, Hp = img.height
        const a = oc.getContext('2d')!.getImageData(0, 0, Wp, Hp).data
        const N = Wp * Hp
        // içerik = ne tam beyaz ne tam şeffaf ne tam siyah (render A şeffaf, B siyah zemin)
        const isContent = (p: number) => { const i = p * 4; const al = a[i + 3]; if (al < 30) return false; const mx = Math.max(a[i], a[i + 1], a[i + 2]), mn = Math.min(a[i], a[i + 1], a[i + 2]); return !(mn > 240) && !(mx < 22) }
        let minX = Wp, maxX = 0, minY = Hp, maxY = 0
        for (let p = 0; p < N; p++) if (isContent(p)) { const x = p % Wp, y = (p - x) / Wp; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y }
        if (maxX > minX && maxY > minY) {
          const cw = maxX - minX + 1, ch = maxY - minY + 1
          const measurePort = (xc: number) => { let b = -1; for (let y = maxY; y >= minY; y--) if (isContent(y * Wp + xc)) { b = y; break }; if (b < 0) return null; let tY = b; for (let y = b; y >= minY; y--) { if (isContent(y * Wp + xc)) tY = y; else break }; return { c: (tY + b) / 2, h: b - tY + 1 } }
          // port hattı: A simetrik kenarlarda; en güvenli = sol/sağ kenarda en üstteki içerik bandı orta-y'si
          const findPortY = (xc: number) => { for (let y = minY; y <= maxY; y++) if (isContent(y * Wp + xc)) { let e = y; for (let yy = y; yy <= maxY; yy++) { if (isContent(yy * Wp + xc)) e = yy; else break } return (y + e) / 2 } return null }
          const lpY = findPortY(minX + Math.round(cw * 0.02)), rpY = findPortY(maxX - Math.round(cw * 0.02))
          const lp = measurePort(minX + Math.round(cw * 0.02))
          if (lpY != null && rpY != null) meas.axis = (lpY + rpY) / 2 / Hp
          if (lp) meas.pipe = Math.max(0.025, Math.min(0.12, lp.h / Hp))
          meas.inX = (minX + cw * 0.005) / Wp; meas.outX = (maxX - cw * 0.005) / Wp
        }
      } catch { /* taint → fallback */ }
    }
    img.src = asset(variant === 'b' ? 'products/ams-render-b.jpg' : 'products/ams-render-a.png')

    const sig = { flow: 0, pressure: 0, temp: 0, hum: 0, exhaust: 0, reg: 0, valve: 0 }
    // AKIŞ havuzu
    const fLayer = Int8Array.from({ length: FLOW_COUNT }, () => (Math.random() < 0.4 ? 0 : Math.random() < 0.6 ? 1 : 2))
    const fX = Float32Array.from({ length: FLOW_COUNT }, () => Math.random())
    const fLane = Float32Array.from({ length: FLOW_COUNT }, () => Math.random() * 2 - 1)
    const fSz = Float32Array.from({ length: FLOW_COUNT }, () => 2 + Math.random() * Math.random() * 7)
    const fLife = Float32Array.from({ length: FLOW_COUNT }, () => Math.random())
    const fSeed = Float32Array.from({ length: FLOW_COUNT }, () => Math.random() * 1000)
    // REGÜLASYON sis havuzu
    const hzU = Float32Array.from({ length: HAZE_COUNT }, () => Math.random())
    const hzLane = Float32Array.from({ length: HAZE_COUNT }, () => Math.random() * 2 - 1)
    const hzSz = Float32Array.from({ length: HAZE_COUNT }, () => 0.6 + Math.random() * 1.6)
    const hzSeed = Float32Array.from({ length: HAZE_COUNT }, () => Math.random() * 1000)
    // SU damlası
    const DROPLET_MAX = 60
    const dX = Float32Array.from({ length: DROPLET_MAX }, () => Math.random())
    const dLane = Float32Array.from({ length: DROPLET_MAX }, () => Math.random())
    const dR = Float32Array.from({ length: DROPLET_MAX }, () => 1.5 + Math.random() * Math.random() * 5)
    const dSlide = new Float32Array(DROPLET_MAX)
    // EGZOZ tüy havuzu
    const pX = new Float32Array(PUFF_COUNT), pY = new Float32Array(PUFF_COUNT)
    const pVx = new Float32Array(PUFF_COUNT), pVy = new Float32Array(PUFF_COUNT)
    const pLife = Float32Array.from({ length: PUFF_COUNT }, () => Math.random())
    const pR = new Float32Array(PUFF_COUNT), pCore = new Float32Array(PUFF_COUNT), pSeed = Float32Array.from({ length: PUFF_COUNT }, () => Math.random() * 1000)

    // Sprite'lar (resize'da DPR'e göre yeniden)
    let sprAir: HTMLCanvasElement, sprHaze: HTMLCanvasElement, sprCloud: HTMLCanvasElement, sprCore: HTMLCanvasElement
    let W = 0, H = 0, dpr = 1
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = wrap.clientWidth; H = wrap.clientHeight
      canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr))
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      sprAir = gaussSprite(28, [200, 222, 250], 0.7)
      sprHaze = gaussSprite(24, [210, 225, 245], 0.5)
      sprCloud = gaussSprite(40, [212, 226, 246], 0.55)
      sprCore = gaussSprite(26, [238, 246, 255], 0.85)
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(wrap)

    const led = (cx: number, cy: number, rgb: string, on: number, r: number) => {
      if (on < 0.05) return
      ctx.globalCompositeOperation = 'lighter'
      const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.2)
      g2.addColorStop(0, `rgba(${rgb},${0.85 * on})`); g2.addColorStop(0.5, `rgba(${rgb},${0.2 * on})`); g2.addColorStop(1, `rgba(${rgb},0)`)
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2); ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = `rgba(${rgb},${Math.min(1, 0.6 + 0.4 * on)})`; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    }

    let raf = 0, last = performance.now()
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const t = targetRef.current, k = Math.min(1, dt * 4)
      sig.flow += (t.flow - sig.flow) * k; sig.pressure += (t.pressure - sig.pressure) * k
      sig.temp += (t.temp - sig.temp) * k; sig.hum += (t.hum - sig.hum) * k
      sig.reg += ((t.mode === 'standby' ? 1 : t.mode === 'isolation' ? 0.4 : 0) - sig.reg) * Math.min(1, dt * 2.5)
      sig.valve += ((t.mode === 'isolation' ? 1 : 0) - sig.valve) * Math.min(1, dt * 0.9) // soft-start
      const exTarget = sig.valve * sig.valve // quadratic ease-in (soft-start)
      sig.exhaust += (exTarget - sig.exhaust) * Math.min(1, dt * 1.4)

      const pc = colorRef.current.pressure, hc = colorRef.current.hum
      const tempEff = clamp01(0.5 + (sig.temp - 0.5) * 1.2 + 0.04)
      const [tr, tg, tb] = tempRGB(tempEff)
      const dark = themeRef.current !== 'light'

      // Trail/zemin: PANEL iç rengiyle aynı ton (cam çerçeveyle kaynaşsın; kutu hissi gitsin). Tema-duyarlı.
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = dark ? 'rgba(6,12,26,0.32)' : 'rgba(231,240,249,0.42)'
      ctx.fillRect(0, 0, W, H)

      let dw = W * DEV_FILL, dh = dw / devAR
      if (dh > H * DEV_FILL) { dh = H * DEV_FILL; dw = dh * devAR }
      const dx = (W - dw) / 2, dy = (H - dh) / 2
      const axisY = dy + dh * meas.axis
      const pipeH = Math.max(10, dh * meas.pipe)
      const top = axisY - pipeH / 2, bot = axisY + pipeH / 2
      const inX = dx + dw * meas.inX, outX = dx + dw * meas.outX
      const regX0 = dx + dw * REG_FRAC[0], regX1 = dx + dw * REG_FRAC[1], regW = regX1 - regX0
      const valveCx = dx + dw * VALVE_CX
      const exOx = dx + dw * exhaust[0], exOy = dy + dh * exhaust[1]
      const orificeX = regX0 + regW * 0.5

      // 1) GERÇEK ÜRÜN — olduğu gibi
      if (deviceCanvas) ctx.drawImage(deviceCanvas, dx, dy, dw, dh)

      // 1b) KENAR ADAPTASYONU — görselin dış kenarlarını PANEL rengine yumuşakça erit (cam çerçeveyle kaynaşsın; B'nin
      //     siyah dikdörtgen zemini de panele karışır). Ortadaki ürüne dokunmaz (sadece kenar bandı).
      const panel = dark ? '6,12,26' : '231,240,249'
      const fadeW = Math.min(W, H) * 0.16
      ctx.globalCompositeOperation = 'source-over'
      // sol/sağ
      let gEdge = ctx.createLinearGradient(0, 0, fadeW, 0)
      gEdge.addColorStop(0, `rgba(${panel},1)`); gEdge.addColorStop(1, `rgba(${panel},0)`)
      ctx.fillStyle = gEdge; ctx.fillRect(0, 0, fadeW, H)
      gEdge = ctx.createLinearGradient(W, 0, W - fadeW, 0)
      gEdge.addColorStop(0, `rgba(${panel},1)`); gEdge.addColorStop(1, `rgba(${panel},0)`)
      ctx.fillStyle = gEdge; ctx.fillRect(W - fadeW, 0, fadeW, H)
      // üst/alt
      gEdge = ctx.createLinearGradient(0, 0, 0, fadeW)
      gEdge.addColorStop(0, `rgba(${panel},1)`); gEdge.addColorStop(1, `rgba(${panel},0)`)
      ctx.fillStyle = gEdge; ctx.fillRect(0, 0, W, fadeW)
      gEdge = ctx.createLinearGradient(0, H, 0, H - fadeW)
      gEdge.addColorStop(0, `rgba(${panel},1)`); gEdge.addColorStop(1, `rgba(${panel},0)`)
      ctx.fillStyle = gEdge; ctx.fillRect(0, H - fadeW, W, fadeW)

      // 2) BORU içi = KOYU CAM TÜP (belirgin koyulaştır) → açık/beyaz ürünün üstünde içindeki ışıklı akış KONTRAST yapar, görünür olur.
      //    Üstte ince glint (cam parlaması) + içi koyu + alt iç gölge (yuvarlak tüp hissi).
      ctx.globalCompositeOperation = 'source-over'
      const pg = ctx.createLinearGradient(0, top, 0, bot)
      pg.addColorStop(0, 'rgba(180,200,228,0.45)')   // üst glint (cam)
      pg.addColorStop(0.14, 'rgba(20,30,52,0.62)')
      pg.addColorStop(0.5, 'rgba(8,14,30,0.70)')     // koyu cam içi
      pg.addColorStop(0.86, 'rgba(6,10,22,0.66)')
      pg.addColorStop(1, 'rgba(2,5,14,0.5)')          // alt iç gölge
      ctx.fillStyle = pg; ctx.fillRect(inX, top, outX - inX, pipeH)
      // tüp kenar çizgileri (üst/alt) — cam hattı belli olsun
      ctx.strokeStyle = 'rgba(150,180,220,0.4)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(inX, top); ctx.lineTo(outX, top); ctx.moveTo(inX, bot); ctx.lineTo(outX, bot); ctx.stroke()
      // SICAKLIK ısı tülü (dünya std renk) — tüp boyu, additive → akan hava bu renge boyanır (sıcaklık her yere yansır)
      ctx.globalCompositeOperation = 'lighter'
      const haze = 0.10 + 0.30 * tempEff
      const hg = ctx.createLinearGradient(0, top, 0, bot)
      hg.addColorStop(0, `rgba(${tr},${tg},${tb},0)`); hg.addColorStop(0.5, `rgba(${tr},${tg},${tb},${haze})`); hg.addColorStop(1, `rgba(${tr},${tg},${tb},0)`)
      ctx.fillStyle = hg; ctx.fillRect(inX, top, outX - inX, pipeH)
      ctx.globalCompositeOperation = 'source-over'

      // 3) AKAN HAVA — SICAKLIK renginde, GÖRÜNÜR ışıklı akış (koyu tüp içinde additive parlar). Parabolik profil + curl + parallax.
      const baseV = 0.04 + 0.96 * sig.flow
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < FLOW_COUNT; i++) {
        const layer = fLayer[i], depth = layer === 0 ? 0.55 : layer === 1 ? 0.82 : 1.12
        const laneN = fLane[i]
        const prof = 0.25 + 0.75 * (1 - laneN * laneN) // parabolik (merkez hızlı, cidar yavaş = no-slip)
        const span = outX - inX
        fX[i] += (baseV * prof * depth * 0.5 + 0.006) * dt
        fLife[i] -= dt * (0.5 + 0.5 * baseV)
        if (fX[i] > 1 || fLife[i] <= 0) { fX[i] = 0; fLife[i] = 0.6 + Math.random() * 1.0; fLane[i] = Math.random() * 2 - 1 }
        let px = inX + fX[i] * span
        let py = axisY + laneN * (pipeH * 0.42) * (0.6 + 0.4 * depth)
        let dropY = 0
        if (sig.valve > 0.12 && px > valveCx) {
          const back = (px - valveCx) / Math.max(1, outX - valveCx)
          dropY = (1 - back) * pipeH * 0.8 * sig.valve // valf kapalı: çıkış tarafı aşağı egzoza kıvrılır
        }
        const cn = curlY(px * 0.012 + fSeed[i], py * 0.012 + now * 0.0003)
        py += cn * pipeH * 0.10 + dropY
        const sz = fSz[i] * (0.6 + depth * 0.5) * (1 + baseV * 0.8)
        const lf = fLife[i] > 0.85 ? (1 - fLife[i]) * 6.7 : Math.min(1, fLife[i] * 1.6)
        // GÖRÜNÜR alpha (koyu tüp içinde): merkez katman parlak, arka katman sönük
        const al = (0.16 + 0.42 * baseV) * (layer === 0 ? 0.45 : layer === 1 ? 0.78 : 1) * lf
        if (al < 0.01) continue
        // motion-stretch: hıza göre yatay uzayan ışıklı iz (hıza göre uzunluk = gerçekçilik)
        const sx = sz * (1 + baseV * depth * 2.4), sy = sz
        ctx.globalAlpha = al
        ctx.drawImage(sprAir, (px - sx) | 0, (py - sy) | 0, (sx * 2) | 0, (sy * 2) | 0)
      }
      ctx.globalAlpha = 1

      // 4) REGÜLASYON — ince SİS yoğunluk farkı (molekül YOK). upstream yoğun+titrek → orifis → downstream seyrek.
      ctx.globalCompositeOperation = 'source-over'
      const dens = sig.pressure
      const upN = Math.round(HAZE_COUNT * (0.18 + 0.62 * dens)), agit = 0.3 + 2.0 * dens
      for (let i = 0; i < HAZE_COUNT; i++) {
        const down = i >= upN
        const u = hzU[i]
        hzU[i] += (0.0008 + dens * 0.0016) * dt * 60
        if (hzU[i] > 1) hzU[i] -= 1
        const shim = (Math.sin(hzSeed[i] + now * 0.0012) * 0.6 + Math.sin(hzSeed[i] * 1.7 + now * 0.0008) * 0.4) * agit
        let x: number, laneMul: number, aMul: number, szMul: number
        if (!down) { x = regX0 + u * (orificeX - regX0); laneMul = 0.9; aMul = 1; szMul = 1.2 - 0.4 * dens }
        else { x = orificeX + u * (regX1 - orificeX); laneMul = 1.4; aMul = 0.5; szMul = 1.3 }
        const y = axisY + hzLane[i] * pipeH * 0.42 * laneMul + shim
        const sz = hzSz[i] * szMul
        const al = (0.06 + 0.32 * dens) * aMul
        if (al < 0.01) continue
        ctx.globalAlpha = al
        ctx.drawImage(sprHaze, (x - sz) | 0, (y - sz) | 0, (sz * 2) | 0, (sz * 2) | 0)
      }
      ctx.globalAlpha = 1

      // 5) SU DAMLALARI (nem) — gerçekçi cam damla (gradient gövde + yumuşak highlight)
      const wantActive = Math.round(sig.hum * DROPLET_MAX)
      for (let i = 0; i < wantActive; i++) {
        if (dR[i] > 5) dSlide[i] = Math.min(1, dSlide[i] + dt * 0.4)
        dX[i] += (0.0015 + dSlide[i] * 0.03) * dt * 60 / Math.max(1, W)
        if (dX[i] > 1) { dX[i] -= 1; dSlide[i] = 0 }
        const x = inX + dX[i] * (outX - inX), y = bot - dR[i] * 0.55 - dLane[i] * 1.5
        const rw = dR[i] * (1.18 + dR[i] * 0.03), rh = dR[i]
        const g = ctx.createRadialGradient(x - rw * 0.25, y - rh * 0.3, rh * 0.1, x, y, rw)
        g.addColorStop(0, `rgba(${hc[0]},${hc[1]},${hc[2]},0.10)`); g.addColorStop(0.55, `rgba(${hc[0]},${hc[1]},${hc[2]},0.34)`); g.addColorStop(1, `rgba(${hc[0]},${hc[1]},${hc[2]},0.5)`)
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(x - rw * 0.32, y - rh * 0.38, rw * 0.28, 0, Math.PI * 2); ctx.fill()
      }

      // 6) EGZOZ — 3-bölge türbülanslı tüy: bulut (normal, soğuk-beyaz) + çekirdek (additive). DAR ağız, AŞAĞI; soft-start.
      const ramp = sig.exhaust
      const mouthR = Math.max(3, dh * 0.02)
      for (let i = 0; i < PUFF_COUNT; i++) {
        pLife[i] -= dt / (0.7 + Math.random() * 0.5)
        if (pLife[i] <= 0) {
          if (ramp > 0.06 && Math.random() < (0.15 + 0.85 * ramp)) {
            const coneHalf = 0.10 + 0.16 * ramp
            const ang = Math.PI / 2 + (Math.random() * 2 - 1) * coneHalf
            const sp = (200 + Math.random() * 240) * (0.4 + 0.6 * ramp)
            pX[i] = exOx + (Math.random() * 2 - 1) * mouthR * 0.6; pY[i] = exOy
            pVx[i] = Math.cos(ang) * sp; pVy[i] = Math.sin(ang) * sp
            pR[i] = 1.5 + Math.random() * 2.5; pCore[i] = Math.random() < 0.5 ? 1 : 0; pLife[i] = 1
          } else { continue }
        }
        const age = 1 - pLife[i]
        pVx[i] *= (1 - 3.2 * dt); pVy[i] = pVy[i] * (1 - 2.4 * dt) + 26 * dt
        pVx[i] += curlX(pX[i] * 0.01, pY[i] * 0.01 + pSeed[i]) * 130 * age * dt
        pVy[i] += curlY(pX[i] * 0.01, pY[i] * 0.01 + pSeed[i]) * 80 * age * dt
        pX[i] += pVx[i] * dt; pY[i] += pVy[i] * dt
        pR[i] += (34 - pR[i]) * dt * 1.6
        const l = Math.max(0, pLife[i])
        const fade = l > 0.85 ? (1 - l) * 6.7 : l * 1.05
        const aBody = clamp01(fade * 0.20 * ramp)
        if (aBody > 0.01) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = aBody; ctx.drawImage(sprCloud, (pX[i] - pR[i]) | 0, (pY[i] - pR[i]) | 0, (pR[i] * 2) | 0, (pR[i] * 2) | 0) }
        const aCore = clamp01(fade * 0.3 * ramp) * pCore[i] * (l > 0.5 ? 1 : 0)
        if (aCore > 0.01) { const cr = pR[i] * 0.35; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = aCore; ctx.drawImage(sprCore, (pX[i] - cr) | 0, (pY[i] - cr) | 0, (cr * 2) | 0, (cr * 2) | 0) }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'

      // 7) LED'ler (gerçek konum oranlarına yakın; küçük + sönük = ürünün kendi göstergesi)
      const blink = 0.55 + 0.45 * Math.sin(now * 0.009), slowBlink = 0.45 + 0.55 * Math.sin(now * 0.005)
      const ledR = Math.max(1.3, dh * 0.008)
      const isStandby = t.mode === 'standby', isIso = t.mode === 'isolation'
      const rowY = dy + dh * (variant === 'b' ? 0.54 : 0.30)
      const lx0 = dx + dw * (variant === 'b' ? 0.47 : 0.47), lx1 = dx + dw * (variant === 'b' ? 0.57 : 0.53)
      const lxAt = (f: number) => lx0 + (lx1 - lx0) * f
      led(lxAt(0), rowY, '65,224,138', 0.8, ledR)
      led(lxAt(0.5), rowY, isStandby || isIso ? '255,150,40' : '65,224,138', isIso ? blink : 0.8, ledR)
      led(lxAt(1), rowY, isIso ? '255,150,40' : '65,224,138', (isStandby || isIso) ? blink : 0.3, ledR)
      led(dx + dw * REG_CX * 0.6, dy + dh * (variant === 'b' ? 0.66 : 0.40), '65,224,138', 0.55 + 0.45 * sig.reg * slowBlink, ledR)
      led(exOx, dy + dh * (exhaust[1] - 0.42 < 0 ? 0.18 : exhaust[1] - 0.42), '255,60,48', sig.valve * (0.6 + 0.4 * blink), ledR)

      // 8) LCD — SMC hub düzeni, HER HÜCRE CANLI (P/Q/T + büyük rakam + birim). Render A boş ekran → buraya basılır.
      const ro2 = readoutRef.current
      if (ro2.length && variant === 'a') {
        const rx = dx + lcd.x * dw, ry = dy + lcd.y * dh, rw = lcd.w * dw, rh = lcd.h * dh
        ctx.fillStyle = 'rgba(3,8,16,0.82)'
        if ((ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect) { ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, Math.min(4, rh * 0.1)); ctx.fill() } else ctx.fillRect(rx, ry, rw, rh)
        const rows = ro2.slice(0, 3), padX = rw * 0.07, lh = rh / rows.length
        ctx.textBaseline = 'middle'
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i], cy = ry + lh * (i + 0.5), [rr, gg, bb] = r.rgb
          const fsLab = Math.max(5, Math.min(lh * 0.34, rw * 0.1))
          ctx.font = `600 ${fsLab}px ui-monospace, monospace`; ctx.textAlign = 'left'; ctx.fillStyle = `rgba(${rr},${gg},${bb},0.7)`; ctx.fillText(['P', 'Q', 'T'][i] ?? '', rx + padX, cy)
          const fs = Math.max(8, Math.min(lh * 0.6, rw * 0.2))
          ctx.font = `700 ${fs}px ui-monospace, monospace`; ctx.textAlign = 'right'
          ctx.shadowColor = `rgba(${rr},${gg},${bb},0.95)`; ctx.shadowBlur = fs * 0.5; ctx.fillStyle = `rgb(${rr},${gg},${bb})`; ctx.fillText(r.value, rx + rw - rw * 0.30, cy); ctx.shadowBlur = 0
          ctx.font = `500 ${fs * 0.55}px ui-monospace, monospace`; ctx.textAlign = 'left'; ctx.fillStyle = `rgba(${rr},${gg},${bb},0.85)`; ctx.fillText(r.unit, rx + rw - rw * 0.27, cy)
        }
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [variant])

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
      {/* A/B görsel seçimi (Mehmet Abi: ikisini de dene, sonra seç) */}
      <button
        onClick={() => setVariant((v) => (v === 'a' ? 'b' : 'a'))}
        className="absolute right-2 top-2 z-10 rounded-md border border-[var(--hair)] bg-black/40 px-2 py-1 text-[10px] font-semibold text-white/80 backdrop-blur transition hover:text-white"
        title="Ürün görseli A/B"
      >Görsel {variant.toUpperCase()}</button>
    </div>
  )
}
