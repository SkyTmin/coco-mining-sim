import type { HeavyAppearance } from '../bodies/heavy-quadruped';
import type { CreatureCard } from '../bodies/card-data';
import { hx } from '../kit/f11-mobkit';
import { vlerp, type Mat, type V3 } from '../rig/f15-rig';
import { finishSurfaces } from './surface-work';

// The spiral is broad at the skull, open around the ear and narrow at its live end.
const hornTip: V3 = [12, 13, 4];
const horn: V3[] = [
  [3, 7, 6],
  [5.1, 9, 12],
  [4, 11, 16.8],
  [0.2, 13, 18.8],
  [-4, 14.7, 17],
  [-7.2, 16, 12.5],
  [-7, 17.2, 7],
  [-4.3, 18, 2],
  [0.6, 18, -0.8],
  [5.3, 17, -0.4],
  [8.3, 15.2, 2.6],
  hornTip,
];
const hornRadius = (j: number) => 4.25 * (1 - j / (horn.length - 1)) + 0.55;
const cloudCrown = [
  [-17, 6, 9],
  [-9, 10, 10],
  [0, 12, 9.7],
  [8, 10, 8.2],
];
const cloudSide = [
  [-18, 4, 6.2],
  [-10, 6, 6.9],
  [-2, 7, 7.2],
  [5, 6, 6.3],
  [9, 0, 5.3],
];
const smooth = (v: number) => {
  const x = Math.max(0, Math.min(1, v));
  return x * x * (3 - 2 * x);
};

function paint(card: CreatureCard, id: string, gold?: string[]): Mat {
  const tones = gold ?? card.materials.find((m) => m.name === id)!.tones;
  return { T: [hx(tones[0]), hx(tones[2]), hx(tones[4]), hx(tones[6])] };
}

