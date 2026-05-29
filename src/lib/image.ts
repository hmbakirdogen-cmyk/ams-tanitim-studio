/*
 * NE      : Yuklenen fotografi OTOMATIK karizmatik portreye cevirir - kare, yuz-odakli (ust-merkez) kirpma + olcekleme.
 * NEDEN   : Mehmet Bey: "yuklenen resmi en iyi analiz ederek, kisi taninir ama cok karizmatik gorunecek sekilde sen otomatik yerlestir".
 * NASIL   : FileReader -> Image -> canvas'a cover-crop (en buyuk olcek) + ust-merkez yatkinlik (yuz genelde ust) -> JPEG data URL.
 * YAN ETKI: Cikti ~kucuk (data URL) -> localStorage'a sigar; sadece istemci. Goruntu cercevesi/filtresi Avatar bileseninde uygulanir.
 */
const SIZE = 440

export async function processPortrait(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = () => reject(new Error('okuma hatası'))
    fr.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('görsel hatası'))
    i.src = dataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl

  // Cover-crop: kareyi tamamen doldur, ust tarafa yatkin (yuz genelde ust bolgede)
  const scale = Math.max(SIZE / img.width, SIZE / img.height)
  const w = img.width * scale
  const h = img.height * scale
  const dx = (SIZE - w) / 2
  const dy = (SIZE - h) * 0.32
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, dx, dy, w, h)

  return canvas.toDataURL('image/jpeg', 0.86)
}
