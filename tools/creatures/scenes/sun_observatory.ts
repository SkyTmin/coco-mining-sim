// «Солнечная обсерватория» (canon §8.3: far plan in the top third, the floor below, a front plan). Sunset above the
// clouds on a mountain terrace. Far: a deep blue sky warming to amber and rose at the horizon, thin cirrus lit from
// below, a huge low sun on the right half sunk into a sea of clouds (muted, never brighter than the creature), snowy
// peaks in violet silhouette on the left with a warm rim, two distant birds. The terrace: pale sandstone slabs in
// perspective; in the middle a great round sundial — bronze hour lines from its centre, a double bronze rim, twelve
// carved hour glyphs; at the back left a tall bronze gnomon blade whose long shadow lies across the dial; at the back
// right a bronze armillary sphere on a pedestal, its rings turning slowly; a low balustrade along the far edge with the
// cloud sea showing between its posts. Front plan: broken balustrade in both corners, a bronze brazier with embers.
// Loops every 3 s.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { RGBA } from '../rig/f15-rig';
import type { Px } from '../rig/px';
import type { Scene } from '../types';

const W = 256,
  H = 208;
export const HORIZON = 100;
/** The low sun (fx: light motes come from here, the eclipse covers it). */
export const SUN = { x: 196, y: 90, r: 22 };
/** The terrace edge and the sundial (the creature's home is near its centre). */
export const TERRACE_TOP = 124;
export const DIAL = { cx: 128, cy: 170, rx: 112, ry: 29 };
/** Twelve hour glyphs on the dial, screen positions (index 0 = far centre, clockwise seen from above). */
export const HOURS: [number, number][] = Array.from({ length: 12 }, (_, i) => {
  const a = -Math.PI / 2 + (i / 12) * TAU;
  return [DIAL.cx + Math.cos(a) * DIAL.rx * 0.86, DIAL.cy + Math.sin(a) * DIAL.ry * 0.86];
});
/** The gnomon blade: its foot (left, right) and apex. */
export const GNOMON = { x0: 34, x1: 58, foot: 141, apex: [40, 54] as [number, number] };
/** The armillary sphere: centre and radius, pedestal foot. */
export const ARMILLARY = { x: 222, y: 98, r: 15, foot: 136 };

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
function line(p: Px, x0: number, y0: number, x1: number, y1: number, c: RGBA) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) put(p, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
}
/** Dithered pick from a ramp at a fractional index. */
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
function fbm(x: number, y: number, seed: number) {
  return vnoise(x, y, seed, 16) * 0.55 + vnoise(x, y, seed + 1, 7) * 0.3 + vnoise(x, y, seed + 2, 3) * 0.15;
}

