/*
 * NE      : Pnomatik Hat grafiginin 2B ANLATIM katmani - mod (neden artip azaldigi) + her sensorun ANLIK degeri+birimi (boru
 *           sirasinda, cikis tarafinda) + ESIK durumu (esigin altinda/ustunde) + kisa aciklama. Cizgileri/borulari KAPATMAZ.
 * NEDEN   : Mehmet Abi: "grafik kendi basina bir sey ANLATSIN: mod, basinc<->debi, esik, anlik deger+birim hep net olsun".
 * NASIL   : Ust solda mod rozeti + neden notu (MODE_DESC). SOL dikey OPAK kartta anlik deger+birim (Mehmet Abi: "veriler pencerenin
 *           soluna, ARKASINDA hareketli animasyon OLMASIN"): bg TAM opak -> akis animasyonu readout arkasinda gorunmez (renk = boru rengi).
 *           Esik verilirse 'esik: X' + ok (altinda/ustunde). force-dark-surface -> metin gunduz temasinda da net.
 * YAN ETKI: pointer-events yok (tiklamayi gecirir). Renkler metrics.ts ile birebir (kimlik bagi). Veriler artik SOLDA (eskiden sagdaydi).
 */
import { MODE_LABEL, MODE_DESC, MODE_COLOR, type Mode } from '@/data/types'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { MetricDef } from '@/data/metrics'
import type { Reading } from '@/data/types'
import { useLang } from '@/i18n'
import { localeOf } from '@/lib/format'
import { isMobileDevice } from '@/lib/device'

