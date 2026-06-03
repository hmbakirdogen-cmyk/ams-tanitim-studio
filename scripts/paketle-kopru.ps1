# NE      : AMS tek-tik dagitim paketini (gomulu Node + offline app + cihaz koprusu) olusturur -> paket\SMC-AMS-Kopru.zip
# NEDEN   : Mehmet Abi "tek butonla hazir gelsin; sunu indir bunu kur diye ugrastirma." Saha mühendisi hicbir sey kurmasin.
#           Bu script paketi YENIDEN URETILEBILIR kilar (agir dosyalar git'te tutulmaz).
# NASIL   : runtime\node.exe + bridge\node_modules + dist(app) hazir mi? Degilse uret -> staging'e kopyala -> zip.
# KULLANIM: powershell -ExecutionPolicy Bypass -File scripts\paketle-kopru.ps1
# YAN ETKI: paket\ klasoru (gitignore'lu) olusur/guncellenir. Internet yalniz ilk node.exe/npm indirmesinde gerekir.

$ErrorActionPreference = 'Stop'
$root   = Split-Path -Parent $PSScriptRoot
$bridge = Join-Path $root 'bridge'
$dist   = Join-Path $root 'dist'
$out    = Join-Path $root 'paket'
$stage  = Join-Path $out 'SMC-AMS-Kopru'
$zip    = Join-Path $out 'SMC-AMS-Kopru.zip'
$nodeVer = 'v24.14.0'
$nodeExe = Join-Path $bridge 'runtime\node.exe'

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

# 3) App build (dist)
if (-not (Test-Path (Join-Path $dist 'index.html'))) {
  Write-Host "app build ediliyor..."
  Push-Location $root; npm run build; Pop-Location
}

# 4) Staging hazirla
if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

$include = @('server.mjs','opcua-bridge.mjs','package.json','README.md','runtime','node_modules')
foreach ($item in $include) {
  $src = Join-Path $bridge $item
  if (Test-Path $src) { Copy-Item $src -Destination $stage -Recurse -Force }
}
# Davetkar buyuk-harf baslatici (orijinal baslat.bat ile ayni icerik)
Copy-Item (Join-Path $bridge 'baslat.bat') -Destination (Join-Path $stage 'Baslat.bat') -Force
# app = build edilmis uygulama
Copy-Item $dist -Destination (Join-Path $stage 'app') -Recurse -Force

# 5) Zip
if (Test-Path $zip) { Remove-Item -Force $zip }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal

$mb = (Get-Item $zip).Length / 1MB
Write-Host ("PAKET HAZIR: {0}  ({1:N1} MB)" -f $zip, $mb)
