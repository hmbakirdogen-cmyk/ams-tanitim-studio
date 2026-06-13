/*
 NE: shot.mjs'in COK-KARE kardesi — sayfaya girip (ops. bir mod butonuna basip) ARKA ARKAYA N kare yakalar.
 NEDEN: Egzoz/geri-donus bir HAREKET; tek kare yetmez. CC akisin gercekten dogru aktigini KAREDEN KAREYE gozuyle dogrular.
        (Egzoz/geri-donus YALNIZ izolasyonda aktif → mod butonu "Hava Kesintisi" tetiklenir.)
 KULLANIM: node scripts/shot-frames.mjs <url> <outPrefix> <girisTikla> <W> <H> <kareSayisi> <araMs> [modTikla]
   or: node scripts/shot-frames.mjs http://localhost:5190/ C:/Temp/ex "giris" 1600 1000 6 220 "kesinti"
       -> C:/Temp/ex-0.png .. ex-5.png  (izolasyon modunda, 220ms arayla 6 kare)
 KUTUPHANESIZ: Node yerlesik WebSocket + CDP (shot.mjs ile ayni desen; ayri port/profil → cakismaz).
*/
import { spawn } from 'node:child_process'
import fs from 'node:fs'

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5190/'
const PREFIX = process.argv[3] || 'frame'
const CLICK = (process.argv[4] || '').toLowerCase()
const W = Number(process.argv[5] || 1600), H = Number(process.argv[6] || 1000)
const N = Number(process.argv[7] || 6)
const GAP = Number(process.argv[8] || 220)
const MODE = (process.argv[9] || '').toLowerCase()
const PORT = 9334
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

if (typeof WebSocket === 'undefined') { console.error('Node yerlesik WebSocket yok (Node 21+ gerek).'); process.exit(2) }

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`,
  `--user-data-dir=${process.env.LOCALAPPDATA}/Temp/cdp-prof-frames`, URL,
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
  const clickByText = async (txt) => {
    const r = await cmd('Runtime.evaluate', { expression: `(()=>{const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').toLowerCase().includes(${JSON.stringify(txt)}));if(b){b.click();return b.textContent.trim()}return 'YOK'})()`, returnByValue: true })
    return r?.result?.value
  }
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  await cmd('Page.enable'); await cmd('Runtime.enable')
  await sleep(3800) // ilk render + IntroSplash
  if (CLICK) { console.log('giris:', await clickByText(CLICK)); await sleep(4000) }
  if (MODE) { console.log('mod:', await clickByText(MODE)); await sleep(500) } // mod gecisi basliyor (valf kapanma rampasi) → kareler gecisi+yerlesmeyi yakalar
  for (let i = 0; i < N; i++) {
    const shot = await cmd('Page.captureScreenshot', { format: 'png' })
    const out = `${PREFIX}-${i}.png`
    fs.writeFileSync(out, Buffer.from(shot.data, 'base64'))
    console.log('KARE', i, '->', out)
    if (i < N - 1) await sleep(GAP)
  }
  console.log('BITTI', N, 'kare')
  try { ws.close() } catch { /* yok */ }
  chrome.kill(); process.exit(0)
})().catch((e) => { console.error('HATA:', e.message); try { chrome.kill() } catch { /* yok */ } process.exit(1) })
