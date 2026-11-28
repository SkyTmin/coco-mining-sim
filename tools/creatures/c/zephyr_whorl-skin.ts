// A wind elemental. Its three swept vanes grow out of a single living whorl.
import type { CreatureCard } from '../bodies/card-data';
import { hx, mixc, TAU } from '../kit/f11-mobkit';
import { strideFoot } from '../motion';
import { F3, Rig, vadd, vdot, vlerp, vmul, type Mat, type Tones, type V3 } from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import { Px } from '../rig/px';
import type { JointPose } from '../technique';
import type { Creature, Variant } from '../types';
import { finishSurfaces } from './surface-work';
import { crestInBreeze, home, poseAt, walking } from './zephyr_whorl-keys';
import { breezeAt } from './zephyr_whorl-wind';

type Sockets = Record<string, V3>;
const clamp = (n: number) => Math.max(0, Math.min(1, n));
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
function swatches(card: CreatureCard, variant: Variant) {
  const honey = ['#74475c', '#ba7357', '#e9a866', '#ffe19b'].map((c) => hx(c));
  return Object.fromEntries(
    card.materials.map(({ name, tones }) => [
      name,
      {
        T: [tones[0], tones[1], tones[3], tones[4]].map((c, i) =>
          variant === 'gold' && name === 'jade' ? mixc(hx(c), honey[i], 0.8) : hx(c),
        ) as Tones,
      },
    ]),
  ) as Record<string, Mat>;
}
type Paint = ReturnType<typeof swatches>;
const white = hx('#fff9e4'),
  dark = hx('#3b304d');
const peach: Mat = { T: ['#884b62', '#bd6370', '#ed8a80', '#ffb799'].map((c) => hx(c)) as Tones };
const foam: Mat = { T: ['#418d87', '#69b8a3', '#a2d8b7', '#d4ecc8'].map((c) => hx(c)) as Tones };
const ivory: Mat = { T: ['#817394', '#c7b9b1', '#f6e8cc', '#fff9e5'].map((c) => hx(c)) as Tones };

function crest(r: Rig, H: F3, m: Paint, p: JointPose, points: Sockets) {
  r.tag = 'rotor';
  const fan = p.rotorSpeed ?? 0;
  const root = H.at(-0.8, 0, 7.03)
    .pitch(0.26 + 0.12 * fan)
    .roll(-0.09);
  const phase = (p.rev ?? 0) * TAU + 0.54 + (p.flutter ?? 0);
  r.ell(root, [0, 0, 0.21], [3.1, 3, 1.65], m.jade);
  r.ell(root, [0, 0, 1.3], [2.5, 2.35, 1.1], m.gold);
  for (let blade = 0; blade < 3; blade++) {
    const a = phase + (blade * TAU) / 3,
      curl = clamp((p.bud ?? 0) * 1.2 - blade * 0.075);
    const flare = clamp(-(p.bud ?? 0));
    function section(u: number) {
      const sweep = 0.93 - 0.42 * fan;
      const phi = a + sweep * u - 0.2 * Math.sin(Math.PI * u) + curl * 0.89 * u;
      const radius = mix(
        1.1 + (11.8 + blade * 0.5 + flare + 1.8 * fan) * u,
        1.15 + 2.75 * Math.sin(Math.PI * u) + 0.95 * u,
        curl,
      );
      const z =
        1.42 +
        mix(
          (2.0 * u + (2.7 + 0.32 * blade) * Math.sin(Math.PI * u) + 0.85 * u * u) * (1 - 0.64 * fan),
          8.95 * u + 1.0 * Math.sin(Math.PI * u),
          curl,
        );
      const axis = root.p(radius * Math.cos(phi), radius * Math.sin(phi), z);
      const w = (0.22 + 3.35 * Math.sin(Math.PI * u) ** 0.78) * (1 - 0.3 * curl);
      const across = root.v(-Math.sin(phi), Math.cos(phi), 0.34 - 0.68 * u);
      const lip = (s: number) => vadd(axis, vmul(across, w * s));
      const ridge = vadd(axis, root.v(0, 0, 0.5 + w * 0.13));
      return { left: lip(-1), right: lip(1), ridge };
    }
    let prev = section(0);
    for (let i = 1; i <= 8; i++) {
      const q = section(i / 8);
      const tip = blade === 0 && (i >= 7 || (fan > 0.22 && i === 6));
      r.poly([prev.left, q.left, q.ridge, prev.ridge], tip ? m.gold : m.coral);
      r.poly([prev.ridge, q.ridge, q.right, prev.right], tip ? m.cream : peach);
      r.poly([prev.right, q.right, q.left, prev.left], m.coral);
      r.line(prev.ridge, q.ridge, i < 7 ? m.coral.T[2] : m.gold.T[3]);
      if (i >= 2 && i <= 6) {
        r.line(vlerp(prev.left, prev.ridge, 0.24), q.ridge, m.coral.T[1]);
        r.line(vlerp(prev.right, prev.ridge, 0.28), vlerp(q.right, q.ridge, 0.61), peach.T[2]);
      }
      prev = q;
    }
    points['blade' + blade] = prev.ridge;
    if (fan > 0.15) {
      const tipPhi = a + 0.93 - 0.42 * fan,
        rad = 12.9 + 0.5 * blade + flare + 1.8 * fan;
      const trail = (v: number) =>
        root.p(rad * Math.cos(tipPhi - v), rad * Math.sin(tipPhi - v), 4.77 - 1.83 * fan);
      for (let j = 0; j < 3; j++) {
        const from = 0.12 + j * 0.2;
        r.line(trail(from), trail(from + 0.15 * fan), blade === 0 ? m.gold.T[2] : m.coral.T[2]);
      }
    }
  }
  r.ell(root, [0, 0, 2], [1.45, 1.45, 1.22], m.coral);
  r.dot(root.p(0.1, 0.55, 3.05), m.gold.T[3], 0, 0.67);
  points.hub = root.p(0, 0, 2.4);
}

