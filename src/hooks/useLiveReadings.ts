/*
 * NE      : Veri kaynagina abone olan React hook'u - o anki okuma, son okumalarin penceresi ve birikmis tasarrufu verir.
 * NEDEN   : Gorsel katman tek bir temiz arayuzden beslensin; demo/canli kaynak farki UI'yi ilgilendirmesin.
 * NASIL   : Mount'ta DemoDataSource baslatir; her okumada state'i gunceller, tasarrufu (dt ile) biriktirir, pencereyi sinirlar.
 * YAN ETKI: Tek kaynak ornegi (ref) tutar; unmount'ta durdurur. Pencere MAX_POINTS ile sinirli -> bellek/performans stabil.
 */
import { useEffect, useRef, useState } from 'react'
import type { DataSource, Mode, Reading } from '@/data/types'
import { DemoDataSource } from '@/data/demoSource'
import { litersToSavings, tickLitersSaved, type Savings } from '@/lib/savings'

const MAX_POINTS = 160 // grafikte tutulan son okuma sayisi (akan grafik)
const LOG_MAX = 1800 // analiz/kayit icin daha uzun gunluk (~3.5 dk @120ms)

export interface LiveState {
  reading: Reading | null
  history: Reading[]
  log: Reading[]
  savings: Savings
  setMode: (m: Mode) => void
}

export function useLiveReadings(): LiveState {
  const [reading, setReading] = useState<Reading | null>(null)
  const [history, setHistory] = useState<Reading[]>([])
  const [log, setLog] = useState<Reading[]>([])
  const [savings, setSavings] = useState<Savings>(() => litersToSavings(0))

  const srcRef = useRef<DataSource | null>(null)
  const litersRef = useRef(0)
  const lastTRef = useRef<number | null>(null)

  useEffect(() => {
    const src = new DemoDataSource()
    srcRef.current = src
    src.start((r) => {
      // Tasarruf birikimi: gecen sure (dt) ile baseline altindaki debi farkini topla
      if (lastTRef.current !== null) {
        const dt = (r.t - lastTRef.current) / 1000
        if (dt > 0 && dt < 5) litersRef.current += tickLitersSaved(r.flow, dt)
      }
      lastTRef.current = r.t

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
      setSavings(litersToSavings(litersRef.current))
    })
    return () => src.stop()
  }, [])

  const setMode = (m: Mode) => srcRef.current?.setMode?.(m)
  return { reading, history, log, savings, setMode }
}
