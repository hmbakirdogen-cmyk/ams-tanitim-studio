/*
 * NE      : Cihaz tipi sezimi - uygulama telefon/tablette mi calisiyor? (mobil = yalniz DEMO gosterimi).
 * NEDEN   : Mehmet Abi: "mobil app sadece demo izlesin/oynatsin; canli cihaz PC surumunde". Mobilde canli mod gizlenir + demo kilidi.
 * NASIL   : userAgent (android/iphone/ipad/mobile) VEYA dokunmatik + kaba isaretci + dar ekran. Saf, sunucu-guvenli.
 * YAN ETKI: Yok. Sonuc ilk yuklemede sabit (oryantasyon degisimi onemli degil). Masaustu dokunmatik nadiren yanlis pozitif -> dar ekran sarti azaltir.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false
  const ua = navigator.userAgent || ''
  if (/android|iphone|ipod|ipad|mobile/i.test(ua)) return true
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  return coarse && (navigator.maxTouchPoints ?? 0) > 1 && window.innerWidth < 900
}

/*
 * NE      : "Hafif (lite) mod" yardimcilari — zayif GPU / buyuk-TV / FUAR bilgisayari icin agir 3D'yi kis.
 * NEDEN   : Fuarda TV'ye bagli zayif PC'de agir render WebGL baglamini dusuruyor ("ekran kayboluyor / site kendini
 *           yeniliyor"). Mobil sezimi masaustu fuar-PC'sini yakalamaz -> elle/otomatik hafif-mod gerekir.
 * NASIL   : isLiteForced = URL (?lite/?safe/?kiosk) VEYA localStorage(ams_lite). markLite = context-loss olunca kalici acar.
 *           dprBudget = piksel butcesi -> 4K ekranda bile render cozunurlugu TAVANLI (GPU bogulmaz, gorsel TV'de yine iyi).
 * YAN ETKI: Yok (salt okuma + localStorage).
 */
export function isLiteForced(): boolean {
  try {
    const u = new URLSearchParams(window.location.search)
    if (u.has('lite') || u.has('safe') || u.has('kiosk')) return true
    if (window.localStorage.getItem('ams_lite') === '1') return true
  } catch { /* yok */ }
  return false
}
export function markLite(): void { try { window.localStorage.setItem('ams_lite', '1') } catch { /* yok */ } }
export function dprBudget(maxDpr: number, budgetPx: number): number {
  if (typeof window === 'undefined') return 1
  const cssPx = Math.max(1, window.innerWidth * window.innerHeight)
  return Math.max(0.5, Math.min(maxDpr, Math.sqrt(budgetPx / cssPx)))
}
