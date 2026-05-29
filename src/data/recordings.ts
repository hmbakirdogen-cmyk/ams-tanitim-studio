/*
 * NE      : Kayit deposu - olcum oturumlarini (Reading dizisi) localStorage'da saklar; CSV/JSON disa aktarma + silme.
 * NEDEN   : Mehmet Bey: "tum verileri hafizada tutsun; kullanici istedigi zaman kolayca KAYDETSIN ve SILSIN".
 * NASIL   : Kayit = {id, ad, olusturma zamani, noktalar}. download() tarayicidan dosya indirir (offline, sunucusuz).
 * YAN ETKI: Tarayici localStorage (offline). createdAt cagirandan gelir (uygulama calismasinda Date.now()).
 */
import type { Reading } from './types'

export interface Recording {
  id: string
  name: string
  createdAt: number
  points: Reading[]
}

const KEY = 'ams_recordings_v1'

function read(): Recording[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Recording[]) : []
  } catch {
    return []
  }
}
function write(list: Recording[]): void {
  localStorage.setItem(KEY, JSON.stringify(list))
}

export function listRecordings(): Recording[] {
  return read().sort((a, b) => b.createdAt - a.createdAt)
}

export function saveRecording(name: string, points: Reading[], createdAt: number): void {
  const rec: Recording = {
    id: `rec-${createdAt}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || 'Kayıt',
    createdAt,
    points: points.slice(),
  }
  write([...read(), rec])
}

export function removeRecording(id: string): void {
  write(read().filter((r) => r.id !== id))
}

export function toCSV(rec: Recording): string {
  const head = 'ms,debi_litre_dakika,basinc_MPa,sicaklik_C,nem_yuzde,mod'
  const rows = rec.points.map(
    (p) => `${p.t},${p.flow.toFixed(1)},${p.pressure.toFixed(3)},${p.temperature.toFixed(2)},${p.humidity.toFixed(1)},${p.mode}`,
  )
  return [head, ...rows].join('\n')
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
