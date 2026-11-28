import { oval } from '../fx/field';
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
    const k = Math.max(0, 1 - age / 0.24);
    const arm = 5 * spread * k;
    const ink = f.above;
    ink.col('#b5eae0', k);
    ink.line(x - arm, y, x + arm, y);
    ink.line(x, y - arm, x, y + arm);
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
  const u = age / 0.42;
  if (u < 1) {
    const x = current.ring[0] + (hook[0] - current.ring[0]) * u;
    const y = current.ring[1] + (hook[1] - current.ring[1]) * u;
    const r = 5.4 * spread * (1 - 0.45 * u), k = 1 - u;
    oval(f.above, [x, y], r, r * 0.66, '#f8d98a', 0.9 * k);
    glowRing(f.light, x, y, r, 2, brass, 0.43 * k, 0.66);
    glowLine(f.light, x, y, x + 1, y + 3, 2.8, f.palette, 0.24 * k);
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
