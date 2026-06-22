' ============================================================================
'  SMC AMS - GIZLI BASLATICI  (siyah konsol penceresi YOK = "uygulama gibi")
'  NE    : Gomulu Node ile sunucuyu PENCERESIZ baslatir; sunucu tarayiciyi acar.
'  NEDEN : Mehmet abi "su siyah ekrandan kurtar" -> Baslat.bat'in kara konsolu
'          uygulama hissini bozuyordu. .vbs WScript.Run ile pencere=0 (gizli).
'  NASIL : Kendi klasorunu bulur -> runtime\node.exe server.mjs gizli calistirir.
'          server.mjs ilk acilista masaustune SMC ikonlu kisayol da olusturur.
' ============================================================================
Option Explicit
Dim sh, fso, base, node, srv, cmd
Set sh  = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
base = fso.GetParentFolderName(WScript.ScriptFullName)
node = base & "\runtime\node.exe"
srv  = base & "\server.mjs"
sh.CurrentDirectory = base
cmd = """" & node & """ """ & srv & """"
' 0 = pencere GIZLI, False = bitmesini bekleme (sunucu arka planda yasar)
sh.Run cmd, 0, False
