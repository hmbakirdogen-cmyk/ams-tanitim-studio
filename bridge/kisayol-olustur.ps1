# ============================================================================
#  SMC AMS - MASAUSTU KISAYOLU OLUSTUR  (server.mjs ilk acilista cagirir)
#  NE    : Masaustune "SMC AMS Tanitim" adli, SMC ikonlu kisayol koyar -> uygulama gibi.
#  NEDEN : Mehmet abi "bir uygulamaymis gibi masaustune ikon atamali."
#  NASIL : Kisayol HEDEFI = wscript.exe + gizli baslatici (SMC-AMS-Baslat.vbs) ->
#          cift tik: siyah ekran YOK, tarayici acilir. IKON = app.ico (cok boyutlu).
#          Yollar $PSScriptRoot'tan turetilir -> klasor nereye acilirsa acilsin DOGRU
#          (zip'e gomulu .lnk'in kirik-yol sorunu YOK; her acilista guncellenir).
# ============================================================================
$ErrorActionPreference = 'SilentlyContinue'
$base    = $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
if (-not $desktop) { return }
$lnk     = Join-Path $desktop 'SMC AMS Tanitim.lnk'
$vbs     = Join-Path $base 'SMC-AMS-Baslat.vbs'
$ico     = Join-Path $base 'app.ico'
$wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
if (-not (Test-Path $vbs)) { return }

$w = New-Object -ComObject WScript.Shell
$s = $w.CreateShortcut($lnk)
$s.TargetPath       = $wscript
$s.Arguments        = '"' + $vbs + '"'
$s.WorkingDirectory = $base
if (Test-Path $ico) { $s.IconLocation = "$ico,0" }
$s.Description      = 'SMC Hava Yonetim Sistemi - Tanitim Studyosu'
$s.WindowStyle      = 1
$s.Save()
