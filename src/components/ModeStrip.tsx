/*
 * NE      : Calisma modu kontrol butonlari - Normal / Tasarruf / Kesinti. Tiklayinca demo senaryosunu o moda surer + ses.
 * NEDEN   : Tanitimin kalbi - arkadas musterinin onunde "Tasarruf"a basinca dususu CANLI gosterir (before/after).
 * NASIL   : Aktif mod parildar (mod rengi); hover/click ses (Web Audio); onSelect -> useLiveReadings.setMode.
 * YAN ETKI: Demo modunda senaryoyu yonlendirir; canli cihazda (ileride) yazma destegine baglanir.
 */
import { MODE_LABEL, type Mode } from '@/data/types'
import { Activity, Leaf, PowerOff, type LucideIcon } from 'lucide-react'
import { sound } from '@/lib/sound'

const ITEMS: { mode: Mode; icon: LucideIcon; color: string }[] = [
  { mode: 'normal', icon: Activity, color: '#2E9BFF' },
  { mode: 'standby', icon: Leaf, color: '#41E08A' },
  { mode: 'isolation', icon: PowerOff, color: '#FFB04D' },
]

export function ModeStrip({ active, onSelect }: { active: Mode; onSelect: (m: Mode) => void }) {
  return (
    <div className="glass flex gap-2 rounded-2xl p-2">
      {ITEMS.map(({ mode, icon: Icon, color }) => {
        const on = active === mode
        return (
          <button
            key={mode}
            onMouseEnter={() => sound.hover()}
            onClick={() => {
              sound.click()
              sound.mode(mode)
              onSelect(mode)
            }}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              on ? 'text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
            style={
              on
                ? {
                    background: `linear-gradient(135deg, ${color}33, ${color}0f)`,
                    boxShadow: `0 0 22px -6px ${color}, inset 0 0 0 1px ${color}66`,
                  }
                : undefined
            }
          >
            <Icon size={16} style={{ color: on ? color : undefined }} />
            {MODE_LABEL[mode]}
          </button>
        )
      })}
    </div>
  )
}
