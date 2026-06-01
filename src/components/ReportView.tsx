/*
 * NE      : Yazdirilabilir VERI RAPORU ekrani - secilen tarih/saat araligindaki TUM verilerin analizi tek belgede:
 *           ozet KPI'lar + mod dagilimi + tasarruf (TL/kWh/CO2) + her sensor istatistik & grafik. Yazdir/PDF + CSV/JSON.
 * NEDEN   : Mehmet Bey: "aralik secilince 'Rapor Ver' -> o araligin tum analizini AYRI ekrana doksun; CIKTI alinabilsin".
 * NASIL   : Tam ekran (fixed) acik 'belge' yaprak; arac cubugu (yazdirilmaz) + .report-sheet (yazdirilir, print CSS index.css'te).
 *           Tasarruf mevcut paternle (litersToSavings/tickLitersSaved + useEconomy) tutarli; her degerin yaninda BIRIMI (KATI).
 * YAN ETKI: Saf gorsel; veri disaridan gelir (secili pencere). window.print() tarayici yazdirma/PDF (offline, sunucusuz).
 */
import { motion } from 'framer-motion'
import { X, Printer, FileDown, Clock, Layers, PiggyBank, Database } from 'lucide-react'
import { Sparkline } from './Sparkline'
import { downsample } from '@/lib/series'
import { useMetrics } from '@/data/metrics'
import { useEconomy } from '@/data/economy'
import { useModel } from '@/data/model'
import { MODE_LABEL, type Mode } from '@/data/types'
import { litersToSavings, tickLitersSaved } from '@/lib/savings'
import { pointsToCSV, download } from '@/data/recordings'
import { fmtDateTime, fmtClock } from '@/lib/datetime'
import { useEscapeKey } from '@/hooks/useEscapeKey'
import { fmtInt, fmt1, fmtCompact, fmtTLCompact } from '@/lib/format'
import { PRODUCT } from '@/data/product'
import { useLang } from '@/i18n'
import type { Reading } from '@/data/types'

const fmt = (v: number, d: number) =>
  new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)

// Rapor BEYAZ KAGIT icin bilerek KOYU mod varyanti (ekran paleti types.MODE_COLOR'dan ayri - yazdirmada okunaklilik).
const MODE_COLOR: Record<Mode, string> = { normal: '#0072CE', standby: '#1f9d57', isolation: '#c77700' }

function stats(series: number[]) {
  if (!series.length) return { min: 0, max: 0, avg: 0 }
  let min = series[0]
  let max = series[0]
  let sum = 0
  for (const v of series) {
    if (v < min) min = v
    if (v > max) max = v
    sum += v
  }
  return { min, max, avg: sum / series.length }
}

