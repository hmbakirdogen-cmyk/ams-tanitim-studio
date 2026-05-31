# Valf SOKETI (alt-orta konnektor) sirtindaki dikey oyugu bul. Soketler cihazin alt-ortasinda asagi sarkan acik-gri konnektorler.
from PIL import Image, ImageDraw
png = Image.open('public/products/ams-flow.png').convert('RGBA')
W, H = png.size
bg = Image.new('RGBA', (W, H), (12, 16, 28, 255)); bg.alpha_composite(png)
vis = bg.convert('RGB')
# Alt-orta sokets bolgesi (cablolarin takildigi konnektorler) — genis kirp
for name,(fx0,fy0,fx1,fy1) in {
  'A_altorta': (0.34, 0.52, 0.60, 0.78),   # iki M12 soket
  'B_genis':   (0.30, 0.50, 0.64, 0.82),
}.items():
    rx0,ry0,rx1,ry1 = int(fx0*W),int(fy0*H),int(fx1*W),int(fy1*H)
    c = vis.crop((rx0,ry0,rx1,ry1)); c = c.resize((c.width*3, c.height*3), Image.LANCZOS)
    c.save('tools/_sock_%s.png' % name)
    print('%s -> (%.2f,%.2f)-(%.2f,%.2f)' % (name,fx0,fy0,fx1,fy1))
