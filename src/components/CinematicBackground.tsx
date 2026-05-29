/*
 * NE      : Sinematik arka plan - koyu SMC lacivert sahne + yumusak aurora isiklar + perspektif izgara zemin + vinyet.
 * NEDEN   : Veriler (WebGL grafik) bu derin sahnenin uzerinde isildasin; "ekrana derinlik/3D" hissi, ucuz duz zemin degil.
 * NASIL   : Katmanli sabit div'ler; CSS radial-gradient bloblari (yumusak, pikselsiz) animate-aurora ile suzulur; alt izgara perspektifli.
 * YAN ETKI: Tamamen dekoratif (pointer-events yok); WebGL canvas ve UI bunun uzerine biner. Performans: sadece transform animasyonu.
 */

export function CinematicBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Temel derinlik gradyani */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% -10%, #0a2148 0%, #071427 45%, #04060f 100%)',
        }}
      />

      {/* Aurora isik 1 - SMC mavisi */}
      <div
        className="animate-aurora absolute -top-1/4 left-1/2 h-[70vh] w-[70vw] -translate-x-1/2 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(0,114,206,0.40), transparent 62%)',
          filter: 'blur(40px)',
          mixBlendMode: 'screen',
        }}
      />
      {/* Aurora isik 2 - teal vurgu */}
      <div
        className="animate-aurora absolute top-1/3 -right-24 h-[55vh] w-[55vw] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(54,224,200,0.20), transparent 60%)',
          filter: 'blur(50px)',
          mixBlendMode: 'screen',
          animationDelay: '-8s',
        }}
      />

      {/* Perspektif izgara zemin - 3D derinlik referansi */}
      <div className="absolute bottom-0 left-0 right-0 h-[42vh] [perspective:600px]">
        <div
          className="absolute inset-x-[-20%] bottom-0 top-0 origin-bottom [transform:rotateX(72deg)]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(46,155,255,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(46,155,255,0.16) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'linear-gradient(to top, black, transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to top, black, transparent 80%)',
          }}
        />
      </div>

      {/* Vinyet - kenarlari yumusakca karartir, odak ortada */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(120% 80% at 50% 40%, transparent 55%, rgba(2,4,10,0.7) 100%)',
        }}
      />
    </div>
  )
}
