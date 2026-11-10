# Final block textures, worlds 1–3, style A «Конфетный блок» [владелец 10.11: A, мир 1 — галька].
# Run: python3 assets/blocks/make.py
# Writes assets/blocks/px/<id>.png (32×32: stone drawn at 16 px ×2, candy ore at 32 px) and assets/blocks/upload/<id>.png (×4 = 128×128, nearest
# neighbour — Roblox filters textures, so pixels must be pre-scaled), plus crack overlays crack_1..4 (transparent).
import json
import sys
import math
import os
import random

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
PX = os.path.join(HERE, "px")
UP = os.path.join(HERE, "upload")
os.makedirs(PX, exist_ok=True)
os.makedirs(UP, exist_ok=True)
N = 16
INK = (30, 33, 64)
WHITE = (255, 255, 255)


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def shade(c, k):
    # hue-shifted: shadows to cool purple, lights to warm cream
    return mix(c, (40, 30, 78), -k * 1.1) if k < 0 else mix(c, (255, 244, 214), k)


# ---------------------------------------------------------------- stone fills (one pattern per world)
def pebbles(px, base, seed):
    r = random.Random(seed)
    L, D = shade(base, 0.13), shade(base, -0.12)
    stones = [(5, 5, 2.6), (11, 6, 2.2), (6, 11, 2.3), (11, 11, 2.6), (3, 8, 1.3)]
    r.shuffle(stones)
    for cx, cy, rr in stones:
        cx += r.uniform(-0.4, 0.4)
        cy += r.uniform(-0.4, 0.4)
        for y in range(N):
            for x in range(N):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if d < rr:
                    px[x, y] = L if (x + 0.5 - cx + y + 0.5 - cy) < -0.6 else base
                elif d < rr + 0.8:
                    px[x, y] = D


def strata(px, base, seed):
    L, D, DD = shade(base, 0.12), shade(base, -0.10), shade(base, -0.22)
    for y in range(N):
        for x in range(N):
            band = (y + x // 4 + int(1.3 * math.sin((x + seed) * 0.6))) // 3 % 3
            px[x, y] = (L, base, D)[band]
            if (x * 5 + y * 3 + seed) % 29 == 0:
                px[x, y] = DD


def facets(px, base, seed):
    r = random.Random(seed)
    pts = [(r.uniform(0, N), r.uniform(0, N)) for _ in range(6)]
    tones = [shade(base, k) for k in (0.14, 0.05, -0.04, -0.12, 0.09, -0.08)]
    for y in range(N):
        for x in range(N):
            best = sorted(range(6), key=lambda i: math.hypot(x + 0.5 - pts[i][0], y + 0.5 - pts[i][1]))
            d0 = math.hypot(x + 0.5 - pts[best[0]][0], y + 0.5 - pts[best[0]][1])
            d1 = math.hypot(x + 0.5 - pts[best[1]][0], y + 0.5 - pts[best[1]][1])
            px[x, y] = shade(base, -0.18) if d1 - d0 < 0.7 else tones[best[0]]


def frame(px, base):
    out = shade(base, -0.55)
    for i in range(N):
        for (x, y) in ((i, 0), (i, N - 1), (0, i), (N - 1, i)):
            px[x, y] = out
    for i in range(1, N - 1):
        px[i, 1] = shade(base, 0.32)
        px[1, i] = shade(base, 0.24)
        px[i, N - 2] = shade(base, -0.28)
        px[N - 2, i] = shade(base, -0.22)


# ---------------------------------------------------------------- candy ore at 32 px (stone stays 16 px, ×2)
M = 32  # final texture size
LO32, HI32 = 4, 27  # ore incl. its 2-px outline stays inside; the frame is 0..3 / 28..31


def mask(kind, cx, cy, r):
    out = set()
    for y in range(M):
        for x in range(M):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if kind == "round":
                ok = dx * dx + dy * dy <= r * r
            elif kind == "shard":
                ok = abs(dx) / 0.72 + abs(dy) <= r
            elif kind == "hex":
                ok = abs(dy) <= r * 0.87 and abs(dx) * 0.87 + abs(dy) * 0.5 <= r * 0.87
            else:  # oval
                ok = (dx / (r * 1.15)) ** 2 + (dy / (r * 0.82)) ** 2 <= 1
            if ok:
                out.add((x, y))
    return out


def dilate(cells, n):
    for _ in range(n):
        cells = cells | {(x + dx, y + dy) for x, y in cells for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))}
    return cells


