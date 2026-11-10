# Organic stone fills at 32 px for worlds 2+ (owner 10.11: galka liked; bricks, lines, dots, strokes blacklisted).
# Every stone is a rounded blob with its own tone, a light rim top-left and a shadow rim bottom-right.
import math
import random

from PIL import Image

M = 32


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def shade(c, k):
    return mix(c, (40, 30, 78), -k * 1.1) if k < 0 else mix(c, (255, 244, 214), k)


def hue(c, toward, t):
    return mix(c, hexrgb(toward), t)


def wrap(d):
    return d - M * round(d / M)


def seeds_jitter(n, seed, minsep):
    r = random.Random(seed)
    pts = []
    tries = 0
    while len(pts) < n and tries < 4000:
        tries += 1
        p = (r.uniform(0, M), r.uniform(0, M))
        if all(math.hypot(wrap(p[0] - q[0]), wrap(p[1] - q[1])) >= minsep for q in pts):
            pts.append(p)
    return pts


def cobbles(base, seed, n=6, gap=1.6, tones=(-0.06, 0.0, 0.07, -0.03), tints=None, sparkle=0, rim=0.22):
    """Voronoi stones (seamless): each pixel goes to its nearest seed; near the edge = mortar of darker stone."""
    r = random.Random(seed + 101)
    pts = seeds_jitter(n, seed, M / math.sqrt(n) * 0.8)
    colour = []
    for i in range(len(pts)):
        c = shade(base, r.choice(tones))
        if tints:
            c = hue(c, r.choice(tints), r.uniform(0.0, 0.22))
        colour.append(c)
    im = Image.new("RGB", (M, M))
    px = im.load()
    mortar = shade(base, -0.42)
    for y in range(M):
        for x in range(M):
            ds = sorted(
                (math.hypot(wrap(x + 0.5 - p[0]), wrap(y + 0.5 - p[1])), i) for i, p in enumerate(pts)
            )
            (d0, i0), (d1, _) = ds[0], ds[1]
            edge = (d1 - d0) / 2
            if edge < gap:
                px[x, y] = mortar
                continue
            c = colour[i0]
            dx, dy = wrap(x + 0.5 - pts[i0][0]), wrap(y + 0.5 - pts[i0][1])
            if edge < gap + 1.4:
                c = shade(c, rim) if dx + dy < 0 else shade(c, -rim)
            elif dx + dy < -d1 * 0.55:
                c = shade(c, rim * 0.45)
            px[x, y] = c
    if sparkle:
        for _ in range(sparkle):
            x, y = r.randrange(M), r.randrange(M)
            if px[x, y] != mortar:
                px[x, y] = (255, 255, 255)
    return im


def pebbles32(base, seed, matrix_k=-0.18, sizes=(5.5, 4.5, 3.5, 3.0, 2.5), tints=None, shine=False, n=9):
    """Round pebbles of mixed sizes on a darker sandy matrix (seamless placement)."""
    r = random.Random(seed)
    matrix = shade(base, matrix_k)
    im = Image.new("RGB", (M, M), matrix)
    px = im.load()
    # soft matrix grain: large blobs only, no single-pixel dots
    for _ in range(5):
        cx, cy, rr = r.uniform(0, M), r.uniform(0, M), r.uniform(4, 7)
        for y in range(M):
            for x in range(M):
                if math.hypot(wrap(x + 0.5 - cx), wrap(y + 0.5 - cy)) < rr:
                    px[x, y] = shade(matrix, 0.05)
    placed = []
    order = list(sizes) * 3
    for rr in order:
        if len(placed) >= n:
            break
        for _ in range(200):
            cx, cy = r.uniform(0, M), r.uniform(0, M)
            if all(math.hypot(wrap(cx - p[0]), wrap(cy - p[1])) > rr + p[2] + 1.6 for p in placed):
                placed.append((cx, cy, rr))
                break
    for cx, cy, rr in placed:
        c = shade(base, r.choice((-0.04, 0.03, 0.08)))
        if tints:
            c = hue(c, r.choice(tints), r.uniform(0.08, 0.3))
        sx = r.uniform(0.85, 1.2)
        for y in range(M):
            for x in range(M):
                dx, dy = wrap(x + 0.5 - cx), wrap(y + 0.5 - cy)
                d = math.hypot(dx / sx, dy)
                if d < rr:
                    v = c
                    if d > rr - 1.2:
                        v = shade(c, 0.2) if dx + dy < 0 else shade(c, -0.26)
                    elif shine and math.hypot(dx / sx + rr * 0.35, dy + rr * 0.35) < rr * 0.28:
                        v = shade(c, 0.55)
                    px[x, y] = v
                elif d < rr + 0.9:
                    px[x, y] = shade(matrix, -0.25)
    return im


