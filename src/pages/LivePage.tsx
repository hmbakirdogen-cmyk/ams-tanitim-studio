/*
 * NE      : Canli Panel sayfasi - tam genislik 3D akis grafigi (ust) + onem hiyerarsili mozaik kartlar (alt) + mod kontrolu (baslikta).
 * NEDEN   : "grafik ustte tek satir; veriler altta onem sekline gore (esit serit degil)"; tanitimin ana ekrani.
 * NASIL   : Hero3DChart + ChartOverlay (kendini aciklayan) + HeroKPI + farkli footprint'li MetricCard'lar; ModeStrip ile mod surulur.
 * YAN ETKI: Veri App'ten (LiveState) gelir; sayfa degisince veri akisi durmaz (hook App'te yasar).
 */
import { useEffect, useState } from 'react'
import { Waves, BarChart3 } from 'lucide-react'
import { Hero3DChart } from '@/components/Hero3DChart'
import { ChartOverlay } from '@/components/ChartOverlay'
import { DeviceFlowChart } from '@/components/DeviceFlowChart'
import { PipeOverlay } from '@/components/PipeOverlay'
import { HeroKPI } from '@/components/HeroKPI'
import { MetricCard } from '@/components/MetricCard'
import { ModeStrip } from '@/components/ModeStrip'
import { PageHeader } from '@/components/PageHeader'
import { useMetrics, type MetricDef, type MetricKey } from '@/data/metrics'
import { savingPercent } from '@/lib/savings'
import { useSensorVisibility } from '@/data/sensorVisibility'
import { useDeviceSettings } from '@/data/deviceSettings'
import { fmtInt, fmt2 } from '@/lib/format'
import { sound } from '@/lib/sound'
import { useLang } from '@/i18n'
import type { LiveState } from '@/hooks/useLiveReadings'

type LiveView = 'flow' | 'classic'
const VIEW_KEY = 'ams_live_view_v1'

export function LivePage({ data, greetName, theme = 'dark' }: { data: LiveState; greetName?: string; theme?: 'dark' | 'light' }) {
  const { reading, history, setMode } = data
  const { t } = useLang()
  const metrics = useMetrics() // aktif modele gore reaktif (debi/basinc olcegi modelle gelir)
  const byKey = Object.fromEntries(metrics.map((m) => [m.key, m])) as Record<MetricKey, MetricDef>
  const { visible } = useSensorVisibility()
  const visibleMetrics = metrics.filter((m) => visible[m.key])
  const mode = reading?.mode ?? 'normal'
  const percent = reading ? savingPercent(reading.flow) : 0

  // Grafik gorunumu: "Akis" (yeni 3B cihaz akisi) <-> "Klasik" (kuyruklu 3D); secim kalici (localStorage)
  // Eski "pipe" (Boru) kaydi da artik "flow"a duser (Boru komple kaldirildi; Klasik kalir).
  const [view, setView] = useState<LiveView>(() => (localStorage.getItem(VIEW_KEY) === 'classic' ? 'classic' : 'flow'))
  useEffect(() => { localStorage.setItem(VIEW_KEY, view) }, [view])

  // ESIK degerleri (Urun Ayarlari'ndan) - PipeOverlay'de okunabilir etiket (anlik deger + birim)
  const { settings: dev } = useDeviceSettings()
  const thrInfo: Record<string, { value: number; label: string } | undefined> = {
    flow: byKey.flow ? { value: dev.standbyThreshold, label: `${fmtInt(dev.standbyThreshold)} ${byKey.flow.unitShort}` } : undefined,
    pressure: byKey.pressure ? { value: dev.standbyPressure, label: `${fmt2(dev.standbyPressure)} ${byKey.pressure.unitShort}` } : undefined,
  }

  // Kibar, kurumsal ama sicak karsilama - kisiye ismiyle ([Soyad] Bey)
  const hour = new Date().getHours()
  const greet = hour < 11 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'
  const subtitle = greetName
    ? `${t(greet)}, ${greetName} Bey — ${t('tüm sensörler canlı akıyor')}`
    : t('Tüm sensörler tek ekranda, gerçek zamanlı akıyor')

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title="Canlı Panel"
        subtitle={subtitle}
        right={
          <div className="flex flex-wrap items-center gap-2">
            {/* Grafik gorunumu anahtari - Boru (yeni) / Klasik (eski onayli) */}
            <div className="glass flex gap-1 rounded-2xl p-1">
              {([['flow', 'Akış', Waves], ['classic', 'Klasik', BarChart3]] as const).map(([id, label, Icon]) => {
                const on = view === id
                return (
                  <button
                    key={id}
                    onClick={() => { sound.click(); setView(id) }}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${on ? 'text-white' : 'text-[var(--ink-soft)] hover:text-white'}`}
                    style={on ? { background: 'rgba(46,155,255,0.2)', boxShadow: 'inset 0 0 0 1px rgba(46,155,255,0.5)' } : undefined}
                  >
                    <Icon size={14} /> {t(label)}
                  </button>
                )
              })}
            </div>
            <ModeStrip active={mode} onSelect={setMode} />
          </div>
        }
      />

      {/* UST: grafik tek satir, tam genislik - "Boru" (Pnomatik Hat) ya da "Klasik" (kuyruklu 3D) */}
      <section className="glass relative min-h-0 flex-1 overflow-hidden rounded-3xl">
        <div className="absolute inset-0">
          {view === 'flow' ? (
            <DeviceFlowChart reading={reading} metrics={visibleMetrics} mode={mode} theme={theme} />
          ) : (
            <Hero3DChart history={history} metrics={visibleMetrics} theme={theme} />
          )}
        </div>
        {view === 'flow' ? (
          <PipeOverlay reading={reading} metrics={visibleMetrics} mode={mode} thresholds={thrInfo} />
        ) : (
          <ChartOverlay reading={reading} history={history} metrics={visibleMetrics} />
        )}
      </section>

      {/* ALT: mozaik - hicbiri ayni boyutta degil, onem hiyerarsisine gore */}
      <div className="grid shrink-0 grid-cols-2 gap-4 lg:h-[clamp(210px,28vh,290px)] lg:grid-cols-12 lg:grid-rows-2">
        <div className="col-span-2 lg:col-span-4 lg:row-span-2">
          <HeroKPI percent={percent} mode={mode} />
        </div>
        {visible.flow && (
          <div className="col-span-2 lg:col-span-5">
            <MetricCard def={byKey.flow} history={history} size="lg" />
          </div>
        )}
        {visible.pressure && (
          <div className="col-span-1 lg:col-span-3">
            <MetricCard def={byKey.pressure} history={history} size="sm" />
          </div>
        )}
        {visible.temperature && (
          <div className="col-span-1 lg:col-span-6">
            <MetricCard def={byKey.temperature} history={history} size="md" />
          </div>
        )}
        {visible.humidity && (
          <div className="col-span-2 lg:col-span-2">
            <MetricCard def={byKey.humidity} history={history} size="sm" />
          </div>
        )}
      </div>
    </div>
  )
}
