/*
 * NE      : Canlı Panel'in alt grafiği — 2D TÜP-STİLLİ, İKİ GRUP: G1 Debi+Basınç (üst, daha uzun), G2 Sıcaklık+Nem (alt).
 * NEDEN   : Mehmet Abi (araştırma + iteratif): 2 grup · grup içi borular ayrı · ZOOM (auto-range) → hareketler bandı doldursun ·
 *           üst grup daha uzun (alt gruba değecek kadar) · X zaman etiketleri sık · İKİ YANDA (sol+sağ) büyük Y-skala ·
 *           scalalar boydan boya yatay çizgiyle belli · değerler çizginin UCUNDA (anlık, senkron).
 * NASIL   : Canvas 2D, ChartOverlay ile AYNI PAD (zaman ekseni/seçici hizalı). ph ağırlıklı 2 şeride bölünür (üst uzun). Her sensör
 *           KENDİ AUTO-RANGE'ine (pencere min..max + pad, yumuşatılmış) normalize → hareketler bandı doldurur. Grup içi 2 boru dikey
 *           kaydırma ile AYRI. Yatay scala çizgileri (üst/orta/alt). Sol+sağ büyük Y etiket (hi üst, lo alt, kendi renginde). Uç etiketi
 *           anlık (reading) + de-collision/leader. Yağ gibi: lerp 0.06.
 * YAN ETKI: Saf istemci/offline; WebGL yok. ChartOverlay zaman ekseni + düşey çizgileri çizer.
 */
import { useEffect, useRef } from 'react'
import type { Reading } from '@/data/types'
import type { MetricDef, MetricKey } from '@/data/metrics'
import { localeOf } from '@/lib/format'

