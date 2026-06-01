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
import { useMemo } from 'react'
import type { LiveState } from '@/hooks/useLiveReadings'

export function LivePage({ data, greetName, theme = 'dark' }: { data: LiveState; greetName?: string; theme?: 'dark' | 'light' }) {
  const { reading, history, setMode } = data
  const { t } = useLang()
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
    : t('Tüm sensörler tek ekranda, gerçek zamanlı akıyor')

  // Sağ kolon kompakt kartları (Tasarruf'un altında, hiyerarşik) — yalnız görünür sensörler
  const cardDefs = [byKey.flow, byKey.pressure, byKey.temperature, byKey.humidity].filter(
    (m) => m && visible[m.key],
  ) as MetricDef[]

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title="Canlı Panel"
        subtitle={subtitle}
        right={<ModeStrip active={mode} onSelect={setMode} />}
      />

      {/* BİRLEŞİK SAHNE — SOL (grafikler) + SAĞ (veriler). 3D "teknolojik hava akış" sahnesi artık SADECE cihazın hemen arkasında (Mehmet Abi) */}
      <section className="relative min-h-0 flex-1 overflow-hidden rounded-3xl">
        {/* Flex düzen (Mehmet Abi: sağ bloğu daha çok daralt) → sağ kolon sabit DAR genişlik; sol kalan tüm alanı kaplar */}
        <div className="absolute inset-0 flex flex-col gap-4 p-4 lg:flex-row">
          {/* SOL ANA BLOK: Akış (üst) + Klasik (alt) */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
            {/* AKIŞ — cihaz büyük; 3D AmbientScene CİHAZIN HEMEN ARKASINDA (panel içinde, ilk katman) → DeviceFlowChart şeffaf üstüne biner */}
            <div className="glass relative min-h-0 flex-[3] overflow-hidden rounded-3xl">
              {/* space: ürün penceresine HAFİF 3D uzay yıldız alanı (Mehmet Abi); alt grafik panelinde yok (sade kalsın). */}
              <AmbientScene theme={theme} flow={flowNorm} space />
              {/* Cihaz görseli TÜM sensörlerin tek-doğruluk gösterimi → TAM metrics (gizleme yalnız kart/overlay'de; LCD satırları kaymaz) */}
              <DeviceFlowChart reading={reading} metrics={metrics} mode={mode} theme={theme} />
              <PipeOverlay reading={reading} metrics={visibleMetrics} mode={mode} thresholds={thrInfo} theme={theme} />
            </div>
            {/* KLASİK — akışın ALTINDA, tam orantılı; SABİT ~48 sn'lik canlı range. Mehmet Abi "iki panel tertemiz + bütün":
                AmbientScene ALT panelde de (ilk katman) → iki panel AYNI sakin derinlik zeminini paylaşır; Hero3DChart WebGL şeffaf üstüne biner. */}
            <div className="glass relative min-h-0 flex-[2] overflow-hidden rounded-3xl">
              <AmbientScene theme={theme} flow={flowNorm} />
              {/* WebGL grafiği EN OYNAK katman (bağlam kaybı/GPU reset olabilir) → kendi kalkanında izole;
                  çökerse sayfanın geri kalanı (cihaz, kartlar, kazanç) akmaya devam eder, yalnız bu panel "Yeniden yükle" der. */}
              <ErrorBoundary variant="inline" label={t('Grafik')}>
                <Hero3DChart history={history} metrics={visibleMetrics} theme={theme} />
              </ErrorBoundary>
              <ChartOverlay reading={reading} history={history} metrics={visibleMetrics} />
            </div>
          </div>

          {/* SAĞ DAR KOLON: hiyerarşik anlık veriler — Tasarruf üstte + kompakt metrik kartları (sabit dar genişlik) */}
          <div className="flex min-h-0 shrink-0 flex-col gap-3 lg:w-[clamp(190px,16vw,230px)]">
            <div className="shrink-0">
              <HeroKPI percent={percent} mode={mode} />
            </div>
            <div className="grid min-h-0 flex-1 grid-rows-4 gap-3">
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
