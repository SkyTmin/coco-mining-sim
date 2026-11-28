import { readCreatureCard } from '../bodies/card-data';
import { strideFoot } from '../motion';
import { F3, Rig, vadd, vlerp, type V3 } from '../rig/f15-rig';
import { projectFigure } from '../rig/figure';
import type { Creature } from '../types';
import { clamp, ease, toyPaint, type Paints, type Sockets } from './painted-toys';
import { frames, magnetFrame, pullDistance, starStep, yaw } from './pocket_magnet-poses';

const card = readCreatureCard('pocket_magnet');
const palette = { normal: toyPaint(card, false), gold: toyPaint(card, true) };
type Stage = ReturnType<typeof frames>;

function horseshoe(r: Rig, q: Stage, anim: string, m: Paints, pts: Sockets) {
  const { root, elbow, wrist, join, at, pole } = magnetFrame(anim, q);
  r.tag = 'tail';
  let prev = root;
  for (let i = 1; i <= 17; i++) {
    const u = i / 17,
      v = 1 - u;
    const next = root.map(
      (x, k) => x * v ** 3 + 3 * elbow[k] * v * v * u + 3 * wrist[k] * v * u * u + join[k] * u ** 3,
    ) as V3;
    r.cap(prev, next, 3.75 - (1.6 * (i - 1)) / 17, 3.75 - 1.6 * u, m.coat);
    prev = next;
  }
  pts.tail = join;
  r.tag = 'magnet';
  // Cast enamel band: an open arch and two squared poles. Its hole always has real depth.
  for (let i = 0; i < 13; i++) {
    const a = (i * Math.PI) / 13,
      b = ((i + 1) * Math.PI) / 13;
    const rim = (angle: number, rad: number, d: number) => at(rad * Math.cos(angle), -rad * Math.sin(angle), d);
    r.poly([rim(a, 8.3, 1.8), rim(b, 8.3, 1.8), rim(b, 3.6, 1.8), rim(a, 3.6, 1.8)], m.enamel);
    r.poly([rim(a, 8.3, -1.8), rim(b, 8.3, -1.8), rim(b, 8.3, 1.8), rim(a, 8.3, 1.8)], m.enamel);
    r.poly([rim(a, 3.6, 1.8), rim(b, 3.6, 1.8), rim(b, 3.6, -1.8), rim(a, 3.6, -1.8)], m.enamel);
    r.poly([rim(a, 3.6, -1.8), rim(b, 3.6, -1.8), rim(b, 8.3, -1.8), rim(a, 8.3, -1.8)], m.enamel);
    if (i > 6 && i < 12) r.line(rim(a, 7.48, 1.86), rim(b, 7.48, 1.86), m.enamel.T[3], 0, 0.48);
  }
  for (const s of [-1, 1]) {
    const inner = s * 3.6,
      outer = s * 8.3;
    for (const [z0, z1, material] of [
      [0, 2, m.enamel],
      [2, 5.6, m.steel],
    ] as const) {
      const A = at(inner, z0, 1.8),
        B = at(outer, z0, 1.8),
        C = at(outer, z1, 1.8),
        D = at(inner, z1, 1.8);
      const a = at(inner, z0, -1.8),
        b = at(outer, z0, -1.8),
        c = at(outer, z1, -1.8),
        d = at(inner, z1, -1.8);
      r.poly([A, B, C, D], material);
      r.poly([b, a, d, c], material);
      r.poly([B, b, c, C], material);
      r.poly([a, A, D, d], material);
      r.poly([C, c, d, D], material);
    }
    r.line(at(inner, 2.25, 1.83), at(outer, 2.25, 1.83), m.steel.T[0]);
    r.line(at(inner, 5.3, 1.84), at(outer, 5.3, 1.84), m.steel.T[3]);
  }
  pts.magnet = pts.pole = pole;
}
function cheekAndEyes(r: Rig, q: Stage, m: Paints, pts: Sockets) {
  const { h, p } = q;
  r.tag = 'head';
  r.ell(h, [0, 0, 0], [18.4, 22.3, 17.4], m.coat);
  pts.head = h.o;
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'L' : 'R';
    const ear = h.at(-4.5, s * 13.4, 10.2).roll(s * (-0.23 - 0.16 * (p.ears ?? 0) - 0.06 * q.trot));
    r.tag = 'ear' + k;
    for (let j = 0; j < 5; j++) {
      const height = j * 1.85,
        radius = 7.25 - j * 1.1;
      r.ell(ear, [-0.2 * j, s * 0.39 * j, height], [radius * 0.72, radius, 5.4 - j * 0.68], m.coat);
      r.ell(
        ear,
        [2.74 - 0.52 * j, s * (0.21 * j + 0.32), height + 0.1],
        [1.84 - j * 0.23, radius * 0.57, 2.8 - j * 0.36],
        m.stripe,
      );
    }
    pts[r.tag] = ear.p(-1.1, s * 1.5, 9.8);
    r.tag = 'muzzle';
    r.ell(h, [10.7, s * 6.6, -4.4], [7.85, 11, 7.4], m.cream);
    for (const [dy, dz] of [
      [-1.5, 0.7],
      [0.65, 1.9],
      [2.13, -0.12],
      [-0.2, -1.0],
    ]) {
      const g = h.at(14.42, s * (11.25 + dy), -3.25 + dz).turn(s * 0.73);
      r.ell(g, [1.22, 0, 0], [0.94, 0.88, 0.79], m.blush);
    }
    const eye = h.at(15.2, s * 10.4, 4.6).turn(s * 0.48);
    r.tag = 'eye' + k;
    const start = r.size,
      open = 1 - clamp(p.lids ?? 0);
    if (open > 0.16) {
      r.ell(eye, [0.42, 0, 0], [2.1, 3.57, 4.45 * open], m.ink);
      r.ell(eye, [1.49, 0, -0.2 * open], [1.35, 2.79, 3.6 * open], m.iris);
      r.ell(eye, [2.24, 0, 0.26 * open], [1.0, 2.29, 2.91 * open], m.ink);
      r.ball(eye.p(3.0, -0.94, 1.5 * open), 1.01 * open, m.cream);
      if (open > 0.72) r.ball(eye.p(3.02, 0.92, -1.13 * open), 0.5, m.cream);
    } else {
      r.cap(eye.p(1.49, -2.7, 0.12), eye.p(2.16, 0, -0.86), 0.47, 0.58, m.ink);
      r.cap(eye.p(2.16, 0, -0.86), eye.p(1.49, 2.7, 0.17), 0.58, 0.44, m.ink);
    }
    pts[r.tag] = eye.p(2.25, 0, 0);
    r.markEye(start, s, open > 0.25);
  }
  r.tag = 'muzzle';
  r.ell(h, [17.45, 0, -1.9], [2.8, 3.15, 2.05], m.ink);
  r.line(h.p(19.35, -0.85, -0.66), h.p(19.56, 0.33, -0.7), m.steel.T[2]);
  const mouth = h.at(17.82, 0, -5.12);
  r.line(h.p(19, 0, -2.91), mouth.o, m.ink.T[0]);
  const open = p.open ?? 0;
  if (open > 0.08) {
    r.ell(mouth, [0, 0, -0.62], [0.67, 2.25, 1 + open * 2.1], m.ink);
    r.ell(mouth, [0.59, 0, -1.21 - open * 0.43], [0.3, 1.37, 0.52], m.blush);
  }
  for (const s of [-1, 1]) {
    const c = mouth.p(-0.25, s * 2.05, -0.85);
    r.line(mouth.o, c, m.ink.T[0]);
    r.line(c, mouth.p(-0.64, s * 3.72, 0.22), m.ink.T[0]);
  }
  pts.muzzle = h.p(19.4, 0, -1.9);
  // The forehead marking follows the dome instead of standing up like a horn.
  r.tag = 'diamond';
  const marking = (u: number, edge: number) => {
    const phi = 0.48 + 0.76 * u,
      width = 0.36 * (1 - Math.abs(2 * u - 1)),
      a = width * edge;
    return h.p(19.08 * Math.cos(phi) * Math.cos(a), 23.03 * Math.cos(phi) * Math.sin(a), 18.1 * Math.sin(phi));
  };
  for (let i = 0; i < 6; i++) {
    const u = i / 6,
      v = (i + 1) / 6;
    for (const sign of [-1, 1])
      r.poly([marking(u, 0), marking(u, sign), marking(v, sign), marking(v, 0)], m.cream);
  }
  pts.diamond = marking(0.5, 0);
}
function soles(r: Rig, anim: string, q: Stage, gait: number | undefined, m: Paints, pts: Sockets) {
  const { p, f, n, progress } = q;
  for (const s of [-1, 1]) {
    const suffix = s < 0 ? 'L' : 'R';
    const step = gait === undefined ? null : strideFoot(gait, s > 0 ? 0.5 : 0, card.life.stride);
    let foot = f.at(
      6.2 + (step?.forward ?? 0),
      s * 11.0,
      3 + (step?.lift ?? 0) * 3.9 + Math.max(0, p.step ?? 0) * (s < 0 ? 3.6 : 0),
    );
    if (anim === 'trick' || anim === 'trick_b') {
      const fish = anim === 'trick',
        active = fish ? s < 0 : s > 0,
        stage = active ? ease(0.02, 0.45, progress) : ease(0.55, 0.98, progress);
      const endX = fish ? 9 : -3,
        endY = fish ? 2 : 1;
      const begin = F3.yaw(yaw).p(6.2, s * 11.0, 3);
      const end = F3.yaw(yaw + (fish ? -0.1 : 0.02)).p(6.2, s * 11.0, 3);
      const location = vlerp(begin, vadd(end, [endX, endY / 0.6, 0]), stage);
      if (!fish) {
        const travel = starStep(n);
        const support = s < 0 ? ease(0, 0.45, travel) : ease(0.55, 1, travel);
        location[0] += pullDistance * support;
        location[2] += 3.2 * Math.sin(Math.PI * support);
      }
      location[0] -= q.x;
      location[1] -= q.y / 0.6;
      location[2] += 3.4 * Math.sin(Math.PI * stage);
      foot = F3.yaw(yaw + (fish ? -0.1 : 0.02) * stage, location);
    }
    const seated = p.rest ?? 0;
    foot = foot
      .at(
        seated * 8.8,
        0,
        seated * 2.5 + (anim === 'turn' ? 1.2 * Math.max(0, Math.sin((n * Math.PI) / 6 + (s * Math.PI) / 2)) : 0),
      )
      .pitch(seated * -0.91);
    r.tag = 'foot' + suffix;
    r.ell(foot, [-0.45, 0, 1.1], [7.45, 6.05, 4.42], m.coat);
    if (seated > 0.04) r.ell(foot, [1.45, 0, -2.6], [3.45, 3.4, 1.1], m.stripe);
    for (let j = -1; j <= 1; j++) {
      r.ell(foot, [3.52 - 0.65 * Math.abs(j), j * 2.42, -0.15], [4.18, 1.97, 2.75], m.coat);
      if (seated > 0.04) r.ell(foot, [5.6, j * 2.18, -2.0], [1.49, 1.17, 0.72], m.trim);
    }
    pts[r.tag] = foot.p(1.05, 0, -2.82);
  }
}
export const magnetCub: Creature['frame'] = (anim, t, side, variant, motion) => {
  const gait = anim === 'walk' ? (motion?.gaitPhase ?? t) : undefined,
    q = frames(anim, t, side, gait);
  const { b, h, p } = q,
    m = palette[variant],
    r = new Rig(),
    pts: Sockets = { floor: [0, 0, 0], root: b.o, body: b.o };
  r.innerInk = m.ink.T[0];
  r.tag = 'body';
  r.ell(b, [-1, 0, 0], [17.1, 20.0, 21.7], m.coat);
  r.tag = 'belly';
  r.ell(b, [9.15, 0, -0.8], [8.95, 13.1, 16.9], m.cream);
  for (const s of [-1, 1]) {
    r.tag = 'body';
    for (let band = 0; band < 2; band++) {
      let previous: V3 | undefined;
      for (let j = 0; j < 10; j++) {
        const u = j / 9,
          x = -13 + 11.8 * u,
          z = 3.25 - 7.7 * band + 4.4 * u;
        const side = 20 * Math.sqrt(Math.max(0.05, 1 - ((x + 1) / 17.1) ** 2 - (z / 21.7) ** 2));
        const v = b.p(x, s * side, z);
        if (previous)
          r.cap(previous, v, 0.56 + Math.sin((Math.PI * (j - 1)) / 9), 0.62 + Math.sin(Math.PI * u), m.stripe);
        previous = v;
      }
    }
  }
  r.tag = 'collar';
  for (let i = 0; i < 15; i++) {
    const a = (i * 2 * Math.PI) / 15,
      fringe = b
        .at(15.0 * Math.cos(a) + 0.53, 17.5 * Math.sin(a), 16.5 + 1.0 * Math.cos(2 * a))
        .turn(a)
        .pitch(0.24);
    r.ell(fringe, [0, 0, 0], [3.75, 5.05, 5.25 + (i % 2) * 0.65], m.trim);
    r.line(fringe.p(2.55, -0.65, 1.35), fringe.p(3.35, -0.42, -0.15), m.trim.T[2], 0, 0.33);
  }
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'L' : 'R',
      reach = s < 0 ? (p.rub ?? 0) : 0;
    const shoulder = b.p(7.4, s * 14.4, 12.6 + reach * 3.8),
      rest = b.p(11.5, s * 16.2, 5.8);
    const reachTo = h.p(17.45, s * 12.35, -6.7);
    const end = vlerp(rest, reachTo, reach);
    end[0] += facingShift(q.f.f[0], s, q.trot);
    end[1] += facingShift(q.f.f[1], s, q.trot);
    end[2] += (p.paw ?? 0) * 5.0;
    r.tag = 'paw' + k;
    const hand = F3.yaw(Math.atan2(q.f.f[1], q.f.f[0]), end);
    r.cap(shoulder, end, 4.65, 3.99, m.coat);
    r.ell(hand, [0, 0, 0], [3.78, 4.05, 4.27], m.coat);
    for (let j = -1; j <= 1; j++) r.ell(hand, [1.61, s * j * 1.28, -1.25], [2.08, 1.2, 2.45], m.coat);
    pts[r.tag] = end;
  }
  soles(r, anim, q, gait, m, pts);
  cheekAndEyes(r, q, m, pts);
  horseshoe(r, q, anim, m, pts);
  r.eye = pts.eyeL;
  const result = projectFigure(r, 96, [48, 79], pts, '#26303e', 5.1, true);
  result.dy = -q.alt;
  result.groundShadow = { radius: 17.2, opacity: 0.6 - 0.2 * clamp(q.alt / 15) };
  return result;
};
function facingShift(component: number, side: number, trot: number) {
  return component * side * trot * 1.8;
}
