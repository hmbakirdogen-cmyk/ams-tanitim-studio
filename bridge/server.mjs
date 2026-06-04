/*
 * NE      : TEK-TIK sunucu - bir Node sureciyle hem (a) tanitim uygulamasini yerelden HTTP servis eder (offline),
 *           hem (b) OPC UA<->WS kopruyu calistirir, hem (c) varsayilan tarayiciyi otomatik acar.
 * NEDEN   : Mehmet Abi: "tek butonla bilgisayara tamamen hazir gelsin; sunu indir bunu kur diye UGRASTIRMA." Saha mühendisi
 *           Baslat.bat'a cift tiklar -> uygulama + cihaz koprusu + tarayici tek hamlede hazir. Internet/kurulum YOK (Node gomulu).
 * NASIL   : http.createServer ../app (build edilmis dist) statik servis (SPA fallback) :5180; WebSocketServer :4841 ->
 *           handleAppConnection (opcua-bridge.mjs); listen olunca `start` ile tarayici acilir. Her sey 127.0.0.1 (yalniz yerel).
 * YAN ETKI: OFFLINE/yerel. Port doluysa (zaten acik) net hata + tarayiciyi yine de acar. Pencere acik kaldikca kopru yasar.
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { exec } from 'node:child_process'
import os from 'node:os'
import { WebSocketServer } from 'ws'
import { handleAppConnection, WS_HOST, WS_PORT } from './opcua-bridge.mjs'
import { applyStagedUpdate, checkForUpdate } from './updater.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 0.0.0.0: tum arayuzler -> ayni Wi-Fi'daki telefon/tablet de uygulamayi acabilir (mobil CANLI takip + set ayari). Ilk acilista
// Windows Guvenlik Duvari "Izin Ver" sorabilir (tek seferlik). WS kopru de artik LAN'a acik (0.0.0.0; bkz opcua-bridge, Mehmet Abi onayi).
const HTTP_HOST = '0.0.0.0'
const HTTP_PORT = 5180

// OTOMATIK GUNCELLEME (Mehmet Abi: "kurulu bilgisayarlar da guncel olsun"): paket modunda (app/ klasoru var) ONCEKI acilista
// indirilmis guncellemeyi SUNUCU BASLAMADAN uygula (app-next -> app) -> bu acilis guncel app'i servis eder. Repo dev'inde no-op.
const PKG_APP = path.resolve(__dirname, 'app')
const UPDATE_STAGE = PKG_APP + '-next'
const UPDATE_ZIP = path.resolve(__dirname, 'app-update.zip')
const packaged = fs.existsSync(PKG_APP) || fs.existsSync(UPDATE_STAGE)
if (packaged) applyStagedUpdate(PKG_APP, UPDATE_STAGE, (m) => console.log(m))

// Build edilmis uygulamanin yeri (var olan ilk aday): pakette server.mjs ile ayni kokte app/, repo dev'inde ../dist.
const APP_CANDIDATES = [
  path.resolve(__dirname, 'app'),        // paket: Baslat.bat + server.mjs + app/ ayni kokte
  path.resolve(__dirname, '..', 'app'),  // alternatif ic-ice paket yerlesimi
  path.resolve(__dirname, '..', 'dist'), // repo dev: bridge/ -> ../dist (npm run build ciktisi)
  path.resolve(__dirname, 'dist'),
]
const APP_DIR = APP_CANDIDATES.find((d) => fs.existsSync(path.join(d, 'index.html'))) || APP_CANDIDATES[0]

// GERI BILDIRIM toplama (Teklif programindaki gibi): app calisirken /api/feedback'e POST eder -> burada dosyada birikir.
// Host makinede (SMC/Mehmet Abi) bu dosyadan okunur. Offline; tamamen yerel.
const FEEDBACK_FILE = path.resolve(__dirname, 'geri-bildirimler.json')
function readFeedback() { try { return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8')) } catch { return [] } }
function writeFeedback(list) { try { fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(list, null, 2)) } catch (e) { console.error('[feedback] yazilamadi:', e.message) } }

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.ico': 'image/x-icon',
  '.map': 'application/json', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.txt': 'text/plain; charset=utf-8',
}

const httpServer = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0])

    // API: geri bildirim (POST ekle / GET listele). Tek-tik sunucu calisirken app buraya yazar.
    if (urlPath === '/api/feedback') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
        res.end(JSON.stringify(readFeedback()))
        return
      }
      if (req.method === 'POST') {
        let body = ''
        req.on('data', (c) => { body += c; if (body.length > 1_000_000) req.destroy() })
        req.on('end', () => {
          try {
            const rec = JSON.parse(body || '{}')
            const list = readFeedback()
            list.push({ ...rec, _alindi: new Date().toISOString() })
            writeFeedback(list)
            console.log(`[feedback] yeni (${rec.tur || '?'}): "${String(rec.mesaj || '').slice(0, 60)}" -> ${FEEDBACK_FILE}`)
            res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}')
          } catch { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end('{"ok":false}') }
        })
        return
      }
      res.writeHead(405); res.end(); return
    }

    const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '')
    let file = path.join(APP_DIR, rel)
    // Path traversal koruması: cozulen yol APP_DIR disina cikamaz
    if (path.relative(APP_DIR, file).startsWith('..')) { res.writeHead(403); res.end('forbidden'); return }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(APP_DIR, 'index.html') // SPA fallback
    const ext = path.extname(file).toLowerCase()
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' })
    fs.createReadStream(file).pipe(res)
  } catch {
    res.writeHead(500); res.end('server error')
  }
})

const APP_URL = `http://localhost:${HTTP_PORT}`

// Ayni agdaki (Wi-Fi) telefon/tablet erisimi icin yerel IPv4 adres(ler)i
function lanIPv4s() {
  const out = []
  for (const list of Object.values(os.networkInterfaces())) {
    for (const ni of list || []) if (ni && ni.family === 'IPv4' && !ni.internal) out.push(ni.address)
  }
  return out
}

function openBrowser(url) {
  // AMS_NO_OPEN: dogrulama/headless calistirmada tarayiciyi acmasin (sevkiyatta bayrak yok -> normalde acar).
  if (process.env.AMS_NO_OPEN) return
  // Varsayilan tarayiciyi ac (Windows: cmd 'start'; digerleri: xdg-open/open). Hata olsa da kopru calismaya devam eder.
  try {
    if (process.platform === 'win32') exec(`start "" "${url}"`)
    else if (process.platform === 'darwin') exec(`open "${url}"`)
    else exec(`xdg-open "${url}"`)
  } catch { /* tarayici elle acilabilir */ }
}

