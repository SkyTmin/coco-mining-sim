// Broad-backed ice quarryman. The hands and both wrists are solved from the same club shaft.
import { F3, Rig, vadd, vmul, vlerp, type Mat, type V3 } from '../rig/f15-rig';
import { hx, tn, TAU } from '../kit/f11-mobkit';
import { everyday, life, projectFigure } from '../rig/figure';
import { animations, effects, pose, presentation } from './frost_yeti-actions';
import type { Creature, Variant } from '../types';

export interface FrostPose {
  clubAngle?: number;
  clubForward?: number;
  clubLift?: number;
  crouch?: number;
  jaw?: number;
  chestBeat?: number;
  headTurn?: number;
  lift?: number;
}
export function bodyFrame(
  anim: string,
  t: number,
  side: number,
  variant: Variant,
  A: FrostPose = {},
) {
  const gold = variant === 'gold',
    r = new Rig(),
    l = life(anim, t, 3.2);
  const coat: Mat = {
    T: gold
      ? tn('#65494b', '#97735b', '#cfa475', '#ffe0ac')
      : tn('#45536b', '#8093a2', '#c1cccd', '#f4f0dc'),
  };
  // Curved locks travel with the hide; only their tips cast a dark notch.
  coat.pat = (q, L) => {
    const y = q[2] * 8 + Math.sin(q[0] * 11 + q[1] * 5) * 0.9;
    if (y - Math.floor(y) > 0.77 && Math.sin(q[1] * 16 + q[0] * 7 + y * 0.9) > 0.64 && L > 0.2)
      return coat.T[L > 0.65 ? 2 : 1];
    return null;
  };
  const slate: Mat = {
    T: gold
      ? tn('#45383d', '#765144', '#a97950', '#d4a776')
      : tn('#333747', '#525767', '#737a8b', '#9192a1'),
  };
  const ice: Mat = { T: tn('#435f83', '#618eab', '#8ad1d8', '#d5f5e8'), glow: 0.17 };
  const bright: Mat = { T: tn('#53738a', '#81bdca', '#c1eee6', '#f4feef'), glow: 0.34 };
  const leather: Mat = {
    T: gold
      ? tn('#583d3e', '#937047', '#c69451', '#f4ce7c')
      : tn('#42353f', '#70524d', '#95735a', '#b69770'),
  };
  const bone: Mat = { T: tn('#756774', '#a9a4a0', '#dbd5bd', '#f6eacb') };
  const F = F3.yaw(1.06 + (side * TAU) / 16).at(-3, 0, 0);
  const bounce = 0.75 * Math.sin(l.q) + 1.8 * Math.abs(l.walk);
  const drop = (A.crouch ?? 0) + 11 * l.sleep + 11 * l.tired + 25 * l.hatch;
  const torso = F.at(-2, 1.5 * l.walk, 47 + bounce - drop).pitch(
    0.06 + 0.12 * l.tired + 0.14 * l.sleep,
  );
  r.ell(torso, [-2, 0, 0], [16, 22, 23], coat);
  r.ell(torso, [-4, 0, 10], [15, 26, 13], coat);
  const hips = F.at(-5, 0, 25 - drop * 0.37);
  r.ell(hips, [0, 0, 0], [13, 15, 13], coat);
  r.ell(hips, [2, 0, 2], [13.7, 15.3, 3.4], leather);
  const sockets: Record<string, V3> = {};
  for (const s of [-1, 1]) {
    const move = Math.max(0, l.walk * s),
      step = F.at(1 + 3 * move, s * 13, move * 5);
    const knee = F.p(3 + move * 2, s * 11, 14 - drop * 0.28);
    r.cap(hips.p(0, s * 8, 1), knee, 7, 6.4, slate);
    r.cap(knee, step.p(-2, 0, 4), 6.6, 5.7, coat);
    r.ell(step, [2, 0, 3], [9.5, 6.3, 3.3], slate);
    r.ell(step, [7, 0, 3.5], [4.4, 5.8, 2.5], coat);
    sockets[s < 0 ? 'footL' : 'footR'] = step.p(6, 0, 0);
  }
  const H = torso
    .at(14, 0, 14)
    .turn(0.45 * l.look + (A.headTurn ?? 0))
    .pitch(0.15 * l.sleep + 0.13 * l.tired - 0.22 * (A.jaw ?? 0));
  r.ell(H, [0, 0, 0], [9.5, 11.3, 10.2], coat);
  r.ell(H, [6.7, 0, -1], [5.8, 9, 6.4], slate);
  const jaw = A.jaw ?? 0;
  r.ell(H, [8.8, 0, -4.2 - jaw * 2.4], [4.4, 7, 2.9 + jaw], {
    T: tn('#292835', '#393346', '#6f4c56', '#995f63'),
  });
  r.ell(H, [10, 0, -1.5], [3.5, 5.4, 2.4], slate);
  for (const s of [-1, 1]) {
    r.cap(H.p(9, s * 3, 2), H.p(5, s * 8, 4.5), 2.4, 1.9, coat);
    r.dot(H.p(9.2, s * 6.2, 1.7), l.blink ? slate.T[0] : hx('#beeaf1'), 0.15, 1, 1.6);
    r.cap(H.p(9, s * 5.7, -4.8 - jaw * 2), H.p(10, s * 6.2, -1.6 - jaw * 2), 1.15, 0.15, bone);
    const tuft = H.p(0, s * 9.4, -0.3);
    r.cap(tuft, H.p(1, s * 10, -8), 3.2, 0.4, coat);
  }
  sockets.mouth = H.p(12.3, 0, -4.6 - jaw);
  r.eye = H.p(9.2, 6.2, 1.7);
  // The right shoulder is a calved serac: blocks of translucent ice, an asymmetric high ridge.
  for (const s of [-1, 1]) {
    const base = torso.at(-2, s * 21, 10);
    r.poly(
      [
        base.p(-6, 0, 5),
        base.p(5, 0, 4),
        base.p(3, s * 4, -7),
        base.p(0, s, -3),
        base.p(-4, s * 4, -8),
      ],
      coat,
    );
    r.cap(H.p(-1, s * 8, 4), H.p(-3, s * 12, -3), 3.4, 0.3, coat);
  }
  const S = torso.at(-3, 23, 13).roll(0.27);
  r.ell(S, [0, 0, -1], [9, 9, 6.8], slate);
  for (const [x, y, z, h, w] of [
    [-6, 1, 1, 18, 5.5],
    [1, 1, 2, 23, 5],
    [6, -2, 2, 13, 4.2],
  ]) {
    const P = S.p(x, y, z),
      high = S.p(x - 3, y + 3, z + h);
    r.poly([S.p(x - 3, y - 3, z), S.p(x + w, y - 3, z), high], ice);
    r.poly([S.p(x + w, y - 3, z), S.p(x + w, y + 2, z), high], bright);
    r.poly([S.p(x + w, y + 2, z), S.p(x - 3, y + 1, z), high], ice);
  }
  const belt = hips.at(9, 6, 3);
  sockets.belt = belt.o;
  for (const [s, len] of [
    [-3, 7],
    [1, 10],
    [5, 8],
  ])
    r.cap(belt.p(0, s, 0), belt.p(0, s + 0.7, -len), 1.8, 0.22, bright);
  const angle =
    0.68 + (A.clubAngle ?? 0) + 0.055 * Math.sin(l.q - 0.8) + 0.34 * l.sleep - 0.66 * l.tired;
  const G = F.at(
    15 + (A.clubForward ?? 0),
    5,
    27 - drop * 0.56 + (A.clubLift ?? 0) + 1.4 * Math.sin(l.q),
  );
  const dir = G.v(0.38 * Math.cos(angle), -0.925 * Math.cos(angle), Math.sin(angle));
  const shaft = (n: number) => vadd(G.o, vmul(dir, n));
  r.cap(shaft(-11), shaft(29), 2.5, 2.3, leather);
  for (const n of [0, 4, 8]) r.cap(shaft(n), shaft(n + 1.4), 2.7, 2.65, slate);
  // Club has parallel planes and a chipped flat end, unlike a spherical hammer.
  const across = G.v(0.925, 0.38, 0),
    up = G.v(-0.38 * Math.sin(angle), 0.925 * Math.sin(angle), Math.cos(angle));
  function edge(n: number, a: number, b: number) {
    return vadd(shaft(n), vadd(vmul(across, a), vmul(up, b)));
  }
  const faces = 5;
  const blue: Mat = { T: tn('#34476d', '#48779e', '#76b5d1', '#b7e3ea'), glow: 0.17 };
  for (let i = 0; i < faces; i++) {
    const a = (i * TAU) / faces,
      b = ((i + 1) * TAU) / faces;
    const v = (n: number, u: number, rr: number) => edge(n, rr * Math.cos(u), rr * Math.sin(u));
    r.poly([v(22, a, 3), v(22, b, 3), v(32, b, 8), v(32, a, 8)], blue);
    r.poly([v(32, a, 8), v(32, b, 8), v(48, b, 5.2), v(48, a, 5.2)], i % 3 === 1 ? bright : blue);
  }
  r.poly(
    Array.from({ length: faces }, (_, i) =>
      edge(48, 5.2 * Math.cos((i * TAU) / faces), 5.2 * Math.sin((i * TAU) / faces)),
    ),
    bright,
  );
  sockets.clubGrip = G.o;
  sockets.clubTip = shaft(48);
  for (const s of [-1, 1]) {
    const shoulder = torso.p(1, s * 22, 6),
      grip = shaft(s > 0 ? -5 : 7);
    const elbow = vlerp(shoulder, grip, 0.48);
    const bend = F.v(-4, s * 13, -8);
    const E = vadd(elbow, bend);
    const hand = s > 0 ? vlerp(grip, torso.p(10, 4, 9), Math.max(A.chestBeat ?? 0, l.happy)) : grip;
    r.cap(shoulder, E, 10, 8.5, coat);
    r.cap(E, hand, 8.5, 5, coat);
    for (const [a, b] of [
      [-0.5, 7],
      [0.5, 5],
    ]) {
      const lock = vadd(E, F.v(a * 5, s * 5.5, 2));
      r.cap(lock, vadd(lock, F.v(-2, s * 2, -b)), 2.9, 0.2, coat);
    }
    r.ball(hand, 4.7, slate);
    r.cap(vadd(hand, F.v(1, -s * 2, 2)), vadd(hand, F.v(4, s, 1)), 1.8, 1.3, slate);
  }
  const fr = projectFigure(r, 112, [55, 92], sockets, '#272a3b');
  fr.dy = -(A.lift ?? 0) - l.pop * 7;
  return fr;
}
const creature: Creature = {
  id: 'frost_yeti',
  rarity: 'epic',
  theme: 'polar_night',
  animations: { ...everyday, ...animations },
  effects,
  frame: (anim, t, side, variant) =>
    Object.assign(bodyFrame(anim, t, side, variant, pose(anim, t)), presentation(anim, t)),
};
export default creature;
