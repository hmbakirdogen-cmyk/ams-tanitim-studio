/*
 * NE      : Tasarruf Analizi - yillik TL projeksiyonu + anlik %/kisilan hava/yillik kWh/CO2 + DUZENLENEBILIR hesap ayarlari.
 * NEDEN   : Mehmet Bey: "kullanici elektrik fiyatini (ve gereken verileri) girip tasarrufu ona gore hesaplasin".
 * NASIL   : useEconomy ile ayarlar (kalici); annualProjection/savingPercent bu degerlerle; her alanin yaninda birimi (KATI).
 * YAN ETKI: Degisiklik aninda tum rakamlara yansir + localStorage'a yazilir. "Varsayilana don" sifirlar.
 */
import { PageHeader } from '@/components/PageHeader'
import { Tilt3D } from '@/components/Tilt3D'
import { useSmoothNumber } from '@/hooks/useSmoothNumber'
import { annualProjection, savingPercent } from '@/lib/savings'
import { useEconomy } from '@/data/economy'
import { fmtInt, fmt1, fmtTLCompact, fmtCompact } from '@/lib/format'
import { Percent, Wind, Zap, Cloud, RotateCcw, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import type { LiveState } from '@/hooks/useLiveReadings'

function StatCard({ icon: Icon, color, label, value, sub }: { icon: LucideIcon; color: string; label: string; value: string; sub: string }) {
  return (
    <Tilt3D className="glass relative flex flex-col gap-2 overflow-hidden rounded-2xl p-5" max={6}>
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: color, boxShadow: `0 0 18px ${color}` }} />
      <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${color}1f`, color }}>
        <Icon size={20} />
      </span>
      <div className="num text-3xl font-bold text-white" style={{ textShadow: `0 0 22px ${color}66` }}>{value}</div>
      <div className="text-sm font-medium text-[var(--ink)]">{label}</div>
      <div className="text-xs text-[var(--ink-soft)]">{sub}</div>
    </Tilt3D>
  )
}

function EcoField({ label, unit, value, step, onChange }: { label: string; unit: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[var(--ink-soft)]">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-[var(--hair)] px-3 py-2 focus-within:border-[var(--smc-bright)]">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="num w-full bg-transparent text-sm font-semibold text-white outline-none"
        />
        <span className="shrink-0 text-xs font-medium text-[var(--ink-soft)]">{unit}</span>
      </div>
    </div>
  )
}

export function SavingsPage({ data }: { data: LiveState }) {
  const { economy, update, reset } = useEconomy()
  const flow = data.reading?.flow ?? economy.baselineFlow
  const savedFlow = Math.max(0, economy.baselineFlow - flow)
  const annual = annualProjection(savedFlow, economy)
  const pct = savingPercent(flow, economy.baselineFlow)

  const tl = useSmoothNumber(annual.tl, 0.08)
  const kwh = useSmoothNumber(annual.kwh, 0.08)
  const co2 = useSmoothNumber(annual.co2, 0.08)
  const p = useSmoothNumber(pct, 0.1)
  const air = useSmoothNumber(savedFlow, 0.12)

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      <PageHeader title="Tasarruf Analizi" subtitle="AMS ile yıllık tahmini enerji, para ve karbon kazancı" />

      <Tilt3D className="glass relative overflow-hidden rounded-3xl p-8" max={4}>
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-25 blur-3xl" style={{ background: 'var(--c-saving)' }} />
        <div className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--ink-soft)]" style={{ transform: 'translateZ(18px)' }}>
          Yıllık Tahmini Tasarruf
        </div>
        <div
          className="num mt-1 text-7xl font-extrabold leading-none text-[var(--c-saving)] glow-text"
          style={{ ['--glow' as string]: 'rgba(65,224,138,0.5)', transform: 'translateZ(28px)' }}
        >
          {fmtTLCompact(tl)}
        </div>
        <div className="mt-2 text-sm text-[var(--ink-soft)]">
          {fmt1(economy.priceTL)} ₺/kWh elektrik fiyatı ve {fmtInt(economy.opHoursPerYear)} saat/yıl çalışma varsayımıyla
        </div>
      </Tilt3D>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Percent} color="#41E08A" label="Anlık Tasarruf" value={`%${fmt1(p)}`} sub="normal çalışmaya göre" />
        <StatCard icon={Wind} color="#2E9BFF" label="Kısılan Hava" value={fmtInt(air)} sub="l/dak" />
        <StatCard icon={Zap} color="#FFB04D" label="Yıllık Enerji" value={fmtCompact(kwh)} sub="kWh" />
        <StatCard icon={Cloud} color="#7CE0FF" label="Yıllık Karbon" value={fmtCompact(co2)} sub="kg CO₂" />
      </div>

      {/* Duzenlenebilir hesap ayarlari - kullanici elektrik fiyatini vb. girer */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <SlidersHorizontal size={16} className="text-[var(--smc-bright)]" />
            Hesap Ayarları <span className="text-xs font-normal text-[var(--ink-soft)]">— değerleri kendiniz girin, hesap anında güncellenir</span>
          </div>
          <button onClick={reset} className="flex items-center gap-1.5 rounded-lg border border-[var(--hair)] px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition hover:text-white">
            <RotateCcw size={13} /> Varsayılana dön
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <EcoField label="Elektrik Fiyatı" unit="₺ / kWh" value={economy.priceTL} step={0.1} onChange={(v) => update({ priceTL: v })} />
          <EcoField label="Çalışma Süresi" unit="saat / yıl" value={economy.opHoursPerYear} step={100} onChange={(v) => update({ opHoursPerYear: v })} />
          <EcoField label="Normal Hava Tüketimi" unit="l/dak" value={economy.baselineFlow} step={50} onChange={(v) => update({ baselineFlow: v })} />
          <EcoField label="Enerji Katsayısı" unit="kWh / m³" value={economy.energyKwhPerM3} step={0.01} onChange={(v) => update({ energyKwhPerM3: v })} />
          <EcoField label="Karbon Katsayısı" unit="kg CO₂ / kWh" value={economy.co2PerKwh} step={0.01} onChange={(v) => update({ co2PerKwh: v })} />
        </div>
      </div>
    </div>
  )
}
