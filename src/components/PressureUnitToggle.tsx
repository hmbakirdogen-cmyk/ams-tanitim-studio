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
    // PREMIUM + AĞIRBAŞLI segment (Mehmet abi 2026-06-20: "premium dursun, asla şımarıklık yok — JP SMC"): gömük cam ray + aktif birim
    //   "yükseltilmiş hassas tuş" gibi — KONTROLLÜ renk tonu (parlak dolgu/dış-glow YOK) + üst-iç highlight + ince renk çerçeve (inset).
    //   Net beyaz yazı; pasif soluk, hover'da beyaza akar. Gösterişsiz, enstrüman ölçeğinde.
    <div
      className="inline-flex shrink-0 items-center rounded-full border border-white/10 bg-[#050b18]/80 p-[2px] backdrop-blur-sm"
      style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)' }}
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
            className={`rounded-full px-2 py-[3px] text-[9.5px] font-semibold uppercase leading-none tracking-[0.04em] transition-colors duration-200 ${on ? 'text-white' : 'text-[var(--ink-soft)]/70 hover:text-white'}`}
            style={on ? { background: `linear-gradient(180deg, ${color}2e, ${color}12)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), inset 0 0 0 1px ${color}55` } : undefined}
          >
            {u}
          </button>
        )
      })}
    </div>
  )
}
