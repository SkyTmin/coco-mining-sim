// A quiet bend in the morning river. The far treeline and its reflection follow the same silhouette.
// The two foreground reed beds have real depths, so a walking otter can pass behind them.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { Px } from '../rig/px';
import type { Scene } from '../types';
import { face } from './relief';
import { bank, cliffBase, isRiver, riverRows, shoal, slideSurface } from './willow-terrain';

const sky = hx('#dae3cd'), mist = hx('#b5cdc0'), far = hx('#94b8ad'), woods = hx('#739d91');
const water = hx('#38758a'), shallows = hx('#76acb4'), glint = hx('#c3ded2');
const clay = hx('#9e886b'), sand = hx('#cab392'), earth = hx('#726857'), grass = hx('#748465');
const bark = hx('#544e40'), barkLight = hx('#82735a');
const leaves = [hx('#4c7564'), hx('#60846c'), hx('#769275'), hx('#91a785')];
const rush = [hx('#485f55'), hx('#65826b'), hx('#9ba27c')];
const rock = [hx('#4c6767'), hx('#708984'), hx('#9ea99b'), hx('#c1c5ac')];
const hill = (x: number) => 34 + 3 * Math.sin(x * 0.048) + 2 * Math.sin(x * 0.11);

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

function slideBank(p: Px) {
  const faceDark = hx('#716451'), cut = hx('#987b5d'), ochre = hx('#bc9770'), sun = hx('#dbc094');
  for (let x = 0; x < 96; x++) {
    const top = slideSurface(x), toe = cliffBase(x), depth = toe - top;
    const jag = Math.round(1.2 * Math.sin(x * 0.46) + 0.8 * Math.sin(x * 1.11));
    p.line(x, toe, x + 1, toe + 1, mixc(earth, water, 0.38));
    for (let y = Math.round(top - 5); y <= toe; y++) {
      const d = (y - top) / depth;
      if (y < top + 3 + jag) {
        const worn = Math.max(0, 1 - Math.abs(y - top) / 5);
        p.set(x, y, mixc(mixc(grass, ochre, 0.53), sun, worn * 0.77 + 0.07 * Math.sin(x * 0.27)));
      } else {
        const stratum = 0.22 * Math.sin((y - top * 0.51) * 0.75 + Math.sin(x * 0.22)) + 0.12 * Math.cos(x * 0.61);
        p.set(x, y, mixc(faceDark, cut, 0.35 + (1 - d) * 0.46 + stratum));
      }
    }
    if (x < 91) p.set(x, top + 3 + jag, mixc(ochre, sun, 0.45));
    if (x < 57 && x % 4 !== 0) {
      const tip = 1 + Math.floor(hash(x, 38) * 4);
      p.line(x, top - 5, x - 1, top - 5 - tip, leaves[x % 3]);
    }
    if (x % 11 < 4 && x > 15) p.set(x, top + Math.sin(x / 8), ochre);
  }
  // Erosion cuts across the bedding; the roots hang down from the turf at the crest.
  for (const [x, depth] of [[9, 21], [18, 10], [30, 17], [46, 10], [58, 8]]) {
    const y = Math.round(slideSurface(x) + 3);
    p.line(x, y, x - 2, y + 4, faceDark);
    p.line(x - 2, y + 4, x + 1, y + depth, faceDark);
    p.line(x - 2, y + 4, x - 4, y + 7, barkLight);
    p.line(x + 1, y, x - 1, y + 3, sand);
  }
  for (let i = 0; i < 49; i++) {
    const x = 3 + hash(i, 110) * 88, y = slideSurface(x);
    const depth = cliffBase(x) - y;
    const h = 4 + hash(i, 114) * (depth - 5);
    p.line(x, y + h, x + (i % 3), y + h, i % 3 ? ochre : faceDark);
  }
  for (const [x, y, r] of [[12, 53, 3], [22, 48, 2.6], [43, 49, 1.7], [65, 79, 1.8], [92, 103, 2.5]])
    stone(p, x, y, r, 97);
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
  // The old packhorse bridge crosses the narrow part of the bend. Its arch openings keep the water visible.
  for (let x = 84; x < 158; x++) {
    const deck = 35.5 - 4 * Math.sin((x - 84) * Math.PI / 75);
    const arch = [101, 125, 147].reduce((gap, cx) => Math.max(gap, Math.sqrt(Math.max(0, 1 - ((x - cx) / 9) ** 2))), 0);
    const foot = 43 - 8.5 * arch;
    p.line(x, deck, x, Math.max(deck, foot), mixc(woods, clay, 0.58));
    p.set(x, deck - 1, mixc(sand, mist, 0.6));
    if (x % 6 < 2 && foot > deck + 2) p.set(x, deck + 1, mixc(woods, clay, 0.84));
    if (foot > deck + 1) p.set(x, foot, mixc(water, woods, 0.35));
    for (let y = 44; y < 44 + (foot - deck) * 0.52; y++)
      if ((y + x) % 5 > 1) p.set(x, y, mixc(woods, water, 0.47));
  }
  // Sunlit ripples cross long, broken blue reflections. The smaller waves run with the current.
  for (let i = 0; i < 64; i++) {
    const y = Math.floor(44 + hash(i, 171) * 84), x = Math.floor(hash(i, 169) * 168) - 7;
    const angle = t * TAU / 3 + i * 1.73, start = x + Math.round(3 * Math.sin(angle));
    const width = Math.round(3 + 9 * hash(i, 177) + 3 * Math.cos(angle));
    for (let j = 0; j < width; j++) {
      const yy = y + Number(j > width * 0.67 && i % 3 === 0);
      if (isRiver(start + j, yy) && (j !== width - 3 || i % 3 !== 0))
        p.set(start + j, yy, mixc(water, i % 3 ? glint : woods, i % 3 ? 0.25 + 0.2 * Math.sin(angle) : 0.4));
    }
  }
  for (let i = 0; i < 13; i++) {
    const y = 46 + i * 6, phase = t * TAU / 3 + i * 0.89;
    const x = Math.round(111 + 26 * Math.sin(i * 2.2) + 3 * Math.sin(phase));
    const w = 12 + i % 7;
    for (let j = 0; j < w; j++) {
      const yy = y + Number(j > w * 0.5);
      if (isRiver(x + j, yy) && (j < w * 0.43 || j > w * 0.54)) {
        p.set(x + j, yy, mixc(water, woods, 0.22));
        if (j > w * 0.23 && j < w * 0.82) p.set(x + j - 1, yy + 1, mixc(shallows, glint, 0.36));
      }
    }
  }
  for (let y = 71; y < p.h; y++) {
    const x = Math.ceil(shoal(y));
    if (isRiver(x, y)) {
      p.set(x, y, mixc(clay, water, 0.45));
      if (Math.sin(y * 0.64 + t * TAU / 3) > -0.2) p.line(x + 1, y, x + 3, y, mixc(shallows, glint, 0.68));
    }
  }
  for (let i = 0; i < 155; i++) {
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
  // Broken reflections and lily pads give the foreground water a different scale from the far bank.
  for (let i = 0; i < 9; i++) {
    const x = 119 + hash(i, 17, 2) * 36, y = 80 + hash(i, 28, 7) * 20;
    const r = 2 + hash(i, 59, 3) * 3.5;
    p.ell(x, y + 1, r, r * 0.4, rock[0]); p.ell(x, y, r, r * 0.38, leaves[1]);
    p.line(x - r * 0.6, y - 0.6, x - 1, y - 0.8, leaves[3]);
    p.line(x + 1, y, x + r, y + r * 0.2, water);
    if (i === 4 || i === 7) {
      p.ell(x - 1, y - 2, 2.6, 1.25, hx('#cead9e')); p.set(x - 1, y - 3, hx('#e0cdc0'));
      p.set(x - 2, y - 2, hx('#e7d0a0'));
    }
  }
  for (let i = 0; i < 21; i++) {
    const x = 8 + hash(i, 39) * 22, y = 73 + hash(i, 97) * 45;
    if (x > shoal(y) - 3) continue;
    const width = 2 + hash(i, 56) * 3;
    p.line(x, y, x + width, y - 1, mixc(clay, sand, 0.4));
    if (i % 5 === 0) stone(p, x, y, width * 0.7, i + 1);
  }
  slideBank(p);
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
paint.waterRows = riverRows;
paint.front = [
  { id: 'near-rushes', depth: 125, paint(p) { stone(p, 8, 127, 12, 7); reeds(p, 5, 128, 18, 14, 30); } },
  { id: 'river-edge', depth: 123, paint(p) { stone(p, 155, 127, 7, 2); reeds(p, 156, 128, 14, 55, 20); } },
];
export default paint;