def candy_ore(px, kind, cx, cy, r, fill, light, outline, rock=None, seed=0):
    """Ore set INTO the stone: a dark socket around it, a lit lip on the lower-right, a thin outline in the ore's
    own dark tone, stone chips overlapping the edge, and a faint mineral stain on the surrounding stone."""
    rnd = random.Random(seed * 7919 + int(cx * 31 + cy * 17))
    body = mask(kind, cx, cy, r)
    inside = lambda q: LO32 <= q[0] <= HI32 and LO32 <= q[1] <= HI32  # noqa: E731
    socket = dilate(body, 1) - body
    small = r < 2.2  # crumbs: a full dark rim + socket turns them into holes, keep them in the ore's own colour
    lip = dilate(body, 2) - body - socket
    stain = dilate(body, 4) - body - socket - lip
    if rock is not None:
        for q in stain:
            if inside(q):
                px[q] = mix(px[q], fill, 0.14)
        for x, y in lip:
            if inside((x, y)) and (x + 0.5 - cx) + (y + 0.5 - cy) > 0:
                px[x, y] = shade(px[x, y], 0.22)
        for x, y in socket:
            if inside((x, y)):
                upper = (x + 0.5 - cx) + (y + 0.5 - cy) < 0
                k = (-0.55 if upper else -0.32) * (0.55 if small else 1.0)
                px[x, y] = shade(px[x, y], k)
    edge = shade(fill, -0.3 if small else -0.55)
    dark = shade(fill, -0.3)
    rim = {(x, y) for x, y in body if any((x + dx, y + dy) not in body for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))}
    for x, y in body:
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        px[x, y] = edge if (x, y) in rim else (dark if dx + dy > r * 0.7 else fill)
    hx, hy, hr = cx - r * 0.36, cy - r * 0.36, max(0.9, r * 0.32)
    for x, y in body - rim:
        if (x + 0.5 - hx) ** 2 + (y + 0.5 - hy) ** 2 <= hr * hr:
            px[x, y] = light
    sx, sy = round(cx - r * 0.5), round(cy - r * 0.15)
    if (sx, sy) in body - rim and r >= 4:
        px[sx, sy] = WHITE
    # stone chips over the lower-left edge: the gem sits under the surface, not on top of it
    if False:  # stone chips read as "bites" — dropped (owner check 10.11)
        for _ in range(rnd.choice((1, 2))):
            a = rnd.uniform(1.9, 3.0)  # angle around the lower-left
            ex, ey = cx + math.cos(a) * r * 0.95, cy + math.sin(a) * r * 0.95
            cr = rnd.uniform(1.2, 1.9)
            for y in range(int(ey - 3), int(ey + 4)):
                for x in range(int(ex - 3), int(ex + 4)):
                    d = math.hypot(x + 0.5 - ex, y + 0.5 - ey)
                    if d < cr and inside((x, y)):
                        px[x, y] = shade(rock, 0.12 if (x + 0.5 - ex) + (y + 0.5 - ey) < 0 else -0.1)
                    elif d < cr + 0.8 and inside((x, y)) and (x, y) in body:
                        px[x, y] = shade(rock, -0.45)


LAYOUT = {  # bigger = rarer; extras stand apart with a clear gap (owner 10.11: no clusters, no equal sizes)
    "common": [(15.5, 15.5, 6.0)],
    "rare": [(13, 13, 5.4), (22, 21.5, 3.2)],
    "gem": [(13.5, 13.5, 6.6), (22.5, 22.5, 2.6)],
    "treasure": [(15.5, 15.5, 8.3)],
}


def frame32(px, base):
    out = shade(base, -0.55)
    for i in range(M):
        for k in (0, 1):
            for q in ((i, k), (i, M - 1 - k), (k, i), (M - 1 - k, i)):
                px[q] = out
    for i in range(2, M - 2):
        for k in (2, 3):
            px[i, k] = shade(base, 0.32)
            px[k, i] = shade(base, 0.24)
            px[i, M - 1 - k] = shade(base, -0.28)
            px[M - 1 - k, i] = shade(base, -0.22)


def scale2x(im):
    """EPX / Scale2x: doubles pixel art and rounds its corners (stone matches the 32-px ore)."""
    w, h = im.size
    src = im.load()
    out = Image.new("RGB", (w * 2, h * 2))
    o = out.load()
    for y in range(h):
        for x in range(w):
            p = src[x, y]
            a = src[x, (y - 1) % h]
            b = src[(x + 1) % w, y]
            c = src[(x - 1) % w, y]
            d = src[x, (y + 1) % h]
            o[2 * x, 2 * y] = a if c == a and c != d and a != b else p
            o[2 * x + 1, 2 * y] = b if a == b and a != c and b != d else p
            o[2 * x, 2 * y + 1] = c if d == c and d != b and c != a else p
            o[2 * x + 1, 2 * y + 1] = d if b == d and b != a and d != c else p
    return out


