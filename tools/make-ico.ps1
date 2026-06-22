# Gecici arac: SMC PWA ikonundan (pwa-512.png) cok-boyutlu masaustu .ico uret (harici arac YOK; System.Drawing + elle ICO yazimi).
# Boyutlar: 256/128/64/48/32/16 -> gorev cubugu (16/32) net, masaustu (48) net, yuksek-DPI (256) net. PNG-gomulu ICO (Win Vista+).
param(
  [string]$Src = "$PSScriptRoot\..\public\pwa-512.png",
  [string[]]$Out = @("$PSScriptRoot\..\bridge\app.ico")
)
Add-Type -AssemblyName System.Drawing
$srcAbs = (Resolve-Path $Src).Path
$srcImg = [System.Drawing.Image]::FromFile($srcAbs)
$sizes = 256,128,64,48,32,16
$pngs = @()
foreach ($s in $sizes) {
  $bmp = New-Object System.Drawing.Bitmap($s, $s)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $g.DrawImage($srcImg, 0, 0, $s, $s)
  $g.Dispose()
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $pngs += ,($ms.ToArray())
  $bmp.Dispose(); $ms.Dispose()
}
$srcImg.Dispose()

$n = $sizes.Count
$mem = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($mem)
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$n)   # ICONDIR: reserved, type=icon, count
$offset = 6 + ($n * 16)
for ($i = 0; $i -lt $n; $i++) {
  $s = $sizes[$i]; $data = $pngs[$i]
  $wb = if ($s -ge 256) { 0 } else { $s }
  $bw.Write([byte]$wb); $bw.Write([byte]$wb); $bw.Write([byte]0); $bw.Write([byte]0)  # w,h,colors,reserved
  $bw.Write([uint16]1); $bw.Write([uint16]32)                                          # planes, bitcount
  $bw.Write([uint32]$data.Length); $bw.Write([uint32]$offset)                          # bytesInRes, offset
  $offset += $data.Length
}
foreach ($data in $pngs) { $bw.Write($data) }
$bw.Flush()
$bytes = $mem.ToArray(); $bw.Dispose(); $mem.Dispose()

foreach ($o in $Out) {
  $dir = Split-Path -Parent $o
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  [System.IO.File]::WriteAllBytes($o, $bytes)
  Write-Host ("ICO yazildi: {0}  ({1:N0} byte, {2} boyut)" -f $o, $bytes.Length, $n)
}
