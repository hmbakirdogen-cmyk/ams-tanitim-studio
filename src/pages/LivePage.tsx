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
import { Hero3DChart } from '@/components/Hero3DChart'
import { ChartOverlay } from '@/components/ChartOverlay'
import { DeviceFlowChart } from '@/components/DeviceFlowChart'
import { PipeOverlay } from '@/components/PipeOverlay'
import { HeroKPI } from '@/components/HeroKPI'
import { MetricCard } from '@/components/MetricCard'
import { ModeStrip } from '@/components/ModeStrip'
import { PageHeader } from '@/components/PageHeader'
import { AmbientScene } from '@/components/AmbientScene'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useMetrics, type MetricDef, type MetricKey } from '@/data/metrics'
import { savingPercent } from '@/lib/savings'
import { useSensorVisibility } from '@/data/sensorVisibility'
import { useDeviceSettings } from '@/data/deviceSettings'
import { useEconomy } from '@/data/economy'
import { fmtInt, fmt2 } from '@/lib/format'
import { useLang } from '@/i18n'
import { isMobileDevice } from '@/lib/device'
import { useMemo, useState, useEffect } from 'react'
import type { LiveState } from '@/hooks/useLiveReadings'

export function LivePage({ data, greetName, theme = 'dark' }: { data: LiveState; greetName?: string; theme?: 'dark' | 'light' }) {
  const { reading, history, setMode } = data
  const { t } = useLang()
  const mobile = isMobileDevice() // mobilde ağır arka plan katmanlarını azalt (ısınma/refresh önlenir)
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
  // visibleMetrics MEMO'lu → referans yalnız model/görünürlük değişince değişir (tik başına yeni referans + gereksiz sort/sampleY çöpü önlenir).
  const visibleMetrics = useMemo(() => metrics.filter((m) => visible[m.key]), [metrics, visible])
  const mode = reading?.mode ?? 'normal'
  // Tasarruf % = AKTİF MODEL baseline'ına göre (SavingsPage + demoSource ile birebir tutarlı; eski sabit 1800 yerine economy.baselineFlow).
  const { economy } = useEconomy()
  const percent = reading ? savingPercent(reading.flow, economy.baselineFlow) : 0
  // Ortak AmbientScene için akış hızı 0..1 (canlı veriyle hava zerreleri hızlanır) — debi metriğinin kendi ölçeğine normalize
  const flowNorm = reading && byKey.flow
    ? Math.max(0, Math.min(1, (byKey.flow.get(reading) - byKey.flow.min) / (byKey.flow.max - byKey.flow.min)))
    : 0.4

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
    ? `${t(greet)}, ${greetName} Bey — ${t('tüm sensörler canlı akıyor')}`
    : `${t(greet)} — ${t('tüm sensörler tek ekranda, gerçek zamanlı akıyor')}`

  // Sağ kolon kompakt kartları (Tasarruf'un altında, hiyerarşik) — yalnız görünür sensörler
  const cardDefs = [byKey.flow, byKey.pressure, byKey.temperature, byKey.humidity].filter(
    (m) => m && visible[m.key],
  ) as MetricDef[]

  return (
    <div className="flex flex-col gap-4 lg:h-full">
      <PageHeader
        title="Canlı Panel"
        subtitle={subtitle}
        right={<ModeStrip active={mode} onSelect={setMode} />}
      />

      {/* BİRLEŞİK SAHNE — SOL (grafikler) + SAĞ (veriler). MOBİL/tablet: dikey YIĞIN + SCROLL (sabit panel yükseklikleri → her şey okunur);
          lg+: tek-ekran flex-row (masaüstü ferah grid). 3D sahne SADECE cihazın hemen arkasında (Mehmet Abi). */}
      <section className="relative rounded-3xl lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        {/* lg: absolute fill + row; mobilde: statik dikey yığın (doğal yükseklik → main scroll eder) */}
        <div className="flex flex-col gap-4 p-1 lg:absolute lg:inset-0 lg:flex-row lg:p-4">
          {/* SOL ANA BLOK: Akış (üst) + Klasik (alt) */}
          <div className="flex flex-col gap-4 lg:min-h-0 lg:min-w-0 lg:flex-1">
            {/* AKIŞ — mobilde sabit yükseklik (okunur); lg'de flex-[3]. 3D AmbientScene cihaz arkasında → DeviceFlowChart şeffaf üstte. */}
            {/* NE: Mobil/taban yükseklik 46vh/300px → 42vh/240px küçültüldü. NEDEN: Mehmet Abi — küçük telefonda Akış+Klasik alt alta ekranı taşırıyordu, içerik sığmıyordu. NASIL: yalnız taban sınıflar düşürüldü; lg:* AYNEN korundu. YAN ETKİ: masaüstü (lg+) görünüm değişmez; sadece mobilde paneller kısalır. */}
            <div className="glass relative h-[42vh] min-h-[240px] overflow-hidden rounded-3xl lg:h-auto lg:min-h-0 lg:flex-[3]">
              {heavyReady && (
                <div className="ams-fade-in absolute inset-0">
                  <AmbientScene theme={theme} flow={flowNorm} space />
                  <DeviceFlowChart reading={reading} metrics={metrics} mode={mode} theme={theme} />
                </div>
              )}
              <PipeOverlay reading={reading} metrics={visibleMetrics} mode={mode} thresholds={thrInfo} theme={theme} />
            </div>
            {/* KLASİK — mobilde sabit yükseklik; lg'de flex-[2]. */}
            {/* NE: Mobil/taban yükseklik 34vh/230px → 30vh/190px küçültüldü. NEDEN: Mehmet Abi — Akış paneliyle birlikte küçük telefonda toplam yükseklik ekranı taşırıyordu. NASIL: yalnız taban sınıflar düşürüldü; lg:* AYNEN korundu. YAN ETKİ: masaüstü (lg+) görünüm değişmez; sadece mobilde panel kısalır. */}
            <div className="glass relative h-[30vh] min-h-[190px] overflow-hidden rounded-3xl lg:h-auto lg:min-h-0 lg:flex-[2]">
              {heavyReady && (
                <div className="ams-fade-in absolute inset-0">
                  {/* MOBİL: bu 2. AmbientScene (3D grafiğin ARKASINDA, çoğu görünmez) ÇİZİLMEZ → boşa dönen canvas yok. Masaüstünde kalır. */}
                  {!mobile && <AmbientScene theme={theme} flow={flowNorm} />}
                  <ErrorBoundary variant="inline" label={t('Grafik')}>
                    <Hero3DChart history={history} metrics={visibleMetrics} theme={theme} />
                  </ErrorBoundary>
                </div>
              )}
              <ChartOverlay reading={reading} history={history} metrics={visibleMetrics} />
            </div>
          </div>

          {/* SAĞ KOLON: Tasarruf + kompakt kartlar. Mobil: tam genişlik, 2 sütunlu kart ızgarası. lg: sabit DAR dikey kolon. */}
          <div className="flex flex-col gap-3 lg:min-h-0 lg:w-[clamp(190px,16vw,230px)] lg:shrink-0">
            <div className="shrink-0">
              <HeroKPI percent={percent} mode={mode} />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-1 lg:grid-rows-4">
              {cardDefs.map((m) => (
                <MetricCard key={m.key} def={m} history={history} size="xs" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
