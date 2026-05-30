/*
 * NE      : "Cihaz Akışı" - Canlı Panel için GERÇEKÇİ 3B canlı görünüm (Klasik grafiğin yanında 2. seçenek; eski "Boru" yerine).
 *           Yarı ŞEFFAF bir AMS cihazı sahnenin ortasında; SOLDAN hortum giriş → SAĞDAN çıkış. İçinden uçtan uca şeffaf boru geçer,
 *           içinde hava soldan sağa AKAR. Hepsi anlık VERİYE bağlı: tek bakışta debi/basınç/sıcaklık/nem anlaşılır.
 *
 * NEDEN   : Mehmet Abi vizyonu: "boruyu kaldır; gerçek cihazın içinden hava aksın, en gerçekçi animasyonla; debi düşünce/yükselince
 *           akış, basınç değişince hava sıkışsın (regülatör), sıcaklık boru renginde, nem su damlalarıyla, valf egzozdan hava atsın".
 *
 * NASIL   : r3f + emissive (PBR değil — koyu sahnede kararmaz) + Bloom. Değerler ref'te yumuşatılır (SignalUpdater) ve TÜM alt
 *           bileşenlere paylaşılır. 60fps KATI: InstancedMesh + yeniden kullanılan dummy ile kare-başı SIFIR tahsis.
 *             - Debi (flow)  → akan parçacık HIZI + parlaklık (+ regülatör dışında yoğunluk).
 *             - Basınç (pres)→ REGÜLATÖR bölgesinde parçacıklar YAVAŞLAYIP SIKIŞIR (yoğunlaşma) + regülatör halkası parlar.
 *             - Sıcaklık (temp)→ boru + parçacık RENGİ (soğuk mavi → sıcak turuncu/kırmızı lerp).
 *             - Nem (hum)    → borunun ALTINDA gerçek SU DAMLALARI (sayı ∝ nem), yavaş kayar.
 *             - Valf         → mod normal değilken (tasarruf/kesinti = karşı basınç tahliyesi) EGZOZ portundan hava püskürür.
 *
 * YAN ETKI: Offline (HDR indirmez, frames=1). Üstüne 2B anlatım katmanı PipeOverlay biner (mod + anlık değer + eşik + giriş/çıkış).
 */
import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, Sparkles, RoundedBox } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Reading, Mode } from '@/data/types'
import { METRICS, type MetricDef } from '@/data/metrics'

// --- Sahne ölçüleri (X = akış yönü: sol giriş → sağ çıkış) ---
const PIPE_LEN = 15        // şeffaf ana borunun X uzunluğu (uçtan uca)
const PIPE_R = 0.46        // parçacıkların dolaştığı iç yarıçap
const REG0 = -0.5          // regülatör (sıkışma) bölgesi başlangıcı (X)
const REG1 = 1.15          // regülatör bölgesi bitişi (X)
const VALVE_X = 1.7        // valf/egzoz portu konumu (X)
const EXHAUST_PORT = new THREE.Vector3(VALVE_X, -1.05, 0.5) // egzozun havayı attığı yer
const FLOW_COUNT = 170     // akan hava parçacığı sayısı
const DROPLET_MAX = 28     // azami su damlası (aktif sayı ∝ nem)
const EXHAUST_COUNT = 44   // egzoz parçacığı havuzu
const TWO_PI = Math.PI * 2
const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

// Sıcaklık renk skalası (soğuk → sıcak)
const COLD = new THREE.Color('#37a3ff')
const WARM = new THREE.Color('#ff5a32')

// Tüm alt bileşenlerin okuduğu YUMUŞATILMIŞ sinyaller
interface Sig { flow: number; pressure: number; temp: number; hum: number; exhaust: number }

