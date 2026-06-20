/*
 NE: Headless Chrome'u CDP ile sürüp bir sayfayı (gerekirse bir butona tıklayıp) EKRAN GÖRÜNTÜSÜ alır.
 NEDEN: "Görüldü mü?" kanıtı + askeri-nizam (üst-üste binme) denetimi → CC kendi gözüyle DOĞRULAR (kütüphanesiz, Node yerleşik WebSocket).
 KULLANIM: node scripts/shot.mjs <url> <out.png> [tikla-metin] [genislik] [yukseklik]
   ör: node scripts/shot.mjs http://localhost:5190/ out.png "giriş" 1600 1000   (DemoWelcome butonuna tıklayıp paneli yakalar)
*/
import { spawn } from 'node:child_process'
import fs from 'node:fs'

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5190/'
const OUT = process.argv[3] || 'shot.png'
const CLICK = (process.argv[4] || '').toLowerCase()
const W = Number(process.argv[5] || 1600), H = Number(process.argv[6] || 1000)
const CLICK2 = (process.env.SHOT_CLICK2 || '').toLowerCase() // 2. tık: ilk tıktan sonra (ör. giriş→KART) — metni içeren cursor-pointer öğeye tıklar (modal testi)
const PORT = 9333
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

if (typeof WebSocket === 'undefined') { console.error('Node yerlesik WebSocket yok (Node 21+ gerek).'); process.exit(2) }

// SHOT_LANG (ops.): chrome dilini zorla (TARAYICI navigator.language → uygulamanın load() fallback'i o dile düşer). Her dile AYRI
//   profil → taze (localStorage yok) → navigator.language baz alınır. Japonya/İngilizce render doğrulaması için.
const LANG = process.env.SHOT_LANG || ''
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  ...(LANG ? [`--lang=${LANG}`, `--accept-lang=${LANG}`] : []),
  `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`,
  `--user-data-dir=${process.env.LOCALAPPDATA}/Temp/cdp-prof${LANG ? '-' + LANG.replace(/[^a-zA-Z]/g, '') : ''}`, URL,
], { stdio: 'ignore' })

async function jget(path) {
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json() } catch { /* yok */ }
    await sleep(300)
  }
  throw new Error('CDP json alinamadi')
}

;(async () => {
  await sleep(1200)
  const list = await jget('/json/list')
  const pg = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
  if (!pg) throw new Error('sayfa hedefi yok')
  const ws = new WebSocket(pg.webSocketDebuggerUrl)
  let id = 0; const pend = new Map()
  ws.addEventListener('message', (e) => { const o = JSON.parse(e.data); if (o.id && pend.has(o.id)) { pend.get(o.id)(o.result); pend.delete(o.id) } })
  const cmd = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  await cmd('Page.enable'); await cmd('Runtime.enable')
  // SHOT_MODEL / SHOT_THEME (ops.): cihaz modelini / temayı (light|dark) zorla. localStorage'a yaz + reload → uygulama yüklemede okur.
  const MODEL = process.env.SHOT_MODEL || ''
  const THEME = process.env.SHOT_THEME || ''
  if (MODEL || THEME) {
    await sleep(1400)
    if (MODEL) await cmd('Runtime.evaluate', { expression: `localStorage.setItem('ams_model_v1', ${JSON.stringify(MODEL)})` })
    if (THEME) await cmd('Runtime.evaluate', { expression: `localStorage.setItem('ams_theme_v1', ${JSON.stringify(THEME)})` })
    await cmd('Page.reload'); await sleep(1700)
  }
  await sleep(3800) // ilk render + IntroSplash gecisi
  if (CLICK) {
    const r = await cmd('Runtime.evaluate', { expression: `(()=>{const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').toLowerCase().includes(${JSON.stringify(CLICK)}));if(b){b.click();return b.textContent.trim()}return 'YOK'})()`, returnByValue: true })
    console.log('tikla:', r?.result?.value)
    await sleep(4000) // panel render
  }
  if (CLICK2) {
    const r2 = await cmd('Runtime.evaluate', { expression: `(()=>{const cands=[...document.querySelectorAll('button,[role=button],a,.cursor-pointer')].filter(x=>(x.textContent||'').toLowerCase().includes(${JSON.stringify(CLICK2)}));const el=cands.sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0];if(el){el.click();return 'OK'}return 'YOK'})()`, returnByValue: true })
    console.log('tikla2:', r2?.result?.value)
    await sleep(2400) // modal açılış (yağ gibi spring) + canlı çizim
  }
  // SHOT_ZOOM (ops.): tarayıcı yakınlaştırmasını taklit et (CSS zoom kökte) → "kullanıcı Ctrl+ ile zoom yaptı" senaryosunda yerleşim/çakışma testi.
  const ZOOM = process.env.SHOT_ZOOM
  if (ZOOM) { await cmd('Runtime.evaluate', { expression: `document.documentElement.style.zoom='${ZOOM}'` }); await sleep(1000) }
  const shot = await cmd('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(OUT, Buffer.from(shot.data, 'base64'))
  console.log('SHOT OK:', OUT)
  try { ws.close() } catch { /* yok */ }
  chrome.kill(); process.exit(0)
})().catch((e) => { console.error('HATA:', e.message); try { chrome.kill() } catch { /* yok */ } process.exit(1) })
