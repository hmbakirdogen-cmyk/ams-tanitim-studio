/*
 * NE      : Ekonomi varsayimlari deposu + hook - elektrik fiyati vb. kullanici tarafindan girilir, kalici saklanir.
 * NEDEN   : Mehmet Bey: "kullanici elektrik fiyatini (ve gereken diger verileri) istedigi zaman girip tasarrufu ona gore hesaplasin".
 * NASIL   : Economy nesnesi localStorage'da; useEconomy() okur/gunceller; eksik alanlar DEFAULT_ECONOMY ile tamamlanir.
 * YAN ETKI: Offline (localStorage). Tasarruf sayfasi bu degerlerle hesap yapar; degisiklik aninda yansir + kalici.
 */
import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_ECONOMY, type Economy } from '@/lib/savings'

const KEY = 'ams_economy_v1'

function load(): Economy {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_ECONOMY, ...(JSON.parse(raw) as Partial<Economy>) } : { ...DEFAULT_ECONOMY }
  } catch {
    return { ...DEFAULT_ECONOMY }
  }
}

export function useEconomy() {
  const [economy, setEconomy] = useState<Economy>(() => load())

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(economy))
  }, [economy])

  const update = useCallback((patch: Partial<Economy>) => setEconomy((e) => ({ ...e, ...patch })), [])
  const reset = useCallback(() => setEconomy({ ...DEFAULT_ECONOMY }), [])

  return { economy, update, reset }
}
