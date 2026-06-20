/*
 * NE      : Bagli (moduler) urunler deposu + PAYLASILAN store + hook - AMS'e takilabilen opsiyonel moduller
 *           (kablosuz adaptor EXW1, yumusak baslatma valfi, ek basinc sensoru, IO-Link hub, dahili web sunucu).
 * NEDEN   : Mehmet Bey: "model secilirken ek moduler bagli urunler de secilebilsin -> ozellik/gorunurluk/spec'i etkilesin".
 * NASIL   : Her modul {id, ad, aciklama, etiket}. Secim Record<id,boolean> localStorage'da; useSyncExternalStore ile
 *           ProductSettings (secim) ve ProductPage (vitrin) ayni anda reaktif. enabledModules() React disindan okunabilir.
 * YAN ETKI: Offline (localStorage). Yeni modul = MODULES dizisine tek satir -> her iki sayfada otomatik gorunur.
 */
import { useSyncExternalStore } from 'react'

export interface ModuleDef {
  id: string
  name: string
  desc: string
  badge: string // Urun & Teknoloji baglanabilirlik rozetinde gosterilecek kisa etiket
}

// Takilabilen moduller (cekirdek AMS'te OPC UA + Endustriyel Ethernet zaten dahili; bunlar opsiyonel ekler)
export const MODULES: ModuleDef[] = [
  { id: 'exw1', name: 'Kablosuz Adaptör (EXW1)', desc: '100 metre menzilli şifreli kablosuz bağlantı; kablosuz uzaktan izleme.', badge: 'Kablosuz (EXW1, 100 m)' },
  { id: 'softstart', name: 'Yumuşak Başlatma Valfi', desc: 'Hava kesintisinden sonra basıncı kademeli verir; ani yük darbesini önler.', badge: 'Yumuşak Başlatma' },
  { id: 'pressureSensor', name: 'Ek Basınç Sensörü', desc: 'İkinci hat için ayrı basınç ölçümü; daha detaylı izleme.', badge: 'Ek Basınç Sensörü' },
  { id: 'iolink', name: 'IO-Link Hub', desc: 'Saha cihazlarını IO-Link üzerinden tek noktadan toplar.', badge: 'IO-Link Hub' },
  { id: 'webserver', name: 'Dahili Web Sunucu', desc: 'Tarayıcıdan doğrudan cihaz arayüzüne erişim; kurulum gerektirmez.', badge: 'Web Sunucu+' },
]

export type ModuleState = Record<string, boolean>

const KEY = 'ams_modules_v1'

function load(): ModuleState {
  const base: ModuleState = Object.fromEntries(MODULES.map((m) => [m.id, false]))
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...base, ...(JSON.parse(raw) as ModuleState) } : base
  } catch {
    return base
  }
}

// --- Paylasilan store (model.ts ile ayni desen: tek dogruluk + dinleyiciler) ---
let current: ModuleState = load()
const listeners = new Set<() => void>()

// Secili (acik) modullerin tanimlarini verir - vitrinde gostermek icin
export function enabledModules(): ModuleDef[] {
  return MODULES.filter((m) => current[m.id])
}

export function toggleModule(id: string): void {
  current = { ...current, [id]: !current[id] }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    /* offline/private mode */
  }
  listeners.forEach((l) => l())
}

export function useModules() {
  const modules = useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => current,
    () => current,
  )
  return { modules, toggle: toggleModule }
}
