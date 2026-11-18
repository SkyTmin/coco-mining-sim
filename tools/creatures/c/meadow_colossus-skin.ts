import { hx, tn, mixc } from '../kit/f11-mobkit';
import { F3, Rig, vlerp, type Mat, type V3 } from '../rig/f15-rig';
import type { HeavyAppearance, HeavySkeleton } from '../bodies/heavy-quadruped';
import { meadowHeadFrame, meadowNose, meadowStagger } from './meadow_colossus-stance';
import { drawHill } from './meadow_colossus-landscape';

const hideRamp = tn('#4b3d33', '#846545', '#aa8c60', '#d0b47e');
const shellRamp = tn('#49382d', '#6b513a', '#92734a', '#b69561');
const scuteRamp = tn('#554333', '#8c704f', '#b89b6d', '#e0c38d');
const beakRamp = tn('#64513b', '#977c51', '#c7ab72', '#e4c78f');
const skin: Mat = {
  T: hideRamp,
  pat: ([x, y, z], l) => {
    const v = Math.sin(14 * z + 2.5 * Math.sin(x * 6) + 3 * y);
    return v > 0.67 ? (l > 0.17 ? hideMid : hideDark) : null;
  },
};
const hideDark = mixc(hideRamp[0], hideRamp[1], 0.61),
  hideMid = mixc(hideRamp[1], hideRamp[2], 0.51);
const scute: Mat = { T: scuteRamp },
  horn: Mat = { T: beakRamp },
  belly: Mat = { T: shellRamp };
const shadow = hx('#554937'),
  pale = hx('#d9be86'),
  glint = hx('#ffe8ab');
const ink: Mat = { T: tn('#302a27', '#48382a', '#594331', '#795a3b') };
const eyeMaterial: Mat = {
  T: tn('#975922', '#bd772d', '#efae41', '#ffe39a'),
  bias: 0.34,
};
const clawMat: Mat = { T: tn('#705f49', '#a6956f', '#cec092', '#e7dbb4') };

