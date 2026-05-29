/*
 * NE      : Mini canli grafik (sparkline) - bir sensorun son okumalarini kendi renginde, YUVARLAK (bezier) isiltili alan+cizgi cizer.
 * NEDEN   : "her veri ikonu ile GRAFIK GORSELI ile kendi karakterini yansitsin" + "ani kirilma YOK, yuvarlak ve akici".
 * NASIL   : Catmull-Rom -> kubik bezier yumusatma (keskin koseyi onler); gradient dolgu + glow. useId ile benzersiz id.
 * YAN ETKI: Saf gorsel; non-scaling-stroke -> her boyutta keskin cizgi.
 */
import { useId } from 'react'

interface SparklineProps {
  values: number[]
  color: string
  min: number
  max: number
  height?: number
}

// Catmull-Rom -> kubik bezier (yuvarlak, kirilmasiz egri)
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`
  }
  return d
}

export function Sparkline({ values, color, min, max, height = 40 }: SparklineProps) {
  const uid = useId()
  const gid = `spark-${uid}`
  const W = 100
  const H = 100

  if (values.length < 2) return <div style={{ height }} />

  const span = max - min || 1
  const y = (v: number) => H - Math.max(0, Math.min(1, (v - min) / span)) * H
  const step = W / (values.length - 1)
  const pts: [number, number][] = values.map((v, i) => [i * step, y(v)])
  const line = smoothPath(pts)
  const area = `${line} L ${W},${H} L 0,${H} Z`

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.38" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  )
}
