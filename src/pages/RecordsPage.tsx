/*
 * NE      : Kayitlar sayfasi - su anki oturumu KAYDET, kayitlari listele, zaman-araligi ANALIZ et, CSV/JSON DISA AKTAR, SIL.
 * NEDEN   : Mehmet Bey: "verileri hafizada tutsun; istedigi zaman kolayca kaydetsin/silsin; belli araliklari analiz etsin".
 * NASIL   : recordings deposu (localStorage); RangeAnalysisModal ile aralik secip incele; download() ile dosya indir (offline).
 * YAN ETKI: Veri App'ten (LiveState.log). Tarih/Date.now() uygulama calismasinda kullanilir.
 */
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Save, BarChart3, FileDown, Trash2, Clock, Database, History, CalendarClock, Building2, User as UserIcon, MapPin, StickyNote } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Tilt3D } from '@/components/Tilt3D'
import { RangeAnalysisModal, type RangePreset } from '@/components/RangeAnalysisModal'
import { listRecordings, saveRecording, removeRecording, toCSV, download, type Recording } from '@/data/recordings'
import { useConnection } from '@/data/connection'
import { queryHistory, historyExtent } from '@/data/history'
import { sound } from '@/lib/sound'
import { useLang } from '@/i18n'
import { localeOf } from '@/lib/format'
import type { LiveState } from '@/hooks/useLiveReadings'
import type { Reading } from '@/data/types'

const fmtDate = (ms: number) => new Date(ms).toLocaleString(localeOf(), { dateStyle: 'medium', timeStyle: 'short' })
const durationSec = (pts: Reading[]) => (pts.length > 1 ? (pts[pts.length - 1].t - pts[0].t) / 1000 : 0)
const nf0 = (v: number) => new Intl.NumberFormat(localeOf(), { maximumFractionDigits: 0 }).format(v)
const DAY = 86400000

// Tarihsel rapor icin TAKVIM on-ayarlari (mutlak ms) - gecmis deposunun kapsamina gore.
function calendarPresets(first: number, last: number): RangePreset[] {
  const startOfDay = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime() }
  const today0 = startOfDay(last)
  return [
    { label: 'Bugün', start: today0, end: last },
    { label: 'Dün', start: today0 - DAY, end: today0 },
    { label: 'Son 7 gün', start: last - 7 * DAY, end: last },
    { label: 'Tümü', start: first, end: last },
  ]
}

type AnalyzeState = {
  points: Reading[]
  title: string
  startedAt: number
  customer?: import('@/data/recordings').CustomerInfo // rapora basilacak saha/musteri bilgisi
  presets?: RangePreset[]
  initialStart?: number
  initialEnd?: number
}

