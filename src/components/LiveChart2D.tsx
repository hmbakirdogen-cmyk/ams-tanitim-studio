/*
 * NE      : Canlı Panel'in alt grafiği — 2D TÜP-STİLLİ, İKİ EŞİT ŞERİT: Hava Tüketimi (üst) + Basınç (alt); her sensör AYRI şeritte tam doldurur.
 * NEDEN   : Mehmet abi (iteratif, 2026-06-19): ısı+nem KALDIRILDI → yalnız Hava Tüketimi + Basınç; 2 EŞİT şerit, borular İYİCE AYRIK ·
 *           ZOOM (auto-range) → her boru kendi bandını TAM doldursun · sol+sağ Y-skala FERAH/anlaşılır/göze hoş · şerit başlığında ad+birim ·
 *           X zaman etiketleri sık · scalalar boydan boya yatay çizgiyle belli · değerler çizginin UCUNDA (anlık, senkron).
 * NASIL   : Canvas 2D, ChartOverlay ile AYNI PAD (zaman ekseni/seçici hizalı; PAD değişince ChartOverlay'deki left/right-[60px] de güncellenir).
 *           ph EŞİT 2 şeride bölünür. Her sensör KENDİ AUTO-RANGE'ine (pencere min..max + pad, yumuşatılmış) normalize → bandı doldurur.
 *           Yatay scala çizgileri (üst/orta/alt). Sol+sağ Y etiket (hi üst, lo alt, kendi renginde, ferah font). Şerit sol-üstte ad+birim
 *           rozeti. Uç etiketi anlık (reading) + de-collision/leader. Yağ gibi: lerp 0.06.
 * YAN ETKI: Saf istemci/offline; WebGL yok. ChartOverlay zaman ekseni + düşey çizgileri çizer.
 */
import { useEffect, useRef } from 'react'
import type { Reading } from '@/data/types'
import type { MetricDef, MetricKey } from '@/data/metrics'
import { localeOf } from '@/lib/format'
import { getEco } from '@/data/eco'

const PAD_L = 60, PAD_R = 60, PAD_T = 64, PAD_B = 44 // sol+sağ Y-skala gutter'ları — FERAH (Mehmet abi: skalaları rahatlat); ChartOverlay left/right-[60px] ile EŞLİ tutulur
const N = 220
const LANE_GAP = 16 // iki şerit İYİCE ayrık (Mehmet abi)
// Şerit grupları artık PROP (Mehmet abi 2026-06-19 sekme: Hava&Basınç ↔ Sıcaklık&Nem). Default = Hava Tüketimi + Basınç.

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0]
}
const fmt = (v: number, d: number) => new Intl.NumberFormat(localeOf(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
// Tick ondalık basamağı STEP'e göre (Mehmet abi 2026-06-20: "scalalarda rakamlar TEKRAR etmesin; en azından 1 ondalık"):
//   step>=1 -> 0 ondalık (0,500,1000 / 23,24,25) · step 0.1..1 -> 1 ondalık (22,5 23,0 23,5) · daha küçük -> 2. Ardışık tick'ler
//   yuvarlanıp AYNI rakama düşmez (eski axf >=10'da 0 ondalık verince 23,5->24 tekrar ediyordu).
const decFor = (step: number): number => (step >= 1 ? 0 : step >= 0.1 ? 1 : 2)
const axf = (v: number, step: number) => fmt(v, decFor(step))

// NICE EKSEN (Mehmet abi 2026-06-19: "0 0,2 0,4 0,6 çizgileriyle" + hava tüketimini de optimize): verilen tepeye göre 0'dan başlayan
//   YUVARLAK adım (1/2/5 ×10ⁿ) seçer → mutlak, okunaklı skala (basınç 0…0,6 adım 0,2 · debi 0…2500 adım 500). ~3 aralık hedefi (sade).
//   Auto-range/zoom yerine sabit eksen → değer "ne kadar dolu" gauge gibi okunur; tick'ler hep yuvarlak.
function niceAxis(maxV: number): { hi: number; step: number } {
  if (!(maxV > 0)) return { hi: 1, step: 1 }
  const raw = maxV / 3
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm <= 1.5 ? 1 : norm <= 3.5 ? 2 : norm <= 7 ? 5 : 10) * mag // Mehmet abi 2026-06-20: 1000'de eşik 3→3.5 → step 500 yerine 200 (0/200/…/1000; "sadece 500 görünüyor" düzeldi). Basınç 0,6 (norm 2) AYNI kalır (0/0,2/0,4/0,6).
  // EPSILON (Mehmet abi 2026-06-19): 0,8×0,75=0,6 ama float 0,6000000001 → ceil yukarı kaçıp 0,8 yapıyordu. −1e-9 ile tam katlarda DOĞRU yuvarlanır.
  const hi = Math.max(step, Math.ceil(maxV / step - 1e-9) * step)
  return { hi, step }
}

// AUTO-RANGE eksen (Mehmet abi 2026-06-20: sıcaklık 23-25°C / nem 45-47% → 0…max bandında DARALIP kayboluyordu):
//   pencere min..max'ını saran YUVARLAK alt/üst sınır üretir (0-tabanlı DEĞİL → band DOLAR, hareket belirgin). Önce yuvarlak step seçilir,
//   sonra lo aşağı / hi yukarı yuvarlanır + bir tık pad. Gerçek veri bandı aşarsa o yönde otomatik genişler (her döngüde yeniden hesaplanır).
function autoRange(minV: number, maxV: number): { lo: number; hi: number; step: number } {
  let span = maxV - minV
  if (!(span > 0)) span = Math.max(Math.abs(maxV) * 0.1, 1) // düz çizgi/tek değer korunağı
  const raw = span / 3 // ~3-4 tick hedefi (sade okunur skala)
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm <= 1.5 ? 1 : norm <= 3 ? 2 : norm <= 7 ? 5 : 10) * mag
  const lo = Math.floor((minV - step * 0.25) / step + 1e-9) * step // alt pad + step'e yuvarla
  const hi = Math.ceil((maxV + step * 0.25) / step - 1e-9) * step  // üst pad + step'e yuvarla
  return { lo, hi: hi > lo ? hi : lo + step, step }
}
const AUTO_RANGE_KEYS = new Set<MetricKey>(['temperature', 'humidity']) // SADECE bunlar zoom'lanır; flow/pressure gauge gibi SABİT 0…max kalır

