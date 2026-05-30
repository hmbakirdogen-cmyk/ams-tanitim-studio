# NE      : Halil Bey portresini varsayilan avatara hazirlar - yuz odakli kareye kirpar, 512px'e olcekler, hafif canlandirir.
# NEDEN   : Mehmet Abi: "en karizmatik/yuksek cozunurluk avatar". App ici yukleme zaten var; bu GOMULU varsayilan (giris karti/sidebar).
# NASIL   : Pillow ile ust-merkez kare kirp (yuz ust ucte) -> 512x512 LANCZOS -> hafif kontrast/renk. public/users/halil.jpg.
# YAN ETKI: Tek seferlik. Avatar bileseni ayrica CSS filtre + objectPosition 'center 30%' uygular (yuz ortalanir).
from PIL import Image, ImageEnhance
import os

SRC = r"C:\Users\Admin\Desktop\1539630353700.jpg"
OUTDIR = os.path.join(os.path.dirname(__file__), "..", "public", "users")
os.makedirs(OUTDIR, exist_ok=True)

im = Image.open(SRC).convert("RGB")
W, H = im.size
side = int(round(0.60 * min(W, H)))     # kare kenar (yuz + omuz)
left = int(round(W * 0.50 - side / 2))   # yatay merkez
top = int(round(H * 0.04))               # ust ucten basla (yuz ust bolgede)
left = max(0, min(left, W - side))
top = max(0, min(top, H - side))

crop = im.crop((left, top, left + side, top + side)).resize((512, 512), Image.LANCZOS)
crop = ImageEnhance.Contrast(crop).enhance(1.05)
crop = ImageEnhance.Color(crop).enhance(1.06)
crop = ImageEnhance.Brightness(crop).enhance(1.02)
out = os.path.join(OUTDIR, "halil.jpg")
crop.save(out, quality=92)
print("yazildi:", out, "| kaynak:", (W, H), "| kirpim:", (left, top, side))