/** Sky: banded gradient, warmer and brighter toward the sun; thin cirrus lit from below. */
function sky(p: Px, t: number) {
  const k = loopK(t);
  for (let y = 0; y < HORIZON + 6; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot((x - SUN.x) / 1.6, y - SUN.y);
      const glow = Math.max(0, 1 - d / 150);
      ramp(p, x, y, skyC, (y / (HORIZON + 6)) * 9.2 + glow * 2.6);
    }
  // Cirrus: long thin streaks, pink-gold where they face the sun, drifting a little each loop and back.
  for (let i = 0; i < 9; i++) {
    const y0 = 14 + hash(i, 11) * 54;
    const x0 = hash(i, 13) * 300 - 40 + Math.sin(k * TAU + i) * 2;
    const len = 50 + hash(i, 15) * 90;
    for (let s = 0; s < len; s++) {
      const x = x0 + s,
        y = y0 + Math.sin(s / 23 + i) * 2.5 - s * 0.06;
      const thick = Math.sin((s / len) * Math.PI);
      const lit = clamp(1 - Math.hypot(x - SUN.x, y - SUN.y) / 170, 0, 1);
      const c = cirrusC[clamp(Math.floor(lit * 3.6 + thick * 0.4), 0, 3)];
      tint(p, x, y, c, 0.55 * thick);
      if (thick > 0.6) tint(p, x, y + 1, c, 0.25 * thick);
    }
  }
  // The sun: a big soft disk with banded glow, its lower half sinking into the cloud sea (drawn over it later).
  for (let y = SUN.y - SUN.r - 18; y <= SUN.y + SUN.r; y++)
    for (let x = SUN.x - SUN.r - 26; x <= SUN.x + SUN.r + 26; x++) {
      const d = Math.hypot(x - SUN.x, y - SUN.y) / SUN.r;
      if (d < 1) ramp(p, x, y, sunC, 4.2 - d * d * 2.4 - (y - SUN.y) / SUN.r * 0.5);
      else if (d < 1.9) tint(p, x, y, sunC[2], 0.35 * (1.9 - d));
    }
  // Two distant birds gliding on a closed loop path.
  for (let b = 0; b < 2; b++) {
    const a = k * TAU + b * 2.4;
    const bx = 70 + b * 50 + Math.cos(a) * 24,
      by = 34 + b * 10 + Math.sin(a * 2) * 4;
    const flap = Math.sin(a * 6 + b) > 0 ? -1 : 0;
    put(p, bx, by, peakC[0]);
    put(p, bx - 1, by + flap, peakC[0]);
    put(p, bx + 1, by + flap, peakC[0]);
    put(p, bx - 2, by + flap * 2, peakC[1]);
    put(p, bx + 2, by + flap * 2, peakC[1]);
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
    const top = ridge(x);
    const slope = ridge(x + 1) - ridge(x - 1);
    for (let y = Math.floor(top); y < HORIZON + 4; y++) {
      const depth = (y - top) / 30;
      // the face turned to the sun (slope down to the right = rising left) is lit
      let s = 2.2 - depth * 1.4 + (slope > 0 ? 1.4 : -0.3) + (fbm(x * 2, y * 2, 27) - 0.5) * 1.2;
      const snow = y - top < 9 - (fbm(x, y, 29) * 6) && top < 84;
      if (snow) ramp(p, x, y, snowC, clamp(1.4 + (slope > 0 ? 1.6 : -0.6) - depth * 2, 0, 3));
      else ramp(p, x, y, peakC, clamp(s, 0, 4));
    }
    if (slope > 0) put(p, x, top, peakC[6]);
  }
}

/** The cloud sea: puffy tops lit rose-gold on the sun side, violet in the hollows; a slow shimmer along the rims. */
function cloudSea(p: Px, t: number) {
  const k = loopK(t);
  for (let x = 0; x < W; x++) {
    const top = HORIZON - 2 + (smooth(x, 31, 9) - 0.5) * 7 + (smooth(x, 33, 3.5) - 0.5) * 3;
    for (let y = Math.floor(top); y < TERRACE_TOP + 2; y++) {
      const puff = fbm(x * 1.4, y * 2.6, 35);
      const toSun = clamp(1 - Math.abs(x - SUN.x) / 160, 0, 1);
      const depth = (y - top) / 24;
      const s = 3.4 + toSun * 3.6 - depth * 3 + (puff - 0.5) * 2.4 + Math.sin(k * TAU + x * 0.07) * 0.25 * toSun;
      ramp(p, x, y, seaC, s);
    }
    put(p, x, top, seaC[clamp(Math.floor(5 + clamp(1 - Math.abs(x - SUN.x) / 120, 0, 1) * 3.5), 0, 8)]);
  }
  // Puffs rising out of the sea in front of the lower sun half.
  for (let i = 0; i < 7; i++) {
    const cx = SUN.x - 40 + i * 14 + hash(i, 37) * 6,
      cy = HORIZON + 2 + hash(i, 39) * 6,
      r = 6 + hash(i, 41) * 6;
    for (let y = cy - r; y <= cy + r * 0.4; y++)
      for (let x = cx - r * 1.5; x <= cx + r * 1.5; x++) {
        const d = Math.hypot((x - cx) / 1.5, y - cy) / r;
        if (d < 1) ramp(p, x, y, seaC, 6.4 - d * 2 - (y - cy + r) / r * 1.2 + (x - cx) / r * 0.6);
      }
  }
}

