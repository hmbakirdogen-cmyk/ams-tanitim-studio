# NE      : HD bilesen render'larinin (hub/regulator/valf/sistem) BEYAZ zeminini SEFFAFa cevirir (kenardan flood-fill).
# NEDEN   : Mehmet Abi -> "urun teknoloji gorsellerini tamamla", "duz beyaz yapma temaya uydur". Render'lar opak-beyaz zeminli
#           (kenar-beyaz %100) -> koyu spotlight div'inde BEYAZ KUTU gibi duruyordu. Seffaf olunca koyu tema gercekten gorunur.
# NASIL   : Cihaz fotosuyla AYNI teknik (clean-image): kenardan flood-fill, sadece DIS beyaz saydam; ic urun govdesi (acik gri/beyaz)
#           KORUNUR. Sonra alfa kenarini 1px feather (hale olmasin). En-boy korunur, kirpma yok.
# YAN ETKI: Dev araci. public/products/*-hd.png + ams-product.png uzerine yazar. Orijinaller tools/_orig'e yedeklenir. Tekrar calistirilamaz
#           olmasin diye: yedek varsa ONDAN okur (idempotent).
import os
import numpy as np
from PIL import Image, ImageFilter

FILES = ['ams-system-hd', 'exa1-hub-hd', 'regulator-itv-hd', 'regulator-ar-hd', 'valve-vp-hd', 'ams-product']
D = 'public/products'
ORIG = 'tools/_orig'
os.makedirs(ORIG, exist_ok=True)
TH = 232  # bu degerin uzerindeki min(R,G,B) = "neredeyse beyaz" (dis zemin). Urun govdesi golgeli oldugu icin cogu < TH.

report = []
for f in FILES:
    src = os.path.join(D, f + '.png')
    bak = os.path.join(ORIG, f + '.orig.png')
    if not os.path.exists(bak):
        Image.open(src).save(bak)
    im = Image.open(bak).convert('RGBA')
    a = np.asarray(im).astype(np.uint8).copy()
    h, w = a.shape[:2]
    rgb = a[:, :, :3].astype(int)
    white = rgb.min(axis=2) > TH                      # neredeyse beyaz pikseller
    # KENARA DEGEN beyaz bilesenleri etiketle (scipy) — sadece DIS beyaz zemin. Ic urun govdesindeki beyaz KORUNUR (kenara bagli degil).
    from scipy import ndimage
    lbl, n = ndimage.label(white)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    outside = np.isin(lbl, list(border))             # dis zemin maskesi
    a[:, :, 3] = np.where(outside, 0, a[:, :, 3])
    # KENAR FEATHER: alfa maskesini hafif blurla -> sert beyaz halka olmasin (1.2px)
    alpha = Image.fromarray(a[:, :, 3])
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
    a[:, :, 3] = np.asarray(alpha)
    Image.fromarray(a).save(src)
    transp = (a[:, :, 3] < 20).mean() * 100
    report.append('%-18s seffaf%%=%.1f' % (f, transp))

open('tools/_renders_report.txt', 'w').write('\n'.join(report))
print('OK')
