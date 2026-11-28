"""Pixel regression for viewer-atlas.py → lossless WebP → mobile Painting.draw.
Run with python test/scenery-viewer.py (Pillow, Playwright and Chromium).
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Thread
import base64
import io
import runpy
import shutil
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

TOOLS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(TOOLS))
atlas = runpy.run_path(str(TOOLS / 'viewer-atlas.py'))
CANVAS = (36, 28)
ORIGIN = (12, 16)
BLACK, RED, GOLD, VIOLET, BLUE = '#101010', '#b01a19', '#ffbb10', '#9436cc', '#1391fa'


def png(path, points=(), base=None):
    image = Image.new('RGBA', CANVAS, base)
    for point, color in points:
        image.paste(color, (*point, point[0] + 1, point[1] + 1))
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path)


def fixture(root):
    source, dest = root / 'raw', root / 'atlases/probe'
    border = root / 'atlases/frames/mythic'
    for directory in (source, dest, border):
        directory.mkdir(parents=True)
    atlas['save'](source / 'behavior.json', {})
    png(source / 'bg.png', base=BLACK)
    png(source / 'rail.png')
    atlas['save'](border / 'atlas.json', atlas['material'](border, [source / 'rail.png'] * 72))
    scene = atlas['material'](dest, [source / 'bg.png'] * 72)
    counts = {'idle': 1, 'trick': 1, 'phase': 3, 'idle-f2': 1, 'showreel': 2}
    for name, count in counts.items():
        clip, track = source / 'frames' / name, []
        for n in range(count):
            sample = dict(feet=ORIGIN, camera=[0, 0], backgroundFrame=n)
            file = f'{n:03}.png'
            for layer in atlas['LAYERS']:
                points = []
                if layer == 'body':
                    color = [RED, VIOLET, BLUE][n] if name == 'phase' else BLUE if name == 'idle-f2' else RED
                    points = [((14, 17), color)]
                if layer == 'fxo' and name == 'trick':
                    points = [((14, 16), GOLD)]
                png(clip / layer / file, points)
            if name == 'idle':
                sample['waterContacts'] = [[14, 16, 0, 0, 4]]
            if name == 'trick':
                png(clip / 'light' / file, [((14, 17), '#407060'), ((0, 13), '#ffffff')])
                png(clip / 'backdrop' / file, [((8, 9), VIOLET)])
                sample['sceneryRays'] = [[12, 14, 28, 4, BLUE, 1]]
            if name == 'showreel' and n == 1:
                png(clip / 'over' / file, [((0, 13), GOLD)])
            track.append(sample)
        atlas['save'](clip / 'motion.json', track)
    meta = dict(waterRows=[[12, 32] for _ in range(24)], animations={name: dict(frames=n) for name, n in counts.items()},
                fps=24, canvas=CANVAS, field=[32, 24], thickness=2)
    atlas['pack_actor'](source, dest, 'probe', meta, scene, 'mythic')
    atlas['repack'](dest)


# Expose a clock for the private player only in the temporary page. Loading, page prefetch,
# decoding, anchors, clipping, depth, ray rasterization and phase selection use the real viewer.
DRIVER = """
const player = new Painting(hero, {id:'probe', name:'Probe', section:'ours', clips:[{id:'idle'}]});
player.surface = await loadArtwork('probe', null, () => 0);
player.visible = true;
window.sample = async (state) => {
  player.previous = null;
  player.heldSample = state;
  for (let attempt = 0; attempt < 100; attempt++) {
    player.draw(0);
    if (!player.heldSample) return player.ctx.canvas.toDataURL();
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error('fixture frame did not load');
};
"""


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def run(root):
    fixture(root)
    viewer = TOOLS / 'viewer'
    for name in ('behavior.mjs', 'material.mjs', 'scenery.mjs', 'water.mjs'):
        shutil.copyfile(viewer / name, root / name)
    main = (viewer / 'viewer.mjs').read_text()
    (root / 'viewer.mjs').write_text(main[:main.index('start().catch(')] + DRIVER)
    (root / 'index.html').write_text('<button class="feature-painting"><canvas></canvas></button>'
                                    '<script type="module" src="./viewer.mjs"></script>')
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=root))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            with p.chromium.launch(executable_path=shutil.which('chromium')) as browser:
                page = browser.new_page(**p.devices['Pixel 7'])
                page.goto(f'http://127.0.0.1:{server.server_port}/')
                page.wait_for_function('typeof window.sample === "function"')

                def sample(name, frame=0, at=None):
                    state = dict(anim=name, frame=frame, tick=0)
                    if at:
                        state['at'] = at
                    data = page.evaluate('s => window.sample(s)', state).split(',')[1]
                    return Image.open(io.BytesIO(base64.b64decode(data))).convert('RGB')

                def check(image, x, y, color):
                    actual = image.getpixel((x, y))
                    assert actual == tuple(bytes.fromhex(color[1:])), (x, y, actual, color)

                wet = sample('idle')
                dry = sample('idle', at=[6 / 32, 6 / 24])
                check(wet, 16, 16, '#6da8b3')  # same paw, submerged at its field position
                check(dry, 10, 6, BLACK)  # the wake has moved onto sand and disappears
                seated = sample('trick')
                moved = sample('trick', at=[6 / 32, 6 / 24])
                for image in (seated, moved):
                    check(image, 8, 9, VIOLET)  # fixed wall ornament
                    check(image, 30, 6, BLUE)  # fixed endpoint
                check(seated, 14, 17, '#f08a79')  # light adds to red body ink
                check(moved, 8, 7, '#f08a79')
                check(seated, 0, 13, '#000000')  # additive light remains inside the frame
                check(seated, 14, 16, GOLD)
                check(seated, 17, 6, BLACK)
                check(moved, 8, 6, GOLD)  # hand and dust/glint translate
                check(moved, 17, 6, BLUE)  # beam is now horizontal
                check(moved, 14, 16, BLACK)
                check(sample('showreel', 1), 0, 13, GOLD)
                check(sample('showreel', 0), 0, 13, '#000000')  # no lingering over-frame sprite
                indices = [('phase', 0), ('phase', 1), ('phase', 2), ('idle-f2', 0),
                           ('phase', 2), ('phase', 1), ('phase', 0)]
                for (name, n), color in zip(indices, [RED, VIOLET, BLUE, BLUE, BLUE, VIOLET, RED]):
                    check(sample(name, n, [6 / 32, 6 / 24]), 8, 7, color)
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    with TemporaryDirectory() as temporary:
        run(Path(temporary))
    print('Mobile packed pixels passed: shoreline contact, anchored wall and rays, translated glint, both phase directions, sparse show overlap.')
