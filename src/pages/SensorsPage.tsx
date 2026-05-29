/*
 * NE      : Sensor Detaylari sayfasi - her sensor icin buyuk detay karti: anlik deger + buyuk mini grafik + min/ort/max istatistik.
 * NEDEN   : "diger veri sayfalari ile gelistir" - tek bakistaki panelin otesinde sensor-bazli derin analiz.
 * NASIL   : METRICS uzerinde map; her sensor icin gecmisten min/ort/max hesabi + Sparkline + sayacli anlik deger; kademeli reveal.
 * YAN ETKI: Veri App'ten; yeni sensor eklenince (metrics.ts) bu sayfa da otomatik genisler.
 */
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/PageHeader'
import { Tilt3D } from '@/components/Tilt3D'
import { Sparkline } from '@/components/Sparkline'
import { useSmoothNumber } from '@/hooks/useSmoothNumber'
import { METRICS, type MetricDef } from '@/data/metrics'
import { useSensorVisibility } from '@/data/sensorVisibility'
import type { Reading } from '@/data/types'
import type { LiveState } from '@/hooks/useLiveReadings'

const fmt = (v: number, d: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)

function computeStats(series: number[]) {
  if (!series.length) return { min: 0, max: 0, avg: 0, cur: 0 }
  let min = series[0]
  let max = series[0]
  let sum = 0
  for (const v of series) {
    if (v < min) min = v
    if (v > max) max = v
    sum += v
  }
  return { min, max, avg: sum / series.length, cur: series[series.length - 1] }
}

function SensorDetail({ def, history }: { def: MetricDef; history: Reading[] }) {
  const series = history.map(def.get)
  const s = computeStats(series)
  const cur = useSmoothNumber(s.cur, def.hero ? 0.16 : 0.12)
  const Icon = def.icon
  return (
    <Tilt3D className="glass relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl p-6" max={5}>
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: def.color, boxShadow: `0 0 18px ${def.color}` }} />
      <div className="flex items-center gap-3" style={{ transform: 'translateZ(18px)' }}>
        <span className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: `${def.color}1f`, color: def.color }}>
          <Icon size={24} />
        </span>
        <div>
          <div className="text-base font-semibold text-white">{def.name}</div>
          <div className="text-xs text-[var(--ink-soft)]">{def.unit}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="num text-4xl font-bold text-white" style={{ textShadow: `0 0 22px ${def.color}66` }}>
            {fmt(cur, def.digits)}
          </div>
          <div className="text-[11px] font-medium text-[var(--ink-soft)]">{def.unitShort}</div>
        </div>
      </div>

      <Sparkline values={series} color={def.color} min={def.min} max={def.max} height={72} />

      <div className="grid grid-cols-3 gap-3">
        {([['En düşük', s.min], ['Ortalama', s.avg], ['En yüksek', s.max]] as const).map(([label, val]) => (
          <div key={label} className="rounded-xl bg-white/5 px-3 py-2">
            <div className="text-[11px] text-[var(--ink-soft)]">{label}</div>
            <div className="num text-lg font-semibold text-white">{fmt(val, def.digits)}</div>
          </div>
        ))}
      </div>
    </Tilt3D>
  )
}

export function SensorsPage({ data }: { data: LiveState }) {
  const { visible } = useSensorVisibility()
  const shown = METRICS.filter((m) => visible[m.key])
  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title="Sensör Detayları" subtitle="Her sensörün anlık değeri, eğilimi ve istatistikleri" />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
        {shown.map((def, i) => (
          <motion.div
            key={def.key}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4, ease: 'easeOut' }}
          >
            <SensorDetail def={def} history={data.history} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
