// Effects of Раскат. The storm language: lightning is a jagged line with branches — a white core, a turquoise-blue
// glow, a violet edge — for 2–3 frames, then an afterglow and the painting's flash; a dash leaves a zigzag of light
// and fading afterimages; a drum hit flashes the hide and rolls a shock ring; scorch marks and cracks keep a
// smouldering turquoise edge that cools and steams in the rain by the end of the clip; torn-up slabs leave pits that
// fill with rainwater. Always: a cold aura behind him that separates him from the night (in the storm a violet-white
// halo with sparks). Timelines read the beats and lanes of the pose book; positions read his sockets.
import { hash, TAU } from '../kit/f11-mobkit';
import { ellFill, oval, progress, shard } from '../fx/field';
import { fillPoly, star, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { beats, DASHES, gesture } from './storm_lord-poses';
import { EYE } from '../scenes/thunder_peak';

export const boltC = { core: '#ffffff', glow: '#a8e8ff', edge: '#8a7aff' };
const C = { teal: '#46d4dc', tealD: '#1c9aa8', gold: '#ffd458', goldL: '#fff2b0', violet: '#b4a0ff', violetD: '#5a46c0' };
const soot = '#07070d';
const stoneC = ['#0e0f16', '#1d1e29', '#303140', '#4a4c5e', '#6a6e84'];
const puddleC = ['#141a2c', '#23304c', '#3c4c72', '#8aa0c8'];
const smokeC = ['#14141e', '#232534', '#33364a', '#474a62'];
const steamC = '#9aa4b8';

const frameOf = (f: FxInput) => f.t * 24;
/** A socket now, or at an earlier frame of this clip; null where it does not exist. */
export function pt(f: FxInput, name: string, frame?: number): XY | null {
  if (frame === undefined) return f.points[name] ?? null;
  try {
    return f.pointAt(Math.max(0, frame) / 24, name);
  } catch {
    return null;
  }
}
const mid = (a: XY, b: XY, k = 0.5): XY => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const add = (a: XY, x: number, y: number): XY => [a[0] + x, a[1] + y];

// ---- the pen of the storm --------------------------------------------------------------------------------------------
/** A soft glow: rings of falling alpha (banded, pixel style). */
export function glow(p: Pen, at: XY, rx: number, ry: number, color: string, a: number, bands = 5) {
  if (a <= 0) return;
  for (let i = bands; i >= 1; i--) {
    const k = i / bands;
    ellFill(p, at, rx * k, ry * k, color, (a / bands) * (1.2 - k * 0.4));
  }
}
function jagged(a: XY, b: XY, seed: number, n: number, amp: number): XY[] {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    L = Math.hypot(dx, dy) || 1,
    nx = -dy / L,
    ny = dx / L;
  const pts: XY[] = [a];
  for (let i = 1; i < n; i++) {
    const u = i / n,
      o = (hash(i, seed, 7) - 0.5) * 2 * amp * Math.sqrt(Math.sin(Math.PI * u));
    pts.push([a[0] + dx * u + nx * o, a[1] + dy * u + ny * o]);
  }
  pts.push(b);
  return pts;
}
function poly(p: Pen, pts: XY[], c: string, a: number, w = 1) {
  if (a <= 0) return;
  p.col(c, Math.min(1, a));
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1],
      [x1, y1] = pts[i];
    const flat = Math.abs(x1 - x0) > Math.abs(y1 - y0);
    for (let k = 0; k < w; k++) {
      const o = Math.round(k - (w - 1) / 2);
      if (flat) p.line(Math.round(x0), Math.round(y0) + o, Math.round(x1), Math.round(y1) + o);
      else p.line(Math.round(x0) + o, Math.round(y0), Math.round(x1) + o, Math.round(y1));
    }
  }
}
/** Lightning from a to b: a violet edge, a pale blue glow, a white core and forked branches. */
export function bolt(p: Pen, a: XY, b: XY, seed: number, alpha = 1, width = 1, branches = 2) {
  if (alpha <= 0.02) return;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(3, Math.round(L / 7));
  const pts = jagged(a, b, seed, n, Math.min(12, 2 + L * 0.07));
  poly(p, pts, boltC.edge, 0.5 * alpha, width + 2);
  poly(p, pts, boltC.glow, 0.9 * alpha, width + 1);
  poly(p, pts, boltC.core, alpha, width);
  for (let k = 0; k < branches; k++) {
    const i = 1 + Math.floor(hash(k, seed, 3) * (pts.length - 2));
    const from = pts[i];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + (hash(k, seed, 4) > 0.5 ? 1 : -1) * (0.5 + 0.5 * hash(k, seed, 5));
    const len = L * (0.15 + 0.25 * hash(k, seed, 6));
    const to: XY = [from[0] + Math.cos(ang) * len, from[1] + Math.sin(ang) * len];
    const bp = jagged(from, to, seed * 7 + k, Math.max(2, Math.round(len / 6)), 2 + len * 0.1);
    poly(p, bp, boltC.glow, 0.6 * alpha, Math.max(1, width));
    poly(p, bp, boltC.core, 0.8 * alpha, 1);
  }
}
/** A small crackle: a short zigzag that lives one frame. */
function crackle(p: Pen, at: XY, r: number, seed: number, a: number, c = boltC.glow) {
  const ang = hash(seed, 1) * TAU,
    len = r * (0.5 + hash(seed, 2));
  const pts = jagged(at, [at[0] + Math.cos(ang) * len, at[1] + Math.sin(ang) * len], seed, 3, 1.5);
  poly(p, pts, c, a, 1);
  p.col(boltC.core, a);
  p.dot(Math.round(at[0]), Math.round(at[1]));
}
/** A shock ring rolling over the stone (squashed by the high view). */
function shock(p: Pen, at: XY, r: number, a: number, c = boltC.glow, squash = 0.3) {
  if (a <= 0 || r < 1) return;
  oval(p, add(at, 0, 1), r * 0.96, r * squash * 0.92, boltC.edge, a * 0.45);
  oval(p, at, r, r * squash, c, a);
  if (r > 10) oval(p, add(at, 0, -1), r * 1.02, r * squash, boltC.core, a * 0.5);
}
/** A ring in the air (a roar, a hit): round, not squashed. */
function airRing(p: Pen, at: XY, r: number, a: number, c = boltC.glow) {
  oval(p, at, r, r * 0.8, c, a);
  oval(p, at, r * 0.9, r * 0.72, boltC.core, a * 0.4);
}
function wash(p: Pen, f: FxInput, c: string, a: number) {
  if (a <= 0.01) return;
  p.col(c, Math.min(1, a));
  p.rect(0, 0, f.w, f.h);
}
/** Ballistic sparks with short tails; `dir` is the launch direction (radians, screen), `spread` the fan. */
function sparks(p: Pen, at: XY, age: number, life: number, n: number, speed: number, seed: number, dir = -Math.PI / 2, spread = 1.2, grav = 140, floorY = Infinity) {
  if (age < 0 || age > life) return;
  for (let i = 0; i < n; i++) {
    const th = dir + (hash(i, seed, 1) - 0.5) * spread * Math.PI,
      v = speed * (0.45 + 0.55 * hash(i, seed, 2));
    const own = life * (0.6 + 0.4 * hash(i, seed, 3));
    if (age > own) continue;
    const at2 = (s: number): XY => {
      const tt = s / 24;
      return [at[0] + Math.cos(th) * v * tt, Math.min(floorY, at[1] + Math.sin(th) * v * tt + 0.5 * grav * tt * tt)];
    };
    const a = 1 - (age / own) ** 2;
    const [x0, y0] = at2(Math.max(0, age - 1.2)),
      [x1, y1] = at2(age);
    p.col(age < own * 0.35 ? boltC.core : i % 3 ? boltC.glow : C.goldL, a);
    p.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1));
  }
}
/** Slow glowing motes (crushed stone, burnt dust) that drift down and fade. */
function motes(p: Pen, at: XY, age: number, life: number, n: number, out: number, seed: number, fall = 26) {
  if (age < 0 || age > life) return;
  const k = age / life;
  for (let i = 0; i < n; i++) {
    const th = hash(i, seed, 1) * TAU,
      d = out * Math.sqrt(hash(i, seed, 2)) * (1 - Math.exp(-age / 5));
    const x = at[0] + Math.cos(th) * d + Math.sin(age * 0.2 + i) * 1.5,
      y = at[1] + Math.sin(th) * d * 0.8 + fall * k * k * (0.5 + hash(i, seed, 3));
    const a = (1 - k) * (0.6 + 0.4 * Math.sin(age * 0.7 + i * 2));
    p.col(i % 4 ? C.teal : C.goldL, Math.max(0, a));
    p.dot(Math.round(x), Math.round(y), i % 2 ? 2 : 1, 1);
  }
}
/** Rising steam: grey-white puffs, thinning. */
function steam(p: Pen, at: XY, age: number, life: number, n: number, seed: number, rise = 22, a0 = 0.4, drift = 0) {
  if (age < 0) return;
  for (let i = 0; i < n; i++) {
    const k = (age - i * (life / n)) / life;
    if (k < 0 || k > 1) continue;
    const x = at[0] + (hash(i, seed, 1) - 0.5) * 8 + Math.sin(k * 5 + i) * 2 + drift * k,
      y = at[1] - rise * k;
    ellFill(p, [x, y], 1.4 + 3 * k, 1.1 + 2.2 * k, steamC, a0 * (1 - k) * Math.min(1, k * 6));
  }
}
/** A scorch on the stone: soot, a black heart, cracks glowing turquoise while it is hot. */
function scorch(p: Pen, at: XY, r: number, heat: number, seed: number, a = 1) {
  if (a <= 0) return;
  ellFill(p, at, r, r * 0.34, soot, 0.85 * a);
  ellFill(p, at, r * 0.55, r * 0.19, '#000000', 0.6 * a);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * TAU + hash(i, seed) * 0.8,
      len = r * (0.8 + 0.7 * hash(i, seed, 2));
    const pts = jagged(at, [at[0] + Math.cos(ang) * len, at[1] + Math.sin(ang) * len * 0.34], seed * 13 + i, 4, 1.4);
    poly(p, pts, soot, 0.8 * a);
    poly(p, pts, heat > 0.55 ? boltC.core : boltC.glow, Math.min(1, heat * 1.5) * a);
  }
  // (No turquoise fill: the arena's runes are turquoise and would swallow it; the stone glows white-blue.)
  if (heat > 0.05) oval(p, at, r * 0.7, r * 0.24, heat > 0.6 ? boltC.core : boltC.glow, heat * a);
  oval(p, add(at, 0, 1), r * 1.05, r * 0.37, stoneC[3], 0.35 * a);
}
/** Radial cracks running out over the stone from an impact; `reach` 0..1 lets them run. */
function cracks(p: Pen, at: XY, n: number, len: number, heat: number, seed: number, reach: number, a = 1) {
  if (a <= 0 || reach <= 0) return;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * TAU + (hash(i, seed) - 0.5) * 0.6,
      L = len * (0.6 + 0.6 * hash(i, seed, 2)) * reach;
    const end: XY = [at[0] + Math.cos(ang) * L, at[1] + Math.sin(ang) * L * 0.32];
    const pts = jagged(at, end, seed * 31 + i, Math.max(3, Math.round(L / 6)), 1.6);
    poly(p, pts, soot, 0.85 * a, 2);
    poly(p, pts, heat > 0.6 ? boltC.core : heat > 0.3 ? boltC.glow : '#8a9ae8', Math.min(1, heat * 1.6) * a);
    if (hash(i, seed, 5) > 0.45 && pts.length > 3) {
      const from = pts[Math.floor(pts.length / 2)];
      const b = ang + (hash(i, seed, 6) > 0.5 ? 0.7 : -0.7);
      const bp = jagged(from, [from[0] + Math.cos(b) * L * 0.4, from[1] + Math.sin(b) * L * 0.13], seed * 37 + i, 3, 1);
      poly(p, bp, soot, 0.8 * a);
      poly(p, bp, '#8a9ae8', Math.min(1, heat * 1.3) * a);
    }
  }
}
/** A pit where a slab was torn out: dark, with a glowing rim; rain fills it (`water` 0..1). */
function pit(p: Pen, at: XY, w: number, heat: number, water: number, a = 1, seed = 0) {
  // Broken chips round the lip, then the hole: a lit far wall, a black throat.
  for (let i = 0; i < 5; i++) {
    const ang = hash(i, seed, 1) * TAU,
      d = w * (1.1 + 0.4 * hash(i, seed, 2));
    p.col(stoneC[i % 2 ? 3 : 4], 0.9 * a);
    p.rect(Math.round(at[0] + Math.cos(ang) * d), Math.round(at[1] + Math.sin(ang) * d * 0.36), 2, 1);
  }
  ellFill(p, at, w, w * 0.38, '#000000', 0.9 * a);
  ellFill(p, add(at, 0, -w * 0.12), w * 0.86, w * 0.2, stoneC[2], 0.9 * a);
  ellFill(p, add(at, 0, w * 0.06), w * 0.7, w * 0.22, '#000000', a);
  if (water > 0) {
    ellFill(p, add(at, 0, w * 0.04), w * 0.8 * water, w * 0.26 * water, puddleC[2], 0.95 * a);
    p.col('#c4d8f4', 0.8 * a * water);
    p.rect(Math.round(at[0] - w * 0.4), Math.round(at[1]), Math.max(1, Math.round(w * 0.5 * water)), 1);
  }
  oval(p, at, w, w * 0.38, heat > 0.2 ? boltC.glow : stoneC[4], (0.5 + 0.5 * heat) * a);
}
/** A dark smoke puff with a lighter top. */
function smoke(p: Pen, at: XY, r: number, a: number) {
  if (a <= 0.01) return;
  ellFill(p, add(at, r * 0.15, r * 0.2), r, r * 0.78, smokeC[1], a * 0.8);
  ellFill(p, at, r * 0.88, r * 0.7, smokeC[2], a * 0.85);
  ellFill(p, add(at, -r * 0.25, -r * 0.28), r * 0.55, r * 0.42, smokeC[3], a * 0.8);
  ellFill(p, add(at, -r * 0.35, -r * 0.4), r * 0.22, r * 0.16, '#5a5e76', a * 0.7);
}
/** A chunk of stone flying and landing. */
function chunks(p: Pen, at: XY, age: number, life: number, n: number, speed: number, seed: number, floorY: number) {
  if (age < 0 || age > life) return;
  for (let i = 0; i < n; i++) {
    const th = -Math.PI / 2 + (hash(i, seed, 1) - 0.5) * 2.4,
      v = speed * (0.5 + 0.5 * hash(i, seed, 2));
    const tt = age / 24;
    const x = at[0] + Math.cos(th) * v * tt,
      y = Math.min(floorY + (hash(i, seed, 4) - 0.5) * 10, at[1] + Math.sin(th) * v * tt + 90 * tt * tt);
    const a = 1 - progress(age, life * 0.7, life);
    const s = 1 + Math.round(hash(i, seed, 3) * 1.4);
    p.col(stoneC[1], a);
    p.rect(Math.round(x), Math.round(y), s + 1, s);
    p.col(stoneC[3], a);
    p.rect(Math.round(x), Math.round(y), s, 1);
  }
}
/** Glowing eyes (for the peek, the show): two narrow gold slits with a halo. */
function eyes(p: Pen, at: XY, gap: number, a: number, s = 1) {
  for (const sgn of [-1, 1]) {
    const e: XY = [at[0] + sgn * gap, at[1]];
    glow(p, e, 7 * s, 4 * s, C.gold, 0.7 * a, 4);
    fillPoly(p, [e[0] - 3.5 * s, e[1] + sgn * 0.5, e[0] + 3.5 * s, e[1] - sgn * 1.2, e[0] + 2.5 * s, e[1] + 1, e[0] - 2.5 * s, e[1] + 1.2]);
    p.col(C.goldL, a);
    fillPoly(p, [e[0] - 3.5 * s, e[1] + sgn * 0.5, e[0] + 3.5 * s, e[1] - sgn * 1.2, e[0] + 2.5 * s, e[1] + 1, e[0] - 2.5 * s, e[1] + 1.2]);
    p.col('#ffffff', a);
    p.rect(Math.round(e[0] - 1), Math.round(e[1]), 2, 1);
  }
}

