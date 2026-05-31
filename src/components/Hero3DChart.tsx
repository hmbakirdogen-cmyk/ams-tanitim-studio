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
import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial, Environment, Lightformer, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Reading } from '@/data/types'
import { METRICS, type MetricDef } from '@/data/metrics'

// --- Sahne sabitleri ---
const SPAN_X = 21 // borularin X genisligi: uc "simdi" (sag) - kuyruk "gecmis(16sn)" (sol) PANEL KENARINA kadar (Mehmet Abi: uclar "simdi"ye degsin).
const MAX_H = 4.0 // normalize deger -> yukseklik
const L = 600 // ekran penceresi nokta sayisi (~48 sn @80ms tik) — Mehmet Abi GENIS zaman penceresini sevdi (sekme arkaplandayken gordugu ~56sn gibi); kalici/kontrollu
const RADIAL = 12 // boru kesit cozunurlugu (yuvarlak)
const TWO_PI = Math.PI * 2

// ChartOverlay'deki X-zaman etiketleri ekranda cizilen son N nokta ile hizali olsun (-> "simdi <-> -10 sn")
export const WINDOW_POINTS = L

const xAt = (i: number) => -SPAN_X / 2 + (i / (L - 1)) * SPAN_X

// Gecmisi sabit L uzunlugunda, metrigin kendi olceginde yukseklik dizisine cevirir (yeni veri sagda = uc)
function sampleY(history: Reading[], m: MetricDef): number[] {
  const out = new Array<number>(L)
  const n = history.length
  for (let i = 0; i < L; i++) {
    let v: number
    if (n === 0) v = m.min
    else {
      const idx = n - L + i
      v = m.get(idx < 0 ? history[0] : history[idx])
    }
    const norm = THREE.MathUtils.clamp((v - m.min) / (m.max - m.min), 0, 1)
    out[i] = 0.2 + norm * MAX_H
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

function TubeStrand({ history, m }: { history: Reading[]; m: MetricDef }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const headRef = useRef<THREE.Mesh>(null) // ucta kuyruklu-yildiz basi (hafif glow)
  const headCapRef = useRef<THREE.Mesh>(null) // bas ucu yuvarlak kapak (kesik degil)
  const tailCapRef = useRef<THREE.Mesh>(null) // kuyruk ucu yuvarlak kapak (soluk)
  const lightRef = useRef<THREE.PointLight>(null)

  const tubeRadius = Math.max(0.04, m.width * 0.62) // daha ince boru (gercek tel/boru hissi)

  const yRef = useRef<number[]>(new Array(L).fill(0.2))
  // useRef argümanı her render değerlendirilir ama yok sayılır → boş başlat; sampleY YALNIZ useMemo'da koşar (tik başına çift hesap önlenir).
  const targetRef = useRef<number[]>([])
  targetRef.current = useMemo(() => sampleY(history, m), [history, m])

  // Yeniden kullanilan egri noktalari (kare basi tahsis yok)
  const curvePts = useMemo(() => Array.from({ length: L }, (_, i) => new THREE.Vector3(xAt(i), 0.2, m.z)), [m.z])
  const curve = useMemo(() => new THREE.CatmullRomCurve3(curvePts), [curvePts])

  // Boru geometrisi BIR KEZ + kuyruk izi icin STATIK vertex-alpha (uc opak -> kuyruk saydam)
  const geo = useMemo(() => {
    const g = new THREE.TubeGeometry(curve, L - 1, tubeRadius, RADIAL, false)
    const count = g.attributes.position.count
    const colors = new Float32Array(count * 4)
    for (let p = 0; p < count; p++) {
      const ring = Math.floor(p / (RADIAL + 1)) // 0 = kuyruk(eski/sol) ... L-1 = bas(yeni/sag)
      const a = 0.06 + 0.94 * Math.pow(ring / (L - 1), 1.0) // arkaya dogru UZUN, yumusak sonumlenen kuyruk izi
      colors[p * 4] = 1; colors[p * 4 + 1] = 1; colors[p * 4 + 2] = 1; colors[p * 4 + 3] = a
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 4)) // RGBA -> three alpha'yi kullanir
    return g
  }, [curve, tubeRadius])
  useEffect(() => () => geo.dispose(), [geo])

  // BOYLU BOYUNCA metal aksan cizgileri (gercek metal his): ust (parlak gumus) + yan (hafif). Kuyrukta boru ile uyumlu sonumlenir.
  const { accentTopGeo, accentSideGeo, accentTopLine, accentSideLine } = useMemo(() => {
    const build = (rgb: [number, number, number], opacityScale: number) => {
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(L * 3), 3))
      const col = new Float32Array(L * 4)
      for (let i = 0; i < L; i++) {
        const a = (0.06 + 0.94 * Math.pow(i / (L - 1), 1.0)) * opacityScale // tube kuyruk izine uyumlu
        col[i * 4] = rgb[0]; col[i * 4 + 1] = rgb[1]; col[i * 4 + 2] = rgb[2]; col[i * 4 + 3] = a
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 4))
      const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false })
      return { g, line: new THREE.Line(g, mat) }
    }
    const top = build([0.93, 0.96, 1.0], 1.0) // parlak gumus tepe cizgisi
    const side = build([0.6, 0.7, 0.82], 0.6) // hafif yan metal cizgi
    return { accentTopGeo: top.g, accentSideGeo: side.g, accentTopLine: top.line, accentSideLine: side.line }
  }, [])
  useEffect(() => () => {
    accentTopGeo.dispose(); accentSideGeo.dispose()
    ;(accentTopLine.material as THREE.Material).dispose()
    ;(accentSideLine.material as THREE.Material).dispose()
  }, [accentTopGeo, accentSideGeo, accentTopLine, accentSideLine])

  useFrame(() => {
    const t = targetRef.current
    const y = yRef.current
    // 1) Degerler hedefe yumusak yaklasir (akan his)
    for (let i = 0; i < L; i++) y[i] += (t[i] - y[i]) * 0.13
    // 2) Egri noktalari (komsu yumusatma -> kirilmasiz)
    for (let i = 0; i < L; i++) {
      const a = y[i - 1] ?? y[i]
      const c = y[i + 1] ?? y[i]
      curvePts[i].set(xAt(i), (a + 2 * y[i] + c) / 4, m.z)
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
    // 3b) Boylu boyunca metal aksan cizgileri (boru tepesinde + on-yaninda)
    const atp = accentTopGeo.attributes.position.array as Float32Array
    const asp = accentSideGeo.attributes.position.array as Float32Array
    for (let i = 0; i < L; i++) {
      const px = curvePts[i].x
      const py = curvePts[i].y
      atp[i * 3] = px; atp[i * 3 + 1] = py + tubeRadius * 0.85; atp[i * 3 + 2] = m.z
      asp[i * 3] = px; asp[i * 3 + 1] = py - tubeRadius * 0.35; asp[i * 3 + 2] = m.z + tubeRadius * 0.78
    }
    accentTopGeo.attributes.position.needsUpdate = true
    accentSideGeo.attributes.position.needsUpdate = true
    // 4) Kuyruklu-yildiz basi (ucta, yeni veri) + hero'da yumusak zemin isigi
    const hx = xAt(L - 1)
    const hy = y[L - 1]
    if (headRef.current) headRef.current.position.set(hx, hy, m.z)
    if (headCapRef.current) headCapRef.current.position.set(hx, hy, m.z) // bas ucu yuvarlak kapak
    if (tailCapRef.current) tailCapRef.current.position.set(xAt(0), y[0], m.z) // kuyruk ucu yuvarlak kapak
    if (m.hero && lightRef.current) lightRef.current.position.set(hx, hy + 0.5, m.z + 1.2)
  })

  return (
    <group>
      {/* RENKLI CAM boru - kendi renginde emissive ZEMIN (siyahlama yok) + dusuk roughness -> keskin cam parlamasi (ISIK),
          studyo yansimasi (envMap) + kesit golgelemesi (GOLGE). DoubleSide (garanti gorunur) + kuyruk izi (vertex-alpha).
          frustumCulled=false: vertex'ler her kare yukseliyor ama boundingSphere sabit -> acidan kaybolmayi onler. */}
      <mesh ref={meshRef} geometry={geo} frustumCulled={false}>
        <meshStandardMaterial
          color={m.color}
          emissive={m.color}
          emissiveIntensity={0.5}
          metalness={0}
          roughness={0.18}
          envMapIntensity={0.85}
          vertexColors
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Yuvarlak UC KAPAKLARI - boru uclari kesik/acik gorunmesin (yuvarlansin + kapansin) */}
      <mesh ref={headCapRef} frustumCulled={false}>
        <sphereGeometry args={[tubeRadius, 16, 16]} />
        <meshStandardMaterial color={m.color} emissive={m.color} emissiveIntensity={0.5} metalness={0} roughness={0.18} envMapIntensity={0.85} transparent opacity={0.92} toneMapped={false} />
      </mesh>
      <mesh ref={tailCapRef} frustumCulled={false}>
        <sphereGeometry args={[tubeRadius, 12, 12]} />
        <meshBasicMaterial color={m.color} transparent opacity={0.12} depthWrite={false} toneMapped={false} />
      </mesh>

      {/* Boylu boyunca METAL aksan cizgileri (THREE.Line; <line> JSX SVG ile cakistigi icin primitive) */}
      <primitive object={accentSideLine} />
      <primitive object={accentTopLine} />

      {/* Kuyruklu-yildiz BASI: ucta kucuk, hafif additive glow (her boru kendi renginde) */}
      <mesh ref={headRef} frustumCulled={false}>
        <sphereGeometry args={[tubeRadius * 1.6, 16, 16]} />
        <meshBasicMaterial color={m.color} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>

      {m.hero && <pointLight ref={lightRef} color={m.color} intensity={3} distance={9} />}
    </group>
  )
}

