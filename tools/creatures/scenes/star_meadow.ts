// «Звёздная поляна»: the grassy top of a hill at night (canon §8.3: far plan in the top third, the meadow floor
// below it, a front plan). Above: a deep sky with the Milky Way running corner to corner, a thin crescent moon at the
// upper left that lights everything from that side, low hills and a lake that mirrors the stars. On the hilltop: an
// old stone circle (the back arc with one trilithon), a meadow of dark blue-green grass with clover, pebbles and
// glowing bell flowers. Front plan: tall grass and a mossy boulder in the corners. It lives a little: a few stars
// twinkle, the bell flowers breathe, three fireflies wander. Loops every 3 s.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { RGBA } from '../rig/f15-rig';
import { Px } from '../rig/px';
import type { Scene } from '../types';
import { face, type Point } from './relief';

const W = 256,
  H = 208;
/** The crest of the hill: the far plan is the top 30 % of the field. */
export const CREST = 62;
/** The crescent moon; the fx put a halo and the falling stars' trails relative to it. */
export const MOON = { x: 34, y: 17, r: 7 };
/** The trilithon at the back of the stone circle, where the comet-form fx light the stones. */
export const STONES: { x: number; y: number; w: number; h: number }[] = [
  { x: 24, y: 100, w: 12, h: 24 },
  { x: 62, y: 84, w: 10, h: 19 },
  { x: 96, y: 77, w: 8, h: 15 },
  { x: 116, y: 76, w: 8, h: 19 },
  { x: 142, y: 76, w: 8, h: 19 },
  { x: 166, y: 77, w: 7, h: 13 },
  { x: 198, y: 84, w: 10, h: 18 },
  { x: 234, y: 100, w: 12, h: 23 },
];

const sky = [hx('#05071a'), hx('#080b22'), hx('#0b102c'), hx('#101737'), hx('#152042')];
const milk = [hx('#1a1f4a'), hx('#262a5e'), hx('#353a72'), hx('#4a4c86')];
const hillFar = [hx('#0d1434'), hx('#121b40'), hx('#18234c')];
const hillNear = [hx('#090e26'), hx('#0d1430'), hx('#111a3a')];
const lake = [hx('#0a1230'), hx('#101a40'), hx('#18244e'), hx('#26346a')];
const grass = [hx('#0a1620'), hx('#0e1e2a'), hx('#122634'), hx('#17303e'), hx('#1d3a48'), hx('#264a56'), hx('#33606a')];
const earth = [hx('#0c1418'), hx('#121c20'), hx('#18242a')];
const stone = [hx('#141826'), hx('#1e2436'), hx('#2a3248'), hx('#38425a'), hx('#4c5874'), hx('#66738e')];
const moss = [hx('#14261e'), hx('#1c3528'), hx('#284634')];
const bloom = [hx('#3a5a8a'), hx('#6fa4d8'), hx('#bfe4ff'), hx('#ffffff')];
const clover = [hx('#10281e'), hx('#163626'), hx('#1e4630')];
const starHi = hx('#e8ecff'),
  starMid = hx('#9aa6dc'),
  starLow = hx('#56609a'),
  moonLit = hx('#f0ead0'),
  moonMid = hx('#c8c2a6'),
  firefly = hx('#d8ff8a'),
  fireflyGlow = hx('#7a9a3a');

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const wave = (t: number, k: number, phase = 0) => Math.sin((t * TAU * k) / 3 + phase);
const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dither = (x: number, y: number) => bayer[(y & 3) * 4 + (x & 3)] / 16;
const tint = (p: Px, x: number, y: number, c: RGBA, k: number) => {
  x = Math.round(x);
  y = Math.round(y);
  if (x >= 0 && y >= 0 && x < W && y < H) p.set(x, y, mixc(p.get(x, y), c, clamp(k, 0, 1)));
};
const put = (p: Px, x: number, y: number, c: RGBA) => {
  x = Math.round(x);
  y = Math.round(y);
  if (x >= 0 && y >= 0 && x < W && y < H) p.set(x, y, c);
};

