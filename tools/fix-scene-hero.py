# NE      : Giris hero (ams-scene-hero) beyaz cerceveyi KESIN temizler; urunun alti TAM kalir.
# NEDEN   : Mehmet Abi -> iki yanda beyaz serit + urunun alti yarim kesik. Onceki islem yan seritleri birakmis.
# NASIL   : Orijinalden (1280x414) DIKEY inpaint: her beyaz piksel (min>233), hemen ALTINDAKI ilk
#           beyaz-olmayan (mavi fabrika) pikselle doldurulur; altta yoksa ustten. Boylece ust beyaz bant +
#           sol-ust swoosh maviyle dolar, KIRPMA YOK -> urun bottom tam. Yatay artiklar icin de soldan-saga tarama.
# YAN ETKI: Sadece dev araci. public/products/ams-scene-hero.jpg uzerine yazar (1280x414). Orijinal tools/_orig'de durur.
import numpy as np
from PIL import Image

SRC = 'tools/_orig/ams-scene-hero.orig.jpg'
OUT = 'public/products/ams-scene-hero.jpg'

im = Image.open(SRC).convert('RGB')
# 0) SOL/SAG tam-beyaz dikey cerceveyi KIRP (olculen: sol 49, sag 49). Bu kenarlar tum sutun boyunca
#    beyaz -> doldurulamaz, kirpilir. ALT KIRPILMAZ (urunun alti tam kalsin). Ust bant asagida doldurulur.
im = im.crop((50, 0, im.size[0] - 50, im.size[1]))  # 1280 -> 1180 genislik, 414 yukseklik korunur
a = np.asarray(im).astype(np.uint8).copy()
h, w = a.shape[:2]
TH = 233

def is_white(px):
    return int(px.min()) > TH

# 1) DIKEY inpaint: her sutun icin, beyaz pikselleri ALTTAKI ilk mavi pikselle doldur (tepeden inerek)
for x in range(w):
    col = a[:, x, :]
    white = col.min(axis=1) > TH
    if not white.any():
        continue
    # alttan-ust dogru: son gorulen mavi pikseli yukari tasi
    last_blue = None
    for y in range(h - 1, -1, -1):
        if not white[y]:
            last_blue = col[y].copy()
        elif last_blue is not None:
            col[y] = last_blue
    # hala beyaz kalan tepe pikselleri (altinda mavi yoktu) -> ustten asagi ilk maviyle
    first_blue = None
    for y in range(h):
        if col[y].min() <= TH:
            first_blue = col[y].copy()
        elif first_blue is not None:
            col[y] = first_blue
    a[:, x, :] = col

# 2) Kalan yatay beyaz artik (varsa) -> soldan saga komsu mavi
for y in range(h):
    row = a[y, :, :]
    last_blue = None
    for x in range(w):
        if row[x].min() <= TH:
            last_blue = row[x].copy()
        elif last_blue is not None:
            row[x] = last_blue
    a[y, :, :] = row

res = Image.fromarray(a)
res.save(OUT, quality=88)
# dogrulama
arr = np.asarray(res).astype(int)
white = (arr.min(axis=2) > TH)
open('tools/_fix_report.txt', 'w').write(
    'size %dx%d\nkalan beyaz%% %.3f\nsol50%% %.2f sag50%% %.2f ust30%% %.2f alt30%% %.2f\n' % (
        res.size[0], res.size[1], white.mean() * 100,
        white[:, :50].mean() * 100, white[:, -50:].mean() * 100,
        white[:30, :].mean() * 100, white[-30:, :].mean() * 100))
print('OK')
