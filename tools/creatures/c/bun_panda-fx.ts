// Effects and kitchen props of Пончик и Шустрик, in the manner of the 1940s theatrical cartoons: circling stars and
// little buns over a bonked head, a bump, speed lines, sweat drops, flour, water, honey. No fire, no explosions.
// Props are painted like the background (duller than the heroes, a thin dark-brown outline) and stand where the
// kitchen layout (KITCHEN in the poses) puts them; each one is drawn under the heroes, or over them when a hero is
// behind it. Every prop comes from somewhere and goes somewhere (skill: logic of objects).
import { hash } from '../kit/f11-mobkit';
import { disc, fillPoly, fillSeg, star, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { beats, gesture, KITCHEN, PX } from './bun_panda-poses';

const TAU = Math.PI * 2;
const INK = '#1e1620';
const LINE = '#2a1a10';
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const prog = (f: number, a: number, b: number) => clamp01((f - a) / (b - a));
const smooth = (x: number) => x * x * (3 - 2 * x);
const H = KITCHEN.home;
/** World point (rig units) → painting px. */
export const W = (x: number, y: number, z = 0): XY => [H[0] + PX.s * x, H[1] + PX.y * y - PX.z * z];
/** Painting px → world Y on the floor. */
const floorY = (py: number) => (py - H[1]) / PX.y;

// ---- painting helpers ----------------------------------------------------------------------------------------------
function ell(p: Pen, cx: number, cy: number, rx: number, ry: number, c: string, a = 1) {
  if (rx < 0.3 || ry < 0.3 || a <= 0) return;
  p.col(c, a);
  for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
    const xr = rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
    const x0 = Math.ceil(cx - xr),
      x1 = Math.floor(cx + xr);
    if (x1 >= x0) p.span(x0, y, x1 - x0 + 1);
  }
}
/** A shaded ellipse with an outline: shadow band below, base, a light patch upper left. */
function blob(p: Pen, cx: number, cy: number, rx: number, ry: number, t: [string, string, string], line = LINE, a = 1) {
  ell(p, cx, cy, rx + 1, ry + 1, line, a);
  ell(p, cx, cy, rx, ry, t[0], a);
  ell(p, cx - rx * 0.06, cy - ry * 0.12, rx * 0.9, ry * 0.8, t[1], a);
  ell(p, cx - rx * 0.32, cy - ry * 0.38, rx * 0.32, ry * 0.24, t[2], a);
}
function poly(p: Pen, pts: number[], c: string, a = 1) {
  p.col(c, a);
  fillPoly(p, pts);
}
function seg(p: Pen, x0: number, y0: number, x1: number, y1: number, w: number, c: string, a = 1) {
  p.col(c, a);
  fillSeg(p, x0, y0, x1, y1, w);
}
function dot(p: Pen, x: number, y: number, r: number, c: string, a = 1, line = INK) {
  p.col(line, a);
  disc(p, x, y, r + 1);
  p.col(c, a);
  disc(p, x, y, r);
}
function starInk(p: Pen, x: number, y: number, r: number, rot: number, c: string, a = 1) {
  p.col(INK, a);
  star(p, x, y, r + 1.5, 5, rot);
  p.col(c, a);
  star(p, x, y, r, 5, rot);
  p.col('#fff8d0', a);
  star(p, x - r * 0.15, y - r * 0.2, r * 0.35, 5, rot);
}
/** A cartoon impact: a white jagged burst with an ink rim and short strike lines. */
export function boom(p: Pen, x: number, y: number, r: number, age: number, seed = 0) {
  if (age < 0 || age > 6) return;
  const k = age < 2 ? 0.6 + age * 0.3 : 1.2 - (age - 2) * 0.12;
  const a = age < 4 ? 1 : 1 - (age - 4) / 2;
  p.col(INK, a);
  star(p, x, y, r * k + 2, 9, seed);
  p.col('#fffbe8', a);
  star(p, x, y, r * k, 9, seed);
  p.col('#ffe27a', a);
  star(p, x, y, r * k * 0.5, 9, seed + 0.3);
  for (let i = 0; i < 6; i++) {
    const ang = seed + (i / 6) * TAU + 0.26;
    const r0 = r * k * 1.25,
      r1 = r0 + 5 + age;
    seg(p, x + Math.cos(ang) * r0, y + Math.sin(ang) * r0 * 0.8, x + Math.cos(ang) * r1, y + Math.sin(ang) * r1 * 0.8, 0.8, INK, a);
  }
}
/** Speed lines trailing behind a mover (dir = direction of travel). */
function speedLines(p: Pen, x: number, y: number, dx: number, dy: number, len: number, n: number, spread: number, seed: number, a = 0.8) {
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L,
    uy = dy / L;
  for (let i = 0; i < n; i++) {
    const off = (i / Math.max(1, n - 1) - 0.5) * spread;
    const j = hash(i, seed) * 0.6 + 0.4;
    const sx = x - ux * 6 - uy * off,
      sy = y - uy * 6 + ux * off;
    seg(p, sx, sy, sx - ux * len * j, sy - uy * len * j, 0.5, '#fffbe8', a);
  }
}
/** Sweat drops flying off a head. */
function sweat(p: Pen, x: number, y: number, age: number, seed: number) {
  if (age < 0 || age > 10) return;
  for (let i = 0; i < 3; i++) {
    const side = i % 2 ? 1 : -1;
    const vx = side * (6 + hash(i, seed) * 6),
      vy = -10 - hash(i, seed + 1) * 6;
    const tt = age / 10;
    const px = x + side * 10 + vx * tt * 2,
      py = y - 8 + vy * tt * 2 + 40 * tt * tt;
    dot(p, px, py, 2, '#bfe6ff', 1 - tt * 0.6);
    p.col('#ffffff', 1 - tt);
    p.dot(px - 1, py - 1);
  }
}
/** A puff of dust (a cartoon cloud with an outline), growing and fading. */
function puff(p: Pen, x: number, y: number, r: number, age: number, life: number, seed: number, c = '#d8c8b0') {
  if (age < 0 || age > life) return;
  const tt = age / life;
  const a = 1 - tt;
  const R = r * (0.5 + tt * 0.8);
  for (let i = 0; i < 5; i++) {
    const ang = seed + (i / 5) * TAU;
    const cx = x + Math.cos(ang) * R * 0.7,
      cy = y + Math.sin(ang) * R * 0.35 - tt * 6;
    ell(p, cx, cy, R * 0.55 + 1, R * 0.45 + 1, LINE, a * 0.8);
  }
  for (let i = 0; i < 5; i++) {
    const ang = seed + (i / 5) * TAU;
    const cx = x + Math.cos(ang) * R * 0.7,
      cy = y + Math.sin(ang) * R * 0.35 - tt * 6;
    ell(p, cx, cy, R * 0.55, R * 0.45, c, a);
  }
}

// ---- the stars-and-buns ring --------------------------------------------------------------------------------------
function bunMini(p: Pen, x: number, y: number, r: number) {
  dot(p, x, y, r, '#f6ecdc');
  p.col('#c8b49a');
  p.dot(x - 1, y - r + 1, 2, 1);
  p.dot(x, y - r, 1, 1);
}
/** Stars and buns circling a bonked head: the back half under the body, the front half over it. */
export function dizzyRing(f: FxInput, at: XY, w: number, phase: number, k: number) {
  const n = 5;
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU;
    const x = at[0] + Math.cos(a) * w,
      y = at[1] + Math.sin(a) * w * 0.32;
    const front = Math.sin(a) > 0;
    const pen = front ? f.above : f.under;
    const s = (front ? 1 : 0.75) * k;
    if (i % 2 === 0) starInk(pen, x, y, 5 * s, a * 2, '#ffd23a');
    else bunMini(pen, x, y, 3.6 * s);
  }
}

