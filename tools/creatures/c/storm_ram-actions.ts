import { effectPresets } from '../fx/presets';
import { ellFill, oval, progress, settle } from '../fx/field';
import type { Pen } from '../fx/pen';
import { hash, TAU } from '../kit/f11-mobkit';
import { paintMaterial, paintImpact, paintSocketTrail, projectileAt } from '../technique-fx';
import type { Creature, FxInput, XY } from '../types';
import book from './storm_ram-keys';

const cold = '#b8e4ec',
  light = '#fff6d2',
  violet = '#8275a9',
  shade = '#4b4667';

// A stepped stroke is bright at the wound and loses one branch at each fork.
function arc(p: Pen, from: XY, to: XY, seed: number, alpha: number, width = 1) {
  const dx = to[0] - from[0],
    dy = to[1] - from[1],
    len = Math.hypot(dx, dy) || 1;
  let prev = from;
  const count = Math.max(2, Math.round(len / 5));
  for (let i = 1; i <= count; i++) {
    const u = i / count;
    const kink = i === count ? 0 : (i % 2 ? 1 : -1) * (0.7 + 2.2 * hash(i, seed));
    const pt: XY = [from[0] + u * dx - (dy * kink) / len, from[1] + u * dy + (dx * kink) / len];
    if (width > 1) p.lineS(prev[0], prev[1] + 1, pt[0], pt[1] + 1, violet, alpha * 0.9);
    p.lineS(...prev, ...pt, i % 3 === 0 ? cold : light, alpha);
    prev = pt;
  }
}

function scorch(f: FxInput, socket: string, at: XY, age: number, seed: number, size: number) {
  const fade = 1 - progress(age, 0.2, 0.51),
    bloom = progress(age, -0.025, 0.19);
  if (fade <= 0) return;
  const width = (0.2 + 0.8 * bloom) * size;
  // Dark impact burns into the planks directly beneath the flashing branches.
  ellFill(f.under, [at[0], at[1] + 0.8], width * 0.69, 1.1 + width * 0.11, '#303046', fade * 0.84);
  paintImpact(f, 'under', socket, at, (pen, x, y) => {
    ellFill(pen, [x, y], 1.4 + 0.8 * (1 - bloom), 1, light, fade);
    for (let j = 0; j < 5; j++) {
      const angle = (TAU * j) / 5 + 0.34 * hash(seed, j);
      const end: XY = [x + width * Math.cos(angle), y + width * 0.38 * Math.sin(angle)];
      arc(pen, [x, y], end, seed + j, fade, 2);
      if (width > 8)
        arc(
          pen,
          [x + (end[0] - x) * 0.51, y + (end[1] - y) * 0.51],
          [end[0] - 0.19 * width * Math.sin(angle), end[1] + 0.15 * width * Math.cos(angle)],
          seed + 2 * j,
          fade * 0.8,
        );
    }
  });
  // Wind from the island skirts the crack as a pale crescent under the smoke.
  if (age > 0) effectPresets['silk-wind'].mark(f.under, at, width * 0.88, 0.3, fade * 0.51);
}

function thunder(f: FxInput, time: number) {
  const age = f.t - time;
  if (age < 0 || age > 0.51) return;
  const point = f.pointAt(time, 'hornTip');
  scorch(f, 'hornTip', point, age, 77, 29);
  const fade = 1 - progress(age, 0.1, 0.3);
  if (fade > 0) {
    const lit = age < 0.095 || Math.abs(age - 0.165) < 0.028;
    if (lit) {
      const fork: XY = [point[0] + 12, point[1] - 16];
      arc(f.above, point, fork, 80, fade, 2);
      arc(f.above, fork, [point[0] + 8, point[1] - 29], 81, fade, 2);
      arc(f.above, fork, [point[0] + 20, point[1] - 20], 82, fade);
    }
  }
  // Loose wool blows backwards off the shoulder at recoil, separate from the electrical scar.
  if (age > 0) {
    const shoulder = f.pointAt(time, 'head');
    for (let j = 0; j < 6; j++) {
      const x = shoulder[0] - (12 + 25 * hash(j, 9)) * age * 2;
      const y = shoulder[1] - 7 - (15 + 25 * hash(j, 7)) * age + 11 * age * age;
      const rr = (1.4 + hash(j, 11) * 2.4) * (1 + 2.2 * age);
      ellFill(
        f.above,
        [x, y],
        rr,
        rr * 0.73,
        j % 2 ? shade : '#657085',
        (1 - progress(age, 0.17, 0.44)) * 0.81,
      );
    }
  }
}

