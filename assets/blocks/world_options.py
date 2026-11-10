# Stone options for worlds 2 and 3 (owner 10.11: «не нравится 2 и 3 этаж»). Writes a preview sheet.
# Run: python3 assets/blocks/world_options.py <out.png>
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw  # noqa: E402

import make  # noqa: E402
from make import N, hexrgb, pebbles, shade  # noqa: E402


def boulders(px, base, seed):
    L, D = shade(base, 0.14), shade(base, -0.16)
    for cx, cy, rr in ((5.5, 5.5, 4.2), (11.5, 11, 3.6), (12, 4, 2.2), (4, 12.5, 2.4)):
        for y in range(N):
            for x in range(N):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                if d < rr:
                    px[x, y] = L if (x + 0.5 - cx) + (y + 0.5 - cy) < -rr * 0.5 else base
                elif d < rr + 0.9 and px[x, y] == base:
                    px[x, y] = D


def bricks(px, base, seed):
    L, D = shade(base, 0.10), shade(base, -0.20)
    for y in range(N):
        for x in range(N):
            row = y // 5
            off = 4 if row % 2 else 0
            if y % 5 == 4 or (x + off) % 8 == 7:
                px[x, y] = D
            elif y % 5 == 0 or (x + off) % 8 == 0:
                px[x, y] = L


def veins(px, base, seed, vein="#ffb070"):
    v = hexrgb(vein)
    for path in (((2, 5), (6, 7), (9, 6), (14, 9)), ((4, 14), (7, 11), (11, 12), (13, 15))):
        for (x0, y0), (x1, y1) in zip(path, path[1:]):
            steps = max(abs(x1 - x0), abs(y1 - y0))
            for t in range(steps + 1):
                x = round(x0 + (x1 - x0) * t / steps)
                y = round(y0 + (y1 - y0) * t / steps)
                if 0 <= x < N and 0 <= y < N:
                    px[x, y] = v
                    if y + 1 < N:
                        px[x, y + 1] = shade(base, -0.18)


def sandstone(px, base, seed):
    tones = [shade(base, 0.10), base, shade(base, 0.04), shade(base, -0.08)]
    for y in range(N):
        for x in range(N):
            px[x, y] = tones[(y // 3 + (1 if x > 10 and y % 6 == 2 else 0)) % 4]


def pores(px, base, seed):
    r = random.Random(seed)
    for _ in range(9):
        x, y = r.randrange(3, 13), r.randrange(3, 13)
        px[x, y] = shade(base, -0.32)
        px[x + 1, y] = shade(base, -0.18)
        px[x, y - 1] = shade(base, 0.14)


def shine(px, base, seed):
    for y in range(N):
        for x in range(N):
            t = x + y
            if 9 <= t <= 11:
                px[x, y] = shade(base, 0.35)
            elif t == 13:
                px[x, y] = shade(base, 0.22)
            elif t > 20:
                px[x, y] = shade(base, -0.06)


def marble(px, base, seed, vein="#8f86b8"):
    veins(px, base, seed, vein)


def sparkle(px, base, seed):
    r = random.Random(seed)
    for _ in range(10):
        x, y = r.randrange(3, 13), r.randrange(3, 13)
        px[x, y] = (255, 255, 255)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if r.random() < 0.5:
                px[x + dx, y + dy] = shade(base, 0.25)


def points(px, base, seed):
    for x0, y0 in ((4, 5), (10, 3), (11, 10), (5, 11)):
        for k in range(3):
            px[x0, y0 + k] = shade(base, 0.3 - k * 0.15)
            px[x0 + 1, y0 + k + 1] = shade(base, -0.2)


OPTIONS = {
    2: ("#cf7a4e", "malachite", "gem", "oval", "#25b36f", "#9bf0bf",
        [("а", "крупные валуны", boulders), ("б", "грубая кладка", bricks), ("в", "медные прожилки", veins),
         ("г", "рыжая галька", pebbles), ("д", "песчаник полосами", sandstone), ("е", "пористый камень", pores)]),
    3: ("#ddd6ea", "rose_quartz", "gem", "hex", "#ff8fc0", "#ffe0ee",
        [("а", "лёд с бликом", shine), ("б", "кварцевые кирпичи", bricks), ("в", "мрамор с прожилками", marble),
         ("г", "светлая галька", pebbles), ("д", "искры", sparkle), ("е", "острые грани", points)]),
}

COLORS = {2: ["#cf7a4e", "#c96a5a", "#d99a4e"], 3: ["#ddd6ea", "#cfe3f2", "#e8dccb"]}


def tile(fn, rock, ore=None, seed=3):
    return make.compose(fn, rock, (ore[2], ore[1], ore[3], ore[4]) if ore else None, seed)


if __name__ == "__main__":
    out = sys.argv[1]
    T = 44
    wall_w = 4 * T
    sheet = Image.new("RGB", (6 * (wall_w + 14) + 14, 2 * (3 * T + 40) + 20), (22, 20, 32))
    d = ImageDraw.Draw(sheet)
    for row, w in enumerate((2, 3)):
        rock, oid, rarity, shape, fill, light, opts = OPTIONS[w]
        for c, (letter, name, fn) in enumerate(opts):
            x0 = 14 + c * (wall_w + 14)
            y0 = 14 + row * (3 * T + 40)
            d.text((x0, y0), f"Мир {w}{letter}: {name}", fill=(240, 236, 255))
            for j in range(4):
                for i in range(3):
                    ore = (oid, rarity, shape, fill, light) if (j, i) in ((1, 1), (3, 0)) else None
                    im = tile(fn, rock, ore, seed=3 + i * 4 + j).resize((T, T), Image.NEAREST)
                    sheet.paste(im, (x0 + j * T, y0 + 16 + i * T))
    sheet.save(out)
    print("ok")