// ---- kitchen props -------------------------------------------------------------------------------------------------
export interface Props {
  /** Rug slide (rig units along x) and its crumple. */
  rugX: number;
  /** Lanterns swing amplitude (radians) and phase time. */
  swing: number;
  /** Steamers on the table: lid off (0..1), buns showing, the stack's hop (px). */
  lidOff: number;
  hop: number;
  buns: number;
  /** The bamboo stalk's tip in painting px when bent (null = at rest, `spring` = its decaying wobble). */
  stalkTip: XY | null;
  spring: number;
  stalkFront?: boolean;
  shoot: boolean;
  /** Honey jar on the bench. */
  jarOnBench: boolean;
  /** Barrel water splash (0..1) and a puddle under it. */
  splash: number;
  puddle: number;
  /** Floor wave from a fall: centre px, age in frames. */
  wave: [number, number, number] | null;
}
const REST_PROPS: Props = { rugX: 0, swing: 0, lidOff: 0, hop: 0, buns: 3, stalkTip: null, spring: 0, shoot: true, jarOnBench: true, splash: 0, puddle: 0, wave: null };

function shadow(p: Pen, at: XY | undefined, rx: number, ry: number, up: number) {
  if (!at) return;
  const k = 1 / (1 + 0.012 * Math.max(0, up));
  ell(p, at[0], at[1], rx * k, ry * k, '#1a0e08', 0.32 * k + 0.08);
}
function table(p: Pen, pr: Props) {
  const T = KITCHEN.table;
  const [cx, cy] = W(T.x, T.y, T.top);
  const rx = T.r * PX.s,
    ry = T.r * PX.y;
  const wood: [string, string, string] = ['#4a2c18', '#6e4428', '#93603a'];
  // legs: the three we can see
  for (const ang of [0.5, Math.PI / 2, Math.PI - 0.5]) {
    const lx = cx + Math.cos(ang) * rx * 0.72,
      ly = cy + Math.sin(ang) * ry * 0.72;
    const [, fy] = W(T.x, T.y + Math.sin(ang) * T.r * 0.72, 0);
    seg(p, lx, ly, lx, fy, 3, LINE);
    seg(p, lx, ly, lx, fy - 1, 2, wood[1]);
  }
  // the top: a thick round board
  ell(p, cx, cy + 4, rx + 1, ry + 1, LINE);
  ell(p, cx, cy + 4, rx, ry, wood[0]);
  ell(p, cx, cy, rx + 1, ry + 1, LINE);
  ell(p, cx, cy, rx, ry, wood[1]);
  ell(p, cx - rx * 0.15, cy - ry * 0.2, rx * 0.7, ry * 0.55, wood[2], 0.55);
  // steamers: two bamboo baskets stacked with a lid
  steamers(p, cx + STEAM_DX, cy + 2 - pr.hop, pr);
}
/** The steamers stand at the table's right edge (where Пончик can reach them). */
const STEAM_DX = 27;
function steamers(p: Pen, x: number, y: number, pr: Props) {
  const bam: [string, string, string] = ['#8a6a2c', '#c49a48', '#ecd088'];
  const rx = 15,
    ry = 7;
  for (let k = 0; k < 2; k++) {
    const by = y - k * 8;
    ell(p, x, by, rx + 1, ry + 1, LINE);
    poly(p, [x - rx - 1, by, x + rx + 1, by, x + rx + 1, by - 8, x - rx - 1, by - 8], LINE);
    ell(p, x, by, rx, ry, bam[0]);
    poly(p, [x - rx, by, x + rx, by, x + rx, by - 7, x - rx, by - 7], bam[1]);
    for (let i = -2; i <= 2; i++) seg(p, x + i * 6, by - 7, x + i * 6, by, 0.3, bam[0]);
    seg(p, x - rx, by - 4, x + rx, by - 4, 0.4, bam[2]);
  }
  const top = y - 16;
  ell(p, x, top, rx + 1, ry + 1, LINE);
  ell(p, x, top, rx, ry, '#f2e6cc');
  // the buns inside, then the lid (it lifts and slides off to the side)
  for (let i = 0; i < pr.buns; i++) bunMini(p, x - 6 + i * 6, top - 1 + (i % 2), 3.4);
  const lo = pr.lidOff;
  if (lo < 0.99) {
    const lx = x + lo * 22,
      ly = top - 2 - Math.sin(lo * Math.PI) * 8;
    ell(p, lx, ly, rx + 2, ry + 2, LINE);
    ell(p, lx, ly, rx + 1, ry + 1, bam[1]);
    ell(p, lx - 3, ly - 2, rx * 0.6, ry * 0.5, bam[2]);
    seg(p, lx - 2, ly - 3, lx + 2, ly - 3, 1.2, LINE);
  }
  // steam curls
  if (lo > 0.4) for (let i = 0; i < 3; i++) ell(p, x - 6 + i * 6, top - 10 - i * 3, 2.4, 1.8, '#fbf6ee', 0.5);
}
function rug(p: Pen, pr: Props) {
  const R = KITCHEN.rug;
  const [cx, cy] = W(R.x + pr.rugX, R.y);
  const rx = R.rx * PX.s,
    ry = R.ry * PX.y;
  ell(p, cx, cy, rx + 1, ry + 1, LINE);
  ell(p, cx, cy, rx, ry, '#8e2a22');
  ell(p, cx, cy, rx - 4, ry - 2.5, '#c08a2c');
  ell(p, cx, cy, rx - 6, ry - 4, '#a83a2c');
  ell(p, cx, cy, rx * 0.45, ry * 0.45, '#c08a2c');
  ell(p, cx, cy, rx * 0.45 - 2, ry * 0.45 - 1.5, '#7a2420');
  // fringe at the two ends
  for (const s of [-1, 1]) for (let i = -3; i <= 3; i++) seg(p, cx + s * rx, cy + i * 2.2, cx + s * (rx + 4), cy + i * 2.2, 0.3, '#e8c870');
}
function barrel(p: Pen, pr: Props, f: number) {
  const B = KITCHEN.barrel;
  const [cx, cy] = W(B.x, B.y);
  const rx = B.r * PX.s,
    ry = B.r * PX.y,
    h = B.h * PX.z;
  const wood: [string, string, string] = ['#3e2414', '#62391f', '#8a5630'];
  if (pr.puddle > 0.02) ell(p, cx + 14, cy + 8, 30 * pr.puddle, 8 * pr.puddle, '#6aa8c8', 0.7);
  ell(p, cx, cy, rx + 1, ry + 1, LINE);
  poly(p, [cx - rx - 1, cy, cx + rx + 1, cy, cx + rx + 3, cy - h * 0.5, cx + rx + 1, cy - h, cx - rx - 1, cy - h, cx - rx - 3, cy - h * 0.5], LINE);
  ell(p, cx, cy, rx, ry, wood[0]);
  poly(p, [cx - rx, cy, cx + rx, cy, cx + rx + 2, cy - h * 0.5, cx + rx, cy - h, cx - rx, cy - h, cx - rx - 2, cy - h * 0.5], wood[1]);
  poly(p, [cx - rx * 0.5, cy, cx - rx * 0.1, cy, cx - rx * 0.1, cy - h, cx - rx * 0.5, cy - h], wood[2]);
  for (let i = -3; i <= 3; i++) seg(p, cx + i * rx * 0.28, cy - h + 2, cx + i * rx * 0.3, cy + ry * 0.6, 0.3, wood[0]);
  for (const k of [0.2, 0.78]) seg(p, cx - rx - 2, cy - h * k, cx + rx + 2, cy - h * k, 1.2, '#2a2a34');
  // the rim and the water (it heaves after a splash)
  ell(p, cx, cy - h, rx + 1, ry + 1, LINE);
  ell(p, cx, cy - h, rx, ry, wood[1]);
  ell(p, cx, cy - h + 1, rx - 3, ry - 2, '#3e7aa0');
  ell(p, cx - 4, cy - h, rx * 0.4, ry * 0.3, '#8ac8e8', 0.8 + 0.2 * Math.sin(f * 0.4));
}
function sack(p: Pen) {
  const [cx, cy] = W(KITCHEN.sack.x, KITCHEN.sack.y);
  ell(p, cx + 4, cy + 3, 26, 7, '#1a0e08', 0.25);
  // a lumpy linen sack tied at the top, flour dusting the floor
  ell(p, cx + 18, cy + 4, 10, 3, '#efe8dc', 0.7);
  blob(p, cx, cy - 16, 19, 19, ['#a8977a', '#d2c4a6', '#f0e6cc']);
  blob(p, cx - 1, cy - 34, 9, 6, ['#a8977a', '#d2c4a6', '#f0e6cc']);
  seg(p, cx - 7, cy - 30, cx + 6, cy - 30, 1.4, '#7a3020');
  ell(p, cx, cy - 15, 9, 7, '#5a7ab0', 0.8);
  ell(p, cx, cy - 15, 5, 4, '#d2c4a6');
}
function tub(p: Pen, pr: Props, f: number, front: Pen | null = null) {
  const Tb = KITCHEN.tub;
  const [cx, cy] = W(Tb.x, Tb.y);
  const base: XY = [cx, cy - 16];
  // the stalk: rest tip straight up; bent to a held tip; springing back with a decaying wobble
  const restTip: XY = [cx + 4, cy - Tb.stalk * PX.z];
  let tip: XY = pr.stalkTip ?? [restTip[0] + pr.spring * 26 * Math.sin(f * 1.1), restTip[1] + Math.abs(pr.spring) * 6];
  const ctrl: XY = [base[0] + (tip[0] - base[0]) * 0.1, base[1] + (tip[1] - base[1]) * 0.6];
  const pts: XY[] = [];
  for (let i = 0; i <= 14; i++) {
    const u = i / 14;
    pts.push([(1 - u) ** 2 * base[0] + 2 * u * (1 - u) * ctrl[0] + u * u * tip[0], (1 - u) ** 2 * base[1] + 2 * u * (1 - u) * ctrl[1] + u * u * tip[1]]);
  }
  const pen = (i: number) => (front && i > 8 ? front : p);
  for (let i = 1; i < pts.length; i++) seg(pen(i), pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 3.6 - i * 0.12, LINE);
  for (let i = 1; i < pts.length; i++) seg(pen(i), pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 2.6 - i * 0.12, '#5a9a3a');
  for (let i = 3; i < pts.length; i += 3) {
    seg(p, pts[i][0] - 3, pts[i][1], pts[i][0] + 3, pts[i][1], 0.8, '#2c5a22');
    const s = i % 2 ? 1 : -1;
    poly(pen(i), [pts[i][0], pts[i][1], pts[i][0] + s * 12, pts[i][1] - 5, pts[i][0] + s * 4, pts[i][1] - 2], '#2c5a22');
    poly(pen(i), [pts[i][0], pts[i][1] - 1, pts[i][0] + s * 11, pts[i][1] - 5, pts[i][0] + s * 4, pts[i][1] - 3], '#5aa83a');
  }
  if (pr.shoot) {
    // the juicy shoot at the top
    const [tx, ty] = tip;
    blob(front ?? p, tx, ty - 3, 3, 6, ['#6aa83a', '#a8e060', '#e8ffb0'], LINE);
  }
  tip = tip;
  // the tub
  const rx = 15,
    ry = 7;
  ell(p, cx, cy, rx + 1, ry + 1, LINE);
  poly(p, [cx - rx - 1, cy, cx + rx + 1, cy, cx + rx + 3, cy - 16, cx - rx - 3, cy - 16], LINE);
  ell(p, cx, cy, rx, ry, '#4a2c18');
  poly(p, [cx - rx, cy, cx + rx, cy, cx + rx + 2, cy - 15, cx - rx - 2, cy - 15], '#7a4c2a');
  seg(p, cx - rx - 2, cy - 11, cx + rx + 2, cy - 11, 1, '#2a2a34');
  ell(p, cx, cy - 16, rx + 3, ry + 1, LINE);
  ell(p, cx, cy - 16, rx + 2, ry, '#5a3a20');
  ell(p, cx, cy - 16, rx - 1, ry - 2, '#3a2a18');
}
/** The honey pot (k = size): glazed body, cream label with a honey drop, honey at the open mouth. */
function honeyJar(p: Pen, x: number, y: number, a = 1, k = 1.7) {
  blob(p, x, y - 7 * k, 7 * k, 8 * k, ['#6a3418', '#a85a2c', '#dc8a4a'], LINE, a);
  ell(p, x + 1, y - 6.5 * k, 4.6 * k, 2.6 * k, '#e8dcc0', a);
  ell(p, x + 1, y - 6.5 * k, 1.4 * k, 1.6 * k, '#f0a820', a);
  ell(p, x, y - 15 * k, 5 * k, 2 * k, '#f0a820', a);
  seg(p, x + 3 * k, y - 14 * k, x + 3 * k, y - 8 * k, 0.8 * k, '#f0a820', a);
  ell(p, x, y - 16 * k, 6 * k, 2.4 * k, LINE, a);
  ell(p, x, y - 16.5 * k, 5 * k, 1.8 * k, '#e8d8b0', a);
}
function lanterns(p: Pen, pr: Props, f: number) {
  const x0 = 150,
    x1 = 330;
  const n = 4;
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    const x = x0 + (x1 - x0) * u,
      y = 12 + Math.sin(u * Math.PI) * 10;
    p.col(LINE);
    p.dot(x, y);
  }
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const ax = x0 + (x1 - x0) * u,
      ay = 12 + Math.sin(u * Math.PI) * 10;
    const sw = pr.swing * Math.sin(f * 0.5 + i * 0.9) + 0.03 * Math.sin(f * 0.13 + i);
    const L = 9;
    const lx = ax + Math.sin(sw) * L,
      ly = ay + Math.cos(sw) * L;
    seg(p, ax, ay, lx, ly - 6, 0.4, LINE);
    blob(p, lx, ly, 6, 7, ['#8e1e1a', '#d0382a', '#ff7a5a'], LINE);
    seg(p, lx - 4, ly - 7, lx + 4, ly - 7, 1, '#e8b040');
    seg(p, lx - 4, ly + 7, lx + 4, ly + 7, 1, '#e8b040');
    seg(p, lx, ly + 8, lx + Math.sin(sw) * 2, ly + 13, 0.5, '#e8b040');
  }
}

