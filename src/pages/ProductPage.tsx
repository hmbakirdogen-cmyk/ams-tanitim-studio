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
import {
  Leaf, PowerOff, Timer, Cpu, Gauge, Wind, Network, Wifi, Server, Ruler, Zap, ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

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
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto pr-1">
      <PageHeader title="Ürün & Teknoloji" subtitle="SMC Hava Yönetim Sistemi — AMS20/30/40/60 Serisi" />

      {/* Hero */}
      <Reveal>
        <Tilt3D className="glass relative grid grid-cols-1 gap-6 overflow-hidden rounded-3xl p-8 lg:grid-cols-[1.3fr_1fr]" max={4}>
          <div className="absolute -left-16 -top-16 h-52 w-52 rounded-full opacity-20 blur-3xl" style={{ background: 'var(--smc)' }} />
          <div style={{ transform: 'translateZ(20px)' }}>
            <SmcLogo size={48} withText={false} />
            <h2 className="mt-5 text-4xl font-extrabold leading-tight text-white">
              Boşa giden havayı <span className="text-[var(--c-saving)] glow-text" style={{ ['--glow' as string]: 'rgba(65,224,138,0.5)' }}>%62'ye kadar</span> azaltın
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--ink-soft)]">
              Air Management System; ekipman beklemedeyken hava basıncını otomatik düşürür ya da keser.
              Debi, basınç ve sıcaklığı sürekli ölçer; enerji tasarrufunu görünür kılar. Endüstri 4.0 ve
              kestirimci bakım için doğrudan veri iletişimi sunar.
            </p>
          </div>
          {/* Gercek urun gorseli slot'u (tasteful placeholder) */}
          <div className="relative flex min-h-[200px] items-center justify-center rounded-2xl border border-[var(--hair)] bg-gradient-to-br from-white/[0.06] to-transparent">
            <div className="text-center">
              <SmcLogo size={40} withText={false} />
              <div className="mt-3 text-sm font-semibold text-[var(--ink)]">AMS20/30/40/60</div>
              <div className="text-xs text-[var(--ink-soft)]">Ürün görseli</div>
            </div>
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

      {/* Baglanabilirlik */}
      <Reveal>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 text-lg font-bold text-white">Bağlanabilirlik</h3>
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
          </div>
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
