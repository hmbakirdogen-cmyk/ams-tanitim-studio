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
    // PREMIUM segment (Mehmet abi 2026-06-20): pill formu + gömük (inset) cam zemin + aktif birim IŞIYAN gradient (üst-iç highlight + glow)
    //   + yumuşak geçiş. Pasif birim soluk, hover'da beyaza akar.
    <div
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-[#050b18]/70 p-[3px] backdrop-blur-sm"
      style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.05)' }}
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
            className={`rounded-full px-2 py-[3px] text-[10px] font-bold uppercase leading-none tracking-wider transition-all duration-200 ${on ? 'text-white' : 'text-[var(--ink-soft)] hover:text-white'}`}
            style={on ? { background: `linear-gradient(135deg, ${color}, ${color}aa)`, boxShadow: `0 0 12px ${color}66, inset 0 1px 0 rgba(255,255,255,0.3)` } : undefined}
          >
            {u}
          </button>
        )
      })}
    </div>
  )
}