// ---- who is where ---------------------------------------------------------------------------------------------------
interface Who {
  panda: XY | null;
  monkey: XY | null;
}
/** Which pen a prop at floor depth `py` (painting px) belongs to: over the heroes when one of them stands behind it
 * within `half` px across. */
function penFor(f: FxInput, who: Who, px: number, py: number, half: number) {
  for (const at of [who.panda, who.monkey])
    if (at && Math.abs(at[0] - px) < half && at[1] < py - 2) return f.above;
  return f.under;
}

/** Decaying swing after an impact at frame `at`. */
const ring = (fr: number, at: number, amp: number, life = 40) => (fr >= at ? amp * Math.max(0, 1 - (fr - at) / life) : 0);
function propsFor(anim: string, fr: number, P: Record<string, number>, f: FxInput): Props {
  const pr = { ...REST_PROPS };
  pr.rugX = P.rugX ?? 0;
  if (anim === 'trick') {
    const b = beats.trick;
    pr.lidOff = fr < b.lid[0] ? 0 : fr < b.lid[1] ? smooth(prog(fr, b.lid[0], b.lid[1])) : fr < b.lid[2] ? 1 : 1 - smooth(prog(fr, b.lid[2], b.lid[2] + 3));
    pr.buns = fr < b.snatch ? 3 : 2;
    pr.hop = fr >= b.land && fr < b.land + 8 ? Math.sin(prog(fr, b.land, b.land + 8) * Math.PI) * 6 : 0;
    pr.swing = ring(fr, b.land, 0.6);
    pr.wave = fr >= b.land && fr < b.land + 14 ? [...W(1.5, 3), fr - b.land] : null;
  }
  if (anim === 'trick_b') {
    const b = beats.trick_b;
    const held = b.hold.find(([a, c]) => fr >= a && fr < c);
    const hl = f.points.handL,
      hr = f.points.handR;
    // paws far apart (up at the sides of his head) — the right paw has the stalk; together — between them
    if (held && hl && hr) pr.stalkTip = Math.hypot(hl[0] - hr[0], hl[1] - hr[1]) > 40 ? [hr[0], hr[1] - 3] : [(hl[0] + hr[0]) / 2, (hl[1] + hr[1]) / 2 - 3];
    else {
      const rel = [b.hold[0][1], b.hold[1][1]].filter((r) => fr >= r).pop();
      if (rel !== undefined) pr.spring = Math.max(0, 1 - (fr - rel) / 30) * (rel === b.hold[1][1] ? 1.2 : 0.9);
    }
    pr.stalkFront = !!held && fr >= 70;
    pr.shoot = fr < b.shoot;
    pr.puddle = fr < b.splash ? 0 : fr < 250 ? Math.min(1, (fr - b.splash) / 4) : 1 - 0.6 * prog(fr, 250, 276);
    pr.swing = ring(fr, b.splash, 0.4);
  }
  if (anim === 'trick_c') {
    const b = beats.trick_c;
    // the pot leaves the bench, rides his head, flies back after the pop
    pr.jarOnBench = fr < b.lift[0] || fr >= b.jarFly[1];
    // the table jolts when his hip hits it; the steamer lid is off while it bounces on his jar
    pr.hop = fr >= b.table && fr < b.table + 6 ? Math.sin(prog(fr, b.table, b.table + 6) * Math.PI) * 5 : 0;
    pr.lidOff = fr >= b.table + 1 && fr < b.lidHome ? 1 : 0;
    pr.swing = Math.max(ring(fr, b.door, 0.3), ring(fr, b.table, 0.4));
  }
  return pr;
}

