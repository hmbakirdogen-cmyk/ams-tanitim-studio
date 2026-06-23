# NE      : Telefonla okutulacak QR kod uretir (canli site / LAN adresi) — SMC mavisi, yuksek kontrast, okunur.
# NEDEN   : Mehmet abi "qr kodu uretirsen super olur" — adresi telefona elle yazmak yerine kamerayla okut -> uygulama acilir.
# NASIL   : qrcode + Pillow. ERROR_CORRECT_M (logo/baski toleransi) + buyuk box + bol border (sessiz alan) -> guvenli okunur.
# KULLANIM: python scripts/make-qr.py [url] [cikti.png]
import qrcode, sys
from qrcode.constants import ERROR_CORRECT_M

url = sys.argv[1] if len(sys.argv) > 1 else "https://hmbakirdogen-cmyk.github.io/ams-tanitim-studio/"
out = sys.argv[2] if len(sys.argv) > 2 else "SMC-AMS-QR.png"

qr = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=16, border=4)
qr.add_data(url)
qr.make(fit=True)
# SMC mavisi (#0072CE) beyaz zeminde -> marka + yuksek kontrast (kamera rahat okur)
img = qr.make_image(fill_color="#0072CE", back_color="white")
img.save(out)
print("QR yazildi:", out, "->", url)
