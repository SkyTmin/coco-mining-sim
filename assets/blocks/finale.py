# Owner 10.11: «9 надо ставить на 10, а старое 10 — фигня, не скажешь, что это 10 мир».
# Magma becomes the final world 10 and must look like the finale: a red-hot frame on every block and glowing ore.
# The old Core is dropped; world 9 candidates come from the original 20-world list (docs/design/studio/01-game-design.md).
# Run: python3 finale.py <out.html>
import base64
import io
import math
import random
import sys

from PIL import Image

import layouts
import make
from worlds import _shade, N, pebbles, small_pebbles


# ---------------------------------------------------------------- 16-px stone fills for the new worlds
def waves(px, base, seed):
    """Underground sea: soft wavy layers (the liked «layers» family, but curved like water)."""
    L, D = _shade(base, 0.12), _shade(base, -0.12)
    for y in range(N):
        for x in range(N):
            band = int((y + 1.6 * math.sin((x + seed) * 0.75)) // 3) % 3
            px[x, y] = (L, base, D)[band]


def cut_facets(px, base, seed):
    """Diamond mantle: large cold facets with one bright glint, no dark seams."""
    r = random.Random(seed)
    pts = [(r.uniform(0, N), r.uniform(0, N)) for _ in range(5)]
    tones = [_shade(base, k) for k in (0.16, 0.06, -0.05, -0.12, 0.10)]
    for y in range(N):
        for x in range(N):
            i = min(range(5), key=lambda i: math.hypot(x + 0.5 - pts[i][0], y + 0.5 - pts[i][1]))
            px[x, y] = tones[i]
    for x, y in ((4, 3), (3, 4), (4, 4), (5, 4), (4, 5)):
        px[x, y] = _shade(base, 0.6)


def moss(px, base, seed):
    small_pebbles(px, base, seed)


# magma stone options (dark basalt; the glow is the point)
HOT = (255, 122, 38)
HOT2 = (255, 196, 84)
EMBER = (214, 52, 40)


def hot_pebbles(px, base, seed):
    """Basalt pebbles lying on lava: the lower-right rim of every pebble glows."""
    r = random.Random(seed)
    stones = [(5, 5, 2.6), (11, 6, 2.2), (6, 11, 2.3), (11, 11, 2.6), (3, 8, 1.3)]
    r.shuffle(stones)
    for x in range(N):
        for y in range(N):
            px[x, y] = EMBER
    for cx, cy, rr in stones:
        cx += r.uniform(-0.4, 0.4)
        cy += r.uniform(-0.4, 0.4)
        for y in range(N):
            for x in range(N):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                d = math.hypot(dx, dy)
                if d < rr:
                    px[x, y] = _shade(base, 0.14) if dx + dy < -0.6 else base
                elif d < rr + 0.8:
                    px[x, y] = HOT if dx + dy > 0 else _shade(base, -0.15)


def heat_gradient(px, base, seed):
    """Basalt that heats up towards the bottom of the block: dark top, red-hot lower edge, a few embers."""
    stops = [(0.0, _shade(base, 0.10)), (0.55, base), (0.78, (120, 34, 44)), (1.0, (232, 84, 36))]
    for y in range(N):
        t = y / (N - 1)
        for i in range(len(stops) - 1):
            if t <= stops[i + 1][0]:
                k = (t - stops[i][0]) / (stops[i + 1][0] - stops[i][0])
                c = make.mix(stops[i][1], stops[i + 1][1], k)
                break
        for x in range(N):
            px[x, y] = c
    for x, y in ((3, 4), (12, 2), (9, 8), (2, 10)):
        px[x, y] = HOT


def cooled_lava(px, base, seed):
    """Lava that is still cooling: dark basalt with soft glowing pools (the liked «soft blobs» family)."""
    r = random.Random(seed)
    pts = [(r.uniform(0, N), r.uniform(0, N), r.uniform(-0.2, 1)) for _ in range(9)]
    for y in range(N):
        for x in range(N):
            v = sum(w * math.exp(-((x + 0.5 - a) ** 2 + (y + 0.5 - b) ** 2) / 5) for a, b, w in pts)
            if v > 0.75:
                px[x, y] = HOT2
            elif v > 0.5:
                px[x, y] = HOT
            elif v > 0.32:
                px[x, y] = EMBER
            elif v < -0.4:
                px[x, y] = _shade(base, -0.10)
            else:
                px[x, y] = base


def hot_frame(im):
    """Red-hot candy frame: the dark outline stays, the inner bevel glows like metal out of a forge."""
    px = im.load()
    M = im.width
    for i in range(2, M - 2):
        px[i, 2], px[2, i] = HOT2, HOT2
        px[i, 3], px[3, i] = HOT, HOT
        px[i, M - 3], px[M - 3, i] = EMBER, EMBER
        px[i, M - 4], px[M - 4, i] = (178, 40, 44), (178, 40, 44)
    return im


def glow(im, layout, color, strength):
    """Soft halo around each ore piece, drawn on the stone after the ore (pixels of the ore keep their colours)."""
    px = im.load()
    base = im.copy().load()
    M = im.width
    for _, cx, cy, r in layout[:1]:  # only the main piece glows; crumbs stay crisp
        for y in range(4, M - 4):
            for x in range(4, M - 4):
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r - 1.5
                if 0 < d < 4:
                    px[x, y] = make.mix(base[x, y], color, strength * (1 - d / 4))
    return im


# ---------------------------------------------------------------- world defs (same shape as worlds.WORLDS)
MAGMA_ORES = [  # unique shape per ore inside the world (garnet was round like the fire ruby — fixed)
    ("obsidian", "Обсидиан", "common", "shard", "#7650c8", "#e2d6ff"),
    ("garnet", "Гранат", "rare", "oval", "#b8203f", "#ff9aaa"),
    ("ruby", "Рубин", "gem", "hex", "#ff2a4a", "#ffc0c8"),
    ("fire_ruby", "Огненный рубин", "treasure", "round", "#ff7a12", "#fff3a0"),
]

CANDIDATES_9 = [
    {"name": "Подземное море", "why": "глубокий синий, волны в камне, жемчуг; тоннель с пузырями и светящимися водорослями",
     "fill": waves, "rock": ("sea_stone", "Морской камень", "#2f6f9a"),
     "ores": [("salt", "Соль-камень", "common", "hex", "#f2e8ef", "#ffffff"),
              ("aquamarine", "Аквамарин", "rare", "shard", "#46e0e6", "#dcffff"),
              ("pearl", "Жемчуг", "gem", "oval", "#fff4f8", "#ffffff"),
              ("black_pearl", "Чёрная жемчужина", "treasure", "round", "#2a2440", "#c9b8ff")]},
    {"name": "Алмазная мантия", "why": "холодный стальной камень с гранями, всё блестит; алмазы — то, что дети ждут в глубине",
     "fill": cut_facets, "rock": ("mantle", "Мантия", "#53648f"),
     "ores": [("platinum", "Платина", "common", "oval", "#e4e8f2", "#ffffff"),
              ("diamond", "Алмаз", "rare", "shard", "#9ff0ff", "#ffffff"),
              ("brilliant", "Бриллиант", "gem", "hex", "#ffffff", "#bff6ff"),
              ("giant_diamond", "Алмаз-гигант", "treasure", "round", "#5fd8ff", "#ffffff")]},
    {"name": "Изумрудные корни", "why": "зелёный мшистый камень, гигантские корни в стенах, изумрудный свет",
     "fill": moss, "rock": ("moss_stone", "Мшистый камень", "#5f9a58"),
     "ores": [("resin", "Смола", "common", "oval", "#e8902a", "#ffd9a0"),
              ("emerald", "Изумруд", "rare", "shard", "#10c86a", "#b8ffd6"),
              ("sap_crystal", "Сок-кристалл", "gem", "hex", "#c6ff4a", "#f4ffc8"),
              ("world_seed", "Семя мира", "treasure", "round", "#ffd23a", "#fff7c0")]},
]

MAGMA_OPTIONS = [
    ("А · камни на лаве", hot_pebbles, "#463a58"),
    ("Б · низ раскалён", heat_gradient, "#3e3350"),
]

RADII = layouts.SYSTEMS["Д · средний и крошки"]


def pieces(shape, rarity, seed):
    for attempt in range(400):
        p = layouts.scatter(RADII[rarity], seed * 1000 + attempt)
        if len(p) == len(RADII[rarity]):
            return [(shape, cx, cy, r) for cx, cy, r in p]
    raise AssertionError(rarity)


def tile(fill, rock_hex, ore=None, hot=False, kind=None, halo=None, seed=11):
    post = None
    if hot or kind:
        def post(im):
            if hot:
                im = hot_frame(im)
            if kind:
                im = layouts.variant(im, kind)
            return im
    if ore is None:
        return make.compose(fill, rock_hex, None, seed, stone_post=post)
    _, _, rarity, shape, f, li = ore
    lay = pieces(shape, rarity, seed)
    im = make.compose(fill, rock_hex, (shape, rarity, f, li, lay), seed, stone_post=post)
    if halo:
        im = glow(im, lay, make.hexrgb(f), halo.get(rarity, 0))
    return im


def b64(im, scale=3):
    buf = io.BytesIO()
    im.resize((im.width * scale, im.height * scale), Image.NEAREST).save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


HALO = {"common": 0.0, "rare": 0.0, "gem": 0.22, "treasure": 0.38}


def row(cells):
    return "<div class=\"row\">" + "".join(
        f"<figure><img src=\"{b64(im)}\" width=\"96\" height=\"96\" alt=\"{cap}\"><figcaption>{cap}</figcaption></figure>"
        for cap, im in cells) + "</div>"


def page(out):
    parts = []
    parts.append("<section><h2><span class=\"tag\">10</span>Магмовые ключи — финальный мир</h2>"
                 "<p>У каждого блока раскалённая рамка, а редкая руда светится. В тоннеле ещё будет лава за стеклом, "
                 "искры и красный свет. Два варианта камня, выбери один.</p>")
    for label, fill, rock in MAGMA_OPTIONS:
        cells = [("Базальт", tile(fill, rock, hot=True))]
        cells += [(o[1], tile(fill, rock, o, hot=True, halo=HALO)) for o in MAGMA_ORES]
        parts.append(f"<h3>{label}</h3>" + row(cells))
    label, fill, rock = MAGMA_OPTIONS[0]
    o = MAGMA_ORES[3]
    parts.append("<h3>Редкие виды (на варианте А)</h3>" + row(
        [(n, tile(fill, rock, o, hot=True, kind=k, halo=HALO)) for n, k in
         (("Золотой", "golden"), ("Радужный", "rainbow"), ("Космический", "cosmic"))]))
    parts.append("</section>")
    parts.append("<section><h2><span class=\"tag\">9</span>Новый девятый мир — три кандидата</h2>"
                 "<p>Взяты из первого списка на 20 миров. Камень и формы руды не повторяют миры 1–8.</p>")
    for w in CANDIDATES_9:
        rid, rname, rhex = w["rock"]
        cells = [(rname, tile(w["fill"], rhex))]
        cells += [(o[1], tile(w["fill"], rhex, o)) for o in w["ores"]]
        parts.append(f"<h3>{w['name']}</h3><p class=\"why\">{w['why']}</p>" + row(cells))
    parts.append("</section>")
    html = f"""<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Миры 9 и 10</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap">
<style>
:root{{--bg:#16131f;--fg:#f4f0ff;--muted:#aba3c2;--accent:#ffc83d;--ink:#1e2140;--font:"Nunito",system-ui,sans-serif;color-scheme:dark}}
body{{margin:0;background:var(--bg);color:var(--fg);font-family:var(--font);padding:20px max(16px,env(safe-area-inset-left,0px)) 48px}}
main{{max-width:1000px;margin:0 auto;display:flex;flex-direction:column;gap:30px}}
h1{{font-size:24px;font-weight:900;margin:0}} h2{{font-size:20px;font-weight:900;margin:0 0 6px}}
h3{{font-size:16px;font-weight:900;margin:18px 0 6px}}
p{{margin:0;color:var(--muted);line-height:1.5;max-width:68ch}} .why{{font-size:14px;margin-bottom:8px}}
.row{{display:flex;flex-wrap:wrap;gap:10px}}
figure{{margin:0;width:96px}} figcaption{{font-size:12px;font-weight:800;color:var(--muted);line-height:1.2;margin-top:4px}}
img{{display:block;image-rendering:pixelated}}
.tag{{display:inline-block;background:var(--accent);color:var(--ink);border-radius:7px;padding:0 8px;margin-right:8px}}
</style></head><body><main>
<section><h1>Миры 9 и 10</h1><p>Магма теперь последний мир, старое «Ядро» убрано. Раскладка руды везде Д.</p></section>
{''.join(parts)}
</main></body></html>"""
    open(out, "w").write(html)


if __name__ == "__main__":
    page(sys.argv[1])