function fmt(v: number, d: number): string {
  return new Intl.NumberFormat(localeOf(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
}

export function PipeOverlay({
  reading,
  metrics,
  mode,
  thresholds = {},
  theme = 'dark',
}: {
  reading: Reading | null
  metrics: MetricDef[]
  mode: Mode
  thresholds?: Record<string, { value: number; label: string } | undefined>
  theme?: 'dark' | 'light'
}) {
  const { t } = useLang()
  const modeColor = MODE_COLOR[mode]
  // NE: Cihaz mobil mi? bir kez hesaplanir. NEDEN: Mehmet Abi — dar Akis penceresinde alt-sol izgara cihaz gorseli+rozetle cakisiyor;
  //   mobile ozgu sikilastirma gerek. NASIL: isMobileDevice() (lib/device). YAN ETKI: masaustu (lg+) dalini DEGISTIRMEZ, sadece mobil dallanir.
  const mobile = isMobileDevice()
  // Gölge TEMA-UYUMLU: gündüz BEYAZ hale (koyu metin açık zemin/akış üstünde okunur) / gece KOYU hale (açık metin okunur).
  const shadow = theme === 'light'
    ? { textShadow: '0 1px 4px rgba(255,255,255,0.92), 0 0 2px rgba(255,255,255,0.85)' }
    : { textShadow: '0 1px 5px rgba(2,4,10,0.95), 0 0 2px rgba(2,4,10,0.9)' }
  return (
    // force-dark-surface KÖKTEN kaldırıldı (Mehmet Abi: gündüz modunda veriler/yazılar zor okunuyordu) → çerçevesiz metin TEMAYLA uyumlu (gündüz KOYU).
    //   Koyu-zeminli rozet + sağ-üst nota AYRICA force-dark-surface alır (kendi içlerinde açık metin kalsın).
    <div className="pointer-events-none absolute inset-0">
      {/* Mod tonu - ust kenarda cok hafif renk (neyin surdugunu ima eder) */}
      <div className="absolute inset-x-0 top-0 h-24" style={{ background: `linear-gradient(to bottom, ${modeColor}22, transparent)` }} />

      {/* UST SOL: calisma modu + NEDEN (artip azalmanin sebebi) — koyu zemin → force-dark-surface (acik metin) */}
      <div className="force-dark-surface absolute left-3 top-3 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[#050b18]/75 px-3.5 py-2 backdrop-blur-md">
        <span className="relative grid h-2.5 w-2.5 place-items-center">
          <span className="live-ring absolute h-2.5 w-2.5 rounded-full" style={{ background: modeColor }} />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wide" style={{ color: modeColor }}>{t('CANLI')}</span>
            <span className="text-sm font-bold text-white">{t(MODE_LABEL[mode])}</span>
          </div>
          <div className="text-[11px] text-[var(--ink-soft)]">{t(MODE_DESC[mode])}</div>
          {/* Hangi bilesen DEVREDE: Tasarruf=oransal regulator, Kesinti=tahliye valfi.
              NE: Cipleri saran kabi force-dark-surface ile sariyoruz + cip zemini koyu tabanli (0.18->0.28). NEDEN: Mehmet Abi —
              kok force-dark-surface KALKTIGI icin gunduzde acik glass uzerinde soluk cipler dusuk kontrast/zor okunuyordu. NASIL: ust mod
              rozeti gibi force-dark-surface daima koyu zemin verir + renkli ton koyu #050b18 taban uzerine biner. YAN ETKI: gece gorunum
              neredeyse ayni (zaten koyuydu), gunduz net okunur; cip parlak metin rengi korunur. */}
          {(mode === 'standby' || mode === 'isolation') && (
            <div className="force-dark-surface mt-1.5 flex flex-wrap gap-1.5">
              {mode === 'standby' && (
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'linear-gradient(rgba(54,224,200,0.28), rgba(54,224,200,0.28)), #050b18', color: '#36E0C8' }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#36E0C8', boxShadow: '0 0 6px #36E0C8' }} /> {t('Regülatör devrede')}
                </span>
              )}
              {mode === 'isolation' && (
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'linear-gradient(rgba(255,176,77,0.28), rgba(255,176,77,0.28)), #050b18', color: '#FFB04D' }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#FFB04D', boxShadow: '0 0 6px #FFB04D' }} /> {t('Valf devrede')}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* UST SAG: kisa anahtar aciklama — koyu zemin → force-dark-surface (acik metin) */}
      <div className="force-dark-surface absolute right-3 top-3 rounded-2xl border border-white/10 bg-[#050b18]/75 px-3 py-2 text-right backdrop-blur-md">
        <div className="text-[11px] font-semibold text-white">{t('Pnömatik Hat')}</div>
        <div className="text-[10px] text-[var(--ink-soft)]">{t('akış hızı + dolum = anlık değer')}</div>
      </div>

      {/* SOL-ALT anlık değerler (Mehmet Abi: akışın ALTINDA temiz bölgede → DIŞ ÇERÇEVE YOK; değerler HİYERARŞİK/İRİ yüzer.
          2 sütun grid; ad küçük (ikincil) + İRİ beyaz değer (birincil) + birim/eşik küçük. text-shadow → çerçevesiz okunaklı. */}
      {/* NE: Mobilde tek sutun + sikistirilmis konum. NEDEN: Mehmet Abi — dar Akis penceresinde 2-sutun izgara cihaz gorseli+ust rozetle
          ust uste biniyordu. NASIL: mobile ? tek sutun (grid-cols-1) + daha sıkı bottom/gap, masaustunde AYNEN grid-cols-2/gap-x-6. YAN ETKI:
          masaustu (lg+) gorunum DEGISMEZ; mobilde izgara daralip cakisma cozulur. */}
      <div className={`absolute left-3 grid gap-y-2.5 ${mobile ? 'bottom-6 grid-cols-1 gap-x-0' : 'bottom-7 grid-cols-2 gap-x-6'}`}>
        {metrics.map((m) => {
          const v = reading ? m.get(reading) : m.min
          const thr = thresholds[m.key]
          const below = thr ? v < thr.value : false
          return (
            <div key={m.key} className="flex flex-col items-start leading-none">
              <div className="flex items-center gap-1" style={shadow}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color, boxShadow: `0 0 6px ${m.color}` }} />
                <span className="text-[11px] font-medium text-[var(--ink-soft)]">{t(m.name)}</span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-1" style={shadow}>
                {/* Iri rakam: mobilde text-lg (kucuk, sikisik pencereye sigsin), masaustunde AYNEN text-2xl. */}
                <span className={`num font-bold leading-none text-[var(--ink)] ${mobile ? 'text-lg' : 'text-2xl'}`}>{fmt(v, m.digits)}</span>
                <span className="text-[11px] font-medium text-[var(--ink-soft)]">{t(m.unitShort)}</span>
                {thr && (
                  <span className="ml-0.5 flex items-center gap-0.5 text-[9px]" style={{ color: below ? '#FFB04D' : 'var(--c-saving)' }}>
                    {below ? <ArrowDown size={9} /> : <ArrowUp size={9} />}{thr.label}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ALT: zaman/akis aciklamasi. OKUNABILIRLIK (Mehmet Abi: "yazi urunun beyazina gelince okunmuyor"): her etikete
          KOYU CAM PILL -> beyaz urun ustunde de, koyu sahnede de NET okunur (askeri nizam = tutarli muamele). */}
      <div className="absolute inset-x-3 bottom-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-[var(--ink-soft)]" style={shadow}>
        <span className="rounded-md bg-[#06101e]/55 px-1.5 py-[2px] backdrop-blur-[3px]">{t('giriş')} →</span>
        {/* NE: Ortadaki uzun aciklamayi mobilde gizle (yan giris/cikis etiketleri kalir). NEDEN: Mehmet Abi — dar mobil pencerede orta metin
            sıkışıp diger etiketlere/izgaraya biniyor + eskiden CSS hidden sm:block (640px) ile gizleniyordu, izgara/rakam ise JS mobile
            bayragiyla -> dar masaustunde ayrisiyordu. NASIL: ayni mobile (isMobileDevice) bayragina baglandi -> TEK tutarli mobil olcut.
            YAN ETKI: masaustu (lg+) AYNEN gorunur; sadece mobil/masaustu ayrismasi giderilir. */}
        {!mobile && <span className="rounded-md bg-[#06101e]/55 px-1.5 py-[2px] backdrop-blur-[3px]">{t('hava soldan sağa akıyor · sağ uç = anlık çıkış')}</span>}
        <span className="rounded-md bg-[#06101e]/55 px-1.5 py-[2px] backdrop-blur-[3px]">→ {t('çıkış')}</span>
      </div>
    </div>
  )
}