// ---- far plan ------------------------------------------------------------------------------------
/** Centre line of the Milky Way at column x: from the upper right down to the left horizon. */
const milkY = (x: number) => 4 + (256 - x) * 0.2 + 4 * Math.sin(x * 0.03);
function skyDome(p: Px, t: number) {
  for (let y = 0; y < CREST; y++)
    for (let x = 0; x < W; x++) {
      const g = y / CREST + dither(x, y) * 0.18;
      p.set(x, y, sky[clamp(Math.floor(g * 4.6), 0, 4)]);
      // The galactic band: a dithered haze with a dark dust lane through its middle.
      const d = Math.abs(y - milkY(x));
      const haze = Math.max(0, 1 - d / 11) * (0.75 + 0.25 * Math.sin(x * 0.11 + y * 0.07));
      const lane = Math.abs(y - milkY(x) - 1.5 + 2 * Math.sin(x * 0.05)) < 1.2 + 0.8 * Math.sin(x * 0.07) && dither(x, y) > 0.3;
      if (haze > 0 && !lane) {
        const lv = Math.floor(haze * 3.6 + dither(x, y) * 0.9);
        if (lv > 0) p.set(x, y, mixc(p.get(x, y), milk[clamp(lv - 1, 0, 3)], 0.7));
      }
    }
  // Stars: dense inside the band, sparse outside; a few twinkle on their own beat.
  for (let k = 0; k < 340; k++) {
    const x = Math.floor(hash(k, 11) * W),
      y = Math.floor(hash(k, 12) * (CREST - 6));
    const inBand = Math.abs(y - milkY(x)) < 10;
    if (!inBand && hash(k, 13) > 0.45) continue;
    const b = hash(k, 14);
    let c = b > 0.93 ? starHi : b > 0.7 ? starMid : starLow;
    if (b > 0.85 && hash(k, 15) > 0.6) {
      const tw = wave(t, 1 + Math.floor(hash(k, 16) * 3), hash(k, 17) * TAU);
      c = tw > 0.4 ? starHi : tw < -0.5 ? starLow : starMid;
    }
    put(p, x, y, c);
    if (b > 0.965) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) tint(p, x + dx, y + dy, c, 0.45);
  }
}
function moon(p: Px) {
  const { x: cx, y: cy, r } = MOON;
  // A soft halo, then the crescent: the lit disc minus a disc shifted to the lower right.
  for (let y = cy - r * 3; y <= cy + r * 3; y++)
    for (let x = cx - r * 3; x <= cx + r * 3; x++) {
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d > 1 && d < 3) tint(p, x, y, hx('#3a4270'), 0.25 * (1 - (d - 1) / 2) + (dither(x, y) - 0.5) * 0.05);
    }
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++) {
      const inner = Math.hypot(x - cx, y - cy) <= r;
      const cut = Math.hypot(x - cx - 3.6, y - cy + 1.6) <= r - 0.6;
      if (inner && !cut) put(p, x, y, Math.hypot(x - cx + 2, y - cy + 1) < r - 2 ? moonLit : moonMid);
    }
}
function hills(p: Px) {
  // Two ranges of low hills; the far one paler (air between), its ridge catching the moon on the left slopes.
  const ridge = (x: number, seed: number, base: number, amp: number) =>
    base - amp * (0.55 + 0.45 * Math.sin(x * 0.021 + seed) * Math.sin(x * 0.047 + seed * 2)) - 2 * Math.sin(x * 0.13 + seed);
  for (let x = 0; x < W; x++) {
    const far = Math.round(ridge(x, 1.3, 54, 12)),
      near = Math.round(ridge(x, 4.1, 60, 9));
    const slopeFar = ridge(x + 1, 1.3, 54, 12) - ridge(x, 1.3, 54, 12);
    for (let y = far; y < CREST; y++) p.set(x, y, hillFar[y === far && slopeFar > 0.1 ? 2 : y < far + 3 ? 1 : 0]);
    // The lake lies between the ranges in the middle of the view.
    const lakeEdge = Math.abs(x - 140) < 64 - 10 * Math.sin(x * 0.07);
    if (lakeEdge)
      for (let y = 56; y < CREST; y++) {
        const lv = y === 56 ? 3 : (y + x) % 7 === 0 ? 2 : y < 59 ? 1 : 0;
        p.set(x, y, lake[lv]);
        // Reflected stars shiver in the water.
        if (hash(x, y, 21) > 0.95) p.set(x, y, starMid);
      }
    // The near range parts in the middle to show the lake.
    const gap = Math.max(0, 1 - Math.abs(x - 140) / 70);
    const nearTop = Math.round(near + gap * gap * 10);
    for (let y = nearTop; y < CREST; y++) p.set(x, y, hillNear[y === nearTop ? 2 : y < nearTop + 2 ? 1 : 0]);
  }
  // A path of moonlight on the lake under the moon's bearing.
  for (let y = 57; y < CREST; y++) for (let x = 92; x < 108; x += 2) if (hash(x, y, 22) > 0.55 && p.get(x, y)[2] < 80) tint(p, x + (y & 1), y, moonMid, 0.35);
}

