# NE   : Mevcut public/products PNG'lerinin kenar halesini (fringe) GÖRSEL teşhis eder + sayısal rapor.
# NEDEN: Mehmet Abi "ürün ile zemin arası ince beyaz boşluk tekrar geldi". Defringe yarı-saydam kenarı düzeltir;
#        ama fringe OPAK beyaz rim ise atlanır. Hangi tipte olduğunu görmeden çözüm körlemesine olur.
# NASIL: Her ürünü koyu zemine (#0a1120) bindir → içerik bbox'a kırp → sol-üst kenardan 3x zoom crop. Tek montaj JPG.
#        Ayrıca kenar bandı (silüet sınırına komşu) piksellerin parlaklık/alpha istatistiğini yazar.
import os, numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'public', 'products')
OUT  = os.path.join(ROOT, 'tools', '_diag', 'fringe_now.jpg')
os.makedirs(os.path.dirname(OUT), exist_ok=True)
DARK = np.array([10, 17, 32], float)   # koyu sahne/kart zemini benzeri
FILES = ['ams-flow.png','ams-system-hd.png','exa1-hub-hd.png','regulator-itv-hd.png','regulator-ar-hd.png','valve-vp-hd.png']

def comp(arr):
    a = arr[...,3:4]/255.0
    return (arr[...,:3]*a + DARK*(1-a)).astype(np.uint8)

tiles = []
print(f"{'dosya':22s} {'kenar_n':>8s} {'kenar_parlaklik_ort':>18s} {'opak_beyaz_rim?':>16s} {'max_a_kenar':>11s}")
for f in FILES:
    p = os.path.join(PROD, f)
    if not os.path.exists(p):
        print(f"{f}: yok"); continue
    im = Image.open(p).convert('RGBA')
    arr = np.asarray(im, float)
    a = arr[...,3]/255.0
    # silüet (alpha>0.5) ve onun dış sınır bandı (silüet dışında ama 2px içinde) = "kenar bandı"
    sol = a > 0.5
    if not sol.any():
        print(f"{f}: opak yok"); continue
    dil = ndimage.binary_dilation(sol, iterations=2)
    edge_band = dil & ~sol            # silüetin hemen dışındaki ince bant
    # ayrıca silüet İÇİ en dış 1px (opak rim) - beyaz mı?
    ero = ndimage.binary_erosion(sol, iterations=1)
    inner_rim = sol & ~ero
    rgb = arr[...,:3]
    bri = rgb.min(axis=2)             # min(R,G,B): beyazlık göstergesi (yüksek=beyaza yakın)
    band_pixels = edge_band & (a > 0.04)
    nb = int(band_pixels.sum())
    band_bri = float(bri[band_pixels].mean()) if nb else 0.0
    rim_bri = float(bri[inner_rim].mean()) if inner_rim.any() else 0.0
    rim_white = rim_bri > 170         # opak iç rim beyaza yakınsa = opak beyaz rim sorunu
    max_a_band = float(a[edge_band].max()) if edge_band.any() else 0.0
    print(f"{f:22s} {nb:>8d} {band_bri:>18.1f} {str(rim_white)+f'({rim_bri:.0f})':>16s} {max_a_band:>11.2f}")
    # görsel tile: bbox kırp
    ys, xs = np.where(sol)
    y0,y1,x0,x1 = ys.min(),ys.max(),xs.min(),xs.max()
    c = comp(arr)[max(0,y0-4):y1+5, max(0,x0-4):x1+5]
    ci = Image.fromarray(c); ci.thumbnail((360,360))
    tiles.append((f, ci))

# montaj
if tiles:
    H = max(t[1].height for t in tiles)
    W = sum(t[1].width for t in tiles) + 8*(len(tiles)-1)
    canvas = Image.new('RGB', (W, H), (10,17,32))
    x = 0
    for _, ci in tiles:
        canvas.paste(ci, (x, 0)); x += ci.width + 8
    canvas.save(OUT, quality=85)
    print(f"\nmontaj -> {OUT}  (sira: {', '.join(t[0] for t in tiles)})")