/** The terrace: pale sandstone slabs in perspective, warmer and brighter toward the sun. */
const VY = 98;
const slabU = (x: number, y: number) => (x - 128) / ((y - VY) * 0.36);
const slabV = (y: number) => 260 / (y - VY);
function terrace(p: Px) {
  for (let y = TERRACE_TOP; y < H; y++) {
    const v = slabV(y);
    const row = Math.floor(v);
    const seamV = Math.floor(slabV(y - 1)) !== row;
    const fv = v - row;
    const stag = (row % 2) * 0.5;
    for (let x = 0; x < W; x++) {
      const u = slabU(x, y) + stag;
      const col = Math.floor(u);
      const seamU = Math.floor(slabU(x - 1, y) + stag) !== col;
      const fu = u - col;
      const warm = clamp((x - 40) / 260, 0, 1);
      let s = 3 + fbm(x * 1.3, y * 2.4, 43 + row) * 1.6 + hash(col, row, 45) * 1 + warm * 1.6 + ((y - TERRACE_TOP) / 84) * 0.6;
      if (fv > 0.84) s += 0.7;
      if (fu < 0.07) s += 0.5;
      if (seamU || seamV) s = 1.2;
      ramp(p, x, y, stoneC, s);
    }
  }
}

/** The sundial: pale disc, bronze rim, hour lines, glyphs, and the gnomon's long shadow across it. */
function sundial(p: Px, t: number) {
  const k = loopK(t);
  const inside = (x: number, y: number, s = 1) => ((x - DIAL.cx) / (DIAL.rx * s)) ** 2 + ((y - DIAL.cy) / (DIAL.ry * s)) ** 2;
  for (let y = DIAL.cy - DIAL.ry - 1; y <= DIAL.cy + DIAL.ry + 1; y++)
    for (let x = DIAL.cx - DIAL.rx - 1; x <= DIAL.cx + DIAL.rx + 1; x++) {
      const d = inside(x, y);
      if (d > 1) continue;
      const warm = clamp((x - 50) / 220, 0, 1);
      ramp(p, x, y, dialC, 2.6 + warm * 2.2 + (fbm(x * 1.6, y * 3, 51) - 0.5) * 1.2 - d * 0.6 + ((y - DIAL.cy) / DIAL.ry) * 0.5);
    }
  // Bronze rim: two rings with patina specks and a bright sun-side edge.
  for (const s of [1, 0.94]) {
    for (let a = 0; a < TAU; a += 0.0025) {
      const x = DIAL.cx + Math.cos(a) * DIAL.rx * s,
        y = DIAL.cy + Math.sin(a) * DIAL.ry * s;
      const lit = clamp(0.5 + Math.cos(a) * 0.5, 0, 1);
      put(p, x, y + 1, bronzeC[1]);
      put(p, x, y, bronzeC[clamp(Math.round(3 + lit * 3), 0, 7)]);
      if (hash(Math.round(x), Math.round(y), 53) > 0.93) put(p, x, y, patinaC[1]);
    }
  }
  // Hour lines from the centre to the inner rim.
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * TAU;
    for (let r = 0.16; r < 0.92; r += 0.004) {
      const x = DIAL.cx + Math.cos(a) * DIAL.rx * r,
        y = DIAL.cy + Math.sin(a) * DIAL.ry * r;
      put(p, x, y, r > 0.7 ? bronzeC[4] : bronzeC[3]);
    }
  }
  // Twelve hour glyphs: our own marks — a dot, a bar, a chevron, a cross, an arc, repeated in a cycle of five.
  HOURS.forEach(([x, y], i) => {
    const near = (y - (DIAL.cy - DIAL.ry)) / (2 * DIAL.ry);
    const s = 1.3 + near * 1.6;
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
    } else
      for (let a = Math.PI; a <= TAU; a += 0.2) put(p, x + Math.cos(a) * s, y + Math.sin(a) * s * 0.6, g);
  });
  // Centre boss: a small bronze sun.
  for (let a = 0; a < TAU; a += 0.02) {
    put(p, DIAL.cx + Math.cos(a) * 9, DIAL.cy + Math.sin(a) * 2.4, bronzeC[4]);
    if (Math.round(a * 8 / TAU * 2) % 2 === 0) put(p, DIAL.cx + Math.cos(a) * 12, DIAL.cy + Math.sin(a) * 3.2, bronzeC[3]);
  }
  // The gnomon's shadow: a long dark wedge from its foot across the dial toward the front left, breathing faintly as
  // thin clouds pass the sun.
  const pass = 0.85 + 0.15 * Math.sin(k * TAU);
  const foot = [(GNOMON.x0 + GNOMON.x1) / 2, GNOMON.foot] as const;
  const tip = [foot[0] - 30, foot[1] + 50] as const;
  for (let y = foot[1]; y < H; y++)
    for (let x = 0; x < W; x++) {
      const u = (y - foot[1]) / (tip[1] - foot[1]);
      if (u > 1) continue;
      const cx = foot[0] + (tip[0] - foot[0]) * u;
      const half = (GNOMON.x1 - GNOMON.x0) * 0.5 * (1 - u) + 1;
      if (Math.abs(x - cx) < half) tint(p, x, y, stoneC[0], 0.42 * pass * (1 - u * 0.5));
    }
}

