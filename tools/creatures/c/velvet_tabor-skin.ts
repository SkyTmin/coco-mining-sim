import { F3, Rig, type V3, vadd, vlerp, vlen, vmul, vnorm, vsub } from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import { ik, TAU } from '../kit/f11-mobkit';
import { strideFoot } from '../motion';
import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import type { JointPose } from '../technique';
import { beadEye, clamp, toyPaint, type Paints, type Sockets } from './painted-toys';
import {
  ballPose,
  ballSize,
  beats,
  crown,
  footTurn,
  handPose,
  membrane,
  pocket,
  pose,
} from './velvet_tabor-poses';

const card = readCreatureCard('velvet_tabor'),
  paints = { normal: toyPaint(card, false), gold: toyPaint(card, true) };
function drum(r: Rig, d: F3, anim: string, n: number, m: Paints, pts: Sockets) {
  r.tag = 'drum';
  const point = (rad: number, a: number, z: number) =>
    d.p(6.7 * rad * Math.cos(a), 8.35 * rad * Math.sin(a), z);
  const top = (rad: number, a: number) => {
    const x = 6.7 * rad * Math.cos(a),
      y = 8.35 * rad * Math.sin(a);
    return d.p(x, y, crown + membrane(anim, n, x, y));
  };
  for (let i = 0; i < 24; i++) {
    const a = (TAU * i) / 24,
      b = (TAU * (i + 1)) / 24;
    r.poly(
      [point(0.92, a, -3.45), point(0.92, b, -3.45), point(1, b, 4.4), point(1, a, 4.4)],
      i % 4 === 3 ? m.skin : m.wood,
    );
    r.cap(point(0.94, a, -3.4), point(0.94, b, -3.4), 0.68, 0.68, m.wood);
    r.cap(point(1.02, a, 4.45), point(1.02, b, 4.45), 0.67, 0.67, m.wood);
    for (const [inner, outer] of [
      [0, 0.5],
      [0.5, 0.84],
      [0.84, 0.985],
    ]) {
      r.poly([top(inner, a), top(outer, a), top(outer, b), top(inner, b)], m.skin);
    }
    if (i % 2 === 0) {
      const eye = point(1.02, a, 3.55),
        low = point(0.95, b, -3.1);
      r.cap(eye, low, 0.27, 0.27, m.ink);
      r.cap(low, point(1.02, a + (TAU * 2) / 24, 3.55), 0.24, 0.28, m.cream);
      r.ball(eye, 0.52, m.cream);
    }
  }
  for (let j = 0; j < 24; j++) {
    const a = (TAU * j) / 24,
      e = (TAU * (j + 0.74)) / 24;
    r.cap(top(0.875, a), top(0.875, e), 0.18, 0.18, m.wood);
  }
  const hits = [...beats(anim)];
  if (anim === 'trick_b') hits.push({ at: 59, side: 0, f: 4.2, s: 2 }, { at: 89, side: 0, f: 4.15, s: -1 });
  for (const hit of hits) {
    const age = n - hit.at;
    if (age < 1 || age > 7) continue;
    const radius = 0.58 + age * 0.54;
    for (let j = 0; j < 16; j++) {
      const vertex = (a: number): V3 => [hit.f + radius * Math.cos(a), hit.s + radius * Math.sin(a), 0];
      const a = vertex((TAU * j) / 16),
        b = vertex((TAU * (j + 1)) / 16);
      if ((a[0] / 6.5) ** 2 + (a[1] / 8.1) ** 2 > 0.94 || (b[0] / 6.5) ** 2 + (b[1] / 8.1) ** 2 > 0.94)
        continue;
      a[2] = crown + 0.13 + membrane(anim, n, a[0], a[1]);
      b[2] = crown + 0.13 + membrane(anim, n, b[0], b[1]);
      r.cap(d.p(...a), d.p(...b), 0.26, 0.24, age < 5 ? m.cream : m.skin);
    }
  }
  pts.drum = d.p(0, 0, crown);
  for (const s of [-1, 1]) {
    r.tag = 'strap';
    r.cap(d.p(-4.7, s * 6.7, 7.2), d.p(-2.7, s * 8.3, 3.65), 0.9, 0.73, m.wood);
    r.ball(d.p(-2.7, s * 8.45, 3.65), 0.62, m.cream);
  }
}
function bag(r: Rig, d: F3, m: Paints, pts: Sockets) {
  const b = d.at(pocket[0], pocket[1] - 0.68, pocket[2] - 1.57);
  r.tag = 'pocket';
  pts.pocket = d.p(...pocket);
  // Open pouch on the outside of the shell. The front panel conceals only the lower third of the ball.
  for (let i = 0; i < 16; i++) {
    const a = (i * TAU) / 16,
      e = ((i + 1) * TAU) / 16;
    const edge = (u: number, z: number, k: number) => b.p(2.98 * k * Math.cos(u), 2.55 * k * Math.sin(u), z);
    r.poly([edge(a, -2.4, 0.53), edge(e, -2.4, 0.53), edge(e, 0.65, 1), edge(a, 0.65, 1)], m.trim);
    r.cap(edge(a, 0.69, 1), edge(e, 0.69, 1), 0.36, 0.36, m.cream);
    if (i % 2 === 0) r.ball(edge(a, -0.2, 0.92), 0.26, m.wood);
  }
}
function ball(r: Rig, d: F3, anim: string, n: number, m: Paints, pts: Sockets) {
  const { at, flat, roll } = ballPose(anim, n),
    b = d.at(...at).turn(roll);
  r.tag = 'ball';
  pts.ball = b.o;
  const radius = ballSize + 0.34 * flat,
    height = ballSize - 0.8 * flat;
  r.ell(b, [0, 0, 0], [radius, radius, height], m.felt);
  const seam = (a: number) => {
    const lat = 0.32 * Math.sin(2 * a + 0.4) + 0.19;
    return b.p(
      radius * 0.99 * Math.cos(a) * Math.cos(lat),
      radius * 0.99 * Math.sin(a) * Math.cos(lat),
      height * Math.sin(lat),
    );
  };
  for (let i = 0; i < 16; i++) {
    const a = (TAU * i) / 16,
      e = (TAU * (i + 1)) / 16;
    r.cap(seam(a), seam(e), 0.23, 0.24, m.cream);
  }
  r.ball(b.p(0.3, 0.2, height * 0.95), 0.42, m.cream);
}
function ear(r: Rig, h: F3, s: number, p: JointPose, wobble: number, m: Paints, pts: Sockets) {
  const k = s < 0 ? 'L' : 'R';
  const listen = s < 0 ? (p.listen ?? 0) : 0;
  const fold = p.fold ?? 0;
  const base = h
    .at(-2.35, s * 5.8, 5.0)
    .roll(s * (0.4 + 0.1 * s + 0.26 * (p.ears ?? 0) + fold * 0.53 - listen * 0.4 + wobble * 0.1))
    .pitch(-0.17 - 0.08 * s);
  const joint = base.at(-0.25, 0, 6.75);
  const tip = joint.roll(s * (0.35 + 0.42 * s + fold * 0.78 - listen * 0.75 + wobble * 0.19));
  r.tag = 'ear' + k;
  r.ell(base, [0, 0, 3.7], [2.18, 3.0, 5.6], m.coat);
  r.ell(tip, [0, 0, 3.4], [2.12, 3.02, 5.3], m.coat);
  r.ell(base, [1.25, 0, 3.45], [1.15, 2.12, 4.4], m.trim);
  r.ell(tip, [1.3, 0, 3.65], [0.94, 2.02, 4.0], m.trim);
  for (let j = 0; j < 6; j++) {
    const limb = j < 3 ? base : tip,
      u = j < 3 ? j * 0.98 + 1.4 : (j - 3) * 1.02 + 3.25;
    r.cap(limb.p(1.65, -1.62, u), limb.p(1.68, -1.59, u + 0.57), 0.25, 0.24, m.cream);
  }
  r.ell(tip, [0, 0.1, 7.23], [1.4, 1.73, 1.62], m.wood);
  pts[r.tag] = tip.p(0.1, 0, 8.52);
}
function mitten(
  r: Rig,
  d: F3,
  anim: string,
  n: number,
  s: number,
  p: JointPose,
  swing: number,
  m: Paints,
  pts: Sockets,
) {
  const k = s < 0 ? 'L' : 'R';
  let goal = handPose(anim, n, s);
  if (p.hug) goal = vlerp(goal, [-2.9, s * 7.75, 6.8], p.hug);
  const shoulder = d.p(-3.7, s * 7.45, 8.2);
  const wish = d.p(goal[0] + s * 0.66 * swing, goal[1], goal[2] + 0.3 * Math.abs(swing));
  // Fixed upper arm and forearm. A padded palm rests on the membrane at each beat.
  const delta = vsub(wish, shoulder),
    distance = vlen(delta);
  const tip = vadd(shoulder, vmul(vnorm(delta), Math.min(distance, 10.12)));
  const elbow = ik(shoulder, tip, 5.25, 5.05, d.v(-0.9, s * 1.65, 2.18));
  r.tag = 'arm' + k;
  r.cap(shoulder, elbow, 2.4, 1.82, m.coat);
  r.cap(elbow, tip, 1.8, 1.48, m.coat);
  const cuff = vlerp(elbow, tip, 0.62);
  r.ball(cuff, 1.85, m.trim);
  const pad = new F3(tip, d.f, d.s, d.u);
  r.tag = 'hand' + k;
  r.ell(pad, [0, 0, 0], [2.32, 2.22, 1.74], m.cream);
  for (const i of [-1, 0, 1])
    r.ell(pad, [1.35 - 0.28 * Math.abs(i), i * 0.84, -0.06], [1.1, 0.66, 0.85], m.cream);
  pts[r.tag] = tip;
  pts['palm' + k] = pad.p(0, 0, -1.73);
  pts['shoulder' + k] = shoulder;
  pts['elbow' + k] = elbow;
}
export const tabor: Creature['frame'] = (anim, t, side, variant, motion) => {
  const n = t * 24,
    { p, alt, spin } = pose(anim, t),
    gait = anim === 'walk' ? (motion?.gaitPhase ?? t) : undefined;
  const pivot = anim === 'turn' && Number.isInteger(side) ? (4 * t) % 1 : 0;
  const baseYaw = card.life.yaw + ((side + pivot) * Math.PI) / 8 + spin;
  const f = F3.yaw(baseYaw + (p.yaw ?? 0));
  const swing = gait === undefined ? 0 : Math.sin(TAU * gait),
    low = p.low ?? 0;
  const b = f
    .at(
      0.5 + 0.88 * low,
      0.85 * (p.weight ?? 0) + 0.48 * swing,
      12.95 - 4.8 * low + (p.breath ?? 0) + 0.36 * Math.abs(swing),
    )
    .roll(swing * 0.055)
    .pitch(0.13 * low);
  const h = b
    .at(
      -3.4 - 1.3 * (p.hug ?? 0),
      0,
      11.2 - 1.6 * low + 1.65 * (p.hug ?? 0) + (anim === 'trick_b' ? 2.7 * Math.max(0, p.nod ?? 0) : 0),
    )
    .turn(0.13 + (p.head ?? 0))
    .pitch(-0.11 + (p.nod ?? 0));
  const d = b.at(7.5, 0, -0.25).pitch(0.34);
  const r = new Rig(),
    m = paints[variant],
    pts: Sockets = { floor: [0, 0, 0], body: b.o, root: b.o, head: h.o };
  r.innerInk = m.ink.T[1];
  r.tag = 'body';
  r.ell(b, [-1.3, 0, 0.4], [8.0, 8.5, 10.8], m.coat);
  r.ell(b, [-1.35, 0, 2.6], [6.35, 7.1, 6.55], m.cream);
  r.tag = 'tail';
  const tail = b
    .at(-7.5, 0, -0.7)
    .turn(swing * 0.28)
    .pitch(0.35);
  r.ell(tail, [-3.3, 0, 1.1], [4.3, 3.65, 3.8], m.trim);
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'L' : 'R',
      stride = card.life.stride / card.proportions.scale;
    const step = gait === undefined ? undefined : strideFoot(gait, s < 0 ? 0.5 : 0, stride);
    const lift =
      (step?.lift ?? 0) * 3.2 +
      (anim === 'turn' || anim === 'hatch'
        ? 1.35 * Math.max(0, Math.sin((s < 0 ? 0.5 : 0) * TAU + (anim === 'turn' ? t * TAU * 2 : spin * 2)))
        : 0);
    const pivotStep = footTurn(anim, n, s);
    const foot = F3.yaw(baseYaw + pivotStep.angle).at(
      3.4 + (step?.forward ?? 0) + ((p.split ?? 0) * s * stride) / 4,
      s * 7.05,
      2.22 + lift + pivotStep.lift,
    );
    r.tag = 'leg' + k;
    r.cap(b.p(-0.45, s * 4.5, -4.35), foot.p(-0.3, 0, 1.5), 2.8, 2.25, m.coat);
    r.tag = 'foot' + k;
    r.ell(foot, [0.64, 0, 0], [4.45, 3.2, 2.18], m.trim);
    r.ell(foot, [2.27, 0, -0.05], [2.88, 2.9, 1.64], m.cream);
    for (let i = 0; i < 5; i++) r.dot(foot.p(2.6 + i * 0.24, -1.2 + i * 0.55, 1.27), m.wood.T[2], 0, 1);
    pts[r.tag] = foot.p(0.1, 0, -2.18);
  }
  r.tag = 'head';
  r.ell(h, [0, 0, 0], [8.55, 9.47, 8.0], m.coat);
  for (const s of [-1, 1]) {
    const brow = h.at(5.4, s * 4.6, 2.1).turn(s * 0.59);
    r.ell(brow, [0, 0, 0], [1.55, 3.05, 3.65], m.trim);
  }
  for (const s of [-1, 1]) {
    const cheek = h.at(5.1, s * 4.38, -1.7).turn(s * 0.42);
    r.tag = 'head';
    r.ell(cheek, [0, 0, 0], [3.8, 4.4, 3.22], m.cream);
    for (let j = 0; j < 4; j++)
      r.dot(cheek.p(3.1, s * (1.1 + j * 0.48), 0.6 - (j % 2) * 0.7), m.wood.T[1], 0, 1);
    const eye = h.at(6.03, s * 5.37, 2.0).turn(s * 0.65);
    beadEye(r, eye, s, p.lids ?? 0, p.nod ?? 0, m, pts, 2.95);
    r.tag = 'head';
    r.ell(eye, [0.12, 0, 3.56], [0.8, 1.72, 0.67], m.trim);
    ear(r, h, s, p, swing, m, pts);
  }
  r.tag = 'nose';
  const nose = h.at(8.35, 0, -0.86);
  r.ell(nose, [0, 0, 0], [1.56, 2.28, 1.34], m.ink);
  r.ell(nose, [1, 0, 0.48], [0.63, 0.88, 0.39], m.trim);
  pts.nose = nose.o;
  r.tag = 'head';
  if (p.yawn) r.ell(h, [7.72, 0, -3.5], [1.2, 1.45, 1.8 * p.yawn + 0.15], m.ink);
  else
    for (const s of [-1, 1])
      r.cap(h.p(8.27, 0, -2.18), h.p(8.07, s * 1.55, -2.5 + (p.smile ?? 0) * 0.35), 0.28, 0.22, m.ink);
  for (let i = 0; i < 3; i++)
    r.ell(h.at(-0.8 + i * 0.85, 0, 6.4).roll(0.32 - i * 0.32), [0, 0, 1.3], [2.1, 1.06, 2.28], m.trim);
  drum(r, d, anim, n, m, pts);
  bag(r, d, m, pts);
  ball(r, d, anim, n, m, pts);
  for (const s of [-1, 1]) mitten(r, d, anim, n, s, p, swing, m, pts);
  pts.strikeR = d.p(2.5, 4.3, crown + membrane(anim, n, 2.5, 4.3));
  pts.strikeL = d.p(1.8, -4.2, crown + membrane(anim, n, 1.8, -4.2));
  const ballLocal = ballPose(anim, n);
  pts.ballBottom = d.p(ballLocal.at[0], ballLocal.at[1], ballLocal.at[2] - ballSize + 0.8 * ballLocal.flat);
  pts.ballSkin = d.p(
    ballLocal.at[0],
    ballLocal.at[1],
    crown + membrane(anim, n, ballLocal.at[0], ballLocal.at[1]),
  );
  r.eye = pts.eyeR;
  scaleFigure(r, pts, card.proportions.scale);
  const frame = projectFigure(r, 96, [48, 78], pts, '#473852', 3.63, true);
  frame.dy = -alt;
  frame.groundShadow = { radius: 14, opacity: 0.48 - 0.15 * clamp(alt / 9) };
  return frame;
};
