# Variants of the stone fill inside block A (owner 10.11: "фон блоков"). Frame and ore stay as in A.
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image  # noqa: E402

from tex import GEM_SPOTS, ORES, OUT, ROCK, WALL_ORDER, candy_gem, crack, hexrgb, shade  # noqa: E402

N = 16


def frame(im, base):
    px = im.load()
    out = shade(base, -0.55)
    for i in range(N):
        for (x, y) in ((i, 0), (i, N - 1), (0, i), (N - 1, i)):
            px[x, y] = out
    for i in range(1, N - 1):
        px[i, 1] = shade(base, 0.32)
        px[1, i] = shade(base, 0.24)
        px[i, N - 2] = shade(base, -0.28)
        px[N - 2, i] = shade(base, -0.22)
    return im


def fill(kind, base, seed):
    r = random.Random(seed)
    im = Image.new("RGB", (N, N), base)
    px = im.load()
    L, D, DD = shade(base, 0.12), shade(base, -0.10), shade(base, -0.22)
    if kind == "smooth":
        for y in range(N):
            for x in range(N):
                if (x * 7 + y * 3 + seed) % 23 == 0:
                    px[x, y] = L
    elif kind == "pebbles":
        for cx, cy, rr in ((5, 5, 2.6), (11, 6, 2.2), (6, 11, 2.3), (11, 11, 2.6), (3, 8, 1.3)):
            for y in range(N):
                for x in range(N):
                    d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                    if d < rr:
                        px[x, y] = L if (x + 0.5 - cx + y + 0.5 - cy) < -0.6 else base
                    elif d < rr + 0.8:
                        px[x, y] = D
    elif kind == "tiles":
        for y in range(N):
            for x in range(N):
                if x in (8,) or y in (8,):
                    px[x, y] = D
                elif (x in (2, 9) and 2 <= y) or (y in (2, 9) and 2 <= x):
                    px[x, y] = L
    elif kind == "speckles":
        for _ in range(26):
            x, y = r.randrange(2, 14), r.randrange(2, 14)
            px[x, y] = r.choice((L, D, DD))
    elif kind == "strata":
        for y in range(N):
            band = (y + int(1.5 * math.sin(y * 0.7))) // 3 % 3
            c = (L, base, D)[band]
            for x in range(N):
                px[x, y] = c if (x + y) % 9 else DD
    elif kind == "gradient":
        for y in range(N):
            t = y / (N - 1)
            c = shade(base, 0.14 - 0.30 * t)
            for x in range(N):
                px[x, y] = c
    elif kind == "cracks":
        for path in (((3, 4), (5, 6), (5, 8), (7, 9)), ((11, 3), (10, 5), (12, 7)), ((9, 12), (11, 11), (13, 12))):
            for (x0, y0), (x1, y1) in zip(path, path[1:]):
                steps = max(abs(x1 - x0), abs(y1 - y0))
                for k in range(steps + 1):
                    x = round(x0 + (x1 - x0) * k / steps)
                    y = round(y0 + (y1 - y0) * k / steps)
                    px[x, y] = DD
                    if x + 1 < N:
                        px[x + 1, y] = L
    elif kind == "checker":
        for y in range(N):
            for x in range(N):
                px[x, y] = base if ((x // 4) + (y // 4)) % 2 else shade(base, 0.06)
    return frame(im, base)


KINDS = {"F1": "smooth", "F2": "pebbles", "F3": "tiles", "F4": "speckles", "F5": "strata", "F6": "gradient", "F7": "cracks", "F8": "checker"}


def block(kind, rock, ore, seed):
    im = fill(kind, hexrgb(rock), seed)
    if ore:
        f, li = (hexrgb(c) for c in ORES[ore])
        px = im.load()
        for x0, y0, s in GEM_SPOTS if ore != "amber" else [(3, 3, 7), (10, 9, 5), (11, 3, 3)]:
            candy_gem(px, x0, y0, s, f, (255, 255, 255), hexrgb("#1e2140") if ore != "coal" else hexrgb("#0d0d14"))
    return im


if __name__ == "__main__":
    for key, kind in KINDS.items():
        for w, rock in ROCK.items():
            block(kind, rock, None, 3).save(os.path.join(OUT, f"{key}_{w}_rock.png"))
        for i, ore in enumerate(WALL_ORDER):
            block(kind, ROCK["w1"], ore, 31 + i).save(os.path.join(OUT, f"{key}_w1_{ore}.png"))
        crack(block(kind, ROCK["w1"], "copper", 40), 2, True).save(os.path.join(OUT, f"{key}_w1_copper_crack.png"))
    print("ok")
