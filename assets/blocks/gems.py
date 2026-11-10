# Candy gem shapes for ore (32-px blocks). Each shape is a polygon; facets are shaded by their direction to a
# top-left light, a lighter "table" sits in the middle, 2-px dark outline and a 2-px drop shadow.
import math

from PIL import Image, ImageDraw

LIGHT = (-0.6, -0.8)  # from top-left


def regular(n, r, rot=0.0, sx=1.0, sy=1.0):
    return [(math.cos(rot + 2 * math.pi * i / n) * r * sx, math.sin(rot + 2 * math.pi * i / n) * r * sy) for i in range(n)]


def star(r, inner=0.5, n=5):
    pts = []
    for i in range(n * 2):
        a = -math.pi / 2 + math.pi * i / n
        rr = r if i % 2 == 0 else r * inner
        pts.append((math.cos(a) * rr, math.sin(a) * rr))
    return pts


def heart(r):
    pts = []
    for i in range(24):
        t = 2 * math.pi * i / 24
        x = 16 * math.sin(t) ** 3
        y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((x / 17 * r, y / 17 * r + r * 0.05))
    return pts


def drop(r):
    pts = []
    for i in range(20):
        t = 2 * math.pi * i / 20
        x = math.sin(t) * r * 0.75
        y = -math.cos(t) * r
        if math.cos(t) > 0:  # pointed top
            x *= (1 - math.cos(t)) ** 0.8
        pts.append((x, y * 0.95 + r * 0.1))
    return pts


SHAPES = {
    "round": lambda r: regular(10, r, math.pi / 10),
    "oval": lambda r: regular(10, r, 0, 0.75, 1.0),
    "square": lambda r: [(-r * 0.8, -r * 0.55), (-r * 0.55, -r * 0.8), (r * 0.55, -r * 0.8), (r * 0.8, -r * 0.55),
                         (r * 0.8, r * 0.55), (r * 0.55, r * 0.8), (-r * 0.55, r * 0.8), (-r * 0.8, r * 0.55)],
    "diamond": lambda r: [(0, -r), (r * 0.72, 0), (0, r), (-r * 0.72, 0)],
    "hex": lambda r: regular(6, r, math.pi / 6, 0.85, 1.0),
    "heart": heart,
    "star": lambda r: star(r * 1.1, 0.52),
    "drop": drop,
}


def shade(c, k):
    return tuple(round(c[i] + ((255, 244, 214)[i] - c[i]) * k) for i in range(3)) if k >= 0 else tuple(
        round(c[i] + ((40, 30, 78)[i] - c[i]) * (-k * 1.1)) for i in range(3))


def gem(im, shape, cx, cy, r, fill, outline, lo=7, hi=24):
    """Draw one gem onto a 32-px RGB image in place."""
    pts = [(cx + x, cy + y) for x, y in SHAPES[shape](r)]
    size = im.size
    body = Image.new("L", size, 0)
    ImageDraw.Draw(body).polygon(pts, fill=255)
    bm = body.load()
    cells = {(x, y) for y in range(size[1]) for x in range(size[0]) if bm[x, y]}
    ring = set(cells)
    for _ in range(2):
        ring |= {(x + dx, y + dy) for x, y in ring for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))}
    ring -= cells
    px = im.load()
    ok = lambda q: lo <= q[0] <= hi and lo <= q[1] <= hi  # noqa: E731
    for q in {(x + 2, y + 2) for x, y in cells | ring} - cells - ring:
        if ok(q):
            px[q] = shade(px[q], -0.25)
    for q in ring:
        if ok(q):
            px[q] = outline
    # facets: triangle (centre, p_i, p_i+1) shaded by its outward normal
    facets = Image.new("RGB", size)
    fd = ImageDraw.Draw(facets)
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        mx, my = (a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy
        ln = math.hypot(mx, my) or 1
        d = (mx * LIGHT[0] + my * LIGHT[1]) / ln
        fd.polygon([(cx, cy), a, b], fill=shade(fill, 0.38 * d if d > 0 else 0.45 * d))
    table = [(cx + (x - cx) * 0.5 - r * 0.06, cy + (y - cy) * 0.5 - r * 0.06) for x, y in pts]
    fd.polygon(table, fill=shade(fill, 0.22))
    fpx = facets.load()
    for q in cells:
        px[q] = fpx[q]
    # sparkle: a white 2-px glint on the table's upper-left
    gx, gy = round(cx - r * 0.32), round(cy - r * 0.38)
    for q in ((gx, gy), (gx + 1, gy), (gx, gy + 1)):
        if q in cells:
            px[q] = (255, 255, 255)