/** Balustrade along the far terrace edge: posts with rounded caps and a rail; cloud sea between them. */
function balustrade(p: Px) {
  const rail = TERRACE_TOP - 12;
  for (let x = 0; x < W; x++) {
    for (let y = rail; y < rail + 3; y++) ramp(p, x, y, stoneC, 5 + (y === rail ? 1.5 : 0) + clamp((x - 60) / 200, 0, 1) * 1.6);
    put(p, x, rail + 3, stoneC[1]);
  }
  for (let px = 6; px < W; px += 11) {
    if (px > GNOMON.x0 - 6 && px < GNOMON.x1 + 4) continue;
    for (let y = rail + 3; y < TERRACE_TOP; y++) {
      const bulge = Math.sin(((y - rail - 3) / (TERRACE_TOP - rail - 3)) * Math.PI) * 1.4;
      for (let x = px - 1.5 - bulge; x <= px + 1.5 + bulge; x++) ramp(p, x, y, stoneC, 3.6 + (x - px) * 0.7 + clamp((px - 60) / 200, 0, 1) * 1.4);
    }
  }
  for (let x = 0; x < W; x++) put(p, x, TERRACE_TOP, stoneC[2]);
}

/** The gnomon: a tall bronze blade, patina on the shadow side, a bright sun-side edge, engraved hour ticks. */
function gnomon(p: Px) {
  const [ax, ay] = GNOMON.apex;
  for (let y = ay; y <= GNOMON.foot; y++) {
    const u = (y - ay) / (GNOMON.foot - ay);
    const left = ax + (GNOMON.x0 - ax) * u,
      right = ax + (GNOMON.x1 - ax) * u;
    for (let x = Math.floor(left); x <= right; x++) {
      const across = (x - left) / Math.max(1, right - left);
      let s = 2 + across * 3.6 + (fbm(x * 3, y * 1.5, 61) - 0.5) * 1;
      put(p, x, y, bronzeC[clamp(Math.round(s), 0, 7)]);
      if (across < 0.3 && hash(x, y, 63) > 0.7) put(p, x, y, patinaC[hash(x, y, 65) > 0.5 ? 1 : 0]);
    }
    put(p, right, y, bronzeC[7]);
    if (y % 7 === 0 && u > 0.2) line(p, left + 2, y, right - 3, y, bronzeC[2]);
  }
  // plinth
  for (let y = GNOMON.foot; y < GNOMON.foot + 5; y++)
    for (let x = GNOMON.x0 - 4; x <= GNOMON.x1 + 4; x++) ramp(p, x, y, stoneC, 4 + (x - GNOMON.x0) / 18 + (y === GNOMON.foot ? 1.5 : 0));
}

