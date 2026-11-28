// «Пик громовержца» (canon §8.3: far plan in the top third, the floor below, a front plan). A storm at night on the
// highest summit. Far: layered storm clouds, blue-violet and near black, lit at their rims; at the top a slow vortex,
// the eye of the storm, with a cold glow in its heart that sends a faint shaft of light down onto the arena; two
// distant branching lightning bolts a loop, each lighting up the clouds round it for a moment, and a third flash hidden
// inside a cloud; slanting rain over the whole picture. Below the summit a sea of clouds lit from within, and jagged
// peaks rising out of it with a cold rim. The summit: a cliff-edged arena of ancient stone slabs in perspective, cracks
// and puddles that mirror the sky; a carved double ring of runes with a lightning seal in its middle that glows cyan
// and breathes; a broken stone gate at the far edge; two cracked menhirs with carved lightning glyphs, each crowned
// with a copper lightning rod where a spark crackles once a loop. Front plan: jagged wet rocks in the corners.
// Loops every 3 s.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { RGBA } from '../rig/f15-rig';
import type { Px } from '../rig/px';
import type { Scene } from '../types';

const W = 256,
  H = 208;
export const HORIZON = 100;
/** The arena floor and its rune ring (the creature's home is at its centre). */
export const ARENA = { top: 124, cx: 128, cy: 168, rx: 104, ry: 25 };
/** The two menhirs: foot and top of each (the lightning rods sit on top). */
export const MENHIR_L = { x: 24, foot: 152, top: 70 };
export const MENHIR_R = { x: 232, foot: 148, top: 82 };
/** The eye of the storm, top centre. */
export const EYE = { x: 128, y: 10 };
/** Loop moments of the far strikes (fraction of the 3 s loop) — fx can sync to them. */
export const STRIKES = [0.2, 0.7];
/** Where the far strikes land: the first into the cloud sea right of centre, the second on the tall right peak. */
export const STRIKE_X = [150, 210];

const skyC = ['#05061a', '#090b22', '#0d102b', '#121634', '#171c3e', '#1d2348', '#242b54', '#2c3460', '#363e6c'].map((c) => hx(c));
const cloudC = ['#090b1c', '#10142a', '#181d38', '#212848', '#2d355a', '#3c4672', '#56628e', '#7c88b4'].map((c) => hx(c));
const peakC = ['#07091a', '#0c1024', '#131932', '#1c2442', '#283456', '#4a5a86', '#7a8ab8'].map((c) => hx(c));
const seaC = ['#141a36', '#1b2244', '#232c52', '#2e3962', '#3c4874', '#505e8a', '#6a78a2'].map((c) => hx(c));
const stoneC = ['#0e0f16', '#15161f', '#1d1e29', '#262734', '#303140', '#3c3d4e', '#4a4c5e', '#5e6276'].map((c) => hx(c));
const runeC = ['#0e3440', '#185666', '#26848f', '#46bcc8', '#8ceaf0', '#dcffff'].map((c) => hx(c));
const copperC = ['#3e1c0c', '#7a3818', '#b4602a', '#e0904e', '#ffcc98'].map((c) => hx(c));
const waterC = ['#0a0d20', '#11162e', '#1a2140', '#262f54', '#3a4670', '#5a6890'].map((c) => hx(c));
const boltCore = hx('#ffffff'),
  boltGlow = hx('#a8e8ff'),
  boltEdge = hx('#8a7aff'),
  rain = hx('#7a90c0'),
  rainLit = hx('#c4d4f4'),
  eyeGlow = hx('#7ad4ec'),
  eyeCore = hx('#dafcff'),
  flashTint = hx('#8494d4');

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
function dither(p: Px, x: number, y: number, a: RGBA, b: RGBA, u: number) {
  put(p, x, y, u > bay(x, y) ? b : a);
}
/** Ordered-dither tint: strong tints replace the colour on a growing share of pixels, weak ones blend softly. */
function tint(p: Px, x: number, y: number, c: RGBA, a: number) {
  if (a <= 0.02) return;
  put(p, x, y, mixc(get(p, x, y), c, a > bay(x, y) ? Math.min(1, a + 0.2) : a * 0.5));
}
/** A smooth wash quantized to eighths: soft glows without a dither grid, still in a few flat bands. */
function wash(p: Px, x: number, y: number, c: RGBA, a: number) {
  const q = Math.round(clamp(a, 0, 1) * 8) / 8;
  if (q > 0) put(p, x, y, mixc(get(p, x, y), c, q));
}
function line(p: Px, x0: number, y0: number, x1: number, y1: number, c: RGBA) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= n; i++) put(p, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, c);
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
/** Value noise in 2D (bilinear over hashed lattice, smoothstepped). */
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
/** How bright the far strikes are at loop moment k: a three-frame flash with an afterglow. */
function strikeLight(k: number, at: number) {
  const d = k - at;
  if (d < 0 || d > 0.05) return 0;
  return d < 0.014 ? 1 : d < 0.028 ? 0.55 : 0.25 * (1 - (d - 0.028) / 0.022);
}

