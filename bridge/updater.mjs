/*
 * NE      : OTOMATIK GÜNCELLEYİCİ - kurulu paket açılırken internet varsa GitHub Releases'tan son "app" build'ini çeker,
 *           stage'ler ve BİR SONRAKİ açılışta uygular. Internet yoksa mevcut sürümle çalışır (offline ASLA bozulmaz).
 * NEDEN   : Mehmet Abi: "push ettiklerimiz kurulu bilgisayarlarda da güncel olsun." Paket offline anlık kopya olduğu için
 *           push tek başına yetmez; bu updater push'lanan (ve Release'lenen) sürümü online olunca kurulu makinelere taşır.
 * NASIL   : GitHub API (releases/latest) → tag (app-<id>) localVersion'dan farklıysa app.zip indir → Windows `tar` ile app-next'e
 *           çıkar → DOĞRULA (index.html). applyStagedUpdate (sunucu başlamadan önce) app-next'i app/ ile ATOMİK-vari takas eder.
 *           Yalnız "app/" (web build) güncellenir; bridge/runtime/node_modules stabil (gerekirse yeni paket dağıtılır).
 * YAN ETKI: Tamamen BEST-EFFORT + zaman-kutulu: offline / hata / tar yok → sessizce atla, kurulu sürüm çalışmaya devam eder.
 *           Yarım indirme app/'a ASLA uygulanmaz (önce tam inip doğrulanır → next-launch'ta takas). Kurulum asla kırılmaz.
 */
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'

const REPO = 'hmbakirdogen-cmyk/ams-tanitim-studio'
const API_LATEST = `https://api.github.com/repos/${REPO}/releases/latest`

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }
function rmrf(p) { try { fs.rmSync(p, { recursive: true, force: true }) } catch { /* yok */ } }

// app/version.json içindeki sürüm kimliği (paketleme/Release ile aynı: git kısa hash)
export function localVersion(appDir) {
  const v = readJson(path.join(appDir, 'version.json'))
  return (v && v.v) || null
}

// GitHub API'den JSON (User-Agent ZORUNLU), zaman-kutulu
function getJson(url, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'AMS-Updater', Accept: 'application/vnd.github+json' } }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('http ' + res.statusCode)) }
      let data = ''
      res.on('data', (c) => { data += c })
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch (e) { reject(e) } })
    })
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')))
  })
}

// (Yönlendirmeli) URL'yi dosyaya indir — GitHub asset'leri S3'e redirect eder
function download(url, dest, timeoutMs = 90000, redirects = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'AMS-Updater' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        res.resume(); return resolve(download(res.headers.location, dest, timeoutMs, redirects - 1))
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('http ' + res.statusCode)) }
      const out = fs.createWriteStream(dest)
      res.pipe(out)
      out.on('finish', () => out.close(() => resolve()))
      out.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')))
  })
}

// Windows yerleşik bsdtar'ı MUTLAK yoldan çağır: PATH'te GNU tar (Git for Windows vb.) varsa `C:\...` yolunu uzak-host sanıp
//   "Cannot connect to C:" ile patlar. System32\tar.exe (bsdtar) zip'i sorunsuz açar (ek bağımlılık yok).
function sysTar() {
  try {
    const p = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')
    if (fs.existsSync(p)) return p
  } catch { /* yoksa PATH'teki tar */ }
  return 'tar'
}
function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(destDir, { recursive: true })
    execFile(sysTar(), ['-xf', zipPath, '-C', destDir], { windowsHide: true }, (err) => (err ? reject(err) : resolve()))
  })
}

/*
 * ÖNCEKİ açılışta indirilmiş güncellemeyi UYGULA (sunucu başlamadan ÖNCE çağrılır). stageDir geçerliyse (index.html var)
 * app/ ile yer değiştirir. app/ asla "yarım" kalmaz: stage tam inip doğrulandıktan sonra burada takas edilir.
 */
export function applyStagedUpdate(appDir, stageDir, log = () => {}) {
  try {
    if (!fs.existsSync(path.join(stageDir, 'index.html'))) { rmrf(stageDir); return false }
    const backup = appDir + '.old'
    rmrf(backup)
    if (fs.existsSync(appDir)) fs.renameSync(appDir, backup)
    fs.renameSync(stageDir, appDir)
    rmrf(backup)
    log('[guncelleme] yeni surum uygulandi: ' + (localVersion(appDir) || '?'))
    return true
  } catch (e) {
    log('[guncelleme] uygulanamadi: ' + e.message); rmrf(stageDir); return false
  }
}

/*
 * Internet varsa son Release'i kontrol et; yeniyse app.zip indir + stageDir'e çıkar (BU açılışta DEĞİL, sonraki açılışta uygulanır).
 * Tamamen best-effort: offline/hata → sessizce geç.
 */
export async function checkForUpdate(appDir, stageDir, tmpZip, log = () => {}) {
  try {
    const rel = await getJson(API_LATEST)
    const remoteV = String((rel && rel.tag_name) || '').replace(/^app-/, '')
    if (!remoteV) return
    const localV = localVersion(appDir)
    if (remoteV === localV) { log('[guncelleme] guncel (' + localV + ')'); return }
    const asset = ((rel && rel.assets) || []).find((a) => a.name === 'app.zip')
    if (!asset || !asset.browser_download_url) { log('[guncelleme] app.zip bulunamadi'); return }
    log(`[guncelleme] yeni surum: ${remoteV} (mevcut: ${localV || '?'}) — indiriliyor...`)
    rmrf(stageDir); rmrf(tmpZip)
    await download(asset.browser_download_url, tmpZip)
    await extractZip(tmpZip, stageDir)
    rmrf(tmpZip)
    if (!fs.existsSync(path.join(stageDir, 'index.html'))) { rmrf(stageDir); throw new Error('gecersiz paket (index.html yok)') }
    log('[guncelleme] indirildi — bir sonraki acilista otomatik uygulanacak.')
  } catch (e) {
    log('[guncelleme] atlandi (' + e.message + ')')
  }
}
