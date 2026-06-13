/*
 * NE      : 7-segment (yedi-segment) LED rakam cizici — canvas 2D'de GERCEK dijital ekran rakamlari.
 * NEDEN   : Mehmet Abi: "debimetre/hub LCD'si gercekmis gibi gorunsun." Gercek SMC AMS hub ekrani (foto + kullanim
 *           kilavuzu om_ams_20-30-40-60) 7-segment LED'dir; monospace yazi gercek hissi vermiyordu.
 * NASIL   : Her karakter 7 segment (a=ust, b=sag-ust, c=sag-alt, d=alt, e=sol-alt, f=sol-ust, g=orta) + ondalik nokta.
 *           Segmentler egik ALTIGEN (klasik 7-seg) — sadece YANAN segment cizilir (siyah zemin = LED hissi). Tum
 *           string TEK path'te toplanir, tek fill (perf). Istege bagli yumusak glow (LED hâlesi).
 * YAN ETKI: Saf cizim, durum tutmaz. '0'-'9', '.', '-', ' ' desteklenir; bilinmeyen karakter bos cell.
 */

export type RGB = [number, number, number]

// Segment haritasi: hangi rakamda hangi segmentler yanar (a,b,c,d,e,f,g).
const SEG: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abged',
  '3': 'abgcd',
  '4': 'fgbc',
  '5': 'afgcd',
  '6': 'afgcde',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  '-': 'g',
}

// Cell oranlari — GERCEK SMC 7-seg foto-ÖLÇÜM: rakam yuksekligi ekranin ~%27'si, hane en-boy ~0.40 (DAR/uzun), hane arasi DAR.
// Foto: "0.200" tum string genisligi / rakam-yuksekligi ~1.9 → measureSevenSeg("0.200",1)≈2.0 hedefi. Dar font = ayni genislikte
// DAHA UZUN rakam (gercek scale) + ferah merkez kanal. Haneler dar oldugu icin kucuk bosluk yeterli (net ayrik).
const DIGIT_W = 0.40 // rakam genisligi / yukseklik (DAR/uzun — gercek aspect)
const DOT_W = 0.20 // '.' icin dar cell
const GAP = 0.09 // karakterler arasi bosluk / yukseklik (dar — gercek foto)
const THICK = 0.12 // segment kalinligi / yukseklik

// SEKIL OVERRIDE (Mehmet abi: "urune gore seklini ayarla"): cizici varsayilanlari HUB foto-olcumudur (dar/uzun). Bazi ekranlar
//   (or. E/P regulator) GERCEK urunde daha GENIS/DOLGUN dijit tasir → cagri basina digitW/dotW/gap/thick override edilir; hub
//   override'siz kalir (degismez). Tum oranlar yukseklige gore (h) normalize.
export interface SegMetrics {
  digitW?: number
  dotW?: number
  gap?: number
  thick?: number
}

/** Bir string'in toplam genisligi (px) — sag-yasli hizalama icin onceden olculur. m ile sekil override edilebilir. */
export function measureSevenSeg(text: string, h: number, m: SegMetrics = {}): number {
  const dw = m.digitW ?? DIGIT_W, ow = m.dotW ?? DOT_W, gp = m.gap ?? GAP
  let w = 0
  for (const ch of text) {
    w += (ch === '.' || ch === ' ' ? ow : dw) * h + gp * h
  }
  return Math.max(0, w - gp * h)
}

// Yatay segment (altigen) — sol uc (x0), merkez y (yc), uzunluk L, kalinlik t
function hSeg(ctx: CanvasRenderingContext2D, x0: number, yc: number, L: number, t: number) {
  const h = t / 2
  ctx.moveTo(x0, yc)
  ctx.lineTo(x0 + h, yc - h)
  ctx.lineTo(x0 + L - h, yc - h)
  ctx.lineTo(x0 + L, yc)
  ctx.lineTo(x0 + L - h, yc + h)
  ctx.lineTo(x0 + h, yc + h)
  ctx.closePath()
}

// Dikey segment (altigen) — merkez x (xc), ust y (y0), uzunluk L, kalinlik t
function vSeg(ctx: CanvasRenderingContext2D, xc: number, y0: number, L: number, t: number) {
  const h = t / 2
  ctx.moveTo(xc, y0)
  ctx.lineTo(xc + h, y0 + h)
  ctx.lineTo(xc + h, y0 + L - h)
  ctx.lineTo(xc, y0 + L)
  ctx.lineTo(xc - h, y0 + L - h)
  ctx.lineTo(xc - h, y0 + h)
  ctx.closePath()
}

