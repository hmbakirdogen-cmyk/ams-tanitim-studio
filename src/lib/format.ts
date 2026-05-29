/*
 * NE      : Turkce sayi/birim bicimleme yardimcilari + acik etiketler.
 * NEDEN   : Mehmet Bey kurali - kafa karistiran kisaltma YOK; tam Turkce, binlik ayraci, ondalik virgul.
 * NASIL   : Intl.NumberFormat('tr-TR') tabanli fmtInt/fmt1/fmt2/fmtTL.
 * YAN ETKI: Tum gorseller sayilari buradan gecirir -> tutarli, okunakli, "business" goruntu.
 */
const nf = (min: number, max: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: min, maximumFractionDigits: max })

export const fmtInt = (v: number): string => nf(0, 0).format(Math.round(v))
export const fmt1 = (v: number): string => nf(1, 1).format(v)
export const fmt2 = (v: number): string => nf(2, 2).format(v)
export const fmtTL = (v: number): string => `${nf(0, 0).format(Math.round(v))} ₺`

// Kisaltilmis (kompakt) bicim - buyuk sayilar: 1.800 -> "1,8 B", 1.250.000 -> "1,2 Mn" (Turkce)
export const fmtCompact = (v: number): string =>
  new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
export const fmtTLCompact = (v: number): string => `${fmtCompact(v)} ₺`
