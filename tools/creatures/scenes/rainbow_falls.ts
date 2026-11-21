// «Радужный водопад» (canon §8.3: far plan in the top third, the floor below, a front plan). A warm tropical morning
// in a jungle gorge. Far: a turquoise sky paling to gold at the horizon, a warm sun upper right with a wide glow, two
// rows of misty jungle peaks with bands of mist. Middle: a mossy cliff on the left with a tall waterfall pouring out of
// a notch into a turquoise pool (streaks run down, foam and mist boil at its foot, the spray glitters), the round
// crowns of the far jungle between the cliff and a big tree on the right, whose lianas hang down with leaves. The pool
// runs across the middle ground with ripples, sparkles and the falls' reflection. Floor: a mossy ledge in front of the
// pool, flat stones on its edge, ferns, red and pink tropical flowers. Two blue butterflies and a few petals drift by.
// Front plan: a big split jungle leaf in the left corner, red-and-orange torch flowers in the right one. Light from
// the sun upper right. Loops every 3 s.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { RGBA } from '../rig/f15-rig';
import type { Px } from '../rig/px';
import type { Scene } from '../types';

const W = 208,
  H = 160;
/** The pool across the middle ground (its far bank and the near edge of the ledge). */
export const POOL = { top: 92, bottom: 113 };
/** The waterfall: its column centre, the lip it pours from and the foam at its foot. */
export const FALLS = { x: 54, top: 21, foot: 96 };

const skyC = ['#2f8ec4', '#3c9ccc', '#52acd2', '#6cbcd6', '#8ccad6', '#b2d8d0', '#d8e4c4', '#f2e6b4'].map((c) => hx(c));
const peakFar = ['#7fb4b8', '#8cc0bc'].map((c) => hx(c));
const peakMid = ['#4f8f84', '#5e9c8a', '#70aa90'].map((c) => hx(c));
const mist = hx('#e8f4ec');
const canopy = ['#1c4a2c', '#255e34', '#30723c', '#3e8644', '#529a4e', '#6cb05a'].map((c) => hx(c));
const rock = ['#2e2a26', '#46403a', '#5e564c', '#7a7062', '#968a78', '#b2a690'].map((c) => hx(c));
const moss = ['#2a4a1c', '#3a6224', '#4e7c2e', '#669a3a', '#84b44a'].map((c) => hx(c));
const water = ['#0e4a5a', '#13606e', '#1a7a84', '#25949a', '#3aaeac', '#62c6bc', '#9adcd0', '#d4f2ea'].map((c) => hx(c));
const foam = ['#c8e8ec', '#e4f4f6', '#ffffff'].map((c) => hx(c));
const grass = ['#1e4a1a', '#285e1e', '#327226', '#3e862e', '#4e9a36', '#64ae42', '#80c254', '#a2d46c'].map((c) => hx(c));
const bark = ['#2e2018', '#46301e', '#5e4228', '#7a5834', '#967244'].map((c) => hx(c));
const stoneC = ['#4a4844', '#66625a', '#868076', '#a8a294', '#c8c2b2'].map((c) => hx(c));
const flowerRed = ['#7a0e1a', '#b8202a', '#e8443a', '#ff7a5a', '#ffb89a'].map((c) => hx(c));
const flowerPink = ['#8a2a5a', '#c44a86', '#ec7ab0', '#ffb4d4'].map((c) => hx(c));
const gold = ['#a86a10', '#e0a020', '#ffd44a', '#fff2a0'].map((c) => hx(c));
const morpho = ['#0a2a6a', '#1a4ab8', '#3a7ae8', '#7ab4ff', '#d4ecff'].map((c) => hx(c));

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function put(p: Px, x: number, y: number, c: RGBA) {
  const X = Math.round(x),
    Y = Math.round(y);
  if (X >= 0 && Y >= 0 && X < W && Y < H) p.set(X, Y, c);
}
function get(p: Px, x: number, y: number): RGBA {
  return p.get(clamp(Math.round(x), 0, W - 1), clamp(Math.round(y), 0, H - 1)) as RGBA;
}
const BAYER = [0.2, 0.7, 0.95, 0.45];
function dither(p: Px, x: number, y: number, a: RGBA, b: RGBA, u: number) {
  put(p, x, y, u > BAYER[(x & 1) + 2 * (y & 1)] ? b : a);
}
function tint(p: Px, x: number, y: number, c: RGBA, a: number) {
  if (a <= 0) return;
  const m = BAYER[(Math.round(x) & 1) + 2 * (Math.round(y) & 1)];
  put(p, x, y, mixc(get(p, x, y), c, a > m ? Math.min(1, a + 0.2) : a * 0.5));
}
function disc(p: Px, cx: number, cy: number, r: number, c: RGBA, ry = r) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if (((x - cx) / r) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(p, x, y, c);
}
function line(p: Px, x0: number, y0: number, x1: number, y1: number, c: RGBA) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) put(p, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
}
/** The loop phase: 0..1 over the 3-second loop. */
const loopK = (t: number) => (((t / 3) % 1) + 1) % 1;
/** A smooth value noise along x for silhouettes. */
function ridge(x: number, seed: number, scale: number) {
  const i = Math.floor(x / scale),
    f = x / scale - i;
  const a = hash(i, seed),
    b = hash(i + 1, seed);
  const s = f * f * (3 - 2 * f);
  return a + (b - a) * s;
}

