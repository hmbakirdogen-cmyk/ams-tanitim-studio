/*
 * NE      : Dil değiştirici - TR/EN/JA bayrak butonları. Türk bayrağı ASİL 3B DALGALANIR (cloth wave + ışık süzülmesi); diğerleri sade SVG.
 * NEDEN   : Mehmet Abi: "her sayfada (giriş dahil) dili değiştiren bayrak butonları; Türk bayrağı asil 3D gerçekçi dalgalansın". (Almanca yerine Japonca.)
 * NASIL   : useLang ile aktif dil; tıklayınca setLang (kalıcı). Bayraklar inline SVG (offline, keskin, her ekranda net). TR = .flag-wave/.flag-sheen.
 * YAN ETKI: Saf görsel + dil store'u. Küçük buton (~30×20). Sidebar + giriş ekranında mount edilir.
 */
import { useLang, LANGS, type Lang } from '@/i18n'
import { sound } from '@/lib/sound'

// --- Bayrak SVG'leri (viewBox 0 0 36 24) ---
function TRFlag() {
  return (
    <svg viewBox="0 0 36 24" preserveAspectRatio="none" className="h-full w-full">
      <rect width="36" height="24" fill="#E30A17" />
      <circle cx="13" cy="12" r="6" fill="#fff" />
      <circle cx="14.9" cy="12" r="4.8" fill="#E30A17" />
      <path transform="translate(21 12) scale(0.62) rotate(-18)" d="M0,-5 L1.18,-1.62 4.76,-1.55 1.9,0.62 2.94,4.05 0,2 -2.94,4.05 -1.9,0.62 -4.76,-1.55 -1.18,-1.62 Z" fill="#fff" />
    </svg>
  )
}
function GBFlag() {
  return (
    <svg viewBox="0 0 36 24" preserveAspectRatio="none" className="h-full w-full">
      <rect width="36" height="24" fill="#012169" />
      <path d="M0,0 L36,24 M36,0 L0,24" stroke="#fff" strokeWidth="5" />
      <path d="M0,0 L36,24 M36,0 L0,24" stroke="#C8102E" strokeWidth="2" />
      <rect x="15" width="6" height="24" fill="#fff" />
      <rect y="9" width="36" height="6" fill="#fff" />
      <rect x="16.5" width="3" height="24" fill="#C8102E" />
      <rect y="10.5" width="36" height="3" fill="#C8102E" />
    </svg>
  )
}
function JPFlag() {
  // Japonya: beyaz zemin + ortada kirmizi daire (Hinomaru). Oran 3:2 -> daire capi yuksekligin 3/5'i.
  return (
    <svg viewBox="0 0 36 24" preserveAspectRatio="none" className="h-full w-full">
      <rect width="36" height="24" fill="#fff" />
      <circle cx="18" cy="12" r="7.2" fill="#BC002D" />
    </svg>
  )
}

const FLAGS: Record<Lang, { label: string; Comp: () => JSX.Element }> = {
  tr: { label: 'Türkçe', Comp: TRFlag },
  en: { label: 'English', Comp: GBFlag },
  ja: { label: '日本語', Comp: JPFlag },
}

export function LangSwitcher() {
  const { lang, setLang } = useLang()
  return (
    <div className="glass flex items-center gap-1.5 rounded-full p-1">
      {LANGS.map((l) => {
        const on = lang === l
        const { label, Comp } = FLAGS[l]
        return (
          <button
            key={l}
            onClick={() => { sound.click(); setLang(l) }}
            title={label}
            aria-label={label}
            className={`relative grid place-items-center overflow-hidden rounded-[5px] transition ${on ? '' : 'opacity-50 hover:opacity-100'}`}
            style={{
              width: 30,
              height: 20,
              boxShadow: on ? '0 0 0 2px var(--smc-bright), 0 0 12px -2px var(--smc-bright)' : 'inset 0 0 0 1px rgba(255,255,255,0.18)',
            }}
          >
            {l === 'tr' ? (
              // Türk bayrağı: asil 3B dalgalanma + ışık süzülmesi
              <span className="flag-wave flag-sheen relative block h-full w-full">
                <Comp />
              </span>
            ) : (
              <Comp />
            )}
          </button>
        )
      })}
    </div>
  )
}