def clouds(base, seed):
    """Soft cloudy stone: three tones in big rounded blobs, outlined softly."""
    r = random.Random(seed)
    im = Image.new("RGB", (M, M), shade(base, -0.05))
    px = im.load()
    for k, rr_rng in ((0.07, (6, 9)), (0.15, (3.5, 5.5)), (-0.12, (3, 5))):
        for _ in range(3):
            cx, cy, rr = r.uniform(0, M), r.uniform(0, M), r.uniform(*rr_rng)
            for y in range(M):
                for x in range(M):
                    if math.hypot(wrap(x + 0.5 - cx), wrap(y + 0.5 - cy) * 1.2) < rr:
                        px[x, y] = shade(base, k)
    return im


def druse(base, seed):
    """Big cobbles with tiny bright crystal points sitting in the gaps."""
    im = cobbles(base, seed, n=5, gap=1.8, tones=(-0.04, 0.03, 0.08))
    px = im.load()
    mortar = shade(base, -0.42)
    r = random.Random(seed + 7)
    pts = [(x, y) for y in range(1, M - 1) for x in range(1, M - 1) if px[x, y] == mortar]
    r.shuffle(pts)
    used = []
    for x, y in pts:
        if len(used) >= 6:
            break
        if all(abs(x - u[0]) + abs(y - u[1]) > 8 for u in used):
            used.append((x, y))
            px[x, y] = (255, 255, 255)
            px[x, y - 1] = shade(base, 0.6)
            px[x + 1, y] = shade(base, 0.35)
    return im


WORLD2 = "#cf7a4e"
WORLD3 = "#ddd6ea"
OPTIONS = {
    2: [
        ("а", "крупный булыжник", lambda b, s: cobbles(b, s, n=6)),
        ("б", "мелкий щебень", lambda b, s: cobbles(b, s, n=14, gap=1.1, rim=0.18)),
        ("в", "булыжник с медным налётом", lambda b, s: cobbles(b, s, n=7, tints=("#3fae7c", "#e9a36a", "#b5523a"))),
        ("г", "рыжая галька разных оттенков", lambda b, s: pebbles32(b, s, tints=("#e0a060", "#b8503c", "#d98a5a"))),
        ("д", "окатанные валуны", lambda b, s: pebbles32(b, s, sizes=(8.0, 6.0, 3.0, 2.5), n=5)),
        ("е", "облачный камень", lambda b, s: clouds(b, s)),
    ],
    3: [
        ("а", "ледяная галька с бликом", lambda b, s: pebbles32(b, s, shine=True, tints=("#bcd6ff", "#e6d2ff"))),
        ("б", "светлый булыжник", lambda b, s: cobbles(b, s, n=6, tints=("#c9d8ff", "#f0dcff"))),
        ("в", "кварцевые зёрна с искрой", lambda b, s: cobbles(b, s, n=13, gap=1.1, sparkle=4, rim=0.16)),
        ("г", "перламутровая галька", lambda b, s: pebbles32(b, s, shine=True, tints=("#ffc6e6", "#bfe8ff", "#d9c8ff"))),
        ("д", "друза: камни и искры в щелях", lambda b, s: druse(b, s)),
        ("е", "облачный камень", lambda b, s: clouds(b, s)),
    ],
}


