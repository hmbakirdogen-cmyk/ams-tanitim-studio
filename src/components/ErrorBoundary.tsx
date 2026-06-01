/*
 * NE      : Hata kalkanı (React Error Boundary) — alt ağaçta render hatası olursa TÜM uygulamayı çökertmek yerine
 *           sakin bir "tekrar dene" gösterir. İki biçim: 'fullscreen' (uygulama kökü) + 'inline' (tek bir grafik/sayfa bölümü).
 * NEDEN   : Mehmet Abi: "canlı sayfada ara ara hata verip yeni pencerede yeniden açıyor." Kök sebep: HİÇ hata yakalayıcı yoktu →
 *           tek bir render istisnası (anlık veri uç durumu / WebGL bağlam kaybı = Windows GPU sürücü reset'i) beyaz ekrana +
 *           PWA'nın kendini yeniden açmasına yol açıyordu. Kalkan bunu YERİNDE kurtarmaya çevirir + gerçek hatayı konsola düşürür (teşhis).
 * NASIL   : Sınıf bileşeni (error boundary YALNIZ sınıfta olur). getDerivedStateFromError + componentDidCatch ile hatayı tutar;
 *           "Tekrar Dene" iç resetKey'i artırıp çocukları YENİDEN mount eder (window.location.reload DEĞİL → oturum/durum korunur,
 *           PWA yeniden açılmaz). Tasarım proje token'larıyla (glass/SMC mavisi) uyumlu, OFFLINE, sıcak Türkçe metin.
 * YAN ETKI: useFrame (rAF) İÇİNDEKİ hatalar React dışıdır → onları yakalamaz; onları Hero3DChart'taki WebGL bağlam-kaybı işleyicisi karşılar.
 *           Teknik detay varsayılan KAPALI (müşteriye korkutucu stack gösterme); Mehmet Abi açıp görebilir (teşhis için).
 */
import { Component, Fragment, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

type Variant = 'fullscreen' | 'inline'

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
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, resetKey: 0, showDetail: false }

  // Render sırasında hata olunca fallback'e geç (hatayı sakla → teknik detay + teşhis).
  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  // Gerçek hatayı TAGLI konsola düşür → bir dahaki sefere kök sebep görünür (teşhis kaybolmaz).
  componentDidCatch(error: Error, info: { componentStack: string }): void {
    console.error('[AMS ErrorBoundary]', this.props.label ?? '', error, info.componentStack)
  }

  // resetKey artar → çocuk ağaç YENİDEN mount → tekrar dener. Sayfa reload YOK (PWA yeniden açılmaz, durum korunur).
  reset = (): void => {
    this.setState((s) => ({ hasError: false, error: null, resetKey: s.resetKey + 1, showDetail: false }))
  }

  render(): ReactNode {
    if (!this.state.hasError) {
      // Fragment'a key vererek "Tekrar Dene"de tüm alt ağaç temiz remount olur (donmuş canvas/üye state sıfırlanır).
      return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>
    }

    const detail = String(this.state.error?.stack || this.state.error?.message || this.state.error || '')

    // INLINE — tek bir panel/sayfa içinde; ebeveyn `relative` olmalı (glass panelleri zaten relative).
    if (this.props.variant === 'inline') {
      return (
        <div className="absolute inset-0 z-30 grid place-items-center bg-[#060b18]/55 p-4 text-center backdrop-blur-md">
          <div className="max-w-[15rem]">
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-[#0072CE]/15 text-[#7cc0ff]">
              <AlertTriangle size={20} />
            </div>
            <p className="text-sm font-semibold text-white">
              {this.props.label ?? 'Görüntü'} bir an duraksadı
            </p>
            <p className="mt-1 text-xs text-white/55">Yenileniyor — veriler akmaya devam ediyor.</p>
            <button
              onClick={this.reset}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#0072CE] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0086f0]"
            >
              <RefreshCw size={14} /> Yeniden yükle
            </button>
          </div>
        </div>
      )
    }

    // FULLSCREEN — uygulama kökü; kendi koyu zeminini taşır (arka plan da çökmüş olabilir).
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
            onClick={this.reset}
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
