/*
 * NE      : Canli Panel'in yildiz bileseni - GERCEK WebGL 3D. Her sensor (metrics.ts) KENDI renginde TEK boru:
 *           "kuyruklu yildiz" gibi akar -> ON UC (yeni veri) parlak + hafif glow BAS; KUYRUK (eski uc) arkaya dogru SONUMLENIR.
 *           Renk EMISSIVE ile kendi renginde isir (koyu sahnede bile asla SIYAH degil). Yansiyan zemin + bloom + akan isik + parallax.
 *
 * NEDEN   : Mehmet Bey'in iterasyonlarinda netlesen ONAYLI vizyon (sade ve mantikli):
 *             - akan ince cizgi DEGIL; hacimli, puruzsuz, "dibine kadar 3D" boru
 *             - TEK boru (arkada coklu katman/echo YOK)
 *             - her boru KENDI karakteristik renginde (PBR/metalik DENENMEZ -> koyu sahnede karariyordu); emissive garanti
 *             - uclar hafiften kuyruklu-yildiz basi gibi parlasin; kuyruklar arkaya iz birakarak sonumlensin
 *             - akici, ufak duraksama yok; X ekseni canli/anlasilir zaman (simdi <-> -10 sn)
 *
 * NASIL   : 60fps KATI -> SIFIR kare-basi tahsisi. Boru geometrisi BIR KEZ kurulur (TubeGeometry); her karede yalnizca
 *           position+normal attribute'lari YERINDE yazilir. Egri DUZLEMSEL (z sabit) oldugu icin halka analitik hesaplanir
 *           (Frenet/realloc yok). Kuyruk izi = STATIK vertex-alpha (uc opak -> kuyruk saydam). DoubleSide -> her acidan garanti gorunur.
 *           Veriler hedefe lerp + komsu yumusatma (kirilmasiz). L = ekran penceresi nokta sayisi (~10 sn @80ms) + boru cozunurlugu.
 *
 * YAN ETKI: metrics dizisine sensor eklemek = otomatik yeni renkli boru. WINDOW_POINTS, ChartOverlay X-zaman etiketleriyle hizali.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial, Environment, Lightformer, Html } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Reading } from '@/data/types'
import { METRICS, type MetricDef } from '@/data/metrics'
import { isMobileDevice, isLiteForced, markLite, dprBudget } from '@/lib/device'
import { useLang } from '@/i18n'
import { localeOf } from '@/lib/format'

// --- Sahne sabitleri ---
const SPAN_X = 23 // borularin X genisligi: uc "simdi" (sag) - kuyruk "gecmis(~48sn)" (sol). Mehmet Abi: "en ONDEKI cubuk 'simdi' eksenine degsin" →
//   perspektifte EN ON (kameraya yakin, en buyuk z) boru en saga dustugu icin referans odur; SPAN 21→23 ile uclar saga "simdi" cizgisine ITILDI.
const MAX_H = 4.0 // normalize deger -> yukseklik
const L = 600 // ekran penceresi nokta sayisi (~48 sn @80ms tik) — Mehmet Abi GENIS zaman penceresini sevdi (sekme arkaplandayken gordugu ~56sn gibi); kalici/kontrollu
const RADIAL = 30 // boru kesit cozunurlugu — Mehmet Abi "daha kaliteli/akici; yaglanmis PURUZSUZ cam boru": 22->30
//   (kesit cok-kenarli koselilik tamamen gider → tam yuvarlak cam boru silueti). Geometri BIR KEZ kurulur; per-frame writeTube biraz artar ama 60fps korunur (RAM-safe; zayif GPU lite moda duser).
const TWO_PI = Math.PI * 2

// ChartOverlay'deki X-zaman etiketleri ekranda cizilen son N nokta ile hizali olsun (-> "simdi <-> ~-48 sn", L=600 @80ms)
export const WINDOW_POINTS = L

const xAt = (i: number) => -SPAN_X / 2 + (i / (L - 1)) * SPAN_X

// 15 DK seriyi (≈1/sn, ~900 nokta) sabit L uzunlugunda HAM deger dizisine YENIDEN ORNEKLER (sol=15dk once … sag=simdi).
// NEDEN: 15 dk ham veri boru geometrisine cok agir → veri (15dk) ile geometri (L=600 verteks) AYRILIR; seri L noktaya esit
//   araliklarla orneklenir. Seri kisaysa (taze acilis) gerilir; doldukca 15 dk'yi gosterir. (Yukseklik useFrame'de m.min..m.max.)
function sampleRaw(series: Reading[], m: MetricDef): number[] {
  const out = new Array<number>(L)
  const n = series.length
  if (n === 0) { out.fill(m.min); return out }
  if (n === 1) { out.fill(m.get(series[0])); return out }
  if (n <= L) {
    // AZ nokta (küçük pencere) → LİNEER ara-değer → merdiven/"kırık kırık" YOK (Mehmet Abi: küçük range'de kırık görünüyordu)
    for (let i = 0; i < L; i++) {
      const pos = (i / (L - 1)) * (n - 1), lo = Math.floor(pos), hi = Math.min(n - 1, lo + 1), fr = pos - lo
      out[i] = m.get(series[lo]) * (1 - fr) + m.get(series[hi]) * fr
    }
    return out
  }
  // ÇOK nokta (büyük/15dk pencere) → BİN ORTALAMA → gürültü/karman-çormanlık azalır, trend kalır (Mehmet Abi: "15 dk çok karışık")
  for (let i = 0; i < L; i++) {
    const a = Math.floor((i / L) * n), b = Math.max(a + 1, Math.floor(((i + 1) / L) * n))
    let s = 0; for (let j = a; j < b; j++) s += m.get(series[j])
    out[i] = s / (b - a)
  }
  // + hafif hareketli ortalama (pencere büyüdükçe daha sakin/tatlı çizgi) — yarıçap pencere yoğunluğuyla ölçeklenir
  const r = Math.min(6, Math.round(n / L))
  if (r >= 1) {
    const sm = out.slice()
    for (let i = 0; i < L; i++) {
      let s = 0, c = 0
      for (let k = -r; k <= r; k++) { const j = i + k; if (j >= 0 && j < L) { s += out[j]; c++ } }
      sm[i] = s / c
    }
    return sm
  }
  return out
}

/*
 * Duzlemsel egri (z sabit) icin TubeGeometry halka kesitini YERINDE yazar - kare basi TAHSIS YOK.
 * Egri XY duzleminde: tegtet T=(tx,ty,0); binormal B=(0,0,1); normal N=(ty,-tx,0). dir = c*N + s*B -> disa dogru.
 * Halka/dilim sirasi TubeGeometry ile AYNI (idx = ring*(RADIAL+1)+j) -> mevcut index/uv buffer'i gecerli kalir.
 */
