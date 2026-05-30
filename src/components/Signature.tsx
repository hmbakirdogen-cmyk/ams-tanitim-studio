/*
 * NE      : İmza satırı - "This software is crafted with precision & passion by Mehmet Bakırdöğen". HER SAYFADA görünür (Sidebar + Giriş).
 * NEDEN   : Mehmet Abi: "programın her yerinde bu yazılım ... Mehmet Bakırdöğen imzası olsun; en havalı İngilizce cümle". İmza HEP İngilizce
 *           (dil TR/EN/JA olsa da değişmez) — markanın "Expertise – Passion – Automation" ruhuyla uyumlu, zarif/ince.
 * NASIL   : Saf görsel; ince/soluk, küçük punto; isim SMC mavisiyle hafif vurgulu. compact prop ile dar alanlarda (Sidebar) sade.
 * YAN ETKI: Yok. Çeviri yok (kasıtlı, sabit İngilizce imza).
 */

export function Signature({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`select-none text-center leading-snug text-[var(--ink-soft)] ${compact ? 'text-[9.5px]' : 'text-[10.5px]'}`}
      style={{ opacity: 0.72 }}
      title="This software is crafted with precision & passion by Mehmet Bakırdöğen"
    >
      This software is crafted with precision &amp; passion by{' '}
      <span className="font-semibold" style={{ color: 'var(--smc-bright)' }}>Mehmet Bakırdöğen</span>
    </div>
  )
}
