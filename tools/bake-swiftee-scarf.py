"""Swiftee wears the lesson's winter scarf everywhere: python3 tools/bake-swiftee-scarf.py

The lesson draws her red scarf over every frame at run time (parts/lesson/js/winter-scarf.js, registered by its
tools/build-scarf-anchors.py and tools/build-scarf-occlusion.py). The fishing games and the front page draw her from
their own sheets, so this bakes the very same scarf into those sheets, with the lesson's own code:

  * each frame's neck is found by the lesson's anchor() (its cheek feathers) and its foreground wing by the lesson's
    mask() (its dark teal paint), both copied unchanged from the lesson's tools;
  * the scarf is placed, turned and shaded in a real browser canvas exactly as the lesson's winter-scarf.js draws it
    (WinterScarf.draw: the same anchor, turn, size rule and contact shadow) - with two changes the fishing art
    needs, so the scarf fits her and never looks cut:
      - fitted to her body: the fishing birds' cheeks are wider for their bodies than the lesson's, so the lesson's
        size rule overshot their outline. Here her body is measured along the scarf's line, from the neck point out
        to where her wing (the lesson's own wing colour test) or her outline begins on each side, and the band is
        made the lesson's proportion of it (BAND_OVER_BODY, measured on the lesson's sheets) and centred on her body,
        so its round ends sit just over her edge as in the lesson; nothing of the band ever hangs beyond her;
      - the tail drapes over her wing, whole: the lesson redraws its birds' front wing over the scarf, but the
        fishing birds' wings are shaded differently, so only some of a wing counted and the tail came out sliced.

Reads the unscarfed art in tools/scarf/originals/ (so it can run again) and writes:
  parts/fishing-1/assets/sprites/swiftee.webp                  the flight cycle (4 wing beats)
  parts/fishing-2/assets/sprites/swiftee.webp                  the same flight cycle
  parts/fishing-2/assets/sprites/swiftee-personality.webp      her 16 talking / blinking / laughing poses
  parts/fishing-2/assets/sprites/swiftee-front-personality.webp  her 12 front-facing flight poses
  shell/images/banner.webp                                     the Fishing Frenzy banner (Swiftee on the raft)
and a contact sheet of every frame to look at: /tmp/swiftee-scarf-check.png
Needs Pillow and Python Playwright with Chromium.
"""
import base64
import functools
import http.server
import io
import json
import math
import threading
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ORIG = ROOT / 'tools' / 'scarf' / 'originals'


