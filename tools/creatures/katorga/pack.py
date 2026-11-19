"""Build external viewer atlases from a read-only game checkout and boss captures."""

import argparse
import importlib.util
import math
import re
import shutil
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("viewer_atlas", HERE.parent / "viewer-atlas.py")
viewer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(viewer)
RARITIES = ("common", "uncommon", "rare", "epic", "legendary", "mythic", "secret")
BORDERS = dict(
    zip(
        RARITIES,
        [
            (176, 144, 8),
            (180, 148, 10),
            (232, 184, 12),
            (236, 188, 14),
            (288, 240, 16),
            (292, 244, 18),
            (292, 244, 18),
        ],
    )
)
PET_CLIPS = {
    "idle": "Покой",
    "walk": "Ходьба",
    "work": "Трюк",
    "happy": "Радость",
    "attack": "Атака",
    "sleep": "Сон",
}


def neutral(out):
    target = out / "neutral"
    target.mkdir(exist_ok=True)
    width, height = 292, 244
    image = Image.new("RGB", (width, height))
    for y in range(height):
        for x in range(width):
            floor = max(0, min(1, (y - 170) / 23))
            glow = math.exp(-(((x - 145) / 142) ** 2) - ((y - 121) / 115) ** 2)
            shade = math.exp(-(((x - 145) / 73) ** 2) - ((y - 189) / 11) ** 2)
            image.putpixel((x, y), tuple(round(c + glow * 9 + floor * 4 - shade * 14) for c in (41, 42, 48)))
    image.save(target / "wall.png")
    viewer.save(
        target / "atlas.json",
        {
            "canvas": [width, height],
            "pages": ["wall.png"],
            "rects": [[0, 0, 0, width, height]],
            "tile": width,
            "base": [0],
            "phases": [[]],
            "props": [],
        },
    )


def write_sheets(target, images):
    """Pack into lossless WebP pages sized for mobile texture limits."""
    limit = 2048
    rects = [None] * len(images)
    pages = []
    page = Image.new("RGBA", (limit, limit))
    x = y = row_height = used = 0

    def finish():
        filename = f"sprites-{len(pages)}.webp"
        page.crop((0, 0, used, y + row_height)).save(target / filename, lossless=True, method=2)
        pages.append(filename)

    for index, sprite in sorted(enumerate(images), key=lambda item: -item[1].height):
        w, h = sprite.size
        if max(w, h) > limit:
            raise ValueError(f"Sprite {index} exceeds {limit}px")
        if x + w > limit:
            y += row_height
            x = row_height = 0
        if y + h > limit:
            finish()
            page = Image.new("RGBA", (limit, limit))
            x = y = row_height = used = 0
        page.paste(sprite, (x, y))
        rects[index] = [len(pages), x, y, w, h]
        x += w
        row_height = max(row_height, h)
        used = max(used, x)
    finish()
    return {"pages": pages, "rects": rects}


