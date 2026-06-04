/*
 * NE      : Tarih/saat yardimcilari - epoch (ms) <-> <input type="datetime-local"> degeri + okunakli Turkce bicim.
 * NEDEN   : Mehmet Bey (Rapor): "basit tarih + saat araligi (baslangic-bitis) sec; o araligin TUM verileri raporlansin".
 *           datetime-local YEREL saat ister/verir (UTC degil) -> dogru donusum sart.
 * NASIL   : toLocalInputValue: yerel bilesenlerden "YYYY-MM-DDTHH:mm:ss" uretir. fromLocalInputValue: new Date(str) (yerel ayristirir).
 * YAN ETKI: Tarih/saat gosterimleri dile uyar (localeOf): TR'de tr-TR (birebir korunur), EN'de en-US, JA'da ja-JP. Saniye dahil (kisa demo oturumlari icin granulerlik).
 */
import { localeOf } from '@/lib/format'

const pad = (n: number) => String(n).padStart(2, '0')

// epoch ms -> "YYYY-MM-DDTHH:mm:ss" (yerel saat; datetime-local input degeri, step=1 ile saniye dahil)
export function toLocalInputValue(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// datetime-local degeri -> epoch ms (yerel saat olarak ayristirilir). Gecersizse NaN.
export function fromLocalInputValue(s: string): number {
  return new Date(s).getTime()
}

// Okunakli tam tarih+saat (dile uyar) - rapor basligi/etiketler icin
export function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString(localeOf(), { dateStyle: 'medium', timeStyle: 'medium' })
}

// Sadece saat:dakika:saniye (kompakt etiket)
export function fmtClock(ms: number): string {
  return new Date(ms).toLocaleTimeString(localeOf(), { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
