// «Солнечная обсерватория» (canon §8.3: far plan in the top third, the floor below, a front plan). Sunset above the
// clouds on a mountain terrace. Far: a deep blue sky warming to amber and rose at the horizon, thin cirrus lit from
// below, a huge low sun on the right half sunk into a sea of clouds (muted, never brighter than the creature), snowy
// peaks in violet silhouette on the left with a warm rim, two distant birds. The terrace: pale sandstone slabs in
// perspective; in the middle a great round sundial — bronze hour lines from its centre, a double bronze rim, twelve
// carved hour glyphs; at the back left a tall bronze gnomon blade whose long shadow lies across the dial; at the back
// right a bronze armillary sphere on a pedestal, its rings turning slowly; a low balustrade along the far edge with the
// cloud sea showing between its posts. Front plan: broken balustrade in both corners, a bronze brazier with embers.
// Loops every 3 s.
// Зенит's painting is larger than the secret canon (384 × 312 instead of 256 × 208, owner 22.11): the design is laid
// out in the canon's units and sampled at K = 1.5 output pixels per unit — every pixel is evaluated on its own (one
// pixel size in the whole painting; dithering and grain stay one output pixel), only the shapes are 1.5× larger.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { RGBA } from '../rig/f15-rig';
import type { Px } from '../rig/px';
import type { Scene } from '../types';

/** Output pixels per design unit. */
const K = 1.5;
const W = 384,
  H = 312;
/** Design units (the 256 × 208 layout). */
const D = {
  horizon: 100,
  sun: { x: 196, y: 90, r: 22 },
  terraceTop: 124,
  dial: { cx: 128, cy: 170, rx: 112, ry: 29 },
  gnomon: { x0: 34, x1: 58, foot: 141, apex: [40, 54] as [number, number] },
  armillary: { x: 222, y: 98, r: 15, foot: 136 },
};
// Exported in output pixels (the effects draw in the painting's own pixels).
export const HORIZON = D.horizon * K;
/** The low sun (fx: light motes come from here, the eclipse covers it). */
export const SUN = { x: D.sun.x * K, y: D.sun.y * K, r: D.sun.r * K };
/** The terrace edge and the sundial (the creature's home is near its centre). */
export const TERRACE_TOP = D.terraceTop * K;
export const DIAL = { cx: D.dial.cx * K, cy: D.dial.cy * K, rx: D.dial.rx * K, ry: D.dial.ry * K };
/** Twelve hour glyphs on the dial, screen positions (index 0 = far centre, clockwise seen from above). */
export const HOURS: [number, number][] = Array.from({ length: 12 }, (_, i) => {
  const a = -Math.PI / 2 + (i / 12) * TAU;
  return [DIAL.cx + Math.cos(a) * DIAL.rx * 0.86, DIAL.cy + Math.sin(a) * DIAL.ry * 0.86];
});
/** The gnomon blade: its foot (left, right) and apex. */
export const GNOMON = { x0: D.gnomon.x0 * K, x1: D.gnomon.x1 * K, foot: D.gnomon.foot * K, apex: [D.gnomon.apex[0] * K, D.gnomon.apex[1] * K] as [number, number] };
/** The armillary sphere: centre and radius, pedestal foot. */
export const ARMILLARY = { x: D.armillary.x * K, y: D.armillary.y * K, r: D.armillary.r * K, foot: D.armillary.foot * K };