def view_geometry(rarity, bounds, feet, minimum_zoom):
    x0, y0, x1, y1 = bounds
    w, h, t = BORDERS[rarity]
    zoom = max(minimum_zoom, (x1 - x0 + 10) / (w - 2 * t), (y1 - y0 + 10) / (h - 2 * t))
    # Use uniform border scaling so edge textures and frame openings remain aligned.
    width, height, pad = round(w * zoom), round(h * zoom), math.ceil(t * zoom)
    ox = max(pad + 4 - x0, min(width - pad - 4 - x1, width // 2 - feet[0]))
    oy = max(pad + 4 - y0, min(height - pad - 4 - y1, round(height * 0.78) - feet[1]))
    return width, height, pad, ox, oy


def boss_views(data):
    """One steady camera per clip. Preserve the original offsets throughout the shot."""
    views = {}
    for key, rows in data["clips"].items():
        bounds = [float("inf")] * 2 + [float("-inf")] * 2
        for row in rows:
            index, x, y = row[6]
            w, h = data["actors"]["rects"][index][3:]
            bounds = [min(bounds[0], x), min(bounds[1], y), max(bounds[2], x + w), max(bounds[3], y + h)]
        feet = [v + data["thickness"] for v in rows[0][:2]]
        width, height, pad, dx, dy = view_geometry("secret", bounds, feet, 0.33)
        views[key] = {
            "canvas": [width, height],
            "field": [width - 2 * pad, height - 2 * pad],
            "thickness": pad,
            "offset": [dx, dy],
        }
    return views


def pack(out, ident, rarity, records, bounds, sprites, name, feet):
    """Place every registered pose in a single common coordinate system without resampling."""
    minimum_zoom = 0.45 if rarity == "secret" else 1
    width, height, pad, ox, oy = view_geometry(rarity, bounds, feet, minimum_zoom)
    clips, anims, summary = {}, {}, []
    for clip, title, fps, frames in records:
        rows = []
        for index, x, y in frames:
            x, y = x + ox, y + oy
            sw, sh = sprites.images[index].size
            if not (pad < x and pad < y and x + sw < width - pad and y + sh < height - pad):
                raise ValueError(f"{ident}/{clip}: frame intersects border")
            rows.append([feet[0] + ox - pad, feet[1] + oy - pad, 0, 0, 0, None, [index, x, y], None, None])
        if not rows:
            raise ValueError(f"{ident}/{clip}: no frames")
        clips[clip] = rows
        anims[clip] = {"frames": len(rows), "seconds": len(rows) / fps, "fps": fps, "loop": True}
        summary.append({"id": clip, "name": title, "frames": len(rows)})
    target = out / ident
    target.mkdir(exist_ok=True)
    actors = write_sheets(target, sprites.images)
    data = {
        "id": ident,
        "name": name,
        "clipNames": {item["id"]: item["name"] for item in summary},
        "rarity": rarity,
        "canvas": [width, height],
        "field": [width - 2 * pad, height - 2 * pad],
        "thickness": pad,
        "borderCanvas": list(BORDERS[rarity][:2]),
        "fps": records[0][2],
        "scene": "../neutral/atlas.json",
        "actors": actors,
        "clips": clips,
        "animations": anims,
        "behavior": False,
    }
    if rarity == "secret":
        data["views"] = boss_views(data)
    viewer.save(target / "atlas.json", data)
    for path in target.glob("sprites-*.*"):
        if path.name not in actors["pages"]:
            path.unlink()
    return summary


def frame(sprites, bounds, image, xy=(0, 0)):
    trimmed = sprites.trim(image)
    if trimmed is None:
        raise ValueError("Empty source frame")
    index, x, y = trimmed
    x, y = x + xy[0], y + xy[1]
    w, h = sprites.images[index].size
    bounds[:] = [min(bounds[0], x), min(bounds[1], y), max(bounds[2], x + w), max(bounds[3], y + h)]
    return [index, x, y]


def pets(out, game):
    definitions = (game / "src/lib/pets.ts").read_text().split("export const PETS:")[1].split("];")[0]
    species = re.findall(r"pet\('([^']+)', '([^']+)', (\d+)", definitions)
    assert len(species) == 18
    metadata = (game / "src/lib/pet-pixel-sprites.ts").read_text()
    entries = []
    for key, name, rarity in species:
        meta = metadata.split("\n  " + key + ": {")[1].split("\n  },")[0].split("large: {")[1]
        rarity = RARITIES[int(rarity)]
        ident = "pet_" + key
        box = int(re.search(r"box: (\d+)", meta)[1])
        variants = []
        for suffix, variant, label in [("", "base", "Обычный"), ("-v1", "gold", "Золотой")]:
            atlas = ident if not suffix else ident + "_gold"
            records, sprites, bounds = [], viewer.Atlas(), [float("inf")] * 2 + [float("-inf")] * 2
            for clip, title in PET_CLIPS.items():
                fields = {
                    k: int(v)
                    for k, v in re.findall(r"(\w+): (-?\d+)", meta.split(clip + ": {")[1].split("}")[0])
                }
                n, fps, x, y, w, h = (fields[k] for k in ("n", "fps", "x", "y", "w", "h"))
                # Both skins use these same registered strip rectangles in PetArt.
                bounds[:] = [
                    min(bounds[0], x),
                    min(bounds[1], y),
                    max(bounds[2], x + w),
                    max(bounds[3], y + h),
                ]
                with Image.open(game / "public/ui/pets" / key / (clip + "-l" + suffix + ".webp")) as strip:
                    assert strip.size == (n * w, h), (key, clip, strip.size)
                    strip = strip.convert("RGBA")
                    frames = [
                        frame(sprites, bounds, strip.crop((i * w, 0, (i + 1) * w, h)), (x, y))
                        for i in range(n)
                    ]
                records.append((clip, title, fps, frames))
            summary = pack(out, atlas, rarity, records, bounds, sprites, name, (box // 2, box))
            variants.append({"id": variant, "name": label, "atlas": atlas})
        entries.append(
            {
                "id": ident,
                "name": name,
                "section": "pets",
                "rarity": rarity,
                "clips": summary,
                "variants": variants,
            }
        )
    return entries


def bosses(out, source, ids=()):
    entries = []
    manifests = (
        [viewer.load(source / ident / "manifest.json") for ident in ids]
        if ids
        else viewer.load(source / "manifest.json")
    )
    for boss in manifests:
        records, sprites, bounds = [], viewer.Atlas(), [float("inf")] * 2 + [float("-inf")] * 2
        for clip in boss["clips"]:
            frames = []
            for filename in clip["frames"]:
                with Image.open(source / filename) as img:
                    frames.append(frame(sprites, bounds, img.convert("RGBA")))
            records.append((clip["id"], clip["name"], clip["fps"], frames))
        ident = boss["id"]
        idle = next((r for r in records if r[0] == "idle"), records[0])
        index, x, y = idle[3][0]
        rest = sprites.images[index]
        feet = (x + rest.width // 2, y + rest.height)
        summary = pack(out, ident, "secret", records, bounds, sprites, boss["name"], feet)
        entries.append(
            {
                "id": ident,
                "name": boss["name"],
                "section": "bosses",
                "rarity": "secret",
                "floor": boss["floor"],
                "clips": summary,
            }
        )
    return entries


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--game", type=Path)
    cli.add_argument("--bosses", type=Path)
    cli.add_argument("--boss-id", action="append", default=[], help="pack one completed boss capture")
    cli.add_argument("--out", type=Path, default=HERE.parent / "viewer/atlases")
    cli.add_argument("--catalog", required=True, type=Path)
    args = cli.parse_args()
    args.out.mkdir(exist_ok=True, parents=True)
    neutral(args.out)
    entries = bosses(args.out, args.bosses, args.boss_id) if args.bosses else []
    if args.game:
        shutil.copyfile(args.game / "LICENSE", args.out / "neutral/LICENSE.txt")
        entries += pets(args.out, args.game)
    viewer.save(args.catalog, entries)
