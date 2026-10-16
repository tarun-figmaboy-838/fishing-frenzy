#!/usr/bin/env python3
"""Paints the treasure map's parchment, parts/lesson/assets/images/treasure-map.webp (1770 x 988, shown at 1180 x 659):
aged paper with a warm centre and darker worn edges, fine grain, a few faint stains and a soft, slightly uneven edge
that fades out (nothing cut hard). A plain sheet: the shape is drawn on it (css/game.css .map). Run: python3 tools/paint-treasure-map.py [out.webp W H] (the summary's square scraps: parts/lesson/assets/images/
summary-scrap.webp 1024 984)"""
import math, random
from PIL import Image, ImageDraw, ImageFilter, ImageChops

random.seed(5)
import sys
OUT = sys.argv[1] if len(sys.argv) > 1 else 'parts/lesson/assets/images/treasure-map.webp'
W, H = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1770, 988)
# the paper: a warm radial gradient, darker toward the edges
paper = Image.new('RGB', (W, H))
px = paper.load()
for y in range(H):
    for x in range(W):
        u, v = (x - W / 2) / (W / 2), (y - H / 2) / (H / 2)
        d = min(1.0, (u * u + v * v) ** 0.5 * 0.85)
        r = 250 - 22 * d; g = 236 - 38 * d; b = 196 - 54 * d
        px[x, y] = (int(r), int(g), int(b))
# grain
grain = Image.effect_noise((W // 2, H // 2), 30).resize((W, H), Image.BICUBIC).convert('L').point(lambda v: 128 + (v - 128) * 0.35)
paper = ImageChops.soft_light(paper, Image.merge('RGB', [grain] * 3))  # a fine, light grain
# faint stains and a few darker fibres
stain = Image.new('L', (W, H), 0); d = ImageDraw.Draw(stain)
for _ in range(9):
    x, y = random.uniform(80, W - 80), random.uniform(60, H - 60); r = random.uniform(60, 180)
    d.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=random.randint(8, 18))
stain = stain.filter(ImageFilter.GaussianBlur(60))
paper = ImageChops.subtract(paper, Image.merge('RGB', [stain.point(lambda v: int(v * 0.9)), stain, stain.point(lambda v: int(v * 1.4))]))
fibres = Image.new('L', (W, H), 0); d = ImageDraw.Draw(fibres)
for _ in range(260):
    x, y = random.uniform(0, W), random.uniform(0, H); L = random.uniform(10, 60); a = random.uniform(-0.4, 0.4)
    d.line([(x, y), (x + L * math.cos(a), y + L * math.sin(a))], fill=random.randint(6, 14), width=1)
paper = ImageChops.subtract(paper, Image.merge('RGB', [fibres] * 3).filter(ImageFilter.GaussianBlur(0.6)))
# worn, slightly wavy edge: a polygon with a gentle wobble, feathered; and a darker rim just inside it
pts = []
def edge(n, fx, fy):
    for i in range(n):
        t = i / n
        wob = 10 * math.sin(t * 19 + fx) + 5 * math.sin(t * 47 + fy) + random.uniform(-2, 2)
        yield t, wob
M = 22
for t, w in edge(120, 0.3, 1.1): pts.append((M + t * (W - 2 * M), M + w))
for t, w in edge(80, 2.1, 0.4): pts.append((W - M + w, M + t * (H - 2 * M)))
for t, w in edge(120, 1.7, 2.9): pts.append((W - M - t * (W - 2 * M), H - M + w))
for t, w in edge(80, 0.9, 2.2): pts.append((M + w, H - M - t * (H - 2 * M)))
mask = Image.new('L', (W, H), 0); ImageDraw.Draw(mask).polygon(pts, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(3))
rim = ImageChops.subtract(mask, mask.filter(ImageFilter.GaussianBlur(26))).point(lambda v: int(v * 0.32))
paper = ImageChops.subtract(paper, Image.merge('RGB', [rim.point(lambda v: int(v * 0.6)), rim.point(lambda v: int(v * 0.8)), rim]))
out = paper.convert('RGBA'); out.putalpha(mask)
out.save(OUT, 'WEBP', quality=86, method=6)
print(OUT, out.size)
