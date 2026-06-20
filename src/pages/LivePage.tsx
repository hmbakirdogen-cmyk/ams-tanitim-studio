/*
 * NE      : Canlı Panel — BİRLEŞİK tek ekran (Mehmet Abi): SOL ana blokta Akış (cihaz, üstte) + tam orantılı Klasik grafik (altta);
 *           SAĞ dar kolonda anlık veriler hiyerarşik (Tasarruf % üstte + kompakt metrik kartları). Hepsi ortak 3D-boşluk platformunda yüzer.
 * NEDEN   : "Akış ve Klasik tek ekranda birleşsin; klasik akışın altına tam orantılı gelsin; kartları sağ bloğa taşı, hiyerarşik;
 *           ürünü küçültme; ferah sayfa; arka planda 3B boşlukta yüzme hissi." Görünüm anahtarı (Akış/Klasik) KALDIRILDI — ikisi de hep görünür.
 * NASIL   : SpacePlatform ortak zemin. Solda dikey 2 satır (Akış flex-[3] büyük + Klasik flex-[2]); her biri kendi cam yüzeyinde, overlay'leriyle.
 *           Sağda Tasarruf (HeroKPI) + 4 kompakt MetricCard (size="xs"). ModeStrip başlıkta kalır. Tüm veri App'ten (LiveState).
 *           NOT: Cihaz penceresi İÇİNDEKİ anlık readout'lar (PipeOverlay) Mehmet Abi isteğiyle SOL-üstte (arkalarında animasyon olmadan).
 * YAN ETKI: VIEW_KEY/anahtar kaldırıldı (artık tek düzen). Mobil zaten engelli; masaüstü hedefli ferah grid. i18n korunur.
 */
import { AnimatePresence } from 'framer-motion'
import { LiveChart2D } from '@/components/LiveChart2D'
import { ChartOverlay } from '@/components/ChartOverlay'
import { DeviceFlowChart } from '@/components/DeviceFlowChart'
import { DeviceCommands } from '@/components/DeviceCommands'
import { MetricDetailModal } from '@/components/MetricDetailModal'
import { PipeOverlay } from '@/components/PipeOverlay'
import { HeroKPI } from '@/components/HeroKPI'
import { MetricCard } from '@/components/MetricCard'
import { PageHeader } from '@/components/PageHeader'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useMetrics, type MetricDef, type MetricKey } from '@/data/metrics'
import { savingPercent } from '@/lib/savings'
import { useSensorVisibility } from '@/data/sensorVisibility'
import { useDeviceSettings } from '@/data/deviceSettings'
import { useEconomy } from '@/data/economy'
import { useTotalizer } from '@/data/totalizer'
import { fmtInt, fmt2 } from '@/lib/format'
import { useLang } from '@/i18n'
import { useMemo, useState, useEffect } from 'react'
import type { LiveState } from '@/hooks/useLiveReadings'

// Grafik sekmeleri (Mehmet abi 2026-06-19): AYNI görünüm mantığı, farklı 2 sensör çifti
const CHART_TABS: { label: string; groups: MetricKey[][] }[] = [
  { label: 'Hava & Basınç', groups: [['flow'], ['pressure']] },
  { label: 'Sıcaklık & Nem', groups: [['temperature'], ['humidity']] },
]

