@echo off
chcp 65001 >nul
title SMC AMS - Tanitim Studyosu + Canli Cihaz
cd /d "%~dp0"

echo ==========================================================
echo    SMC AMS  -  Tanitim Studyosu baslatiliyor...
echo ==========================================================
echo.
echo  Birkac saniye icinde tarayici OTOMATIK acilacak.
echo  Acilmazsa tarayicida su adrese gidin:  http://localhost:5180
echo.
echo  * Bu pencereyi KAPATMAYIN - kapatirsaniz uygulama ve canli
echo    cihaz baglantisi durur. Durdurmak icin: Ctrl + C
echo.

REM Gomulu Node (kurulum/internet gerekmez) ile tek-tik sunucuyu baslat:
REM   - tanitim uygulamasini yerelden servis eder (offline)
REM   - OPC UA <-> WebSocket cihaz koprusunu calistirir
REM   - varsayilan tarayiciyi acar
"%~dp0runtime\node.exe" "%~dp0server.mjs"

echo.
echo Uygulama durdu. Pencereyi kapatabilirsiniz.
pause
