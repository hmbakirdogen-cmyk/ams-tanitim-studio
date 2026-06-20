/*
 * NE      : "Canli Cihaza Baglanma Kilavuzu" - SIFIR KURULUM + OTOMATIK CIHAZ BULMA sihirbazi. Kablo tak -> "Cihazi Otomatik Bul"
 *           -> sec (endpoint + dugumler kendiliginden dolar) -> "Canli Moda Gec". Elle giris (gelismis) yedek olarak durur.
 * NEDEN   : Mehmet Abi: "kullaniciyi 'su adresi yaz, su node'u gir' diye UGRASTIRMA - kabloyu taksin, cihazi BIZ bulalim";
 *           ayrica kopru artik uygulamayla GOMULU calisir (server.mjs) -> "Node kur / npm i / kopruyu baslat" adimlari KALKTI.
 * NASIL   : Kisa omurlu ws (ws://localhost:4841) -> {type:'discover'} (ilerleme + bulunan cihazlar). Cihaz secilince
 *           {type:'browse', endpoint} ile olcum dugumleri ISIMDEN tahmin edilir (uygulama node-ID'leri otomatik doldurur).
 *           Bulunamazsa elle endpoint + node-ID girisi (gelismis) korunur. Kaydet -> setEndpoint+setNodeIds; Canli Moda Gec -> setMode.
 * YAN ETKI: Saf UI; ayarlar localStorage (offline). Gercek cihazla son ince ayar ilk denemede yapilir (donanim yokken yazildi).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { X, Cable, PlugZap, Save, CheckCircle2, Radar, Loader2, SlidersHorizontal, Wifi, AlertTriangle } from 'lucide-react'
import { useConnection, BRIDGE_URL, type ConnStatus, type NodeIds } from '@/data/connection'
import { sound } from '@/lib/sound'
import { useLang } from '@/i18n'
import { fmtPct } from '@/lib/format'

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

interface FoundDevice { endpoint: string; host: string; port: number; name: string }

function Step({ n, icon: Icon, title, children }: { n: number; icon: typeof Cable; title: string; children: ReactNode }) {
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
  const { t } = useLang()
  const { settings, status, setEndpoint, setNodeIds, setMode } = useConnection()
  const [epDraft, setEpDraft] = useState(settings.endpoint)
  const [ids, setIds] = useState<NodeIds>({ ...settings.nodeIds })
  const [saved, setSaved] = useState(false)
  const [advanced, setAdvanced] = useState(false)

  // Otomatik kesif durumu
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState<{ scanned: number; total: number } | null>(null)
  const [devices, setDevices] = useState<FoundDevice[] | null>(null)
  const [scanErr, setScanErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [browsing, setBrowsing] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const discoverTimeoutRef = useRef<number | null>(null)
  const browseTimeoutRef = useRef<number | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)

  // Bilesen kapanirken acik ws'i kapat (sizinti yok)
  useEffect(() => () => {
    try { wsRef.current?.close() } catch { /* yok */ }
    if (discoverTimeoutRef.current !== null) window.clearTimeout(discoverTimeoutRef.current)
    if (browseTimeoutRef.current !== null) window.clearTimeout(browseTimeoutRef.current)
    if (saveTimeoutRef.current !== null) window.clearTimeout(saveTimeoutRef.current)
  }, [])

  const discover = (auto = false) => {
    if (scanning) return
    if (!auto) sound.click()
    setScanning(true); setDevices(null); setProgress(null); setScanErr(null); setSelected(null)
    let ws: WebSocket
    try { ws = new WebSocket(BRIDGE_URL) } catch { setScanning(false); setScanErr('bridge'); return }
    wsRef.current = ws
    let finished = false
    const finish = () => {
      finished = true
      setScanning(false)
      if (discoverTimeoutRef.current !== null) { window.clearTimeout(discoverTimeoutRef.current); discoverTimeoutRef.current = null }
      try { ws.close() } catch { /* yok */ }
    }
    ws.onopen = () => { try { ws.send(JSON.stringify({ type: 'discover' })) } catch { /* yok */ } }
    ws.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data as string)
        if (d.type === 'discoverProgress') { if (d.total) setProgress({ scanned: d.scanned, total: d.total }); return }
        if (d.type === 'discovered') { setDevices((d.devices as FoundDevice[]) || []); finish() }
      } catch { /* bozuk mesaj */ }
    }
    ws.onerror = () => { if (!finished) { setScanErr('bridge'); finish() } }
    if (discoverTimeoutRef.current !== null) window.clearTimeout(discoverTimeoutRef.current)
    discoverTimeoutRef.current = window.setTimeout(() => {
      if (!finished) { setScanErr('timeout'); finish() }
      discoverTimeoutRef.current = null
    }, 30000)
  }

  // Cihaz secildi -> endpoint'i doldur + olcum dugumlerini ISIMDEN tahmin et (browse)
  const selectDevice = (dev: FoundDevice, auto = false) => {
    if (!auto) sound.click()
    setSelected(dev.endpoint)
    setEpDraft(dev.endpoint)
    setBrowsing(true)
    let ws: WebSocket
    try { ws = new WebSocket(BRIDGE_URL) } catch { setBrowsing(false); return }
    let finished = false
    ws.onopen = () => { try { ws.send(JSON.stringify({ type: 'browse', endpoint: dev.endpoint })) } catch { /* yok */ } }
    ws.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data as string)
        if (d.type === 'nodeHints') {
          finished = true
          if (d.hints && Object.keys(d.hints).length) setIds((s) => ({ ...s, ...(d.hints as Partial<NodeIds>) }))
          setBrowsing(false); try { ws.close() } catch { /* yok */ }
        }
      } catch { /* yok */ }
    }
    ws.onerror = () => { if (!finished) { setBrowsing(false); try { ws.close() } catch { /* yok */ } } }
    if (browseTimeoutRef.current !== null) window.clearTimeout(browseTimeoutRef.current)
    browseTimeoutRef.current = window.setTimeout(() => {
      if (!finished) { setBrowsing(false); try { ws.close() } catch { /* yok */ } }
      browseTimeoutRef.current = null
    }, 15000)
  }

  // OTOMATIK BAĞLANMA (Mehmet abi: "kabloyu tak cihaza bağlan kadar kolay olsun"):
  //   (1) Kılavuz AÇILIR AÇILMAZ cihazı kendiliğinden ara → kullanıcı "Otomatik Bul"a basmak zorunda değil (ilk tık gitti).
  //   (2) TEK cihaz bulununca kendiliğinden seç + sensör kimliklerini doldur → kullanıcıya yalnız "Canlı Moda Geç" kalır.
  //   Mevcut (test edilmiş) discover()/selectDevice() yeniden kullanılır — yeni bağlantı mantığı YOK (köprü çekirdeği korunur).
  const autoRan = useRef(false)
  useEffect(() => { if (!autoRan.current) { autoRan.current = true; discover(true) } }, [])
  useEffect(() => {
    if (devices && devices.length === 1 && !selected && !browsing) selectDevice(devices[0], true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices])

  const save = () => {
    setEndpoint(epDraft.trim() || settings.endpoint)
    setNodeIds(ids)
    sound.click()
    setSaved(true)
    if (saveTimeoutRef.current !== null) window.clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = window.setTimeout(() => {
      setSaved(false)
      saveTimeoutRef.current = null
    }, 1600)
  }

  const ui = CONN_UI[status]
  const field = 'force-dark-surface num w-full rounded-lg border border-[var(--hair)] bg-[#0a1424] px-3 py-2 text-[12.5px] text-white outline-none transition focus:border-[var(--smc-bright)]'
  const pct = progress && progress.total ? Math.round((progress.scanned / progress.total) * 100) : 0

  return (
    // NE     : Kilavuz kok overlay'ini "absolute inset-0 z-50" -> "fixed inset-0 z-[70]" yaptik.
    // NEDEN  : Mehmet Abi - absolute, <main> (relative+overflow) ICINE hapsoluyordu; mobilde tam ekrani kaplamiyor,
    //          ust cubuk/sidebar ile cakisiyor, dar alanda sikisiyordu. FeedbackDrawer gibi viewport'a sabitlenmeli.
    // NASIL  : fixed ile viewport'a, z-[70] ile drawer'in (z-[60]) ustune tasidik; glass-solid panel/animasyon/onClose aynen.
    // YAN ETKI: Masaustunde de viewport tam ekran ortalama dogru calisir; sadece kok konumlandirma degisti.
    <motion.div
      className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="glass-solid max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-7"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--ink-soft)]">{t('3 Adımda')}</div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-white"><Cable size={20} className="text-[var(--smc-bright)]" /> {t('Canlı Cihaza Bağlanma Kılavuzu')}</h2>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">{t('Kurulum yok, internet yok — kabloyu takın, cihazı biz bulalım.')}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--hair)] text-[var(--ink-soft)] transition hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {/* ADIM 1 — kablo / ayni ag */}
          <Step n={1} icon={Cable} title={t('Cihazı bağlayın')}>
            <div>{t('Cihazı bu bilgisayarla')} <b className="text-[var(--ink)]">{t('aynı ağa')}</b> {t('bağlayın (Ethernet kablosu veya switch).')}</div>
            <div className="rounded-lg border px-3 py-2 text-[12.5px]" style={{ borderColor: 'rgba(65,224,138,0.4)', background: 'rgba(65,224,138,0.08)', color: 'var(--ink)' }}>
              {t('Köprü uygulamayla birlikte gömülü çalışır — Node kurmanıza, paket indirmenize veya ayrı pencere açmanıza gerek yok.')}
            </div>
          </Step>

          {/* ADIM 2 — otomatik bul */}
          <Step n={2} icon={Radar} title={t('Cihazı otomatik bulun')}>
            <div>{t('Aşağıdaki butona basın; aynı ağdaki SMC cihazını biz arayalım. Bulununca tıklayın — adres ve sensör kimlikleri kendiliğinden dolar.')}</div>
            <button
              onClick={() => discover()}
              disabled={scanning}
              className="keep-white flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#0072CE,#2E9BFF)' }}
            >
              {scanning ? <><Loader2 size={15} className="animate-spin" /> {t('Aranıyor…')}</> : <><Radar size={15} /> {t('Cihazı Otomatik Bul')}</>}
            </button>

            {/* Tarama ilerlemesi */}
            {scanning && (
              <div className="mt-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#0072CE,#2E9BFF)' }} />
                </div>
                <div className="mt-1 text-[11px] text-[var(--ink-soft)]">{t('Ağ taranıyor')} {pct ? `· ${fmtPct(pct)}` : '…'}</div>
              </div>
            )}

            {/* Hata */}
            {scanErr && !scanning && (
              <div className="flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px]" style={{ borderColor: 'rgba(255,107,107,0.4)', background: 'rgba(255,107,107,0.08)', color: 'var(--ink)' }}>
                <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: '#ff6b6b' }} />
                <span>{scanErr === 'bridge'
                  ? t('Köprüye ulaşılamadı. Uygulamayı “Baslat.bat” ile açtığınızdan emin olun, sonra tekrar deneyin.')
                  : t('Tarama zaman aşımına uğradı. Cihazın açık ve aynı ağda olduğundan emin olup tekrar deneyin.')}</span>
              </div>
            )}

            {/* Bulunan cihazlar */}
            {devices && !scanning && (
              devices.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--hair)] px-3 py-3 text-center text-[12.5px] text-[var(--ink-soft)]">
                  {t('Cihaz bulunamadı. Kabloyu/ağı kontrol edip tekrar deneyin veya aşağıdan elle girin.')}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {devices.map((dev) => {
                    const on = selected === dev.endpoint
                    return (
                      <button
                        key={dev.endpoint}
                        onClick={() => selectDevice(dev)}
                        className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition"
                        style={on
                          ? { borderColor: 'var(--smc-bright)', background: 'rgba(46,155,255,0.12)' }
                          : { borderColor: 'var(--hair)' }}
                      >
                        <Wifi size={16} className="shrink-0" style={{ color: on ? 'var(--smc-bright)' : 'var(--ink-soft)' }} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-white">{dev.name}</div>
                          <div className="num truncate text-[11px] text-[var(--ink-soft)]">{dev.endpoint}</div>
                        </div>
                        {on && (browsing
                          ? <Loader2 size={15} className="animate-spin text-[var(--smc-bright)]" />
                          : <CheckCircle2 size={16} style={{ color: '#41E08A' }} />)}
                      </button>
                    )
                  })}
                  {selected && (
                    <div className="text-[11.5px] text-[var(--ink-soft)]">
                      {browsing
                        ? t('Sensör kimlikleri okunuyor…')
                        : t('Cihaz seçildi. Sensör kimlikleri otomatik dolduruldu — gerekirse “Gelişmiş”ten düzeltebilirsiniz.')}
                    </div>
                  )}
                </div>
              )
            )}

            {/* Elle giris (gelismis) - yedek/uyarlama */}
            <button
              onClick={() => { sound.click(); setAdvanced((v) => !v) }}
              className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-[var(--ink-soft)] transition hover:text-white"
            >
              <SlidersHorizontal size={13} /> {advanced ? t('Gelişmiş ayarları gizle') : t('Elle gir / Gelişmiş')}
            </button>
            {advanced && (
              <div className="space-y-2 rounded-xl border border-[var(--hair)] bg-black/20 p-3">
                <div>
                  <label className="mb-1 block text-[11px] text-[var(--ink-soft)]">{t('Cihaz adresi (OPC UA endpoint)')}</label>
                  <input value={epDraft} onChange={(e) => setEpDraft(e.target.value)} placeholder="opc.tcp://192.168.1.50:4840" className={field} />
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {NODE_FIELDS.map((f) => (
                    <div key={f.key} className={f.key === 'mode' ? 'sm:col-span-2' : undefined}>
                      <label className="mb-1 block text-[11px] text-[var(--ink-soft)]">{t(f.label)}</label>
                      <input value={ids[f.key]} onChange={(e) => setIds((s) => ({ ...s, [f.key]: e.target.value }))} placeholder="ns=2;s=..." className={field} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Step>

          {/* ADIM 3 — kaydet + baglan */}
          <Step n={3} icon={PlugZap} title={t('Bağlanın')}>
            <div>{t('Cihazı kaydedin ve canlı moda geçin; durum')} <b style={{ color: '#41E08A' }}>{t('Bağlı ✓')}</b> {t('olmalı.')}</div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button onClick={save} className="flex items-center gap-1.5 rounded-lg border border-[var(--hair)] px-4 py-2 text-sm font-medium text-[var(--ink)] transition hover:text-white">
                {saved ? <><CheckCircle2 size={15} style={{ color: '#41E08A' }} /> {t('Kaydedildi')}</> : <><Save size={15} /> {t('Bilgileri Kaydet')}</>}
              </button>
              <button onClick={() => { sound.click(); setMode('live') }} className="keep-white flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition" style={{ background: 'linear-gradient(135deg,#0072CE,#2E9BFF)' }}>
                <PlugZap size={15} /> {t('Canlı Moda Geç')}
              </button>
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: `${ui.color}22`, color: ui.color }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: ui.color, boxShadow: `0 0 8px ${ui.color}` }} />
                {t(ui.label)}
              </span>
            </div>
            <div className="text-[12px]">{t('Bağlanamazsa: cihazın açık ve aynı ağda olduğundan emin olun. İstediğiniz an')} <b className="text-[var(--ink)]">Demo</b>{t('’ya dönebilirsiniz (cihaz olmadan da her şey çalışır).')}</div>
          </Step>
        </div>
      </motion.div>
    </motion.div>
  )
}
