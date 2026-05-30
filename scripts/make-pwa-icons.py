# NE      : PWA ikonlarini (PNG) SMC kimligiyle uretir - apple-touch (iOS), 192/512 (Android "any"), 512 maskable.
# NEDEN   : iOS apple-touch-icon PNG ister (SVG calismaz); Android adaptive icon maskable PNG ister. Offline kalir (varliklar public/'te gomulu).
# NASIL   : Pillow ile capraz SMC-mavisi gradyan + beyaz "SMC" (Arial Bold) cizilir; "any" yuvarlak kose, maskable tam kare + guvenli alan.
# YAN ETKI: Sadece public/ altina PNG yazar; tek seferlik calistir (ikon degisirse tekrar). Font: C:\Windows\Fonts\arialbd.ttf.
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "public")
FONT = r"C:\Windows\Fonts\arialbd.ttf"

# icon.svg ile ayni gradyan duraklari (SMC mavisi)
STOPS = [(0.0, (36, 145, 240)), (0.5, (0, 114, 206)), (1.0, (2, 74, 150))]


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def grad(t):
    for i in range(len(STOPS) - 1):
        t0, c0 = STOPS[i]
        t1, c1 = STOPS[i + 1]
        if t <= t1:
            f = (t - t0) / (t1 - t0) if t1 > t0 else 0
            return lerp(c0, c1, f)
    return STOPS[-1][1]


def make(size, fname, text_ratio=0.36, rounded=True):
    S = size
    # capraz gradyan (sol-ust -> sag-alt) tek putdata ile (hizli)
    px = [grad((x + y) / (2 * (S - 1))) for y in range(S) for x in range(S)]
    img = Image.new("RGB", (S, S))
    img.putdata(px)
    img = img.convert("RGBA")

    if rounded:
        # "any" ikon: yumusak yuvarlak kose (seffaf kose)
        mask = Image.new("L", (S, S), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=255)
        img.putalpha(mask)

    d = ImageDraw.Draw(img)
    font = ImageFont.truetype(FONT, int(S * text_ratio))
    txt = "SMC"
    b = d.textbbox((0, 0), txt, font=font)
    tw, th = b[2] - b[0], b[3] - b[1]
    tx, ty = (S - tw) / 2 - b[0], (S - th) / 2 - b[1]
    d.text((tx, ty + S * 0.012), txt, font=font, fill=(0, 20, 50, 110))  # hafif golge -> derinlik
    d.text((tx, ty), txt, font=font, fill=(255, 255, 255, 255))

    img.save(os.path.join(OUT, fname))
    print("yazildi:", fname, f"{S}x{S}")


# Android "any" (yuvarlak kose)
make(192, "pwa-192.png", text_ratio=0.36, rounded=True)
make(512, "pwa-512.png", text_ratio=0.36, rounded=True)
# Android adaptive maskable: tam kare + metin guvenli alanda (kucuk)
make(512, "pwa-maskable-512.png", text_ratio=0.30, rounded=False)
# iOS apple-touch: tam kare (iOS kendi maskesini uygular)
make(180, "apple-touch-icon.png", text_ratio=0.36, rounded=False)
print("TAMAM")
