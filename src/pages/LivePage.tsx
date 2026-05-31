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
import { useMetrics, type MetricDef, type MetricKey } from '@/data/metrics'
import { savingPercent } from '@/lib/savings'
import { useSensorVisibility } from '@/data/sensorVisibility'
import { useDeviceSettings } from '@/data/deviceSettings'
import { useConnection } from '@/data/connection'
import { queryHistory, historyExtent } from '@/data/history'
import { fmtInt, fmt2 } from '@/lib/format'
import { useLang } from '@/i18n'
import { useMemo, useState } from 'react'
import type { Reading } from '@/data/types'
import type { LiveState } from '@/hooks/useLiveReadings'

// Scrub(geçmişe çekme) penceresi: kalıcı geçmiş dakikalık → bir pencereyi Hero3DChart'ın gösterdiği L noktaya SEYRELT (tam pencere görünür).
const SCRUB_WINDOW_MS = 6 * 60 * 60 * 1000 // 6 saatlik pencere (dakikalık ~360 örnek → 125'e indirgenir, ~3 dk çözünürlük)
const SCRUB_L = 125                          // Hero3DChart pencere nokta sayısı (L ile aynı)
function downsample(arr: Reading[], n: number): Reading[] {
  if (arr.length <= n) return arr
  const out: Reading[] = []
  for (let i = 0; i < n; i++) out.push(arr[Math.round((i * (arr.length - 1)) / (n - 1))])
  return out
}
function fmtScrub(ms: number): string {
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ms))
}