const skyC = ['#10142e', '#161a3a', '#1e2046', '#282650', '#362c5a', '#48325e', '#5e3a60', '#78425e', '#94505a', '#ae6052', '#c4724a', '#d48a50'].map((c) => hx(c));
const cirrusC = ['#5a3a62', '#8a4e64', '#c27064', '#e8a07a'].map((c) => hx(c));
const peakC = ['#1c1636', '#261d44', '#322552', '#3e2e60', '#5a3e6e', '#a8686a', '#e2a07a'].map((c) => hx(c));
const snowC = ['#6a5a8a', '#9a84aa', '#d8b4b4', '#f6d8c0'].map((c) => hx(c));
const seaC = ['#2c2042', '#3c2a52', '#4e3460', '#664068', '#86506c', '#a8646c', '#c87e70', '#e6a07c', '#f8c494'].map((c) => hx(c));
const sunC = ['#c8603a', '#e08442', '#f0a450', '#f8c46a', '#fcdc94'].map((c) => hx(c));
// Dusk: the terrace lies in the long violet shadow of the low sun; the top tones keep a warm sunlit rim.
const stoneC = ['#141220', '#1c192c', '#26223a', '#312b48', '#3d3556', '#4b4064', '#5c4c70', '#8a6a78', '#c49482'].map((c) => hx(c));
const dialC = ['#2a2538', '#352f46', '#423a56', '#514766', '#625676', '#786884', '#a08490'].map((c) => hx(c));
const bronzeC = ['#24180e', '#3e2a16', '#5e3e1c', '#7e5828', '#a07434', '#c49450', '#e4b874', '#fadca0'].map((c) => hx(c));
const patinaC = ['#1e3a34', '#2c5448', '#3e6e5c'].map((c) => hx(c));
const emberC = ['#5a1408', '#a02c0c', '#e05a14', '#ff9a30', '#ffd870'].map((c) => hx(c));

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** Output-pixel put / get. */
function put(p: Px, x: number, y: number, c: RGBA) {
  const X = Math.round(x),
    Y = Math.round(y);
  if (X >= 0 && Y >= 0 && X < W && Y < H) p.set(X, Y, c);
}
function get(p: Px, x: number, y: number): RGBA {
  return p.get(clamp(Math.round(x), 0, W - 1), clamp(Math.round(y), 0, H - 1)) as RGBA;
}
const BAYER = [0.2, 0.7, 0.95, 0.45];
const bay = (x: number, y: number) => BAYER[(Math.round(x) & 1) + 2 * (Math.round(y) & 1)];
/** Ordered-dither tint: strong tints replace the colour on a growing share of pixels, weak ones blend softly. */
function tint(p: Px, x: number, y: number, c: RGBA, a: number) {
  if (a <= 0.02) return;
  put(p, x, y, mixc(get(p, x, y), c, a > bay(x, y) ? Math.min(1, a + 0.2) : a * 0.5));
}
/** A line between output-pixel points. */
function line(p: Px, x0: number, y0: number, x1: number, y1: number, c: RGBA) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) put(p, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
}
/** A line between design-unit points. */
const lineD = (p: Px, x0: number, y0: number, x1: number, y1: number, c: RGBA) => line(p, x0 * K, y0 * K, x1 * K, y1 * K, c);
/** Dithered pick from a ramp at a fractional index, at an output pixel. */
function ramp(p: Px, x: number, y: number, c: RGBA[], s: number) {
  const i = clamp(s, 0, c.length - 1);
  const lo = Math.floor(i);
  put(p, x, y, c[Math.min(c.length - 1, i - lo > bay(x, y) ? lo + 1 : lo)]);
}
const loopK = (t: number) => (((t / 3) % 1) + 1) % 1;
function smooth(x: number, seed: number, scale: number) {
  const i = Math.floor(x / scale),
    f = x / scale - i;
  const a = hash(i, seed),
    b = hash(i + 1, seed);
  const s = f * f * (3 - 2 * f);
  return a + (b - a) * s;
}
function vnoise(x: number, y: number, seed: number, s: number) {
  const X = Math.floor(x / s),
    Y = Math.floor(y / s);
  const fx = x / s - X,
    fy = y / s - Y;
  const ux = fx * fx * (3 - 2 * fx),
    uy = fy * fy * (3 - 2 * fy);
  const a = hash(X, Y, seed),
    b = hash(X + 1, Y, seed),
    c = hash(X, Y + 1, seed),
    d = hash(X + 1, Y + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
/** Texture noise in design units with a finer octave in output pixels, so the larger painting carries more grain. */
function fbm(x: number, y: number, seed: number) {
  return vnoise(x, y, seed, 16) * 0.5 + vnoise(x, y, seed + 1, 7) * 0.28 + vnoise(x, y, seed + 2, 3) * 0.14 + vnoise(x * K, y * K, seed + 3, 2) * 0.08;
}
/** Every output pixel of a design-unit box: (output x, output y, design x, design y). */
function eachPixel(x0: number, y0: number, x1: number, y1: number, fn: (x: number, y: number, xd: number, yd: number) => void) {
  for (let y = Math.max(0, Math.floor(y0 * K)); y <= Math.min(H - 1, Math.ceil(y1 * K)); y++)
    for (let x = Math.max(0, Math.floor(x0 * K)); x <= Math.min(W - 1, Math.ceil(x1 * K)); x++) fn(x, y, x / K, y / K);
}

/** Sky: banded gradient, warmer and brighter toward the sun; thin cirrus lit from below. */
function sky(p: Px, t: number) {
  const k = loopK(t);
  eachPixel(0, 0, 256, D.horizon + 6, (x, y, xd, yd) => {
    const d = Math.hypot((xd - D.sun.x) / 1.6, yd - D.sun.y);
    const glow = Math.max(0, 1 - d / 150);
    ramp(p, x, y, skyC, (yd / (D.horizon + 6)) * 9.2 + glow * 2.6);
  });
  // Cirrus: long thin streaks, pink-gold where they face the sun, drifting a little each loop and back.
  for (let i = 0; i < 11; i++) {
    const y0 = 14 + hash(i, 11) * 54;
    const x0 = hash(i, 13) * 300 - 40 + Math.sin(k * TAU + i) * 2;
    const len = 50 + hash(i, 15) * 90;
    for (let s = 0; s < len; s += 1 / K) {
      const xd = x0 + s,
        yd = y0 + Math.sin(s / 23 + i) * 2.5 - s * 0.06;
      const thick = Math.sin((s / len) * Math.PI);
      const lit = clamp(1 - Math.hypot(xd - D.sun.x, yd - D.sun.y) / 170, 0, 1);
      const c = cirrusC[clamp(Math.floor(lit * 3.6 + thick * 0.4), 0, 3)];
      const x = xd * K,
        y = yd * K;
      tint(p, x, y, c, 0.55 * thick);
      if (thick > 0.4) tint(p, x, y + 1, c, 0.3 * thick);
      if (thick > 0.8) tint(p, x, y - 1, c, 0.2 * thick);
    }
  }
  // The sun: a big soft disk with banded glow, its lower half sinking into the cloud sea (drawn over it later).
  const { x: sx, y: sy, r } = D.sun;
  eachPixel(sx - r - 26, sy - r - 18, sx + r + 26, sy + r, (x, y, xd, yd) => {
    const d = Math.hypot(xd - sx, yd - sy) / r;
    if (d < 1) ramp(p, x, y, sunC, 4.2 - d * d * 2.4 - ((yd - sy) / r) * 0.5);
    else if (d < 1.9) tint(p, x, y, sunC[2], 0.35 * (1.9 - d));
  });
  // Two distant birds gliding on a closed loop path.
  for (let b = 0; b < 2; b++) {
    const a = k * TAU + b * 2.4;
    const bx = (70 + b * 50 + Math.cos(a) * 24) * K,
      by = (34 + b * 10 + Math.sin(a * 2) * 4) * K;
    const flap = Math.sin(a * 6 + b) > 0 ? -1 : 0;
    put(p, bx, by, peakC[0]);
    for (const sd of [-1, 1]) {
      put(p, bx + sd, by + flap, peakC[0]);
      put(p, bx + sd * 2, by + flap * 1.5, peakC[0]);
      put(p, bx + sd * 3, by + flap * 2, peakC[1]);
    }
  }
}

/** Snowy peaks on the left and a low ridge far right, violet with a warm rim on the sun side. */
function peaks(p: Px) {
  const ridge = (x: number) =>
    Math.min(
      62 + Math.abs(x - 34) * 0.9 + (smooth(x, 21, 5) - 0.5) * 6,
      74 + Math.abs(x - 92) * 1.1 + (smooth(x, 23, 4) - 0.5) * 5,
      88 + Math.abs(x - 248) * 0.7 + (smooth(x, 25, 6) - 0.5) * 4,
    );
  for (let x = 0; x < W; x++) {
    const xd = x / K;
    const top = ridge(xd);
    const slope = ridge(xd + 1) - ridge(xd - 1);
    for (let y = Math.floor(top * K); y < (D.horizon + 4) * K; y++) {
      const yd = y / K;
      const depth = (yd - top) / 30;
      // the face turned to the sun (slope down to the right = rising left) is lit
      const s = 2.2 - depth * 1.4 + (slope > 0 ? 1.4 : -0.3) + (fbm(xd * 2, yd * 2, 27) - 0.5) * 1.2;
      const snow = yd - top < 9 - fbm(xd, yd, 29) * 6 && top < 84;
      if (snow) ramp(p, x, y, snowC, clamp(1.4 + (slope > 0 ? 1.6 : -0.6) - depth * 2, 0, 3));
      else ramp(p, x, y, peakC, clamp(s, 0, 4));
    }
    if (slope > 0) put(p, x, top * K, peakC[6]);
  }
}

/** The cloud sea: puffy tops lit rose-gold on the sun side, violet in the hollows; a slow shimmer along the rims. */
function cloudSea(p: Px, t: number) {
  const k = loopK(t);
  for (let x = 0; x < W; x++) {
    const xd = x / K;
    const top = D.horizon - 2 + (smooth(xd, 31, 9) - 0.5) * 7 + (smooth(xd, 33, 3.5) - 0.5) * 3;
    for (let y = Math.floor(top * K); y < (D.terraceTop + 2) * K; y++) {
      const yd = y / K;
      const puff = fbm(xd * 1.4, yd * 2.6, 35);
      const toSun = clamp(1 - Math.abs(xd - D.sun.x) / 160, 0, 1);
      const depth = (yd - top) / 24;
      const s = 3.4 + toSun * 3.6 - depth * 3 + (puff - 0.5) * 2.4 + Math.sin(k * TAU + xd * 0.07) * 0.25 * toSun;
      ramp(p, x, y, seaC, s);
    }
    put(p, x, top * K, seaC[clamp(Math.floor(5 + clamp(1 - Math.abs(xd - D.sun.x) / 120, 0, 1) * 3.5), 0, 8)]);
  }
  // Puffs rising out of the sea in front of the lower sun half.
  for (let i = 0; i < 7; i++) {
    const cx = D.sun.x - 40 + i * 14 + hash(i, 37) * 6,
      cy = D.horizon + 2 + hash(i, 39) * 6,
      r = 6 + hash(i, 41) * 6;
    eachPixel(cx - r * 1.5, cy - r, cx + r * 1.5, cy + r * 0.4, (x, y, xd, yd) => {
      const d = Math.hypot((xd - cx) / 1.5, yd - cy) / r;
      if (d < 1) ramp(p, x, y, seaC, 6.4 - d * 2 - ((yd - cy + r) / r) * 1.2 + ((xd - cx) / r) * 0.6);
    });
  }
}

/** The terrace: pale sandstone slabs in perspective, warmer and brighter toward the sun. */
const VY = 98;
const slabU = (x: number, y: number) => (x - 128) / ((y - VY) * 0.36);
const slabV = (y: number) => 260 / (y - VY);
function terrace(p: Px) {
  for (let y = Math.floor(D.terraceTop * K); y < H; y++) {
    const yd = y / K;
    const v = slabV(yd);
    const row = Math.floor(v);
    const seamV = Math.floor(slabV(yd - 1 / K)) !== row;
    const fv = v - row;
    const stag = (row % 2) * 0.5;
    for (let x = 0; x < W; x++) {
      const xd = x / K;
      const u = slabU(xd, yd) + stag;
      const col = Math.floor(u);
      const seamU = Math.floor(slabU(xd - 1 / K, yd) + stag) !== col;
      const fu = u - col;
      const warm = clamp((xd - 40) / 260, 0, 1);
      let s = 3 + fbm(xd * 1.3, yd * 2.4, 43 + row) * 1.6 + hash(col, row, 45) * 1 + warm * 1.6 + ((yd - D.terraceTop) / 84) * 0.6;
      if (fv > 0.84) s += 0.7;
      if (fu < 0.07) s += 0.5;
      // small chips and cracks in the slabs, one output pixel wide
      if (hash(x, y, 47) > 0.985) s -= 1.1;
      if (seamU || seamV) s = 1.2;
      ramp(p, x, y, stoneC, s);
    }
  }
}

/** The sundial: pale disc, bronze rim, hour lines, glyphs, and the gnomon's long shadow across it. */
function sundial(p: Px, t: number) {
  const k = loopK(t);
  const { cx, cy, rx, ry } = D.dial;
  const inside = (x: number, y: number, s = 1) => ((x - cx) / (rx * s)) ** 2 + ((y - cy) / (ry * s)) ** 2;
  eachPixel(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, (x, y, xd, yd) => {
    const d = inside(xd, yd);
    if (d > 1) return;
    const warm = clamp((xd - 50) / 220, 0, 1);
    ramp(p, x, y, dialC, 2.6 + warm * 2.2 + (fbm(xd * 1.6, yd * 3, 51) - 0.5) * 1.2 - d * 0.6 + ((yd - cy) / ry) * 0.5);
  });
  // Bronze rim: two rings with patina specks and a bright sun-side edge.
  for (const s of [1, 0.94]) {
    for (let a = 0; a < TAU; a += 0.0025 / K) {
      const x = (cx + Math.cos(a) * rx * s) * K,
        y = (cy + Math.sin(a) * ry * s) * K;
      const lit = clamp(0.5 + Math.cos(a) * 0.5, 0, 1);
      put(p, x, y + 1, bronzeC[1]);
      put(p, x, y, bronzeC[clamp(Math.round(3 + lit * 3), 0, 7)]);
      if (Math.sin(a) > 0) put(p, x, y + 2, bronzeC[0]);
      if (hash(Math.round(x), Math.round(y), 53) > 0.93) put(p, x, y, patinaC[1]);
    }
  }
  // Hour lines from the centre to the inner rim.
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * TAU;
    for (let r = 0.16; r < 0.92; r += 0.004 / K) {
      const x = (cx + Math.cos(a) * rx * r) * K,
        y = (cy + Math.sin(a) * ry * r) * K;
      put(p, x, y, r > 0.7 ? bronzeC[4] : bronzeC[3]);
    }
  }
  // Twelve hour glyphs: our own marks — a dot, a bar, a chevron, a cross, an arc, repeated in a cycle of five.
  HOURS.forEach(([x, y], i) => {
    const near = (y / K - (cy - ry)) / (2 * ry);
    const s = (1.3 + near * 1.6) * K;
    const g = bronzeC[5],
      d = bronzeC[1];
    const shape = i % 5;
    const mark = (x0: number, y0: number, x1: number, y1: number) => {
      line(p, x0, y0 + 1, x1, y1 + 1, d);
      line(p, x0, y0, x1, y1, g);
    };
    if (shape === 0) {
      mark(x - s, y, x + s, y);
      put(p, x, y - s * 0.7, g);
    } else if (shape === 1) mark(x, y - s * 0.7, x, y + s * 0.5);
    else if (shape === 2) {
      mark(x - s, y + s * 0.3, x, y - s * 0.4);
      mark(x, y - s * 0.4, x + s, y + s * 0.3);
    } else if (shape === 3) {
      mark(x - s * 0.7, y - s * 0.4, x + s * 0.7, y + s * 0.4);
      mark(x - s * 0.7, y + s * 0.4, x + s * 0.7, y - s * 0.4);
    } else for (let a = Math.PI; a <= TAU; a += 0.12) put(p, x + Math.cos(a) * s, y + Math.sin(a) * s * 0.6, g);
  });
  // Centre boss: a small bronze sun.
  for (let a = 0; a < TAU; a += 0.012) {
    put(p, (cx + Math.cos(a) * 9) * K, (cy + Math.sin(a) * 2.4) * K, bronzeC[4]);
    if (Math.round(((a * 8) / TAU) * 2) % 2 === 0) put(p, (cx + Math.cos(a) * 12) * K, (cy + Math.sin(a) * 3.2) * K, bronzeC[3]);
  }
  // The gnomon's shadow: a long dark wedge from its foot across the dial toward the front left, breathing faintly as
  // thin clouds pass the sun.
  const pass = 0.85 + 0.15 * Math.sin(k * TAU);
  const g = D.gnomon;
  const foot = [(g.x0 + g.x1) / 2, g.foot] as const;
  const tip = [foot[0] - 30, foot[1] + 50] as const;
  eachPixel(0, foot[1], 256, 208, (x, y, xd, yd) => {
    const u = (yd - foot[1]) / (tip[1] - foot[1]);
    if (u > 1) return;
    const mid = foot[0] + (tip[0] - foot[0]) * u;
    const half = (g.x1 - g.x0) * 0.5 * (1 - u) + 1;
    if (Math.abs(xd - mid) < half) tint(p, x, y, stoneC[0], 0.42 * pass * (1 - u * 0.5));
  });
}

/** Balustrade along the far terrace edge: posts with rounded caps and a rail; cloud sea between them. */
function balustrade(p: Px) {
  const rail = D.terraceTop - 12;
  eachPixel(0, rail, 256, rail + 3, (x, y, xd, yd) => {
    ramp(p, x, y, stoneC, 5 + (yd < rail + 1 ? 1.5 : 0) + clamp((xd - 60) / 200, 0, 1) * 1.6);
  });
  for (let x = 0; x < W; x++) put(p, x, (rail + 3) * K + 1, stoneC[1]);
  for (let pxD = 6; pxD < 256; pxD += 11) {
    if (pxD > D.gnomon.x0 - 6 && pxD < D.gnomon.x1 + 4) continue;
    eachPixel(pxD - 4, rail + 3, pxD + 4, D.terraceTop, (x, y, xd, yd) => {
      const bulge = Math.sin(((yd - rail - 3) / (D.terraceTop - rail - 3)) * Math.PI) * 1.4;
      if (Math.abs(xd - pxD) > 1.5 + bulge) return;
      ramp(p, x, y, stoneC, 3.6 + (xd - pxD) * 0.7 + clamp((pxD - 60) / 200, 0, 1) * 1.4);
    });
  }
  for (let x = 0; x < W; x++) put(p, x, D.terraceTop * K, stoneC[2]);
}

/** The gnomon: a tall bronze blade, patina on the shadow side, a bright sun-side edge, engraved hour ticks. */
function gnomon(p: Px) {
  const g = D.gnomon;
  const [ax, ay] = g.apex;
  let lastTick = -1;
  for (let y = Math.floor(ay * K); y <= g.foot * K; y++) {
    const yd = y / K;
    const u = (yd - ay) / (g.foot - ay);
    const left = ax + (g.x0 - ax) * u,
      right = ax + (g.x1 - ax) * u;
    for (let x = Math.floor(left * K); x <= right * K; x++) {
      const xd = x / K;
      const across = (xd - left) / Math.max(1, right - left);
      const s = 2 + across * 3.6 + (fbm(xd * 3, yd * 1.5, 61) - 0.5) * 1;
      put(p, x, y, bronzeC[clamp(Math.round(s), 0, 7)]);
      if (across < 0.3 && hash(x, y, 63) > 0.7) put(p, x, y, patinaC[hash(x, y, 65) > 0.5 ? 1 : 0]);
    }
    put(p, right * K, y, bronzeC[7]);
    const tick = Math.floor(yd / 7);
    if (tick !== lastTick && u > 0.2) line(p, (left + 2) * K, y, (right - 3) * K, y, bronzeC[2]);
    lastTick = tick;
  }
  // plinth
  eachPixel(g.x0 - 4, g.foot, g.x1 + 4, g.foot + 5, (x, y, xd, yd) => {
    ramp(p, x, y, stoneC, 4 + (xd - g.x0) / 18 + (yd < g.foot + 1 ? 1.5 : 0));
  });
}

/** The armillary sphere on its pedestal: rings turn slowly over the loop; silhouetted against the sun's glow. */
function armillary(p: Px, t: number) {
  const k = loopK(t);
  const { x: cx, y: cy, r, foot } = D.armillary;
  // pedestal
  eachPixel(cx - 7, cy + r, cx + 7, foot, (x, y, xd, yd) => {
    const w = 2.5 + (yd > foot - 6 ? 4 : 0) + (yd < cy + r + 3 ? 2 : 0);
    if (Math.abs(xd - cx) > w) return;
    ramp(p, x, y, stoneC, 3.4 + ((xd - cx) / w) * 1.6);
  });
  const ring = (tilt: number, spin: number, col: number) => {
    for (let a = 0; a < TAU; a += 0.012 / K) {
      const X = Math.cos(a) * r,
        Y = Math.sin(a) * r;
      const x1 = X * Math.cos(spin),
        z1 = X * Math.sin(spin);
      const y2 = Y * Math.cos(tilt) - z1 * Math.sin(tilt);
      const z2 = Y * Math.sin(tilt) + z1 * Math.cos(tilt);
      put(p, (cx + x1) * K, (cy + y2) * K, bronzeC[clamp(col + (z2 > 0 ? 2 : 0) + (x1 > 0 ? 1 : 0), 0, 7)]);
    }
  };
  ring(Math.PI / 2, 0, 2); // horizon
  ring(0.41, k * TAU * 0.5, 3); // ecliptic — half a turn a loop looks the same (a circle is symmetric)
  ring(0, Math.PI / 2 + k * TAU * 0.5, 3); // meridian
  ring(1.1, 0.9 - k * TAU * 0.5, 2);
  // the axis rod and the small sun at the heart
  lineD(p, cx - r * 0.5, cy + r * 0.9, cx + r * 0.5, cy - r * 0.9, bronzeC[5]);
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) put(p, cx * K + x, cy * K + y, sunC[clamp(4 - Math.round((x * x + y * y) / 2), 1, 4)]);
}