function drawKitchen(f: FxInput, pr: Props, who: Who, fr: number) {
  const T = KITCHEN.table;
  const tb = W(T.x, T.y);
  const tablePen = penFor(f, who, tb[0], tb[1] + T.r * PX.y * 0.6, T.r * PX.s + 10);
  rug(f.under, pr);
  table(tablePen, pr);
  const tbb = W(KITCHEN.tub.x, KITCHEN.tub.y);
  tub(penFor(f, who, tbb[0], tbb[1], 22), pr, fr, pr.stalkFront ? f.above : null);
  if (pr.jarOnBench) honeyJar(f.under, ...W(KITCHEN.jar.x, KITCHEN.jar.y, KITCHEN.jar.z));
  const bb = W(KITCHEN.barrel.x, KITCHEN.barrel.y);
  barrel(penFor(f, who, bb[0], bb[1], 30), pr, fr);
  const sb = W(KITCHEN.sack.x, KITCHEN.sack.y);
  const sackPen = penFor(f, who, sb[0], sb[1], 26);
  sack(sackPen);
  lanterns(f.under, pr, fr);
}

// ---- everyday effects ---------------------------------------------------------------------------------------------
function everydayFx(f: FxInput, fr: number, P: Record<string, number>) {
  const pt = f.points;
  const head = pt.head,
    nose = pt.nose;
  switch (f.anim) {
    case 'look': {
      // scent curls from the steamers drift to his nose
      const [a, b] = beats.look.sniff;
      if (fr >= a && fr <= b + 6 && nose) {
        const T = KITCHEN.table;
        const src = W(T.x + 1.6, T.y, T.top + 6);
        const al = Math.min(prog(fr, a, a + 4), 1 - prog(fr, b, b + 6));
        for (let k = 0; k < 3; k++) {
          for (let i = 0; i < 14; i++) {
            const u = ((i / 14 + fr * 0.03 + k * 0.33) % 1);
            const x = src[0] + (nose[0] - src[0]) * u + Math.sin(u * 9 + k) * 5;
            const y = src[1] + (nose[1] - src[1]) * u - Math.sin(u * Math.PI) * 14;
            f.above.col('#fff4dc', al * (0.3 + 0.6 * Math.sin(u * Math.PI)));
            f.above.dot(x, y, 2, 1);
          }
        }
      }
      break;
    }
    case 'fidget_a':
      if (head) sweat(f.above, head[0], head[1] - 20, fr - beats.fidget_a.sweat, 3);
      break;
    case 'fidget_b': {
      const sn = beats.fidget_b.sneeze;
      if (nose && fr >= sn && fr < sn + 12) {
        const age = fr - sn;
        // the sneeze: a white cloud with droplets bursting forward from the nose, lines toward Шустрик
        puff(f.above, nose[0] + 10 + age * 2, nose[1] - 4 - age, 12, age, 12, 1.3, '#f8f4ee');
        for (let i = 0; i < 6; i++) dot(f.above, nose[0] + 6 + age * (3 + hash(i, 4) * 3), nose[1] - 8 + (hash(i, 5) - 0.5) * 18 + age * 0.8, 1, '#cfefff', 1 - age / 12);
      }
      const m = pt.mBody;
      if (m && fr > sn && fr < sn + 9) speedLines(f.above, m[0], m[1], -1, -1.2, 14, 4, 12, 9);
      break;
    }
    case 'happy':
      if (pt.footLGround && pt.footRGround) {
        const c: XY = [(pt.footL[0] + pt.footR[0]) / 2, (pt.footL[1] + pt.footR[1]) / 2];
        if (fr >= beats.happy.click && fr < beats.happy.click + 6) boom(f.above, c[0], c[1], 6, fr - beats.happy.click, 0.4);
        const g = pt.bodyGround;
        if (g) {
          puff(f.under, g[0] - 22, g[1] + 2, 8, fr - beats.happy.land, 10, 0.4);
          puff(f.under, g[0] + 22, g[1] + 2, 8, fr - beats.happy.land, 10, 2.1);
        }
      }
      break;
    case 'sleep':
    case 'sleep_in':
    case 'sleep_out': {
      // a bubble from the nose that swells with each breath; it pops at the start of sleep_out
      const n = pt.nose;
      let r = 0;
      if (f.anim === 'sleep') r = 4 + 3.5 * (0.5 + 0.5 * Math.sin((f.t / 3) * TAU));
      else if (f.anim === 'sleep_in') r = 4 * prog(fr, 24, 36);
      else r = fr < beats.sleep_out.pop ? 4 + fr * 0.8 : 0;
      if (n && r > 0.5) {
        const bx = n[0] + 2 + r * 0.6,
          by = n[1] - 2 - r * 0.7;
        f.above.col('#cfe8ff', 0.35);
        disc(f.above, bx, by, r);
        p_ring(f.above, bx, by, r, '#ffffff', 0.9);
        f.above.col('#ffffff', 0.9);
        f.above.dot(bx - r * 0.4, by - r * 0.5, 2, 1);
      }
      if (n && f.anim === 'sleep_out') {
        const age = fr - beats.sleep_out.pop;
        if (age >= 0 && age < 6) for (let i = 0; i < 8; i++) {
          const ang = (i / 8) * TAU;
          dot(f.above, n[0] + 6 + Math.cos(ang) * (6 + age * 2), n[1] - 8 + Math.sin(ang) * (6 + age * 2), 0.6, '#ffffff', 1 - age / 6, '#cfe8ff');
        }
      }
      break;
    }
    case 'wake_startled':
      if (head) {
        const age = fr - beats.wake_startled.jolt;
        if (age >= 0 && age < 10) for (let i = 0; i < 8; i++) {
          const ang = -Math.PI / 2 + ((i - 3.5) / 8) * 2.4;
          const r0 = 34 + age * 2;
          seg(f.above, head[0] + Math.cos(ang) * r0, head[1] - 10 + Math.sin(ang) * r0, head[0] + Math.cos(ang) * (r0 + 7), head[1] - 10 + Math.sin(ang) * (r0 + 7), 0.7, INK, 1 - age / 10);
        }
        sweat(f.above, head[0], head[1] - 24, age - 2, 7);
      }
      break;
    case 'hatch': {
      const hb = beats.hatch;
      const g = W(P.X ?? 0, P.Y ?? 0);
      if (fr >= hb.burst && fr < hb.burst + 10) {
        // shell bits burst out of the top
        for (let i = 0; i < 10; i++) {
          const ang = -Math.PI / 2 + (hash(i, 2) - 0.5) * 2.6;
          const age = fr - hb.burst;
          const v = 5 + hash(i, 3) * 4;
          const x = g[0] + Math.cos(ang) * v * age,
            y = g[1] - 60 + Math.sin(ang) * v * age + 0.5 * age * age;
          poly(f.above, [x, y - 3, x + 3, y + 2, x - 3, y + 2], INK);
          poly(f.above, [x, y - 2, x + 2, y + 1, x - 2, y + 1], i % 3 ? '#f6f2ea' : '#2c2736');
        }
        boom(f.above, g[0], g[1] - 64, 12, fr - hb.burst, 0.2);
      }
      // the bottom shell: kicked away as he hops out, it tumbles off to the left and out of the picture
      if (fr >= hb.shellOff && fr < hb.shellOff + 18) {
        const age = fr - hb.shellOff;
        const x = g[0] - age * 9,
          y = g[1] - 14 - age * 6 + age * age * 0.45;
        const rot = age * 0.5;
        shellHalf(f.above, x, y, 24, 14, rot);
      }
      const mg = W(9, 6);
      if (fr >= hb.mBurst && fr < hb.mBurst + 8) {
        boom(f.above, mg[0], mg[1] - 20, 7, fr - hb.mBurst, 1.1);
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * TAU;
          const age = fr - hb.mBurst;
          const x = mg[0] + Math.cos(ang) * age * 4,
            y = mg[1] - 12 + Math.sin(ang) * age * 2 + age * age * 0.4;
          poly(f.under, [x, y - 2, x + 2, y + 1, x - 2, y + 1], '#f0c040');
        }
      }
      break;
    }
    case 'peek': {
      const pb = beats.peek;
      if (head && fr >= pb.bonk && fr < pb.bonk + 7) boom(f.above, 2, head[1] - 20, 11, fr - pb.bonk, 0.7);
      break;
    }
  }
}
function p_ring(p: Pen, x: number, y: number, r: number, c: string, a: number) {
  p.col(c, a);
  const n = Math.max(12, Math.round(r * 6));
  for (let i = 0; i < n; i++) p.dot(x + Math.cos((i / n) * TAU) * r, y + Math.sin((i / n) * TAU) * r);
}
function shellHalf(p: Pen, x: number, y: number, rx: number, ry: number, rot: number) {
  const pts: number[] = [];
  const ptsI: number[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (i / 12);
    const zig = i % 2 ? 0 : 3;
    const lx = Math.cos(a) * rx,
      ly = Math.sin(a) * ry - zig * (i === 0 || i === 12 ? 0 : 0);
    pts.push(x + lx * Math.cos(rot) - ly * Math.sin(rot), y + lx * Math.sin(rot) + ly * Math.cos(rot));
    ptsI.push(x + lx * 0.88 * Math.cos(rot) - ly * 0.88 * Math.sin(rot), y + lx * 0.88 * Math.sin(rot) + ly * 0.88 * Math.cos(rot));
  }
  poly(p, pts, INK);
  poly(p, ptsI, '#f6f2ea');
}

