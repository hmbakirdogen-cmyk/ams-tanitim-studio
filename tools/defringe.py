# NE   : Şeffaf ürün PNG'lerinde BEYAZ kenar halesini (matte fringe) temizler — KALİTE BOZMADAN.
# NEDEN: Mehmet Abi: "arka planla ürün arasında ince beyaz boşluk istemiyorum, sökülmüş hissi vermesin;
#        AMA ürünün görünüm kalitesini de asla bozma." Ürünler beyaz zeminde render edilip kesilmiş →
#        yarı-saydam kenar pikselleri ~beyaz (233/255) kalmış = göze batan ince hale.
# NASIL: "Kenar rengi dekontaminasyonu" — alpha < 0.97 olan her piksel RENGİNİ, en yakın OPAK ürün
#        pikselinin rengiyle değiştir (distance_transform_edt ile nearest-opaque). Alpha/silüet AYNEN kalır
#        (şekil/detay korunur), sadece beyaz renk katkısı gider. Çok küçük alpha (<6%) → 0 (hayalet/toz temizliği).
#        Orijinaller tools/_orig_edges/'e yedeklenir (geri dönülebilir). Her ürün için önce/sonra navy-composite üretir.
# YAN ETKI: Görsel boyutu/formatı değişmez (aynı PNG, RGBA). Sadece kenar renkleri düzelir. Offline korunur.
import os, sys, shutil
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'public', 'products')
BAK  = os.path.join(ROOT, 'tools', '_orig_edges')
DIAG = os.path.join(ROOT, 'tools', '_diag', 'fix')
os.makedirs(BAK, exist_ok=True)
os.makedirs(DIAG, exist_ok=True)

NAVY = np.array([11, 30, 55], float)  # #0b1e37 kart zemini
TARGETS = ['exa1-hub-hd.png', 'regulator-itv-hd.png', 'regulator-ar-hd.png',
           'valve-vp-hd.png', 'ams-system-hd.png', 'ams-flow.png']

OPAQUE_T = 0.97   # bunun altındaki alpha = kenar bandı → rengi dekontamine et
DUST_T   = 0.06   # bunun altındaki alpha = hayalet/toz → tamamen şeffaf

def comp_navy(arr_rgba):
    a = arr_rgba[..., 3:4] / 255.0
    return (arr_rgba[..., :3] * a + NAVY * (1 - a)).astype(np.uint8)

def defringe(name):
    p = os.path.join(PROD, name)
    bak = os.path.join(BAK, name)
    if not os.path.exists(bak):
        shutil.copy2(p, bak)  # ilk seferde orijinali yedekle
    src = Image.open(bak).convert('RGBA')   # HER ZAMAN orijinalden işle (üst üste binmesin)
    arr = np.asarray(src, float).copy()
    rgb = arr[..., :3]
    a   = arr[..., 3] / 255.0

    opaque = a >= OPAQUE_T
    if not opaque.any():
        print(f"{name}: opak piksel yok, atlandi"); return

    # En yakin OPAK pikselin koordinatlari (nearest-opaque). edt: 0'a (=opak) uzaklik + indeks.
    iy, ix = distance_transform_edt(~opaque, return_distances=False, return_indices=True)
    nearest = rgb[iy, ix]                      # her piksel icin en yakin opak rengi
    mask = ~opaque
    rgb[mask] = nearest[mask]                   # kenar bandinin RENGINI urun rengiyle degistir (alpha sabit)

    # cok kucuk alpha -> 0 (hayalet ring/toz)
    a_out = a.copy()
    a_out[a_out < DUST_T] = 0.0

    out = np.dstack([rgb, a_out * 255.0]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(p)       # public/'e geri yaz (ayni dosya/format)

    # on/sonra navy composite (dogrulama icin)
    before = comp_navy(np.asarray(src, float))
    after  = comp_navy(out.astype(float))
    h = before.shape[0]
    sep = np.full((h, 6, 3), (40, 90, 140), np.uint8)
    pair = np.hstack([before, sep, after])
    pim = Image.fromarray(pair); pim.thumbnail((1400, 1400))
    pim.save(os.path.join(DIAG, f'ba_{name.replace(".png","")}.jpg'), quality=72, optimize=True)

    semi_before = ((np.asarray(src)[...,3] > 10) & (np.asarray(src)[...,3] < 247))
    print(f"{name:22s} OK | kenar piksel {int(mask.sum()-( (a<DUST_T).sum() )):>7d} dekontamine, "
          f"dust->0 {int((a<DUST_T).sum()):>6d} | onceki semi-kenar {int(semi_before.sum())}")

for n in TARGETS:
    defringe(n)
print("\nbitti -> public/products guncellendi, once/sonra: tools/_diag/fix/ba_*.jpg")
