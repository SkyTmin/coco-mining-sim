# All 10 worlds: stone, palette, ore (shape + colour unique inside a world, like candies), tunnel environment.
# Stone patterns only from the owner's liked families (galka, layers, facets, soft blobs, smooth/gradient);
# blacklist in docs/design/RESEARCH-BLOCKS-2026-11.md. Used by make.py (textures) and scene_world.py (renders).
import math
import random


def _shade(c, k):
    t = (40, 30, 78) if k < 0 else (255, 244, 214)
    k = -k * 1.1 if k < 0 else k
    return tuple(round(c[i] + (t[i] - c[i]) * k) for i in range(3))


N = 16


def pebbles(px, base, seed, stones=((5, 5, 2.6), (11, 6, 2.2), (6, 11, 2.3), (11, 11, 2.6), (3, 8, 1.3))):
    r = random.Random(seed)
    L, D = _shade(base, 0.13), _shade(base, -0.12)
    stones = list(stones)
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


def small_pebbles(px, base, seed):
    pebbles(px, base, seed, ((4, 4, 1.8), (9, 3, 1.5), (13, 6, 1.8), (6, 8, 1.6), (11, 10, 2.0), (4, 12, 1.7),
                              (9, 13, 1.5), (13, 13, 1.3)))


def strata(px, base, seed):
    L, D, DD = _shade(base, 0.12), _shade(base, -0.10), _shade(base, -0.22)
    for y in range(N):
        for x in range(N):
            band = (y + x // 4 + int(1.3 * math.sin((x + seed) * 0.6))) // 3 % 3
            px[x, y] = (L, base, D)[band]
            if (x * 5 + y * 3 + seed) % 29 == 0:
                px[x, y] = DD


def facets(px, base, seed):
    r = random.Random(seed)
    pts = [(r.uniform(0, N), r.uniform(0, N)) for _ in range(6)]
    tones = [_shade(base, k) for k in (0.14, 0.05, -0.04, -0.12, 0.09, -0.08)]
    for y in range(N):
        for x in range(N):
            best = sorted(range(6), key=lambda i: math.hypot(x + 0.5 - pts[i][0], y + 0.5 - pts[i][1]))
            d0 = math.hypot(x + 0.5 - pts[best[0]][0], y + 0.5 - pts[best[0]][1])
            d1 = math.hypot(x + 0.5 - pts[best[1]][0], y + 0.5 - pts[best[1]][1])
            px[x, y] = _shade(base, -0.18) if d1 - d0 < 0.7 else tones[best[0]]


def soft_blobs(px, base, seed):
    r = random.Random(seed)
    pts = [(r.uniform(0, N), r.uniform(0, N), r.uniform(-1, 1)) for _ in range(12)]
    for y in range(N):
        for x in range(N):
            v = sum(w * math.exp(-((x + 0.5 - a) ** 2 + (y + 0.5 - b) ** 2) / 14) for a, b, w in pts)
            px[x, y] = _shade(base, 0.10) if v > 0.45 else (_shade(base, -0.09) if v < -0.35 else base)


def smooth(px, base, seed):
    for y in range(N):
        for x in range(N):
            if (x * 7 + y * 3 + seed) % 23 == 0:
                px[x, y] = _shade(base, 0.12)


def gradient(px, base, seed):
    for y in range(N):
        c = _shade(base, 0.14 - 0.30 * y / (N - 1))
        for x in range(N):
            px[x, y] = c


def glossy(px, base, seed):
    """Ice: soft top-to-bottom gradient plus one rounded glint in the top-left corner."""
    gradient(px, base, seed)
    for y in range(N):
        for x in range(N):
            if math.hypot(x - 4.5, y - 4.5) < 2.2 and x + y < 10:
                px[x, y] = _shade(base, 0.55)


def waves(px, base, seed):
    """Underground sea: soft wavy layers (the liked «layers» family, curved like water)."""
    L, D = _shade(base, 0.12), _shade(base, -0.12)
    for y in range(N):
        for x in range(N):
            band = int((y + 1.6 * math.sin((x + seed) * 0.75)) // 3) % 3
            px[x, y] = (L, base, D)[band]


HOT, EMBER = (255, 122, 38), (214, 52, 40)


def hot_pebbles(px, base, seed):
    """Magma: basalt pebbles lying on lava, the lower-right rim of every pebble glows [владелец 10.11: финал]."""
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


# ore: (id, name, rarity, shape, fill, light). Inside a world every ore has its own shape AND colour (candies).
# shapes: round, shard (rhomb), oval, hex. layout: ore placement system from layouts.SYSTEMS — the owner liked
# Б, Г and Д (10.11); each world gets one so neighbouring worlds differ by placement too [решение].
# Owner 10.11: world 9 = «Подземное море», magma moves to world 10 (the finale: red-hot frame + glowing ore),
# the old «Ядро» world is gone (the Core stays as the goal behind the last Plate).
WORLDS = [
    {"id": "meadow", "name": "Луговой слой", "fill": pebbles, "rock": ("pebble", "Галька", "#a7a2b4"),
     "layout": "Д", "lining": 0.62, "light": "#ffe2a8", "sky": "#2b3a55", "env": {"beams": "wood", "props": "grass"},
     "ores": [("flint", "Кремень", "common", "shard", "#56709c", "#b4c8ee"),
              ("coal", "Уголь", "rare", "round", "#33333f", "#9a9ab8"),
              ("copper", "Медь", "gem", "hex", "#ee7d36", "#ffc995"),
              ("firefly_amber", "Светлячковый янтарь", "treasure", "oval", "#ffbf1f", "#fff4a8")]},
    {"id": "copper_caves", "name": "Медные пещеры", "fill": strata, "rock": ("red_stone", "Рыжий камень", "#cf7a4e"),
     "layout": "Г", "lining": 0.58, "light": "#ffb36b", "sky": "#3a1f18", "env": {"beams": "copper", "props": "pipes"},
     "ores": [("copper", "Медь", "common", "round", "#ff9a5c", "#ffe0bf"),
              ("tin", "Олово", "rare", "oval", "#e3e9f2", "#ffffff"),
              ("malachite", "Малахит", "gem", "hex", "#1fb36b", "#a5f5c8"),
              ("turquoise", "Бирюза", "treasure", "shard", "#2fd8cf", "#d4fffb")]},
    {"id": "quartz_veins", "name": "Кварцевые жилы", "fill": facets, "rock": ("white_stone", "Белый камень", "#ddd6ea"),
     "layout": "Б", "lining": 0.6, "light": "#ffd2ef", "sky": "#2c2440", "env": {"beams": None, "props": "pink_crystals"},
     "ores": [("quartz", "Кварц", "common", "shard", "#cfeeff", "#ffffff"),
              ("iron", "Железо", "rare", "round", "#d39a6e", "#ffe2c6"),
              ("rose_quartz", "Розовый кварц", "gem", "hex", "#ff7fb8", "#ffe0ee"),
              ("amethyst", "Аметист", "treasure", "oval", "#9b55f0", "#e8cfff")]},
    {"id": "gold_river", "name": "Золотая река", "fill": soft_blobs, "rock": ("sandstone", "Песчаник", "#e6be78"),
     "layout": "Г", "lining": 0.6, "light": "#ffe58a", "sky": "#1f3b4a", "env": {"beams": "wood", "props": "river"},
     "ores": [("silver", "Серебро", "common", "shard", "#c9d6ea", "#ffffff"),
              ("gold", "Золото", "rare", "oval", "#ffc21a", "#fff2a0"),
              ("river_pearl", "Речной жемчуг", "gem", "round", "#fff1f6", "#ffffff"),
              ("nugget", "Самородок-великан", "treasure", "hex", "#ffb000", "#fff3a6")]},
    {"id": "ice_grottoes", "name": "Ледяные гроты", "fill": glossy, "rock": ("frozen_stone", "Мёрзлый камень", "#9fd6f0"),
     "layout": "Д", "lining": 0.75, "light": "#bfeaff", "sky": "#14284a", "env": {"beams": None, "props": "icicles"},
     "ores": [("ice", "Лёд", "common", "shard", "#e8fbff", "#ffffff"),
              ("froststone", "Иней-камень", "rare", "round", "#7fb4e6", "#e6f6ff"),
              ("sapphire", "Сапфир", "gem", "hex", "#2a5ee8", "#a9c6ff"),
              ("eternal_ice", "Вечный лёд", "treasure", "oval", "#5ef0ff", "#ffffff")]},
    {"id": "mushroom_forest", "name": "Грибной лес", "fill": gradient, "rock": ("mycelium", "Грибница", "#8e68c2"),
     "layout": "Г", "lining": 0.55, "light": "#7ff5d8", "sky": "#1d1236", "env": {"beams": None, "props": "mushrooms"},
     "ores": [("sporite", "Спорит", "common", "shard", "#b6f24a", "#efffc2"),
              ("glowshroom", "Светогриб", "rare", "oval", "#3ff2d0", "#d6fff6"),
              ("topaz", "Топаз", "gem", "hex", "#ffa23a", "#ffe0b0"),
              ("moonstone", "Лунный камень", "treasure", "round", "#e9e2ff", "#ffffff")]},
    {"id": "giant_bones", "name": "Кости великанов", "fill": smooth, "rock": ("limestone", "Известняк", "#ecdcb8"),
     "layout": "Д", "lining": 0.6, "light": "#ffc58a", "sky": "#3a2618", "env": {"beams": None, "props": "ribs"},
     "ores": [("bone_ore", "Кость-руда", "common", "oval", "#fffaf0", "#ffffff"),
              ("amber", "Янтарь", "rare", "round", "#f2a12a", "#ffe2a0"),
              ("onyx", "Оникс", "gem", "shard", "#2b2734", "#9a92b8"),
              ("dragon_amber", "Драконий янтарь", "treasure", "hex", "#ff5a2a", "#ffd0a0")]},
    {"id": "lost_city", "name": "Затерянный город", "fill": soft_blobs, "rock": ("terracotta", "Терракота", "#c8653f"),
     "layout": "Б", "lining": 0.58, "light": "#a8ffb0", "sky": "#16301e", "env": {"beams": "stone", "props": "vines"},
     "ores": [("bronze", "Бронза", "common", "oval", "#c98a3c", "#ffd9a0"),
              ("jade", "Нефрит", "rare", "hex", "#2fc77e", "#bff7d8"),
              ("lapis_lazuli", "Лазурит", "gem", "shard", "#2d4fd6", "#a8baff"),
              ("ancient_gold", "Древнее золото", "treasure", "round", "#ffcc33", "#fff6c0")]},
    {"id": "underground_sea", "name": "Подземное море", "fill": waves, "rock": ("sea_stone", "Морской камень", "#2f6f9a"),
     "layout": "Д", "lining": 0.6, "light": "#7fe8ff", "sky": "#0c2238", "env": {"beams": None, "props": "bubbles_kelp"},
     "ores": [("salt", "Соль-камень", "common", "hex", "#f2e8ef", "#ffffff"),
              ("aquamarine", "Аквамарин", "rare", "shard", "#46e0e6", "#dcffff"),
              ("pearl", "Жемчуг", "gem", "oval", "#fff4f8", "#ffffff"),
              ("black_pearl", "Чёрная жемчужина", "treasure", "round", "#2a2440", "#c9b8ff")]},
    {"id": "magma_springs", "name": "Магмовые ключи", "fill": hot_pebbles, "rock": ("basalt", "Базальт", "#463a58"),
     "layout": "Б", "lining": 0.7, "light": "#ff7a3a", "sky": "#2a0d0d", "env": {"beams": None, "props": "lava"},
     "frame": "hot", "halo": {"gem": 0.22, "treasure": 0.38},
     "ores": [("obsidian", "Обсидиан", "common", "shard", "#9a72f0", "#efe6ff"),
              ("garnet", "Гранат", "rare", "oval", "#b8203f", "#ff9aaa"),
              ("ruby", "Рубин", "gem", "hex", "#ff2a4a", "#ffc0c8"),
              ("fire_ruby", "Огненный рубин", "treasure", "round", "#ff7a12", "#fff3a0")]},
]