/** Floorboards bulging in a ring out from a fall. */
function floorWave(p: Pen, [x, y, age]: [number, number, number]) {
  const r = 10 + age * 7;
  const a = 1 - age / 14;
  for (let i = 0; i < 40; i++) {
    const ang = (i / 40) * TAU;
    const px = x + Math.cos(ang) * r,
      py = y + Math.sin(ang) * r * 0.32;
    p.col('#2a1a10', a * 0.8);
    p.dot(px, py + 1, 2, 1);
    p.col('#a07a50', a * 0.8);
    p.dot(px, py, 2, 1);
  }
}
/** A flying bun (cartoon arc) from a to b over frames [f0, f1]. */
function flyingBun(p: Pen, a: XY, b: XY, u: number, h: number) {
  const x = a[0] + (b[0] - a[0]) * u,
    y = a[1] + (b[1] - a[1]) * u - Math.sin(u * Math.PI) * h;
  ell(p, x, y, 6, 5, INK);
  ell(p, x, y, 5, 4, '#f6ecdc');
  ell(p, x - 1, y - 1.5, 2.5, 1.5, '#ffffff');
  p.col('#c8b49a');
  p.dot(x - 1, y - 4, 3, 1);
  seg(p, x - (b[0] - a[0]) * 0.08, y + 3, x - (b[0] - a[0]) * 0.2, y + 6, 0.5, '#fffbe8', 0.7);
}
function trickFx(f: FxInput, fr: number, P: Record<string, number>) {
  const b = beats.trick;
  const pt = f.points;
  // steam puffs when the lid comes off; the snatch: a quick white smear
  if (fr >= b.snatch - 2 && fr < b.snatch + 4 && pt.mHandR) speedLines(f.above, pt.mHandR[0], pt.mHandR[1], -1, -0.4, 12, 3, 8, 3);
  // the chase: dust clouds kicked up behind the wheel legs, speed lines behind both
  if ((P.wheel ?? 0) > 0.5 && pt.bodyGround) {
    const g = pt.bodyGround;
    const back = f.pointAt(Math.max(0, f.t - 2 / 24), 'bodyGround');
    const dx = g[0] - back[0],
      dy = g[1] - back[1];
    for (let k = 0; k < 3; k++) {
      const age = (fr + k * 3) % 9;
      const tr = f.pointAt(Math.max(0, f.t - (age + 1) / 24), 'bodyGround');
      puff(f.under, tr[0], tr[1] + 2, 9, age, 9, k * 1.7 + fr * 0.1);
    }
    if (Math.hypot(dx, dy) > 1) speedLines(f.above, g[0], g[1] - 40, dx, dy, 22, 5, 50, Math.floor(fr / 2));
  }
  if ((P.mRun ?? 0) > 0.5 && pt.mGround && pt.mBody) {
    const back = f.pointAt(Math.max(0, f.t - 2 / 24), 'mGround');
    const g = pt.mGround;
    if (Math.hypot(g[0] - back[0], g[1] - back[1]) > 1) speedLines(f.above, pt.mBody[0], pt.mBody[1], g[0] - back[0], g[1] - back[1], 12, 3, 16, Math.floor(fr / 2) + 5);
  }
  // the giggle: little arcs beside Шустрик
  if (fr >= 176 && fr < 192 && pt.mHead) for (let i = 0; i < 3; i++) {
    const k = (fr * 0.5 + i) % 3;
    seg(f.above, pt.mHead[0] + 10 + k * 3, pt.mHead[1] - 6 - i * 4, pt.mHead[0] + 14 + k * 3, pt.mHead[1] - 8 - i * 4, 0.5, INK, 1 - k / 3);
  }
  // the yank: the rug's trail and a puff where his feet were
  if (fr >= b.yank && fr < b.yank + 8) {
    const g = W(1.5, 3);
    puff(f.under, g[0], g[1], 12, fr - b.yank, 8, 0.8);
    speedLines(f.under, ...W(KITCHEN.rug.x + (P.rugX ?? 0) - KITCHEN.rug.rx, KITCHEN.rug.y), -1, 0, 20, 4, 14, 2);
  }
  // hang time: a little "gulp" sweat drop, then the landing: an impact burst and dust either side
  if (fr >= b.land && fr < b.land + 6 && pt.body) boom(f.above, pt.body[0], pt.body[1] + 10, 18, fr - b.land, 0.3);
  if (pt.bodyGround) {
    puff(f.under, pt.bodyGround[0] - 34, pt.bodyGround[1], 10, fr - b.land, 12, 0.2);
    puff(f.under, pt.bodyGround[0] + 34, pt.bodyGround[1], 10, fr - b.land, 12, 1.9);
  }
  // the bun: out of Шустрик's hands in an arc into the open mouth
  const [b0, b1] = b.bunFly;
  if (fr >= b0 && fr < b1) {
    const from = f.pointAt((b0 - 1) / 24, 'mHandR'),
      to = f.pointAt(b1 / 24, 'mouth');
    flyingBun(f.above, from, to, smooth(prog(fr, b0, b1)), 46);
  }
  // munching: crumbs and happy marks
  if (fr >= b.munch[0] && fr < b.munch[1] && pt.mouth && (fr % 6) < 3) {
    dot(f.above, pt.mouth[0] + 6, pt.mouth[1] - 4, 1, '#f6ecdc');
    dot(f.above, pt.mouth[0] - 5, pt.mouth[1] - 6, 1, '#f6ecdc');
  }
}