function ReflectiveFloor({ color }: { color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <planeGeometry args={[70, 44]} />
      {/* 60fps: resolution + blur olculu (sis+opacity altinda gorsel fark minimal, kazanc buyuk) */}
      <MeshReflectorMaterial
        mirror={0.5}
        blur={[256, 64]}
        resolution={512}
        mixBlur={1}
        mixStrength={3.5}
        roughness={0.85}
        depthScale={1.1}
        minDepthThreshold={0.3}
        maxDepthThreshold={1.4}
        color={color}
        metalness={0.6}
      />
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
  metrics = METRICS,
  theme = 'dark',
}: {
  history: Reading[]
  metrics?: MetricDef[]
  theme?: 'dark' | 'light'
}) {
  // Arkadan-one siralama (z artan) -> dogru derinlik/saydam katmanlanma
  const ordered = useMemo(() => [...metrics].sort((a, b) => a.z - b.z), [metrics])
  // Gunduz modunda sahne zemini/sisi acilir (grafigin alt tarafi koyu kalmasin)
  const light = theme === 'light'
  const fogColor = light ? '#dce8f7' : '#04060f'
  const floorColor = light ? '#c2d4ec' : '#050c1a'
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 2.4, 13], fov: 30 }}
    >
      <fog attach="fog" args={[fogColor, 12, 28]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[6, 8, 4]} intensity={0.5} color="#9ec9ff" />
      <pointLight position={[-6, 4, 6]} intensity={2.2} color="#0072CE" distance={22} />
      <SweepLight />

      {/* Prosedurel studyo ortami (OFFLINE - HDR indirmez, frames=1 statik) -> zeminde/boruda hafif yansima */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#2E9BFF" position={[0, 6, -8]} scale={[14, 5, 1]} />
        <Lightformer form="rect" intensity={1.3} color="#36E0C8" position={[-9, 3, 2]} scale={[6, 8, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[9, 4, 3]} scale={[6, 8, 1]} />
      </Environment>
      {/* Atmosferik isilti parcaciklari - sinematik derinlik */}
      <Sparkles count={70} scale={[26, 10, 14]} position={[0, 4, -2]} size={2.4} speed={0.25} color="#8fd0ff" opacity={0.5} />

      {ordered.map((m) => (
        <TubeStrand key={m.key} history={history} m={m} />
      ))}
      <ReflectiveFloor color={floorColor} />
      <ParallaxRig />

      <EffectComposer multisampling={4}>
        <Bloom intensity={0.85} luminanceThreshold={0.22} luminanceSmoothing={0.9} mipmapBlur radius={0.8} />
      </EffectComposer>
    </Canvas>
  )
}
