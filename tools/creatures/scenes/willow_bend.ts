// A quiet bend in the morning river. The far treeline and its reflection follow the same silhouette.
// The two foreground reed beds have real depths, so a walking otter can pass behind them.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { Px } from '../rig/px';
import type { Scene } from '../types';
import { face } from './relief';

const sky = hx('#dae3cd'), mist = hx('#b5cdc0'), far = hx('#94b8ad'), woods = hx('#739d91');
const water = hx('#507f83'), shallows = hx('#85a79c'), glint = hx('#c3d4af');
const clay = hx('#9e886b'), sand = hx('#cab392'), earth = hx('#726857'), grass = hx('#748465');
const bark = hx('#544e40'), barkLight = hx('#82735a');
const leaves = [hx('#4c7564'), hx('#60846c'), hx('#769275'), hx('#91a785')];
const rush = [hx('#485f55'), hx('#65826b'), hx('#9ba27c')];
const rock = [hx('#4c6767'), hx('#708984'), hx('#9ea99b'), hx('#c1c5ac')];
const hill = (x: number) => 34 + 3 * Math.sin(x * 0.048) + 2 * Math.sin(x * 0.11);
const bank = (x: number) => 57 + 12 * Math.sin(x * 0.031 + 1.8) + 8 * Math.sin(x * 0.066 + 0.8);
const shoal = (y: number) => 23 + (y - 58) * 0.82 + Math.sin(y * 0.084) * 12;

function stone(p: Px, x: number, y: number, radius: number, seed: number) {
  const r = radius, h = Math.max(1.3, r * 0.56);
  p.ell(x, y + 1, r + 1, h * 0.8, rock[0]);
  p.ell(x, y, r, h, (sx, sy) => sy < y - h * 0.16 && sx < x + r * 0.4 ? rock[2] : rock[1]);
  p.line(x - r * 0.58, y - h * 0.36, x - r * 0.14, y - h * 0.55, rock[3]);
  if (r > 3) p.set(x + hash(x, y, seed) * r * 0.5, y, rock[0]);
}

function reeds(p: Px, x: number, y: number, n: number, seed: number, high: number, wind = 0) {
  for (let i = 0; i < n; i++) {
    const root = x + (hash(i, seed, 2) - 0.5) * 12;
    const h = high * (0.36 + 0.64 * hash(i, seed, 5));
    const tip = root + (hash(i, seed, 8) - 0.5) * h * 0.78 + wind;
    p.line(root, y, (tip + root) / 2, y - h * 0.63, rush[i % 2]);
    p.line((tip + root) / 2, y - h * 0.63, tip, y - h, rush[(i + 1) % 3]);
    if (i % 5 === 0) {
      p.line(tip, y - h + 1, tip + 1, y - h - 3, bark);
      p.set(tip, y - h - 2, barkLight);
    }
  }
}

const paint: Scene = (p, t) => {
  const wind = Math.sin(t * TAU / 3);
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const horizon = hill(x), shore = bank(x);
      const farHill = 25 + 4 * Math.sin(x * 0.044 + 1.3) + 2 * Math.sin(x * 0.119);
      if (y < farHill) p.set(x, y, mixc(sky, mist, Math.max(0, (y - 5) / 32)));
      else if (y < horizon) p.set(x, y, far);
      else if (y < 43) p.set(x, y, woods);
      else if (y < shore) p.set(x, y, y >= 85 - horizon ? mixc(far, shallows, 0.52) : mixc(woods, water, 0.55));
      else if (x < shoal(y)) {
        const wet = Math.min(1, Math.max(0, (shoal(y) - x) / 22));
        p.set(x, y, mixc(clay, sand, wet * 0.8 + 0.12 * Math.sin((x + y) * 0.055)));
      } else p.set(x, y, mixc(water, shallows, Math.min(1, 0.22 + (y - shore) / 96)));
    }
  }
  // A sandy tongue meets the water on the far bend.
  for (let x = 0; x < p.w; x++) {
    const y = bank(x);
    if (x < 43 || x > 127) {
      p.line(x, y - 3, x, y - 1, grass);
      p.set(x, y, clay);
      if (x % 7 < 4) p.set(x, y + 1, glint);
    }
  }
  for (let i = 0; i < 114; i++) {
    const y = 45 + Math.floor(hash(i, 81) * 82);
    const x = Math.floor(hash(i, 87) * 160);
    if (y > bank(x) && x < shoal(y)) {
      if (i % 6 === 0) stone(p, x, y, 1 + hash(i, 95) * 2.5, i);
      else p.line(x, y, x + 2, y, mixc(earth, sand, 0.65));
    } else {
      const a = t * TAU / 3 + i;
      const start = x + Math.round(Math.sin(a) * 2);
      p.line(start, y, start + 2 + Math.round((1 + Math.cos(a)) * 2), y, mixc(shallows, glint, 0.46 + 0.28 * Math.sin(a)));
    }
  }
  for (const [x, y, r] of [[14, 68, 6], [22, 66, 4], [36, 87, 3.5], [5, 112, 6.8], [149, 47, 3.1]]) stone(p, x, y, r, 4);
  // A pollarded willow leans over the water, with hanging leaves in separate strands.
  face(p, [[0, 65], [0, 22], [5, 19], [10, 43], [9, 57], [14, 62], [7, 62]], bark);
  p.line(4, 53, 2, 25, barkLight);
  face(p, [[2, 36], [0, 27], [17, 15], [35, 8], [42, 9], [20, 19]], bark);
  for (let i = 0; i < 37; i++) {
    const x = i * 1.45 - 5, top = 8 + 2 * Math.sin(x / 8) - x * 0.14;
    const h = 6 + hash(i, 42) * (23 - i * 0.32), sway = wind * (0.4 + i / 50);
    p.line(x, top, x + sway - 1, top + h, leaves[1]);
    for (let j = 0; j < h; j += 2.8) {
      const xx = x + (sway - 1) * j / h;
      p.line(xx, top + j, xx + (i % 2 ? 2 : -2), top + j + 3, leaves[(i + Math.floor(j)) % 4]);
    }
  }
  for (let i = 0; i < 15; i++) p.ell(i * 3.8 - 4, 1 + Math.sin(i * 0.65) * 3, 5, 4, leaves[i % 3]);
  reeds(p, 9, 67, 12, 31, 17, wind);
  reeds(p, 152, 50, 10, 75, 10, wind * 0.5);
};
paint.front = [
  { id: 'near-rushes', depth: 125, paint(p) { stone(p, 8, 127, 12, 7); reeds(p, 5, 128, 18, 14, 30); } },
  { id: 'river-edge', depth: 123, paint(p) { stone(p, 155, 127, 7, 2); reeds(p, 156, 128, 14, 55, 20); } },
];
export default paint;