/** Water drops: a burst of `n` drops from (x, y) at age `age` frames. */
function drops(p: Pen, x: number, y: number, age: number, life: number, n: number, speed: number, seed: number, up = 1) {
  if (age < 0 || age > life) return;
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 * up + (hash(i, seed) - 0.5) * 3.4;
    const v = speed * (0.5 + hash(i, seed + 1));
    const px = x + Math.cos(ang) * v * age,
      py = y + Math.sin(ang) * v * age + 0.35 * age * age;
    dot(p, px, py, 1 + (i % 3 === 0 ? 1 : 0), '#9ad4f4', 1 - age / life, '#2a5a7a');
  }
}
function trickBFx(f: FxInput, fr: number, P: Record<string, number>) {
  const b = beats.trick_b;
  const pt = f.points;
  // the smack: a burst on his face, a ring of impact lines
  if (pt.nose && fr >= b.smack && fr < b.smack + 6) boom(f.above, pt.nose[0], pt.nose[1] - 6, 14, fr - b.smack, 0.9);
  // the spin: a blur of speed arcs round him
  if (fr >= b.spin[0] && fr < b.spin[1] && pt.body) for (let i = 0; i < 4; i++) {
    const ang = fr * 0.9 + (i / 4) * TAU;
    const x = pt.body[0] + Math.cos(ang) * 30,
      y = pt.body[1] - 6 + Math.sin(ang) * 10;
    seg(Math.sin(ang) > 0 ? f.above : f.under, x, y, x - Math.sin(ang) * 8, y + Math.cos(ang) * 3, 0.6, '#fffbe8', 0.8);
  }
  // the tickle: little wiggle marks at his sole
  if (fr >= b.tickle[0] + 6 && fr < b.tickle[1] && pt.footR) for (let i = 0; i < 3; i++) {
    const k = (fr + i * 2) % 6;
    seg(f.above, pt.footR[0] - 8 + i * 8, pt.footR[1] - 10 - k, pt.footR[0] - 6 + i * 8, pt.footR[1] - 14 - k, 0.5, INK, 1 - k / 6);
  }
  // the launch: a whoosh of speed lines up to the top; leaves drift down while he is gone
  if (fr >= b.launch && fr < b.launch + 10 && pt.body) speedLines(f.above, pt.body[0], pt.body[1] + 30, 0, -1, 40, 6, 40, fr);
  if (fr >= b.leaves[0] && fr < b.leaves[1])
    for (let i = 0; i < 9; i++) {
      const start = b.leaves[0] + hash(i, 4) * 26;
      const age = fr - start;
      if (age < 0) continue;
      const x = 60 + hash(i, 5) * 280 + Math.sin(age * 0.25 + i) * 10,
        y = -6 + age * 2.2;
      if (y > 300) continue;
      const tilt = Math.sin(age * 0.3 + i) * 3;
      poly(f.above, [x - 5, y - tilt, x + 5, y + tilt, x + 1, y + 2], '#2c5a22');
      poly(f.above, [x - 4, y - tilt, x + 4, y + tilt, x + 1, y + 1], '#6ab040');
    }
  // the splash: a crown of water out of the barrel and drops over the whole painting
  const top = W(KITCHEN.barrel.x, KITCHEN.barrel.y, KITCHEN.barrel.h);
  const sa = fr - b.splash;
  if (sa >= 0 && sa < 14) {
    for (let i = 0; i < 11; i++) {
      const ang = Math.PI + (i / 10) * Math.PI;
      const h = Math.sin(prog(sa, 0, 14) * Math.PI) * (36 + hash(i, 6) * 30);
      const x0 = top[0] + Math.cos(ang) * 22,
        y0 = top[1] + Math.sin(ang) * 6;
      seg(f.above, x0, y0, x0 + Math.cos(ang) * 10, y0 - h, 2.6, '#2a5a7a', 1 - sa / 14);
      seg(f.above, x0, y0, x0 + Math.cos(ang) * 10, y0 - h, 1.6, '#bfe8ff', 1 - sa / 14);
    }
    drops(f.above, top[0], top[1] - 10, sa, 14, 26, 9, 7);
  }
  // kicking: bubbles out of the barrel
  if (fr >= b.kick[0] && fr < b.kick[1]) for (let i = 0; i < 3; i++) {
    const age = (fr + i * 4) % 12;
    p_ring(f.above, top[0] - 8 + i * 8, top[1] - age * 1.5, 1.5 + age * 0.15, '#dff4ff', 1 - age / 12);
  }
  // the jet of water from his mouth
  if (fr >= b.spit[0] && fr < b.spit[1] && pt.mouth) {
    // an arc from his mouth right into Шустрик's face
    const u = prog(fr, b.spit[0], b.spit[1]);
    const to = pt.mHead ?? [pt.mouth[0] + 50, pt.mouth[1] + 20];
    for (let i = 0; i < 16; i++) {
      const s = i / 16;
      if (s > u * 1.6) break;
      const x = pt.mouth[0] + (to[0] - pt.mouth[0]) * s,
        y = pt.mouth[1] + (to[1] - pt.mouth[1]) * s - Math.sin(s * Math.PI) * 22;
      dot(f.above, x, y, 1.6 - s * 0.4, '#bfe8ff', 1 - s * 0.3, '#2a5a7a');
    }
    if (u > 0.6) drops(f.above, to[0], to[1], (fr - b.spit[0]) % 4, 4, 6, 3, 9, 0.6);
  }
  // the shake: drops fly off him in every direction, onto Шустрик
  if (pt.body) drops(f.above, pt.body[0], pt.body[1] - 10, fr - b.shake[0], 9, 20, 6, 3, 0.2);
  if (pt.mBody) drops(f.above, pt.mBody[0], pt.mBody[1] - 4, fr - b.dry[0], 7, 12, 4, 5, 0.2);
  // the ladle tossed back into the barrel
  if (fr >= b.ladleToss[0] && fr < b.ladleToss[1] && pt.head) {
    const u = prog(fr, b.ladleToss[0], b.ladleToss[1]);
    const from = f.pointAt(b.ladleToss[0] / 24, 'crown');
    const x = from[0] + (top[0] - from[0]) * u,
      y = from[1] + (top[1] - from[1]) * u - Math.sin(u * Math.PI) * 30;
    const a = u * 9;
    ell(f.above, x, y, 6, 4, INK);
    ell(f.above, x, y, 5, 3, '#8a8aa0');
    seg(f.above, x, y, x + Math.cos(a) * 14, y + Math.sin(a) * 14, 1.2, INK);
    seg(f.above, x, y, x + Math.cos(a) * 13, y + Math.sin(a) * 13, 0.6, '#a4a4bc');
  }
  void P;
}

