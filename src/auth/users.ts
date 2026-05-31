/*
 * NE      : Offline yerel kullanici deposu - kullanicilar + sifre dogrulama (localStorage + Web Crypto SHA-256).
 * NEDEN   : Mehmet Bey: personel girisi; yetkili Halil Ibrahim Karakelle; yonetici digerlerine sifre tanimlayabilir. Internet YOK.
 * NASIL   : Sifreler SHA-256 hash olarak saklanir (cıplak metin yok). Ilk acilista yonetici tohumlanir (ensureSeed).
 * YAN ETKI: Tarayici localStorage'ina yazar; bu bir demo gecidi (kurumsal kimlik degil). Varsayilan yonetici sifresi HANDOFF'ta.
 *           KATI: sifre listesi gizli; sadece yonetici (Karakelle Bey) sifre tanimlar/sifirlar.
 */
export type Role = 'admin' | 'user'

export interface User {
  id: string
  firstName: string
  lastName: string
  role: Role
  hash: string
  photo?: string // karizmatik islenmis portre (data URL)
  title?: string // unvan/gorev
  phone?: string // telefon
  email?: string // e-posta
  bio?: string // kendini tanitim
}

export interface ProfilePatch {
  photo?: string
  title?: string
  phone?: string
  email?: string
  bio?: string
}

const USERS_KEY = 'ams_users_v1'
const SESSION_KEY = 'ams_session_v1'

export async function hashPassword(pw: string): Promise<string> {
  const data = new TextEncoder().encode(pw)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function read(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as User[]) : []
  } catch {
    return []
  }
}
function write(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

// Gomulu varsayilan avatar (public/users/halil.jpg). Kullanici Profilim'den istedigi an degistirebilir.
const HALIL_PHOTO = '/users/halil.jpg'

// Ilk acilista yonetici tohumla (Halil Ibrahim Karakelle) + varsayilan foto. Varsayilan sifre degistirilebilir.
export async function ensureSeed(): Promise<void> {
  const users = read()
  if (users.length === 0) {
    const hash = await hashPassword('smc')
    write([{ id: 'karakelle', firstName: 'Halil İbrahim', lastName: 'Karakelle', role: 'admin', hash, photo: HALIL_PHOTO }])
    return
  }
  // Geriye uyum: Karakelle Bey kayitliysa ve henuz fotosu yoksa varsayilan fotoyu ekle (bir kez)
  const k = users.find((u) => u.id === 'karakelle')
  if (k && !k.photo) { k.photo = HALIL_PHOTO; write(users) }
}

export function listUsers(): User[] {
  return read()
}

function slugId(firstName: string, lastName: string): string {
  const base = `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `${base}-${Math.random().toString(36).slice(2, 6)}`
}

export async function addUser(
  firstName: string,
  lastName: string,
  role: Role,
  password: string,
  details: ProfilePatch = {},
): Promise<void> {
  const users = read()
  users.push({
    id: slugId(firstName, lastName),
    firstName,
    lastName,
    role,
    hash: await hashPassword(password),
    ...details,
  })
  write(users)
}

export async function setPassword(id: string, password: string): Promise<void> {
  const users = read()
  const u = users.find((x) => x.id === id)
  if (!u) return
  u.hash = await hashPassword(password)
  write(users)
}

export function updateProfile(id: string, patch: ProfilePatch): void {
  const users = read()
  const u = users.find((x) => x.id === id)
  if (!u) return
  if (patch.photo !== undefined) u.photo = patch.photo
  if (patch.title !== undefined) u.title = patch.title
  if (patch.phone !== undefined) u.phone = patch.phone
  if (patch.email !== undefined) u.email = patch.email
  if (patch.bio !== undefined) u.bio = patch.bio
  write(users)
}

// SON YÖNETİCİYİ silmeyi ENGELLE (kendini-kilitleme koruması): hiç admin kalmazsa AdminUsers paneli/şifre tanımı kalıcı erişilemez olur
// (ensureSeed yalnız users.length===0 iken çalışır). false dönerse silinmedi.
export function removeUser(id: string): boolean {
  const users = read()
  const target = users.find((u) => u.id === id)
  if (target?.role === 'admin' && users.filter((u) => u.role === 'admin').length <= 1) return false
  write(users.filter((u) => u.id !== id))
  return true
}

export async function verify(id: string, password: string): Promise<boolean> {
  const u = read().find((x) => x.id === id)
  if (!u) return false
  return (await hashPassword(password)) === u.hash
}

/*
 * Laptoplar arasi tasima (OFFLINE dosya). Dısa aktar: bu bilgisayardaki TUM personeli (sifre hash'leriyle) JSON'a yazar.
 * Ice aktar: dosyadaki personeli MERGE eder (id'ye gore gunceller, yeni ekler) - mevcut kisiler SILINMEZ. Sifreler korunur (hash tasinir).
 */
export function exportUsers(): string {
  const users = read()
  return JSON.stringify({ kind: 'ams-users', version: 1, count: users.length, users }, null, 2)
}

export function importUsers(json: string): { added: number; updated: number } {
  const data = JSON.parse(json)
  const incoming: unknown = Array.isArray(data) ? data : (data && data.users)
  if (!Array.isArray(incoming)) throw new Error('Geçersiz personel dosyası')
  const current = read()
  let added = 0
  let updated = 0
  for (const raw of incoming) {
    const u = raw as Partial<User>
    if (!u || typeof u.id !== 'string' || typeof u.hash !== 'string' || typeof u.firstName !== 'string') continue // gecersiz kayit atla
    // GÜVENLİK: rol/soyad DOĞRULA. Bozuk/kötü niyetli dosya yetki değiştiremesin; geçersiz rol → 'user'.
    const role: Role = (u.role === 'admin' || u.role === 'user') ? u.role : 'user'
    const lastName = typeof u.lastName === 'string' ? u.lastName : ''
    const idx = current.findIndex((x) => x.id === u.id)
    if (idx >= 0) {
      // MEVCUT kişinin ROLÜNÜ KORU → içe aktarılan dosya sessizce admin'i user'a düşüremez / kullanıcıyı admin yapamaz.
      current[idx] = { ...current[idx], ...u, role: current[idx].role, lastName: lastName || current[idx].lastName }
      updated++
    } else { current.push({ ...(u as User), role, lastName }); added++ }
  }
  write(current)
  return { added, updated }
}

export function getSession(): string | null {
  return localStorage.getItem(SESSION_KEY)
}
export function setSession(id: string | null): void {
  if (id) localStorage.setItem(SESSION_KEY, id)
  else localStorage.removeItem(SESSION_KEY)
}
