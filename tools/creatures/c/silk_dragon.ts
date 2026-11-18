import { attachMotion } from '../motion';
import route from './silk_dragon-life';
import { finishSurfaces } from './surface-work';
// The silk body is stretched between bamboo ribs. Each side keeps its dark lining on a turn.
import { F3, Rig, vdot, vsub, vlerp, type V3, type Mat } from '../rig/f15-rig';
import { hx, tn, TAU, sstep } from '../kit/f11-mobkit';
import { everyday, life, projectFigure, scaleFigure } from '../rig/figure';
import { animations, effects, pose, presentation } from './silk_dragon-actions';
import type { Creature, Variant } from '../types';

// Warp and weft follow the four corners of each individual kite panel.
function woven(ink: Mat, trim: Mat, a: V3, b: V3, d: V3): Mat {
  const u = vsub(d, a),
    v = vsub(b, a),
    uu = vdot(u, u),
    vv = vdot(v, v),
    uv = vdot(u, v);
  const det = uu * vv - uv * uv;
  if (det < 0.001) return ink;
  const warp: V3 = [0, 0, 0],
    weft: V3 = [0, 0, 0];
  for (let j = 0; j < 3; j++) {
    warp[j] = (u[j] * vv - v[j] * uv) / det;
    weft[j] = (v[j] * uu - u[j] * uv) / det;
  }
  const offU = vdot(a, warp),
    offV = vdot(a, weft);
  return {
    T: ink.T,
    pat(P, L) {
      const x = vdot(P, warp) - offU,
        y = vdot(P, weft) - offV;
      if (x > 0 && x < 0.085) return trim.T[L > 0.4 ? 2 : 1];
      if (y > 0.085 && y < 0.15) return trim.T[L > 0.4 ? 2 : 1];
      const lozenge = Math.abs(x - 0.52) * 1.5 + Math.abs(y - 0.55) * 1.7;
      if (lozenge > 0.28 && lozenge < 0.43) return trim.T[L > 0.45 ? 2 : 1];
      if (lozenge < 0.12) return trim.T[L > 0.55 ? 3 : 2];
      return null;
    },
  };
}