export function LivePage({ data, greetName, theme = 'dark' }: { data: LiveState; greetName?: string; theme?: 'dark' | 'light' }) {
  const { reading, history, setMode } = data
  const { t } = useLang()
  const metrics = useMetrics() // aktif modele gore reaktif (debi/basinc olcegi modelle gelir)
  const byKey = Object.fromEntries(metrics.map((m) => [m.key, m])) as Record<MetricKey, MetricDef>
  const { visible } = useSensorVisibility()
  const visibleMetrics = metrics.filter((m) => visible[m.key])
  const mode = reading?.mode ?? 'normal'
  const percent = reading ? savingPercent(reading.flow) : 0
  // Ortak AmbientScene için akış hızı 0..1 (canlı veriyle hava zerreleri hızlanır) — debi metriğinin kendi ölçeğine normalize
  const flowNorm = reading && byKey.flow
    ? Math.max(0, Math.min(1, (byKey.flow.get(reading) - byKey.flow.min) / (byKey.flow.max - byKey.flow.min)))
    : 0.4

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

  // Sağ kolon kompakt kartları (Tasarruf'un altında, hiyerarşik) — yalnız görünür sensörler
  const cardDefs = [byKey.flow, byKey.pressure, byKey.temperature, byKey.humidity].filter(
    (m) => m && visible[m.key],
  ) as MetricDef[]

  // ZAMAN ÇUBUĞU (scrubber) — KLASİK grafiği geçmişe çek (Mehmet Abi). Kaynak = veri modu (demo/live); kalıcı geçmiş history.ts.
  //   scrubEnd null = CANLI (akan tampon); sayı = seçilen pencere SONU → o ana kadarki 6 saatlik dilim (seyreltilmiş) gösterilir.
  const { settings: conn } = useConnection()
  const src = conn.mode === 'live' ? 'live' : 'demo'
  const [scrubEnd, setScrubEnd] = useState<number | null>(null)
  const ext = historyExtent(src) // {first,last,count} — her tikte tazelenir (cache; ucuz)
  const scrubbedHistory = useMemo(() => {
    if (scrubEnd === null || !ext) return null
    const end = Math.min(scrubEnd, ext.last)
    return downsample(queryHistory(src, end - SCRUB_WINDOW_MS, end).points, SCRUB_L)
  }, [scrubEnd, src, ext?.last])
  const isLive = scrubbedHistory === null
  const chartHistory = scrubbedHistory ?? history
  // Geçmiş görünümünde ChartOverlay'in "anlık" değerleri = pencerenin SON noktası (t=0 → geçen-süre 00:00, canlı sanılmasın)
  const chartReading = scrubbedHistory && scrubbedHistory.length ? { ...scrubbedHistory[scrubbedHistory.length - 1], t: 0 } : reading

  return (
    <div className="flex h-full flex-col gap-4">
      <PageHeader
        title="Canlı Panel"
        subtitle={subtitle}
        right={<ModeStrip active={mode} onSelect={setMode} />}
      />

      {/* BİRLEŞİK SAHNE — TEK ortak "teknolojik hava akış sistemi" arkasında SOL (grafikler) + SAĞ (veriler) yüzer (Mehmet Abi) */}
      <section className="relative min-h-0 flex-1 overflow-hidden rounded-3xl">
        {/* ORTAK ARKA SAHNE — tüm panelin arkasında; cam paneller (şeffaf) arkadan bu akan sistemi yumuşak gösterir */}
        <AmbientScene theme={theme} flow={flowNorm} />

        {/* Flex düzen (Mehmet Abi: sağ bloğu daha çok daralt) → sağ kolon sabit DAR genişlik; sol kalan tüm alanı kaplar */}
        <div className="absolute inset-0 flex flex-col gap-4 p-4 lg:flex-row">
          {/* SOL ANA BLOK: Akış (üst) + Klasik (alt) */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
            {/* AKIŞ — cihaz büyük tutulur (küçültülmez); panel cam ŞEFFAF → arkadaki ortak sahne sızar */}
            <div className="glass relative min-h-0 flex-[3] overflow-hidden rounded-3xl">
              <DeviceFlowChart reading={reading} metrics={visibleMetrics} mode={mode} theme={theme} />
              <PipeOverlay reading={reading} metrics={visibleMetrics} mode={mode} thresholds={thrInfo} />
            </div>
            {/* KLASİK — akışın ALTINDA, tam orantılı; Hero3DChart şeffaf (alpha) → aynı ortak sahne arkada. ZAMAN ÇUBUĞU ile geçmişe çekilir. */}
            <div className="glass relative min-h-0 flex-[2] overflow-hidden rounded-3xl">
              <Hero3DChart history={chartHistory} metrics={visibleMetrics} theme={theme} />
              <ChartOverlay reading={chartReading} history={chartHistory} metrics={visibleMetrics} />
              {/* ZAMAN ÇUBUĞU (scrubber) — yeterli geçmiş varsa: tut-çek ile klasik grafiği geçmişe al; CANLI ile geri dön (Mehmet Abi) */}
              {ext && ext.count > 4 && (
                <div className="absolute inset-x-3 bottom-2 z-10 flex items-center gap-2.5 rounded-xl border border-white/10 bg-[#050b18]/85 px-3 py-1.5 backdrop-blur-md">
                  <button
                    onClick={() => setScrubEnd(null)}
                    title={t('Canlıya dön')}
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold transition ${isLive ? 'bg-[var(--smc)] text-white' : 'border border-white/20 text-[var(--ink-soft)] hover:text-white'}`}
                  >{isLive ? t('CANLI') : `⏵ ${t('CANLI')}`}</button>
                  <input
                    type="range" min={ext.first} max={ext.last} step={60000}
                    value={scrubEnd ?? ext.last}
                    onChange={(e) => { const v = +e.target.value; setScrubEnd(v >= ext.last - 60000 ? null : v) }}
                    className="h-1 flex-1 cursor-pointer accent-[#2E9BFF]"
                    aria-label={t('Zaman çubuğu')}
                  />
                  <span className="shrink-0 text-[11px] font-medium tabular-nums text-[var(--ink-soft)]">
                    {isLive ? t('Şu an') : fmtScrub(scrubEnd as number)}
                  </span>
                </div>
              )}
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