// ---- always ---------------------------------------------------------------------------------------------------------
/** The aura behind him: a cold turquoise haze round the body; in the storm a violet-white halo and drifting sparks. */
function aura(f: FxInput, frame: number, k: number) {
  const body = pt(f, 'body'),
    head = pt(f, 'head');
  if (!body || !head) return;
  const c: XY = [(body[0] + head[0]) / 2, (body[1] + head[1]) / 2];
  const pulse = 0.85 + 0.15 * Math.sin((frame / 24) * TAU * 0.5);
  glow(f.under, c, 52 + 10 * k, 66 + 12 * k, k > 0.5 ? '#7a6ae0' : '#2a8a9a', (1.0 + 0.3 * k) * pulse, 7);
  glow(f.under, c, 26 + 8 * k, 38 + 10 * k, k > 0.5 ? '#c8c0ff' : '#3ab4c4', (0.35 + 0.2 * k) * pulse, 4);
  if (k > 0.5)
    for (let i = 0; i < 10; i++) {
      const life = 30,
        age = (frame + i * 7) % life;
      const a = hash(i, Math.floor((frame + i * 7) / life)) * TAU;
      const d = 30 + age * 1.2;
      f.under.col(i % 3 ? '#a8e8ff' : '#fff2b0', 0.9 * (1 - age / life));
      f.under.dot(Math.round(c[0] + Math.cos(a) * d * 0.8), Math.round(c[1] + Math.sin(a) * d - age * 0.6), 1, 1);
    }
}
/** The vortex over the peak flares (behind everything, on the sky). */
function vortex(f: FxInput, a: number, r = 1) {
  if (a <= 0) return;
  glow(f.backdrop, [EYE.x, EYE.y + 4], 40 * r, 14 * r, '#5ad4e8', 0.9 * a, 6);
  glow(f.backdrop, [EYE.x, EYE.y + 4], 14 * r, 6 * r, '#ffffff', 0.8 * a, 3);
}

