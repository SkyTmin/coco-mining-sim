import { F3, Rig, proj, vadd, vcross, vdot, vlen, vlerp, vmul, vnorm, vsub, type V3 } from '../rig/f15-rig';
import { pointsOnlyActive } from '../rig/figure';
import type { JointPose } from '../technique';
import { tau } from './threshold_keeper-score';
import {
  brass,
  bronze,
  coat,
  cream,
  deep,
  fur,
  glint,
  ink,
  key,
  leather,
  leaf,
  milk,
  night,
  rod,
  rose,
  ruby,
  shadowFur,
  silk,
  umber,
  type Marks,
} from './threshold_keeper-craft';

function tail(r: Rig, B: F3, p: JointPose, j: Marks) {
  r.tag = 'tail';
  const curl = p.curl || 0,
    breathe = p.breathe || 0,
    delay = p.trail || 0,
    balance = p.counterweight || 0;
  const path = (u: number): V3 =>
    B.p(
      -15 - 40 * u + 4 * Math.sin(u * Math.PI),
      9 + 27 * Math.sin(u * 1.8) + (6 * delay + 32 * balance + 30 * (p.tunnel || 0)) * u * u,
      27 -
        (19 - 14 * (p.tunnel || 0) - 7 * Math.sin((p.footCycle || 0) * Math.PI) ** 2) * Math.sin(Math.PI * u) +
        u * u * (20 + curl * 14 - 24 * (p.tunnel || 0) - 18 * balance) +
        4 * Math.sin(3.8 * u) * breathe +
        5 * delay * u,
    );
  j.tail = path(1);
  if (pointsOnlyActive()) return;
  const radius = (u: number) => 3 + 7.8 * Math.sin(Math.PI * u) ** 0.72;
  for (let k = 0; k < 16; k++) {
    const u = k / 16,
      v = (k + 1) / 16;
    const dressed = (p.form || 0) > 0.25 + 0.44 * u;
    const material =
      k >= 12 ? cream : k >= 10 ? umber : dressed ? (k >= 7 ? silk : deep) : k % 7 === 0 ? shadowFur : fur;
    const a = path(u),
      b = path(v),
      tangent = vnorm(vsub(b, a)),
      normal = vnorm(vcross(tangent, B.s)),
      side = vnorm(vcross(tangent, normal));
    r.cap(a, b, radius(u), radius(v), material);
    for (let i = 0; i < 6; i++) {
      const theta = ((i + (k % 2) * 0.44) * tau) / 6 + 0.06 * k;
      const radial = vadd(vmul(normal, Math.cos(theta)), vmul(side, Math.sin(theta)));
      const edge = vadd(a, vmul(radial, radius(u) * 0.94));
      const end = vadd(vadd(b, vmul(tangent, 1.28)), vmul(radial, radius(v) + 0.6));
      const tuft =
        k >= 12
          ? (i + k) % 3
            ? cream
            : rose
          : k >= 10
            ? leather
            : !dressed && (i + 2 * k) % 5 === 0
              ? rose
              : material;
      r.cap(edge, end, 1.65, 0.22, tuft);
    }
  }
}
function mantle(r: Rig, B: F3, p: JointPose, j: Marks) {
  const form = p.form || 0,
    ls = p.trail || 0;
  r.tag = 'cloak';
  const rings = 6,
    div = 24;
  const at = (i: number, k: number): V3 => {
    const u = i / rings,
      a = (k * tau) / div,
      backside = (1 - Math.cos(a)) * 0.5;
    const ripple = Math.cos(a * 7) * (0.5 + u * 1.7),
      split = backside * (2 + form * 10 + (p.leap || 0) * 4 + ls);
    return B.p(
      -1 + Math.cos(a) * (13 + u * 13 + ripple) - u * u * split,
      Math.sin(a) * (13 + u * (8 + form * 5) + ripple),
      40 - u * (15 + backside * (6 + form * 8)) + 2 * Math.cos(3 * a) * u + 0.8 * ls * u,
    );
  };
  j.cloak = at(rings, 12);
  if (pointsOnlyActive()) return;
  for (let i = 0; i < rings; i++)
    for (let k = 0; k < div; k++) {
      const A = at(i, k),
        C = at(i + 1, k),
        D = at(i + 1, k + 1),
        E = at(i, k + 1);
      // The lining rolls out from the neck towards the hem, one gore after its neighbour.
      const lining = form > 0.17 + 0.49 * (i / rings) + (0.21 * (1 - Math.cos((k * tau) / div))) / 2;
      r.poly(
        [A, C, D, E],
        i === rings - 1 ? (lining ? silk : bronze) : lining ? (k % 6 ? ruby : silk) : k % 6 ? coat : deep,
      );
      if (k % 3 === 0) r.line(A, C, (lining ? silk : coat).T[3], 0, 0.32);
      if (i === rings - 1) {
        r.line(C, D, glint, 0, 0.55);
        if (k % 2 === 0) r.dot(vlerp(C, D, 0.42), milk, 0, 0.64, 0.6);
      }
    }
}
function head(r: Rig, H: F3, p: JointPose, j: Marks) {
  const shut = p.shut || 0,
    grin = p.grin || 0,
    form = p.form || 0;
  r.tag = 'head';
  j.head = H.o;
  r.ell(H, [0, 0, 0], [15, 20, 17.2], fur);
  r.ell(H, [-3, 0, 4.8], [13, 18.9, 14], shadowFur);
  // Two short rows of guard hairs follow the curved crown through every head turn.
  for (const s of [-1, 1])
    for (let i = 0; i < 5; i++) {
      const q = s * (0.23 + i * 0.18);
      const crown = (a: number, b: number): V3 =>
        H.p(-3 + 13.2 * Math.sin(a), 19.1 * Math.cos(a) * Math.sin(b), 4.8 + 14.3 * Math.cos(a) * Math.cos(b));
      r.cap(crown(0.67 - i * 0.075, q), crown(0.34 - i * 0.075, q + s * 0.065), 1.52, 0.26, i % 3 ? fur : rose);
    }
  for (let k = 0; k < 7; k++)
    leaf(r, H, [-3, k * 2 - 6, 16], [-7, k * 2 - 5.5, 20.1 - Math.abs(k - 3) * 0.8], 1.7, fur, shadowFur);
  for (const s of [-1, 1]) {
    const name = s < 0 ? 'L' : 'R',
      delay = s < 0 ? p.ear || 0 : p.farEar || 0;
    r.tag = 'ear' + name;
    const A = H.at(-5, s * 14.7, 8.8)
      .roll(s * (0.38 - 0.3 * delay + 0.11 * (p.trail || 0)))
      .pitch(-0.18 + 0.16 * (p.chin || 0));
    j['ear' + name] = A.p(-0.7, s * 5.5, 12.2);
    r.ell(A, [0, s * 3.3, 4], [4.9, 7.2, 9.8], umber);
    r.ell(A, [2.4, s * 3.6, 4.6], [3.7, 6.3, 8.7], fur);
    r.ell(A, [4.6, s * 3.4, 4.8], [2, 4.2, 5.7], silk);
    r.cap(A.p(6, s * 1.5, 1), A.p(6, s * 4.2, 5.8), 0.75, 1, cream);
    if (s === 1) {
      for (let k = 0; k < 12; k++) {
        const a = (k * tau) / 12,
          b = ((k + 1) * tau) / 12;
        r.cap(
          A.p(4, 6.8 + 1.7 * Math.cos(a), 1 + 2.55 * Math.sin(a)),
          A.p(4, 6.8 + 1.7 * Math.cos(b), 1 + 2.55 * Math.sin(b)),
          0.66,
          0.66,
          brass,
        );
      }
    }
    r.tag = 'cheek' + name;
    const C = H.at(6, s * 11.9, -4.5);
    r.ell(C, [0, 0, 0], [9.2, 8.8, 7.6], cream);
    for (let k = 0; k < 8; k++)
      leaf(
        r,
        C,
        [1.4, s * (3.5 - k * 0.27), 2 - k * 0.68],
        [-4.5 - k * 0.65, s * (7.5 - k * 0.2), 1.5 - k * 1.03],
        1.25,
        cream,
        rose,
      );
    const E = H.at(10.5, s * 11.1, 4.6).turn(s * 0.4);
    // Dark sable mask and cream eyebrow surround the eye even in a side view.
    r.tag = 'head';
    r.ell(E, [-1, 0, 0], [3.6, 7.9, 6.5], umber);
    rod(r, E, [-0.1, -3.9, 7.2], [0.6, 3.2, 7.4 + grin], 1.4, cream, 2);
    const first = r.prims.length;
    r.tag = 'eye' + name;
    j['eye' + name] = E.p(4.6, 0, 0);
    if (shut < 0.85) {
      const h = 1 - 0.86 * shut;
      r.ell(E, [1.4, 0, 0.2], [3, 5.3, 5.2 * h], night);
      r.ell(E, [3.6, 0.35, -1.1 * h], [1.06, 3.6, 2.5 * h], bronze);
      r.ell(E, [4, 0, 0.5 * h], [1.06, 2.75, 3.3 * h], night);
      r.dot(E.p(5.05, -1.3, 2.4 * h), milk, 0.15, 1.35, 1.05);
      r.dot(E.p(4.95, 1.4, -1.45 * h), glint, 0.1, 0.68, 1);
    } else
      for (let k = 0; k < 5; k++)
        rod(
          r,
          E,
          [2, -4 + k * 1.6, 0.4 + Math.sin((k * Math.PI) / 5) * 1.8],
          [2, -4 + (k + 1) * 1.6, 0.4 + Math.sin(((k + 1) * Math.PI) / 5) * 1.8],
          0.7,
          umber,
        );
    r.markEye(first, s, shut < 0.85);
  }
  r.tag = 'nose';
  r.ell(H, [13.5, 0, -3.8], [8.6, 12.1, 7.35], cream);
  r.ell(H, [19.6, 0, -0.7], [3.3, 4.8, 2.8], umber);
  j.nose = H.p(22.6, 0, -0.7);
  r.dot(H.p(22.1, -1.5, 0.15), milk, 0, 0.92, 0.8);
  for (const s of [-1, 1]) {
    let last = H.p(21.85, 0, -3.6);
    for (let k = 1; k <= 6; k++) {
      const u = k / 6,
        q = H.p(21.5 - 2.7 * u, s * 6.2 * u, -4.1 - 1.9 * Math.sin(Math.PI * u) + grin * u);
      r.line(last, q, ink, 0, 0.7);
      last = q;
    }
    for (let k = 0; k < 3; k++) {
      const a = H.p(13.8 - k * 0.4, s * (10 + k * 0.35), -3 - k * 0.9);
      r.dot(a, umber.T[1], 0, 0.65, 0.7);
      r.line(a, H.p(7.5 - k * 2.2, s * (20 + k * 2.4), -3.8 - k * 2), rose.T[3], 0, 0.05);
    }
  }
  r.tag = 'head';
  r.ell(H, [10.5, 0, -9], [5.8, 9, 3.8], cream);
  if (form > 0.4) for (const s of [-1, 1]) rod(r, H, [-2.7, s * 12, 15], [1, s * 6, 15.9], 0.93, brass);
  r.eye = shut < 0.85 ? j.eyeR : null;
}
export function beast(r: Rig, F: F3, p: JointPose, j: Marks) {
  const low = p.low || 0,
    gait = p.gait || 0,
    breathe = p.breathe || 0;
  const B = F.at(-low * 2, 0, 3.2 - 6.6 * low + (p.bounce || 0) + breathe * 0.85)
    .pitch(p.lean || 0)
    .roll((p.gait || 0) * 0.034);
  r.tag = 'body';
  j.body = B.p(0, 0, 28);
  j.root = F.o;
  r.ell(B, [-2, 0, 28], [25, 19, 20.8], shadowFur);
  r.ell(B, [10.3, 0, 30], [17, 16.4, 20], fur);
  r.ell(B, [16.5, 0, 32], [11, 12.6, 14.2], cream);
  mantle(r, B, p, j);
  tail(r, B, p, j);
  const H = B.at(22.7, 0, 43 - 2.5 * Math.max(0, p.turnHead || 0))
    .turn(-0.18 + (p.turnHead || 0) * 0.66)
    .pitch(p.chin || 0);
  head(r, H, p, j);
  for (const s of [-1, 1]) {
    const tag = s < 0 ? 'L' : 'R',
      reach = p['reach' + tag] ?? (p.reach || 0),
      lift = p.leap || 0,
      g = gait * s;
    const u = ((p.step ?? 0) + (s < 0 ? 0.5 : 0)) % 1,
      v = (u - 0.5) * 2;
    const stride = p.step === undefined ? 0 : 24 / 1.115;
    // In stance the sole moves back by exactly the distance covered by the floor track.
    const push = stride * (u < 0.5 ? 0.25 - u : -0.25 + 0.5 * v * v * (3 - 2 * v));
    const rise = p.step !== undefined && u > 0.5 ? 6.2 * Math.sin(Math.PI * v) : 0;
    const hip = B.p(-9, s * 10.5, 17);
    let knee = B.p(-5 + push * 0.43, s * 15, 9 + rise * 0.7),
      foot = F.turn(p['pivot' + tag] || 0).p(-4 + push, s * 14, 4.3 + rise + lift * 5.5 + (p['sole' + tag] || 0));
    if (p.footCycle !== undefined) {
      const phase = s < 0 ? 0.5 : 0,
        q = (p.footCycle + phase) % 1,
        v = 2 * q - 1;
      const displacement = q < 0.5 ? 0.25 - q : -0.25 + 0.5 * v * v * (3 - 2 * v);
      const sweep = ((displacement - (0.25 - phase)) * p.footStride * p.heading) / 1.115;
      const lift = q < 0.5 ? 0 : 7.4 * Math.sin(v * Math.PI);
      foot = vadd(foot, [sweep, 0, lift]);
      knee = vadd(knee, [sweep * 0.55, 0, lift * 0.67]);
    }
    const X = new F3(foot, F.f, F.s, F.u);
    r.tag = 'foot' + tag;
    r.cap(hip, knee, 7, 6, shadowFur);
    r.cap(knee, foot, 6, 4.8, leather);
    r.ell(X, [2, 0, 0.4], [8.9, 5.4, 4.3], leather);
    r.ell(X, [5.2, 0, 1.3], [6.1, 5, 3.1], fur);
    for (let k = -1; k <= 1; k++) r.dot(X.p(8.1, k * 2.6, 2.6), cream.T[2], 0, 0.68, 0.5);
    j['boot' + tag] = X.p(6.5, 0, -1.8);
    j['foot' + tag] = X.p(6.5, 0, -1.8);
    const shoulder = B.p(15, s * 12.4, 32);
    let elbow = B.p(18 + reach * 3, s * (16 - reach), 17 + reach * 8 + lift * 2);
    let palm = B.p(22 + reach * 9, s * (12 - reach * 6.6), 13 + reach * 10.8 + g * 2 + lift * 1.4);
    const swing = (p.footCycle !== undefined ? Math.sin(p.footCycle * Math.PI * 2) * s : 0) * (1 - reach);
    palm = vadd(palm, F.v(swing * 4.2, 0, Math.abs(swing) * 0.9));
    elbow = vadd(elbow, F.v(swing * 2.4, 0, 0));
    const strength = p['goal' + tag] || 0;
    if (strength) {
      const fingertip = new F3(palm, F.f, F.s, F.u).pitch(-reach * 0.45).p(3.6, 0, 0.5);
      const seen = proj(fingertip, 0, 0),
        dx = (p['goal' + tag + 'X'] - p.atX) / 1.115 - seen[0],
        dy = (p['goal' + tag + 'Y'] - p.atY) / 1.115 - seen[1];
      const depth = p['palmDepth' + tag] || 0;
      const wanted = vadd(palm, [dx, depth * 0.8, -dy / 0.8 + depth * 0.6]);
      const direction = vnorm(vsub(wanted, shoulder)),
        length = Math.min(33, vlen(vsub(wanted, shoulder))),
        distance = Math.max(1, length);
      const mid = (17 * 17 - 16 * 16 + distance * distance) / (2 * distance),
        bend = Math.sqrt(Math.max(0, 17 * 17 - mid * mid));
      const raw = vsub(elbow, shoulder),
        normal = vnorm(vsub(raw, vmul(direction, vdot(raw, direction))));
      elbow = vlerp(elbow, vadd(vadd(shoulder, vmul(direction, mid)), vmul(normal, bend)), strength);
      palm = vlerp(palm, vadd(shoulder, vmul(direction, length)), strength);
    }
    r.tag = 'arm' + tag;
    r.cap(shoulder, elbow, 5.3, 4.1, coat);
    r.cap(elbow, palm, 4.5, 3.3, leather);
    const P = new F3(palm, F.f, F.s, F.u).pitch(-reach * 0.45);
    r.tag = 'hand' + tag;
    r.ell(P, [0, 0, 0], [4.2, 4.3, 3.3], fur);
    for (let k = -1; k <= 1; k++)
      rod(r, P, [1.7, k * 2.2, 0], [4.7 - 0.55 * Math.abs(k), k * 2.4, 0.15], 1.35, cream, 1.05);
    j['hand' + tag] = P.p(3.6, 0, 0.5);
    j['shoulder' + tag] = shoulder;
  }
  const q = p.key || 0;
  const hanger = B.p(12, 17.9, 29),
    grip = j.handR;
  j.keyBow = vlerp(hanger, grip, q);
  const K = new F3(j.keyBow, F.f, F.s, F.u).turn(0.55).roll(0.34 + 0.1 * (p.trail || 0) - 1.32 * (p.keyTip || 0));
  r.tag = 'key';
  if (!p.keyInLock) key(r, K, 1.03);
  j.keyTip = K.p(0, 3, -17.4);
  j.belt = hanger;
  r.tag = 'saddle';
  for (const s of [-1, 1]) {
    const A = B.p(-17, s * 14, 41),
      C = B.p(-12, s * 19.2, 26),
      D = B.p(-5, s * 13, 17);
    r.cap(A, C, 1.9, 1.8, leather);
    r.cap(C, D, 1.8, 1.5, leather);
    r.ball(C, 2.3, brass);
    for (let k = 1; k <= 4; k++) r.dot(vlerp(A, C, k / 5), glint, 0, 0.52, 0.9);
  }
}
