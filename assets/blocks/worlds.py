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


# ore: (id, rarity, shape, fill, light, layout override or None)
# shapes: round, shard (rhomb), oval, hex
WORLDS = [
    {"id": "meadow", "name": "Луговой слой", "fill": pebbles, "rock": ("pebble", "#a7a2b4"),
     "lining": 0.62, "light": "#ffe2a8", "sky": "#2b3a55",
     "env": {"beams": "wood", "props": "grass"},
     "ores": [("flint", "common", "shard", "#56709c", "#b4c8ee", None),
              ("coal", "rare", "round", "#33333f", "#9a9ab8", [("round", 13, 13, 5.4), ("shard", 23, 10, 2.6), ("shard", 21.5, 22, 3.2)]),
              ("copper", "gem", "round", "#ee7d36", "#ffc995", None),
              ("firefly_amber", "treasure", "round", "#ffbf1f", "#fff4a8", None)]},
    {"id": "copper_caves", "name": "Медные пещеры", "fill": strata, "rock": ("red_stone", "#cf7a4e"),
     "lining": 0.58, "light": "#ffb36b", "sky": "#3a1f18",
     "env": {"beams": "copper", "props": "pipes"},
     "ores": [("copper", "common", "round", "#ff9a5c", "#ffe0bf", None),
              ("tin", "rare", "oval", "#e3e9f2", "#ffffff", None),
              ("malachite", "gem", "hex", "#1fb36b", "#a5f5c8", None),
              ("turquoise", "treasure", "round", "#2fd8cf", "#d4fffb", None)]},
    {"id": "quartz_veins", "name": "Кварцевые жилы", "fill": facets, "rock": ("white_stone", "#ddd6ea"),
     "lining": 0.6, "light": "#ffd2ef", "sky": "#2c2440",
     "env": {"beams": None, "props": "pink_crystals"},
     "ores": [("quartz", "common", "shard", "#cfeeff", "#ffffff", None),
              ("iron", "rare", "oval", "#d39a6e", "#ffe2c6", None),
              ("rose_quartz", "gem", "hex", "#ff7fb8", "#ffe0ee", None),
              ("amethyst", "treasure", "shard", "#9b55f0", "#e8cfff", None)]},
    {"id": "gold_river", "name": "Золотая река", "fill": soft_blobs, "rock": ("sandstone", "#e6be78"),
     "lining": 0.6, "light": "#ffe58a", "sky": "#1f3b4a",
     "env": {"beams": "wood", "props": "river"},
     "ores": [("silver", "common", "oval", "#c9d6ea", "#ffffff", None),
              ("gold", "rare", "round", "#ffc21a", "#fff2a0", None),
              ("river_pearl", "gem", "round", "#fff1f6", "#ffffff", None),
              ("nugget", "treasure", "hex", "#ffb000", "#fff3a6", None)]},
    {"id": "ice_grottoes", "name": "Ледяные гроты", "fill": glossy, "rock": ("frozen_stone", "#9fd6f0"),
     "lining": 0.75, "light": "#bfeaff", "sky": "#14284a",
     "env": {"beams": None, "props": "icicles"},
     "ores": [("ice", "common", "shard", "#e8fbff", "#ffffff", None),
              ("froststone", "rare", "round", "#7fb4e6", "#e6f6ff", None),
              ("sapphire", "gem", "hex", "#2a5ee8", "#a9c6ff", None),
              ("eternal_ice", "treasure", "shard", "#5ef0ff", "#ffffff", None)]},
    {"id": "mushroom_forest", "name": "Грибной лес", "fill": gradient, "rock": ("mycelium", "#8e68c2"),
     "lining": 0.55, "light": "#7ff5d8", "sky": "#1d1236",
     "env": {"beams": None, "props": "mushrooms"},
     "ores": [("sporite", "common", "round", "#b6f24a", "#efffc2", None),
              ("glowshroom", "rare", "oval", "#3ff2d0", "#d6fff6", None),
              ("topaz", "gem", "hex", "#ffa23a", "#ffe0b0", None),
              ("moonstone", "treasure", "round", "#e9e2ff", "#ffffff", None)]},
    {"id": "giant_bones", "name": "Кости великанов", "fill": smooth, "rock": ("limestone", "#ecdcb8"),
     "lining": 0.6, "light": "#ffc58a", "sky": "#3a2618",
     "env": {"beams": None, "props": "ribs"},
     "ores": [("bone_ore", "common", "oval", "#fffaf0", "#ffffff", None),
              ("amber", "rare", "round", "#f2a12a", "#ffe2a0", None),
              ("onyx", "gem", "hex", "#2b2734", "#9a92b8", None),
              ("dragon_amber", "treasure", "round", "#ff5a2a", "#ffd0a0", None)]},
    {"id": "lost_city", "name": "Затерянный город", "fill": soft_blobs, "rock": ("terracotta", "#c8653f"),
     "lining": 0.58, "light": "#a8ffb0", "sky": "#16301e",
     "env": {"beams": "stone", "props": "vines"},
     "ores": [("bronze", "common", "oval", "#c98a3c", "#ffd9a0", None),
              ("jade", "rare", "hex", "#2fc77e", "#bff7d8", None),
              ("lapis_lazuli", "gem", "shard", "#2d4fd6", "#a8baff", None),
              ("ancient_gold", "treasure", "hex", "#ffcc33", "#fff6c0", None)]},
    {"id": "magma_springs", "name": "Магмовые ключи", "fill": pebbles, "rock": ("basalt", "#4b4560"),
     "lining": 0.7, "light": "#ff7a3a", "sky": "#2a0d0d",
     "env": {"beams": None, "props": "lava"},
     "ores": [("obsidian", "common", "shard", "#3a2a5c", "#a58cff", None),
              ("garnet", "rare", "round", "#c2263f", "#ff9aaa", None),
              ("ruby", "gem", "hex", "#ff2a4a", "#ffb0bc", None),
              ("fire_ruby", "treasure", "round", "#ff6a1a", "#fff0a0", None)]},
    {"id": "core", "name": "Ядро", "fill": smooth, "rock": ("lightstone", "#fff0c4"),
     "lining": 0.7, "light": "#fff2c0", "sky": "#2a2050",
     "env": {"beams": None, "props": "stars"},
     "ores": [("core_crystal", "common", "shard", "#8ff3ff", "#ffffff", None),
              ("sunstone", "rare", "round", "#ff9f1a", "#fff1a0", None),
              ("stardust", "gem", "oval", "#9b6bff", "#efe2ff", None),
              ("core_shard", "treasure", "hex", "#ff4fd8", "#ffe6fb", None)]},
]
