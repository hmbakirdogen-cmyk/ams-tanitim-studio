/*
 * NE      : Urun Ayarlari sayfasi - cihaz parametreleri: bekleme basinci / otomatik kesinti suresi / bekleme esigi / valf modu.
 * NEDEN   : Mehmet Bey: "programdan urune ayar yapilabilsin; hangi senaryoda hava kesiliyor". Program = kontrol+ayar merkezi.
 * NASIL   : useDeviceSettings (kalici); slider + segmented; her degerin yaninda BIRIMI. Demo'da senaryoyu surer, canlida OPC UA write.
 * YAN ETKI: Degisiklik aninda demoSource'a yansir (bekleme basinci/oto-kesinti suresi grafikte gorunur).
 */
import { PageHeader } from '@/components/PageHeader'
import { Tilt3D } from '@/components/Tilt3D'
import { useDeviceSettings, type ValveMode } from '@/data/deviceSettings'
import { useSensorVisibility } from '@/data/sensorVisibility'
import { METRICS } from '@/data/metrics'
import { fmt2, fmtInt } from '@/lib/format'
import { Gauge, Timer, Wind, ToggleRight, Info, RotateCcw, Eye, EyeOff, type LucideIcon } from 'lucide-react'

function SettingCard({ icon: Icon, color, title, desc, children }: { icon: LucideIcon; color: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <Tilt3D className="glass relative flex flex-col gap-4 overflow-hidden rounded-2xl p-6" max={5}>
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: color, boxShadow: `0 0 18px ${color}` }} />
      <div className="flex items-center gap-3" style={{ transform: 'translateZ(16px)' }}>
        <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${color}1f`, color }}>
          <Icon size={22} />
        </span>
        <div>
          <div className="text-base font-semibold text-white">{title}</div>
          <div className="text-xs text-[var(--ink-soft)]">{desc}</div>
        </div>
      </div>
      {children}
    </Tilt3D>
  )
}

export function ProductSettingsPage() {
  const { settings, update, reset } = useDeviceSettings()
  const { visible, toggle } = useSensorVisibility()

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      <PageHeader
        title="Ürün Ayarları"
        subtitle="Cihazın çalışma parametreleri — havayı hangi koşullarda kıstığını/kestiğini siz belirleyin"
        right={
          <button onClick={reset} className="flex items-center gap-1.5 rounded-lg border border-[var(--hair)] px-3 py-2 text-xs font-medium text-[var(--ink-soft)] transition hover:text-white">
            <RotateCcw size={13} /> Varsayılana dön
          </button>
        }
      />

      <div className="glass flex items-start gap-3 rounded-2xl p-4 text-sm text-[var(--ink-soft)]">
        <Info size={18} className="mt-0.5 shrink-0 text-[var(--smc-bright)]" />
        <div>
          Bu ayarlar demo modunda <b className="text-white">senaryoyu canlı sürer</b> (bekleme basıncı ve otomatik kesinti süresi
          grafiğe anında yansır). Cihaza bağlandığında aynı değerler <b className="text-white">OPC UA ile cihaza yazılır</b>.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Bekleme Basinci */}
        <SettingCard icon={Gauge} color="#36E0C8" title="Bekleme Basıncı" desc="Tasarruf modunda düşürülen hedef basınç">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs text-[var(--ink-soft)]">Hedef</span>
            <span className="num text-2xl font-bold text-white">
              {fmt2(settings.standbyPressure)} <span className="text-sm font-medium text-[var(--ink-soft)]">MPa</span>
            </span>
          </div>
          <input type="range" min={0.1} max={0.4} step={0.05} value={settings.standbyPressure} onChange={(e) => update({ standbyPressure: parseFloat(e.target.value) })} className="w-full" style={{ accentColor: '#36E0C8' }} />
        </SettingCard>

        {/* Otomatik Kesinti Suresi */}
        <SettingCard icon={Timer} color="#FFB04D" title="Otomatik Kesinti Süresi" desc="Beklemeden sonra havanın kesilmesine kadar süre">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs text-[var(--ink-soft)]">Süre</span>
            <span className="num text-2xl font-bold text-white">
              {fmtInt(settings.autoIsolationSec)} <span className="text-sm font-medium text-[var(--ink-soft)]">saniye</span>
            </span>
          </div>
          <input type="range" min={2} max={30} step={1} value={settings.autoIsolationSec} onChange={(e) => update({ autoIsolationSec: parseInt(e.target.value, 10) })} className="w-full" style={{ accentColor: '#FFB04D' }} />
        </SettingCard>

        {/* Bekleme Esigi */}
        <SettingCard icon={Wind} color="#2E9BFF" title="Bekleme Eşiği" desc="Debi bu değerin altına düşünce bekleme moduna geçilir">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs text-[var(--ink-soft)]">Eşik</span>
            <span className="num text-2xl font-bold text-white">
              {fmtInt(settings.standbyThreshold)} <span className="text-sm font-medium text-[var(--ink-soft)]">litre / dakika</span>
            </span>
          </div>
          <input type="range" min={50} max={800} step={10} value={settings.standbyThreshold} onChange={(e) => update({ standbyThreshold: parseInt(e.target.value, 10) })} className="w-full" style={{ accentColor: '#2E9BFF' }} />
        </SettingCard>

        {/* Valf Modu */}
        <SettingCard icon={ToggleRight} color="#7CE0FF" title="Valf Modu" desc="Tahliye valfinin normal durumu">
          <div className="flex gap-2">
            {(['NC', 'NO'] as ValveMode[]).map((m) => {
              const on = settings.valveMode === m
              return (
                <button
                  key={m}
                  onClick={() => update({ valveMode: m })}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${on ? 'text-white' : 'text-[var(--ink-soft)] hover:text-white'}`}
                  style={on ? { background: 'rgba(124,224,255,0.2)', boxShadow: 'inset 0 0 0 1px rgba(124,224,255,0.5)' } : { border: '1px solid var(--hair)' }}
                >
                  {m === 'NC' ? 'Normalde Kapalı' : 'Normalde Açık'}
                </button>
              )
            })}
          </div>
        </SettingCard>
      </div>

      {/* Sensor gorunurlugu - hangi sensorler grafik/kartlarda gorunsun (yeni sensore hazir) */}
      <div className="glass rounded-2xl p-6">
        <div className="mb-1 flex items-center gap-2 text-base font-semibold text-white">
          <Eye size={18} className="text-[var(--smc-bright)]" /> Sensörler
        </div>
        <div className="mb-4 text-xs text-[var(--ink-soft)]">
          Hangi sensörlerin grafik ve kartlarda görüneceğini seçin. Yeni sensör eklendiğinde burada otomatik görünür. (Şu an hepsi etkin.)
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {METRICS.map((m) => {
            const on = visible[m.key]
            const Icon = m.icon
            return (
              <button
                key={m.key}
                onClick={() => toggle(m.key)}
                className="flex items-center gap-3 rounded-xl border px-4 py-3 transition"
                style={{ borderColor: on ? `${m.color}66` : 'var(--hair)', background: on ? `${m.color}14` : 'transparent' }}
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${m.color}1f`, color: m.color }}>
                  <Icon size={18} />
                </span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">{m.name}</div>
                  <div className="text-[11px] text-[var(--ink-soft)]">{m.unit}</div>
                </div>
                <span className="ml-auto">
                  {on ? <Eye size={18} className="text-[var(--c-saving)]" /> : <EyeOff size={18} className="text-[var(--ink-soft)]" />}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
