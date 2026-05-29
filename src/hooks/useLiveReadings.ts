/*
 * NE      : Veri kaynagina abone olan React hook'u - o anki okuma, son okumalarin penceresi, daha uzun gunluk ve t=0 duvar saati.
 * NEDEN   : Gorsel katman tek temiz arayuzden beslensin; DEMO ile CANLI (OPC UA kopru) kaynak farki UI'yi ilgilendirmesin.
 * NASIL   : Baglanti moduna gore DemoDataSource ya da LiveDataSource baslatir; mod/endpoint degisince kaynagi yeniden secer
 *           (gecmis temizlenir, taze akar). startedAt -> raporda gercek tarih/saat. Pencere MAX_POINTS ile sinirli.
 * YAN ETKI: Tek kaynak ornegi (ref); unmount'ta durdurur. Canli cihaz yoksa uygulama kirilmaz (durum: Baglanti yok).
 */
import { useEffect, useRef, useState } from 'react'
import type { DataSource, Mode, Reading } from '@/data/types'
import { DemoDataSource } from '@/data/demoSource'
import { LiveDataSource } from '@/data/liveSource'
import { useConnection } from '@/data/connection'

const MAX_POINTS = 160 // grafikte tutulan son okuma sayisi (akan grafik)
const LOG_MAX = 4500 // analiz/kayit icin daha uzun gunluk (~6 dk @80ms tik)

export interface LiveState {
  reading: Reading | null
  history: Reading[]
  log: Reading[]
  startedAt: number // t=0 aninin duvar saati (epoch ms) -> raporda gercek tarih/saat icin
  setMode: (m: Mode) => void
}

export function useLiveReadings(): LiveState {
  const { settings } = useConnection()
  const [reading, setReading] = useState<Reading | null>(null)
  const [history, setHistory] = useState<Reading[]>([])
  const [log, setLog] = useState<Reading[]>([])

  const srcRef = useRef<DataSource | null>(null)
  const startedAtRef = useRef<number>(Date.now())
  const pinnedRef = useRef(false)

  useEffect(() => {
    // Mod/endpoint degisince taze basla
    pinnedRef.current = false
    setReading(null)
    setHistory([])
    setLog([])

    const src: DataSource = settings.mode === 'live' ? new LiveDataSource(settings.endpoint) : new DemoDataSource()
    srcRef.current = src
    src.start((r) => {
      if (!pinnedRef.current) {
        startedAtRef.current = Date.now() - r.t // t=0 duvar saatini ilk okumadan tam kur
        pinnedRef.current = true
      }
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
    })
    return () => src.stop()
  }, [settings.mode, settings.endpoint])

  const setMode = (m: Mode) => srcRef.current?.setMode?.(m)
  return { reading, history, log, startedAt: startedAtRef.current, setMode }
}