def packed(base, seed, sizes=(7.0, 5.5, 4.5, 3.5), fill_to=3.0, gap=0.9, matrix_k=-0.14, rim=0.16,
           tones=(-0.05, 0.0, 0.05), tints=None, tint_amt=(0.06, 0.24), shine=False, squash=(0.8, 1.25)):
    """Galka family: rounded pebbles packed tight (largest first), calm contrast, seamless."""
    r = random.Random(seed)
    matrix = shade(base, matrix_k)
    im = Image.new("RGB", (M, M), matrix)
    px = im.load()
    placed = []
    for rr in list(sizes) + [fill_to] * 30:
        for _ in range(260):
            cx, cy = r.uniform(0, M), r.uniform(0, M)
            sx = r.uniform(*squash)
            if all(math.hypot(wrap(cx - p[0]), wrap(cy - p[1])) > rr * max(sx, 1) + p[2] * max(p[3], 1) + gap for p in placed):
                placed.append((cx, cy, rr, sx))
                break
    for cx, cy, rr, sx in placed:
        c = shade(base, r.choice(tones))
        if tints:
            c = hue(c, r.choice(tints), r.uniform(*tint_amt))
        for y in range(M):
            for x in range(M):
                dx, dy = wrap(x + 0.5 - cx), wrap(y + 0.5 - cy)
                d = math.hypot(dx / sx, dy)
                if d < rr:
                    v = c
                    if d > rr - 1.15:
                        v = shade(c, rim) if dx + dy < 0 else shade(c, -rim * 1.3)
                    elif shine and math.hypot(dx / sx + rr * 0.38, dy + rr * 0.38) < max(1.0, rr * 0.26):
                        v = shade(c, 0.5)
                    px[x, y] = v
    return im


OPTIONS = {
    2: [
        ("а", "рыжая галька", lambda b, s: packed(b, s)),
        ("б", "крупные валуны и мелочь", lambda b, s: packed(b, s, sizes=(9.0, 7.5, 4.0, 3.2), fill_to=2.6)),
        ("в", "галька с медным налётом", lambda b, s: packed(b, s, tints=("#37a878", "#cf7a4e", "#cf7a4e"), tint_amt=(0.25, 0.45))),
        ("г", "разноцветная галька", lambda b, s: packed(b, s, tints=("#e8a860", "#b04a3a", "#d8905c"), tint_amt=(0.2, 0.45))),
        ("д", "плотная мелкая галька", lambda b, s: packed(b, s, sizes=(4.5, 4.0, 3.5), fill_to=3.0, gap=0.7, rim=0.13)),
        ("е", "глянцевые окатыши", lambda b, s: packed(b, s, shine=True)),
    ],
    3: [
        ("а", "ледяная галька с бликом", lambda b, s: packed(b, s, shine=True, tints=("#bcd6ff", "#e6d2ff"), tint_amt=(0.1, 0.35))),
        ("б", "крупные светлые валуны", lambda b, s: packed(b, s, sizes=(9.0, 7.5, 4.0, 3.2), fill_to=2.6, tints=("#c9d8ff", "#f0dcff"))),
        ("в", "перламутровая галька", lambda b, s: packed(b, s, shine=True, tints=("#ffc0e2", "#b8e4ff", "#d4c2ff"), tint_amt=(0.2, 0.45))),
        ("г", "снежная галька", lambda b, s: packed(b, s, tones=(0.02, 0.08, 0.14), matrix_k=-0.2)),
        ("д", "плотная мелкая галька", lambda b, s: packed(b, s, sizes=(4.5, 4.0, 3.5), fill_to=3.0, gap=0.7, rim=0.13, tints=("#c9d8ff",))),
        ("е", "голубые окатыши", lambda b, s: packed(hexrgb("#c9d6f2") if False else b, s, shine=True, tints=("#9cc4ff",), tint_amt=(0.3, 0.5))),
    ],
}
