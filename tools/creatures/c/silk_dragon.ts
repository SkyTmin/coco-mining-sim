// The silk body is stretched between bamboo ribs. Each side keeps its dark lining on a turn.
import { F3, Rig, vlerp, type V3, type Mat } from '../rig/f15-rig';
import { hx, tn, TAU, sstep } from '../kit/f11-mobkit';
import { everyday, life, projectFigure } from '../rig/figure';
import { animations, effects, pose, presentation } from './silk_dragon-actions';
import type { Creature, Variant } from '../types';

export interface SilkPose {
  curl?: number;
  lunge?: number;
  tailSwing?: number;
  fins?: number;
  lift?: number;
  tilt?: number;
}
export function bodyFrame(anim: string, t: number, side: number, variant: Variant, A: SilkPose = {}) {
  const g = variant === 'gold',
    r = new Rig(),
    l = life(anim, t, 1.13);
  const paper: Mat = {
    T: g
      ? tn('#754831', '#ba8150', '#e8c07d', '#fff1b6')
      : tn('#805b56', '#bea084', '#edcdaa', '#fff0cb'),
  };
  const silk: Mat = {
    T: g
      ? tn('#543149', '#9c593f', '#d49b52', '#ffd985')
      : tn('#482744', '#88394b', '#c95649', '#ed8a64'),
  };
  const lining: Mat = { T: tn('#35263e', '#64314c', '#943d51', '#ad615b') };
  const cane: Mat = {
    T: g
      ? tn('#614634', '#a27646', '#e2b166', '#fff0af')
      : tn('#5a4040', '#ab7851', '#dbac69', '#f5cf88'),
  };
  const brow: Mat = { T: tn('#352734', '#4b333c', '#744a4f', '#996459') };
  const eye: Mat = { T: tn('#3a4141', '#49817f', '#79c7af', '#c6f4cf'), glow: 0.28 };
  const curl = A.curl ?? 0,
    swing = A.tailSwing ?? 0,
    fins = A.fins ?? 0;
  const root = F3.yaw(0.36 + (side * TAU) / 16)
    .at(-1, 0, (A.lift ?? 0) + 5 * l.happy + 7 * l.pop)
    .pitch(A.tilt ?? 0);
  const count = 5,
    ribs: F3[] = [];
  function station(k: number) {
    const u = k / count,
      delay = l.q - 1.8 * u,
      fold = l.sleep * 0.67 + l.hatch * 0.94 + curl * 0.76;
    const x =
      (31 - 73 * u) * (1 - Math.max(-0.06, fold) * 0.63) +
      (A.lunge ?? 0) * (1 - u) ** 2 +
      18 * fold * Math.sin(u * TAU + 0.2) +
      26 * swing * u * u;
    const y =
      8 * Math.sin(u * TAU + 0.3) +
      3 * Math.sin(delay) * u +
      fold * 10 * Math.sin(u * TAU + 0.6) +
      swing * 16 * u * u;
    const z =
      42 +
      14 * Math.cos(u * TAU + 0.05) +
      3.5 * Math.sin(delay + u * 2.1) +
      9 * Math.sin(u * Math.PI + l.q) * Math.abs(l.walk) +
      15 * fold * Math.cos(u * TAU) +
      15 * swing * u * u -
      15 * l.sleep -
      23 * l.hatch -
      10 * l.tired +
      4 * l.happy * Math.cos(u * TAU);
    const loop = sstep(0.38, 0.8, curl),
      angle = 0.22 + u * 5.63;
    const pos = vlerp(
      [x, y, z],
      [4 + 23 * Math.cos(angle), 3 * Math.sin(angle * 1.4), 47 - 23 * Math.sin(angle)],
      loop,
    );
    return root.at(...pos).pitch(-Math.atan2(Math.cos(angle), Math.sin(angle)) * loop);
  }
  const ring = (j: number, s: number): V3 => {
    const F = ribs[j],
      u = j / count;
    const ry = (13 - 7 * u) * (1 - 0.18 * l.hatch),
      rz = 12 - 7.1 * u;
    const theta = (s * Math.PI) / 2;
    return F.p(0, ry * Math.cos(theta), rz * Math.sin(theta));
  };
  for (let i = 0; i <= count; i++) ribs.push(station(i));
  for (let i = 0; i < count; i++) {
    for (let f = 0; f < 4; f++) {
      r.poly([ring(i, f), ring(i, f + 1), ring(i + 1, f + 1), ring(i + 1, f)], f < 2 ? silk : lining);
    }
    r.cap(ring(i, 0), ring(i, 1), 0.78, 0.82, cane);
    r.cap(ring(i, 1), ring(i, 2), 0.82, 0.78, cane);
  }
  for (let i = 2; i < 4; i++) {
    const F = ribs[i],
      size = 8.6 - i * 0.65;
    r.poly([F.p(3, 0, size - 1), F.p(-4, 0, size + 7), F.p(-7, 0, size - 3)], cane);
  }
  const H = ribs[0].turn(0.17 + 0.77 * l.look).pitch(-0.07 + 0.35 * l.tired - 0.18 * l.happy);
  r.ell(H, [2, 0, 1], [10, 8, 7], paper);
  r.ell(H, [10, 0, -1], [7, 5.5, 3.8], paper);
  r.ell(H, [10, 0, -4], [5.8, 5, 1.6], lining);
  for (const s of [-1, 1]) {
    const pts: V3[] = [
      [4, s * 7, 2],
      [12, s * 4, 5],
      [4, s * 4, 8],
      [-4, s * 7, 8],
    ];
    r.poly(
      pts.map((P) => H.p(...P)),
      paper,
      0.3,
    );
    r.cap(H.p(2, 5 * s, 6), H.p(-3, 8 * s, 14), 2.4, 1.6, cane);
    r.cap(H.p(-3, s * 8, 14), H.p(-9, s * 11, 20), 1.6, 0.3, brow);
    r.cap(H.p(2, s * 7, 4), H.p(7, s * 6.5, 3), 1.4, 0.7, brow);
    const whisker = H.p(3, s * 12, -5);
    r.cap(H.p(11, s * 4, -2), whisker, 0.85, 0.65, cane);
    r.cap(whisker, H.p(-4, s * 13, -10), 0.65, 0.2, cane);
    r.dot(H.p(5, s * 7.1, 2.8), l.blink ? hx('#63413e') : eye.T[3], l.blink ? 0 : 0.3, 1, 1.4);
  }
  const finSockets: Record<string, V3> = {};
  for (const s of [-1, 1]) {
    const F = ribs[s < 0 ? 2 : 1],
      spread = Math.max(0.08, 1 + fins * 0.72);
    const tipFull = F.p(
      s < 0 ? -4 : -13,
      s * (18 + 9 * spread),
      9 + 7 * Math.sin(l.q - 0.7 + s * 0.2) + fins * 8 - l.tired * 8,
    );
    const trailFull = F.p(
      s < 0 ? -14 : -22,
      s * (12 + 7 * spread),
      -11 + 5 * Math.sin(l.q - 1.1 + s * 0.3),
    );
    const attachment = F.p(-2, s * 5, 1),
      length = sstep(-1.31, -0.67, fins);
    const tip = vlerp(attachment, tipFull, length),
      trail = vlerp(attachment, trailFull, length);
    if (length > 0.05) {
      r.poly([F.p(3, s * 4, 3), tip, F.p(-9, s * 7, -2)], paper);
      r.poly([F.p(-9, s * 7, -2), tip, trail], silk);
      if (s > 0) r.line(tip, trail, cane.T[2], 0, 0.7);
    }
    finSockets[s < 0 ? 'finL' : 'finR'] = tip;
  }
  const tail = ribs[count],
    tip = tail.p(-5, 2, -7);
  r.poly([tail.p(1, -3, 2), tail.p(-8, -5, 2), tip, tail.p(2, 2, 1)], silk);
  r.eye = H.p(5, 7.1, 2.8);
  return projectFigure(
    r,
    112,
    [53, 88],
    { head: H.p(16, 0, -1), tail: tip, ...finSockets },
    '#2a1c30',
  );
}
const creature: Creature = {
  id: 'silk_dragon',
  rarity: 'rare',
  theme: 'sky_islands',
  animations: { ...everyday, ...animations },
  effects,
  frame: (anim, t, side, variant) =>
    Object.assign(bodyFrame(anim, t, side, variant, pose(anim, t)), presentation(anim, t)),
};
export default creature;