const scene: Scene = (p: Px, t: number) => {
  sky(p, t);
  peaks(p);
  cloudSea(p, t);
  terrace(p);
  sundial(p, t);
  balustrade(p);
  armillary(p, t);
  gnomon(p);
};
scene.front = [
  {
    id: 'balustrade-ruins',
    depth: 198 * K,
    paint(p: Px) {
      // Broken balustrade blocks in the bottom corners: square-cut, lit on the sun side, a fallen post.
      const block = (x0: number, w: number, top: number, seed: number) => {
        for (let x = Math.floor(x0 * K); x < (x0 + w) * K; x++) {
          const xd = x / K;
          const chip = (smooth(xd, seed, 3) - 0.5) * 4;
          for (let y = Math.floor((top + chip) * K); y < H; y++) {
            const yd = y / K;
            const u = (xd - x0) / w;
            put(p, x, y, stoneC[clamp(Math.floor(2.6 + u * 2.4 + (fbm(xd * 2, yd * 2, seed) - 0.5) * 1.6 - (yd - top) / 20), 0, 7)]);
          }
          put(p, x, (top + chip) * K, stoneC[7]);
        }
      };
      block(-6, 34, 208 - 22, 71);
      block(26, 16, 208 - 11, 73);
      block(216, 46, 208 - 26, 75);
      block(204, 14, 208 - 10, 77);
    },
  },
  {
    id: 'brazier',
    depth: 199 * K,
    paint(p: Px) {
      // A bronze brazier on a tripod, bottom left: a shallow bowl of glowing embers (front props are still).
      const k = 0.3;
      const bx = 16,
        by = 208 - 30;
      for (const [x0, x1] of [
        [bx - 9, bx - 12],
        [bx + 9, bx + 12],
        [bx, bx],
      ])
        lineD(p, x0, by + 2, x1, 208, bronzeC[2]);
      eachPixel(bx - 11, by - 3, bx + 11, by + 2, (x, y, xd, yd) => {
        const w = 11 - (by + 2 - yd) * 0.4;
        if (Math.abs(xd - bx) > w) return;
        put(p, x, y, bronzeC[clamp(Math.round(3 + ((xd - bx) / w) * 2 + (yd < by - 2 ? 2 : 0)), 0, 7)]);
      });
      for (let i = 0; i < 26; i++) {
        const x = (bx - 9 + hash(i, 81) * 18) * K,
          y = (by - 4 - hash(i, 83) * 2) * K;
        const f = 0.5 + 0.5 * Math.sin(k * TAU * (1 + (i % 3)) + i);
        put(p, x, y, emberC[clamp(Math.round(1 + f * 3), 0, 4)]);
      }
    },
  },
];
export default scene;