export interface SilkPose {
  curl?: number;
  lunge?: number;
  tailSwing?: number;
  fins?: number;
  lift?: number;
  tilt?: number;
}
export function bodyFrame(
  anim: string,
  t: number,
  side: number,
  variant: Variant,
  A: SilkPose = {},
  headSide = side,
) {
  const lead = Math.max(-0.62, Math.min(0.62, ((((headSide - side + 24) % 16) - 8) * Math.PI) / 8));
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
  const ridge: Mat = {
    T: g
      ? tn('#947242', '#cda45b', '#f3cf78', '#fff1ad')
      : tn('#a25147', '#c96c51', '#e98d68', '#ffb681'),
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
      (31 - 73 * u) * (1 - Math.max(0, fold) * 0.63 + Math.min(0, curl) * 0.27) +
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
      4.5 * (1 - u) ** 3 +
      2 * Math.sin(u * TAU) +
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
    const tangent = -Math.atan((14 * TAU * Math.sin(u * TAU + 0.05)) / 73);
    return root
      .at(...pos)
      .pitch(0.7 * tangent * (1 - loop) - Math.atan2(Math.cos(angle), Math.sin(angle)) * loop);
  }
  const ring = (j: number, s: number): V3 => {
    const F = ribs[j],
      u = j / count;
    const mid = Math.sin(Math.PI * u);
    const ry = (11.4 + 6.7 * mid - 7 * u) * (1 - 0.18 * l.hatch),
      rz = 10.5 + 7 * mid - 6.8 * u;
    const theta = (s * Math.PI) / 3;
    return F.p(0, ry * Math.cos(theta), rz * Math.sin(theta));
  };
  for (let i = 0; i <= count; i++) ribs.push(station(i));
  for (let i = 0; i < count; i++) {
    for (let f = 0; f < 6; f++) {
      const faces = [ring(i, f), ring(i, f + 1), ring(i + 1, f + 1), ring(i + 1, f)];
      const panel = f === 1 ? ridge : f < 3 ? silk : lining;
      r.poly(faces, woven(panel, cane, faces[0], faces[1], faces[3]));
    }
  }
  const crest = ribs[2];
  r.poly([crest.p(4, 0, 10), crest.p(-4, 0, 21), crest.p(-9, 0, 9)], cane);
  const H = ribs[0]
    .turn(0.17 + 0.77 * l.look + lead * 0.82)
    .pitch(-0.07 + 0.35 * l.tired - 0.18 * l.happy);
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
  r.poly([tail.p(1, -3, 2), tail.p(-11, -6, 4), tail.p(-8, -5, 1), tip, tail.p(2, 2, 1)], silk);
  r.poly([tail.p(0, 0, 0), tail.p(-7, 5, 1), tail.p(-12, 6, -2), tail.p(-5, 0, -3)], cane);
  // A ceremonial collar with separate overlapping scales; the bamboo hoop stands proud of the cheek.
  for (const side of [-1, 1]) {
    for (let j = 0; j < 3; j++) {
      const C = H.at(-3.5 - j * 1.6, side * (5 + j * 0.6), j * 1.3 - 1);
      r.ell(C, [0, 0, 0], [2.7, 1.5, 2.1], j % 2 ? cane : lining);
    }
    r.ell(H, [6.4, side * 6.9, 3.6], [2.4, 1.8, 2.0], l.blink ? brow : eye);
    r.dot(H.p(7.8, side * 7.6, 4.0), brow.T[0], 0, 1, 1.5);
    if (!l.blink) r.dot(H.p(7.1, side * 7.8, 5.0), paper.T[3], 0.33, 1, 1.6);
    r.ell(H, [13.5, side * 2.9, 1.2], [2.0, 1.1, 1.25], brow);
    r.line(H.p(11, side * 4, -2), H.p(16, side * 1.8, -1.8), silk.T[2], 0, 1.1);
    r.ell(H, [2.8, side * 8, 1.4], [1.6, 0.85, 1.3], lining);
    const fin = ribs[side < 0 ? 2 : 1];
    r.ell(fin, [-2, side * 6, 2], [2, 2, 2], cane);
    r.dot(fin.p(-2, side * 7.9, 3), brow.T[0]);
    for (let j = 0; j < 3; j++)
      r.line(
        fin.p(-2 - j * 1.6, side * (6 + j * 0.7), 1 - j * 0.6),
        fin.p(-3 - j * 1.6, side * (7 + j * 0.7), -j * 0.6),
        cane.T[2],
      );
  }
  for (let j = 1; j < count; j++) {
    const F = ribs[j],
      zw = 8 + Math.sin((j / count) * Math.PI) * 5 - (4 * j) / count;
    r.ell(F, [0, 0, zw], [1.8, 1.5, 1.7], cane);
    r.dot(F.p(0.3, 0.3, zw + 1.4), brow.T[1]);
  }
  const knot = tail.at(-8.4, 0, -3);
  r.ell(knot, [0, 0, 0], [3.4, 4.1, 3.3], lining);
  r.ell(knot, [-2.8, 0, -1.5], [1.7, 3.55, 2.7], cane);
  const lag = Math.sin(l.q - 0.92);
  for (let j = 0; j < 3; j++) {
    const start = knot.p(-2.5, (j - 1) * 1.55, -2.9),
      bend = knot.p(-5 + (j - 1) * 1.2, (j - 1) * 3, -6.2 + lag);
    const end = knot.p(-4.5 + (j - 1) * 4, (j - 1) * 5, -11.8 + j * 0.6 + lag * 1.7);
    r.cap(start, bend, 1.25, 1.05, j === 1 ? paper : silk);
    r.cap(bend, end, 1.05, 0.28, j === 1 ? paper : cane);
  }
  r.eye = H.p(7.2, 7.8, 4);
  const sockets = { head: H.p(16, 0, -1), tail: tip, ...finSockets };
  finishSurfaces(
    r,
    root,
    [
      [paper, 'paper'],
      [silk, 'brocade'],
      [lining, 'brocade'],
      [ridge, 'brocade'],
      [cane, 'bamboo'],
      [brow, 'lacquer'],
      [eye, 'iris'],
    ],
    'lacquer',
  );
  scaleFigure(r, sockets, 1.06 * (1 - 0.22 * l.hatch), 1.66 * (1 - 0.42 * l.hatch));
  return projectFigure(r, 128, [61, 96], sockets, '#2a1c30');
}
const creature: Creature = {
  id: 'silk_dragon',
  rarity: 'rare',
  theme: 'sky_islands',
  animations: { ...everyday, ...animations },
  effects,
  frame: (anim, t, side, variant, motion) =>
    Object.assign(
      bodyFrame(anim, t, side, variant, pose(anim, t), motion?.headSide),
      presentation(anim, t),
    ),
};
export default attachMotion(creature, route);
