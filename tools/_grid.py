# Cihaz fotosuna A..(sutun) x 1..(satir) koordinat izgarasi koy → Mehmet Abi oyugun adresini soylesin.
from PIL import Image, ImageDraw
png = Image.open('public/products/ams-flow.png').convert('RGBA')
W, H = png.size
bg = Image.new('RGBA', (W, H), (12, 16, 28, 255)); bg.alpha_composite(png)
vis = bg.convert('RGB')
d = ImageDraw.Draw(vis)
COLS, ROWS = 10, 12   # 0.1 x 0.0833 adim
for c in range(COLS+1):
    x = int(c/COLS*W); d.line([(x,0),(x,H)], fill=(80,170,255), width=1)
    if c < COLS: d.text((x+3, 3), chr(65+c), fill=(255,240,80))
for r in range(ROWS+1):
    y = int(r/ROWS*H); d.line([(0,y),(W,y)], fill=(80,170,255), width=1)
    if r < ROWS: d.text((3, y+2), str(r+1), fill=(255,240,80))
vis.save('tools/_grid.png')
print('grid %dx%d  sutun A..%s  satir 1..%d  -> tools/_grid.png' % (COLS,ROWS,chr(64+COLS),ROWS))
print('hucre genisligi=%.3f orani, yuksekligi=%.3f orani' % (1/COLS, 1/ROWS))
