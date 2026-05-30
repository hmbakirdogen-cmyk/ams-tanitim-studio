/*
 * NE      : "Canli Pnomatik Hat" - Canli Panel icin ALTERNATIF grafik. Her sensor YATAY, SEFFAF bir CAM BORU; icinden
 *           soldan saga AKAN HAVA (kaydirilan isikli paketler). Boru SABIT; sadece icindeki hava akar (eski "yilan" hissi yok).
 *           Anlik deger -> akis HIZI + parlaklik + DOLUM BOYU (boru ne kadar dolu). Esik = boru uzerinde isaret.
 *
 * NEDEN   : Mehmet Abi: "yilan gibi kivrilan cizgi degil; gercek seffaf temiz borulardan hava akiyormus gibi gorunsun;
 *           neye gore artip azaldigi (mod/basinc/esik) ve anlik deger NET olsun". SMC = Hava Yonetim Sistemi -> boru/hava
 *           musterinin kendi urunu (tematik dogru). Hibrit: 3B cam boru (bu dosya) + 2B anlatim katmani (PipeOverlay).
 *
 * NASIL   : Her boru = dis CAM silindir (seffaf, emissive kenar) + ic DOLUM silindiri (boyu = normalize deger; uzerinde
 *           kaydirilan emissive/alpha doku = akan hava paketleri). 60fps: geometri sabit; her kare yalnizca core.scale +
 *           texture.offset + emissiveIntensity guncellenir (tahsis yok). Bloom + studyo ortami = premium cam parlamasi.
 *           Esik (bekleme esigi/hedef basinc) boru uzerinde kucuk parlak isaret olarak gosterilir.
 *
 * YAN ETKI: Offline (HDR indirmez, frames=1). metrics dizisine sensor eklemek = otomatik yeni boru. Klasik grafik silinmez;
 *           LivePage'deki "Boru/Klasik" anahtariyla secilir.
 */
import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, Sparkles } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import type { Reading } from '@/data/types'
import { METRICS, type MetricDef } from '@/data/metrics'

const FULL_LEN = 12.6 // boru uzunlugu (dunya birimi) - X ekseni
const RADIUS = 0.36 // boru yaricapi
const GAP = 1.55 // borular arasi dikey aralik
const PACKETS = 6 // boru boyunca ayni anda gorunen hava paketi sayisi

// Akan hava paketleri dokusu: dikey (V ekseni boyunca) tekrar eden YUMUSAK parlak bantlar.
// Silindir UV'sinde V = boru BOYU -> offset.y kaydirinca paketler boru boyunca akar. .g kanali alphaMap (paket arasi seffaf).
function makeFlowTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = 16
  c.height = 128
  const ctx = c.getContext('2d')!
  ctx.clearRect(0, 0, 16, 128)
  const seg = 128 / 4
  for (let k = 0; k < 4; k++) {
    const cy = k * seg + seg / 2
    const g = ctx.createLinearGradient(0, cy - seg * 0.45, 0, cy + seg * 0.45)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.5, 'rgba(255,255,255,1)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, cy - seg * 0.45, 16, seg * 0.9)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, PACKETS)
  return tex
}

function normValue(history: Reading[], m: MetricDef): number {
  const last = history[history.length - 1]
  if (!last) return 0
  return THREE.MathUtils.clamp((m.get(last) - m.min) / (m.max - m.min), 0, 1)
}