function sky(p: Px) {
  const bottom = 64;
  for (let y = 0; y < bottom; y++) {
    const u = (y / bottom) * (skyC.length - 1),
      i = Math.min(skyC.length - 2, Math.floor(u));
    for (let x = 0; x < W; x++) dither(p, x, y, skyC[i], skyC[i + 1], u - i);
  }
  // A warm sun upper right: a white core, a gold ring and a wide soft glow.
  const cx = 128,
    cy = 18,
    r = 7;
  for (let y = 0; y <= cy + r + 24; y++)
    for (let x = cx - r - 24; x <= Math.min(W - 1, cx + r + 24); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= r) put(p, x, y, d < r - 1.5 ? hx('#fffef4') : hx('#fff0b8'));
      else if (d < r + 24) tint(p, x, y, hx('#fff4c4'), 0.6 * (1 - (d - r) / 24) ** 1.6);
    }
  // Thin high streaks of cloud.
  for (const [x0, y0, len] of [
    [96, 14, 44],
    [118, 30, 30],
    [20, 8, 26],
  ] as const)
    for (let x = 0; x < len; x++) {
      const k = Math.sin((x / len) * Math.PI);
      tint(p, x0 + x, y0 + Math.sin(x * 0.2) * 0.6, hx('#ffffff'), 0.5 * k);
      if (x % 3 === 0) tint(p, x0 + x + 2, y0 + 1, hx('#ffffff'), 0.3 * k);
    }
}

function peaks(p: Px, t: number) {
  // Far: tall soft jungle peaks, pale with distance.
  for (let x = 0; x < W; x++) {
    const top = 30 + 16 * ridge(x, 11, 22) + 6 * ridge(x, 12, 7);
    for (let y = Math.floor(top); y < 72; y++) dither(p, x, y, peakFar[0], peakFar[1], (y - top) / 18 + 0.2);
  }
  // A band of mist that drifts with the loop.
  const k = loopK(t) * TAU;
  for (let x = 0; x < W; x++)
    for (let y = 50; y < 62; y++) tint(p, x, y, mist, 0.35 * Math.sin(((y - 50) / 12) * Math.PI) * (0.7 + 0.3 * Math.sin(x * 0.05 + k)));
  // Middle: darker green ridges with tree texture.
  for (let x = 0; x < W; x++) {
    const top = 46 + 14 * ridge(x, 21, 18) + 4 * ridge(x, 22, 5);
    for (let y = Math.floor(top); y < POOL.top; y++) {
      const u = (y - top) / 22;
      const c = u < 0.25 ? peakMid[2] : u < 0.6 ? peakMid[1] : peakMid[0];
      put(p, x, y, (x * 7 + y * 3) % 11 === 0 ? peakMid[0] : c);
    }
  }
  for (let x = 0; x < W; x++)
    for (let y = 64; y < 74; y++) tint(p, x, y, mist, 0.3 * Math.sin(((y - 64) / 10) * Math.PI) * (0.6 + 0.4 * Math.sin(x * 0.08 - k)));
}