# ---------- the lesson's registration, unchanged (parts/lesson/tools/build-scarf-anchors.py) ----------
def anchor(image):
    w, h = image.size
    # Mint cheek feathers, excluding turquoise wings, cream eyes and props.
    points = [(i % w, i // w) for i, (r, g, b, a) in enumerate(image.getdata())
              if a > 180 and 85 < r < 180 and g > 185
              and 1.35 * r < g < 2.05 * r and r + 25 < b < g - 12]
    if len(points) < 20:
        return None  # Fully offscreen/transparent frames must not gain a floating scarf.
    mx = sum(x for x, y in points) / len(points)
    my = sum(y for x, y in points) / len(points)
    xx = sum((x - mx) ** 2 for x, y in points)
    yy = sum((y - my) ** 2 for x, y in points)
    xy = sum((x - mx) * (y - my) for x, y in points)
    angle = max(-.65, min(.65, .5 * math.atan2(2 * xy, xx - yy)))
    co, si = math.cos(angle), math.sin(angle)
    horizontal = sorted((x - mx) * co + (y - my) * si for x, y in points)
    vertical = sorted(-(x - mx) * si + (y - my) * co for x, y in points)
    bottom = vertical[int(len(vertical) * .98)] + h * .012
    width = (horizontal[int(len(horizontal) * .99)] - horizontal[int(len(horizontal) * .01)]) * 1.18
    return [round((mx - bottom * si) / w, 5), round((my + bottom * co) / h, 5),
            round(width / w, 5), round(angle, 4)]


# ---------- the lesson's wing occlusion, unchanged (parts/lesson/tools/build-scarf-occlusion.py) ----------
def mask(frame):
    frame = frame.resize((256, 256)).convert('RGBA')
    pixels = list(frame.getdata())
    rectangles, active = [], {}
    for y in range(256):
        spans, start = [], None
        for x in range(257):
            r, g, b, a = pixels[y * 256 + min(x, 255)]
            # The dark teal foreground wing paint differs from the lighter
            # turquoise torso. Cream eyes, red beak and yellow tools are excluded.
            wing = x < 256 and a > 220 and r < 45 and 110 < g < 166 and 105 < b < 163 and g - r > 85
            if wing and start is None:
                start = x
            if not wing and start is not None:
                if x - start > 1:
                    spans.append((start, x - start))
                start = None
        following = {}
        for span in spans:
            rect = active.pop(span, [span[0], y, span[1], 0])
            rect[3] += 1
            following[span] = rect
        rectangles.extend(active.values())
        active = following
    rectangles.extend(active.values())
    return base64.b64encode(bytes(v for rect in rectangles for v in rect)).decode()


# ---------- what to bake: every frame as a square cell (the scarf code works in square cells) ----------
def personality(sheet, key):
    data = json.loads((ROOT / 'parts/fishing-2/src/personality-data.js').read_text().split('PopoGame.PERSONALITY_DATA = ')[1].rstrip().rstrip(';'))
    return [tuple(f['box']) for f in data[key]['frames']]


JOBS = [
    # name, original, outputs, frames [(x, y, w, h)], save options
    ('flight', 'fishing-1-swiftee.webp', ['parts/fishing-1/assets/sprites/swiftee.webp', 'parts/fishing-2/assets/sprites/swiftee.webp'],
     [(i * 280, 0, 280, 285) for i in range(4)], {'quality': 92, 'alpha_quality': 100}),
    ('personality', 'fishing-2-swiftee-personality.webp', ['parts/fishing-2/assets/sprites/swiftee-personality.webp'],
     personality('swiftee-personality', 'swiftee'), {'lossless': True}),
    ('front', 'fishing-2-swiftee-front-personality.webp', ['parts/fishing-2/assets/sprites/swiftee-front-personality.webp'],
     personality('swiftee-front-personality', 'swiftee-front'), {'lossless': True}),
    # the banner: just the square round Swiftee on the raft (no other mint paint in it)
    ('banner', 'banner.webp', ['shell/images/banner.webp'], [(110, 250, 260, 260)], {'quality': 92}),
]


# The scarf art (parts/lesson/assets/images/winter-scarf-flat.webp, 768 px): its band spans x 147-728 (0.756 of the
# art) round the lesson's anchor (0.571, 0.54); its tail is what hangs below y 440, left of x 256.
BAND = 581 / 768
# In the lesson's sheets the band is 136 px across a body (wings not counted) of 104 px at the scarf's line: 1.31.
# A shade less here, as the fishing birds' bodies are rounder at the neck.
BAND_OVER_BODY = 1.25


def is_wing(r, g, b, a):
    """The lesson's wing paint test (build-scarf-occlusion.py)."""
    return a > 220 and r < 45 and 110 < g < 166 and 105 < b < 163 and g - r > 85


def fit(cell, a, wings=True):
    """The lesson's neck point and turn, with the band's width and centre measured to her body. wings: her wings join
    her body at the scarf's line (side views), so her body ends where wing paint begins; facing the viewer they are
    separate shapes, drawn with their own outline, and her outline alone marks her edge."""
    W = cell.width
    px = cell.load()
    cx, cy, ang = a[0] * W, (a[1] + .03) * W, a[3]  # where winter-scarf.js draws the scarf's anchor
    ux, uy = math.cos(ang), math.sin(ang)

    def edge(sign):
        # out along the line to where her body ends: her outline (transparent or dark ink), or her wing (three wing
        # pixels in a row, so a stray dark speck in her feathers doesn't count)
        d, wing = 0.0, 0
        while d < W:
            x, y = cx + sign * ux * (d + 0.5), cy + sign * uy * (d + 0.5)
            if not (0 <= x < W and 0 <= y < W):
                return d
            r, g, b, al = px[int(x), int(y)]
            if al < 128 or (0.299 * r + 0.587 * g + 0.114 * b) < 70:
                return d
            wing = wing + 1 if wings and is_wing(r, g, b, al) else 0
            if wing >= 6:
                return d - 2.5
            d += 0.5
        return d
    left, right = edge(-1), edge(1)
    span = (left + right) * BAND_OVER_BODY
    mid = (right - left) / 2
    nx, ny = cx + ux * mid, cy + uy * mid
    w_art = span / BAND
    return [round(nx / W, 5), round(ny / W - .03, 5), round(w_art * .763 / (1.1 * W), 5), a[3]], (left, right)


def png_url(im):
    buf = io.BytesIO()
    im.save(buf, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


PAGE = '''<!doctype html><meta charset="utf-8"><body>
<script src="/parts/lesson/js/winter-scarf.js"></script>
<script>
// The scarf as winter-scarf.js draw() places it (anchor, turn, size, contact shadow), in two layers: the band,
// kept to her body, then the tail, whole
window.fitted = async (cells) => {
  const art = new Image(); art.src = '/parts/lesson/assets/images/winter-scarf-flat.webp'; await art.decode();
  const layer = (keepTail) => {
    const c = document.createElement('canvas'); c.width = c.height = 768;
    const g = c.getContext('2d'); g.drawImage(art, 0, 0);
    g.globalCompositeOperation = 'destination-in';
    g.beginPath();
    if (keepTail) g.rect(0, 440, 256, 328);
    else { g.rect(0, 0, 768, 440); g.rect(256, 440, 512, 328); }
    g.fill();
    return c;
  };
  const band = layer(false), tail = layer(true), out = [];
  for (const c of cells) {
    const src = new Image(); src.src = c.png; await src.decode();
    const S = c.size, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    ctx.drawImage(src, 0, 0);
    const p = c.anchor;
    if (p) {
      const w = p[2] * S * 1.1 / .763, h = w * .76;
      const draw = (img, toBody) => {
        const L = document.createElement('canvas'); L.width = L.height = S;
        const g = L.getContext('2d');
        g.save();
        g.translate(p[0] * S, (p[1] + .03) * S);
        g.rotate(p[3]);
        g.shadowColor = 'rgba(14, 91, 82, .20)'; g.shadowBlur = S / 512; g.shadowOffsetY = S / 512;
        g.drawImage(img, -.571 * w, -.54 * h, w, h);
        g.restore();
        if (toBody) { g.globalCompositeOperation = 'destination-in'; g.drawImage(src, 0, 0); }
        ctx.drawImage(L, 0, 0);
      };
      draw(band, true);
      draw(tail, false);
    }
    out.push(cv.toDataURL('image/png'));
  }
  return out;
};
window.bake = async (cells) => {
  const art = new Image(); art.src = '/parts/lesson/assets/images/winter-scarf-flat.webp'; await art.decode();
  await new Promise((r) => setTimeout(r, 50)); // winter-scarf.js loads its own copy of the art
  const out = [];
  for (const c of cells) {
    const src = new Image(); src.src = c.png; await src.decode();
    window.SWIFTEE_SCARF_ANCHORS = { cell: [c.anchor] };
    window.SWIFTEE_SCARF_OCCLUSION = { masks: [c.mask], frames: { cell: [0] } };
    const cv = document.createElement('canvas'); cv.width = cv.height = c.size;
    if (c.anchor) WinterScarf.frame(cv.getContext('2d'), src, 0, 0, c.size, 'cell', 0, 0, 0, c.size, c.size);
    else cv.getContext('2d').drawImage(src, 0, 0);
    out.push(cv.toDataURL('image/png'));
  }
  return out;
};
</script>'''


def main():
    (ROOT / 'tools' / 'scarf' / 'bake.html').write_text(PAGE)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    check = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.goto(f'http://127.0.0.1:{srv.server_address[1]}/tools/scarf/bake.html')
            page.wait_for_function('() => window.WinterScarf && window.bake')
            for name, original, outputs, frames, save in JOBS:
                sheet = Image.open(ORIG / original).convert('RGBA')
                cells = []
                for (x, y, w, h) in frames:
                    size = max(w, h)
                    cell = Image.new('RGBA', (size, size), (0, 0, 0, 0))
                    cell.paste(sheet.crop((x, y, x + w, y + h)), (0, 0))
                    a = anchor(cell)
                    if a and name != 'banner':
                        a, (l, r) = fit(cell, a, wings=name != 'front')
                        print(f'  {name} {x},{y}: band {l:.0f} + {r:.0f} px either side of her neck')
                    if name == 'banner' and a:
                        # the banner is painted rounder than the sprites: up a little onto the neck, a little narrower,
                        # and less tilted, so the scarf hugs her neck under the beak as it does in the lesson
                        a = [a[0] - 0.004, a[1] - 0.03, round(a[2] * 0.86, 5), round(a[3] * 0.6, 4)]
                    cells.append({'png': png_url(cell), 'anchor': a, 'mask': mask(cell), 'size': size})
                    print(f'{name} {x},{y}: neck {a}')
                baked = page.evaluate('(c) => window.bake(c)' if name == 'banner' else '(c) => window.fitted(c)', cells)
                out = sheet.copy()
                for (x, y, w, h), url in zip(frames, baked):
                    im = Image.open(io.BytesIO(base64.b64decode(url.split(',', 1)[1]))).convert('RGBA').crop((0, 0, w, h))
                    if name == 'banner':
                        out.paste(im, (x, y), im)  # over the painting (the cell is transparent round her)
                    else:
                        out.paste(im, (x, y))
                    check.append(im)
                for o in outputs:
                    target = ROOT / o
                    if name == 'banner':
                        out.convert('RGB').save(target, 'WEBP', **save, method=6)
                    else:
                        out.save(target, 'WEBP', **save, method=6)
                    print('wrote', o, target.stat().st_size, 'bytes')
            browser.close()
    finally:
        srv.shutdown()
        (ROOT / 'tools' / 'scarf' / 'bake.html').unlink(missing_ok=True)
    # a contact sheet of every baked frame
    cols, cw = 8, 180
    rows = math.ceil(len(check) / cols)
    sheet = Image.new('RGBA', (cols * cw, rows * cw), (126, 192, 255, 255))
    for i, im in enumerate(check):
        im = im.copy()
        im.thumbnail((cw, cw))
        sheet.alpha_composite(im, ((i % cols) * cw + (cw - im.width) // 2, (i // cols) * cw + (cw - im.height) // 2))
    sheet.save('/tmp/swiftee-scarf-check.png')
    print('contact sheet: /tmp/swiftee-scarf-check.png')


if __name__ == '__main__':
    main()