// ---- everyday -------------------------------------------------------------------------------------------------------
function walkFx(f: FxInput, frame: number) {
  // Sparks scatter from under each paw as it comes down on the stone.
  const fl = frame % 24;
  for (const [name, at] of [
    ['footL', 0],
    ['footR', 12],
  ] as [string, number][]) {
    const age = fl - at;
    const foot = pt(f, name);
    if (foot && age >= 0 && age < 6) sparks(f.above, add(foot, 0, 1), age, 6, 4, 34, at + Math.floor(frame / 24) * 7, -Math.PI / 2, 1.4, 160);
  }
}
function lookFx(f: FxInput, frame: number) {
  const b = beats.look;
  const age = frame - b.snap;
  // The vortex answers his look: it flares, a bolt drops out of it into the clouds, his horns spark.
  vortex(f, age >= 0 ? Math.max(0, 1 - age / 16) : 0, 1.1);
  if (age >= 1 && age < 4) bolt(f.backdrop, [EYE.x + 4, EYE.y + 8], [EYE.x - 30, 70], 4, 1 - (age - 1) / 3, 1, 2);
  const h = pt(f, 'crown');
  if (h && age >= 0 && age < 10 && Math.floor(frame) % 2 === 0) crackle(f.above, add(h, 0, -4), 6, Math.floor(frame), 0.9);
}
function fidgetAFx(f: FxInput, frame: number) {
  const b = beats.fidget_a;
  const sh = pt(f, 'shoulderR'),
    el = pt(f, 'elbowR'),
    hd = pt(f, 'handR');
  if (!sh || !el || !hd) return;
  // The neck cracks: two tiny sparks at the nape.
  for (const c of b.crack) if (frame >= c && frame < c + 3) sparks(f.above, pt(f, 'mane') ?? sh, frame - c, 3, 3, 30, c, -Math.PI / 2, 1);
  // A spark runs down the arm to the open claws.
  const k = progress(frame, b.spark, b.spark + 12);
  if (frame >= b.spark && k < 1) {
    const at = k < 0.5 ? mid(sh, el, k * 2) : mid(el, hd, (k - 0.5) * 2);
    glow(f.above, at, 4, 4, C.teal, 0.8, 3);
    f.above.col(boltC.core, 1);
    f.above.rect(Math.round(at[0]), Math.round(at[1]), 2, 2);
  }
  // Arcs jump between the claw tips, faster and brighter.
  if (frame >= b.arc && frame < b.snap) {
    const fr = Math.floor(frame);
    const n = 1 + Math.floor(progress(frame, b.arc, b.snap) * 3);
    for (let i = 0; i < n; i++) {
      const a: XY = add(hd, (hash(fr, i, 1) - 0.5) * 8, (hash(fr, i, 2) - 0.5) * 8);
      const c: XY = add(hd, (hash(fr, i, 3) - 0.5) * 8, (hash(fr, i, 4) - 0.5) * 8);
      bolt(f.above, a, c, fr * 3 + i, 0.9, 1, 0);
    }
    glow(f.under, hd, 10, 9, C.teal, 0.5 * progress(frame, b.arc, b.snap), 4);
  }
  // The fist snaps shut on it: a burst of sparks and a pop of light.
  const age = frame - b.snap;
  if (age >= 0 && age < 12) {
    glow(f.above, hd, 14 * (1 - age / 12), 12 * (1 - age / 12), '#ffffff', 0.8 * (1 - age / 12), 4);
    sparks(f.above, hd, age, 12, 12, 70, 44, -Math.PI / 2, 2);
    if (age < 3) star(f.above, hd[0], hd[1], 8, 4, 0.3);
  }
}
function fidgetBFx(f: FxInput, frame: number) {
  const b = beats.fidget_b;
  const head = pt(f, 'head'),
    mane = pt(f, 'mane'),
    body = pt(f, 'body');
  if (!head || !mane || !body) return;
  // Rain flies off his mane and fur as droplets, with sparks among them.
  for (let n = 0; n < 4; n++) {
    const s = b.shake + n * 4;
    const age = frame - s;
    if (age < 0 || age > 14) continue;
    const from = n % 2 ? mane : head;
    const dir = n % 2 ? Math.PI * 1.1 : -0.1;
    for (let i = 0; i < 8; i++) {
      const th = dir + (hash(i, n, 1) - 0.5) * 1.6,
        v = 50 + 40 * hash(i, n, 2),
        tt = age / 24;
      const x = from[0] + Math.cos(th) * v * tt,
        y = from[1] + Math.sin(th) * v * tt - 20 * tt + 160 * tt * tt;
      f.above.col(i % 3 ? '#a8c4e8' : boltC.core, 1 - age / 14);
      f.above.rect(Math.round(x), Math.round(y), 1, 2);
    }
    sparks(f.above, from, age, 10, 3, 60, n + 9, dir, 1.2);
  }
}
function happyFx(f: FxInput, frame: number, b: { launch: number; land: number; roar: number }) {
  const feetNow = pt(f, 'floor');
  const launch = pt(f, 'floor', b.launch - 1);
  if (launch) {
    const age = frame - b.launch;
    sparks(f.above, launch, age, 10, 8, 50, 10, -Math.PI / 2, 1.6);
    shock(f.backdrop, launch, 6 + age * 2, 0.6 * (1 - progress(age, 0, 8)));
  }
  const land = pt(f, 'floor', b.land);
  if (land) {
    const age = frame - b.land;
    if (age >= 0) {
      const heat = 1 - progress(age, 4, 24);
      cracks(f.backdrop, land, 7, 30, heat, 24, progress(age, 0, 4), 1 - progress(age, 18, 24));
      shock(f.backdrop, land, 6 + age * 4.5, 0.9 * (1 - progress(age, 0, 10)));
      sparks(f.above, land, age, 14, 14, 80, 24, -Math.PI / 2, 1.8, 180, land[1] + 4);
      if (age < 2) wash(f.above, f, '#c8f0ff', 0.25);
    }
  }
  const mouth = pt(f, 'mouth');
  const age = frame - b.roar;
  if (mouth && age >= 0 && age < 12) for (let r = 0; r < 3; r++) airRing(f.above, mouth, 4 + (age - r * 3) * 3, 0.6 * (1 - age / 12));
  void feetNow;
}
function sleepFx(f: FxInput, frame: number) {
  // Rare summer lightning flickers inside the mane while he sleeps.
  const mane = pt(f, 'mane');
  if (!mane) return;
  const slot = Math.floor(frame / 3);
  if (hash(slot, 77) > 0.82) glow(f.above, add(mane, (hash(slot, 78) - 0.5) * 16, (hash(slot, 79) - 0.5) * 8), 6, 4, C.violet, 0.6, 3);
}
function wakeFx(f: FxInput, frame: number) {
  // He lands in a fighting stance and the drums discharge into the stone.
  const age = frame - beats.wake_startled.land;
  const floor = pt(f, 'floor');
  if (age < 0 || age > 12 || !floor) return;
  for (let i = 0; i < 8; i += 2) {
    const d = pt(f, 'drum' + i);
    if (d && age < 4) bolt(f.above, d, add(floor, (i - 3.5) * 10, 2), i * 5, 1 - age / 4, 1, 1);
  }
  shock(f.backdrop, floor, 8 + age * 4, 0.8 * (1 - age / 12));
}
function sleepOutFx(f: FxInput, frame: number) {
  const age = frame - beats.sleep_out.yawn;
  const crown = pt(f, 'crown');
  if (crown && age >= 0 && age < 8 && Math.floor(frame) % 2 === 0) crackle(f.above, add(crown, 0, -4), 8, Math.floor(frame) + 3, 0.9);
}

