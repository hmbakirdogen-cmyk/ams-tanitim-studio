# NE      : Giris + urun hero gorsellerindeki BEYAZ alanlari kirpar, urunu cerceveye doldurur (Mehmet Abi gorsel zevki).
# NEDEN   : ams-scene-hero ust beyaz bant + sol-ust swoosh; ams-industry40 sag-alt beyaz SMC-logo swoosh -> "bos/beyaz alan YOK" kurali.
# NASIL   : foto-olculu siniri kirp (scene: x>=119,y>=81). industry40: sag-alt beyaz kose koyu SMC-mavisiyle ortulur (logo tasarim ogesi, kirpinca urun kayar).
# YAN ETKI: Sadece dev araci. Ciktilar public/products/*.jpg uzerine yazar; .orig.jpg yedegi birakir. Tekrar calistirilabilir (yedekden okur).
import os
from PIL import Image
import numpy as np

D = 'public/products'

def backup(name):
    src = os.path.join(D, name)
    bak = src.replace('.jpg', '.orig.jpg')
    if not os.path.exists(bak):
        Image.open(src).save(bak, quality=95)
    return bak

# --- 1) scene-hero: ust beyaz banti kirp + sol-ust swoosh ucgenini ALTTAN gelen mavi fabrikayla doldur ---
# Beyaz cerceve tasarim ogesi: ust bant + sol-ust diyagonal swoosh. Urunler+mavi fabrika ortada temiz.
# Cozum: ust banti kirp; kalan sol-ust ucgen near-beyazini, hemen ALTINDAKI mavi fabrika pikseliyle
# doldur (dikey kaydirma) -> renk yerel ve mavi, dogal harmanlanir (global gri-medyan hatasi tekrarlanmaz).
from PIL import ImageFilter
bak = backup('ams-scene-hero.jpg')
im = Image.open(bak).convert('RGB')
a = np.asarray(im.crop((0, 96, im.size[0], im.size[1]))).astype(float)  # ust beyaz bant + sliver kirp
h1, w1 = a.shape[:2]
SHIFT = 95  # ucgeni dolduracak mavi fabrika bu kadar alttan gelir
src_up = np.roll(a, -SHIFT, axis=0)  # her pikselin SHIFT alttaki degeri
white1 = (a.min(axis=2) > 233)        # near-beyaz swoosh (mavi fabrika ALL>233 olmaz)
ys, xs = np.mgrid[0:h1, 0:w1]
tri = (xs < w1 * 0.30) & (ys < h1 * 0.42)   # sadece sol-ust ucgen bolgesi (urunler korunur)
m1 = (white1 & tri).astype(float)
m1img = Image.fromarray((m1 * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(4))
m1 = (np.asarray(m1img).astype(float) / 255.0)[..., None]
out1 = a * (1 - m1) + src_up * m1
res1 = Image.fromarray(out1.clip(0, 255).astype('uint8'))
res1.save(os.path.join(D, 'ams-scene-hero.jpg'), quality=88)
print('scene-hero swoosh gomuldu ->', res1.size)

# --- 2) industry40: sag-alt beyaz SMC swoosh'u koyu temaya gom ---
# Beyaz kosedeki pikselleri (sag-alt ceyrek) koyu SMC-laciverte boya, sert kenar olmasin diye yumusak harmanla.
bak2 = backup('ams-industry40.jpg')
im2 = Image.open(bak2).convert('RGB')
a = np.asarray(im2).astype(float)
h2, w2 = a.shape[:2]
white = (a.min(axis=2) > 200)
# sadece sag-alt bolgedeki beyazi hedefle (logo swoosh orada)
ys, xs = np.mgrid[0:h2, 0:w2]
region = (xs > w2 * 0.62) & (ys > h2 * 0.30)
mask = (white & region).astype(float)
# maskeyi yumusat (gaussian benzeri kutu bulanikligi) -> sert kenar yok
from PIL import ImageFilter
mimg = Image.fromarray((mask * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(6))
m = np.asarray(mimg).astype(float) / 255.0
m = m[..., None]
fill = np.array([7, 16, 32], dtype=float)  # #070e1c konteyner zemini ile uyumlu koyu lacivert
out = a * (1 - m) + fill * m
Image.fromarray(out.clip(0, 255).astype('uint8')).save(os.path.join(D, 'ams-industry40.jpg'), quality=88)
print('industry40 beyaz swoosh gomuldu')
