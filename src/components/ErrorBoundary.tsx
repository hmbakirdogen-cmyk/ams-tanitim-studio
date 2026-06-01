/*
 * NE      : Hata kalkanı (React Error Boundary) — alt ağaçta render hatası olursa TÜM uygulamayı çökertmek yerine sakin bir
 *           kurtarma gösterir. İki biçim: 'fullscreen' (uygulama kökü, manuel) + 'inline' (tek grafik/bölüm, KENDİ KENDİNE toparlanır).
 * NEDEN   : Mehmet Abi: önce "canlı sayfada hata verip yeni pencerede açıyordu" → kök kalkan onu bitirdi. Sonra "grafik bir süre
 *           sonra duraksıyor" (muhtemel WebGL bağlam kaybı = GPU baskısı/sürücü reset'i; R3F render hatası fırlatıyor). Çözüm:
 *           inline kalkan kullanıcı hiç görmeden KENDİ KENDİNE yeniden mount etsin (taze WebGL bağlamı) → grafik geri gelsin.
 * NASIL   : getDerivedStateFromError + componentDidCatch hatayı tutar. inline'da: artan gecikmeyle (1.2→2.5→5 sn) en çok 3 kez
 *           OTOMATİK remount; sürekli sağlıklı kalırsa sayaç sıfırlanır (gelecekteki tek-seferlik hatalar yine otomatik kurtulsun).
 *           3 denemede düzelmezse manuel "Yeniden yükle" + hata mesajı GÖRÜNÜR (teşhis: F12'siz, ekran görüntüsüyle gönderilebilir).
 *           Reset = resetKey++ → alt ağaç temiz remount (window.location.reload DEĞİL → oturum/durum korunur, PWA yeniden açılmaz).
 * YAN ETKI: Otomatik kurtarma YALNIZ inline'da (fullscreen = katastrofik → manuel). useFrame (rAF) içi hatalar React dışıdır →
 *           onları Hero3DChart'taki WebGL bağlam-kaybı işleyicisi karşılar. Teknik detay teşhis için; müşteriye sade görünür.
 */
