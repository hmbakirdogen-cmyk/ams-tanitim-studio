/*
 * NE      : Ekonomi varsayimlari + PAYLASILAN store + hook - elektrik fiyati/baseline/para birimi vb. kullanici girer, kalici saklanir.
 * NEDEN   : Mehmet Abi: "kullanici elektrik fiyatini (ve gereken verileri) girip tasarrufu ona gore hesaplasin" +
 *           model degisince economy.baselineFlow tum acik sayfalara ANINDA yansisin. (Para birimi burada DEGIL; gosterimde DILE bagli — format.ts.)
 * NASIL   : model.ts/modules.ts ile AYNI desen: modul-seviyesi tek dogruluk (current) + dinleyiciler; useSyncExternalStore
 *           ile tum useEconomy() tuketicileri reaktif. load() eski localStorage'daki priceTL alanini pricePerKwh'e MIGRATE eder.
 * YAN ETKI: Offline (localStorage). Degisiklik aninda Tasarruf/Gecmis/Rapor sayfalarina yansir + kalici. eksik alanlar DEFAULT ile tamamlanir.
 */
import { useSyncExternalStore } from 'react'
import { DEFAULT_ECONOMY, type Economy } from '@/lib/savings'

const KEY = 'ams_economy_v1'
type StoredEconomy = Partial<Economy> & { priceTL?: number }

function normalize(raw: StoredEconomy): Economy {
  return {
    ...DEFAULT_ECONOMY,
    ...raw,
    pricePerKwh: typeof raw.pricePerKwh === 'number' ? raw.pricePerKwh : (typeof raw.priceTL === 'number' ? raw.priceTL : DEFAULT_ECONOMY.pricePerKwh),
  }
}

function load(): Economy {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? normalize(JSON.parse(raw) as StoredEconomy) : { ...DEFAULT_ECONOMY }
  } catch {
    return { ...DEFAULT_ECONOMY }
  }
}

// --- Paylasilan store (tek dogruluk + dinleyiciler) ---
let current: Economy = load()
const listeners = new Set<() => void>()

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* offline/private mode */
  }
  listeners.forEach((l) => l())
}

export function updateEconomy(patch: Partial<Economy>): void {
  current = { ...current, ...patch }
  persist()
}
export function resetEconomy(): void {
  current = { ...DEFAULT_ECONOMY }
  persist()
}

export function useEconomy() {
  const economy = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
    () => current,
  )
  return { economy, update: updateEconomy, reset: resetEconomy }
}
