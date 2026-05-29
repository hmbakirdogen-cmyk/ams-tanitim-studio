/*
 * NE      : Urun Ayarlari sayfasi - URUN MODELI secimi (tam kod) + BAGLI MODULLER + cihaz parametreleri
 *           (bekleme basinci / otomatik kesinti suresi / bekleme esigi / valf modu) + sensor gorunurlugu.
 * NEDEN   : Mehmet Bey: "urun tam koduyla secilsin, tum degerler o modele gore optimize/mantikli gelsin" +
 *           "ek moduler bagli urunler de secilebilsin" + "varsayilanlar en mantikli sekilde karsiya ciksin".
 * NASIL   : useModel ile model secimi; secince defaultsForModel -> economy.baselineFlow + device esikleri MANTIKLI degerlere
 *           guncellenir, slider araliklari modele uyarlanir. useModules ile moduller. Demo'da senaryoyu canli surer, canlida OPC UA.
 * YAN ETKI: Model degisimi tum uygulamaya yansir (grafik olcegi/PageHeader/demoSource). Degerlerin yaninda BIRIMI (KATI kural).
 */
import { useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Tilt3D } from '@/components/Tilt3D'
import { useDeviceSettings, type ValveMode } from '@/data/deviceSettings'
import { useSensorVisibility } from '@/data/sensorVisibility'
import { useMetrics } from '@/data/metrics'
import { useModel, AMS_MODELS, defaultsForModel, TYPE_LABEL } from '@/data/model'
import { useModules, MODULES } from '@/data/modules'
import { useEconomy } from '@/data/economy'
import { useConnection, type ConnStatus } from '@/data/connection'
import { fmt2, fmtInt } from '@/lib/format'
import {
  Gauge, Timer, Wind, ToggleRight, Info, RotateCcw, Eye, EyeOff, Boxes, Wifi, Zap, Network, Server, Plus, Radio,
  type LucideIcon,
} from 'lucide-react'

// Baglanti durumu -> etiket + renk (kullaniciya net)
const CONN_UI: Record<ConnStatus, { label: string; color: string }> = {
  demo: { label: 'Demo verisi', color: '#FFB04D' },
  connecting: { label: 'Bağlanıyor…', color: '#2E9BFF' },
  connected: { label: 'Bağlı', color: '#41E08A' },
  error: { label: 'Bağlantı yok', color: '#ff6b6b' },
}

// Modul kimligine ikon (veri tarafi pure kalsin diye eslesme burada)
const MODULE_ICON: Record<string, LucideIcon> = {
  exw1: Wifi,
  softstart: Zap,
  pressureSensor: Gauge,
  iolink: Network,
  webserver: Server,
}

