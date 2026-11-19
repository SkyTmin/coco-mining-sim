"""Pack lossless layers from render.ts into a static viewer. Run with creature IDs."""
import argparse
import hashlib
import json
import shutil
import tempfile
from pathlib import Path

from PIL import Image

from viewer_repack import repack

HERE = Path(__file__).resolve().parent
DEFAULT_ASSETS = HERE.parent.parent / 'assets/creatures'
LAYERS = ('fxu', 'body', 'lit', 'fxo')
TILE = 24


def load(path):
    return json.loads(path.read_text())


def save(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')


class Atlas:
    """Deduplicate trimmed sprites, and shelf-pack taller rectangles first."""

    def __init__(self):
        self.by_hash = {}
        self.images = []

    def add(self, image):
        key = (image.size, hashlib.sha256(image.tobytes()).digest())
        if key not in self.by_hash:
            self.by_hash[key] = len(self.images)
            self.images.append(image)
        return self.by_hash[key]

    def trim(self, image):
        bounds = image.getbbox()
        if bounds is None:
            return None
        return [self.add(image.crop(bounds)), *bounds[:2]]

    def write(self, directory, prefix):
        side = 1024
        indexed = sorted(enumerate(self.images), key=lambda item: -item[1].height)
        rects = [None] * len(indexed)
        pages = []
        page = Image.new('RGBA', (side, side))
        x = y = height = width_used = 0

        def finish():
            filename = f'{prefix}-{len(pages)}.png'
            page.crop((0, 0, width_used, y + height)).save(directory / filename, compress_level=9)
            pages.append(filename)

        for index, image in indexed:
            w, h = image.size
            if max(w, h) > side:
                raise ValueError(f'Sprite {index} exceeds texture size')
            if x + w > side:
                y += height
                x = height = 0
            if y + h > side:
                # The last row ends at y, with zero height after wrapping.
                finish()
                page = Image.new('RGBA', (side, side))
                x = y = height = width_used = 0
            rects[index] = [len(pages), x, y, w, h]
            page.paste(image, (x, y))
            x += w
            width_used = max(width_used, x)
            height = max(height, h)
        if indexed:
            finish()
        return {'pages': pages, 'rects': rects}


def material(directory, paths, front=()):
    """Tile an entire animated material once; each phase stores changes from phase zero."""
    if len(paths) != 72:
        raise ValueError(f'Expected 72 scenery phases in {directory}, found {len(paths)}')
    atlas = Atlas()
    base, phases = [], []
    for index, path in enumerate(paths):
        with Image.open(path) as image:
            image = image.convert('RGBA')
        w, h = image.size
        ids = []
        for top in range(0, h, TILE):
            for left in range(0, w, TILE):
                tile = image.crop((left, top, min(w, left + TILE), min(h, top + TILE)))
                ids.append(atlas.add(tile) if tile.getbbox() else -1)
        if index == 0:
            base = ids
        phases.append([[i, val] for i, val in enumerate(ids) if base[i] != val])
    props = []
    for depth, path in sorted(front):
        with Image.open(path) as image:
            sprite = atlas.trim(image.convert('RGBA'))
        if sprite:
            props.append([depth, *sprite])
    return {**atlas.write(directory, 'tiles'), 'tile': TILE, 'base': base, 'phases': phases, 'props': props}


def pack_actor(source, dest, ident, meta, scene, rarity):
    has_behavior = (source / 'behavior.json').is_file()
    names = list(meta['animations'])
    clips = {}
    sprites = Atlas()
    for name in names:
        directory = source / 'frames' / name
        track = load(directory / 'motion.json')
        if len(track) != meta['animations'][name]['frames']:
            raise ValueError(f'{ident}/{name}: frame count differs from metadata')
        layers = (*LAYERS, 'over') if (directory / 'over').is_dir() else LAYERS
        frames = []
        for n, sample in enumerate(track):
            # Feet and camera are in field pixels. Sprite origins include the border and shake.
            row = [*sample['feet'], *sample['camera'], sample['backgroundFrame']]
            for layer in layers:
                with Image.open(directory / layer / f'{n:03d}.png') as image:
                    row.append(sprites.trim(image.convert('RGBA')))
            frames.append(row)
        clips[name] = frames
    origin = list(clips['idle'][0][:2]) if has_behavior else None
    if has_behavior:
        shutil.copyfile(source / 'behavior.json', dest / 'behavior.json')
    save(dest / 'atlas.json', {
        'id': ident, 'rarity': rarity, 'fps': meta['fps'], 'canvas': meta['canvas'],
        'field': meta['field'], 'thickness': meta['thickness'], 'origin': origin, 'scene': scene,
        'actors': sprites.write(dest, 'sprites'), 'clips': clips,
        'animations': {name: meta['animations'][name] for name in names}, 'behavior': has_behavior,
    })
    return f'{len(clips)} clips, {len(sprites.images)} unique sprites'


def pack(assets, out, ident):
    source = assets / ident
    meta = load(source / 'meta.json')
    rarity = meta['rarity']
    frame_dir = out / 'frames' / rarity
    frame_dir.mkdir(parents=True, exist_ok=True)
    # Several creatures can share a border. Rebuild it from the canonical material.
    frame = material(frame_dir, sorted((assets / 'frames' / rarity / 'loop').glob('*.png')))
    save(frame_dir / 'atlas.json', frame)
    with tempfile.TemporaryDirectory(dir=out) as temporary:
        dest = Path(temporary)
        front = [(obj['depth'], source / 'bg/front' / (obj['id'] + '.png'))
                 for obj in load(source / 'bg/front-depth.json')]
        scene = material(dest, sorted((source / 'bg/loop').glob('*.png')), front)
        if ident == 'rat_king':
            save(dest / 'scene.json', {**scene, 'canvas': meta['canvas']})
            description = 'native F1 painting, throne room material'
        else:
            description = pack_actor(source, dest, ident, meta, scene, rarity)
        generated = list(dest.iterdir())
        files = generated + list(frame_dir.iterdir())
        total = sum(f.stat().st_size for f in files)
        if any(f.stat().st_size > 15_000_000 for f in files):
            raise ValueError(f'{ident} contains a file over 15 MB')
        target = out / ident
        target.mkdir(exist_ok=True)
        current = {f.name for f in generated}
        for path in generated:
            path.replace(target / path.name)
        for path in target.iterdir():
            if path.is_file() and path.name not in current:
                path.unlink()
        # Frames that play together onto the same page, lossless WebP (viewer_repack.py).
        repack(target)
        print(f'{ident}: {description}, {total:,} bytes including shared border', flush=True)


if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('ids', nargs='+')
    cli.add_argument('--assets', type=Path, default=DEFAULT_ASSETS)
    cli.add_argument('--out', type=Path, default=HERE / 'viewer/atlases')
    args = cli.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    for ident in args.ids:
        pack(args.assets, args.out, ident)
