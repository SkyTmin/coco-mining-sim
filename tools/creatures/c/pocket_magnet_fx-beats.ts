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
  flash(f.light, x, y, 8, brass, after, 0.23, 0.8);
  const chips = [-1, 0, 1].map((i) => ({
    kind: 'grit' as const, x, y, vx: (-8 + i * 7) * spread, vy: -29 - i * 4,
    life: 0.54 + i * 0.06, size: 0.85, bounce: 0.32, spread: 3,
  }));
  drawSim(f, simulate(after, chips, { seed: f.seed, ground: f.ground, palette: brass }));
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
  const embers = [-1, 0, 1, 2].map((i) => ({
    kind: 'ember' as const, x: cx, y: cy + 1,
    vx: (-8 + i * 12) * spread, vy: -12 - (i % 2) * 9,
    life: 0.91 + 0.09 * i, size: 0.9, gravity: 0.35, bounce: 0.46, spread: 6,
  }));
  drawSim(f, simulate(age, embers, { ground: f.ground, seed: f.seed, palette: brass }));
  const x = caught.center[0];
  const pool = Math.min(1, age * 8) * Math.max(0, 1 - age / 1.2);
  glow(f.light, x, f.ground(x), 12, brass, 0.32 * pool, 0.26);
}

export function magneticContact(f: FxInput) {
  const n = Math.round(f.t * 24);
  const spread = Number(f.options.spread);
  if (f.anim === 'trick') fish(f, n, spread);
  if (f.anim === 'trick_b') star(f, n, spread);
}
