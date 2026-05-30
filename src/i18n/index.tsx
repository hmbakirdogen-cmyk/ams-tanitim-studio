/*
 * NE      : Cok dilli (i18n) cekirdek - Turkce/Ingilizce/Almanca. Anahtar = TURKCE metin; ceviri yoksa Turkce'ye DUSER (asla kirilmaz).
 * NEDEN   : Mehmet Abi: "tum programin dilini bayrak butonlariyla degistir (TR/EN/DE)". Offline + hafif (harici i18n kutuphanesi yok).
 * NASIL   : Paylasilan store (useSyncExternalStore; model/economy ile ayni desen) + localStorage kalici. Bilesenler useLang().t(...) ile
 *           reaktif ceviri alir; veri katmani (React disi) icin t() (reaktif degil). Sozluk EN/DE; TR icin kimlik.
 * YAN ETKI: <html lang> guncellenir. Yeni metin = sadece EN/DE sozlugune eklemek (cevrilmemis -> Turkce gorunur, sorun olmaz).
 */
import { useSyncExternalStore } from 'react'

export type Lang = 'tr' | 'en' | 'de'
export const LANGS: Lang[] = ['tr', 'en', 'de']
const KEY = 'ams_lang_v1'

// Anahtar = TURKCE metin. (tr icin sozluk gerekmez.)
const EN: Record<string, string> = {
  // Navigasyon
  'Canlı Panel': 'Live Panel',
  'Sensör Detayları': 'Sensor Details',
  'Geçmiş Analizi': 'History Analysis',
  'Tasarruf Analizi': 'Savings Analysis',
  'Ürün & Teknoloji': 'Product & Technology',
  'Ürün Ayarları': 'Product Settings',
  'Kayıtlar': 'Records',
  // Kimlik / giris
  'Hava Yönetim Sistemi': 'Air Management System',
  'Canlı Tanıtım Stüdyosu': 'Live Showcase Studio',
  'Personel Girişi': 'Staff Login',
  'Hoş geldiniz': 'Welcome',
  'Şifrenizi girin': 'Enter your password',
  'geri': 'back',
  'Şifre hatalı, tekrar deneyin': 'Wrong password, try again',
  'Yönetici': 'Admin',
  'Personel': 'Staff',
  // Ortak aksiyonlar
  'Kullanıcılar': 'Users',
  'Çıkış': 'Log out',
  'Gündüz': 'Day',
  'Gece': 'Night',
  'Sesi Aç': 'Sound on',
  'Ses Açık': 'Sound on',
  // Veri kaynagi rozeti
  'DEMO VERİSİ': 'DEMO DATA',
  'CANLI CİHAZ': 'LIVE DEVICE',
  'CANLI · BAĞLANIYOR': 'LIVE · CONNECTING',
  'CANLI · BAĞLANTI YOK': 'LIVE · NO CONNECTION',
  'CANLI · BAĞLI': 'LIVE · CONNECTED',
  'CANLI · YOK': 'LIVE · OFFLINE',
  'CANLI · …': 'LIVE · …',
  'CANLI': 'LIVE',
  // Calisma modlari
  'Normal Çalışma': 'Normal Operation',
  'Tasarruf Modu': 'Saving Mode',
  'Hava Kesintisi': 'Air Cut-off',
  'Ekipman tam basınçla çalışıyor': 'Equipment running at full pressure',
  'Basınç düşürüldü, hava tüketimi azaldı': 'Pressure reduced, air consumption lowered',
  'Hava tamamen kesildi': 'Air fully cut off',
}

const DE: Record<string, string> = {
  'Canlı Panel': 'Live-Panel',
  'Sensör Detayları': 'Sensordetails',
  'Geçmiş Analizi': 'Verlaufsanalyse',
  'Tasarruf Analizi': 'Einsparungsanalyse',
  'Ürün & Teknoloji': 'Produkt & Technologie',
  'Ürün Ayarları': 'Produkteinstellungen',
  'Kayıtlar': 'Aufzeichnungen',
  'Hava Yönetim Sistemi': 'Luftmanagementsystem',
  'Canlı Tanıtım Stüdyosu': 'Live-Präsentationsstudio',
  'Personel Girişi': 'Mitarbeiter-Anmeldung',
  'Hoş geldiniz': 'Willkommen',
  'Şifrenizi girin': 'Passwort eingeben',
  'geri': 'zurück',
  'Şifre hatalı, tekrar deneyin': 'Falsches Passwort, erneut versuchen',
  'Yönetici': 'Administrator',
  'Personel': 'Personal',
  'Kullanıcılar': 'Benutzer',
  'Çıkış': 'Abmelden',
  'Gündüz': 'Tag',
  'Gece': 'Nacht',
  'Sesi Aç': 'Ton an',
  'Ses Açık': 'Ton an',
  'DEMO VERİSİ': 'DEMO-DATEN',
  'CANLI CİHAZ': 'LIVE-GERÄT',
  'CANLI · BAĞLANIYOR': 'LIVE · VERBINDET',
  'CANLI · BAĞLANTI YOK': 'LIVE · KEINE VERBINDUNG',
  'CANLI · BAĞLI': 'LIVE · VERBUNDEN',
  'CANLI · YOK': 'LIVE · OFFLINE',
  'CANLI · …': 'LIVE · …',
  'CANLI': 'LIVE',
  'Normal Çalışma': 'Normalbetrieb',
  'Tasarruf Modu': 'Sparmodus',
  'Hava Kesintisi': 'Luftabschaltung',
  'Ekipman tam basınçla çalışıyor': 'Anlage läuft mit vollem Druck',
  'Basınç düşürüldü, hava tüketimi azaldı': 'Druck gesenkt, Luftverbrauch reduziert',
  'Hava tamamen kesildi': 'Luft vollständig abgeschaltet',
}

const DICT: Record<Lang, Record<string, string>> = { tr: {}, en: EN, de: DE }

function load(): Lang {
  try {
    const v = localStorage.getItem(KEY) as Lang
    return LANGS.includes(v) ? v : 'tr'
  } catch {
    return 'tr'
  }
}

let current: Lang = load()
const listeners = new Set<() => void>()
if (typeof document !== 'undefined') document.documentElement.lang = current

export function getLang(): Lang {
  return current
}
export function setLang(l: Lang): void {
  if (l === current || !LANGS.includes(l)) return
  current = l
  try { localStorage.setItem(KEY, l) } catch { /* offline */ }
  if (typeof document !== 'undefined') document.documentElement.lang = l
  listeners.forEach((f) => f())
}

// Cekirdek ceviri: tr -> oldugu gibi; en/de -> sozluk, yoksa Turkce'ye duser
export function translate(s: string, l: Lang = current): string {
  return l === 'tr' ? s : (DICT[l][s] ?? s)
}

// React disi (veri katmani) - reaktif DEGIL
export function t(s: string): string {
  return translate(s)
}

// Bilesenlerde - dil degisince otomatik yeniden render
export function useLang() {
  const lang = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => current,
    () => current,
  )
  return { lang, setLang, t: (s: string) => translate(s, lang) }
}