function face(r: Rig, H: F3, m: Paint, p: JointPose, points: Sockets) {
  const air = p.cheek ?? 0,
    lids = p.lids ?? 0,
    smile = p.smile ?? 0,
    purse = p.purse ?? 0;
  r.tag = 'head';
  r.ell(H, [-0.15, 0, -0.1], [7.85, 9.75, 7.62], m.jade);
  // The swept fins start on the temples; their tips point back into the silhouette.
  for (const s of [-1, 1]) {
    r.tag = 'fin' + s;
    const a = H.p(-1.6, s * 7.7, 1.2),
      tip = H.p(-5, s * 11.55, 2.58),
      edge = H.p(-3.85, s * 9.4, 3.78);
    r.poly([a, tip, edge], m.gold);
    r.poly([a, H.p(-3.6, s * 8.9, -0.13), tip], m.jade);
    r.line(a, vlerp(tip, edge, 0.18), m.gold.T[2]);
    r.tag = 'head';
    for (let j = 0; j < 4; j++) {
      const a = 1.43 + j * 0.17,
        z = 0.7 + j * 0.57;
      const dot = H.p(7.79 * Math.cos(a), s * 9.66 * Math.sin(a), z);
      r.line(dot, vadd(dot, H.v(-0.92, s * 0.14, 0.31)), m.jade.T[2]);
    }
    const cheekAir = air * (s < 0 ? 1 - 0.5 * (p.brace ?? 0) : 1);
    const cheek = H.at(5.48 + cheekAir * 0.9, s * (5.12 + 2.7 * cheekAir), -2.06).turn(s * 0.48);
    const swell = 1.7 + 2.65 * cheekAir,
      depth = 1.92 + 1.92 * cheekAir;
    r.tag = s < 0 ? 'cheekL' : 'cheekR';
    r.ell(cheek, [0, 0, 0], [depth, swell, 1.71 + 2.13 * cheekAir], foam);
    for (let j = 0; j < 3; j++) {
      const y = (j - 1) * swell * 0.37;
      r.line(
        cheek.p(depth * 0.96, y, -0.49),
        cheek.p(depth * 0.96, y + 0.21, 0.32),
        j === 1 ? peach.T[2] : m.gold.T[2],
        0,
        0.7,
      );
    }
    points[r.tag] = cheek.p(depth * 0.64, s * swell * 0.74, 0);
    const base = H.at(6.82, s * 5.02, 1.6).turn(s * 0.39);
    const start = r.size;
    r.tag = s < 0 ? 'eyeL' : 'eyeR';
    r.ell(base, [0, 0, 0.05], [0.64, 2.77, 3.2], m.plum);
    if (lids < 0.87) {
      const eye = base.at(0.26, 0, 0.04).roll(s * 0.07);
      const k = 1 - 0.69 * lids,
        offset = clamp(0.5 + 0.5 * (p.gaze ?? 0)) - 0.5;
      r.ell(eye, [0.2, 0, 0], [0.79, 2.58, 3.05 * k], ivory);
      r.ell(
        eye,
        [0.69, -s * 0.24 + offset * 0.71, (p.eyesUp ?? 0) * 0.72 + 0.06],
        [0.7, 1.67, 2.38 * k],
        m.eye,
      );
      r.ell(
        eye,
        [1.24, -s * 0.22 + offset * 0.7, 0.26 + (p.eyesUp ?? 0) * 0.72],
        [0.49, 1.15, 1.82 * k],
        m.plum,
      );
      r.dot(eye.p(1.77, -0.43 + offset * 0.65, 1.21 * k + (p.eyesUp ?? 0) * 0.64), white, 0, 0.85, 1.05);
      r.dot(eye.p(1.52, 0.55, -0.55 * k + (p.eyesUp ?? 0) * 0.62), m.cream.T[3], 0, 0.43, 1);
    } else {
      r.ell(base, [0.48, 0, 0.06], [0.98, 2.7, 3.14], m.jade);
      r.line(base.p(1.44, -1.93, -0.02), base.p(1.64, 0.1, -0.56), dark);
      r.line(base.p(1.64, 0.1, -0.56), base.p(1.32, 2.04, 0.1), dark);
    }
    points[r.tag] = base.p(1, 0, 0);
    if (lids < 0.87 && vdot(base.f, [0, 0.8, 0.6]) > 0.2) r.eye = points[r.tag];
    r.markEye(start, s, lids < 0.87);
    r.tag = 'head';
    const brow = base.at(-0.13, 0, 3.48 + 0.24 * air);
    r.cap(brow.p(0, -1.65, -s * 0.21), brow.p(0.45, 0.32, 0.21), 0.47, 0.59, m.cream);
    r.cap(brow.p(0.45, 0.32, 0.21), brow.p(0, 1.6, s * 0.22), 0.59, 0.26, m.cream);
  }
  r.tag = 'head';
  const nozzle = (p.brace ?? 0) * purse;
  r.ell(H, [7.08 + 0.52 * nozzle, 0, -1.77], [1.89 + 0.77 * nozzle, 3.06, 1.68], m.cream);
  const lip = H.at(8.88 + 0.4 * air + 1.3 * nozzle, 0, -1.76);
  r.tag = 'mouth';
  if (purse > 0.035) {
    // A rounded lip opens on the pale muzzle. The little dark aperture is the source of the wind.
    const rim = lip.at(0.26 + 0.56 * purse, 0, 0).turn(0.23 * purse);
    r.ell(rim, [0.06, 0, 0.06], [0.87, 1.82, 1.1 + 0.92 * purse], peach);
    r.ell(rim, [0.81, 0, 0.1], [0.49, 1.2, 0.66 + 0.65 * purse], m.eye);
    r.dot(rim.p(0.93, 0.46, -0.64), peach.T[2], 0, 0.48, 1);
    points.mouth = rim.p(1.21, 0, 0.12);
  } else {
    const a = lip.p(-0.22, -1.93, 0.23),
      middle = lip.p(0.18, 0, -0.57 - 0.67 * smile),
      b = lip.p(-0.22, 1.93, 0.23);
    r.cap(a, middle, 0.34, 0.49 + 0.4 * smile, m.plum);
    r.cap(middle, b, 0.49 + 0.4 * smile, 0.34, m.plum);
    if (smile > 0.3) r.ell(lip, [0.48, 0, -0.96], [0.34, 0.84, 0.39], peach);
    points.mouth = middle;
  }
  r.tag = 'head';
  // A large clean forehead marking and two satellite drops echo the belly whorl.
  r.ell(H, [4.8, 0, 4.7], [1.62, 1.35, 1.74], m.cream);
  for (const s of [-1, 1]) {
    // The forked forelock marking bends on the same head surface as the brows.
    function marking(u: number, dy: number) {
      const y = s * (1.28 + 4.65 * u),
        z = 5.14 + 0.61 * Math.sin(Math.PI * u) - 0.75 * u + dy;
      const x = 7.88 * Math.sqrt(1 - (y / 9.75) ** 2 - ((z + 0.1) / 7.65) ** 2);
      return H.p(x + 0.12, y, z);
    }
    for (let k = 0; k < 5; k++) {
      r.line(marking(k / 5, 0), marking((k + 1) / 5, 0), m.cream.T[2]);
      if (k > 1) r.line(marking(k / 5, 0.68), marking((k + 1) / 5, 0.68), m.jade.T[3]);
    }
    r.dot(H.p(4.64, s * 2.11, 5.23), m.cream.T[2], 0, 0.58);
    r.line(H.p(1.4, s * 5.44, 5.43), H.p(-0.65, s * 6.03, 5.48), m.jade.T[2]);
  }
  points.head = H.o;
}

