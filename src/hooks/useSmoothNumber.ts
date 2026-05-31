/*
 * NE      : Bir sayiyi hedefe yumusakca (akarak) yaklastiran hook - sayilar zıplamadan, "duraksamasiz" akar.
 * NEDEN   : Mehmet Bey: "hic duraksama olmadan emin gecisler". Canli veri her tick degisince rakamlar buttery aksin.
 * NASIL   : requestAnimationFrame dongusu hedefe lerp; OTURUNCA (esik alti) durur — bos rAF yanmaz. Yeni hedef gelince yeniden baslar.
 * YAN ETKI: Saf gorsel; unmount'ta rAF iptal. Hedefte sabitken HIC rAF planlanmaz (CPU/guc tasarrufu); yeni veride kisa akis.
 */
import { useEffect, useRef, useState } from 'react'

export function useSmoothNumber(target: number, speed = 0.14): number {
  const [val, setVal] = useState<number>(target)
  const valRef = useRef<number>(target)
  const targetRef = useRef<number>(target)
  const rafRef = useRef<number>(0)
  const activeRef = useRef<boolean>(false) // döngü çalışıyor mu (oturunca false → planlama durur)
  const speedRef = useRef<number>(speed)
  speedRef.current = speed

  // Döngü adımı — her render'da güncel setVal/ref'leri yakalar; rAF kendini bu referansla yeniden zamanlar.
  const tickRef = useRef<() => void>(null!)
  tickRef.current = () => {
    const diff = targetRef.current - valRef.current
    if (Math.abs(diff) < 0.01) {
      valRef.current = targetRef.current
      setVal(valRef.current)
      activeRef.current = false // OTURDU → bir sonraki kareyi PLANLAMA (yeni hedefte aşağıdaki effect yeniden başlatır)
      return
    }
    valRef.current += diff * speedRef.current
    setVal(valRef.current)
    rafRef.current = requestAnimationFrame(tickRef.current)
  }

  // Yeni hedef gelince: durmuşsa döngüyü yeniden başlat.
  useEffect(() => {
    targetRef.current = target
    if (!activeRef.current) {
      activeRef.current = true
      rafRef.current = requestAnimationFrame(tickRef.current)
    }
  }, [target])

  // Unmount: rAF iptal.
  useEffect(() => () => { cancelAnimationFrame(rafRef.current); activeRef.current = false }, [])

  return val
}
