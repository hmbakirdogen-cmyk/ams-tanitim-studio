/*
 * NE      : Urun & Teknoloji sayfasi - SMC AMS'i TUM yonleriyle anlatan animasyonlu vitrin (tanitim/sunum amacli).
 * NEDEN   : Mehmet Bey: "musteriye urunu butunuyle ust kalite animasyonlarla anlat" + "bu urunu cok iyi tani". Katalogtan dogru bilgi.
 * NASIL   : Kademeli (stagger) reveal'li bolumler: hero + nasil calisir (3 mod) + bilesenler + baglanabilirlik + teknik ozellikler.
 * YAN ETKI: Statik icerik (canli veri gerektirmez); gercek SMC urun gorseli ileride slot'a oturacak (tasteful).
 */
import { motion } from 'framer-motion'
import { PageHeader } from '@/components/PageHeader'
import { Tilt3D } from '@/components/Tilt3D'
import { SmcLogo } from '@/components/SmcLogo'
import { useModel } from '@/data/model'
import { useModules, MODULES } from '@/data/modules'
import {
  Leaf, PowerOff, Timer, Cpu, Gauge, Wind, Network, Wifi, Server, Ruler, Zap, ShieldCheck, Plus, Activity,
  type LucideIcon,
} from 'lucide-react'

// Katalogtan ONE CIKAN YETENEKLER (Sustainability - Condition Based Maintenance - Digitalisation)
const CAPABILITIES: { icon: LucideIcon; color: string; title: string; desc: string }[] = [
  { icon: Activity, color: '#2E9BFF', title: 'Kestirimci & Durum Bazlı Bakım', desc: 'Debi, basınç ve sıcaklık eğilimleri sürekli izlenir; sapmalar arıza oluşmadan fark edilir, plansız duruş azalır.' },
  { icon: Network, color: '#36E0C8', title: 'Dijitalleşme · Endüstri 4.0', desc: 'OPC UA, IO-Link, Endüstriyel Ethernet ve dahili web sunucu ile veri doğrudan üst sisteme taşınır.' },
  { icon: Leaf, color: '#41E08A', title: 'Sürdürülebilirlik', desc: 'Beklemede havayı kısar/keser; %62’ye varan hava tasarrufu — daha az enerji ve CO₂ salımı.' },
  { icon: ShieldCheck, color: '#7CE0FF', title: 'Güvenli Kablosuz (EXW1)', desc: '100 metre menzilli şifreli kablosuz; kablo çekmeden güvenli uzaktan izleme.' },
  { icon: Server, color: '#FFB04D', title: 'Dahili Web Sunucu', desc: 'Tarayıcıdan doğrudan erişim; ek yazılım veya kurulum gerektirmez.' },
  { icon: Cpu, color: '#2E9BFF', title: 'Akıllı İzleme & HMI', desc: 'Anlık değerler ve eğilim grafikleri; sağlanan tasarruf miktarı görünür kılınır.' },
]

const MODES: { icon: LucideIcon; color: string; title: string; desc: string }[] = [
  { icon: Leaf, color: '#41E08A', title: 'Tasarruf Modu', desc: 'Ekipman beklemedeyken oransal regülatör basıncı düşürür; hava tüketimi %50+ azalır.' },
  { icon: PowerOff, color: '#FFB04D', title: 'Hava Kesintisi', desc: 'Tahliye valfi havayı tamamen keser ve kalan basıncı boşaltır; tüketim sıfıra yaklaşır.' },
  { icon: Timer, color: '#2E9BFF', title: 'Otomatik Kesinti', desc: 'Beklemede belirlenen süre sonra sistem havayı kendiliğinden keser; sıfır müdahale.' },
]

const COMPONENTS: { icon: LucideIcon; color: string; title: string; desc: string }[] = [
  { icon: Cpu, color: '#2E9BFF', title: 'Hava Yönetim Merkezi', desc: 'Debi, basınç ve sıcaklığı ölçer; üst sisteme veri iletir, regülatör ve valfi yönetir (EXA1).' },
  { icon: Gauge, color: '#36E0C8', title: 'Bekleme Regülatörü', desc: 'Basıncı uzaktan (elektro-pnömatik) veya elle ayarlayarak bekleme basıncına düşürür.' },
  { icon: Wind, color: '#7CE0FF', title: 'Tahliye Valfi', desc: 'Üç yollu solenoid valf; havayı keser, kalan basıncı güvenle boşaltır (yumuşak başlatma seçeneği).' },
]

