// The city at the far right and the suspended flight of stairs are movable scenery drawn by the keeper.
import { hx, mixc, hash } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import type { Scene, XY } from '../types';
import { face } from './relief';
const palette = {
  sky: '#403c60',
  dusk: '#977183',
  haze: '#dfa58e',
  cloud: '#c08c89',
  light: '#edb99c',
  mist: '#a38692',
  far: '#85778b',
  farLit: '#aa8d94',
  edge: '#a58b96',
  cliff: '#514a67',
  rock: '#61566b',
  stone: '#9d8290',
  cap: '#c4a6a1',
  gold: '#e8c19b',
  dark: '#383a52',
  blue: '#58697c',
  leaf: '#697d80',
};
const C = Object.fromEntries(Object.entries(palette).map(([k, v]) => [k, hx(v)]));
let cache: Px;
const terraceEdge = (x: number) => 171 + 7 * Math.sin((x - 24) / 57) + 0.027 * (x - 128);
function polygon(p: Px, pts: XY[], tone: keyof typeof palette) {
  face(p, pts, C[tone]);
}
function arch(p: Px, x: number, y: number, w: number, h: number, thick: number, near: boolean) {
  const at = (a: number, r: number): XY => [x + Math.cos(a) * r, y - h + 3 - Math.sin(a) * r * 0.98];
  p.rect(x - w, y - h + 2, x - w + thick, y, near ? C.cliff : C.far);
  p.rect(x + w - thick, y - h + 2, x + w, y, near ? C.cliff : C.far);
  p.rect(x - w + 1, y - h + 1, x - w + 2, y, near ? C.edge : C.farLit);
  for (let k = 0; k < 14; k++) {
    const a = (k * Math.PI) / 14,
      b = ((k + 1) * Math.PI) / 14;
    const pts = [at(a, w), at(b, w), at(b, w - thick), at(a, w - thick)];
    face(p, pts, near ? (k % 4 ? C.rock : C.stone) : k % 3 ? C.far : C.farLit);
    p.line(...pts[0], ...pts[1], near ? C.cap : C.farLit);
  }
  for (const s of [-1, 1])
    for (let k = 0; k < h - 4; k += 9) {
      const px = x + s * (w - thick * 0.5);
      p.line(px - thick * 0.46, y - k, px + thick * 0.43, y - k - 1, near ? C.dark : C.far);
    }
}
function island(p: Px, x: number, y: number, w: number, depth: number, near: boolean) {
  const ridge: XY[] = [];
  for (let k = 0; k <= 12; k++)
    ridge.push([x - w + (2 * w * k) / 12, y + (hash(k, x, y) - 0.5) * 4 + 2 * Math.sin(k * 0.8)]);
  const low: XY[] = ridge.map(([a, b], k) => [
    a + Math.sin(k) * 4,
    b + 3 + depth * (0.23 + 0.73 * hash(k, x, 21)) * Math.sin((Math.PI * k) / 12),
  ]);
  for (let i = 1; i < ridge.length; i++) {
    polygon(
      p,
      [ridge[i - 1], ridge[i], low[i], low[i - 1]],
      near ? (i % 3 ? 'rock' : 'cliff') : i % 3 ? 'far' : 'farLit',
    );
    p.line(...ridge[i - 1], ...ridge[i], near ? C.cap : C.mist);
    if (i % 3 === 1) p.line(ridge[i][0] - 1, ridge[i][1] + 3, low[i][0], low[i][1] - 1, near ? C.edge : C.farLit);
  }
}
function backdrop() {
  const p = new Px(256, 208);
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const u = y / 208,
        horizon = Math.exp(-Math.pow((y - 115) / 59, 2)),
        glow = Math.max(0, 1 - Math.hypot((x - 137) / 171, (y - 99) / 128));
      const shade = mixc(C.sky, C.dusk, Math.min(1, u * 1.4 + 0.12 * glow));
      p.set(x, y, mixc(shade, C.haze, Math.min(1, horizon * (0.43 + 0.36 * glow) + 0.021 * hash(x >> 1, y >> 1, 17))));
    }
  // Distant cloud banks are carved into flattened lobes, with just a lit upper rim.
  for (let bank = 0; bank < 8; bank++) {
    const y = 43 + bank * 18;
    for (let i = -2; i < 19; i++) {
      const x = i * 19 + Math.sin(i + bank) * 9,
        h = 4 + hash(i, bank, 1) * 8,
        b = y + 9 * Math.sin(i * 0.7 + bank);
      p.ell(x, b, 18 + 10 * hash(i, bank, 5), h, mixc(C.mist, C.light, 0.22 + bank * 0.049));
      if (i % 3 === 0) p.line(x - 9, b - h + 2, x + 3, b - h + 1, mixc(C.cloud, C.light, 0.59));
    }
  }
  for (let k = 0; k < 90; k++) {
    const x = hash(k, 2, 12) * 255,
      y = 5 + hash(k, 3, 12) * 84;
    if (hash(k, 9, 2) > 0.72) p.set(x, y, mixc(C.mist, C.gold, 0.38));
  }
  // Far viaduct, too distant to compete with the face.
  for (let k = 0; k < 8; k++) arch(p, -7 + k * 29, 131, 15, 18, 3, false);
  p.line(0, 97, 225, 97, C.farLit);
  p.line(0, 99, 224, 99, C.far);
  island(p, 44, 93, 30, 33, false);
  arch(p, 41, 93, 10, 14, 3, false);
  island(p, 222, 119, 26, 38, true);
  arch(p, 225, 116, 11, 15, 3, false);
  // Isolated door and sunlit stair on a floating landing at the left.
  island(p, 25, 144, 44, 48, true);
  arch(p, 21, 142, 18, 29, 5, true);
  for (let i = 0; i < 13; i++) {
    const x = 29 + 4 * i,
      y = 139 - 3 * i;
    p.rect(x, y, x + 7, y + 3, C.rock);
    p.line(x, y, x + 7, y, C.cap);
  }
  // The front terrace has a rounded edge, alternating cut blocks and hanging masonry underneath.
  for (let x = 0; x < 256; x++) {
    const y = terraceEdge(x),
      back = 147 + 4 * Math.sin(x / 41);
    for (let v = Math.round(back); v <= y; v++)
      p.set(x, v, mixc(C.stone, C.cap, 0.25 + (0.31 * (v - back)) / (y - back) + 0.14 * hash(x >> 2, v >> 1, 7)));
    p.line(x, y + 1, x, y + 4, C.cliff);
    p.line(x, y + 5, x, y + 7, C.edge);
  }
  for (let k = -1; k < 13; k++) {
    const x = k * 25 + 4,
      y = terraceEdge(x),
      x2 = x + 24,
      y2 = terraceEdge(x2),
      dev = 13 + hash(k, 7, 8) * 20;
    polygon(
      p,
      [
        [x, y + 8],
        [x2, y2 + 8],
        [x2 - 2, y2 + dev],
        [x + 7, y + dev + 5],
      ],
      k % 3 ? 'rock' : 'cliff',
    );
    p.line(x + 2, y + 11, x + 7, y + dev, C.edge);
    p.line(x, y + 8, x2, y2 + 8, C.cap);
    for (let m = 0; m < 4; m++) p.line(x + m * 2 + 3, y + 2, x + m * 2 + 4, y + 2, C.cap);
  }
  for (let row = 0; row < 4; row++)
    for (let i = -1; i < 15; i++) {
      const x = i * 23 + (row % 2) * 10,
        y = 150 + row * 5 + 4 * Math.sin(x / 47);
      p.line(x, y, x + 12, y - 1, C.stone);
      p.line(x + 13, y, x + 17, y + 3, C.stone);
    }
  return p;
}
const scene: Scene = (p, t) => {
  cache ??= backdrop();
  p.data.set(cache.data);
  const a = (t * 2 * Math.PI) / 3;
  for (let k = 0; k < 16; k++) {
    const x = 7 + hash(k, 3, 3) * 238,
      y = 17 + hash(k, 4, 3) * 111,
      dx = Math.sin(a + k * 0.83) * 3;
    p.line(x + dx, y, x + dx + 2 + hash(k, 0, 1) * 5, y, C.farLit);
  }
  // Flags and flying swifts belong to the islands, each with its own return phase.
  for (const [x, y] of [
    [41, 68],
    [226, 85],
    [18, 89],
  ]) {
    p.line(x, y, x, y - 7, C.cliff);
    const d = 1.6 * Math.sin(a + x);
    polygon(
      p,
      [
        [x + 1, y - 7],
        [x + 7, y - 6 + d],
        [x + 1, y - 3],
      ],
      'edge',
    );
  }
  for (let i = 0; i < 4; i++) {
    const x = 77 + 15 * i + 14 * Math.sin(a + i * 0.66),
      y = 43 + 8 * Math.sin(a + i * 0.76),
      flap = Math.sin(3 * a + i);
    p.line(x - 3, y - flap * 2, x, y + 1, C.cliff);
    p.line(x, y + 1, x + 3, y - flap, C.cliff);
  }
};
scene.front = [4, 9, 240, 248].map((x) => ({
  id: 'terrace-grass-' + x,
  depth: Math.round(terraceEdge(x) + 1),
  paint(p) {
    const ground = terraceEdge(x) + 1;
    for (let k = 0; k < 7; k++) {
      const height = 2 + hash(x, k, 15) * 7;
      p.line(x + k * 0.6, ground, x + (k - 3) * 1.4, ground - height, C.leaf);
    }
  },
}));
export default scene;
