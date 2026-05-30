/*
 * NE      : "Canli Cihaza Baglanma Kilavuzu" - siradan bir personelin gercek SMC AMS cihazina adim adim baglanmasini saglayan
 *           COK BASIT, TEMIZ sihirbaz. Gereksinimler -> kopruyu kur -> cihaz bilgileri (EKRANDAN) -> kopruyu baslat -> baglan.
 * NEDEN   : Mehmet Abi: "donanim yokken bile, kullanicidan neler gerektigini isteyen, cok basit/temiz/uyarlanabilir bir sistem
 *           kuralim; kullanici takip ederek hepsini tek basina yapabilsin". Node kimlikleri KODDAN degil buradan girilir.
 * NASIL   : Numarali adimlar + kopyala-yapistir komutlari (clipboard) + cihaz endpoint/node kimlik formu (connection store'a yazar) +
 *           "Canli moda gec" + canli durum gostergesi. Donanim gelince ayni akis gercek baglantiyi kurar.
 * YAN ETKI: Saf UI; ayarlar localStorage'da (offline). Form "Kaydet" -> setEndpoint + setNodeIds (canli ise kaynak yenilenir).
 */
import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { X, Copy, Check, Terminal, ListChecks, Cable, PlugZap, Save, CheckCircle2 } from 'lucide-react'
import { useConnection, type ConnStatus, type NodeIds } from '@/data/connection'
import { sound } from '@/lib/sound'

const CONN_UI: Record<ConnStatus, { label: string; color: string }> = {
  demo: { label: 'Demo verisi', color: '#FFB04D' },
  connecting: { label: 'Bağlanıyor…', color: '#2E9BFF' },
  connected: { label: 'Bağlı ✓', color: '#41E08A' },
  error: { label: 'Bağlantı yok', color: '#ff6b6b' },
}

const NODE_FIELDS: { key: keyof NodeIds; label: string }[] = [
  { key: 'flow', label: 'Debi (Hava Tüketimi)' },
  { key: 'pressure', label: 'Basınç' },
  { key: 'temperature', label: 'Sıcaklık' },
  { key: 'humidity', label: 'Nem' },
  { key: 'mode', label: 'Mod yazma (opsiyonel — donanım gelince)' },
]

// Kopyalanabilir komut satiri
function Cmd({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  const copy = () => {
    navigator.clipboard?.writeText(text).then(() => {
      sound.click()
      setDone(true)
      window.setTimeout(() => setDone(false), 1300)
    })
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--hair)] bg-[#0a1424] px-3 py-2">
      <Terminal size={14} className="shrink-0 text-[var(--ink-soft)]" />
      <code className="num min-w-0 flex-1 truncate text-[12.5px] text-[var(--smc-bright)]">{text}</code>
      <button onClick={copy} className="flex shrink-0 items-center gap-1 rounded-md border border-[var(--hair)] px-2 py-1 text-[11px] font-medium text-[var(--ink-soft)] transition hover:text-white">
        {done ? <><Check size={12} /> Kopyalandı</> : <><Copy size={12} /> Kopyala</>}
      </button>
    </div>
  )
}

function Step({ n, icon: Icon, title, children }: { n: number; icon: typeof Terminal; title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--hair)] bg-white/[0.03] p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--smc)]/18 text-sm font-bold text-[var(--smc-bright)]">{n}</span>
        <Icon size={16} className="text-[var(--smc-bright)]" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="mt-3 space-y-2 text-[13px] leading-snug text-[var(--ink-soft)]">{children}</div>
    </div>
  )
}

