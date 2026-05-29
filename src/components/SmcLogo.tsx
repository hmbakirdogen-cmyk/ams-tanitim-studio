/*
 * NE      : SMC marka kimligi - GERCEK logo (public/smc-logo.png) BOMBELI CAM 3D sunumla; dosya yoksa 3D "SMC" wordmark'a duser.
 * NEDEN   : Mehmet Bey: "ekteki gercek logoyu kullan; bombeli yuzey + cam kapli, sonuna kadar gercek 3D, 8K". Slogan logoda zaten var.
 * NASIL   : Goruntuyu onceden yukle (imgOk); cam gloss (ust sheen) + bombe golge + glow + derinlik. Yoksa Smc3D + slogan metni.
 * YAN ETKI: Logo dosyasi public/'e konunca otomatik gelir (offline; build'e gomulur). 8K kalite = yuksek cozunurluklu kaynak.
 */
import { useEffect, useState, type CSSProperties } from 'react'

export const SMC_SLOGAN = 'Expertise – Passion – Automation'
const LOGO_SRC = '/smc-logo.svg'

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

// Gercek beyaz SMC logosu - bombeli (convex) cam kapli, parlak SMC-mavisi 3D rozet uzerinde
function LogoImage({ height }: { height: number }) {
  const logoH = height * 0.64
  return (
    <div
      className="relative inline-flex items-center overflow-hidden"
      style={{
        padding: `${height * 0.16}px ${height * 0.22}px`,
        borderRadius: height * 0.24,
        background: 'linear-gradient(160deg, #2491f0 0%, #0072CE 46%, #024a96 100%)',
        boxShadow: `0 ${height * 0.12}px ${height * 0.34}px -${height * 0.1}px rgba(2,16,40,0.7), 0 0 ${height * 0.46}px -${height * 0.2}px rgba(46,155,255,0.75), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -${height * 0.08}px ${height * 0.16}px rgba(2,16,40,0.45)`,
      }}
    >
      <img
        src={LOGO_SRC}
        alt="SMC"
        style={{ height: logoH, width: 'auto', display: 'block', filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.4))' }}
      />
      {/* Cam ust sheen - bombeli yuzey parlamasi (convex) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ borderRadius: 'inherit', background: 'radial-gradient(130% 80% at 28% -5%, rgba(255,255,255,0.5), rgba(255,255,255,0.1) 38%, transparent 60%)' }}
      />
    </div>
  )
}

interface SmcLogoProps {
  size?: number
  withText?: boolean
  slogan?: boolean
}

export function SmcLogo({ size = 40, withText = true, slogan = false }: SmcLogoProps) {
  const [imgOk, setImgOk] = useState(false)
  useEffect(() => {
    const img = new Image()
    img.onload = () => setImgOk(true)
    img.onerror = () => setImgOk(false)
    img.src = LOGO_SRC
  }, [])

  const visual = imgOk ? <LogoImage height={size} /> : <Smc3D height={size} />

  if (withText) {
    return (
      <div className="flex select-none items-center gap-3">
        {visual}
        <div className="leading-tight">
          <div className="text-[15px] font-semibold text-[var(--ink)]">Hava Yönetim Sistemi</div>
          <div className="text-[11px] font-medium tracking-wide text-[var(--ink-soft)]">Canlı Tanıtım Stüdyosu</div>
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
