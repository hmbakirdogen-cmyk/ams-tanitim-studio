# NE   : Şeffaf ürün PNG'lerinde OPAK beyaz kenar rim'ini (matte fringe) temizler — silüet/detay BOZMADAN.
# NEDEN: Mehmet Abi "arka plan ile ürün arasında ince beyaz boşluk TEKRAR geldi." Önceki defringe.py yalnız
#        yarı-saydam (alpha<0.97) pikselleri düzeltiyordu; ama clean-renders.py silüetin en dış 1px'inde OPAK
#        beyaz sınır bırakmış (tanı: opak_beyaz_rim=True, parlaklık 183-216). Ürün koyu bölgelerinde (LCD/konnektör)
#        bu beyaz rim koyu zemine karşı ince beyaz çizgi gibi görünüyor.
# NASIL: "Derin iç renk dekontaminasyonu" — silüeti 3px ERODE et = DERİN İÇ (gerçek ürün gövdesi, beyaz rim hariç).
#        Kenar bandındaki (silüet sınırına 3px komşu + dıştaki yarı-saydam) HER pikselin RENGİNİ, en yakın DERİN-İÇ
#        pikselin rengiyle değiştir (distance_transform_edt nearest). Beyaz gövde bölgesinde en yakın iç=beyaz → renk
#        DEĞİŞMEZ (zarar yok); koyu bölgede en yakın iç=koyu → beyaz hale KOYUYA döner (fringe gider). Alpha/silüet AYNEN.
#        Yedek tools/_orig_edges/'den okunur (idempotent; defringe.py ile aynı yedek). Önce/sonra koyu-zemin zoom üretir.
# YAN ETKI: public/products/*.png üzerine yazar (aynı boyut/format). Offline korunur. Geri dönüş: _orig_edges/'ten.
import os, sys, shutil
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt, binary_erosion

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'public', 'products')
BAK  = os.path.join(ROOT, 'tools', '_orig_edges')
DIAG = os.path.join(ROOT, 'tools', '_diag', 'fix2')
os.makedirs(BAK, exist_ok=True); os.makedirs(DIAG, exist_ok=True)

DARK = np.array([10, 17, 32], float)   # koyu sahne/kart zemini (doğrulama composite)
TARGETS = ['exa1-hub-hd.png', 'regulator-itv-hd.png', 'regulator-ar-hd.png',
           'valve-vp-hd.png', 'ams-system-hd.png', 'ams-flow.png']
SIL_T  = 0.5    # silüet eşiği (alpha)
ERODE  = 3      # derin iç = silüeti bu kadar px küçült (beyaz rim'in ötesindeki gerçek gövde)
DUST_T = 0.06   # bunun altı = toz/hayalet → şeffaf

def comp(arr):
    a = arr[..., 3:4] / 255.0
    return (arr[..., :3] * a + DARK * (1 - a)).astype(np.uint8)

def run(name):
    p = os.path.join(PROD, name); bak = os.path.join(BAK, name)
    if not os.path.exists(bak):
        shutil.copy2(p, bak)
    src = Image.open(bak).convert('RGBA')
    arr = np.asarray(src, float).copy()
    rgb = arr[..., :3]; a = arr[..., 3] / 255.0

    sol = a > SIL_T
    deep = binary_erosion(sol, iterations=ERODE)
    if not deep.any():
        deep = binary_erosion(sol, iterations=1)
    if not deep.any():
        print(f"{name}: derin iç yok, atlandı"); return

    iy, ix = distance_transform_edt(~deep, return_distances=False, return_indices=True)
    nearest = rgb[iy, ix]
    band = (a > DUST_T) & ~deep            # kenar bandı: dış yarı-saydam + silüetin dış 3px'i (opak rim DAHİL)
    before_rgb = rgb.copy()
    rgb[band] = nearest[band]              # rengi derin-iç gerçek ürün rengiyle değiştir (alpha sabit → silüet korunur)

    a_out = a.copy(); a_out[a_out < DUST_T] = 0.0
    out = np.dstack([rgb, a_out * 255.0]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(p)

    # kaç piksel gerçekten değişti (beyaz gövdede değişmez, koyu kenarda değişir)
    changed = int((np.abs(before_rgb - rgb).sum(axis=2) > 12).sum())
    # önce/sonra koyu-zemin, üst-sol köşeden 3x zoom (fringe en görünür yer)
    b = comp(np.asarray(src, float)); af = comp(out.astype(float))
    ys, xs = np.where(sol); y0, x0 = ys.min(), xs.min()
    cw, ch = 150, 110
    def crop(im):
        c = im[max(0, y0 - 4):y0 - 4 + ch, max(0, x0 - 4):x0 - 4 + cw]
        return np.asarray(Image.fromarray(c).resize((cw * 3, ch * 3), Image.NEAREST))
    sep = np.full((ch * 3, 6, 3), (40, 90, 140), np.uint8)
    Image.fromarray(np.hstack([crop(b), sep, crop(af)])).save(os.path.join(DIAG, f'z_{name.replace(".png","")}.jpg'), quality=88)
    print(f"{name:22s} OK | kenar bandı {int(band.sum()):>7d} px | RENGİ değişen {changed:>7d} px (beyaz gövdede ~0 beklenir)")

for n in TARGETS:
    run(n)
print("\nbitti -> public/products güncellendi. Zoom önce/sonra: tools/_diag/fix2/z_*.jpg")
