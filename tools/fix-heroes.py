# NE   : Hero JPG'lerin beyaz/parlak kenar şeritlerini GERÇEK sahneyi uzatarak kapatır (soyutlama YOK).
# NEDEN: Mehmet Abi "yarıda kesilmiş/beyaz şeritli resim istemiyorum". ams-industry40 sol ~49px TAM BEYAZ (255) →
#        koyu temada beyaz şerit/kesik gibi duruyor. Gerçek görünümü koruyarak (foto kalır) sahneyi sola yansıt/uzat.
# NASIL: Soldan parlak (lum>200) şerit genişliğini bul → o kadar genişlikte komşu GERÇEK sahne dilimini AYNALA (mirror) →
#        beyaz yerine doğal sahne dokusu gelir. Aynı mantık sağ/üst/alt için de (gerekiyorsa). Orijinal _orig_edges'e yedeklenir.
# YAN ETKI: Sadece kenar şeritleri değişir; sahnenin özü/ürün aynı kalır. JPG formatı/boyutu korunur.
import os, sys, shutil
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROD = os.path.join(ROOT, 'public', 'products')
BAK  = os.path.join(ROOT, 'tools', '_orig_edges')
os.makedirs(BAK, exist_ok=True)

def lum(a):
    return 0.299*a[...,0] + 0.587*a[...,1] + 0.114*a[...,2]

def strip_width_left(L, thr=200):
    colmean = L.mean(0); w = 0
    for x in range(len(colmean)):
        if colmean[x] > thr: w += 1
        else: break
    return w

def strip_width_right(L, thr=200):
    colmean = L.mean(0); w = 0
    for x in range(len(colmean)-1, -1, -1):
        if colmean[x] > thr: w += 1
        else: break
    return w

def strip_height_top(L, thr=225):
    rowmean = L.mean(1); h = 0
    for y in range(len(rowmean)):
        if rowmean[y] > thr: h += 1
        else: break
    return h

def fix(name, thr_lr=200, thr_t=228):
    p = os.path.join(PROD, name); bak = os.path.join(BAK, name)
    if not os.path.exists(bak): shutil.copy2(p, bak)
    im = Image.open(bak).convert('RGB')   # her zaman orijinalden
    a = np.asarray(im).copy(); L = lum(a.astype(float)); H, W, _ = a.shape
    lw = strip_width_left(L, thr_lr); rw = strip_width_right(L, thr_lr); th = strip_height_top(L, thr_t)
    msg = [f"{name} {W}x{H}: sol={lw} sag={rw} ust={th}"]
    # SOL beyaz şerit → komşu sahneyi aynala
    if lw >= 3:
        src = a[:, lw:lw*2][:, ::-1]               # lw..2lw dilimini ters çevir (mirror)
        if src.shape[1] >= lw:
            a[:, :lw] = src[:, :lw]
        msg.append(f"sol {lw}px aynalandı")
    # SAĞ beyaz şerit
    if rw >= 3:
        src = a[:, W-2*rw:W-rw][:, ::-1]
        if src.shape[1] >= rw:
            a[:, W-rw:] = src[:, -rw:]
        msg.append(f"sag {rw}px aynalandı")
    # ÜST parlak band (sadece TAM beyaza yakınsa)
    if th >= 3:
        src = a[th:2*th][::-1]
        if src.shape[0] >= th:
            a[:th] = src[:th]
        msg.append(f"ust {th}px aynalandı")
    Image.fromarray(a).save(p, quality=92)
    print(" | ".join(msg))

for n in ['ams-industry40.jpg', 'ams-scene-hero.jpg']:
    fix(n)
print("bitti -> public/products guncellendi")
