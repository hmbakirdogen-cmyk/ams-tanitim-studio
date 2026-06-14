# NE   : Ürün şeffaf-PNG'lerinin kenar kalitesini TEŞHİS — gerçek koyu navy kart zeminine bindirip
#        (kullanıcının gördüğü hali) + köşe/kenar 4x zoom + beyaz fringe metriği.
# NEDEN: Mehmet Abi "arka planla ürün arasında ince beyaz boşluk istemiyorum" + "sökülmüş hissi vermesin".
#        Önce GÖRMEDEN dokunma (körlemesine = yanlış yönlendirme). Bu script gözle teşhis çıktısı üretir.
# NASIL: RGBA aç → navy üstüne composite → contact sheet + corner zoom kareleri + numerik fringe raporu.
import os, sys, numpy as np
sys.stdout.reconfigure(encoding='utf-8', errors='replace')  # TR konsol cp1254 -> unicode print patlamasin
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'public', 'products')
OUT  = os.path.join(ROOT, 'tools', '_diag')
os.makedirs(OUT, exist_ok=True)

# Kartların gerçek zemini (radial-gradient #173a63 -> #0b1e37 -> #06101e). Fringe en çok orta-koyuda belli.
NAVY = np.array([11, 30, 55], float)      # #0b1e37 (baskın stop)

TARGETS = ['exa1-hub-hd.png', 'regulator-itv-hd.png', 'regulator-ar-hd.png',
           'valve-vp-hd.png', 'ams-system-hd.png', 'ams-flow.png']

def comp_navy(rgba):
    arr = np.asarray(rgba, float)
    a = arr[..., 3:4] / 255.0
    out = arr[..., :3] * a + NAVY * (1 - a)
    return out.astype(np.uint8)

def stats(name):
    p = os.path.join(PROD, name)
    im = Image.open(p).convert('RGBA')
    arr = np.asarray(im, float)
    W, H = im.size
    a = arr[..., 3] / 255.0
    lum = (0.299*arr[...,0] + 0.587*arr[...,1] + 0.114*arr[...,2])
    transp = (a < 0.04)
    opaque = (a > 0.96)
    semi   = (~transp) & (~opaque)
    # iç kenar halkası: opak AMA şeffafa <=2px komşu
    near_transp = ndimage.binary_dilation(transp, iterations=2)
    inner_ring = opaque & near_transp
    deep = ndimage.binary_erosion(opaque, iterations=6)
    ring_lum = lum[inner_ring].mean() if inner_ring.any() else 0
    deep_lum = lum[deep].mean() if deep.any() else 0
    semi_lum = lum[semi].mean() if semi.any() else 0
    # "beyazımsı" iç-kenar oranı: ring'de hem parlak hem doygunluğu düşük (beyaz/gri) pikseller
    rgb = arr[...,:3]
    mx = rgb.max(axis=2); mn = rgb.min(axis=2)
    sat = np.where(mx>0, (mx-mn)/np.maximum(mx,1), 0)
    whiteish = inner_ring & (lum > 150) & (sat < 0.25)
    white_frac = whiteish.sum() / max(inner_ring.sum(), 1)
    print(f"{name:22s} {W}x{H} | transp {transp.mean()*100:4.1f}% opaque {opaque.mean()*100:4.1f}% semi {semi.mean()*100:4.1f}% "
          f"| ring_lum {ring_lum:5.1f} deep_lum {deep_lum:5.1f} (d{ring_lum-deep_lum:+5.1f}) "
          f"semi_lum {semi_lum:5.1f} | beyaz-fringe orani {white_frac*100:4.1f}%")
    return im, (transp, opaque, semi, inner_ring, whiteish)

# 1) Contact sheet: hepsi navy üstünde, yan yana
print("=== KENAR TEŞHİS (navy #0b1e37 zeminde) ===")
thumbs = []
metas = []
for name in TARGETS:
    im, masks = stats(name)
    metas.append((name, im, masks))
    comp = Image.fromarray(comp_navy(im))
    comp.thumbnail((360, 360))
    thumbs.append((name, comp))

cw = 360; ch = 360; pad = 8; cols = 3
rows = (len(thumbs)+cols-1)//cols
sheet = Image.new('RGB', (cols*(cw+pad)+pad, rows*(ch+pad+16)+pad), (6,16,30))
from PIL import ImageDraw
d = ImageDraw.Draw(sheet)
for i,(name,th) in enumerate(thumbs):
    r,c = divmod(i, cols)
    x = pad + c*(cw+pad); y = pad + r*(ch+pad+16)
    sheet.paste(th, (x + (cw-th.width)//2, y + (ch-th.height)//2))
    d.text((x+4, y+ch+2), name, fill=(150,190,230))
sheet.save(os.path.join(OUT, 'contact.jpg'), quality=90)
print("\nsaved tools/_diag/contact.jpg", sheet.size)

# 2) Köşe zoom kareleri (her ürün: bbox 4 köşesi, navy üstünde, 4x büyütme)
def corner_sheet(name, im):
    arr = np.asarray(im)
    a = arr[...,3]
    ys, xs = np.where(a > 10)
    if len(xs)==0: return
    x0,x1,y0,y1 = xs.min(), xs.max(), ys.min(), ys.max()
    S = 130  # köşe kare boyu
    comp = comp_navy(im)
    cimg = Image.fromarray(comp)
    corners = {
        'TL': (x0, y0), 'TR': (x1-S, y0),
        'BL': (x0, y1-S), 'BR': (x1-S, y1-S),
        'Lmid': (x0, (y0+y1)//2 - S//2), 'Tmid': ((x0+x1)//2 - S//2, y0),
    }
    tiles = []
    for lbl,(cx,cy) in corners.items():
        cx = max(0, min(cx, im.width-S)); cy = max(0, min(cy, im.height-S))
        tile = cimg.crop((cx, cy, cx+S, cy+S)).resize((S*4, S*4), Image.NEAREST)
        tiles.append((lbl, tile))
    tw = S*4
    sh = Image.new('RGB', (len(tiles)*(tw+6)+6, tw+22), (6,16,30))
    dd = ImageDraw.Draw(sh)
    for i,(lbl,t) in enumerate(tiles):
        x = 6 + i*(tw+6)
        sh.paste(t, (x, 18))
        dd.text((x+4, 2), f"{name} {lbl}", fill=(150,190,230))
    sh.thumbnail((1900, 1900))
    out = os.path.join(OUT, f'corners_{name.replace(".png","")}.jpg')
    sh.save(out, quality=88)
    print("saved", out, sh.size)

for name, im, masks in metas:
    corner_sheet(name, im)
