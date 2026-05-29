/*
 * NE      : Gunduz/Gece tema hook'u - <html data-theme> ayarlar + localStorage'da saklar (varsayilan: gece/koyu).
 * NEDEN   : Mehmet Bey: "gunduz/gece gorunumu". Tema tek noktadan; index.css token'lari data-theme'e gore degisir.
 * NASIL   : theme state -> documentElement attribute + localStorage; toggle ile gece<->gunduz.
 * YAN ETKI: Tum uygulama CSS degiskenlerinden beslendigi icin tek attribute degisimi her yeri gunceller (kontrast korunur).
 */
import { useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'
const KEY = 'ams_theme_v1'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => ((localStorage.getItem(KEY) as Theme) === 'light' ? 'light' : 'dark'))

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(KEY, theme)
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  return { theme, toggle }
}
