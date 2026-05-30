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
