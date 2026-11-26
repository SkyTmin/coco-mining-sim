import type { CreatureCard } from '../bodies/card-data';
import { hx, mixc, TAU } from '../kit/f11-mobkit';
import { strideFoot } from '../motion';
import {
  F3,
  Rig,
  vadd,
  vcross,
  vdot,
  vlerp,
  vmul,
  vnorm,
  vsub,
  type Mat,
  type Tones,
  type V3,
} from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import { Px } from '../rig/px';
import type { JointPose } from '../technique';
import type { Creature, Variant } from '../types';
import { groundSteps } from './bell_magpie-steps';
import { bath, bellAt, home, poseAt, ring, walking } from './bell_magpie-keys';
import { finishSurfaces } from './surface-work';

const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const u = clamp(x);
  return u * u * (3 - 2 * u);
};
type Sockets = Record<string, V3>;
function materials(card: CreatureCard, v: Variant) {
  const gold = ['#614638', '#94703f', '#caa454', '#f2d783'].map((c) => hx(c));
  return Object.fromEntries(
    card.materials.map(({ name, tones }) => [
      name,
      {
        T: [tones[0], tones[1], tones.at(-2)!, tones.at(-1)!].map((c, i) =>
          v === 'gold' && ['mantle', 'teal', 'blue'].includes(name) ? mixc(hx(c), gold[i], 0.79) : hx(c),
        ) as Tones,
      },
    ]),
  ) as Record<string, Mat>;
}
type Colors = ReturnType<typeof materials>;
const eyeMat: Mat = { T: ['#1b2029', '#302b29', '#6c5039', '#ab834f'].map((c) => hx(c)) as Tones };
const mouth: Mat = { T: ['#432e36', '#79404b', '#bc6968', '#e3aa92'].map((c) => hx(c)) as Tones };
const catchlight = hx('#fff3d5'),
  sandColors = ['#a37751', '#e3bd83', '#f1d8a2'].map((c) => hx(c));

// A quill has two unequal vanes, a raised shaft and a tapered tip. The plane follows the joint.
function plume(r: Rig, a: V3, b: V3, width: number, across: V3, m: Mat, shaft = m.T[2]) {
  const axis = vnorm(vsub(b, a));
  const side = vnorm(vsub(across, vmul(axis, vdot(across, axis))));
  const root = vlerp(a, b, 0.14),
    middle = vlerp(a, b, 0.53),
    end = vlerp(a, b, 0.84);
  const rim = (point: V3, k: number) => vadd(point, vmul(side, width * k));
  r.poly([a, rim(root, 0.6), rim(middle, 0.87), rim(end, 0.53), b, middle], m);
  r.poly([a, middle, b, rim(end, -0.71), rim(middle, -1.12), rim(root, -0.68)], m);
  r.line(vlerp(a, b, 0.12), vlerp(a, b, 0.88), shaft);
}

