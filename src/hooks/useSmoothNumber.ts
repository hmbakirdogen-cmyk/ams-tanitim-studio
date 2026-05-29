/*
 * NE      : Bir sayiyi hedefe yumusakca (akarak) yaklastiran hook - sayilar zıplamadan, "duraksamasiz" akar.
 * NEDEN   : Mehmet Bey: "hic duraksama olmadan emin gecisler". Canli veri her tick degisince rakamlar buttery aksin.
 * NASIL   : requestAnimationFrame dongusunde mevcut deger hedefe lerp; esige inince hedefe sabitlenir.
 * YAN ETKI: Saf gorsel; unmount'ta rAF iptal. Cok hizli degisen veride bile akici (60fps) gosterim.
 */
import { useEffect, useRef, useState } from 'react'

export function useSmoothNumber(target: number, speed = 0.14): number {
  const [val, setVal] = useState<number>(target)
  const valRef = useRef<number>(target)
  const targetRef = useRef<number>(target)

  useEffect(() => {
    targetRef.current = target
  }, [target])

  useEffect(() => {
    let raf = 0
    const loop = () => {
      const diff = targetRef.current - valRef.current
      if (Math.abs(diff) < 0.01) {
        valRef.current = targetRef.current
      } else {
        valRef.current += diff * speed
      }
      setVal(valRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [speed])

  return val
}
