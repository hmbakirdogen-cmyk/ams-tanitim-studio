/*
 * NE      : Veri kaynagina abone olan React hook'u - o anki okuma, son okumalarin penceresi, daha uzun gunluk ve t=0 duvar saati.
 * NEDEN   : Gorsel katman tek temiz arayuzden beslensin; DEMO ile CANLI (OPC UA kopru) kaynak farki UI'yi ilgilendirmesin.
 * NASIL   : Baglanti moduna gore DemoDataSource ya da LiveDataSource baslatir; mod/endpoint degisince kaynagi yeniden secer
 *           (gecmis temizlenir, taze akar). startedAt -> raporda gercek tarih/saat. Pencere MAX_POINTS ile sinirli.
 * YAN ETKI: Tek kaynak ornegi (ref); unmount'ta durdurur. Canli cihaz yoksa uygulama kirilmaz (durum: Baglanti yok).
 */
import { useEffect, useRef, useState } from 'react'
import type { CommandKey, DataSource, Mode, Reading } from '@/data/types'
import { DemoDataSource } from '@/data/demoSource'
import { LiveDataSource } from '@/data/liveSource'
import { useConnection, setConnStatus } from '@/data/connection'
import { appendReading } from '@/data/history'
import { applyDeviceSettingsFromDevice, getDeviceSettings, subscribeDeviceSettings, wasLastChangeFromDevice } from '@/data/deviceSettings'

const MAX_POINTS = 620 // grafikte tutulan son okuma sayisi (akan grafik; L=600 → ~48 sn pencere icin yeterli tampon)
const LOG_MAX = 4500 // analiz/kayit icin daha uzun gunluk (~6 dk @80ms tik)
// CANLI GRAFIK 15 DK PENCERESI (Efekan Bey/saha: "son 15 dk'lik veriyi goster"). 80ms ham tik 15 dk'da ~11k nokta = boru
//   geometrisi icin ASIRI agir → SEYRELT: ~1 ornek/sn (TREND) → 15 dk ≈ 900 nokta. Boru bunu L=600 vertekse YENIDEN ORNEKLER
//   (geometri ucuz/akici kalir; data 15 dk'yi gosterir). Demo/canli ayni; pencere zamanla 15 dk'ya dolar.
const TREND_MS = 15 * 60 * 1000
const TREND_SAMPLE_MS = 500 // ~2 ornek/sn → 15 dk ≈ 1800 nokta; kucuk pencerelerde (30sn/1dk) daha puruzsuz (kullanici araligi sifira dogru kucultebilir)

export interface LiveState {
  reading: Reading | null
  history: Reading[]
  log: Reading[]
  trend: Reading[] // 15 dk seyreltilmis (≈1/sn) — canli 3D grafik (borular) gercek-zaman 15 dk penceresi
  startedAt: number // t=0 aninin duvar saati (epoch ms) -> raporda gercek tarih/saat icin
  setMode: (m: Mode) => void
  sendCommand: (key: CommandKey, on: boolean) => void // ana ekran kutucukları → cihaza komut (Mehmet abi)
}

export function useLiveReadings(): LiveState {
  const { settings } = useConnection()
  const [reading, setReading] = useState<Reading | null>(null)
  const [history, setHistory] = useState<Reading[]>([])
  const [log, setLog] = useState<Reading[]>([])
  const [trend, setTrend] = useState<Reading[]>([])

  const srcRef = useRef<DataSource | null>(null)
  const startedAtRef = useRef<number>(Date.now())
  const pinnedRef = useRef(false)
  const trendRef = useRef<Reading[]>([]) // 15 dk seyreltilmis tampon (mutasyon + ~1/sn setTrend snapshot)
  const lastTrendRef = useRef<number>(-Infinity)

  useEffect(() => {
    // Mod/endpoint degisince taze basla
    pinnedRef.current = false
    setReading(null)
    setHistory([])
    setLog([])
    setTrend([])
    trendRef.current = []
    lastTrendRef.current = -Infinity

    // HIBRIT senkron: canli kaynak, cihazin gonderdigi mevcut ayarlari Urun Ayarlari'na uygular (cihazdan oku → devam et)
    const src: DataSource = settings.mode === 'live'
      ? new LiveDataSource(settings.endpoint, settings.nodeIds, (s) => applyDeviceSettingsFromDevice(s))
      : new DemoDataSource()
    srcRef.current = src
    if (settings.mode === 'demo') setConnStatus('demo') // demo seciliyken durum daima 'demo' (geç live callback ezse bile normalize)

    // HIBRIT: canli modda kullanici Urun Ayarlari'nda degistirince cihaza yaz (cihazdan gelen degisikligi GERI yazma → dongu yok)
    let unsubSettings = () => {}
    if (settings.mode === 'live') {
      unsubSettings = subscribeDeviceSettings(() => {
        if (wasLastChangeFromDevice()) return
        src.setSettings?.(getDeviceSettings())
      })
    }
    src.start((r) => {
      if (!pinnedRef.current) {
        startedAtRef.current = Date.now() - r.t // t=0 duvar saatini ilk okumadan tam kur
        pinnedRef.current = true
      }
      // KALICI GECMIS: her okumayi (demo/canli kovasina) yaz -> zamanla takvimsel rapor verisi birikir.
      // history kendi icinde dakikaya seyreltir (en cok dakikada 1 localStorage yazimi) -> 80ms tikte perf sorunu yok.
      appendReading(settings.mode, r, startedAtRef.current + r.t)
      setReading(r)
      setHistory((h) => {
        const next = h.length >= MAX_POINTS ? h.slice(h.length - MAX_POINTS + 1) : h.slice()
        next.push(r)
        return next
      })
      setLog((l) => {
        const next = l.length >= LOG_MAX ? l.slice(l.length - LOG_MAX + 1) : l.slice()
        next.push(r)
        return next
      })
      // 15 DK TREND: ~1/sn seyrelt + 15 dk'dan eskiyi buda → 3D grafik (borular) gercek-zaman 15 dk penceresi
      if (r.t - lastTrendRef.current >= TREND_SAMPLE_MS - 50) {
        lastTrendRef.current = r.t
        const tb = trendRef.current
        tb.push(r)
        const cut = r.t - TREND_MS
        while (tb.length > 2 && tb[0].t < cut) tb.shift()
        setTrend(tb.slice())
      }
    })
    return () => { unsubSettings(); src.stop() }
    // nodeIds degisince (kilavuzdan) canli kaynak yeniden kurulur -> yeni dugumlerle okur
  }, [settings.mode, settings.endpoint, settings.nodeIds])

  const setMode = (m: Mode) => srcRef.current?.setMode?.(m)
  const sendCommand = (key: CommandKey, on: boolean) => srcRef.current?.sendCommand?.(key, on)
  return { reading, history, log, trend, startedAt: startedAtRef.current, setMode, sendCommand }
}
