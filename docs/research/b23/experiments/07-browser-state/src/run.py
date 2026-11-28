"""Run an isolated browser test using the unmodified accepted artwork at the pinned git revision."""
import argparse
import hashlib
import io
import json
import mimetypes
import re
import subprocess
import threading
from functools import lru_cache
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

PIN = '60affec40c74f81e8ce886400ea3b07c0d8f5911'
SRC = Path(__file__).resolve().parent
sha = lambda b: hashlib.sha256(b).hexdigest()
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--repo', required=True, type=Path)
parser.add_argument('--state-src', required=True, type=Path)
parser.add_argument('--results', required=True, type=Path)
parser.add_argument('--images', type=Path)
parser.add_argument('--chromium', default='/usr/bin/chromium')
args = parser.parse_args()
args.results.parent.mkdir(parents=True, exist_ok=True)
seen = {}


@lru_cache
def original(path):
    return subprocess.check_output(['git', '-C', str(args.repo), 'show', f'{PIN}:tools/creatures/{path}'])


viewer = original('viewer/viewer.mjs')
draw_start = viewer.index(b'  draw(dt = 0) {')
draw_end = viewer.index(b'\n}\n', draw_start)
method = viewer[draw_start:draw_end]
prefix = viewer[:viewer.index(b'const rarityNames = {')]
module = prefix + b'\nconst featured=null, heroVisible=false;\nexport {loadArtwork};\nexport class NativePaintingSample {\n' + method + b'\n}\n'


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/viewer/stand.html':
            data = (SRC / 'stand.html').read_bytes()
        elif path == '/viewer/native-sample.mjs':
            data = module
        elif path == '/exp/stand.mjs':
            data = (SRC / 'stand.mjs').read_bytes()
        elif path in ['/exp/world.mjs', '/exp/rule.json']:
            data = (args.state_src / path.split('/')[-1]).read_bytes()
        elif re.fullmatch(r'/viewer/[a-zA-Z0-9_./-]+', path) and '..' not in path:
            try:
                data = original(path.lstrip('/'))
            except subprocess.CalledProcessError:
                return self.send_error(404)
        else:
            return self.send_error(404)
        seen[path] = {'bytes': len(data), 'sha256': sha(data)}
        self.send_response(200)
        self.send_header('Content-Type', mimetypes.guess_type(path)[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *unused):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/viewer/stand.html'
captures, buffers = {}, {}
scratch = TemporaryDirectory()
images = args.images or Path(scratch.name)
images.mkdir(exist_ok=True, parents=True)


def shot(page, name, branch, moment, visible=True, sample='after'):
    options = dict(branch=branch, moment=moment, visible=visible, sample=sample)
    record = page.evaluate('(options) => experiment.render(options)', options)
    png = page.locator('#picture').screenshot()
    image = np.asarray(Image.open(io.BytesIO(png)).convert('RGB'))
    assert image.shape == (144, 176, 3)
    buffers[name] = image
    captures[name] = dict(options=options, pngSHA=sha(png), screenRGB=sha(image.tobytes()), **record)
    (images / f'{name}.png').write_bytes(png)


def open_page(context):
    page = context.new_page()
    page.goto(url)
    page.wait_for_function('window.experiment !== undefined')
    return page


try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=args.chromium, args=['--no-sandbox'])
        context = browser.new_context(device_scale_factor=1, viewport={'width': 320, 'height': 240})
        page = open_page(context)
        data = page.evaluate('experiment.data')
        metrics = page.evaluate('''() => {const r=document.querySelector('canvas').getBoundingClientRect();
            return {width:r.width,height:r.height,dpr:devicePixelRatio}}''')
        for branch in ['funded', 'empty']:
            for moment in ['start', 'end', 'repeat']:
                shot(page, f'{branch}_{moment}', branch, moment)
            shot(page, f'{branch}_hidden', branch, 'end', visible=False)
        shot(page, 'before_native', 'funded', 'start', visible=False, sample='before')
        shot(page, 'hit_native', 'funded', 'end', visible=False, sample='hit')
        page.evaluate('experiment.save()')
        page.close()
        page = open_page(context)
        assert data == page.evaluate('experiment.data')
        for branch in ['funded', 'empty']:
            shot(page, f'{branch}_restored', branch, 'restored')
        version = browser.version
        browser.close()
finally:
    server.shutdown()

area = np.zeros((144, 176), dtype=bool)
area[12:16, 12:17] = True
trace = np.zeros_like(area)
trace[118:121, 145:150] = True
comparisons = {}


def compare(label, left, right, expected):
    mask = np.any(buffers[left] != buffers[right], axis=2)
    ys, xs = np.nonzero(mask)
    off = int((mask & ~(area | trace)).sum())
    metrics = [int((mask & area).sum()), int((mask & trace).sum()), off]
    assert metrics == expected, (label, metrics, expected)
    assert (captures[left]['outputRGBA'] == captures[right]['outputRGBA']) == (not mask.any())
    comparisons[label] = dict(left=left, right=right, count=int(mask.sum()), charge=metrics[0],
                              trace=metrics[1], outside=off,
                              box=None if not len(xs) else [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())])


compare('price-and-mark', 'funded_start', 'funded_end', [20, 15, 0])
compare('denied', 'empty_start', 'empty_end', [0, 0, 0])
compare('visible-branches', 'funded_end', 'empty_end', [0, 15, 0])
compare('blind-hidden-branches', 'funded_hidden', 'empty_hidden', [0, 0, 0])
for branch in ['funded', 'empty']:
    for suffix in ['repeat', 'restored']:
        compare(f'{branch}-{suffix}', f'{branch}_end', f'{branch}_{suffix}', [0, 0, 0])
        assert captures[f'{branch}_end']['world'] == captures[f'{branch}_{suffix}']['world']
assert all(captures[f'{b}_hidden']['nativeRGBA'] == captures[f'{b}_hidden']['outputRGBA'] for b in ['funded', 'empty'])
assert len({r['nativeRGBA'] for r in captures.values() if r['options']['sample'] == 'after'}) == 1
assert data['statuses'] == {'funded':['applied', 'duplicate'], 'empty':['insufficient', 'insufficient']}
assert (data['hit']['sample']['tick'], data['after']['tick'], data['after']['anim']) == (504, 573, 'idle')
assert len({captures[n]['nativeRGBA'] for n in ['before_native', 'hit_native', 'empty_hidden']}) == 3
assert metrics == dict(width=176, height=144, dpr=1)
result = dict(revision=PIN, browser=version, css=metrics, scenario=data, captures=captures,
              comparisons=comparisons, upstreamViewerSHA=sha(viewer), upstreamDrawBodySHA=sha(method),
              sources=dict(sorted(seen.items())))
args.results.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
