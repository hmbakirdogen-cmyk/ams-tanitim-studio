/*
 * NE      : "Cihaz Akışı" - Canlı Panel'in 2. canlı görünümü (Klasik'in yanında). GERÇEK SMC AMS ünitesinin fotoğrafı
 *           (public/products/ams-product.png, şeffaf zemin) YARI ŞEFFAF arka planda; önünde uçtan uca cam boru içinde
 *           SOLDAN SAĞA akan hava. Hepsi anlık VERİYE bağlı — tek bakışta debi/basınç/sıcaklık/nem anlaşılır.
 *           Ayrıca VALF ve ORANSAL REGÜLATÖR DEVREYE GİRİNCE foto üzerinde nabız atan parlak halka ile gösterilir.
 *
 * NEDEN   : Mehmet Abi: "procedural 3B'yi beğenmedim; cihazın KENDİ GERÇEK görünümünü koy, biraz şeffaf; soldan giriş → sağdan
 *           çıkış; hava içinden aksın; debi/basınç/sıcaklık/nem + valf egzozu + valf/regülatörün DEVREYE GİRDİĞİ görünsün."
 *
 * NASIL   : Saf Canvas 2B (akıcı/hafif, gerçek foto ile bütünleşir). requestAnimationFrame; değerler ref'te yumuşatılır. 60fps,
 *           sabit parçacık havuzu (kare-başı tahsis yok). Mod → reg/valf devreye-girme sinyali (Tasarruf=regülatör, Kesinti=valf).
 *             - Debi  → akış HIZI + yoğunluk + parlaklık.   - Basınç → REGÜLATÖR bölgesinde SIKIŞMA.
 *             - Sıcaklık→ boru/parçacık RENGİ.              - Nem → SU DAMLALARI.
 *             - Valf devreye → EGZOZ püskürtme + valf modülünde nabız halka.  - Regülatör devreye → regülatör modülünde nabız halka.
 *
 * YAN ETKI: Offline (foto gömülü). Üstüne PipeOverlay biner (mod + anlık değer + eşik + giriş/çıkış + Regülatör/Valf "devrede" rozeti).
 */
import { useEffect, useMemo, useRef } from 'react'
import { asset } from '@/lib/asset'
import type { Reading, Mode } from '@/data/types'
import { METRICS, type MetricDef } from '@/data/metrics'

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
const FLOW_COUNT = 150
const DROPLET_MAX = 24
const PUFF_COUNT = 34
const COLD: [number, number, number] = [55, 163, 255]
const WARM: [number, number, number] = [255, 90, 50]
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const tempRGB = (t: number): [number, number, number] => [Math.round(lerp(COLD[0], WARM[0], t)), Math.round(lerp(COLD[1], WARM[1], t)), Math.round(lerp(COLD[2], WARM[2], t))]

