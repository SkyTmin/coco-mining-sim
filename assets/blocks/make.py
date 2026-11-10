# Final block textures, worlds 1–3, style A «Конфетный блок» [владелец 10.11: A, мир 1 — галька].
# Run: python3 assets/blocks/make.py
# Writes assets/blocks/px/<id>.png (32×32: stone drawn at 16 px ×2, candy ore at 32 px) and assets/blocks/upload/<id>.png (×4 = 128×128, nearest
# neighbour — Roblox filters textures, so pixels must be pre-scaled), plus crack overlays crack_1..4 (transparent).
import json
import math
import os
import random

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
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
LO32, HI32 = 5, 26  # ore incl. its 2-px outline stays inside; the frame is 0..3 / 28..31


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


def candy_ore(px, kind, cx, cy, r, fill, light, outline):
    body = mask(kind, cx, cy, r)
    ring = dilate(body, 2) - body
    inside = lambda q: LO32 <= q[0] <= HI32 and LO32 <= q[1] <= HI32  # noqa: E731
    shadow = {(x + 2, y + 2) for x, y in body | ring} - body - ring
    for q in shadow:
        if inside(q):
            px[q] = shade(px[q], -0.25)
    for q in ring:
        if inside(q):
            px[q] = outline
    dark = shade(fill, -0.3)
    for x, y in body:
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        px[x, y] = dark if dx + dy > r * 0.75 else fill
    hx, hy, hr = cx - r * 0.38, cy - r * 0.38, max(0.9, r * 0.3)
    for x, y in body:
        if (x + 0.5 - hx) ** 2 + (y + 0.5 - hy) ** 2 <= hr * hr:
            px[x, y] = light
    sx, sy = round(cx - r * 0.55), round(cy - r * 0.05)
    if (sx, sy) in body and r >= 4:
        px[sx, sy] = WHITE


LAYOUT = {  # one big stone + smaller ones, spread apart with a clear gap (owner 10.11: no clusters, no equal sizes)
    "common": [(12, 12, 4.4), (21.5, 21, 2.8)],
    "rare": [(12, 13, 4.2), (22.5, 9.5, 2.2), (21, 22, 2.8)],
    "gem": [(13, 13, 5.6), (22.5, 22, 2.4)],
    "treasure": [(15, 15, 7.2)],
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


def compose(fill_fn, rock_hex, ore=None, seed=3):
    """fill_fn draws the 16-px stone; ore = (shape, rarity, fill_hex, light_hex) or None."""
    base = hexrgb(rock_hex)
    im = Image.new("RGB", (N, N), base)
    fill_fn(im.load(), base, seed)
    im = im.resize((M, M), Image.NEAREST)
    px = im.load()
    frame32(px, base)
    if ore:
        shape, rarity, f, li = ore
        f, li = hexrgb(f), hexrgb(li)
        outline = INK if sum(f) > 200 else (13, 13, 20)
        for cx, cy, r in LAYOUT[rarity]:
            candy_ore(px, shape, cx, cy, r, f, li, outline)
        if rarity == "treasure":
            for x, y in ((24, 8), (8, 24), (24, 22)):
                px[x, y] = WHITE
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    px[x + dx, y + dy] = shade(f, 0.5)
    return im


WORLDS = [
    {"fill": pebbles, "rock": ("pebble", "#a7a2b4"),
     "ores": [("flint", "common", "shard", "#5d6a8a", "#a9b8de"),
              ("coal", "rare", "round", "#3a3a48", "#8a8aa6"),
              ("copper", "gem", "round", "#e2803e", "#ffc08a"),
              ("firefly_amber", "treasure", "round", "#ffb21f", "#fff1a0")]},
    {"fill": strata, "rock": ("red_stone", "#cf7a4e"),
     "ores": [("copper", "common", "round", "#e2803e", "#ffc08a"),
              ("tin", "rare", "oval", "#dfe4ee", "#ffffff"),
              ("malachite", "gem", "oval", "#25b36f", "#9bf0bf"),
              ("turquoise", "treasure", "hex", "#3fd6c8", "#c8fff6")]},
    {"fill": facets, "rock": ("white_stone", "#ddd6ea"),
     "ores": [("quartz", "common", "shard", "#f4f1ff", "#ffffff"),
              ("iron", "rare", "oval", "#d9a27a", "#ffe2c6"),
              ("rose_quartz", "gem", "hex", "#ff8fc0", "#ffe0ee"),
              ("amethyst", "treasure", "hex", "#a35cf0", "#e8cfff")]},
]


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
        entry = {"world": wi, "rock": rock_id, "ores": [], "lining": f"{rock_id}_lining"}
        save(Image.eval(im, lambda v: int(v * 0.62)), f"{rock_id}_lining")
        for oi, (ore, rarity, shape, fill, light) in enumerate(world["ores"]):
            im = compose(world["fill"], rock_hex, (shape, rarity, fill, light), 11 + oi)
            name = ore if wi == 1 or ore != "copper" else "copper_w2"
            save(im, name)
            entry["ores"].append({"id": ore, "texture": name, "rarity": rarity, "glow": rarity == "treasure"})
        manifest["worlds"].append(entry)
    crack_overlays()
    misc()
    json.dump(manifest, open(os.path.join(HERE, "manifest.json"), "w"), ensure_ascii=False, indent=1)
    print("ok", len(os.listdir(PX)))
