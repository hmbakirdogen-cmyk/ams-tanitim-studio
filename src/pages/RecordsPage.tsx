/*
 * NE      : Kayitlar sayfasi - su anki oturumu KAYDET, kayitlari listele, zaman-araligi ANALIZ et, CSV/JSON DISA AKTAR, SIL.
 * NEDEN   : Mehmet Bey: "verileri hafizada tutsun; istedigi zaman kolayca kaydetsin/silsin; belli araliklari analiz etsin".
 * NASIL   : recordings deposu (localStorage); RangeAnalysisModal ile aralik secip incele; download() ile dosya indir (offline).
 * YAN ETKI: Veri App'ten (LiveState.log). Tarih/Date.now() uygulama calismasinda kullanilir.
 */
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Save, BarChart3, FileDown, Trash2, Clock, Database } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { Tilt3D } from '@/components/Tilt3D'
import { RangeAnalysisModal } from '@/components/RangeAnalysisModal'
import { listRecordings, saveRecording, removeRecording, toCSV, download, type Recording } from '@/data/recordings'
import { sound } from '@/lib/sound'
import type { LiveState } from '@/hooks/useLiveReadings'
import type { Reading } from '@/data/types'

const fmtDate = (ms: number) => new Date(ms).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })
const durationSec = (pts: Reading[]) => (pts.length > 1 ? (pts[pts.length - 1].t - pts[0].t) / 1000 : 0)

export function RecordsPage({ data }: { data: LiveState }) {
  const [name, setName] = useState('')
  const [list, setList] = useState<Recording[]>(() => listRecordings())
  const [analyze, setAnalyze] = useState<{ points: Reading[]; title: string } | null>(null)

  const refresh = () => setList(listRecordings())

  const saveNow = () => {
    if (data.log.length === 0) return
    saveRecording(name, data.log, Date.now())
    sound.click()
    setName('')
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
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      <PageHeader
        title="Kayıtlar"
        subtitle="Ölçümleri kaydedin, zaman aralığına göre analiz edin, dışa aktarın"
        right={
          <button onClick={() => setAnalyze({ points: data.log, title: 'Şu Anki Oturum' })} disabled={data.log.length < 2} className="flex items-center gap-1.5 rounded-lg border border-[var(--hair)] px-3 py-2 text-xs font-medium text-[var(--ink-soft)] transition hover:text-white disabled:opacity-40">
            <BarChart3 size={14} /> Şu anki oturumu analiz et
          </button>
        }
      />

      {/* Su anki oturumu kaydet */}
      <Tilt3D className="glass flex items-center gap-3 rounded-2xl p-4" max={4}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--smc)]/15 text-[var(--smc-bright)]"><Save size={22} /></span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Kayıt adı (örn. Müşteri A — Hat 1)"
          className="num w-full rounded-lg border border-[var(--hair)] bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--ink-soft)]"
        />
        <button onClick={saveNow} disabled={data.log.length === 0} className="keep-white shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#0072CE,#2E9BFF)' }}>
          Kaydet
        </button>
      </Tilt3D>

      {/* Kayit listesi */}
      {list.length === 0 ? (
        <div className="glass flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl p-10 text-center">
          <Database size={32} className="text-[var(--ink-soft)]" />
          <div className="text-sm text-[var(--ink-soft)]">Henüz kayıt yok. Yukarıdan şu anki oturumu kaydedin.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((rec) => (
            <div key={rec.id} className="glass flex items-center gap-4 rounded-2xl px-5 py-3.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{rec.name}</div>
                <div className="flex items-center gap-3 text-[11px] text-[var(--ink-soft)]">
                  <span className="flex items-center gap-1"><Clock size={11} /> {fmtDate(rec.createdAt)}</span>
                  <span className="num">{rec.points.length} ölçüm</span>
                  <span className="num">{new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(durationSec(rec.points))} sn</span>
                </div>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <button onClick={() => setAnalyze({ points: rec.points, title: rec.name })} title="Aralık analizi" className="flex items-center gap-1.5 rounded-lg border border-[var(--hair)] px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition hover:text-white"><BarChart3 size={14} /> Analiz</button>
                <button onClick={() => exportCSV(rec)} title="CSV indir" className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--hair)] text-[var(--ink-soft)] transition hover:text-white"><FileDown size={15} /></button>
                <button onClick={() => exportJSON(rec)} title="JSON indir" className="rounded-lg border border-[var(--hair)] px-2 py-1.5 text-[11px] font-medium text-[var(--ink-soft)] transition hover:text-white">JSON</button>
                <button onClick={() => del(rec.id)} title="Sil" className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--hair)] text-[#ff8a8a] transition hover:bg-white/5"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {analyze && (
          <RangeAnalysisModal key="range" points={analyze.points} title={analyze.title} onClose={() => setAnalyze(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
