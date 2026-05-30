/*
 * NE      : SMC marka kimligi - GERCEK logo (public/smc-logo.png) BOMBELI CAM 3D sunumla; dosya yoksa 3D "SMC" wordmark'a duser.
 * NEDEN   : Mehmet Bey: "ekteki gercek logoyu kullan; bombeli yuzey + cam kapli, sonuna kadar gercek 3D, 8K". Slogan logoda zaten var.
 * NASIL   : Goruntuyu onceden yukle (imgOk); cam gloss (ust sheen) + bombe golge + glow + derinlik. Yoksa Smc3D + slogan metni.
 * YAN ETKI: Logo dosyasi public/'e konunca otomatik gelir (offline; build'e gomulur). 8K kalite = yuksek cozunurluklu kaynak.
 */
import { useEffect, useState, type CSSProperties } from 'react'
import { asset } from '@/lib/asset'
import { useLang } from '@/i18n'

export const SMC_SLOGAN = 'Expertise – Passion – Automation'
const LOGO_SRC = asset('smc-logo.svg') // base-uyumlu (alt-yol/offline)

// 3D ekstrüzyonlu "SMC" wordmark (gercek logo dosyasi yoksa vekil)
function Smc3D({ height }: { height: number }) {
  const fs = height
  const step = Math.max(0.6, fs * 0.04)
  const layers = 6
  const base: CSSProperties = { fontSize: fs, fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1, fontFamily: "'Inter Variable', Inter, sans-serif" }
  return (
    <span className="relative inline-block" style={{ filter: `drop-shadow(0 ${fs * 0.06}px ${fs * 0.14}px rgba(0,0,0,0.45)) drop-shadow(0 0 ${fs * 0.16}px rgba(46,155,255,0.5))` }}>
      {Array.from({ length: layers }).map((_, i) => (
        <span key={i} aria-hidden className="absolute left-0 top-0 select-none" style={{ ...base, color: i < layers - 2 ? '#062f6a' : '#0a4fae', transform: `translate(${(layers - i) * step}px, ${(layers - i) * step}px)` }}>SMC</span>
      ))}
      <span className="relative select-none" style={{ ...base, color: 'transparent', backgroundImage: 'linear-gradient(160deg, #8fd0ff, #2E9BFF 45%, #0072CE 75%, #024a96)', WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>SMC</span>
    </span>
  )
}

// Gercek beyaz SMC logosu - ELIT bombeli (convex) cam/metal rozet; logo ISIK SACAR (glow). Olculer height'e oranli.
function LogoImage({ height }: { height: number }) {
  const logoH = height * 0.78 // marka daha IRI (rozet ayagi ~ayni -> taşmaz); Mehmet Abi: logolari buyut
  return (
    <div
      className="relative inline-flex items-center justify-center overflow-hidden"
      style={{
        padding: `${height * 0.11}px ${height * 0.16}px`, // padding azaldi -> ayni footprint'te daha buyuk logo
        borderRadius: height * 0.24,
        background: 'linear-gradient(157deg, #3aa0f7 0%, #0f7bd6 38%, #0067bd 64%, #013f86 100%)',
        boxShadow: [
          `0 ${height * 0.16}px ${height * 0.4}px -${height * 0.08}px rgba(2,14,36,0.78)`, // derin zemin golgesi (oturmus)
          `0 0 ${height * 0.6}px -${height * 0.18}px rgba(46,155,255,0.9)`, // mavi ambians halesi (isik sacar)
          `inset 0 ${height * 0.02}px 0 rgba(255,255,255,0.65)`, // ust parlak kenar (cam)
          `inset 0 -${height * 0.09}px ${height * 0.18}px rgba(2,14,36,0.5)`, // alt ic golge (bombe)
          `inset 0 0 0 1px rgba(255,255,255,0.22)`, // ince parlak cerceve (elit)
        ].join(', '),
      }}
    >
      {/* Logo (yazi+simge) - beyaz, ISIK SACAN nabizli glow */}
      <img
        src={LOGO_SRC}
        alt="SMC"
        className="smc-logo-glow"
        style={{ height: logoH, width: 'auto', display: 'block', position: 'relative', zIndex: 1 }}
      />
      {/* Cam ust sheen - bombeli yuzey parlamasi (convex), keskin diagonal */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ borderRadius: 'inherit', background: 'radial-gradient(135% 85% at 26% -8%, rgba(255,255,255,0.6), rgba(255,255,255,0.12) 40%, transparent 62%)' }}
      />
      {/* Alt hafif ic isik - cam derinligi */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ borderRadius: 'inherit', background: 'radial-gradient(120% 70% at 72% 115%, rgba(120,200,255,0.28), transparent 55%)' }}
      />
    </div>
  )
}

interface SmcLogoProps {
  size?: number
  withText?: boolean
  slogan?: boolean
  /* stack: büyük logo ÜSTTE, marka yazısı ALTTA 2 satır (Mehmet Abi: paneldeki logoyu büyüt, yazı altında 2 satır). */
  stack?: boolean
}

export function SmcLogo({ size = 40, withText = true, slogan = false, stack = false }: SmcLogoProps) {
  const { t } = useLang()
  const [imgOk, setImgOk] = useState(false)
  useEffect(() => {
    const img = new Image()
    img.onload = () => setImgOk(true)
    img.onerror = () => setImgOk(false)
    img.src = LOGO_SRC
  }, [])

  const visual = imgOk ? <LogoImage height={size} /> : <Smc3D height={size} />

  if (withText) {
    // stack: logo üstte, yazı altında (büyük logoya yer açar); değilse klasik yan yana.
    return (
      <div className={stack ? 'flex select-none flex-col items-start gap-2.5' : 'flex select-none items-center gap-3'}>
        {visual}
        <div className="leading-tight">
          <div className="text-[15px] font-semibold text-[var(--ink)]">{t('Hava Yönetim Sistemi')}</div>
          <div className="text-[11px] font-medium tracking-wide text-[var(--ink-soft)]">{t('Canlı Tanıtım Stüdyosu')}</div>
          {/* Slogan SADECE gercek logo YOKSA (logoda zaten basili - duplikasyon olmasin) */}
          {slogan && !imgOk && <div className="mt-0.5 text-[10px] italic text-[var(--ink-soft)]">{SMC_SLOGAN}</div>}
        </div>
      </div>
    )
  }
  return (
    <div className="flex select-none flex-col items-center gap-2">
      {visual}
      {slogan && !imgOk && (
        <div className="text-center text-[11px] font-medium italic tracking-wide text-[var(--ink-soft)]">{SMC_SLOGAN}</div>
      )}
    </div>
  )
}
