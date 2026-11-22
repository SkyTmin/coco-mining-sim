// Pilot comparison plates. All nine sprites share a ground line and native pixel pitch.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { createCanvas } from '@napi-rs/canvas';
import { reelChapters } from './motion';
import { Px } from './rig/px';
import { compose } from './engine';
import { indexed } from './render-io';
import gifenc from 'gifenc';
import { loadPainting } from './render';
import { sizeOf } from './types';
import type { RGBA } from './rig/f15-rig';

const here = dirname(fileURLToPath(import.meta.url));
const library = process.argv.includes('--b2');
const techniques = library || process.argv.includes('--techniques');
const output = library
  ? join(here, '.studio/b2-gallery')
  : join(here, '../../docs/reports/creatures', techniques ? 'pilot-3' : 'pilot-2');
const libraryReels = ['frost_yeti', 'toad_shaman', 'storm_ram'];
const ids = [
  'bramble_warden',
  'gem_beetle',
  'silk_dragon',
  'frost_yeti',
  ...(library ? ['storm_ram'] : []),
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
function reelCaption(
  width: number,
  title: string,
  number: number,
  total: number,
) {
  const canvas = createCanvas(width, 20);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#25222a';
  ctx.fillRect(0, 0, width, 20);
  ctx.fillStyle = '#e3bc78';
  ctx.font = 'bold 11px DejaVu Sans';
  ctx.fillText(number + ' / ' + total, 5, 14);
  ctx.fillStyle = '#f3edde';
  ctx.font = '11px DejaVu Sans';
  ctx.fillText(title, 43, 14, width - 47);
  const p = new Px(width, 20);
  p.data.set(ctx.getImageData(0, 0, width, 20).data);
  return p;
}
function writeReel({ c, s, b }: Awaited<ReturnType<typeof loadPainting>>) {
  const [w, , , border] = sizeOf(c);
  const width = w + 2 * border;
  const dir = join(output, c.id);
  mkdirSync(dir, { recursive: true });
  const reel = new PreviewGif();
  const chapters = reelChapters(c);
  const captions = chapters.map(({ name }, j) =>
    reelCaption(width, c.techniques![name].title, j + 1, chapters.length),
  );
  let chapter = 0;
  for (let n = 0; n < Math.round(c.animations.showreel.seconds * 24); n++) {
    if (n >= chapters[chapter].end) chapter++;
    const picture = compose(c, s, b, 'showreel', n / 24).picture;
    const sheet = new Px(picture.w, picture.h + captions[chapter].h);
    copy(sheet, picture, 0, 0);
    copy(sheet, captions[chapter], 0, picture.h);
    reel.add(sheet, n);
  }
  reel.write(join(dir, 'painting-showreel.gif'));
}
async function main() {
  const reelArg = process.argv.indexOf('--reel');
  if (reelArg !== -1) {
    const id = process.argv[reelArg + 1];
    if (!techniques || !ids.includes(id))
      throw Error('Usage: gallery.ts --techniques|--b2 --reel ID');
    writeReel(await loadPainting(id));
    return;
  }
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
    const [w, , , b] = sizeOf(creature);
    return w + 2 * b;
  });
  const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);
  const rowWidths = [widths.slice(0, 4), widths.slice(4)].map(
    (row) => sum(row) + (row.length - 1) * gap,
  );
  const wallWidth = 2 * margin + Math.max(...rowWidths);
  const wallHeight = 508;
  const wallFrames = Math.max(...durations);
  for (let n = 0; n < wallFrames; n++) {
    const images = subjects.map(({ c, s, b }, i) => {
      // Synchronise the ends of differently timed routes for the wall; retain
      // original frame timing in each individual preview and the release master.
      const wallFrame = Math.floor((n * durations[i]) / wallFrames);
      const result = compose(c, s, b, 'life', wallFrame / 24, 0, 'normal');
      if (!techniques && n < durations[i]) {
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
    if (!techniques && n === 0) {
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
  if (techniques) {
    for (const subject of subjects) {
      if (!library || libraryReels.includes(subject.c.id)) writeReel(subject);
    }
    return;
  }
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
