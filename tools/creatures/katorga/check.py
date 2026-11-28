"""Audit the published external pixels against their source frames, including both pet skins."""

import argparse
import re
from pathlib import Path

from pack import BORDERS, PET_CLIPS, viewer
from PIL import Image


class AtlasCheck:
    def __init__(self, directory):
        self.data = viewer.load(directory / "atlas.json")
        self.pages = []
        for filename in self.data["actors"]["pages"]:
            with Image.open(directory / filename) as image:
                self.pages.append(image.convert("RGBA"))
        self.origin = None
        self.frames = 0

    def compare(self, clip, n, source, position=(0, 0)):
        box = source.getchannel("A").getbbox()
        if not box:
            raise ValueError(f"{clip}[{n}]: empty source frame")
        index, x, y = self.data["clips"][clip][n][6]
        page, sx, sy, w, h = self.data["actors"]["rects"][index]
        sprite = self.pages[page].crop((sx, sy, sx + w, sy + h))
        # Premultiply so arbitrary RGB in fully transparent pixels does not affect the check.
        if sprite.convert("RGBa").tobytes() != source.crop(box).convert("RGBa").tobytes():
            raise ValueError(f"{clip}[{n}]: packed pixels differ")
        translation = (x - box[0] - position[0], y - box[1] - position[1])
        if self.origin is None:
            self.origin = translation
        if translation != self.origin:
            raise ValueError(f"{clip}[{n}]: pose has shifted")
        width, height = self.data["canvas"]
        t = self.data["thickness"]
        if not (t < x and t < y and x + w < width - t and y + h < height - t):
            raise ValueError(f"{clip}[{n}]: touches the frame")
        if self.data["rarity"] == "secret":
            view = self.data["views"][clip]
            width, height = view["canvas"]
            dx, dy = view["offset"]
            t = view["thickness"]
            assert view["field"] == [width - 2 * t, height - 2 * t]
            if not (t < x + dx and t < y + dy and x + dx + w < width - t and y + dy + h < height - t):
                raise ValueError(f"{clip}[{n}]: touches its clip frame")
        self.frames += 1
        return box

    def check_count(self, clip, count, fps):
        record = self.data["animations"][clip]
        if (
            not count
            or count != record["frames"]
            or count != len(self.data["clips"][clip])
            or fps != record["fps"]
        ):
            raise ValueError(f"{clip}: frame count or playback speed differs")


def check_pets(out, game):
    metadata = (game / "src/lib/pet-pixel-sprites.ts").read_text()
    total = 0
    species = [d for d in (game / "public/ui/pets").iterdir() if d.is_dir()]
    assert len(species) == 18
    for source in species:
        block = metadata.split("\n  " + source.name + ": {")[1].split("\n  },")[0].split("large: {")[1]
        for suffix, variant in [("", ""), ("-v1", "_gold")]:
            audit = AtlasCheck(out / ("pet_" + source.name + variant))
            assert set(audit.data["clips"]) == set(PET_CLIPS)
            for clip in PET_CLIPS:
                props = {
                    k: int(v)
                    for k, v in re.findall(r"(\w+): (-?\d+)", block.split(clip + ": {")[1].split("}")[0])
                }
                audit.check_count(clip, props["n"], props["fps"])
                with Image.open(source / (clip + "-l" + suffix + ".webp")) as sheet:
                    sheet = sheet.convert("RGBA")
                for n in range(props["n"]):
                    w, h = props["w"], props["h"]
                    audit.compare(clip, n, sheet.crop((n * w, 0, (n + 1) * w, h)), (props["x"], props["y"]))
            total += audit.frames
    return total


def check_bosses(out, captures, ids=()):
    total = 0
    if ids:
        manifest = [viewer.load(captures / ident / "manifest.json") for ident in ids]
    else:
        manifest = viewer.load(captures / "manifest.json")
        assert len(manifest) == len({boss["id"] for boss in manifest}) == 27
        assert {boss["floor"] for boss in manifest} == set(range(1, 16))
    for boss in manifest:
        audit = AtlasCheck(out / boss["id"])
        assert audit.data["rarity"] == "secret"
        assert set(audit.data["clips"]) == {clip["id"] for clip in boss["clips"]}
        for clip in boss["clips"]:
            audit.check_count(clip["id"], len(clip["frames"]), clip["fps"])
            if clip.get("fx") and not clip.get("fxFrames", 0) > 0:
                raise ValueError(f"{boss['id']}/{clip['id']}: effect is invisible")
            if clip["clippedFrames"]:
                print(f"Source boundary contact: {boss['id']}/{clip['id']}, {clip['clippedFrames']} frame(s)")
            edge_frames = 0
            for n, filename in enumerate(clip["frames"]):
                with Image.open(captures / filename) as image:
                    left, top, right, bottom = audit.compare(clip["id"], n, image.convert("RGBA"))
                    if left == 0 or top == 0 or right == image.width or bottom == image.height:
                        edge_frames += 1
            assert edge_frames == clip["clippedFrames"], (boss["id"], clip["id"], edge_frames)
        total += audit.frames
    return total


def check_materials(out):
    scene = viewer.load(out / "neutral/atlas.json")
    assert scene["canvas"] == [292, 244] and len(scene["pages"]) == 1
    with Image.open(out / "neutral" / scene["pages"][0]) as image:
        assert image.size == tuple(scene["canvas"])
    for rarity, (w, h, t) in BORDERS.items():
        directory = out / "frames" / rarity
        material = viewer.load(directory / "atlas.json")
        assert len(material["phases"]) == 72
        pages = []
        for name in material["pages"]:
            with Image.open(directory / name) as image:
                pages.append(image.convert("RGBA").getchannel("A"))
        tile = material["tile"]
        columns = (w + tile - 1) // tile
        for changes in material["phases"]:
            tiles = list(material["base"])
            for index, sprite in changes:
                tiles[index] = sprite
            mask = Image.new("L", (w, h))
            for index, sprite in enumerate(tiles):
                if sprite >= 0:
                    page, x, y, sw, sh = material["rects"][sprite]
                    mask.paste(
                        pages[page].crop((x, y, x + sw, y + sh)),
                        (index % columns * tile, index // columns * tile),
                    )
            assert mask.getbbox() and mask.crop((t, t, w - t, h - t)).getbbox() is None, rarity


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--game", type=Path)
    cli.add_argument("--bosses", type=Path)
    cli.add_argument("--boss-id", action="append", default=[])
    cli.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[1] / "viewer/atlases")
    args = cli.parse_args()
    check_materials(args.out)
    if args.game:
        print("Verified pet frames:", check_pets(args.out, args.game))
    if args.bosses:
        print("Verified boss frames:", check_bosses(args.out, args.bosses, args.boss_id))
    files = [f.stat().st_size for f in args.out.parent.rglob("*") if f.is_file()]
    print(f"Gallery: {len(files)} files, {sum(files):,} bytes, largest {max(files):,} bytes")
    if len(files) > 500 or sum(files) > 250_000_000 or max(files) > 15_000_000:
        raise SystemExit("Gallery exceeds publication limits")
