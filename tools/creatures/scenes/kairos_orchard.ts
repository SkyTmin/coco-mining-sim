// «Сад у старой яблони»: a hillside orchard in the late golden afternoon. An old apple tree on the right holds a low
// branch out over the meadow; the fork in that branch is where the nest sits (the nest, eggs and every loose leaf are
// drawn by the effects of Кайрос, because his magic moves them). The scene itself is the part of the world that time
// never touches in the painting: the hills, the trunk, the crown.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import type { Scene } from '../types';
import { face, type Point } from './relief';

/** Where the branch fork holds the nest, field pixels (the effects draw the nest here). */
export const FORK: [number, number] = [158, 81];
/** Floor row under the branch: the depth of the trunk base. */
export const TREE_FLOOR = 170;
/** Floor row of the painting's front path, where Кайрос stands. */
export const HOME_FLOOR = 178;

const skyTop = hx('#8fbcbc'),
  skyLow = hx('#f6e2b0');
function ridge(p: Px, top: Point[], color: string) {
  face(p, [...top, [p.w + 1, p.h], [-1, p.h]], hx(color));
}
function blade(p: Px, x: number, y: number, h: number, lean: number, light: string, dark: string) {
  face(p, [[x - 1, y], [x + lean, y - h], [x + 1.5, y]], hx(dark));
  p.line(x, y - 1, x + lean, y - h, hx(light));
}
function tuft(p: Px, x: number, y: number, w: number, h: number, seed: number) {
  for (let i = 0; i < 14; i++) {
    const k = hash(i, seed);
    blade(p, x + (hash(i, seed + 3) - 0.5) * w, y + (hash(i, seed + 5) - 0.5) * 3, h * (0.45 + 0.6 * k), (k - 0.45) * 6,
      k > 0.5 ? '#b9b469' : '#9aa25c', k > 0.5 ? '#7f8245' : '#6c7a44');
  }
}
function bark(p: Px, pts: Point[], seed: number) {
  face(p, pts, hx('#4a3428'));
  // Vertical fissures and a lit left edge, from the shared top-left light.
  const xs = pts.map((q) => q[0]),
    ys = pts.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const W = Math.ceil(x1) - Math.floor(x0) + 5,
    ox = Math.floor(x0) - 2;
  const mine = (x: number, y: number) => {
    const c = p.get(x, y);
    return c[0] === 0x4a && c[1] === 0x34 && c[2] === 0x28;
  };
  const mask: boolean[][] = [];
  for (let y = Math.floor(y0); y <= y1; y++) {
    const row: boolean[] = [];
    for (let i = 0; i < W; i++) row.push(mine(ox + i, y));
    mask.push(row);
  }
  for (let y = Math.floor(y0); y <= y1; y++)
    for (let x = Math.floor(x0); x <= x1; x++) {
      const row = mask[y - Math.floor(y0)];
      if (!row[x - ox]) continue;
      const left = !row[x - ox - 2],
        right = !row[x - ox + 2];
      const fis = hash(Math.floor(x / 2), Math.floor(y / 5), seed) > 0.8;
      const knot = hash(x >> 2, y >> 2, seed + 9) > 0.96;
      p.set(x, y, hx(left ? '#86664a' : right ? '#2e2018' : fis ? '#33241b' : knot ? '#6a4e38' : hash(x, y, seed) > 0.88 ? '#5c4331' : '#4a3428'));
    }
}
function leafCluster(p: Px, cx: number, cy: number, rx: number, ry: number, seed: number, warm = 0) {
  const tones = ['#243c2c', '#34573a', '#4d7440', '#6f9348', '#9bb25a', '#d0c86c'].map((c) => hx(c));
  // A solid shaded mass first, so the crown reads as foliage and not as confetti.
  p.ell(cx, cy, rx * 0.92, ry * 0.9, (x, y) => {
    const u = (x - cx) / rx,
      v = (y - cy) / ry;
    const lit = 0.42 - 0.3 * u - 0.45 * v + 0.12 * (hash(x >> 1, y >> 1, seed + 7) - 0.5) + warm;
    return tones[Math.max(0, Math.min(3, Math.floor(lit * 4.2)))];
  });
  for (let i = 0; i < rx * ry * 0.9; i++) {
    const a = hash(i, seed) * TAU,
      d = Math.sqrt(hash(i, seed + 1));
    const x = cx + Math.cos(a) * rx * d,
      y = cy + Math.sin(a) * ry * d;
    // Light from the top left: the upper-left of each cluster is lit, the lower-right sinks into shade.
    const lit = 0.5 - 0.42 * ((x - cx) / rx) * 0.6 - 0.55 * ((y - cy) / ry) + 0.25 * (hash(i, seed + 2) - 0.5) + warm;
    const k = Math.max(0, Math.min(5, Math.floor(lit * 5.5)));
    p.set(x, y, tones[k]);
    p.set(x + 1, y, tones[Math.max(0, k - 1)]);
    if (hash(i, seed + 4) > 0.6) p.set(x, y + 1, tones[Math.max(0, k - 1)]);
  }
}
function apple(p: Px, x: number, y: number) {
  p.ell(x, y, 1.9, 1.9, hx('#8e2a24'));
  p.set(x - 1, y - 1, hx('#d4523c'));
  p.set(x - 1, y, hx('#b83a2c'));
  p.set(x, y - 2, hx('#4a3428'));
}
function paintStill(p: Px) {
  // Sky: teal at the top into a warm cream at the horizon, the same two time colours as the brass and the glass.
  for (let y = 0; y < 66; y++) p.rect(0, y, p.w - 1, y, mixc(skyTop, skyLow, Math.pow(y / 66, 0.85)));
  p.ell(58, 24, 9, 9, hx('#fbefc6'));
  p.ell(58, 24, 7, 7, hx('#fff8de'));
  for (const [x, y, w] of [[10, 14, 30], [22, 12, 18], [86, 9, 22], [96, 11, 30], [130, 18, 16]]) {
    p.line(x, y, x + w, y, hx('#d9e6d2'));
    p.line(x + 5, y + 1, x + w + 6, y + 1, hx('#c8dccd'));
  }
  // Far hills in two blue-green bands, then the meadow slope.
  ridge(p, [[-1, 58], [20, 52], [44, 55], [70, 47], [98, 53], [126, 50], [150, 56], [180, 51], [210, 55], [257, 50]], '#8fa898');
  ridge(p, [[-1, 66], [30, 62], [62, 64], [96, 59], [134, 63], [170, 60], [206, 64], [257, 61]], '#7d9a7c');
  for (let y = 66; y < p.h; y++) {
    const k = (y - 66) / (p.h - 66);
    // Far grass is cooler and paler, near grass warmer and deeper.
    const row = mixc(mixc(hx('#a7b47a'), hx('#b9ad62'), k), hx('#8d9a55'), Math.max(0, k - 0.55) * 1.4);
    for (let x = 0; x < p.w; x++) {
      const n = hash(x >> 1, y, 7);
      const stripe = hash(x >> 3, y >> 1, 9) > 0.9 - 0.12 * k;
      p.set(x, y, n > 0.93 ? mixc(row, hx('#e6d790'), 0.5) : n < 0.06 || stripe ? mixc(row, hx('#5f7240'), 0.35) : row);
    }
  }
  // The worn path where Кайрос stands, and the dappled shade of the crown on the grass under the tree.
  for (let y = HOME_FLOOR - 8; y < HOME_FLOOR + 14; y++)
    for (let x = 20; x < 180; x++) {
      const d = ((x - 100) / 90) ** 2 + ((y - HOME_FLOOR - 3) / 10) ** 2;
      if (d < 1 && hash(x, y, 11) > 0.25 + 0.6 * d) p.set(x, y, mixc(p.get(x, y), hx('#d8c38a'), 0.55));
    }
  for (let y = 150; y < 192; y++)
    for (let x = 140; x < 256; x++) {
      const d = ((x - 205) / 62) ** 2 + ((y - 172) / 18) ** 2;
      if (d < 1 && hash(x >> 2, y >> 1, 13) > 0.3 * d) p.set(x, y, mixc(p.get(x, y), hx('#4f6a3e'), 0.45 * (1 - d * 0.6)));
    }
  // The crown behind the trunk.
  leafCluster(p, 222, 30, 40, 30, 31, -0.08);
  leafCluster(p, 182, 22, 30, 22, 32, 0);
  leafCluster(p, 248, 62, 22, 22, 33, -0.15);
  // Trunk: a thick, leaning old apple trunk that forks into two limbs; the low branch reaches left over the meadow.
  bark(p, [[202, TREE_FLOOR + 2], [228, TREE_FLOOR + 2], [224, 150], [222, 120], [226, 92], [232, 60], [222, 56],
    [212, 84], [206, 112], [206, 140], [200, 160]], 41);
  bark(p, [[222, 60], [232, 58], [236, 30], [226, 32]], 42);
  bark(p, [[212, 70], [220, 76], [204, 46], [196, 48]], 43);
  // Roots spreading into the grass.
  bark(p, [[198, TREE_FLOOR + 3], [206, TREE_FLOOR - 4], [212, TREE_FLOOR + 2], [190, TREE_FLOOR + 5]], 44);
  bark(p, [[222, TREE_FLOOR + 1], [232, TREE_FLOOR - 3], [244, TREE_FLOOR + 4], [226, TREE_FLOOR + 4]], 45);
  // The low branch, thick at the trunk and thin at the tip, with the fork where the nest sits.
  bark(p, [[210, 100], [208, 92], [190, 84], [FORK[0] + 2, FORK[1] - 1], [136, 74], [134, 77], [FORK[0], FORK[1] + 2],
    [186, 91]], 46);
  bark(p, [[FORK[0] + 6, FORK[1] - 1], [FORK[0] + 9, FORK[1] - 2], [FORK[0] + 2, FORK[1] - 12], [FORK[0], FORK[1] - 11]], 47);
  leafCluster(p, 139, 70, 11, 7, 51, 0.05);
  leafCluster(p, FORK[0] + 3, FORK[1] - 15, 8, 6, 52, 0.08);
  leafCluster(p, 192, 80, 10, 6, 53, 0);
  // Front crown hiding the top of the trunk; apples.
  leafCluster(p, 208, 44, 26, 16, 34, 0.05);
  leafCluster(p, 238, 46, 20, 14, 35, -0.05);
  for (const [x, y] of [[196, 40], [214, 52], [236, 38], [244, 56], [226, 22], [186, 30], [141, 72]]) apple(p, x, y);
  // Meadow flowers and tufts.
  for (let i = 0; i < 40; i++) {
    const x = hash(i, 61) * p.w,
      y = 76 + hash(i, 62) * 120;
    if (x > 190 && y > 150) continue;
    p.set(x, y, hx(hash(i, 63) > 0.5 ? '#f2eee0' : '#e7c45a'));
  }
  for (const [x, y, w, h, s] of [[30, 100, 16, 6, 71], [120, 96, 14, 5, 72], [70, 130, 18, 7, 73], [176, 140, 14, 6, 74]])
    tuft(p, x, y, w, h, s);
}
let cached: Px | undefined;
const orchard: Scene = (p, t) => {
  if (!cached || cached.w !== p.w || cached.h !== p.h) {
    cached = new Px(p.w, p.h);
    paintStill(cached);
  }
  p.data.set(cached.data);
  // Two swallows circle far over the hills, whole cycles over the three-second loop.
  for (let i = 0; i < 2; i++) {
    const a = (t * TAU) / 3 + i * 3.1,
      x = 104 + i * 14 + Math.cos(a) * 9,
      y = 36 + i * 4 + Math.sin(a) * 3;
    const wing = Math.sin(a * 4) > 0 ? 1 : 0;
    p.set(x, y, hx('#4b5d63'));
    p.set(x - 1, y - wing, hx('#4b5d63'));
    p.set(x + 1, y - wing, hx('#4b5d63'));
  }
};
orchard.ground = (x) => (x > 140 ? TREE_FLOOR : HOME_FLOOR);
orchard.front = [
  {
    id: 'orchard-tuft-left',
    depth: HOME_FLOOR + 22,
    paint(p) {
      tuft(p, 14, 204, 26, 14, 81);
      tuft(p, 36, 207, 18, 10, 82);
    },
  },
  {
    id: 'orchard-tuft-right',
    depth: HOME_FLOOR + 24,
    paint(p) {
      tuft(p, 236, 206, 28, 15, 83);
      for (const [x, y] of [[226, 196], [244, 192]]) {
        p.line(x, y + 9, x + 1, y, hx('#67784a'));
        p.ell(x + 1, y, 2.2, 2.2, hx('#f2eee0'));
        p.set(x + 1, y, hx('#e7c45a'));
      }
    },
  },
];
export default orchard;
