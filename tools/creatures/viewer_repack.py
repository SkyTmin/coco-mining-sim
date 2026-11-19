"""Repack a viewer atlas so frames that play together sit on the same page.

The packers sorted sprites by height, which scatters neighbouring frames: the first second of the Crater
titan's `life` touched 21 of 32 pages (11 MB) before a frame could play. Here sprites are laid out in the
order they are first shown (`life` first, then every other clip), a page at a time, and each page is shelf
packed tallest first inside itself. Pages are lossless WebP, trimmed to their used area. Sprite ids, rows
and clips stay as they are; only `actors.pages` and `actors.rects` change.

    python tools/creatures/viewer_repack.py            # every atlas in tools/creatures/viewer/atlases
    python tools/creatures/viewer_repack.py coin_dragon f12boss
"""
import argparse
import json
from collections import OrderedDict
from pathlib import Path

from PIL import Image

ATLASES = Path(__file__).resolve().parent / 'viewer' / 'atlases'
SIDE = 2048  # 1024 gave 688 pages: over the 511 files an artifact version may hold
FILL = 0.78  # take sprites for a page until this share of its area is claimed


def first_use_order(atlas):
    clips = atlas['clips']
    names = (['life'] if 'life' in clips else []) + [name for name in clips if name != 'life']
    order, seen = [], set()
    for name in names:
        for row in clips[name]:
            for sprite in row[5:]:
                if sprite and sprite[0] not in seen:
                    seen.add(sprite[0])
                    order.append(sprite[0])
    order += [i for i in range(len(atlas['actors']['rects'])) if i not in seen]
    return order


def shelf(ids, size):
    """Place as many of `ids` as fit on one page, tallest first. Returns (placements, leftovers, w, h)."""
    placed, rest = [], []
    x = y = shelf_h = used_w = 0
    for i in sorted(ids, key=lambda i: -size[i][1]):
        w, h = size[i]
        if x + w > SIDE:
            y += shelf_h
            x = shelf_h = 0
        if y + h > SIDE or w > SIDE:
            rest.append(i)
            continue
        placed.append((i, x, y))
        x += w
        shelf_h = max(shelf_h, h)
        used_w = max(used_w, x)
    return placed, rest, used_w, y + shelf_h


def layout(order, size):
    queue = list(order)
    pages = []
    while queue:
        first = queue[0]
        if size[first][0] > SIDE or size[first][1] > SIDE:  # oversized sprite: a page of its own
            queue.pop(0)
            pages.append(([(first, 0, 0)], size[first][0], size[first][1]))
            continue
        take, area = [], 0
        for i in queue:
            a = size[i][0] * size[i][1]
            if take and area + a > FILL * SIDE * SIDE:
                break
            if size[i][0] > SIDE or size[i][1] > SIDE:
                break
            take.append(i)
            area += a
        placed, rest, w, h = shelf(take, size)
        if not placed:
            raise RuntimeError('cannot place sprite %d' % take[0])
        done = {i for i, _, _ in placed}
        queue = [i for i in queue if i not in done]
        pages.append((placed, w, h))
    return pages


class Pages:
    """Old pages, opened on demand; a handful stay decoded."""

    def __init__(self, directory, names, keep=6):
        self.directory, self.names, self.keep = directory, names, keep
        self.open = OrderedDict()

    def get(self, index):
        if index in self.open:
            self.open.move_to_end(index)
            return self.open[index]
        with Image.open(self.directory / self.names[index]) as image:
            page = image.convert('RGBA')
        self.open[index] = page
        while len(self.open) > self.keep:
            self.open.popitem(last=False)
        return page


def repack(directory):
    path = directory / 'atlas.json'
    atlas = json.loads(path.read_text())
    actors = atlas.get('actors')
    if not actors or not actors.get('rects') or 'clips' not in atlas:
        return None
    old_rects, old_names = actors['rects'], actors['pages']
    size = [(r[3], r[4]) for r in old_rects]
    old = Pages(directory, old_names)
    new_rects = [None] * len(old_rects)
    new_names = []
    before = sum((directory / n).stat().st_size for n in old_names)
    for n, (placed, w, h) in enumerate(layout(first_use_order(atlas), size)):
        page = Image.new('RGBA', (max(1, w), max(1, h)), (0, 0, 0, 0))
        for i, x, y in placed:
            p, sx, sy, sw, sh = old_rects[i]
            page.paste(old.get(p).crop((sx, sy, sx + sw, sy + sh)), (x, y))
            new_rects[i] = [n, x, y, sw, sh]
        name = 'p-%d.webp' % n
        page.save(directory / (name + '.tmp'), 'WEBP', lossless=True, quality=100, method=5, exact=True)
        new_names.append(name)
    # Every sprite must come back pixel for pixel before the old pages go.
    fresh = {}
    for i, (p, x, y, w, h) in enumerate(new_rects):
        if p not in fresh:
            with Image.open(directory / (new_names[p] + '.tmp')) as image:
                fresh[p] = image.convert('RGBA')
        q, sx, sy, _, _ = old_rects[i]
        a = fresh[p].crop((x, y, x + w, y + h)).tobytes()
        b = old.get(q).crop((sx, sy, sx + w, sy + h)).tobytes()
        if a != b:
            raise RuntimeError('%s: sprite %d differs after repacking' % (directory.name, i))
    for name in old_names:
        (directory / name).unlink()
    for name in new_names:
        (directory / (name + '.tmp')).rename(directory / name)
    actors['pages'], actors['rects'] = new_names, new_rects
    path.write_text(json.dumps(atlas, ensure_ascii=False, separators=(',', ':')) + '\n')
    after = sum((directory / n).stat().st_size for n in new_names)
    return len(old_names), len(new_names), before, after


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('ids', nargs='*')
    args = parser.parse_args()
    ids = args.ids or sorted(p.name for p in ATLASES.iterdir() if (p / 'atlas.json').exists())
    for ident in ids:
        result = repack(ATLASES / ident)
        if result:
            pages_before, pages_after, before, after = result
            print('%-20s pages %3d -> %3d  %6.2f MB -> %6.2f MB' % (ident, pages_before, pages_after, before / 1e6, after / 1e6))


if __name__ == '__main__':
    main()
