"""Record the gallery's Rat King player. Requires Python Playwright, Chromium and FFmpeg."""
import argparse
import base64
import json
import math
import os
import shutil
import subprocess
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

FPS = 24
VIEWER = Path(__file__).resolve().parents[2] / 'viewer'


class GalleryFiles(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


# Canvas and the life clock belong to the gallery. Only the captions are added here.
BOOT = """async () => {
  const { loadKingPainting } = await import('/king-painting.mjs');
  const { createBattle } = await import('/f1-native.mjs');
  const picture = await loadKingPainting();
  const battle = createBattle();
  const canvas = document.createElement('canvas');
  const [w,h] = picture.size;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const output = document.createElement('canvas');
  output.width = w; output.height = h + 30;
  const out = output.getContext('2d');
  window.recordFrame = (clip, dir, frame, stage, label) => {
    if (clip === 'life') {
      if (frame > 0) battle.advance(1/24);
      picture.render(ctx, {clip, battle, tick:frame});
      label = battle.returning ? 'Передышка · возвращение к узлу'
        : ['I · Тесак и крышка','II · Стража','III · Узел лопнул','IV · Рельс'][battle.stage-1];
    } else {
      picture.render(ctx, {clip, direction:dir, time:frame/24, stage});
    }
    out.drawImage(canvas,0,0);
    out.fillStyle = '#211b19'; out.fillRect(0,h,w,30);
    out.font = '16px sans-serif'; out.textAlign = 'center';
    out.fillStyle = '#fff0cc'; out.fillText(label,w/2,h+20,w-12);
    return [output.toDataURL('image/png').split(',')[1],battle.cycle];
  };
  return picture.clips;
}"""

SAVE_BATCH = """({clip,direction,start,count,stage,label}) =>
    Array.from({length:count},(_,i)=>window.recordFrame(clip,direction,start+i,stage,label))"""


def write_frames(page, directory, *, clip, start, count, direction=0, stage=1, label='', offset=0):
    frames = page.evaluate(SAVE_BATCH, dict(clip=clip, direction=direction, start=start,
                                            count=count, stage=stage, label=label))
    cycles = []
    for i, (encoded, cycle) in enumerate(frames):
        (directory / f'{offset + start + i:05}.png').write_bytes(base64.b64decode(encoded))
        cycles.append(cycle)
    return cycles


def showreel(page, clips, directory):
    directions = ['В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ', 'С', 'СВ']
    stage_for = {'summon': 2, 'swap': 4, 'sweepAim': 4, 'leapAim': 4, 'leap': 4,
                 'happy': 3, 'trick': 3, 'sleep_in': 3, 'sleep': 3, 'sleep_out': 3}
    single = [(clip, 0) for clip in clips]
    strike = next(c for c in clips if c['id'] == 'cleaveAim')
    sequence = single + [(strike, d) for d in range(8)]
    index, offset = [], 0
    for clip, direction in sequence:
        n = max(1, math.ceil(FPS * clip['duration'] - 1e-7))
        stage = stage_for.get(clip['id'], 1)
        label = f"{clip['name']} · {directions[direction]}"
        index.append(dict(clip=clip['id'], direction=direction, stage=stage, first=offset, frames=n))
        for start in range(0, n, 12):
            write_frames(page, directory, clip=clip['id'], start=start, count=min(12, n-start),
                         direction=direction, stage=stage, label=label, offset=offset)
        offset += n
    return index


def life(page, directory):
    start, end = 0, None
    while end is None or start < end:
        if start >= 180 * FPS:
            raise ValueError('The king did not complete the four stages in 180 seconds')
        count = 12 if end is None else min(12, end-start)
        cycles = write_frames(page, directory, clip='life', start=start, count=count)
        if end is None and any(cycles):
            end = start + next(i for i, c in enumerate(cycles) if c) + FPS
        start += count
    return [dict(clip='life', frames=start)]


def encode(directory, target):
    palette = ('[0:v]split[colors][pixels];[colors]palettegen=stats_mode=diff[p];'
               '[pixels][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', str(FPS), '-i',
                    str(directory / '%05d.png'), '-filter_complex_threads', '1',
                    '-filter_complex', palette, '-loop', '0', str(target)], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('out', type=Path, help='output directory outside the repository')
    parser.add_argument('--only', choices=['showreel', 'life'])
    parser.add_argument('--chromium', default=os.environ.get('CHROMIUM') or shutil.which('chromium'))
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(GalleryFiles, directory=str(VIEWER)))
    Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=args.chromium)
            for selection in [args.only] if args.only else ['showreel', 'life']:
                page = browser.new_page()
                # A blank same-origin page avoids starting the unrelated collection thumbnails.
                url = f'http://127.0.0.1:{server.server_port}/capture'
                page.route(url, lambda route: route.fulfill(content_type='text/html', body='<!doctype html>'))
                page.goto(url)
                clips = page.evaluate(BOOT)
                if len(clips) != 28:
                    raise ValueError(f'Expected all 28 gallery clips, got {len(clips)}')
                directory = args.out / 'frames' / selection
                directory.mkdir(parents=True, exist_ok=True)
                if any(directory.iterdir()):
                    raise ValueError(f'Choose an empty frame directory: {directory}')
                index = showreel(page, clips, directory) if selection == 'showreel' else life(page, directory)
                (directory.parent / f'{selection}.json').write_text(json.dumps(index, ensure_ascii=False, indent=2))
                page.close()
                encode(directory, args.out / f'rat-king-{selection}.gif')
                print(f'{selection}: {sum(c["frames"] for c in index)} frames at {FPS} fps', flush=True)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
