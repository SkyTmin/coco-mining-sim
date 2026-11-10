# Block texture concepts, three styles. Writes PNGs next to this file: <style>_<id>.png
# Run: python3 assets/concepts/blocks/tex.py
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "tex")
os.makedirs(OUT, exist_ok=True)


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def shade(c, k):
    # hue-shifted shading: shadows lean to cool purple, lights to warm cream (reads "tasty", not muddy)
    return mix(c, (40, 30, 78), -k * 1.1) if k < 0 else mix(c, (255, 244, 214), k)


# world 1 set for the mockup: rock, common, rare, gem, treasure (+ floor, crack)
ROCK = {"w1": "#a7a2b4", "w2": "#d0784a", "w3": "#e4def0"}
ORES = {
    "coal": ("#3a3a48", "#8a8aa6"),
    "copper": ("#e2803e", "#ffc08a"),
    "iron": ("#e9d3bd", "#fff4e6"),
    "gem": ("#3fd6c8", "#c8fff6"),
    "amber": ("#ffb21f", "#fff1a0"),
}
WALL_ORDER = ["coal", "copper", "iron", "gem", "amber"]


def noise_grid(n, seed, blobs=5, low=0.0):
    r = random.Random(seed)
    pts = [(r.uniform(0, n), r.uniform(0, n), r.uniform(-1, 1)) for _ in range(blobs * 3)]
    g = [[0.0] * n for _ in range(n)]
    for y in range(n):
        for x in range(n):
            v = 0.0
            for px, py, w in pts:
                for ox in (-n, 0, n):
                    for oy in (-n, 0, n):
                        d = math.hypot(x + 0.5 - px - ox, y + 0.5 - py - oy)
                        v += w * math.exp(-(d * d) / (n * 0.9))
            g[y][x] = v + r.uniform(-low, low)
    flat = sorted(v for row in g for v in row)
    lo, hi = flat[0], flat[-1]
    return [[(v - lo) / (hi - lo + 1e-9) for v in row] for row in g]


# ---------------------------------------------------------------- style A: candy block (16 px, framed, chunky gems)
def candy_base(rock, seed, n=16):
    base = hexrgb(rock)
    g = noise_grid(n, seed, blobs=4, low=0.08)
    im = Image.new("RGB", (n, n))
    px = im.load()
    for y in range(n):
        for x in range(n):
            v = g[y][x]
            px[x, y] = shade(base, 0.10) if v > 0.66 else (shade(base, -0.10) if v < 0.30 else base)
    # bevel frame: dark outline, light top-left, dark bottom-right
    out = shade(base, -0.55)
    for i in range(n):
        for (x, y) in ((i, 0), (i, n - 1), (0, i), (n - 1, i)):
            px[x, y] = out
    for i in range(1, n - 1):
        px[i, 1] = shade(base, 0.32)
        px[1, i] = shade(base, 0.24)
        px[i, n - 2] = shade(base, -0.28)
        px[n - 2, i] = shade(base, -0.22)
    return im


GEM_SPOTS = [(3, 3, 6), (10, 3, 4), (9, 9, 5), (3, 11, 3)]


def candy_gem(px, x0, y0, s, fill, light, outline):
    for y in range(y0, y0 + s):
        for x in range(x0, x0 + s):
            corner = (x in (x0, x0 + s - 1)) and (y in (y0, y0 + s - 1))
            if corner and s >= 3:
                continue
            px[x, y] = fill
    # outline around
    for y in range(y0 - 1, y0 + s + 1):
        for x in range(x0 - 1, x0 + s + 1):
            inside = x0 <= x < x0 + s and y0 <= y < y0 + s
            corner = (x in (x0, x0 + s - 1)) and (y in (y0, y0 + s - 1))
            if (not inside or (corner and s >= 3)) and 1 < x < 15 and 1 < y < 15:
                nb = any(
                    x0 <= x + dx < x0 + s
                    and y0 <= y + dy < y0 + s
                    and not ((x + dx in (x0, x0 + s - 1)) and (y + dy in (y0, y0 + s - 1)) and s >= 3)
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                )
                if nb:
                    px[x, y] = outline
    px[x0 + 1 if s >= 3 else x0, y0 if s >= 3 else y0] = light
    if s >= 4:
        px[x0 + 1, y0 + 1] = light
        px[x0 + s - 2, y0 + s - 1] = shade(fill, -0.3)