// Anlık hedefleri (ref) yumuşatıp paylaşılan sig'e yazar — useFrame sırasında İLK çalışmalı (en üstte mount).
function SignalUpdater({ targetRef, sigRef }: { targetRef: React.MutableRefObject<{ flow: number; pressure: number; temp: number; hum: number; mode: Mode }>; sigRef: React.MutableRefObject<Sig> }) {
  useFrame((_, dt) => {
    const k = Math.min(1, dt * 3)
    const s = sigRef.current
    const t = targetRef.current
    s.flow += (t.flow - s.flow) * k
    s.pressure += (t.pressure - s.pressure) * k
    s.temp += (t.temp - s.temp) * k
    s.hum += (t.hum - s.hum) * k
    // Egzoz: tasarruf/kesinti modunda karşı basınç tahliye edilir → port aktif (basınç ne kadar yüksekse o kadar güçlü).
    const exTarget = t.mode === 'normal' ? 0 : 0.45 + 0.55 * s.pressure
    s.exhaust += (exTarget - s.exhaust) * Math.min(1, dt * 2.2)
  })
  return null
}

// Şeffaf ana cam boru (renk = sıcaklık)
function GlassPipe({ sigRef }: { sigRef: React.MutableRefObject<Sig> }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const col = useMemo(() => new THREE.Color(), [])
  useFrame(() => {
    if (matRef.current) {
      col.lerpColors(COLD, WARM, sigRef.current.temp)
      matRef.current.color.copy(col)
      matRef.current.emissive.copy(col)
    }
  })
  return (
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[PIPE_R * 1.22, PIPE_R * 1.22, PIPE_LEN, 40, 1, true]} />
      <meshStandardMaterial ref={matRef} color={COLD} emissive={COLD} emissiveIntensity={0.18} transparent opacity={0.14} roughness={0.08} metalness={0} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

// Akan hava parçacıkları (debi=hız/parlaklık, basınç=regülatörde sıkışma, sıcaklık=renk)
function FlowParticles({ sigRef }: { sigRef: React.MutableRefObject<Sig> }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const col = useMemo(() => new THREE.Color(), [])
  // Parçacık başına: faz (0..1 boru boyunca), kesit açısı, yarıçap oranı, hız varyansı
  const phase = useMemo(() => Float32Array.from({ length: FLOW_COUNT }, (_, i) => i / FLOW_COUNT), [])
  const ang = useMemo(() => Float32Array.from({ length: FLOW_COUNT }, () => Math.random() * TWO_PI), [])
  const rad = useMemo(() => Float32Array.from({ length: FLOW_COUNT }, () => 0.12 + Math.random() * 0.82), [])
  const spd = useMemo(() => Float32Array.from({ length: FLOW_COUNT }, () => 0.82 + Math.random() * 0.36), [])

  useFrame((state, dt) => {
    const mesh = ref.current
    if (!mesh) return
    const { flow, pressure, temp } = sigRef.current
    const tnow = state.clock.elapsedTime
    // Renk + parlaklık (debi)
    if (matRef.current) {
      col.lerpColors(COLD, WARM, temp)
      matRef.current.color.copy(col)
      matRef.current.emissive.copy(col)
      matRef.current.emissiveIntensity = 0.55 + flow * 1.7
    }
    const base = (0.05 + 0.95 * flow) * 3.4 // dünya birimi/sn (debi düşünce neredeyse durur)
    const size = 0.05 + flow * 0.05
    for (let i = 0; i < FLOW_COUNT; i++) {
      let x = -PIPE_LEN / 2 + phase[i] * PIPE_LEN
      const inReg = x > REG0 && x < REG1
      // Regülatörde basınç yükseldikçe yavaşla → parçacıklar SIKIŞIR (yoğunlaşma)
      const factor = inReg ? 1 - 0.62 * pressure : 1
      phase[i] += (base * spd[i] * factor * dt) / PIPE_LEN
      if (phase[i] > 1) phase[i] -= 1
      x = -PIPE_LEN / 2 + phase[i] * PIPE_LEN
      const a = ang[i] + tnow * 0.35
      const rr = PIPE_R * rad[i]
      dummy.position.set(x, Math.sin(a) * rr, Math.cos(a) * rr)
      const sc = size * (0.55 + 0.7 * flow) * (inReg ? 1 + 0.35 * pressure : 1)
      dummy.scale.setScalar(Math.max(0.012, sc))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, FLOW_COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial ref={matRef} color={COLD} emissive={COLD} emissiveIntensity={1} metalness={0} roughness={0.3} transparent opacity={0.92} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  )
}

// Borunun altında biriken su damlaları (sayı ∝ nem)
function WaterDroplets({ sigRef }: { sigRef: React.MutableRefObject<Sig> }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const px = useMemo(() => Float32Array.from({ length: DROPLET_MAX }, () => Math.random()), [])
  const pz = useMemo(() => Float32Array.from({ length: DROPLET_MAX }, () => (Math.random() - 0.5) * 1.2), [])
  const dsp = useMemo(() => Float32Array.from({ length: DROPLET_MAX }, () => 0.01 + Math.random() * 0.03), [])
  const bob = useMemo(() => Float32Array.from({ length: DROPLET_MAX }, () => Math.random() * TWO_PI), [])

  useFrame((state, dt) => {
    const mesh = ref.current
    if (!mesh) return
    const { hum } = sigRef.current
    const active = Math.round(hum * DROPLET_MAX)
    const tnow = state.clock.elapsedTime
    for (let i = 0; i < DROPLET_MAX; i++) {
      if (i < active) {
        px[i] += dsp[i] * dt * (0.5 + hum) // yavaş sağa kayar
        if (px[i] > 1) px[i] -= 1
        const x = -PIPE_LEN / 2 + px[i] * PIPE_LEN
        const y = -PIPE_R * 0.82 + Math.sin(tnow * 1.5 + bob[i]) * 0.015
        const z = pz[i] * PIPE_R * 0.7
        dummy.position.set(x, y, z)
        const s = 0.05 + 0.045 * hum
        dummy.scale.set(s, s * 1.35, s) // hafif damla formu (dikey uzun)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      } else {
        dummy.position.set(0, -50, 0)
        dummy.scale.setScalar(0.0001)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, DROPLET_MAX]} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshStandardMaterial color="#bfe6ff" emissive="#7cc4ff" emissiveIntensity={0.5} roughness={0.05} metalness={0} transparent opacity={0.78} toneMapped={false} />
    </instancedMesh>
  )
}

// Valf egzozundan püsküren hava (mod normal değilken)
function ExhaustBurst({ sigRef }: { sigRef: React.MutableRefObject<Sig> }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const pos = useMemo(() => Array.from({ length: EXHAUST_COUNT }, () => EXHAUST_PORT.clone()), [])
  const vel = useMemo(() => Array.from({ length: EXHAUST_COUNT }, () => new THREE.Vector3()), [])
  const life = useMemo(() => Float32Array.from({ length: EXHAUST_COUNT }, () => Math.random()), [])

  useFrame((_, dt) => {
    const mesh = ref.current
    if (!mesh) return
    const ex = sigRef.current.exhaust
    for (let i = 0; i < EXHAUST_COUNT; i++) {
      life[i] -= dt * 1.3
      if (life[i] <= 0) {
        if (ex > 0.08) {
          // Yeniden doğ: porttan aşağı-öne doğru rastgele yön (havanın dışarı atılması)
          pos[i].copy(EXHAUST_PORT)
          vel[i].set((Math.random() - 0.5) * 1.4, -(1.6 + Math.random() * 1.8) * (0.5 + ex), (0.4 + Math.random() * 1.0))
          life[i] = 1
        } else {
          dummy.position.set(0, -50, 0)
          dummy.scale.setScalar(0.0001)
          dummy.updateMatrix()
          mesh.setMatrixAt(i, dummy.matrix)
          continue
        }
      }
      pos[i].addScaledVector(vel[i], dt)
      vel[i].y -= dt * 1.2 // hafif yerçekimi (saçılma)
      const l = life[i]
      dummy.position.copy(pos[i])
      const s = (0.04 + 0.07 * ex) * Math.sin(Math.min(1, l) * Math.PI)
      dummy.scale.setScalar(Math.max(0.0001, s))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, EXHAUST_COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color="#eaf4ff" emissive="#bcd9ff" emissiveIntensity={0.8} roughness={0.4} metalness={0} transparent opacity={0.7} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  )
}

// Yarı şeffaf AMS cihaz gövdesi + oransal regülatör (basınçla parlar/döner) + valf bloğu + egzoz nozulu
function DeviceBody({ sigRef }: { sigRef: React.MutableRefObject<Sig> }) {
  const regRingRef = useRef<THREE.MeshStandardMaterial>(null)
  const knobRef = useRef<THREE.Mesh>(null)
  const exhaustGlowRef = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    const { pressure, exhaust } = sigRef.current
    if (regRingRef.current) regRingRef.current.emissiveIntensity = 0.4 + pressure * 2.4 // basınç → regülatör halkası parlar
    if (knobRef.current) knobRef.current.rotation.y = pressure * Math.PI * 0.9 // knob basınçla döner
    if (exhaustGlowRef.current) exhaustGlowRef.current.emissiveIntensity = 0.2 + exhaust * 2.2
  })
  return (
    <group>
      {/* Ana gövde - yarı şeffaf cam (içinden boru/akış görünür) */}
      <RoundedBox args={[3.5, 2.2, 1.9]} radius={0.16} smoothness={4} position={[0.2, 0, 0]}>
        <meshStandardMaterial color="#9cc6f2" emissive="#0f4f96" emissiveIntensity={0.22} transparent opacity={0.13} roughness={0.06} metalness={0} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </RoundedBox>
      {/* İnce SMC-mavisi ışıyan çerçeve (gövde kenarı belli olsun) */}
      <RoundedBox args={[3.54, 2.24, 1.94]} radius={0.16} smoothness={2} position={[0.2, 0, 0]}>
        <meshBasicMaterial color="#2E9BFF" wireframe transparent opacity={0.16} toneMapped={false} />
      </RoundedBox>

      {/* ORANSAL REGÜLATÖR - gövdenin üstünde; halka basınçla parlar, knob döner */}
      <group position={[REG0 + 0.3, 1.18, 0]}>
        <mesh>
          <cylinderGeometry args={[0.34, 0.4, 0.5, 28]} />
          <meshStandardMaterial color="#cfe2f7" emissive="#1f6fc0" emissiveIntensity={0.3} roughness={0.3} metalness={0.1} toneMapped={false} />
        </mesh>
        {/* basınç göstergesi halkası */}
        <mesh position={[0, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.26, 0.045, 10, 28]} />
          <meshStandardMaterial ref={regRingRef} color="#36E0C8" emissive="#36E0C8" emissiveIntensity={0.6} roughness={0.2} toneMapped={false} />
        </mesh>
        {/* ayar knobu */}
        <mesh ref={knobRef} position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.12, 0.16, 0.22, 16]} />
          <meshStandardMaterial color="#eaf3ff" emissive="#9ec9ff" emissiveIntensity={0.3} roughness={0.25} metalness={0.2} toneMapped={false} />
        </mesh>
      </group>

      {/* VALF BLOĞU + EGZOZ NOZULU (sağ tarafta, aşağı bakan) */}
      <group position={[VALVE_X, -0.2, 0.2]}>
        <mesh>
          <boxGeometry args={[0.7, 0.8, 0.7]} />
          <meshStandardMaterial color="#b9d4ef" emissive="#134a86" emissiveIntensity={0.25} transparent opacity={0.5} roughness={0.25} metalness={0.1} toneMapped={false} />
        </mesh>
        {/* egzoz nozulu */}
        <mesh position={[0, -0.55, 0.25]} rotation={[Math.PI * 0.18, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.14, 0.5, 16]} />
          <meshStandardMaterial color="#d7e6f7" emissive="#7cc4ff" emissiveIntensity={0.4} roughness={0.3} metalness={0.2} toneMapped={false} />
        </mesh>
        {/* egzoz ağzı parıltısı (tahliyede parlar) */}
        <mesh position={[0, -0.8, 0.32]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial ref={exhaustGlowRef} color="#eaf4ff" emissive="#bcd9ff" emissiveIntensity={0.3} transparent opacity={0.85} toneMapped={false} />
        </mesh>
      </group>

      {/* SMC mavi taban tablası (cihaz "otursun") */}
      <mesh position={[0.2, -1.18, 0]}>
        <boxGeometry args={[3.7, 0.14, 2.0]} />
        <meshStandardMaterial color="#0a2c52" emissive="#0072CE" emissiveIntensity={0.12} roughness={0.5} metalness={0.2} toneMapped={false} />
      </mesh>
    </group>
  )
}

// Giriş/çıkış hortumları (eğik koyu lastik tüpler)
function Hose({ from, to, color = '#16202e' }: { from: [number, number, number]; to: [number, number, number]; color?: string }) {
  const geo = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const mid = a.clone().lerp(b, 0.5)
    mid.y -= 0.5 // hafif sarkma
    const curve = new THREE.CatmullRomCurve3([a, mid, b])
    return new THREE.TubeGeometry(curve, 24, 0.26, 16, false)
  }, [from, to])
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} emissive="#0a2540" emissiveIntensity={0.15} roughness={0.6} metalness={0.15} toneMapped={false} />
    </mesh>
  )
}

