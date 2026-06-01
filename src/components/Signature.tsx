/*
 * NE      : İmza — "Crafted ... by Mehmet Bakırdöğen" + altında "SMC Kayseri · Authorized Regional Partner"
 *           küçük BadgeCheck (onaylı) rozet ikonuyla. HER SAYFADA (Sidebar) + Giriş ekranında.
 * NEDEN   : Mehmet Abi: (1) eklenen unvan satırının yazı tipini beğenmedi → geniş-aralıklı BÜYÜK HARF KALKTI,
 *           temiz normal-yazım + küçük "authorized" rozeti (havalı/premium dokunuş). (2) "Mehmet Bakırdöğen"
 *           ASLA iki satıra bölünmesin → isim whitespace-nowrap ile tek parça. İmza HEP İngilizce (dil fark etmez).
 * NASIL   : İki satır: (1) crafted-by + isim (SMC mavisi, nowrap). (2) BadgeCheck + "SMC Kayseri" (mavi) ·
 *           "Authorized Regional Partner" (soft). compact = dar alan (Sidebar) için bir tık küçük.
 * YAN ETKI: Yok. Çeviri yok (kasıtlı sabit İngilizce imza). Offline (lucide ikon gömülü).
 */
import { BadgeCheck } from 'lucide-react'

export function Signature({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="select-none text-center leading-snug text-[var(--ink-soft)]"
      style={{ opacity: 0.8 }}
      title="Crafted with precision & passion by Mehmet Bakırdöğen — SMC Kayseri Authorized Regional Partner"
    >
      {/* 1) crafted-by + isim — isim tek parça (whitespace-nowrap), asla bölünmez */}
      <div className={compact ? 'text-[9.5px]' : 'text-[10.5px]'}>
        Crafted with precision &amp; passion by{' '}
        <span className="whitespace-nowrap font-semibold" style={{ color: 'var(--smc-bright)' }}>
          Mehmet Bakırdöğen
        </span>
      </div>
      {/* 2) yetkili bayi rozeti — temiz normal-yazım + onaylı ikon (havalı), geniş-aralıklı caps YOK */}
      <div className={`mt-1 flex items-center justify-center gap-1 font-medium ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
        <BadgeCheck size={compact ? 11 : 12} style={{ color: 'var(--smc-bright)' }} aria-hidden />
        <span className="whitespace-nowrap font-semibold" style={{ color: 'var(--smc-bright)' }}>SMC Kayseri</span>
        <span className="opacity-50">·</span>
        <span className="whitespace-nowrap opacity-70">Authorized Regional Partner</span>
      </div>
    </div>
  )
}