/** Round crowns of the jungle canopy behind the pool. */
function jungle(p: Px, t: number) {
  const k = loopK(t) * TAU;
  for (let i = 0; i < 22; i++) {
    const cx = 70 + hash(i, 31) * 140,
      cy = 70 + hash(i, 32) * 16,
      r = 7 + hash(i, 33) * 7;
    const sway = Math.sin(k + i) * 0.6;
    disc(p, cx + sway, cy + 2, r, canopy[0], r * 0.85);
    disc(p, cx + sway, cy, r * 0.92, canopy[1], r * 0.78);
    disc(p, cx + sway + r * 0.2, cy - r * 0.2, r * 0.62, canopy[2], r * 0.5);
    disc(p, cx + sway + r * 0.35, cy - r * 0.36, r * 0.32, canopy[3], r * 0.26);
  }
  for (let x = 60; x < W; x++) for (let y = POOL.top - 6; y < POOL.top; y++) put(p, x, y, (x + y) % 3 ? canopy[0] : canopy[1]);
}

/** The cliff on the left: irregular blocks of mossy rock (wavy strata broken by joints, each block its own tone, lit
 * from the right), a fringe of jungle on top, moss clumps dripping down, vines. */
function cliff(p: Px) {
  const edge = (y: number) => 82 + 7 * ridge(y, 41, 11) + 3 * ridge(y, 48, 4) - (y < 30 ? (30 - y) * 0.35 : 0);
  const topAt = (x: number) => 12 + 10 * ridge(x, 43, 14) + 2 * ridge(x, 49, 4);
  for (let y = 0; y < POOL.top + 2; y++) {
    const right = edge(y);
    for (let x = 0; x < right; x++) {
      if (y < topAt(x)) continue;
      // Wavy strata, 6–10 px tall; joints break each band into blocks of different widths.
      const wave = 4 * ridge(x, 44, 16) + 2 * ridge(x, 45, 6);
      const band = Math.floor((y + wave) / 8);
      const inBand = (y + wave) / 8 - band;
      const joint = Math.floor((x + 7 * hash(band, 46)) / (9 + 8 * hash(band, 47)));
      const block = band * 31 + joint;
      const jointX = ((x + 7 * hash(band, 46)) % (9 + 8 * hash(band, 47))) < 1;
      // Each block rounded: lighter at its top-right, darker at its bottom-left.
      const lit = 0.35 + (x / right) * 0.6 + (0.5 - inBand) * 0.5 + (hash(block, 48) - 0.5) * 0.5;
      let c = rock[clamp(Math.floor(1 + lit * 3.2), 1, 5)];
      if (inBand > 0.9 || jointX) c = rock[0];
      if (x > right - 2.5) c = rock[x > right - 1.2 ? 5 : 4];
      put(p, x, y, c);
      // Moss on the top of each block, in clumps.
      if (inBand < 0.18 && hash(block, 49) > 0.35 && hash(x >> 1, band) > 0.25) put(p, x, y, moss[inBand < 0.08 ? 3 : 2]);
    }
  }
  // Moss drips under the clumps.
  for (let i = 0; i < 40; i++) {
    const x = 2 + hash(i, 50) * 78,
      y0 = 24 + hash(i, 51) * 64;
    if (Math.abs(x - FALLS.x) < 11) continue;
    const len = 2 + hash(i, 52) * 5;
    for (let s = 0; s < len; s++) put(p, x, y0 + s, moss[s < len / 2 ? 2 : 1]);
  }
  // Top of the cliff: a fringe of jungle with a few bushes.
  for (let x = 0; x < 92; x++) {
    const ta = topAt(x);
    for (let k = 0; k < 5; k++) put(p, x, ta - k * (hash(x, k) > 0.45 ? 1 : 0), grass[2 + (k % 4)]);
  }
  for (let i = 0; i < 6; i++) {
    const cx = 6 + i * 15 + hash(i, 53) * 6;
    if (Math.abs(cx - FALLS.x) < 9) continue;
    const cy = topAt(cx) - 2,
      r = 4 + hash(i, 54) * 3;
    disc(p, cx, cy, r, canopy[1], r * 0.7);
    disc(p, cx + 1, cy - 1, r * 0.65, canopy[3], r * 0.45);
    put(p, cx + 2, cy - 2, canopy[5]);
  }
  // Vines down the cliff face.
  for (let i = 0; i < 6; i++) {
    const x0 = 6 + i * 13 + hash(i, 46) * 6;
    if (Math.abs(x0 - FALLS.x) < 12) continue;
    const len = 30 + hash(i, 47) * 40;
    for (let s = 0; s < len; s++) {
      const x = x0 + Math.sin(s * 0.15 + i) * 1.5;
      put(p, x, 18 + s, moss[1]);
      if (s % 5 === 2) {
        put(p, x - 1, 18 + s, moss[3]);
        put(p, x + 1, 19 + s, moss[4]);
      }
    }
  }
}

