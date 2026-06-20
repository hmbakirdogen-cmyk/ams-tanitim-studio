/*
 * NE      : "Sakin Mod" — tek anahtarla animasyon/efekt yükünü kısar. VERİ/SAYILAR CANLI kalır; yalnız görsel hareket sakinleşir.
 * NEDEN   : Mehmet abi: "pencereyi açınca pervane deli gibi dönüyor" → isteyen buz-gibi makineye geçsin (wow = varsayılan, sakin = opsiyon;
 *           zayıf PC / fuar / sessizlik). Canlı animasyonlu pano GPU yer; bu anahtar onu kökten kısar.
 * NASIL   : Modül-store — canvas rAF döngüleri getEco()'yu HER KAREDE okur (framerate'i ~40→~12fps düşürür); React tarafı useEco() ile
 *           dinler; <html data-eco='1'> attribute'u sürekli CSS animasyonlarını (aurora/logo-glow/halka) kapatır. Durum localStorage'da.
 * YAN ETKI: Saf görsel; veri akışı/totalizer/sayılar ETKİLENMEZ (canlılık korunur). Varsayılan KAPALI (tam wow).
 */
import { useSyncExternalStore } from 'react'

const KEY = 'ams_eco_v1'
let eco = typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1'
const listeners = new Set<() => void>()

function applyDom(): void { if (typeof document !== 'undefined') document.documentElement.dataset.eco = eco ? '1' : '0' }
applyDom()

// Canvas (rAF) döngüleri bunu HER KAREDE okur — React dışı, ucuz boolean.
export function getEco(): boolean { return eco }

export function setEco(v: boolean): void {
  if (v === eco) return
  eco = v
  try { localStorage.setItem(KEY, v ? '1' : '0') } catch { /* yok */ }
  applyDom()
  listeners.forEach((l) => l())
}
export function toggleEco(): void { setEco(!eco) }

// React bileşenleri (Sidebar anahtarı vb.) reaktif okur.
export function useEco(): boolean {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => eco,
    () => false,
  )
}
