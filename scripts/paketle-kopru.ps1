# NE      : AMS tek-tik dagitim paketi (gomulu Node + offline app + cihaz koprusu) + OTOMATIK GUNCELLEME Release'i uretir.
#           -> paket\SMC-AMS-Tanitim.zip (dagitim) + GitHub Release "app-<hash>" (app.zip = kurulu makinelerin cektigi guncelleme).
# NEDEN   : Mehmet Abi "tek butonla hazir + kurulu bilgisayarlar da guncel olsun." Saha mühendisi hicbir sey kurmaz; kurulu
#           makineler online olunca son app'i Release'ten ceker (bkz bridge/updater.mjs).
# NASIL   : node.exe + node_modules + FRESH build -> dist/version.json (git hash) -> staging -> tam zip + app.zip -> gh release.
# KULLANIM: scripts\paketle-kopru.ps1   (gh auth + git gerekir; ExecutionPolicy engelliyse satirlari inline calistir)
# YAN ETKI: paket\ (gitignore) olusur/guncellenir; GitHub'da "app-<hash>" Release yayinlanir.

$ErrorActionPreference = 'Stop'
$root   = Split-Path -Parent $PSScriptRoot
$bridge = Join-Path $root 'bridge'
$dist   = Join-Path $root 'dist'
$out    = Join-Path $root 'paket'
$stage  = Join-Path $out 'SMC-AMS-Tanitim'
$zip    = Join-Path $out 'SMC-AMS-Tanitim.zip'
$appZip = Join-Path $out 'app.zip'
$nodeVer = 'v24.14.0'
$nodeExe = Join-Path $bridge 'runtime\node.exe'
$repo    = 'hmbakirdogen-cmyk/ams-tanitim-studio'

# 1) Gomulu Node
if (-not (Test-Path $nodeExe)) {
  Write-Host "node.exe indiriliyor ($nodeVer)..."
  New-Item -ItemType Directory -Force -Path (Split-Path $nodeExe) | Out-Null
  Invoke-WebRequest -Uri "https://nodejs.org/dist/$nodeVer/win-x64/node.exe" -OutFile $nodeExe -UseBasicParsing
}

# 2) Kopru bagimliliklari (node-opcua + ws)
if (-not (Test-Path (Join-Path $bridge 'node_modules\node-opcua'))) {
  Write-Host "bridge bagimliliklari kuruluyor..."
  Push-Location $bridge; npm install --omit=dev --no-audit --no-fund; Pop-Location
}

# 3) FRESH app build (her Release taze olsun). PAKET build'i SW'SIZ (VITE_NO_PWA=true): saha makinesinde bir kez kurulan
#    service worker paketin ESKI surumunu cache'ten serve ediyordu (Efekan "eski hali aciliyor / toplam tuketim 5 L").
#    Paket offline zaten server.mjs ile servis ediliyor + guncelleme updater.mjs ile -> SW gereksiz. main.tsx VITE_NO_PWA'da
#    SW kaydetmez + kurulu eski SW/cache'i temizler -> cift tik = HER ZAMAN guncel. (CANLI Pages build'i CI'da VITE_NO_PWA'siz -> PWA korunur.)
Push-Location $root
try { $env:VITE_NO_PWA = 'true'; npm run build } finally { Remove-Item Env:\VITE_NO_PWA -ErrorAction SilentlyContinue }
Pop-Location

# 3b) Surum kimligi (git kisa hash) -> dist/version.json. Updater bunu okur; Release tag'i (app-<hash>) ile AYNI olmali.
$ver = (git -C $root rev-parse --short HEAD).Trim()
[System.IO.File]::WriteAllText((Join-Path $dist 'version.json'), ('{"v":"' + $ver + '"}'), (New-Object System.Text.UTF8Encoding($false)))

# 4) Staging hazirla
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path $stage | Out-Null
# SMC-AMS-Baslat.vbs (gizli baslatici = siyah ekran YOK) + Durdur.vbs + kisayol-olustur.ps1 + app.ico (masaustu ikonu) -> "uygulama gibi".
$include = @('server.mjs','opcua-bridge.mjs','updater.mjs','package.json','README.md','runtime','node_modules','SMC-AMS-Baslat.vbs','SMC-AMS-Durdur.vbs','kisayol-olustur.ps1','app.ico')
foreach ($item in $include) {
  $src = Join-Path $bridge $item
  if (Test-Path $src) { Copy-Item $src -Destination $stage -Recurse -Force }
}
Copy-Item (Join-Path $bridge 'baslat.bat') -Destination (Join-Path $stage 'Baslat.bat') -Force
Copy-Item $dist -Destination (Join-Path $stage 'app') -Recurse -Force

# 5) Tam dagitim zip'i
if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal

# 6) app.zip (yalniz app/ icerigi -> updater bunu indirip app-next'e acar)
if (Test-Path $appZip) { Remove-Item -Force $appZip }
Compress-Archive -Path (Join-Path $stage 'app\*') -DestinationPath $appZip -CompressionLevel Optimal

# 7) GitHub Release (tag app-<hash>) — kurulu makineler 'releases/latest' ile bunu gorup app.zip'i ceker
$tag = "app-$ver"
try {
  gh release create $tag $appZip --repo $repo --title $tag --notes "AMS app otomatik guncelleme ($ver)" --latest
} catch {
  gh release upload $tag $appZip --repo $repo --clobber
}

Write-Host ("PAKET + RELEASE HAZIR: {0}  ({1:N1} MB)  tag={2}" -f $zip, ((Get-Item $zip).Length / 1MB), $tag)