function drawLegs(r: Rig, s: HeavySkeleton) {
  for (const leg of s.legs) {
    const side = leg.side;
    r.tag = leg.name;
    const tucked = s.pose['leg.tuck'] ?? 0;
    // Authored IK targets are already in the staggered stance; the library's
    // neutral fallback is symmetric and needs the same offsets applied here.
    const restWeight = 1 - (s.pose['goal.' + leg.name + '.weight'] ?? 0);
    const [forward, right] = meadowStagger(side);
    const stance = leg.hoof.p(forward * restWeight, right * restWeight, 0);
    const foot = vlerp(
      stance,
      s.body.p(leg.fore * 12, side * 7, -5),
      tucked * 0.78,
    );
    const elbow = vlerp(
      leg.knee,
      vlerp(leg.hip, foot, 0.55),
      0.88 + tucked * 0.12,
    );
    const hoof = new F3(foot, leg.hoof.f, leg.hoof.s, leg.hoof.u);
    const knee = new F3(elbow, s.body.f, s.body.s, s.body.u).at(
      0,
      side * 1.55,
      0,
    );
    // A continuous, slightly flared column carries the weight. The two rings
    // meet exactly; separate spherical lower joints used to read as loose stones.
    const top = new F3(leg.hip, hoof.f, hoof.s, hoof.u).at(
      -side * 1.15,
      side * 3.1,
      0,
    );
    const bottom = hoof.at(0.56, 0, 0.15);
    const count = 9,
      base: V3[] = [],
      mid: V3[] = [],
      upper: V3[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i * 2 * Math.PI) / count + 0.22,
        x = Math.cos(a),
        y = Math.sin(a);
      upper.push(top.p(x * 5.15, y * 4.7, 1.5));
      mid.push(knee.p(x * 4.62, y * 4.25, 0.2));
      base.push(bottom.p(x * 5.05, y * 4.65, -1.6));
    }
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      r.poly([upper[i], upper[j], mid[j], mid[i]], skin);
      r.poly([mid[i], mid[j], base[j], base[i]], skin);
    }
    r.poly(base, belly);
    r.ell(hoof, [1.15, 0, 0.05], [5.05, 4.5, 2.2], skin);
    // Broad overlapping knee scales face outward. They catch light as the knee bends.
    for (const [x, y, z, w, h] of [
      [-2.1, 2.4, 1.8, 2.55, 2.25],
      [0.5, 3.6, 2.9, 2.65, 2.15],
      [2.7, 2.8, 0.8, 2.35, 2.0],
      [-0.3, 3.98, -0.25, 2.3, 1.84],
    ]) {
      r.ell(knee, [x, side * y, z], [w, 1.0, h], scute);
    }
    r.cap(
      hoof.p(-2.3, side * 3, 2.5),
      hoof.p(2.2, side * 3.2, 2.3),
      0.82,
      0.65,
      scute,
    );
    for (const j of [-1, 0, 1]) {
      const soleFan = hoof.turn(0.25 * side);
      const toe = soleFan
        .at(4.74 - 1.58 * Math.abs(j), j * 3.12, -0.47)
        .turn(j * 0.38);
      r.ell(toe, [0.7, 0, 0], [2.6, 1.32, 1.72], clawMat);
      r.dot(toe.p(0.8, 0.3, 1.38), glint, 0, 0.78, 1.1);
      r.line(toe.p(1, -0.25, 1.16), toe.p(1.75, -0.29, 0.68), pale, 0, 0.92);
    }
    // Contact sockets are on the outer sole, independent of the nominal ankle height.
    const sole = hoof.p(0, 0, -2.3);
    if ((s.pose['plant.' + leg.name] ?? 0) >= 0.999) s.planted.push(leg.name);
    s.points[leg.name] = sole;
    s.points[leg.name + 'Ankle'] = foot;
    s.points[leg.name + 'Ground'] = [sole[0], sole[1], 0];
    s.points[(leg.fore > 0 ? 'hand' : 'foot') + (side > 0 ? 'R' : 'L')] = sole;
    if (leg.fore === 1 && side === 1) s.points.paw = sole;
  }
}
function drawHead(r: Rig, s: HeavySkeleton) {
  const head = meadowHeadFrame(s);
  const throat = s.body.p(7.9, 0, -2.25),
    under = head.at(2.0, 0, -1.7);
  r.tag = 'neck';
  r.cap(throat, under.o, 6.2, 5.25, skin);
  for (let i = 0; i < 3; i++) {
    const center = vlerp(throat, under.o, (i + 1) / 4);
    const section = new F3(center, head.f, head.s, head.u).pitch(-0.1);
    r.ell(section, [0, 0, -0.28], [1.4, 5.6, 4.9], skin);
  }
  r.tag = 'head';
  r.ell(head, [6.3, 0, 0.0], [9.4, 6.5, 6.25], skin);
  r.ell(head, [7.2, 0, 2.1], [7.2, 5.5, 4.0], scute);
  const chin = head.at(6.5, 0, -2.86).pitch(0.3 * (s.pose['jaw.open'] ?? 0));
  r.ell(chin, [4.5, 0, -0.25], [7.35, 5.1, 2.8], skin);
  // The down-curved keratin bill has a real underside and overhangs the jaw.
  const ridge = head.p(14.1, 0, 4.5),
    bridge = head.p(18.0, 0, 2.66),
    tip = head.p(20.15, 0, -3.7);
  for (const sign of [-1, 1]) {
    const cheek = head.p(13.2, sign * 4.45, 1.01),
      edge = head.p(16.9, sign * 3.25, -0.9),
      hook = head.p(19.1, sign * 1.22, -0.92);
    r.poly([ridge, bridge, hook, edge, cheek], horn);
    r.poly([bridge, tip, hook], horn);
    r.poly([tip, hook, edge, head.p(15.2, 0, -1.6)], ink);
    r.line(bridge, tip, pale, 0, 0.82);
  }
  const closure = s.pose['eye.close'] ?? 0,
    joy = s.pose['eye.joy'] ?? 0;
  for (const d of [-1, 1]) {
    r.tag = 'head';
    r.ell(head, [12.35, d * 3.9, 2.05], [2.9, 1.35, 1.43], horn);
    r.ell(head, [16.45, d * 2.78, 1.68], [1.06, 0.6, 0.71], ink);
    for (const [x, y, z, w] of [
      [1.4, 5.16, 0.9, 1.8],
      [3.5, 5.8, -0.25, 1.7],
      [5.9, 5.74, -2.3, 1.35],
    ]) {
      r.ell(head, [x, d * y, z], [w, 0.76, 1.09], scute);
    }
    const lip = [
      head.p(17.9, d * 2.5, -1.15),
      head.p(15, d * 4.25, -1.3),
      head.p(11.05, d * 5.1, -1.08),
      head.p(8, d * 5.6, -1.75),
    ];
    for (let i = 1; i < lip.length; i++)
      r.line(lip[i - 1], lip[i], shadow, 0, 1);
    const eye = head.at(9.65, d * 6.28, 3.52);
    r.tag = d > 0 ? 'eyeR' : 'eyeL';
    const start = r.size,
      open = closure < 0.78 && joy < 0.58;
    if (open) {
      const h = 2.36 * (1 - 0.78 * closure);
      r.ell(eye, [0, 0, 0], [3.12, 1.2, h + 0.44], ink);
      r.ell(eye, [0.2, d * 0.74, 0.2], [2.47, 0.82, h], eyeMaterial);
      r.ell(eye, [0.65, d * 1.5, 0.3], [0.94, 0.36, h * 0.73], ink);
      r.dot(eye.p(0.52, d * 1.8, 1.33), glint, 0, 1.02, 2.0);
    } else {
      r.line(
        eye.p(-1.55, d * 0.55, -0.15),
        eye.p(0, d * 0.96, 0.38 + 0.3 * joy),
        shadow,
        0,
        1.2,
      );
      r.line(
        eye.p(0, d * 0.96, 0.38 + 0.3 * joy),
        eye.p(1.48, d * 0.85, -0.1),
        shadow,
        0,
        1.2,
      );
    }
    r.markEye(start, d, open);
    s.points[d > 0 ? 'eyeR' : 'eyeL'] = eye.p(0.3, d * 0.97, 0.22);
    if (d > 0) r.eye = open ? s.points.eyeR : null;
    r.tag = 'head';
    const raised = 0.4 * (s.pose['brow.up'] ?? 0);
    r.cap(
      head.p(6.3, d * 5.89, 5.9 + raised),
      head.p(10.2, d * 5.82, 6.01 + raised),
      1.42,
      1.07,
      scute,
    );
    r.line(
      head.p(6.8, d * 6.52, 6.12 + raised),
      head.p(9.9, d * 6.27, 6.33 + raised),
      pale,
      0,
      1,
    );
  }
  s.points.eye = s.points.eyeR;
  s.points.head = head.o;
  s.points.noseTip = meadowNose(head);
  s.points.mouth = head.p(19.85, 0, -3.1);
  s.points.snout = s.points.mouth;
}
export const meadowSkin: HeavyAppearance = {
  expandForAction: true,
  draw(r, s, _card, variant) {
    r.tag = 'torso';
    r.ell(s.body, [-3.4, 0, -0.9], [20.6, 13.2, 5.8], belly);
    r.tag = 'tail';
    const tailEnd = s.tail.p(-7.65, 0, -5.55);
    r.cap(s.tail.p(2, 0, -3.9), tailEnd, 3.45, 0.62, skin);
    for (let i = 0; i < 3; i++)
      r.ell(
        s.tail,
        [-0.95 - 1.7 * i, 0, -1.65 - 0.78 * i],
        [1.55, 0.97, 0.85],
        scute,
      );
    s.points.tailTip = tailEnd;
    drawLegs(r, s);
    drawHead(r, s);
    drawHill(r, s, variant === 'gold');
  },
};