export function DeviceFlowChart({
  reading,
  metrics = METRICS,
  mode = 'normal',
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

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')!

    const img = new Image()
    let imgReady = false
    img.onload = () => { imgReady = true }
    img.src = asset('products/ams-product.png')

    const sig = { flow: 0, pressure: 0, temp: 0, hum: 0, exhaust: 0, reg: 0, valve: 0 }

    const phase = Float32Array.from({ length: FLOW_COUNT }, (_, i) => i / FLOW_COUNT)
    const lane = Float32Array.from({ length: FLOW_COUNT }, () => Math.random() * 2 - 1)
    const psize = Float32Array.from({ length: FLOW_COUNT }, () => 0.6 + Math.random() * 0.8)
    const pspd = Float32Array.from({ length: FLOW_COUNT }, () => 0.8 + Math.random() * 0.4)
    const dropX = Float32Array.from({ length: DROPLET_MAX }, () => Math.random())
    const dropLane = Float32Array.from({ length: DROPLET_MAX }, () => Math.random() * 2 - 1)
    const dropSpd = Float32Array.from({ length: DROPLET_MAX }, () => 0.01 + Math.random() * 0.03)
    const puffX = new Float32Array(PUFF_COUNT)
    const puffY = new Float32Array(PUFF_COUNT)
    const puffVx = new Float32Array(PUFF_COUNT)
    const puffVy = new Float32Array(PUFF_COUNT)
    const puffLife = Float32Array.from({ length: PUFF_COUNT }, () => Math.random())

    let W = 0, H = 0, dpr = 1
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = wrap.clientWidth
      H = wrap.clientHeight
      canvas.width = Math.max(1, Math.round(W * dpr))
      canvas.height = Math.max(1, Math.round(H * dpr))
      canvas.style.width = W + 'px'
      canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    // Devreye-girme nabız halkası (regülatör/valf modülü üzerinde)
    const drawEngage = (cx: number, cy: number, rgb: string, intensity: number, pulse: number, radius: number) => {
      if (intensity < 0.04) return
      const pr = radius * (1 + 0.12 * Math.sin(pulse))
      ctx.globalCompositeOperation = 'lighter'
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, pr * 1.7)
      rg.addColorStop(0, `rgba(${rgb},${0.30 * intensity})`)
      rg.addColorStop(0.55, `rgba(${rgb},${0.12 * intensity})`)
      rg.addColorStop(1, `rgba(${rgb},0)`)
      ctx.fillStyle = rg
      ctx.beginPath(); ctx.arc(cx, cy, pr * 1.7, 0, Math.PI * 2); ctx.fill()
      ctx.lineWidth = 2.5
      ctx.strokeStyle = `rgba(${rgb},${0.75 * intensity})`
      ctx.beginPath(); ctx.arc(cx, cy, pr, 0, Math.PI * 2); ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
    }

    let raf = 0
    let last = performance.now()

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const t = targetRef.current
      const k = Math.min(1, dt * 3)
      sig.flow += (t.flow - sig.flow) * k
      sig.pressure += (t.pressure - sig.pressure) * k
      sig.temp += (t.temp - sig.temp) * k
      sig.hum += (t.hum - sig.hum) * k
      // Mod → bileşen devreye-girme sinyalleri (Tasarruf=regülatör basıncı düşürür; Kesinti=valf havayı keser/tahliye)
      const regTarget = t.mode === 'standby' ? 1 : t.mode === 'isolation' ? 0.35 : 0
      const valveTarget = t.mode === 'isolation' ? 1 : t.mode === 'standby' ? 0.5 : 0
      sig.reg += (regTarget - sig.reg) * Math.min(1, dt * 2.5)
      sig.valve += (valveTarget - sig.valve) * Math.min(1, dt * 2.5)
      const exTarget = t.mode === 'normal' ? 0 : 0.4 + 0.6 * sig.valve
      sig.exhaust += (exTarget - sig.exhaust) * Math.min(1, dt * 2.2)

      const [r, g, b] = tempRGB(sig.temp)
      const col = (a: number) => `rgba(${r},${g},${b},${a})`

      ctx.clearRect(0, 0, W, H)

      // 1) GERÇEK CİHAZ FOTOSU - yarı şeffaf, içine sığan (contain)
      let dx = 0, dy = 0, dw = W, dh = H
      if (imgReady) {
        const pad = 18
        const ar = img.width / img.height
        dw = W - pad * 2; dh = dw / ar
        if (dh > H - pad * 2) { dh = H - pad * 2; dw = dh * ar }
        dx = (W - dw) / 2; dy = (H - dh) / 2
        ctx.globalAlpha = 0.62
        ctx.drawImage(img, dx, dy, dw, dh)
        ctx.globalAlpha = 1
      }

      // Modül konumları (foto üzerinde yaklaşık): regülatör üst-orta-sol, valf orta-sağ-alt
      const regCx = dx + dw * 0.36, regCy = dy + dh * 0.30
      const valveCx = dx + dw * 0.60, valveCy = dy + dh * 0.64
      const markR = Math.min(dw, dh) * 0.13

      const pipeY = H * 0.58
      const pipeH = Math.max(46, Math.min(120, H * 0.17))
      const regX0 = W * 0.40, regX1 = W * 0.58
      const HOSE = 0.17 // sol/sag uctaki hortum bolgesi orani (boru ile AYNI cap)

      // 2) DEVREYE GİRME nabız halkaları (regülatör yeşil / valf amber)
      const pulse = now * 0.006
      drawEngage(regCx, regCy, '54,224,200', sig.reg, pulse, markR)
      drawEngage(valveCx, valveCy, '255,176,77', sig.valve, pulse + 1.5, markR)

      // 3) CAM BORU bandı - UÇTAN UCA tek sürekli şeffaf boru (giriş/çıkış hortumları AYNI çap; hava içlerinde de akar)
      const top = pipeY - pipeH / 2, bot = pipeY + pipeH / 2
      const grad = ctx.createLinearGradient(0, top, 0, bot)
      grad.addColorStop(0, col(0.16)); grad.addColorStop(0.5, 'rgba(8,16,28,0.10)'); grad.addColorStop(1, col(0.10))
      ctx.fillStyle = grad
      ctx.fillRect(0, top, W, pipeH)
      // Hortum bölgeleri (uçlar) - hafif lastik tonu (içindeki akış görünür kalsın diye düşük alpha)
      ctx.fillStyle = 'rgba(38,52,72,0.13)'
      ctx.fillRect(0, top, W * HOSE, pipeH)
      ctx.fillRect(W * (1 - HOSE), top, W * HOSE, pipeH)
      // Boru kenar çizgileri (uçtan uca)
      ctx.strokeStyle = col(0.5); ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(W, top); ctx.moveTo(0, bot); ctx.lineTo(W, bot); ctx.stroke()
      // Hortum ↔ cihaz birleşim kelepçeleri (metalik) - hortumu belli eder, çapı borunun aynısı
      const drawCoupler = (cx: number) => {
        const cw = 10
        const cg = ctx.createLinearGradient(0, top, 0, bot)
        cg.addColorStop(0, 'rgba(190,206,224,0.92)'); cg.addColorStop(0.5, 'rgba(95,114,138,0.92)'); cg.addColorStop(1, 'rgba(160,178,198,0.92)')
        ctx.fillStyle = cg
        ctx.beginPath(); ctx.roundRect(cx - cw / 2, top - 3, cw, pipeH + 6, 3); ctx.fill()
      }
      drawCoupler(W * HOSE); drawCoupler(W * (1 - HOSE))

      // 4) AKAN HAVA parçacıkları
      const baseSpeed = (0.04 + 0.96 * sig.flow) * 0.24
      const pr = pipeH * 0.36
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < FLOW_COUNT; i++) {
        let x = phase[i] * W
        const inReg = x > regX0 && x < regX1
        const factor = inReg ? 1 - 0.6 * sig.pressure : 1
        phase[i] += baseSpeed * pspd[i] * factor * dt
        if (phase[i] > 1) phase[i] -= 1
        x = phase[i] * W
        const y = pipeY + lane[i] * pr + Math.sin(now * 0.002 + i) * 3
        const size = (1.6 + psize[i] * (2.2 + sig.flow * 4.2)) * (inReg ? 1 + 0.35 * sig.pressure : 1)
        const a = 0.18 + 0.6 * sig.flow
        const rg = ctx.createRadialGradient(x, y, 0, x, y, size)
        rg.addColorStop(0, col(a)); rg.addColorStop(1, col(0))
        ctx.fillStyle = rg
        ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      // 5) SU DAMLALARI (nem)
      const active = Math.round(sig.hum * DROPLET_MAX)
      for (let i = 0; i < active; i++) {
        dropX[i] += dropSpd[i] * dt * (0.4 + sig.hum)
        if (dropX[i] > 1) dropX[i] -= 1
        const x = dropX[i] * W
        const y = bot - 5 + dropLane[i] * 3
        const s = 2.2 + sig.hum * 2.4
        ctx.fillStyle = 'rgba(150,210,255,0.85)'
        ctx.beginPath(); ctx.ellipse(x, y, s * 0.7, s, 0, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.beginPath(); ctx.arc(x - s * 0.2, y - s * 0.3, s * 0.22, 0, Math.PI * 2); ctx.fill()
      }

      // 6) VALF EGZOZU - valf devreye girince valf modülünden havayı aşağı püskürtür
      ctx.globalCompositeOperation = 'lighter'
      const exOx = imgReady ? valveCx : W * 0.62
      const exOy = imgReady ? valveCy + markR * 0.5 : bot
      for (let i = 0; i < PUFF_COUNT; i++) {
        puffLife[i] -= dt * 1.3
        if (puffLife[i] <= 0) {
          if (sig.exhaust > 0.08) {
            puffX[i] = exOx + (Math.random() - 0.5) * 12
            puffY[i] = exOy
            puffVx[i] = (Math.random() - 0.5) * 60
            puffVy[i] = (45 + Math.random() * 80) * (0.5 + sig.exhaust)
            puffLife[i] = 1
          } else { continue }
        }
        puffX[i] += puffVx[i] * dt
        puffY[i] += puffVy[i] * dt
        puffVy[i] += 70 * dt
        const l = puffLife[i]
        const s = (3 + sig.exhaust * 7) * Math.sin(Math.min(1, l) * Math.PI)
        if (s <= 0.2) continue
        const rg = ctx.createRadialGradient(puffX[i], puffY[i], 0, puffX[i], puffY[i], s)
        rg.addColorStop(0, `rgba(200,225,255,${0.5 * l})`); rg.addColorStop(1, 'rgba(200,225,255,0)')
        ctx.fillStyle = rg
        ctx.beginPath(); ctx.arc(puffX[i], puffY[i], s, 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalCompositeOperation = 'source-over'

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