// Fareyle yumuşak kamera parallax'ı
function ParallaxRig() {
  const target = useMemo(() => new THREE.Vector3(), [])
  useFrame((state) => {
    target.set(state.pointer.x * 1.3, 0.6 + state.pointer.y * 0.5, 12)
    state.camera.position.lerp(target, 0.045)
    state.camera.lookAt(0, 0.1, 0)
  })
  return null
}

function DeviceScene({ reading, metrics, mode }: { reading: Reading | null; metrics: MetricDef[]; mode: Mode }) {
  const byKey = useMemo(() => Object.fromEntries(metrics.map((m) => [m.key, m])) as Record<string, MetricDef>, [metrics])
  const nv = (k: string) => {
    const m = byKey[k]
    if (!m || !reading) return 0
    return clamp01((m.get(reading) - m.min) / (m.max - m.min))
  }
  const targetRef = useRef({ flow: 0, pressure: 0, temp: 0, hum: 0, mode })
  targetRef.current = { flow: nv('flow'), pressure: nv('pressure'), temp: nv('temperature'), hum: nv('humidity'), mode }
  const sigRef = useRef<Sig>({ flow: 0, pressure: 0, temp: 0, hum: 0, exhaust: 0 })

  return (
    <>
      <SignalUpdater targetRef={targetRef} sigRef={sigRef} />
      <Hose from={[-PIPE_LEN / 2 - 2.4, -0.1, 0]} to={[-PIPE_LEN / 2 + 0.6, 0, 0]} />
      <Hose from={[PIPE_LEN / 2 - 0.6, 0, 0]} to={[PIPE_LEN / 2 + 2.4, -0.1, 0]} />
      <DeviceBody sigRef={sigRef} />
      <GlassPipe sigRef={sigRef} />
      <FlowParticles sigRef={sigRef} />
      <WaterDroplets sigRef={sigRef} />
      <ExhaustBurst sigRef={sigRef} />
    </>
  )
}

