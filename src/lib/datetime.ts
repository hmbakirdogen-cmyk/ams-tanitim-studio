/*
 * NE      : Tarih/saat yardimcilari - epoch (ms) <-> <input type="datetime-local"> degeri + okunakli Turkce bicim.
 * NEDEN   : Mehmet Bey (Rapor): "basit tarih + saat araligi (baslangic-bitis) sec; o araligin TUM verileri raporlansin".
 *           datetime-local YEREL saat ister/verir (UTC degil) -> dogru donusum sart.
 * NASIL   : toLocalInputValue: yerel bilesenlerden "YYYY-MM-DDTHH:mm:ss" uretir. fromLocalInputValue: new Date(str) (yerel ayristirir).
 * YAN ETKI: Saf, bagimsiz; tum tarih/saat gosterimleri tr-TR. Saniye dahil (kisa demo oturumlari icin gerekli granulerlik).
 */
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

// Okunakli tam tarih+saat (tr-TR) - rapor basligi/etiketler icin
export function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'medium' })
}

// Sadece saat:dakika:saniye (kompakt etiket)
export function fmtClock(ms: number): string {
  return new Date(ms).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
