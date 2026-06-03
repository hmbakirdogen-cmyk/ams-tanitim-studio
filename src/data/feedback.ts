/*
 * NE      : Geri bildirim deposu - tip + localStorage (offline) + en-iyi-caba yerel sunucu (tek-tik) dosyaya toplama.
 * NEDEN   : Mehmet Abi: "Teklif programindaki gibi feedback prosesi cak." AMS tamamen OFFLINE/dagitik (her makinede ayri kopya) -
 *           Teklif'teki merkezi backend+admin-cevap kanali birebir uymuyor; en sadik uyarlama: kullanici GONDERIR, kendi
 *           bildirimlerini gorur; calisirken tek-tik sunucu varsa host makinede DOSYADA toplanir (SMC/Mehmet Abi okur).
 * NASIL   : addFeedback -> localStorage'a yazar (kullanici "Onceki Bildirimlerim"i gorsun) + fetch('/api/feedback') ile
 *           server.mjs'e POST (calisiyorsa geri-bildirimler.json'a ekler; standalone/file:// ise sessizce gecer).
 * YAN ETKI: localStorage (ams_feedback_v1). Ag yazimi en-iyi-caba (offline kirilmaz).
 */
export type FeedbackTur = 'hata' | 'oneri' | 'mesaj'

export interface Feedback {
  id: string
  tur: FeedbackTur
  mesaj: string
  sayfa: string
  tarih: string // ISO
}

const KEY = 'ams_feedback_v1'

function read(): Feedback[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Feedback[]) : []
  } catch {
    return []
  }
}

function write(list: Feedback[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* offline/kota - sessizce gec */ }
}

// Yeniden eskiye sirali (en yeni ustte)
export function listFeedback(): Feedback[] {
  return read().sort((a, b) => (a.tarih < b.tarih ? 1 : -1))
}

export async function addFeedback(input: { tur: FeedbackTur; mesaj: string; sayfa: string }): Promise<Feedback> {
  const rec: Feedback = {
    id: globalThis.crypto?.randomUUID?.() ?? `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tur: input.tur,
    mesaj: input.mesaj.trim(),
    sayfa: input.sayfa,
    tarih: new Date().toISOString(),
  }
  const list = read()
  list.push(rec)
  write(list)
  // EN-IYI-CABA: tek-tik sunucu calisiyorsa host dosyasina da yaz (toplama). Calismiyorsa (standalone/file://) sessizce gec.
  try {
    await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) })
  } catch { /* yerel sunucu yok - localStorage zaten kaydetti */ }
  return rec
}
