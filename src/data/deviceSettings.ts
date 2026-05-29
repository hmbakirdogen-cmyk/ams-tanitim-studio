/*
 * NE      : Cihaz (urun) ayarlari deposu + hook - bekleme basinci / otomatik kesinti suresi / bekleme esigi / valf modu.
 * NEDEN   : Mehmet Bey: "programdan urune ayar yapilabilsin; hangi senaryoda hava kesiliyor?" -> kullanici buradan belirler.
 * NASIL   : localStorage'da saklanir; demoSource bu degerleri okuyup senaryoyu surer (bekleme basinci/oto-kesinti suresi gercekce yansir).
 * YAN ETKI: Offline. Canli modda (ileride) ayni degerler OPC UA ile cihaza yazilacak. getDeviceSettings() demoSource'tan okunur.
 */
import { useCallback, useEffect, useState } from 'react'

export type ValveMode = 'NC' | 'NO'

export interface DeviceSettings {
  standbyPressure: number // bekleme basinci (MPa)
  autoIsolationSec: number // beklemeden sonra otomatik kesintiye kadar sure (saniye)
  standbyThreshold: number // bekleme esigi (litre/dakika) - debi bu altina dusunce bekleme
  valveMode: ValveMode // normalde kapali (NC) / normalde acik (NO)
}

export const DEFAULT_DEVICE: DeviceSettings = {
  standbyPressure: 0.2,
  autoIsolationSec: 6,
  standbyThreshold: 300,
  valveMode: 'NC',
}

const KEY = 'ams_device_v1'

function load(): DeviceSettings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_DEVICE, ...(JSON.parse(raw) as Partial<DeviceSettings>) } : { ...DEFAULT_DEVICE }
  } catch {
    return { ...DEFAULT_DEVICE }
  }
}

// demoSource gibi React disi yerlerden okunabilen guncel deger
let cache: DeviceSettings = load()
export function getDeviceSettings(): DeviceSettings {
  return cache
}

export function useDeviceSettings() {
  const [settings, setSettings] = useState<DeviceSettings>(() => cache)

  useEffect(() => {
    cache = settings
    localStorage.setItem(KEY, JSON.stringify(settings))
  }, [settings])

  const update = useCallback((patch: Partial<DeviceSettings>) => setSettings((s) => ({ ...s, ...patch })), [])
  const reset = useCallback(() => setSettings({ ...DEFAULT_DEVICE }), [])

  return { settings, update, reset }
}
