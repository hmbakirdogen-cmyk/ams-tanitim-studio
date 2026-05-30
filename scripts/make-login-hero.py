# NE      : Giris ekrani urun gorseli (ams-hero.jpg) - NET yuksek-coz urun (ams-system) + sevilen FABRIKA arka plani (ams-diagram, yumusatilmis).
# NEDEN   : Mehmet Abi: "arka plan cok guzeldi (geri gelsin) + urun pencereye sigacak kadar BUYUK + buyutunce detaylar NET".
# NASIL   : ams-system beyaz zemini flood-fill ile seffaflastir (siyah kablo korunur) -> ams-diagram'i cover+blur+karart (premium bokeh zemin)
#           -> urunu BUYUK (kablo altta tasar=kirpilir) zemine bindir. Pillow-only (numpy yok). Cikti: public/products/ams-hero.jpg.
# YAN ETKI: Tek seferlik uretim; thresh/scale/konum gerekirse ayarlanir. Kaynaklar public/'te (offline).
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageChops
import os

P = r"c:\Users\Admin\Projeler\ams-tanitim-studio\public\products"
OUT_W, OUT_H = 1500, 1150

# --- 1) Urunu kes (beyaz zemin -> seffaf) ---
src = Image.open(os.path.join(P, "ams-system.jpg")).convert("RGB")
W, H = src.size
fm = src.copy()
SENT = (255, 0, 255)
# (a) DIS beyaz zemin: koselerden flood-fill
for s in [(0, 0), (W - 1, 0), (0, H - 1), (W - 1, H - 1), (W // 2, 0), (W // 2, H - 1), (0, H // 2), (W - 1, H // 2)]:
    ImageDraw.floodfill(fm, s, SENT, thresh=30)  # dusuk thresh -> urune sizmaz (hafif beyaz hale olabilir)
# (b) KAPALI beyaz delikler (yalnizca KUCUK cepler = montaj yuvalari). Buyuk beyaz govde/plaka ve ufak parlama lekeleri KORUNUR.
#     Her saf-beyaz tohum icin once KOPYADA dene, doldurulan alan kucukse (yuva) gercekten kaldir; buyukse (govde) dokunma.
SENT2 = (0, 255, 0)
MIN_AREA, MAX_AREA = 500, int(W * H * 0.006)  # yuva araligi: lekeden buyuk, plakadan kucuk
fmpix = fm.load()
skip = Image.new("L", (W, H), 0)
skd = ImageDraw.Draw(skip)
skpix = skip.load()
for yy in range(0, H, 4):
    for xx in range(0, W, 4):
        if skpix[xx, yy]:
            continue
        p = fmpix[xx, yy]
        if p == SENT or not (p[0] >= 253 and p[1] >= 253 and p[2] >= 253):
            continue
        test = fm.copy()
        ImageDraw.floodfill(test, (xx, yy), SENT2, thresh=6)
        bb = ImageChops.difference(fm, test).convert("L").getbbox()
        if not bb:
            continue
        area = (bb[2] - bb[0]) * (bb[3] - bb[1])
        if MIN_AREA <= area <= MAX_AREA:
            ImageDraw.floodfill(fm, (xx, yy), SENT, thresh=6)  # kucuk yuva -> saydam
        else:
            skd.rectangle(bb, fill=255)  # buyuk/kucuk-leke bolge -> bir daha test etme (govde korunur)
r, g, b = fm.split()
mr = r.point(lambda v: 255 if v == 255 else 0).convert("1")
mg = g.point(lambda v: 255 if v == 0 else 0).convert("1")
mb = b.point(lambda v: 255 if v == 255 else 0).convert("1")
sent = ImageChops.logical_and(ImageChops.logical_and(mr, mg), mb)  # SENT (zemin) olan yerler
alpha = ImageChops.invert(sent.convert("L"))  # urun opak, zemin seffaf
prod = src.convert("RGBA")
prod.putalpha(alpha)
prod = prod.crop(alpha.getbbox())  # urunu sik kirp

# --- 2) Fabrika arka plani: cover + blur + karart (premium bokeh) ---
def cover(im, w, h):
    sc = max(w / im.width, h / im.height)
    im2 = im.resize((int(im.width * sc) + 1, int(im.height * sc) + 1), Image.LANCZOS)
    x = (im2.width - w) // 2
    y = (im2.height - h) // 2
    return im2.crop((x, y, x + w, y + h))

bg = cover(Image.open(os.path.join(P, "ams-diagram.jpg")).convert("RGB"), OUT_W, OUT_H)
bg = bg.filter(ImageFilter.GaussianBlur(11))  # orta bulaniklik: fabrika anlasilir AMA arka plandaki unite "hayalet" olmaz
bg = ImageEnhance.Brightness(bg).enhance(0.78)
bg = ImageEnhance.Color(bg).enhance(1.06)
bg = Image.blend(bg, Image.new("RGB", (OUT_W, OUT_H), (6, 20, 48)), 0.14)  # hafif mavi derinlik
canvas = bg.convert("RGBA")

# --- 3) Urunu BUYUK bindir (kablo altta tasar) ---
scale = (OUT_W * 0.80) / prod.width
nw, nh = int(prod.width * scale), int(prod.height * scale)
prod_r = prod.resize((nw, nh), Image.LANCZOS)
px = (OUT_W - nw) // 2
py = int(OUT_H * 0.09)  # ust-merkez; kablo asagi tasar (kirpilir)
canvas.alpha_composite(prod_r, (px, py))

canvas.convert("RGB").save(os.path.join(P, "ams-hero.jpg"), quality=92)
print("yazildi: ams-hero.jpg", (OUT_W, OUT_H), "| urun(scaled):", (nw, nh), "| konum:", (px, py))
