/*
 * NE      : Pnomatik Hat grafiginin 2B ANLATIM katmani - mod (neden artip azaldigi) + her sensorun ANLIK degeri+birimi (boru
 *           sirasinda, cikis tarafinda) + ESIK durumu (esigin altinda/ustunde) + kisa aciklama. Cizgileri/borulari KAPATMAZ.
 * NEDEN   : Mehmet Abi: "grafik kendi basina bir sey ANLATSIN: mod, basinc<->debi, esik, anlik deger+birim hep net olsun".
 * NASIL   : Ust solda mod rozeti + neden notu (MODE_DESC). Sagda boru sirasiyla dikey deger kartlari (renk = boru rengi).
 *           Esik verilirse 'esik: X' + ok (altinda/ustunde). force-dark-surface -> metin gunduz temasinda da net.
 * YAN ETKI: pointer-events yok (tiklamayi gecirir). Renkler metrics.ts ile birebir (kimlik bagi).
 */
import { MODE_LABEL, MODE_DESC, MODE_COLOR, type Mode } from '@/data/types'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { MetricDef } from '@/data/metrics'
import type { Reading } from '@/data/types'

const shadow = { textShadow: '0 1px 5px rgba(2,4,10,0.95), 0 0 2px rgba(2,4,10,0.9)' }

function fmt(v: number, d: number): string {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)
}

export function PipeOverlay({
  reading,
  metrics,
  mode,
  thresholds = {},
}: {
  reading: Reading | null
  metrics: MetricDef[]
  mode: Mode
  thresholds?: Record<string, { value: number; label: string } | undefined>
}) {
  const modeColor = MODE_COLOR[mode]
  return (
    <div className="force-dark-surface pointer-events-none absolute inset-0">
      {/* Mod tonu - ust kenarda cok hafif renk (neyin surdugunu ima eder) */}
      <div className="absolute inset-x-0 top-0 h-24" style={{ background: `linear-gradient(to bottom, ${modeColor}22, transparent)` }} />

      {/* UST SOL: calisma modu + NEDEN (artip azalmanin sebebi) */}
      <div className="absolute left-3 top-3 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-[#050b18]/75 px-3.5 py-2 backdrop-blur-md">
        <span className="relative grid h-2.5 w-2.5 place-items-center">
          <span className="live-ring absolute h-2.5 w-2.5 rounded-full" style={{ background: modeColor }} />
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wide" style={{ color: modeColor }}>CANLI</span>
            <span className="text-sm font-bold text-white">{MODE_LABEL[mode]}</span>
          </div>
          <div className="text-[11px] text-[var(--ink-soft)]">{MODE_DESC[mode]}</div>
        </div>
      </div>

      {/* UST SAG: kisa anahtar aciklama */}
      <div className="absolute right-3 top-3 rounded-2xl border border-white/10 bg-[#050b18]/75 px-3 py-2 text-right backdrop-blur-md">
        <div className="text-[11px] font-semibold text-white">Pnömatik Hat</div>
        <div className="text-[10px] text-[var(--ink-soft)]">akış hızı + dolum = anlık değer</div>
      </div>

      {/* SAG DIKEY: boru sirasinda anlik degerler (cikis tarafi). Renk = boru rengi. */}
      <div className="absolute inset-y-0 right-3 flex flex-col justify-around py-20">
        {metrics.map((m) => {
          const v = reading ? m.get(reading) : m.min
          const thr = thresholds[m.key]
          const below = thr ? v < thr.value : false
          return (
            <div key={m.key} className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: m.color, boxShadow: `0 0 8px ${m.color}` }} />
                <span className="text-[11px] font-medium text-[var(--ink-soft)]" style={shadow}>{m.name}</span>
              </div>
              <div className="flex items-baseline gap-1" style={shadow}>
                <span className="num text-2xl font-bold leading-none text-white">{fmt(v, m.digits)}</span>
                <span className="text-[11px] font-medium text-[var(--ink-soft)]">{m.unitShort}</span>
              </div>
              {thr && (
                <div className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: below ? '#FFB04D' : 'var(--c-saving)' }}>
                  {below ? <ArrowDown size={11} /> : <ArrowUp size={11} />}
                  <span style={shadow}>eşik: {thr.label}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ALT: zaman/akis aciklamasi */}
      <div className="absolute inset-x-3 bottom-2 flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-[var(--ink-soft)]" style={shadow}>
        <span>giriş →</span>
        <span>hava soldan sağa akıyor · sağ uç = anlık çıkış</span>
        <span>→ çıkış</span>
      </div>
    </div>
  )
}
