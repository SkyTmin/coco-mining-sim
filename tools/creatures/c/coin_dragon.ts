import { animations as actions, effects, pose } from './coin_dragon-actions';
import { projectFigure } from '../rig/figure';
import {
  F3,
  Rig,
  renderRig,
  vcross,
  vnorm,
  type Mat,
  type V3,
} from '../rig/f15-rig';
import { hx, ik, TAU, tn } from '../kit/f11-mobkit';
import type { BodyFrame, Creature, Variant, XY } from '../types';

const anchor: XY = [71, 112];
const controls = {
  jaw: 0,
  neck: 0,
  tail: 0,
  wings: 0,
  chest: 0,
  lid: 0,
  claw: 0,
  phase: 0,
  twist: 0,
  glance: 0,
  dx: 0,
  dy: 0,
  sx: 1,
  sy: 1,
  rot: 0,
  flash: 0,
  trail: 0,
};
type Controls = typeof controls;
const hideT = tn('#17262d', '#304245', '#52615b', '#899078');
const goldHide = tn('#332532', '#654239', '#987249', '#c49a60');
const bronzeT = tn('#3b2a2b', '#7e5b3c', '#b29156', '#e3c179');
const goldT = tn('#442c26', '#986830', '#d9a94d', '#ffe092');
const silverT = tn('#28383e', '#526168', '#9faea7', '#d9dcd0');
const wingT = tn('#28272e', '#51493d', '#817355', '#ba9d65');
const wingG = tn('#32242d', '#75503e', '#a97943', '#cba361');
const ironT = tn('#20252b', '#333d41', '#566365', '#7d8d88');
const woodT = tn('#342329', '#5e3b30', '#8e5c3f', '#b78054');
const ink = hx('#30272c');
function medal(gold: boolean, reverse: boolean, gleam: boolean): Mat {
  const T = gold || reverse ? goldT : bronzeT;
  return {
    T,
    gpat(q) {
      return gleam && q[2] > 0.48 && q[0] < -0.1 ? 0.4 : 0;
    },
    pat(q, l) {
      const d = Math.hypot(q[0], q[2]),
        face = q[1];
      if (Math.abs(face) < 0.38) return T[0];
      if (d > 0.72 && d < 0.91) return T[q[2] > 0.18 && l > -0.1 ? 3 : 1];
      if (Math.abs(q[0] + 0.36 * q[2]) < 0.12 && Math.abs(q[2]) < 0.45)
        return T[reverse ? 3 : 1];
      if (Math.abs(q[2] - 0.03) < 0.12 && Math.abs(q[0]) < 0.32 && reverse)
        return T[3];
      return null;
    },
  };
}
function panel(r: Rig, F: F3, pts: V3[], m: Mat) {
  r.poly(
    pts.map((p) => F.p(...p)),
    m,
  );
}
function chestBox(
  r: Rig,
  F: F3,
  open: number,
  wood: Mat,
  metal: Mat,
  glow: Mat,
) {
  const front = 8,
    back = -7,
    half = 11,
    bottom = -5,
    lip = 3;
  panel(
    r,
    F,
    [
      [back, -half, bottom],
      [front, -half, bottom],
      [front, -half, lip],
      [back, -half, lip],
    ],
    wood,
  );
  panel(
    r,
    F,
    [
      [back, half, bottom],
      [front, half, bottom],
      [front, half, lip],
      [back, half, lip],
    ],
    wood,
  );
  panel(
    r,
    F,
    [
      [front, -half, bottom],
      [front, half, bottom],
      [front, half, lip],
      [front, -half, lip],
    ],
    wood,
  );
  panel(
    r,
    F,
    [
      [back, -half, lip],
      [front, -half, lip],
      [front, half, lip],
      [back, half, lip],
    ],
    open > 0.2 ? glow : metal,
  );
  const lid = F.at(back, 0, lip).pitch(-open * 1.3);
  const roof: V3[] = [
    [0, 0, 0],
    [2, 0, 3.2],
    [6, 0, 5],
    [10, 0, 4.6],
    [14.5, 0, 2.6],
    [15, 0, 0],
  ];
  for (let i = 0; i < roof.length - 1; i++) {
    const [x, , z] = roof[i],
      [xx, , zz] = roof[i + 1];
    panel(
      r,
      lid,
      [
        [x, -half, z],
        [x, half, z],
        [xx, half, zz],
        [xx, -half, zz],
      ],
      wood,
    );
    for (const y of [-7.6, 7]) {
      panel(
        r,
        lid,
        [
          [x, y, z + 0.18],
          [x, y + 1.8, z + 0.18],
          [xx, y + 1.8, zz + 0.18],
          [xx, y, zz + 0.18],
        ],
        metal,
      );
    }
  }
  for (const s of [-1, 1]) {
    panel(
      r,
      lid,
      roof.map(([x, , z]) => [x, s * half, z]),
      wood,
    );
    r.cap(
      F.p(front + 0.2, s * 7, -5),
      F.p(front + 0.2, s * 7, 3),
      0.8,
      0.8,
      metal,
    );
  }
  r.ell(F, [front + 0.45, 0, 0.2], [0.9, 2.2, 2.7], metal);
  r.dot(F.p(front + 1.6, 0, 0.3), ink, 0, 1);
}
export function coinDragonFrame(
  anim: string,
  t: number,
  side: number,
  variant: Variant,
  external: Partial<Controls> = {},
): BodyFrame {
  const k = { ...controls, ...external };
  const clock =
    anim === 'walk'
      ? (t % 1) * 3
      : ['idle', 'idle-f2', 'sleep'].includes(anim)
        ? t % 3
        : 0;

  const gold = variant === 'gold',
    asleep = anim === 'sleep',
    phase = anim === 'idle-f2' ? 1 : k.phase;
  const cycle = (clock * TAU) / 3 + 2.14,
    breath = Math.sin(cycle);
  const walking = anim === 'walk' || anim === 'away' || anim === 'back';
  const gait = walking ? Math.sin((t % 1) * TAU) : 0;
  const look =
    anim === 'look' ? Math.sin(Math.min(1, t / 1.5) * Math.PI) ** 2 : 0;
  const F = F3.yaw(0.48 + (side * TAU) / 16);
  const root = F.at(
    0,
    gait * 1.3,
    35 + 1.5 * breath - 8 * (asleep ? 1 : 0),
  ).turn(0.16 * k.twist + 0.04 * gait);
  const r = new Rig(),
    frontRig = new Rig();
  const hide: Mat = {
    T: gold ? goldHide : hideT,
    pat(q, l) {
      const d =
        Math.sin(q[0] * 26 + q[2] * 13) * Math.cos(q[1] * 13 - q[2] * 19);
      return d > 0.86 && l > 0.1 ? (gold ? goldHide : hideT)[2] : null;
    },
  };
  const bronze: Mat = { T: gold ? goldT : bronzeT },
    silver: Mat = { T: silverT },
    iron: Mat = { T: ironT },
    wood: Mat = { T: woodT };
  const eyeC = hx(phase > 0.7 ? '#fff1a1' : '#eec077'),
    glint: Mat = { T: [eyeC, eyeC, eyeC, eyeC], glow: 0.82 };
  const membrane: Mat = { T: gold ? wingG : wingT };
  const loc: Record<string, V3> = {};
  // Splayed hind feet carry the full weight. Their toes stay on the floor during the supporting half-step.
  for (const d of [-1, 1]) {
    const stride = Math.max(0, d * gait),
      toe = F.p(-11 + 8 * stride, d * 19, 4 + Math.max(0, stride) * 6),
      hip = root.p(-11, d * 12, -2);
    const knee = ik(hip, toe, 17.5, 17, F.v(0.66, d * 0.38, -0.1));
    r.cap(hip, knee, 10.3, 5.6, hide).cap(knee, toe, 4.8, 3.1, hide);
    const thigh = F3.yaw(0.48 + (side * TAU) / 16, knee);
    r.ell(
      thigh,
      [-1.4, d * 2.7, 3.6],
      [4.8, 2.4, 5.4],
      medal(gold, phase > 0.72, false),
    );
    const boot = F3.yaw(0.48 + (side * TAU) / 16, toe);
    loc[d === 1 ? 'footR' : 'footL'] = boot.p(13, 0, -2);
    r.ell(boot, [3, 0, 0], [8.7, 5.4, 3.3], hide);
    for (let i = -1; i <= 1; i++)
      r.cap(
        boot.p(5, i * 3.1, 0.4),
        boot.p(11 + 2 * (1 - Math.abs(i)), i * 4, -2),
        1.7,
        0.3,
        silver,
      );
  }
  const tailWave = Math.sin(cycle - 0.8);
  const tailSwing = k.tail < 0 ? k.tail*.48 : k.tail;
  const tail = [
    root.p(-18, 0, -4),
    root.p(-32, -1, -8),
    root.p(-43, 5, -13),
    root.p(-47, 17, -12),
    root.p(-41 + 7 * tailSwing, 29 + 6 * tailWave, -8 + 13 * k.tail),
    root.p(-31 + 20 * tailSwing, 38 + 7 * tailWave - 13 * tailSwing, 1 + 20 * k.tail),
  ];
  for (let i = 0; i < tail.length - 1; i++)
    r.cap(tail[i], tail[i + 1], 9.4 - i * 1.65, 7.7 - i * 1.5, hide);
  const bag = F3.yaw(0.48 + (side * TAU) / 16, tail[5]).roll(
    0.13 * tailWave + 0.3 * k.tail,
  );
  r.ell(bag, [0, 0, -0.5], [5.5, 5.5, 7], wood);
  r.ell(bag, [0, 0, 5], [3.1, 3.1, 1.7], bronze);
  r.cap(bag.p(0.5, 0, 5.8), bag.p(4, 1, 8), 1.2, 0.5, bronze);
  loc.tail = bag.p(0, 0, -3);
  r.ell(root, [0, 0, 0], [25, 17, 18], hide).ell(
    root,
    [-9, 0, 1],
    [23, 18, 17],
    hide,
  );
  // Every coin has its own tangent frame on the hide. A staggered array wraps both flanks onto the back.
  for (let row = 0; row < 5; row++) {
    const lat = -0.47 + row * 0.39,
      c = Math.cos(lat),
      h = Math.sin(lat);
    for (let n = 0; n < 11; n++) {
      const a = ((n + (row % 2) * 0.5) * TAU) / 11;
      const normal = vnorm(
        root.v((c * Math.cos(a)) / 25, (c * Math.sin(a)) / 18, h / 18),
      );
      const tangent = vnorm(root.v(-25 * Math.sin(a), 18 * Math.cos(a), 0));
      const up = vnorm(vcross(tangent, normal));
      const pos = root.p(
        -2 + 25 * c * Math.cos(a),
        18 * c * Math.sin(a),
        18 * h,
      );
      const wave =
        phase > 0.01 && (1 + Math.cos(a)) * 0.4 + row * 0.045 < phase;
      const tilt =
        (0.07 +
          0.045 * Math.sin(cycle + row * 0.6 + n * 0.22) +
          k.neck * 0.23) *
        (row / 8 + 0.55);
      const coinFrame = new F3(pos, tangent, normal, up).roll(
        tilt + (wave ? 0.18 : 0),
      );
      const coin = medal(gold, wave, wave && (n + row) % 4 === 0);
      r.ell(coinFrame, [0, 0.2, 0], [6.4 - row * 0.33, 1.5, 4.75], coin);
    }
  }
  const slot = root.at(-2, 0, 18.5);
  r.ell(slot, [0, 0, 0], [9.6, 3.3, 1.5], bronze);
  r.ell(slot, [0, 0, 1.3], [7.8, 1.2, 0.5], phase > 0.3 ? glint : iron);
  loc.slot = slot.p(0, 0, 2);
  // Long angular neck with separate nape, throat and jaw; the head turns independently to inspect the lock.
  const tuck = asleep ? 1 : 0;
  const g = look + k.glance;
  const base = root.p(11, 0, 8),
    bend = root.p(19 + 2 * k.neck, -2, 21 - 10 * tuck),
    upper = root.p(22 + 5 * k.neck, -5, 37 - 20 * tuck + 2 * breath);
  const head = root
    .at(30.5 + 9 * k.neck, -4 + 6 * tuck, 47 - 35 * tuck + 2.3 * breath)
    .turn(0.23 * g + 0.32 * tuck)
    .pitch(0.11 + 0.22 * tuck + 0.1 * g);
  frontRig
    .cap(base, bend, 9, 7.3, hide)
    .cap(bend, upper, 7.8, 5.6, hide)
    .cap(upper, head.o, 5.9, 6.5, hide);
  for (let i = 0; i < 4; i++) {
    const neck = root.at(17 + 2 * i, -1 - i, 15 + 8 * i - 6 * i * tuck);
    frontRig.spike(
      neck.p(-4, 0, 2),
      neck.v(-0.7, 0.05, 0.8),
      7 - i * 0.55,
      2.4,
      bronze,
      3,
      0.2,
    );
    frontRig.ell(neck, [4, 0.3, 0], [3.2, 4.5, 2.0], bronze);
  }
  frontRig.ell(head, [1, 0, 1], [10.4, 8.2, 7.4], hide);
  const nose = head.at(9, 0, 0.8).pitch(0.07);
  frontRig.ell(nose, [1.9, 0, 0], [9.3, 5.6, 3.7], hide);
  for (const d of [-1, 1]) {
    const temple = head.p(-3, d * 5.5, 5.4),
      horn = head.p(-7, d * 8.8, 13.8);
    frontRig
      .cap(temple, horn, 3.3, 2.1, bronze)
      .cap(horn, head.p(-18, d * 10.2, 17), 2.2, 0.45, silver);
    frontRig.cap(
      head.p(-6, d * 5, 0),
      head.p(-11, d * 12, 3.4),
      2.5,
      0.4,
      bronze,
    );
    const eye = head.p(4.4, d * 7.9, 3.5);
    frontRig.ell(head, [3.9, d * 7.4, 3.15], [3.65, 1.2, 2.15], iron);
    const blink = clock > 1.75 && clock < 1.91;
    frontRig.ell(
      head,
      [4.4, d * 8.4, 3.55],
      [2.3, 0.72, blink ? 0.4 : 1.4],
      glint,
    );
    if (!blink) frontRig.dot(eye, ink, 0, 1, 1.4);
    frontRig.cap(
      head.p(-0.5, d * 8.3, 6.6),
      head.p(6.7, d * 7.4, 5.4),
      1.5,
      0.9,
      bronze,
    );
    frontRig.ell(nose, [6.4, d * 3.6, 2.35], [1.6, 0.9, 0.55], iron);
    frontRig.cap(
      nose.p(5, d * 4.3, -2.1),
      nose.p(5.2, d * 4.2, -5.1),
      0.85,
      0.15,
      silver,
    );
    if (d === 1) loc.eye = eye;
  }
  const jaw = head.at(3, 0, -3.3).pitch(0.1 + 0.56 * k.jaw);
  frontRig.ell(jaw, [7, 0, 0.15], [8.3, 4.8, 1.7], bronze);
  loc.mouth = nose.p(9.1, 1, -2.55);
  if (anim === 'peek' && t >= 0.74 && t <= 1.26) {
    // A rim coin clamped between the front fangs follows the jaw beyond the frame.
    const bite = nose.at(9.4, 1, -3).pitch(-0.3).turn(0.32);
    frontRig.ell(bite, [0, 0, -0.6], [3.6, 0.7, 2.8], silver);
    frontRig.line(
      bite.p(-1, 0.8, -0.6),
      bite.p(0.8, 0.8, -1.7),
      hx('#f4e4b9'),
      0.4,
    );
  }
  r.eye = loc.eye;
  // Two bat wings form scalloped awnings over the vault. Ribs sit on top of each membrane panel.
  for (const d of [-1, 1]) {
    const fold = (asleep ? 0.6 : 0) - k.wings;
    const wing = root.at(-4, d * 10, 9).roll(d * fold * 0.42);
    const elbow = wing.p(-5, d * 9, 18 + 5 * k.wings),
      tip = wing.p(-15, d * 17, 32 - 6 * fold);
    const corners = [
      wing.p(-47, d * 18, 13),
      wing.p(-31, d * 16, 14),
      wing.p(-41, d * 14, 2),
      wing.p(-24, d * 11, 7),
      wing.p(-28, d * 7, -6),
      wing.p(-11, d * 4, 1),
      wing.o,
    ];
    r.cap(wing.o, elbow, 2.5, 1.9, bronze).cap(elbow, tip, 2.2, 1.2, bronze);
    for (let i = 0; i < corners.length - 1; i++)
      r.poly([tip, corners[i], corners[i + 1]], membrane);
    for (const i of [0, 2, 4, 6]) r.cap(tip, corners[i], 1.25, 0.5, bronze);
    r.cap(tip, wing.p(-15, d * 18, 35 - 6 * fold), 1.2, 0.2, silver);
  }
  const coffer = root
    .at(28, 3, -9 + 24 * k.chest + (asleep ? 5 : 0))
    .pitch(-0.14 - 0.24 * k.chest)
    .roll(0.06 * gait);
  chestBox(r, coffer, Math.max(0, k.lid), wood, bronze, glint);
  loc.chest = coffer
    .at(-7, 0, 3)
    .pitch(-Math.max(0, k.lid) * 1.3)
    .p(15, 0, 0.6);
  for (const d of [-1, 1]) {
    const shoulder = root.p(12, d * 11, 4);
    const clawPose = d === 1 ? k.claw : 0;
    const hand = coffer.p(
      6.8 + 19 * clawPose,
      d * (12.5 + 11 * clawPose),
      1.1 + 14 * clawPose + 2 * look,
    );
    const elbow = ik(shoulder, hand, 18, 18, F.v(-0.6, d * 0.8, -0.4));
    const arm = d === 1 ? frontRig : r;
    arm.cap(shoulder, elbow, 4.5, 3.2, hide).cap(elbow, hand, 3.7, 2.2, hide);
    const wrist = F3.yaw(0.48 + (side * TAU) / 16, hand).roll(d * 0.18);
    arm.ell(wrist, [0, 0, 0.4], [2.8, 3.2, 1.6], hide);
    for (let j = -1; j <= 1; j++) {
      const knuckle = wrist.p(3, j * 2.35, 1.1),
        tip = wrist.p(6.2 + 0.65 * (1 - Math.abs(j)), j * 2.5 - d * 0.7, -1.4);
      arm
        .cap(wrist.p(0, j * 1.8, 1.2), knuckle, 1.25, 1.05, silver)
        .cap(knuckle, tip, 1.05, 0.33, silver);
    }
    if (d === 1) loc.claw = wrist.p(6.85, -0.7, -1.4);
  }
  r.prims.push(...frontRig.prims);
  // Extend the silhouette in its ground plane and give the arched neck a little more height.
  const scalePoint = (v: V3): V3 => [v[0] * 1.08, v[1] * 1.04, v[2] * 1.15];
  for (const prim of r.prims) {
    if (prim.k === 0) {
      prim.c = scalePoint(prim.c);
      prim.a = prim.a.map(scalePoint) as [V3, V3, V3];
    } else if (prim.k === 1 || prim.k === 4) {
      prim.a = scalePoint(prim.a);
      prim.b = scalePoint(prim.b);
    } else if (prim.k === 2) prim.pts = prim.pts.map(scalePoint);
    else prim.p = scalePoint(prim.p);
  }
  for (const key of Object.keys(loc)) loc[key] = scalePoint(loc[key]);
  r.eye = loc.eye;
  const body = projectFigure(r, 144, anchor, loc, undefined, 3.7);
  const luminousEye = body.points.eye.map(Math.round) as XY;
  if (!body.eye && body.lit?.get(...luminousEye)[3]) body.eye = luminousEye;
  const over =
    anim === 'peek'
      ? renderRig(frontRig, 144, 144, ...body.anchor, { inner: 3.7 }).p
      : undefined;
  return {
    ...body,
    over,
    dx: k.dx,
    dy: k.dy,
    sx: k.sx,
    sy: k.sy,
    rot: k.rot,
    flash: k.flash || undefined,
    ghost:
      k.trail > 0
        ? { dx: -6 * k.trail, dy: 1, alpha: 0.2 * k.trail }
        : undefined,
  };
}
const base = {
  idle: { seconds: 3, loop: true },
  'idle-f2': { seconds: 3, loop: true },
  walk: { seconds: 1, loop: true },
  sleep: { seconds: 3, loop: true },
  look: { seconds: 1.5 },
  turn: { seconds: 4, loop: true },
};
export default {
  id: 'coin_dragon',
  rarity: 'secret',
  theme: 'treasury',
  animations: { ...base, ...actions },
  effects,
  frame(anim, t, side, variant) {
    const last = actions[anim]?.seconds;
    if (last && anim !== 'away' && t * 24 >= Math.round(last * 24) - 1)
      return coinDragonFrame(
        anim === 'phase' ? 'idle-f2' : 'idle',
        0,
        side,
        variant,
      );
    return coinDragonFrame(anim, t, side, variant, pose(anim, t));
  },
} satisfies Creature;
