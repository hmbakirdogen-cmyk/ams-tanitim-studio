/*
 * NE      : Sensor gorunurluk deposu + hook - hangi sensorlerin grafik/kartlarda gosterilecegini belirler.
 * NEDEN   : Mehmet Bey: "Urun Ayarlari'ndan hangi sensorler varsa secilebilir/gorunumu ayarlanabilir; su an 4'u etkin".
 * NASIL   : Record<MetricKey, boolean> localStorage'da; eksik anahtarlar varsayilan (true) ile tamamlanir; yeni sensor otomatik gelir.
 * YAN ETKI: Offline. Canli panel/sensor sayfasi bu gorunurlugu uygular; kapatilan sensor cizilmez.
 */
import { useCallback, useEffect, useState } from 'react'
import { METRICS, type MetricKey } from '@/data/metrics'

export type Visibility = Record<MetricKey, boolean>

const DEFAULT: Visibility = Object.fromEntries(METRICS.map((m) => [m.key, true])) as Visibility
const KEY = 'ams_sensor_vis_v1'

function load(): Visibility {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<Visibility>) } : { ...DEFAULT }
  } catch {
    return { ...DEFAULT }
  }
}

export function useSensorVisibility() {
  const [visible, setVisible] = useState<Visibility>(() => load())

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(visible))
  }, [visible])

  const toggle = useCallback((k: MetricKey) => setVisible((v) => ({ ...v, [k]: !v[k] })), [])
  const showAll = useCallback(() => setVisible({ ...DEFAULT }), [])

  return { visible, toggle, showAll }
}
