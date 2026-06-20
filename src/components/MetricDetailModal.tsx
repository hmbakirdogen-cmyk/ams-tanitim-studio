/*
 * NE      : Tek sensörün DETAY penceresi — kart tıklanınca açılır. Büyük zaman-grafiği (GERÇEK değer Y ekseni + GERÇEK saat X ekseni,
 *           kendi renginde alan dolgusu + ışıltı) + anlık değer (büyük) + dönem özeti (en düşük / en yüksek / ortalama).
 * NEDEN   : Mehmet Abi: "kartlar tıklanabilir olmalı; tıklanınca grafikler büyüyüp çok detaylı değerlerini, eksenlerini göstermeli."
 * NASIL   : Modal (backdrop + cam panel, framer-motion). Canvas 2D çizgi grafik; Y ekseni veriye göre OTOMATİK aralık (nice) + ekseni
 *           sensörün renginde yazar; X ekseni startedAt + göreli t'den gerçek saat. rAF ile canlı çizer (seri prop'u güncellendikçe).
 * YAN ETKI: Saf istemci/offline. Esc + backdrop + çarpı ile kapanır. i18n korunur.
 */
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { MetricDef } from '@/data/metrics'
import type { Reading } from '@/data/types'
import { useLang } from '@/i18n'
import { localeOf } from '@/lib/format'
import { PressureUnitToggle } from './PressureUnitToggle'

function niceStep(range: number): number {
  if (range <= 0) return 1
  const raw = range / 4
  const e = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / e
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nf * e
}
function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0]
}

