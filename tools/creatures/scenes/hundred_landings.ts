import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { hx, mixc, hash } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import { face } from './relief';
import type { Scene, XY } from '../types';

const skyFile = new URL('./hundred_landings-sky.png', import.meta.url);
const pigments = ['#29283f', '#3b3549', '#514255', '#6e5963', '#937576', '#b59681', '#d5b391', '#f2d097'].map((color) =>
  hx(color),
);
const teal = hx('#4f7978'),
  mint = hx('#8ca398'),
  brass = hx('#d5a466'),
  cream = hx('#efd19d');
const edge = (x: number) => 179 + Math.sin(x / 69) * 4.5 + (x - 128) * 0.023;
function flagstone(p: Px, A: XY, B: XY, C: XY, D: XY, k: number) {
  const grain = hash(k, 15, 7),
    tone = mixc(pigments[3], pigments[6], 0.25 + 0.34 * grain);
  face(p, [A, B, C, D], tone);
  p.line(...A, ...B, mixc(tone, pigments[7], 0.46));
  p.line(...A, ...D, mixc(tone, pigments[6], 0.36));
  p.line(...D, ...C, mixc(tone, pigments[1], 0.44));
  for (let i = 0; i < 12; i++) {
    const u = 0.1 + 0.8 * hash(i, k, 1),
      v = 0.16 + 0.65 * hash(i, k, 2);
    const x = (A[0] * (1 - u) + B[0] * u) * (1 - v) + (D[0] * (1 - u) + C[0] * u) * v;
    const y = (A[1] * (1 - u) + B[1] * u) * (1 - v) + (D[1] * (1 - u) + C[1] * u) * v;
    p.line(x, y, x + 1.5 * hash(k, i, 3), y, mixc(tone, i % 3 ? pigments[5] : pigments[1], 0.34));
  }
  if (k % 3 === 0) {
    const x = A[0] + 0.53 * (B[0] - A[0]),
      y = A[1] + 0.53 * (B[1] - A[1]);
    p.line(x, y + 1, x + 2, y + 3, pigments[3]);
    p.line(x + 2, y + 3, x + 5, y + 3, pigments[3]);
  }
}
function terrace(p: Px) {
  // The causeway is in front of the ravine. Its cut face and vanishing joints give the feet a common floor.
  for (let x = 0; x < 256; x++) {
    const y = edge(x);
    p.line(x, 150, x, y, pigments[2]);
  }
  for (let row = 0; row < 5; row++) {
    const a = [150, 153, 158, 164, 172, 184][row],
      b = [150, 153, 158, 164, 172, 184][row + 1],
      w = 16 + row * 5.3;
    for (let i = -2; i < 21; i++) {
      const x = i * w + (row % 2) * w * 0.52,
        distort = (xx: number, yy: number) => yy + Math.sin(xx / 68) * 3.9 + (xx - 128) * 0.02;
      const A: XY = [x + 1, distort(x, a)],
        B: XY = [x + w - 1, distort(x + w, a)],
        C: XY = [x + w + 4, distort(x + w, b) - 1],
        D: XY = [x + 3, distort(x, b) - 1];
      flagstone(p, A, B, C, D, row * 32 + i);
    }
  }
  for (let i = -1; i < 14; i++) {
    const x = i * 24 + 5,
      y = edge(x),
      y2 = edge(x + 24),
      h = 13 + hash(i, 2, 8) * 20;
    face(
      p,
      [
        [x, y],
        [x + 23, y2],
        [x + 21, y2 + h],
        [x + 5, y + h + 4],
      ],
      mixc(pigments[1], pigments[3], hash(i, 3, 1)),
    );
    p.line(x, y, x + 23, y2, pigments[6]);
    p.line(x + 2, y + 2, x + 22, y2 + 2, pigments[4]);
    for (let k = 0; k < 14; k++) {
      const xx = x + 4 + hash(k, i, 1) * 15,
        yy = y + 4 + hash(k, i, 2) * (h - 6);
      p.line(xx, yy, xx + 1, yy + 2 + hash(k, i, 3) * 3, mixc(pigments[2], pigments[4], hash(i, k, 9)));
    }
    if (i % 3 === 1) {
      p.line(x + 4, y + 4, x + 12, y + 9, pigments[1]);
      p.line(x + 12, y + 9, x + 12, y + 14, pigments[1]);
    }
  }
}
// A high postal landing, separated from the front promenade by a strip of sky.
function island(p: Px) {
  face(
    p,
    [
      [204, 136],
      [221, 129],
      [255, 131],
      [255, 151],
      [246, 147],
      [235, 161],
      [225, 151],
      [216, 153],
    ],
    pigments[1],
  );
  for (let k = 0; k < 10; k++) {
    const x = 215 + k * 4,
      y = 135 - (k > 2 ? 2 : 0),
      h = 9 + hash(k, 9, 6) * 13;
    face(
      p,
      [
        [x, y],
        [x + 4, y - 1],
        [x + 2, y + h],
        [x - 1, y + h - 3],
      ],
      mixc(pigments[2], pigments[4], hash(k, 8, 3)),
    );
    p.line(x, y + 1, x - 1, y + h - 4, pigments[4]);
  }
  face(
    p,
    [
      [202, 136],
      [221, 129],
      [255, 129],
      [255, 135],
      [220, 140],
    ],
    pigments[5],
  );
  p.line(203, 137, 220, 140, cream);
  p.line(220, 140, 255, 135, pigments[4]);
  for (let k = 0; k < 8; k++) {
    const x = 221 + k * 4;
    p.set(x, 133 + hash(k, 4, 2) * 3, mint);
  }
}
let still: Px;
function matte() {
  if (still) return still;
  const png = PNG.sync.read(readFileSync(skyFile));
  still = new Px(256, 208);
  still.data.set(png.data);
  terrace(still);
  island(still);
  return still;
}
const scene: Scene = (p, t) => {
  p.data.set(matte().data);
  const a = (t * Math.PI * 2) / 3;
  // Slowly turning weather vanes and warm high-altitude motes establish the wind direction.
  for (let k = 0; k < 8; k++) {
    const x = 10 + hash(k, 6, 14) * 230 + 2.4 * Math.sin(a + k),
      y = 22 + hash(k, 5, 2) * 100 + Math.sin(a + k * 2) * 0.7;
    if (Math.sin(a + k) > 0.25) p.set(x, y, mixc(pigments[5], cream, 0.57));
  }
  for (let i = 0; i < 3; i++) {
    const x = 160 + i * 11 + 9 * Math.sin(a + i * 0.33),
      y = 28 + i * 4 + 2 * Math.cos(a + i),
      v = Math.sin(3 * a + i) * 1.3;
    p.line(x - 2, y - v, x, y + 1, pigments[2]);
    p.line(x, y + 1, x + 2, y - v, pigments[2]);
  }
};
scene.front = [3, 10, 244, 250].map((x) => ({
  id: 'terrace-grass-' + x,
  depth: Math.round(edge(x) - 1),
  paint(p: Px) {
    const y = edge(x) - 1;
    for (let i = 0; i < 8; i++) {
      const h = 3 + hash(x, i, 2) * 7;
      p.line(x, y, x + (i - 3) * 1.3, y - h, i % 3 ? teal : mint);
      if (i === 2) p.set(x - 1, y - h, brass);
    }
  },
}));
export default scene;
