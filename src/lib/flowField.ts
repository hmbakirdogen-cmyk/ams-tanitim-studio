/*
 * NE      : Saf-TS analitik AKIŞ ALANI yardımcısı — kütüphanesiz, OFFLINE, SIFIR kare-başı tahsis.
 * NEDEN   : Hava akış animasyonu overhaul (Mehmet abi: "geri dönüş + egzoz çok kötü, yaşasın, veriye/şiddete senkron").
 *           Partikülleri TEK analitik hız alanından advekte etmek (el-dikişi faz/ışınlama yerine doğal süreklilik) +
 *           curl-noise ile girdaplı, doğal "yaşayan" hareket. WebGL EKLENMEDİ (fuar zayıf-PC WebGL bağlam-düşüşü
 *           riski; ~560 partikül Canvas 2D'de CPU curl-noise rahat kaldırır).
 * NASIL   : divergence-free curl-noise (Bridson/al-ro SIGGRAPH'07): potansiyel value-noise ψ(x,y,t) → akış = curl(ψ)
 *           = (∂ψ/∂y, -∂ψ/∂x) merkezi-fark ile. Permütasyon tablosu MODÜL yüklenince BİR KEZ (sabit tohum → deterministik,
 *           her açılışta aynı akış). sampleCurl(x,y,t,out) yerel sayılarla çalışır, out:[number,number]'a YAZAR →
 *           çağrı başına dizi/obje YARATMAZ (60fps sıfır-alloc). Çıktı ölçeklenmemiş; çağıran gücü ile çarpar.
 * YAN ETKI: Yok (saf fonksiyon + tek seferlik tablo). three/WebGL kullanmaz.
 */

// Sabit-tohumlu küçük PRNG (mulberry32) — permütasyon tablosunu BİR KEZ, deterministik kur (Math.random'a bağlı değil).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 0..255 permütasyon, çift uzunlukta (512) — taşma maskesiz okunur. Modül yüklenince bir kez.
const PERM = new Uint8Array(512)
;(() => {
  const rnd = mulberry32(1337)
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0
    const tmp = p[i]; p[i] = p[j]; p[j] = tmp
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]
})()

// Hermite smoothstep (yumuşak köşe-geçişi)
function fade(t: number): number { return t * t * (3 - 2 * t) }

// PERM tabanlı köşe hash -> [0,1)
function hash(ix: number, iy: number): number {
  return PERM[(PERM[ix & 255] + (iy & 255)) & 255] / 255
}

// 2D value-noise -> [-1,1] (bilinear + smoothstep). Tahsis yok.
export function vnoise(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const u = fade(fx), v = fade(fy)
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1)
  const ab = a + (b - a) * u
  const cd = c + (d - c) * u
  return (ab + (cd - ab) * v) * 2 - 1
}

// Curl-noise (divergence-free) akış vektörü. (x,y) akış-uzayı koordinatı, t zaman; out'a [vx,vy] YAZAR (alloc yok).
// Çıktı ~küçük/ölçeksiz: çağıran kuvvet*dt ile çarpar. e = noise-uzayı türev adımı.
export function sampleCurl(x: number, y: number, t: number, out: [number, number]): void {
  const e = 0.08
  const ty = y + t * 0.13 // zaman noise'u y ekseninde kaydırır -> akış "ilerler"
  const n1 = vnoise(x, ty + e)
  const n2 = vnoise(x, ty - e)
  const n3 = vnoise(x + e, ty)
  const n4 = vnoise(x - e, ty)
  out[0] = n1 - n2        // ∝ +∂ψ/∂y
  out[1] = -(n3 - n4)     // ∝ -∂ψ/∂x
}
