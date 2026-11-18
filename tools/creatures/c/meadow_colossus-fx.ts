import { ellFill, oval, progress } from '../fx/field';
import { hash, TAU } from '../kit/f11-mobkit';
import { paintImpact, paintSocketTrail } from '../technique-fx';
import type { Creature, FxInput } from '../types';
import book from './meadow_colossus-keys';

function displaceEarth(f: FxInput, socket: string, hit: number, wave: boolean) {
  const age = f.t - hit;
  if (age < -1e-7 || age > 0.66) return;
  const at = f.pointAt(hit, socket),
    fade = 1 - progress(age, 0.25, 0.66);
  const radius = (wave ? 39 : 15) * progress(age, 0, wave ? 0.56 : 0.32);
  paintImpact(f, 'under', socket, at, (p, x, y) => {
    ellFill(p, [x, y], 2.6 + radius * 0.18, 1.2, '#6d5236', fade);
    // The forward half of a lifted sod ring exposes its dark loam underneath
    // and a sunlit grass rim on top. Break it into sections as it fans outward.
    if (wave && radius > 1) {
      for (const [start, end] of [
        [0.11, 0.86],
        [1.02, 1.87],
        [2.02, 3.08],
      ]) {
        oval(p, [x, y + 1.6], radius, radius * 0.43, '#403b26', fade, start, end);
        oval(p, [x, y + 0.5], radius, radius * 0.43, '#53482d', fade, start, end);
        oval(p, at, radius, radius * 0.43, '#f1d17c', fade, start, end);
      }
    }
    if (age > 0) {
      const angles = wave ? [0.32, 1.24, 2.66] : [0.55, 2.39];
      for (const [i, theta] of angles.entries()) {
        const flight = (wave ? radius : radius * 1.14) * (1 - 0.11 * i);
        const lift = (wave ? 6.8 : 9.1) * Math.max(0, 1 - (age - 0.21) ** 2 / 0.21 ** 2);
        const tx = x + Math.cos(theta) * flight,
          ty = y + Math.sin(theta) * flight * 0.46 - lift;
        ellFill(p, [tx, ty + 1], 2.6, 1.7, '#443829', fade);
        ellFill(p, [tx, ty], 2.4, 1.5, '#837145', fade);
        p.lineS(tx - 1.8, ty - 0.5, tx + 0.6, ty - 1.5, '#e9c674', fade);
      }
    }
    for (let j = 0; j < (wave ? 10 : 5); j++) {
      const angle = ((j + 0.15) * TAU) / (wave ? 10 : 5),
        outer = Math.max(1, radius);
      oval(
        p,
        at,
        outer,
        Math.max(1, outer * 0.42),
        j % 2 ? '#9d854d' : '#d4b065',
        fade,
        angle,
        angle + 0.35,
      );
      const land = outer * (0.7 + hash(j, 31) * 0.35);
      const lift = Math.max(0, 4 * age * (0.54 - age)) * (wave ? 14 : 23);
      const tx = x + land * Math.cos(angle),
        ty = y + land * 0.42 * Math.sin(angle) - lift;
      ellFill(p, [tx, ty], wave ? 1.5 : 1.85, 1.05, j % 3 ? '#9f8051' : '#b2a464', fade);
    }
  });
}

function sheddingLeaves(f: FxInput, from: number, count: number) {
  const fadeAfter = 0.62;
  for (let i = 0; i < count; i++) {
    const birth = from + 0.029 * i,
      age = f.t - birth;
    if (age < 0 || age > fadeAfter) continue;
    const origin = f.pointAt(birth, 'treeCrown');
    const x = origin[0] + (hash(i, 41) - 0.42) * age * 39 + Math.sin(age * 9 + i) * age * 4;
    const y = origin[1] - (9 + hash(i, 44) * 8) * age + 49 * age * age;
    f.above.lineS(
      x - 1,
      y + 0.6,
      x + 1.3,
      y - 0.6,
      i % 2 ? '#cbb454' : '#91a449',
      1 - progress(age, 0.35, fadeAfter),
    );
  }
}
export const meadowEffects: Creature['effects'] = (f) => {
  const move = book[f.anim];
  if (move) {
    const strike = move.keys.find((k) => k.role === 'strike')!.frame / 24,
      hit = move.keys.find((k) => k.role === 'hit')!.frame / 24;
    for (const contact of move.contacts!) {
      if (f.t >= strike && f.t <= hit + 0.07)
        paintSocketTrail(f, 'above', contact.socket, strike, hit, {
          color: '#ba965e',
          width: 1,
          alpha: 0.8 * (1 - progress(f.t - hit, 0.02, 0.07)),
        });
      displaceEarth(f, contact.socket, hit, f.anim === 'tech_heelwave');
    }
    return;
  }
  if (f.anim === 'happy') {
    sheddingLeaves(f, 0.7, 4);
    sheddingLeaves(f, 1.14, 5);
  } else if (f.anim === 'wake_startled') sheddingLeaves(f, 0.17, 5);
  else if (f.anim === 'sleep' || f.anim === 'sleep_in' || f.anim === 'sleep_out') {
    const alpha =
      f.anim === 'sleep_in'
        ? progress(f.t, 0.45, 1.12)
        : f.anim === 'sleep_out'
          ? 1 - progress(f.t, 0.05, 0.42)
          : 1;
    if (alpha <= 0) return;
    const at = f.points.treeCrown;
    const orbit =
      f.anim === 'sleep_in'
        ? 1 - progress(f.t, 0.5, 1.1)
        : f.anim === 'sleep_out'
          ? progress(f.t, 0.04, 0.45)
          : 0;
    const x = at[0] + 2.4 + orbit * (9 + 0.9 * Math.sin(f.t * 7)),
      y = at[1] - 1.8 - orbit * 11;
    ellFill(f.above, [x, y], 1.95, 1.35, '#c6af56', alpha * 0.72);
    ellFill(f.above, [x, y], 0.87, 0.87, '#fff0a0', alpha);
  }
};
