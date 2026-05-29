/*
 * NE      : Canli Panel sayfasi - tam genislik 3D akis grafigi (ust) + onem hiyerarsili mozaik kartlar (alt) + mod kontrolu (baslikta).
 * NEDEN   : "grafik ustte tek satir; veriler altta onem sekline gore (esit serit degil)"; tanitimin ana ekrani.
 * NASIL   : Hero3DChart + ChartOverlay (kendini aciklayan) + HeroKPI + farkli footprint'li MetricCard'lar; ModeStrip ile mod surulur.
 * YAN ETKI: Veri App'ten (LiveState) gelir; sayfa degisince veri akisi durmaz (hook App'te yasar).
 */
import { Hero3DChart } from '@/components/Hero3DChart'
import { ChartOverlay } from '@/components/ChartOverlay'
import { HeroKPI } from '@/components/HeroKPI'
import { MetricCard } from '@/components/MetricCard'
import { ModeStrip } from '@/components/ModeStrip'
import { PageHeader } from '@/components/PageHeader'
import { METRICS, type MetricDef, type MetricKey } from '@/data/metrics'
import { savingPercent } from '@/lib/savings'
import type { LiveState } from '@/hooks/useLiveReadings'

const byKey = Object.fromEntries(METRICS.map((m) => [m.key, m])) as Record<MetricKey, MetricDef>

export function LivePage({ data, greetName }: { data: LiveState; greetName?: string }) {
  const { reading, history, setMode } = data
  const mode = reading?.mode ?? 'normal'
  const percent = reading ? savingPercent(reading.flow) : 0

  // Kibar, kurumsal ama sicak karsilama - kisiye ismiyle ([Soyad] Bey)
  const hour = new Date().getHours()
  const greet = hour < 11 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'
  const subtitle = greetName
    ? `${greet}, ${greetName} Bey — tüm sensörler canlı akıyor`
    : 'Tüm sensörler tek ekranda, gerçek zamanlı akıyor'

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader title="Canlı Panel" subtitle={subtitle} right={<ModeStrip active={mode} onSelect={setMode} />} />

      {/* UST: grafik tek satir, tam genislik */}
      <section className="glass relative min-h-0 flex-1 overflow-hidden rounded-3xl">
        <div className="absolute inset-0">
          <Hero3DChart history={history} />
        </div>
        <ChartOverlay reading={reading} />
      </section>

      {/* ALT: mozaik - hicbiri ayni boyutta degil, onem hiyerarsisine gore */}
      <div className="grid shrink-0 grid-cols-2 gap-4 lg:h-[clamp(210px,28vh,290px)] lg:grid-cols-12 lg:grid-rows-2">
        <div className="col-span-2 lg:col-span-4 lg:row-span-2">
          <HeroKPI percent={percent} mode={mode} />
        </div>
        <div className="col-span-2 lg:col-span-5">
          <MetricCard def={byKey.flow} history={history} size="lg" />
        </div>
        <div className="col-span-1 lg:col-span-3">
          <MetricCard def={byKey.pressure} history={history} size="sm" />
        </div>
        <div className="col-span-1 lg:col-span-6">
          <MetricCard def={byKey.temperature} history={history} size="md" />
        </div>
        <div className="col-span-2 lg:col-span-2">
          <MetricCard def={byKey.humidity} history={history} size="sm" />
        </div>
      </div>
    </div>
  )
}