export function RecordsPage({ data }: { data: LiveState }) {
  const { t } = useLang()
  const [name, setName] = useState('')
  // Saha/musteri is bilgisi (Mehmet Abi: musteriye gidince isletme bilgisini yazip olcumle birlikte kaydet)
  const [company, setCompany] = useState('')
  const [contact, setContact] = useState('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [list, setList] = useState<Recording[]>(() => listRecordings())
  const [analyze, setAnalyze] = useState<AnalyzeState | null>(null)
  const conn = useConnection()
  const src = conn.settings.mode // aktif kaynak (demo/canli) -> hangi gecmis kovasi
  const hx = historyExtent(src) // kapsam: ilk/son zaman + adet (her render'da taze - data tikiyle yenilenir)

  // Tarihsel rapor: tum gecmisi getir, son 24 saati secili ac, takvim on-ayarlariyla modali ac.
  const openHistory = () => {
    const ext = historyExtent(src)
    if (!ext) return
    const { points, startedAt } = queryHistory(src)
    sound.click()
    setAnalyze({
      points,
      startedAt,
      title: `${t('Geçmiş Veriler')} · ${src === 'demo' ? t('Demo') : t('Canlı Cihaz')}`,
      presets: calendarPresets(ext.first, ext.last),
      initialStart: Math.max(ext.first, ext.last - DAY),
      initialEnd: ext.last,
    })
  }

  const refresh = () => setList(listRecordings())

  const saveNow = () => {
    if (data.log.length === 0) return
    saveRecording(name, data.log, Date.now(), data.startedAt, { company, contact, location, note })
    sound.click()
    setName(''); setCompany(''); setContact(''); setLocation(''); setNote('')
    refresh()
  }
  const del = (id: string) => {
    sound.click()
    removeRecording(id)
    refresh()
  }
  const exportJSON = (rec: Recording) => download(`${rec.name}.json`, JSON.stringify(rec, null, 2), 'application/json')
  const exportCSV = (rec: Recording) => download(`${rec.name}.csv`, toCSV(rec), 'text/csv;charset=utf-8')

  return (
    // pb-20: sag-alt sabit Geri Bildirim FAB'i (bottom-5, h-12) son karti/kaydi ortmesin diye dis kaba alt bosluk (Mehmet Abi).
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1 pb-20">
      <PageHeader
        title="Kayıtlar"
        subtitle="Ölçümleri kaydedin, zaman aralığına göre analiz edin, dışa aktarın"
        right={
          <button onClick={() => setAnalyze({ points: data.log, title: t('Şu Anki Oturum'), startedAt: data.startedAt })} disabled={data.log.length < 2} className="flex items-center gap-1.5 rounded-lg border border-[var(--hair)] px-3 py-2 text-xs font-medium text-[var(--ink-soft)] transition hover:text-white disabled:opacity-40">
            <BarChart3 size={14} /> {t('Şu anki oturumu analiz et / rapor')}
          </button>
        }
      />

      {/* GECMIS VERILER - tarihsel rapor (kalici depo: demo tohumu veya canli birikim) */}
      <Tilt3D className="glass flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center" max={4}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--smc)]/15 text-[var(--smc-bright)]"><History size={22} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-white">{t('Geçmiş Veriler — Tarihsel Rapor')}</div>
          <div className="text-[11px] text-[var(--ink-soft)]">
            {hx
              ? <>{t('Kayıtlı')}: <b className="num text-[var(--ink)]">{nf0(hx.count)}</b> {t('ölçüm')} · ~<b className="num text-[var(--ink)]">{Math.max(1, Math.round((hx.last - hx.first) / DAY))}</b> {t('gün')} ({src === 'demo' ? t('demo') : t('canlı')}). {t('Takvimden gün + saat seçip rapor alın.')}</>
              : <>{t('Henüz geçmiş veri yok. Ürün Ayarları’ndan')} <b className="text-[var(--ink)]">{t('demo geçmişi')}</b> {t('oluşturun ya da cihaz bağlanınca birikir.')}</>}
          </div>
        </div>
        <button onClick={openHistory} disabled={!hx} className="keep-white flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#0072CE,#2E9BFF)' }}>
          <CalendarClock size={15} /> {t('Tarihsel rapor al')}
        </button>
      </Tilt3D>

      {/* Su anki oturumu kaydet + SAHA/MUSTERI is bilgisi (Mehmet Abi: musteriye gidince isletme bilgisini yazip olcumle kaydet) */}
      <Tilt3D className="glass flex flex-col gap-3 rounded-2xl p-4" max={3}>
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--smc)]/15 text-[var(--smc-bright)]"><Save size={20} /></span>
          <div className="text-sm font-semibold text-white">{t('Ölçümü Kaydet')}</div>
          <span className="text-[11px] text-[var(--ink-soft)]">{t('— saha/müşteri bilgisiyle birlikte')}</span>
        </div>
        {/* Isletme bilgileri - hepsi opsiyonel; bos birakilabilir (hizli kayit) */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--hair)] bg-white/[0.03] px-3 py-2">
            <Building2 size={15} className="shrink-0 text-[var(--smc-bright)]" />
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder={t('İşletme / firma adı')}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--ink-soft)]" />
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-[var(--hair)] bg-white/[0.03] px-3 py-2">
            <UserIcon size={15} className="shrink-0 text-[var(--smc-bright)]" />
            <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder={t('Yetkili kişi')}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--ink-soft)]" />
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-[var(--hair)] bg-white/[0.03] px-3 py-2">
            <MapPin size={15} className="shrink-0 text-[var(--smc-bright)]" />
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t('Lokasyon / hat / makine')}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--ink-soft)]" />
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-[var(--hair)] bg-white/[0.03] px-3 py-2">
            <StickyNote size={15} className="shrink-0 text-[var(--smc-bright)]" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Saha notu (opsiyonel)')}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--ink-soft)]" />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('Kayıt adı (boş bırakılırsa işletme adı kullanılır)')}
            className="num w-full rounded-lg border border-[var(--hair)] bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--ink-soft)]"
          />
          <button onClick={saveNow} disabled={data.log.length === 0} className="keep-white shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#0072CE,#2E9BFF)' }}>
            {t('Kaydet')}
          </button>
        </div>
      </Tilt3D>

      {/* Kayit listesi */}
      {list.length === 0 ? (
        <div className="glass flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl p-10 text-center">
          <Database size={32} className="text-[var(--ink-soft)]" />
          <div className="text-sm text-[var(--ink-soft)]">{t('Henüz kayıt yok. Yukarıdan şu anki oturumu kaydedin.')}</div>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((rec) => (
            <div key={rec.id} className="glass flex items-center gap-4 rounded-2xl px-5 py-3.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{rec.name}</div>
                {/* SAHA/MUSTERI bilgisi - varsa kart altinda gorunur (kolay erisim) */}
                {rec.customer && (rec.customer.company || rec.customer.contact || rec.customer.location) && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--smc-bright)]">
                    {rec.customer.company && <span className="flex items-center gap-1"><Building2 size={10} /> {rec.customer.company}</span>}
                    {rec.customer.contact && <span className="flex items-center gap-1"><UserIcon size={10} /> {rec.customer.contact}</span>}
                    {rec.customer.location && <span className="flex items-center gap-1"><MapPin size={10} /> {rec.customer.location}</span>}
                  </div>
                )}
                <div className="mt-0.5 flex items-center gap-3 text-[11px] text-[var(--ink-soft)]">
                  <span className="flex items-center gap-1"><Clock size={11} /> {fmtDate(rec.createdAt)}</span>
                  <span className="num">{rec.points.length} {t('ölçüm')}</span>
                  <span className="num">{new Intl.NumberFormat(localeOf(), { maximumFractionDigits: 0 }).format(durationSec(rec.points))} {t('sn')}</span>
                </div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button onClick={() => setAnalyze({ points: rec.points, title: rec.name, startedAt: rec.startedAt, customer: rec.customer })} title={t('Aralık analizi / rapor')} className="flex items-center gap-1.5 rounded-lg border border-[var(--hair)] px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition hover:text-white"><BarChart3 size={14} /> {t('Analiz')}</button>
                <button onClick={() => exportCSV(rec)} title={t('CSV indir')} className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--hair)] text-[var(--ink-soft)] transition hover:text-white"><FileDown size={15} /></button>
                <button onClick={() => exportJSON(rec)} title={t('JSON indir')} className="rounded-lg border border-[var(--hair)] px-2 py-1.5 text-[11px] font-medium text-[var(--ink-soft)] transition hover:text-white">JSON</button>
                <button onClick={() => del(rec.id)} title={t('Sil')} className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--hair)] text-[#ff8a8a] transition hover:bg-white/5"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {analyze && (
          <RangeAnalysisModal key="range" points={analyze.points} startedAt={analyze.startedAt} title={analyze.title} customer={analyze.customer} presets={analyze.presets} initialStart={analyze.initialStart} initialEnd={analyze.initialEnd} onClose={() => setAnalyze(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