function mantle(r: Rig, B: F3, m: Paint, p: JointPose, points: Sockets) {
  r.tag = 'body';
  r.ell(B, [-0.38, 0, -0.05], [6.83, 7.44, 7.9], m.jade);
  r.ell(B, [0.12, 0, 3.5], [6.52, 7.35, 5.6], m.jade);
  for (const s of [-1, 1]) {
    for (let j = 0; j < 4; j++) {
      const a = 1.84 + j * 0.23,
        z = 1.2 + 0.28 * j;
      const spot = B.p(6.6 * Math.cos(a), s * 7.18 * Math.sin(a), z);
      r.line(spot, vadd(spot, B.v(-0.85, s * 0.12, 0.55)), m.jade.T[2]);
      r.dot(vadd(spot, B.v(0.2, s * 0.17, -0.83)), m.cream.T[1], 0, 0.43, 0.84);
    }
  }
  const bib = B.at(4.32, 0, -0.8);
  r.tag = 'belly';
  r.ell(bib, [0, 0, 0], [3.17, 5.42, 5.68], m.cream);
  const spiral = (u: number) => {
    const a = -1.22 + TAU * 1.22 * u,
      rad = 2.61 * (1 - 0.92 * u),
      y = rad * Math.cos(a),
      z = rad * Math.sin(a);
    return bib.p(3.21 * Math.sqrt(1 - (y / 5.42) ** 2 - (z / 5.68) ** 2), y, z);
  };
  for (let j = 0; j < 19; j++) r.cap(spiral(j / 19), spiral((j + 1) / 19), 0.39, 0.35, m.jade);
  r.ball(spiral(1), 0.64, m.gold);
  for (const s of [-1, 1])
    for (let j = 0; j < 5; j++) {
      const a = 1.05 + j * 0.18,
        k = (j % 2) * 0.5;
      r.dot(
        B.p(5.8 * Math.cos(a), s * 7.1 * Math.sin(a), -0.19 + k),
        m.cream.T[j % 3 === 0 ? 2 : 1],
        0,
        0.39 + 0.13 * k,
        0.95,
      );
    }
  // Two swept edges meet at the same backbone, making the tail a tapered streamer in every view.
  r.tag = 'ribbon';
  const sway = p.tail ?? 0,
    wiggle = p.wiggle ?? 0;
  const back = (u: number) =>
    B.p(
      -4.3 - 10.5 * u + 1.55 * u * u,
      sway * Math.sin(Math.PI * u) * 2.5 + wiggle * u,
      -1 + 9.3 * u - 4.2 * Math.sin(Math.PI * u) + 2.2 * sway * u,
    );
  let a = back(0);
  for (let j = 1; j <= 10; j++) {
    const u = j / 10,
      b = back(u),
      w = 1.54 * (1 - 0.76 * u) + 0.7 * Math.sin(Math.PI * u);
    const edge = (v: V3, s: number) => vadd(v, B.v(0, s * w, s * w * 0.52));
    r.poly([edge(a, -1), edge(b, -1), b, a], m.jade);
    r.poly([a, b, edge(b, 1), edge(a, 1)], j > 7 ? m.coral : m.jade);
    r.line(a, b, j > 7 ? m.gold.T[2] : m.jade.T[2]);
    a = b;
  }
  points.tailTip = a;
}

