"""Turn a strip-and-manifest creature (TZ-G1, ChatGPT test) into a gallery atlas.

    python tools/creatures/chatgpt/import_strips.py <generator out/> <viewer/atlases/<id>/>

Input: manifest.json, clips/<clip>.png (left-to-right cells), scene/scene.png (72 opaque cells). Output: atlas.json,
p-N.webp (trimmed, de-duplicated sprites) and tiles-0.png (scene tiles shared across phases), the format viewer.mjs
reads. `life` and `showreel` are assembled here from the clips; the painting uses the frame atlas that fits its canvas.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from PIL import Image

PAD = 10  # frame thickness around the field, as in the 160 x 128 paintings
TILE = 24
PAGE = 2048
NAMES = {
    'idle': 'Покой', 'fidget_a': 'Жест 1', 'fidget_b': 'Жест 2', 'look': 'Оглядывается', 'happy': 'Радость',
    'trick': 'Трюк', 'turn': 'Поворот', 'sleep_in': 'Засыпает', 'sleep': 'Сон', 'sleep_out': 'Просыпается',
    'wake_startled': 'Испуг', 'hatch': 'Появление', 'tired': 'Устала',
    'walk_n': 'Шаг на север', 'walk_ne': 'Шаг на северо-восток', 'walk_e': 'Шаг на восток',
    'walk_se': 'Шаг на юго-восток', 'walk_s': 'Шаг на юг', 'walk_sw': 'Шаг на юго-запад', 'walk_w': 'Шаг на запад',
    'walk_nw': 'Шаг на северо-запад',
}


def main(src: Path, dst: Path) -> None:
    manifest = json.loads((src / 'manifest.json').read_text(encoding='utf-8'))
    cw, ch = manifest['cell']
    feet = manifest['feet']
    fps = manifest.get('fps', 24)
    dst.mkdir(parents=True, exist_ok=True)

    sprites: list[Image.Image] = []
    seen: dict[str, int] = {}
    cells: dict[str, list[tuple[int, int, int] | None]] = {}
    for name, meta in manifest['clips'].items():
        strip = Image.open(src / 'clips' / f'{name}.png').convert('RGBA')
        count = strip.width // cw
        rows = []
        for k in range(count):
            cell = strip.crop((k * cw, 0, k * cw + cw, ch))
            box = cell.getbbox()
            if not box:
                rows.append(None)
                continue
            part = cell.crop(box)
            key = hashlib.sha1(part.tobytes() + bytes(str(part.size), 'ascii')).hexdigest()
            if key not in seen:
                seen[key] = len(sprites)
                sprites.append(part)
            rows.append((seen[key], box[0] + PAD, box[1] + PAD))
        cells[name] = rows

    # shelf-pack the sprites in first-use order
    rects, pages, page, x, y, shelf = [], [], None, 0, 0, 0
    for im in sprites:
        w, h = im.size
        if page is None or x + w > PAGE:
            x, y, shelf = 0, y + shelf, 0
        if page is None or y + h > PAGE:
            page = Image.new('RGBA', (PAGE, PAGE), (0, 0, 0, 0))
            pages.append(page)
            x, y, shelf = 0, 0, 0
        page.paste(im, (x, y))
        rects.append([len(pages) - 1, x, y, w, h])
        x += w
        shelf = max(shelf, h)
    names = []
    for i, page in enumerate(pages):
        box = page.getbbox() or (0, 0, 1, 1)
        page.crop((0, 0, box[2], box[3])).save(dst / f'p-{i}.webp', lossless=True, method=5, exact=True)
        names.append(f'p-{i}.webp')

    def row(name, k, ox=0.0, oy=0.0):
        rows = cells[name]
        sprite = rows[min(k, len(rows) - 1)]
        out = [feet[0] + ox, feet[1] + oy, 0, 0, k % 72]
        out.append([sprite[0], round(sprite[1] + ox), round(sprite[2] + oy)] if sprite else None)
        return out + [None, None, None]

    clips = {name: [row(name, k) for k in range(len(rows))] for name, rows in cells.items()}

    # life: a fixed walk around the floor, gestures, a trick, a nap
    life, pos = [], [0.0, 0.0]

    def play(name, frames, move=False):
        speed = manifest['clips'][name].get('speed', [0, 0]) if move else [0, 0]  # screen px per second
        for k in frames:
            life.append(row(name, k, *pos))
            pos[0] += speed[0] / fps
            pos[1] += speed[1] / fps

    timeline = src / 'life-timeline.json'
    if timeline.exists():  # the generator's own life plan; its carry turns are rendered live, here they hold a pose
        for step in json.loads(timeline.read_text(encoding='utf-8')):
            if step['type'] == 'clip':
                a, b = step['source']
                play(step['clip'], range(a, b + 1))
            elif step['type'] == 'walk':
                play(step['clip'], [k % len(cells[step['clip']]) for k in range(len(step['phase_sequence']))], True)
            elif life:
                pos[:] = step.get('offset', pos)
                life += [life[-1]] * step['frames']
    else:
        for name, move in [('idle', False), ('fidget_a', False), ('walk_e', True), ('happy', False),
                           ('walk_w', True), ('trick', False), ('sleep_in', False), ('sleep', False)]:
            if name in cells:
                play(name, range(len(cells[name])), move)
    clips['life'] = life
    showreel = []
    for name in manifest['clips']:
        showreel += clips[name] + [row('idle', k) for k in range(12)]
    clips['showreel'] = showreel

    # scene: 72 cells → base tiles + per-phase changed tiles
    scene = Image.open(src / 'scene' / 'scene.png').convert('RGBA')
    width, height = cw + 2 * PAD, ch + 2 * PAD
    cols, rows_n = -(-width // TILE), -(-height // TILE)
    tiles, tile_ids = [], {}

    def tile_id(im):
        key = hashlib.sha1(im.tobytes()).hexdigest()
        if key not in tile_ids:
            tile_ids[key] = len(tiles)
            tiles.append(im)
        return tile_ids[key]

    def canvas(phase):
        cell = scene.crop((phase * cw, 0, phase * cw + cw, ch))
        full = Image.new('RGBA', (cols * TILE, rows_n * TILE), (0, 0, 0, 255))
        full.paste(cell.resize((cols * TILE, rows_n * TILE), Image.NEAREST), (0, 0))  # edge fill, hidden by the frame
        full.paste(cell, (PAD, PAD))
        return [full.crop(((i % cols) * TILE, (i // cols) * TILE, (i % cols + 1) * TILE, (i // cols + 1) * TILE))
                for i in range(cols * rows_n)]

    base_tiles = canvas(0)
    base = [tile_id(t) for t in base_tiles]
    phases = []
    for p in range(scene.width // cw):
        now = canvas(p)
        phases.append([[i, tile_id(t)] for i, t in enumerate(now) if t.tobytes() != base_tiles[i].tobytes()])
    sheet_cols = 32
    sheet = Image.new('RGBA', (sheet_cols * TILE, -(-len(tiles) // sheet_cols) * TILE))
    for i, t in enumerate(tiles):
        sheet.paste(t, ((i % sheet_cols) * TILE, (i // sheet_cols) * TILE))
    sheet.save(dst / 'tiles-0.png', optimize=True)
    tile_rects = [[0, (i % sheet_cols) * TILE, (i // sheet_cols) * TILE, TILE, TILE] for i in range(len(tiles))]

    animations = {}
    for name, rows in clips.items():
        meta = manifest['clips'].get(name, {})
        n = len(rows)
        animations[name] = {'seconds': n / fps, 'frames': n, 'loop': bool(meta.get('loop', name in ('life', 'showreel'))),
                            'hit': meta.get('hit', []), 'shake': 0, 'stop': 0,
                            'interrupt': sorted(set(list(range(0, n, 6)) + [n - 1]))}
    atlas = {
        'id': manifest['id'], 'rarity': 'uncommon', 'fps': fps, 'canvas': [width, height], 'field': [cw, ch],
        'thickness': PAD, 'origin': feet,
        'scene': {'pages': ['tiles-0.png'], 'rects': tile_rects, 'tile': TILE, 'base': base, 'phases': phases,
                  'props': []},
        'actors': {'pages': names, 'rects': rects}, 'clips': clips, 'animations': animations, 'behavior': False,
    }
    (dst / 'atlas.json').write_text(json.dumps(atlas, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    entry = {'clips': [{'id': n, 'name': NAMES.get(n, n), 'frames': len(clips[n])}
                       for n in ['life'] + list(manifest['clips']) + ['showreel']]}
    (dst / 'catalog-entry.json').write_text(json.dumps(entry, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'{len(sprites)} sprites on {len(pages)} pages, {len(tiles)} scene tiles, {len(clips)} clips')


if __name__ == '__main__':
    main(Path(sys.argv[1]), Path(sys.argv[2]))
