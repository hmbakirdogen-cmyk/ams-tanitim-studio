// Geçici tanı aracı: localhost:5180 Canlı Panel'i login'i tohumla atlayıp çeker (Mehmet Abi "locali kontrol et").
import puppeteer from 'puppeteer-core'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const URL = 'http://localhost:5180/'
const OUT = process.env.TEMP + '\\ams_live.png'

// CLIP: 'device' = cihaz bölgesi (yüksek çöz), 'cards' = sağ kartlar, '' = tam ekran
const MODE = process.env.SHOT || 'full'
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars'],
  defaultViewport: { width: 1680, height: 1050, deviceScaleFactor: MODE === 'full' ? 1 : 2 },
})
const page = await browser.newPage()
// 1) İlk yükleme: ensureSeed çalışsın (Karakelle kullanıcısı oluşsun)
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await new Promise((r) => setTimeout(r, 2500))
// 2) Oturumu tohumla (login'i atla) — session düz string
if (!process.env.NOSEED) await page.evaluate(() => localStorage.setItem('ams_session_v1', 'karakelle'))
// 2a) İsteğe bağlı tema (THEME=light → gündüz modu kontrolü)
if (process.env.THEME) {
  const th = process.env.THEME
  await page.evaluate((t) => localStorage.setItem('ams_theme_v1', t), th)
}
// 2b) İsteğe bağlı: demo geçmiş tohumu (scrubber/zaman çubuğu görünsün) — 12 saatlik dakikalık örnek
if (process.env.SEED) {
  await page.evaluate(() => {
    const now = Date.now(), rows = []
    for (let i = 720; i >= 0; i--) {
      const t = now - i * 60000, h = new Date(t).getHours(), day = h >= 7 && h < 19
      rows.push([t, Math.round(day ? 180 + Math.sin(i / 20) * 35 : 28), 0.56, 24.5 + Math.sin(i / 40) * 1.5, 46, day ? 0 : 1])
    }
    localStorage.setItem('ams_history_demo_v1', JSON.stringify(rows))
  })
}
// 3) Yeniden yükle → doğrudan Canlı Panel (default page 'live')
await page.reload({ waitUntil: 'networkidle2', timeout: 60000 })
// 4) IntroSplash + animasyon yerleşsin
await new Promise((r) => setTimeout(r, 6000))
// 4b) İsteğe bağlı mod (MODE=isolation → geri-akış/egzoz görünür): mod butonuna tıkla + animasyon otursun
if (process.env.MODE) {
  const labels = { normal: 'Normal Çalışma', standby: 'Tasarruf Modu', isolation: 'Hava Kesintisi' }
  const txt = labels[process.env.MODE] || labels.isolation
  await page.evaluate((tt) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent && x.textContent.includes(tt))
    if (b) b.click()
  }, txt)
  await new Promise((r) => setTimeout(r, 4500))
}
// İsteğe bağlı sayfa gezinme: PAGE=product -> sol menüde 'Ürün' içeren nav'a tıkla (ürün sayfası ekran görüntüsü için)
if (process.env.PAGE) {
  const navMap = { product: 'Ürün', live: 'Canlı', savings: 'Tasarruf', analysis: 'Geçmiş', records: 'Kayıt', settings: 'Ayar' }
  const want = navMap[process.env.PAGE] || process.env.PAGE
  await page.evaluate((w) => {
    const el = [...document.querySelectorAll('button, a, [role=button]')].find((x) => x.textContent && x.textContent.includes(w))
    if (el) el.click()
  }, want)
  await new Promise((r) => setTimeout(r, 2500))
}
// İsteğe bağlı dikey kaydırma: SCROLL=0..1 -> en uzun kaydırılabilir konteyneri o orana kaydır (fold altı içerik için)
if (process.env.SCROLL) {
  const frac = parseFloat(process.env.SCROLL)
  await page.evaluate((f) => {
    let best = document.scrollingElement, bestH = 0
    document.querySelectorAll('*').forEach((el) => {
      const sh = el.scrollHeight - el.clientHeight
      if (sh > bestH && getComputedStyle(el).overflowY !== 'visible') { bestH = sh; best = el }
    })
    if (best) best.scrollTop = (best.scrollHeight - best.clientHeight) * f
  }, frac)
  await new Promise((r) => setTimeout(r, 1200))
}
// İsteğe bağlı buton tıklama: CLICK="metin" -> textContent o metni içeren ilk button/a'ya tıkla (modal aç vb.)
if (process.env.CLICK) {
  await page.evaluate((w) => {
    const el = [...document.querySelectorAll('button, a, [role=button]')].find((x) => x.textContent && x.textContent.includes(w))
    if (el) el.click()
  }, process.env.CLICK)
  await new Promise((r) => setTimeout(r, 1500))
}
const CLIPS = {
  device: { x: 255, y: 112, width: 745, height: 360 },
  valve: { x: 760, y: 130, width: 240, height: 280 },
  reg: { x: 320, y: 230, width: 300, height: 200 },
  lcd: { x: 712, y: 158, width: 252, height: 205 },
  cards: { x: 1020, y: 108, width: 360, height: 600 },
  socket: { x: 540, y: 250, width: 300, height: 200 },
  low: { x: 430, y: 300, width: 420, height: 175 },
  scrub: { x: 18, y: 958, width: 980, height: 50 },
  chart: { x: 20, y: 690, width: 980, height: 320 },
}
const opts = { path: OUT }
if (MODE === 'page') opts.fullPage = true       // tum sayfa (scroll dahil)
else if (CLIPS[MODE]) opts.clip = CLIPS[MODE]
await page.screenshot(opts)
console.log('OK (' + MODE + ') -> ' + OUT)
await browser.close()
