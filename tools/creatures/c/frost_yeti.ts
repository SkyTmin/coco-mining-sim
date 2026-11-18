import { bodyShell, moveGrip, swingingElbow } from './frost_yeti-grip';
import route from './frost_yeti-life';
import keys from './frost_yeti-keys';
import { withTechniques } from '../technique';
import { strideFoot, attachMotion } from '../motion';
import { finishSurfaces } from './surface-work';
// Broad-backed ice quarryman. The hands and both wrists are solved from the same club shaft.
import { F3, Rig, vadd, vmul, vlerp, vsub, vnorm, vcross, type Mat, type V3 } from '../rig/f15-rig';
import { tn, TAU } from '../kit/f11-mobkit';
import { everyday, life, projectFigure, scaleFigure } from '../rig/figure';
import { animations, props, effects, pose, presentation } from './frost_yeti-actions';
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
  stride?: number;
  heel?: number;
  hip?: number;
  lean?: number;
  pitch?: number;
  twist?: number;
  clubYaw?: number;
  clubSide?: number;
  plant?: number;
  keyRig?: number;
  travel?: number;
}
export function bodyFrame(
  anim: string,
  t: number,
  side: number,
  variant: Variant,
  A: FrostPose = {},
  headSide = side,
) {
  // In profile the shoulder lifts the grip less: the serac and the long club stay distinct.
  if (A.keyRig && side % 16 !== 0) {
    const sideView = Math.min(1, 3 * Math.abs(Math.sin((side * Math.PI) / 16)));
    A = {
      ...A,
      clubAngle: (A.clubAngle ?? 0) * (anim === 'tech_roar' ? 1 - 0.55 * sideView : 1),
      clubLift: (A.clubLift ?? 0) * (1 - (anim === 'tech_icicles' ? 0.83 : 0.55) * sideView),
      clubForward: (A.clubForward ?? 0) * (1 - (anim === 'tech_icicles' ? 0.65 : 0.22) * sideView),
      hip: (A.hip ?? 0) * (1 - 0.3 * sideView),
      lean: (A.lean ?? 0) * (1 - 0.28 * sideView),
      crouch:
        Math.max(0, A.crouch ?? 0) +
        Math.min(0, A.crouch ?? 0) * (1 - 0.8 * sideView) +
        (anim === 'tech_slam' ? 0.14 * Math.max(0, A.clubLift ?? 0) * sideView : 0),
      pitch: (A.pitch ?? 0) * (1 - 0.2 * sideView),
    };
  }
  const lead = Math.max(-0.62, Math.min(0.62, ((((headSide - side + 24) % 16) - 8) * Math.PI) / 8));
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
  const torso = F.at(-2 + (A.hip ?? 0), 1.5 * l.walk + (A.lean ?? 0), 47 + bounce - drop)
    .pitch(0.06 + 0.12 * l.tired + 0.14 * l.sleep + (A.pitch ?? 0))
    .turn(A.twist ?? 0);
  r.tag = 'torso';
  r.ell(torso, [-2, 0, 0], [16, 22, 23], coat);
  r.ell(torso, [-4, 0, 10], [15, 26, 13], coat);
  const hips = F.at(-5 + (A.hip ?? 0) * 0.65, (A.lean ?? 0) * 0.7, 25 - drop * 0.37);
  r.tag = 'hips';
  r.ell(hips, [0, 0, 0], [13, 15, 13], coat);
  r.tag = 'belt';
  r.ell(hips, [2, 0, 2], [13.7, 15.3, 3.4], leather);
  const sockets: Record<string, V3> = {},
    planted: string[] = [];
  const scale = 1.23;
  for (const s of [-1, 1]) {
    const stride =
      anim === 'walk'
        ? strideFoot(t, s < 0 ? 0 : 0.5, 26 / scale)
        : { forward: 0, lift: 0, planted: true };
    const move = stride.lift,
      step = F.at(
        1 + stride.forward - s * (A.stride ?? 0),
        s * 13,
        move * 6 + (s > 0 ? (A.heel ?? 0) : 0),
      );
    if (stride.planted) planted.push(s < 0 ? 'footL' : 'footR');
    const knee = F.p(
      3 + move * 2 + (A.hip ?? 0) * 0.65 - s * (A.stride ?? 0) * 0.5,
      s * 11 + (A.lean ?? 0) * 0.65,
      14 - drop * 0.28,
    );
    r.tag = s < 0 ? 'legL' : 'legR';
    r.cap(hips.p(0, s * 8, 1), knee, 7, 6.4, slate);
    r.cap(knee, step.p(-2, 0, 4), 6.6, 5.7, coat);
    r.ell(step, [2, 0, 3], [9.5, 6.3, 3.3], slate);
    r.ell(step, [7, 0, 3.5], [4.4, 5.8, 2.5], coat);
    sockets[s < 0 ? 'footL' : 'footR'] = step.p(6, 0, 0);
  }
  const lockLight: Mat = {
    T: gold
      ? tn('#665046', '#a68568', '#ddbc8f', '#fff1b8')
      : tn('#52677c', '#8c9da6', '#d2d9d3', '#fff7db'),
  };
  const browBlack: Mat = { T: tn('#252a39', '#333945', '#434755', '#5b6266') };
  const amber: Mat = { T: tn('#614a41', '#ba793c', '#efb244', '#ffe49a'), glow: 0.36 };
  // Four overlapping curls sweep from the crown to the outer mantle. Their overlapping dark edges
  // are visible as separate tapered forms even in the two oblique rear views.
  r.tag = 'torso';
  for (const side of [-1, 1])
    for (const [x, lat, z] of [
      [-9, 9, 21],
      [-3, 14, 20.5],
      [3, 18, 18.5],
      [7, 20, 14.3],
    ]) {
      const base = torso.at(x, side * lat, z);
      r.cap(base.p(0, -side, 0), base.p(-1, side * 4, -4), 3.7, 2.8, lockLight);
      r.cap(base.p(-1, side * 4, -4), base.p(1.5, side * 7, -11), 2.8, 0.5, lockLight);
      r.line(base.p(-2, side * 5, -5), base.p(0.2, side * 7, -10), coat.T[0], 0, 0.6);
    }
  const H = torso
    .at(14, 0, 14)
    .turn(0.45 * l.look + (A.headTurn ?? 0) + lead * 0.62)
    .pitch(0.15 * l.sleep + 0.13 * l.tired - 0.22 * (A.jaw ?? 0));
  r.tag = 'head';
  r.ell(H, [0, 0, 0], [9.5, 11.3, 10.2], coat);
  // A bare brow mask breaks the shag. The eyes lie on its forward, upward-facing plane.
  const face: Mat = {
    T: gold
      ? tn('#42343c', '#735344', '#ae8264', '#c9ab81')
      : tn('#333a51', '#495268', '#718295', '#99a4ac'),
    pat(q) {
      if (
        q[0] > 0.49 &&
        q[2] > 0.28 &&
        q[2] < 0.66 &&
        Math.abs(q[1]) > 0.29 &&
        Math.abs(q[1]) < 0.82
      ) {
        return !l.blink && q[2] > 0.39 && q[2] < 0.54 && Math.abs(q[1]) < 0.64
          ? ice.T[3]
          : slate.T[0];
      }
      return null;
    },
  };
  r.ell(H, [7.7, 0, 1.3], [6.8, 10, 7.7], face);
  const jaw = A.jaw ?? 0;
  r.ell(H, [10.9, 0, -3.9 - jaw * 2.4], [4.7, 7.4, 2.9 + jaw], {
    T: tn('#292835', '#393346', '#6f4c56', '#995f63'),
  });
  r.ell(H, [13.2, 0, 0.3], [3.5, 5.1, 2.6], slate);
  for (const s of [-1, 1]) {
    r.cap(H.p(11.4, s * 1.9, 7.1), H.p(9.4, s * 7.8, 9.4), 2.4, 2.0, browBlack);
    const E = H.at(12.5, s * 5.3, 5.8);
    r.ell(E, [0, 0, 0], [2.7, 2.25, l.blink ? 0.65 : 2.0], l.blink ? browBlack : amber);
    if (!l.blink) {
      r.cap(E.p(1.6, s * 0.7, 0.8), E.p(2.3, s * 0.85, -0.3), 0.65, 0.6, browBlack);
      r.dot(E.p(1.2, s * 1.5, 1.6), bone.T[3], 0.3, 1, 1);
    }

    r.cap(H.p(12.1, s * 5.7, -4.4 - jaw * 2), H.p(13.4, s * 6.2, -0.8 - jaw * 2), 1.15, 0.15, bone);
    const tuft = H.p(0, s * 9.4, -0.3);
    r.cap(tuft, H.p(1, s * 10, -8), 3.2, 0.4, coat);
  }
  sockets.mouth = H.p(15.3, 0, -4.6 - jaw);
  r.eye = H.p(12.9, 5.7, 5.5);
  // The right shoulder is a calved serac: blocks of translucent ice, an asymmetric high ridge.
  for (const s of [-1, 1]) {
    r.tag = 'torso';
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
    r.tag = 'head';
    r.cap(H.p(-1, s * 8, 4), H.p(-3, s * 12, -3), 3.4, 0.3, coat);
  }
  const S = torso.at(-3, 23, 13).roll(0.27);
  r.tag = 'serac';
  r.ell(S, [0, 0, -1], [9, 9, 6.8], slate);
  for (const [x, y, z, h, w] of [
    [-6, 1, 1, 18, 5.5],
    [1, 1, 2, 23, 5],
    [6, -2, 2, 13, 4.2],
  ]) {
    const high = S.p(x - 3, y + 3, z + h);
    r.poly([S.p(x - 3, y - 3, z), S.p(x + w, y - 3, z), high], ice);
    r.poly([S.p(x + w, y - 3, z), S.p(x + w, y + 2, z), high], bright);
    r.poly([S.p(x + w, y + 2, z), S.p(x - 3, y + 1, z), high], ice);
  }
  r.tag = 'belt';
  const tuck = A.keyRig ? Math.max(0, (A.crouch ?? 0) - 8) : 0;
  const belt = hips.at(9 + tuck * 0.35, 6, 3 - tuck * 0.52);
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
    5 + (A.clubSide ?? 0),
    27 - drop * 0.56 + (A.clubLift ?? 0) + 1.4 * Math.sin(l.q),
  ).turn(A.clubYaw ?? 0);
  let dir = G.v(0.38 * Math.cos(angle), -0.925 * Math.cos(angle), Math.sin(angle));
  // At full plant the same club (and both grips) is lowered until the head touches the ground.
  if (A.plant) {
    G.o[2] -= A.plant * (G.o[2] + 53 * dir[2]);
    G.o[1] -= A.plant * (G.o[1] + 53 * dir[1] - sockets.footL[1]);
  }
  const active = anim.startsWith('tech_') || anim === 'happy' || anim === 'hatch';
  const swing = anim === 'hatch' ? Math.max(0, A.clubAngle ?? 0) : Math.abs(A.clubAngle ?? 0);
  const adjustment = active
    ? Math.min(
        1,
        swing +
          Math.abs(A.clubYaw ?? 0) +
          Math.abs(A.chestBeat ?? 0) +
          0.13 * Math.abs(A.clubLift ?? 0),
      )
    : 0;
  const shell = adjustment > 0 ? bodyShell(r) : [];
  if (adjustment > 0) {
    // Keep the tip target (including its floor plane), and pivot the rear handle
    // towards clear space in front of the chest. Both hands follow the same rigid shaft.
    const tip = vadd(G.o, vmul(dir, 53));
    const desired = moveGrip(shell, G.o, dir, F.f);
    const tryDir = vnorm(vsub(tip, desired));
    dir = vnorm(vlerp(dir, tryDir, adjustment));
    G.o = vsub(tip, vmul(dir, 53));
  }
  const shaft = (n: number) => vadd(G.o, vmul(dir, n));
  r.tag = 'club';
  r.cap(shaft(-11), shaft(29), 2.5, 2.3, leather);
  for (const n of [0, 4, 8]) r.cap(shaft(n), shaft(n + 1.4), 2.7, 2.65, slate);
  // Club has parallel planes and a chipped flat end, unlike a spherical hammer.
  const originalAcross = G.v(0.925, 0.38, 0);
  const up =
    adjustment > 0
      ? vnorm(vcross(dir, originalAcross))
      : G.v(-0.38 * Math.sin(angle), 0.925 * Math.sin(angle), Math.cos(angle));
  const across = adjustment > 0 ? vnorm(vcross(up, dir)) : originalAcross;
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
    r.poly([v(32, a, 8), v(32, b, 8), v(53, b, 5.2), v(53, a, 5.2)], i % 3 === 1 ? bright : blue);
  }
  r.poly(
    Array.from({ length: faces }, (_, i) =>
      edge(53, 5.2 * Math.cos((i * TAU) / faces), 5.2 * Math.sin((i * TAU) / faces)),
    ),
    bright,
  );
  sockets.clubGrip = G.o;
  sockets.clubTip = shaft(53);
  for (const s of [-1, 1]) {
    r.tag = s < 0 ? 'armL' : 'armR';
    const socketShoulder = torso.p(1, s * 22, 6),
      grip = shaft(s > 0 ? -5 : 7);
    const hand =
      s > 0 ? vlerp(grip, torso.p(17, 17, 0), Math.max(A.chestBeat ?? 0, l.happy)) : grip;
    // Protract the shoulder as the arm approaches full extension. The reserved
    // bend keeps the elbow from snapping straight at the two-link reach limit.
    const gap = vsub(hand, socketShoulder);
    const distance = Math.hypot(...gap);
    const extend = (adjustment * Math.max(0, distance - 40)) / (distance || 1);
    const shoulder = vadd(socketShoulder, vmul(gap, extend));
    const restElbow = vadd(vlerp(shoulder, grip, 0.48), F.v(-4, s * 13, -8));
    const E =
      adjustment > 0
        ? vlerp(restElbow, swingingElbow(shell, shoulder, hand, F, s), adjustment)
        : restElbow;
    sockets[s > 0 ? 'clubGripR' : 'clubGripL'] = grip;
    sockets[s > 0 ? 'handR' : 'handL'] = hand;
    r.cap(shoulder, E, 10, 8.5, coat);
    r.cap(E, hand, 8.5, 5, coat);
    for (const [a, b] of [
      [-0.5, 7],
      [0.5, 5],
    ]) {
      const lock = vadd(E, F.v(a * 8, s * 7.7, 3));
      r.cap(lock, vadd(lock, F.v(-2, s * 3.6, -b * 1.5)), 3.4, 0.35, lockLight);
    }
    r.ball(hand, 4.7, slate);
    r.cap(vadd(hand, F.v(1, -s * 2, 2)), vadd(hand, F.v(4, s, 1)), 1.8, 1.3, slate);
  }
  r.tag = 'head';
  // A bruised blue nose, cream tusks and rime at the visible ends of the long facial locks.
  for (const s of [-1, 1]) {
    r.ell(H, [15.4, s * 2, 0.8], [1.2, 1.2, 0.88], slate);
    r.dot(H.p(15.9, s * 2.2, 1.15), slate.T[0]);
    r.line(H.p(10.4, s * 3, 7.55), H.p(7.9, s * 6.7, 8.7), coat.T[3]);
    for (let j = 0; j < 3; j++) {
      const tuft = H.p(-3 + j * 2.8, s * (8.4 + j * 0.2), 1 + j * 0.22);
      r.cap(
        tuft,
        H.p(-3 + j * 2.8, s * (10.7 + j * 0.25), -6 - j * 0.8),
        1.8 - j * 0.18,
        0.25,
        coat,
      );
    }
  }
  r.tag = 'serac';
  // Seminatural striations in the serac, three ice-screws and the belt's square buckle.
  for (const [x, y, z, h] of [
    [-5, 2, 4, 10],
    [1, 0, 5, 13],
    [6, -1, 5, 6],
  ]) {
    r.line(S.p(x - 1, y + 1, z), S.p(x - 2.2, y + 2, z + h), bright.T[2], 0.28, 0.75);
    r.line(S.p(x - 1.3, y + 1, z + 2), S.p(x - 2.8, y + 2.7, z + h * 0.7), ice.T[0], 0, 0.6);
  }
  r.tag = 'belt';
  const buckle = hips.at(11, 8, 3);
  r.ell(buckle, [0, 0, 0], [3.2, 4.4, 2.7], bone);
  r.ell(buckle, [2.3, 0.2, 0.2], [1.6, 2.5, 1.5], leather);
  r.cap(buckle.p(3, -1, 0), buckle.p(4, 1.8, 0.4), 0.6, 0.55, bone);
  for (const s of [-1, 0, 1]) r.ball(hips.p(12, 4 + s * 3.2, 3), 1.3, bone);
  r.ell(belt, [0.8, 0, 2], [2.6, 3.4, 1.3], leather);
  r.dot(belt.p(2, 1, 2.4), bright.T[2], 0.1);
  r.tag = 'club';
  for (let j = 0; j < 3; j++) {
    const end = shaft(-8 + j * 4);
    r.cap(end, vadd(end, F.v(-0.6, 0, -1.3)), 2.7, 2.3, bone);
  }
  r.line(edge(33, 2, 6), edge(40, 0, 4.1), bright.T[3], 0.3, 0.7);
  r.line(edge(40, 0, 4.1), edge(46, 2.8, 3.1), ice.T[1], 0.15, 0.7);
  for (let j = 0; j < 3; j++) r.dot(edge(35 + j * 3, 3 - j, 5.2), bright.T[3], 0.31);
  finishSurfaces(
    r,
    F,
    [
      [coat, 'fur'],
      [lockLight, 'ivory'],
      [amber, 'iris'],
      [browBlack, 'lacquer'],
      [slate, 'granite'],
      [face, 'granite'],
      [ice, 'ice'],
      [blue, 'ice'],
      [bright, 'ice'],
      [leather, 'strap'],
      [bone, 'ivory'],
    ],
    'lacquer',
  );
  scaleFigure(r, sockets, scale, 1.275);
  const fr = projectFigure(r, 128, [63, 100], sockets, '#272a3b');
  fr.planted = planted;
  fr.dx = A.travel ?? 0;
  fr.dy = -(A.lift ?? 0) - l.pop * 7;
  return fr;
}
const creature: Creature = {
  id: 'frost_yeti',
  rarity: 'epic',
  theme: 'polar_night',
  animations: { ...everyday, ...animations },
  props,
  effects,
  frame: (anim, t, side, variant, motion) =>
    motion?.techniquePose
      ? bodyFrame(anim, t, side, variant, { ...motion.techniquePose, keyRig: 1 }, motion.headSide)
      : Object.assign(
          bodyFrame(anim, t, side, variant, pose(anim, t), motion?.headSide),
          presentation(anim, t),
        ),
};
export default attachMotion(withTechniques(creature, keys), route);