function SettingCard({ icon: Icon, color, title, desc, children }: { icon: LucideIcon; color: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <Tilt3D className="glass relative flex flex-col gap-4 overflow-hidden rounded-2xl p-6" max={5}>
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: color, boxShadow: `0 0 18px ${color}` }} />
      <div className="flex items-center gap-3" style={{ transform: 'translateZ(16px)' }}>
        <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${color}1f`, color }}>
          <Icon size={22} />
        </span>
        <div>
          <div className="text-base font-semibold text-white">{title}</div>
          <div className="text-xs text-[var(--ink-soft)]">{desc}</div>
        </div>
      </div>
      {children}
    </Tilt3D>
  )
}

export function ProductSettingsPage() {
  const { settings, update, reset } = useDeviceSettings()
  const { visible, toggle, showAll } = useSensorVisibility()
  const metrics = useMetrics()
  const { model, setModel } = useModel()
  const { modules, toggle: toggleModule } = useModules()
  const { update: updateEconomy } = useEconomy()
  const { settings: conn, status: connStatus, setMode: setConnMode, setEndpoint } = useConnection()
  // Cihaz adresi taslagi - her tusta degil, SADECE blur/Enter'da store'a yazilir (yoksa her karakter baglantiyi yeniden kurardi)
  const [epDraft, setEpDraft] = useState(conn.endpoint)
  const commitEndpoint = () => { const v = epDraft.trim(); if (v && v !== conn.endpoint) setEndpoint(v) }

  // Model degisince: o modele EN MANTIKLI calisma degerleri kullanicinin karsisina cikar
  const onSelectModel = (code: string) => {
    setModel(code)
    const m = AMS_MODELS.find((x) => x.code === code)
    if (!m) return
    const d = defaultsForModel(m)
    updateEconomy({ baselineFlow: d.baselineFlow }) // tasarruf hesabi baseline'i modele uyar
    update({ standbyPressure: d.standbyPressure, standbyThreshold: d.standbyThreshold }) // esikler modele uyar
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1">
      <PageHeader
        title="Ürün Ayarları"
        subtitle="Önce ürün modelini seçin — tüm değerler o modele göre en mantıklı haline gelir"
        right={
          <button onClick={reset} className="flex items-center gap-1.5 rounded-lg border border-[var(--hair)] px-3 py-2 text-xs font-medium text-[var(--ink-soft)] transition hover:text-white">
            <RotateCcw size={13} /> Varsayılana dön
          </button>
        }
      />

      {/* URUN MODELI SECIMI - tam kod, tiklanabilir buton izgarasi.
          shrink-0 SART: bu kart `flex h-full flex-col` icinde direkt cocuk; overflow-hidden -> min-height:0 -> flex onu
          buzup butonlari KIRPIYORDU ("yarim"/"secemiyorum" kok nedeni). shrink-0 ile buzulmez, sayfa overflow-y-auto ile kayar. */}
      <div className="glass relative shrink-0 overflow-hidden rounded-2xl p-6">
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: '#0072CE', boxShadow: '0 0 18px #0072CE' }} />
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: '#0072CE1f', color: '#2E9BFF' }}>
            <Boxes size={24} />
          </span>
          <div>
            <div className="text-base font-semibold text-white">Ürün Modeli</div>
            <div className="text-xs text-[var(--ink-soft)]">Tam kodu seçin — debi/basınç ölçeği ve tüm varsayılanlar otomatik uyar</div>
          </div>
        </div>

        {/* Model kodu secenekleri - tiklanabilir butonlar (8 model: AMS20/30/40/60 x A/B) */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {AMS_MODELS.map((mm) => {
            const on = mm.code === model.code
            return (
              <button
                key={mm.code}
                onClick={() => onSelectModel(mm.code)}
                className={`rounded-xl border px-3 py-2.5 text-center transition ${on ? 'text-white' : 'text-[var(--ink-soft)] hover:text-white'}`}
                style={
                  on
                    ? { borderColor: '#2E9BFF', background: 'rgba(46,155,255,0.18)', boxShadow: 'inset 0 0 0 1px rgba(46,155,255,0.55), 0 0 22px -8px rgba(46,155,255,0.9)' }
                    : { borderColor: 'var(--hair)' }
                }
              >
                <div className="num text-sm font-bold">{mm.code}</div>
                <div className="text-[10px] text-[var(--ink-soft)]">{mm.type === 'A' ? 'Tip A' : 'Tip B'}</div>
              </button>
            )
          })}
        </div>

        {/* Secili modelin ozeti - sayisal degerler (birimli) */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: 'Debi Aralığı', value: `${fmtInt(model.flowMin)} – ${fmtInt(model.flowMax)}`, unit: 'l/dak', color: '#2E9BFF' },
            { label: 'Normal Tüketim', value: fmtInt(model.baselineFlow), unit: 'l/dak', color: '#2E9BFF' },
            { label: 'Azami Basınç', value: fmt2(model.pressureMax), unit: 'MPa', color: '#36E0C8' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[var(--hair)] bg-white/[0.03] px-3 py-2.5">
              <div className="text-[11px] text-[var(--ink-soft)]">{s.label}</div>
              <div className="num text-lg font-bold text-white" style={{ textShadow: `0 0 16px ${s.color}55` }}>
                {s.value} <span className="text-xs font-medium text-[var(--ink-soft)]">{s.unit}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Regulator tipi - tam etiket (kisaltma yok), tam genislik satir */}
        <div className="mt-3 flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: '#FFB04D55', background: '#FFB04D12' }}>
          <span className="text-[11px] text-[var(--ink-soft)]">Regülatör Tipi</span>
          <span className="ml-auto text-sm font-semibold text-white">{TYPE_LABEL[model.type]}</span>
        </div>
      </div>

      {/* VERI BAGLANTISI - Demo / Canli cihaz (OPC UA kopru) + canli durum */}
      <div className="glass relative shrink-0 overflow-hidden rounded-2xl p-6">
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: CONN_UI[connStatus].color, boxShadow: `0 0 18px ${CONN_UI[connStatus].color}` }} />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: `${CONN_UI[connStatus].color}1f`, color: CONN_UI[connStatus].color }}>
              {conn.mode === 'live' ? <Wifi size={24} /> : <Radio size={24} />}
            </span>
            <div>
              <div className="flex items-center gap-2 text-base font-semibold text-white">
                Veri Bağlantısı
                <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `${CONN_UI[connStatus].color}22`, color: CONN_UI[connStatus].color }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: CONN_UI[connStatus].color, boxShadow: `0 0 8px ${CONN_UI[connStatus].color}` }} />
                  {CONN_UI[connStatus].label}
                </span>
              </div>
              <div className="text-xs text-[var(--ink-soft)]">Demo verisi mi, gerçek cihazdan canlı veri mi (OPC UA)</div>
            </div>
          </div>
          <div className="flex gap-2">
            {([['demo', 'Demo Verisi'], ['live', 'Canlı Cihaz']] as const).map(([m, label]) => {
              const on = conn.mode === m
              return (
                <button
                  key={m}
                  onClick={() => setConnMode(m)}
                  className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${on ? 'text-white' : 'text-[var(--ink-soft)] hover:text-white'}`}
                  style={on ? { background: 'rgba(46,155,255,0.2)', boxShadow: 'inset 0 0 0 1px rgba(46,155,255,0.5)' } : { border: '1px solid var(--hair)' }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
        {conn.mode === 'live' && (
          <div className="mt-4">
            <label className="mb-1 block text-xs text-[var(--ink-soft)]">Cihaz adresi (OPC UA)</label>
            <input
              value={epDraft}
              onChange={(e) => setEpDraft(e.target.value)}
              onBlur={commitEndpoint}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur() }}
              placeholder="opc.tcp://192.168.1.50:4840"
              className="num w-full rounded-lg border border-[var(--hair)] bg-[#0a1424] px-3 py-2.5 text-sm text-white outline-none transition focus:border-[var(--smc-bright)]"
            />
            <div className="mt-2 text-[11px] text-[var(--ink-soft)]">
              Canlı veri için bilgisayarda yerel <b className="text-[var(--ink)]">OPC UA köprüsü</b> çalışmalı (<span className="num">bridge/opcua-bridge.mjs</span>). Cihaz yoksa Demo'ya dönün.
            </div>
          </div>
        )}
      </div>

      <div className="glass flex shrink-0 items-start gap-3 rounded-2xl p-4 text-sm text-[var(--ink-soft)]">
        <Info size={18} className="mt-0.5 shrink-0 text-[var(--smc-bright)]" />
        <div>
          Bu ayarlar demo modunda <b className="text-white">senaryoyu canlı sürer</b> (bekleme basıncı ve otomatik kesinti süresi
          grafiğe anında yansır). Cihaza bağlandığında aynı değerler <b className="text-white">OPC UA ile cihaza yazılır</b>.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Bekleme Basinci - ust sinir modelin azami basinci */}
        <SettingCard icon={Gauge} color="#36E0C8" title="Bekleme Basıncı" desc={`Tasarruf modunda düşürülen hedef basınç (azami ${fmt2(model.pressureMax)} MPa)`}>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs text-[var(--ink-soft)]">Hedef</span>
            <span className="num text-2xl font-bold text-white">
              {fmt2(settings.standbyPressure)} <span className="text-sm font-medium text-[var(--ink-soft)]">MPa</span>
            </span>
          </div>
          <input type="range" min={0.1} max={model.pressureMax} step={0.05} value={Math.min(settings.standbyPressure, model.pressureMax)} onChange={(e) => update({ standbyPressure: parseFloat(e.target.value) })} className="w-full" style={{ accentColor: '#36E0C8' }} />
        </SettingCard>

        {/* Otomatik Kesinti Suresi */}
        <SettingCard icon={Timer} color="#FFB04D" title="Otomatik Kesinti Süresi" desc="Beklemeden sonra havanın kesilmesine kadar süre">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs text-[var(--ink-soft)]">Süre</span>
            <span className="num text-2xl font-bold text-white">
              {fmtInt(settings.autoIsolationSec)} <span className="text-sm font-medium text-[var(--ink-soft)]">sn</span>
            </span>
          </div>
          <input type="range" min={2} max={30} step={1} value={settings.autoIsolationSec} onChange={(e) => update({ autoIsolationSec: parseInt(e.target.value, 10) })} className="w-full" style={{ accentColor: '#FFB04D' }} />
        </SettingCard>

        {/* Bekleme Esigi - ust sinir modelin normal tuketimi */}
        <SettingCard icon={Wind} color="#2E9BFF" title="Bekleme Eşiği" desc={`Debi bu değerin altına düşünce bekleme moduna geçilir (azami ${fmtInt(model.baselineFlow)} l/dak)`}>
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs text-[var(--ink-soft)]">Eşik</span>
            <span className="num text-2xl font-bold text-white">
              {fmtInt(settings.standbyThreshold)} <span className="text-sm font-medium text-[var(--ink-soft)]">l/dak</span>
            </span>
          </div>
          <input type="range" min={10} max={model.baselineFlow} step={10} value={Math.min(settings.standbyThreshold, model.baselineFlow)} onChange={(e) => update({ standbyThreshold: parseInt(e.target.value, 10) })} className="w-full" style={{ accentColor: '#2E9BFF' }} />
        </SettingCard>

        {/* Valf Modu */}
        <SettingCard icon={ToggleRight} color="#7CE0FF" title="Valf Modu" desc="Tahliye valfinin normal durumu">
          <div className="flex gap-2">
            {(['NC', 'NO'] as ValveMode[]).map((m) => {
              const on = settings.valveMode === m
              return (
                <button
                  key={m}
                  onClick={() => update({ valveMode: m })}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${on ? 'text-white' : 'text-[var(--ink-soft)] hover:text-white'}`}
                  style={on ? { background: 'rgba(124,224,255,0.2)', boxShadow: 'inset 0 0 0 1px rgba(124,224,255,0.5)' } : { border: '1px solid var(--hair)' }}
                >
                  {m === 'NC' ? 'Normalde Kapalı' : 'Normalde Açık'}
                </button>
              )
            })}
          </div>
        </SettingCard>
      </div>

      {/* BAGLI MODULLER - opsiyonel ek urunler; secim Urun & Teknoloji vitrinine de yansir */}
      <div className="glass rounded-2xl p-6">
        <div className="mb-1 flex items-center gap-2 text-base font-semibold text-white">
          <Plus size={18} className="text-[var(--smc-bright)]" /> Bağlı Modüller
        </div>
        <div className="mb-4 text-xs text-[var(--ink-soft)]">
          AMS'e takılan opsiyonel ürünler. Seçtikleriniz Ürün &amp; Teknoloji sayfasında da görünür. (Çekirdekte OPC UA + Endüstriyel Ethernet zaten dahil.)
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {MODULES.map((mod) => {
            const on = modules[mod.id]
            const Icon = MODULE_ICON[mod.id] ?? Plus
            const color = '#2E9BFF'
            return (
              <button
                key={mod.id}
                onClick={() => toggleModule(mod.id)}
                className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition"
                style={{ borderColor: on ? `${color}66` : 'var(--hair)', background: on ? `${color}14` : 'transparent' }}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `${color}1f`, color }}>
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">{mod.name}</div>
                  <div className="text-[11px] leading-snug text-[var(--ink-soft)]">{mod.desc}</div>
                </div>
                <span className="ml-auto shrink-0">
                  {on
                    ? <span className="rounded-full bg-[var(--c-saving)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--c-saving)]">Bağlı</span>
                    : <span className="rounded-full border border-[var(--hair)] px-2 py-0.5 text-[10px] font-medium text-[var(--ink-soft)]">Ekle</span>}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sensor gorunurlugu - hangi sensorler grafik/kartlarda gorunsun (yeni sensore hazir) */}
      <div className="glass rounded-2xl p-6">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-2 text-base font-semibold text-white">
            <Eye size={18} className="text-[var(--smc-bright)]" /> Sensörler
          </div>
          <button onClick={showAll} className="rounded-lg border border-[var(--hair)] px-3 py-1.5 text-xs font-medium text-[var(--ink-soft)] transition hover:text-[var(--ink)]">
            Tümünü Aç
          </button>
        </div>
        <div className="mb-4 text-xs text-[var(--ink-soft)]">
          Hangi sensörlerin grafik ve kartlarda görüneceğini seçin. Yeni sensör eklendiğinde burada otomatik görünür. (Şu an hepsi etkin.)
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {metrics.map((m) => {
            const on = visible[m.key]
            const Icon = m.icon
            return (
              <button
                key={m.key}
                onClick={() => toggle(m.key)}
                className="flex items-center gap-3 rounded-xl border px-4 py-3 transition"
                style={{ borderColor: on ? `${m.color}66` : 'var(--hair)', background: on ? `${m.color}14` : 'transparent' }}
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${m.color}1f`, color: m.color }}>
                  <Icon size={18} />
                </span>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">{m.name}</div>
                  <div className="text-[11px] text-[var(--ink-soft)]">{m.unit}</div>
                </div>
                <span className="ml-auto">
                  {on ? <Eye size={18} className="text-[var(--c-saving)]" /> : <EyeOff size={18} className="text-[var(--ink-soft)]" />}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
