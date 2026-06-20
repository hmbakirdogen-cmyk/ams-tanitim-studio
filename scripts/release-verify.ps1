# NE      : Japonya gonderimi oncesi tek komutla release dogrulama (hata varsa aninda fail).
# NEDEN   : Vitrin kalitesi icin insan hatasini azaltmak; her cikista ayni kalite kapisini kosmak.
# NASIL   : npm run typecheck -> npm run build -> paket script varligi kontrolu. Tum adimlar exit code kontroluyle ilerler.
# YAN ETKI: Sadece derleme dogrulamasi yapar; dosya degistirmez.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host '[release-verify] TypeScript kontrolu basliyor...' -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'typecheck basarisiz' }

Write-Host '[release-verify] Production build basliyor...' -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw 'build basarisiz' }

$packScript = Join-Path $root 'scripts\paketle-kopru.ps1'
if (-not (Test-Path $packScript)) { throw 'paketle-kopru.ps1 bulunamadi' }

Write-Host '[release-verify] TAMAM: Release kalite kapisi gecti.' -ForegroundColor Green