/** The waterfall: a column of streaks running down, wider at the foot, foam and boiling mist where it meets the pool. */
function falls(p: Px, t: number) {
  const k = loopK(t);
  const { x: cx, top, foot } = FALLS;
  for (let y = top; y <= foot; y++) {
    const u = (y - top) / (foot - top);
    const half = 5 + u * 4;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const v = (x - (cx - half)) / (2 * half);
      // Each column has its own streak pattern travelling down a whole number of times per loop.
      const col = x - Math.round(cx - half);
      const speed = 2 + (col % 3);
      const ph = (y / 9 - k * speed * 3 + hash(col, 51)) % 1;
      const streak = ((ph % 1) + 1) % 1;
      let c = streak < 0.35 ? foam[2] : streak < 0.7 ? foam[1] : water[6];
      if (v < 0.12 || v > 0.88) c = streak < 0.5 ? water[6] : water[5];
      put(p, x, y, c);
    }
  }
  // The lip it pours from.
  for (let x = cx - 7; x <= cx + 7; x++) {
    put(p, x, top - 1, rock[1]);
    put(p, x, top, foam[1]);
  }
  // Foam at the foot and mist rising from it.
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TAU + k * TAU;
    const r = 8 + 3 * Math.sin(a * 2 + i);
    disc(p, cx + Math.cos(a) * r * 1.4, foot + 2 + Math.sin(a) * 2, 2.2, foam[i % 2 ? 1 : 2]);
  }
  for (let i = 0; i < 10; i++) {
    const tau = (k + hash(i, 52)) % 1;
    const x = cx - 14 + hash(i, 53) * 28 + Math.sin(tau * TAU + i) * 2,
      y = foot - tau * 26;
    const a = Math.sin(tau * Math.PI) * 0.55;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -3; dx <= 3; dx++) if (dx * dx + dy * dy * 2 < 9) tint(p, x + dx, y + dy, mist, a);
  }
  // Glitter in the spray.
  for (let i = 0; i < 8; i++) {
    const tau = (k * 2 + hash(i, 54)) % 1;
    if (tau > 0.25) continue;
    put(p, cx - 12 + hash(i, 55) * 24, foot - 6 - hash(i, 56) * 20, hx('#ffffff'));
  }
}

