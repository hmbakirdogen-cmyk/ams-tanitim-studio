/*
 * NE      : Veri kaynagina abone olan React hook'u - o anki okuma, son okumalarin penceresi, daha uzun gunluk ve t=0 duvar saati.
 * NEDEN   : Gorsel katman tek bir temiz arayuzden beslensin; demo/canli kaynak farki UI'yi ilgilendirmesin.
 * NASIL   : Mount'ta DemoDataSource baslatir; her okumada state'i gunceller, pencereyi sinirlar. startedAt -> raporda gercek tarih/saat.
 * YAN ETKI: Tek kaynak ornegi (ref) tutar; unmount'ta durdurur. Pencere MAX_POINTS ile sinirli -> bellek/performans stabil.
 *           Tasarruf hesabi sayfalarda (Tasarruf/Gecmis/Rapor) DUZENLENEBILIR economy'den yapilir (useEconomy) -> burada birikim tutulmaz.
 */
import { useEffect, useRef, useState } from 'react'
import type { DataSource, Mode, Reading } from '@/data/types'
import { DemoDataSource } from '@/data/demoSource'

const MAX_POINTS = 160 // grafikte tutulan son okuma sayisi (akan grafik)
const LOG_MAX = 4500 // analiz/kayit icin daha uzun gunluk (~6 dk @80ms tick)

export interface LiveState {
  reading: Reading | null
  history: Reading[]
  log: Reading[]
  startedAt: number // t=0 aninin duvar saati (epoch ms) -> raporda gercek tarih/saat icin
  setMode: (m: Mode) => void
}

export function useLiveReadings(): LiveState {
  const [reading, setReading] = useState<Reading | null>(null)
  const [history, setHistory] = useState<Reading[]>([])
  const [log, setLog] = useState<Reading[]>([])

  const srcRef = useRef<DataSource | null>(null)
  const startedAtRef = useRef<number>(Date.now())
  const pinnedRef = useRef(false)

  useEffect(() => {
    const src = new DemoDataSource()
    srcRef.current = src
    src.start((r) => {
      // t=0 duvar saatini ILK okumadan tam kur: startedAt + r.t == o tick'in gercek zamani (kaynak t0 ile birebir)
      if (!pinnedRef.current) {
        startedAtRef.current = Date.now() - r.t
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
  }, [])

  const setMode = (m: Mode) => srcRef.current?.setMode?.(m)
  return { reading, history, log, startedAt: startedAtRef.current, setMode }
}
