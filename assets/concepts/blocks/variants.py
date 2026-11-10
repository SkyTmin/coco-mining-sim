# More texture variants around style A (owner 10.11: "A нравится, ещё варианты"). Run after tex.py.
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import tex  # noqa: E402
from tex import ORES, OUT, ROCK, WALL_ORDER, candy_base, candy_gem, crack, crystal, hexrgb, mix, shade  # noqa: E402

INK = hexrgb("#1e2140")


def puffy(rock, ore, seed):
    """A2: two big gems, double bevel — chunkier, toy-like."""
    im = candy_base(rock, seed)
    px = im.load()
    base = hexrgb(rock)
    for i in range(2, 14):
        px[i, 2] = shade(base, 0.16)
        px[2, i] = shade(base, 0.12)
        px[i, 13] = shade(base, -0.14)
        px[13, i] = shade(base, -0.10)
    if ore:
        fill, light = (hexrgb(c) for c in ORES[ore])
        spots = [(3, 3, 6), (8, 8, 5)] if ore != "amber" else [(3, 3, 7), (10, 10, 3)]
        out = INK if ore != "coal" else hexrgb("#0d0d14")
        for x0, y0, s in spots:
            candy_gem(px, x0, y0, s, fill, (255, 255, 255), out)
            px[x0 + 2, y0 + 1] = (255, 255, 255)
    return im


def pastel(rock, ore, seed):
    """A3: light pastel stone, soft outline."""
    im = candy_base({"#a7a2b4": "#e6d4f0", "#d0784a": "#f2b49a", "#e4def0": "#f6f0ff"}.get(rock, rock), seed)
    if ore:
        fill, light = (mix(hexrgb(c), (255, 255, 255), 0.32) for c in ORES[ore])
        px = im.load()
        for x0, y0, s in tex.GEM_SPOTS if ore != "amber" else [(3, 3, 7), (10, 9, 5), (11, 3, 3)]:
            candy_gem(px, x0, y0, s, fill, (255, 255, 255), hexrgb("#5b5680"))
    return im


TINT = {"w1": "#6f86d6", "w2": "#d06a43", "w3": "#b9a6e8"}


def tinted(rock, ore, seed):
    """A4: the stone itself has the world's colour (slate blue in world 1)."""
    world = next((k for k, v in ROCK.items() if v == rock), "w1")
    return tex.candy(TINT[world], ore, seed)


def crystals(rock, ore, seed):
    """A6: pixel frame of A + smooth faceted crystals of C."""
    im = candy_base(rock, seed).resize((256, 256), Image.NEAREST)
    if ore:
        fill, light = (hexrgb(c) for c in ORES[ore])
        d = ImageDraw.Draw(im)
        spots = [(84, 86, 50), (178, 104, 38), (118, 178, 42)] if ore != "amber" else [(104, 106, 70), (186, 176, 40)]
        for cx, cy, s in spots:
            crystal(d, cx, cy, s, fill, light)
    return im


VARIANTS = {"A2": puffy, "A3": pastel, "A4": tinted, "A6": crystals}

if __name__ == "__main__":
    for key, fn in VARIANTS.items():
        for w, rock in ROCK.items():
            fn(rock, None, hash(w) % 999).save(os.path.join(OUT, f"{key}_{w}_rock.png"))
        for i, ore in enumerate(WALL_ORDER):
            fn(ROCK["w1"], ore, 31 + i).save(os.path.join(OUT, f"{key}_w1_{ore}.png"))
        crack(fn(ROCK["w1"], "copper", 40), 2, key != "A6").save(os.path.join(OUT, f"{key}_w1_copper_crack.png"))
    # backgrounds: planks, cave rock, light lining
    r = __import__("random").Random(3)
    planks = Image.new("RGB", (16, 16))
    p = planks.load()
    wood = hexrgb("#b07a45")
    for y in range(16):
        for x in range(16):
            row = y // 4
            c = shade(wood, (-0.08, 0.04, -0.02, 0.07)[row] + r.uniform(-0.04, 0.04))
            if y % 4 == 3:
                c = shade(wood, -0.5)
            if x == (5 + row * 7) % 16:
                c = shade(wood, -0.35)
            p[x, y] = c
    planks.save(os.path.join(OUT, "bg_planks.png"))
    beam = Image.new("RGB", (16, 16))
    b = beam.load()
    dark = hexrgb("#7a4f2a")
    for y in range(16):
        for x in range(16):
            b[x, y] = shade(dark, 0.06 if (x + y // 5) % 5 else -0.12)
    for i in range(16):
        b[i, 0] = b[0, i] = shade(dark, 0.25)
        b[i, 15] = b[15, i] = shade(dark, -0.45)
    beam.save(os.path.join(OUT, "bg_beam.png"))
    candy_base("#4a4366", 9).save(os.path.join(OUT, "bg_cave.png"))
    candy_base("#d9c9b0", 11).save(os.path.join(OUT, "bg_light.png"))
    candy_base("#6b5a4e", 13).save(os.path.join(OUT, "bg_stone.png"))
    print("ok")
