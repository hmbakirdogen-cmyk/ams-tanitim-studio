/*
 * NE      : Public klasor varlik yolu cozucu - gorsel/ikon/logo yollarini base-uyumlu yapar (GitHub Pages alt-yolu + offline kok + her host).
 * NEDEN   : <img src="/products/x.jpg"> gibi MUTLAK yollar, uygulama alt-klasorde (or. /ams-tanitim-studio/) yayinlaninca 404 olur.
 *           Vite yalnizca import edilen varliklari yeniden yazar; JSX string yollarini DOKUNMAZ. Bu yuzden elle base eklemeliyiz.
 *           OFFLINE korunur: kokte (base '/') yollar aynen calisir; alt-yolda dogru prefix gelir.
 * NASIL   : import.meta.env.BASE_URL (build'deki base) + bastaki '/' temizlenmis yol. resolvePhoto: data:/http ise oldugu gibi birakir.
 * YAN ETKI: Saf fonksiyon. Kullanici yukledigi foto (data: URL) ya da dis URL dokunulmaz; sadece public dosya yollari cozulur.
 */
export function asset(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, '')
}

// Kullanici fotosu: yuklenen (data:) ya da dis (http) URL ise oldugu gibi; degilse public varlik olarak coz (base-uyumlu).
export function resolvePhoto(photo?: string): string | undefined {
  if (!photo) return undefined
  if (photo.startsWith('data:') || /^https?:\/\//.test(photo)) return photo
  return asset(photo)
}
