// Tailored wool and feather tracts are material coordinates: they turn with the bird.
import { F3, Rig, vadd, vsub, vmul, vlerp, vnorm, type V3, type Mat } from '../rig/f15-rig';
import { tn } from '../kit/f11-mobkit';
import { goalAt } from '../bodies/goals';
import { finishSurfaces } from './surface-work';
import { projectFigure, scaleFigure } from '../rig/figure';
import type { ArmedAppearance } from '../bodies/armed-biped';
import type { JointPose } from '../technique';
import { readCreatureCard } from '../bodies/card-data';

const card = readCreatureCard('penguin_marshal');
function fabric(a: string, b: string, c: string, d: string, texture = 0): Mat {
  const T = tn(a, b, c, d);
  return {
    T,
    pat(q, l) {
      if (!texture) return null;
      const seam = Math.sin(q[0] * 24 + q[1] * 13 + q[2] * 36) * Math.sin(q[1] * 32 - q[2] * 17);
      if (seam > 0.59) return T[l > 0.65 ? 3 : l > 0.1 ? 2 : 1];
      return null;
    },
  };
}
const navy = fabric('#18202d', '#27354a', '#40516a', '#677892', 1);
const coal = fabric('#111721', '#222832', '#384253', '#596478', 1);
const cream = fabric('#9b9393', '#cec4b4', '#eadfca', '#fff4dc', 1);
const gold = fabric('#895621', '#c48a38', '#edb64e', '#ffe59b');
const ochre = fabric('#8c4c2c', '#c97532', '#e49838', '#ffbd58');
const red = fabric('#622f36', '#92444b', '#b9534f', '#e36d5e');
const ice = fabric('#34698a', '#549aba', '#94dce9', '#e2ffff');
const eye = fabric('#090d16', '#11151a', '#1d2527', '#2a3136');
const frostWhite = ice.T[3];
export const marshalFigure: NonNullable<ArmedAppearance['figure']> = (anim, t, side, variant, A, gait) => {
  const r = new Rig(),
    j: Record<string, V3> = {};
  const a = (k: string) => A[k] ?? 0;
  const sleep = a('nest'),
    tired = gait.tired;
  const slide = anim === 'tech_slide',
    leap = anim === 'tech_leap';
  const F = F3.yaw(card.life.yaw + (side * Math.PI) / 8 - (slide ? 0.46 : 0) * Math.max(0, a('pitch')));
  const pitch = a('pitch') + a('bow') + 0.24 * tired;
  const jump = a('jump') + Math.max(0, a('lift')) * 0.56;
  const bellyZ =
    33 -
    (slide ? 12 * Math.max(0, pitch) : 0) -
    sleep * 7 -
    tired * 4 -
    a('squat') -
    Math.max(0, a('crouch')) * 0.35;
  const root = F.at(0, 0, jump),
    B = root
      .at(0, 0, bellyZ + a('stretch') + gait.breath * 0.75)
      .pitch(pitch)
      .roll(gait.roll + a('roll'))
      .turn(a('twist') * 0.42);
  const shoulders = B.at(0, 0, 15 - sleep * 5);
  const H = B.at(2 + sleep * 5, 0, 28 - sleep * 13 + Math.max(0, pitch) * 3)
    .turn(a('gaze'))
    .pitch(a('nod') - 0.32 - 0.88 * Math.max(0, pitch));
  const penguinGold = variant === 'gold' ? gold : coal;
  const flat = (basis: F3, pts: V3[], m: Mat) =>
    r.poly(
      pts.map((v) => basis.p(...v)),
      m,
    );
  r.tag = 'torso';
  r.ell(B, [0, 0, 0], [17, 19, 28 - sleep * 5], navy);
  r.tag = 'coat';
  r.ell(B, [-8, 0, -7], [12, 17, 23 - sleep * 5], navy);
  r.tag = 'tail';
  r.spike(B.p(-13, 0, -17), B.v(-1, 0, -0.35), 11, 6, coal);
  r.tag = 'breast';
  r.ell(B, [9, 0, 1], [13.5, 16, 25 - sleep * 5], cream);
  for (const s of [-1, 1]) {
    r.tag = 'coat';
    r.ell(B, [3, s * 11, 1], [13.4, 8.8, 24 - sleep * 4], navy);
    const lapel: V3[] = [
      [14, s * 8, 22],
      [19, s * 10, 15],
      [18, s * 12, 13],
      [21, s * 8, 7],
      [20, s * 9, -4],
      [15, s * 12, -14],
    ];
    flat(B, [[6, s * 8, 23], ...lapel, [12, s * 15, -13], [11, s * 18, 4]], navy);
    for (let n = 1; n < lapel.length; n++) r.cap(B.p(...lapel[n - 1]), B.p(...lapel[n]), 1.15, 0.95, red);
    r.tag = 'pocket';
    r.cap(B.p(12, s * 14, -8), B.p(7, s * 17, -9), 1.5, 1.1, coal);
    r.tag = 'coat';
    flat(
      B,
      [
        [-11, s * 14, -12],
        [-17, s * 10, -25],
        [-6, s * 12, -22],
      ],
      navy,
    );
  }
  for (const z of [5, -3]) {
    r.tag = 'button';
    const button = B.at(20.3, 8.1, z);
    r.ball(button.o, 2.35, gold);
    r.line(button.p(1.5, 1.1, 0.65), button.p(1.9, -0.15, -0.55), gold.T[0]);
  }
  r.tag = 'head';
  r.ell(H, [0, 0, 0], [13.5, 12.9, 14.8], penguinGold);
  for (const s of [-1, 1]) {
    r.tag = 'cheek';
    r.ell(H, [-1.8, s * 11.1, -5], [7.2, 4.2, 6.6], gold);
    r.tag = 'eye' + (s < 0 ? 'L' : 'R');
    const e = H.at(8, s * 10.4, 5.3);
    j[r.tag] = e.o;
    const start = r.prims.length;
    if (a('blink') < 0.79) {
      r.ball(e.o, 2.7, eye);
      r.dot(e.p(0.7, s * 2, 1.1), cream.T[3], 0, 1.7);
      r.markEye(start, s, true);
    } else r.line(e.p(-2, 0, 0.25), e.p(2, 0, 0.25), coal.T[0]);
  }
  j.head = H.o;
  r.eye = j.eyeR;
  r.tag = 'bill';
  const beak = H.at(11, 0, 0);
  r.spike(beak.o, H.v(1, 0, -0.06), 16, 4.8, ochre, 4, Math.PI / 4);
  r.spike(beak.p(12, 0, -0.6), H.v(1, 0, -0.25), 5, 2.1, coal);
  r.line(beak.p(1, 3.9, -0.7), beak.p(11, 1.3, -1.5), coal.T[1]);
  const gape = anim === 'happy' ? Math.max(a('clap') * 0.45, a('stretch') * 0.32) : 0;
  if (gape > 0.03) {
    const lower = beak.at(0, 0, -2).pitch(0.56 * gape);
    r.spike(lower.o, lower.f, 13, 2.35, ochre);
    r.line(lower.p(1, 2, 0), lower.p(11, 1, 0), coal.T[0]);
  }
  j.mouth = beak.p(12, 0, -1);
  const planted: string[] = [];
  let bladeTip: V3 | undefined;
  for (const [index, s] of [-1, 1].entries()) {
    const name = s < 0 ? 'L' : 'R',
      gaitFoot = gait.feet[index];
    let f = gaitFoot.forward,
      up = gaitFoot.lift * card.proportions.stepHeight;
    if (slide && t * 24 > 10 && t * 24 < 30) {
      const run = Math.sin(((t * 24 - 10) * Math.PI) / 4) * Math.sin(((t * 24 - 10) * Math.PI) / 20);
      f += run * s * 7;
      up += Math.max(0, run * s) * 5;
    }
    const slidePhase = Math.max(0, pitch) * (slide ? 1 : 0);
    f -= slidePhase * 25;
    up += slidePhase * 10;
    if (s < 0) {
      f += a('leg') * 11;
      up += a('leg') * 9;
    }
    if (leap && s > 0) {
      up += Math.max(0, 1 - Math.abs(t * 24 - 27) / 3) * 8;
    }
    const target = leap ? goalAt(A as JointPose, 'foot' + name, [f, s * 7, up]) : undefined;
    const pt = root.at(target ? target[0] * 0.22 : f, s * 7, up);
    r.tag = 'foot' + name;
    j[r.tag] = pt.p(3, 0, 0);
    if (gaitFoot.planted && up < 0.2 && jump < 0.2) planted.push(r.tag);
    r.ell(pt, [2, 0, 2.6], [7, 4.8, 2.5], ochre);
    for (const toe of [-1, 0, 1]) {
      const tip = pt.p(9 - Math.abs(toe), toe * 3.4, 1.2);
      r.cap(pt.p(3, toe * 1.4, 2), tip, 2, 0.75, ochre);
      r.dot(tip, coal.T[1], 0, 0.8);
    }
    r.tag = 'arm' + name;
    const sh = shoulders.p(0, s * 17, 0);
    let wrist = B.p(
      -3 + a('wing') * -2,
      s * (22 + 15 * Math.max(0, a('wing'))),
      -12 + 18 * Math.abs(a('wing')),
    );
    wrist = vlerp(wrist, B.p(23, s * 0.9, 10), a('clap'));
    wrist = vlerp(wrist, B.p(-8, s * 32, -19), a('shell'));
    if (slide && s < 0) wrist = vlerp(wrist, B.p(13, -20, 1), Math.max(0, 1 - Math.abs(t * 24 - 39) / 8));
    if (s > 0) {
      wrist = vlerp(wrist, B.p(22, 8, 12), a('lapel'));
      wrist = vadd(wrist, B.v(7 * Math.sin(Math.PI * a('lapel')), 6 * Math.sin(Math.PI * a('lapel')), 0));
      wrist = vlerp(wrist, H.p(11, 11, 4), a('salute'));
    }
    const bladeWeight = a('goal.weaponTip.weight');
    if (slide && s > 0 && bladeWeight > 0.0001) {
      const goal = goalAt(A as JointPose, 'weaponTip')!;
      bladeTip = root.p(...goal);
      const angle =
        t * 24 < 21
          ? 0.96
          : t * 24 < 28
            ? 0.96 + 1.3 * Math.min(1, (t * 24 - 21) / 7)
            : 2.26 - 2.8 * Math.min(1, (t * 24 - 28) / 3);
      const axis = F.v(Math.cos(angle), 0, Math.sin(angle));
      const dir = vnorm(axis);
      wrist = vlerp(wrist, vsub(bladeTip, vmul(dir, 23)), Math.min(1, bladeWeight));
      bladeTip = vadd(wrist, vmul(dir, 23 * Math.min(1, bladeWeight)));
    }
    const elbow = vadd(
      vlerp(sh, wrist, 0.5),
      B.v(1 + 10 * Math.max(a('clap'), a('lapel')), s * (3 + 6 * Math.max(a('clap'), a('lapel'))), 0),
    );
    j['shoulder' + name] = sh;
    j['elbow' + name] = elbow;
    j['hand' + name] = wrist;
    r.cap(sh, elbow, 5.8, 5.2, navy);
    r.cap(elbow, wrist, 5.2, 1.45, coal);
    r.line(vadd(elbow, B.v(0, s * 4.5, 0)), vadd(wrist, B.v(0, s * 1, 1)), navy.T[2]);
    r.tag = 'epaulette';
    const E = shoulders.at(1, s * 18.7, 3);
    r.ell(E, [0, 0, 0], [7.1, 5.5, 2.9], gold);
    for (let i = -2; i <= 2; i++) {
      const point = E.p(i * 2.45, s * (5.25 - Math.abs(i) * 0.4), -0.2);
      r.cap(point, vadd(point, B.v(-0.5, s * 0.8, -6.7 + Math.abs(i) * 0.5)), 1.15, 0.85, gold);
    }
    if (s > 0 && bladeTip) {
      r.tag = 'saber';
      r.cap(wrist, bladeTip, 2.5, 0.25, ice);
      r.line(vadd(wrist, B.v(0, 1, 1.5)), bladeTip, frostWhite, 0.2);
      const guard = B.v(0, 2.8, 1);
      r.cap(vsub(wrist, guard), vadd(wrist, guard), 1, 1, gold);
    }
  }
  j.weaponTip = bladeTip ?? j.handR;
  j.torso = B.o;
  for (const [k, v] of Object.entries(j)) j[k + 'Ground'] = [v[0], v[1], 0];
  finishSurfaces(
    r,
    F,
    [
      [navy, 'brocade'],
      [coal, 'fur'],
      [cream, 'brocade'],
      [gold, 'strap'],
      [ochre, 'skin'],
      [ice, 'ice'],
      [red, 'strap'],
      [eye, 'iris'],
    ],
    'fur',
  );
  scaleFigure(r, j, 1, 1.14);
  const fr = projectFigure(r, 96, [43, 77], j, '#1b222f', 3.8, true);
  fr.dx = a('dx') * 0.64;
  fr.planted = planted;
  return fr;
};
