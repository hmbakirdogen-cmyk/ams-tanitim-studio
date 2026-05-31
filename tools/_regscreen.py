# Regülatör KIRMIZI dijital ekranını (LCD camı) ams-flow.png'de tespit et → REG_DISP için birebir bbox (tüm-foto oranı).
# Kırmızı rakamları (".200") bul → çevresindeki KOYU cam dikdörtgenini bağlı-bileşenle ölç → fraksiyon yazdır + işaretli kırp kaydet.
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage

png = Image.open('public/products/ams-flow.png').convert('RGBA')
W, H = png.size
bg = Image.new('RGBA', (W, H), (12, 16, 28, 255)); bg.alpha_composite(png)
rgb = np.asarray(bg.convert('RGB')).astype(int)
R, G, B = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
mx = rgb.max(axis=2)

# ROI: regülatör ekranı civarı (mevcut REG_DISP=[0.198,0.450,0.073,0.022] etrafında geniş pay)
rx0, rx1 = int(0.14 * W), int(0.30 * W)
ry0, ry1 = int(0.40 * H), int(0.50 * H)
roi = np.zeros((H, W), bool); roi[ry0:ry1, rx0:rx1] = True

# 1) KIRMIZI rakam maskesi (.200) — R baskın, G/B düşük
red = (R > 90) & (R > G * 1.35) & (R > B * 1.35) & roi
ys, xs = np.where(red)
if len(xs) == 0:
    print('KIRMIZI BULUNAMADI — ROI/eşik ayarla'); raise SystemExit
rb = (xs.min(), ys.min(), xs.max(), ys.max())  # kırmızı rakam bbox (px)
cx, cy = (rb[0] + rb[2]) // 2, (rb[1] + rb[3]) // 2

# 2) SİYAH LCD camı — kırmızı rakam MERKEZİNDEN ışın-tara. Yeşil kanal: cam+rakam DÜŞÜK, açık gövde YÜKSEK.
#    Her yönde 3 ardışık parlak (G>120) piksel = açık gövde başladı → camın kenarı orada biter.
GBRIGHT = 88  # yeşil kanal: siyah LCD ~25, gri gömme panel ~95 → 88 panel kenarına yakın (siyah camın TAM kenarı)
def edge(dx, dy):
    x, y, run = cx, cy, 0
    while rx0 <= x < rx1 and ry0 <= y < ry1:
        if G[y, x] > GBRIGHT:
            run += 1
            if run >= 3: return (x - dx * 3, y - dy * 3)  # parlak başlangıcından geri (camın son koyu pikseli)
        else:
            run = 0
        x += dx; y += dy
    return (x, y)
left = edge(-1, 0)[0]; right = edge(1, 0)[0]
top = edge(0, -1)[1]; bot = edge(0, 1)[1]
sb = (left, top, right, bot)  # ekran bbox (px)

def frac(b):
    return [round(b[0] / W, 4), round(b[1] / H, 4), round((b[2] - b[0] + 1) / W, 4), round((b[3] - b[1] + 1) / H, 4)]

# Camın gerçek rengi (mask'i eşlemek için) — ekran kutusundaki KOYU (rakam-dışı) piksellerin medyanı
sub = rgb[sb[1]:sb[3] + 1, sb[0]:sb[2] + 1]
subm = sub.max(axis=2)
glass = sub[(subm < 70)]
if len(glass):
    med = np.median(glass, axis=0).astype(int)
    print('CAM rengi (medyan rgb):', tuple(med))
print('foto', W, 'x', H)
print('KIRMIZI rakam bbox(px)', rb, ' frac[x,y,w,h]', frac(rb))
print('EKRAN(koyu cam) bbox(px)', sb, ' frac[x,y,w,h]', frac(sb))
print('  -> REG_DISP =', frac(sb))

# işaretli kırp (gözle teyit)
vis = bg.convert('RGB'); d = ImageDraw.Draw(vis)
d.rectangle([sb[0], sb[1], sb[2], sb[3]], outline=(0, 255, 0), width=1)
d.rectangle([rb[0], rb[1], rb[2], rb[3]], outline=(255, 255, 0), width=1)
crop = vis.crop((rx0 - 8, ry0 - 8, rx1 + 8, ry1 + 8))
crop = crop.resize((crop.width * 4, crop.height * 4), Image.LANCZOS)
crop.save('tools/_regscreen.png')
print('saved tools/_regscreen.png (yeşil=ekran, sarı=rakam)')
