/*
 * NE      : Toplam tuketim (totalizer) PAYLASILAN deposu — cihaz LCD'sinin sag-altindaki "toplam debi" (accumL) ile AYNI deger.
 * NEDEN   : Mehmet abi: "toplam debiyi net/buyuk gosterelim" -> Canli Panel sag kolonda "Toplam Tuketim" karti. Kart ile cihaz
 *           ekrani TEK kaynaktan beslensin (tutarli; "ayni veri farkli sayi" olmasin). DeviceFlowChart YAZAR, kart OKUR.
 * NASIL   : Modul-seviyesi tek deger + dinleyiciler; useSyncExternalStore ile kart reaktif (model/economy/i18n ile ayni desen).
 *           DeviceFlowChart canvas dongusunde ~1sn'de bir publishler (60fps'te HER kare degil -> karti/render'i bogmaz).
 *           Canli cihaz totalFlow gonderirse o deger, yoksa yerel birikim yayinlanir (kaynak DeviceFlowChart'ta secilir).
 * YAN ETKI: Saf istemci, offline. Yalniz GOSTERIM icin; kalicilik DeviceFlowChart'taki localStorage (ACCUM_KEY) tarafindadir.
 */
import { useSyncExternalStore } from 'react'

let totalL = 0
const listeners = new Set<() => void>()

// DeviceFlowChart cagirir: gecerli + degismisse yayinla (gereksiz re-render yok). Non-finite -> yok say (kart bos/NaN gormez).
export function publishTotalizer(v: number): void {
  if (!Number.isFinite(v) || v === totalL) return
  totalL = v
  listeners.forEach((l) => l())
}

export function getTotalizer(): number {
  return totalL
}

// Kart bu hook ile reaktif okur — yalniz deger degisince (en fazla ~1sn'de bir) yeniden render olur.
export function useTotalizer(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => totalL,
    () => totalL,
  )
}
