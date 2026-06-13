/*
 * NE      : Sinematik arka plan - sahne gradyani + yumusak aurora isiklar + perspektif izgara zemin + vinyet. Tema duyarli (Gunduz/Gece).
 * NEDEN   : Veriler bu derin sahnenin uzerinde isildasin; gunduz/gece temasinda zemin/aurora otomatik degissin.
 * NASIL   : Tum renkler CSS degiskenlerinden (--scene, --aurora-op, --grid-line, --vignette) -> tema tek noktadan yonetir.
 * YAN ETKI: Dekoratif (pointer-events yok). Isik modunda aurora soner, sahne acilir; koyu modda sinematik kalir.
 */
import { isMobileDevice } from '@/lib/device'

export function CinematicBackground() {
  // MOBİL: ağır blur(40-50px) + sürekli aurora animasyonu (GPU compositor yükü) kısılır → telefonda ısınma/takılma azalır.
  const mobile = isMobileDevice()
  const auroraAnim = mobile ? '' : 'animate-aurora'
  const blur1 = mobile ? 26 : 40
  const blur2 = mobile ? 30 : 50
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Temel sahne - iki katman cross-fade (gunduz/gece gecisi YUMUSAK; gradyan dogrudan transition edilemez, opacity ile karistiririz) */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% -10%, #08183a 0%, #050e1d 45%, #02030a 100%)', opacity: 'var(--scene-dark-op, 1)', transition: 'opacity 0.5s ease' }} />
      <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% -10%, #ffffff 0%, #e6eefa 45%, #cfe0f4 100%)', opacity: 'var(--scene-light-op, 0)', transition: 'opacity 0.5s ease' }} />

      {/* (Nokta-matris katmanı KALDIRILDI — Mehmet Abi: "noktalar tüm ekranda olmasın, sadece grafik kartlarının arkasında + rakama göre
          ölçekli olsun" → noktalar artık .dot-bg ile YALNIZ veri kartlarının yüzeyinde, değere göre canlanır; index.css + MetricCard.) */}

      {/* Aurora isik 1 - SMC mavisi */}
      <div
        className={`${auroraAnim} absolute -top-1/4 left-1/2 h-[70vh] w-[70vw] -translate-x-1/2 rounded-full`}
        style={{
          background: 'radial-gradient(circle, rgba(0,114,206,0.40), transparent 62%)',
          filter: `blur(${blur1}px)`,
          mixBlendMode: 'screen',
          opacity: 'var(--aurora-op)',
          transition: 'opacity 0.5s ease',
        }}
      />
      {/* Aurora isik 2 - teal vurgu */}
      <div
        className={`${auroraAnim} absolute top-1/3 -right-24 h-[55vh] w-[55vw] rounded-full`}
        style={{
          background: 'radial-gradient(circle, rgba(54,224,200,0.20), transparent 60%)',
          filter: `blur(${blur2}px)`,
          mixBlendMode: 'screen',
          animationDelay: '-8s',
          opacity: 'var(--aurora-op)',
          transition: 'opacity 0.5s ease',
        }}
      />

      {/* Perspektif izgara zemin - 3D derinlik referansi (Mehmet Abi: "Canli Panel'de arka plani goremedim" -> zemin yukari uzatildi + cizgi belirginlesti) */}
      <div className="absolute bottom-0 left-0 right-0 h-[58vh] [perspective:620px]">
        <div
          className="absolute inset-x-[-20%] bottom-0 top-0 origin-bottom [transform:rotateX(72deg)]"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'linear-gradient(to top, black, transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to top, black, transparent 80%)',
          }}
        />
      </div>

      {/* Ufuk parıltısı — 3D zeminin uzakta "ufukla buluştuğu" hat: en güçlü derinlik ipucu (göz "uzay/zemin geriye kaçıyor" der).
          Mehmet Abi "Canlı Panel'de arka planı göremedim" → ızgaranın soluk kaldığı yerde tek bir sıcak-mavi parıltı bandı.
          Saf CSS radyal gradyan, ANİMASYON YOK, statik → RAM/GPU bedava. Gündüz modunda aurora gibi söner (--aurora-op). */}
      <div
        className="absolute inset-x-0 bottom-[15vh] h-[16vh]"
        style={{
          background: 'radial-gradient(55% 100% at 50% 100%, rgba(46,155,255,0.16), transparent 72%)',
          filter: 'blur(6px)',
          opacity: 'var(--aurora-op)',
          transition: 'opacity 0.5s ease',
        }}
      />

      {/* Vinyet - kenarlari yumusakca karartir (tema duyarli) */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 80% at 50% 40%, transparent 55%, var(--vignette) 100%)' }}
      />
    </div>
  )
}