httpServer.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`[app] Port ${HTTP_PORT} dolu - uygulama zaten acik olabilir. Tarayicida ${APP_URL} adresini deneyin.`)
    openBrowser(APP_URL) // muhtemelen onceki surec servis ediyor -> yine de ac
  } else {
    console.error('[app] HTTP sunucu hatasi:', e.message)
  }
})

httpServer.listen(HTTP_PORT, HTTP_HOST, () => {
  console.log('==========================================================')
  console.log('  SMC AMS  -  Tanitim Studyosu + Canli Cihaz Koprusu')
  console.log('==========================================================')
  console.log(`[app]   Uygulama: ${APP_URL}   (kaynak: ${APP_DIR})`)
  for (const ip of lanIPv4s()) console.log(`[app]   Telefon/tablet (ayni Wi-Fi): http://${ip}:${HTTP_PORT}`)
  console.log(`[kopru] WebSocket: ws://${WS_HOST}:${WS_PORT} (ayni Wi-Fi'daki cihazlar erisebilir)`)
  console.log('Tarayici aciliyor... Acilmazsa yukaridaki adrese gidin.')
  console.log('Bu pencereyi KAPATMAYIN (kapatirsaniz uygulama+cihaz baglantisi durur). Durdurmak: Ctrl+C')
  openBrowser(APP_URL)
  // Arka planda (internet VARSA) son surumu kontrol et + indir -> SONRAKI acilista otomatik uygulanir. Best-effort/offline guvenli.
  if (packaged) checkForUpdate(PKG_APP, UPDATE_STAGE, UPDATE_ZIP, (m) => console.log(m))
})

// WS kopru (cihaz) - app ws://localhost:4841'e baglanir
const wss = new WebSocketServer({ host: WS_HOST, port: WS_PORT })
wss.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error(`[kopru] Port ${WS_PORT} dolu - kopru zaten calisiyor olabilir.`)
  else console.error('[kopru] WS sunucu hatasi:', e.message)
})
wss.on('connection', handleAppConnection)