/** The big tree on the right: a trunk with buttress roots, a crown in the corner, lianas hanging with leaves. */
function tree(p: Px, t: number) {
  const k = loopK(t) * TAU;
  for (let y = 10; y < POOL.top + 4; y++) {
    const half = 7 + (y > POOL.top - 14 ? (y - (POOL.top - 14)) * 0.5 : 0);
    for (let x = Math.round(194 - half); x <= Math.round(194 + half); x++) {
      const v = (x - (194 - half)) / (2 * half);
      let c = bark[v < 0.2 ? 1 : v > 0.75 ? 3 : 2];
      if ((x * 5 + Math.floor(y / 3)) % 9 === 0) c = bark[0];
      put(p, x, y, c);
    }
  }
  // Crown.
  for (let i = 0; i < 9; i++) {
    const cx = 160 + hash(i, 61) * 52,
      cy = 2 + hash(i, 62) * 16,
      r = 9 + hash(i, 63) * 6;
    disc(p, cx, cy + 2, r, canopy[0], r * 0.7);
    disc(p, cx, cy, r * 0.9, canopy[2], r * 0.6);
    disc(p, cx - r * 0.25, cy - r * 0.2, r * 0.55, canopy[4], r * 0.36);
  }
  // Lianas: sagging curves with leaves, swaying.
  for (let i = 0; i < 4; i++) {
    const x0 = 150 + i * 13,
      len = 40 + i * 9;
    for (let s = 0; s < len; s++) {
      const u = s / len;
      const x = x0 - u * 10 + Math.sin(k + i + u * 3) * 1.6 * u,
        y = 16 + s;
      put(p, x, y, bark[1]);
      if (s % 6 === 3) {
        const side = (s / 6) % 2 ? 1 : -1;
        put(p, x + side, y, canopy[3]);
        put(p, x + side * 2, y + 1, canopy[4]);
        put(p, x + side * 2, y, canopy[3]);
        put(p, x + side * 3, y + 1, canopy[2]);
      }
    }
  }
}

/** The pool: turquoise, lighter toward us, with ripples, the reflection of the falls and sparkles. */
function pool(p: Px, t: number) {
  const k = loopK(t) * TAU;
  for (let y = POOL.top; y < POOL.bottom; y++) {
    const u = (y - POOL.top) / (POOL.bottom - POOL.top);
    for (let x = 0; x < W; x++) {
      const base = 2 + u * 3;
      const ripple = Math.sin(x * 0.18 + y * 0.9 - k * 2) + Math.sin(x * 0.07 - y * 0.6 + k);
      const i = clamp(Math.floor(base + ripple * 0.35), 1, 6);
      put(p, x, y, water[i]);
    }
  }
  // The falls' reflection: broken pale streaks below the foam.
  for (let y = FALLS.foot + 3; y < POOL.bottom; y++)
    for (let x = FALLS.x - 8; x <= FALLS.x + 8; x++) if ((x + y * 3 + Math.round(k * 3)) % 5 === 0) put(p, x + Math.sin(y + k) * 1.2, y, water[7]);
  // Rings spreading from the foot of the falls.
  for (let i = 0; i < 3; i++) {
    const tau = (loopK(t) + i / 3) % 1;
    const r = 10 + tau * 30;
    for (let a = 0; a < TAU; a += 0.05) {
      const x = FALLS.x + Math.cos(a) * r,
        y = FALLS.foot + 4 + Math.sin(a) * r * 0.22;
      if (y > FALLS.foot + 2 && y < POOL.bottom - 1) tint(p, x, y, water[7], 0.6 * (1 - tau));
    }
  }
  // Sparkles of the sun.
  for (let i = 0; i < 14; i++) {
    const tau = (loopK(t) * 3 + hash(i, 71)) % 1;
    if (tau > 0.3) continue;
    const x = 90 + hash(i, 72) * 110,
      y = POOL.top + 2 + hash(i, 73) * 16;
    put(p, x, y, hx('#ffffff'));
    if (tau < 0.12) {
      put(p, x - 1, y, water[7]);
      put(p, x + 1, y, water[7]);
    }
  }
}

