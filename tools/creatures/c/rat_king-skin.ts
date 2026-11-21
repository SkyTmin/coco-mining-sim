// Source of the shared camera and rig: coco-instruments/f15-rig.ts (MIT).
// Anatomy, costume, both royal figures, the planted paw and the articulated
// three-cord flail are original geometry. One figure serves every royal clip.
import type { ArmedAppearance } from '../bodies/armed-biped';
import { goalAt, toLocal } from '../bodies/goals';
import { readCreatureCard } from '../bodies/card-data';
import { F3, Rig, vadd, vlerp, vmul, vnorm, vsub, vlen, type V3 } from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import type { JointPose } from '../technique';
import {
  amber,
  brass,
  darkGold,
  edge,
  fold,
  fur,
  head,
  ink,
  pale,
  robe,
  ruby,
  skin,
  smoke,
  snout,
  steel,
  stone,
  tuft,
  velvet,
} from './rat_king-regalia';
import { basisAlong, smallKing, tail, weapon } from './rat_king-tools';
import { finishSurfaces } from './surface-work';
const card = readCreatureCard('rat_king');
const tau = 2 * Math.PI;
// One native unit conversion for every pose; no clip is individually fitted.
const pictureScale = 1.66;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
export const kingFigure: NonNullable<ArmedAppearance['figure']> = (anim, t, side, variant, pose, gait) => {
  const r = new Rig(),
    j: Record<string, V3> = {};
  const a = (key: string) => pose[key] ?? 0;
  const F = F3.yaw(card.life.yaw + (side * Math.PI) / 8);
  const periodic =
    anim === 'idle' || anim === 'idle-f2' || anim === 'sleep' || anim === 'walk' || anim === 'turn';
  const q = periodic ? (t * tau) / (anim === 'walk' ? 1 : anim === 'turn' ? 4 : anim === 'sleep' ? 3.5 : 3) : 0;
  const tailWrap = clamp(a('tailWrap')),
    tuckFoot = clamp(a('tuckFoot'));
  const nest = a('nest'),
    crouch = a('crouch'),
    jump = a('jump') + a('lift');
  const spin = a('somersault'),
    rollPivot = 24;
  const root = F.at(0, 0, jump + rollPivot)
    .pitch(spin)
    .at(0, 0, -rollPivot);
  const body = root
    .at(-1 + a('hip') + 4 * nest, a('lean'), 33.5 - crouch - 10 * nest + Math.sin(q) * 0.55 + gait.breath)
    .roll(a('roll') + gait.roll)
    .pitch(0.14 + a('pitch') + 0.29 * nest + 0.14 * gait.tired)
    .turn(a('twist'));
  const h = body
    .at(7.25 + nest * 2, 0, 29.3 - 3.0 * nest)
    .turn(-0.24 + a('gaze') + a('headTurn'))
    .pitch(-0.4 + a('nod') - 0.26 * nest);
  const royal = variant === 'gold' ? darkGold : velvet;
  const target = (socket: string, rest: V3): V3 => {
    const local = goalAt(pose as JointPose, socket, toLocal(F, rest));
    return local ? F.p(...local) : rest;
  };
  r.tag = 'torso';
  r.ell(body, [0, 0, -2.3], [14.2, 14.7, 19.45], fur);
  r.ell(body, [-1.55, 0, 9.5], [13.5, 16.7, 12.8], fur);
  r.ell(body, [5.45, 0, -0.9], [11, 14.15, 16.25], tuft);
  j.torso = body.o;
  // Three broken arcs of body hair overlap around the lower belly and move with the trunk.
  for (let row = 0; row < 3; row++)
    for (let k = -4; k <= 4; k++) {
      const angle = k * 0.31 + (row % 2) * 0.12,
        co = Math.cos(angle),
        si = Math.sin(angle);
      const z = 4.5 - row * 6.05,
        rad = Math.sqrt(1 - ((z + 0.9) / 16.25) ** 2);
      const P = body.p(5.45 + co * 10.88 * rad, si * 14.05 * rad, z);
      r.cap(P, vadd(P, body.v(-0.8, si * 0.75, -3.17 - (k % 2) * 0.41)), 1.25, 0.26, (k + row) % 3 ? fur : tuft);
    }
  r.tag = 'belt';
  r.ell(body, [1.45, 0, -6.9], [13.8, 12.4, 2.0], smoke);
  r.ell(body, [15.7, -0.5, -6.9], [1.25, 2.9, 2.02], darkGold);
  r.ell(body, [16.48, -0.5, -6.85], [1, 1.5, 0.97], stone);
  for (const s of [-1, 1]) {
    r.cap(body.p(14.8, s * 5, -5.6), body.p(14.17, s * 5.3, -8.4), 0.76, 0.68, stone);
  }
  const clothWave = (Math.sin(q - 0.68) - Math.sin(-0.68)) * 1.05 + a('cape') * 0.55 + a('twist') * 0.48;
  robe(
    r,
    body,
    clothWave,
    a('cape') * 0.48 + Math.abs(a('twist')) * 0.84,
    royal,
    (1 - Math.cos(spin)) * 0.5,
    clamp(nest + 0.033 * crouch),
  );
  const blink = clamp(
    Math.max(a('blink'), anim === 'sleep' ? 1 : 0, periodic ? Math.max(0, (Math.cos(q - 3.95) - 0.987) * 73) : 0),
  );
  head(r, h, a('jaw'), blink, a('ear') + 0.13 * Math.sin(q - 0.4), 0.45 * Math.sin(q - 1.02), j);
  const planted: string[] = [];
  for (const [i, s] of [-1, 1].entries()) {
    const suffix = s < 0 ? 'L' : 'R',
      foot = 'foot' + suffix;
    const gaitFoot = gait.feet[i];
    // The far foot leads a short distance. The near foot carries the belly.
    const stridePoint = root.p(
      1.8 - s * 3.7 + gaitFoot.forward / pictureScale - s * a('stride'),
      s * 9.65,
      gaitFoot.lift * 4.8 + (s > 0 ? a('heel') : 0),
    );
    const ankle = vlerp(stridePoint, body.p(13.8, s * 13.4, -14.5), tuckFoot);
    const floor = target(foot, ankle);
    const footAxes = root
      .roll((a('roll') + gait.roll) * tuckFoot)
      .pitch((0.14 + a('pitch') + 0.29 * nest) * tuckFoot)
      .turn(a('twist') * tuckFoot);
    const P = new F3(floor, footAxes.f, footAxes.s, footAxes.u).turn(s * 0.12).pitch(-0.53 * tuckFoot);
    const hip = body.p(-2.4, s * 8, -11.5),
      knee = vadd(vlerp(hip, P.p(0.5, 0, 4), 0.49), body.v(3.95, s * 2, 2.4));
    r.tag = 'leg' + suffix;
    r.cap(hip, knee, 6.38, 5.9, fur);
    r.cap(knee, P.p(-2.8, 0, 4), 5.5, 3.8, smoke);
    for (let n = 0; n < 5; n++) {
      const p = vlerp(knee, P.p(-2.8, 0, 4), 0.16 + 0.107 * n);
      const slip = vadd(p, body.v(n % 2 ? 1.8 : 0.4, s * (3.85 - n * 0.15), 0.4));
      r.cap(slip, vadd(slip, body.v(-0.9, s * 0.2, -2.6)), 1.25, 0.25, tuft);
    }
    r.tag = foot;
    r.ell(P, [0.1, 0, 2.55], [6.65, 4.38, 2.7], fur);
    for (let k = 0; k < 4; k++) {
      const fan = k - 1.5,
        x = 4.0 - Math.abs(fan) * 0.8;
      const toe = P.at(x, fan * 1.76, 1.6).turn(fan * 0.13);
      r.ell(toe, [0.5, 0, 0], [2.52, 1.05, 1.19], skin);
      r.cap(toe.p(1.83, 0, 0.18), toe.p(3.67, 0, -0.55), 0.74, 0.16, pale);
      r.dot(toe.p(0.05, 0, 0.96), skin.T[2], 0, 0.8);
    }
    j[foot] = floor;
    if (gaitFoot.planted && Math.abs(floor[2]) < 0.35) planted.push(foot);
  }
  const equippedRail = a('rail') >= 0.5 || anim === 'idle-f2';
  const goalW = pose['goal.weaponTip.weight'] ?? 0;
  const axisRest = body.turn(a('clubYaw') + 0.02).pitch(0.63 - a('clubAngle')).f;
  for (const s of [-1, 1]) {
    const suffix = s < 0 ? 'L' : 'R',
      sideReach = s > 0;
    const shoulder = body.p(2.3, s * 14.9, 11.8);
    let hand = target(
      'hand' + suffix,
      body.p(
        sideReach ? 15.0 + a('clubForward') : 14.3,
        s * (sideReach ? 16.1 : 12.85),
        sideReach ? 0.35 + a('clubLift') : 3.3,
      ),
    );
    // The cleaver has a fixed length even between keyed endpoints. Move the
    // wrist to keep its edge tracking the weighted target in body coordinates.
    const length = equippedRail ? 36 : 24;
    let direction = axisRest;
    if (sideReach && goalW > 0) {
      const tip = target('weaponTip', vadd(hand, vmul(axisRest, length)));
      const toTip = vsub(tip, hand);
      direction = vlen(toTip) > 0.02 ? vnorm(toTip) : axisRest;
      hand = vsub(tip, vmul(direction, length));
    }
    const elbow = vadd(vlerp(shoulder, hand, 0.47), body.v(-3.1, s * (sideReach ? 5.7 : 4.85), -1.1));
    j['shoulder' + suffix] = shoulder;
    j['elbow' + suffix] = elbow;
    j['hand' + suffix] = hand;
    r.tag = 'arm' + suffix;
    r.cap(shoulder, elbow, 5.85, 4.52, fur);
    r.cap(elbow, hand, 4.7, 2.32, tuft);
    for (let i = 0; i < 8; i++) {
      const p = vlerp(shoulder, elbow, 0.12 + 0.105 * i);
      const outer = vadd(p, body.v(0.8 * Math.sin(i * 2.2), s * (4.5 - 0.17 * i), 0.3));
      r.cap(outer, vadd(outer, body.v(-1.8, s * 0.65, -2.45)), 1.23, 0.23, i % 3 ? tuft : fur);
    }
    const palm = new F3(hand, body.f, body.s, body.u).turn(s * 0.16);
    const w = basisAlong(hand, direction, body.s, body.u);
    if (sideReach) {
      weapon(r, w, equippedRail);
      j.weaponTip = w.p(length, 0, 0);
      r.tag = 'handR';
      // Four fingers curl around the same cylindrical grip in both phases.
      // The palm lies on its near side while the thumb crosses the top.
      r.ell(w, [0, 2.65, 0.45], [3.48, 1.82, 2.63], skin);
      for (let k = 0; k < 4; k++) {
        const x = (k - 1.5) * 1.4;
        const base = w.p(x, 2.95, -0.28),
          knuckle = w.p(x, 1.5, -2.05);
        const curl = w.p(x, -0.42, -2.15);
        r.cap(base, knuckle, 0.94, 0.81, skin);
        r.cap(knuckle, curl, 0.83, 0.68, skin);
        r.cap(curl, w.p(x, -1.5, -1.4), 0.52, 0.15, pale);
      }
      r.cap(w.p(-1.7, 2.2, 1.2), w.p(0.52, 0.6, 1.95), 1.15, 0.72, skin);
      continue;
    }
    r.tag = 'hand' + suffix;
    r.ell(palm, [0, 0, 0], [3.58, 3.05, 3.56], skin);
    for (let k = 0; k < 4; k++) {
      const lateral = (k - 1.5) * 1.32;
      const A = palm.p(1.09, lateral, 0.87),
        B = palm.p(3.18, lateral, -0.25),
        C = palm.p(2.75, lateral, -2.3);
      r.cap(A, B, 0.93, 0.83, skin);
      r.cap(B, C, 0.8, 0.53, skin);
      r.cap(C, palm.p(1.74, lateral, -2.6), 0.5, 0.13, pale);
    }
    r.cap(palm.p(0.1, -s * 2.7, 0.71), palm.p(2.35, -s * 2.85, -0.42), 1.15, 0.72, skin);
  }
  // The spare shaft is lashed under the cape against the near shoulder. Only
  // the capped iron end and leather loop peek out above the folds in repose.
  r.tag = 'scabbard';
  const spare = body.at(-8, -9.0, 0).pitch(-1.16);
  r.cap(spare.p(-13, 0, 0), spare.p(15, 0, 0), 1.25, 1.35, smoke);
  r.ell(spare, [15.2, 0, 0], [1.1, 1.55, 1.68], equippedRail ? darkGold : steel);
  for (let i = 0; i < 4; i++) r.cap(spare.p(9 + i, 0, 0), spare.p(9.5 + i, 0, 0), 1.55, 1.5, stone);
  const tailGoal = goalAt(pose as JointPose, 'tailTip');
  // A weighted IK target offsets all three tails from their own natural
  // neutral curves instead of scaling their length about the rump.
  const tailWeight = clamp(a('goal.tailTip.weight'));
  const tailLift = a('tailLift');
  const tailBase = root
    .at(a('hip') * 0.64 - 2, a('lean') * 0.6, 28.2 - 0.57 * crouch - 8.3 * nest)
    .turn(a('twist') * 0.25);
  const wave = (Math.sin(q - 1.14) - Math.sin(-1.14)) * 1.72;
  const tailT = tailGoal && tailWeight > 0 ? F.p(...tailGoal) : undefined;
  const goalBlended =
    tailT && tailWeight < 1 ? vlerp(tailBase.p(-40, 20, -3 + tailLift), tailT, tailWeight) : tailT;
  j.tailTip = tail(r, tailBase, wave, tailLift, a('tailSweep'), goalBlended, body, tailWrap);
  // The prince comes from a second hole beside the carpet. His head is long
  // and low like the archival kinglet, with small naked cords and no mace.
  const guard = clamp(a('guard'));
  const entrance = F.at(13, -37, 0);
  j.kinglet = j.minion = entrance.o;
  if (guard > 0.005) {
    const g = entrance
      .at(guard * 4, 0, 0)
      .turn(-0.17)
      .scale(0.45 + 0.55 * guard);
    const e = new F3(g.o, g.f, g.s, vmul(g.u, 0.2 + 0.8 * guard));
    smallKing(r, e, Math.sin(guard * 6.7) * 1.1);
    j.kinglet = j.minion = e.p(8, 0, 0);
  }
  for (const [k, v] of Object.entries(j)) j[k + 'Ground'] = [v[0], v[1], 0];
  finishSurfaces(
    r,
    F,
    [
      [fur, 'fur'],
      [tuft, 'fur'],
      [snout, 'fur'],
      [smoke, 'fur'],
      [skin, 'skin'],
      [pale, 'ivory'],
      [brass, 'lacquer'],
      [darkGold, 'strap'],
      [royal, 'brocade'],
      [fold, 'brocade'],
      [stone, 'granite'],
      [steel, 'lacquer'],
      [edge, 'lacquer'],
      [amber, 'iris'],
      [ruby, 'iris'],
      [ink, 'iris'],
    ],
    'fur',
  );
  scaleFigure(r, j, pictureScale);
  const result = projectFigure(r, 232, [112, 165], j, '#261e25', 3.9, true);
  result.planted = planted;
  result.dx = a('dx') + a('travel');
  return result;
};
