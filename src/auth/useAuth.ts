/*
 * NE      : Kimlik hook'u - hazir mi, mevcut kullanici, kullanici listesi + giris/cikis/ekle/sifre/sil islemleri.
 * NEDEN   : Tum uygulama tek kimlik kaynagindan beslensin; App giris kapisini buna gore acsin.
 * NASIL   : Mount'ta ensureSeed + oturum geri yukleme (async); islemler depo (users.ts) uzerinden, sonra state tazelenir.
 * YAN ETKI: Oturum localStorage'da tutulur (acilista hatirla); logout temizler. Tum sifre islemleri async (Web Crypto).
 */
import { useCallback, useEffect, useState } from 'react'
import * as store from './users'
import type { ProfilePatch, Role, User } from './users'

export interface Auth {
  ready: boolean
  user: User | null
  users: User[]
  login: (id: string, pw: string) => Promise<boolean>
  logout: () => void
  addUser: (firstName: string, lastName: string, role: Role, pw: string, details?: ProfilePatch) => Promise<void>
  setPassword: (id: string, pw: string) => Promise<void>
  removeUser: (id: string) => void
  updateProfile: (patch: ProfilePatch) => void
  updateUser: (id: string, patch: ProfilePatch) => void
  changePassword: (current: string, next: string) => Promise<boolean>
  exportUsers: () => string
  importUsers: (json: string) => { added: number; updated: number }
}

export function useAuth(): Auth {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])

  const refresh = useCallback(() => setUsers(store.listUsers()), [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      await store.ensureSeed()
      if (!alive) return
      refresh()
      const sid = store.getSession()
      if (sid) setUser(store.listUsers().find((x) => x.id === sid) ?? null)
      setReady(true)
    })()
    return () => {
      alive = false
    }
  }, [refresh])

  const login = useCallback(async (id: string, pw: string) => {
    const ok = await store.verify(id, pw)
    if (ok) {
      store.setSession(id)
      setUser(store.listUsers().find((x) => x.id === id) ?? null)
    }
    return ok
  }, [])

  const logout = useCallback(() => {
    store.setSession(null)
    setUser(null)
  }, [])

  const addUser = useCallback(
    async (firstName: string, lastName: string, role: Role, pw: string, details?: ProfilePatch) => {
      await store.addUser(firstName, lastName, role, pw, details)
      refresh()
    },
    [refresh],
  )

  const setPassword = useCallback(
    async (id: string, pw: string) => {
      await store.setPassword(id, pw)
      refresh()
    },
    [refresh],
  )

  const removeUser = useCallback(
    (id: string): boolean => {
      const ok = store.removeUser(id) // son yönetici korumalı → false dönebilir
      if (ok) refresh()
      return ok
    },
    [refresh],
  )

  // Giris yapan kullanici kendi profilini gunceller (foto/unvan/tanitim) - aninda yansir
  const updateProfile = useCallback(
    (patch: ProfilePatch) => {
      if (!user) return
      store.updateProfile(user.id, patch)
      refresh()
      setUser(store.listUsers().find((x) => x.id === user.id) ?? null)
    },
    [user, refresh],
  )

  // Yonetici herhangi bir kullanicinin detaylarini gunceller (unvan/telefon/e-posta/tanitim)
  const updateUser = useCallback(
    (id: string, patch: ProfilePatch) => {
      store.updateProfile(id, patch)
      refresh()
      if (user && id === user.id) setUser(store.listUsers().find((x) => x.id === id) ?? null)
    },
    [user, refresh],
  )

  // Kullanici kendi sifresini degistirir (once mevcut sifreyi dogrula)
  const changePassword = useCallback(
    async (current: string, next: string) => {
      if (!user) return false
      const ok = await store.verify(user.id, current)
      if (!ok) return false
      await store.setPassword(user.id, next)
      return true
    },
    [user],
  )

  // Laptoplar arasi tasima (offline dosya)
  const exportUsers = useCallback(() => store.exportUsers(), [])
  const importUsers = useCallback(
    (json: string) => {
      const res = store.importUsers(json)
      refresh()
      return res
    },
    [refresh],
  )

  return {
    ready, user, users, login, logout, addUser, setPassword, removeUser, updateProfile, updateUser, changePassword,
    exportUsers, importUsers,
  }
}
