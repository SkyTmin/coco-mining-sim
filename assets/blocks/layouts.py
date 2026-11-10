# Ore layout systems (owner 10.11: stones too big, singles meh) and rare block variants (wiki 18 §8:
# golden 1/250, rainbow 1/10 000, cosmic 1/500 000 hits). Smaller pieces, several per block, never touching.
import colorsys
import math
import random

from PIL import Image

import make

LO, HI = 4.5, 27.5  # piece centre ± radius + 2 (socket/lip) must stay inside


def _fits(c, r, placed, gap):
    if c[0] - r - 2 < LO - 1 or c[0] + r + 2 > HI + 1 or c[1] - r - 2 < LO - 1 or c[1] + r + 2 > HI + 1:
        return False
    return all(math.hypot(c[0] - p[0], c[1] - p[1]) > r + p[2] + 2.0 + gap for p in placed)


def scatter(radii, seed, gap=0.6, along=None):
    rnd = random.Random(seed)
    placed = []
    for r in radii:
        for _ in range(3000):
            if along:  # a vein from top-left to bottom-right
                t = rnd.uniform(0, 1)
                c = (7 + t * 18 + rnd.uniform(-4, 4), 7 + t * 18 + rnd.uniform(-4, 4))
            else:
                c = (rnd.uniform(LO, HI), rnd.uniform(LO, HI))
            if _fits(c, r, placed, gap):
                placed.append((c[0], c[1], r))
                break
    return placed


SYSTEMS = {
    "А · россыпь": {"common": (3.2, 2.2), "rare": (3.6, 2.6, 2.0), "gem": (4.0, 3.0, 2.4, 1.8),
                    "treasure": (4.4, 3.2, 2.4, 2.0, 1.6)},
    "Б · жила наискосок": {"common": (3.2, 2.4, 1.8), "rare": (3.6, 2.8, 2.2, 1.8), "gem": (4.0, 3.0, 2.4, 2.0, 1.6),
                           "treasure": (4.2, 3.2, 2.6, 2.0, 1.6), "_along": True},
    "В · пара": {"common": (3.0, 2.0), "rare": (3.6, 2.4), "gem": (4.2, 2.8), "treasure": (5.0, 3.2)},
    "Г · крупинки": {"common": (2.4, 2.0, 1.8, 1.6), "rare": (2.8, 2.2, 2.0, 1.8, 1.6),
                     "gem": (3.0, 2.6, 2.2, 2.0, 1.8, 1.6), "treasure": (3.4, 3.0, 2.6, 2.2, 2.0, 1.8, 1.6)},
    "Д · средний и крошки": {"common": (3.6, 1.6, 1.4), "rare": (4.0, 2.0, 1.6, 1.4), "gem": (4.4, 2.4, 1.8, 1.6, 1.4),
                             "treasure": (5.0, 2.6, 2.0, 1.8, 1.6, 1.4)},
}


def block(fill, rock_hex, shape, rarity, f, li, system, seed=11, kind=None):
    spec = SYSTEMS[system]
    for attempt in range(400):  # greedy packing: retry with another seed until every piece fits
        pieces = scatter(spec[rarity], seed * 1000 + attempt, along=spec.get("_along"))
        if len(pieces) == len(spec[rarity]):
            break
    assert len(pieces) == len(spec[rarity]), (system, rarity, len(pieces))
    layout = [(shape, cx, cy, r) for cx, cy, r in pieces]
    post = (lambda im: variant(im, kind)) if kind else None
    return make.compose(fill, rock_hex, (shape, rarity, f, li, layout), seed, stone_post=post)


# ---------------------------------------------------------------- rare variants of any block
def _lum(c):
    return (0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]) / 255


def _ramp(stops, t):
    t = max(0.0, min(1.0, t))
    for i in range(len(stops) - 1):
        a, b = stops[i], stops[i + 1]
        if t <= b[0]:
            k = (t - a[0]) / (b[0] - a[0])
            return tuple(round(a[1][j] + (b[1][j] - a[1][j]) * k) for j in range(3))
    return stops[-1][1]


GOLD = [(0.0, (92, 46, 8)), (0.35, (196, 120, 18)), (0.65, (255, 204, 64)), (1.0, (255, 248, 200))]
COSMOS = [(0.0, (10, 8, 30)), (0.4, (34, 24, 84)), (0.7, (70, 50, 150)), (1.0, (150, 130, 255))]


def variant(full, kind, seed=5):
    """Recolour a stone-only image (ore is drawn afterwards, so it stays as it is)."""
    out = full.copy()
    o, a = out.load(), full.load()
    b = a
    rnd = random.Random(seed)
    W = full.width
    for y in range(W):
        for x in range(W):
            if a[x, y] != b[x, y]:
                continue
            L = _lum(a[x, y])
            if kind == "golden":
                o[x, y] = _ramp(GOLD, L * 1.05 + 0.08)
            elif kind == "rainbow":
                h = ((x + y) / (2 * W) + 0.02) % 1.0
                rc = tuple(round(v * 255) for v in colorsys.hsv_to_rgb(h, 0.55, 1.0))
                o[x, y] = make.mix(rc, (40, 30, 78), max(0.0, 0.62 - L) * 0.9)
            elif kind == "cosmic":
                o[x, y] = _ramp(COSMOS, L * 0.75)
    if kind == "cosmic":  # nebula + stars on the stone only
        for cx, cy, rr, col in ((10, 22, 7, (255, 80, 200)), (23, 10, 6, (60, 220, 255))):
            for y in range(W):
                for x in range(W):
                    if a[x, y] == b[x, y] and 4 <= x < W - 4 and 4 <= y < W - 4:
                        d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                        if d < rr:
                            o[x, y] = make.mix(o[x, y], col, 0.35 * (1 - d / rr))
        for _ in range(14):
            x, y = rnd.randrange(5, W - 5), rnd.randrange(5, W - 5)
            if a[x, y] == b[x, y]:
                o[x, y] = (255, 255, 255)
        for x, y in ((8, 9), (24, 23)):
            for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                o[x + dx, y + dy] = (255, 255, 255) if (dx, dy) == (0, 0) else (190, 180, 255)
    if kind == "golden":
        for x, y in ((7, 8), (24, 7), (9, 24)):
            if a[x, y] == b[x, y]:
                o[x, y] = (255, 255, 255)
    return out
