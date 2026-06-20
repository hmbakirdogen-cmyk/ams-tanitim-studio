/*
 * NE      : Ana ekran CİHAZ KOMUT kutucukları (Mehmet abi 2026-06): Standby Input · Force Standby · Isolation — tıklayınca cihaza
 *           boolean OPC UA write gider (köprü üzerinden). Aç/Kapa (toggle): aktifken renkli yanar, durum CİHAZDAN (reading.status) yansır.
 * NEDEN   : Mehmet abi: "Standby input sinyalini OPC UA üzerinden verebiliyoruz; ufak kutucuk eklersen tıklayınca cihaza yollarım —
 *           standby/isolation özelliklerini de kullanırız." Isolation tıklayınca cihaz direkt havayı keser; Force Standby standby moduna alır.
 * NASIL   : Durum = reading.status (canlı cihaz BOOL'ları; demo senaryodan türetir). Tıkla → onCommand(key, !aktif) → kaynak.sendCommand.
 *           Optimistic DEĞİL: cihaz yazıp döndürünce status güncellenir → toggle gerçeği gösterir (yanlış "açık" görünmez).
 * YAN ETKI: Saf görsel + komut. Canlı modda gerçek cihazı kontrol eder (hava kesebilir) → görsel NET (aktif renk+glow). Offline.
 */
import { Leaf, Lock, PowerOff, type LucideIcon } from 'lucide-react'
import type { CommandKey, Reading } from '@/data/types'
import { useLang } from '@/i18n'
import { sound } from '@/lib/sound'

// Etiket = TÜRKÇE anahtar (i18n kuralı); EN/JA çevirisi i18n sözlüğünde. TR "Bekleme/İzolasyon", EN "Standby/Isolation", JA Japonca.
// Etiketler = cihazın GERÇEK OPC UA sinyal isimleri (Mehmet abi 2026-06-20): saha mühendisi hangi sinyali yolladığını birebir görsün.
const CMDS: { key: CommandKey; label: string; icon: LucideIcon; color: string }[] = [
  { key: 'standby', label: 'Standby Input Sinyali', icon: Leaf, color: '#41E08A' },   // tasarruf yeşili (mod: Tasarruf Modu ile tutarlı)
  { key: 'forceStandby', label: 'Force Standby', icon: Lock, color: '#2E9BFF' },       // zorlanmış — mavi
  { key: 'isolation', label: 'İzolasyon Sinyali', icon: PowerOff, color: '#FF453A' },  // hava kes/izolasyon — uyarı kırmızısı
]

// Durum CİHAZDAN: standby/forcedStandby BOOL; isolation = valve KAPALI (valveOpen=false) ya da mod isolation
function isOn(key: CommandKey, reading: Reading | null): boolean {
  const st = reading?.status
  if (key === 'standby') return !!st?.standby
  if (key === 'forceStandby') return !!st?.forcedStandby
  return st?.valveOpen != null ? !st.valveOpen : reading?.mode === 'isolation'
}

export function DeviceCommands({ reading, onCommand }: { reading: Reading | null; onCommand: (key: CommandKey, on: boolean) => void }) {
  const { t } = useLang()
  return (
    // Başlık sağında SADE kontrol şeridi. 2026-06-20 (Mehmet abi): kutucuklar DİKDÖRTGEN (ikon üstte + 2-satır etiket alt) — kare değil,
    //   biraz yüksek. AÇIK/KAPALI yazısı KALDIRILDI → buton zaten AKTİFKEN YANIYOR (renk+glow durumu gösterir). Dar ekranda dikey, sm+ yatay.
    <div className="glass flex flex-col gap-1 rounded-2xl p-1 sm:flex-row">
      {CMDS.map(({ key, label, icon: Icon, color }) => {
        const on = isOn(key, reading)
        return (
          <button
            key={key}
            onMouseEnter={() => sound.hover()}
            onClick={() => { sound.click(); onCommand(key, !on) }}
            aria-pressed={on}
            title={t(label)}
            className={`relative flex w-[86px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-center text-[9.5px] font-semibold leading-tight transition ${
              on ? 'text-white' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
            style={
              on
                ? { background: `linear-gradient(135deg, ${color}cc, ${color}66)`, boxShadow: `0 0 16px ${color}66, inset 0 0 0 1px ${color}` }
                : { background: 'var(--glass-bg)', boxShadow: 'inset 0 0 0 1px var(--hair)' }
            }
          >
            <Icon size={15} style={{ color: on ? '#fff' : color }} />
            <span>{t(label)}</span>
          </button>
        )
      })}
    </div>
  )
}
