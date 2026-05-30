/*
 * NE      : PWA kurulum daveti - ekran altinda sinematik kart. Android/Chrome'da tek tik "Telefona Yukle";
 *           iOS Safari'de adim adim "Paylas -> Ana Ekrana Ekle" yonergesi. Zaten kuruluysa/kapatildiysa gorunmez.
 * NEDEN   : Mehmet Abi: telefondan kurulabilir, offline app. "Cok acik UI" -> ne yapacagi net, kibar, SMC kimligiyle.
 * NASIL   : useInstallPrompt durumu + framer-motion girisi; SMC mavisi vurgu; lucide ikonlari; .no-print (raporda cikmaz).
 * YAN ETKI: Yalnizca kurulabilir baglamda (https/localhost + SW) Android daveti cikar; iOS yonergesi her zaman gosterilebilir.
 *           Mount yeri App koku -> giris ekraninda da gorunur (musteri ilk anda kurabilir).
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Share, Plus, X, Smartphone } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { sound } from '@/lib/sound'

export function InstallPrompt() {
  const { canInstall, isIOS, installed, dismissed, promptInstall, dismiss } = useInstallPrompt()
  // iOS yonergesini ac/kapa (Android'de gerekmez; tek tikla yuklenir)
  const [showSteps, setShowSteps] = useState(false)

  // Gosterim kosulu: kurulu degil, kapatilmamis VE (Android yukleyebilir VEYA iOS elle ekleyebilir)
  const visible = !installed && !dismissed && (canInstall || isIOS)
  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div
        key="install-prompt"
        className="no-print fixed inset-x-0 bottom-0 z-[120] flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      >
        <div className="glass force-dark-surface relative w-full max-w-md rounded-2xl p-4 pr-11">
          {/* Kapat (kalici) */}
          <button
            onClick={() => { sound.click(); dismiss() }}
            aria-label="Kapat"
            className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-lg text-[var(--ink-soft)] transition hover:bg-white/10 hover:text-[var(--ink)]"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3.5">
            {/* SMC ikon rozeti */}
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white"
              style={{
                background: 'linear-gradient(135deg, #2491f0, #0072CE 55%, #024a96)',
                boxShadow: '0 0 22px -4px #2E9BFF, inset 0 0 0 1px rgba(255,255,255,0.18)',
              }}
            >
              <Smartphone size={22} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold leading-tight text-white">
                Uygulamayı telefonuna kur
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--ink-soft)]">
                {isIOS
                  ? 'Tam ekran, hızlı ve internetsiz açılır — ana ekranına bir dokunuş.'
                  : 'Tam ekran, hızlı ve internetsiz çalışır. Tek dokunuşla kurulur.'}
              </p>

              {/* ANDROID / CHROME: tek tik yukleme */}
              {!isIOS && canInstall && (
                <button
                  onClick={async () => { sound.click(); await promptInstall() }}
                  className="keep-white mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #2491f0, #0072CE)',
                    boxShadow: '0 8px 24px -8px #0072CE, inset 0 0 0 1px rgba(255,255,255,0.22)',
                  }}
                >
                  <Download size={17} />
                  Telefona Yükle
                </button>
              )}

              {/* iOS: elle "Ana Ekrana Ekle" yonergesi (acilir adimlar) */}
              {isIOS && (
                <div className="mt-3">
                  <button
                    onClick={() => { sound.click(); setShowSteps((s) => !s) }}
                    className="keep-white inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #2491f0, #0072CE)',
                      boxShadow: '0 8px 24px -8px #0072CE, inset 0 0 0 1px rgba(255,255,255,0.22)',
                    }}
                  >
                    <Share size={16} />
                    Nasıl kurulur?
                  </button>

                  <AnimatePresence>
                    {showSteps && (
                      <motion.ol
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 space-y-2 overflow-hidden text-[13px] text-[var(--ink)]"
                      >
                        <li className="flex items-center gap-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">1</span>
                          Alttaki <Share size={15} className="mx-0.5 inline text-[var(--smc-bright)]" /> <b>Paylaş</b> simgesine dokun.
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">2</span>
                          <span className="inline-flex items-center gap-1">
                            <b>Ana Ekrana Ekle</b> <Plus size={15} className="text-[var(--smc-bright)]" /> seç.
                          </span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">3</span>
                          Sağ üstte <b>Ekle</b>'ye dokun — bitti! 🎉
                        </li>
                      </motion.ol>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
