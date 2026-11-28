// Native body pixels are the common unit: enlarge them only after positioning every subject.
import { createCanvas, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import { PNG } from 'pngjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Px } from './rig/px';
import { measureDetail } from './detail';
import { GifWriter } from './render-io';
import type { Creature, XY } from './types';

const output = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../docs/reports/creatures/pilot-2',
);
const names: Record<string, string> = {
  bramble_warden: 'Ежевичный страж',
  gem_beetle: 'Жук-таран Самоцвет',
  silk_dragon: 'Шёлковый дракон',
  frost_yeti: 'Йети Буран',
  toad_shaman: 'Квакунья',
  crater_titan: 'Титан Жерло',
  coin_dragon: 'Монетный дракон',
};
const paper = '#24222a',
  panel = '#2c2a31',
  baseline = '#514b51',
  text = '#ece6d9',
  muted = '#c6bbae';
interface Sprite {
  px: Px;
  anchor: XY;
}
interface Subject {
  name: string;
  frame: (i: number) => Sprite;
}
function spriteFromSheet(
  sheet: Px,
  n: number,
  w: number,
  h: number,
  columns: number,
  anchor: XY,
): Sprite {
  const px = new Px(w, h),
    x = (n % columns) * w,
    y = Math.floor(n / columns) * h;
  for (let j = 0; j < h; j++)
    px.data.set(
      sheet.data.subarray(
        ((j + y) * sheet.w + x) * 4,
        ((j + y) * sheet.w + x + w) * 4,
      ),
      j * w * 4,
    );
  return { px, anchor };
}
function values(p: Px) {
  const v = measureDetail(p);
  const dec = (n: number, places: number) =>
    n.toFixed(places).replace('.', ',');
  return [
    v.width + ' × ' + v.height + ' px   ·   ' + v.pixels + ' пикселей',
    v.colours +
      ' цветов   ·   край ' +
      dec(v.edge, 2) +
      '   ·   пятно ' +
      dec(v.flat * 100, 1) +
      '%',
  ];
}
function title(
  g: SKRSContext2D,
  label: string,
  x: number,
  y: number,
  points: number,
  color = text,
  bold = false,
) {
  g.fillStyle = color;
  g.font = (bold ? 'bold ' : '') + points + 'px DejaVu Sans';
  g.fillText(label, x, y);
}
function draw(
  g: SKRSContext2D,
  s: Sprite,
  x: number,
  y: number,
  scale: number,
) {
  g.imageSmoothingEnabled = false;
  g.drawImage(
    s.px.canvas(),
    Math.round(x - s.anchor[0] * scale),
    Math.round(y - s.anchor[1] * scale),
    s.px.w * scale,
    s.px.h * scale,
  );
}
function line(g: SKRSContext2D, x: number, y: number, width: number) {
  g.fillStyle = baseline;
  g.fillRect(x, y, width, 1);
}
async function main() {
  const subjects: Subject[] = [];
  for (const [id, name] of Object.entries(names)) {
    const c: Creature = (await import('./c/' + id + '.ts')).default;
    subjects.push({ name, frame: (n) => c.frame('idle', n / 24, 0, 'normal') });
  }
  const guard = PNG.sync.read(
    readFileSync(join(output, 'reference/guardian-idle.png')),
  );
  const guardPixels = new Px(guard.width, guard.height);
  guardPixels.data.set(guard.data);
  const dragon = await loadImage(
    join(output, 'reference/dragon-idle-large.webp'),
  );
  const strip = createCanvas(dragon.width, dragon.height),
    sg = strip.getContext('2d');
  sg.drawImage(dragon, 0, 0);
  const dragonPixels = new Px(strip.width, strip.height);
  dragonPixels.data.set(sg.getImageData(0, 0, strip.width, strip.height).data);
  const refs: Subject[] = [
    {
      name: 'Дракон «Каторги»',
      frame: (n) => spriteFromSheet(dragonPixels, n, 98, 108, 72, [49, 98]),
    },
    {
      name: 'Древний страж «Каторги»',
      frame: (n) => spriteFromSheet(guardPixels, n, 116, 104, 12, [58, 78]),
    },
  ];
  const check = measureDetail(refs[0].frame(0).px);
  if (
    check.pixels !== 4819 ||
    check.colours !== 59 ||
    check.edge.toFixed(2) !== '0.90' ||
    check.flat.toFixed(3) !== '0.034'
  )
    throw Error('Wrong native dragon idle strip');
  const cell = 525,
    high = 540,
    gutter = 12,
    margin = 24,
    header = 84;
  const detail = createCanvas(
      2 * margin + 3 * cell + 2 * gutter,
      header + 7 * (high + gutter) + margin,
    ),
    g = detail.getContext('2d');
  g.fillStyle = paper;
  g.fillRect(0, 0, detail.width, detail.height);
  title(g, 'Детальность тел', margin, 35, 27, text, true);
  title(
    g,
    'Кадр 0 покоя   ·   Все фигуры ×3, ближайший сосед   ·   Непрозрачность > 200   ·   Цвета от трёх пикселей',
    margin,
    62,
    17,
    muted,
  );
  subjects.forEach((subject, row) => {
    const top = header + row * (high + gutter);
    [subject, ...refs].forEach((item, col) => {
      const x = margin + col * (cell + gutter),
        fr = item.frame(0);
      g.fillStyle = panel;
      g.fillRect(x, top, cell, high);
      title(g, item.name, x + 16, top + 32, 23, text, true);
      line(g, x + 12, top + 411, cell - 24);
      draw(g, fr, x + cell / 2, top + 411, 3);
      const v = values(fr.px);
      title(g, v[0], x + 16, top + 492, 18, text);
      title(g, v[1], x + 16, top + 518, 17, muted);
    });
  });
  writeFileSync(join(output, 'detail.png'), detail.toBuffer('image/png'));
  const all = [...subjects, ...refs];
  const slot = 169,
    width = slot * all.length,
    height = 235,
    feet = 161;
  const base = createCanvas(width, height),
    bg = base.getContext('2d');
  bg.fillStyle = paper;
  bg.fillRect(0, 0, width, height);
  for (const [i, subject] of all.entries()) {
    const x = i * slot,
      v = values(subject.frame(0).px);
    title(bg, subject.name, x + 5, 13, 11, text, true);
    line(bg, x + 4, feet, slot - 8);
    title(bg, v[0], x + 5, height - 18, 8, muted);
    title(bg, v[1], x + 5, height - 5, 8, muted);
  }
  const movie = new GifWriter(3, true),
    view = createCanvas(width, height),
    vg = view.getContext('2d');
  for (let n = 0; n < 72; n++) {
    vg.drawImage(base, 0, 0);
    all.forEach((item, i) =>
      draw(vg, item.frame(n), i * slot + slot / 2, feet, 1),
    );
    const px = new Px(width, height);
    px.data.set(vg.getImageData(0, 0, width, height).data);
    movie.add(px, n);
  }
  movie.write(join(output, 'lineup.gif'));
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
