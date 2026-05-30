/*
 * NE      : Premium ses motoru - Web Audio API ile SENTEZLENMIS (sample dosyasi yok) zarif efektler.
 * NEDEN   : Mehmet Bey: "saçmalamayacak çok etkileyecek ses efektleri" - ucuz/pikselli sample yerine temiz, kontrol edilebilir ton.
 * NASIL   : Tek AudioContext; osilator + zarf (gain envelope) ile blip/akor; hover/click/mod-gecis sesleri.
 * YAN ETKI: Varsayilan ACIK (Mehmet Abi); AudioContext ilk kullanici hareketinde resume olur (load'da kendiliginden ses YOK). Mute her an saygili.
 */
type ModeKind = 'normal' | 'standby' | 'isolation'

class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  muted = false   // Mehmet Abi: VARSAYILAN ACIK (ilk kullanici hareketinde AudioContext resume; load'da kendiliginden calmaz)

  private ensure(): AudioContext {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.5
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  setMuted(m: boolean): void {
    this.muted = m
    if (!m) this.ensure()
  }

  // Tek ton (yumusak zarf ile - tiklamasiz)
  private blip(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12): void {
    if (this.muted || !this.master) return
    const ctx = this.ensure()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.03)
  }

  private chord(freqs: number[], dur: number, vol = 0.07): void {
    freqs.forEach((f, i) => window.setTimeout(() => this.blip(f, dur, 'sine', vol), i * 55))
  }

  hover(): void { this.blip(880, 0.07, 'sine', 0.035) }
  click(): void { this.blip(523.25, 0.14, 'triangle', 0.08) }

  // Mod gecis sesleri (her biri farkli karakter)
  mode(kind: ModeKind): void {
    if (kind === 'normal') this.chord([523.25, 659.25, 783.99], 0.55) // yukselen aydinlik akor
    else if (kind === 'standby') this.chord([392.0, 523.25], 0.5) // yumusak ikili
    else this.blip(160, 0.45, 'sawtooth', 0.09) // alcalan kapanis tinisi
  }
}

export const sound = new SoundEngine()
