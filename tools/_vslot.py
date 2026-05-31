# Gonderilen kucuk resimdeki DIKEY oyugu bul: sag valf modulunde (H-I sutun, 3-4 satir) DIKEY (boy>en) koyu yarik.
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage
png = Image.open('public/products/ams-flow.png').convert('RGBA')
W, H = png.size
a = np.asarray(png).astype(int)
alpha = a[:, :, 3]; mx = a[:, :, :3].max(axis=2)
# ROI: sag modul UST kismi (kucuk resimdeki acik gri govde + dikey oyuk); egzozun UZAGI (y<0.33)
rx0, rx1 = int(0.66*W), int(0.86*W)
ry0, ry1 = int(0.20*H), int(0.33*H)
roi = np.zeros((H, W), bool); roi[ry0:ry1, rx0:rx1] = True
dark = (alpha > 80) & (mx < 110) & roi
lbl, n = ndimage.label(dark)
vis = png.convert('RGB').copy(); d = ImageDraw.Draw(vis)
found = []
for i in range(1, n+1):
    ys, xs = np.where(lbl == i)
    if len(xs) < 6: continue
    bw, bh = xs.max()-xs.min()+1, ys.max()-ys.min()+1
    if bh <= bw: continue                 # DIKEY olsun (boy > en)
    if bh < 6 or bh > 0.10*H: continue
    found.append((xs.min(), ys.min(), xs.max(), ys.max(), bw, bh, len(xs)))
found.sort(key=lambda c: -c[5])           # en uzun dikey
for idx,(x0,y0,x1,y1,bw,bh,nn) in enumerate(found[:6],1):
    d.rectangle([x0,y0,x1,y1], outline=(255,0,0), width=1)
    d.text((x1+2,y0), str(idx), fill=(255,240,80))
    print('#%d px=(%d,%d)-(%d,%d) en=%d boy=%d  oran cx=%.4f cy=%.4f w=%.4f h=%.4f' % (
        idx,x0,y0,x1,y1,bw,bh,(x0+x1)/2/W,(y0+y1)/2/H,bw/W,bh/H))
crop = vis.crop((rx0-6, ry0-6, rx1+6, ry1+6)); crop = crop.resize((crop.width*3, crop.height*3), Image.LANCZOS)
crop.save('tools/_vslot.png')
print('saved tools/_vslot.png  (n_dikey=%d)' % len(found))