/** The ledge in front of the pool: a stone edge, mossy grass, ferns and flowers. */
function ledge(p: Px, t: number) {
  const k = loopK(t) * TAU;
  for (let y = POOL.bottom; y < H; y++) {
    const u = (y - POOL.bottom) / (H - POOL.bottom);
    for (let x = 0; x < W; x++) {
      const n = hash(x >> 1, y >> 1);
      const i = clamp(Math.floor(2 + u * 3 + (n - 0.5) * 1.6), 1, 6);
      put(p, x, y, grass[i]);
    }
  }
  // Flat stones along the pool edge, lit from the upper right.
  for (let i = 0; i < 14; i++) {
    const cx = 4 + i * 15 + hash(i, 81) * 6,
      cy = POOL.bottom + 1 + hash(i, 82) * 2,
      rx = 6 + hash(i, 83) * 4;
    disc(p, cx, cy + 1, rx, stoneC[0], 2.6);
    disc(p, cx, cy, rx * 0.95, stoneC[2], 2.2);
    disc(p, cx + rx * 0.25, cy - 0.8, rx * 0.55, stoneC[3], 1.1);
    put(p, cx + rx * 0.4, cy - 1, stoneC[4]);
  }
  // Grass blades swaying.
  for (let i = 0; i < 70; i++) {
    const x = hash(i, 84) * W,
      y = POOL.bottom + 6 + hash(i, 85) * (H - POOL.bottom - 6),
      h = 3 + hash(i, 86) * 4;
    const sway = Math.sin(k + x * 0.05) * 1.2;
    line(p, x, y, x + sway, y - h, grass[5 + (i % 3)]);
  }
  // Ferns: fronds of little leaflets.
  for (const [fx, fy, s] of [
    [22, 128, 1],
    [176, 124, 0.9],
    [132, 140, 0.8],
  ] as const) {
    for (let f = 0; f < 5; f++) {
      const ang = -Math.PI / 2 + (f - 2) * 0.55 + Math.sin(k + f) * 0.05;
      const len = (12 + (f % 2) * 4) * s;
      for (let q = 0; q < len; q++) {
        const x = fx + Math.cos(ang) * q + Math.cos(ang + 0.5) * q * q * 0.01,
          y = fy + Math.sin(ang) * q + q * q * 0.03;
        put(p, x, y, grass[2]);
        if (q % 2 === 0 && q < len - 1) {
          put(p, x + Math.cos(ang + 1.4) * 2, y + Math.sin(ang + 1.4) * 2, grass[5]);
          put(p, x + Math.cos(ang - 1.4) * 2, y + Math.sin(ang - 1.4) * 2, grass[4]);
        }
      }
    }
  }
  // Flowers: red hibiscus-like stars and pink sprays.
  for (let i = 0; i < 9; i++) {
    const x = 8 + hash(i, 87) * 192,
      y = POOL.bottom + 8 + hash(i, 88) * 34;
    if (Math.abs(x - 104) < 26 && y < 150) continue;
    if (i % 2) {
      for (let a = 0; a < 5; a++) {
        const ang = (a / 5) * TAU + i;
        disc(p, x + Math.cos(ang) * 2, y + Math.sin(ang) * 1.6, 1.4, flowerRed[2]);
      }
      disc(p, x, y, 1.2, flowerRed[1]);
      put(p, x, y - 1, gold[2]);
      put(p, x + 1, y - 2, gold[3]);
    } else {
      for (let a = 0; a < 4; a++) {
        put(p, x + a - 1, y - a, flowerPink[a % 2 ? 2 : 1]);
        put(p, x + a, y - a, flowerPink[3]);
      }
    }
  }
}

