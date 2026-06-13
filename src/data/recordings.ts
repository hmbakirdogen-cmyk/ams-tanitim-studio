/*
 * NE      : Kayit deposu - olcum oturumlarini (Reading dizisi) localStorage'da saklar; CSV/JSON disa aktarma + silme.
 * NEDEN   : Mehmet Bey: "tum verileri hafizada tutsun; kullanici istedigi zaman kolayca KAYDETSIN ve SILSIN".
 * NASIL   : Kayit = {id, ad, olusturma zamani, noktalar}. download() tarayicidan dosya indirir (offline, sunucusuz).
 * YAN ETKI: Tarayici localStorage (offline). createdAt cagirandan gelir (uygulama calismasinda Date.now()).
 */
import type { Reading } from './types'
import { toLocalInputValue } from '@/lib/datetime'
import { t } from '@/i18n' // yedek kayıt adı çevrilsin (Japonya: 'Kayıt' → 'Record'/'記録')

/*
 * NE+NEDEN: Saha/musteri is bilgisi. Mehmet Abi: "SMC calisani sahaya/musteriye gidince ISLETME bilgilerini yazip
 *           aldigi verileri deposunda kayitli tutsun, rahatca erissin, kendi raporlarina bu analizleri ekleyebilsin."
 * NASIL   : Kayda (Recording) opsiyonel iliştirilir; rapor belgesine (ReportView) "Isletme bilgileri" blogu olarak basilir.
 *           Tum alanlar OPSIYONEL -> eski kayitlar/hizli kayit kirilmaz (geriye uyum).
 */
export interface CustomerInfo {
  company?: string  // isletme / firma adi
  contact?: string  // yetkili kisi
  location?: string // lokasyon / hat / makine
  note?: string     // saha notu
}

export interface Recording {
  id: string
  name: string
  createdAt: number // kaydetme ani (epoch ms) ~ son nokta
  startedAt: number // t=0 aninin duvar saati (epoch ms) -> gercek tarih/saat
  customer?: CustomerInfo // saha/musteri is bilgisi (opsiyonel)
  points: Reading[]
}

const KEY = 'ams_recordings_v1'

// Eski kayitlarda startedAt yoksa sureden geriye hesapla (geriye uyum)
function backfillStartedAt(rec: Recording): Recording {
  if (typeof rec.startedAt === 'number') return rec
  const last = rec.points.length ? rec.points[rec.points.length - 1].t : 0
  return { ...rec, startedAt: rec.createdAt - last }
}

function read(): Recording[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Recording[]).map(backfillStartedAt) : []
  } catch {
    return []
  }
}
function write(list: Recording[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* offline / kota dolu - sessizce gec (history.ts/connection.ts deseniyle hizali) */ }
}

export function listRecordings(): Recording[] {
  return read().sort((a, b) => b.createdAt - a.createdAt)
}

export function saveRecording(name: string, points: Reading[], createdAt: number, startedAt?: number, customer?: CustomerInfo): void {
  const last = points.length ? points[points.length - 1].t : 0
  // Bos alanlari at -> sadece dolu musteri bilgisi saklanir (yoksa customer hic eklenmez)
  const cust: CustomerInfo = {}
  if (customer?.company?.trim()) cust.company = customer.company.trim()
  if (customer?.contact?.trim()) cust.contact = customer.contact.trim()
  if (customer?.location?.trim()) cust.location = customer.location.trim()
  if (customer?.note?.trim()) cust.note = customer.note.trim()
  const rec: Recording = {
    id: `rec-${createdAt}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || (cust.company || t('Kayıt')),
    createdAt,
    startedAt: startedAt ?? createdAt - last, // verilmezse sureden geriye hesapla
    ...(Object.keys(cust).length ? { customer: cust } : {}),
    points: points.slice(),
  }
  write([...read(), rec])
}

export function removeRecording(id: string): void {
  write(read().filter((r) => r.id !== id))
}

// Noktalari (gercek YEREL tarih/saat dahil) CSV'ye cevirir - rapor ve kayit disa aktarmasi ortak kullanir
// Not: yerel saat (arayuz/rapor ile tutarli); UTC degil -> Excel'de acan personel kafa karismaz (KATI).
export function pointsToCSV(points: Reading[], startedAt: number): string {
  const head = 'tarih_saat_yerel,ms,debi_litre_dakika,basinc_MPa,sicaklik_C,nem_yuzde,mod'
  const local = (ms: number) => toLocalInputValue(startedAt + ms) // YYYY-MM-DDTHH:mm:ss (yerel)
  const rows = points.map(
    (p) => `${local(p.t)},${p.t},${p.flow.toFixed(1)},${p.pressure.toFixed(3)},${p.temperature.toFixed(2)},${p.humidity.toFixed(1)},${p.mode}`,
  )
  return [head, ...rows].join('\n')
}

export function toCSV(rec: Recording): string {
  return pointsToCSV(rec.points, rec.startedAt)
}

export function download(filename: string, content: string, type = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
