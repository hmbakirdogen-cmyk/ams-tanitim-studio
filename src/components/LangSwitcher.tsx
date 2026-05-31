/*
 * NE      : Dil değiştirici - TR/EN/JA bayrak butonları. Türk bayrağı GERÇEK KUMAŞ gibi 3B dalgalanır (bol ışık-gölge); diğerleri sade SVG.
 * NEDEN   : Mehmet Abi: "asil Türk bayrağı mümkün olduğunca GERÇEK bayrak görünsün; çok ışık-gölge oyunuyla 3D dalgalansın." (Almanca yerine Japonca.)
 * NASIL   : TR bayrağı kendi içinde animasyonlu SVG FİLTRESİ ile dalgalanır:
 *           feTurbulence → feDisplacementMap = 3B kumaş kıvrımı (dalgalı kenarlar dahil) ·
 *           feDiffuseLighting = kıvrım gölgeleri · feSpecularLighting = kıvrım tepelerinde parlak ışık ·
 *           dikey hacim gradyanı (üst/alt gölge + orta sheen) · soldan sağa SÜZÜLEN ışık bandı.
 *           Hepsi native SVG/SMIL → OFFLINE, keskin, bağımsız (CSS .flag-* sınıflarına artık ihtiyaç yok). Filtre id'leri useId ile çakışmaz.
 * YAN ETKI: Saf görsel + dil store'u. Küçük buton (~30×20). Sidebar + giriş ekranında mount edilir. Dalgalı kenarlar gerçek bayrak hissi verir (kasıtlı).
 */
import { useId } from 'react'
import { useLang, LANGS, type Lang } from '@/i18n'
import { sound } from '@/lib/sound'

// --- Bayrak SVG'leri (viewBox 0 0 36 24 = resmî 3:2 oranı) ---
function TRFlag() {
  // Filtre/gradyan id'leri INSTANCE'a özel (sidebar + giriş aynı anda mount olursa çakışma olmasın). useId'deki ':' karakterini temizle.
  const raw = useId().replace(/:/g, '')
  const fId = `trc${raw}`, shId = `trs${raw}`, volId = `trv${raw}`
  return (
    <svg viewBox="0 0 36 24" preserveAspectRatio="none" className="h-full w-full" style={{ overflow: 'visible' }}>
      <defs>
        {/* GERÇEK KUMAŞ FİLTRESİ: 3B kıvrım + diffuse gölge + specular parlama (animasyonlu) */}
        <filter id={fId} x="-18%" y="-30%" width="136%" height="160%" colorInterpolationFilters="sRGB">
          {/* organik kumaş gürültüsü (yavaşça nefes alır → dalga canlı durur) */}
          <feTurbulence type="fractalNoise" baseFrequency="0.016 0.046" numOctaves="2" seed="11" result="noise">
            <animate attributeName="baseFrequency" dur="6.5s" values="0.016 0.040;0.021 0.054;0.016 0.040" repeatCount="indefinite" />
          </feTurbulence>
          {/* kumaşı GÜRÜLTÜYE göre büküp 3B kıvrım yarat (kenarlar da dalgalanır = gerçek bayrak) */}
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="5.2" xChannelSelector="R" yChannelSelector="G" result="disp" />
          {/* kıvrım yüzeyini ışıkla aydınlat → tepeler parlak, çukurlar GÖLGE */}
          <feGaussianBlur in="noise" stdDeviation="0.5" result="nb" />
          <feDiffuseLighting in="nb" surfaceScale="2.6" diffuseConstant="1.25" lightingColor="#ffffff" result="dif">
            <feDistantLight azimuth="235" elevation="60">
              <animate attributeName="azimuth" dur="6.5s" values="212;260;212" repeatCount="indefinite" />
            </feDistantLight>
          </feDiffuseLighting>
          <feComposite in="dif" in2="disp" operator="in" result="difM" />
          <feBlend in="disp" in2="difM" mode="multiply" result="shaded" />
          {/* parlak tepe vurguları (saten/kumaş ışıltısı) */}
          <feSpecularLighting in="nb" surfaceScale="2.6" specularConstant="0.85" specularExponent="16" lightingColor="#ffffff" result="spec">
            <feDistantLight azimuth="235" elevation="60">
              <animate attributeName="azimuth" dur="6.5s" values="212;260;212" repeatCount="indefinite" />
            </feDistantLight>
          </feSpecularLighting>
          <feComposite in="spec" in2="disp" operator="in" result="specM" />
          <feBlend in="shaded" in2="specM" mode="screen" />
        </filter>
        {/* dikey HACİM gradyanı: silindirik kumaş hissi (üst/alt koyu, ortada hafif ışık) */}
        <linearGradient id={volId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0.24" />
          <stop offset="0.16" stopColor="#000" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.12" />
          <stop offset="0.84" stopColor="#000" stopOpacity="0.04" />
          <stop offset="1" stopColor="#000" stopOpacity="0.30" />
        </linearGradient>
        {/* soldan sağa SÜZÜLEN ışık bandı (parlak sweep) */}
        <linearGradient id={shId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g filter={`url(#${fId})`}>
        <rect width="36" height="24" fill="#E30A17" />
        <circle cx="13" cy="12" r="6" fill="#fff" />
        <circle cx="14.9" cy="12" r="4.8" fill="#E30A17" />
        <path transform="translate(21 12) scale(0.62) rotate(-18)" d="M0,-5 L1.18,-1.62 4.76,-1.55 1.9,0.62 2.94,4.05 0,2 -2.94,4.05 -1.9,0.62 -4.76,-1.55 -1.18,-1.62 Z" fill="#fff" />
        {/* kumaş hacmi (kıvrımla birlikte bükülür) */}
        <rect width="36" height="24" fill={`url(#${volId})`} />
        {/* süzülen ışık (kumaş üzerinde gezen parıltı) */}
        <rect width="36" height="24" fill={`url(#${shId})`}>
          <animate attributeName="x" values="-36;36" dur="3.8s" repeatCount="indefinite" />
        </rect>
      </g>
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
            {/* TR bayrağı kendi SVG filtresiyle 3B dalgalanır (CSS .flag-* artık gerekmez); diğerleri sade */}
            <Comp />
          </button>
        )
      })}
    </div>
  )
}
