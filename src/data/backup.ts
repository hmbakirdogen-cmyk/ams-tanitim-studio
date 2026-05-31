/*
 * NE      : TAM YEDEK - personel + TUM uygulama verisini (kayitlar, gecmis, ayarlar, ekonomi, model, moduller, tema, baglanti)
 *           tek dosyaya disa/ice aktarir. Laptoplar arasi tam tasima (OFFLINE dosya).
 * NEDEN   : Mehmet Abi: "ice/disa aktar sadece personel icin olmasin; personel VE tum verileriyle beraber olsun".
 * NASIL   : Tum localStorage anahtarlari 'ams_' onekli -> hepsini topla (oturum HARIC). Ice aktar: anahtarlari geri yaz
 *           (mevcut veriyi DEGISTIRIR) -> cagiran sayfayi tazeler (tum store'lar yeniden okur). Eski "sadece personel"
 *           dosyasi (kind: 'ams-users') da desteklenir (birlestirir) -> tek "Ice Aktar" her iki dosyayi da kabul eder.
 * YAN ETKI: localStorage (offline). Oturum (ams_session_v1) tasinmaz -> ice aktarma sonrasi temiz giris.
 */
import { importUsers } from '@/auth/users'

const PREFIX = 'ams_'
const SKIP = new Set(['ams_session_v1']) // oturum tasinmaz (gizlilik + temiz giris)

export interface BackupFile {
  kind: 'ams-backup'
  version: number
  exportedAt: number
  data: Record<string, string>
}

// Bu bilgisayardaki TUM ams_ anahtarlarini (oturum haric) tek dosyaya topla
export function exportAll(now: number): string {
  const data: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k || !k.startsWith(PREFIX) || SKIP.has(k)) continue
    const v = localStorage.getItem(k)
    if (v != null) data[k] = v
  }
  const file: BackupFile = { kind: 'ams-backup', version: 1, exportedAt: now, data }
  return JSON.stringify(file, null, 2)
}

// Yedekteki personel sayisi (kullaniciya gosterilen mesaj icin)
function countUsersIn(data: Record<string, string>): number {
  try {
    const arr = JSON.parse(data['ams_users_v1'] ?? '[]')
    return Array.isArray(arr) ? arr.length : 0
  } catch {
    return 0
  }
}

export interface ImportResult { mode: 'full' | 'users'; keys: number; users: number }

// Tam yedegi geri yukle (mevcut veriyi DEGISTIRIR). Eski personel-only dosyasi gelirse birlestirir (geriye uyum).
export function importAll(json: string): ImportResult {
  const parsed = JSON.parse(json)
  if (parsed && parsed.kind === 'ams-users' && Array.isArray(parsed.users)) {
    const r = importUsers(json) // eski "sadece personel" dosyasi -> birlestir
    return { mode: 'users', keys: 0, users: r.added + r.updated }
  }
  const data = parsed?.data
  if (!parsed || parsed.kind !== 'ams-backup' || !data || typeof data !== 'object') {
    throw new Error('Geçersiz yedek dosyası')
  }
  // TAM DEĞİŞTİR (onay metni "TÜM veriler DEĞİŞTİRİLECEK" der): önce mevcut ams_ anahtarlarını temizle (oturum hariç) →
  //   yedekte OLMAYAN artık anahtarlar kalmaz, birebir geri yükleme olur (eski davranış "üzerine birleştir"di → tutarsızdı).
  const toClear: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith(PREFIX) && !SKIP.has(k)) toClear.push(k)
  }
  toClear.forEach((k) => { try { localStorage.removeItem(k) } catch { /* offline - sessizce gec */ } })
  let keys = 0
  for (const [k, v] of Object.entries(data)) {
    if (typeof k === 'string' && k.startsWith(PREFIX) && !SKIP.has(k) && typeof v === 'string') {
      try { localStorage.setItem(k, v); keys++ } catch { /* kota dolu - sessizce gec */ }
    }
  }
  return { mode: 'full', keys, users: countUsersIn(data as Record<string, string>) }
}
