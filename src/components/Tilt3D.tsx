/*
 * NE      : Yeniden kullanilabilir 3D derinlik sargisi - icerigi farenin konumuna gore egen (tilt), isik parlamali (glare) panel.
 * NEDEN   : Mehmet Bey: "tum yazilimin her yerine cok daha derinlikli 3D ekle". Kartlar/paneller fiziksel 3D nesne gibi hissettirsin.
 * NASIL   : framer-motion motion-value'lari ile rotateX/rotateY (spring yumusatmali) + translateZ; preserve-3d -> ic elemanlar one cikar.
 *           Fareyi takip eden radyal glare (overlay). Ayrilinca merkeze yumusak doner.
 * YAN ETKI: GPU transform (performansli, 60fps). transformStyle preserve-3d -> cocuklarda translateZ ile katmanli derinlik mumkun.
 */
import { useRef, type ReactNode } from 'react'
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface Tilt3DProps {
  children: ReactNode
  className?: string
  max?: number // maksimum egim (derece)
  lift?: number // hover'da one gelme (px, translateZ)
}

export function Tilt3D({ children, className, max = 8, lift = 16 }: Tilt3DProps) {
  const ref = useRef<HTMLDivElement>(null)
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const spring = { stiffness: 160, damping: 16, mass: 0.4 }
  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), spring)
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), spring)
  const gx = useTransform(px, [0, 1], ['0%', '100%'])
  const gy = useTransform(py, [0, 1], ['0%', '100%'])
  const glare = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.14), transparent 50%)`

  const handleMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    px.set((e.clientX - r.left) / r.width)
    py.set((e.clientY - r.top) / r.height)
  }
  const reset = () => {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      whileHover={{ z: lift }}
      style={{ rotateX, rotateY, transformPerspective: 1000, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: glare, mixBlendMode: 'overlay', borderRadius: 'inherit' }}
      />
    </motion.div>
  )
}
