/*
 * NE      : Canlı Panel'in İKİ grafiğinin (Akış + Klasik) ORTAK arka plan sahnesi — "teknolojik hava akış sistemi" ambiyansı.
 *           Derin boşluk + perspektif sistem ızgarası + içinden YATAY süzülen parlak hava zerreleri (çok katmanlı → akış+parallax) +
 *           yumuşak nefes alan glow küreleri. İki panel bu TEK sahnenin üstünde yan yana asılı → bütünlük + ferahlık.
 * NEDEN   : Mehmet Abi: "iki grafiğin ortak arka planı; uçan parlak şeyler, sanki teknolojik bir hava akış sistemine bakıyormuşuz gibi.
 *           Tasarımcı gözünle yorumla." → tek ortak sahne, sade ama sinematik; panellerin altında sürekli (kutu arası boşlukta da görünür).
 * NASIL   : Saf Canvas 2D, 60fps (SABİT havuz, kare-başı tahsis YOK). Fareyle hafif parallax. Tema-duyarlı (gece koyu / gündüz açık).
 *           Foto/grafik DEĞİL → yalnız ambiyans; pointer-events YOK (tıklama panellere geçer). Offline (CDN yok).
 * YAN ETKI: Şeffaf çizer (clearRect) → arkadaki glass/sahne sızar; üstündeki paneller de yarı saydam olduğundan sahne görünür.
 */
import { useEffect, useRef } from 'react'
import { isMobileDevice } from '@/lib/device'

// Akış zerresi/glow/yıldız sayıları MOBİLDE düşürülür (telefon CPU/GPU'su 3 ayrı canvas + WebGL ile boğulmasın → ısınma/refresh yok).
// Masaüstü değerleri (Mehmet Abi onaylı "tertemiz/sakin derinlik": 96→54) AYNEN korunur.
const FLOW_N_DESKTOP = 54, FLOW_N_MOBILE = 22
const GLOW_N_DESKTOP = 3, GLOW_N_MOBILE = 2
const STAR_N_DESKTOP = 70, STAR_N_MOBILE = 26 // 'space' modu (ürün penceresi) yıldız alanı

