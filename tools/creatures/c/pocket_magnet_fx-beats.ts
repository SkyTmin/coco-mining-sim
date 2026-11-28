import { fit } from '../fx/palette';
import { flash, glow, glowLine, glowRing, pointLight } from '../fx/light';
import { drawSim, simulate } from '../fx/sim';
import type { FxInput, XY } from '../types';
import { fishAt, fishStop, hook, starAt } from './pocket_magnet-poses';

export const fishLatch = 44, fishReturn = 131, catchStar = 111;
const brass = ['#593643', '#9f4934', '#d37142', '#efa44d', '#ffcd75', '#ffe9ad'];
const pin = fishAt(fishLatch).tab;
const stop: XY = [fishStop, 98];
const caught = starAt(catchStar);

function fish(f: FxInput, n: number, spread: number) {
  const age = (n - fishLatch) / 24;
  if (age >= 0 && age < 0.4) {
    const [x, y] = pin;
    const k = Math.max(0, 1 - age / 0.28);
    const [shadow, enamel, silver, tip] = fit(f.palette, 4);
    const ink = f.above;
    // The pole comes down from the right. Give the cold leading ray the open wood to its left.
    for (const [dx, dy] of [[-13, -4], [5, 1.5], [2.4, -8], [-1.1, 3.8]]) {
      const length = spread * (0.2 + 0.8 * k);
      const ex = x + dx * length, ey = y + dy * length;
      ink.col(shadow, 0.62 * k);
      ink.line(x, y + 1, ex, ey + 1);
      ink.col(enamel, 0.93 * k);
      ink.line(x, y, ex, ey);
      ink.col(silver, k);
      ink.line(x, y, x + dx * length * 0.68, y + dy * length * 0.68);
      ink.col(tip, k);
      ink.line(x, y, x + dx * length * 0.22, y + dy * length * 0.22);
    }
    flash(f.light, x, y, 11 * spread, f.palette, age, 0.29, 0.55);
    pointLight(f.light, x, y, f.palette, k);
  }

  const after = (n - fishReturn) / 24;
  if (after < 0 || after > 0.75) return;
  const [x, y] = stop;
  // A hair of light on the wooden bevel leaves the coral fin readable inside it.
  const click = Math.max(0, 1 - after / 0.17);
  if (click > 0) {
    f.above.lineS(x, y, x + 2, y - 3 * click, '#ffe0a0', click, 0.66);
    glowLine(f.light, x, y, x + 1.5, y - 2.5 * click, 2.3, brass, 0.39 * click);
  }
  flash(f.light, x + 1, y - 1, 7.5, brass, after, 0.20, 0.39);
  // The stop releases one high chip, one low skip into the felt and a late, near-vertical fleck.
  const chips = [
    [-14, -101, 1.18, 0, 0.63],
    [3, -135, 1.22, 0.018, 0.74],
    [-28, -79, 1.1, 0.065, 0.58],
  ].map(([vx, vy, size, delay, life], i) => ({
    kind: 'grit' as const, x: x - 1, y: y - 1,
    vx: vx * spread, vy, size, delay, life, bounce: 0.47, spread: 3,
    palette: i === 1 ? f.palette : 'material:coins' as const,
  }));
  drawSim(f, simulate(after, chips, { seed: f.seed, ground: f.ground, palette: 'material:coins' }));
}

