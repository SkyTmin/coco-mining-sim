// From tools/creatures: node --import tsx sheets.mjs confirm.json output-dir
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const [source, directory] = process.argv.slice(2);
const { loadForHash } = await import(pathToFileURL(resolve('studio/snap.ts')));
const { compose } = await import(pathToFileURL(resolve('engine.ts')));
const { createCanvas } = createRequire(resolve('package.json'))('@napi-rs/canvas');
const groups = new Map();
for (const hit of JSON.parse(readFileSync(source, 'utf8'))) {
  const key = [hit.w, hit.h, hit.neighbour, hit.middle].join('/');
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(hit);
}
mkdirSync(directory, { recursive: true });
const rows = [];
for (const [key, occurrences] of groups) {
  const { id, clip, frame, w, h, box, changed } = occurrences[0];
  const { c, s, b } = await loadForHash(id);
  const frames = [-1, 0, 1].map(offset => compose(c, s, b, clip, (frame + offset) / 24, 0, 'normal').picture);
  const hashes = frames.map(image => createHash('sha1').update(image.data).digest('hex').slice(0, 10));
  if (hashes.join('/') !== [occurrences[0].neighbour, occurrences[0].middle, occurrences[0].neighbour].join('/')) {
    throw Error('Unexpected frame at ' + [id, clip, frame].join('/'));
  }
  const [x0, y0, x1, y1] = box;
  const x = Math.max(0, x0 - 2), y = Math.max(0, y0 - 2);
  const rw = Math.min(w, x1 + 3) - x, rh = Math.min(h, y1 + 3) - y;
  const column = Math.max(w, 4 * rw);
  const canvas = createCanvas(3 * column, h + 4 * rh + 26);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#29292e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const [index, picture] of frames.entries()) {
    const offset = index * column;
    const original = picture.canvas();
    ctx.drawImage(original, offset, 0);
    ctx.drawImage(original, x, y, rw, rh, offset, h + 26, rw * 4, rh * 4);
    ctx.fillStyle = 'white'; ctx.font = '12px sans-serif';
    ctx.fillText([id, clip, frame + index - 1].join(' / '), offset + 3, h + 17);
  }
  const sheet = String(rows.length + 1).padStart(2, '0') + '-' + id + '.png';
  writeFileSync(join(directory, sheet), canvas.toBuffer('image/png'));
  rows.push({ sheet, id, clip, frame, filled: changed, box, key, instances: occurrences.length });
}
writeFileSync(join(directory, 'index.json'), JSON.stringify(rows, null, 2) + '\n');