export function ReportView({
  points,
  startedAt,
  rangeStart,
  rangeEnd,
  title,
  customer,
  generatedAt,
  onClose,
}: {
  points: Reading[] // secilen araliga FILTRELENMIS noktalar
  startedAt: number
  rangeStart: number
  rangeEnd: number
  title: string
  customer?: import('@/data/recordings').CustomerInfo // saha/musteri is bilgisi -> rapor basligina basilir
  generatedAt: number
  onClose: () => void
}) {
  const { t } = useLang()
  const metrics = useMetrics()
  const { economy } = useEconomy()
  const { model } = useModel()
  useEscapeKey(onClose) // Escape ile kapat (QA)

  const n = points.length
  const spanSec = n > 1 ? (points[n - 1].t - points[0].t) / 1000 : 0

  // Mod dagilimi
  const modeCount: Record<Mode, number> = { normal: 0, standby: 0, isolation: 0 }
  points.forEach((r) => (modeCount[r.mode] += 1))
  const total = n || 1

  // Secili aralikta tasarruf (mevcut paternle).
  // dt esigi: canli tik ~0,08 sn; KALICI GECMIS ise dakikalik (dt=60 sn). Esik 120 sn -> hem canli hem dakikalik
  // ardisik ornekler SAYILIR; ama uygulama kapaliyken olusan BUYUK bosluklar (saatler/gunler) sayilmaz (yanlis tasarruf olmaz).
  let liters = 0
  for (let i = 1; i < n; i++) {
    const dt = (points[i].t - points[i - 1].t) / 1000
    if (dt > 0 && dt < 120) liters += tickLitersSaved(points[i].flow, dt, economy.baselineFlow)
  }
  const sv = litersToSavings(liters, economy)

  const safeName = title.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 40) || 'rapor'
  const exportCSV = () => download(`${safeName}_rapor.csv`, pointsToCSV(points, startedAt), 'text/csv;charset=utf-8')
  const exportJSON = () =>
    download(
      `${safeName}_rapor.json`,
      JSON.stringify({ title, customer, model: model.code, rangeStart, rangeEnd, generatedAt, economy, points }, null, 2),
      'application/json',
    )

  const Kpi = ({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) => (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="text-[11px] font-medium text-slate-500">{t(label)}</div>
      <div className="num text-lg font-bold text-slate-900">
        {value} <span className="text-xs font-medium text-slate-400">{t(unit)}</span>
      </div>
      <span className="mt-1 block h-0.5 w-8 rounded-full" style={{ background: color }} />
    </div>
  )

  return (
    <motion.div
      className="report-shell fixed inset-0 z-[70] overflow-y-auto bg-black/70 p-4 md:p-8"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      /* KRİTİK (#QA): ReportView, RangeAnalysisModal backdrop'unun DOM-çocuğu → rapor içine tıklama köpürüp ALT modalın
         onClose'unu tetikliyordu (rapora dokununca analiz penceresi de kapanıyordu). stopPropagation köpürmeyi keser.
         Boş zemine (kendi backdrop'u) tıklama = kapat; rapor kâğıdı kendi içinde stopPropagation yapar. Escape de kapatır. */
      onClick={onClose}
    >
      {/* Arac cubugu - YAZDIRILMAZ. stopPropagation: buton/cubuk tiklamasi backdrop onClose'una kopurmesin (sadece bos zemin kapatir). */}
      <div className="no-print mx-auto mb-3 flex max-w-[860px] items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20">
          <X size={15} /> {t('Kapat')}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20"><FileDown size={15} /> CSV</button>
          <button onClick={exportJSON} className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/20"><FileDown size={15} /> JSON</button>
          <button onClick={() => window.print()} className="keep-white flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition" style={{ background: 'linear-gradient(135deg,#0072CE,#2E9BFF)' }}>
            <Printer size={15} /> {t('Yazdır / PDF')}
          </button>
        </div>
      </div>

      {/* RAPOR BELGESI - yazdirilir (.report-sheet). stopPropagation: kagida tiklama kapatmayi tetiklemesin (sadece bos zemin kapatir). */}
      <div className="report-sheet mx-auto max-w-[860px] rounded-xl bg-white p-8 text-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Baslik */}
        <div className="flex items-start justify-between border-b-2 border-[#0072CE] pb-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0072CE]">{PRODUCT.brand} · {t(PRODUCT.name)}</div>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{t('Veri Raporu')}</h1>
            <div className="mt-1 text-sm text-slate-500">{t(title)}</div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div className="num text-base font-bold text-slate-900">{model.code}</div>
            <div className="mt-1">{t('Oluşturma')}: {fmtDateTime(generatedAt)}</div>
          </div>
        </div>

        {/* ISLETME BILGILERI - saha/musteri (varsa). Mehmet Abi: "kendi raporlarina bu analizleri ekleyebilsin" -> resmi rapor basligi. */}
        {customer && (customer.company || customer.contact || customer.location || customer.note) && (
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1.5 rounded-lg border border-slate-200 bg-white p-3 text-sm md:grid-cols-2">
            {customer.company && <div><span className="text-slate-500">{t('İşletme')}: </span><b className="text-slate-900">{customer.company}</b></div>}
            {customer.contact && <div><span className="text-slate-500">{t('Yetkili')}: </span><b className="text-slate-900">{customer.contact}</b></div>}
            {customer.location && <div><span className="text-slate-500">{t('Lokasyon')}: </span><b className="text-slate-900">{customer.location}</b></div>}
            {customer.note && <div className="md:col-span-2"><span className="text-slate-500">{t('Not')}: </span><span className="text-slate-700">{customer.note}</span></div>}
          </div>
        )}

        {/* Aralik ozeti */}
        <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 text-sm md:grid-cols-3">
          <div><span className="text-slate-500">{t('Başlangıç')}: </span><b className="num text-slate-900">{fmtDateTime(rangeStart)}</b></div>
          <div><span className="text-slate-500">{t('Bitiş')}: </span><b className="num text-slate-900">{fmtDateTime(rangeEnd)}</b></div>
          <div><span className="text-slate-500">{t('Süre')}: </span><b className="num text-slate-900">{fmt1(spanSec)} {t('sn')}</b> · <b className="num text-slate-900">{fmtInt(n)}</b> {t('ölçüm')}</div>
        </div>

        {n < 2 ? (
          <div className="mt-6 rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-500">
            {t('Seçilen aralıkta yeterli veri yok. Lütfen daha geniş bir tarih/saat aralığı seçin.')}
          </div>
        ) : (
          <>
            {/* Tasarruf (one cikan) */}
            <div className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-900"><PiggyBank size={16} className="text-[#1f9d57]" /> {t('Bu Aralıktaki Tasarruf')}</div>
            <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi label="Para" value={fmtTLCompact(sv.tl)} unit="" color="#1f9d57" />
              <Kpi label="Enerji" value={fmtCompact(sv.kwh)} unit="kWh" color="#0072CE" />
              <Kpi label="Karbon" value={fmtCompact(sv.co2)} unit="kg CO₂" color="#36a0c8" />
              <Kpi label="Kısılan Hava" value={fmtCompact(sv.liters)} unit="litre" color="#c77700" />
            </div>
            <div className="mt-1.5 text-[11px] text-slate-400">
              {fmt1(economy.priceTL)} {t('₺/kWh elektrik fiyatı ve')} {fmtInt(economy.baselineFlow)} {t('l/dak normal tüketim varsayımıyla.')}
            </div>

            {/* Mod dagilimi */}
            <div className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-900"><Layers size={16} className="text-[#0072CE]" /> {t('Mod Dağılımı (süre payı)')}</div>
            <div className="mt-2 space-y-2">
              {(['normal', 'standby', 'isolation'] as Mode[]).map((mo) => {
                const pct = (modeCount[mo] / total) * 100
                return (
                  <div key={mo} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-xs text-slate-600">{t(MODE_LABEL[mo])}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: MODE_COLOR[mo] }} />
                    </div>
                    <span className="num w-12 text-right text-sm font-semibold text-slate-900">%{fmt1(pct)}</span>
                  </div>
                )
              })}
            </div>

            {/* Her sensor: secili aralik detayli */}
            <div className="mt-5 flex items-center gap-2 text-sm font-bold text-slate-900"><Clock size={16} className="text-[#0072CE]" /> {t('Sensör Özetleri')}</div>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
              {metrics.map((m) => {
                const series = points.map(m.get)
                const s = stats(series)
                const Icon = m.icon
                return (
                  <div key={m.key} className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-md" style={{ background: `${m.color}22`, color: m.color }}><Icon size={15} /></span>
                      <span className="text-sm font-semibold text-slate-900">{t(m.name)}</span>
                      <span className="ml-auto text-[11px] text-slate-400">{t(m.unit)}</span>
                    </div>
                    <Sparkline values={downsample(series)} color={m.color} min={m.min} max={m.max} height={44} />
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {([['En düşük', s.min], ['Ortalama', s.avg], ['En yüksek', s.max]] as const).map(([label, val]) => (
                        <div key={label}>
                          <div className="text-[10px] text-slate-400">{t(label)}</div>
                          <div className="num text-sm font-semibold text-slate-900">
                            {fmt(val, m.digits)} <span className="text-[10px] font-normal text-slate-400">{t(m.unitShort)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5"><Database size={12} /> {t('AMS Tanıtım Stüdyosu · çevrimdışı rapor')}</span>
          <span className="num">{fmtClock(generatedAt)}</span>
        </div>
      </div>
    </motion.div>
  )
}
