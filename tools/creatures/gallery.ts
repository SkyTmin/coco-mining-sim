// Pilot comparison plates. All nine sprites share a ground line and native pixel pitch.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { Px } from './rig/px';
import { compose } from './engine';
import { indexed } from './render-io';
import gifenc from 'gifenc';
import { loadPainting } from './render';
import { sizes } from './types';
import type { RGBA } from './rig/f15-rig';

const here = dirname(fileURLToPath(import.meta.url));
const output = join(here, '../../docs/reports/creatures/pilot-2');
const ids = [
  'bramble_warden',
  'gem_beetle',
  'silk_dragon',
  'frost_yeti',
  'toad_shaman',
  'crater_titan',
  'coin_dragon',
];
const paper: RGBA = [34, 31, 38, 255];
function copy(dst: Px, src: Px, left: number, top: number) {
  left = Math.round(left);
  top = Math.round(top);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const i = (src.w * y + x) * 4;
      if (src.data[i + 3]) dst.set(left + x, top + y, src.get(x, y));
    }
  }
}
function matte(w: number, h: number, color: RGBA) {
  const p = new Px(w, h);
  for (let i = 0; i < p.data.length; i += 4) p.data.set(color, i);
  return p;
}
function centered(row: Px[], gap: number, width: number) {
  const total = row.reduce((s, p) => s + p.w, 0) + gap * (row.length - 1);
  let x = Math.floor((width - total) / 2);
  return row.map((p) => {
    const left = x;
    x += p.w + gap;
    return left;
  });
}
// Report previews keep the prior picture on screen. Only changed pixels consume a
// palette slot at the next tick, leaving the full-resolution release untouched.
class PreviewGif {
  private encoder = gifenc.GIFEncoder();
  private previous?: Uint32Array;
  add(image: Px, n: number) {
    const current = new Uint32Array(
      image.data.buffer,
      image.data.byteOffset,
      image.w * image.h,
    );
    let patch = image;
    if (this.previous) {
      patch = new Px(image.w, image.h);
      const next = new Uint32Array(patch.data.buffer);
      for (let i = 0; i < next.length; i++)
        if (current[i] !== this.previous[i]) next[i] = current[i];
    }
    this.previous = current.slice();
    const { indices, palette, transparent, transparentIndex } = indexed(patch);
    this.encoder.writeFrame(indices, image.w, image.h, {
      palette,
      transparent,
      transparentIndex,
      dispose: 1,
      repeat: 0,
      delay:
        10 * (Math.round(((n + 1) * 100) / 24) - Math.round((n * 100) / 24)),
    });
  }
  write(path: string) {
    this.encoder.finish();
    writeFileSync(path, this.encoder.bytesView());
  }
}
async function main() {
  const subjects = await Promise.all(ids.map(loadPainting));
  const durations = subjects.map(({ c }) =>
    Math.round(c.animations.life.seconds * 24),
  );
  const wallGif = new PreviewGif(),
    singles = ids.map(() => new PreviewGif());
  mkdirSync(output, { recursive: true });
  const gap = 15,
    margin = 20;
  const widths = subjects.map(({ c: creature }) => {
    const [w, , , b] = sizes[creature.rarity];
    return w + 2 * b;
  });
  const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);
  const wallWidth =
    2 * margin +
    Math.max(sum(widths.slice(0, 4)) + 3 * gap, sum(widths.slice(4)) + 2 * gap);
  const wallHeight = 508;
  const wallFrames = Math.max(...durations);
  for (let n = 0; n < wallFrames; n++) {
    const images = subjects.map(({ c, s, b }, i) => {
      // Synchronise the ends of differently timed routes for the wall; retain
      // original frame timing in each individual preview and the release master.
      const wallFrame = Math.floor((n * durations[i]) / wallFrames);
      const result = compose(c, s, b, 'life', wallFrame / 24, 0, 'normal');
      if (n < durations[i]) {
        const individual =
          wallFrame === n
            ? result
            : compose(c, s, b, 'life', n / 24, 0, 'normal');
        singles[i].add(individual.picture, n);
      }
      return result;
    });
    const wall = matte(wallWidth, wallHeight, [48, 42, 42, 255]);
    // A quiet gallery rail and cast shadows keep the furnishings behind the art.
    for (const rail of [15, 222, wallHeight - 12]) {
      wall.line(0, rail, wallWidth - 1, rail, [65, 55, 49, 255]);
      wall.line(0, rail + 1, wallWidth - 1, rail + 1, [33, 29, 32, 255]);
    }
    const pictures = images.map((x) => x.picture);
    for (const [i, row] of [
      pictures.slice(0, 4),
      pictures.slice(4),
    ].entries()) {
      const positions = centered(row, gap, wallWidth);
      row.forEach((p, j) => {
        const x = positions[j],
          y = Math.round((i === 0 ? 115 : 357) - p.h / 2);
        wall.line(x + 2, y + p.h, x + p.w + 1, y + p.h, [29, 25, 29, 255]);
        copy(wall, p, x, y);
      });
    }
    wallGif.add(wall, n);
    if (n === 0) {
      const row = images.map((x) => x.layers.frame),
        frameSheet = matte(sum(widths) + 12 * 8, 278, paper);
      const positions = centered(row, 12, frameSheet.w);
      row.forEach((p, j) =>
        copy(frameSheet, p, positions[j], Math.floor((frameSheet.h - p.h) / 2)),
      );
      writeFileSync(
        join(output, 'frames-row.png'),
        PNG.sync.write({
          width: frameSheet.w,
          height: frameSheet.h,
          data: Buffer.from(frameSheet.data),
        } as PNG),
      );
    }
  }
  wallGif.write(join(output, 'paintings.gif'));
  singles.forEach((gif, i) => {
    const dir = join(output, ids[i]);
    mkdirSync(dir, { recursive: true });
    gif.write(join(dir, 'painting-life.gif'));
  });
}
main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