function writeTube(pos: Float32Array, nor: Float32Array, pts: THREE.Vector3[], radius: number) {
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const p = pts[i]
    const pa = pts[i - 1] ?? pts[i]
    const pb = pts[i + 1] ?? pts[i]
    let tx = pb.x - pa.x
    let ty = pb.y - pa.y
    const tl = Math.hypot(tx, ty) || 1
    tx /= tl; ty /= tl
    const nx = ty
    const ny = -tx
    for (let j = 0; j <= RADIAL; j++) {
      const v = (j / RADIAL) * TWO_PI
      const c = -Math.cos(v)
      const s = Math.sin(v)
      const dx = c * nx
      const dy = c * ny
      const dz = s
      const idx = (i * (RADIAL + 1) + j) * 3
      pos[idx] = p.x + radius * dx
      pos[idx + 1] = p.y + radius * dy
      pos[idx + 2] = p.z + radius * dz
      nor[idx] = dx
      nor[idx + 1] = dy
      nor[idx + 2] = dz
    }
  }
}

function TubeStrand({ history, reading = null, m, index = 0, total = 1 }: { history: Reading[]; reading?: Reading | null; m: MetricDef; index?: number; total?: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const headCapRef = useRef<THREE.Mesh>(null) // bas ucu yuvarlak kapak (kesik degil)
  const tailCapRef = useRef<THREE.Mesh>(null) // kuyruk ucu yuvarlak kapak (soluk)
  const lightRef = useRef<THREE.PointLight>(null)
  const labelGroupRef = useRef<THREE.Group>(null) // değer etiketi BORUNUN ÜSTÜNDE (3D, boruyu 60fps takip) — index'e göre yatay kaydırma → çakışmaz
  const { t } = useLang()

  // Mehmet Abi: "boruları biraz daha incelt." Kesit yarıçapı daha da düşürüldü (0.6→0.48×, taban 0.05) → ince, zarif çizgi-boru.
  const tubeRadius = Math.max(0.05, m.width * 0.48)
  // DÜZLEŞTİRİLMİŞ Z (Mehmet Abi: "3D olduğu için boruların değerleri/zamanı karışıyor"): z yayılımı 3.0→~0.24'e indirildi (×0.08) →
  //   borular NEREDEYSE AYNI DÜZLEMDE → aynı zaman = aynı dikey hat, değerler 2D gibi BİREBİR karşılaştırılır. Küçük offset yalnız
  //   kesişmelerde tutarlı katman sırası için (z-fighting yok). Borular korunur ama "2D gibi hizalı" okunur.
  const tz = m.z * 0.08
  // Etiketin oturacağı NOKTA: borular boyunca GENİŞ yayılmış (yatay ayrık → çakışmaz). En oynak metrik (flow, en üst z = son sıra)
  //   NOW ucunda → etiket yüksekliği canlı değere uyar; durağanlar (nem/sıcaklık) geride (zaten sabit → uyumlu). ~%11 aralık.
  const labelIdx = Math.max(0, (L - 1) - (total - 1 - index) * Math.round(L * 0.11))

  const yRef = useRef<number[]>(new Array(L).fill(0.2))
  // useRef argümanı her render değerlendirilir ama yok sayılır → boş başlat; sampleRaw YALNIZ useMemo'da koşar (tik başına çift hesap önlenir).
  const targetRef = useRef<number[]>([])
  targetRef.current = useMemo(() => sampleRaw(history, m), [history, m])
  // SENKRON (Mehmet Abi): tüpün UCU (now) = CANLI reading → grafik ucu cihaz LCD'si/kartlarla EŞZAMANLI hareket eder (trend
  //   ~0,5sn gecikmesi ucu tutmaz). Memo dizisinin son elemanı her render canlı değere set edilir (ucuz; sayı ataması).
  if (reading) targetRef.current[L - 1] = m.get(reading)
  // (ADAPTİF auto-range KALDIRILDI — Mehmet Abi: "akışları gerçek değerlerde göster" → mutlak ölçek; useFrame'de m.min..m.max.)
  // Etiket metni = CANLI değer (reading) → cihaz LCD'si + sağ kartlarla BİREBİR TUTARLI (Mehmet Abi: "tüm değerler senkron").
  //   reading yoksa (ilk an) o noktanın target değerine düşer.
  const valText = new Intl.NumberFormat(localeOf(), { minimumFractionDigits: m.digits, maximumFractionDigits: m.digits }).format(reading ? m.get(reading) : (targetRef.current[labelIdx] ?? m.min))

  // Yeniden kullanilan egri noktalari (kare basi tahsis yok)
  const curvePts = useMemo(() => Array.from({ length: L }, (_, i) => new THREE.Vector3(xAt(i), 0.2, tz)), [tz])
  const curve = useMemo(() => new THREE.CatmullRomCurve3(curvePts), [curvePts])

  // Boru geometrisi BIR KEZ (opak → kuyruk-izi vertex-alpha KALDIRILDI; fazladan katman yok, temiz/kaliteli).
  const geo = useMemo(() => new THREE.TubeGeometry(curve, L - 1, tubeRadius, RADIAL, false), [curve, tubeRadius])
  useEffect(() => () => geo.dispose(), [geo])

  useFrame(() => {
    const raw = targetRef.current
    const y = yRef.current
    // GERÇEK DEĞER ÖLÇEĞİ (Mehmet Abi: "akışları gerçek değerlerde göster"): ADAPTİF auto-range KALDIRILDI. Yükseklik artık
    //   sensörün KENDİ TAM ölçeğine (m.min..m.max) göre MUTLAK → yüksek değer YUKARIDA, düşük değer AŞAĞIDA (sürekli re-center YOK)
    //   → tüpler eksenin %değerine oturur. (Eski adaptif zoom değeri ortalıyordu → "değerde değilmiş gibi" görünüyordu.)
    if (raw.length) {
      const denom = Math.max(m.max - m.min, 1e-6)
      for (let i = 0; i < L; i++) {
        const h = 0.2 + THREE.MathUtils.clamp((raw[i] - m.min) / denom, 0, 1) * MAX_H
        // YAĞ GİBI akıcı (Mehmet Abi: "hepsinin hareketi yağ gibi akmalı") → TEK TİP yumuşak yapışma. Senkron, ucun CANLI reading'e
        //   bağlı olmasından gelir (yukarıda head override); kademeli/sert lerp KALDIRILDI (kesik kesikliğin kaynağıydı).
        y[i] += (h - y[i]) * 0.06
      }
    }
    // 2) Egri noktalari (komsu yumusatma -> kirilmasiz)
    for (let i = 0; i < L; i++) {
      const a = y[i - 1] ?? y[i]
      const c = y[i + 1] ?? y[i]
      curvePts[i].set(xAt(i), (a + 2 * y[i] + c) / 4, tz)
    }
    // 3) Boru kesitini YERINDE yaz (tahsis yok)
    const mesh = meshRef.current
    if (mesh) {
      const posAttr = mesh.geometry.attributes.position as THREE.BufferAttribute
      const norAttr = mesh.geometry.attributes.normal as THREE.BufferAttribute
      writeTube(posAttr.array as Float32Array, norAttr.array as Float32Array, curvePts, tubeRadius)
      posAttr.needsUpdate = true
      norAttr.needsUpdate = true
    }
    // 4) Uç kapağı + hero zemin ışığı (metal aksan çizgileri ve uç glow KALDIRILDI — Mehmet Abi: "fazladan katmanlar kalitesiz")
    const hx = xAt(L - 1)
    const hy = y[L - 1]
    if (headCapRef.current) headCapRef.current.position.set(hx, hy, tz) // bas ucu yuvarlak kapak
    if (tailCapRef.current) tailCapRef.current.position.set(xAt(0), y[0], tz) // kuyruk ucu yuvarlak kapak
    if (m.hero && lightRef.current) lightRef.current.position.set(hx, hy + 0.5, tz + 1.2)
    // DEĞER etiketi borunun ÜSTÜNDE (labelIdx noktası) — boruyu 60fps takip eder (React DIŞI, akıcı). Her boru farklı x'te → çakışmaz.
    if (labelGroupRef.current) labelGroupRef.current.position.set(xAt(labelIdx), y[labelIdx] + tubeRadius + 0.42, tz)
  })

  return (
    <group>
      {/* RENKLI boru — kendi renginde emissive (siyahlama yok) + dusuk roughness -> keskin parlama; envMap yansima.
          Mehmet Abi: "şeffaflığı olmasın" → OPAK (transparent + depthWrite=false + vertex-alpha kuyruk izi KALDIRILDI) → boru içi görünmez, dolu.
          frustumCulled=false: vertex'ler her kare yukseliyor ama boundingSphere sabit -> acidan kaybolmayi onler. */}
      <mesh ref={meshRef} geometry={geo} frustumCulled={false}>
        <meshStandardMaterial
          color={m.color}
          emissive={m.color}
          emissiveIntensity={0.7}
          metalness={0}
          roughness={0.12}
          envMapIntensity={1.2}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Yuvarlak UC KAPAKLARI - boru uclari kesik gorunmesin; ikisi de OPAK (boru ile ayni dolu his) */}
      <mesh ref={headCapRef} frustumCulled={false}>
        <sphereGeometry args={[tubeRadius, 16, 16]} />
        <meshStandardMaterial color={m.color} emissive={m.color} emissiveIntensity={0.7} metalness={0} roughness={0.12} envMapIntensity={1.2} toneMapped={false} />
      </mesh>
      <mesh ref={tailCapRef} frustumCulled={false}>
        <sphereGeometry args={[tubeRadius, 12, 12]} />
        <meshStandardMaterial color={m.color} emissive={m.color} emissiveIntensity={0.7} metalness={0} roughness={0.12} envMapIntensity={1.2} toneMapped={false} />
      </mesh>

      {m.hero && <pointLight ref={lightRef} color={m.color} intensity={3} distance={9} />}

      {/* DEĞER etiketi — borunun ÜSTÜNDE oturur (3D, boruyu takip), kendi renginde + birimiyle (Mehmet Abi: "her borunun üzerinde, sağda
          sabit hizada zıplamasın"). Her boru farklı x noktasında (index kaydırma) → birbirine basmaz. */}
      <group ref={labelGroupRef}>
        <Html center distanceFactor={13} zIndexRange={[20, 0]} style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div
            style={{
              display: 'flex', alignItems: 'baseline', gap: 3, whiteSpace: 'nowrap',
              padding: '2px 7px', borderRadius: 999,
              background: 'rgba(5,11,24,0.82)',
              border: `1px solid ${m.color}66`, boxShadow: `0 0 12px -4px ${m.color}`,
            }}
          >
            <span className="num" style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{valText}</span>
            <span style={{ fontSize: 8, fontWeight: 600, color: m.color }}>{t(m.unitShort)}</span>
          </div>
        </Html>
      </group>
    </group>
  )
}