/** The armillary sphere on its pedestal: rings turn slowly over the loop; silhouetted against the sun's glow. */
function armillary(p: Px, t: number) {
  const k = loopK(t);
  const { x: cx, y: cy, r } = ARMILLARY;
  // pedestal
  for (let y = cy + r; y < ARMILLARY.foot; y++) {
    const w = 2.5 + (y > ARMILLARY.foot - 6 ? 4 : 0) + (y < cy + r + 3 ? 2 : 0);
    for (let x = cx - w; x <= cx + w; x++) ramp(p, x, y, stoneC, 3.4 + (x - cx) / w * 1.6);
  }
  const ring = (tilt: number, spin: number, col: number) => {
    for (let a = 0; a < TAU; a += 0.012) {
      const X = Math.cos(a) * r,
        Y = Math.sin(a) * r;
      const x1 = X * Math.cos(spin),
        z1 = X * Math.sin(spin);
      const y2 = Y * Math.cos(tilt) - z1 * Math.sin(tilt);
      const z2 = Y * Math.sin(tilt) + z1 * Math.cos(tilt);
      put(p, cx + x1, cy + y2, bronzeC[clamp(col + (z2 > 0 ? 2 : 0) + (x1 > 0 ? 1 : 0), 0, 7)]);
    }
  };
  ring(Math.PI / 2, 0, 2); // horizon
  ring(0.41, k * TAU * 0.5, 3); // ecliptic — half a turn a loop looks the same (a circle is symmetric)
  ring(0, Math.PI / 2 + k * TAU * 0.5, 3); // meridian
  ring(1.1, 0.9 - k * TAU * 0.5, 2);
  // the axis rod and the small sun at the heart
  line(p, cx - r * 0.5, cy + r * 0.9, cx + r * 0.5, cy - r * 0.9, bronzeC[5]);
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 4) put(p, cx + x, cy + y, sunC[clamp(4 - (x * x + y * y), 1, 4)]);
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
    depth: 198,
    paint(p: Px) {
      // Broken balustrade blocks in the bottom corners: square-cut, lit on the sun side, a fallen post.
      const block = (x0: number, w: number, top: number, seed: number) => {
        for (let x = x0; x < x0 + w; x++) {
          const chip = (smooth(x, seed, 3) - 0.5) * 4;
          for (let y = Math.floor(top + chip); y < H; y++) {
            const u = (x - x0) / w;
            put(p, x, y, stoneC[clamp(Math.floor(2.6 + u * 2.4 + (fbm(x * 2, y * 2, seed) - 0.5) * 1.6 - (y - top) / 20), 0, 7)]);
          }
          put(p, x, top + chip, stoneC[7]);
        }
      };
      block(-6, 34, H - 22, 71);
      block(26, 16, H - 11, 73);
      block(216, 46, H - 26, 75);
      block(204, 14, H - 10, 77);
    },
  },
  {
    id: 'brazier',
    depth: 199,
    paint(p: Px) {
      // A bronze brazier on a tripod, bottom left: a shallow bowl of glowing embers (front props are still).
      const k = 0.3;
      const bx = 16,
        by = H - 30;
      for (const [x0, x1] of [
        [bx - 9, bx - 12],
        [bx + 9, bx + 12],
        [bx, bx],
      ])
        line(p, x0, by + 2, x1, H - 1, bronzeC[2]);
      for (let y = by - 3; y <= by + 2; y++) {
        const w = 11 - (by + 2 - y) * 0.4;
        for (let x = bx - w; x <= bx + w; x++) put(p, x, y, bronzeC[clamp(Math.round(3 + (x - bx) / w * 2 + (y === by - 3 ? 2 : 0)), 0, 7)]);
      }
      for (let i = 0; i < 18; i++) {
        const x = bx - 9 + hash(i, 81) * 18,
          y = by - 4 - hash(i, 83) * 2;
        const f = 0.5 + 0.5 * Math.sin(k * TAU * (1 + (i % 3)) + i);
        put(p, x, y, emberC[clamp(Math.round(1 + f * 3), 0, 4)]);
      }
    },
  },
];
export default scene;