// ---- meadow --------------------------------------------------------------------------------------
function meadow(p: Px) {
  // The hilltop falls away at the crest; tufted rows recede upward, lit from the upper left, darker towards the crest.
  for (let y = CREST; y < H; y++)
    for (let x = 0; x < W; x++) {
      const depth = (y - CREST) / (H - CREST);
      const roll = Math.sin(x * 0.035 + y * 0.05) * 0.6 + Math.sin(x * 0.09 - y * 0.12) * 0.4;
      let lv = Math.floor(1 + depth * 2.6 + roll * 0.9 + dither(x, y) * 0.9);
      if (y < CREST + 3) lv = Math.min(lv, 1);
      // The trampled clearing inside the circle: short, even, a step lighter where the moon falls.
      const e = ((x - 128) / 104) ** 2 + ((y - 152) / 38) ** 2;
      if (e < 1) lv = Math.floor(2.3 + depth * 1.4 + ((160 - x) / 256) * 0.9 + dither(x, y) * 0.8 - e * 0.7);
      p.set(x, y, grass[clamp(lv, 0, 4)]);
    }
  // Crest line catches the moonlight; blades poke up against the lake and the hills.
  for (let x = 0; x < W; x++) {
    if (hash(x, 31) > 0.3) p.set(x, CREST, grass[3]);
    if (hash(x, 32) > 0.72) {
      const len = 1 + Math.floor(hash(x, 33) * 3);
      for (let k = 1; k <= len; k++) p.set(x, CREST - k, grass[k === len ? 3 : 2]);
    }
  }
  // Six kinds of patch, scattered on a jittered grid: three tufts, clover, a pebble, bare earth.
  for (let gy = CREST + 4; gy < H; gy += 7)
    for (let gx = 0; gx < W; gx += 9) {
      const h = hash(gx, gy, 41);
      const x = gx + Math.floor(hash(gx, gy, 42) * 8),
        y = gy + Math.floor(hash(gx, gy, 43) * 6);
      const near = (y - CREST) / (H - CREST);
      const size = 1 + Math.round(near * 3);
      const inside = ((x - 128) / 104) ** 2 + ((y - 152) / 38) ** 2 < 1;
      if (h < (inside ? 0.12 : 0.5)) tuft(p, x, y, size, Math.floor(h * 7));
      else if (h < 0.52) cloverPatch(p, x, y);
      else if (h < 0.58) pebble(p, x, y, size);
      else if (h < 0.62) for (let k = 0; k < 4 + size * 2; k++) put(p, x + (k % 4) - 1, y + Math.floor(k / 4), earth[(k + gx) % 3]);
    }
}
function tuft(p: Px, x: number, y: number, size: number, kind: number) {
  const blades = 3 + size;
  for (let b = 0; b < blades; b++) {
    const lean = (b - blades / 2) * 0.45 + (kind % 3) * 0.2 - 0.2;
    const len = 2 + size + ((b * 7 + kind) % 3);
    for (let k = 0; k < len; k++) {
      const px = x + b - Math.round(blades / 2) + Math.round(lean * k * 0.5),
        py = y - k;
      // Lit side (left) gets the lighter tone; the blade tip is the lightest.
      put(p, px, py, grass[clamp(3 + (k > len - 2 ? 2 : 0) + (lean < 0 ? 1 : 0) - (kind === 2 ? 1 : 0), 0, 6)]);
    }
  }
}
function cloverPatch(p: Px, x: number, y: number) {
  for (const [dx, dy] of [[0, 0], [2, 0], [1, -1], [1, 1], [4, 1], [5, 0], [4, -1]]) put(p, x + dx, y + dy, clover[(dx + dy + 3) % 3]);
  put(p, x + 1, y - 1, clover[2]);
}
function pebble(p: Px, x: number, y: number, size: number) {
  const w = 1 + size,
    h = Math.max(1, size - 1);
  for (let v = -h; v <= 0; v++) for (let u = -w; u <= w; u++) if ((u / (w + 0.5)) ** 2 + (v / (h + 0.5)) ** 2 <= 1) put(p, x + u, y + v, stone[u < 0 && v < 0 ? 3 : 2]);
  for (let u = -w; u <= w; u++) put(p, x + u, y + 1, grass[0]);
}
function standingStone(p: Px, s: { x: number; y: number; w: number; h: number }, seed: number) {
  const { x, y, w, h } = s;
  // A rough menhir: a jagged outline that leans a little, a moonlit left face, a shaded right face, a pale top facet.
  const lean = (hash(seed, 1, 50) - 0.5) * 4;
  const j = (k: number) => (hash(seed, k, 51) - 0.5) * 2;
  const half = w / 2;
  const L: Point[] = [
    [x - half, y],
    [x - half - 1 + j(1), y - h * 0.35],
    [x - half + 1 + lean * 0.6 + j(2), y - h * 0.8],
    [x - 1 + lean + j(3), y - h],
  ];
  const R: Point[] = [
    [x + 2 + lean + j(4), y - h + 1 + Math.abs(j(5)) * 2],
    [x + half + lean * 0.6 + j(6), y - h * 0.7],
    [x + half + 1 + j(7), y - h * 0.3],
    [x + half, y],
  ];
  const ridge: Point[] = [[x + 1 + lean, y - h + 2], [x + 1 + lean * 0.5 + j(8), y - h * 0.5], [x + 1, y]];
  face(p, [...L, R[0], ...ridge], stone[3]);
  face(p, [R[0], ...R.slice(1), ...ridge.slice().reverse()].reverse(), stone[1]);
  face(p, [L[2], L[3], R[0], ridge[0]], stone[4]);
  // Lit edge, cracks and lichen; moss creeps up from the grass.
  for (let k = 1; k < L.length; k++) p.line(Math.round(L[k - 1][0]), Math.round(L[k - 1][1]), Math.round(L[k][0]), Math.round(L[k][1]), stone[5]);
  p.line(Math.round(L[3][0]), Math.round(L[3][1]), Math.round(R[0][0]), Math.round(R[0][1]), stone[5]);
  p.line(Math.round(x - 1 + j(9)), Math.round(y - h * 0.62), Math.round(x + j(10)), Math.round(y - h * 0.42), stone[1]);
  for (let k = 0; k < 4; k++) put(p, x - half + 1 + hash(seed, k, 53) * (w - 2), y - h * (0.3 + 0.5 * hash(seed, k, 54)), hx('#5a7a6a'));
  for (let u = -Math.ceil(half); u <= Math.ceil(half); u++) {
    const top = 2 + Math.round(hash(seed, u, 55) * 3);
    for (let v = 0; v < top; v++) if (p.get(x + u, y - v)[2] > 40 || v === 0) put(p, x + u, y - v, moss[(u + v) & 1 ? 1 : 2]);
    put(p, x + u, y + 1, grass[0]);
  }
  // Shadow on the grass to the lower right (the moon is upper left).
  for (let k = 1; k <= w + 2; k++) for (let v = 0; v < 2; v++) tint(p, x + k, y + 1 + v, hx('#03060c'), 0.5);
}
function stoneCircle(p: Px) {
  STONES.forEach((s, i) => standingStone(p, s, 60 + i));
  // The trilithon: a lintel across the two middle stones, chipped at the ends.
  const a = STONES[3],
    b = STONES[4];
  const ly = a.y - a.h - 4;
  face(p, [[a.x - 6, ly + 1], [a.x - 4, ly - 1], [b.x + 5, ly - 1], [b.x + 6, ly + 2], [b.x + 5, ly + 5], [a.x - 5, ly + 5]], stone[2]);
  face(p, [[a.x - 4, ly - 1], [b.x + 5, ly - 1], [b.x + 4, ly + 1], [a.x - 3, ly + 1]], stone[4]);
  p.line(a.x - 4, ly - 1, b.x + 5, ly - 1, stone[5]);
  p.line(a.x + 8, ly + 1, a.x + 10, ly + 4, stone[1]);
}
function bellFlowers(p: Px, t: number, front = false) {
  // Glowing bells in loose clumps; each breathes on its own phase.
  const clumps = front
    ? [[14, 196], [26, 202], [232, 198], [244, 192]]
    : [[40, 132], [62, 118], [196, 126], [218, 140], [100, 104], [160, 100], [30, 172], [226, 176], [146, 188], [88, 182]];
  clumps.forEach(([cx, cy], i) => {
    const n = front ? 2 : 3;
    for (let k = 0; k < n; k++) {
      const x = cx + Math.round((hash(i, k, 71) - 0.5) * 10),
        y = cy + Math.round((hash(i, k, 72) - 0.5) * 4);
      const stem = 4 + Math.round(hash(i, k, 73) * 3) + (front ? 3 : 0);
      for (let v = 0; v < stem; v++) put(p, x + (v > stem - 2 ? 1 : 0), y - v, grass[3]);
      const glow = 0.5 + 0.5 * wave(t, 1, hash(i, k, 74) * TAU);
      const bx = x + 1,
        by = y - stem;
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const d = Math.hypot(dx, dy);
          if (d > 1.2 && d < 3.6) tint(p, bx + dx, by + dy + 1, bloom[1], (0.18 + 0.14 * glow) * (1 - d / 3.6));
        }
      put(p, bx, by, bloom[glow > 0.6 ? 3 : 2]);
      put(p, bx - 1, by + 1, bloom[1]);
      put(p, bx + 1, by + 1, bloom[2]);
      put(p, bx, by + 1, bloom[glow > 0.3 ? 2 : 1]);
      // Their soft light on the grass below.
      for (let dx = -2; dx <= 2; dx++) tint(p, x + dx, y + 1, bloom[0], 0.25 * glow);
    }
  });
}
function fireflies(p: Px, t: number) {
  // Three fireflies on closed loops (3 s), blinking twice per loop.
  const paths = [
    { cx: 58, cy: 96, rx: 22, ry: 9, k: 1, ph: 0 },
    { cx: 206, cy: 108, rx: 18, ry: 11, k: -1, ph: 2.1 },
    { cx: 150, cy: 70, rx: 26, ry: 6, k: 1, ph: 4.2 },
  ];
  for (const f of paths) {
    const a = (t / 3) * TAU * f.k + f.ph;
    const x = f.cx + Math.cos(a) * f.rx + Math.sin(a * 2) * 3,
      y = f.cy + Math.sin(a) * f.ry + Math.cos(a * 3) * 2;
    const on = Math.max(0, Math.sin(a * 2 + f.ph)) ** 0.6;
    if (on < 0.15) {
      put(p, x, y, fireflyGlow);
      continue;
    }
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const d = Math.hypot(dx, dy);
        if (d > 0.5 && d < 2.6) tint(p, x + dx, y + dy, firefly, 0.35 * on * (1 - d / 2.6));
      }
    put(p, x, y, firefly);
  }
}
function moonlight(p: Px) {
  // A broad band of moonlight slants across the meadow from the upper left; grass tips in it turn silver.
  for (let y = CREST + 1; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = (x * 0.55 + (y - CREST) * 1.0 - 70) / 70;
      const k = Math.max(0, 1 - d * d) * 0.16;
      if (k > 0.02 && dither(x, y) < 0.75) tint(p, x, y, hx('#5a8a94'), k);
      if (k > 0.1 && hash(x, y, 61) > 0.992) put(p, x, y, hx('#bfe0e6'));
    }
}
function fallenStone(p: Px) {
  // An old toppled stone lying in the grass at the left, half sunk, mossy on top.
  face(p, [[30, 132], [36, 125], [62, 122], [70, 127], [66, 134], [34, 136]], stone[2]);
  face(p, [[36, 125], [62, 122], [64, 125], [38, 128]], stone[4]);
  p.line(36, 125, 62, 122, stone[5]);
  for (let x = 38; x < 62; x += 2) if (hash(x, 62) > 0.35) put(p, x, 124 - Math.round((x - 38) * 0.1), moss[2]);
  for (let x = 30; x <= 70; x++) for (let v = 0; v < 2; v++) tint(p, x + 2, 136 + v, hx('#03060c'), 0.5);
  p.line(48, 128, 50, 133, stone[1]);
}
function shade(p: Px) {
  // A soft vignette keeps the corners quiet and the middle of the meadow open for the fox.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = ((x - 128) / 150) ** 2 + ((y - 140) / 130) ** 2;
      const dark = clamp((k - 0.5) * 0.6, 0, 0.45);
      if (dark > 0.02 && !(dither(x, y) < 0.25 && dark < 0.05)) tint(p, x, y, hx('#03040c'), dark);
    }
}