export function DeviceFlowChart({
  reading,
  metrics = METRICS,
  mode = 'normal',
  theme = 'dark',
}: {
  reading: Reading | null
  metrics?: MetricDef[]
  mode?: Mode
  theme?: 'dark' | 'light'
}) {
  const light = theme === 'light'
  const fogColor = light ? '#dce8f7' : '#04060f'
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.6, 12], fov: 38 }}
      onCreated={({ camera }) => camera.lookAt(0, 0.1, 0)}
    >
      <fog attach="fog" args={[fogColor, 16, 34]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 6]} intensity={0.6} color="#bfe0ff" />
      <pointLight position={[-7, 3, 7]} intensity={1.8} color="#0072CE" distance={26} />

      {/* Prosedürel stüdyo ortamı (OFFLINE) → cam gövdede/boruda hafif yansıma */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.0} color="#2E9BFF" position={[0, 6, -8]} scale={[16, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#36E0C8" position={[-9, 2, 3]} scale={[6, 8, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#ffffff" position={[9, 3, 3]} scale={[6, 8, 1]} />
      </Environment>
      <Sparkles count={50} scale={[24, 9, 10]} position={[0, 1, -2]} size={2.2} speed={0.22} color="#8fd0ff" opacity={0.4} />

      <DeviceScene reading={reading} metrics={metrics} mode={mode} />
      <ParallaxRig />

      <EffectComposer multisampling={4}>
        <Bloom intensity={0.85} luminanceThreshold={0.22} luminanceSmoothing={0.9} mipmapBlur radius={0.8} />
      </EffectComposer>
    </Canvas>
  )
}