export function LivePage({ data, greetName, theme = 'dark' }: { data: LiveState; greetName?: string; theme?: 'dark' | 'light' }) {
  const { reading, history, startedAt, trend, sendCommand } = data
  // ZAMAN PENCERESI (Mehmet Abi: "15 dk'yi sıfıra doğru kolayca ayarlayabilelim") — 3D grafik bu aralığı gösterir; 15 dk varsayılan.
  const [windowMs, setWindowMs] = useState(15 * 60 * 1000)
  // GRAFİK SEKMESİ (Mehmet abi 2026-06-19): 0 = Hava & Basınç, 1 = Sıcaklık & Nem
  const [chartTab, setChartTab] = useState(0)
  // Kart tıklanınca açılan DETAY penceresi (Mehmet Abi: "kartlar tıklanabilir, detaylı grafik+eksen göstersin") — seçili metrik anahtarı.
  const [detailKey, setDetailKey] = useState<MetricKey | null>(null)
  // Seçili pencereye kırpılmış trend (≈2/sn, en çok 15 dk) → Hero3DChart L=600 vertekse yeniden örnekler + ChartOverlay saat etiketleri.
  const shownTrend = useMemo(() => {
    if (!trend.length) return trend
    const cut = trend[trend.length - 1].t - windowMs
    return trend.filter((r) => r.t >= cut)
  }, [trend, windowMs])
  const { t } = useLang()
  // CANLI PANEL'E GEÇİŞ AKICILIĞI (Mehmet Abi: "geçerken gecikme/görüntü kirliliği/takılma"): ağır katmanlar (WebGL 3D + 2D akış +
  //   ambient) sayfa geçiş animasyonu (~0.22s) BİTTİKTEN sonra mount edilir → opacity geçişi GPU/shader init'iyle ÇAKIŞMAZ; sonra fade-in.
  const [heavyReady, setHeavyReady] = useState(false)
  useEffect(() => {
    const id = window.setTimeout(() => setHeavyReady(true), 180)
    return () => window.clearTimeout(id)
  }, [])
  const metrics = useMetrics() // aktif modele gore reaktif (debi/basinc olcegi modelle gelir)
  const byKey = Object.fromEntries(metrics.map((m) => [m.key, m])) as Record<MetricKey, MetricDef>
  const { visible } = useSensorVisibility()
  // TOPLAM TÜKETİM (totalizer) — cihaz LCD'sindeki sağ-alt toplamla AYNI değer (DeviceFlowChart yayınlar). Flow kartında gösterilir.
  const totalL = useTotalizer()
  // visibleMetrics MEMO'lu → referans yalnız model/görünürlük değişince değişir (tik başına yeni referans + gereksiz sort/sampleY çöpü önlenir).
  const visibleMetrics = useMemo(() => metrics.filter((m) => visible[m.key]), [metrics, visible])
  const mode = reading?.mode ?? 'normal'
  // Tasarruf % = AKTİF MODEL baseline'ına göre (SavingsPage + demoSource ile birebir tutarlı; eski sabit 1800 yerine economy.baselineFlow).
  const { economy } = useEconomy()
  const percent = reading ? savingPercent(reading.flow, economy.baselineFlow) : 0

  // ESIK degerleri (Urun Ayarlari'ndan) - PipeOverlay'de okunabilir etiket (anlik deger + birim)
  const { settings: dev } = useDeviceSettings()
  const thrInfo: Record<string, { value: number; label: string } | undefined> = {
    flow: byKey.flow ? { value: dev.standbyThreshold, label: `${fmtInt(dev.standbyThreshold)} ${t(byKey.flow.unitShort)}` } : undefined,
    pressure: byKey.pressure ? { value: dev.standbyPressure, label: `${fmt2(dev.standbyPressure)} ${t(byKey.pressure.unitShort)}` } : undefined,
  }

  // Kibar, kurumsal ama sicak karsilama - kisiye ismiyle ([Soyad] Bey)
  const hour = new Date().getHours()
  const greet = hour < 11 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar'
  const subtitle = greetName
    ? `${t(greet)}, ${`${greetName} ${t('Bey')}`.trim()} — ${t('tüm sensörler canlı akıyor')}`
    : `${t(greet)} — ${t('tüm sensörler tek ekranda, gerçek zamanlı akıyor')}`

  // Sağ kolon kompakt kartları (Tasarruf'un altında, hiyerarşik) — yalnız görünür sensörler
  const cardDefs = [byKey.flow, byKey.pressure, byKey.temperature, byKey.humidity].filter(
    (m) => m && visible[m.key],
  ) as MetricDef[]

  return (
    <div className="flex flex-col gap-2 lg:h-full lg:gap-1">
      <PageHeader
        title="Canlı Panel"
        subtitle={subtitle}
        dense
        right={<DeviceCommands reading={reading} onCommand={sendCommand} />}
      />

        {/* BİRLEŞİK SAHNE — TEK SÜTUN (Mehmet abi 2026-06-20): ÜRÜN tam genişlik (anlık veri kartları cihazın BOŞ ALT KÖŞELERİNDE) +
          GRAFİK tam genişlik altta. Responsive güvenlik: düzen DEĞİŞMEDEN kartlar dar pencerede otomatik küçülür/konumlanır. */}
      <section className="relative rounded-3xl lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        <div className="flex flex-col gap-3 p-1 lg:absolute lg:inset-0 lg:gap-3 lg:p-2">
          {/* ÜRÜN — tam genişlik; anlık veri KARTLARI cihazın boş alt köşelerinde.
              @container (Mehmet abi 2026-06-20): kartlar/içerik artık PENCERE (vw) yerine BU SAHNENIN genişliğine (cqw) göre ölçeklenir →
              sol menü olsun olmasin, pencere kuculunce sahne kuculur, her sey GERCEKTEN orantili kuculur (cihaza binme/tasma biter). */}
          <div className="glass @container relative h-[46vh] min-h-[260px] overflow-hidden rounded-3xl lg:h-auto lg:min-h-0 lg:flex-[2.7]">
            {heavyReady && (
              <div className="ams-fade-in absolute inset-0">
                {/* ARKA PLAN SADELEŞTİ (2026-06-19): AmbientScene kaldırıldı; space-derinlik ızgarası DeviceFlowChart içinde. */}
                <DeviceFlowChart reading={reading} metrics={metrics} mode={mode} theme={theme} />
              </div>
            )}
            {/* Cihaz üstü: mod rozeti + giriş/çıkış KALIR; sol-alt veri readout'ları KAPALI (kartlar devraldı → tekrar yok) */}
            <PipeOverlay reading={reading} metrics={visibleMetrics} mode={mode} thresholds={thrInfo} theme={theme} showReadouts={false} />

            {/* SOL-ÜST köşe: Tasarruf % — düzen sabit, genişlik/yükseklik dar pencerede otomatik küçülür. */}
            <div className="absolute left-2 top-2 z-10 h-[clamp(34px,6.2vh,82px)] w-[clamp(100px,26cqw,340px)] md:left-3 md:top-3 md:h-[clamp(38px,7vh,82px)] md:w-[clamp(112px,24cqw,340px)]">
              <HeroKPI percent={percent} mode={mode} />
            </div>

            {/* SOL-ALT köşe: Hava Tüketimi + Basınç. Alt kenara sabitlenir; pencere kısalsa da dışarı taşmaz. */}
            <div className="absolute bottom-12 left-2 z-10 flex items-start gap-[clamp(4px,0.8cqw,12px)] md:bottom-13 md:left-3">
              {byKey.flow && visible.flow && (
                <div className="h-[clamp(86px,14.8vh,170px)] w-[clamp(58px,15.5cqw,200px)] min-w-0"><MetricCard def={byKey.flow} history={history} size="sm" total={totalL} onClick={() => setDetailKey('flow')} /></div>
              )}
              {byKey.pressure && visible.pressure && (
                <div className="h-[clamp(58px,13.2vh,156px)] w-[clamp(58px,15.5cqw,200px)] min-w-0"><MetricCard def={byKey.pressure} history={history} size="sm" onClick={() => setDetailKey('pressure')} /></div>
              )}
            </div>

            {/* SAĞ-ALT köşe: Sıcaklık + Nem — alt kenara sabitlenir; pencere kısalsa da dışarı taşmaz. */}
            <div className="absolute bottom-12 right-2 z-10 flex items-start gap-[clamp(4px,0.8cqw,12px)] md:bottom-13 md:right-3">
              {cardDefs.filter((m) => m.key === 'temperature' || m.key === 'humidity').map((m) => (
                <div key={m.key} className="h-[clamp(58px,13.2vh,156px)] w-[clamp(58px,15.5cqw,200px)] min-w-0"><MetricCard def={m} history={history} size="sm" onClick={() => setDetailKey(m.key)} /></div>
              ))}
            </div>
          </div>

          {/* GRAFİK — tam genişlik (sağ kolon kalktı → boydan boya) */}
          <div className="glass relative h-[30vh] min-h-[190px] overflow-hidden rounded-3xl lg:h-auto lg:min-h-0 lg:flex-[2.2]">
            {heavyReady && (
              <div className="ams-fade-in absolute inset-0">
                <ErrorBoundary variant="inline" label={t('Grafik')}>
                  <LiveChart2D history={shownTrend} reading={reading} metrics={visibleMetrics} groups={CHART_TABS[chartTab].groups} />
                </ErrorBoundary>
              </div>
            )}
            <ChartOverlay reading={reading} history={shownTrend} startedAt={startedAt} windowMs={windowMs} onWindowChange={setWindowMs} tabs={CHART_TABS.map((c) => c.label)} activeTab={chartTab} onTabChange={setChartTab} showPressureToggle={chartTab === 0} theme={theme} />
          </div>
        </div>
      </section>

      {/* DETAY penceresi — kart tıklanınca büyük eksenli grafik. series = shownTrend → zaman aralığı CANLI paneldeki pencere seçimine BAĞLI (Mehmet Abi). */}
      <AnimatePresence>
        {detailKey && byKey[detailKey] && (
          <MetricDetailModal
            def={byKey[detailKey]}
            series={shownTrend}
            reading={reading}
            startedAt={startedAt}
            total={detailKey === 'flow' ? totalL : undefined}
            onClose={() => setDetailKey(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