const PAD_L = 50, PAD_R = 50, PAD_T = 64, PAD_B = 44 // sol+sağ Y-skala gutter'ları
const N = 220
const LANE_GAP = 10
const GROUPS: MetricKey[][] = [['flow', 'pressure'], ['temperature', 'humidity']]

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0]
}
const fmt = (v: number, d: number) => new Intl.NumberFormat(localeOf(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
const axf = (v: number) => fmt(v, Math.abs(v) < 10 && v !== 0 ? 1 : 0)

export function LiveChart2D({ history = [], reading = null, metrics, theme = 'dark' }: {
  history?: Reading[]
  reading?: Reading | null
  metrics: MetricDef[]
  theme?: 'dark' | 'light'
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef = useRef({ history, reading, metrics })
  dataRef.current = { history, reading, metrics }
  const dispRef = useRef<Record<string, Float32Array>>({})
  const rangeRef = useRef<Record<string, { lo: number; hi: number }>>({})

  useEffect(() => {
    const cv = canvasRef.current, wrap = wrapRef.current
    if (!cv || !wrap) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    let raf = 0, W = 0, H = 0, dpr = 1
    const resize = () => {
      const r = wrap.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = Math.max(1, r.width); H = Math.max(1, r.height)
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr)
      cv.style.width = `${W}px`; cv.style.height = `${H}px`
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(wrap)

    const strokeSmooth = (pts: number[][]) => {
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my)
      }
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1])
    }

    const draw = () => {
      raf = requestAnimationFrame(draw)
      if (typeof document !== 'undefined' && document.hidden) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const { history: hist, reading: rd, metrics: mets } = dataRef.current
      const n = hist.length
      const px = PAD_L, py = PAD_T, pw = Math.max(1, W - PAD_L - PAD_R), ph = Math.max(1, H - PAD_T - PAD_B)
      if (n < 2 || !mets.length) return
      const now = Date.now()
      const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
      const sampleVal = (m: MetricDef, frac: number): number => {
        const pos = frac * (n - 1), lo = Math.floor(pos), hi = Math.min(n - 1, lo + 1), fr = pos - lo
        return m.get(hist[lo]) * (1 - fr) + m.get(hist[hi]) * fr
      }
      // AUTO-RANGE (zoom): pencere verisine yakınlaş → hareketler bandı doldurur. min-span floor (durağan sinyal gürültüye zoom yapmasın), smoothed.
      const rangeOf = (m: MetricDef) => {
        let oMin = Infinity, oMax = -Infinity
        for (let i = 0; i < N; i++) { const v = sampleVal(m, i / (N - 1)); if (v < oMin) oMin = v; if (v > oMax) oMax = v }
        if (rd) { const v = m.get(rd); if (v < oMin) oMin = v; if (v > oMax) oMax = v }
        let span = oMax - oMin; const floor = Math.max((m.max - m.min) * 0.04, 1e-6)
        if (span < floor) { const c = (oMin + oMax) / 2; oMin = c - floor / 2; oMax = c + floor / 2; span = floor }
        const pad = span * 0.1
        let loT = Math.max(m.min, oMin - pad), hiT = Math.min(m.max, oMax + pad)
        if (hiT - loT < 1e-6) hiT = loT + 1
        let rg = rangeRef.current[m.key]; if (!rg) { rg = { lo: loT, hi: hiT }; rangeRef.current[m.key] = rg }
        rg.lo += (loT - rg.lo) * 0.05; rg.hi += (hiT - rg.hi) * 0.05
        return { lo: rg.lo, hi: rg.hi }
      }

      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      const lanes = GROUPS.map((keys) => keys.map((k) => mets.find((m) => m.key === k)).filter(Boolean) as MetricDef[]).filter((g) => g.length)
      const weights = lanes.map((_, k) => (k === 0 ? 1.4 : 0.7)) // ÜST grup daha uzun (Mehmet Abi: alt gruba değecek kadar genişlet)
      const wsum = weights.reduce((a, b) => a + b, 0) || 1
      const availH = ph - (lanes.length - 1) * LANE_GAP

      let laneTop = py
      for (let k = 0; k < lanes.length; k++) {
        const group = lanes[k]
        const laneH = availH * weights[k] / wsum
        const ip = Math.min(laneH * 0.08, 8)
        const top = laneTop + ip, h = Math.max(1, laneH - ip * 2)
        const off = group.length > 1 ? 0.28 : 0 // grup içi 2 boruyu AYIR (Mehmet Abi: üst grubu biraz daha ayır)

        ctx.fillStyle = 'rgba(255,255,255,0.025)'
        if ((ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect) { ctx.beginPath(); ctx.roundRect(px, laneTop, pw, laneH, 8); ctx.fill() } else ctx.fillRect(px, laneTop, pw, laneH)

        // Per-sensör hazırla: auto-range + disp (yağ gibi) + ayrı alt-band
        const subs = group.map((m, gi) => {
          const rg = rangeOf(m), denom = Math.max(rg.hi - rg.lo, 1e-6)
          const subH = h * (1 - off), subTop = top + (group.length > 1 ? gi * (h * off) : 0)
          let disp = dispRef.current[m.key]
          if (!disp || disp.length !== N) { disp = new Float32Array(N); for (let i = 0; i < N; i++) disp[i] = clamp01((sampleVal(m, i / (N - 1)) - rg.lo) / denom); dispRef.current[m.key] = disp }
          for (let i = 0; i < N; i++) { let v = sampleVal(m, i / (N - 1)); if (i === N - 1 && rd) v = m.get(rd); disp[i] += (clamp01((v - rg.lo) / denom) - disp[i]) * 0.06 }
          return { m, subTop, subH, lo: rg.lo, hi: rg.hi, disp }
        })

        // YATAY SCALA ÇİZGİLERİ (boydan boya): üst/orta/alt, faint renk — tüplerin ALTINDA (Mehmet Abi: "boydan boya yatay çizgi")
        for (const s of subs) {
          const [r, g, b] = hexRgb(s.m.color)
          ctx.strokeStyle = `rgba(${r},${g},${b},0.15)`; ctx.lineWidth = 1
          for (const yy of [s.subTop, s.subTop + s.subH / 2, s.subTop + s.subH]) { ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px + pw, yy); ctx.stroke() }
        }

        const tips: { m: MetricDef; tipY: number; vTxt: string }[] = []
        for (const s of subs) {
          const m = s.m, [r, g, b] = hexRgb(m.color)
          const pts: number[][] = new Array(N)
          for (let i = 0; i < N; i++) pts[i] = [px + (i / (N - 1)) * pw, s.subTop + (1 - s.disp[i]) * s.subH]
          ctx.beginPath(); strokeSmooth(pts); ctx.strokeStyle = m.color; ctx.lineWidth = 6; ctx.shadowColor = m.color; ctx.shadowBlur = 9; ctx.stroke(); ctx.shadowBlur = 0
          ctx.beginPath(); strokeSmooth(pts); ctx.strokeStyle = `rgb(${r},${g},${b})`; ctx.lineWidth = 4.5; ctx.stroke()
          ctx.beginPath()
          for (let i = 0; i < N; i++) { const p = pts[i]; if (i) ctx.lineTo(p[0], p[1] - 1.3); else ctx.moveTo(p[0], p[1] - 1.3) }
          ctx.strokeStyle = `rgba(${Math.min(255, r + 95)},${Math.min(255, g + 95)},${Math.min(255, b + 95)},0.5)`; ctx.lineWidth = 1.4; ctx.stroke()
          const head = pts[N - 1], pulse = 0.5 + 0.5 * Math.sin(now / 320)
          ctx.fillStyle = m.color; ctx.shadowColor = m.color; ctx.shadowBlur = 8 + 6 * pulse
          ctx.beginPath(); ctx.arc(head[0], head[1], 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
          tips.push({ m, tipY: head[1], vTxt: fmt(rd ? m.get(rd) : sampleVal(m, 1), m.digits) })

          // İKİ YANDA Y-SCALA — DETAYLI (Mehmet Abi: "scalaları karıştırmadan daha detaylandır"): 3 kademe (üst/orta/alt) = yatay
          //   scala çizgileriyle BİREBİR hizalı; kendi renginde → renk + hizalı çizgi sayesinde iki sensör karışmaz.
          const mid = (s.lo + s.hi) / 2
          ctx.font = '700 10px ui-sans-serif, system-ui, sans-serif'; ctx.fillStyle = `rgb(${r},${g},${b})`
          for (const side of ['l', 'r'] as const) {
            const xx = side === 'l' ? px - 6 : px + pw + 6
            ctx.textAlign = side === 'l' ? 'right' : 'left'
            ctx.textBaseline = 'top'; ctx.fillText(axf(s.hi), xx, s.subTop - 1)
            ctx.textBaseline = 'middle'; ctx.fillText(axf(mid), xx, s.subTop + s.subH / 2)
            ctx.textBaseline = 'bottom'; ctx.fillText(axf(s.lo), xx, s.subTop + s.subH + 1)
          }
        }

        // UÇ ETİKETLERİ — anlık değer, uca bağlı + de-collision/leader
        const bh = 17, gap = bh + 2
        const items = [...tips].sort((a, b) => a.tipY - b.tipY)
        const lY: number[] = []
        for (let i = 0; i < items.length; i++) lY[i] = i === 0 ? items[i].tipY : Math.max(items[i].tipY, lY[i - 1] + gap)
        const laneBottom = laneTop + laneH - bh / 2
        if (lY.length && lY[lY.length - 1] > laneBottom) { lY[lY.length - 1] = laneBottom; for (let i = lY.length - 2; i >= 0; i--) lY[i] = Math.min(lY[i], lY[i + 1] - gap) }
        ctx.font = '700 11px ui-sans-serif, system-ui, sans-serif'
        for (let i = 0; i < items.length; i++) {
          const it = items[i], [r, g, b] = hexRgb(it.m.color)
          const labelY = Math.max(laneTop + bh / 2, lY[i])
          const uTxt = ` ${it.m.unitShort}`
          const bw = ctx.measureText(it.vTxt + uTxt).width + 13
          const bx = px + pw - bw - 2, by = labelY - bh / 2
          ctx.strokeStyle = `rgba(${r},${g},${b},0.55)`; ctx.lineWidth = 1
          ctx.beginPath(); ctx.moveTo(px + pw, it.tipY); ctx.lineTo(bx + bw, labelY); ctx.stroke()
          ctx.fillStyle = 'rgba(5,11,24,0.92)'
          if ((ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 8); ctx.fill() } else ctx.fillRect(bx, by, bw, bh)
          ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`; ctx.lineWidth = 1
          if ((ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect) { ctx.beginPath(); ctx.roundRect(bx + 0.5, by + 0.5, bw - 1, bh - 1, 8); ctx.stroke() }
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
          ctx.fillStyle = '#fff'; ctx.fillText(it.vTxt, bx + 7, by + bh / 2 + 0.5)
          ctx.fillStyle = it.m.color; ctx.fillText(uTxt, bx + 7 + ctx.measureText(it.vTxt).width, by + bh / 2 + 0.5)
        }

        laneTop += laneH + LANE_GAP
      }
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  )
}
