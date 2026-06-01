/*
 * NE      : Escape tuşuna basılınca verilen kapatma fonksiyonunu çağıran küçük paylaşılan hook.
 * NEDEN   : QA bulgusu — modallar (AdminUsers/ProfileEditor/RangeAnalysisModal/ReportView) sadece X / backdrop ile kapanıyordu;
 *           kullanıcı doğal refleksle Escape'e basınca hiçbir şey olmuyordu. Tek yerde tanımla → tüm modallarda tutarlı.
 * NASIL   : mount'ta document'a keydown dinleyicisi bağlar, 'Escape'te onClose() çağırır, unmount'ta temizler.
 * YAN ETKI: Yok (pasif dinleyici, capture değil). onClose her render değişebileceği için ref ile sabit kimlik tutulur.
 */
import { useEffect, useRef } from 'react'

export function useEscapeKey(onClose: () => void): void {
  const ref = useRef(onClose)
  ref.current = onClose
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') ref.current() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
}
