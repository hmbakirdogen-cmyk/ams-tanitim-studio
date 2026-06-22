// KALICI ARAC: AMS masaustu ikonu (P1 tasarimi) -> yuksek-cozunurluklu master PNG.
// Tasarim (Mehmet abi onayi 2026-06-22): gradyan mavi yuvarlak kare + ustte kucuk SMC logosu (swoosh+SMC, slogansiz) + altta DEV "AMS".
// "AMS'yi anlatir ki diger SMC programlariyla karismaz." Cikti -> make-ico.ps1 ile cok-boyutlu .ico'ya cevrilir.
// Kullanim: node tools/make-ams-icon.mjs   (cikti: bridge/app-icon-master.png, 1024x1024)
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'bridge/app-icon-master.png'
const svg = fs.readFileSync('public/smc-logo.svg', 'utf8').replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/, '')
const logo = svg.replace('viewBox="0 0 199.9 71.1"', 'viewBox="0 0 199.9 49"').replace('<svg ', '<svg style="width:100%;height:auto;display:block" ')
const GRAD = 'background:linear-gradient(160deg,#3aa3ff 0%,#0072CE 45%,#005aa6 100%)'
const html = `<!doctype html><html><body style="margin:0">
<div style="width:512px;height:512px;border-radius:118px;${GRAD};display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;font-family:'Segoe UI',Arial,sans-serif;color:#fff">
  <div style="width:46%;margin-bottom:14px">${logo}</div>
  <div style="font-weight:900;font-size:185px;line-height:.8;letter-spacing:-4px">AMS</div>
</div></body></html>`
// deviceScaleFactor:2 -> 512 yerlesim, 1024 cikti (kucuk boyutlarda da net)
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-first-run','--disable-gpu'], defaultViewport: { width: 512, height: 512, deviceScaleFactor: 2 } })
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'domcontentloaded' })
await new Promise((r) => setTimeout(r, 350))
await page.screenshot({ path: OUT, omitBackground: true })
await browser.close()
console.log('Master ikon yazildi: ' + OUT + ' (1024x1024)')
