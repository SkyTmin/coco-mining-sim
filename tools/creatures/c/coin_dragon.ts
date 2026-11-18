import { withTechniques } from '../technique';
import keys from './coin_dragon-keys';
import { textureFigure } from './relief-material';
import { strideFoot } from '../motion';
import route from './coin_dragon-life';
import {
  animations as actions,
  effects,
  props,
  pose,
} from './coin_dragon-actions';
import { projectFigure, scaleFigure } from '../rig/figure';
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

const anchor: XY = [79, 118];
const scale = 1.13;
const controls = {
  bodyYaw: 0,
  rear: 0,
  squat: 0,
  stance: 0,
  reach: 0,
  headFold: 0,
  headTurn: 0,
  bagCast: 0,
  bagLand: 0,
  cofferHigh: 0,
  cofferReach: 0,
  handReach: 0,
  handLift: 0,
  handFloor: 0,
  buried: 0,
  span: 0,
  compact: 0,
  token: 0,
  tokenSize: 1,
  tokenTilt: 0,
  crack: 0,
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
const soot: Mat = { T: tn('#151925', '#24242c', '#35303a', '#554143') };
const amber: Mat = {
  T: tn('#7b412a', '#c37a32', '#efb947', '#ffe19c'),
  glow: 0.5,
};
const plumb: Mat = { T: tn('#34403e', '#737f75', '#abafa0', '#e2dbbb') };
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
      const a = Math.atan2(q[2], q[0]);
      if (Math.abs(face) < 0.43) return ink;
      if (d > 0.75 && d < 0.84) return T[0];
      if (d > 0.59 && d < 0.68 && Math.sin(a * 11) > 0.1)
        return q[2] > 0.1 ? hx('#e8cf94') : T[1];
      if (Math.abs(q[0]) < 0.13 && Math.abs(q[2]) < 0.37) return T[0];
      if (Math.abs(q[2]) < 0.12 && Math.abs(q[0]) < 0.35) return T[3];
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
  // Keyhole and latch on a large, dark-matted square. The silver bolt catches the upper edge.
  const lock = F.at(front + 1.15, 0, -0.7);
  panel(
    r,
    lock,
    [
      [0.2, -3.2, -2.4],
      [0.2, 3.2, -2.4],
      [0.2, 3.2, 2.4],
      [0.2, -3.2, 2.4],
    ],
    soot,
  );
  panel(
    r,
    lock,
    [
      [0.55, -2.7, -1.9],
      [0.55, 2.7, -1.9],
      [0.55, 2.7, 2.1],
      [0.55, -2.7, 2.1],
    ],
    metal,
  );
  r.ell(lock, [1, 0, 1], [0.7, 1.05, 1], soot);
  r.line(lock.p(1.6, 0, 0.7), lock.p(1.6, 0, -1.3), ink, 0, 1.1);
  r.cap(lock.p(1.2, -2.0, 2), lock.p(1.2, 2, 2), 0.65, 0.65, plumb);
  // Parallel plank joints and an almond-shaped knot on the near side survive all rotations.
  for (const d of [-1, 1]) {
    for (const z of [-2.7, 0.1])
      r.line(
        F.p(-6, d * (half + 0.1), z),
        F.p(6, d * (half + 0.1), z),
        hx('#392831'),
        0,
        0.8,
      );
    r.ell(F, [-1.6, d * (half + 0.27), -0.5], [2.4, 0.5, 0.9], soot);
    r.line(
      F.p(-3.4, d * (half + 0.6), -0.1),
      F.p(0.35, d * (half + 0.6), -0.3),
      hx('#bd8455'),
      0,
      1,
    );
    for (const f of [-5, 0, 5])
      r.dot(F.p(f, d * (half + 0.5), 2), hx('#dac49a'), 0, 1, 1.2);
    r.cap(
      F.p(front - 0.8, d * (half + 0.1), -3.8),
      F.p(front + 0.1, d * (half + 0.1), -0.9),
      0.95,
      0.65,
      metal,
    );
  }
}
export function coinDragonFrame(
  anim: string,
  t: number,
  side: number,
  variant: Variant,
  external: Partial<Controls> = {},
  headSide = side,
): BodyFrame {
  const headLead = Math.max(
    -0.68,
    Math.min(0.68, ((((headSide - side + 24) % 16) - 8) * TAU) / 16),
  );
  const k = { ...controls, ...external };
  const tick = t * 24;
  const ease = (u: number) => {
    const a = Math.max(0, Math.min(1, u));
    return a * a * (3 - 2 * a);
  };
  if (anim === 'tech_tail') {
    k.dx += 19 * ease(tick / 10) * (1 - ease((tick - 19) / 6));
    if (tick > 19 && tick < 25)
      k.compact += 0.105 * Math.sin(((tick - 19) * Math.PI) / 6);
  }
  if (anim === 'tech_chest' && tick < 17)
    k.dy += 4 * Math.sin((Math.PI * tick) / 17);
  if (anim === 'tech_rain')
    k.dy -= 6 * ease(tick / 21) * (1 - ease((tick - 37) / 15));
  // Continue along the entrance tangent before the underground change of direction.
  // The crest clips the submerged pixels. The rig physically crosses behind it.
  if (anim === 'tech_dive' && k.buried) {
    // In side view the tall outer wing folds along the flank to clear the second crest.
    k.compact += 0.13 * k.buried * Math.abs(Math.sin((side * TAU) / 16));
  }
  if (anim === 'tech_dive' && tick > 22 && tick < 34) {
    const u = (tick - 22) / 12;
    k.dx += 18 * Math.sin(Math.PI * u * 2) * (1 - u);
    k.dy += 119 * Math.sin(Math.PI * u);
  }
  if (anim === 'show' && tick > 54 && tick < 70) {
    // The first claw passes through the opened mint before the wings clear its rim.
    const fraction = ease((tick - 54) / 16);
    const emerging = 0.19 + 0.81 * fraction;
    k.span = 1 - emerging;
    k.compact = 1 - emerging;
    k.dx -= 5 * (1 - fraction);
  }
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
  const hips = F.at(
    0,
    gait * 1.3,
    35 + 1.5 * breath - 8 * (asleep ? 1 : 0) - k.squat,
  ).turn(k.bodyYaw + 0.16 * k.twist + 0.04 * gait);
  const root = k.rear ? hips.pitch(k.rear) : hips;
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
  const planted: string[] = [];
  // Splayed hind feet carry the full weight. Their toes stay on the floor during the supporting half-step.
  for (const d of [-1, 1]) {
    const step = strideFoot(t, d === 1 ? 0 : 0.5, route.stride / scale);
    if (walking && step.planted) planted.push(d === 1 ? 'footR' : 'footL');
    const toe = F.p(
        -11 + (walking ? step.forward : 0),
        d * (19 + k.stance),
        4 + (walking ? step.lift * 6 : 0),
      ),
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
  const tailSwing = k.tail < 0 ? k.tail * 0.48 : k.tail;
  const tail = [
    root.p(-18, 0, -4),
    root.p(-32, -1, -8),
    root.p(-43, 5, -13),
    root.p(-47, 17, -12),
    root.p(-41 + 7 * tailSwing, 29 + 6 * tailWave, -8 + 13 * k.tail),
    root.p(
      -31 + 20 * tailSwing,
      38 + 7 * tailWave - 13 * tailSwing,
      1 + 20 * k.tail + k.bagCast,
    ),
  ];
  // The heavy purse swings after the pelvis, then lays its bottom seam onto the floor.
  tail[5][2] += (6.7 - tail[5][2]) * k.bagLand;
  for (let i = 0; i < tail.length - 1; i++)
    r.cap(tail[i], tail[i + 1], 9.4 - i * 1.65, 7.7 - i * 1.5, hide);
  const bag = F3.yaw(0.48 + (side * TAU) / 16, tail[5]).roll(
    0.13 * tailWave + 0.3 * k.tail,
  );
  r.ell(bag, [0, 0, -0.5], [5.5, 5.5, 7], wood);
  r.ell(bag, [0, 0, 5], [3.1, 3.1, 1.7], bronze);
  r.cap(bag.p(0.5, 0, 5.8), bag.p(4, 1, 8), 1.2, 0.5, bronze);
  r.cap(bag.p(-1.1, 4.7, 4), bag.p(1.8, 5, -3), 1, 0.65, bronze);
  r.ell(bag, [0.1, 4.2, 3.9], [1.5, 2.4, 1.3], iron);
  r.cap(bag.p(-0.9, 2.7, 4.7), bag.p(-4.3, 3.2, 8), 1, 0.3, bronze);
  // Interlocking bands grow smaller toward the tether. The final coin shows its other die.
  for (let i = 1; i < tail.length - 1; i++) {
    const ring = F3.yaw(0.48 + (side * TAU) / 16, tail[i]);
    r.ell(
      ring,
      [0, 1, 3.2],
      [5.4 - i * 0.55, 2.4, 2.3],
      medal(gold, i === 4, false),
    );
  }
  loc.tail = bag.p(0, 0, -3 - 3.7 * k.bagLand);
  loc.tailFloor = [loc.tail[0], loc.tail[1], 0];
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
  r.ell(slot, [0, 0, 1.85], [7.1, 1.8, 0.65], phase > 0.3 ? glint : soot);
  r.cap(slot.p(-6, -2.1, 1.1), slot.p(6, -2.1, 1.1), 0.6, 0.75, plumb);
  for (const d of [-1, 1])
    r.dot(slot.p(d * 8.1, 0, 1.28), hx('#ebe3c5'), 0, 1, 1.3);
  r.ell(slot, [2.7, 0, 2.4], [3.1, 1, 2.7], bronze);
  r.dot(slot.p(2.1, -0.13, 4.1), hx('#fff0b8'), 0.4, 1, 0.8);
  loc.slot = slot.p(0, 0, 2);
  // Long angular neck with separate nape, throat and jaw; the head turns independently to inspect the lock.
  const tuck = asleep ? 1 : 0;
  const g = look + k.glance;
  const base = root.p(11, 0, 8);
  // Keep the original neutral arithmetic. Factoring these sums adds rounding at
  // the pixel boundary on the southwest walk even if the hinge angle is zero.
  const hinged = k.headFold !== 0 || k.reach !== 0;
  const bend = hinged
    ? root
        .at(11, 0, 8)
        .pitch(k.headFold * 0.38)
        .p(8 + 2 * k.neck, -2, 13 - 10 * tuck)
    : root.p(19 + 2 * k.neck, -2, 21 - 10 * tuck);
  const upper = hinged
    ? root
        .at(11, 0, 8)
        .pitch(k.headFold * 0.8)
        .p(11 + 5 * k.neck + 0.4 * k.reach, -5, 29 - 20 * tuck + 2 * breath)
    : root.p(22 + 5 * k.neck, -5, 37 - 20 * tuck + 2 * breath);
  const neckAxis = hinged
    ? root
        .at(11, 0, 8)
        .pitch(k.headFold)
        .at(
          19.5 + 9 * k.neck + k.reach,
          -4 + 6 * tuck,
          39 - 35 * tuck + 2.3 * breath,
        )
    : root.at(30.5 + 9 * k.neck, -4 + 6 * tuck, 47 - 35 * tuck + 2.3 * breath);
  const head = neckAxis
    .turn(headLead + k.headTurn + 0.23 * g + 0.32 * tuck)
    .pitch(0.11 + 0.22 * tuck + 0.1 * g);
  frontRig
    .cap(base, bend, 9, 7.3, hide)
    .cap(bend, upper, 7.8, 5.6, hide)
    .cap(upper, head.o, 5.9, 6.5, hide);
  for (let i = 0; i < 4; i++) {
    const neck = hinged
      ? root
          .at(11, 0, 8)
          .pitch((k.headFold * (i + 1)) / 4)
          .at(6 + 2 * i + (k.reach * i) / 8, -1 - i, 7 + 8 * i - 6 * i * tuck)
      : root.at(17 + 2 * i, -1 - i, 15 + 8 * i - 6 * i * tuck);
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
    for (const d of [-1, 1])
      frontRig.ell(
        neck,
        [1, d * 5.5, 0.6],
        [3.1, 1.15, 2.3],
        medal(gold, false, false),
      );
  }
  frontRig.ell(head, [1, 0, 1], [10.4, 8.2, 7.4], hide);
  const nose = head.at(9, 0, 0.8).pitch(0.07);
  frontRig.ell(nose, [1.9, 0, 0], [9.3, 5.6, 3.7], hide);
  for (const d of [-1, 1]) {
    const temple = head.p(-3, d * 5.5, 5.4),
      horn = head.p(-7, d * 8.8, 13.8);
    frontRig
      .cap(temple, horn, 3.3, 2.1, bronze)
      .cap(horn, head.p(-19, d * 10.2, 20.0), 2.2, 0.45, silver);
    frontRig.cap(
      head.p(-6, d * 5, 0),
      head.p(-11, d * 12, 3.4),
      2.5,
      0.4,
      bronze,
    );
    frontRig.ell(head, [-3.2, d * 5.8, 6.2], [3.9, 3.1, 2.25], bronze);
    frontRig.cap(
      head.p(-4.2, d * 6.1, 7.4),
      head.p(-2.6, d * 7.9, 7.5),
      1.15,
      0.8,
      plumb,
    );
    frontRig.line(head.p(-5, d * 8.5, 8.2), horn, ink, 0, 0.8);
    const eye = head.p(4.6, d * 9.45, 4.0);
    frontRig.ell(head, [3.7, d * 7.8, 3.8], [4.8, 1.75, 3.45], soot);
    const blink = clock > 1.75 && clock < 1.91;
    frontRig.ell(
      head,
      [4.1, d * 9.1, 4.05],
      [3.0, 1.0, blink ? 0.4 : 2.0],
      amber,
    );
    if (!blink) {
      frontRig.cap(
        head.p(4.8, d * 10.05, 2.9),
        head.p(4.7, d * 10.1, 4.9),
        0.58,
        0.76,
        soot,
      );
      frontRig.dot(head.p(3.45, d * 10.35, 4.87), hx('#fff0bc'), 0.8, 1, 1.4);
    }
    frontRig.cap(
      head.p(-0.5, d * 8.3, 6.6),
      head.p(6.7, d * 7.4, 5.4),
      1.5,
      0.9,
      bronze,
    );
    frontRig.ell(nose, [6.8, d * 3.5, 2.2], [2.1, 1.3, 0.85], bronze);
    frontRig.ell(nose, [7, d * 3.9, 2.45], [1.7, 1.1, 0.55], soot);
    frontRig.cap(
      nose.p(-1, d * 5.1, -0.8),
      nose.p(6.9, d * 4.3, -1.55),
      0.9,
      0.5,
      soot,
    );
    frontRig.cap(
      nose.p(5, d * 4.7, -1.45),
      nose.p(5.55, d * 4.7, -5.2),
      1.2,
      0.2,
      silver,
    );
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
  if (anim === 'show' && tick >= 104) {
    // A milled silver face below the lower lip stays readable against the bronze jaw.
    const die = F3.yaw(0.04, nose.p(12.6, 3.8, -5.35)).pitch(-0.16);
    frontRig.ell(die, [0, 0, 0], [5.8, 1.25, 5.8], iron);
    frontRig.ell(die, [0, 0.78, 0.2], [5.1, 1.05, 5.1], silver);
    frontRig.ell(die, [0, 1.65, 0.3], [3.5, 0.55, 3.55], plumb);
    frontRig.line(die.p(-2, 2.25, 2), die.p(2, 2.25, -2), ink, 0, 0.85);
    frontRig.line(
      die.p(-2.8, 1.6, 3.5),
      die.p(0.1, 1.7, 4.2),
      hx('#fff3ce'),
      0.62,
      0.85,
    );
    frontRig.cap(
      nose.p(8.5, 4.4, -0.5),
      nose.p(10.8, 4.6, -4),
      1.2,
      0.38,
      glint,
    );
  }
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
    r.ell(wing, [0, d * 2, 0.8], [3.3, 2.4, 2.6], bronze);
    r.dot(wing.p(0.6, d * 4, 1.45), ink, 0, 1, 1.5);
    r.cap(
      wing.p(-0.2, d * 3, -0.9),
      wing.p(-1.8, d * 3.8, -3.3),
      0.7,
      0.6,
      plumb,
    );
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
    r.cap(tip, wing.p(-15, d * 18, 37 - 6 * fold), 1.2, 0.2, silver);
  }
  const shoulderMedal = root.at(12, 15, 10);
  r.ell(shoulderMedal, [0, 0, 0], [6.8, 2.1, 6.2], iron);
  r.ell(shoulderMedal, [0, 1.2, 0], [6.0, 1.45, 5.6], bronze);
  const diamond = [
    [0, 3, 3.6],
    [3.5, 3, 0],
    [0, 3, -3.6],
    [-3.5, 3, 0],
  ] as V3[];
  for (let i = 0; i < 4; i++)
    r.line(
      shoulderMedal.p(...diamond[i]),
      shoulderMedal.p(...diamond[(i + 1) % 4]),
      i < 2 ? hx('#ecd194') : ink,
      0,
      0.7,
    );
  const coffer = root
    .at(
      28 + k.cofferReach,
      3,
      -9 + 24 * k.chest + k.cofferHigh + (asleep ? 5 : 0),
    )
    .turn(0.47)
    .scale(1.11)
    .pitch(-0.14 - 0.24 * k.chest)
    .roll(0.06 * gait);
  chestBox(r, coffer, Math.max(0, k.lid), wood, bronze, glint);
  loc.chest = coffer
    .at(-7, 0, 3)
    .pitch(-Math.max(0, k.lid) * 1.3)
    .p(15, 0, 0.6);
  loc.chestLatch = coffer.p(8, 0, 3.6);
  for (const d of [-1, 1]) {
    const collar = root.p(12, d * 11, 4);
    const lift = d === 1 ? k.handLift : 0;
    const shoulder = root.p(
      12 + lift * 0.13,
      d * (11 + lift * 0.07),
      4 + lift * 0.35,
    );
    if (lift > 0) r.cap(collar, shoulder, 6.2, 4.6, hide);
    const clawPose = d === 1 ? k.claw : 0;
    const hand = coffer.p(
      6.8 + 19 * clawPose + (d === 1 ? k.handReach : 0),
      d * (12.5 + 11 * clawPose),
      1.1 + 14 * clawPose + 2 * look + (d === 1 ? k.handLift : 0),
    );
    if (d === 1) hand[2] += (1.5 - hand[2]) * k.handFloor;
    const elbow = ik(shoulder, hand, 18, 18, F.v(-0.6, d * 0.8, -0.4));
    const arm = d === 1 ? frontRig : r;
    arm.cap(shoulder, elbow, 4.5, 3.2, hide).cap(elbow, hand, 3.7, 2.2, hide);
    if (lift > 0) {
      const elbowBand = F3.yaw(0.48 + (side * TAU) / 16, elbow);
      arm.ell(elbowBand, [0, d * 1.7, 0], [4.6, 2.7, 4.1], bronze);
      arm.ell(
        elbowBand,
        [0, d * 3.2, 0.5],
        [2.8, 1.4, 2.3],
        medal(gold, false, false),
      );
    }
    const wrist = F3.yaw(0.48 + (side * TAU) / 16, hand).roll(d * 0.18);
    arm.ell(wrist, [0, 0, 0.4], [2.8, 3.2, 1.6], hide);
    arm.ell(
      wrist,
      [-1, d * 1.25, 1.6],
      [2.5, 2.2, 1.1],
      medal(gold, false, false),
    );
    for (let j = -1; j <= 1; j++) {
      const knuckle = wrist.p(3, j * 2.35, 1.1),
        tip = wrist.p(6.2 + 0.65 * (1 - Math.abs(j)), j * 2.5 - d * 0.7, -1.4);
      if (d === 1) loc[j === 0 ? 'claw' : j < 0 ? 'clawL' : 'clawR'] = tip;
      arm
        .cap(wrist.p(0, j * 1.8, 1.2), knuckle, 1.25, 1.05, silver)
        .cap(knuckle, tip, 1.05, 0.33, silver);
    }
    if (d === 1) loc.clawFloor = [loc.claw[0], loc.claw[1], 0];
  }
  r.prims.push(...frontRig.prims);
  if (anim === 'show' && tick <= 54) {
    // The viewer can see the actual mint die pivoting on its edge before the shell opens.
    r.prims.length = 0;
    const rad = 8 + 17 * k.tokenSize;
    const die = F.at(0, 0, rad)
      .turn(0.9 + k.tokenTilt)
      .pitch(k.tokenTilt * 0.4);
    r.ell(die, [0, 0, 0], [rad, 2.4, rad], medal(true, false, false));
    r.ell(die, [0, 2.25, 0], [rad * 0.79, 0.55, rad * 0.79], bronze);
    r.line(
      die.p(-rad * 0.34, 2.9, 0),
      die.p(rad * 0.34, 2.9, 0),
      hx('#ffe6a0'),
      0,
      1,
    );
    r.line(
      die.p(0, 2.9, -rad * 0.38),
      die.p(0, 2.9, rad * 0.38),
      hx('#ffe6a0'),
      0,
      1,
    );
    if (k.crack) {
      for (let i = 0; i < 4; i++)
        r.line(
          die.p((i % 2) * 3, 3, -rad + i * rad * 0.46),
          die.p(((i + 1) % 2) * 3, 3, -rad + (i + 1) * rad * 0.46),
          ink,
          0,
          1.2,
        );
    }
    for (const name of ['mouth', 'slot', 'claw', 'eye'])
      loc[name] = die.p(2, 2.7, 0);
  }
  textureFigure(r, (m) =>
    m === hide
      ? 'leather'
      : m === membrane
        ? 'wing'
        : m === wood
          ? 'wood'
          : m === silver || m === iron
            ? 'silver'
            : m === bronze
              ? 'brass'
              : m.gpat
                ? 'coin'
                : undefined,
  );
  r.eye = loc.eye;
  scaleFigure(r, loc, scale * (1 - k.span), 1.31 * (1 - k.compact));
  const body = projectFigure(r, 160, anchor, loc, undefined, 3.8);
  // The moving head exits the far crest first. Hide portions physically below the pile;
  // mouth/eye remain the source rig's articulated sockets in world space.
  if (k.buried > 0) {
    const u = ease((tick - 22) / 12);
    const line =
      body.anchor[1] - k.dy + 19 - 20 * u + 13 * ease((tick - 30) / 4);
    const cover = tick >= 22 && tick <= 34 ? 1 : k.buried;
    const outsideHeap = tick > 34 ? body.anchor[1] - k.dy + 42 : 160;
    const cutoff = Math.max(
      0,
      Math.min(
        160,
        Math.floor(outsideHeap),
        Math.round(160 + (line - 160) * cover),
      ),
    );
    for (const layer of [body.px, body.lit])
      if (layer) layer.data.fill(0, cutoff * layer.w * 4);
  }
  if (anim === 'show' && tick > 54 && tick < 68) {
    const opening = ease((tick - 54) / 14);
    const cutoff = Math.min(
      160,
      Math.round(body.anchor[1] - 17 + 44 * opening),
    );
    for (const layer of [body.px, body.lit])
      if (layer) layer.data.fill(0, cutoff * layer.w * 4);
  }
  const luminousEye = body.points.eye.map(Math.round) as XY;
  if (!body.eye && body.lit?.get(...luminousEye)[3]) body.eye = luminousEye;
  const over =
    anim === 'peek'
      ? renderRig(frontRig, 160, 160, ...body.anchor, { inner: 3.7 }).p
      : undefined;
  return {
    ...body,
    planted,
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
export default withTechniques(
  {
    id: 'coin_dragon',
    rarity: 'secret',
    theme: 'treasury',
    animations: { ...base, ...actions },
    effects,
    props,
    frame(anim, t, side, variant, motion) {
      const last = actions[anim]?.seconds;
      if (last && anim !== 'away' && t * 24 >= Math.round(last * 24) - 1)
        return coinDragonFrame(
          anim === 'phase' ? 'idle-f2' : 'idle',
          0,
          side,
          variant,
        );
      return coinDragonFrame(
        anim,
        t,
        side,
        variant,
        motion?.techniquePose ?? pose(anim, t, side),
        motion?.headSide,
      );
    },
  } satisfies Creature,
  keys,
);