// ---- hatch and peek -------------------------------------------------------------------------------------------------
function hatchFx(f: FxInput, frame: number) {
  const b = beats.hatch;
  const floor = pt(f, 'floor', b.burst) ?? f.feet;
  const c: XY = add(floor, 0, -25);
  if (frame < b.burst) {
    // The thunder-stone: a dark egg of storm rock, its cracks glowing and spreading, shaking harder; a claw pokes out.
    const shakeX = frame > 18 ? Math.round(Math.sin(frame * 2.4) * progress(frame, 18, 37) * 1.6) : 0;
    const e = add(c, shakeX, 0);
    glow(f.under, e, 38, 44, C.teal, 0.6 * progress(frame, b.crack, b.burst), 5);
    ellFill(f.above, add(e, 0, 23), 22, 6, '#000000', 0.5);
    ellFill(f.above, add(e, 1, 1), 19.5, 25.5, stoneC[0], 1);
    ellFill(f.above, e, 19, 25, stoneC[1], 1);
    ellFill(f.above, add(e, -4, -6), 12.5, 16.5, stoneC[2], 1);
    ellFill(f.above, add(e, -7, -12), 5, 6, stoneC[3], 1);
    // A lightning sigil carved round its middle.
    poly(f.above, jagged(add(e, -18, 2), add(e, 18, 2), 77, 6, 2.5), '#000000', 0.8, 2);
    poly(f.above, jagged(add(e, -18, 2), add(e, 18, 2), 77, 6, 2.5), C.teal, 0.5 + 0.5 * progress(frame, 0, b.burst), 1);
    const reach = progress(frame, b.crack, b.burst - 2);
    for (let i = 0; i < 5; i++) {
      const from: XY = add(e, (hash(i, 51) - 0.5) * 22, -16 + hash(i, 52) * 26);
      const ang = hash(i, 53) * TAU,
        L = 6 + 15 * reach * (0.5 + hash(i, 54));
      if (reach * 5 < i) continue;
      const pts = jagged(from, add(from, Math.cos(ang) * L, Math.sin(ang) * L), i * 11, 3, 1.5);
      poly(f.above, pts, '#000000', 0.9);
      poly(f.above, pts, frame > 30 ? boltC.core : C.teal, 0.6 + 0.4 * Math.sin(frame * 0.8 + i));
    }
    // A claw tip pierces the shell from inside.
    if (frame >= b.poke) {
      const k = progress(frame, b.poke, b.poke + 3);
      for (const o of [0, 4]) {
        const tip: XY = add(e, 6 + o, -19 - (7 - o) * k);
        f.above.col('#2a2a34', 1);
        fillPoly(f.above, [e[0] + 3 + o, e[1] - 17, e[0] + 8 + o, e[1] - 17, tip[0], tip[1]]);
        f.above.col('#d0d0dc', 1);
        fillPoly(f.above, [e[0] + 4 + o, e[1] - 17, e[0] + 6 + o, e[1] - 17, tip[0], tip[1]]);
        glow(f.above, tip, 4, 4, boltC.glow, 0.8, 2);
      }
    }
    if (frame > 34) wash(f.above, f, '#c8f0ff', 0.08 * (frame - 34));
    return;
  }
  // The burst: shards fly out and lie on the stone, a flash, a ring, then they crumble to dust.
  const age = frame - b.burst;
  if (age < 3) wash(f.above, f, '#e8f8ff', 0.6 * (1 - age / 3));
  shock(f.backdrop, floor, 6 + age * 4, 0.9 * (1 - progress(age, 0, 12)));
  sparks(f.above, c, age, 16, 16, 90, 38, -Math.PI / 2, 2);
  for (let i = 0; i < 12; i++) {
    const th = -Math.PI / 2 + (hash(i, 61) - 0.5) * 3.0,
      v = 50 + 60 * hash(i, 62),
      tt = Math.min(age, 14) / 24;
    const landY = floor[1] + (hash(i, 63) - 0.3) * 14;
    const x = c[0] + Math.cos(th) * v * tt,
      y = Math.min(landY, c[1] + Math.sin(th) * v * tt + 120 * tt * tt);
    const a = 1 - progress(age, 20, 34);
    const sz = 4 + hash(i, 64) * 5;
    const spin = age < 14 ? age * 0.6 + i : i;
    shard(f.backdrop, x, y, Math.cos(spin) * sz, Math.sin(spin) * sz * 0.5, 2, stoneC[3], stoneC[1], a);
    if (age > 20 && age < 34) motes(f.backdrop, [x, y], age - 20, 14, 3, 3, i, 2);
  }
}
function peekFx(f: FxInput, frame: number) {
  const b = beats.peek;
  // Eyes glow in the dark at the bottom edge, rising, before anything else shows.
  if (frame < b.rise + 1) {
    const k = progress(frame, b.eyes, b.rise);
    const a = Math.min(1, progress(frame, b.eyes, b.eyes + 4)) * (frame > b.rise - 1 ? 0.4 : 1);
    eyes(f.above, [f.w / 2 + 6, f.h - 16 - 12 * k], 13, a, 2);
    if (frame >= b.eyes && Math.floor(frame) % 5 === 0) crackle(f.above, [f.w / 2 + 6 + (hash(Math.floor(frame), 1) - 0.5) * 30, f.h - 4], 6, Math.floor(frame), 0.8);
  }
  // The leap out of the picture: a ring on the stone where he pushed off, a streak up past the top of the frame.
  const off = pt(f, 'floor', b.leap - 2);
  const leapAge = frame - b.leap;
  if (off && leapAge >= 0 && leapAge < 10) {
    shock(f.backdrop, off, 5 + leapAge * 4, 0.7 * (1 - leapAge / 10));
    if (leapAge < 4) bolt(f.above, [off[0], off[1] - 6], [off[0] + 4, -10], 51, 1 - leapAge / 4, 2, 2);
  }
  const land = pt(f, 'floor', b.home);
  const age = frame - b.home;
  if (land && age >= 0) {
    shock(f.backdrop, land, 6 + age * 5, 0.8 * (1 - age / 6));
    sparks(f.above, land, age, 6, 8, 60, 57, -Math.PI / 2, 1.6);
  }
}

// ---- Громовой рывок ----------------------------------------------------------------------------------------------
function trickFx(f: FxInput, frame: number) {
  const b = beats.trick;
  const fr = Math.floor(frame);
  // Charging: static crawls over him, the stone crackles round his paws.
  const body = pt(f, 'body'),
    floor = pt(f, 'floor');
  if (frame < b.dashes[0] && body && floor) {
    const k = progress(frame, 0, b.dashes[0]);
    for (let i = 0; i < 1 + Math.floor(k * 4); i++) crackle(f.above, add(body, (hash(fr, i, 1) - 0.5) * 30, (hash(fr, i, 2) - 0.7) * 50), 7, fr * 5 + i, 0.9);
    for (let i = 0; i < 1 + Math.floor(k * 3); i++) crackle(f.backdrop, add(floor, (hash(fr, i, 3) - 0.5) * 36, (hash(fr, i, 4) - 0.5) * 8), 8, fr * 7 + i, 0.8);
    glow(f.under, floor, 18 + 10 * k, 6 + 3 * k, C.teal, 0.6 * k, 4);
  }
  // Every dash: a scorch where he stood, a bolt to where he lands.
  const cool = (from: number) => Math.max(0, 1 - (frame - from) / (b.cool - from + 10));
  const fade = 1 - progress(frame, 238, 262);
  DASHES.forEach(([F], n) => {
    if (frame < F) return;
    const dep = pt(f, 'floor', F - 1);
    if (dep) {
      scorch(f.backdrop, dep, 14, cool(F), 100 + n, fade);
      steam(f.above, dep, frame - b.cool - n * 4, 36, 5, n, 20, 0.35);
      if (frame < F + 6) sparks(f.above, dep, frame - F, 6, 6, 50, n * 3, -Math.PI / 2, 1.5);
    }
    const a = pt(f, 'body', F - 1),
      z = pt(f, 'body', F + 2);
    const age = frame - F;
    if (a && z && age < 7) bolt(f.above, a, z, F, age < 3 ? 1 : 1 - (age - 3) / 4, n === 5 ? 2 : 1, 3);
    if (age >= 0 && age < 2) wash(f.above, f, '#c8f0ff', 0.12);
  });
  // The glass: three claw lines raked across it, glowing, fading slowly.
  // (While he is at the glass his own body hides them; they show on the glass once he flips away.)
  if (frame >= b.swipe + 1 && frame < 196) {
    const path: XY[] = [];
    for (let s = b.swipe; s <= Math.min(frame, b.swipe + 4); s++) {
      const h = pt(f, 'handR', s);
      if (h) path.push(h);
    }
    if (path.length > 1) {
      const a = 1 - progress(frame, 170, 196);
      const d = [path[path.length - 1][0] - path[0][0], path[path.length - 1][1] - path[0][1]];
      const L = Math.hypot(d[0], d[1]) || 1;
      for (const o of [-6, 0, 6]) {
        const line = path.map(([x, y]) => [x - (d[1] / L) * o, y + (d[0] / L) * o] as XY);
        poly(f.above, line, boltC.edge, 0.5 * a, 4);
        poly(f.above, line, boltC.glow, 0.8 * a, 2);
        poly(f.above, line, boltC.core, a, 1);
      }
    }
  }
  // The superhero landing: a ring, cracks running out, sparks; the cracks cool.
  const land = pt(f, 'floor', b.land);
  const age = frame - b.land;
  if (land && age >= 0) {
    cracks(f.backdrop, land, 9, 42, cool(b.land), 160, progress(age, 0, 4), fade);
    shock(f.backdrop, land, 8 + age * 5, 1 - progress(age, 0, 12));
    shock(f.backdrop, land, 4 + age * 3, 0.6 * (1 - progress(age, 0, 10)), C.teal);
    sparks(f.above, land, age, 16, 16, 90, 160, -Math.PI / 2, 1.8, 180, land[1] + 6);
    chunks(f.above, land, age, 18, 8, 60, 161, land[1] + 4);
    if (age < 2) wash(f.above, f, '#c8f0ff', 0.2);
    steam(f.above, land, frame - b.cool, 40, 6, 7, 26, 0.4);
  }
  // He flicks the sparks off his claws: they fly, land and sizzle in the wet.
  for (const fl of b.flicks) {
    const hd = pt(f, 'handR', fl),
      fy = (pt(f, 'floor') ?? [0, 160])[1];
    const ag = frame - fl;
    if (!hd || ag < 0 || ag > 24) continue;
    sparks(f.above, hd, ag, 14, 6, 70, fl, 0.15, 0.8, 200, fy + 6);
    if (ag > 6) for (let i = 0; i < 3; i++) glow(f.backdrop, [hd[0] + 14 + i * 7, fy + 4 + (i % 2) * 3], 3, 1.5, C.teal, 0.8 * (1 - (ag - 6) / 18), 2);
  }
}

