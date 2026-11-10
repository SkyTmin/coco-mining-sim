# Final block textures for all 10 worlds, style A «Конфетный блок» [владелец 10.11].
# Run: python3 assets/blocks/build.py
# Writes px/<name>.png (32×32) and upload/<name>.png (128×128, nearest neighbour — Roblox filters textures) for every
# rock, its tunnel lining, every ore, and the three rare variants of every rock and ore (wiki 18 §8: golden 1/250,
# rainbow 1/10 000, cosmic 1/500 000 hits — the stone changes, the ore keeps its own colour), plus crack_1..4,
# planks, beam and manifest.json. Every normal rock and ore also gets two look
# variants <name>_b / <name>_c (another ore placement + turned stone) so a wall of one block type does not tile. (which texture belongs to which block of which world).
import json
import os
import shutil

from PIL import Image

import layouts
import make
from worlds import WORLDS

SYSTEM = {k.split(" ")[0]: k for k in layouts.SYSTEMS}  # "Б" -> "Б · жила наискосок"
VARIANTS = ("golden", "rainbow", "cosmic")
ALTS = (("b", 1, 40), ("c", 2, 80))  # look variant: suffix, stone quarter turns, seed offset


def pieces(world, shape, rarity, seed):
    spec = layouts.SYSTEMS[SYSTEM[world["layout"]]]
    want = spec[rarity]
    for attempt in range(400):  # greedy packing: retry with another seed until every piece fits
        p = layouts.scatter(want, seed * 1000 + attempt, along=spec.get("_along"))
        if len(p) == len(want):
            return [(shape, cx, cy, r) for cx, cy, r in p]
    raise AssertionError((world["id"], rarity))


def tile(world, ore=None, kind=None, seed=3, lay=None, turn=0):
    hot = world.get("frame") == "hot"

    def post(im):
        if kind:
            im = layouts.variant(im, kind)
        if hot:  # after the variant: the red-hot frame marks the finale even on golden / rainbow / cosmic blocks
            im = make.hot_frame(im)
        return im

    rock_hex = world["rock"][2]
    if ore is None:
        return make.compose(world["fill"], rock_hex, None, seed, stone_post=post, turn=turn)
    _, _, rarity, shape, f, li = ore
    im = make.compose(world["fill"], rock_hex, (shape, rarity, f, li, lay), seed, stone_post=post, turn=turn)
    strength = world.get("halo", {}).get(rarity, 0)
    if strength:
        im = make.glow(im, lay[0], make.hexrgb(f), strength)
    return im


def blocks():
    """Yields (world index, world, ore or None, texture name, {variant: image})."""
    for wi, world in enumerate(WORLDS, 1):
        rock = world["rock"][0]
        ims = {k: tile(world, kind=k) for k in (None, *VARIANTS)}
        for suffix, turn, off in ALTS:
            ims[suffix] = tile(world, seed=3 + off, turn=turn)
        yield wi, world, None, rock, ims
        for oi, ore in enumerate(world["ores"]):
            seed = 11 + oi
            lay = pieces(world, ore[3], ore[2], seed)
            name = ore[0] if wi == 1 or ore[0] != "copper" else "copper_w2"
            ims = {k: tile(world, ore, k, seed, lay) for k in (None, *VARIANTS)}
            for suffix, turn, off in ALTS:
                ims[suffix] = tile(world, ore, None, seed + off, pieces(world, ore[3], ore[2], seed + off), turn)
            yield wi, world, ore, name, ims


def main():
    for d in (make.PX, make.UP):  # stale files from older runs must not be uploaded
        shutil.rmtree(d, ignore_errors=True)
        os.makedirs(d)
    manifest = {"_note": "[решение Claude 10.11] стиль A; миры, руды и раскладки — assets/blocks/worlds.py "
                         "[владелец 10.11: галька в мире 1, раскладки Б/Г/Д, мир 9 — Подземное море, магма — мир 10]; "
                         "генератор assets/blocks/build.py",
                "variants": {"golden": 250, "rainbow": 10_000, "cosmic": 500_000},
                "cracks": {"sets": list(make.CRACK_SETS), "stages": make.CRACK_STAGES,
                           "names": "crack_<set>_<stage>"},
                "fx": {"dust": "fx_dust"},
                "worlds": []}
    entry = None
    for wi, world, ore, name, ims in blocks():
        for k, im in ims.items():
            make.save(im, name if k is None else f"{name}_{k}")
        variants = {k: f"{name}_{k}" for k in VARIANTS}
        alts = [name] + [f"{name}_{s}" for s, _, _ in ALTS]
        if ore is None:
            rock = world["rock"][0]
            lining = f"{rock}_lining"
            make.save(Image.eval(ims[None], lambda v, k=world["lining"]: int(v * k)), lining)
            entry = {"world": wi, "id": world["id"], "name": world["name"], "layout": world["layout"],
                     "rock": {"id": rock, "name": world["rock"][1], "texture": rock, "alts": alts, "variants": variants,
                              "dust": [world["rock"][2]]},
                     "lining": lining, "light": world["light"], "frame": world.get("frame", "candy"),
                     "env": world["env"], "ores": []}
            manifest["worlds"].append(entry)
        else:
            entry["ores"].append({"id": ore[0], "name": ore[1], "rarity": ore[2], "texture": name, "alts": alts,
                                  "variants": variants, "dust": [world["rock"][2], ore[4]], "glow": ore[2] == "treasure" or ore[2] in world.get("halo", {})})
    make.crack_sets()
    dust = Image.new("RGBA", (16, 16), (0, 0, 0, 0))  # square dust flake for the «Thanos» break (ParticleEmitter)
    for y in range(2, 14):
        for x in range(2, 14):
            edge = x in (2, 13) or y in (2, 13)
            dust.putpixel((x, y), (255, 255, 255, 170 if edge else 255))
    make.save(dust, "fx_dust")
    make.misc()
    with open(os.path.join(make.HERE, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)
    print("ok", len(os.listdir(make.PX)), "textures")


if __name__ == "__main__":
    main()
