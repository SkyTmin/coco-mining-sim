// Pilot comparison plates. All nine sprites share a ground line and native pixel pitch.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { Px } from './rig/px';
import { compose } from './engine';
import { GifWriter } from './render-io';
import { sizes, type Border, type Creature, type Scene } from './types';
import type { RGBA } from './rig/f15-rig';

const here = dirname(fileURLToPath(import.meta.url));
const output = join(here, '../../docs/reports/creatures/pilot');
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
async function subject(id: string) {
  const creature: Creature = (await import(`./c/${id}.ts`)).default;
  const scene: Scene = (await import(`./scenes/${creature.theme}.ts`)).default;
  const border: Border = (await import(`./frames/${creature.rarity}.ts`))
    .default;
  return { creature, scene, border };
}
function reference(kind: string) {
  const prefix = join(output, 'reference', kind + '-sequence');
  const sheet = PNG.sync.read(readFileSync(prefix + '.png'));
  const { width, height, anchor, columns } = JSON.parse(
    readFileSync(prefix + '.json', 'utf8'),
  );
  return (n: number) => {
    const p = new Px(width, height);
    const left = (n % columns) * width,
      top = Math.floor(n / columns) * height;
    for (let y = 0; y < height; y++) {
      const i = ((y + top) * sheet.width + left) * 4;
      p.data.set(sheet.data.subarray(i, i + width * 4), y * width * 4);
    }
    return { px: p, anchor };
  };
}
async function main() {
  const subjects = await Promise.all(ids.map(subject));
  const references = ['f11boss', 'f13boss'].map(reference);
  const wallGif = new GifWriter(1),
    lineupGif = new GifWriter(1);
  mkdirSync(output, { recursive: true });
  const gap = 15,
    margin = 20;
  const widths = subjects.map(({ creature }) => {
    const [w, , , b] = sizes[creature.rarity];
    return w + 2 * b;
  });
  const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);
  const wallWidth =
    2 * margin +
    Math.max(sum(widths.slice(0, 4)) + 3 * gap, sum(widths.slice(4)) + 2 * gap);
  const wallHeight = 508;
  for (let n = 0; n < 72; n++) {
    const t = n / 24;
    const images = subjects.map(({ creature, scene, border }) =>
      compose(creature, scene, border, 'idle', t, 0, 'normal'),
    );
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
    const sprites = [
      ...images.map((x) => x.body),
      ...references.map((read) => read(n)),
    ];
    const sheet = matte(
      sum(sprites.map((s) => s.px.w)) + 10 * (sprites.length + 1),
      192,
      paper,
    );
    const xs = centered(
      sprites.map((s) => s.px),
      10,
      sheet.w,
    );
    sheet.line(0, 151, sheet.w - 1, 151, [53, 48, 57, 255]);
    sprites.forEach((s, j) => copy(sheet, s.px, xs[j], 151 - s.anchor[1]));
    lineupGif.add(sheet, n);
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
  lineupGif.write(join(output, 'lineup.gif'));
}
main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