// ---- Зов молнии ---------------------------------------------------------------------------------------------------
function trickBFx(f: FxInput, frame: number) {
  const b = beats.trick_b;
  const fr = Math.floor(frame);
  const hand = pt(f, 'handR');
  // Static climbs the raised arm; the sky answers with a bolt into the paw.
  if (hand && frame >= b.raise && frame < b.strike) {
    const k = progress(frame, b.raise, b.strike);
    vortex(f, k * 0.8, 1 + k * 0.3);
    for (let i = 0; i < 1 + Math.floor(k * 3); i++) crackle(f.above, add(hand, (hash(fr, i) - 0.5) * 10, -4 - hash(fr, i, 2) * 10), 8, fr * 3 + i, 0.9);
  }
  const strikeAge = frame - b.strike;
  const hs = pt(f, 'handR', b.strike);
  if (hs && strikeAge >= -1 && strikeAge < 5) {
    bolt(f.above, [hs[0] + 10, 0], add(hs, 0, -6), 30, strikeAge < 2 ? 1 : 1 - (strikeAge - 2) / 3, 2, 3);
    if (strikeAge >= 0 && strikeAge < 3) wash(f.above, f, '#d8f4ff', 0.45 * (1 - strikeAge / 3));
  }
  // The spear's wheel of light in the figure eight.
  if (frame >= b.twirl[0] && frame < b.leap + 10) {
    for (const end of ['spearTip', 'spearButt']) {
      const trail: XY[] = [];
      for (let s = 0; s < 5; s++) {
        const p = pt(f, end, frame - s * 0.6);
        if (p) trail.push(p);
      }
      if (trail.length > 1) {
        poly(f.above, trail, boltC.edge, 0.4, 3);
        poly(f.above, trail, C.goldL, 0.8, 1);
      }
    }
  }
  // The slam: the spear goes into the stone, cracks run, a ring, chips fly; the hole glows and cools.
  const slam = pt(f, 'handRGround', b.slam) ?? pt(f, 'floor', b.slam);
  const floorY = (pt(f, 'floor', b.slam) ?? [0, 160])[1];
  const sAge = frame - b.slam;
  const fadeAll = 1 - progress(frame, 250, 275);
  if (slam && sAge >= 0) {
    const entry: XY = [slam[0], Math.max(floorY - 4, Math.min(floorY + 6, slam[1]))];
    const heat = 1 - progress(sAge, 20, 160);
    cracks(f.backdrop, entry, 10, 46, heat, 86, progress(sAge, 0, 5), fadeAll);
    shock(f.backdrop, entry, 6 + sAge * 5, 1 - progress(sAge, 0, 12));
    chunks(f.above, entry, sAge, 20, 10, 70, 87, floorY + 4);
    sparks(f.above, entry, sAge, 12, 12, 80, 88, -Math.PI / 2, 1.6);
    glow(f.backdrop, entry, 8, 3, '#ffffff', heat * fadeAll, 3);
    glow(f.under, entry, 14, 5, C.teal, 0.8 * heat * fadeAll, 4);
  }
  // Torn slabs leave pits; static jumps between the floating slabs; the crush makes them glowing dust.
  const pits: XY[] = [];
  for (let i = 0; i < 10; i++) {
    const g = pt(f, `stone${i}Ground`, b.rise[0] + 1);
    if (g) pits.push(g);
  }
  if (frame >= b.rise[0]) {
    const water = progress(frame, 200, 262);
    pits.forEach((g, i) => {
      pit(f.backdrop, g, 9 + hash(i, 71) * 3, 1 - progress(frame, 120, 220), water, Math.max(0.35, fadeAll), i);
      chunks(f.above, g, frame - b.rise[0] - (i % 4), 16, 3, 40, 90 + i, g[1] + 3);
    });
  }
  if (frame >= b.rise[1] && frame < b.crush)
    for (let i = 0; i < 10; i++) {
      if (hash(fr, i, 9) > 0.35) continue;
      const a = pt(f, 'stone' + i),
        c = pt(f, 'stone' + ((i + 1 + Math.floor(hash(fr, i, 8) * 3)) % 10));
      if (a && c) bolt(f.above, a, c, fr * 10 + i, 0.8, 1, 0);
    }
  const cAge = frame - b.crush;
  const fist = pt(f, 'handR', b.crush);
  if (fist && cAge >= 0) {
    if (cAge < 2) wash(f.above, f, '#d8f4ff', 0.3);
    motes(f.above, fist, cAge, 70, 50, 34, 170, 70);
    sparks(f.above, fist, cAge, 14, 16, 90, 171, -Math.PI / 2, 2);
    airRing(f.above, fist, 4 + cAge * 3, 0.7 * (1 - progress(cAge, 0, 10)));
  }
  // Dusting the paws.
  const dAge = frame - b.dust;
  const h2 = pt(f, 'handL');
  if (h2 && dAge >= 0 && dAge < 14) motes(f.above, h2, dAge, 14, 8, 4, 196, 18);
}

// ---- Барабаны войны -----------------------------------------------------------------------------------------------
function trickCFx(f: FxInput, frame: number) {
  const b = beats.trick_c;
  const fr = Math.floor(frame);
  // The ring unfolds: each drum sparks as it swings down.
  if (frame < b.unfold[1])
    for (let i = 0; i < 8; i++) {
      const d = pt(f, 'drum' + i);
      if (d && hash(fr, i, 3) > 0.8) crackle(f.above, d, 6, fr * 8 + i, 0.8);
    }
  // Every hit: a star of light on the hide, a shock ring off the drum, sparks, a ripple on the stone.
  const floor = pt(f, 'floor');
  for (const c of b.hits) {
    const age = frame - c;
    if (age < 0 || age > 10) continue;
    const at = pt(f, 'drumHit', c);
    if (!at) continue;
    if (age < 3) {
      glow(f.above, at, 16 - age * 4, 14 - age * 4, '#ffffff', 0.9 - age * 0.3, 4);
      f.above.col('#ffffff', 1 - age / 3);
      star(f.above, at[0], at[1], 14 - age * 3, 6, c);
    }
    airRing(f.above, at, 4 + age * 5, 0.95 * (1 - age / 10), age < 4 ? boltC.core : boltC.glow);
    airRing(f.above, at, 2 + age * 3, 0.6 * (1 - age / 8), C.goldL);
    sparks(f.above, at, age, 8, 8, 80, c, -Math.PI / 2, 2);
    if (floor) shock(f.backdrop, floor, 12 + age * 6, 0.8 * (1 - age / 10));
  }
  // The spin: the drums leave arcs of light, the wind whips round him.
  if (frame >= b.spin[0] && frame < b.spin[1] + 6) {
    const a = 1 - progress(frame, b.spin[1], b.spin[1] + 6);
    for (let i = 0; i < 8; i++) {
      const trail: XY[] = [];
      for (let s = 0; s < 4; s++) {
        const p = pt(f, 'drum' + i, frame - s * 0.7);
        if (p) trail.push(p);
      }
      if (trail.length > 1) {
        poly(f.under, trail, '#c83a2c', 0.5 * a, 3);
        poly(f.under, trail, C.goldL, 0.6 * a, 1);
      }
    }
    const body = pt(f, 'body');
    if (body)
      for (let i = 0; i < 4; i++) {
        const st = frame * 0.5 + i * 1.6;
        oval(i % 2 ? f.above : f.under, body, 44 + i * 4, 14 + i, '#c4d4f4', 0.5 * a, st, st + 1.1);
      }
  }
  // The double slam: eight bolts up from the eight drums meet over him and go up as one giant bolt.
  const sAge = frame - b.slam;
  const meet: XY = [(pt(f, 'body', b.slam) ?? [128, 120])[0], 22];
  if (sAge >= 0 && sAge < 14) {
    for (let i = 0; i < 8; i++) {
      const d = pt(f, 'drum' + i, b.slam);
      if (d && sAge < 6) bolt(f.above, d, meet, 200 + i, sAge < 3 ? 1 : 1 - (sAge - 3) / 3, 1, 1);
    }
    if (sAge >= 2) bolt(f.above, meet, [EYE.x, EYE.y + 4], 210 + Math.floor(sAge / 2), 1 - progress(sAge, 8, 14), 3, 3);
    glow(f.above, meet, 16, 12, '#ffffff', 1 - progress(sAge, 2, 14), 4);
    vortex(f, 1 - progress(sAge, 4, 30), 1.6);
    if (sAge < 2 || (sAge >= 4 && sAge < 5)) wash(f.above, f, '#e0f8ff', 0.45);
  }
  const fl = pt(f, 'floor', b.slam);
  if (fl && sAge >= 0) {
    const heat = 1 - progress(sAge, 6, 60);
    cracks(f.backdrop, add(fl, 10, 0), 8, 40, heat, 202, progress(sAge, 0, 4), 1 - progress(frame, 250, 275));
    shock(f.backdrop, fl, 8 + sAge * 5, 1 - progress(sAge, 0, 14));
    chunks(f.above, add(fl, 10, 0), sAge, 18, 8, 60, 203, fl[1] + 4);
    steam(f.above, add(fl, 10, 0), sAge - 30, 40, 5, 9, 22, 0.35);
  }
  // A breath of steam through the nose.
  const nose = pt(f, 'nose', b.steam);
  const nAge = frame - b.steam;
  if (nose && nAge >= 0) steam(f.above, nose, nAge, 18, 4, 236, 8, 0.6, 14);
}

