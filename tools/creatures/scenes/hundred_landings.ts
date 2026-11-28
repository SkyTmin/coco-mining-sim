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
const edge = (x: number) => 285 + Math.sin(x / 69) * 3.6;
const cliff = (y: number) => 321 - (y - 265) * 0.31;
const opposite = (y: number) => 401 + (y - 240) * 0.28;
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
// The main landing and the postal island have independently cut sides. The bridge crosses open sky.
function ledge(p: Px, x0: number, x1: number, y: number, depth: number, island: boolean) {
  const top = (x: number) => y + Math.sin(x / 77) * 3;
  const inside = (x: number, z: number) => (island ? x >= opposite(z) : x <= cliff(z));
  for (let x = x0; x <= x1; x++) {
    const yy = top(x);
    for (let k = 0; k < depth + 30; k++) {
      if (!inside(x, yy + k)) continue;
      const block = Math.floor(x / 24);
      const jag = 18 * hash(block, 7, 3) + 6 * Math.sin(x / 7);
      if (k > depth + jag + 5) continue;
      const c = k < depth ? pigments[4] : k < depth + 3 ? pigments[6] : pigments[2 + (block % 3 === 0 ? 1 : 0)];
      p.set(x, yy + k, c);
      if (k > depth + 3 && (x % 23 === 0 || (x + Math.floor(k / 7)) % 37 === 0)) p.set(x, yy + k, pigments[1]);
    }
  }
  for (let row = 0; row < 4; row++) {
    const w = 22 + 5 * row,
      dy = depth / 4;
    for (let i = -1; i < 26; i++) {
      const x = x0 + i * w + (row % 2) * w * 0.52,
        z = top(x) + row * dy;
      if (x < x0 - 4 || x + w > x1 + 5 || !inside(x, z) || !inside(x + w + 3, z + dy)) continue;
      flagstone(
        p,
        [x, z],
        [x + w - 1, top(x + w) + row * dy],
        [x + w + 2, top(x + w) + (row + 1) * dy - 1],
        [x + 3, z + dy - 1],
        row * 41 + i,
      );
    }
  }
  for (let k = 0; k < depth + 15; k++) {
    const Y = y + k,
      X = island ? opposite(Y) : cliff(Y);
    p.line(X, Y, X + (island ? 4 : -4), Y, k < depth ? pigments[6] : pigments[3]);
  }
}
let still: Px;
function matte() {
  if (still) return still;
  const png = PNG.sync.read(readFileSync(skyFile));
  still = new Px(png.width, png.height);
  still.data.set(png.data);
  ledge(still, 0, 326, 252, 34, false);
  ledge(still, 396, 512, 232, 19, true);
  return still;
}
const scene: Scene = (p, t) => {
  p.data.set(matte().data);
  const a = (t * Math.PI * 2) / 3;
  for (let i = 0; i < 5; i++) {
    const x = 332 + i * 16 + 12 * Math.sin(a + i * 0.28),
      y = 47 + i * 4 + 3 * Math.cos(a + i);
    const wing = 2.2 * Math.sin(a * 3 + i);
    p.line(x - 3, y - wing, x, y + 1, pigments[2]);
    p.line(x, y + 1, x + 3, y - wing, pigments[2]);
  }
  // Small flecks drifting over the fog make the empty space beneath the span visible.
  for (let i = 0; i < 13; i++) {
    const x = 318 + hash(i, 7, 3) * 68 + 4 * Math.sin(a + i),
      y = 233 + hash(i, 4, 9) * 62 + 2 * Math.cos(a + i);
    if (Math.sin(a + i) > 0.2) p.line(x, y, x + 2, y, mixc(pigments[5], cream, 0.4));
  }
};
scene.front = [5, 10, 287, 304, 474, 506].map((x) => ({
  id: 'terrace-grass-' + x,
  depth: x > 390 ? 252 : Math.round(edge(x) - 1),
  paint(p: Px) {
    const y = x > 390 ? 250 + Math.sin(x / 77) * 3 : edge(x) - 1;
    for (let i = 0; i < 8; i++) {
      const h = 3 + hash(x, i, 2) * 7;
      p.line(x, y, x + (i - 3) * 1.3, y - h, i % 3 ? teal : mint);
      if (i === 2) p.set(x - 1, y - h, brass);
    }
  },
}));
export default scene;
