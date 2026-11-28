import { F3, Rig, type V3 } from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import { strideFoot } from '../motion';
import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { beadEye, clamp, toyPaint, type Paints, type Sockets } from './painted-toys';
import { bodyFrames, scale } from './apricot_bubbler-poses';
import { authoredFoot } from './apricot_bubbler-steps';
import { TAU } from '../kit/f11-mobkit';

const card = readCreatureCard('apricot_bubbler'),
  paints = { normal: toyPaint(card, false), gold: toyPaint(card, true) };
export const mouthLength = 7.3;
function coronet(r: Rig, h: F3, crest: number, m: Paints, pts: Sockets) {
  r.tag = 'crest';
  // Three rounded glass droplets grow from a continuous ridge along the back of the head.
  for (let i = 0; i < 3; i++) {
    const z = h.at(-5.2 + 3.4 * i, 0, 6.65 + 0.55 * i).pitch(-0.43 - 0.08 * i + crest * 0.19);
    const tall = 5.2 + i * 1.9;
    r.ell(z, [0, 0, tall * 0.42], [2.65 - i * 0.17, 3.45 - i * 0.18, tall * 0.68], m.trim);
    r.ell(z, [0.5, 0, tall * 0.86], [1.98, 2.56, tall * 0.43], m.trim);
    for (const s of [-1, 1]) {
      r.cap(z.p(0.83, s * 2.2, tall * 0.42), z.p(0.61, s * 1.55, tall * 1.08), 0.58, 0.3, m.cream);
      r.ball(z.p(0.65, s * 1.25, tall * 1.12), 0.62, m.cream);
    }
    if (i === 2) pts.crest = z.p(0, 0, tall * 1.28);
  }
}
function nozzle(r: Rig, tube: F3, open: number, m: Paints, pts: Sockets) {
  r.tag = 'mouth';
  r.ell(tube, [2.5, 0, 0], [4.6, 3.65, 3.5], m.coat);
  const wide = 1 + 0.16 * open;
  r.ell(tube, [5.72, 0, 0], [1.64, 4.05 * wide, 3.85 * wide], m.trim);
  r.ell(tube, [6.96, 0, 0], [0.64, 3.3 * wide, 3.01 * wide], m.ink);
  r.ell(tube, [7.02, 0, -0.68], [0.55, 1.98 * wide, 1.15 * wide], m.blush);
  const rim = (a: number) => tube.p(mouthLength, 3.94 * wide * Math.cos(a), 3.72 * wide * Math.sin(a));
  for (let i = 0; i < 24; i++) {
    const a = (i * TAU) / 24,
      b = ((i + 1) * TAU) / 24;
    r.cap(rim(a), rim(b), 0.8, 0.8, m.trim);
    if (i > 1 && i < 9)
      r.cap(
        tube.p(7.64, 3.99 * wide * Math.cos(a), 3.8 * wide * Math.sin(a)),
        tube.p(7.64, 3.99 * wide * Math.cos(b), 3.8 * wide * Math.sin(b)),
        0.27,
        0.29,
        m.cream,
      );
  }
  pts.lip = tube.p(7.48, 0, 0);
  pts.mouth = pts.lip;
  pts.axis = tube.p(11, 0, 0);
}
function tailCurl(r: Rig, b: F3, curl: number, wag: number, m: Paints, pts: Sockets) {
  r.tag = 'tail';
  const f = b
    .at(-9, 0, 0.7)
    .turn(0.24 + 0.9 * wag)
    .pitch(-0.06);
  let last = f.p(0, 0, 0);
  for (let i = 1; i <= 18; i++) {
    const u = i / 18,
      l = 14 * u;
    // At rest the tail turns up; during the gesture its tip winds towards the haunch.
    const a = u * (2.38 + 0.53 * curl),
      radius = 8.7 - 4.4 * u;
    const q = f.p(
      -l * 0.62 - radius * Math.sin(a),
      u * (1.55 + curl * 2.4),
      radius * (1 - Math.cos(a)) + curl * 4.25 * u,
    );
    const w = 3.32 - 2.0 * u;
    r.cap(last, q, w + 0.11, w, i < 11 ? m.coat : m.trim);
    if (i % 2 === 0) r.ball([q[0], q[1], q[2] + w * 0.72], 0.62, m.cream);
    last = q;
  }
  r.ball(last, 1.35, m.trim);
  pts.tail = last;
}
export const bubbler: Creature['frame'] = (anim, t, side, variant, motion) => {
  const gait = anim === 'walk' ? (motion?.gaitPhase ?? t) : undefined;
  const { p, f, b, h, tube, trot, alt, jog } = bodyFrames(anim, t, side, gait);
  const m = paints[variant],
    r = new Rig(),
    pts: Sockets = { floor: [0, 0, 0], root: b.o };
  r.innerInk = m.ink.T[1];
  r.tag = 'body';
  r.ell(b, [-1.4, 0, 0], [12.3, 9.0, 10.4], m.coat);
  pts.body = b.o;
  r.tag = 'belly';
  r.ell(b, [2.4, 0, -2.5], [8.8, 8.35, 7.28], m.cream);
  for (const s of [-1, 1]) {
    r.tag = 'body';
    for (let i = 0; i < 7; i++) {
      const fwd = -8.0 + i * 2.3,
        z = 2.3 + 0.95 * Math.cos(i * 0.85);
      const face = b.at(fwd, s * (7.5 + 0.8 * Math.sin(i * 0.56)), z).turn(s * 1.13);
      r.ell(face, [0, 0, 0], [0.85, 1.05, 1.36], i % 3 === 0 ? m.trim : m.cream);
      r.ball(face.p(0.42, 0.55, -2.4), 0.53, m.blush);
    }
    // Two open pearl rosettes follow the curve of each haunch instead of facing the camera.
    for (const [x, z, rad] of [
      [-6.4, -0.5, 1.65],
      [-0.9, 0.1, 1.15],
    ]) {
      const rosette = b.at(x, s * (8.75 - 0.025 * (x + 1.4) ** 2), z);
      for (let i = 0; i < 13; i++) {
        const a = (TAU * (i + 1)) / 16,
          beta = (TAU * (i + 2)) / 16;
        r.cap(
          rosette.p(rad * Math.cos(a), 0, rad * Math.sin(a)),
          rosette.p(rad * Math.cos(beta), 0, rad * Math.sin(beta)),
          0.35,
          0.34,
          i < 5 ? m.cream : m.blush,
        );
      }
    }
    for (const front of [-1, 1]) {
      const k = (front > 0 ? 'F' : 'H') + (s < 0 ? 'L' : 'R');
      const swing =
        gait !== undefined || jog > 0
          ? strideFoot(gait ?? t * 1.82, front * s > 0 ? 0 : 0.5, card.life.stride / scale)
          : null;
      const turnLift =
        anim === 'turn' ? 1.45 * Math.max(0, Math.sin(TAU * (t * 2 + (front * s > 0 ? 0 : 0.5)))) : 0;
      const weight = gait === undefined ? jog : 1;
      const stride =
        (swing?.forward ?? 0) * weight + ((p.split ?? 0) * front * s * card.life.stride) / (4 * scale);
      const choreo = authoredFoot(anim, t, front, s),
        tuck = alt > 0 ? 1.15 * (alt / 12) : 0;
      const foot = choreo
        ? F3.yaw(
            choreo.angle + (side * Math.PI) / 8,
            F3.yaw((side * Math.PI) / 8).p(choreo.x, choreo.y, 2.3 + choreo.lift + tuck),
          )
        : f.at(front * 7.65 + stride, s * 6.02, 2.3 + (swing?.lift ?? 0) * 3.2 * weight + turnLift + tuck);
      r.tag = 'leg' + k;
      r.cap(b.p(front * 6.65, s * 5.55, -3.3), foot.p(-0.55, 0, 1.3), 3.65, 2.45, m.coat);
      r.tag = 'foot' + k;
      r.ell(foot, [0, 0, 0.05], [4.05, 3.12, 2.18], m.coat);
      for (const j of [-1, 0, 1]) {
        r.ell(foot, [2.5 - 0.33 * Math.abs(j), j * 1.25, -0.21], [1.68, 1.04, 1.37], m.cream);
        r.dot(foot.p(3.35, j * 1.25, 0.83), m.cream.T[3], 0, 1);
      }
      for (let j = 0; j < 2; j++) r.ball(foot.p(1.2 - j * 0.87, s * 2.2, 1.04 + j * 0.23), 0.43, m.blush);
      pts[r.tag] = foot.p(0, 0, -2.22);
    }
  }
  r.tag = 'head';
  r.ell(h, [0, 0, 0], [9.5, 10.4, 8.85], m.coat);
  pts.head = h.o;
  for (const s of [-1, 1]) {
    const ear = h.at(-5.5, s * 7.8, 4.1).roll(s * (1.1 + (p.ear ?? 0) * 0.48 + trot * 0.08));
    r.tag = 'ear' + (s < 0 ? 'L' : 'R');
    r.ell(ear, [0, s * 0.67, 1.4], [2.72, 3.23, 4.04], m.coat);
    r.ell(ear, [1.64, s * 1.05, 2.1], [1.14, 2.48, 2.76], m.blush);
    r.tag = 'cheek' + (s < 0 ? 'L' : 'R');
    const fat = p.cheek ?? 0,
      cheek = h.at(4.05, s * (6.38 + Math.max(0, fat) * 1.26), -1.63);
    r.ell(cheek, [0, 0, 0], [4.7 + fat * 1.25, 4.28 + fat * 2.44, 4.1 + fat * 1.85], m.cream);
    for (let i = 0; i < 5; i++)
      r.ball(
        cheek.p(2.6 + 0.55 * Math.sin(i * 1.4), s * (2.7 + fat * 1.9), -0.7 + (i % 3) * 0.68),
        0.47,
        m.blush,
      );
    pts[r.tag] = cheek.o;
    const eye = h.at(5.6, s * 6.2, 3.75).turn(s * 0.71);
    beadEye(r, eye, s, p.lids ?? 0, p.nod ?? 0, m, pts, 3.0);
    r.tag = 'head';
    r.ell(eye, [0.05, -s * 0.2, 3.65], [0.87, 1.95, 0.8], m.cream);
  }
  nozzle(r, tube, p.open ?? 0, m, pts);
  tailCurl(r, b, (p.tail ?? 0) + trot * 0.32, p.wag ?? 0, m, pts);
  coronet(r, h, (p.crest ?? 0) - trot * 0.18, m, pts);
  r.eye = pts.eyeR;
  scaleFigure(r, pts, scale);
  const frame = projectFigure(r, 96, [48, 76], pts, '#514259', 3.65, true);
  frame.dy = -alt;
  frame.groundShadow = { radius: 17, opacity: 0.65 - 0.24 * clamp(alt / 12) };
  return frame;
};