export function AmbientScene({ theme = 'dark', flow = 0.4, space = false }: { theme?: 'dark' | 'light'; flow?: number; space?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const flowRef = useRef(flow); flowRef.current = flow
  const themeRef = useRef(theme); themeRef.current = theme
  const spaceRef = useRef(space); spaceRef.current = space

  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')!
    // MOBİL: parçacık sayıları + dpr düşürülür (telefonda 3 canvas + WebGL aynı anda → ısınma/takılma/refresh önlenir).
    const mobile = isMobileDevice()
    const FLOW_N = mobile ? FLOW_N_MOBILE : FLOW_N_DESKTOP
    const GLOW_N = mobile ? GLOW_N_MOBILE : GLOW_N_DESKTOP
    const STAR_N = mobile ? STAR_N_MOBILE : STAR_N_DESKTOP

    let W = 0, H = 0, dpr = 1
    const resize = () => {
      dpr = Math.min(mobile ? 1 : 2, window.devicePixelRatio || 1)
      W = wrap.clientWidth; H = wrap.clientHeight
      canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr))
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize); ro.observe(wrap)
    // 2D context GPU-reset dayanikligi (Mehmet Abi: "urunun arka plani hicbir sey gozukmuyor"): preventDefault olmadan
    //   context kaybinda tarayici onu GERI YUKLEMEZ → arka plan KALICI bosalir. Sahne her kare prosedurel cizildigi icin
    //   (clearRect + draw) restore sonrasi kendiliginden geri gelir → ayri restore handler gerekmez.
    const onCtxLost = (e: Event) => { e.preventDefault() }
    canvas.addEventListener('contextlost', onCtxLost)

    // PARALLAX — fare panele göre nerede (−1..1); ızgara/zerreler buna göre hafif kayar (dokunulası 3B his)
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 }
    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect()
      ptr.tx = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1
      ptr.ty = ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1
    }
    const onLeave = () => { ptr.tx = 0; ptr.ty = 0 }
    // dokunma panellere gitsin diye listener WINDOW'da (canvas pointer-events:none)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('blur', onLeave)

    // SABİT HAVUZLAR (kare-başı tahsis yok)
    // Yatay akış zerreleri: x ilerler; lane = dikey bant; dep = derinlik (0 uzak/küçük/yavaş → 1 yakın/iri/hızlı)
    const fX = Float32Array.from({ length: FLOW_N }, () => Math.random())
    const fLane = Float32Array.from({ length: FLOW_N }, () => Math.random())
    const fDep = Float32Array.from({ length: FLOW_N }, () => Math.random())
    const fSpd = Float32Array.from({ length: FLOW_N }, () => 0.6 + Math.random() * 0.9)
    // Glow küreleri: yumuşak büyük haleler (yavaş süzülür)
    const gPhase = Float32Array.from({ length: GLOW_N }, (_, i) => i / GLOW_N + Math.random() * 0.1)
    const gLane = Float32Array.from({ length: GLOW_N }, () => 0.25 + Math.random() * 0.5)
    // 'space' yıldız alanı: ekran-uzayında dağılmış minik noktalar; sZ = derinlik (0 uzak/sönük/küçük → 1 yakın), parallax'a duyarlı, nazik twinkle
    const sX = Float32Array.from({ length: STAR_N }, () => Math.random())
    const sY = Float32Array.from({ length: STAR_N }, () => Math.random())
    const sZ = Float32Array.from({ length: STAR_N }, () => Math.random())
    const sPh = Float32Array.from({ length: STAR_N }, () => Math.random() * Math.PI * 2)

    let raf = 0, last = performance.now()
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now
      const dark = themeRef.current !== 'light'
      const fl = flowRef.current
      ctx.clearRect(0, 0, W, H)   // ŞEFFAF — arkadaki glass/sahne sızar

      ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 2.5); ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 2.5)
      const par = Math.min(W, H) * 0.045
      const ox = -ptr.x * par, oy = -ptr.y * par * 0.6
      // UFUK (perspektif kaçış noktası) ÜST panele çekildi (Mehmet Abi: "3D space arka planı bir üst pencereye uygula").
      //   H*0.5 iken 3D zemin ALT panelde (klasik grafik) belirgindi; H*0.30 → 3D derinlik CİHAZ penceresinde (üst) okunur.
      const cxC = W / 2 + ox, horizon = H * 0.30 + oy
      const col = dark ? '70,150,255' : '0,114,206'      // SMC mavisi (sistem ızgarası)
      const teal = dark ? '54,224,200' : '0,150,160'     // teal aksan (akış zerreleri çeşitlemesi)

      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over'

      // 1) GLOW KÜRELERİ — arkada yumuşak nefes alan haleler (derinlik + canlılık)
      for (let i = 0; i < GLOW_N; i++) {
        gPhase[i] += dt * (0.015 + 0.01 * i)
        if (gPhase[i] > 1) gPhase[i] -= 1
        const gx = gPhase[i] * (W + 2 * par) - par + ox
        const gy = gLane[i] * H + oy + Math.sin(now * 0.0003 + i) * H * 0.04
        const gr = Math.min(W, H) * (0.22 + 0.06 * i)
        const c = i % 2 === 0 ? col : teal
        const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr)
        rg.addColorStop(0, `rgba(${c},${dark ? 0.13 : 0.11})`); rg.addColorStop(1, `rgba(${c},0)`) // gündüz glow güçlendirildi (uçuk değil)
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(gx, gy, gr, 0, Math.PI * 2); ctx.fill()
      }

      // (Yıldız alanı en SONA — vignette'den SONRA — taşındı; eskiden burada çizilip köşe-karartmayla bastırılıyordu = görünmüyordu.)

      // 2) PERSPEKTİF SİSTEM IZGARASI — derinliğe kaçan çizgiler (3D "hava kanalı/sistem" hissi).
      //   Mehmet Abi "tertemiz/sakin derinlik" → ızgara İNCELTİLDİ + SOLUKLAŞTIRILDI (alpha ~yarı, çizgi 0.8px) ve KENARLARA
      //   doğru sönümlenir (vignette): ürünün/grafiğin arkası temiz, derinlik hissi korunur ama gürültü/çizgi-kalabalığı yok.
      ctx.lineWidth = 0.8
      const edgeFade = (x: number) => {                         // ekran kenarlarına doğru soluklaş (orta net, kenar temiz)
        const d = Math.abs(x - W / 2) / (W / 2)
        return 1 - Math.min(1, d) * 0.55
      }
      for (let i = 1; i <= 9; i++) {
        const f = i / 9
        const yy = horizon + Math.pow(f, 2.1) * (H - horizon) * 1.1
        if (yy > H + 4) break
        ctx.strokeStyle = `rgba(${col},${(dark ? 0.11 : 0.14) * (1 - f * 0.55)})`  // gündüz ızgara güçlendirildi (açık zeminde silik kalmasın)
        ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(W, yy); ctx.stroke()
        const yu = horizon - Math.pow(f, 2.1) * horizon * 1.05   // ufuk ÜSTÜ simetrik (tavan kanalı)
        ctx.strokeStyle = `rgba(${col},${(dark ? 0.07 : 0.10) * (1 - f * 0.55)})`
        ctx.beginPath(); ctx.moveTo(0, yu); ctx.lineTo(W, yu); ctx.stroke()
      }
      const spread = W * 0.9
      for (let i = -6; i <= 6; i++) {
        const xb = cxC + (i / 6) * spread
        ctx.strokeStyle = `rgba(${col},${(dark ? 0.10 : 0.13) * (1 - Math.abs(i) / 7) * edgeFade(xb)})`   // derinliğe kaçan dikey çizgiler (gündüz güçlendirildi)
        ctx.beginPath(); ctx.moveTo(cxC + (i / 6) * spread * 0.1, horizon); ctx.lineTo(xb, H); ctx.stroke()
      }
      // ufuk ışık bandı (derinlik kapanışı) — yumuşak/soluk
      const hg = ctx.createLinearGradient(0, horizon - H * 0.16, 0, horizon + H * 0.08)
      hg.addColorStop(0, `rgba(${col},0)`); hg.addColorStop(0.6, `rgba(${col},${dark ? 0.10 : 0.06})`); hg.addColorStop(1, `rgba(${col},0)`)
      ctx.fillStyle = hg; ctx.fillRect(0, horizon - H * 0.16, W, H * 0.22)

      // 3) YATAY SÜZÜLEN HAVA ZERRELERİ — "uçan parlak ışıklar"; akış soldan sağa. Derinlik (fDep) → boyut/parlaklık/hız/parallax.
      //   Mehmet Abi "sakin derinlik" → parlaklık hafif kısıldı (uzak katman daha soluk), iz biraz inceltildi → ferah/temiz.
      ctx.lineCap = 'round'
      const baseV = 0.04 + 0.14 * fl
      for (let i = 0; i < FLOW_N; i++) {
        const dep = fDep[i]                                  // 0 uzak … 1 yakın
        fX[i] += baseV * fSpd[i] * (0.35 + dep) * dt
        if (fX[i] > 1.05) { fX[i] = -0.05; fLane[i] = Math.random(); fDep[i] = Math.random() }
        const depPar = (dep - 0.5) * par * 1.6               // yakın katman fareyle daha çok kayar (parallax derinlik)
        const x = fX[i] * (W + 80) - 40 + ox + depPar
        const y = fLane[i] * H + oy * (0.4 + dep) + Math.sin(now * 0.0006 + i) * 2
        const sz = 0.5 + dep * 1.8
        const a = (dark ? 0.16 : 0.14) + dep * (dark ? 0.44 : 0.40)   // gündüz zerre parlaklığı artırıldı (açık zeminde net akış)
        const len = 4 + dep * 20 * (0.4 + fl)               // hızlı/yakın = uzun iz (akış hissi)
        const c = i % 5 === 0 ? teal : col                   // çoğu mavi, arada teal kıvılcım
        ctx.strokeStyle = `rgba(${c},${a * 0.5})`; ctx.lineWidth = sz
        ctx.beginPath(); ctx.moveTo(x - len, y); ctx.lineTo(x, y); ctx.stroke()
        // parlak baş (uçan ışık çekirdeği)
        ctx.fillStyle = `rgba(${c},${a})`; ctx.beginPath(); ctx.arc(x, y, sz * 0.9, 0, Math.PI * 2); ctx.fill()
      }

      // 4) KENAR VIGNETTE (Mehmet Abi "tertemiz") — köşelere doğru hafif koyulaşma: ızgara/zerre kenarlarda erir,
      //    panelin ortası (ürün/grafik) NET odakta kalır → premium, gürültüsüz çerçeve hissi. source-over (her temada koyu).
      ctx.globalCompositeOperation = 'source-over'
      const vg = ctx.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.30, W / 2, H * 0.5, Math.max(W, H) * 0.72)
      vg.addColorStop(0, 'rgba(4,10,22,0)')
      vg.addColorStop(1, `rgba(4,10,22,${dark ? 0.42 : 0.16})`)
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)

      // 5) HAFİF 3D UZAY YILDIZ ALANI (yalnız 'space' = ürün penceresi). Mehmet Abi: "ürünün arka planında, çok hafif basit 3d space".
      //   EN ÜST katman (vignette'den SONRA) + additif çizim → köşelerde bile parlar, ASLA bastırılmaz (eski hata: vignette altında kalıyordu).
      //   Derinliğe (sZ) göre boyut/parlaklık + parallax (yakın yıldız fareyle daha çok kayar) + nazik twinkle. Çok sönük → ferah.
      if (spaceRef.current) {
        ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over'
        const starC = dark ? '200,224,255' : '120,150,200'   // gündüz: açık zeminde görünür koyu-mavi yıldız
        for (let i = 0; i < STAR_N; i++) {
          const z = sZ[i]                                   // 0 uzak … 1 yakın
          const px = sX[i] * W + ox * (0.3 + z * 1.4)       // yakın = daha çok parallax
          const py = sY[i] * H + oy * (0.3 + z * 1.4)
          const tw = 0.6 + 0.4 * Math.sin(now * 0.0012 + sPh[i]) // nazik yanıp-sönme
          const r = 0.6 + z * 1.5
          const a = ((dark ? 0.28 : 0.14) + z * (dark ? 0.62 : 0.34)) * tw  // gece belirgin (görünür ama hafif), gündüz sönük-zarif
          // yakın yıldızlara minik glow (3D derinlik hissi, hafif)
          if (z > 0.6) {
            const gr = ctx.createRadialGradient(px, py, 0, px, py, r * 3.5)
            gr.addColorStop(0, `rgba(${starC},${a * 0.5})`); gr.addColorStop(1, `rgba(${starC},0)`)
            ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(px, py, r * 3.5, 0, Math.PI * 2); ctx.fill()
          }
          ctx.fillStyle = `rgba(${starC},${a})`
          ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill()
        }
        ctx.globalCompositeOperation = 'source-over'
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf); ro.disconnect()
      canvas.removeEventListener('contextlost', onCtxLost)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('blur', onLeave)
    }
  }, [])

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
