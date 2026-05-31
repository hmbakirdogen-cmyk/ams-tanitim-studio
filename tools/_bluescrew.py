# Gonderilen resim: acik-gri konnektor sirti + ALTINDA MAVI VIDA. Mavi vidalari bul → ustundeki konnektor = hedef oyuk.
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage
png = Image.open('public/products/ams-flow.png').convert('RGBA')
W, H = png.size
a = np.asarray(png).astype(int)
R,G,B = a[:,:,0],a[:,:,1],a[:,:,2]; alpha=a[:,:,3]
# Mavi vida: B baskin, R dusuk, orta-yuksek doygunluk
blue = (alpha>80) & (B>110) & (B-R>35) & (B-G>15) & (G>70)
lbl,n = ndimage.label(blue)
vis = png.convert('RGB').copy(); d=ImageDraw.Draw(vis)
spots=[]
for i in range(1,n+1):
    ys,xs=np.where(lbl==i)
    if len(xs)<10: continue
    bw,bh=xs.max()-xs.min()+1, ys.max()-ys.min()+1
    if bw<5 or bh<5 or bw>0.06*W or bh>0.06*H: continue
    cx,cy=(xs.min()+xs.max())/2,(ys.min()+ys.max())/2
    spots.append((cx,cy,len(xs)))
spots.sort(key=lambda s:-s[2])
for idx,(cx,cy,nn) in enumerate(spots[:8],1):
    d.ellipse([cx-12,cy-12,cx+12,cy+12], outline=(255,0,0), width=2)
    d.text((cx+13,cy-6), str(idx), fill=(255,240,80))
    print('#%d mavi-vida oran cx=%.4f cy=%.4f n=%d' % (idx,cx/W,cy/H,nn))
vis.save('tools/_bluescrew.png'); print('saved tools/_bluescrew.png  (toplam %d)' % len(spots))