function arms(r: Rig, F: F3, B: F3, m: Paint, p: JointPose, step: number, points: Sockets) {
  const reach = p.reach ?? 0,
    out = p.armsOut ?? 0,
    inside = p.armsIn ?? 0;
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'L' : 'R',
      use = s < 0 ? reach : 0;
    const sh = B.p(0.05, s * 6.15, 3.12);
    const down = p.armsDown ?? 0,
      brace = p.brace ?? 0;
    const gesture = B.p(
      2.4 + inside * 3.7 + step * s - 2.6 * down + 3.5 * brace,
      s * (7.85 + 4.2 * out - 3.45 * inside + 2.0 * down - 4.6 * brace),
      -0.43 + 6.7 * out + 2.23 * inside - 4.49 * down - 0.56 * brace,
    );
    const aim: V3 = [
      18.15 + (p.release ?? 0) * 4.08 - (p.windup ?? 0) * 1.9,
      7.4 + (p.windup ?? 0) * 1.7,
      B.o[2] + 2.95 + 11 * (p.high ?? 0),
    ];
    const palm = vlerp(gesture, aim, use);
    const elbow = vadd(vlerp(sh, palm, 0.53), F.v(-1.24, s * 1.7, -1.86 + out));
    r.tag = 'arm' + side;
    r.cap(sh, elbow, 2.12, 1.64, m.jade);
    r.cap(elbow, palm, 1.61, 1.04, m.jade);
    const wrist = vlerp(elbow, palm, 0.81);
    r.cap(vlerp(elbow, palm, 0.68), wrist, 1.49, 1.52, m.gold);
    const angle = Math.atan2(F.f[1], F.f[0]);
    const hand = F3.yaw(mix(angle, 0.13, use), palm);
    r.tag = 'hand' + side;
    r.ell(hand, [0, 0, 0], [2.02 + 0.37 * use, 1.57 + 0.28 * use, 1.51 + 0.28 * use], m.plum);
    const grasp = (p.grip ?? 0) * use;
    const thumb = hand.p(1.91 + 0.42 * grasp, 0.59, 0.22 + 1.34 * use + 0.29 * grasp);
    const index = hand.p(2.05 + 0.28 * grasp, -0.39, 0.2 + 4.48 * use - 2.7 * grasp);
    r.cap(hand.p(0.3, 0.96, 0.1), thumb, 0.79, 0.61, m.plum);
    r.cap(hand.p(0.32, -0.65, 0.68), index, 0.92, 0.64, m.plum);
    r.cap(hand.p(0.0, -0.88, 0), hand.p(1.42, -0.94, -0.42), 0.75, 0.53, m.plum);
    r.dot(thumb, m.cream.T[2], 0, 0.42, 0.75);
    points['hand' + side] = palm;
    if (s < 0) {
      points.pinch = hand.p(2.34, 0.1, 1.95);
      points.thumb = thumb;
      points.finger = index;
    }
  }
}

