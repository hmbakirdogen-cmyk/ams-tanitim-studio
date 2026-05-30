# NE      : Katalog ürün fotosunun (beyaz zemin) zeminini TİTİZ temizler → şeffaf PNG.
# NEDEN   : Akış diyagramı arka planı; "kırpılmış gibi durmasın" (Mehmet Abi). Runtime flood-fill SADECE dış zemini siler;
#           KAPALI bölgeler (montaj delikleri, kablo halkasının içi, modüller arası boşluk) beyaz kalıp kesik gösteriyordu.
# NASIL   : (1) dış zemin = kenara bağlı near-white (scipy.label) → şeffaf. (2) KAPALI near-white bölgeler: sadece PURE-white
#           (zemin ~250+) olanları sil (ürün gri gövdesi ~<244 korunur). (3) parlak kenar halesini 2px aşındır + alfa yumuşat.
# YAN ETKI: Sadece dev aracı (projeye dahil değil). Çıktı public/products/ams-flow.png. Tekrar çalıştırılabilir.
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = r"c:\Users\Admin\Projeler\ams-tanitim-studio\public\products\ams-flow.jpg"
DST = r"c:\Users\Admin\Projeler\ams-tanitim-studio\public\products\ams-flow.png"

# Ayarlanabilir eşikler (gözle doğrulayıp gerekirse oynat)
T_BG   = 244   # near-white zemin eşiği (min kanal) — bunun ÜstÜ zemin adayı
T_PURE = 248   # PURE beyaz (gerçek stüdyo zemini ~250+); kapalı bölge silme kriteri
PURE_FRAC = 0.85
HOLE_MIN = 18
HOLE_MAX_FRAC = 0.05  # kapalı bölge en fazla bu kadar (görüntünün %5'i) — büyük gövde paneli SİLİNMESİN

im = Image.open(SRC).convert("RGB")
arr = np.asarray(im).astype(np.int16)
H, W, _ = arr.shape
N = H * W
mn = arr.min(axis=2)   # her piksel min kanal (gri/beyazlık ölçütü)

st = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]])  # 4-komşuluk

# 1) DIŞ ZEMİN: kenara bağlı near-white
white = mn >= T_BG
lbl, n = ndimage.label(white, structure=st)
border = np.concatenate([lbl[0, :], lbl[-1, :], lbl[:, 0], lbl[:, -1]])
border_labels = [int(v) for v in np.unique(border) if v != 0]
outer = np.isin(lbl, border_labels)
alpha = np.where(outer, 0, 255).astype(np.uint8)

# 2) KAPALI near-white bölgeler (delik/kablo içi) — sadece PURE olanları sil
pure = mn >= T_PURE
enclosed = white & (~outer)
lbl2, n2 = ndimage.label(enclosed, structure=st)
removed = 0
if n2:
    idx = np.arange(1, n2 + 1)
    area = ndimage.sum(np.ones(()), lbl2, index=idx) if False else np.bincount(lbl2.ravel())[1:]
    pure_cnt = np.bincount(lbl2.ravel(), weights=pure.ravel())[1:]
    frac = pure_cnt / np.maximum(area, 1)
    keep_remove = (area >= HOLE_MIN) & (area <= N * HOLE_MAX_FRAC) & (frac >= PURE_FRAC)
    remove_ids = (idx[keep_remove]).tolist()
    if remove_ids:
        mask_rm = np.isin(lbl2, remove_ids)
        alpha[mask_rm] = 0
        removed = len(remove_ids)

# 3) PARLAK KENAR HALESİ aşındır (kesik görünmesin) — şeffafa komşu, parlak opak pikselleri sil (2 geçiş)
for thr in (224, 232):
    trans = alpha == 0
    nbr_trans = ndimage.binary_dilation(trans, structure=st)
    edge = (alpha > 0) & nbr_trans & (mn >= thr)
    alpha[edge] = 0

# 4) ALFA yumuşat (anti-alias kenar)
rgb = np.asarray(im).astype(np.uint8)
out = Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), "RGBA")
a = out.split()[3].filter(ImageFilter.GaussianBlur(0.6))
out.putalpha(a)
out.save(DST)

op = int((np.asarray(out.split()[3]) > 8).sum())
print(f"size={W}x{H} outer_bg={int(outer.sum())} holes_removed={removed} opaque_px={op} ({op*100//N}% of image)")
print(f"saved -> {DST}")