function primaries(
  r: Rig,
  B: F3,
  floor: F3,
  m: Colors,
  p: JointPose,
  s: number,
  flap: number,
  grit: number,
  points: Sockets,
) {
  const suffix = s > 0 ? 'R' : 'L';
  const scoop = clamp(-(p.scoop ?? 0) * s);
  const groom = p.groom ?? 0;
  const open = Math.max(clamp((p.wing ?? 0) + (s > 0 ? 0.39 : -0.17) * groom), 0.93 * smooth(scoop / 0.21));
  if (groom && s > 0) flap = mix(flap, 0.68, groom);
  if (scoop > 0) flap = 0.99 * (1 - scoop);
  r.tag = 'wing' + suffix;
  const shoulder = B.p(-0.5, s * 4.35, 2.6);
  const elbow = vlerp(B.p(-4.3, s * 5.2, 1.7), B.p(-2, s * 9.4, 3.3 + 3.8 * flap), open);
  const wrist = vlerp(
    vlerp(B.p(-3.0, s * 5.45, 1.05), B.p(0.6, s * 14.1, 2.3 + 10.2 * flap), open),
    floor.p(0.1, s * 5.0, 2.2),
    scoop,
  );
  const across = vlerp(B.u, B.f, open);
  const ends: V3[] = [];
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    const start = vlerp(elbow, wrist, 0.14 + 0.84 * u);
    const folded = B.p(-11.8 - 6.15 * u, s * (4.5 - 1.28 * u), -2.2 - 1.42 * u);
    const spread = B.p(
      -12.4 + 9.8 * u - 3.7 * Math.sin(Math.PI * u),
      s * (12 + 14.0 * u - 2.1 * u * u),
      1.4 + flap * (9 + 7 * u) - 3.1 * (1 - u),
    );
    const dipped = floor.p(-0.8 - 2.8 * u, s * (3.1 + 1.85 * u), 0.28 + 0.42 * (1 - u));
    const end = vlerp(vlerp(folded, spread, open), dipped, scoop);
    const fanside = vlerp(across, floor.f, scoop);
    const w = 1.34 + 0.5 * open + 0.18 * scoop;
    plume(r, start, end, w, fanside, i % 3 === 1 ? m.teal : m.blue);
    if (i > 1) {
      plume(r, vlerp(start, end, 0.11), vlerp(start, end, 0.56), w * 0.83, fanside, m.snow, m.snow.T[2]);
    }
    ends.push(end);
  }
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 7; i++) {
      const u = i / 6,
        base = vlerp(shoulder, wrist, 0.09 + 0.8 * u);
      const top = vadd(base, B.v(0.65 - row * 1.1, s * (0.45 + 0.18 * row), 0.7 - 0.15 * row));
      const target = vlerp(top, ends[Math.round(8 * u)], row === 0 ? 0.47 : 0.32);
      plume(
        r,
        top,
        target,
        1.23 - row * 0.13,
        across,
        row === 1 && i < 4 ? m.snow : i % 3 === 0 ? m.blue : m.teal,
      );
    }
  r.ell(B, [-1.15, s * 4.46, 2.3], [4.8, 1.2, 2.16], m.snow);
  for (let j = 0; j < 5; j++) {
    const a = B.p(1.4 - 0.7 * j, s * (5.37 + 0.15 * Math.sin(j)), 3.65 - 0.28 * j);
    plume(r, a, vlerp(a, wrist, 0.61 + 0.045 * j), 0.87, B.u, m.snow);
  }
  if (s > 0) {
    const grooming = p.groom ?? 0;
    const start = B.p(0.72, 5.58 + 5.65 * grooming, 3.0 + 7.5 * grooming),
      end = B.p(-4.45 - 2.9 * grooming, 5.67 + 9.25 * grooming, 1.79 + 12.2 * grooming);
    if (grooming) plume(r, B.p(1.25, 4.76, 2.96), end, 1.82, B.u, m.snow);
    plume(r, start, end, 0.94 + 0.4 * grooming, B.u, grooming ? m.snow : m.teal, m.snow.T[2]);
    const shaft = vlerp(start, end, 0.14 + 0.7 * (p.comb ?? 0));
    // The upper bill follows the exposed lip of the vane. The lower bill passes underneath.
    points.comb = vadd(shaft, B.v(0, 0.54 * grooming, 0.48 * grooming));
  }
  points['wing' + suffix] = wrist;
  points['tip' + suffix] = ends[8];
  const coat = vlerp(shoulder, wrist, 0.43);
  points['dust' + suffix] = vadd(coat, B.v(0, s * 0.92, 0.77));
  for (let j = 0; j < Math.round(grit * 7); j++) {
    const spot = vadd(points['dust' + suffix], B.v(((j % 4) - 1.5) * 1.17, s * 0.5, Math.floor(j / 4) * 0.93));
    r.dot(spot, sandColors[j % 3], 0, 0.49 + (j % 2) * 0.19, 1.1);
  }
}