/** Two blue butterflies on looping paths and a few petals drifting down. */
function drifters(p: Px, t: number) {
  const k = loopK(t);
  for (let i = 0; i < 2; i++) {
    const a = k * TAU + i * Math.PI;
    const x = (i ? 140 : 96) + Math.cos(a) * 22 + Math.sin(a * 2) * 6,
      y = (i ? 50 : 38) + Math.sin(a) * 8 + Math.sin(a * 3) * 2;
    const up = Math.floor(t * 24 + i * 3) % 4 < 2;
    const c0 = morpho[1],
      c1 = morpho[3];
    if (up) {
      put(p, x - 2, y - 2, c0);
      put(p, x - 1, y - 1, c1);
      put(p, x + 1, y - 1, c1);
      put(p, x + 2, y - 2, c0);
      put(p, x - 2, y - 1, c1);
      put(p, x + 2, y - 1, c1);
    } else {
      put(p, x - 2, y, c1);
      put(p, x - 1, y, c0);
      put(p, x + 1, y, c0);
      put(p, x + 2, y, c1);
    }
    put(p, x, y, hx('#1a1020'));
    put(p, x, y - 1, hx('#1a1020'));
  }
  for (let i = 0; i < 5; i++) {
    const tau = (k + hash(i, 91)) % 1;
    const x = 140 + hash(i, 92) * 60 - tau * 30 + Math.sin(tau * TAU * 2 + i) * 3,
      y = 20 + tau * 100;
    put(p, x, y, flowerPink[i % 2 ? 2 : 3]);
    put(p, x + 1, y, flowerPink[1]);
  }
}

const scene: Scene = (p: Px, t: number) => {
  sky(p);
  peaks(p, t);
  jungle(p, t);
  tree(p, t);
  cliff(p);
  pool(p, t);
  falls(p, t);
  ledge(p, t);
  drifters(p, t);
};
scene.front = [
  {
    id: 'leaf-and-torches',
    depth: 156,
    paint(p) {
      // A big split jungle leaf rising from the left corner: an ink rim, two tones split by the midrib, slits between
      // the lobes running out from the rib.
      const bx = 0,
        by = H + 2,
        tx = 34,
        ty = H - 42;
      const leafAt = (u: number, w: number): [number, number] => {
        const x = bx + (tx - bx) * u,
          y = by + (ty - by) * u + Math.sin(u * Math.PI) * 5;
        return [x + w * 0.75, y + w * 0.65];
      };
      for (let s = 0; s <= 80; s++) {
        const u = s / 80;
        const half = 14 * Math.sin(u * Math.PI) ** 0.8 * (1 - u * 0.35);
        for (let w = -half - 1; w <= half + 1; w += 0.5) {
          const [px, py] = leafAt(u, w);
          const rim = Math.abs(w) > half - 0.5;
          const slit = Math.abs(w) > 2.5 && Math.abs(w) < half - 1 && Math.abs(((u * 9 + Math.abs(w) * 0.05) % 1) - 0.5) < 0.05;
          if (slit) continue;
          put(p, px, py, rim ? canopy[0] : w < 0 ? canopy[2] : canopy[4]);
        }
        const [mx, my] = leafAt(u, 0);
        put(p, mx, my, canopy[5]);
      }
      // Torch flowers in the right corner: red-orange bracts stacked on a stem, with two strap leaves.
      for (const [sx, h] of [
        [196, 34],
        [186, 26],
      ] as const) {
        line(p, sx, H, sx - 3, H - h, grass[2]);
        for (let b = 0; b < 5; b++) {
          const y = H - h + b * 4,
            side = b % 2 ? 1 : -1;
          for (let q = 0; q < 6; q++) {
            put(p, sx - 3 + side * q * 0.8 + b * 0.4, y - q * 0.5, q < 2 ? flowerRed[1] : q < 4 ? flowerRed[2] : gold[1]);
            put(p, sx - 3 + side * q * 0.8 + b * 0.4, y - q * 0.5 + 1, flowerRed[0]);
          }
        }
      }
      for (const [bx2, lean, h] of [
        [204, -8, 30],
        [180, 6, 22],
      ] as const)
        for (let s = 0; s <= h; s++) {
          const u = s / h;
          put(p, bx2 + lean * u * u, H - s, canopy[3]);
          put(p, bx2 + 1 + lean * u * u, H - s, canopy[2]);
          put(p, bx2 + 2 + lean * u * u, H - s, canopy[1]);
        }
    },
  },
];
export default scene;
