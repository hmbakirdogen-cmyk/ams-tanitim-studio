/*
 * NE      : Mini canli grafik (sparkline) - bir sensorun son okumalarini kendi renginde, YUVARLAK (bezier) isiltili alan+cizgi.
 *           DETAYLI ama FERAH (Mehmet Abi): yumusak alan + akici cizgi + CANLI son-deger noktasi (NABIZ halkasiyla "hareket") +
 *           ince zemin referans cizgisi. Izgara kalabaligi YOK -> ferah; "su an" noktasi + taban referansi -> anlasilir/detayli.
 * NEDEN   : "kart grafiklerinin hareketleri ve detaylari uzerinde calisalim; eksenler neyi ifade ediyor gorunsun." Nabiz = canli his;
 *           eksen bilgisi (Y=deger araligi, X=zaman) KARTTA gosterilir (unit/min/max/zaman orada bilinir) -> sparkline gorsele odaklanir.
 * NASIL   : Catmull-Rom -> kubik bezier (kirilmasiz). Alan+cizgi SVG (preserveAspectRatio=none -> kart enine gerinir). Son nokta +
 *           etrafinda ring-pulse halkasi HTML overlay (gercek daire; gerinmez/oval olmaz). non-scaling-stroke -> her boyutta keskin.
 * YAN ETKI: Saf gorsel. head/baseline/pulse kapatilabilir (default acik). useId -> benzersiz gradient id. ring-pulse keyframe index.css'te.
 */
import { useId } from 'react'

interface SparklineProps {
  values: number[]
  color: string
  min: number
  max: number
  height?: number
  head?: boolean      // CANLI son-deger noktasi (default KAPALI; sadece Canli Panel karti acar — PDF/rapor sade kalsin)
  pulse?: boolean     // son nokta etrafinda nabiz halkasi - "hareket" (default KAPALI)
  baseline?: boolean  // ince zemin referans cizgisi (default KAPALI)
  fill?: boolean      // EBEVEYNI DOLDUR (height yerine %100) — kart icinde flex-1 alana otursun (bos bosluk olmasin)
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

export function Sparkline({ values, color, min, max, height = 40, head = false, pulse = false, baseline = false, fill = false }: SparklineProps) {
  const uid = useId()
  const gid = `spark-${uid}`
  const W = 100
  const H = 100
  const hStyle: number | string = fill ? '100%' : height

  if (values.length < 2) return <div style={{ height: hStyle }} />

  const span = max - min || 1
  const norm = (v: number) => Math.max(0, Math.min(1, (v - min) / span))
  // ÜST/ALT PAY (Mehmet abi 2026-06-19: "rapor grafiklerinin üstü kesik") — çizgi + ışık gölgesi + nokta SVG/konteyner kenarında KIRPILMASIN:
  //   çizimi içeri al (norm 0..1 → [PADV, H−PADV]). Veri tepeye/dibe değse bile kenarda pay kalır.
  const PADV = 7
  const y = (v: number) => PADV + (1 - norm(v)) * (H - 2 * PADV)
  const step = W / (values.length - 1)
  const pts: [number, number][] = values.map((v, i) => [i * step, y(v)])
  const line = smoothPath(pts)
  const area = `${line} L ${W},${H} L 0,${H} Z`
  const lastNorm = norm(values[values.length - 1]) // son okumanin 0..1 konumu (head noktasi)

  return (
    <div style={{ position: 'relative', width: '100%', height: hStyle }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: hStyle, display: 'block' }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.26" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* ZEMİN referans çizgisi (ferah, çok ince) — değerin tabana göre yüksekliği okunur */}
        {baseline && (
          <line x1="0" y1="99" x2="100" y2="99" stroke="var(--hair)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        )}
        <path d={area} fill={`url(#${gid})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        />
      </svg>
      {/* CANLI son-değer noktası + NABIZ halkası — gerçek daire (SVG dışı overlay; gerinmez/oval olmaz). "Hareket" + göz "şu an"a gider. */}
      {head && (
        <span
          aria-hidden
          style={{ position: 'absolute', left: 'calc(100% - 4px)', top: `${PADV + (1 - lastNorm) * (100 - 2 * PADV)}%`, transform: 'translate(-50%, -50%)' }}
        >
          {pulse && (
            <span
              style={{
                position: 'absolute', left: '50%', top: '50%', width: 7, height: 7,
                marginLeft: -3.5, marginTop: -3.5, borderRadius: '9999px',
                border: `1.5px solid ${color}`, animation: 'ring-pulse 1.8s ease-out infinite',
              }}
            />
          )}
          <span
            style={{
              display: 'block', width: 7, height: 7, borderRadius: '9999px',
              background: color, boxShadow: `0 0 8px ${color}, 0 0 2px ${color}`,
            }}
          />
        </span>
      )}
    </div>
  )
}
