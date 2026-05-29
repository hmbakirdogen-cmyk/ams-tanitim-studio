/*
 * NE      : Tek sensor kimlik karosu - ust renk seridi + ikon + ad + sayacli rakam + acik birim + KENDI mini canli grafigi.
 * NEDEN   : "her veri ikonu ile GRAFIK GORSELI ile kendi karakteristigini yansitsin" + "kartlar ayni boyutta olmasin" (size prop).
 * NASIL   : Dikey karo (h-full -> mozaik hucresini doldurur); Tilt3D ile 3D egim; Sparkline gecmisten kendi renginde mini grafik.
 * YAN ETKI: history'den son ~60 okuma alinir; metrics.ts'e sensor eklenince App'te karo eklemek yeterli.
 */
import { useMemo } from 'react'
import type { MetricDef } from '@/data/metrics'
import type { Reading } from '@/data/types'
import { useSmoothNumber } from '@/hooks/useSmoothNumber'
import { Tilt3D } from './Tilt3D'
import { Sparkline } from './Sparkline'

type Size = 'lg' | 'md' | 'sm'
const NUM_SIZE: Record<Size, string> = { lg: 'text-5xl', md: 'text-4xl', sm: 'text-3xl' }
const SPARK_H: Record<Size, number> = { lg: 56, md: 44, sm: 38 }

export function MetricCard({ def, history, size = 'md' }: { def: MetricDef; history: Reading[]; size?: Size }) {
  const series = useMemo(() => history.slice(-60).map(def.get), [history, def])
  const current = series.length ? series[series.length - 1] : def.min
  const v = useSmoothNumber(current, def.hero ? 0.16 : 0.12)
  const text = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: def.digits,
    maximumFractionDigits: def.digits,
  }).format(v)
  const Icon = def.icon

  return (
    <Tilt3D className="glass relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl p-5">
      {/* Ust renk seridi - grafikteki cizgiyle BIREBIR ayni renk */}
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: def.color, boxShadow: `0 0 18px ${def.color}` }} />

      <div className="flex items-center gap-2.5" style={{ transform: 'translateZ(22px)' }}>
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
          style={{ background: `${def.color}1f`, color: def.color }}
        >
          <Icon size={20} />
        </span>
        <span className="text-sm font-semibold text-[var(--ink)]">{def.name}</span>
      </div>

      <div className="flex items-baseline gap-1.5" style={{ transform: 'translateZ(14px)' }}>
        <span
          className={`num ${NUM_SIZE[size]} font-bold leading-none text-white`}
          style={{ textShadow: `0 0 24px ${def.color}66` }}
        >
          {text}
        </span>
        <span className="text-xs font-medium text-[var(--ink-soft)]">{def.unitShort}</span>
      </div>

      {/* Kendi mini canli grafigi - her veri kendi karakterini gosterir */}
      <div className="mt-auto -mb-1">
        <Sparkline values={series} color={def.color} min={def.min} max={def.max} height={SPARK_H[size]} />
      </div>
    </Tilt3D>
  )
}
