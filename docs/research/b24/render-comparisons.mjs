// Run in tools/creatures: node --import tsx /path/to/render-comparisons.mjs /path/to/output
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const output = process.argv[2];
if (!output) throw Error('Pass an output directory');
const loadLocal = file => import(pathToFileURL(resolve(file)).href);
const { loadPainting } = await loadLocal('render.ts');
const { compose } = await loadLocal('engine.ts');
const { savePNG } = await loadLocal('render-io.ts');
const { createCanvas } = createRequire(resolve('package.json'))('@napi-rs/canvas');
const examples = [
  { id: 'astral_seer', name: 'Астрал', phases: [0, 24, 57, 96], center: 57 },
  { id: 'pocket_magnet', name: 'Полюсик', phases: [0, 44, 79, 131], center: 79 },
];

mkdirSync(output, { recursive: true });
const width = 176;
const height = 148;
const row = height + 26;
const gap = 8;
const sheets = new Map();
const manifest = [];
function put(sheetName, columns, column, line, picture, label) {
  if (!sheets.has(sheetName)) sheets.set(sheetName, createCanvas((width + gap) * columns + gap, row * 2));
  const canvas = sheets.get(sheetName);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#172026';
  ctx.fillRect(column === 0 ? 0 : gap + column * (width + gap), line * row,
    column === 0 ? width + gap * 2 : width + gap, row);
  const x = gap + column * (width + gap);
  const h = Math.round(picture.h * width / picture.w);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(picture.canvas(), x, line * row + Math.floor((height - h) / 2), width, h);
  ctx.fillStyle = '#fff';
  ctx.font = '13px sans-serif';
  ctx.fillText(label, x, line * row + height + 17);
}
for (const [line, example] of examples.entries()) {
  const { c, s, b } = await loadPainting(example.id);
  const adjacent = [example.center - 1, example.center, example.center + 1];
  const selections = [
    ['b24-v2-phases', example.phases.map((n, i) => [i ? 'trick' : 'idle', n])],
    ['b24-v2-adjacent', adjacent.map(n => ['trick', n])],
  ];
  const rendered = new Map();
  for (const [sheet, frames] of selections) {
    for (const [column, [clip, frame]] of frames.entries()) {
      const filename = 'b24-v2-' + example.id + '-' + clip + '-' + frame + '.png';
      if (!rendered.has(filename)) {
        const { picture } = compose(c, s, b, clip, frame / 24, 0, 'normal');
        savePNG(join(output, filename), picture);
        rendered.set(filename, picture);
        manifest.push({ file: filename, id: example.id, clip, frame, fps: 24, side: 0, variant: 'normal',
          width: picture.w, height: picture.h, rgbaSha256: createHash('sha256').update(picture.data).digest('hex') });
      }
      put(sheet, frames.length, column, line, rendered.get(filename), example.name + ' · ' + clip + ' ' + frame);
    }
  }
}
for (const [name, sheet] of sheets) writeFileSync(join(output, name + '.png'), sheet.toBuffer('image/png'));
writeFileSync(join(output, 'b24-v2-frames.json'), JSON.stringify(manifest, null, 2) + '\n');