function lightningBalls(f: FxInput, release: number) {
  const flight = book.tech_volley.contacts?.filter((c) => c.projectile) ?? [];
  const origin = f.pointAt(release, 'hornTip'),
    floor = f.pointAt(release, 'hornTipGround');
  const sign = origin[0] < f.w * 0.63 ? 1 : -1;
  const room = sign > 0 ? f.w - origin[0] - 7 : origin[0] - 7;
  const range = Math.max(5, Math.min(64, room));
  if (f.t >= release && f.t < release + 0.125) {
    const a = 1 - progress(f.t - release, 0.02, 0.125);
    paintImpact(f, 'above', 'hornTip', origin, (p, x, y) => {
      ellFill(p, [x, y], 1.8, 1.4, light, a);
      arc(p, [x, y], [x + sign * 9, y - 7], 94, a);
    });
  }
  for (const [i, c] of flight.entries()) {
    const hit = c.frame / 24,
      id = c.projectile!;
    if (f.t < release || f.t > hit + 0.51) continue;
    const ratio = 0.27 + 0.17 * i;
    const end: XY = [
      origin[0] + sign * range * ratio,
      Math.min(f.h - 5, floor[1] + [1, 7, -2, 6, 1][i]),
    ];
    // Different arcs separate even the first two sparks immediately after release.
    const h = [4, 13, 26, 34, 40][i],
      age = f.t - hit;
    const pt = projectileAt(f, id, 'hornTip', release, hit, end, h);
    if (age < 0) {
      const u = (f.t - release) / (hit - release);
      const dx = end[0] - origin[0],
        dy = end[1] - origin[1] - 4 * h * (1 - 2 * u);
      const len = Math.hypot(dx, dy) || 1;
      const tail: XY = [pt[0] - (dx / len) * (4 + i * 0.45), pt[1] - (dy / len) * (4 + i * 0.45)];
      paintMaterial(f, 'above', id, pt, (p, x, y) => {
        arc(p, tail, pt, 91 + i, 0.9);
        ellFill(p, pt, 2.9, 2.5, violet, 1);
        oval(p, pt, 3.4, 2.15, cold, 0.95, -2.9, 1.8);
        ellFill(p, [x + 0.35, y - 0.3], 1.4, 1.2, light, 1);
      });
      const floorY = origin[1] + (end[1] - origin[1]) * u;
      ellFill(f.under, [pt[0], Math.max(floor[1], floorY)], 2.3, 1, '#353349', 0.55);
    } else scorch(f, id, end, age, 30 + i, 9 + i);
  }
}

export const stormEffects: Creature['effects'] = (f) => {
  const spec = book[f.anim];
  if (!spec) return;
  const strike = spec.keys.find((k) => k.role === 'strike')!.frame / 24;
  const hit = spec.keys.find((k) => k.role === 'hit')!.frame / 24;
  if (f.t >= strike && f.t <= hit + 0.095) {
    paintSocketTrail(f, 'above', 'hornTip', strike, hit, {
      color: cold,
      width: 2,
      alpha: 1 - progress(f.t - hit, 0.018, 0.095),
    });
  }
  if (f.anim === 'tech_ram') thunder(f, hit);
  if (f.anim === 'tech_volley') lightningBalls(f, hit);
  settle(f);
};