function ReflectiveFloor({ color, reflective }: { color: string; reflective: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <planeGeometry args={[70, 44]} />
      {/* 60fps: resolution + blur olculu (sis+opacity altinda gorsel fark minimal, kazanc buyuk).
          MOBIL (reflective=false): yansima render-pass'i (her kare AYRI sahne cizimi = en agir GPU yuku) ATLANIR →
          duz hafif metalik zemin. Gorsel cok benzer (koyu/sisli) ama bedava → baglam kaybi/"ekran yenileniyor" engellenir. */}
      {reflective ? (
        <MeshReflectorMaterial
          mirror={0.5}
          blur={[128, 32]}
          resolution={256}
          mixBlur={1}
          mixStrength={3.5}
          roughness={0.85}
          depthScale={1.1}
          minDepthThreshold={0.3}
          maxDepthThreshold={1.4}
          color={color}
          metalness={0.6}
        />
      ) : (
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.4} />
      )}
    </mesh>
  )
}

// Borular uzerinde soldan-saga suzulen yumusak isik -> yuzeyde gezen parilti (akan his)
function SweepLight() {
  const ref = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.x = Math.sin(clock.elapsedTime * 0.45) * (SPAN_X / 2)
  })
  return <pointLight ref={ref} position={[0, 3.2, 3]} color="#eaf3ff" intensity={3} distance={18} />
}

