' ============================================================================
'  SMC AMS - BASLAT  (gizli = siyah konsol YOK)   [KOK launcher]
'  NE    : Uygulamayi penceresiz baslatir; tarayici otomatik acilir.
'  NEDEN : Mehmet abi "siyah ekrandan kurtar" + "luzumsuz dosyalar kafa
'          karistirmasin" -> tum teknik dosyalar 'sistem' alt klasorunde;
'          Efekan yalniz bu dosyaya cift tiklar.
'  NASIL : Kendi klasorunun altindaki sistem\runtime\node.exe ile
'          sistem\server.mjs gizli (pencere=0) calistirilir.
'          server.mjs ilk acilista masaustune SMC/AMS ikonlu kisayol koyar.
' ============================================================================
Option Explicit
Dim sh, fso, root, node, srv, cmd
Set sh  = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
node = root & "\sistem\runtime\node.exe"
srv  = root & "\sistem\server.mjs"
sh.CurrentDirectory = root & "\sistem"
cmd = """" & node & """ """ & srv & """"
sh.Run cmd, 0, False