def candy(rock, ore, seed):
    im = candy_base(rock, seed)
    if ore:
        fill, light = (hexrgb(c) for c in ORES[ore])
        px = im.load()
        spots = GEM_SPOTS if ore != "amber" else [(3, 3, 7), (10, 9, 5), (11, 3, 3)]
        for x0, y0, s in spots:
            candy_gem(px, x0, y0, s, fill, (255, 255, 255) if ore in ("gem", "amber") else light, hexrgb("#1e2140") if ore != "coal" else hexrgb("#0d0d14"))
        if ore == "amber":
            for x, y in ((3, 12), (13, 3), (7, 13)):
                px[x, y] = (255, 255, 255)
    return im


# ---------------------------------------------------------------- style B: clean pixel (16 px, distinct ore shapes, thin seam)
def clean_base(rock, seed, n=16):
    base = hexrgb(rock)
    g = noise_grid(n, seed + 7, blobs=6, low=0.18)
    shades = [shade(base, -0.16), shade(base, -0.06), base, shade(base, 0.09)]
    im = Image.new("RGB", (n, n))
    px = im.load()
    for y in range(n):
        for x in range(n):
            px[x, y] = shades[min(3, int(g[y][x] * 4))]
    seam = shade(base, -0.35)
    for i in range(n):
        px[i, n - 1] = seam
        px[n - 1, i] = seam
        px[i, 0] = shade(base, 0.14)
        px[0, i] = shade(base, 0.10)
    return im


SHAPES = {
    "coal": [(3, 3), (4, 3), (3, 4), (4, 4), (5, 4), (10, 5), (11, 5), (10, 6), (11, 6), (6, 10), (7, 10), (6, 11), (7, 11), (8, 11), (11, 11), (12, 11), (12, 12)],
    "copper": [(3, 4), (4, 3), (5, 4), (4, 5), (10, 3), (11, 4), (10, 5), (9, 4), (5, 10), (6, 11), (7, 10), (6, 9), (11, 10), (12, 11), (11, 12)],
    "iron": [(3, 3), (4, 3), (5, 3), (3, 4), (9, 5), (10, 5), (11, 5), (12, 5), (4, 9), (5, 9), (6, 9), (7, 9), (10, 11), (11, 11), (12, 11)],
    "gem": [(4, 2), (3, 3), (4, 3), (5, 3), (4, 4), (11, 6), (10, 7), (11, 7), (12, 7), (11, 8), (5, 10), (4, 11), (5, 11), (6, 11), (5, 12)],
    "amber": [(4, 3), (5, 3), (3, 4), (4, 4), (5, 4), (6, 4), (4, 5), (5, 5), (10, 8), (11, 8), (9, 9), (10, 9), (11, 9), (12, 9), (10, 10), (11, 10), (10, 11), (11, 11)],
}


def clean(rock, ore, seed):
    im = clean_base(rock, seed)
    if ore:
        fill, light = (hexrgb(c) for c in ORES[ore])
        px = im.load()
        cells = set(SHAPES[ore])
        dark = shade(fill, -0.55)
        for x, y in cells:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q = (x + dx, y + dy)
                if q not in cells and 0 < q[0] < 15 and 0 < q[1] < 15:
                    px[q] = dark
        for x, y in cells:
            px[x, y] = light if ((x + 1, y) not in cells and (x, y - 1) not in cells) or (x, y - 1) not in cells and ore in ("gem", "amber") else fill
    return im


