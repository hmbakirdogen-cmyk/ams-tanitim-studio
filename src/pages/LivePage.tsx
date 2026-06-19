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
import { MetricDetailModal } from '@/components/MetricDetailModal'
import { PipeOverlay } from '@/components/PipeOverlay'
import { HeroKPI } from '@/components/HeroKPI'
import { MetricCard } from '@/components/MetricCard'
import { ModeStrip } from '@/components/ModeStrip'
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
  const { reading, history, setMode, startedAt, trend } = data
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
                  {/* ARKA PLAN SADELEŞTİ (Mehmet abi 2026-06-19): 60fps AmbientScene KALDIRILDI (sistemi yoruyordu). Hafif "space derinliği"
                      ızgarası artık DeviceFlowChart İÇİNDE — koyu scrim'in ÜSTÜNE, cihazın ALTINA çiziliyor (yoksa scrim bastırıyordu). Burada ek katman yok. */}
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
                  {/* ARKA PLAN SADELEŞTİ (Mehmet abi 2026-06-19): grafiğin arkasındaki AmbientScene (zaten "çoğu görünmez"di) KALDIRILDI →
                      sistemi boşa yormayan sade arka plan; glass yüzey grafiğe net/odaklı zemin verir, veri öne çıkar. */}
                  <ErrorBoundary variant="inline" label={t('Grafik')}>
                    <LiveChart2D history={shownTrend} reading={reading} metrics={visibleMetrics} theme={theme} groups={CHART_TABS[chartTab].groups} />
                  </ErrorBoundary>
                </div>
              )}
              <ChartOverlay reading={reading} history={shownTrend} metrics={visibleMetrics} startedAt={startedAt} windowMs={windowMs} onWindowChange={setWindowMs} tabs={CHART_TABS.map((c) => c.label)} activeTab={chartTab} onTabChange={setChartTab} showPressureToggle={chartTab === 0} theme={theme} />
            </div>
          </div>

          {/* SAĞ KOLON: Tasarruf + BÜYÜK Hava Tüketimi kartı + 3 kompakt kart. lg: sabit dikey kolon (biraz genişletildi → büyük kart sığar). */}
          <div className="flex flex-col gap-3 lg:min-h-0 lg:w-[clamp(200px,17vw,242px)] lg:shrink-0">
            <div className="shrink-0">
              <HeroKPI percent={percent} mode={mode} />
            </div>
            {/* ÖNEM HİYERARŞİSİ (Mehmet abi 2026-06-19): Tasarruf(üst) > HAVA TÜKETİMİ (hero, ana ölçüm + toplam) > Basınç (kontrol) > Sıcaklık/Nem (ortam).
                HAVA TÜKETİMİ — en büyük metrik kartı (sm + TOPLAM satırı). */}
            {byKey.flow && visible.flow && (
              <div className="lg:min-h-0 lg:flex-[1.18]">
                <MetricCard def={byKey.flow} history={history} size="sm" total={totalL} onClick={() => setDetailKey('flow')} />
              </div>
            )}
            {/* BASINÇ — ikinci önemli (kontrol değişkeni): kendi hücresinde sm (Sıcaklık/Nem'den büyük), Hava Tüketimi'nin biraz altında. */}
            {byKey.pressure && visible.pressure && (
              <div className="lg:min-h-0 lg:flex-[1.0]">
                <MetricCard def={byKey.pressure} history={history} size="sm" onClick={() => setDetailKey('pressure')} />
              </div>
            )}
            {/* Sıcaklık + Nem — ortam: Mehmet abi 2026-06-19 BİRAZ BÜYÜTÜLDÜ (Tasarruf kartından açılan yerle); xs'te değer + grafik YAN YANA →
                veri ASLA görünmez olmaz. Mobil 2 sütun, lg dikey. */}
            <div className="grid grid-cols-2 gap-3 lg:min-h-0 lg:flex-[1.3] lg:grid-cols-1 lg:auto-rows-fr">
              {cardDefs.filter((m) => m.key !== 'flow' && m.key !== 'pressure').map((m) => (
                <MetricCard key={m.key} def={m} history={history} size="xs" onClick={() => setDetailKey(m.key)} />
              ))}
            </div>
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
