/*
 * NE      : Offline local user store - users + password verification via localStorage and Web Crypto SHA-256.
 * NEDEN   : Personel girisi icin sunucusuz, cihaz-ici bir kimlik katmani saglar.
 * NASIL   : Sifreler hash olarak saklanir; ilk acilista yonetici seed edilir; one-shot migration'lar burada uygulanir.
 */
export type Role = 'admin' | 'user'

export interface User {
  id: string
  firstName: string
  lastName: string
  role: Role
  hash: string
  photo?: string
  title?: string
  phone?: string
  email?: string
  bio?: string
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
const HALIL_PHOTO = '/users/halil.jpg'
const ADEM_KILINC_RESET_FLAG_KEY = 'ams_mig_pw_reset_adem_kilinc_v1'
const ADEM_KILINC_RESET_HASH = '8967849510715711f54189e7352a1b25b390fd085fe96bace454d743fde2479a'

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

function normalizeHumanName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/\s+/g, ' ')
}

function normalizeSlugPart(value: string): string {
  return normalizeHumanName(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function maybeApplyAdemKilincPasswordReset(users: User[]): boolean {
  if (localStorage.getItem(ADEM_KILINC_RESET_FLAG_KEY) === '1') return false
  let changed = false

  for (const user of users) {
    if (normalizeHumanName(user.firstName) !== 'adem') continue
    if (normalizeHumanName(user.lastName) !== 'kilinc') continue
    if (user.hash === ADEM_KILINC_RESET_HASH) continue
    user.hash = ADEM_KILINC_RESET_HASH
    changed = true
  }

  // Tek seferlik deploy migrasyonu: bu surum ilk kez acilinca dener, sonra tekrar dokunmaz.
  localStorage.setItem(ADEM_KILINC_RESET_FLAG_KEY, '1')
  return changed
}

export async function ensureSeed(): Promise<void> {
  const users = read()

  if (users.length === 0) {
    const hash = await hashPassword('smc')
    const seeded: User[] = [{ id: 'karakelle', firstName: 'Halil İbrahim', lastName: 'Karakelle', role: 'admin', hash, photo: HALIL_PHOTO }]
    maybeApplyAdemKilincPasswordReset(seeded)
    write(seeded)
    return
  }

  let changed = false

  const karakelle = users.find((user) => user.id === 'karakelle')
  if (karakelle && !karakelle.photo) {
    karakelle.photo = HALIL_PHOTO
    changed = true
  }

  if (maybeApplyAdemKilincPasswordReset(users)) changed = true
  if (changed) write(users)
}

export function listUsers(): User[] {
  return read()
}

function slugId(firstName: string, lastName: string): string {
  const base = `${normalizeSlugPart(firstName)}-${normalizeSlugPart(lastName)}`
    .replace(/-+/g, '-')
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
  const user = users.find((entry) => entry.id === id)
  if (!user) return
  user.hash = await hashPassword(password)
  write(users)
}

export function updateProfile(id: string, patch: ProfilePatch): void {
  const users = read()
  const user = users.find((entry) => entry.id === id)
  if (!user) return
  if (patch.photo !== undefined) user.photo = patch.photo
  if (patch.title !== undefined) user.title = patch.title
  if (patch.phone !== undefined) user.phone = patch.phone
  if (patch.email !== undefined) user.email = patch.email
  if (patch.bio !== undefined) user.bio = patch.bio
  write(users)
}

export function removeUser(id: string): boolean {
  const users = read()
  const target = users.find((user) => user.id === id)
  if (target?.role === 'admin' && users.filter((user) => user.role === 'admin').length <= 1) return false
  write(users.filter((user) => user.id !== id))
  return true
}

export async function verify(id: string, password: string): Promise<boolean> {
  const user = read().find((entry) => entry.id === id)
  if (!user) return false
  return (await hashPassword(password)) === user.hash
}

export function exportUsers(): string {
  const users = read()
  return JSON.stringify({ kind: 'ams-users', version: 1, count: users.length, users }, null, 2)
}

export function importUsers(json: string): { added: number; updated: number } {
  const data = JSON.parse(json)
  const incoming: unknown = Array.isArray(data) ? data : (data && data.users)
  if (!Array.isArray(incoming)) throw new Error('Gecersiz personel dosyasi')

  const current = read()
  let added = 0
  let updated = 0

  for (const raw of incoming) {
    const user = raw as Partial<User>
    if (!user || typeof user.id !== 'string' || typeof user.hash !== 'string' || typeof user.firstName !== 'string') continue

    const role: Role = user.role === 'admin' || user.role === 'user' ? user.role : 'user'
    const lastName = typeof user.lastName === 'string' ? user.lastName : ''
    const index = current.findIndex((entry) => entry.id === user.id)

    if (index >= 0) {
      current[index] = { ...current[index], ...user, role: current[index].role, lastName: lastName || current[index].lastName }
      updated++
      continue
    }

    current.push({ ...(user as User), role, lastName })
    added++
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