/** A branching lightning bolt from (x0, y0) down to y1, deterministic by seed: core, glow and violet edge. */
function bolt(p: Px, x0: number, y0: number, y1: number, seed: number, alpha: number, xEnd = x0 + 16) {
  const seg: [number, number, number, number, number][] = [];
  const grow = (x: number, y: number, yEnd: number, depth: number, s: number) => {
    let cx = x,
      cy = y;
    let i = 0;
    while (cy < yEnd) {
      // The trunk drifts toward its strike point; branches wander freely.
      const pull = depth ? 0 : (xEnd - cx) / Math.max(4, (yEnd - cy) / 4);
      const nx = cx + (hash(i, s) - 0.5) * (depth ? 9 : 10) + pull,
        ny = Math.min(yEnd, cy + 3 + hash(i, s, 2) * 4);
      seg.push([cx, cy, nx, ny, depth]);
      if (depth < 2 && hash(i, s, 3) > 0.74) grow(nx, ny, ny + (yEnd - ny) * (depth ? 0.3 : 0.5), depth + 1, s * 7 + i);
      cx = nx;
      cy = ny;
      i++;
    }
  };
  grow(x0, y0, y1, 0, seed);
  for (const [ax, ay, bx, by, d] of seg) {
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let o = -3; o <= 3; o++)
      for (let i = 0; i <= n; i++) tint(p, ax + ((bx - ax) * i) / n + o, ay + ((by - ay) * i) / n, d ? boltEdge : boltGlow, alpha * (0.5 - Math.abs(o) * 0.13) * (d ? 0.6 : 1));
  }
  for (const [ax, ay, bx, by, d] of seg) {
    if (alpha < 0.5 && d) continue;
    line(p, ax, ay, bx, by, alpha > 0.6 ? (d ? boltGlow : boltCore) : mixc(get(p, ax, ay), boltGlow, alpha));
    if (!d && alpha > 0.6) line(p, ax + 1, ay, bx + 1, by, boltGlow);
  }
}
/** A storm cloud bank: lumpy puffs, dark bodies, a cold rim along the top-left edge; flash lights it from inside. */
function stormBank(p: Px, cx: number, cy: number, w: number, h: number, seed: number, lit: number, glowAt?: [number, number, number]) {
  const n = Math.max(3, Math.round(w / 8));
  const puffs: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const arch = Math.sin(u * Math.PI);
    puffs.push([cx - w / 2 + u * w + (hash(i, seed) - 0.5) * 8, cy - arch * h * 0.45 + (hash(i, seed, 2) - 0.3) * 8, 6 + arch * h * 0.42 + hash(i, seed, 3) * 6]);
  }
  for (let y = Math.max(0, Math.floor(cy - h - 10)); y <= cy + h * 0.5; y++)
    for (let x = Math.max(0, Math.floor(cx - w / 2 - 14)); x <= Math.min(W - 1, cx + w / 2 + 14); x++) {
      let best = -1,
        rimD = 0;
      for (const [px, py, r] of puffs) {
        const d = ((x - px) ** 2 + (y - py) ** 2) / (r * r);
        if (d <= 1 && 1 - d > best) {
          best = 1 - d;
          rimD = (px - x) / r + ((py - y) / r) * 1.4;
        }
      }
      if (best < 0) continue;
      const tex = fbm(x, y * 1.4, seed);
      let v = 1 + tex * 1.8 - ((y - cy) / h) * 0.9;
      // A cold rim on the top-left edge of every puff, a dark crease between puffs below.
      if (best < 0.16 && rimD > 0.35) v += 2.4;
      else if (best < 0.3 && rimD > 0.5) v += 1.2;
      if (best < 0.1 && rimD < -0.4) v -= 0.8;
      if (glowAt) {
        const [gx, gy, ga] = glowAt;
        v += ga * 3 * Math.max(0, 1 - Math.hypot(x - gx, (y - gy) * 1.6) / 34);
      }
      v += lit * 3;
      put(p, x, y, cloudC[clamp(Math.floor(v), 0, 7)]);
    }
}
function sky(p: Px, t: number) {
  const k = loopK(t);
  const fa = strikeLight(k, STRIKES[0]),
    fb = strikeLight(k, STRIKES[1]);
  // Dark zenith to a violet-blue band near the horizon.
  for (let y = 0; y < HORIZON + 10; y++) {
    const u = (y / (HORIZON + 10)) ** 0.85 * (skyC.length - 1),
      i = Math.min(skyC.length - 2, Math.floor(u));
    for (let x = 0; x < W; x++) dither(p, x, y, skyC[i], skyC[i + 1], u - i);
  }
  // The eye of the storm: spiral arms of cloud winding slowly into a cold glowing hole.
  const spin = k * TAU;
  for (let y = 0; y < 82; y++)
    for (let x = 0; x < W; x++) {
      const dx = (x - EYE.x) / 1.7,
        dy = (y - EYE.y) * 1.15;
      const r = Math.hypot(dx, dy);
      if (r > 96) continue;
      const a = Math.atan2(dy, dx);
      const arm = Math.sin(a * 2 - Math.log(r + 3) * 4.2 + spin);
      const fall = 1 - r / 96;
      const tex = fbm(x + k * 6, y, 5);
      if (r < 8) {
        // A hole into a pale sky: a white core fading out through cyan to the cloud.
        put(p, x, y, r < 3.5 ? eyeCore : mixc(eyeGlow, cloudC[5], Math.round(((r - 3.5) / 4.5) * 4) / 4));
        continue;
      }
      if (arm > 0.1) {
        // The inner edge of each arm catches the eye's light.
        const edge = arm < 0.32 && r < 50 ? 2 : 0;
        put(p, x, y, cloudC[clamp(Math.floor(1 + arm * 2.2 * fall + tex * 1.4 + edge * (1 - r / 50)), 0, 6)]);
      }
      if (r < 30) wash(p, x, y, eyeGlow, 0.5 * (1 - r / 30) ** 1.5);
    }
  // Banks of storm clouds, back to front; the right-hand one holds a hidden flash at k ≈ 0.45.
  const inner = k > 0.44 && k < 0.49 ? 1 - Math.abs(k - 0.465) / 0.025 : 0;
  stormBank(p, 38, 64, 116, 34, 11, fa * 0.25);
  stormBank(p, 218, 58, 124, 38, 13, fb * 0.6, [196, 48, inner]);
  stormBank(p, 128, 88, 168, 20, 17, fa * 0.5 + fb * 0.2);
  // The whole sky brightens for a moment with each strike (a smooth wash, no dither grid).
  const f = Math.max(fa, fb);
  if (f > 0)
    for (let y = 0; y < HORIZON + 10; y++)
      for (let x = 0; x < W; x++) put(p, x, y, mixc(get(p, x, y), flashTint, 0.14 * f * (1 - y / (HORIZON + 10)) + 0.16 * f * Math.max(0, 1 - Math.abs(x - (fa > fb ? STRIKE_X[0] : STRIKE_X[1])) / 80)));
}
/** The far strikes: out of the cloud bank down onto a near peak's tip, drawn over the clouds and the cloud sea. */
function strikes(p: Px, t: number) {
  const k = loopK(t);
  const fa = strikeLight(k, STRIKES[0]),
    fb = strikeLight(k, STRIKES[1]);
  if (fa > 0.2) bolt(p, 134, 34, HORIZON + 4, 21, fa, STRIKE_X[0]);
  if (fb > 0.2) bolt(p, 192, 30, 72, 37, fb, STRIKE_X[1]);
}
/** Jagged ridge height by midpoint-like octaves. */
function ridge(x: number, px: number, top: number, half: number, base: number) {
  const e = Math.abs(x - px) / half;
  const jag = (smooth(x, px, 9) - 0.5) * 10 + (smooth(x, px + 3, 4) - 0.5) * 5 + (smooth(x, px + 5, 2) - 0.5) * 2;
  return top + e ** 0.8 * (base - top) + jag * Math.min(1, e * 3);
}
/** The sea of clouds below the summit with jagged peaks rising out of it. */
function cloudSea(p: Px, t: number) {
  const k = loopK(t);
  const fa = strikeLight(k, STRIKES[0]),
    fb = strikeLight(k, STRIKES[1]);
  // Far peaks (dim), then near peaks (rimmed).
  const far: [number, number, number][] = [
    [40, 82, 30],
    [122, 88, 24],
    [182, 80, 26],
  ];
  for (const [px, top, half] of far)
    for (let x = px - half; x <= px + half; x++) {
      const r = ridge(x, px, top, half, HORIZON + 6);
      for (let y = Math.floor(r); y < HORIZON + 10; y++) put(p, x, y, peakC[x < px ? 2 : 1]);
      put(p, x, r, peakC[x < px ? 4 : 2]);
    }
  for (let y = HORIZON - 6; y < ARENA.top + 8; y++)
    for (let x = 0; x < W; x++) {
      const roll = fbm(x + k * 16, y * 2.6, 41);
      if (y < HORIZON - 2 + roll * 10) continue;
      const u = (y - HORIZON + 6) / (ARENA.top + 14 - HORIZON);
      const v = 1.2 + roll * 3 + (1 - u) * 1.4;
      put(p, x, y, seaC[clamp(Math.floor(v), 0, 6)]);
    }
  // Light glowing inside the cloud sea under each far strike.
  for (let y = HORIZON - 4; y < ARENA.top; y++)
    for (let x = 0; x < W; x++) {
      const ga = Math.max(0, 1 - Math.hypot((x - STRIKE_X[0]) / 46, (y - HORIZON - 6) / 12)),
        gb = Math.max(0, 1 - Math.hypot((x - STRIKE_X[1]) / 40, (y - HORIZON - 6) / 11));
      const g = ga * (0.12 + fa * 0.7) + gb * (0.12 + fb * 0.6);
      if (g > 0) wash(p, x, y, hx('#7c8ccc'), g);
    }
  // Near jagged peaks rising out of the sea, cold rim on the lit (left) slope and the very ridge.
  const near: [number, number, number][] = [
    [10, 76, 24],
    [70, 92, 18],
    [164, 86, 20],
    [210, 72, 28],
    [250, 90, 14],
  ];
  for (const [px, top, half] of near)
    for (let x = px - half; x <= px + half; x++) {
      const r = ridge(x, px, top, half, HORIZON + 12);
      const foot = HORIZON + 6 + smooth(x, px + 1, 7) * 8;
      for (let y = Math.floor(r); y < foot; y++) {
        const lit = x < px ? 1.6 : 0;
        // Facets: diagonal bands of light and shadow down the slope.
        const facet = Math.floor((x - px) * 0.35 + (y - r) * 0.22 + smooth(y, px, 5) * 2) % 2 ? 0.6 : 0;
        put(p, x, y, peakC[clamp(Math.floor(1 + lit + facet - (y - r) / 14), 0, 4)]);
      }
      put(p, x, r, x < px ? peakC[6] : peakC[3]);
      if (x < px) put(p, x, r + 1, peakC[5]);
    }
}
/** The broken stone gate at the far edge of the arena: two pillars, the lintel snapped, its half fallen at the foot. */
function gate(p: Px) {
  const xl = 62,
    xr = 100,
    base = ARENA.top + 3;
  const pillar = (gx: number, h: number, chip: number) => {
    for (let y = base - h; y < base; y++)
      for (let x = gx - 5; x <= gx + 5; x++) {
        // A snapped, slanted top on the shorter pillar.
        if (y < base - h + 4 && x - gx > chip - (y - (base - h)) * 2) continue;
        const e = (x - gx) / 5;
        let v = 4.6 - e * 2.6 + fbm(x * 2, y, 91) * 1.4;
        if ((y - base) % 9 === 0) v = 1.4;
        put(p, x, y, stoneC[clamp(Math.floor(v), 0, 7)]);
      }
    for (let x = gx - 5; x <= gx + chip; x++) put(p, x, base - h, stoneC[7]);
    // Carved lightning glyphs down the pillar.
    for (let i = 0; i < 3; i++) {
      const y = base - h + 9 + i * 10;
      line(p, gx - 2, y, gx + 1, y + 2, runeC[1]);
      line(p, gx + 1, y + 2, gx - 1, y + 3, runeC[1]);
      line(p, gx - 1, y + 3, gx + 2, y + 5, runeC[1]);
    }
  };
  pillar(xl, 46, 5);
  pillar(xr, 32, 4);
  // The lintel: its left half still lies on the tall pillar and juts out with a broken end.
  for (let x = xl - 10; x <= xl + 20; x++)
    for (let d = 0; d < 6; d++) {
      if (x > xl + 16 && d < (x - xl - 16) * 1.5) continue;
      const y = base - 51 + d;
      put(p, x, y, stoneC[d === 0 ? 7 : d === 5 ? 1 : d < 3 ? 5 : 3]);
    }
  // Its other half fell and lies tilted at the foot of the short pillar.
  for (let i = 0; i < 24; i++) {
    const x = xr - 2 + i,
      y = base - 2 - i * 0.18;
    for (let d = -2; d <= 2; d++) put(p, x, y + d, stoneC[d < -1 ? 6 : d > 1 ? 1 : 3]);
  }
  // Rubble at the feet.
  for (const [rx, ry, r] of [
    [126, base, 2],
    [131, base + 1, 1.5],
    [54, base, 1.8],
    [88, base + 1, 1.2],
  ] as const)
    for (let y = -2; y <= 2; y++) for (let x = -3; x <= 3; x++) if (Math.hypot(x, y * 1.5) <= r) put(p, rx + x, ry + y, stoneC[y < 0 ? 5 : 2]);
}
/** Perspective slab coordinates of a floor pixel: u across, v into the depth (vanishing line just above the horizon). */
const VY = 96;
const slabU = (x: number, y: number) => (x - 128) / ((y - VY) * 0.3);
const slabV = (y: number) => 300 / (y - VY);
/** The arena: a cliff-edged floor of slabs in perspective, cracks, puddles and the carved rune ring that breathes. */
function arena(p: Px, t: number) {
  const k = loopK(t);
  const f = Math.max(strikeLight(k, STRIKES[0]), strikeLight(k, STRIKES[1]));
  for (let y = ARENA.top; y < H; y++) {
    const depth = (y - ARENA.top) / (H - ARENA.top);
    const v = slabV(y);
    const row = Math.floor(v);
    const seamV = Math.floor(slabV(y - 1)) !== row;
    const fv = v - row;
    const stag = (row % 2) * 0.5 + hash(row, 9) * 0.3;
    for (let x = 0; x < W; x++) {
      const u = slabU(x, y) + stag;
      const col = Math.floor(u);
      const seamU = Math.floor(slabU(x - 1, y) + stag) !== col;
      const fu = u - col;
      const tex = fbm(x * 1.2, y * 2.2, 51 + row);
      // Every slab has its own shade; its far edge (top) catches light, its left edge a thin highlight.
      let s = 2 + tex * 1.8 + hash(col, row, 3) * 1.3 + (1 - depth) * 0.3;
      if (fv > 0.82) s += 0.8;
      if (fu < 0.08) s += 0.5;
      // A chipped corner on some slabs.
      if (hash(col, row, 5) > 0.8 && fu > 0.82 && fv > 0.7) s -= 1.3;
      if (seamU || seamV) s = 0.5;
      put(p, x, y, stoneC[clamp(Math.floor(s), 0, 6)]);
    }
  }
  // The cliff lip: a lit edge where the summit ends, the cloud sea beyond it.
  for (let x = 0; x < W; x++) {
    const lip = ARENA.top + Math.round((smooth(x, 97, 11) - 0.5) * 3);
    put(p, x, lip, stoneC[7]);
    put(p, x, lip + 1, stoneC[5]);
    for (let y = ARENA.top - 3; y < lip; y++) put(p, x, y, get(p, x, ARENA.top - 4));
  }
  // Cracks across the slabs, a few with a faint glow seeping out (old strikes).
  for (let c = 0; c < 11; c++) {
    let x = 16 + hash(c, 61) * 224,
      y = ARENA.top + 6 + hash(c, 63) * 74;
    const glow = c % 4 === 0;
    for (let i = 0; i < 16; i++) {
      const nx = x + (hash(i, c, 65) - 0.5) * 7,
        ny = y + 0.8 + hash(i, c, 67) * 2.2;
      line(p, x, y, nx, ny, glow && i > 3 && i < 11 ? runeC[1] : stoneC[0]);
      x = nx;
      y = ny;
    }
  }
  // The sky's light falls through the eye of the storm onto the rune ring: a faint widening shaft.
  for (let y = ARENA.top; y < H; y++)
    for (let x = 0; x < W; x++) {
      const half = 22 + (y - ARENA.top) * 0.5;
      const d = Math.abs(x - ARENA.cx) / half;
      if (d < 1) tint(p, x, y, hx('#4a6a96'), 0.2 * (1 - d) * (1 - Math.abs(y - ARENA.cy) / 60));
    }
  // The rune ring: two carved channels with glyphs between them and a lightning seal in the middle, breathing.
  const breath = 0.5 + 0.5 * Math.sin(k * TAU);
  const ringAt = (a: number, s: number) => [ARENA.cx + Math.cos(a) * ARENA.rx * s, ARENA.cy + Math.sin(a) * ARENA.ry * s] as const;
  for (const s of [1, 0.8]) {
    for (let a = 0; a < TAU; a += 0.003) {
      const [x, y] = ringAt(a, s);
      put(p, x, y + 1, stoneC[0]);
      put(p, x, y, mixc(runeC[1], runeC[3], breath * 0.8 + f * 0.4));
      tint(p, x, y - 1, runeC[3], 0.3 * breath + f * 0.3);
    }
  }
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * TAU;
    const [x, y] = ringAt(a, 0.9);
    const near = (Math.sin(a) + 1) / 2;
    const s = 1.2 + near * 1.2;
    // A wave of light runs round the ring once a loop.
    const wave = Math.max(0, Math.cos(a - k * TAU)) ** 6;
    const g = mixc(runeC[2], runeC[5], clamp(breath * 0.4 + wave * 0.9 + f * 0.3, 0, 1));
    const kind = i % 4;
    if (kind === 0) {
      line(p, x - s, y - s * 0.4, x, y + s * 0.2, g);
      line(p, x, y + s * 0.2, x - s * 0.3, y + s * 0.6, g);
      line(p, x - s * 0.3, y + s * 0.6, x + s, y - s * 0.2, g);
    } else if (kind === 1) {
      line(p, x - s, y, x + s, y, g);
      put(p, x, y - s * 0.6, g);
      put(p, x, y + s * 0.6, g);
    } else if (kind === 2) {
      line(p, x - s * 0.6, y - s * 0.5, x + s * 0.6, y + s * 0.5, g);
      line(p, x - s * 0.6, y + s * 0.5, x + s * 0.6, y - s * 0.5, g);
    } else {
      line(p, x - s, y + s * 0.3, x, y - s * 0.4, g);
      line(p, x, y - s * 0.4, x + s, y + s * 0.3, g);
    }
    if (wave > 0.3) for (let yy = -3; yy <= 3; yy++) for (let xx = -4; xx <= 4; xx++) tint(p, x + xx, y + yy, runeC[3], 0.3 * wave * (1 - Math.hypot(xx / 4, yy / 3)));
  }
  // The seal: a lightning zigzag in a small ellipse at the centre (half hidden by the creature most of the time).
  for (let a = 0; a < TAU; a += 0.01) put(p, ARENA.cx + Math.cos(a) * 20, ARENA.cy + Math.sin(a) * 5, mixc(runeC[1], runeC[3], breath));
  const zig: [number, number][] = [
    [-12, -2],
    [-3, 1],
    [-5, -1],
    [5, 2],
    [3, 0],
    [12, 2],
  ];
  for (let i = 0; i < zig.length - 1; i++) line(p, ARENA.cx + zig[i][0], ARENA.cy + zig[i][1], ARENA.cx + zig[i + 1][0], ARENA.cy + zig[i + 1][1], mixc(runeC[2], runeC[4], breath));
  // Puddles in the slab hollows: they mirror the sky band and the rune glow; rain rings on them.
  for (const [px, py, rx, ry, seed] of [
    [80, 201, 18, 4, 1],
    [178, 203, 20, 4, 2],
  ] as const) {
    for (let y = Math.floor(py - ry); y <= py + ry; y++)
      for (let x = Math.floor(px - rx); x <= px + rx; x++) {
        const d = ((x - px) / rx) ** 2 + ((y - py) / ry) ** 2;
        if (d > 1) continue;
        // Mirror: the far rows show the brighter horizon band, the near rows the dark zenith.
        const m = (y - (py - ry)) / (2 * ry);
        put(p, x, y, waterC[clamp(Math.floor(4.2 - m * 3.2 - d * 0.8 + f * 1.5), 0, 5)]);
        if (d > 0.82) put(p, x, y, waterC[0]);
      }
    for (let r = 0; r < 2; r++) {
      const age = (k * 3 + seed * 0.37 + r * 0.5) % 1;
      const rr = 1 + age * rx * 0.5;
      const ox = px + (hash(r, seed) - 0.5) * rx * 0.9;
      for (let a = 0; a < TAU; a += 0.12) {
        const x = ox + Math.cos(a) * rr,
          y = py + Math.sin(a) * rr * 0.28;
        if (((x - px) / rx) ** 2 + ((y - py) / ry) ** 2 < 0.8) tint(p, x, y, rainLit, 0.6 * (1 - age));
      }
    }
  }
}
/** A cracked menhir with carved lightning glyphs and a copper lightning rod on top. */
function menhir(p: Px, m: { x: number; foot: number; top: number }, lean: number, broken: boolean, t: number, sparkAt: number) {
  const k = loopK(t);
  const f = Math.max(strikeLight(k, STRIKES[0]), strikeLight(k, STRIKES[1]));
  const h = m.foot - m.top;
  const axis = (y: number) => m.x + lean * (1 - (y - m.top) / h) * 6;
  for (let y = m.top; y <= m.foot; y++) {
    const u = (y - m.top) / h;
    let half = 5 + u * 6;
    if (u < 0.1) half *= 0.55 + u * 4.5;
    const cx = axis(y);
    for (let x = Math.floor(cx - half); x <= cx + half; x++) {
      // A broken menhir has a slanted snapped top.
      if (broken && y < m.top + 4 + (x - cx) * 0.6) continue;
      const e = (x - cx) / half;
      const tex = fbm(x * 2, y * 1.3, 71 + m.x);
      // Lit on the left face, a central ridge, dark on the right; rain-wet streaks.
      let v = 4 - e * 2.6 + tex * 1.6 - u * 0.5;
      if (Math.abs(e + 0.2) < 0.08) v += 0.8;
      if (hash(x, 3, m.x) > 0.9 && (y + x) % 5 === 0) v += 1;
      put(p, x, y, stoneC[clamp(Math.floor(v + f * 1.2), 0, 7)]);
    }
  }
  // Moss-dark base and a long crack.
  for (let x = m.x - 12; x <= m.x + 12; x++) put(p, x, m.foot + 1, stoneC[0]);
  let cx = axis(m.top + h * 0.15) + 2,
    cy = m.top + h * 0.15;
  for (let i = 0; i < 12; i++) {
    const nx = cx + (hash(i, m.x) - 0.5) * 4,
      ny = cy + 3;
    line(p, cx, cy, nx, ny, stoneC[0]);
    cx = nx;
    cy = ny;
  }
  // Carved lightning glyphs, glowing in turn from the top.
  for (let i = 0; i < 4; i++) {
    const y = m.top + 14 + i * 13,
      x = axis(y) - 2;
    const g = mixc(runeC[1], runeC[4], Math.max(0, Math.sin(k * TAU * 2 - i * 0.9)) ** 2 + f * 0.4);
    line(p, x - 2, y - 3, x + 1, y, g);
    line(p, x + 1, y, x - 1, y + 1, g);
    line(p, x - 1, y + 1, x + 2, y + 4, g);
  }
  // The copper rod with two collars and a ball tip.
  const rx = Math.round(axis(m.top)),
    ry = m.top + (broken ? 4 : 0);
  line(p, rx, ry, rx, ry - 16, copperC[3]);
  line(p, rx + 1, ry, rx + 1, ry - 16, copperC[1]);
  for (const y of [ry - 5, ry - 10]) line(p, rx - 1, y, rx + 2, y, copperC[2]);
  put(p, rx, ry - 17, copperC[4]);
  put(p, rx + 1, ry - 17, copperC[2]);
  const on = k >= sparkAt && k < sparkAt + 0.045;
  if (on) {
    const sk = (k - sparkAt) / 0.045;
    for (let a = 0; a < 7; a++) {
      const ang = (a / 7) * TAU + hash(a, Math.floor(sk * 4)) * 1.2;
      const L = 3 + hash(a, Math.floor(sk * 4), 1) * 4;
      line(p, rx, ry - 17, rx + Math.cos(ang) * L, ry - 17 + Math.sin(ang) * L, a % 2 ? boltGlow : boltCore);
    }
    for (let yy = -8; yy <= 8; yy++) for (let xx = -8; xx <= 8; xx++) tint(p, rx + xx, ry - 17 + yy, boltGlow, 0.35 * Math.max(0, 1 - Math.hypot(xx, yy) / 8));
  }
}
/** Slanting rain over the whole picture; each streak loops along its path. */
function rainfall(p: Px, t: number) {
  const k = loopK(t);
  for (let i = 0; i < 150; i++) {
    const speed = 3 + Math.floor(hash(i, 81) * 3);
    const u = (k * speed + hash(i, 83)) % 1;
    const x0 = hash(i, 85) * (W + 60) - 30,
      y = -10 + u * (H + 20),
      x = x0 + u * 46;
    const len = 4 + Math.floor(hash(i, 87) * 5);
    const near = hash(i, 89) > 0.75;
    for (let s = 0; s < len; s++) tint(p, x - s * 0.45, y - s, s === 0 ? rainLit : rain, (near ? 0.6 : 0.4) - s * 0.06);
  }
}

