/*
 * NE      : Dil anahtari - TR / EN / JA SADE METIN pill'leri (kompakt, monokrom). Aktif dil hafif SMC-mavisi vurgulu.
 * NEDEN   : Mehmet Abi: "renkli bayraklar panelde renk ahengini bozuyor + lüzumsuz yer kaplıyor; daha önemsiz yerde,
 *           en mantıklı şekilde olsun." → renkli bayraklar KALDIRILDI; tema-uyumlu sade metin + Sidebar alt köşesine taşındı.
 * NASIL   : useLang() store; setLang ile degisir. Globe (Languages) ikonu + 3 metin pill (TR/EN/JA). Aktif = mavi vurgu,
 *           pasif = soluk (renk yok). Offline (CDN yok). Eski bayrak SVG'leri kaldirildi (renk catismasi kaynagiydi).
 * YAN ETKI: Dil secimi localStorage'da (ams_lang_v1); tum t() cagrilari aninda guncellenir. Hem Sidebar hem Giris ekraninda kullanilir.
 */
import { useLang, type Lang } from '@/i18n'
import { Languages } from 'lucide-react'

const LANGS: { code: Lang; label: string; title: string }[] = [
  { code: 'tr', label: 'TR', title: 'Türkçe' },
  { code: 'en', label: 'EN', title: 'English' },
  { code: 'ja', label: 'JA', title: '日本語' },
]

export function LangSwitcher() {
  const { lang, setLang } = useLang()
  return (
    <div className="flex items-center gap-1 text-[var(--ink-soft)]">
      <Languages size={13} className="opacity-45" aria-hidden />
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`rounded px-1.5 py-0.5 text-[11px] font-semibold tracking-wide transition ${
            lang === l.code
              ? 'bg-[var(--smc)]/20 text-[var(--smc-bright)]'
              : 'opacity-50 hover:opacity-100 hover:text-white'
          }`}
          aria-label={l.title}
          title={l.title}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