function boots(
  r: Rig,
  F: F3,
  B: F3,
  m: Paint,
  p: JointPose,
  walk: boolean,
  step: number,
  pivot: number | undefined,
  stride: number,
  points: Sockets,
) {
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'L' : 'R',
      phase = s < 0 ? 0.5 : 0,
      gait = strideFoot(step, phase, stride);
    const height = p['high' + side] ?? 0;
    let foot = F.p(
      walk ? gait.forward : (p['ahead' + side] ?? 0),
      s * (3.26 + (p['out' + side] ?? 0)),
      1.09 + (walk ? gait.lift * 3.2 : height),
    );
    if (pivot !== undefined) {
      const q = (pivot + phase) % 1,
        u = clamp((q - 0.5) * 2),
        angle = ((u * u * (3 - 2 * u) - q + 0.25) * Math.PI) / 4;
      foot = F.turn(angle).p(s * stride * 0.25, s * 3.26, 1.09 + 1.9 * Math.sin(Math.PI * u));
    }
    const tuck = p.tuck ?? 0;
    foot = vlerp(foot, B.p(-2.1, s * 5.3, -7.1), tuck);
    const hip = B.p(-0.9, s * 3.35, -3.38);
    r.tag = 'leg' + side;
    if (height > 0) {
      const knee = vadd(vlerp(hip, foot, 0.53), F.v(height * 0.53, 0, height * 0.24));
      r.cap(hip, knee, 2.08, 1.65, m.jade);
      r.cap(knee, foot, 1.65, 1.33, m.jade);
    } else r.cap(hip, foot, 2.08, 1.33, m.jade);
    const boot = new F3(foot, F.f, F.s, F.u).pitch(-0.62 * tuck - 0.118 * height);
    r.tag = 'foot' + side;
    r.ell(boot, [1.15, 0, 0.5], [3.1, 1.98, 1.35], m.plum);
    // The ochre sole and its two dark treads appear when the shoe turns up. In stance they meet the dirt.
    r.ell(boot, [1.14, 0, -0.44], [2.5, 1.57, 0.38], m.gold);
    for (const tread of [0.45, 1.9])
      r.cap(boot.p(tread, -0.79, -0.72), boot.p(tread + 0.24, 0.72, -0.72), 0.24, 0.31, m.plum);
    for (const toe of [-1, 1]) {
      const E = boot.at(2.72, toe * 0.82, 0.1).pitch((p.feetGrip ?? 0) * 0.32);
      r.ell(E, [0.34, 0, 0.31], [1.42, 0.88, 0.78], m.plum);
      r.line(E.p(0.91, -0.44, 0.64), E.p(1.42, 0.15, 0.28), m.cream.T[2]);
    }
    r.line(boot.p(-0.75, s * 1.6, 0.14), boot.p(2.1, s * 1.68, -0.02), m.gold.T[2]);
    points['foot' + side] = boot.p(1, 0, -1.09);
  }
}