function Pipe({ history, m, y, threshold }: { history: Reading[]; m: MetricDef; y: number; threshold: number | null }) {
  const coreRef = useRef<THREE.Mesh>(null)
  const coreMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const outletRef = useRef<THREE.MeshStandardMaterial>(null)
  const vRef = useRef(0)

  const tex = useMemo(() => makeFlowTexture(), [])
  useEffect(() => () => tex.dispose(), [tex])

  useFrame((_, dt) => {
    const target = normValue(history, m)
    // yumusak yaklasma (akan his); dt-bagimsiz
    vRef.current += (target - vRef.current) * Math.min(1, dt * 4)
    const v = vRef.current

    // 1) DOLUM BOYU = deger (soldan saga). Silindir ekseni lokal Y; rotateZ(90) -> dunya X. scale.y = v.
    const core = coreRef.current
    if (core) {
      core.scale.y = Math.max(0.0001, v)
      core.position.x = -FULL_LEN / 2 + (v * FULL_LEN) / 2 // sol kenar sabit (-FULL_LEN/2)
      core.visible = v > 0.01
    }
    // 2) AKAN HAVA: dokuyu boru boyunca kaydir; hiz = 0.12 + v (durur gibi -> tasarrufta yavaslar, kesintide neredeyse durur)
    tex.offset.y -= dt * (0.12 + v * 0.95)
    // 3) Parlaklik = deger
    if (coreMatRef.current) coreMatRef.current.emissiveIntensity = 0.5 + v * 1.7
    if (outletRef.current) outletRef.current.emissiveIntensity = 0.35 + v * 1.6
  })

  const thrX = threshold != null ? -FULL_LEN / 2 + THREE.MathUtils.clamp(threshold, 0, 1) * FULL_LEN : 0

  return (
    <group position={[0, y, 0]}>
      {/* DIS CAM BORU - seffaf, kendi renginde hafif emissive kenar (koyu sahnede kaybolmaz) */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[RADIUS, RADIUS, FULL_LEN, 28, 1, true]} />
        <meshStandardMaterial
          color={m.color}
          emissive={m.color}
          emissiveIntensity={0.16}
          transparent
          opacity={0.16}
          roughness={0.1}
          metalness={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* IC DOLUM (akan hava) - boyu = deger; uzerinde kaydirilan isikli paketler (emissiveMap + alphaMap) */}
      <mesh ref={coreRef} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[RADIUS * 0.62, RADIUS * 0.62, FULL_LEN, 22, 1, true]} />
        <meshStandardMaterial
          ref={coreMatRef}
          color={m.color}
          emissive={m.color}
          emissiveIntensity={1}
          emissiveMap={tex}
          alphaMap={tex}
          transparent
          roughness={0.35}
          metalness={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Uc kapaklar: sol (giris, soluk) + sag (CIKIS, parlak - anlik degerin "aktigi" yer) */}
      <mesh position={[-FULL_LEN / 2, 0, 0]}>
        <sphereGeometry args={[RADIUS, 18, 18]} />
        <meshStandardMaterial color={m.color} emissive={m.color} emissiveIntensity={0.22} transparent opacity={0.42} roughness={0.1} toneMapped={false} />
      </mesh>
      <mesh position={[FULL_LEN / 2, 0, 0]}>
        <sphereGeometry args={[RADIUS * 1.08, 20, 20]} />
        <meshStandardMaterial ref={outletRef} color={m.color} emissive={m.color} emissiveIntensity={0.9} transparent opacity={0.7} roughness={0.08} toneMapped={false} />
      </mesh>

      {/* ESIK isareti - boru uzerinde ince parlak bilezik (bekleme esigi / hedef basinc) */}
      {threshold != null && (
        <mesh position={[thrX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[RADIUS * 1.15, 0.03, 8, 24]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}

function PipeScene({ history, metrics, threshold }: { history: Reading[]; metrics: MetricDef[]; threshold: Record<string, number | null> }) {
  const n = metrics.length
  const top = ((n - 1) * GAP) / 2 // dikey ortala
  return (
    <>
      {metrics.map((m, i) => (
        <Pipe key={m.key} history={history} m={m} y={top - i * GAP} threshold={threshold[m.key] ?? null} />
      ))}
    </>
  )
}

export function PipeFlowChart({
  history,
  metrics = METRICS,
  threshold = {},
  theme = 'dark',
}: {
  history: Reading[]
  metrics?: MetricDef[]
  threshold?: Record<string, number | null> // 0..1 normalize esik (boru uzerinde isaret)
  theme?: 'dark' | 'light'
}) {
  // Sabit sira (metrics zaten kayit sirasinda); kamera borulari dikey ortalar
  const light = theme === 'light'
  const fogColor = light ? '#dce8f7' : '#04060f'
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 2.2, 14], fov: 34 }}
      onCreated={({ camera }) => camera.lookAt(0, -0.2, 0)}
    >
      <fog attach="fog" args={[fogColor, 16, 34]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 8, 6]} intensity={0.6} color="#bfe0ff" />
      <pointLight position={[-7, 3, 7]} intensity={1.8} color="#0072CE" distance={26} />

      {/* Prosedurel studyo ortami (OFFLINE) -> cam borularda hafif yansima/parlama */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.0} color="#2E9BFF" position={[0, 6, -8]} scale={[16, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#36E0C8" position={[-9, 2, 3]} scale={[6, 8, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#ffffff" position={[9, 3, 3]} scale={[6, 8, 1]} />
      </Environment>
      <Sparkles count={50} scale={[24, 9, 10]} position={[0, 1, -2]} size={2.2} speed={0.22} color="#8fd0ff" opacity={0.45} />

      <PipeScene history={history} metrics={metrics} threshold={threshold} />

      <EffectComposer multisampling={4}>
        <Bloom intensity={0.8} luminanceThreshold={0.25} luminanceSmoothing={0.9} mipmapBlur radius={0.75} />
      </EffectComposer>
    </Canvas>
  )
}