// Tek rakami (x,y top-left) cell'e altigen segmentlerle PATH'e ekler (fill cagiran yapar).
// GERCEK SMC 7-seg gibi: segmentler TAM-ACIKLIKLI uzun bar (kose boslugu kucuk) → keskin/okunakli (blob DEGIL).
function addDigit(ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, w: number, h: number, thick: number = THICK) {
  const segs = SEG[ch]
  if (!segs) return
  const t = h * thick
  const g = t * 0.18           // segment ucu bosluk (koselerde birbirine degmesin)
  const xl = x + t / 2         // sol dikey segment merkez x
  const xr = x + w - t / 2     // sag dikey segment merkez x
  const yt = y + t / 2         // ust yatay segment merkez y
  const ym = y + h / 2         // orta yatay
  const yb = y + h - t / 2     // alt yatay
  const hx0 = x + t / 2 + g, hL = w - t - 2 * g            // yatay segment sol uc + uzunluk (neredeyse tam genislik)
  const vUy = y + t / 2 + g, vL = h / 2 - t / 2 - 2 * g    // ust dikey baslangic + uzunluk (neredeyse yari yukseklik)
  const vLy = y + h / 2 + g                                // alt dikey baslangic
  if (segs.includes('a')) hSeg(ctx, hx0, yt, hL, t)
  if (segs.includes('g')) hSeg(ctx, hx0, ym, hL, t)
  if (segs.includes('d')) hSeg(ctx, hx0, yb, hL, t)
  if (segs.includes('f')) vSeg(ctx, xl, vUy, vL, t)
  if (segs.includes('b')) vSeg(ctx, xr, vUy, vL, t)
  if (segs.includes('e')) vSeg(ctx, xl, vLy, vL, t)
  if (segs.includes('c')) vSeg(ctx, xr, vLy, vL, t)
}

interface SevenSegOpts extends SegMetrics {
  glow?: number // 0..1 LED hâle yogunlugu (0 = kapali)
  align?: 'left' | 'right'
  // digitW/dotW/gap/thick (SegMetrics): cagri basina sekil override (hub override'siz → degismez; regulator kendi urun-seklini alir)
}

/**
 * 7-segment string cizer. (x,y) = grubun SOL-UST kosesi (align='right' ise x SAG kenar kabul edilir).
 * h = rakam yuksekligi (px). color = [r,g,b]. Tum lit segmentler tek path'te toplanip cizilir.
 */
export function drawSevenSeg(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  h: number,
  color: RGB,
  opts: SevenSegOpts = {},
) {
  // SEKIL: override yoksa HUB foto-olcum varsayilanlari (debimetre LCD'si degismez); regulator kendi genis/dolgun degerlerini gecer
  const dw = opts.digitW ?? DIGIT_W, ow = opts.dotW ?? DOT_W, gp = opts.gap ?? GAP, th = opts.thick ?? THICK
  const total = measureSevenSeg(text, h, { digitW: dw, dotW: ow, gap: gp })
  let cx = opts.align === 'right' ? x - total : x
  const [r, g, b] = color

  // Tek path: tum yanan segmentler + ondalik noktalar
  ctx.beginPath()
  for (const ch of text) {
    const isNarrow = ch === '.' || ch === ' '
    const w = (isNarrow ? ow : dw) * h
    if (ch === '.') {
      const t = h * th
      ctx.moveTo(cx + w * 0.5, y + h - t * 0.7)
      ctx.arc(cx + w * 0.5, y + h - t * 0.7, t * 0.62, 0, Math.PI * 2)
    } else if (ch !== ' ') {
      addDigit(ctx, ch, cx, y, w, h, th)
    }
    cx += w + gp * h
  }

  // Yumusak LED hâlesi (istege bagli) + keskin cekirdek — gercek LED parlaklik hissi
  if (opts.glow && opts.glow > 0) {
    ctx.save()
    ctx.shadowColor = `rgba(${r},${g},${b},${0.6 * opts.glow})`
    ctx.shadowBlur = h * 0.22 * opts.glow
    ctx.fillStyle = `rgba(${r},${g},${b},0.92)`
    ctx.fill()
    ctx.restore()
  }
  ctx.fillStyle = `rgb(${r},${g},${b})`
  ctx.fill()
}