def compose(fill_fn, rock_hex, ore=None, seed=3, stone_post=None):
    """fill_fn draws the 16-px stone; ore = (shape, rarity, fill_hex, light_hex) or None."""
    base = hexrgb(rock_hex)
    im = Image.new("RGB", (N, N), base)
    fill_fn(im.load(), base, seed)
    im = scale2x(im)
    px = im.load()
    frame32(px, base)
    if stone_post:
        im = stone_post(im)
        px = im.load()
    if ore:
        shape, rarity, f, li = ore[:4]
        layout = ore[4] if len(ore) > 4 and ore[4] else [(shape, *spot) for spot in LAYOUT[rarity]]
        f, li = hexrgb(f), hexrgb(li)
        outline = INK if sum(f) > 200 else (13, 13, 20)
        jr = random.Random(seed)
        for sh, cx, cy, r in layout:
            candy_ore(px, sh, cx + jr.uniform(-1, 1), cy + jr.uniform(-1, 1), r, f, li, outline, rock=base, seed=seed)
        if rarity == "treasure":
            for x, y in ((25, 6), (6, 25), (25, 25)):
                px[x, y] = WHITE
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    px[x + dx, y + dy] = shade(f, 0.5)
    return im


from worlds import WORLDS  # noqa: E402


def save(im, name):
    im.save(os.path.join(PX, f"{name}.png"))
    im.resize((im.width * 4, im.height * 4), Image.NEAREST).save(os.path.join(UP, f"{name}.png"))


def crack_overlays():
    paths = [[(8, 2), (7, 5), (9, 7), (8, 10)], [(9, 7), (12, 6), (14, 9)], [(8, 10), (5, 12), (3, 14)],
             [(7, 5), (4, 4), (2, 6)], [(8, 10), (11, 13), (12, 14)], [(5, 12), (4, 9)]]
    stages = [1, 2, 4, 6]
    for i, k in enumerate(stages, 1):
        im = Image.new("RGBA", (N, N), (0, 0, 0, 0))
        px = im.load()
        for p in paths[:k]:
            for (x0, y0), (x1, y1) in zip(p, p[1:]):
                steps = max(abs(x1 - x0), abs(y1 - y0))
                for t in range(steps + 1):
                    x = round(x0 + (x1 - x0) * t / steps)
                    y = round(y0 + (y1 - y0) * t / steps)
                    px[x, y] = (*INK, 235)
                    if x + 1 < N and px[x + 1, y][3] == 0:
                        px[x + 1, y] = (255, 255, 255, 90)
        save(im, f"crack_{i}")


def misc():
    r = random.Random(3)
    planks = Image.new("RGB", (N, N))
    p = planks.load()
    wood = hexrgb("#b07a45")
    for y in range(N):
        for x in range(N):
            row = y // 4
            c = shade(wood, (-0.08, 0.04, -0.02, 0.07)[row] + r.uniform(-0.04, 0.04))
            if y % 4 == 3:
                c = shade(wood, -0.5)
            if x == (5 + row * 7) % N:
                c = shade(wood, -0.35)
            p[x, y] = c
    save(planks, "planks")
    beam = Image.new("RGB", (N, N))
    b = beam.load()
    dark = hexrgb("#7a4f2a")
    for y in range(N):
        for x in range(N):
            b[x, y] = shade(dark, 0.06 if (x + y // 5) % 5 else -0.12)
    for i in range(N):
        b[i, 0] = b[0, i] = shade(dark, 0.25)
        b[i, N - 1] = b[N - 1, i] = shade(dark, -0.45)
    save(beam, "beam")


if __name__ == "__main__":
    manifest = {"_note": "[решение Claude 10.11] стиль A, мир 1 — галька [владелец]; генератор assets/blocks/make.py",
                "worlds": []}
    for wi, world in enumerate(WORLDS, 1):
        rock_id, rock_hex = world["rock"]
        im = compose(world["fill"], rock_hex)
        save(im, rock_id)
        entry = {"world": wi, "id": world["id"], "rock": rock_id, "ores": [], "lining": f"{rock_id}_lining",
                 "light": world["light"], "env": world["env"]}
        k = world["lining"]
        save(Image.eval(im, lambda v: int(v * k)), f"{rock_id}_lining")
        for oi, (ore, rarity, shape, fill, light, layout) in enumerate(world["ores"]):
            im = compose(world["fill"], rock_hex, (shape, rarity, fill, light, layout), 11 + oi)
            name = ore if wi == 1 or ore != "copper" else "copper_w2"
            save(im, name)
            entry["ores"].append({"id": ore, "texture": name, "rarity": rarity, "glow": rarity == "treasure"})
        manifest["worlds"].append(entry)
    crack_overlays()
    misc()
    json.dump(manifest, open(os.path.join(HERE, "manifest.json"), "w"), ensure_ascii=False, indent=1)
    print("ok", len(os.listdir(PX)))