const scene: Scene = (p: Px, t: number) => {
  sky(p, t);
  cloudSea(p, t);
  strikes(p, t);
  gate(p);
  arena(p, t);
  menhir(p, MENHIR_L, 0.4, false, t, 0.42);
  menhir(p, MENHIR_R, -0.6, true, t, 0.9);
  rainfall(p, t);
};
scene.front = [
  {
    id: 'rocks-corners',
    depth: 198,
    paint(p: Px) {
      // Jagged rocks in both bottom corners: faceted, lit on their upper-left faces, wet glints on the edges.
      const rock = (x0: number, w: number, h: number, seed: number) => {
        for (let x = x0; x < x0 + w; x++) {
          const u = (x - x0) / w;
          const top = H - h * Math.sin(u * Math.PI) ** 0.55 - (smooth(x, seed, 6) - 0.5) * 9 - (smooth(x, seed + 1, 2) - 0.5) * 3;
          for (let y = Math.floor(top); y < H; y++) {
            const facet = Math.floor((x - x0) / 7 + (y - top) / 8 + smooth(y, seed, 4)) % 2;
            put(p, x, y, stoneC[clamp(Math.floor(3.4 - u * 2.2 + facet * 0.9 - (y - top) / 12), 0, 6)]);
          }
          put(p, x, top, u < 0.5 ? stoneC[7] : stoneC[5]);
          if (hash(x, seed) > 0.82) put(p, x, top + 1, hx('#8a9ac8'));
        }
      };
      rock(-8, 44, 28, 3);
      rock(24, 22, 14, 5);
      rock(212, 52, 32, 7);
      rock(198, 18, 12, 9);
    },
  },
];
export default scene;
