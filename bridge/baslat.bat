@echo off
chcp 65001 >nul
title SMC AMS - OPC UA Koprusu
cd /d "%~dp0"

echo ==========================================================
echo   SMC AMS  -  OPC UA  ^<-^>  WebSocket Koprusu
echo ==========================================================
echo.

REM 1) Node.js kurulu mu?
where node >nul 2>nul
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi.
  echo Lutfen once https://nodejs.org adresinden Node.js'i kurun ^(LTS surum^).
  echo Kurduktan sonra bu dosyaya tekrar cift tiklayin.
  echo.
  pause
  exit /b 1
)

REM 2) Bagimliliklar (node-opcua, ws) - sadece ILK calistirmada yuklenir
if not exist "node_modules\node-opcua" (
  echo [KURULUM] Ilk calistirma: gerekli paketler yukleniyor ^(node-opcua, ws^)...
  echo Bu yalnizca BIR KEZ ve internet gerektirir. Sonrasi tamamen cevrimdisi calisir.
  echo.
  call npm install node-opcua ws
  if errorlevel 1 (
    echo.
    echo [HATA] Paket kurulumu basarisiz. Internet baglantisini kontrol edip tekrar deneyin.
    pause
    exit /b 1
  )
)

REM 3) Kopruyu baslat - BU PENCERE ACIK KALSIN
echo.
echo [HAZIR] Kopru baslatiliyor... Uygulamada "Canli Moda Gec" diyebilirsiniz.
echo Bu pencereyi KAPATMAYIN (kapatirsaniz canli baglanti kesilir).
echo Durdurmak icin: Ctrl + C  veya pencereyi kapatin.
echo.
node opcua-bridge.mjs

echo.
echo Kopru durdu.
pause
