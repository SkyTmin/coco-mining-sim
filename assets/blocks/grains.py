# Dust grains for the Telegram-style break (owner 11.11: grain 4×4 texture px both for a block and the ult).
# Every mine texture (rock / ore, its look alts and rare variants) → an 8×8 grid of grains (mean colour of each 4×4 px
# cell). Colours are quantised to fixed palettes so the game needs only fixed-colour ParticleEmitters (changing
# ParticleEmitter.Color would recolour particles already in the air): one 16-colour palette per world for its normal
# blocks, one per rare kind (golden / rainbow / cosmic) for all worlds. Writes grains.json:
# {"grid": 8, "grainPx": 4, "palettes": {"w1": [hex×16], …, "golden": […]}, "textures": {name: {"palette": key,
# "cells": 64 chars, one hex digit per grain, row by row from the top-left of the face}}}
import json
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
GRID, CELL = 8, 4


def grains(name):
    im = Image.open(os.path.join(HERE, "px", f"{name}.png")).convert("RGB")
    return im.resize((GRID, GRID), Image.BOX)  # box filter = mean of each 4×4 cell


def main():
    m = json.load(open(os.path.join(HERE, "manifest.json")))
    groups = {}
    for w in m["worlds"]:
        for b in [w["rock"]] + w["ores"]:
            groups.setdefault(f"w{w['world']}", []).extend(b["alts"])
            for kind, name in b["variants"].items():
                groups.setdefault(kind, []).append(name)
    out = {"grid": GRID, "grainPx": CELL, "palettes": {}, "textures": {}}
    for key, names in groups.items():
        cells = [grains(n) for n in names]
        sheet = Image.new("RGB", (GRID * len(cells), GRID))
        for i, c in enumerate(cells):
            sheet.paste(c, (i * GRID, 0))
        q = sheet.quantize(16, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        pal = q.getpalette()[: 16 * 3]
        out["palettes"][key] = ["#%02x%02x%02x" % tuple(pal[i * 3 : i * 3 + 3]) for i in range(16)]
        for i, n in enumerate(names):
            idx = [q.getpixel((i * GRID + x, y)) for y in range(GRID) for x in range(GRID)]
            out["textures"][n] = {"palette": key, "cells": "".join("%x" % v for v in idx)}
    with open(os.path.join(HERE, "grains.json"), "w") as fh:
        json.dump(out, fh, separators=(",", ":"))
    print(len(out["textures"]), "textures,", os.path.getsize(os.path.join(HERE, "grains.json")), "bytes")


if __name__ == "__main__":
    main()
