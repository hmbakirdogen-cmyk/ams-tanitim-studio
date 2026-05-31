# Sag valf modulunu net kirp + mevcut LED_VALVE konumunu (sari) ve dikey oyuk adaylarini goster.
from PIL import Image, ImageDraw
png = Image.open('public/products/ams-flow.png').convert('RGBA')
W, H = png.size
bg = Image.new('RGBA', (W, H), (12, 16, 28, 255)); bg.alpha_composite(png)
vis = bg.convert('RGB'); d = ImageDraw.Draw(vis)
# Mevcut LED_VALVE (0.72,0.31) sari +
lx, ly = int(0.72*W), int(0.31*H)
d.line([(lx-10,ly),(lx+10,ly)], fill=(255,240,0), width=2); d.line([(lx,ly-10),(lx,ly+10)], fill=(255,240,0), width=2)
d.text((lx+12,ly-6), 'mevcut LED', fill=(255,240,0))
# Sag modulu kirp + cok buyut
rx0,ry0,rx1,ry1 = int(0.62*W), int(0.18*H), int(0.90*W), int(0.42*H)
crop = vis.crop((rx0,ry0,rx1,ry1)); crop = crop.resize((crop.width*3, crop.height*3), Image.LANCZOS)
crop.save('tools/_vshow.png')
print('saved tools/_vshow.png  kirp=(%.2f,%.2f)-(%.2f,%.2f)' % (rx0/W,ry0/H,rx1/W,ry1/H))
