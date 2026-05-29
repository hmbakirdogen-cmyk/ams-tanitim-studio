/*
 * NE      : Mesaj kahramani panel - anlik tasarruf yuzdesi (buyuk) + o anki calisma modu rozeti. 3D derinlikli (Tilt3D).
 * NEDEN   : Onem hiyerarsisi: tasarruf mesaji ferah, prominent, koseye sikismadan; "her yerde 3D".
 * NASIL   : useSmoothNumber ile akan %; mod rengine gore rozet; Tilt3D ile fareyle egilir, ic elemanlar translateZ ile one cikar.
 * YAN ETKI: Saf gorsel; deger App'ten (reading.flow -> savingPercent).
 */
import { useSmoothNumber } from '@/hooks/useSmoothNumber'
import { MODE_LABEL, MODE_DESC, type Mode } from '@/data/types'
import { fmt1 } from '@/lib/format'
import { Tilt3D } from './Tilt3D'

const MODE_COLOR: Record<Mode, string> = {
  normal: '#2E9BFF',
  standby: '#41E08A',
  isolation: '#FFB04D',
}

export function HeroKPI({ percent, mode }: { percent: number; mode: Mode }) {
  const p = useSmoothNumber(percent, 0.1)
  const c = MODE_COLOR[mode]
  return (
    <Tilt3D className="glass relative flex h-full flex-col justify-between overflow-hidden rounded-2xl p-6">
      <div
        className="absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-25 blur-3xl"
        style={{ background: 'var(--c-saving)' }}
      />
      <div style={{ transform: 'translateZ(22px)' }}>
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--ink-soft)]">Anlık Tasarruf</div>
        <div
          className="num mt-1 text-6xl font-extrabold leading-none text-[var(--c-saving)] glow-text"
          style={{ ['--glow' as string]: 'rgba(65,224,138,0.5)' }}
        >
          %{fmt1(p)}
        </div>
        <div className="mt-2 text-xs text-[var(--ink-soft)]">Normal çalışmaya göre daha az hava tüketimi</div>
      </div>
      <div style={{ transform: 'translateZ(12px)' }}>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 10px ${c}` }} />
          <span className="text-base font-semibold text-white">{MODE_LABEL[mode]}</span>
        </div>
        <div className="mt-0.5 text-xs text-[var(--ink-soft)]">{MODE_DESC[mode]}</div>
      </div>
    </Tilt3D>
  )
}
