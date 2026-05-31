# Sag valf modulundeki TUM koyu oyuk adaylarini bul, numarala, buyutulmus gorsele yaz. Mehmet Abi numara secsin.
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage
png = Image.open('public/products/ams-flow.png').convert('RGBA')
W, H = png.size
a = np.asarray(png).astype(int)
alpha = a[:, :, 3]; mx = a[:, :, :3].max(axis=2)
# Sag modul bolgesi
rx0, rx1 = int(0.60*W), int(0.86*W)
ry0, ry1 = int(0.18*H), int(0.42*H)
roi = np.zeros((H, W), bool); roi[ry0:ry1, rx0:rx1] = True
dark = (alpha > 80) & (mx < 95) & roi
lbl, n = ndimage.label(dark)
vis = png.convert('RGB').copy()
d = ImageDraw.Draw(vis)
cands = []
for i in range(1, n+1):
    ys, xs = np.where(lbl == i)
    if len(xs) < 8: continue
    bw, bh = xs.max()-xs.min(), ys.max()-ys.min()
    if bw < 4 or bh < 4: continue
    if bw > 0.18*W or bh > 0.18*H: continue   # cok buyuk (govde/egzoz govdesi) ele
    cands.append((xs.min(), ys.min(), xs.max(), ys.max(), len(xs)))
cands.sort(key=lambda c: -c[4])
for idx, (x0,y0,x1,y1,nn) in enumerate(cands[:8], 1):
    d.rectangle([x0,y0,x1,y1], outline=(255,0,0), width=2)
    d.text((x0, y0-12), str(idx), fill=(255,255,0))
    print('#%d px=(%d,%d)-(%d,%d) wh=(%d,%d) oran cx=%.4f cy=%.4f w=%.4f h=%.4f' % (
        idx,x0,y0,x1,y1,x1-x0,y1-y0,(x0+x1)/2/W,(y0+y1)/2/H,(x1-x0)/W,(y1-y0)/H))
crop = vis.crop((rx0-10, ry0-10, rx1+10, ry1+10))
crop = crop.resize((crop.width*2, crop.height*2), Image.LANCZOS)
crop.save('tools/_slots.png')
print('saved tools/_slots.png')
