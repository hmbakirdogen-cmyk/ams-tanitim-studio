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

function niceStep(range: number): number {
  if (range <= 0) return 1
  const raw = range / 4
  const e = Math.pow(10, Math.floor(Math.log10(raw)))
  const f = raw / e
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10
  return nf * e
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
    const PAD_L = 62, PAD_R = 18, PAD_T = 12, PAD_B = 28
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
      // Y otomatik aralık (nice)
      let mn = def.min, mx = def.max
      if (n) { mn = Infinity; mx = -Infinity; for (const r2 of s) { const v = def.get(r2); if (v < mn) mn = v; if (v > mx) mx = v } }
      if (!Number.isFinite(mn) || !Number.isFinite(mx) || mx - mn < 1e-9) { mn = def.min; mx = def.max || def.min + 1 }
      const step = niceStep(mx - mn)
      let aMin = Math.floor(mn / step) * step
      let aMax = Math.ceil(mx / step) * step
      if (def.min === 0 && aMin < 0) aMin = 0
      if (aMax - aMin < step) aMax = aMin + step
      // Izgara + Y etiketleri (sensör renginde)
      ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif'; ctx.textBaseline = 'middle'
      for (let val = aMin; val <= aMax + 1e-6; val += step) {
        const yy = py + ph - ((val - aMin) / (aMax - aMin)) * ph
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(px, yy + 0.5); ctx.lineTo(px + pw, yy + 0.5); ctx.stroke()
        ctx.fillStyle = def.color; ctx.textAlign = 'right'
        ctx.fillText(nf(val, val < 10 ? (val % 1 ? 1 : 0) : 0), px - 8, yy)
      }
      if (n >= 2) {
        const t0 = s[0].t, t1 = s[n - 1].t, span = Math.max(1, t1 - t0)
        const xOf = (tt: number) => px + pw * ((tt - t0) / span)
        const yOf = (v: number) => py + ph - ((v - aMin) / (aMax - aMin)) * ph
        // X saat etiketleri (sık)
        ctx.fillStyle = 'rgba(220,230,245,0.6)'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = '600 9px ui-sans-serif, system-ui, sans-serif'
        for (let i = 0; i <= 6; i++) { const f = i / 6; ctx.fillText(clk(startedAt + t0 + span * f), px + pw * f, py + ph + 7) }
        // Alan dolgusu
        ctx.beginPath(); ctx.moveTo(xOf(s[0].t), yOf(def.get(s[0])))
        for (let i = 1; i < n; i++) ctx.lineTo(xOf(s[i].t), yOf(def.get(s[i])))
        ctx.lineTo(px + pw, py + ph); ctx.lineTo(px, py + ph); ctx.closePath()
        const g = ctx.createLinearGradient(0, py, 0, py + ph)
        g.addColorStop(0, def.color + '4d'); g.addColorStop(1, def.color + '00')
        ctx.fillStyle = g; ctx.fill()
        // Çizgi (ışıltılı)
        ctx.beginPath(); ctx.moveTo(xOf(s[0].t), yOf(def.get(s[0])))
        for (let i = 1; i < n; i++) ctx.lineTo(xOf(s[i].t), yOf(def.get(s[i])))
        ctx.strokeStyle = def.color; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'
        ctx.shadowColor = def.color; ctx.shadowBlur = 12; ctx.stroke(); ctx.shadowBlur = 0
        // Canlı uç
        const hx = xOf(s[n - 1].t), hy = yOf(def.get(s[n - 1]))
        ctx.fillStyle = def.color; ctx.shadowColor = def.color; ctx.shadowBlur = 12
        ctx.beginPath(); ctx.arc(hx, hy, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
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
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        className="glass relative flex w-full max-w-2xl flex-col gap-3 rounded-3xl p-5"
        style={{ height: 'min(78vh, 560px)' }}
        initial={{ scale: 0.94, y: 14, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="absolute inset-x-0 top-0 h-1 rounded-t-3xl" style={{ background: def.color, boxShadow: `0 0 18px ${def.color}` }} />
        {/* Başlık + anlık değer + kapat */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `${def.color}1f`, color: def.color }}><Icon size={22} /></span>
            <div>
              <div className="text-sm font-semibold text-[var(--ink)]">{t(def.name)}</div>
              <div className="flex items-baseline gap-1.5">
                <span className="num text-3xl font-extrabold leading-none text-white" style={{ textShadow: `0 0 22px ${def.color}66` }}>{nf(cur)}</span>
                <span className="text-xs font-medium text-[var(--ink-soft)]">{t(def.unitShort)}</span>
              </div>
              {/* TOPLAM tüketim (totalizer) — flow kartından açılınca (Mehmet Abi: "detay penceresinde de toplam görünsün"). Cihaz LCD'siyle aynı turuncu. */}
              {totalText != null && (
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#FF761E' }}>{t('Toplam')}</span>
                  <span className="num text-lg font-bold leading-none text-white" style={{ textShadow: '0 0 14px #FF761E55' }}>{totalText}</span>
                  <span className="text-[10px] font-medium text-[var(--ink-soft)]">Litre</span>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label={t('Kapat')} className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--hair)] text-[var(--ink-soft)] transition hover:bg-white/5 hover:text-white">
            <X size={17} />
          </button>
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