export const stormSkin: HeavyAppearance = {
  hornTip,
  draw(r, s, card, variant) {
    const wool = paint(
      card,
      'cloud',
      variant === 'gold'
        ? ['#46313d', '#665044', '#856045', '#a57d50', '#bda164', '#d8bb82', '#f1db96']
        : undefined,
    );
    const keratin = paint(card, 'horn'),
      face = paint(card, 'face'),
      charge = paint(card, 'charge');
    const curls: Mat = { T: [wool.T[0], hx('#39394f'), hx('#505168'), wool.T[2]] };
    const top: Mat = { T: [hx('#343c53'), hx('#565b74'), hx('#80889b'), hx('#c9cbbb')] };
    const eye: Mat = { T: [hx('#291e36'), hx('#995c45'), hx('#e5a65d'), hx('#fff3b7')] };
    const ear: Mat = { T: [hx('#342a42'), hx('#634155'), hx('#90616c'), hx('#d1a28d')] };
    const B = s.body,
      hatch = s.life.hatch,
      opened = 1 - hatch;
    const headGrowth = smooth((opened - 0.12) / 0.73);
    const H =
      hatch > 0
        ? s.head.at(9 * (1 - headGrowth), 0, 6 * (1 - headGrowth)).scale(0.04 + 0.96 * headGrowth)
        : s.head;
    const legGrowth = 0.1 + 0.9 * smooth(opened / 0.74),
      seed = B.p(-4, 0, 1);
    for (const leg of s.legs) {
      r.tag = leg.name;
      const hip = vlerp(seed, leg.hip, legGrowth),
        knee = vlerp(seed, leg.knee, legGrowth);
      const foot = vlerp(seed, leg.foot, legGrowth);
      const hoof = hatch > 0 ? leg.hoof.at(0, 0, 0).scale(legGrowth) : leg.hoof;
      if (hatch > 0) hoof.o = foot;
      r.cap(hip, knee, 4.2 * legGrowth, 2.75 * legGrowth, wool);
      r.cap(knee, foot, 2.8 * legGrowth, 1.78 * legGrowth, face);
      r.cap(knee, vlerp(knee, foot, 0.37), 2.1 * legGrowth, 0.38 * legGrowth, curls);
      for (const k of [-1, 1]) {
        r.ell(hoof, [1.5, k * 1.55, -1.45], [3.9, 1.51, 2], face);
        r.line(hoof.p(1.5, k * 2.65, -0.4), hoof.p(4, k * 2.12, -1.22), face.T[2], 0, 0.72);
      }
      r.line(hoof.p(1.4, 0, -0.3), hoof.p(5.2, 0, -1.75), face.T[0], 0, 0.85);
      r.cap(hoof.p(-0.05, 0, 1.2), hoof.p(-0.45, 0, 2.4), 2.15 * legGrowth, 2.42 * legGrowth, keratin);
    }

    r.tag = 'torso';
    r.ell(B, [-5, 0, 1.4], [19, 11, 11.6], wool);
    r.ell(B, [-6, 0, -3], [15, 9.7, 7.6], curls);
    for (const [x, z, rad] of cloudCrown) {
      const C = B.at(
        x * (1 + 0.35 * hatch),
        1.8 * hatch * Math.sin(x),
        z + hatch * (6 + 2 * Math.cos(x)),
      );
      r.ell(C, [0, 0, 0], [rad, 10, rad * 0.79], variant === 'gold' ? wool : top);
      for (const side of [-1, 1]) {
        const a = C.p(-rad * 0.58, side * 3.1, rad * 0.6),
          b = C.p(-rad * 0.17, side * 5.6, rad * 0.62);
        r.line(a, b, wool.T[2], 0, 0.72);
      }
    }
    for (const side of [-1, 1]) {
      for (const [j, [x, z, rad]] of cloudSide.entries()) {
        const C = B.at(x * (1 + hatch * 0.32), side * (7.6 + 2.5 * hatch), z + hatch * (3 + (j % 2)));
        r.ell(C, [0, 0, 0], [rad, 5.4, rad * 0.87], wool);
        // The teardrop fold hooks under the next curl; its etched spiral follows this lobe.
        r.ell(C, [-rad * 0.38, side * 1.5, -rad * 0.59], [rad * 0.47, 3.4, rad * 0.48], curls);
        const sw: V3[] = [];
        for (let n = 0; n < 11; n++) {
          const v = n / 10,
            a = -1.12 + v * 5.25,
            rr = (0.76 - 0.53 * v) * rad;
          const xx = Math.cos(a) * rr,
            zz = Math.sin(a) * rr * 0.8;
          const yy = 5.4 * Math.sqrt(Math.max(0, 1 - (xx / rad) ** 2 - (zz / (rad * 0.87)) ** 2));
          sw.push(C.p(xx, side * (yy + 0.08), zz));
        }
        for (let n = 1; n < sw.length; n++)
          r.line(sw[n - 1], sw[n], n > 6 ? wool.T[1] : wool.T[0], 0, 0.72);
      }
    }
    // Sheet lightning travels through the outer fleece in two short pulses every idle loop.
    if (s.anim === 'idle') {
      const phase = s.time % 3;
      const blink = Math.max(0, 1 - Math.abs(phase - 1.32) / 0.13, 1 - Math.abs(phase - 1.59) / 0.075);
      if (blink > 0) {
        r.tag = 'torso';
        for (const side of [-1, 1]) {
          const bolts: V3[] = [
            [-17, 11.8, 6.8],
            [-13, 12.8, 7.9],
            [-14, 13, 5.4],
            [-9.4, 13.1, 6.7],
            [-7.6, 12.7, 4.7],
            [-2.5, 12.8, 7.3],
            [1, 12.2, 7.4],
          ];
          for (let i = 1; i < bolts.length; i++) {
            const [x, y, z] = bolts[i - 1],
              [u, v, w] = bolts[i];
            r.line(B.p(x, side * y, z), B.p(u, side * v, w), charge.T[blink > 0.52 ? 3 : 1], 0, 0.83);
          }
        }
      }
    }
    r.tag = 'tail';
    r.cap(s.tail.o, s.points.tailTip, 3.4, 1.4, curls);
    const end = s.points.tailTip;
    r.ell(s.tail, [-7.4, 0, -4.6], [3.7, 3.3, 3.1], wool);
    r.cap(end, s.tail.p(-9.3, 0.7, -9), 2.1, 0.25, curls);
    r.tag = 'neck';
    r.cap(B.p(8, 0, 5), H.p(0, 0, 1), 7.5, 6 * headGrowth + 0.1, wool);
    r.tag = 'head';
    r.ell(H, [4, 0, 1.2], [10, 7.1, 7.5], face);
    r.ell(H, [12, 0, -1.6], [7, 5.7, 4.7], face);
    r.ell(H, [17, 0, -2.4], [3.7, 4, 2.4], face);
    r.ell(H, [9, 0, 4.4], [5.4, 3.9, 1.85], keratin);
    r.cap(H.p(8, 0, -4), H.p(9, 0, -11), 2.8 * headGrowth, 0.32, curls);
    r.line(H.p(19.8, 0, -2.7), H.p(19.2, 0, -4), face.T[0], 0, 0.9);
    const hornGrowth = smooth((opened - 0.17) / 0.8) * (horn.length - 1);
    for (const side of [-1, 1]) {
      r.tag = 'head';
      r.ell(H, [-2, side * 8, 4], [3, 5, 2.2], face);
      r.poly([H.p(-3, side * 10, 5.2), H.p(-1, side * 12, 4.5), H.p(-0.3, side * 8, 4.9)], ear);
      const E = H.at(4.1, -side * 1.6, 0.1);
      r.ell(E, [9.1, side * 6.55, 2.2], [2.9, 1.4, 1.86], s.life.blink ? face : eye);
      if (!s.life.blink) {
        r.line(E.p(8.1, side * 7.86, 2.27), E.p(10.5, side * 7.82, 2.35), eye.T[0], 0, 1.1);
        r.dot(E.p(8.5, side * 7.72, 3.13), eye.T[3], 0, 0.95);
      }
      r.line(E.p(7, side * 6.68, 4.02), E.p(10.8, side * 6, 3.75), keratin.T[3], 0, 1);
      r.dot(H.p(18.2, side * 3.72, -1.6), face.T[0], 0, 1.25);
      r.line(H.p(13.8, side * 4.9, -4.6), H.p(18, side * 3.55, -3.75), face.T[0], 0, 0.83);
      if (side > 0) s.points.eyeR = r.eye = E.p(9, side * 7.5, 2.3);
      r.tag = side > 0 ? 'hornR' : 'hornL';
      // Each horn grows along its curve when the cloud egg uncurls.
      for (let i = 1; i < horn.length; i++) {
        const weight = Math.max(0, Math.min(1, hornGrowth - i + 1));
        if (weight <= 0) break;
        const p = horn[i - 1],
          q = vlerp(p, horn[i], weight);
        const point = (v: V3) => H.p(v[0], side * v[1], v[2]);
        const size = headGrowth * hornRadius(i - 1),
          next = headGrowth * hornRadius(i - 1 + weight);
        r.cap(point(p), point(q), size, next, i === 1 ? face : keratin);
        if (i > 1 && weight > 0.38) {
          const band = vlerp(p, q, 0.32);
          r.cap(point(band), point(vlerp(p, q, 0.46)), size * 0.99, size * 0.96, curls);
          const high = H.p(band[0], side * (band[1] + size * 0.92), band[2] + size * 0.15);
          r.dot(high, keratin.T[3], 0, 0.66);
        }
        if (i === horn.length - 1) {
          const split = vlerp(p, q, 0.42);
          r.line(H.p(p[0], side * (p[1] + size * 0.75), p[2] + 0.38), point(split), charge.T[2], 0, 0.8);
          r.cap(point(vlerp(p, q, 0.54)), point(q), 0.95 * headGrowth, 0.56 * headGrowth, charge);
          r.line(point(split), point(q), keratin.T[3], 0, 0.85);
          r.dot(point(q), keratin.T[3], 0, 1.1);
        }
      }
    }
    if (hatch > 0) {
      s.points.mouth = H.p(20, 0, -2);
      const edge = Math.min(horn.length - 2, Math.floor(hornGrowth));
      const tip = H.p(...vlerp(horn[edge], horn[edge + 1], hornGrowth - edge));
      s.points.hornTip = s.points.weaponTip = tip;
      s.points.hornTipGround = s.points.weaponTipGround = [tip[0], tip[1], 0];
    }
    finishSurfaces(
      r,
      s.root,
      [
        [wool, 'fur'],
        [curls, 'fur'],
        [top, 'fur'],
        [keratin, 'ivory'],
        [face, 'skin'],
        [ear, 'skin'],
        [eye, 'iris'],
        [charge, 'ice'],
      ],
      'fur',
    );
  },
};
