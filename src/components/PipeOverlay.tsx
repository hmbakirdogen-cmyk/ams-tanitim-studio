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

function fmt(v: number, d: number): string {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
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
          {/* Hangi bilesen DEVREDE: Tasarruf=oransal regulator, Kesinti=tahliye valfi */}
          {(mode === 'standby' || mode === 'isolation') && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {mode === 'standby' && (
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(54,224,200,0.18)', color: '#36E0C8' }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#36E0C8', boxShadow: '0 0 6px #36E0C8' }} /> {t('Regülatör devrede')}
                </span>
              )}
              {mode === 'isolation' && (
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(255,176,77,0.18)', color: '#FFB04D' }}>
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
      <div className="absolute bottom-7 left-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
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
                <span className="num text-2xl font-bold leading-none text-[var(--ink)]">{fmt(v, m.digits)}</span>
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

      {/* ALT: zaman/akis aciklamasi */}
      <div className="absolute inset-x-3 bottom-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-[var(--ink-soft)]" style={shadow}>
        <span>{t('giriş')} →</span>
        <span>{t('hava soldan sağa akıyor · sağ uç = anlık çıkış')}</span>
        <span>→ {t('çıkış')}</span>
      </div>
    </div>
  )
}