// ---- front plan ----------------------------------------------------------------------------------
function tallGrass(p: Px, x0: number, x1: number, base: number, t: number) {
  for (let x = x0; x <= x1; x += 2) {
    const len = 10 + Math.round(hash(x, 81) * 12);
    const sway = 1.6 * wave(t, 1, x * 0.15);
    const lean = (hash(x, 82) - 0.5) * 6 + sway;
    for (let k = 0; k < len; k++) {
      const u = k / len;
      put(p, x + lean * u * u, base - k, grass[clamp(1 + Math.floor(u * 4) + (x % 4 === 0 ? 1 : 0), 0, 6)]);
    }
  }
}
function boulder(p: Px) {
  const pts: Point[] = [[0, 208], [0, 184], [8, 178], [20, 177], [30, 183], [34, 194], [36, 208]];
  face(p, pts, stone[2]);
  face(p, [[0, 184], [8, 178], [20, 177], [18, 184], [6, 190], [0, 192]], stone[4]);
  face(p, [[26, 186], [34, 194], [36, 208], [28, 208]], stone[1]);
  for (let x = 2; x < 32; x++) if (hash(x, 91) > 0.4) put(p, x, 178 + Math.round(Math.abs(x - 14) * 0.3), moss[2]);
  for (let x = 4; x < 30; x += 3) put(p, x, 196 + (x % 2), stone[1]);
}

const scene: Scene = (p: Px, t: number) => {
  skyDome(p, t);
  moon(p);
  hills(p);
  meadow(p);
  moonlight(p);
  stoneCircle(p);
  fallenStone(p);
  bellFlowers(p, t);
  fireflies(p, t);
  shade(p);
};
scene.front = [
  {
    id: 'boulder-and-grass',
    depth: 192,
    paint(p) {
      boulder(p);
      tallGrass(p, 30, 50, 207, 0);
      tallGrass(p, 214, 255, 207, 0);
      bellFlowers(p, 0, true);
    },
  },
];
export default scene;
