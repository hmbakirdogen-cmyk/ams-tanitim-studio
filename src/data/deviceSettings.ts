/*
 * NE      : Cihaz (urun) ayarlari deposu + PAYLASILAN store + hook - bekleme basinci / otomatik kesinti suresi / bekleme esigi / valf modu.
 * NEDEN   : Mehmet Bey: "programdan urune ayar yapilabilsin". + HIBRIT senkron (Mehmet Abi karari): canli cihaza baglaninca cihazin
 *           MEVCUT ayarlari OKUNUP buraya yazilir (devam et); kullanici degistirince cihaza YAZILIR.
 * NASIL   : model/connection ile AYNI desen (useSyncExternalStore) -> tek dogruluk; localStorage kalici. demoSource bu degerleri okur.
 *           applyFromDevice(): cihazdan gelen degerleri uygular ve "echo write" olmasin diye fromDevice isaretler.
 * YAN ETKI: Offline. Canli modda degisiklik -> useLiveReadings cihaza yazar (setSettings). getDeviceSettings() React disindan okunur.
 */
import { useSyncExternalStore } from 'react'

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

// --- Paylasilan store (tek dogruluk + dinleyiciler) ---
let current: DeviceSettings = load()
const listeners = new Set<() => void>()
// HIBRIT: en son degisiklik cihazdan mi geldi? (true ise useLiveReadings cihaza GERI yazmaz -> dongu olmaz)
let lastFromDevice = false

export function getDeviceSettings(): DeviceSettings {
  return current
}
// En son uygulanan degisiklik cihaz kaynakli miydi (echo write engelleme).
// NOT: SENKRON dinleyici dagitimina dayanir -> commit() listener'lari hemen cagirir, flag o an dogru commit'i yansitir.
// useLiveReadings bunu subscribe icinde SENKRON okur (await/setTimeout YOK); async okunursa en son commit'in degeri donerdi.
export function wasLastChangeFromDevice(): boolean {
  return lastFromDevice
}

function commit(next: DeviceSettings, fromDevice: boolean) {
  current = next
  lastFromDevice = fromDevice
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* offline */ }
  listeners.forEach((l) => l())
}

export function updateDeviceSettings(patch: Partial<DeviceSettings>): void {
  commit({ ...current, ...patch }, false)
}
export function resetDeviceSettings(): void {
  commit({ ...DEFAULT_DEVICE }, false)
}
// Canli cihazdan okunan ayarlari uygula (HIBRIT: baglaninca cihazin mevcut ayarlariyla devam et)
export function applyDeviceSettingsFromDevice(patch: Partial<DeviceSettings>): void {
  commit({ ...current, ...patch }, true)
}

export function subscribeDeviceSettings(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useDeviceSettings() {
  const settings = useSyncExternalStore(
    (cb) => subscribeDeviceSettings(cb),
    () => current,
    () => current,
  )
  return { settings, update: updateDeviceSettings, reset: resetDeviceSettings }
}
