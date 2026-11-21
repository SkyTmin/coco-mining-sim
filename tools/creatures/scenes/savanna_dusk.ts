// «Саванна на закате» (canon §8.3: far plan in the top third, the floor below, a front plan). Far: a sunset sky from
// violet to gold with a striped sun half sunk behind the horizon, thin haze bands, a wedge of birds, flat-topped
// acacias and two giraffes in silhouette, one dipping its neck. Middle: a fat baobab on the left, golden grass with a
// heat shimmer, a tall termite mound on the right (its holes are where the termites live). Floor: dusty red earth with
// cracks, pebbles, tufts of dry grass and a dung beetle pushing its ball. Front plan: dry grass in the left corner and a
// round stone on the right. Light from the low sun on the right. Loops every 3 s.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { RGBA } from '../rig/f15-rig';
import { Px } from '../rig/px';
import type { Scene } from '../types';
import { face, type Point } from './relief';

const W = 160,
  H = 128;
/** The horizon line; the fx put dust and footprints relative to it. */
export const HORIZON = 42;
/** The termite mound: its base centre, top and the holes the termites come out of (field pixels). */
export const MOUND = { x: 140, base: 92, top: 46, holes: [[136, 66], [143, 74], [138, 82]] as [number, number][] };

const skyC = [hx('#3a2a5e'), hx('#6a3a72'), hx('#a8506e'), hx('#e0745a'), hx('#f6a24e'), hx('#ffd27a')];
const sunC = [hx('#ffe9a0'), hx('#fff6d0'), hx('#ffc860')];
const far = [hx('#4a2a44'), hx('#5e3448'), hx('#74404c')];
const grassC = [hx('#8a5a26'), hx('#a8722e'), hx('#c48c3a'), hx('#dcaa4c'), hx('#eec56a')];
const earth = [hx('#6e3a22'), hx('#88482a'), hx('#a05a32'), hx('#b8703e'), hx('#cc8a50'), hx('#dca468')];
const clay = [hx('#4e2416'), hx('#6e3420'), hx('#8e462a'), hx('#ac5c36'), hx('#c87a48'), hx('#e09a62')];
const bark = [hx('#3a2a2a'), hx('#544038'), hx('#6e5448'), hx('#8a6c5a'), hx('#a88a72')];
const leaf = [hx('#2e3a1e'), hx('#44522a'), hx('#5e6e34'), hx('#7a8a44')];
const stone = [hx('#4a3a36'), hx('#66524a'), hx('#827060'), hx('#a08c78'), hx('#bea896')];
const beetle = [hx('#141018'), hx('#2a2434'), hx('#4a4466')];
const dung = [hx('#4a3020'), hx('#664430'), hx('#866044')];
const bird = hx('#3a2236');

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function put(p: Px, x: number, y: number, c: RGBA) {
  const X = Math.round(x),
    Y = Math.round(y);
  if (X >= 0 && Y >= 0 && X < W && Y < H) p.set(X, Y, c);
}
function dither(p: Px, x: number, y: number, a: RGBA, b: RGBA, u: number) {
  // Ordered 2×2 dither between two tones.
  const m = [0.2, 0.7, 0.95, 0.45][(x & 1) + 2 * (y & 1)];
  put(p, x, y, u > m ? b : a);
}