import { Component, Fragment, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react'

type Variant = 'fullscreen' | 'inline'

const MAX_AUTO_RETRIES = 3 // bu kadar OTOMATİK denemeden sonra manuel düğmeye düş (sonsuz döngü olmasın)
const AUTO_DELAYS = [1200, 2500, 5000] // artan gecikme (ms): geçici GPU baskısı geçsin diye nazik backoff
const HEALTHY_RESET_MS = 15000 // bu süre sağlıklı kalırsa fail sayacı sıfırlanır (yeni tek-seferlik hata yine otomatik kurtulsun)

interface Props {
  children: ReactNode
  variant?: Variant
  /** inline biçimde gösterilecek kısa etiket (ör. "Grafik", "Bu sayfa") */
  label?: string
}

interface State {
  hasError: boolean
  error: Error | null
  resetKey: number
  showDetail: boolean
  failCount: number // ardışık hata sayısı (otomatik deneme bütçesi); sağlıklı kalınca sıfırlanır
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, resetKey: 0, showDetail: false, failCount: 0 }
  private retryTimer: number | null = null
  private healthyTimer: number | null = null

  // Render sırasında hata olunca fallback'e geç (hatayı sakla → teknik detay + teşhis).
  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    // Gerçek hatayı TAGLI konsola düşür → kök sebep kaybolmaz (teşhis).
    console.error('[AMS ErrorBoundary]', this.props.label ?? '', error, info.componentStack)
    this.clearHealthyTimer() // hata oldu → "sağlıklı" sayacını iptal et
    // inline + otomatik deneme bütçesi varsa → kullanıcı görmeden KENDİ KENDİNE yeniden mount planla (artan gecikme).
    if (this.props.variant === 'inline' && this.state.failCount < MAX_AUTO_RETRIES) {
      const delay = AUTO_DELAYS[Math.min(this.state.failCount, AUTO_DELAYS.length - 1)]
      this.clearRetryTimer()
      this.retryTimer = window.setTimeout(this.autoReset, delay)
    }
    this.setState((s) => ({ failCount: s.failCount + 1 })) // bu hatayı say
  }

  componentWillUnmount(): void {
    this.clearRetryTimer()
    this.clearHealthyTimer()
  }

  private clearRetryTimer(): void {
    if (this.retryTimer !== null) { window.clearTimeout(this.retryTimer); this.retryTimer = null }
  }
  private clearHealthyTimer(): void {
    if (this.healthyTimer !== null) { window.clearTimeout(this.healthyTimer); this.healthyTimer = null }
  }

  // Ortak reset: alt ağacı temiz remount et. clearFails=true → kullanıcı elle bastı, sayaç sıfırlanır (taze otomatik bütçe).
  private doReset(clearFails: boolean): void {
    this.clearRetryTimer()
    this.setState((s) => ({
      hasError: false,
      error: null,
      resetKey: s.resetKey + 1,
      showDetail: false,
      failCount: clearFails ? 0 : s.failCount,
    }))
    // Bir süre sağlıklı kalırsa fail sayacını sıfırla (ileride tek-seferlik bir hata yine otomatik kurtulsun).
    this.clearHealthyTimer()
    this.healthyTimer = window.setTimeout(() => this.setState({ failCount: 0 }), HEALTHY_RESET_MS)
  }

  private autoReset = (): void => this.doReset(false)   // zamanlayıcıdan (otomatik): sayacı koru
  private manualReset = (): void => this.doReset(true)  // düğmeden (kullanıcı): sayacı sıfırla

  render(): ReactNode {
    if (!this.state.hasError) {
      // Fragment'a key vererek reset'te tüm alt ağaç temiz remount olur (donmuş canvas/üye state sıfırlanır).
      return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>
    }

    const err = this.state.error
    const detail = String(err?.stack || err?.message || err || '')

    // INLINE — tek bir panel/sayfa içinde; ebeveyn `relative` olmalı (glass panelleri zaten relative).
    if (this.props.variant === 'inline') {
      const recovering = this.state.failCount < MAX_AUTO_RETRIES // hâlâ otomatik toparlanıyor mu?
      return (
        <div className="absolute inset-0 z-30 grid place-items-center bg-[#060b18]/55 p-4 text-center backdrop-blur-md">
          <div className="max-w-[17rem]">
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-[#0072CE]/15 text-[#7cc0ff]">
              {recovering ? <Loader2 size={20} className="animate-spin" /> : <AlertTriangle size={20} />}
            </div>
            <p className="text-sm font-semibold text-white">
              {recovering
                ? `${this.props.label ?? 'Görüntü'} bir an duraksadı`
                : `${this.props.label ?? 'Görüntü'} yüklenemedi`}
            </p>
            <p className="mt-1 text-xs text-white/55">
              {recovering ? 'Kendi kendine yenileniyor — veriler akmaya devam ediyor.' : 'Birkaç deneme düzeltmedi.'}
            </p>
            <button
              onClick={this.manualReset}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#0072CE] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0086f0]"
            >
              <RefreshCw size={14} /> {recovering ? 'Şimdi yükle' : 'Yeniden yükle'}
            </button>
            <button
              onClick={() => this.setState((s) => ({ showDetail: !s.showDetail }))}
              className="mt-2 block w-full text-[11px] text-white/35 transition hover:text-white/70"
            >
              {this.state.showDetail ? 'Teknik detayı gizle' : 'Teknik detay'}
            </button>
            {this.state.showDetail && (
              <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-black/40 p-2.5 text-left text-[10.5px] leading-relaxed text-rose-200/80">
                {detail}
              </pre>
            )}
          </div>
        </div>
      )
    }

    // FULLSCREEN — uygulama kökü; kendi koyu zeminini taşır (arka plan da çökmüş olabilir). Manuel kurtarma.
    return (
      <div className="fixed inset-0 z-[100] grid place-items-center bg-gradient-to-b from-[#04060f] to-[#0a1326] p-6 text-center">
        <div className="glass max-w-md rounded-3xl p-8">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[#0072CE]/15 text-[#7cc0ff]">
            <AlertTriangle size={26} />
          </div>
          <h2 className="text-lg font-semibold text-white">Beklenmedik bir durum oldu</h2>
          <p className="mt-2 text-sm text-white/60">
            Uygulama küçük bir aksaklık yaşadı. Bilgileriniz yerinde — kaldığınız yerden devam edebilirsiniz.
          </p>
          <button
            onClick={this.manualReset}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#0072CE] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0086f0]"
          >
            <RefreshCw size={16} /> Tekrar Dene
          </button>
          <button
            onClick={() => this.setState((s) => ({ showDetail: !s.showDetail }))}
            className="mt-3 block w-full text-xs text-white/40 transition hover:text-white/70"
          >
            {this.state.showDetail ? 'Teknik detayı gizle' : 'Teknik detay'}
          </button>
          {this.state.showDetail && (
            <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-black/40 p-3 text-left text-[11px] leading-relaxed text-rose-200/80">
              {detail}
            </pre>
          )}
        </div>
      </div>
    )
  }
}
