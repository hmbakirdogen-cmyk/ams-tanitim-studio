/*
 NE: Headless Chrome'da uygulamayı açıp, demo'ya girip bir süre çalıştırdıktan sonra JS heap (RAM) kullanımını ölçer.
 NEDEN: Mehmet abi "PC'de çok RAM yiyor" dedi → CC kendi gözüyle ÖLÇSÜN (tahmin değil sayı). performance.memory + CDP Performance.
 KULLANIM: node scripts/heap-check.mjs [url] [bekleme-sn]
*/
import { spawn } from 'node:child_process'

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.argv[2] || 'http://localhost:5180/'
const WAIT = Number(process.argv[3] || 30) * 1000
const PORT = 9344
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const chrome = spawn(CHROME, [
  '--headless=new', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${PORT}`, '--window-size=1600,1000',
  `--user-data-dir=${process.env.LOCALAPPDATA}/Temp/cdp-heap`, URL,
], { stdio: 'ignore' })

async function jget(path) {
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}${path}`); if (r.ok) return await r.json() } catch { /* yok */ }
    await sleep(300)
  }
  throw new Error('CDP json alinamadi')
}
const mb = (b) => (b / 1048576).toFixed(1) + ' MB'

;(async () => {
  await sleep(1500)
  const list = await jget('/json/list')
  const pg = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl)
  const ws = new WebSocket(pg.webSocketDebuggerUrl)
  let id = 0; const pend = new Map()
  ws.addEventListener('message', (e) => { const o = JSON.parse(e.data); if (o.id && pend.has(o.id)) { pend.get(o.id)(o.result); pend.delete(o.id) } })
  const cmd = (m, p = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  await cmd('Page.enable'); await cmd('Runtime.enable'); await cmd('Performance.enable')
  await sleep(4500)
  // demo'ya gir
  await cmd('Runtime.evaluate', { expression: `(()=>{const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').toLowerCase().includes('giri'));if(b)b.click()})()` })
  const measure = async (lbl) => {
    const r = await cmd('Runtime.evaluate', { expression: 'performance.memory ? JSON.stringify({u:performance.memory.usedJSHeapSize,t:performance.memory.totalJSHeapSize,l:performance.memory.jsHeapSizeLimit}) : "null"', returnByValue: true })
    const m = JSON.parse(r.result.value)
    if (m) console.log(`${lbl}: kullanılan ${mb(m.u)} / ayrılan ${mb(m.t)} (limit ${mb(m.l)})`)
    else console.log(`${lbl}: performance.memory yok`)
  }
  await sleep(3000); await measure('Panel açılış (~3sn)')
  await sleep(WAIT / 2); await measure(`Çalışma (~${(WAIT/2000+3).toFixed(0)}sn)`)
  await sleep(WAIT / 2); await measure(`Uzun çalışma (~${(WAIT/1000+3).toFixed(0)}sn)`)
  // metrics: DOM düğüm + dinleyici + GPU
  const met = await cmd('Performance.getMetrics')
  const pick = (n) => met.metrics?.find((x) => x.name === n)?.value
  console.log(`DOM düğüm: ${pick('Nodes')} | JS dinleyici: ${pick('JSEventListeners')} | Belge: ${pick('Documents')} | Layout: ${pick('LayoutCount')}`)
  try { ws.close() } catch { /* yok */ }
  chrome.kill(); process.exit(0)
})().catch((e) => { console.error('HATA:', e.message); try { chrome.kill() } catch { /* yok */ } process.exit(1) })