function star(f: FxInput, n: number, spread: number) {
  const age = (n - catchStar) / 24;
  if (age < 0 || age >= 1.46) return;
  const [cx, cy] = caught.contact;
  flash(f.light, cx, cy, 13 * spread, brass, age, 0.24, 0.7);
  const current = starAt(n);
  if (age < 0.52) {
    // The pulse encircles the cord. Its far arc passes behind the fibres.
    const u = Math.min(1, age / 0.40);
    const x = current.ring[0] + (hook[0] - current.ring[0]) * u;
    const y = current.ring[1] + (hook[1] - current.ring[1]) * u;
    const fade = Math.min(1, (0.52 - age) / 0.14);
    const radius = (5.6 - 2.15 * u) * spread * (0.62 + 0.38 * fade);
    const ca = Math.cos(current.a), sa = Math.sin(current.a);
    const at = (t: number): XY => [
      x + radius * (Math.cos(t) * ca + 0.46 * Math.sin(t) * sa),
      y + radius * (-Math.cos(t) * sa + 0.46 * Math.sin(t) * ca),
    ];
    for (let i = 0; i < 20; i++) {
      const t = i * Math.PI / 10, near = i < 10;
      if (i === 14 || i === 15) continue;
      const start = at(t), end = at(t + Math.PI / 10);
      f.above.col(near ? '#296374' : '#78b1ac', (near ? 0.95 : 0.68) * fade);
      f.above.line(start[0], start[1] + 1, end[0], end[1] + 1);
      f.above.col(near ? '#ffe2a0' : '#b6d9c2', (near ? 1 : 0.75) * fade);
      f.above.line(...start, ...end);
    }
    glowRing(f.light, x, y, radius, 1.7, brass, 0.28 * fade, 0.53);
    const crest = at(Math.PI * 0.72);
    pointLight(f.light, ...crest, brass, fade);
  }
  const embers = [
    [-24, -32, 0.48, 0.74, 1.44, 0.032, 1.25],
    [-3, 9, 0.37, 0.59, 1.18, 0.075, 0.91],
    [19, -16, 0.42, 0.68, 1.30, 0.055, 1.08],
  ].map(([vx, vy, gravity, bounce, size, delay, life]) => ({
    kind: 'ember' as const, x: cx - 1, y: cy + 1, vx: vx * spread, vy,
    gravity, bounce, size, delay, life, spread: 4,
  }));
  const coal = ['#502e46', '#843741', '#b04f3d', '#e67b39', '#ffc064', '#ffe6a1'];
  const shower = simulate(age, embers, { ground: f.ground, seed: f.seed, palette: coal, cache: true });
  for (const e of shower.particles) {
    const depth = f.ground(e.x) - e.y;
    const nearFloor = Math.max(0, 1 - depth / 9);
    const heat = Math.max(0, 1 - (age - e.birth) / e.life);
    if (nearFloor > 0) glow(f.light, e.x, f.ground(e.x) + 1, 5.6, brass, 0.34 * heat * nearFloor ** 2, 0.34);
    const speed = Math.hypot(e.vx, e.vy);
    if (speed < 18 || e.rest) continue;
    const tail = Math.min(5.2, speed * 0.037);
    const tx = e.x - e.vx / speed * tail, ty = e.y - e.vy / speed * tail;
    const k = Math.min(1, 3 * (1 - (age - e.birth) / e.life));
    // The dark husk lets the cinders cross a sunbeam without turning into spots of sunlight.
    f.above.lineS(tx, ty, e.x, e.y, coal[2], 0.88 * k, 0.85);
    f.above.col(coal[4], 0.94 * k);
    f.above.line((tx + e.x) / 2, (ty + e.y) / 2, e.x, e.y);
  }
  drawSim(f, shower);
  const x = current.center[0], floor = f.ground(x);
  const rise = Math.max(0, Math.min(1, (age - 0.20) / 0.23));
  const tail = Math.max(0, Math.min(1, (1.43 - age) / 0.91));
  const warmth = rise * tail;
  if (warmth > 0) {
    // The star is still swinging after the catch. The soft reflection stays below its brass face.
    glow(f.light, x, floor + 0.4, 17, brass, 0.48 * warmth, 0.29);
    glow(f.light, x - 1.5, floor, 8.5, ['#e97838', '#ffc16e'], 0.46 * warmth, 0.28);
  }
}

export function magneticContact(f: FxInput) {
  const n = Math.round(f.t * 24);
  const spread = Number(f.options.spread);
  if (f.anim === 'trick') fish(f, n, spread);
  if (f.anim === 'trick_b') star(f, n, spread);
}