export function LiveSetupGuide({ onClose }: { onClose: () => void }) {
  const { settings, status, setEndpoint, setNodeIds, setMode } = useConnection()
  const [epDraft, setEpDraft] = useState(settings.endpoint)
  const [ids, setIds] = useState<NodeIds>({ ...settings.nodeIds })
  const [saved, setSaved] = useState(false)

  const save = () => {
    setEndpoint(epDraft.trim() || settings.endpoint)
    setNodeIds(ids)
    sound.click()
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  const ui = CONN_UI[status]
  const field = 'num w-full rounded-lg border border-[var(--hair)] bg-[#0a1424] px-3 py-2 text-[12.5px] text-white outline-none transition focus:border-[var(--smc-bright)]'

  return (
    <motion.div
      className="absolute inset-0 z-50 grid place-items-center bg-black/60 p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-7"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--ink-soft)]">Adım Adım</div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-white"><Cable size={20} className="text-[var(--smc-bright)]" /> Canlı Cihaza Bağlanma Kılavuzu</h2>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">Donanım hazır olduğunda bu adımları takip edin — kod düzenlemeye gerek yok.</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--hair)] text-[var(--ink-soft)] transition hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <Step n={1} icon={ListChecks} title="Gerekenler">
            <ul className="ml-1 list-inside list-disc space-y-1">
              <li>Cihazla <b className="text-[var(--ink)]">aynı ağda</b> bir Windows bilgisayar.</li>
              <li><b className="text-[var(--ink)]">Node.js</b> kurulu olmalı (kontrol için):</li>
            </ul>
            <Cmd text="node -v" />
            <div>Yoksa <b className="text-[var(--ink)]">nodejs.org</b>'dan kurun (tek seferlik).</div>
          </Step>

          <Step n={2} icon={Terminal} title="Köprüyü kurun (tek seferlik)">
            <div>Proje klasöründe bir terminal açın ve sırayla çalıştırın:</div>
            <Cmd text="cd bridge" />
            <Cmd text="npm i node-opcua ws" />
            <div className="text-[12px]">İnternet yalnızca bu kurulumda gerekir; sonrası tamamen çevrimdışı çalışır.</div>
          </Step>

          <Step n={3} icon={Cable} title="Cihaz bilgilerini girin (uyarlanabilir)">
            <div>Cihazınızın OPC UA adresi ve düğüm kimlikleri (UaExpert gibi bir araçla okunur). Buraya girin — kod değiştirmenize gerek yok:</div>
            <div>
              <label className="mb-1 block text-[11px] text-[var(--ink-soft)]">Cihaz adresi (OPC UA endpoint)</label>
              <input value={epDraft} onChange={(e) => setEpDraft(e.target.value)} placeholder="opc.tcp://192.168.1.50:4840" className={field} />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {NODE_FIELDS.map((f) => (
                <div key={f.key} className={f.key === 'mode' ? 'sm:col-span-2' : undefined}>
                  <label className="mb-1 block text-[11px] text-[var(--ink-soft)]">{f.label}</label>
                  <input value={ids[f.key]} onChange={(e) => setIds((s) => ({ ...s, [f.key]: e.target.value }))} placeholder="ns=2;s=..." className={field} />
                </div>
              ))}
            </div>
            <button onClick={save} className="keep-white mt-1 flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition" style={{ background: 'linear-gradient(135deg,#0072CE,#2E9BFF)' }}>
              {saved ? <><CheckCircle2 size={15} /> Kaydedildi</> : <><Save size={15} /> Bilgileri Kaydet</>}
            </button>
          </Step>

          <Step n={4} icon={Terminal} title="Köprüyü başlatın">
            <div><span className="num">bridge</span> klasöründe çalıştırın (açık kalsın):</div>
            <Cmd text="node opcua-bridge.mjs" />
            <div>Şu satırı görmelisiniz: <span className="num text-[var(--ink)]">WebSocket hazır: ws://localhost:4841</span></div>
          </Step>

          <Step n={5} icon={PlugZap} title="Bağlanın">
            <div>Her şey hazırsa canlı moda geçin; durum <b style={{ color: '#41E08A' }}>Bağlı ✓</b> olmalı:</div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => { sound.click(); setMode('live') }} className="keep-white flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition" style={{ background: 'linear-gradient(135deg,#0072CE,#2E9BFF)' }}>
                <PlugZap size={15} /> Canlı Moda Geç
              </button>
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${ui.color}22`, color: ui.color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: ui.color, boxShadow: `0 0 8px ${ui.color}` }} />
                {ui.label}
              </span>
            </div>
            <div className="text-[12px]">Bağlanamazsa: cihaz adresi/düğüm kimliklerini kontrol edin, köprü penceresinin açık olduğundan emin olun. İstediğiniz an <b className="text-[var(--ink)]">Demo</b>'ya dönebilirsiniz.</div>
          </Step>
        </div>
      </motion.div>
    </motion.div>
  )
}