export function windling(card: CreatureCard): Creature['frame'] {
  const scale = card.proportions.scale,
    palette = { normal: swatches(card, 'normal'), gold: swatches(card, 'gold') };
  return (anim, t, side, variant, motion) => {
    const n = Math.round(t * 24),
      walk = anim === 'walk',
      turn = anim === 'turn',
      step = motion?.gaitPhase ?? t;
    const p = { ...poseAt(anim, t), ...motion?.techniquePose };
    if (anim === 'trick') p.brace = p.armsDown ?? 0;
    if (p.rev !== undefined) {
      let previous = poseAt(anim, Math.max(0, t - 1 / 24)).rev ?? 0;
      if (anim === 'trick_b') {
        const i = Math.min(n, crestInBreeze.length - 1);
        p.rev += crestInBreeze[i];
        previous += crestInBreeze[Math.max(0, i - 1)];
        const air = breezeAt(n, home[0] + p.x);
        p.wiggle = air * (3.4 + 1.6 * Math.sin(n * 0.53));
      }
      p.rotorSpeed = clamp((Math.abs(p.rev - previous) - 0.009) / 0.085);
    }
    if (walk || turn) Object.assign(p, walking);
    if (anim === 'idle' || anim === 'sleep') {
      const q = Math.sin((t * TAU) / 3);
      p.lean = (p.lean ?? 0) + q * 0.28;
      p.flutter = q * 0.065;
      p.wiggle = q * 1.15;
      if (anim === 'idle') {
        p.tilt = q * 0.072;
        p.headTurn = 0.11 * q;
        if (n >= 48 && n <= 54) p.lids = Math.sin(((n - 48) * Math.PI) / 6);
      }
    }
    const pivot = turn && Number.isInteger(side) ? (4 * t) % 1 : 0;
    const F = F3.yaw(card.life.yaw + ((side + pivot) * Math.PI) / 8);
    const bob = walk ? 0.64 * (1 - Math.cos(2 * TAU * step)) : 0;
    const B = F.at(p.lean ?? 0, p.weight ?? 0, 10.9 - 4.48 * (p.low ?? 0) + bob).roll((p.tilt ?? 0) * 0.27);
    const H = B.at(0.38, 0, 10.25 - 1.1 * (p.low ?? 0))
      .turn(p.headTurn ?? 0)
      .roll(p.tilt ?? 0)
      .pitch(p.nod ?? 0);
    const r = new Rig(),
      m = palette[variant],
      points: Sockets = { root: B.o, floor: [0, 0, 0] };
    r.innerInk = hx('#34535a');
    mantle(r, B, m, p, points);
    boots(r, F, B, m, p, walk, step, turn ? pivot : undefined, card.life.stride / scale, points);
    arms(r, F, B, m, p, walk ? Math.sin(TAU * step) * 1.55 : (p.armSwing ?? 0), points);
    face(r, H, m, p, points);
    crest(r, H, m, p, points);
    finishSurfaces(
      r,
      F,
      [
        [m.jade, 'lacquer'],
        [m.plum, 'strap'],
        [m.eye, 'iris'],
        [m.coral, 'paper'],
        [m.gold, 'ivory'],
      ],
      'ivory',
    );
    scaleFigure(r, points, scale, scale * 1.01);
    const frame = projectFigure(r, 96, [48, 74], points, '#2c384a', 3.15, true);
    frame.dy = -(p.alt ?? 0);
    frame.groundShadow = { radius: 12, opacity: 0.4 - 0.14 * clamp((p.alt ?? 0) / 15) };
    if (anim === 'trick_b' && n >= 81 && n <= 130) {
      const cut = Math.max(0, Math.ceil(frame.anchor[1] + 125 - home[1] - p.y - frame.dy));
      if (cut < frame.px.h) {
        frame.over = new Px(frame.px.w, frame.px.h);
        const byte = cut * frame.px.w * 4;
        frame.over.data.set(frame.px.data.subarray(byte), byte);
      }
    }
    return frame;
  };
}
