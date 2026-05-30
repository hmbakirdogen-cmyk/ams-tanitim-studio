from PIL import Image
src = r"c:\Users\Admin\Projeler\ams-tanitim-studio\public\products\ams-flow.jpg"
im = Image.open(src).convert("RGB")
W, H = im.size
# regülatör bölgesi (sol-alt) — geniş kırp
box = (int(0.09 * W), int(0.24 * H), int(0.34 * W), int(0.50 * H))
crop = im.crop(box)
crop = crop.resize((crop.width * 4, crop.height * 4), Image.LANCZOS)
crop.save(r"c:\Users\Admin\Projeler\ams-tanitim-studio\tools\reg-zoom.jpg", quality=92)
print("full", W, H, "box(px)", box, "box(frac)", [round(box[0]/W,3), round(box[1]/H,3), round(box[2]/W,3), round(box[3]/H,3)])
