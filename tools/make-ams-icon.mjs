// KALICI ARAC: TUM AMS ikonlarini uretir — gradyan mavi + ustte GERCEK SMC swoosh logosu + altta DEV "AMS" (okunakli).
// Mehmet abi (2026-06-23): "kisayol ikonlarinin HEPSINDE okunakli bir sekilde SMC logosu ve AMS yazsin."
// Tasarim: gradyan yuvarlak/kare zemin + SMC logosu (smc-logo.svg swoosh+SMC, slogan kesik) + DEV "AMS".
//   any (pwa-192/512): yuvarlak kose + seffaf kose. maskable: TAM KARE dolu + icerik safe-zone (daire/squircle maskede kirpilmaz).
//   apple-touch: tam kare (iOS kendi maskesini uygular). master: app.ico kaynagi.
// Cikti: public/pwa-192.png, pwa-512.png, pwa-maskable-512.png, apple-touch-icon.png + bridge/app-icon-master.png
// Kullanim: node tools/make-ams-icon.mjs   (puppeteer-core + Chrome gerekir)
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const svgRaw = fs.readFileSync('public/smc-logo.svg', 'utf8').replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/, '')
// SLOGAN satirini kes (viewBox 71.1 -> 49) -> yalniz swoosh + "SMC" kalir (ikonda okunakli, slogan kalabaligi yok)
const logo = svgRaw.replace('viewBox="0 0 199.9 71.1"', 'viewBox="0 0 199.9 49"').replace('<svg ', '<svg style="width:100%;height:auto;display:block" ')
const GRAD = 'linear-gradient(160deg,#3aa3ff 0%,#0072CE 45%,#005aa6 100%)'

// Tek kart HTML — px boyut, rad kose radusu, cs icerik olcegi (maskable<1 safe-zone), af "AMS" font px, lw logo genislik %
function html(px, rad, cs, af, lw) {
  const inner = Math.round(px * cs)
  return `<!doctype html><html><body style="margin:0">
  <div style="width:${px}px;height:${px}px;border-radius:${rad}px;background:${GRAD};display:flex;align-items:center;justify-content:center;overflow:hidden">
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:${inner}px;height:${inner}px;font-family:'Segoe UI',Arial,sans-serif;color:#fff">
      <div style="width:${lw}%;margin-bottom:${Math.round(px * 0.035)}px">${logo}</div>
      <div style="font-weight:900;font-size:${af}px;line-height:.78;letter-spacing:-${Math.max(1, Math.round(af * 0.03))}px">AMS</div>
    </div>
  </div></body></html>`
}

// rad/af/lw px boyutuna gore: any=yuvarlak kose %23 + seffaf kose; maskable=tam kare + icerik %76 (safe-zone); apple=tam kare
const ICONS = [
  { out: 'public/pwa-512.png',          px: 512, rad: 118, cs: 1.0,  af: 188, lw: 64, transparent: true  },
  { out: 'public/pwa-192.png',          px: 192, rad: 44,  cs: 1.0,  af: 70,  lw: 64, transparent: true  },
  { out: 'public/pwa-maskable-512.png', px: 512, rad: 0,   cs: 0.76, af: 150, lw: 64, transparent: false },
  { out: 'public/apple-touch-icon.png', px: 180, rad: 0,   cs: 1.0,  af: 66,  lw: 64, transparent: false },
  { out: 'bridge/app-icon-master.png',  px: 512, rad: 118, cs: 1.0,  af: 188, lw: 64, transparent: true  },
]

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-first-run', '--disable-gpu'] })
for (const ic of ICONS) {
  const page = await browser.newPage()
  await page.setViewport({ width: ic.px, height: ic.px, deviceScaleFactor: 1 })
  await page.setContent(html(ic.px, ic.rad, ic.cs, ic.af, ic.lw), { waitUntil: 'domcontentloaded' })
  await new Promise((r) => setTimeout(r, 300))
  await page.screenshot({ path: ic.out, omitBackground: ic.transparent })
  await page.close()
  console.log('yazildi:', ic.out, ic.px + 'x' + ic.px)
}
await browser.close()
console.log('TUM IKONLAR HAZIR (SMC logosu + AMS)')
