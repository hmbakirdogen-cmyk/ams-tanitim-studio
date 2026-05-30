/*
 * NE      : Sayi dizisi seyreltme yardimcisi - cok noktali seriyi (or. 30 gun = ~43 bin nokta) gorsel icin orneklere indirir.
 * NEDEN   : Sparkline her noktayi bezier egriye cevirir; binlerce nokta yavaslatir/sismis SVG yolu uretir. Onizleme/rapor
 *           grafigi akici kalmali (KATI kural: 60fps, akici). Istatistik TAM seri uzerinden; sadece CIZIM seyreltilir.
 * NASIL   : cap'i asarsa esit araliklarla cap kadar nokta secer (ilk/son korunur); altindaysa diziyi oldugu gibi dondurur.
 * YAN ETKI: Saf fonksiyon; veri kaybi yalnizca cizimde (trend korunur). Min/ort/maks gibi degerler bundan ETKILENMEZ.
 */
export function downsample(values: number[], cap = 800): number[] {
  if (values.length <= cap) return values
  const out: number[] = []
  const step = (values.length - 1) / (cap - 1)
  for (let i = 0; i < cap; i++) out.push(values[Math.round(i * step)])
  return out
}
