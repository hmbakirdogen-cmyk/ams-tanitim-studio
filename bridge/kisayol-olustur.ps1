# ============================================================================
#  SMC AMS - MASAUSTU KISAYOLU OLUSTUR  (sistem\server.mjs ilk acilista cagirir)
#  NE    : Masaustune "SMC AMS Tanitim" adli, SMC/AMS ikonlu kisayol koyar.
#  NEDEN : Mehmet abi "bir uygulamaymis gibi masaustune ikon."
#  NASIL : Bu betik 'sistem' alt klasorunde durur ($PSScriptRoot = ...\sistem).
#          Kisayol HEDEFI = KOK'teki gizli baslatici (SMC-AMS-Baslat.vbs) ->
#          cift tik: siyah ekran YOK. IKON = sistem\app.ico (AMS ikonu).
#          Yollar runtime'da turetilir -> klasor nereye acilirsa DOGRU.
# ============================================================================
$ErrorActionPreference = 'SilentlyContinue'
$sistem  = $PSScriptRoot
$root    = Split-Path -Parent $sistem
$desktop = [Environment]::GetFolderPath('Desktop')
if (-not $desktop) { return }
$lnk     = Join-Path $desktop 'SMC AMS Tanitim.lnk'
$vbs     = Join-Path $root 'SMC-AMS-Baslat.vbs'
$ico     = Join-Path $sistem 'app.ico'
$wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
if (-not (Test-Path $vbs)) { return }

$w = New-Object -ComObject WScript.Shell
$s = $w.CreateShortcut($lnk)
$s.TargetPath       = $wscript
$s.Arguments        = '"' + $vbs + '"'
$s.WorkingDirectory = $root
if (Test-Path $ico) { $s.IconLocation = "$ico,0" }
$s.Description      = 'SMC Hava Yonetim Sistemi - Tanitim Studyosu'
$s.WindowStyle      = 1
$s.Save()
