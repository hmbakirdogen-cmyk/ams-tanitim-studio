/*
 * NE      : Basınç birimi (MPa | bar) ufak segment butonu — basınçla ilgili kartlarda gösterilir.
 * NEDEN   : Mehmet abi (2026-06-19): "basınçla alakalı bütün kartlara bar/MPa ayrımı için ufak buton." Tıklayınca GLOBAL anahtar değişir
 *           → tüm basınç gösterimleri (kart/grafik/overlay/detay/analiz) aynı anda o birime döner (metrics.ts tek kaynak).
 * NASIL   : usePressureUnit() store'u. stopPropagation → kart onClick'i (detay penceresi) TETİKLENMEZ. Aktif birim sensör renginde vurgulu.
 * YAN ETKI: Saf görsel + global state. Birim değişimi localStorage'da kalıcı (offline).
 */
import { usePressureUnit, type PressureUnit } from '@/data/pressureUnit'

const UNITS: PressureUnit[] = ['MPa', 'bar']

export function PressureUnitToggle({ color = '#FF453A' }: { color?: string }) {
  const { unit, setUnit } = usePressureUnit()
  return (
    <div
      className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-[var(--hair)] bg-[#050b18]/60 p-0.5"
      onClick={(e) => e.stopPropagation()}
    >
      {UNITS.map((u) => {
        const on = unit === u
        return (
          <button
            key={u}
            type="button"
            onClick={(e) => { e.stopPropagation(); setUnit(u) }}
            aria-pressed={on}
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide transition ${on ? 'text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'}`}
            style={on ? { background: `linear-gradient(135deg, ${color}cc, ${color}66)`, boxShadow: `0 0 8px ${color}55` } : undefined}
          >
            {u}
          </button>
        )
      })}
    </div>
  )
}