function train(r: Rig, B: F3, floor: F3, m: Colors, p: JointPose, n: number, points: Sockets) {
  r.tag = 'tail';
  const base = B.p(-6.8, 0, -0.4),
    spread = p.fan ?? 0;
  // Long middle pair and successively shorter outside rectrices make the ladder-shaped silhouette.
  const T = new F3(base, floor.f, floor.s, floor.u).pitch(0.22 - (p.tail ?? 0)).turn(p.tailSwing ?? 0);
  for (const i of [-4, 4, -3, 3, -2, 2, -1, 1, 0]) {
    const a = Math.abs(i) / 4,
      length = 21.7 - 5.7 * a;
    const pivot = T.at(0, i * 0.43, 0.26 * (1 - a));
    const b = pivot
      .turn(-i * (0.028 + 0.127 * spread))
      .p(-length, 0, 0.35 * Math.sin(n * 0.18 - a) * spread + a * 0.25);
    const start = pivot.o;
    plume(r, start, b, 1.2 + 0.3 * (1 - a), T.s, i % 2 ? m.blue : m.mantle);
    const high = T.v(0, 0, 0.24);
    const mid = vadd(vlerp(start, b, 0.18), high),
      end = vadd(vlerp(start, b, 0.89), high);
    plume(r, mid, end, 0.7, T.s, i % 2 ? m.blue : m.teal, i % 2 ? m.blue.T[2] : m.teal.T[3]);
    if (i === 0) points.tailTip = b;
    if (i === -4 || i === 4) points[i < 0 ? 'trainL' : 'trainR'] = b;
  }
}

function breast(r: Rig, B: F3, m: Colors) {
  r.tag = 'body';
  r.ell(B, [-0.5, 0, 0.13], [9.65, 4.95, 6.0], m.mantle);
  r.tag = 'breast';
  r.ell(B, [0.39, 0, -1.62], [8.35, 5.25, 5.94], m.snow);
  r.ell(B, [4.42, 0, 1.75], [5.4, 4.82, 5.3], m.mantle);
  for (const s of [-1, 1]) {
    for (let row = 0; row < 2; row++)
      for (let j = 0; j < 6; j++) {
        const x = -4.7 + j * 1.43,
          z = -2.5 - row * 1.28 + Math.cos(j * 0.68) * 0.45;
        const y = 4.85 * Math.sqrt(Math.max(0.1, 1 - (x / 8.8) ** 2 - (z / 6.4) ** 2));
        const root = B.p(x, s * y, z),
          tip = B.p(x - 1.7, s * (y - 0.32), z - 1.65);
        plume(r, root, tip, 0.7, B.f, m.snow, m.snow.T[(j % 2) + 1]);
      }
    for (let j = 0; j < 5; j++) {
      const x = 3.25 + j * 0.48,
        y = 3.92 - j * 0.45;
      plume(r, B.p(x, s * y, 3.12), B.p(x - 0.72, s * (y + 0.65), -0.05 + (j % 2) * 0.38), 0.76, B.f, m.mantle);
    }
  }
}