export function MetricDetailModal({ def, series, reading, startedAt, total, onClose }: {
  def: MetricDef
  series: Reading[]
  reading: Reading | null
  startedAt: number
  total?: number // TOPLAM tüketim (totalizer) — yalnız flow kartında verilir → başlıkta gösterilir
  onClose: () => void
}) {
  const { t } = useLang()
  const Icon = def.icon
  const totalText = total != null && Number.isFinite(total)
    ? new Intl.NumberFormat(localeOf(), { maximumFractionDigits: 0 }).format(total)
    : null
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const seriesRef = useRef(series); seriesRef.current = series
  const dispRef = useRef<Float32Array | null>(null)        // akıcı çizgi havuzu (canlı panel gibi yağ-gibi akış)
  const rangeRef = useRef<{ lo: number; hi: number } | null>(null) // yumuşak eksen (akışta zıplamaz)
  const avgRef = useRef<number | null>(null) // ortalama çizgisi yağ-gibi (Mehmet abi 2026-06-19): hedef ortalamaya lerp

  const nf = (v: number, d = def.digits) => new Intl.NumberFormat(localeOf(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
  const clk = (ms: number) => new Date(ms).toLocaleTimeString(localeOf(), { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  // Özet (dönem) — en düşük / en yüksek / ortalama + anlık
  const vals = series.map(def.get)
  const cur = reading ? def.get(reading) : (vals.length ? vals[vals.length - 1] : def.min)
  const lo = vals.length ? Math.min(...vals) : def.min
  const hi = vals.length ? Math.max(...vals) : def.max
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0

  // Esc ile kapan
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Canvas çizim (rAF; seriRef'ten okur → canlı güncellenir)
  useEffect(() => {
    const cv = canvasRef.current, wrap = wrapRef.current
    if (!cv || !wrap) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    let raf = 0, lw = 0, lh = 0
    const PAD_L = 62, PAD_R = 18, PAD_T = 14, PAD_B = 38 // PAD_B büyüdü: X ekseninde saat + göreli saniye 2 satır sığsın
    // YAĞ GİBİ çizgi (Mehmet abi 2026-06-19): köşeli lineTo yerine quadratic smoothing → akıcı eğri
    const smooth = (pts: number[][]) => {
      if (pts.length < 2) { if (pts.length) ctx.lineTo(pts[0][0], pts[0][1]); return }
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length - 1; i++) { const mx2 = (pts[i][0] + pts[i + 1][0]) / 2, my2 = (pts[i][1] + pts[i + 1][1]) / 2; ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx2, my2) }
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1])
    }
    // CANLI PANEL AKIŞI gibi (Mehmet abi 2026-06-19): SABİT N nokta, seriden frac'la örneklenir → disp lerp ile yağ-gibi akar (kesik kesik DEĞİL)
    const N = 200
    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
    const sampleVal = (frac: number): number => {
      const s = seriesRef.current, m = s.length
      if (m === 0) return def.min
      if (m === 1) return def.get(s[0])
      const pos = frac * (m - 1), i0 = Math.floor(pos), i1 = Math.min(m - 1, i0 + 1), fr = pos - i0
      return def.get(s[i0]) * (1 - fr) + def.get(s[i1]) * fr
    }
    const ptsBuf: number[][] = Array.from({ length: N }, () => [0, 0]) // PERF: kalıcı nokta tamponu → kare-başı new Array(N) tahsisi yok (GC churn azalır)
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const r = wrap.getBoundingClientRect()
      const W = Math.max(1, r.width), H = Math.max(1, r.height)
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (W !== lw || H !== lh) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; lw = W; lh = H }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const px = PAD_L, py = PAD_T, pw = Math.max(1, W - PAD_L - PAD_R), ph = Math.max(1, H - PAD_T - PAD_B)
      const s = seriesRef.current
      const n = s.length
      const [cr, cg, cb] = hexRgb(def.color)
      // Y otomatik aralık (nice) + canlı min/max/ORTALAMA
      let mn = def.min, mx = def.max, sum = 0
      if (n) { mn = Infinity; mx = -Infinity; for (const r2 of s) { const v = def.get(r2); if (v < mn) mn = v; if (v > mx) mx = v; sum += v } }
      if (!Number.isFinite(mn) || !Number.isFinite(mx) || mx - mn < 1e-9) { mn = def.min; mx = def.max || def.min + 1 }
      const avgV = n ? sum / n : 0
      let avgD = avgRef.current; if (avgD == null) avgD = avgV
      avgD += (avgV - avgD) * 0.08; avgRef.current = avgD // ortalama YAĞ GİBİ kayar (Mehmet abi 2026-06-19)
      const step = niceStep(mx - mn)
      let tMin = Math.floor(mn / step) * step
      let tMax = Math.ceil(mx / step) * step
      if (def.min === 0 && tMin < 0) tMin = 0
      if (tMax - tMin < step) tMax = tMin + step
      // YUMUŞAK EKSEN (Mehmet abi 2026-06-19: akış kesik kesik gelmesin) — nice hedefe lerp → yeni veri gelince eksen zıplamaz, akar
      let rg = rangeRef.current; if (!rg) { rg = { lo: tMin, hi: tMax }; rangeRef.current = rg }
      rg.lo += (tMin - rg.lo) * 0.07; rg.hi += (tMax - rg.hi) * 0.07
      const aMin = rg.lo, aMax = rg.hi, denom = Math.max(aMax - aMin, 1e-6)
      const yOf = (v: number) => py + ph - ((v - aMin) / denom) * ph
      // ARKA PLAN DERİNLİĞİ (Mehmet abi 2026-06-19: "düz kare olmasın") — hafif radyal merkez parıltısı → kare ızgara hissini kırar, derinlik verir
      const bgG = ctx.createRadialGradient(px + pw / 2, py + ph * 0.38, 8, px + pw / 2, py + ph * 0.5, Math.max(pw, ph) * 0.72)
      bgG.addColorStop(0, `rgba(${cr},${cg},${cb},0.07)`); bgG.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = bgG; ctx.fillRect(px, py, pw, ph)
      // Y SKALA çizgileri (yalnız yatay, hafif — ara minör KALDIRILDI ki kare ızgara olmasın) + Y etiketleri (sensör renginde)
      ctx.textBaseline = 'middle'
      for (let val = Math.ceil(aMin / step) * step; val <= aMax + 1e-6; val += step) {
        const yy = yOf(val)
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(px, yy + 0.5); ctx.lineTo(px + pw, yy + 0.5); ctx.stroke()
        ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif'; ctx.fillStyle = `rgba(${cr},${cg},${cb},0.92)`; ctx.textAlign = 'right'
        // Y tick ondalığı STEP'e göre (Mehmet abi 2026-06-20: detay penceresi scalasında da rakamlar TEKRAR etmesin; en az 1 ondalık dar adımda)
        ctx.fillText(nf(val, step >= 1 ? 0 : step >= 0.1 ? 1 : 2), px - 8, yy)
      }
      // BİRİM (Y ekseni başlığı, sol-üst köşe)
      ctx.font = '600 9px ui-sans-serif, system-ui, sans-serif'; ctx.fillStyle = `rgba(${cr},${cg},${cb},0.75)`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'
      ctx.fillText(t(def.unitShort), 2, py - 1)
      if (n >= 2) {
        const t0 = s[0].t, t1 = s[n - 1].t, span = Math.max(1, t1 - t0)
        // DİKEY ZAMAN ÇİZGİLERİ (Mehmet abi 2026-06-19: "zaman çizgilerini de ekle") — KESİK ışık çizgileri (düz kare değil); "şimdi" yeşil
        ctx.save(); ctx.setLineDash([3, 5]); ctx.lineWidth = 1
        for (let i = 0; i <= 8; i++) {
          const xx = px + pw * (i / 8)
          ctx.strokeStyle = i === 8 ? 'rgba(65,224,138,0.5)' : 'rgba(130,175,235,0.22)'
          ctx.beginPath(); ctx.moveTo(xx + 0.5, py); ctx.lineTo(xx + 0.5, py + ph); ctx.stroke()
        }
        ctx.restore()
        // Saat + GÖRELİ SANİYE etiketleri (LiveChart2D ile tutarlı)
        for (let i = 0; i <= 8; i++) {
          const f = i / 8, xx = px + pw * f
          ctx.textAlign = 'center'
          ctx.fillStyle = 'rgba(220,230,245,0.62)'; ctx.textBaseline = 'top'; ctx.font = '600 9px ui-sans-serif, system-ui, sans-serif'
          ctx.fillText(clk(startedAt + t0 + span * f), xx, py + ph + 6)
          const rel = Math.round(((1 - f) * span) / 1000) // göreli süre — 60sn+ DAKİKA+SANİYE (Mehmet abi 2026-06-19)
          const relTxt = rel <= 0 ? `0 ${t('sn')}` : rel < 60 ? `−${rel} ${t('sn')}` : (rel % 60 === 0 ? `−${Math.floor(rel / 60)} ${t('dk')}` : `−${Math.floor(rel / 60)} ${t('dk')} ${rel % 60} ${t('sn')}`)
          ctx.fillStyle = 'rgba(180,195,215,0.5)'; ctx.font = '600 8px ui-sans-serif, system-ui, sans-serif'
          ctx.fillText(relTxt, xx, py + ph + 17)
        }
        // AKICI ÇİZGİ — sabit N nokta, seriden örnekle + disp LERP (canlı panel akışı gibi; Mehmet abi: kesik kesik DEĞİL)
        let disp = dispRef.current
        if (!disp || disp.length !== N) { disp = new Float32Array(N); for (let i = 0; i < N; i++) disp[i] = clamp01((sampleVal(i / (N - 1)) - aMin) / denom); dispRef.current = disp }
        for (let i = 0; i < N; i++) { const tg = clamp01((sampleVal(i / (N - 1)) - aMin) / denom); disp[i] += (tg - disp[i]) * 0.09 }
        const pts = ptsBuf // PERF: kalıcı tampon (her kare yeni dizi değil); aşağıda smooth() pts[i][0]/[1] okur
        for (let i = 0; i < N; i++) { pts[i][0] = px + (i / (N - 1)) * pw; pts[i][1] = py + ph - disp[i] * ph }
        // ORTALAMA referans çizgisi (kesik, sensör renginde) + etiket → "iyice detay"
        const ay = yOf(avgD)
        ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.45)`; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(px, ay + 0.5); ctx.lineTo(px + pw, ay + 0.5); ctx.stroke(); ctx.restore()
        ctx.font = '600 8px ui-sans-serif, system-ui, sans-serif'; ctx.fillStyle = `rgba(${cr},${cg},${cb},0.72)`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
        ctx.fillText(`${t('ort')} ${nf(avgD)}`, px + 4, ay - 2)
        // ALAN dolgusu (yağ gibi smooth)
        ctx.beginPath(); smooth(pts); ctx.lineTo(px + pw, py + ph); ctx.lineTo(px, py + ph); ctx.closePath()
        const g = ctx.createLinearGradient(0, py, 0, py + ph)
        g.addColorStop(0, def.color + '55'); g.addColorStop(1, def.color + '00')
        ctx.fillStyle = g; ctx.fill()
        // ÇİZGİ (smooth + ışıltılı)
        ctx.beginPath(); smooth(pts); ctx.strokeStyle = def.color; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
        ctx.shadowColor = def.color; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0
        // CANLI UÇ — nabızlı nokta + anlık değer baloncuğu
        const hx = pts[N - 1][0], hy = pts[N - 1][1]
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 320)
        ctx.fillStyle = def.color; ctx.shadowColor = def.color; ctx.shadowBlur = 8 + 7 * pulse
        ctx.beginPath(); ctx.arc(hx, hy, 3.6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
        // anlık değer baloncuğu — Mehmet abi 2026-06-19: BİRİMLİ (değer beyaz + birim sensör renginde)
        const bTxt = nf(n ? def.get(s[n - 1]) : 0), bU = t(def.unitShort)
        ctx.font = '700 11px ui-sans-serif, system-ui, sans-serif'; const vW = ctx.measureText(bTxt).width
        ctx.font = '600 9px ui-sans-serif, system-ui, sans-serif'; const uW = ctx.measureText(bU).width
        const bbw = 9 + vW + 4 + uW + 9, bbh = 18
        const bbx = Math.min(hx + 9, px + pw - bbw), bby = Math.max(py + 1, Math.min(hy - bbh / 2, py + ph - bbh - 1))
        ctx.fillStyle = 'rgba(8,14,28,0.92)'
        if ((ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect) { ctx.beginPath(); ctx.roundRect(bbx, bby, bbw, bbh, 9); ctx.fill() } else ctx.fillRect(bbx, bby, bbw, bbh)
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.7)`; ctx.lineWidth = 1
        if ((ctx as CanvasRenderingContext2D & { roundRect?: unknown }).roundRect) { ctx.beginPath(); ctx.roundRect(bbx + 0.5, bby + 0.5, bbw - 1, bbh - 1, 9); ctx.stroke() }
        ctx.textBaseline = 'middle'; ctx.textAlign = 'left'
        ctx.font = '700 11px ui-sans-serif, system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(bTxt, bbx + 9, bby + bbh / 2 + 0.5)
        ctx.font = '600 9px ui-sans-serif, system-ui, sans-serif'; ctx.fillStyle = `rgba(${cr},${cg},${cb},0.92)`; ctx.fillText(bU, bbx + 9 + vW + 4, bby + bbh / 2 + 0.5)
      }
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [def, startedAt])

  const Stat = ({ label, value, color }: { label: string; value: string; color?: string }) => (
    <div className="flex flex-col rounded-xl border border-[var(--hair)] bg-[#050b18]/50 px-3 py-2">
      <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--ink-soft)]">{label}</span>
      <span className="num text-lg font-bold" style={{ color: color ?? 'var(--ink)' }}>{value} <span className="text-[10px] font-medium text-[var(--ink-soft)]">{t(def.unitShort)}</span></span>
    </div>
  )

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      {/* YAĞ GİBİ AÇILIŞ (Mehmet abi 2026-06-19): yumuşak spring (yüksek damping → overshoot yok, momentumlu yerleşir) + hafif yukarı kayma.
          Kapanışta da aşağı süzülerek çıkar → "kayan" his; sert/zıplayan değil. */}
      <motion.div
        className="glass relative flex w-full max-w-2xl flex-col gap-3 rounded-3xl p-5"
        style={{ height: 'min(78vh, 560px)' }}
        initial={{ scale: 0.96, y: 18, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.97, y: 10, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 230, damping: 30, mass: 0.9 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="absolute inset-x-0 top-0 h-1 rounded-t-3xl" style={{ background: def.color, boxShadow: `0 0 18px ${def.color}` }} />
        {/* Başlık + anlık değer + kapat */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `${def.color}1f`, color: def.color }}><Icon size={22} /></span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[var(--ink)]">{t(def.name)}</span>
                {def.key === 'pressure' && <PressureUnitToggle color={def.color} />}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="num text-3xl font-extrabold leading-none text-white" style={{ textShadow: `0 0 22px ${def.color}66` }}>{nf(cur)}</span>
                <span className="text-xs font-medium text-[var(--ink-soft)]">{t(def.unitShort)}</span>
              </div>
            </div>
          </div>
          {/* SAĞ ÜST: TOPLAM tüketim (Mehmet abi 2026-06-20: detay penceresinde toplam değeri sağ üste) + kapat butonu */}
          <div className="flex items-start gap-3">
            {totalText != null && (
              <div className="flex flex-col items-end leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: '#FF761E', opacity: 0.85 }}>{t('Toplam')}</span>
                <div className="mt-0.5 flex items-baseline gap-1">
                  <span className="num text-xl font-bold leading-none tabular-nums" style={{ color: '#FF761E', textShadow: '0 0 16px #FF761E66' }}>{totalText}</span>
                  <span className="text-[11px] font-semibold" style={{ color: '#FF761E' }}>Litre</span>
                </div>
              </div>
            )}
            <button onClick={onClose} aria-label={t('Kapat')} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--hair)] text-[var(--ink-soft)] transition hover:bg-white/5 hover:text-white">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Büyük grafik (eksenli) */}
        <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-[var(--hair)] bg-[#04060f]/40">
          <canvas ref={canvasRef} className="absolute inset-0" />
        </div>

        {/* Dönem özeti */}
        <div className="grid shrink-0 grid-cols-3 gap-2.5">
          <Stat label={t('En düşük')} value={nf(lo)} />
          <Stat label={t('Ortalama')} value={nf(avg)} color={def.color} />
          <Stat label={t('En yüksek')} value={nf(hi)} />
        </div>
      </motion.div>
    </motion.div>
  )
}
