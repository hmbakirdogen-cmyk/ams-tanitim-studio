' ============================================================================
'  SMC AMS - DURDUR  (gizli)
'  NE    : 5180 portunu DINLEYEN sunucu surecini -yalniz onu- kapatir.
'  NEDEN : Gizli calisan sunucuyu durdurmak icin guvenli yol. Demoyu kapatmak/
'          bilgisayari rahat birakmak isteyince kullanilir.
'  NASIL : PowerShell ile 5180 portunun sahibi PID bulunur, Stop-Process edilir.
'          DIKKAT: Diger node.exe'lere DOKUNMAZ (taskkill /IM node DEGIL) -> port
'          hedefli; ayni makinedeki baska Node islerini OLDURMEZ.
' ============================================================================
Option Explicit
Dim sh, cmd
Set sh = CreateObject("WScript.Shell")
cmd = "powershell -NoProfile -ExecutionPolicy Bypass -Command ""Get-NetTCPConnection -LocalPort 5180 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"""
' 0 = gizli, True = bitene kadar bekle
sh.Run cmd, 0, True