const CONNECT: { icon: LucideIcon; label: string }[] = [
  { icon: Network, label: 'OPC UA' },
  { icon: Network, label: 'IO-Link' },
  { icon: Network, label: 'PROFINET' },
  { icon: Network, label: 'EtherNet/IP' },
  { icon: Network, label: 'EtherCAT' },
  { icon: Wifi, label: 'Kablosuz (100 m)' },
  { icon: Server, label: 'Web Sunucu' },
]

const SPECS: { icon: LucideIcon; label: string; value: string }[] = [
  { icon: Ruler, label: 'Gövde Boyutları', value: '20 · 30 · 40 · 60' },
  { icon: Wind, label: 'Debi Aralığı', value: '5 – 4.000 litre/dakika' },
  { icon: Zap, label: 'Besleme', value: '24 Volt DC' },
  { icon: ShieldCheck, label: 'Koruma Sınıfı', value: 'IP65' },
  { icon: Gauge, label: 'Maks. Basınç', value: '1,0 MPa' },
  { icon: Timer, label: 'Sıcaklık', value: '0 – 50 °C' },
]

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5, ease: 'easeOut' }}>
      {children}
    </motion.div>
  )
}

export function ProductPage() {
  const { model } = useModel()
  const { modules } = useModules()
  const activeModules = MODULES.filter((m) => modules[m.id]) // secili bagli moduller -> baglanabilirlik vitrinine eklenir
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto pr-1">
      <PageHeader title="Ürün & Teknoloji" subtitle="SMC Hava Yönetim Sistemi — AMS20/30/40/60 Serisi" />

      {/* Hero */}
      <Reveal>
        <Tilt3D className="glass relative grid grid-cols-1 gap-6 overflow-hidden rounded-3xl p-8 lg:grid-cols-[1.3fr_1fr]" max={4}>
          <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full opacity-20 blur-3xl" style={{ background: 'var(--smc)' }} />
          <div style={{ transform: 'translateZ(20px)' }}>
            <SmcLogo size={80} withText={false} />
            <h2 className="mt-5 text-4xl font-extrabold leading-tight text-white">
              Boşa giden havayı <span className="text-[var(--c-saving)] glow-text" style={{ ['--glow' as string]: 'rgba(65,224,138,0.5)' }}>%62'ye kadar</span> azaltın
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--ink-soft)]">
              Air Management System; ekipman beklemedeyken hava basıncını otomatik düşürür ya da keser.
              Debi, basınç ve sıcaklığı sürekli ölçer; enerji tasarrufunu görünür kılar. Endüstri 4.0 ve
              kestirimci bakım için doğrudan veri iletişimi sunar.
            </p>
          </div>
          {/* GERCEK SMC urun gorseli (giris sayfasiyla AYNI) - hucreyi DOLDURUR (object-cover), belirgin/net/yuksek kalite */}
          <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-2xl border border-[var(--hair)] bg-[#0a1424]">
            <img
              src="/products/ams-diagram.jpg"
              alt="SMC Hava Yönetim Sistemi — fabrika hattında gerçek ürün"
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
            {/* Etiket okunabilirligi icin hafif koyu gradyan (alt + ust kose) */}
            <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(4,12,26,0.6), transparent 42%)' }} />
            <span className="absolute left-3 top-3 z-10 rounded-md px-2.5 py-1 text-[11px] font-bold text-white" style={{ background: '#0072CE', boxShadow: '0 4px 14px -4px rgba(0,114,206,0.9)' }}>{model.code}</span>
            <span className="absolute bottom-3 right-3 z-10 text-[11px] font-semibold text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
              {model.type === 'A' ? 'Elektro-pnömatik regülatör' : 'Regülatör (elle ayar)'}
            </span>
          </div>
        </Tilt3D>
      </Reveal>

      {/* Nasil calisir - 3 mod */}
      <div>
        <h3 className="mb-3 text-lg font-bold text-white">Nasıl Tasarruf Sağlar?</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {MODES.map((m, i) => {
            const Icon = m.icon
            return (
              <Reveal key={m.title} delay={i * 0.08}>
                <Tilt3D className="glass relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl p-5" max={6}>
                  <span className="absolute inset-x-0 top-0 h-1" style={{ background: m.color, boxShadow: `0 0 18px ${m.color}` }} />
                  <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${m.color}1f`, color: m.color }}>
                    <Icon size={22} />
                  </span>
                  <div className="text-base font-semibold text-white">{m.title}</div>
                  <div className="text-sm leading-relaxed text-[var(--ink-soft)]">{m.desc}</div>
                </Tilt3D>
              </Reveal>
            )
          })}
        </div>
      </div>

      {/* One cikan yetenekler - tum katalog temalari (sürdürülebilirlik, kestirimci bakim, dijitallesme) */}
      <div>
        <h3 className="mb-3 text-lg font-bold text-white">Öne Çıkan Yetenekler</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((c, i) => {
            const Icon = c.icon
            return (
              <Reveal key={c.title} delay={i * 0.06}>
                <Tilt3D className="glass relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl p-5" max={6}>
                  <span className="absolute inset-x-0 top-0 h-1" style={{ background: c.color, boxShadow: `0 0 18px ${c.color}` }} />
                  <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${c.color}1f`, color: c.color }}>
                    <Icon size={22} />
                  </span>
                  <div className="text-base font-semibold text-white">{c.title}</div>
                  <div className="text-sm leading-relaxed text-[var(--ink-soft)]">{c.desc}</div>
                </Tilt3D>
              </Reveal>
            )
          })}
        </div>
      </div>

      {/* Bilesenler */}
      <div>
        <h3 className="mb-3 text-lg font-bold text-white">Bileşenler</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COMPONENTS.map((c, i) => {
            const Icon = c.icon
            return (
              <Reveal key={c.title} delay={i * 0.08}>
                <Tilt3D className="glass relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl p-5" max={6}>
                  <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${c.color}1f`, color: c.color }}>
                    <Icon size={22} />
                  </span>
                  <div className="text-base font-semibold text-white">{c.title}</div>
                  <div className="text-sm leading-relaxed text-[var(--ink-soft)]">{c.desc}</div>
                </Tilt3D>
              </Reveal>
            )
          })}
        </div>
      </div>

      {/* Baglanabilirlik + secili bagli moduller (Urun Ayarlari'ndan) */}
      <Reveal>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 text-lg font-bold text-white">Bağlanabilirlik &amp; Modüller</h3>
          <div className="flex flex-wrap gap-2.5">
            {CONNECT.map((c) => {
              const Icon = c.icon
              return (
                <span key={c.label} className="flex items-center gap-2 rounded-full border border-[var(--hair)] bg-white/[0.04] px-3.5 py-1.5 text-sm font-medium text-[var(--ink)]">
                  <Icon size={15} className="text-[var(--smc-bright)]" />
                  {c.label}
                </span>
              )
            })}
            {/* Secili bagli moduller - kazanc renginde vurgulu, "+" ile ayirt edilir */}
            {activeModules.map((m) => (
              <span key={m.id} className="flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold" style={{ borderColor: 'rgba(65,224,138,0.5)', background: 'rgba(65,224,138,0.12)', color: 'var(--c-saving)' }}>
                <Plus size={15} />
                {m.badge}
              </span>
            ))}
          </div>
          {activeModules.length === 0 && (
            <div className="mt-3 text-xs text-[var(--ink-soft)]">
              Ek modül seçilmedi. <b className="text-[var(--ink)]">Ürün Ayarları &gt; Bağlı Modüller</b>'den ekleyebilirsiniz (ör. kablosuz EXW1).
            </div>
          )}
        </div>
      </Reveal>

      {/* Teknik ozellikler */}
      <Reveal>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 text-lg font-bold text-white">Teknik Özellikler</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {SPECS.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-[var(--smc-bright)]">
                    <Icon size={18} />
                  </span>
                  <div>
                    <div className="text-xs text-[var(--ink-soft)]">{s.label}</div>
                    <div className="text-sm font-semibold text-white">{s.value}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Reveal>
    </div>
  )
}
