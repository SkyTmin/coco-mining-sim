// The crooked moon ears and cotton pom are part of the same turning figure as the face.
import type { CreatureCard } from '../bodies/card-data';
import { rotateFromTo } from '../bodies/rig-transform';
import { hx, mixc, TAU } from '../kit/f11-mobkit';
import { strideFoot } from '../motion';
import {
  CE,
  SE,
  F3,
  Rig,
  vadd,
  vdot,
  vlerp,
  vmul,
  vsub,
  type Mat,
  type Tones,
  type V3,
} from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import type { JointPose } from '../technique';
import type { Creature } from '../types';
import { finishSurfaces } from './surface-work';
import { heldPillow, pillowDepth, pillowGrip, placePillow } from './lunar_plush-pillow';
import { cushionAt, home, poseAt } from './lunar_plush-keys';

type Pigments = Record<string, Mat>;
type Sockets = Record<string, V3>;
const milkLight = hx('#fff9ec');
const clamp = (x: number) => Math.max(0, Math.min(1, x));
function palette(card: CreatureCard, gold: boolean): Pigments {
  const pearl = ['#977765', '#c19a72', '#f0cc8b', '#ffe9be'].map((c) => hx(c));
  const colors: Pigments = Object.fromEntries(
    card.materials.map(({ name, tones }) => [
      name,
      {
        T: [tones[0], tones[1], tones[3], tones[4]].map((c, i) =>
          gold && name === 'lilac' ? mixc(hx(c), pearl[i], 0.88) : hx(c),
        ) as Tones,
      },
    ]),
  );
  // Short, close-set fibres break up the nap without striping the forehead.
  const fleece = colors.cream;
  const soft = Array.from({ length: 25 }, (_, i) => {
    const v = i / 8,
      k = Math.min(2, Math.floor(v));
    return mixc(fleece.T[k], fleece.T[k + 1], v - k);
  });
  fleece.pat = (q, l) => {
    const tuft = Math.sin(19 * q[1] + 4 * Math.sin(8 * q[2]) + 1.4 * q[0]) * Math.sin(24 * q[2] - 6 * q[1]);
    const light = Math.max(0, Math.min(24, (l + 0.36) * 17.4 + 0.93 * tuft));
    return soft[Math.round(light)];
  };
  return colors;
}
function ears(r: Rig, H: F3, p: JointPose, m: Pigments, pts: Sockets, hugging: boolean) {
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'L' : 'R';
    r.tag = 'ear' + side;
    const flop = hugging
      ? 0
      : (p.droop ?? 0) * 0.63 +
        (p.drag ?? 0) * 0.24 +
        (p.earSway ?? 0) * 0.1 -
        (p.ears ?? 0) * (s < 0 ? 0.23 : 0.38);
    const base = H.at(-0.9, s * 4.7, 5.3).roll(-s * flop);
    // The thick base curves outwards, then folds back over an open notch.
    const spine = (u: number, front = 0) => {
      const a = u * Math.PI * 1.29 - 0.62;
      const lateral = 4.9 + 7.7 * Math.sin(a),
        up = 4.6 - 7.2 * Math.cos(a);
      return base.p(-0.78 + 1.9 * u + front, s * lateral, up);
    };
    // A single continuous velvet lining faces forward. The plump outer rim
    // remains visible on both sides of the pink panel as the ear flops.
    const slices = 10,
      segments = 12;
    function ring(u: number) {
      const a = u * Math.PI * 1.29 - 0.62;
      const w = 2.7 * (1 - u) + 2.5 * Math.sin(Math.PI * u) + 0.28;
      const depth = w * (0.56 + 0.1 * Math.sin(Math.PI * u));
      const mid = spine(u);
      return Array.from({ length: slices }, (_, i) => {
        const angle = ((i + 0.5) * TAU) / slices;
        return vadd(
          mid,
          base.v(
            depth * Math.cos(angle),
            s * w * Math.sin(angle) * Math.sin(a),
            -w * Math.sin(angle) * Math.cos(a),
          ),
        );
      });
    }
    const nap = Array.from({ length: 25 }, (_, i) => {
      const u = i / 8,
        k = Math.min(2, Math.floor(u));
      return mixc(m.rose.T[k], m.rose.T[k + 1], u - k);
    });
    const lining: Mat = {
      T: m.rose.T,
      pat(q, l) {
        const pt: V3 = [q[0] - base.o[0], q[1] - base.o[1], q[2] - base.o[2]];
        const across = vdot(pt, base.s) * s,
          height = vdot(pt, base.u);
        const fold = Math.sin(1.2 * across - 0.6 * height + Math.sin(0.77 * height));
        const velvet = Math.sin(2.5 * across + height) * Math.cos(2.1 * height);
        return nap[Math.round(24 * clamp(0.47 + 0.6 * l + 0.041 * fold + 0.023 * velvet))];
      },
    };
    let prev = ring(0);
    for (let j = 1; j <= segments; j++) {
      const row = ring(j / segments);
      for (let i = 0; i < slices; i++) {
        const next = (i + 1) % slices,
          front = Math.cos(((i + 1) * TAU) / slices);
        const mat = j >= 12 ? m.honey : front > 0.65 && j > 1 && j < 11 ? lining : m.lilac;
        r.poly([prev[i], row[i], row[next], prev[next]], mat);
      }
      prev = row;
    }
    r.ball(spine(1), 0.68, m.honey);
    for (let j = 0; j < 3; j++) {
      const root = base.p(1.1, s * (1.6 + j * 0.8), -0.22 + j * 0.39);
      r.cap(root, vadd(root, base.v(0.7, s * 0.45, 1.75 - j * 0.29)), 1.01, 0.32, m.cream);
    }
    pts['ear' + side] = spine(1);
  }
}
function face(r: Rig, H: F3, p: JointPose, m: Pigments, pts: Sockets) {
  r.tag = 'head';
  r.ell(H, [0, 0, 0], [8.2, 10.55, 8.25], m.cream);
  const grin = p.grin ?? 0;
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'L' : 'R';
    const shy = Math.max(p.shy ?? 0, p['brush' + side] ?? 0);
    // Puffed white jowls give the head a wide, low silhouette.
    r.tag = 'head';
    const cheek = H.at(5.35, s * 5.25, -2.13).turn(s * 0.45);
    r.ell(cheek, [0, 0, 0], [2.95, 4.12, 2.65], m.milk);
    r.tag = 'cheek' + side;
    const blush = cheek.at(2.2, s * 1.54, 0.13);
    r.ell(blush, [0, 0, 0], [0.89, 2.06 + 0.8 * shy, 1.11 + 0.51 * shy], m.rose);
    for (const [a, b] of [
      [-0.92, -0.09],
      [0.16, 0.32],
      [0.88, -0.17],
    ])
      r.dot(blush.p(0.78, a, b), m.rose.T[1], 0, 0.3);
    pts[r.tag] = blush.p(0.92, 0, 0);
    const eye = H.at(6.93, s * 4.57, 1.36).turn(s * 0.29);
    const cover = p['cover' + side] ?? 0;
    const lids = clamp(Math.max(p['lid' + side] ?? p.lids ?? 0, (cover - 0.63) / 0.27)),
      lift = 1 - lids;
    r.tag = 'eye' + side;
    const start = r.size;
    if (lift > 0.12) {
      const g = p.glance ?? 0,
        up = p.gazeUp ?? 0;
      r.ell(eye, [0, 0, 0], [1.03, 2.56, 3.0 * lift], m.cocoa);
      r.ell(eye, [0.54, 0, 0.02], [0.85, 2.25, 2.74 * lift], m.iris);
      r.ell(eye, [1.1, -g * 0.4, -0.68 * lift], [0.36, 1.52, 1.16 * lift], m.iris);
      r.dot(eye.p(1.36, -0.59 - g * 0.31, (1.25 + 0.22 * up) * lift), milkLight, 0, 0.84, 1.1);
      r.dot(eye.p(1.42, 0.72, -0.62 * lift), m.honey.T[3], 0, 0.45, 1);
    } else {
      // The lid is an upward arch; the pillow-side eye still reads while the cheek is pressed.
      const a = eye.p(1.07, -2.16, -0.32),
        b = eye.p(1.66, -0.2, 0.49),
        c = eye.p(1.15, 2.18, -0.32);
      r.cap(a, b, 0.28, 0.48, m.cocoa);
      r.cap(b, c, 0.48, 0.25, m.cocoa);
    }
    pts[r.tag] = eye.p(1.08, 0, 0);
    if (lift > 0.12 && vdot(eye.f, [0, 0.8, 0.6]) > 0.2) r.eye = pts[r.tag];
    r.markEye(start, s, lift > 0.12);
    r.tag = 'head';
    r.cap(eye.p(-0.35, -1.23, 3.48), eye.p(0.22, 0.9, 3.64), 0.46, 0.42, m.milk);
    // Cheek fluff and a few quiet comb marks on the back of the head.
    const tuft = H.p(-2.6, s * 9.67, -1.78);
    r.cap(H.p(-0.1, s * 9.05, -2), tuft, 1.92, 0.77, m.cream);
    for (let j = 0; j < 4; j++) {
      const angle = 1.72 + j * 0.21,
        z = 1.2 + j * 0.48,
        k = Math.sqrt(1 - (z / 8.25) ** 2);
      const a = H.p(8.2 * k * Math.cos(angle), s * 10.55 * k * Math.sin(angle), z);
      r.line(a, vadd(a, H.v(-0.61, s * 0.12, 0.61)), m.cream.T[j % 2 ? 2 : 1]);
    }
  }
  r.tag = 'head';
  const lock = (u: number) => {
    const y = -2.65 + 4.05 * Math.sin(Math.PI * u * 0.94),
      z = 7.26 - 2.52 * u;
    const f = 8.2 * Math.sqrt(Math.max(0, 1 - (y / 10.55) ** 2 - (z / 8.25) ** 2));
    return H.p(f + 0.1, y, z);
  };
  for (let i = 0; i < 7; i++) {
    const a = i / 7,
      b = (i + 1) / 7;
    r.cap(lock(a), lock(b), 0.22 + 0.45 * Math.sin(Math.PI * a), 0.17 + 0.45 * Math.sin(Math.PI * b), m.milk);
  }
  r.tag = 'head';
  r.ell(H, [7.12, 0, -1.64], [2.35, 3.55, 2.12], m.milk);
  r.tag = 'nose';
  const nose = H.at(9.26, 0, -0.83);
  r.ell(nose, [0, 0, 0], [0.98, 1.49, 0.94], m.cocoa);
  r.dot(nose.p(0.73, -0.32, 0.48), m.milk.T[3], 0, 0.41, 1);
  pts.nose = nose.p(0.91, 0, 0.33);
  r.tag = 'mouth';
  const lip = H.at(9.04, 0, -2.27);
  r.line(lip.p(0.1, 0, 0.89), lip.p(0.59, 0, 0.05), m.cocoa.T[1]);
  for (const s of [-1, 1]) {
    const a = lip.p(0.62, 0, 0.05),
      b = lip.p(0.64, s * 0.91, -0.44 - 0.4 * grin),
      c = lip.p(0.14, s * 1.88, 0.09 + 0.35 * grin);
    r.cap(a, b, 0.22, 0.33, m.cocoa);
    r.cap(b, c, 0.33, 0.22, m.cocoa);
  }
  pts.mouth = lip.o;
  pts.head = H.o;
}
function coat(r: Rig, B: F3, p: JointPose, m: Pigments, pts: Sockets) {
  r.tag = 'body';
  r.ell(B, [-0.52, 0, 0], [7, 8.35, 7.8], m.cream);
  r.tag = 'belly';
  const bib = B.at(4.19, 0, -0.91);
  r.ell(bib, [0, 0, 0], [3.05, 5.72, 5.28], m.milk);
  // Embroidered crescent on the front of the belly. The pom and ear hooks echo this arc.
  const stitch = (u: number) => {
    const a = -1.18 + 4.25 * u,
      y = 0.04 + 2.15 * Math.cos(a),
      z = 0.33 + 2.17 * Math.sin(a);
    return bib.p(3.2 * Math.sqrt(1 - (y / 5.72) ** 2 - (z / 5.28) ** 2), y, z);
  };
  for (let j = 0; j < 9; j++) {
    const width = (x: number) => 0.13 + 0.47 * Math.sin(Math.PI * x);
    r.cap(stitch(j / 9), stitch((j + 1) / 9), width(j / 9), width((j + 1) / 9), m.honey);
  }
  for (const [y, z] of [
    [-2.6, 0.8],
    [-1.6, 2.15],
  ])
    r.dot(bib.p(2.8, y, z), m.rose.T[2], 0, 0.44);
  r.tag = 'tail';
  const wag = p.wag ?? 0;
  const stem = (u: number) =>
    B.p(
      -4.3 - 7.75 * u,
      1.4 + 10.4 * u + 1.25 * wag * u,
      -2.1 + 2.1 * u - 2.4 * Math.sin(Math.PI * u) + (1.04 * wag - 2.1 * (p.drag ?? 0)) * u,
    );
  for (let i = 0; i < 5; i++) r.cap(stem(i / 5), stem((i + 1) / 5), 1.04, 1.02, m.lilac);
  const pom = stem(1);
  r.tag = 'pom';
  r.ball(pom, 4.36, m.lilac);
  for (let j = 0; j < 7; j++) {
    const a = (j * TAU) / 7;
    r.ball(vadd(pom, B.v(Math.cos(a) * 2.85, Math.sin(a) * 2.9, j % 2 ? 0.26 : -0.45)), 1.65, m.lilac);
  }
  for (const [x, y, z] of [
    [1.3, 1.4, 3.56],
    [-0.6, 1.2, 4.0],
    [-1.91, -0.56, 3.72],
  ])
    r.line(vadd(pom, B.v(x, y, z)), vadd(pom, B.v(x + 0.68, y + 0.18, z + 0.31)), m.milk.T[2]);
  pts.pom = pom;
}
function feet(
  r: Rig,
  F: F3,
  B: F3,
  p: JointPose,
  m: Pigments,
  pts: Sockets,
  walk: boolean,
  step: number,
  pivot: number | undefined,
  stride: number,
) {
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'L' : 'R',
      offset = s < 0 ? 0.5 : 0,
      gait = strideFoot(step, offset, stride);
    let toe = F.p(
      walk ? gait.forward : (p['ahead' + side] ?? 0),
      s * 3.8,
      1.25 + (walk ? 2.9 * gait.lift : (p['lift' + side] ?? 0)),
    );
    if (pivot !== undefined) {
      const q = (pivot + offset) % 1,
        u = clamp((q - 0.5) * 2);
      const angle = ((u * u * (3 - 2 * u) - q + 0.25) * Math.PI) / 4;
      toe = F.turn(angle).p(s * stride * 0.25, s * 3.8, 1.25 + 1.65 * Math.sin(Math.PI * u));
    }
    toe = vlerp(toe, B.p(-1.35, s * 4.68, -5.5), p.tuck ?? 0);
    const boot = new F3(toe, F.f, F.s, F.u).pitch(-0.37 * (p.tuck ?? 0));
    r.tag = 'leg' + side;
    r.cap(B.p(-0.65, s * 3.6, -3.2), toe, 2.48, 1.72, m.cream);
    r.tag = 'foot' + side;
    r.ell(boot, [1, 0, 0.31], [3.45, 2.5, 1.49], m.milk);
    r.ell(boot, [1, 0, -0.73], [2.31, 1.67, 0.43], m.rose);
    for (const j of [-1, 0, 1])
      r.ell(boot, [2.94 - 0.38 * Math.abs(j), j * 1.06, 0.34], [1.27, 0.76, 0.75], m.milk);
    pts[r.tag] = boot.p(1, 0, -1.22);
  }
}
function paws(
  r: Rig,
  B: F3,
  H: F3,
  p: JointPose,
  m: Pigments,
  pts: Sockets,
  n: number,
  step: number,
  scale: number,
) {
  for (const s of [-1, 1]) {
    const side = s < 0 ? 'L' : 'R';
    const open = p.open ?? 0,
      cover = p['cover' + side] ?? 0;
    const wave = s === (p.waveSide ?? -1) ? (p.wave ?? 0) : 0;
    const brush = p['brush' + side] ?? 0;
    const brace = p[s < 0 ? 'brushR' : 'brushL'] ?? 0;
    const shy = p.shy ?? 0,
      reach = p.reach ?? 0,
      snuggle = p.snuggle ?? 0,
      wiggle = p.wiggle ?? 0;

    // Rolling the shoulders around the ribcage brings the mittens in front of the chest.
    const roll =
      0.95 * reach + 0.84 * cover + 0.68 * shy + 0.4 * snuggle + 0.3 * wave + 0.7 * brush + 0.42 * brace;
    // When the face bows into them the shoulders lift and reach forward together.
    const shrug = B.v(2.55, 0, 1.85);
    const sh = vadd(
      B.p(
        0.2 + 6.1 * Math.sin(roll) + 0.75 * brush + 1.55 * wave + 1.25 * reach,
        s * (6.65 * Math.cos(roll) + 3.35 * wave),
        3.04 + 1.65 * Math.sin(roll) + 0.72 * wave + 0.82 * reach + 0.65 * (p.nest ?? 0) + 1.25 * brush,
      ),
      vmul(shrug, cover),
    );
    const rest = B.v(2.52, s * 1.85, -2.39);
    const bend = vadd(vmul(rest, 0.5), B.v(-0.83, s * 1.62, -1.76));
    let goal = vadd(sh, B.v(2.52 + s * step, s * (1.85 + open * 1.7), -2.39 + open * 4.9));
    goal = vlerp(goal, H.p(7.55, s * 6.95, -2.45), shy);
    // Rest one mitten on the bib so the stroke on the opposite cheek has a clear silhouette.
    goal = vlerp(goal, vadd(sh, B.v(3.0, -s * 1.65, -3.0)), brace);
    const stroke = p.stroke ?? 0;
    goal = vlerp(
      goal,
      vadd(sh, B.v(2.9 + 0.38 * stroke, s * (2.35 + 1.45 * stroke), 0.48 + 3.3 * stroke)),
      brush,
    );
    goal = vlerp(goal, H.p(5.0, s * 5.75, -5.65), snuggle);
    goal = vlerp(
      goal,
      vadd(sh, B.v(1.9 + 0.15 * wiggle, s * (4.2 + 0.3 * wiggle), -0.05 - 3.95 * wiggle)),
      wave,
    );
    goal = vlerp(goal, vadd(H.p(9.15, s * 4.75, 1.9), shrug), cover);
    if (reach) {
      const [px, py, depth] = pillowGrip(cushionAt(n), s);
      const dy = py - home[1] - (p.y ?? 0) + (p.alt ?? 0);
      const grip: V3 = [
        (px - home[0] - (p.x ?? 0)) / scale,
        (SE * dy + CE * depth) / scale,
        (-CE * dy + SE * depth) / scale,
      ];
      goal = vlerp(goal, grip, reach);
    }
    // Rotate the complete folded arm from its idle pose. Neither bone nor the mitten is scaled.
    const turn = rotateFromTo(rest, vsub(goal, sh));
    const elbow = vadd(sh, turn(bend)),
      hand = vadd(sh, turn(rest));
    r.tag = 'arm' + side;
    r.cap(sh, elbow, 2.35, 1.88, m.cream);
    r.cap(elbow, hand, 1.9, 1.6, m.cream);
    const mitten = new F3(hand, H.f, H.s, H.u).pitch(-0.4 * cover).roll(s * wiggle * wave * 0.35);
    r.tag = 'hand' + side;
    r.ell(mitten, [0, 0, 0], [2.05, 2.49, 2.05], m.milk);
    r.ell(mitten, [1.82, 0, -0.01], [0.38, 1.32, 1.19], m.rose);
    for (const j of [-1, 1]) {
      r.ell(mitten, [1.42, j * 0.96, 1.17], [0.5, 0.55, 0.53], m.rose);
    }
    pts[r.tag] = hand;
  }
}
export function plush(card: CreatureCard): Creature['frame'] {
  const scale = card.proportions.scale,
    mats = { normal: palette(card, false), gold: palette(card, true) };
  return (anim, t, side, variant, motion) => {
    const n = Math.round(t * 24),
      p: JointPose = { ...poseAt(anim, t), ...motion?.techniquePose };
    p.waveSide = anim === 'trick_b' ? 1 : -1;
    const walk = anim === 'walk',
      turn = anim === 'turn',
      step = motion?.gaitPhase ?? t;
    const q = Math.sin((t * TAU) / 3);
    if (anim === 'idle' || anim === 'sleep') {
      p.breath = q * 0.33;
      p.earSway = q * 0.68;
      p.wag = q * 0.52;
      if (anim === 'idle') {
        p.tilt = q * 0.046;
        p.head = q * 0.067;
        if (n >= 45 && n <= 51) p.lids = Math.sin(((n - 45) * Math.PI) / 6);
      }
    }
    if (walk) {
      p.wag = Math.sin(TAU * step - 0.5) * 0.7;
      p.earSway = p.wag * 0.54;
    }
    const pivot = turn && Number.isInteger(side) ? (4 * t) % 1 : 0;
    const F = F3.yaw(card.life.yaw + ((side + pivot) * Math.PI) / 8 + (p.yaw ?? 0));
    const bob = walk ? 0.55 * (1 - Math.cos(2 * TAU * step)) : 0;
    const B = F.at(
      p.lean ?? 0,
      p.shift ?? 0,
      10.0 - 4.45 * (p.low ?? 0) + (p.rise ?? 0) + bob + (p.breath ?? 0),
    ).roll((p.tilt ?? 0) * 0.2);
    const tuckFace = p.huddle ?? 0,
      nest = p.nest ?? 0,
      shy = p.shy ?? 0;
    const H = B.at(
      0.15 - 1.05 * tuckFace - 0.2 * shy - 1.35 * (p.reach ?? 0),
      4.15 * (p.reach ?? 0),
      10.7 - (p.low ?? 0) * 1.12 - 1.05 * tuckFace - 0.75 * shy + nest,
    )
      .turn(p.head ?? 0)
      .roll(p.tilt ?? 0)
      .pitch((p.nod ?? 0) + 0.55 * tuckFace + 0.35 * shy + 0.23 * nest);
    const r = new Rig(),
      m = mats[variant],
      pts: Sockets = { root: B.o, floor: [0, 0, 0] };
    r.innerInk = hx('#856b79');
    coat(r, B, p, m, pts);
    feet(r, F, B, p, m, pts, walk, step, turn ? pivot : undefined, card.life.stride / scale);
    ears(r, H, p, m, pts, anim === 'trick');
    face(r, H, p, m, pts);
    paws(r, B, H, p, m, pts, n, walk ? Math.sin(step * TAU) * 1.36 : 0, scale);
    finishSurfaces(
      r,
      F,
      [
        [m.cream, 'ivory'],
        [m.lilac, 'ivory'],
        [m.milk, 'ivory'],
        [m.iris, 'iris'],
        [m.rose, 'skin'],
      ],
      'ivory',
    );
    scaleFigure(r, pts, scale);
    if (anim === 'trick' && heldPillow(n)) {
      const c = cushionAt(n);
      const seam = placePillow(
        r,
        c,
        c.x - home[0] - (p.x ?? 0),
        c.y - home[1] - (p.y ?? 0) + (p.alt ?? 0),
        pillowDepth,
      );
      pts.pillowCrown = seam.crown;
      pts.pillowNotch = seam.notch;
    }
    const frame = projectFigure(r, 96, [48, 75], pts, '#514454', 3.18, true);
    frame.dy = -(p.alt ?? 0);
    frame.groundShadow = { radius: 13, opacity: 0.38 - 0.15 * clamp((p.alt ?? 0) / 16) };
    return frame;
  };
}