function bill(r: Rig, H: F3, m: Colors, p: JointPose, points: Sockets) {
  const open = p.open ?? 0;
  const lower = H.at(2.9, 0, -0.86).pitch(0.47 * open);
  const upTip = H.p(12.75, 0, -0.47),
    loTip = lower.p(9.65, 0, 0.18);
  r.tag = 'beak';
  for (const s of [-1, 1]) {
    const lip = H.p(4.3, s * 1.91, -0.55),
      mid = H.p(7.7, s * 1.12, -0.55);
    r.poly([H.p(3.55, 0, 1.98), H.p(7.6, 0, 1.43), upTip, mid, lip], m.bill);
    r.poly([lip, mid, upTip, H.p(3.9, 0, -0.67)], open > 0.16 ? mouth : m.bill);
    r.poly(
      [
        lower.p(1.3, s * 1.6, 0.23),
        lower.p(5, s * 0.96, 0.18),
        loTip,
        lower.p(4.0, 0, -0.76),
        lower.p(1.4, 0, -1.12),
      ],
      m.bill,
    );
    r.poly(
      [lower.p(1.3, 0, 0.26), lower.p(1.3, s * 1.6, 0.23), lower.p(5, s * 0.96, 0.18), loTip],
      open > 0.16 ? mouth : m.bill,
    );
    r.line(H.p(4.55, s * 1.68, 0.52), H.p(6.25, s * 1.18, 0.49), m.bill.T[0]);
  }
  r.line(H.p(4.65, 0, 1.54), H.p(9.65, 0, 0.67), m.bill.T[3]);
  if (p.groom) r.line(H.p(8.8, 0.16, 1.02), H.p(12.55, 0.04, -0.37), m.bill.T[3]);
  points.upperBill = upTip;
  points.lowerBill = loTip;
  points.beak = vlerp(upTip, loTip, 0.5);
}

function face(r: Rig, H: F3, m: Colors, p: JointPose, points: Sockets) {
  r.tag = 'head';
  r.ell(H, [0, 0, 0], [5.55, 4.22, 4.78], m.mantle);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const a = H.p(-2.9, s * (2.4 + i * 0.19), 2.8 - i * 0.79);
      plume(
        r,
        a,
        H.p(-5.1 - 0.15 * i, s * (2.1 + 0.12 * i), 1.5 - i * 0.83),
        0.67,
        H.u,
        i % 3 === 0 ? m.teal : m.mantle,
      );
    }
    r.tag = 'eye' + (s < 0 ? 'L' : 'R');
    const start = r.size,
      at = H.p(1.65, s * 4.19, 1.28),
      lid = p.lids ?? 0;
    r.ell(H, [1.65, s * 4.04, 1.32], [1.62, 0.49, 1.64], m.bill);
    if (lid < 0.85) {
      r.ell(H, [1.66, s * 4.42, 1.35], [1.31, 0.6, 1.32 * (1 - lid * 0.73)], eyeMat);
      r.dot(H.p(1.81, s * 4.99, 1.46), eyeMat.T[0], 0, 0.65);
      r.dot(H.p(2.04, s * 5.1, 2.0), catchlight, 0, 0.56, 1.25);
      if (vdot(H.v(0, s, 0), [0, 0.8, 0.6]) > 0.2) r.eye = at;
    } else {
      r.ell(H, [1.66, s * 4.45, 1.35], [1.25, 0.54, 1.24], m.mantle);
      r.line(H.p(0.49, s * 4.84, 1.2), H.p(2.14, s * 4.86, 1.09), m.mantle.T[0]);
    }
    r.markEye(start, s, lid < 0.85);
    points[r.tag] = at;
    r.tag = 'head';
  }
  points.head = H.o;
  points.crown = H.p(-0.1, 0, 5.26);
  bill(r, H, m, p, points);
}