// ---- Пробуждение бури ----------------------------------------------------------------------------------------------
function phaseFx(f: FxInput, frame: number) {
  const b = beats.phase;
  const head = pt(f, 'head'),
    body = pt(f, 'body'),
    floor = pt(f, 'floor');
  if (!head || !body || !floor) return;
  vortex(f, progress(frame, 0, b.roar) * (1 - progress(frame, b.burst, 110)), 1.3);
  // Four bolts out of the sky into him.
  b.strikes.forEach((s, i) => {
    const age = frame - s;
    if (age < 0 || age > 4) return;
    const x = [70, 190, 100, 160][i];
    bolt(f.above, [x, 0], add(head, (i - 1.5) * 4, -6), s, age < 2 ? 1 : 1 - (age - 2) / 2, 2, 3);
    if (age < 2) wash(f.above, f, '#e0f4ff', 0.35);
    sparks(f.above, head, age, 6, 6, 60, s, -Math.PI / 2, 2);
  });
  // The white silhouette: light gathers round him in a spiral.
  if (frame >= b.white[0] && frame < b.burst) {
    const k = progress(frame, b.white[0], b.burst);
    glow(f.under, mid(body, head), 30 + 30 * k, 40 + 30 * k, '#ffffff', 0.4 + 0.5 * k, 6);
    for (let i = 0; i < 16; i++) {
      const a = i * 0.4 + frame * 0.35,
        d = 60 * (1 - ((frame * 0.04 + i / 16) % 1));
      f.above.col(i % 2 ? boltC.glow : C.violet, 0.9);
      f.above.dot(Math.round(body[0] + Math.cos(a) * d), Math.round(body[1] - 10 + Math.sin(a) * d * 0.8), 2, 1);
    }
  }
  // The burst: a ring over the stone and the sky, violet rays, a scorch that stays.
  const age = frame - b.burst;
  const fl = pt(f, 'floor', b.burst) ?? floor;
  if (age >= 0) {
    if (age < 3) wash(f.above, f, '#ffffff', 0.7 * (1 - age / 3));
    shock(f.backdrop, fl, 10 + age * 6, 1 - progress(age, 0, 16), C.violet);
    airRing(f.above, mid(body, head), 10 + age * 7, 0.8 * (1 - progress(age, 0, 12)), C.violet);
    for (let i = 0; i < 12 && age < 10; i++) {
      const a = (i / 12) * TAU + 0.2;
      const r0 = 10 + age * 6,
        r1 = r0 + 18;
      const c = mid(body, head);
      f.above.col(i % 2 ? '#ffffff' : C.violet, 1 - age / 10);
      f.above.line(Math.round(c[0] + Math.cos(a) * r0), Math.round(c[1] + Math.sin(a) * r0), Math.round(c[0] + Math.cos(a) * r1), Math.round(c[1] + Math.sin(a) * r1));
    }
    sparks(f.above, mid(body, head), age, 20, 20, 110, 70, -Math.PI / 2, 2);
    scorch(f.backdrop, fl, 22, 1 - progress(age, 0, 50), 70, 1 - progress(frame, 100, 120));
  }
}

// ---- Радость Бури ---------------------------------------------------------------------------------------------------
function happyF2Fx(f: FxInput, frame: number) {
  const b = beats['happy-f2'];
  const fr = Math.floor(frame);
  if (frame >= b.spin[0] && frame < b.roar + 4)
    for (let i = 0; i < 8; i++) {
      const d = pt(f, 'drum' + i);
      if (d && hash(fr, i) > 0.6) sparks(f.above, d, (frame * 3 + i) % 6, 6, 2, 40, fr + i, -Math.PI / 2, 2);
    }
  const age = frame - b.roar;
  const body = pt(f, 'body'),
    head = pt(f, 'head');
  if (body && head && age >= 0 && age < 14) {
    airRing(f.above, mid(body, head), 12 + age * 5, 0.8 * (1 - age / 14), C.violet);
    if (age < 2) wash(f.above, f, '#e8e0ff', 0.2);
  }
}

// ---- Ураган ---------------------------------------------------------------------------------------------------------
function tornado(f: FxInput, base: XY, height: number, strength: number, frame: number, flyK: number) {
  if (strength <= 0.01) return;
  const grow = 1 + 1.8 * flyK,
    a0 = strength * (1 - flyK);
  const c: XY = [base[0], base[1] + 80 * flyK * flyK];
  const N = 16;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const y = c[1] - u * height * grow;
    const rx = (6 + 58 * u ** 1.25) * (0.55 + 0.45 * strength) * grow,
      ry = rx * 0.28;
    const cx = c[0] + Math.sin(frame * 0.18 + u * 3) * 5 * u * grow;
    for (let s = 0; s < 4; s++) {
      const st = -frame * 0.55 * (1.5 - u * 0.6) + s * (TAU / 4) + u * 2.2;
      const en = st + 1.0;
      const m = (st + en) / 2;
      const front = Math.sin(m) > 0;
      const col = s % 2 ? '#a8b8d8' : u > 0.7 ? '#5a6688' : '#d8e2f4';
      oval(front ? f.above : f.under, [cx, y], rx, ry, col, (front ? 0.85 : 0.7) * a0, st, en);
      if (i % 2) oval(front ? f.above : f.under, [cx, y + 1], rx * 0.92, ry * 0.92, '#e8eefa', (front ? 0.5 : 0.35) * a0, st + 0.3, en - 0.2);
    }
    // Debris and rain caught in it.
    for (let d = 0; d < 2; d++) {
      const ang = -frame * 0.5 + i * 1.7 + d * Math.PI;
      const px = cx + Math.cos(ang) * rx * 0.9,
        py = y + Math.sin(ang) * ry * 0.9;
      const pen = Math.sin(ang) > 0 ? f.above : f.under;
      pen.col(d ? stoneC[1] : '#c4d4f4', a0);
      pen.rect(Math.round(px), Math.round(py), d ? 2 : 1, d ? 2 : 2);
    }
  }
  // Lightning flickers inside the funnel.
  if (hash(Math.floor(frame), 31) > 0.6) {
    const u0 = hash(Math.floor(frame), 32) * 0.5,
      u1 = u0 + 0.35;
    bolt(f.above, [c[0] + (hash(Math.floor(frame), 33) - 0.5) * 20, c[1] - u0 * height * grow], [c[0] + (hash(Math.floor(frame), 34) - 0.5) * 30, c[1] - u1 * height * grow], Math.floor(frame), 0.8 * a0, 1, 1);
  }
  // A skirt of spray and dust round the foot.
  for (let i = 0; i < 8; i++) {
    const ang = -frame * 0.4 + i * 0.8;
    ellFill(Math.sin(ang) > 0 ? f.above : f.under, [c[0] + Math.cos(ang) * 14 * grow, c[1] + Math.sin(ang) * 4 * grow], 3 * grow, 2 * grow, '#8a96b4', 0.4 * a0);
  }
}
function trickF2Fx(f: FxInput, frame: number) {
  const b = beats['trick-f2'];
  const P = gesture(f.anim, f.t);
  const floor = pt(f, 'floor'),
    body = pt(f, 'body');
  if (!floor || !body) return;
  // Spiral scuffs where the funnel travelled; the rain washes them out.
  for (let s = b.spin[0] + 10; s <= Math.min(frame, b.windup); s += 12) {
    const g = pt(f, 'floor', s);
    if (!g) continue;
    const a = 0.7 * (1 - progress(frame, 230, 286));
    for (let k = 0; k < 3; k++) oval(f.backdrop, g, 6 + k * 4, 2 + k * 1.2, soot, a, k + s * 0.3, k + s * 0.3 + 3.5);
  }
  const height = 120 * (0.4 + 0.6 * (P.torn ?? 0));
  tornado(f, add(floor, 0, 4), height, P.torn ?? 0, frame, 0);
  // Thrown: it leaves him and comes at the glass, swelling.
  const thr = P.tornThrow ?? 0;
  if (thr > 0 && thr < 1) {
    const base = pt(f, 'floor', b.throw) ?? floor;
    tornado(f, add(base, 0, 4), 120, 1, frame, thr);
  }
  // The wind ring after the hit.
  const age = frame - b.wind;
  if (age >= 0 && age < 16) {
    shock(f.backdrop, floor, 10 + age * 7, 0.9 * (1 - age / 16), '#c4d4f4');
    airRing(f.above, body, 14 + age * 6, 0.6 * (1 - age / 16), '#c4d4f4');
  }
  const hAge = frame - b.hitGlass;
  if (hAge >= 0 && hAge < 3) wash(f.above, f, '#c4d4f4', 0.3 * (1 - hAge / 3));
}

