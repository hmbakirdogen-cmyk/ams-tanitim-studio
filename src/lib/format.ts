/*
 * NE      : Sayi/birim/yuzde bicimleme yardimcilari (dile duyarli: TR/EN/JA).
 * NEDEN   : Mehmet Bey kurali - kafa karistiran kisaltma YOK; tam yazim, binlik ayraci, ondalik. Dil degisince sayi bicimi de o dile uyar.
 * NASIL   : localeOf(getLang()) -> Intl locale (tr->'tr-TR', en->'en-US', ja->'ja-JP'). TR yolu ESKISIYLE BIREBIR AYNI ('tr-TR' degismez).
 * YAN ETKI: Tum gorseller sayilari buradan gecirir -> tutarli, okunakli; tek noktadan dil-uyumlu.
 */
import { getLang } from '@/i18n'

// Aktif dil -> Intl locale etiketi. TR demo yolu birebir korunur ('tr-TR'); sadece en/ja farklilasir.
const LOCALE: Record<string, string> = { tr: 'tr-TR', en: 'en-US', ja: 'ja-JP' }
export const localeOf = (): string => LOCALE[getLang()] ?? 'tr-TR'

const nf = (min: number, max: number) =>
  new Intl.NumberFormat(localeOf(), { minimumFractionDigits: min, maximumFractionDigits: max })

export const fmtInt = (v: number): string => nf(0, 0).format(Math.round(v))
export const fmt1 = (v: number): string => nf(1, 1).format(v)
export const fmt2 = (v: number): string => nf(2, 2).format(v)
export const fmtTL = (v: number): string => `${nf(0, 0).format(Math.round(v))} ₺`

// Yuzde - dile gore yazim: TR "%50" (isaret onde), EN/JA "50%" (arkada).
// digits verilirse nf ile ondalik (fmtPct(p,1)); verilmezse ham deger (0..100 tam sayi). TR ciktisi eski ifadeyle birebir.
export const fmtPct = (v: number, digits?: number): string => {
  const n = typeof digits === 'number' ? nf(digits, digits).format(v) : String(v)
  return getLang() === 'tr' ? `%${n}` : `${n}%`
}

// Kisaltilmis (kompakt) bicim - buyuk sayilar: 1.800 -> "1,8 B", 1.250.000 -> "1,2 Mn" (dile gore)
export const fmtCompact = (v: number): string =>
  new Intl.NumberFormat(localeOf(), { notation: 'compact', maximumFractionDigits: 1 }).format(v)
export const fmtTLCompact = (v: number): string => `${fmtCompact(v)} ₺`