# ---------------------------------------------------------------- style C: smooth cartoon (256 px, painted, raised crystals)
def smooth_base(rock, seed, n=256):
    base = hexrgb(rock)
    r = random.Random(seed)
    im = Image.new("RGB", (n, n), base)
    d = ImageDraw.Draw(im)
    for _ in range(9):
        x, y, s = r.uniform(0, n), r.uniform(0, n), r.uniform(30, 70)
        d.ellipse((x - s, y - s * 0.7, x + s, y + s * 0.7), fill=shade(base, r.choice([-0.07, 0.06])))
    im = im.filter(ImageFilter.GaussianBlur(14))
    d = ImageDraw.Draw(im)
    for _ in range(3):
        x, y = r.uniform(40, 200), r.uniform(40, 200)
        pts = [(x, y)]
        for _ in range(3):
            x += r.uniform(-28, 28)
            y += r.uniform(10, 30)
            pts.append((x, y))
        d.line(pts, fill=shade(base, -0.28), width=5, joint="curve")
    # soft rounded bevel
    edge = Image.new("L", (n, n), 0)
    e = ImageDraw.Draw(edge)
    e.rounded_rectangle((10, 10, n - 10, n - 10), radius=34, fill=255)
    edge = edge.filter(ImageFilter.GaussianBlur(10))
    dark = Image.new("RGB", (n, n), shade(base, -0.4))
    im = Image.composite(im, dark, edge)
    hl = Image.new("L", (n, n), 0)
    h = ImageDraw.Draw(hl)
    h.rounded_rectangle((16, 14, n - 40, 46), radius=16, fill=80)
    hl = hl.filter(ImageFilter.GaussianBlur(8))
    im = Image.composite(Image.new("RGB", (n, n), (255, 255, 255)), im, hl)
    return im


def crystal(d, cx, cy, s, fill, light):
    pts = [(cx, cy - s), (cx + s * 0.7, cy - s * 0.3), (cx + s * 0.55, cy + s * 0.7), (cx - s * 0.55, cy + s * 0.7), (cx - s * 0.7, cy - s * 0.3)]
    d.polygon(pts, fill=fill, outline=hexrgb("#1e2140"), width=6)
    d.polygon([(cx, cy - s), (cx + s * 0.7, cy - s * 0.3), (cx, cy + s * 0.1), (cx - s * 0.7, cy - s * 0.3)], fill=light)
    d.polygon([(cx, cy + s * 0.1), (cx + s * 0.55, cy + s * 0.7), (cx + s * 0.7, cy - s * 0.3)], fill=shade(fill, -0.25))
    d.polygon(pts, outline=hexrgb("#1e2140"), width=6)
    d.ellipse((cx - s * 0.35, cy - s * 0.62, cx - s * 0.12, cy - s * 0.42), fill=(255, 255, 255))


def smooth(rock, ore, seed):
    im = smooth_base(rock, seed)
    if ore:
        fill, light = (hexrgb(c) for c in ORES[ore])
        d = ImageDraw.Draw(im)
        spots = [(82, 84, 52), (180, 104, 40), (120, 180, 44)] if ore != "amber" else [(104, 106, 72), (186, 176, 42)]
        for cx, cy, s in spots:
            crystal(d, cx, cy, s, fill, light)
    return im


def crack(im, stage, pixel):
    im = im.copy()
    n = im.width
    d = ImageDraw.Draw(im)
    col = (30, 26, 40)
    k = n / 16
    paths = [[(8, 2), (7, 5), (9, 7), (8, 10)], [(9, 7), (12, 6), (14, 8)], [(8, 10), (5, 12), (4, 14)], [(7, 5), (4, 4), (2, 6)]]
    for p in paths[: stage + 1]:
        pts = [(x * k, y * k) for x, y in p]
        d.line(pts, fill=col, width=max(1, int(k * (1 if pixel else 0.9))))
    return im


STYLES = {"A": candy, "B": clean, "C": smooth}

if __name__ == "__main__":
    for key, fn in STYLES.items():
        for w, rock in ROCK.items():
            fn(rock, None, hash(w) % 999).save(os.path.join(OUT, f"{key}_{w}_rock.png"))
        for i, ore in enumerate(WALL_ORDER):
            fn(ROCK["w1"], ore, 31 + i).save(os.path.join(OUT, f"{key}_w1_{ore}.png"))
        base = fn(ROCK["w1"], "copper", 40)
        crack(base, 2, key != "C").save(os.path.join(OUT, f"{key}_w1_copper_crack.png"))
        floor = {"A": candy_base, "B": clean_base, "C": smooth_base}[key]("#5b4a3e", 5)
        floor.save(os.path.join(OUT, f"{key}_floor.png"))
    print("ok")