// ---- Шаровая молния ------------------------------------------------------------------------------------------------
function trickBF2Fx(f: FxInput, frame: number) {
  const b = beats['trick_b-f2'];
  const fr = Math.floor(frame);
  const orb = pt(f, 'orb');
  // Its own light: a hot halo that grows with it and flickers.
  if (orb && frame < b.burst) {
    const g = 6 + 10 * progress(frame, b.grow[0], b.lift[1]) + 6 * progress(frame, b.throw, b.burst);
    glow(f.above, orb, g, g * 0.9, C.goldL, 0.55 + 0.15 * Math.sin(frame * 1.7), 4);
    glow(f.under, orb, g * 2, g * 1.8, C.gold, 0.5, 4);
  }
  // Light and sparks are drawn into the ball as it grows.
  if (orb && frame < b.ring[0]) {
    for (let i = 0; i < 12; i++) {
      const k = (frame * 0.05 + i / 12) % 1,
        a = i * 2.4;
      const d = 40 * (1 - k);
      f.above.col(i % 2 ? boltC.glow : C.goldL, 0.9 * k);
      f.above.dot(Math.round(orb[0] + Math.cos(a) * d), Math.round(orb[1] + Math.sin(a) * d * 0.8));
    }
    if (fr % 3 === 0) {
      const l = pt(f, 'handL'),
        r = pt(f, 'handR');
      if (l) bolt(f.above, l, orb, fr, 0.8, 1, 0);
      if (r) bolt(f.above, r, orb, fr + 1, 0.8, 1, 0);
    }
  }
  // Round the ring: a trail, and each drum it passes zaps it.
  if (orb && frame >= b.ring[0] && frame < b.throw + 12) {
    const trail: XY[] = [];
    for (let s = 0; s < 6; s++) {
      const p = pt(f, 'orb', frame - s * 0.8);
      if (p) trail.push(p);
    }
    if (trail.length > 1) {
      poly(f.under, trail, boltC.edge, 0.5, 5);
      poly(f.under, trail, C.goldL, 0.8, 2);
    }
    if (frame < b.ring[1])
      for (let i = 0; i < 8; i++) {
        const d = pt(f, 'drum' + i);
        if (d && Math.hypot(d[0] - orb[0], d[1] - orb[1]) < 26 && hash(fr, i, 2) > 0.3) bolt(f.above, d, orb, fr * 8 + i, 0.9, 1, 1);
      }
  }
  // Held overhead: the clouds feed it.
  if (orb && frame >= b.lift[0] && frame < b.throw) {
    vortex(f, progress(frame, b.lift[0], b.throw), 1.4);
    if (fr % 6 < 2) bolt(f.above, [orb[0] + (hash(Math.floor(fr / 6), 5) - 0.5) * 90, 0], orb, Math.floor(fr / 6) * 3, 0.9, 1, 2);
  }
  // The burst over the whole painting.
  const age = frame - b.burst;
  if (age >= 0 && age < 20) {
    wash(f.above, f, '#fff8e8', age < 2 ? 0.85 : 0.6 * (1 - (age - 2) / 12));
    const at = pt(f, 'orb', b.burst - 1);
    if (at) sparks(f.above, at, age, 20, 24, 140, 182, -Math.PI / 2, 2);
  }
  if (age >= 14 && age < 60) {
    const at = pt(f, 'orb', b.burst - 1);
    if (at) motes(f.above, at, age - 14, 46, 30, 60, 183, 40);
  }
}

// ---- Удар с неба ----------------------------------------------------------------------------------------------------
function trickCF2Fx(f: FxInput, frame: number) {
  const b = beats['trick_c-f2'];
  const fr = Math.floor(frame);
  const home = pt(f, 'floor', 0) ?? f.feet;
  // Take-off: a ring, a streak of light upward.
  const lAge = frame - b.launch;
  if (lAge >= 0 && lAge < 24) {
    shock(f.backdrop, home, 8 + lAge * 4, 0.8 * (1 - lAge / 24));
    const a = pt(f, 'body', Math.max(b.launch, frame - 4)),
      z = pt(f, 'body', Math.min(frame, b.gone[0] - 1));
    if (a && z && frame < b.gone[0] + 4) bolt(f.above, a, z, fr, 0.8, 2, 1);
  }
  // Gone: the vortex brightens, shadows of clouds race over the stone and close on the spot.
  if (frame >= b.gone[0] && frame < b.impact) {
    const k = progress(frame, b.gone[0], b.bolt);
    vortex(f, 0.5 + 0.5 * k, 1 + 1.2 * k);
    // His eyes open inside the vortex and glare down.
    if (frame >= 54) {
      const a = progress(frame, 54, 62) * (0.75 + 0.25 * Math.sin(frame * 0.9));
      eyes(f.backdrop, [EYE.x, EYE.y + 9], 8, a, 1.1);
    }
    // Cloud shadows race over the stone and close on the spot.
    for (let i = 0; i < 5; i++) {
      const d = (1 - k) * (80 + i * 18);
      const ang = i * 1.3 + frame * 0.03;
      ellFill(f.backdrop, [home[0] + Math.cos(ang) * d, home[1] + Math.sin(ang) * d * 0.3], 24 - 10 * k, 7 - 2 * k, '#000000', 0.5);
    }
    // Sheet lightning, a downpour, ranging strikes on the arena.
    if (hash(Math.floor(fr / 3), 7) > 0.55) wash(f.backdrop, f, '#8ab4e8', 0.14);
    for (let i = 0; i < 40; i++) {
      const x = (hash(i, 91) * (f.w + 40) + frame * 9) % (f.w + 40) - 20,
        y = (hash(i, 92) * f.h + frame * 14 + i * 7) % f.h;
      f.above.col('#a8bede', 0.35);
      f.above.line(Math.round(x), Math.round(y), Math.round(x - 3), Math.round(y + 8));
    }
    for (const [s, dx] of [
      [52, -80],
      [66, 70],
      [78, -40],
      [88, 50],
    ]) {
      const age = frame - s;
      if (age < 0 || age > 4) continue;
      const at: XY = add(home, dx, (hash(s, 3) - 0.5) * 16);
      bolt(f.above, [at[0] + 10, 0], at, s, age < 2 ? 1 : 1 - (age - 2) / 2, 1, 2);
      sparks(f.above, at, age, 6, 8, 60, s, -Math.PI / 2, 1.5);
      if (age < 1) wash(f.above, f, '#d8f0ff', 0.2);
      scorch(f.backdrop, at, 8, 1, s, 1);
    }
    if (frame > 70) {
      const kk = progress(frame, 70, b.bolt);
      oval(f.backdrop, home, 40 * (1 - kk) + 6, (40 * (1 - kk) + 6) * 0.3, boltC.glow, 0.5 + 0.5 * kk);
      oval(f.backdrop, home, 30 * (1 - kk) + 4, (30 * (1 - kk) + 4) * 0.3, boltC.core, 0.4 * kk);
    }
  }
  // The ranging strikes leave small scorches that cool with the rest.
  if (frame >= b.impact)
    for (const [s, dx] of [
      [52, -80],
      [66, 70],
      [78, -40],
      [88, 50],
    ])
      scorch(f.backdrop, add(home, dx, (hash(s, 3) - 0.5) * 16), 8, 1 - progress(frame, b.impact, 200), s, 1 - progress(frame, 262, 287));
  // The giant bolt; white out.
  const bAge = frame - b.bolt;
  if (bAge >= 0 && bAge < 8) bolt(f.above, [home[0] - 8, 0], add(home, 0, -2), 100 + Math.floor(bAge / 2), 1 - progress(bAge, 4, 8), 5, 4);
  const iAge = frame - b.impact;
  // The crater and its radial cracks, smoke, chunks; it cools.
  if (iAge >= 0) {
    const heat = 1 - progress(iAge, 10, 160);
    const fade = 1 - progress(frame, 262, 287);
    cracks(f.backdrop, home, 12, 64, heat, 104, progress(iAge, 0, 6), fade);
    ellFill(f.backdrop, home, 30, 9, '#000000', 0.55 * fade);
    ellFill(f.backdrop, add(home, 0, -1), 24, 6.5, soot, 0.8 * fade);
    oval(f.backdrop, home, 30, 9, heat > 0.3 ? C.teal : stoneC[3], (0.5 + 0.5 * heat) * fade);
    glow(f.under, home, 30, 10, C.teal, 0.7 * heat * fade, 4);
    chunks(f.above, home, iAge, 28, 16, 90, 105, home[1] + 6);
    for (let i = 0; i < 6; i++) smoke(f.above, add(home, (hash(i, 11) - 0.5) * 50, -iAge * 0.6 - hash(i, 12) * 20), 6 + iAge * 0.3, 0.6 * (1 - progress(iAge, 6, 40)));
    steam(f.above, home, iAge - 100, 60, 6, 13, 28, 0.35);
  }
  // The white-out goes over everything, smoke included.
  if (bAge >= 2 && iAge < 14) wash(f.above, f, '#ffffff', iAge < 3 ? 1 : 1 - (iAge - 3) / 11);
  // The roar blows the rain away in a ring.
  const rAge = frame - b.roar;
  const body = pt(f, 'body');
  if (body && rAge >= 0 && rAge < 20) {
    shock(f.backdrop, home, 12 + rAge * 8, 1 - rAge / 20, C.violet);
    airRing(f.above, body, 14 + rAge * 7, 0.8 * (1 - rAge / 20), C.violet);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU,
        r = 20 + rAge * 8 + hash(i, 3) * 6;
      const x = body[0] + Math.cos(a) * r,
        y = body[1] + Math.sin(a) * r * 0.8;
      f.above.col('#a8c4e8', 0.8 * (1 - rAge / 20));
      f.above.line(Math.round(x), Math.round(y), Math.round(x + Math.cos(a) * 4), Math.round(y + Math.sin(a) * 3 + 2));
    }
  }
}