function sky(p: Px, t: number) {
  for (let y = 0; y < HORIZON; y++) {
    const u = (y / HORIZON) * (skyC.length - 1),
      i = Math.min(skyC.length - 2, Math.floor(u));
    for (let x = 0; x < W; x++) dither(p, x, y, skyC[i], skyC[i + 1], u - i);
  }
  // A few faint stars still in the violet top.
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(hash(i, 3) * W),
      y = Math.floor(hash(i, 4) * 9);
    if ((Math.floor(t * 2) + i) % 5 !== 0) put(p, x, y, hx('#c8b8e8'));
  }
  // The big sun half sunk behind the horizon, cut by thin haze stripes; a soft glow round it.
  const cx = 112,
    cy = HORIZON + 1,
    r = 15;
  for (let y = cy - r - 8; y < HORIZON; y++)
    for (let x = cx - r - 12; x < cx + r + 12; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d < r) {
        const stripe = y > cy - 7 && (y - cy + 40) % 4 === 0;
        put(p, x, y, stripe ? skyC[4] : d < r - 4 ? sunC[1] : sunC[0]);
      } else if (d < r + 10) dither(p, x, y, p.get(x, y) as RGBA, sunC[2], (1 - (d - r) / 10) * 0.7);
    }
  // Long thin haze bands across the sun.
  for (const [y, x0, x1] of [[HORIZON - 9, 70, 150], [HORIZON - 5, 84, 160], [HORIZON - 15, 92, 138]] as [number, number, number][])
    for (let x = x0; x < x1; x++) if ((x + y) % 7) put(p, x, y, mixc(p.get(x, y) as RGBA, skyC[2], 0.55));
}
function birds(p: Px, t: number) {
  // A small wedge flying slowly left, wings flapping.
  for (let i = 0; i < 5; i++) {
    const row = Math.abs(i - 2);
    const x = 60 - ((t / 3) * 14) + row * 4 + (i > 2 ? 1 : 0),
      y = 12 + row * 2 + (i % 2);
    const flap = Math.floor(t * 6 + i) % 2;
    put(p, x - 1, y - flap, bird);
    put(p, x, y, bird);
    put(p, x + 1, y - flap, bird);
  }
}
function acacia(p: Px, x: number, y: number, s: number) {
  // A flat-topped acacia: thin forked trunk, a wide layered crown.
  for (let k = 0; k < 7 * s; k++) {
    put(p, x, y - k, far[0]);
    if (k > 3 * s) put(p, x + Math.round((k - 3 * s) * 0.6), y - k, far[0]);
  }
  for (let row = 0; row < 3 * s; row++) {
    const half = (9 - row * 1.4) * s;
    for (let dx = -half; dx <= half; dx++) if (hash(Math.round(x + dx), row) > 0.12) put(p, x + 2 + dx, y - 7 * s - row, far[row === 0 ? 1 : 0]);
  }
}
function giraffe(p: Px, x: number, y: number, dip: number, c: RGBA) {
  // A small solid silhouette: thin long legs, a short body sloping to the tail, a two-pixel neck with a head,
  // ossicones on top; the neck dips to graze. Faces right.
  for (const lx of [0, 1, 5, 6]) for (let k = 0; k < 6; k++) put(p, x + lx, y - k, c);
  for (let k = 0; k < 8; k++) for (let r = 0; r < 3; r++) put(p, x - 1 + k, y - 6 - r - Math.round(k * 0.3), c);
  put(p, x - 2, y - 7, c);
  put(p, x - 2, y - 6, c);
  const steps = 9;
  const ax = 0.25 + dip * 0.75,
    ay = 1 - dip * 0.95;
  let nx = x + 6,
    ny = y - 9;
  for (let k = 0; k < steps; k++) {
    put(p, nx + Math.round(k * ax), ny - Math.round(k * ay), c);
    put(p, nx + 1 + Math.round(k * ax), ny - Math.round(k * ay), c);
  }
  nx += Math.round(steps * ax);
  ny -= Math.round(steps * ay);
  put(p, nx + 1, ny, c);
  put(p, nx + 2, ny, c);
  put(p, nx + 3, ny + 1, c);
  put(p, nx + 2, ny + 1, c);
  put(p, nx, ny - 1, c);
  put(p, nx + 1, ny - 2, c);
}
function farLand(p: Px, t: number) {
  // Low hills on the horizon, then the trees and giraffes against the glow.
  for (let x = 0; x < W; x++) {
    const h = Math.max(1, 2 + Math.round(2 * Math.sin(x * 0.07) + Math.sin(x * 0.19 + 1)));
    for (let y = HORIZON - h; y < HORIZON + 2; y++) put(p, x, y, y < HORIZON ? far[1] : far[2]);
  }
  acacia(p, 30, HORIZON, 1);
  acacia(p, 88, HORIZON + 1, 0.8);
  acacia(p, 150, HORIZON, 1.1);
  const dip = Math.max(0, Math.sin((t / 3) * TAU));
  giraffe(p, 58, HORIZON, dip, far[0]);
  giraffe(p, 70, HORIZON + 1, 0, far[0]);
  giraffe(p, 47, HORIZON - 1, 0, far[1]);
}
function savanna(p: Px, t: number) {
  // Golden grass band behind the floor, with a heat shimmer.
  for (let y = HORIZON + 2; y < 62; y++) {
    const u = (y - HORIZON - 2) / 20;
    for (let x = 0; x < W; x++) {
      const v = clamp(u * 3 + 0.6 * Math.sin(x * 0.4 + y), 0, 3.99);
      const i = Math.floor(v);
      dither(p, x, y, grassC[i], grassC[i + 1], v - i);
    }
  }
  for (let x = 0; x < W; x += 2) {
    const h = 2 + Math.floor(hash(x, 7) * 4);
    for (let k = 0; k < h; k++) put(p, x + (k > 1 ? 1 : 0), 61 - k, grassC[k % 2 ? 4 : 3]);
  }
  const wob = Math.floor((t / 3) * 12);
  for (let i = 0; i < 4; i++) {
    const y = HORIZON + 4 + i * 4;
    for (let x = 0; x < W; x++) if ((x + wob + i * 5) % 11 < 4) put(p, x, y, mixc(p.get(x, y) as RGBA, sunC[2], 0.25));
  }
}
function ground(p: Px) {
  // Dusty red earth with ordered dither, lighter towards the sun on the right.
  for (let y = 62; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = clamp(1.4 + (y - 62) / 40 + (x / W) * 1.6 + 0.35 * Math.sin(x * 0.21 + y * 0.13), 0, 4.99);
      const i = Math.floor(v);
      dither(p, x, y, earth[i], earth[i + 1], v - i);
    }
  // Cracks in the dry earth.
  const crack = (x: number, y: number, n: number, seed: number) => {
    for (let k = 0; k < n; k++) {
      put(p, x, y, earth[0]);
      put(p, x + 1, y, earth[k % 2 ? 1 : 0]);
      x += hash(seed, k) > 0.5 ? 2 : 1;
      y += hash(seed, k, 2) > 0.6 ? 1 : hash(seed, k, 3) > 0.7 ? -1 : 0;
    }
  };
  crack(10, 108, 14, 1);
  crack(52, 118, 10, 2);
  crack(96, 112, 12, 3);
  crack(62, 84, 7, 4);
  // Pebbles with a lit side towards the sun.
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(hash(i, 11) * W),
      y = 66 + Math.floor(hash(i, 12) * 60);
    put(p, x, y, stone[1]);
    put(p, x + 1, y, stone[3]);
    if (i % 3 === 0) put(p, x + 1, y - 1, stone[4]);
  }
}
function tuft(p: Px, x0: number, y0: number, n: number, t: number) {
  for (let i = 0; i < n; i++) {
    const lean = (i - n / 2) * 0.5 + Math.sin(t * 2 + i + x0) * 0.4;
    for (let k = 0; k < 4 + (i % 3) * 2; k++) put(p, x0 + i + Math.round(lean * k * 0.4), y0 - k, grassC[k > 3 ? 4 : 2 + (i % 2)]);
  }
}
function baobab(p: Px) {
  // A fat bottle trunk, widest low, flat top with stubby root-like branches and tufts of leaves; vertical bark
  // grooves, lit from the right.
  const cx = 18,
    top = 27,
    base = 66;
  for (let y = top; y < base; y++) {
    const u = (y - top) / (base - top);
    const half = 5 + 3 * Math.sin(u * Math.PI * 0.85) + (u > 0.88 ? (u - 0.88) * 25 : 0);
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const lit = (x - cx) / half;
      let c = lit > 0.6 ? bark[4] : lit > 0.15 ? bark[3] : lit > -0.45 ? bark[2] : bark[1];
      const groove = Math.round(lit * 4 + Math.sin(y * 0.3) * 0.4);
      if (Math.abs(lit * 4 - groove) < 0.12 && Math.abs(lit) < 0.9) c = lit > 0.3 ? bark[2] : bark[0];
      put(p, x, y, c);
    }
  }
  for (const [x1, y1] of [[4, 19], [10, 15], [18, 13], [26, 15], [33, 20]] as [number, number][]) {
    for (let k = 0; k <= 10; k++) {
      const e = k / 10;
      const x = Math.round(cx + (x1 - cx) * e),
        y = Math.round(top + 1 + (y1 - top - 1) * Math.sqrt(e));
      put(p, x, y, bark[x > cx ? 3 : 2]);
      put(p, x, y + 1, bark[1]);
      if (k < 6) put(p, x + (x1 > cx ? -1 : 1), y, bark[2]);
    }
    for (let i = 0; i < 16; i++) {
      const lx = x1 - 3 + Math.floor(hash(x1, i) * 8),
        ly = y1 - 3 + Math.floor(hash(y1, i, 5) * 4);
      put(p, lx, ly, leaf[(i % 3) + (lx > x1 ? 1 : 0)]);
    }
  }
  for (let x = cx - 12; x < cx + 13; x++) put(p, x, base, earth[0]);
}
function mound(p: Px) {
  // The termite mound: a tall lumpy clay spire with a cap, shaded away from the sun, ridges and holes.
  const { x: cx, base, top } = MOUND;
  for (let y = top; y <= base; y++) {
    const u = (y - top) / (base - top);
    const half = 2.5 + 9.5 * Math.pow(u, 0.7) + 1.4 * Math.sin(y * 0.55) * u;
    const lean = Math.sin(u * 2.4) * 1.5;
    for (let x = Math.round(cx - half + lean); x <= Math.round(cx + half + lean); x++) {
      const s = (x - cx - lean) / half;
      const v = clamp(2.2 + s * 2.2 + 0.4 * Math.sin(y * 0.9 + x * 0.3), 0, 4.99);
      const i = Math.floor(v);
      dither(p, x, y, clay[i], clay[i + 1], v - i);
    }
  }
  // A small chimney cap and a second lump.
  face(p, [[cx - 3, top + 2], [cx - 1, top - 4], [cx + 2, top - 3], [cx + 3, top + 3]] as Point[], clay[3]);
  face(p, [[cx - 14, base], [cx - 13, base - 10], [cx - 9, base - 14], [cx - 6, base - 6], [cx - 6, base]] as Point[], clay[2]);
  for (let y = base - 12; y < base; y++) put(p, cx - 8, y, clay[4]);
  // Ridges and the termite holes.
  for (let k = 0; k < 6; k++) for (let x = -6; x <= 6; x += 2) if (hash(k, x) > 0.4) put(p, cx + x + (k % 2), top + 12 + k * 6, clay[1]);
  for (const [x, y] of MOUND.holes) {
    put(p, x, y, clay[0]);
    put(p, x + 1, y, clay[0]);
    put(p, x, y + 1, clay[1]);
    put(p, x + 1, y - 1, clay[4]);
  }
  // Contact shadow on the ground.
  for (let x = cx - 16; x < cx + 14; x++) put(p, x, base + 1, earth[0]);
}
function dungBeetle(p: Px, t: number) {
  // It pushes its ball a step, slips, pushes again: the ball turns, the legs scurry.
  const push = Math.sin((t / 3) * TAU * 2);
  const bx = 34 + push * 1.5,
    by = 120;
  // The ball, its texture turning.
  for (let y = -3; y <= 3; y++)
    for (let x = -3; x <= 3; x++) {
      if (x * x + y * y > 10) continue;
      const turn = Math.floor(t * 8 + x - y) % 3;
      put(p, bx + x, by + y - 3, x + y < -2 ? dung[2] : turn ? dung[1] : dung[0]);
    }
  // The beetle, head down against the ball, back legs on it.
  const ex = bx + 5,
    ey = by - 1;
  face(p, [[ex, ey - 2], [ex + 4, ey - 3], [ex + 6, ey - 1], [ex + 4, ey + 1], [ex, ey]] as Point[], beetle[1]);
  put(p, ex + 3, ey - 2, beetle[2]);
  const step = Math.floor(t * 10) % 2;
  for (const [lx, ly] of [[1, 1], [3, 2], [5, 1]] as [number, number][]) put(p, ex + lx + step, ey + ly, beetle[0]);
  put(p, ex - 1, ey - 3 + step, beetle[0]);
  put(p, ex - 2, ey - 4 + step, beetle[0]);
}
function stoneProp(p: Px) {
  // A round stone in the front right corner, lit from the right.
  for (let y = 112; y < H; y++)
    for (let x = 138; x < W; x++) {
      const d = Math.hypot((x - 152) / 14, (y - 128) / 14);
      if (d > 1) continue;
      const lit = (x - 146) / 14 - (y - 116) / 20;
      put(p, x, y, lit > 0.45 ? stone[4] : lit > 0.1 ? stone[3] : lit > -0.3 ? stone[2] : stone[1]);
    }
  for (let i = 0; i < 5; i++) put(p, 144 + i * 3, 118 + (i % 2), stone[0]);
}

const scene: Scene = (p: Px, t: number) => {
  sky(p, t);
  birds(p, t);
  farLand(p, t);
  savanna(p, t);
  baobab(p);
  ground(p);
  mound(p);
  tuft(p, 8, 76, 6, t);
  tuft(p, 100, 70, 5, t + 0.7);
  tuft(p, 60, 98, 4, t + 1.3);
  tuft(p, 118, 106, 5, t + 2.1);
  dungBeetle(p, t);
};
scene.front = [
  {
    id: 'grass-and-stone',
    depth: 124,
    paint(p) {
      stoneProp(p);
      tuft(p, 0, 127, 9, 0);
      tuft(p, 4, 127, 6, 1);
    },
  },
];
export default scene;
