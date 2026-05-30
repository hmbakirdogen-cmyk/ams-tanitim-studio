/*
 * NE      : Ust cubuk - SMC logosu/kimligi, veri kaynagi rozeti (DEMO/CANLI), saat, ses ac-kapa.
 * NEDEN   : "Her yerden SMC belli" + kullanici dostu kontrol; canli/demo durumu net gorunsun.
 * NASIL   : glass cubuk; CANLI'da nabiz atan yesil halka, DEMO'da amber rozet; saat tr-TR; ses butonu lucide ikon.
 * YAN ETKI: Saat 1sn aralikli gunceller (unmount'ta temizlenir). Ses butonu ust state'i tetikler (App yonetir).
 */
import { useEffect, useState } from 'react'
import { Volume2, VolumeX, Radio } from 'lucide-react'
import { SmcLogo } from './SmcLogo'
import { useLang } from '@/i18n'

interface TopBarProps {
  kind: 'demo' | 'live'
  muted: boolean
  onToggleSound: () => void
}

export function TopBar({ kind, muted, onToggleSound }: TopBarProps) {
  const { t } = useLang()
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const time = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <header className="glass flex items-center justify-between rounded-2xl px-5 py-3">
      <SmcLogo size={52} />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-[var(--hair)] px-3 py-1.5">
          {kind === 'live' ? (
            <>
              <span className="relative grid h-2.5 w-2.5 place-items-center">
                <span className="live-ring absolute h-2.5 w-2.5 rounded-full bg-[var(--c-saving)]" />
              </span>
              <span className="text-xs font-semibold tracking-wide text-[var(--ink)]">{t('CANLI')}</span>
            </>
          ) : (
            <>
              <Radio size={14} className="text-[var(--c-temp)]" />
              <span className="text-xs font-semibold tracking-wide text-[var(--ink-soft)]">{t('DEMO VERİSİ')}</span>
            </>
          )}
        </div>

        <div className="num min-w-[64px] text-center text-sm font-medium text-[var(--ink-soft)]">{time}</div>

        <button
          onClick={onToggleSound}
          aria-label={muted ? t('Sesi aç') : t('Sesi kapat')}
          className="grid h-9 w-9 place-items-center rounded-full border border-[var(--hair)] text-[var(--ink-soft)] transition hover:bg-white/5 hover:text-[var(--ink)]"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </header>
  )
}