function legs(
  r: Rig,
  B: F3,
  F: F3,
  m: Colors,
  p: JointPose,
  step: number,
  walk: boolean,
  pivot: number | undefined,
  points: Sockets,
  stride: number,
  footprints?: V3[],
) {
  for (const s of [-1, 1]) {
    const suffix = s < 0 ? 'L' : 'R',
      tuck = p.tuck ?? 0;
    r.tag = 'leg' + suffix;
    const strideAt = strideFoot(step, s < 0 ? 0.5 : 0, stride);
    const anchor = F.at(-0.27, s * 2.85, 0);
    let pad =
      footprints?.[s < 0 ? 0 : 1] ??
      anchor.p(walk ? strideAt.forward : 0, 0, 0.68 + (walk ? strideAt.lift * 3.6 : 0));
    if (pivot !== undefined) {
      const q = (pivot + (s < 0 ? 0.5 : 0)) % 1,
        u = clamp((q - 0.5) * 2),
        a = ((smooth(u) - q + 0.25) * Math.PI) / 4;
      pad = F.turn(a).p(-0.27, s * 2.85, 0.68 + 2.05 * Math.sin(Math.PI * u));
    }
    pad = vlerp(pad, B.p(-3.3, s * 2.9, -5.8), tuck);
    const hip = B.p(-1.2, s * 2.6, -2.5);
    const heel = vadd(vlerp(hip, pad, 0.56), F.v(-2.4, 0, 0.22));
    r.cap(hip, heel, 1.49, 0.79, m.mantle);
    r.cap(heel, pad, 0.63, 0.49, m.feet);
    for (let j = 1; j <= 4; j++) {
      const a = vlerp(heel, pad, j / 5);
      r.line(vadd(a, F.v(0.31, -0.26, 0)), vadd(a, F.v(0.41, 0.31, -0.02)), m.feet.T[2]);
    }
    r.tag = 'foot' + suffix;
    const toes = new F3(pad, F.f, F.s, F.u).pitch(-0.49 * tuck);
    for (const finger of [-1, 0, 1, 2]) {
      const back = finger === 2,
        dx = back ? -2.45 : 3.25 - 0.56 * Math.abs(finger),
        dy = back ? -0.24 : finger * 1.33;
      const mid = toes.p(dx * 0.58, dy * 0.55, -0.18),
        end = toes.p(dx, dy, -0.34 - 0.55 * (p.grip ?? 0));
      r.cap(pad, mid, 0.51, 0.39, m.feet);
      r.cap(mid, end, 0.39, 0.22, m.feet);
      r.line(end, vadd(end, F.v(back ? -0.59 : 0.65, 0, -0.2 - 0.38 * (p.grip ?? 0))), m.bill.T[3]);
    }
    points[r.tag] = pad;
  }
}