/** A bamboo steamer lid (the same one as on the table) at (x, y), tilted by `rot`. */
function steamerLid(p: Pen, x: number, y: number, rot: number) {
  const rx = 15 * Math.max(0.25, Math.abs(Math.cos(rot))),
    ry = 7 + 4 * Math.abs(Math.sin(rot));
  ell(p, x, y, rx + 2, ry + 2, LINE);
  ell(p, x, y, rx + 1, ry + 1, '#c49a48');
  ell(p, x - 3, y - 2, rx * 0.6, ry * 0.5, '#ecd088');
  seg(p, x - 2, y - 3, x + 2, y - 3, 1.2, LINE);
}
function trickCFx(f: FxInput, fr: number, P: Record<string, number>) {
  const b = beats.trick_c;
  const pt = f.points;
  const bench = W(KITCHEN.jar.x, KITCHEN.jar.y, KITCHEN.jar.z);
  // the smell: three wavy wisps from the pot to his nose
  if (fr >= b.sniff[0] && fr < b.sniff[1] && pt.nose) {
    for (let i = 0; i < 3; i++) {
      const ph = (fr * 0.08 + i / 3) % 1;
      const x = bench[0] + (pt.nose[0] - bench[0]) * ph + Math.sin(ph * 9 + i) * 5,
        y = bench[1] - 30 + (pt.nose[1] - bench[1] + 30) * ph;
      seg(f.above, x, y, x + 4, y - 3, 0.6, '#ffd870', 0.7 * Math.sin(ph * Math.PI));
      seg(f.above, x + 4, y - 3, x + 8, y, 0.6, '#ffd870', 0.7 * Math.sin(ph * Math.PI));
    }
  }
  // the pot in his paws on the way up to his head
  if (fr >= b.lift[0] && fr < b.lift[1] && pt.handL && pt.handR) honeyJar(f.under, (pt.handL[0] + pt.handR[0]) / 2, (pt.handL[1] + pt.handR[1]) / 2 + 6);
  // stuck: sweat flies
  if (pt.jar) for (const s of [27, 33, 39]) sweat(f.above, pt.jar[0], pt.jar[1] - 20, fr - s, s);
  // the door: clang rings round the pot, a star on the door
  const jtop = pt.jar ? ([pt.jar[0], pt.jar[1] - 27] as XY) : null;
  if (pt.jar && fr >= b.door && fr < b.door + 10) {
    const age = fr - b.door;
    boom(f.under, pt.jar[0] - 6, pt.jar[1] - 26, 12, age, 2);
    for (let k = 0; k < 3; k++) p_ring(f.above, pt.jar[0], pt.jar[1], 32 + age * 3 + k * 6, '#fff4c0', Math.max(0, 0.7 - age * 0.07 - k * 0.15));
  }
  // the table: a thump star at his hip
  if (pt.body && fr >= b.table && fr < b.table + 6) boom(f.under, pt.body[0] - 22, pt.body[1], 9, fr - b.table, 3);
  // the steamer lid: up off the steamer, bom on the pot, a bounce, bom again, back home on the steamer
  const T = KITCHEN.table;
  const st = W(T.x, T.y, T.top);
  const home: XY = [st[0] + STEAM_DX, st[1] + 2 - 18];
  if (jtop && fr > b.table && fr < b.lidHome) {
    const hits = b.lids;
    let x: number, y: number, rot: number;
    if (fr < hits[0]) {
      const u = prog(fr, b.table + 1, hits[0]);
      x = home[0] + (jtop[0] - home[0]) * u;
      y = home[1] + (jtop[1] - home[1]) * u - Math.sin(u * Math.PI) * 40;
      rot = u * 5;
    } else if (fr < hits[1]) {
      const u = prog(fr, hits[0], hits[1]);
      x = jtop[0];
      y = jtop[1] - Math.sin(u * Math.PI) * 26;
      rot = Math.PI * 2 + u * 3.14;
    } else {
      const u = prog(fr, hits[1], b.lidHome);
      x = jtop[0] + (home[0] - jtop[0]) * u;
      y = jtop[1] + (home[1] - jtop[1]) * u - Math.sin(u * Math.PI) * 34;
      rot = Math.PI * 3 + u * Math.PI * 3;
    }
    steamerLid(f.above, x, y, rot);
  }
  for (const h of b.lids)
    if (jtop && fr >= h && fr < h + 8) {
      const age = fr - h;
      boom(f.above, jtop[0], jtop[1] - 2, 12, age, h);
      for (let k = 0; k < 2; k++) p_ring(f.above, jtop[0], jtop[1] + 27, 30 + age * 3 + k * 6, '#fff4c0', Math.max(0, 0.6 - age * 0.08 - k * 0.15));
    }
  if (fr >= b.lidHome && fr < b.lidHome + 4) boom(f.under, home[0], home[1] - 4, 6, fr - b.lidHome, 5);
  // dazed: little stars round the pot
  if (jtop && fr >= b.lids[1] + 2 && fr < 112) dizzyRing(f, [jtop[0], jtop[1] + 4], 28, fr * 0.35, 1);
  // Шустрик laughing: tears fly off him
  if (pt.mHead && fr >= b.laugh[0] && fr < b.laugh[1] && fr % 4 < 3)
    for (const s of [-1, 1]) dot(f.above, pt.mHead[0] + s * (6 + (fr % 4) * 3), pt.mHead[1] - 4 - (fr % 4) * 2 + ((fr % 4) * (fr % 4)) * 0.8, 1.2, '#bfe8ff', 0.9, '#2a5a7a');
  // the tug: dust at his heels, strain marks
  if (pt.mFootL && fr >= b.tug[0] && fr < b.tug[1] && fr % 6 === 0) puff(f.under, pt.mFootL[0] + 6, pt.mFootL[1], 4, 0, 6, fr);
  if (pt.mFootL && fr >= b.tug[0] && fr < b.tug[1]) puff(f.under, pt.mFootL[0] + 8, pt.mFootL[1], 4, fr % 6, 6, fr - (fr % 6));
  if (pt.jar && fr >= b.tug[0] + 4 && fr < b.tug[1]) for (const s of [b.tug[0] + 10, b.tug[0] + 22, b.tug[0] + 34]) sweat(f.above, pt.jar[0], pt.jar[1] - 24, fr - s, s);
  // POP
  const popAt = f.pointAt((b.pop - 1) / 24, 'jar');
  if (fr >= b.pop && fr < b.pop + 6) boom(f.above, popAt[0], popAt[1], 22, fr - b.pop, 7);
  // the pot flies back up onto the bench, a clink when it lands
  if (fr >= b.jarFly[0] && fr < b.jarFly[1]) {
    const u = prog(fr, b.jarFly[0], b.jarFly[1]);
    const x = popAt[0] + (bench[0] - popAt[0]) * u,
      y = popAt[1] + 20 + (bench[1] - popAt[1] - 20) * u - Math.sin(u * Math.PI) * 70;
    honeyJar(f.above, x, y);
    if (u < 0.5) speedLines(f.above, x, y - 12, bench[0] - popAt[0], bench[1] - popAt[1] - 60, 14, 3, 14, fr);
  }
  if (fr >= b.jarFly[1] && fr < b.jarFly[1] + 5) boom(f.under, bench[0], bench[1] - 30, 7, fr - b.jarFly[1], 8);
  // Шустрик shot backward into the sack: speed lines, then a big cloud of flour that settles slowly
  if (pt.mBody && fr >= b.pop && fr < b.flour) speedLines(f.above, pt.mBody[0], pt.mBody[1], 1, 0.4, 20, 4, 16, fr);
  const sk = W(KITCHEN.sack.x, KITCHEN.sack.y, 6);
  const fa = fr - b.flour;
  if (fa >= 0 && fa < 60) {
    const grow = Math.min(1, fa / 6);
    const fade = fa < 24 ? 1 : 1 - (fa - 24) / 36;
    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * TAU + 0.3;
      const rr = (20 + hash(i, 11) * 16) * grow;
      const cx = sk[0] + Math.cos(ang) * rr * 1.3,
        cy = sk[1] - 18 - Math.sin(ang) * rr * 0.8 + fa * 0.15;
      ell(f.above, cx, cy, (12 + hash(i, 12) * 8) * grow, (10 + hash(i, 13) * 6) * grow, '#fbf6ee', 0.85 * fade);
    }
  }
  // flour dust settling over the floor round the sack
  if (fa >= 10 && fa < 90)
    for (let i = 0; i < 14; i++) {
      const x = sk[0] - 60 + hash(i, 14) * 120,
        y = sk[1] - 70 + ((fa - 10) * (0.8 + hash(i, 15) * 0.6) + hash(i, 16) * 60) % 90;
      dot(f.above, x + Math.sin(fa * 0.1 + i) * 4, y, 1, '#fbf6ee', 0.7 * (1 - (fa - 10) / 80));
    }
  // the sneeze: a little cloud of flour from his nose; the shake: flour off him all round
  if (pt.mMouth) puff(f.above, pt.mMouth[0] + 8, pt.mMouth[1], 9, fr - b.sneeze, 12, 17, '#fbf6ee');
  if (pt.mBody) for (let i = 0; i < 5; i++) puff(f.above, pt.mBody[0] + Math.cos(i * 1.3) * 10, pt.mBody[1] - 6 + Math.sin(i * 1.3) * 6, 6, fr - b.shake, 10, 20 + i, '#fbf6ee');
  void P;
}