// ---- Появление ------------------------------------------------------------------------------------------------------
function showFx(f: FxInput, frame: number) {
  const b = beats.show;
  const fl = pt(f, 'floor', b.strike) ?? f.feet;
  // The vortex brightens; sheet lightning; the first leaders feel down.
  vortex(f, progress(frame, 0, b.strike) * (1 - progress(frame, b.clear[0], b.clear[1])), 1 + progress(frame, 0, b.strike));
  for (const s of [12, 20, 26, 31, 36, 40]) if (frame >= s && frame < s + 2) wash(f.backdrop, f, '#8ab4e8', 0.14);
  // His eyes open in the vortex; a glowing ring closes on the spot where he will land.
  if (frame < b.strike) {
    if (frame >= 14) eyes(f.backdrop, [EYE.x, EYE.y + 9], 8, progress(frame, 14, 22) * (0.75 + 0.25 * Math.sin(frame * 0.9)), 1.1);
    const kk = progress(frame, 20, b.strike);
    if (frame >= 20) {
      oval(f.backdrop, fl, 44 * (1 - kk) + 6, (44 * (1 - kk) + 6) * 0.3, boltC.glow, 0.4 + 0.6 * kk);
      oval(f.backdrop, fl, 32 * (1 - kk) + 4, (32 * (1 - kk) + 4) * 0.3, boltC.core, 0.5 * kk);
    }
    for (let i = 0; i < 30; i++) {
      const x = (hash(i, 91) * (f.w + 40) + frame * 9) % (f.w + 40) - 20,
        y = (hash(i, 92) * f.h + frame * 14 + i * 7) % f.h;
      f.above.col('#a8bede', 0.3 * progress(frame, 0, 20));
      f.above.line(Math.round(x), Math.round(y), Math.round(x - 3), Math.round(y + 8));
    }
  }
  if (frame >= 36 && frame < b.strike) {
    const k = progress(frame, 36, b.strike);
    bolt(f.above, [fl[0] - 6, 0], [fl[0] - 6 + (hash(Math.floor(frame), 1) - 0.5) * 20, 10 + 100 * k], Math.floor(frame), 0.6, 1, 2);
  }
  // The bolt column and the white-out.
  const age = frame - b.strike;
  if (age >= 0 && age < 8) bolt(f.above, [fl[0] - 6, 0], add(fl, 0, -4), 44 + Math.floor(age / 2), 1 - progress(age, 4, 8), 5, 4);
  if (age < 0) return;
  // The scorch and its cracks under him, cooling.
  const heat = 1 - progress(age, 10, 110);
  cracks(f.backdrop, fl, 9, 46, heat, 44, progress(age, 0, 5));
  scorch(f.backdrop, fl, 18, heat, 45, 1 - progress(frame, 150, 168));
  // Smoke wraps him and clears; in it, his eyes, then veins, then horns light up over the smoke.
  const thick = 1 - progress(frame, b.clear[0], b.clear[1]);
  const body = pt(f, 'body') ?? fl;
  // A thick column of smoke wraps him from the stone up, rolling and rising; it thins from the edges.
  for (let i = 0; i < 18; i++) {
    const edge = Math.abs(hash(i, 21) - 0.5) * 2;
    const a = thick * (1 - edge * (1 - thick)) * 0.9;
    const x = fl[0] + (hash(i, 21) - 0.5) * 84 + Math.sin(frame * 0.06 + i) * 5,
      y = fl[1] - 4 - hash(i, 22) * 74 - ((age * 0.25 + i * 3) % 18);
    smoke(f.above, [x, y], 15 + hash(i, 23) * 10 + age * 0.06, a);
  }
  const lit = (from: number) => progress(frame, from, from + 6) * (0.6 + 0.4 * Math.sin(frame * 0.3));
  const eL = pt(f, 'eyeL'),
    eR = pt(f, 'eyeR');
  if (eL && eR && frame >= b.eyes) {
    const a = lit(b.eyes) * Math.max(thick, 0.0);
    for (const e of [eL, eR]) {
      glow(f.above, e, 6, 4, C.gold, a, 3);
      f.above.col(C.goldL, a);
      f.above.rect(Math.round(e[0]) - 1, Math.round(e[1]), 3, 1);
    }
  }
  if (frame >= b.veins && thick > 0) {
    const a = lit(b.veins) * thick;
    for (const [p, q] of [
      ['elbowR', 'handR'],
      ['elbowL', 'handL'],
      ['kneeR', 'heelR'],
      ['kneeL', 'heelL'],
      ['chest', 'sigil'],
    ]) {
      const A = pt(f, p),
        Z = pt(f, q);
      if (A && Z) poly(f.above, jagged(A, Z, p.length * 7, 4, 1.5), C.teal, a, 1);
    }
    const sg = pt(f, 'sigil');
    if (sg) glow(f.above, sg, 6, 6, C.teal, a, 3);
  }
  if (frame >= b.horns && thick > 0) {
    const a = lit(b.horns) * thick;
    const crown = pt(f, 'crown');
    for (const h of ['hornL', 'hornR']) {
      const tip = pt(f, h);
      if (tip && crown) {
        poly(f.above, [crown, tip], '#6ac4d0', a, 2);
        poly(f.above, [crown, tip], '#eeffff', a, 1);
        glow(f.above, tip, 5, 5, '#b4eef2', a, 3);
      }
    }
  }
  if (age < 8) wash(f.above, f, '#ffffff', age < 2 ? 1 : 1 - (age - 2) / 6);
  // The roar: a shockwave over the stone and the air.
  const rAge = frame - b.roar;
  if (rAge >= 0 && rAge < 18) {
    shock(f.backdrop, fl, 12 + rAge * 7, 1 - rAge / 18);
    airRing(f.above, body, 14 + rAge * 6, 0.7 * (1 - rAge / 18));
  }
}

export function stormEffects(f: FxInput) {
  const frame = frameOf(f);
  const P = gesture(f.anim, f.t);
  const hidden = (P.hidden ?? 0) > 0.5;
  if (!hidden && f.anim !== 'peek') aura(f, frame, P.form ?? 0);
  switch (f.anim) {
    case 'walk':
      return walkFx(f, frame);
    case 'look':
      return lookFx(f, frame);
    case 'fidget_a':
      return fidgetAFx(f, frame);
    case 'fidget_b':
      return fidgetBFx(f, frame);
    case 'happy':
      return happyFx(f, frame, beats.happy);
    case 'sleep':
      return sleepFx(f, frame);
    case 'sleep_out':
      return sleepOutFx(f, frame);
    case 'wake_startled':
      return wakeFx(f, frame);
    case 'hatch':
      return hatchFx(f, frame);
    case 'peek':
      return peekFx(f, frame);
    case 'trick':
      return trickFx(f, frame);
    case 'trick_b':
      return trickBFx(f, frame);
    case 'trick_c':
      return trickCFx(f, frame);
    case 'phase':
      return phaseFx(f, frame);
    case 'happy-f2':
      return happyF2Fx(f, frame);
    case 'trick-f2':
      return trickF2Fx(f, frame);
    case 'trick_b-f2':
      return trickBF2Fx(f, frame);
    case 'trick_c-f2':
      return trickCF2Fx(f, frame);
    case 'show':
      return showFx(f, frame);
  }
}