export function magpieFrame(card: CreatureCard): Creature['frame'] {
  const size = card.proportions.scale,
    paint = { normal: materials(card, 'normal'), gold: materials(card, 'gold') };
  const steps = Object.fromEntries(
    ['hatch', 'fidget_b', 'trick', 'trick_b'].map((name) => [name, groundSteps(name, card.life.yaw, size)]),
  );
  return (anim, t, side, variant, motion) => {
    const n = Math.round(24 * t),
      isWalk = anim === 'walk',
      isTurn = anim === 'turn';
    const clock = anim === 'prepare_walk' ? Math.min(t, Math.max(0, 35 / 24 - t)) : t;
    const p: JointPose = { ...poseAt(anim, clock), ...motion?.techniquePose };
    if (isWalk || isTurn) Object.assign(p, walking);
    const step = motion?.gaitPhase ?? t;
    if (anim === 'idle' || anim === 'sleep') {
      const cycle = Math.sin((t * TAU) / 3);
      p.lean = (p.lean ?? 0) + cycle * 0.23;
      p.tailSwing = 0.045 * cycle;
      if (anim === 'idle') {
        p.headTurn = cycle * 0.13;
        p.tilt = 0.07 * Math.sin((t * TAU) / 1.5);
        if (n >= 53 && n <= 58) p.lids = Math.sin(((n - 53) * Math.PI) / 5);
      }
    }
    const shake = (p.shake ?? 0) * Math.sin(n * 2.13);
    const pivot = isTurn && Number.isInteger(side) ? (t * 4) % 1 : 0;
    const yaw = card.life.yaw + ((side + pivot) * Math.PI) / 8 + (p.turn ?? 0);
    const floor = F3.yaw(yaw);
    const bob = isWalk ? 0.64 * (1 - Math.cos(2 * TAU * step)) : 0;
    const B = floor
      .at((p.lean ?? 0) + (isWalk ? 0.44 * Math.sin(TAU * step) : 0), 0, 16.4 - 9.6 * (p.low ?? 0) + bob)
      .pitch(-0.35 + 0.12 * (p.low ?? 0))
      .roll(-(p.bank ?? 0) + 0.16 * shake);
    const neck = B.p(
      6.95 + 0.76 * (p.neck ?? 0),
      8.6 * (p.groom ?? 0),
      6.25 + 1.6 * (p.neck ?? 0) + 4.4 * (p.groom ?? 0),
    );
    let H = new F3(neck, floor.f, floor.s, floor.u)
      .turn(p.headTurn ?? 0)
      .pitch(-0.05 + (p.nod ?? 0))
      .roll((p.tilt ?? 0) + 0.12 * shake);
    const r = new Rig(),
      m = paint[variant],
      points: Sockets = { root: B.o, belly: B.p(0, 0, -5), floor: [0, 0, 0] };
    r.innerInk = hx('#283640');
    breast(r, B, m);
    train(r, B, floor, m, p, n, points);
    const beat = ((n % 9) + 9) % 9;
    const stroke = beat < 3 ? 1 - 2 * smooth(beat / 3) : -1 + 2 * smooth((beat - 3) / 6);
    const airborne = clamp((p.alt ?? 0) / 8),
      flap = (stroke > 0 ? stroke * 0.76 : stroke) * airborne + 0.2 * (1 - airborne);
    for (const s of [-1, 1]) {
      const dirty =
        anim === 'trick_b' && n >= bath.strokes[0]
          ? s < 0 || n >= bath.strokes[2]
            ? clamp((114 - n) / 10)
            : 0
          : 0;
      primaries(r, B, floor, m, p, s, flap, dirty, points);
    }
    if (p.groom) {
      const goal = points.comb,
        amount = p.groom,
        front = vnorm(vlerp(H.f, vnorm(vsub(goal, neck)), amount));
      const sideAxis = vnorm(vcross([0, 0, 1], front));
      H = new F3(neck, front, sideAxis, vcross(front, sideAxis));
      H.o = vadd(neck, vmul(vsub(goal, H.p(12.75, 0, -0.47)), amount));
    }
    face(r, H, m, p, points);
    legs(
      r,
      B,
      floor,
      m,
      p,
      step,
      isWalk,
      isTurn ? t * 2 : undefined,
      points,
      card.life.stride / size,
      steps[anim]?.[n],
    );
    finishSurfaces(
      r,
      floor,
      [
        [m.bill, 'ivory'],
        [m.feet, 'strap'],
        [eyeMat, 'iris'],
        [m.snow, 'fur'],
      ],
      'fur',
    );
    scaleFigure(r, points, size, size * 1.34);
    const frame = projectFigure(r, 96, [48, 73], points, '#23313a', 3.4, true);
    frame.dy = -(p.alt ?? 0);
    frame.groundShadow = { radius: 12.2, opacity: 0.27 - 0.11 * airborne };
    if (anim === 'trick' && n >= 31 && n <= ring.clear) {
      const grip =
        smooth((n - 31) / (ring.seize - 31)) * (1 - smooth((n - ring.release) / (ring.clear - ring.release)));
      const knot = bellAt(n).knot;
      const beak = frame.points.beak;
      frame.dx = grip * (knot[0] - home[0] - p.x - beak[0] + frame.anchor[0]);
      frame.dy += grip * (knot[1] - home[1] - p.y - beak[1] + frame.anchor[1] - frame.dy);
    }
    if (anim === 'trick_b' && n >= 94 && n <= 122) {
      const row = Math.max(0, Math.ceil(frame.anchor[1] + 127 - home[1] - p.y - frame.dy));
      if (row < frame.px.h) {
        frame.over = new Px(frame.px.w, frame.px.h);
        const start = row * frame.px.w * 4;
        frame.over.data.set(frame.px.data.subarray(start), start);
      }
    }
    return frame;
  };
}
