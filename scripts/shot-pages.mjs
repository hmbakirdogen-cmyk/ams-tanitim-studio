/*
 NE: shot.mjs'in COK-SAYFA kardesi — girise basip, SOL NAV'daki her sayfaya tiklayip belirli pencere boyutunda EKRAN GORUNTUSU alir.
 NEDEN: ASKERI NIZAM denetimi — her sayfa, her boyutta uste-binme/tasma OLMADAN yerlesmeli (Mehmet abi). CC her sayfayi kendi gozuyle tarar.
 KULLANIM: node scripts/shot-pages.mjs <url> <outPrefix> <W> <H> "Nav1,Nav2,..."
   or: node scripts/shot-pages.mjs http://localhost:5190/ C:/Temp/p 1280 800 "Tasarruf,Gecmis,Urun,Kayit"
       -> outPrefix-0-<etiket>.png ... (her nav etiketi, kismi metin eslesmeli; giris otomatik)
 KUTUPHANESIZ: Node yerlesik WebSocket + CDP. Ayri port/profil (cakismaz).
*/
import { spawn } from 'node:child_process'
import fs from 'node:fs'

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5190/'
const PREFIX = process.argv[3] || 'page'
const W = Number(process.argv[4] || 1280), H = Number(process.argv[5] || 800)
const NAVS = (process.argv[6] || '').split(',').map((s) => s.trim()).filter(Boolean)
const PORT = 9335
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
if (typeof WebSocket === 'undefined') { console.error('Node yerlesik WebSocket yok (Node 21+).'); process.exit(2) }

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`,
  `--user-data-dir=${process.env.LOCALAPPDATA}/Temp/cdp-prof-pages`, URL,
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
  const cmd = (m, p = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
  const click = async (txt) => {
    const r = await cmd('Runtime.evaluate', { expression: `(()=>{const t=${JSON.stringify(txt.toLowerCase())};const els=[...document.querySelectorAll('button,a,[role=button],li,span')];const b=els.find(x=>(x.textContent||'').trim().toLowerCase().includes(t)&&x.offsetParent!==null);if(b){b.click();return (b.textContent||'').trim().slice(0,30)}return 'YOK'})()`, returnByValue: true })
    return r?.result?.value
  }
  const shot = async (name) => { const s = await cmd('Page.captureScreenshot', { format: 'png' }); const out = `${PREFIX}-${name}.png`; fs.writeFileSync(out, Buffer.from(s.data, 'base64')); console.log('CEK', out) }
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  await cmd('Page.enable'); await cmd('Runtime.enable')
  await sleep(3800)
  console.log('giris:', await click('giriş')); await sleep(3500)
  await shot('0-canli')
  let n = 1
  for (const nav of NAVS) {
    const got = await click(nav); console.log(`nav '${nav}':`, got); await sleep(2600)
    await shot(`${n}-${nav.replace(/[^a-zA-Z0-9]/g, '')}`); n++
  }
  console.log('BITTI', n, 'sayfa @', `${W}x${H}`)
  try { ws.close() } catch { /* yok */ }
  chrome.kill(); process.exit(0)
})().catch((e) => { console.error('HATA:', e.message); try { chrome.kill() } catch { /* yok */ } process.exit(1) })