// SABİT kamera (Mehmet Abi: "fare ile 3D oynamasın") — kamera GERİ alındı (z 9→13) → perspektif yumuşadı: tüplerin "şimdi" (sağ)
//   uçları artık tek hatta daha iyi hizalanır (Mehmet Abi: "çubuklar şimdi'den başlamıyor gibi"); Z-derinlik (katmanlar) korunur.
function ParallaxRig() {
  const target = useMemo(() => new THREE.Vector3(0, 2.4, 13), [])
  useFrame((state) => {
    state.camera.position.lerp(target, 0.045)
    state.camera.lookAt(0, 1.6, 0)
  })
  return null
}

export function Hero3DChart({
  history,
  reading = null,
  metrics = METRICS,
  theme = 'dark',
}: {
  history: Reading[]
  reading?: Reading | null   // on-tube etiketler CANLI değeri buradan okur → cihaz LCD + kartlarla BİREBİR tutarlı
  metrics?: MetricDef[]
  theme?: 'dark' | 'light'
}) {
  // Arkadan-one siralama (z artan) -> dogru derinlik/saydam katmanlanma
  const ordered = useMemo(() => [...metrics].sort((a, b) => a.z - b.z), [metrics])
  // MOBIL: agir GPU yolu (yansima/bloom/multisampling/yuksek dpr) KAPATILIR → telefon GPU'su bunlari kaldiramayinca WebGL
  //   baglami dusuyor + her dokunusta/zoom'da remount = "ekran kendini yeniliyor". Yuku dusurunce baglam kaybi olmaz → KOKTEN biter.
  // HAFIF (lite) MOD: zayif GPU / buyuk-TV / fuar PC'sinde agir 3D'yi kis. mobil VEYA elle zorlanmis (?lite) VEYA
  //   context-loss sonrasi OTOMATIK acilir -> ekran "kaybolup yenilenme" dongusune girmez (FUAR kok-cozumu).
  const mobile = useMemo(() => isMobileDevice(), [])
  const forced = useMemo(() => isLiteForced(), [])
  const [autoLite, setAutoLite] = useState(false)
  const lite = mobile || forced || autoLite
  const liteRef = useRef(lite); liteRef.current = lite
  // RENDER COZUNURLUK TAVANI (piksel butcesi): 4K TV'de bile GPU bogulmasin -> dpr otomatik dusurulur (gorsel yine iyi).
  const dpr = useMemo(() => dprBudget(lite ? 1 : 1.5, lite ? 1_300_000 : 2_100_000), [lite])
  // WEBGL baglam kaybinda Canvas'i komple yeniden kurmak icin remount anahtari (manuel refresh GEREKMESIN)
  const [ctxKey, setCtxKey] = useState(0)
  const remounts = useRef(0) // TAVAN: tekrar tekrar remount engellenir
  // Gunduz modunda sahne zemini/sisi acilir (grafigin alt tarafi koyu kalmasin)
  const light = theme === 'light'
  const fogColor = light ? '#dce8f7' : '#04060f'
  const floorColor = light ? '#c2d4ec' : '#050c1a'
  return (
    <Canvas
      key={ctxKey}
      dpr={dpr}
      gl={{ antialias: !lite, alpha: true, powerPreference: lite ? 'default' : 'high-performance' }}
      camera={{ position: [0, 2.4, 13], fov: 30 }}
      onCreated={({ gl, invalidate }) => {
        // WEBGL BAĞLAM KAYBI KURTARMA: bağlam kaybında tarayıcının restore'una izin ver (preventDefault); R3F'in GPU kaynaklarını
        //   garanti toparlamak için kısa gecikmeyle Canvas'ı remount et (ctxKey++) — AMA TAVANLI (en çok 3 kez). Yük artık düşük
        //   olduğundan normalde HİÇ tetiklenmez; tetiklense de sonsuz "yenileniyor" döngüsüne girmez (Mehmet Abi şikâyetinin kökü).
        const canvas = gl.domElement
        const onLost = (e: Event) => {
          e.preventDefault()
          // ILK baglam kaybinda KALICI hafif moda gec (ayni agir yukle tekrar kaybetmesin) -> sonsuz "yenilenme" biter.
          if (!liteRef.current) { markLite(); setAutoLite(true) }
          if (remounts.current < 3) { remounts.current += 1; window.setTimeout(() => setCtxKey((k) => k + 1), 250) }
        }
        canvas.addEventListener('webglcontextlost', onLost, false)
        canvas.addEventListener('webglcontextrestored', () => { invalidate() }, false)
      }}
    >
      <fog attach="fog" args={[fogColor, 12, 28]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 8, 4]} intensity={0.5} color="#9ec9ff" />
      <pointLight position={[-6, 4, 6]} intensity={2.2} color="#0072CE" distance={22} />
      <SweepLight />

      {/* Prosedurel studyo ortami (OFFLINE - HDR indirmez, frames=1 statik) -> zeminde/boruda hafif yansima */}
      <Environment resolution={lite ? 64 : 128} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#2E9BFF" position={[0, 6, -8]} scale={[14, 5, 1]} />
        <Lightformer form="rect" intensity={1.3} color="#36E0C8" position={[-9, 3, 2]} scale={[6, 8, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[9, 4, 3]} scale={[6, 8, 1]} />
      </Environment>

      {ordered.map((m, i) => (
        <TubeStrand key={m.key} history={history} reading={reading} m={m} index={i} total={ordered.length} />
      ))}
      <ReflectiveFloor color={floorColor} reflective={!lite} />
      <ParallaxRig />

      {/* AĞIR post-processing (Bloom + multisampling) yalnız MASAÜSTÜ — mobilde GPU'yu boğup bağlam kaybına yol açıyordu. */}
      {!lite && (
        <EffectComposer multisampling={2}>
          <Bloom intensity={0.62} luminanceThreshold={0.25} luminanceSmoothing={0.9} mipmapBlur radius={0.75} />
        </EffectComposer>
      )}
    </Canvas>
  )
}