export function LiveChart2D({ history = [], reading = null, metrics, groups = [['flow'], ['pressure']] }: {
  history?: Reading[]
  reading?: Reading | null
  metrics: MetricDef[]
  groups?: MetricKey[][] // Mehmet abi 2026-06-19: sekme → hangi 2 sensör (Hava&Basınç / Sıcaklık&Nem)
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dataRef = useRef({ history, reading, metrics, groups })
  dataRef.current = { history, reading, metrics, groups }
  const dispRef = useRef<Record<string, Float32Array>>({})
  // AUTO-RANGE yumuşak eksen havuzu (Mehmet abi 2026-06-20) — her auto-range sensörü için { lo, hi } yumuşak kayar (lerp 0.07) → eksen ZIPLAMAZ.
  const rangeRef = useRef<Record<string, { lo: number; hi: number }>>({})

  useEffect(() => {
    const cv = canvasRef.current, wrap = wrapRef.current
    if (!cv || !wrap) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    let raf = 0, W = 0, H = 0, dpr = 1, lastFrame = 0
    const FRAME_MS = 1000 / 40 // ~40fps tavanı (Mehmet abi "pervane" → sürekli GPU yükü düşür; çizgi akışı akıcı kalır)
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

    const ptsBuf: number[][] = Array.from({ length: N }, () => [0, 0]) // PERF: kalıcı nokta tamponu (şeritler SIRAYLA çizilir → paylaşım güvenli) → kare-başı new Array(N) tahsisi yok (GC churn azalır)
    const draw = (ts = 0) => {
      raf = requestAnimationFrame(draw)
      if (typeof document !== 'undefined' && document.hidden) return
      const frameMs = getEco() ? 1000 / 12 : FRAME_MS // Sakin Mod: ~12fps (sürekli GPU yükü iyice düşer)
      if (ts - lastFrame < frameMs) return
      lastFrame = ts
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const { history: hist, reading: rd, metrics: mets, groups: grps } = dataRef.current
      const n = hist.length
      const px = PAD_L, py = PAD_T, pw = Math.max(1, W - PAD_L - PAD_R), ph = Math.max(1, H - PAD_T - PAD_B)
      if (n < 2 || !mets.length) return
      const now = Date.now()
      const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
      const sampleVal = (m: MetricDef, frac: number): number => {
        const pos = frac * (n - 1), lo = Math.floor(pos), hi = Math.min(n - 1, lo + 1), fr = pos - lo
        return m.get(hist[lo]) * (1 - fr) + m.get(hist[hi]) * fr
      }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      const lanes = grps.map((keys) => keys.map((k) => mets.find((m) => m.key === k)).filter(Boolean) as MetricDef[]).filter((g) => g.length)
      const weights = lanes.map(() => 1) // iki şerit EŞİT yükseklik → ikisi de tam doldurur (Mehmet abi: ısı+nem kalkınca dengeli bölüşüm)
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

        // Per-sensör hazırla: AUTO-RANGE (sıcaklık/nem) ya da SABİT nice eksen (flow/pressure) → disp normalize (yağ gibi) + ayrı alt-band
        const subs = group.map((m, gi) => {
          const auto = AUTO_RANGE_KEYS.has(m.key) // SADECE sıcaklık/nem zoom'lanır
          let lo: number, hi: number, step: number
          if (auto) {
            // AUTO-RANGE (Mehmet abi 2026-06-20): pencere min..max'ı tara (anlık reading dahil) → saran yuvarlak band; yumuşak lerp ile kayar (zıplamaz).
            let mn = Infinity, mx = -Infinity
            for (let i = 0; i < N; i++) { const v = sampleVal(m, i / (N - 1)); if (v < mn) mn = v; if (v > mx) mx = v }
            if (rd) { const v = m.get(rd); if (v < mn) mn = v; if (v > mx) mx = v }
            if (!Number.isFinite(mn) || !Number.isFinite(mx)) { mn = m.min; mx = m.max }
            const tgt = autoRange(mn, mx)
            let rg = rangeRef.current[m.key]
            if (!rg) { rg = { lo: tgt.lo, hi: tgt.hi }; rangeRef.current[m.key] = rg }
            rg.lo += (tgt.lo - rg.lo) * 0.07; rg.hi += (tgt.hi - rg.hi) * 0.07 // YAĞ GİBİ: eksen yeni banda yumuşak kayar
            lo = rg.lo; hi = rg.hi; step = tgt.step
          } else {
            // Mehmet abi 2026-06-19: basınç ekseni çalışma aralığını kapsayan tavan = m.max×0.75 → MPa'da 0,6 · bar'da 6 (BİRİMLE ölçeklenir).
            //   Debi ekseni = ÜRÜN max debisi (m.max=flowMax). niceAxis ikisinde de yuvarlak adım verir (MPa 0,2 · bar 2 · debi 500). SABİT 0…hi (gauge gibi).
            const axisMax = m.key === 'pressure' ? m.max * 0.75 : m.max
            const ax = niceAxis(axisMax)
            // BASINÇ ekseni HASSAS tick (Mehmet abi 2026-06-20: bar'da 1'er, MPa'da da AYNI sıklık): bar → 1'er (0/1/…/6), MPa → 0,1'er (0/0,1/…/0,6).
            //   1 bar = 0,1 MPa → iki birimde de 7 çizgi, aynı sıklık. (Sadece basınç; debi niceAxis ile yuvarlak kalır.)
            if (m.key === 'pressure') { const isBar = m.unitShort === 'bar'; lo = 0; step = isBar ? 1 : 0.1; hi = Math.max(step, Math.ceil(axisMax / step - 1e-9) * step) }
            else { lo = 0; hi = ax.hi; step = ax.step }
          }
          const denom = Math.max(hi - lo, 1e-6) // auto-range'de band genişliği, sabitte hi (lo=0)
          const subH = h * (1 - off), subTop = top + (group.length > 1 ? gi * (h * off) : 0)
          let disp = dispRef.current[m.key]
          if (!disp || disp.length !== N) { disp = new Float32Array(N); for (let i = 0; i < N; i++) disp[i] = clamp01((sampleVal(m, i / (N - 1)) - lo) / denom); dispRef.current[m.key] = disp }
          for (let i = 0; i < N; i++) { let v = sampleVal(m, i / (N - 1)); if (i === N - 1 && rd) v = m.get(rd); disp[i] += (clamp01((v - lo) / denom) - disp[i]) * 0.06 }
          return { m, subTop, subH, lo, hi, step, disp }
        })

        // YATAY SCALA ÇİZGİLERİ — NICE TICK'lerde (Mehmet abi: "0 0,2 0,4 0,6 çizgileriyle"): lo'dan hi'ye yuvarlak adımlarla boydan boya, tüplerin ALTINDA.
        //   Auto-range'de lo≠0 (band tabanı), sabitte lo=0 → ikisi de aynı formülle (v−lo)/(hi−lo) çizilir.
        for (const s of subs) {
          const [r, g, b] = hexRgb(s.m.color)
          const span = Math.max(s.hi - s.lo, 1e-6)
          ctx.strokeStyle = `rgba(${r},${g},${b},0.15)`; ctx.lineWidth = 1
          for (let v = Math.ceil(s.lo / s.step - 1e-9) * s.step; v <= s.hi + s.step * 0.5; v += s.step) {
            const yy = s.subTop + (1 - (v - s.lo) / span) * s.subH
            ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px + pw, yy); ctx.stroke()
          }
        }

        const tips: { m: MetricDef; tipY: number; vTxt: string }[] = []
        for (const s of subs) {
          const m = s.m, [r, g, b] = hexRgb(m.color)
          const pts = ptsBuf // PERF: kalıcı tampon; şerit sırayla doldurup hemen çizer (çizim senkron → paylaşım güvenli)
          for (let i = 0; i < N; i++) { pts[i][0] = px + (i / (N - 1)) * pw; pts[i][1] = s.subTop + (1 - s.disp[i]) * s.subH }
          // PERF: shadowBlur (Canvas'ın en pahalı işlemi) yalnız YÜKSEK-DPR/4K'da hafifletilir (9→5). Normal ekranda (dpr<1.75) BİREBİR 9 kalır →
          //   görünüş Mehmet abi'nin ekranında aynı; 4K TV'de fill-rate maliyeti düşer (TV mesafesinde fark hissedilmez), "kasma" riski biter.
          ctx.beginPath(); strokeSmooth(pts); ctx.strokeStyle = m.color; ctx.lineWidth = 6; ctx.shadowColor = m.color; ctx.shadowBlur = dpr >= 1.75 ? 5 : 9; ctx.stroke(); ctx.shadowBlur = 0
          ctx.beginPath(); strokeSmooth(pts); ctx.strokeStyle = `rgb(${r},${g},${b})`; ctx.lineWidth = 4.5; ctx.stroke()
          ctx.beginPath()
          for (let i = 0; i < N; i++) { const p = pts[i]; if (i) ctx.lineTo(p[0], p[1] - 1.3); else ctx.moveTo(p[0], p[1] - 1.3) }
          ctx.strokeStyle = `rgba(${Math.min(255, r + 95)},${Math.min(255, g + 95)},${Math.min(255, b + 95)},0.5)`; ctx.lineWidth = 1.4; ctx.stroke()
          const head = pts[N - 1], pulse = 0.5 + 0.5 * Math.sin(now / 320)
          ctx.fillStyle = m.color; ctx.shadowColor = m.color; ctx.shadowBlur = 8 + 6 * pulse
          ctx.beginPath(); ctx.arc(head[0], head[1], 3, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
          tips.push({ m, tipY: head[1], vTxt: fmt(rd ? m.get(rd) : sampleVal(m, 1), m.digits) })

          // İKİ YANDA Y-SKALA — NICE TICK değerleri (Mehmet abi: "0 0,2 0,4 0,6"). Mehmet abi 2026-06-19: rakamlar BOLD DEĞİL (normal/ince) +
          //   çizgide TAM yerinde (middle, tek hizalama → kayma yok) + sade = karmaşa yok. Kendi renginde (kimlik bağı), sol/sağ simetrik.
          ctx.font = '400 11px ui-sans-serif, system-ui, sans-serif'; ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.textBaseline = 'middle'
          const lblSpan = Math.max(s.hi - s.lo, 1e-6)
          for (let v = Math.ceil(s.lo / s.step - 1e-9) * s.step; v <= s.hi + s.step * 0.5; v += s.step) {
            const yy = s.subTop + (1 - (v - s.lo) / lblSpan) * s.subH
            for (const side of ['l', 'r'] as const) {
              const xx = side === 'l' ? px - 6 : px + pw + 6
              ctx.textAlign = side === 'l' ? 'right' : 'left'
              ctx.fillText(axf(v, s.step), xx, yy)
            }
          }
        }

        // UÇ ETİKETLERİ — anlık değer (Mehmet abi 2026-06-19: "çok daha şık"): premium PILL (tam yuvarlak) + sensör-renk dış ışıma (glow) +
        //   üstten cam parıltısı + sol renkli ışıklı nokta (kimlik) + beyaz kalın değer / soluk renkli birim + ince leader. De-collision korunur.
        const bh = 21, gap = bh + 3
        const items = [...tips].sort((a, b) => a.tipY - b.tipY)
        const lY: number[] = []
        for (let i = 0; i < items.length; i++) lY[i] = i === 0 ? items[i].tipY : Math.max(items[i].tipY, lY[i - 1] + gap)
        const laneBottom = laneTop + laneH - bh / 2
        if (lY.length && lY[lY.length - 1] > laneBottom) { lY[lY.length - 1] = laneBottom; for (let i = lY.length - 2; i >= 0; i--) lY[i] = Math.min(lY[i], lY[i + 1] - gap) }
        const hasRR = !!(ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect
        const pill = (x: number, y: number, w: number, hh: number) => { ctx.beginPath(); if (hasRR) ctx.roundRect(x, y, w, hh, hh / 2); else ctx.rect(x, y, w, hh) }
        for (let i = 0; i < items.length; i++) {
          const it = items[i], [r, g, b] = hexRgb(it.m.color)
          const labelY = Math.max(laneTop + bh / 2, lY[i])
          const uTxt = it.m.unitShort
          ctx.font = '800 12px ui-sans-serif, system-ui, sans-serif'; const vW = ctx.measureText(it.vTxt).width
          ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif'; const uW = ctx.measureText(uTxt).width
          const padL = 18, padR = 10, gapVU = 4
          const bw = padL + vW + gapVU + uW + padR
          const bx = px + pw - bw - 2, by = labelY - bh / 2, cy = by + bh / 2
          // LEADER — ince, sensör renginde, boru ucundan rozete (rozetin altında kalır)
          ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`; ctx.lineWidth = 1.2
          ctx.beginPath(); ctx.moveTo(px + pw, it.tipY); ctx.lineTo(bx + 7, labelY); ctx.stroke()
          // CAM GÖVDE + dış ışıma (glow izole)
          ctx.save(); ctx.shadowColor = it.m.color; ctx.shadowBlur = 9
          ctx.fillStyle = 'rgba(8,14,28,0.95)'; pill(bx, by, bw, bh); ctx.fill(); ctx.restore()
          // üstten renk parıltısı (cam his)
          const lg = ctx.createLinearGradient(bx, by, bx, by + bh)
          lg.addColorStop(0, `rgba(${r},${g},${b},0.24)`); lg.addColorStop(0.55, `rgba(${r},${g},${b},0)`)
          ctx.fillStyle = lg; pill(bx, by, bw, bh); ctx.fill()
          // parlak ince kenar
          ctx.strokeStyle = `rgba(${r},${g},${b},0.75)`; ctx.lineWidth = 1; pill(bx + 0.5, by + 0.5, bw - 1, bh - 1); ctx.stroke()
          // sol renkli ışıklı nokta (kimlik)
          ctx.save(); ctx.shadowColor = it.m.color; ctx.shadowBlur = 6
          ctx.fillStyle = it.m.color; ctx.beginPath(); ctx.arc(bx + 10, cy, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore()
          // değer (beyaz kalın) + birim (soluk, sensör renginde)
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
          ctx.font = '800 12px ui-sans-serif, system-ui, sans-serif'; ctx.fillStyle = '#fff'
          ctx.fillText(it.vTxt, bx + padL, cy + 0.5)
          ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif'
          ctx.fillStyle = `rgba(${Math.min(255, r + 45)},${Math.min(255, g + 45)},${Math.min(255, b + 45)},0.92)`
          ctx.fillText(uTxt, bx + padL + vW + gapVU, cy + 0.9)
        }

        // ŞERİT BAŞLIĞI (Mehmet abi: "en anlaşılır") — sol-üstte ad + birim rozeti, kendi renginde; boru/skaladan SONRA çizilir → üstte net durur.
        {
          const tt = group[0], [tr2, tg2, tb2] = hexRgb(tt.color)
          const label = `${tt.name} · ${tt.unitShort}`
          ctx.font = '700 11px ui-sans-serif, system-ui, sans-serif'
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
          const lw = ctx.measureText(label).width, bx2 = px + 8, by2 = laneTop + 6, bh2 = 18
          ctx.fillStyle = 'rgba(5,11,24,0.62)'
          if ((ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect) { ctx.beginPath(); ctx.roundRect(bx2, by2, lw + 18, bh2, 9); ctx.fill() } else ctx.fillRect(bx2, by2, lw + 18, bh2)
          ctx.fillStyle = `rgb(${tr2},${tg2},${tb2})`
          ctx.fillText(label, bx2 + 9, by2 + bh2 / 2 + 0.5)
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
