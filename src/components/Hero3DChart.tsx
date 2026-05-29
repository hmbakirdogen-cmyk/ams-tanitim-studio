/*
 * NE      : Yildiz bilesen - GERCEK WebGL 3D cok-cizgili akis grafigi. MERKEZI sensor kaydindaki (metrics.ts) tum olcumler,
 *           her biri KENDI rengi/olcegi/derinlik katmaniyla; isildayan (bloom) cizgiler, yansiyan zemin, parallax.
 * NEDEN   : "kesik kesik AKMASIN" + "tum degerleri kendi karakterinde" + "yeni sensor eklenince otomatik" + "basit ASLA".
 * NASIL   : Her cizgi sabit tampon; useFrame'de hedefe lerp (60fps buttery) + Line2 geometrisini YERINDE gunceller (alloc yok).
 *           Cizgiler arkadan-one (z) siralanir; renkler kartlarla AYNI (metrics.ts) -> efsane/kimlik bagi nettir.
 * YAN ETKI: METRICS dizisine sensor eklemek = grafige otomatik yeni kimlikli cizgi. 120ms veri tick'i sadece hedefi besler.
 */
import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line, MeshReflectorMaterial, Environment, Lightformer, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Reading } from '@/data/types'
import { METRICS, type MetricDef } from '@/data/metrics'

const SPAN_X = 13
const MAX_H = 4.0
const L = 110 // her cizgideki nokta sayisi (yuksek = puruzsuz)

// Gecmisi sabit L uzunlugunda, metrigin kendi olceginde y-dizisine cevirir (yeni veri sagda)
function sampleY(history: Reading[], m: MetricDef): number[] {
  const out = new Array<number>(L)
  const n = history.length
  for (let i = 0; i < L; i++) {
    let v: number
    if (n === 0) v = m.min
    else {
      const idx = n - L + i
      const r = idx < 0 ? history[0] : history[idx]
      v = m.get(r)
    }
    const norm = THREE.MathUtils.clamp((v - m.min) / (m.max - m.min), 0, 1)
    out[i] = 0.2 + norm * MAX_H
  }
  return out
}

const xAt = (i: number) => -SPAN_X / 2 + (i / (L - 1)) * SPAN_X

function SmoothLine({ history, m }: { history: Reading[]; m: MetricDef }) {
  // drei Line ref'i Line2'dir; geometrisi (LineGeometry) setPositions destekler. Gevsek tip - kare basi yerinde guncelleme.
  const lineRef = useRef<any>(null)
  const cometRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const yRef = useRef<number[]>(new Array(L).fill(0.2))
  const posRef = useRef<number[]>(new Array(L * 3).fill(0))
  const targetRef = useRef<number[]>(sampleY(history, m))
  targetRef.current = useMemo(() => sampleY(history, m), [history, m])

  const initPoints = useMemo<[number, number, number][]>(
    () => Array.from({ length: L }, (_, i) => [xAt(i), 0.2, m.z]),
    [m.z],
  )

  useFrame(({ clock }) => {
    const t = targetRef.current
    const y = yRef.current
    const pos = posRef.current
    // 1) Hedefe yumusak yaklasim (akan his)
    for (let i = 0; i < L; i++) y[i] += (t[i] - y[i]) * 0.13
    // 2) Komsu ortalamasi ile yuvarla - cizgide ANI KIRILMA olmasin (yuvarlak/akici)
    for (let i = 0; i < L; i++) {
      const a = y[i - 1] ?? y[i]
      const c = y[i + 1] ?? y[i]
      pos[i * 3] = xAt(i)
      pos[i * 3 + 1] = (a + 2 * y[i] + c) / 4
      pos[i * 3 + 2] = m.z
    }
    const ln = lineRef.current
    if (ln && ln.geometry && ln.geometry.setPositions) ln.geometry.setPositions(pos)

    if (m.hero) {
      const hx = xAt(L - 1)
      const hy = y[L - 1]
      const pulse = 1 + Math.sin(clock.elapsedTime * 4) * 0.22
      if (cometRef.current) {
        cometRef.current.position.set(hx, hy, m.z)
        cometRef.current.scale.setScalar(pulse)
      }
      if (lightRef.current) {
        lightRef.current.position.set(hx, hy + 0.5, m.z + 1.2)
        lightRef.current.intensity = 5 + Math.sin(clock.elapsedTime * 4) * 1.5
      }
    }
  })

  return (
    <group>
      <Line ref={lineRef} points={initPoints} color={m.color} lineWidth={m.width} worldUnits transparent opacity={0.96} toneMapped={false} />
      {m.hero && (
        <>
          <mesh ref={cometRef}>
            <sphereGeometry args={[0.2, 28, 28]} />
            <meshBasicMaterial color="#eaf6ff" toneMapped={false} />
          </mesh>
          <pointLight ref={lightRef} color={m.color} intensity={6} distance={10} />
        </>
      )}
    </group>
  )
}

function ReflectiveFloor({ color }: { color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <planeGeometry args={[70, 44]} />
      <MeshReflectorMaterial
        mirror={0.55}
        blur={[480, 120]}
        resolution={1024}
        mixBlur={1}
        mixStrength={4}
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

// Fareye gore yumusak kamera parallax'i - dokunulasi derinlik
function ParallaxRig() {
  const target = useMemo(() => new THREE.Vector3(), [])
  useFrame((state) => {
    target.set(state.pointer.x * 1.6, 2.4 + state.pointer.y * 0.6, 9)
    state.camera.position.lerp(target, 0.045)
    state.camera.lookAt(0, 1.7, 0)
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
  // Arkadan-one siralama (z artan) -> dogru derinlik/saydamlik
  const ordered = useMemo(() => [...metrics].sort((a, b) => a.z - b.z), [metrics])
  // Gunduz modunda sahne zemini/sisi acilir (grafigin alt tarafi koyu kalmasin)
  const light = theme === 'light'
  const fogColor = light ? '#dce8f7' : '#04060f'
  const floorColor = light ? '#c2d4ec' : '#050c1a'
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 2.4, 9], fov: 42 }}
    >
      <fog attach="fog" args={[fogColor, 12, 28]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[6, 8, 4]} intensity={0.5} color="#9ec9ff" />
      <pointLight position={[-6, 4, 6]} intensity={2.5} color="#0072CE" distance={22} />

      {/* Prosedurel studyo ortami (OFFLINE - HDR indirmez) -> zemin/cizgilerde gercek yansimalar */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={2.2} color="#2E9BFF" position={[0, 6, -8]} scale={[14, 5, 1]} />
        <Lightformer form="rect" intensity={1.3} color="#36E0C8" position={[-9, 3, 2]} scale={[6, 8, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#ffffff" position={[9, 4, 3]} scale={[6, 8, 1]} />
      </Environment>
      {/* Atmosferik isilti parcaciklari - sinematik derinlik */}
      <Sparkles count={70} scale={[26, 10, 14]} position={[0, 4, -2]} size={2.4} speed={0.25} color="#8fd0ff" opacity={0.5} />

      {ordered.map((m) => (
        <SmoothLine key={m.key} history={history} m={m} />
      ))}
      <ReflectiveFloor color={floorColor} />
      <ParallaxRig />

      <EffectComposer multisampling={4}>
        <Bloom intensity={1.15} luminanceThreshold={0.2} luminanceSmoothing={0.9} mipmapBlur radius={0.8} />
      </EffectComposer>
    </Canvas>
  )
}
