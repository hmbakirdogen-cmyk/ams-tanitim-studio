/*
 * NE      : Calisma modu kontrol butonlari - Normal / Tasarruf / Kesinti. Tiklayinca demo senaryosunu o moda surer + ses.
 * NEDEN   : Tanitimin kalbi - arkadas musterinin onunde "Tasarruf"a basinca dususu CANLI gosterir (before/after).
 * NASIL   : Aktif mod parildar (mod rengi); hover/click ses (Web Audio); onSelect -> useLiveReadings.setMode.
 * YAN ETKI: Demo modunda senaryoyu yonlendirir; canli cihazda (ileride) yazma destegine baglanir.
 */
import { MODE_LABEL, MODE_COLOR, type Mode } from '@/data/types'
import { Activity, Leaf, PowerOff, type LucideIcon } from 'lucide-react'
import { sound } from '@/lib/sound'
import { useLang } from '@/i18n'

// Renk TEK KAYNAK: types.MODE_COLOR (HeroKPI/PipeOverlay/AnalysisPage ile aynı). Eskiden inline sabitti -> ileride desync riski (#K4).
const ITEMS: { mode: Mode; icon: LucideIcon }[] = [
  { mode: 'normal', icon: Activity },
  { mode: 'standby', icon: Leaf },
  { mode: 'isolation', icon: PowerOff },
]

export function ModeStrip({ active, onSelect }: { active: Mode; onSelect: (m: Mode) => void }) {
  const { t } = useLang()
  return (
    <div className="glass flex gap-2 rounded-2xl p-2">
      {ITEMS.map(({ mode, icon: Icon }) => {
        const on = active === mode
        const color = MODE_COLOR[mode]
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
            {t(MODE_LABEL[mode])}
          </button>
        )
      })}
    </div>
  )
}