// ---- the effects entry --------------------------------------------------------------------------------------------
export function pandaEffects(f: FxInput) {
  const fr = f.t * 24;
  const P = gesture(f.anim, f.t) as Record<string, number>;
  const pt = f.points;
  // the heroes' spots on the floor for depth order (Шустрик up on the table or a head does not count)
  const who: Who = {
    panda: (P.hidden ?? 0) > 0.5 && !P.egg ? null : (pt.bodyGround ?? pt.eggGround ?? null),
    monkey: (P.mHidden ?? 0) > 0.5 || (P.mOn ?? 0) > 0.5 || (P.mZ ?? 0) > 5 ? null : (pt.mGround ?? pt.mEggGround ?? null),
  };
  // both shadows, under everything
  if ((P.noShadow ?? 0) < 0.5) {
    if (who.panda && pt.body) shadow(f.under, who.panda, 30, 9, who.panda[1] - pt.body[1] - 30);
    else if (pt.eggGround) shadow(f.under, pt.eggGround, 28, 8, 0);
  }
  if (who.monkey && (P.mOn ?? 0) < 0.5 && pt.mBody) shadow(f.under, who.monkey, 11, 4, who.monkey[1] - pt.mBody[1] - 12);
  const pr = propsFor(f.anim, fr, P, f);
  drawKitchen(f, pr, who, fr);
  if (pr.wave) floorWave(f.under, pr.wave);
  everydayFx(f, fr, P);
  if (f.anim === 'trick') trickFx(f, fr, P);
  if (f.anim === 'trick_b') trickBFx(f, fr, P);
  if (f.anim === 'trick_c') trickCFx(f, fr, P);
  // stars over a bonked head
  if ((P.dizzy ?? 0) > 0.5 && pt.head) dizzyRing(f, [pt.head[0], pt.head[1] - 36], 30, f.t * TAU * 1.2, 1);
  if ((P.mDizzy ?? 0) > 0.5 && pt.mHead) dizzyRing(f, [pt.mHead[0], pt.mHead[1] - 13], 12, -f.t * TAU * 1.5, 0.6);
  // a popping fright: sweat drops
  if ((P.pop ?? 0) > 0.5 && pt.head && f.anim !== 'wake_startled') sweat(f.above, pt.head[0], pt.head[1] - 24, (fr % 10), 11);
  void floorY;
  void smooth;
}
