// Pose book of Пончик и Шустрик. Times are frames at 24 fps.
// Пончик: `X` (screen right) and `Y` (toward us) move him about the kitchen in rig units (1 unit = 3.7 px across,
// 2.22 px down the floor); `yaw` turns him from the painting's 3/4 view (FACE below). Hand and foot goals are
// (forward, right, up) in his feet frame. Squash and stretch: `sqx/sqy/sqz` (offsets from 1, about his feet).
// Шустрик: `mOn` 1 seats him on Пончик's head; free, `mX/mY/mZ` place him in the same world and `mYaw` turns him; his
// hand and foot goals are in his own body frame (numbers before his size factor).
// The kitchen layout (KITCHEN) is shared with bun_panda-fx.ts, which draws the props and the effects on the beats here.
import { reach } from '../bodies/goals';
import { keyframer, type Lane, type Track } from '../kit/pet-moves';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';

export const clips: Record<string, { seconds: number; loop?: boolean }> = {
  ...everyday,
  look: { seconds: 1.5 },
  fidget_a: { seconds: 2.5 },
  fidget_b: { seconds: 2.5 },
  happy: { seconds: 2 },
  'happy-f2': { seconds: 2 },
  trick: { seconds: 11.5 },
  trick_b: { seconds: 11.5 },
  trick_c: { seconds: 11 },
  phase: { seconds: 5 },
  'idle-f2': { seconds: 2, loop: true },
  'trick-f2': { seconds: 12 },
  'trick_b-f2': { seconds: 12 },
  'trick_c-f2': { seconds: 11.5 },
  show: { seconds: 7 },
  peek: { seconds: 3 },
  hatch: { seconds: 3 },
  sleep: { seconds: 3, loop: true },
  sleep_in: { seconds: 1.5 },
  sleep_out: { seconds: 1.5 },
  wake_startled: { seconds: 1.2 },
};

/** Facing (`yaw`, `mYaw`) toward screen right, left, us and away. */
export const FACE = { right: -1.0, left: Math.PI - 1.0, us: 0.57, away: -2.57, usRight: -0.2, usLeft: 1.3 };
/** World ↔ painting: a point (x, y, z) in rig units lands at HOME + (3.7 x, 2.22 y − 2.96 z) px. */
export const PX = { s: 3.7, y: 2.22, z: 2.96 };
/** Where things stand in the kitchen, rig units (painting px in brackets). */
export const KITCHEN = {
  home: [192, 255.84] as [number, number],
  table: { x: -24.9, y: -29.6, r: 12.4, top: 12.2 }, // (100, 190)
  rug: { x: 1.1, y: 2.8, rx: 15, ry: 8 },
  barrel: { x: -37.8, y: 6.4, r: 6.2, h: 13.5 }, // (52, 270)
  sack: { x: 38.9, y: 9.9 }, // (336, 278)
  tub: { x: 24.3, y: -42.3, stalk: 41 }, // (282, 162)
  jar: { x: 9.2, y: -47.2, z: 11 }, // on the window bench (226, 117)
  cupboard: { x: 40, y: -47.7 },
  door: { x0: -12.4, x1: -1.6, y: -47.7 },
  ladder: { x: -18.6, y: -47.7 },
  wall: -47.7,
  left: -51.9,
  right: 51.9,
};

export const hand = (name: 'L' | 'R', x: number, y: number, z: number) => reach('hand' + name, [x, y, z]);
export const foot = (name: 'L' | 'R', x: number, y: number, z: number) => reach('foot' + name, [x, y, z]);
export const mHand = (name: 'L' | 'R', x: number, y: number, z: number) => reach('mHand' + name, [x, y, z]);
export const mFoot = (name: 'L' | 'R', x: number, y: number, z: number) => reach('mFoot' + name, [x, y, z]);
const both = (x: number, y: number, z: number) => ({ ...hand('R', x, y, z), ...hand('L', x, -y, z) });
const mBoth = (x: number, y: number, z: number) => ({ ...mHand('R', x, y, z), ...mHand('L', x, -y, z) });
/** Шустрик on Пончик's head (the default of the everyday clips). */
export const ON: JointPose = { mOn: 1 };
/** Пончик holds the bamboo stalk in his near paw and chews its top. */
export const CHEW: JointPose = { bamboo: 1, ...hand('R', 7.0, 6.6, 15.2), chew: 1 };
/** The stalk held upright (walking). */
const STALK: JointPose = { bamboo: 1 };
/** The rest pose every everyday clip starts and ends on (idle frame 0). */
export const REST: JointPose = { ...ON, ...CHEW };
/** Lying on his back on the floor, the legs up (sleep, after a fall). */
export const LIE: JointPose = { pitch: -1.5, lift: -3.1, air: 1, legsUp: 0.6 };
/** The knight from the pots. */
export const F2: JointPose = { form: 1, visor: 0, browIn: 0.5 };
export const f2 = (p: JointPose): JointPose => ({ ...F2, ...p });
/** Keys that switch at the key instead of fading. */
export const SWITCHES = new Set([
  'hidden', 'mHidden', 'blink', 'mBlink', 'noShadow', 'bamboo', 'bun', 'bunL', 'chew', 'mFlour', 'mWet', 'form', 'dizzy',
  'mDizzy', 'overAll', 'mOver', 'egg', 'mEgg', 'shellHat', 'mShellHat', 'shellBottom', 'jar', 'wheel', 'pan', 'mStick',
  'mLid', 'mBun',
]);
/** Lane keys that run linearly (positions in flight, spins). */
export const LINEAR = new Set(['dx', 'dy', 'twist', 'gaitT', 'mGait', 'X', 'Y', 'mX', 'mY', 'mZ', 'mPitch', 'mTwist', 'yaw', 'mYaw', 'rugX']);

/** Effect beats shared with the painter of effects. */
export const beats = {
  look: { sniff: [6, 26] },
  fidget_a: { yawn: [6, 22], wobble: [22, 40], sweat: 26 },
  fidget_b: { tickle: [0, 14], inhale: [14, 26], sneeze: 27, blown: [27, 36], hang: [36, 46], climb: [46, 58] },
  happy: { launch: 8, click: 15, land: 24, wobble: [26, 40] },
  sleep_in: { sit: 8, lie: 20 },
  sleep_out: { pop: 4, sit: 14 },
  wake_startled: { jolt: 3, land: 14 },
  hatch: { rock: [0, 30], cracks: [12, 22, 30], burst: 38, shellOff: 50, mCrack: 46, mBurst: 52, swap: 62 },
  trick: { lid: [38, 48, 60], snatch: 56, freeze: 68, chase: [74, 150], hop: [116, 126], exit: [140, 164], enter: [164, 190], yank: 190, hang: [196, 212], land: 216, bunFly: [218, 230], munch: [230, 262], rugBack: [248, 258] },
  trick_b: { hold: [[61, 81], [116, 147]], smack: 82, spin: [83, 106], tickle: [124, 143], launch: 147, shoot: 152, gone: [158, 186], leaves: [156, 200], splash: 198, kick: [199, 214], spit: [222, 230], out: 236, shake: [243, 250], soak: 245, ladleToss: [244, 252], dry: [258, 262], puddle: [198, 276] },
  trick_c: { sniff: [2, 20], lift: [20, 24], stuck: [24, 40], door: 62, table: 74, lids: [80, 86], lidHome: 96, laugh: [64, 106], tug: [120, 159], pop: 160, jarFly: [160, 176], flour: 165, honeyLick: [170, 230], sneeze: 240, shake: 250 },
  phase: { snatch: 7, red: [20, 34], steam: [24, 36], dash: [34, 44], cloud: [44, 72], items: [46, 72], out: 72, helmet: 80, clanks: [88, 92, 96, 100, 104], lidRoll: [74, 98], visor: 109 },
  'happy-f2': { clangs: [9, 16], spin: [20, 35] },
  'trick-f2': { clacks: [28, 36, 46], whoosh: [24, 28, 32, 36, 42, 46], thrust: 57, stumble: 61, parries: [72, 84, 96, 110], duck: [118, 128], bong: 150, bong2: 178, table: 190, lidFly: [191, 206], bonk: 206, lidHome: 220, stars: [150, 226], mStars: [206, 226] },
  peek: { in: [0, 10], sniff: [12, 30], scare: 32, bonk: 38, out: [40, 50], monkey: [46, 70], tongue: [54, 64] },
};


// ---- paths: lanes for X / Y / yaw / gaitT built from movement spans --------------------------------------------------
/** Stride of one gait cycle, rig units (the card's 26 px over portraitScale 3.7). */
export const STRIDE = 26 / 3.7;
const M_STRIDE = 3.4;
type Pos = { x: number; y: number; z?: number; yaw?: number };
/** A movement span: frames [a, b], a position function of u ∈ [0, 1]. */
type Span = { a: number; b: number; at: (u: number) => Pos; walk?: boolean };
const worldYaw = (dx: number, dy: number) => Math.atan2(dy, dx) - 1.0;
/** Straight run from p to q, facing the way it goes (or `yaw`). */
export const run = (a: number, b: number, p: [number, number], q: [number, number], walk = true, yaw?: number): Span => ({
  a,
  b,
  walk,
  at: (u) => ({ x: p[0] + (q[0] - p[0]) * u, y: p[1] + (q[1] - p[1]) * u, yaw: yaw ?? worldYaw(q[0] - p[0], q[1] - p[1]) }),
});
/** Round an ellipse (centre, radii) from angle th0 to th1, facing along it. */
export const orbit = (a: number, b: number, c: [number, number], r: [number, number], th0: number, th1: number, walk = true): Span => ({
  a,
  b,
  walk,
  at: (u) => {
    const th = th0 + (th1 - th0) * u,
      d = Math.sign(th1 - th0);
    return { x: c[0] + r[0] * Math.cos(th), y: c[1] + r[1] * Math.sin(th), yaw: worldYaw(-r[0] * Math.sin(th) * d, r[1] * Math.cos(th) * d) };
  },
});
/** Stand still at a spot facing `yaw`. */
export const stay = (a: number, b: number, x: number, y: number, yaw: number, z = 0): Span => ({ a, b, at: () => ({ x, y, z, yaw }) });
/** Lanes from spans: Пончик's (X, Y, yaw, gaitT) or Шустрик's (mX, mY, mZ, mYaw, mGait). The gait advances one cycle a
 * stride of ground covered inside walking spans, so planted feet stay put. */
export function pathLanes(spans: Span[], monkey = false): Record<string, Lane> {
  const K = monkey ? { x: 'mX', y: 'mY', z: 'mZ', yaw: 'mYaw', g: 'mGait' } : { x: 'X', y: 'Y', z: 'liftZ', yaw: 'yaw', g: 'gaitT' };
  const out: Record<string, Lane> = { [K.x]: [], [K.y]: [], [K.yaw]: [], [K.g]: [] };
  if (monkey) out[K.z] = [];
  let g = 0,
    prev: Pos | null = null,
    lastYaw = 0;
  for (const sp of spans) {
    for (let f = sp.a; f <= sp.b; f += 1) {
      const p = sp.at((f - sp.a) / Math.max(1, sp.b - sp.a));
      if (prev && sp.walk) g += Math.hypot(p.x - prev.x, p.y - prev.y) / (monkey ? M_STRIDE : STRIDE);
      let yaw = p.yaw ?? lastYaw;
      while (yaw - lastYaw > Math.PI) yaw -= 2 * Math.PI;
      while (yaw - lastYaw < -Math.PI) yaw += 2 * Math.PI;
      lastYaw = yaw;
      out[K.x].push([f, p.x]);
      out[K.y].push([f, p.y]);
      out[K.yaw].push([f, yaw]);
      out[K.g].push([f, g]);
      if (monkey) out[K.z].push([f, p.z ?? 0]);
      prev = p;
    }
  }
  return out;
}
/** A lane from (frame, value) keys. */
export const lane = (...keys: [number, number][]): Lane => keys;

// ---- everyday clips ------------------------------------------------------------------------------------------------
const idle: Track = [
  [0, { ...REST }],
  [10, { ...REST, ...mHand('R', 2.4, 1.2, -2.2), mGaze: 0.3, mNod: 0.3 }],
  [16, { ...REST, ...mHand('R', 2.1, 1.7, -1.7), ...mHand('L', 2.3, -1.0, -2.3), mGaze: 0.2, mNod: 0.35, earFlap: 0.15 }],
  [24, { ...REST, ...mHand('R', 2.4, 1.0, -2.2), ...mHand('L', 2.0, -1.6, -1.8), mNod: 0.3, gaze: 0.05 }],
  [34, { ...REST, mGaze: -0.7, mLookX: -0.9, gaze: 0.06 }],
  [40, { ...REST, mGaze: 0.6, mLookX: 0.9, mSmile: 0.6, nod: 0.04, ...mHand('L', 0.6, -1.4, 3.4) }],
  [46, { ...REST, mGaze: 0.6, mLookX: 0.9, mSmile: 0.6, nod: 0.04, ...mHand('L', 0.8, -1.2, 3.8) }],
  [50, { ...REST, blink: 1, nod: 0.03, mGaze: 0.2 }],
  [53, { ...REST, tilt: 0.04, mGaze: 0.1 }],
  [62, { ...REST, tilt: 0.02, mBlink: 1 }],
  [64, { ...REST }],
  [72, { ...REST }],
];
// the walk: bamboo upright in the paw, Шустрик holds on by the ears and rocks
const walkPose = (k: number): JointPose => ({ ...ON, ...STALK, ...mBoth(1.0, 3.3, -1.0), mRoll: 0.12 * k, mJump: 0.25 * Math.abs(k), nod: 0.03 * k });
const walk: Track = [
  [0, walkPose(1)],
  [6, walkPose(0)],
  [12, walkPose(-1)],
  [18, walkPose(0)],
  [24, walkPose(1)],
];
// sniffs the air (buns!), turns his nose toward the table; Шустрик shades his eyes and looks too
const look: Track = [
  [0, { ...REST }],
  [6, { ...REST, chew: 0, toMouth: 0.6, nod: -0.3, lid: 0.45, smile: 0.4, mGaze: -0.2 }],
  [12, { ...REST, chew: 0, toMouth: 0.4, nod: -0.36, lid: 0.55, smile: 0.7, gaze: -0.5, mGaze: -0.6, ...mHand('R', 1.8, 0.6, 3.4), mNod: -0.15 }],
  [24, { ...REST, chew: 0, toMouth: 0.4, nod: -0.32, lid: 0.5, smile: 0.8, gaze: -0.62, lookX: -0.6, mGaze: -0.7, ...mHand('R', 1.8, 0.6, 3.5), mNod: -0.15 }],
  [30, { ...REST, chew: 0, toMouth: 0.8, gaze: -0.2, lookX: -0.3, mGaze: -0.3 }],
  [36, { ...REST }],
];
// the yawn: a huge yawn with the arms up, he tips back on his heels, windmills, catches himself; Шустрик clings on
const fidget_a: Track = [
  [0, { ...REST }],
  [6, { ...ON, bamboo: 1, toMouth: 0.2, mouth: 0.4, lid: 0.5, ...both(2, 8.5, 20), mBrowUp: 0.5 }],
  [14, { ...ON, bamboo: 1, mouth: 1, wide: 1, lid: 1, browUp: 0.7, nod: -0.25, pitch: -0.08, ...both(0.6, 8.6, 31), sqz: 0.08, sqx: -0.04, sqy: -0.04, ...mBoth(1.0, 3.3, -1.0), mPop: 0.3, mBrowUp: 1 }],
  [20, { ...ON, bamboo: 1, mouth: 1, wide: 1, lid: 1, browUp: 0.7, nod: -0.3, pitch: -0.12, ...both(0.2, 8.8, 31.5), sqz: 0.1, sqx: -0.05, sqy: -0.05, ...mBoth(1.0, 3.3, -1.0), mBrowUp: 1 }],
  // tips back on his heels: off balance, the arms windmill
  [24, { ...ON, bamboo: 1, mouth: 0.5, pop: 0.35, browUp: 1, pitch: -0.32, lean: -1.2, ...hand('R', -2, 10, 26), ...hand('L', 4, -9, 14), ...foot('L', 3.6, -4.4, 1.6), mPitch: 0.3, ...mBoth(0.6, 3.6, -0.6), mPop: 0.5, mMouth: 0.6 }],
  [28, { ...ON, bamboo: 1, mouth: 0.6, pop: 0.4, browUp: 1, pitch: -0.36, lean: -1.4, ...hand('R', 4, 10, 12), ...hand('L', -2, -10, 26), ...foot('L', 3.6, -4.4, 1.8), mPitch: 0.35, mRoll: -0.3, ...mBoth(0.6, 3.6, -0.6), mPop: 0.5, mMouth: 0.8 }],
  [32, { ...ON, bamboo: 1, mouth: 0.4, pop: 0.3, browUp: 0.8, pitch: -0.3, lean: -1.1, ...hand('R', -2, 10, 26), ...hand('L', 4, -9, 13), ...foot('L', 3.0, -4.4, 1.2), mPitch: 0.25, mRoll: 0.3, ...mBoth(0.6, 3.6, -0.6) }],
  // catches himself: rocks forward, a relieved puff
  [37, { ...ON, bamboo: 1, pitch: 0.1, lean: 0.6, ...both(5, 9, 10), browSad: 0.6, mouth: 0.3, mPitch: -0.2 }],
  [42, { ...ON, bamboo: 1, pitch: -0.03, browSad: 0.4, smile: 0.4, lid: 0.3, toMouth: 0.5 }],
  [50, { ...REST, chew: 0, toMouth: 0.9 }],
  [60, { ...REST }],
];
// the sneeze: Шустрик tickles his nose with the tail; a-a-a… choo — Шустрик is blown off in a somersault, catches the
// ear and hangs there, climbs back up
const EAR: [number, number, number] = [8.2, -1.6, 18.0];
const fidget_b: Track = [
  [0, { ...REST }],
  [6, { ...REST, mTailFwd: 1, mSmile: 1, mSmirk: 0.6, mLookY: -0.6, mNod: 0.2 }],
  [10, { ...REST, chew: 0, toMouth: 0.3, mTailFwd: 1, mTail: 0.3, squint: 0.3, nod: 0.05, browUp: 0.3, mSmile: 1, mLookY: -0.6 }],
  [14, { ...REST, chew: 0, toMouth: 0, mTailFwd: 1, mTail: -0.2, squint: 0.5, nod: -0.05, browUp: 0.5, mouth: 0.2, mSmile: 1, mLookY: -0.6 }],
  // a… a… — the head goes back, eyes screw up
  [20, { ...ON, bamboo: 1, mTailFwd: 0.3, nod: -0.32, squint: 0.8, lid: 0.4, browUp: 1, mouth: 0.4, pitch: -0.1, sqz: 0.08, sqx: -0.04, sqy: -0.04, mPop: 0.3, mBrowUp: 1 }],
  [26, { ...ON, bamboo: 1, nod: -0.42, squint: 0.9, lid: 0.5, browUp: 1, mouth: 0.6, pitch: -0.16, sqz: 0.12, sqx: -0.06, sqy: -0.06, mPop: 0.4, mBrowUp: 1, mMouth: 0.4 }],
  // CHOO: the head snaps down, Шустрик flies off backward turning over
  [27, { ...ON, bamboo: 1, nod: 0.35, lid: 1, mouth: 1, wide: 1, pitch: 0.18, sqz: -0.16, sqx: 0.08, sqy: 0.08, earFlap: 1, mOn: 0.6, mPop: 0.6, mMouth: 1 }],
  [30, { bamboo: 1, nod: 0.2, lid: 1, mouth: 0.6, pitch: 0.08, sqz: 0.06, earFlap: 1, mOn: 0, mX: -2, mY: -10, mZ: 30, mYaw: FACE.us, mPitch: -2.6, mPop: 0.7, mMouth: 1, ...mBoth(0.6, 3, 3) }],
  [34, { bamboo: 1, nod: 0.05, lid: 0.2, pop: 0.2, browUp: 0.6, earFlap: 0.6, mOn: 0, mX: 3, mY: -8, mZ: 26, mYaw: FACE.us, mPitch: -5.2, ...mBoth(1, 2.6, 4) }],
  // hangs from the ear by both hands, legs dangling
  [37, { bamboo: 1, pop: 0.3, browUp: 0.8, lookX: -0.6, gaze: -0.15, earFlap: 0.7, tilt: -0.12, mOn: 0, mX: EAR[0], mY: EAR[1], mZ: EAR[2], mYaw: FACE.us, mPitch: -6.28, ...mBoth(0.2, 0.8, 6.0), ...mFoot('L', 0.2, -1.4, -3.4), ...mFoot('R', 0.4, 1.4, -3.2), mPop: 0.4, mMouth: 0.6 }],
  [42, { bamboo: 1, pop: 0.15, browUp: 0.6, lookX: -0.7, gaze: -0.2, earFlap: 0.6, tilt: -0.16, mOn: 0, mX: EAR[0], mY: EAR[1], mZ: EAR[2] - 0.4, mYaw: FACE.us, mPitch: -6.28, mRoll: 0.2, ...mBoth(0.2, 0.8, 6.2), ...mFoot('L', 0.6, -1.4, -3.0), ...mFoot('R', -0.2, 1.4, -3.4), mSmile: 0.4, mBrowUp: 0.6 }],
  [46, { bamboo: 1, smile: 0.3, lookX: -0.5, gaze: -0.12, earFlap: 0.4, tilt: -0.1, mOn: 0, mX: EAR[0], mY: EAR[1], mZ: EAR[2] + 0.2, mYaw: FACE.us, mPitch: -6.28, mRoll: -0.2, ...mBoth(0.2, 0.8, 6.0), ...mFoot('L', 0.4, -1.2, -3.2), ...mFoot('R', 0.4, 1.2, -3.2) }],
  // climbs back over the ear onto the crown
  [52, { bamboo: 1, toMouth: 0.4, smile: 0.4, earFlap: 0.6, mOn: 0.6, mPitch: -6.28, ...mBoth(1.6, 2, 1.0), mSmile: 0.7 }],
  [56, { ...REST, chew: 0, toMouth: 0.8, mPitch: -6.28, mSmile: 0.7 }],
  [60, { ...REST, mPitch: -6.28 }],
];
// happy: a hop with a heel click, a wobbly landing on the edge of balance; Шустрик claps
const clap = (k: number): JointPose => (k ? mBoth(2.2, 0.35, 1.4) : mBoth(2.0, 1.8, 1.8));
const happy: Track = [
  [0, { ...REST }],
  [5, { ...ON, bamboo: 1, crouch: 2.2, sqz: -0.12, sqx: 0.06, sqy: 0.06, ...both(4, 8, 6), smile: 1, ...clap(1) }],
  [8, { ...ON, bamboo: 1, jump: 4, air: 1, sqz: 0.14, sqx: -0.07, sqy: -0.07, ...both(1, 9, 28), lid: 1, mouth: 0.8, ...clap(0) }],
  [15, { ...ON, bamboo: 1, jump: 10, air: 1, click: 1, kick: 0.8, ...both(1, 9.5, 30), lid: 1, mouth: 1, earFlap: 0.8, ...clap(1), mMouth: 1, mSquint: 0.6 }],
  [19, { ...ON, bamboo: 1, jump: 8, air: 1, click: 0, ...both(2, 9, 27), lid: 1, mouth: 0.8, ...clap(0), mMouth: 1 }],
  [24, { ...ON, bamboo: 1, crouch: 2.4, sqz: -0.2, sqx: 0.1, sqy: 0.1, ...both(5, 10, 8), smile: 1, earFlap: 1, ...clap(1) }],
  // teeters forward and back on his heels
  [28, { ...ON, bamboo: 1, pitch: 0.24, lean: 1.4, ...hand('R', 1, 10, 22), ...hand('L', 6, -10, 12), pop: 0.25, browUp: 1, mouth: 0.4, mPitch: -0.3, mPop: 0.3 }],
  [32, { ...ON, bamboo: 1, pitch: -0.2, lean: -1.0, ...hand('R', 6, 10, 12), ...hand('L', 1, -10, 22), pop: 0.2, browUp: 0.8, mouth: 0.3, mPitch: 0.3 }],
  [36, { ...ON, bamboo: 1, pitch: 0.1, lean: 0.5, ...both(4, 9.4, 12), browUp: 0.4, smile: 0.6 }],
  [41, { ...REST, chew: 0, toMouth: 0.7, smile: 0.8, ...clap(1) }],
  [48, { ...REST }],
];
// goes to sleep: plops down on his bottom, tips onto his back hugging the bamboo; Шустрик hops down onto his belly
const SLEEP_M: JointPose = { mOn: 0, mX: 1.2, mY: 0.8, mZ: 10.6, mYaw: FACE.usRight, mSit: 1, mLid: 1, mNod: 0.3, mTilt: 0.2, mTail: 0.8 };
export const asleep: JointPose = { ...LIE, bamboo: 1, ...both(7, 6.4, 10), lid: 1, smile: 0.4, ...SLEEP_M };
const sleep_in: Track = [
  [0, { ...REST }],
  [6, { ...ON, bamboo: 1, sit: 1, sqz: -0.14, sqx: 0.07, sqy: 0.07, lid: 0.4, mouth: 0.5, ...mBoth(1, 3.3, -1) }],
  [10, { ...ON, bamboo: 1, sit: 1, lid: 0.6, ...mBoth(1, 3.3, -1), mBrowUp: 0.6 }],
  [14, { bamboo: 1, sit: 1, pitch: -0.7, lift: -1.4, air: 0.6, lid: 0.8, mOn: 0, mX: -1, mY: -2, mZ: 22, mYaw: FACE.us, mJump: 1, ...mBoth(1.6, 2.4, 2) }],
  [20, { ...asleep, lid: 0.9, sqz: -0.1, sqx: 0.06, mLid: 0.4, mSit: 0.6, mZ: 13 }],
  [26, { ...asleep, mLid: 0.7 }],
  [36, { ...asleep }],
];
const sleep: Track = [
  [0, { ...asleep }],
  [36, { ...asleep, nod: 0.05, mTilt: 0.3 }],
  [72, { ...asleep }],
];
// the bubble pops: both wake, he sits up and stands, Шустрик jumps back onto his head
const sleep_out: Track = [
  [0, { ...asleep }],
  [4, { ...asleep, lid: 0.3, pop: 0.2, mLid: 0.2, mPop: 0.3 }],
  [10, { bamboo: 1, sit: 1, pitch: -0.5, lift: -1.2, air: 0.5, lid: 0.3, browUp: 0.5, mOn: 0, mX: 2, mY: 2, mZ: 14, mYaw: FACE.us, mJump: 2, ...mBoth(1.2, 2.4, 3) }],
  [16, { ...ON, bamboo: 1, sit: 1, lid: 0.2, mouth: 0.6, ...both(2, 8, 26) }],
  [24, { ...ON, bamboo: 1, crouch: 1, toMouth: 0.4, lid: 0.15, sqz: 0.06 }],
  [30, { ...REST, chew: 0, toMouth: 0.8 }],
  [36, { ...REST }],
];
// startled awake: he jumps straight up with the eyes popping, Шустрик flies up and catches the ear, scrambles up top
const wake_startled: Track = [
  [0, { ...asleep }],
  [3, { ...asleep, lid: 0, pop: 0.8, browUp: 1, mLid: 0, mPop: 0.8 }],
  [8, { bamboo: 1, jump: 9, air: 1, pop: 1, browUp: 1, mouth: 0.9, teeth: 1, earFlap: 1, sqz: 0.18, sqx: -0.09, sqy: -0.09, ...both(1, 9, 30), mOn: 0, mX: 4, mY: -4, mZ: 32, mYaw: FACE.us, mPop: 1, mPitch: -3, ...mBoth(0.4, 2.6, 4.6) }],
  [14, { bamboo: 1, crouch: 1.6, sqz: -0.16, sqx: 0.08, sqy: 0.08, pop: 0.5, browUp: 0.8, mouth: 0.4, ...both(4, 9, 10), mOn: 0, mX: EAR[0], mY: EAR[1], mZ: EAR[2], mYaw: FACE.us, mPitch: -6.28, ...mBoth(0.2, 0.8, 6.0), mPop: 0.5 }],
  [20, { bamboo: 1, pop: 0.2, browUp: 0.4, lookX: -0.6, earFlap: 0.6, mOn: 0, mX: EAR[0], mY: EAR[1], mZ: EAR[2] + 0.3, mYaw: FACE.us, mPitch: -6.28, ...mBoth(0.2, 0.8, 6.1) }],
  [25, { ...REST, chew: 0, toMouth: 0.6, mOn: 0.7, mPitch: -6.28, ...mBoth(1.6, 2, 1) }],
  [29, { ...REST, mPitch: -6.28 }],
];
// hatch: the panda egg rocks and cracks in three hops, bursts — Пончик pops out with the top shell on his head; the
// little golden egg cracks, Шустрик hops out, jumps onto the panda's head and takes the shell for himself
const M_EGG: JointPose = { mEgg: 1, mX: 9, mY: 6 };
const hatch: Track = [
  [0, { egg: 1, ...M_EGG }],
  [6, { egg: 1, eggRock: 0.18, ...M_EGG }],
  [10, { egg: 1, eggRock: -0.16, ...M_EGG, mEggRock: 0.1 }],
  [12, { egg: 1, eggRoll: 0.12, eggCrack: 0.3, ...M_EGG }],
  [18, { egg: 1, eggRoll: -0.14, eggRock: 0.1, eggCrack: 0.3, ...M_EGG, mEggRock: -0.12 }],
  [22, { egg: 1, eggRoll: 0.16, eggCrack: 0.65, ...M_EGG }],
  [27, { egg: 1, eggRock: -0.2, eggCrack: 0.65, ...M_EGG, mEggRock: 0.15 }],
  [30, { egg: 1, eggRock: 0.06, eggCrack: 1, ...M_EGG }],
  [35, { egg: 1, eggRock: 0, eggCrack: 1, ...M_EGG, mEggRock: -0.1 }],
  // burst: he springs up out of the bottom shell with the top shell on his head
  [38, { bamboo: 1, shellBottom: 1, shellHat: 1, crouch: 2, sqz: -0.12, sqx: 0.06, sqy: 0.06, ...both(3, 8, 8), lid: 0.4, ...M_EGG }],
  [42, { bamboo: 1, shellBottom: 1, shellHat: 1, jump: 3, air: 1, ...both(1, 10, 28), pop: 0.4, browUp: 1, mouth: 0.8, sqz: 0.12, ...M_EGG, mEggCrack: 0.4 }],
  [46, { bamboo: 1, shellBottom: 1, shellHat: 1, crouch: 1.2, sqz: -0.1, ...both(4, 9, 12), smile: 1, lookX: 0.5, ...M_EGG, mEggCrack: 0.8, mEggRock: 0.15 }],
  [50, { bamboo: 1, shellHat: 1, smile: 0.8, lookX: 0.7, gaze: 0.3, ...M_EGG, mEggCrack: 1, mEggRock: -0.15 }],
  [52, { bamboo: 1, shellHat: 1, smile: 0.6, lookX: 0.8, gaze: 0.35, browUp: 0.6, mX: 9, mY: 6, mYaw: FACE.usLeft, mJump: 2, ...mBoth(0.6, 2.8, 4), mPop: 0.4, mShellHat: 0 }],
  [56, { bamboo: 1, shellHat: 1, lookX: 0.6, gaze: 0.3, mOn: 0, mX: 6, mY: 2, mZ: 20, mYaw: FACE.usLeft, mJump: 0, ...mBoth(1, 2.6, 3) }],
  [60, { bamboo: 1, shellHat: 1, lookY: 0.6, browUp: 0.5, mOn: 1, ...mBoth(0.6, 1.6, 3.4), mSmirk: 1 }],
  [62, { bamboo: 1, shellHat: 0, mShellHat: 1, lookY: 0.6, browSad: 0.5, mOn: 1, ...mBoth(0.6, 1.6, 3.6), mSmirk: 1, mSmile: 1 }],
  [66, { ...REST, chew: 0, toMouth: 0.5, mShellHat: 1, browSad: 0.4, mSmile: 1 }],
  [72, { ...REST, mShellHat: 1, mSmile: 0.8 }],
];
// peek: his snout slides in from behind the left side of the frame, sniffs, pops his eyes, ducks back — and bonks his
// head on the frame (a bump, stars); Шустрик hangs upside down over the top of the frame and sticks out his tongue
const PEEK: JointPose = { X: -57, Y: -6, yaw: FACE.right, ...ON, mHidden: 1, noShadow: 1 };
const MONKEY_HANG: JointPose = { mHidden: 0, mOn: 0, mOver: 1, mX: -14, mY: -40, mZ: 49, mYaw: FACE.us, mPitch: Math.PI, ...mFoot('L', 0.4, -1.2, -4.2), ...mFoot('R', 0.4, 1.2, -4.2) };
const peek: Track = [
  [0, { ...PEEK, X: -76, lean: 0 }],
  [10, { ...PEEK, lean: 3.6, pitch: 0.36, nod: 0.1, gaze: 0.3 }],
  [16, { ...PEEK, lean: 3.8, pitch: 0.38, nod: -0.25, lid: 0.5, smile: 0.6, gaze: 0.3 }],
  [24, { ...PEEK, lean: 4, pitch: 0.4, nod: -0.3, lid: 0.55, smile: 0.9, gaze: 0.45, lookX: 0.4 }],
  [30, { ...PEEK, lean: 3.8, pitch: 0.36, nod: -0.1, smile: 0.6, gaze: 0.6, lookX: 0.8 }],
  [32, { ...PEEK, lean: 3.8, pitch: 0.34, pop: 0.9, browUp: 1, mouth: 0.8, gaze: 0.8, lookX: 0.9 }],
  [37, { ...PEEK, X: -66, lean: 0, pitch: -0.1, pop: 0.4, browUp: 1, sqx: -0.1 }],
  [38, { ...PEEK, X: -64, lean: 0.4, pitch: 0.1, bump: 1.2, dizzy: 1, wavy: 1, sqz: -0.12, sqy: 0.08 }],
  [42, { ...PEEK, X: -64, lean: 0.4, bump: 1, dizzy: 1, wavy: 1, tilt: 0.2 }],
  [50, { ...PEEK, X: -84, bump: 0.9, dizzy: 1, wavy: 1, tilt: 0.3 }],
  [52, { ...PEEK, X: -84, hidden: 1, ...MONKEY_HANG, mZ: 60 }],
  [56, { ...PEEK, X: -84, hidden: 1, ...MONKEY_HANG, mTongue: 1, mSquint: 0.6, mBrowUp: 1, ...mBoth(2.2, 2.6, 0.4) }],
  [62, { ...PEEK, X: -84, hidden: 1, ...MONKEY_HANG, mTongue: 1, mSquint: 0.7, mBrowUp: 1, mRoll: 0.2, ...mBoth(2.4, 2.4, 1.2) }],
  [66, { ...PEEK, X: -84, hidden: 1, ...MONKEY_HANG, mSmile: 1 }],
  [72, { ...PEEK, X: -84, hidden: 1, ...MONKEY_HANG, mZ: 62 }],
];

// ---- «Пирожок» (trick) -------------------------------------------------------------------------------------------
// He sniffs, tucks the bamboo behind his ear and tiptoes to the table; lifts the steamer lid, licks his lips — Шустрик
// leaps off his head onto the table and snatches the bun from under his paw, sticks out his tongue; Пончик freezes,
// eyes popping; a chase round the table (wheel legs, the monkey cuts across the tabletop), out through the left side
// of the frame; Шустрик runs back in from the right alone, giggles at the rug's end; Пончик runs in after him — the rug
// is yanked: his feet fly up, he hangs in the air, looks at us, blinks — and falls flat; the bun jumps out of
// Шустрик's hands into his open mouth. He munches lying down; Шустрик slaps his forehead, sulks, drags the rug back;
// Пончик gets up, takes his bamboo, Шустрик climbs back on top.
const TB = KITCHEN.table;
const C_TB: [number, number] = [TB.x, TB.y];
const AT_TABLE: [number, number] = [-6.4, -26.4];
const ON_TABLE = (x: number, y: number) => ({ x, y, z: TB.top });
const TH0 = Math.acos((AT_TABLE[0] - TB.x) / 22);
const trickPanda = pathLanes([
  stay(0, 12, 0, 0, 0),
  run(12, 36, [0, 0], AT_TABLE),
  stay(38, 72, AT_TABLE[0], AT_TABLE[1], FACE.left),
  orbit(74, 150, C_TB, [22, 14], TH0, Math.PI / 2 + 2 * Math.PI),
  run(150, 164, [TB.x, TB.y + 14], [-66, -8]),
  stay(165, 171, 80, 3, FACE.left),
  run(172, 190, [68, 3], [1.5, 3]),
  stay(191, 250, 1.5, 3, FACE.left),
  run(252, 266, [1.5, 3], [0, 0], false, 0.6),
  stay(268, 276, 0, 0, 0),
]);
const trickMonkey = pathLanes(
  [
    stay(0, 48, 0, 0, 0),
    { a: 50, b: 58, at: (u) => ({ x: AT_TABLE[0] + (TB.x + 6 - AT_TABLE[0]) * u, y: AT_TABLE[1] + (TB.y - 1 - AT_TABLE[1]) * u, z: TB.top + 14 * Math.sin(u * Math.PI) + (1 - u) * 14, yaw: FACE.right }) },
    stay(59, 69, TB.x + 6, TB.y - 1, FACE.usRight, TB.top),
    orbit(72, 110, C_TB, [21, 13], Math.PI / 2 + 0.6, 4.3),
    { a: 111, b: 126, at: (u) => ({ x: TB.x + 21 * Math.cos(4.3) * (1 - u), y: TB.y + 13 * Math.sin(4.3) + (13 - 13 * Math.sin(4.3)) * u, z: TB.top * Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) * (u < 0.85 ? 1 : (1 - u) / 0.15) + 6 * Math.sin(u * Math.PI), yaw: FACE.us }) },
    stay(127, 139, TB.x, TB.y + 13, FACE.us),
    run(140, 152, [TB.x, TB.y + 13], [-64, -8]),
    stay(153, 163, 80, 2, FACE.left),
    run(164, 184, [64, 2], [-13.5, 2.5]),
    stay(185, 247, -13.5, 2.5, FACE.right),
    run(248, 258, [-13.5, 2.5], [-6.5, 2.5], false, FACE.left),
    { a: 260, b: 268, at: (u) => ({ x: -6.5 + 6.5 * u, y: 2.5 - 2.5 * u, z: 22 * Math.sin(u * Math.PI * 0.5) + 8 * Math.sin(u * Math.PI), yaw: 0 }) },
    stay(269, 276, 0, 0, 0),
  ],
  true,
);
const RUN: JointPose = { wheel: 1, pitch: 0.28, lean: 1.2, bambooEar: 1, ...both(-2, 9, 10), earBack: 1, browIn: 0.5 };
const M_RUN: JointPose = { mOn: 0, mRun: 1 };
const trick: Track = [
  [0, { ...REST }],
  [6, { ...REST, chew: 0, toMouth: 0.3, nod: -0.25, lid: 0.4, smile: 0.6 }],
  [12, { ...ON, bamboo: 1, bambooEar: 1, ...both(4, 7.5, 13), tongueOut: 0.6, mouth: 0.2, smile: 0.8, lookX: -0.4 }],
  [24, { ...ON, bamboo: 1, bambooEar: 1, gait: 1, ...both(5, 6, 16), lookX: -0.3, mWink: 1, mSmirk: 1 }],
  [36, { ...ON, bamboo: 1, bambooEar: 1, gait: 1, ...both(5, 6, 16), mSmirk: 1 }],
  // lifts the lid, licks his lips
  [40, { ...ON, bamboo: 1, bambooEar: 1, lean: 1, pitch: 0.12, ...hand('L', 7.4, -2.6, 19.5), ...hand('R', 5, 6, 14), tongueOut: 1, mouth: 0.3, lookX: 0.2, lookY: -0.5, mSmirk: 1 }],
  [48, { ...ON, bamboo: 1, bambooEar: 1, lean: 1.4, pitch: 0.16, ...hand('L', 6.6, -3.4, 23), ...hand('R', 8.2, 1.6, 17.6), tongueOut: 1, mouth: 0.3, lid: 0.5, smile: 1, lookY: -0.6, mBrowUp: 1, mSmirk: 1 }],
  // Шустрик leaps onto the table and snatches the bun from under the paw
  [52, { bamboo: 1, bambooEar: 1, lean: 1.4, pitch: 0.16, ...hand('L', 6.6, -3.4, 23), ...hand('R', 8.4, 1.4, 17.2), tongueOut: 1, lid: 0.6, smile: 1, ...M_RUN, mRun: 0, mJump: 1, ...mBoth(1.6, 2.4, 3) }],
  [58, { bamboo: 1, bambooEar: 1, lean: 1.4, pitch: 0.16, ...hand('L', 6.6, -3.4, 23), ...hand('R', 8.4, 1.4, 16.6), tongueOut: 1, lid: 0.6, smile: 1, mOn: 0, mPitch: 0.5, ...mHand('R', 3.6, 0.6, 0.6), ...mHand('L', 1.6, -2.4, 0), mBun: 0 }],
  [61, { bamboo: 1, bambooEar: 1, lean: 1.2, pitch: 0.12, ...hand('L', 6.6, -3.4, 22), ...hand('R', 8.4, 1.4, 16.4), tongueOut: 0.6, lid: 0.3, mOn: 0, mBun: 1, ...mHand('R', 1.6, 2.2, 3.4), mTongue: 1, mSquint: 0.6, mBrowUp: 1 }],
  [66, { bamboo: 1, bambooEar: 1, lean: 1.1, pitch: 0.1, ...hand('L', 6.6, -3.4, 21), ...hand('R', 7.6, 2.4, 15.6), mOn: 0, mBun: 1, ...mHand('R', 1.6, 2.2, 3.4), ...mHand('L', 1.2, -0.6, 4.8), mTongue: 1, mSquint: 0.7, mBrowUp: 1 }],
  // he freezes: the eyes pop, the brows fly up
  [68, { bamboo: 1, bambooEar: 1, pop: 1, browUp: 1, mouth: 0.7, earFlap: 1, sqz: 0.1, ...both(5, 9, 18), mOn: 0, mBun: 1, ...mHand('R', 1.6, 2.2, 3.4), mTongue: 1, mSquint: 0.7 }],
  [72, { bamboo: 1, bambooEar: 1, pop: 0.8, browIn: 1, mouth: 0.3, ...both(5, 9, 14), mOn: 0, mBun: 1, ...mHand('R', 1.6, 2.2, 3.4), mPop: 0.6, mBrowUp: 1 }],
  // the chase
  [76, { bamboo: 1, ...RUN, mouth: 0.6, ...M_RUN, mBun: 1, ...mHand('R', 1.2, 2.0, 2.6), mSquint: 0.5, mMouth: 0.8 }],
  [110, { bamboo: 1, ...RUN, mouth: 0.6, teeth: 1, ...M_RUN, mBun: 1, ...mHand('R', 1.2, 2.0, 2.6), mMouth: 1 }],
  [116, { bamboo: 1, ...RUN, mouth: 0.6, ...M_RUN, mRun: 0.3, mBun: 1, mJump: 1, ...mHand('R', 1.2, 2.0, 3), mMouth: 1 }],
  [126, { bamboo: 1, ...RUN, mouth: 0.8, tongueOut: 0.8, ...M_RUN, mRun: 0, mBun: 1, ...mHand('R', 1.2, 2.0, 2.6), mTongue: 1, mSquint: 0.6 }],
  [139, { bamboo: 1, ...RUN, pitch: 0.18, mouth: 0.9, tongueOut: 1, lid: 0.3, ...M_RUN, mRun: 0, mBun: 1, ...mHand('R', 1.2, 2.0, 2.6), ...mHand('L', 1, -0.5, 4.6), mTongue: 1 }],
  [150, { bamboo: 1, ...RUN, pitch: 0.16, mouth: 0.9, tongueOut: 1, lid: 0.35, ...M_RUN, mBun: 1, ...mHand('R', 1.2, 2.0, 2.6) }],
  [164, { bamboo: 1, ...RUN, mouth: 0.9, tongueOut: 1, lid: 0.4, ...M_RUN, mBun: 1 }],
  // Шустрик back alone from the right; he giggles at the end of the rug
  [184, { bamboo: 1, ...RUN, mouth: 0.9, tongueOut: 1, lid: 0.4, ...M_RUN, mRun: 0, mBun: 1, mSquint: 0.7, mMouth: 1, ...mHand('L', 1.4, -0.4, 0.2) }],
  [190, { bamboo: 1, ...RUN, pitch: 0.1, mouth: 0.5, lid: 0.2, mOn: 0, mBun: 1, mPitch: 0.4, ...mHand('L', 2.6, -1.4, -2.6), mSquint: 0.7, mMouth: 1 }],
  // the rug is yanked: feet up, he hangs in the air
  [194, { bamboo: 1, bambooEar: 1, ...LIE, lift: 9, legsUp: 1, pop: 0.8, browUp: 1, mouth: 0.7, ...both(1, 9.5, 26), mOn: 0, mBun: 1, mPitch: -0.3, mLean: -1, ...mHand('L', 3, -1.6, -1.6), mMouth: 1 }],
  [198, { bamboo: 1, bambooEar: 1, ...LIE, lift: 16, legsUp: 1, pop: 0.6, browUp: 0.8, ...both(0, 9.8, 34), lookY: 0.6, mOn: 0, mBun: 1, mPop: 0.5, mBrowUp: 1 }],
  [204, { bamboo: 1, bambooEar: 1, ...LIE, lift: 17, legsUp: 1, pop: 0.2, browSad: 0.6, ...both(0, 9.8, 34), lookY: 0.8, lookX: 0.4, gaze: 0.2, mOn: 0, mBun: 1, mPop: 0.4 }],
  [206, { bamboo: 1, bambooEar: 1, ...LIE, lift: 17, legsUp: 1, blink: 1, browSad: 0.6, ...both(0, 9.8, 34), gaze: 0.2, mOn: 0, mBun: 1 }],
  [208, { bamboo: 1, bambooEar: 1, ...LIE, lift: 17, legsUp: 1, browSad: 0.8, wavy: 1, ...both(0, 9.8, 34), lookY: 0.8, lookX: 0.4, gaze: 0.2, mOn: 0, mBun: 1 }],
  [212, { bamboo: 1, bambooEar: 1, ...LIE, lift: 16, legsUp: 1, pop: 0.5, browUp: 1, mouth: 0.6, ...both(0, 9.8, 32), mOn: 0, mBun: 1 }],
  // flat on his back: squash; the bun jumps out of Шустрик's hands into his mouth
  [216, { bamboo: 1, bambooEar: 1, ...LIE, sqz: -0.18, sqx: 0.1, sqy: 0.1, lid: 0.6, mouth: 0.4, ...both(3, 10, 8), earFlap: 1, mOn: 0, mBun: 1, mPop: 0.8, mJump: 1.5 }],
  [218, { bamboo: 1, bambooEar: 1, ...LIE, lid: 0.3, mouth: 0.8, ...both(3, 10, 8), mOn: 0, mBun: 0, mPop: 0.6, ...mBoth(2.4, 2.2, 2.8), mMouth: 0.8 }],
  [226, { bamboo: 1, bambooEar: 1, ...LIE, mouth: 1, wide: 1, browUp: 1, lookX: 0.6, ...both(3, 9, 9), mOn: 0, ...mBoth(2.6, 2.4, 3.6), mMouth: 1, mPop: 0.5 }],
  [230, { bamboo: 1, bambooEar: 1, ...LIE, chew: 1, lid: 1, smile: 1, ...both(6, 6, 10), mOn: 0, mPop: 0.6, mBrowUp: 1, mMouth: 0.6 }],
  [234, { bamboo: 1, bambooEar: 1, ...LIE, chew: 1, lid: 1, smile: 1, ...both(6, 6, 10), mOn: 0, ...mHand('R', 1.6, 0.4, 4.6), mLid: 1, mBrowSad: 1 }],
  [240, { bamboo: 1, bambooEar: 1, ...LIE, chew: 1, lid: 1, smile: 1, ...both(6, 6, 10), mOn: 0, mSit: 1, ...mBoth(1.4, 0.6, 1.2), mBrowIn: 1, mLid: 0.4 }],
  [247, { bamboo: 1, bambooEar: 1, ...LIE, chew: 1, lid: 1, smile: 1, ...both(6, 6, 10), mOn: 0, mSit: 1, ...mBoth(1.4, 0.6, 1.2), mBrowIn: 1, mLid: 0.4, mGaze: 0.5 }],
  // Шустрик drags the rug back; Пончик sits up, stands, takes his bamboo
  [250, { bamboo: 1, bambooEar: 1, ...LIE, chew: 1, lid: 0.8, smile: 1, ...both(6, 6, 10), mOn: 0, mLean: -1.4, mPitch: -0.3, ...mBoth(-1.6, 1.6, -1.4), mBrowIn: 1 }],
  [256, { bamboo: 1, bambooEar: 1, sit: 1, chew: 1, lid: 0.5, smile: 1, ...both(5, 8, 10), mOn: 0, mLean: -1.4, mPitch: -0.3, ...mBoth(-1.6, 1.6, -1.4), mBrowIn: 1 }],
  [262, { bamboo: 1, bambooEar: 0.4, crouch: 1, chew: 1, smile: 0.8, lookX: -0.4, mOn: 0, mJump: 1, ...mBoth(1.6, 2.4, 3) }],
  [268, { ...REST, mOn: 0.8, ...mBoth(1.6, 2, 1) }],
  [276, { ...REST }],
];

// ---- «Бамбук» (trick_b) ------------------------------------------------------------------------------------------
// The juicy shoot at the top of the bamboo by the window: he can't reach it, jumps twice, catches the stalk and bends
// it down, turns to us with the shoot in front of his nose — it slips: the stalk whips up and smacks his face flat (a
// red welt), he spins like a top. Again: this time he hugs it with arms and legs; Шустрик tickles his heel with his
// tail; he giggles, lets go — the stalk catapults him up out over the top of the frame (he snatches the shoot on the
// way). Leaves drift down; Шустрик looks up. He falls back tumbling, straight into the water barrel: a splash over the
// whole picture, legs kicking out of the barrel; the head pops out with a ladle on it and spits a jet of water. He
// climbs out, shakes himself — Шустрик is soaked; tosses the ladle back, goes home munching the shoot; Шустрик shakes
// himself dry back at him and climbs aboard.
const TUBX = KITCHEN.tub.x,
  TUBY = KITCHEN.tub.y;
const AT_TUB: [number, number] = [10, -36];
/** Facing the tub from AT_TUB (to his right and back). */
const FACE_TUB = Math.atan2(KITCHEN.tub.y - AT_TUB[1], KITCHEN.tub.x - AT_TUB[0]) - 1.0;
const BR = KITCHEN.barrel;
const OUT_BR: [number, number] = [-28.5, 9];
const trickBPanda = pathLanes([
  stay(0, 10, 0, 0, 0),
  run(10, 34, [0, 0], AT_TUB),
  stay(36, 66, AT_TUB[0], AT_TUB[1], FACE_TUB),
  stay(72, 82, AT_TUB[0], AT_TUB[1], FACE.us),
  stay(84, 110, AT_TUB[0], AT_TUB[1], FACE.us),
  stay(112, 118, AT_TUB[0], AT_TUB[1], FACE_TUB),
  stay(124, 156, AT_TUB[0], AT_TUB[1], FACE.us),
  { a: 158, b: 197, at: (u) => ({ x: AT_TUB[0] + (BR.x - AT_TUB[0]) * smoothU(u), y: AT_TUB[1] + (BR.y - AT_TUB[1]) * smoothU(u), yaw: FACE.us }) },
  stay(198, 232, BR.x, BR.y, FACE.us),
  { a: 233, b: 240, at: (u) => ({ x: BR.x + (OUT_BR[0] - BR.x) * u, y: BR.y + (OUT_BR[1] - BR.y) * u, yaw: FACE.us }) },
  stay(241, 252, OUT_BR[0], OUT_BR[1], FACE.us),
  run(252, 264, OUT_BR, [0, 0]),
  stay(265, 276, 0, 0, 0),
]);
function smoothU(u: number) {
  return u * u * (3 - 2 * u);
}
const M_WATCH: [number, number] = [12, -22];
const M_BR: [number, number] = [-11, 19];
const trickBMonkey = pathLanes(
  [
    stay(0, 106, 0, 0, 0),
    { a: 108, b: 118, at: (u) => ({ x: AT_TUB[0] + 6 * u + 4 * Math.sin(u * Math.PI), y: AT_TUB[1] + 7 * Math.sin((u * Math.PI) / 2) + 6 * Math.sin(u * Math.PI), z: 30 * (1 - u) + 10 * Math.sin(u * Math.PI), yaw: FACE.left }) },
    stay(119, 144, AT_TUB[0] + 6, AT_TUB[1] + 7, FACE.left),
    { a: 146, b: 154, at: (u) => ({ x: AT_TUB[0] + 6 + (M_WATCH[0] - AT_TUB[0] - 6) * u, y: AT_TUB[1] + 7 + (M_WATCH[1] - AT_TUB[1] - 7) * u, z: 5 * Math.sin(u * Math.PI), yaw: FACE.usLeft }) },
    stay(155, 196, M_WATCH[0], M_WATCH[1], FACE.us),
    run(198, 214, M_WATCH, M_BR),
    stay(216, 262, M_BR[0], M_BR[1], FACE.left),
    // climbs up round his back, clear of the big head, and drops into the seat
    { a: 265, b: 273, at: (u) => ({ x: M_BR[0] * (1 - u * u), y: M_BR[1] * (1 - u) ** 2 - 16 * Math.sin(u * Math.PI), z: 31 * Math.sin(u * Math.PI * 0.5) + 10 * Math.sin(u * Math.PI), yaw: 0 }) },
    stay(274, 276, 0, 0, 0),
  ],
  true,
);
/** Paws up at the sides of his big head (the short arms can't get over it); dz = how much the body rose. */
const HOLD_UP = (dz: number): JointPose => both(1.4, 10.8, 21 + dz);
/** Both paws on the pulled-down stalk in front of his chest. */
const PULL = (dz = 0, x = 7.2): JointPose => both(x, 3.2, 16.5 + dz);
const trick_b: Track = [
  [0, { ...REST }],
  [6, { ...REST, chew: 0, toMouth: 0.4, nod: -0.4, lookY: 0.8, lookX: 0.5, browUp: 0.6, smile: 0.6 }],
  [10, { ...ON, bamboo: 1, bambooEar: 1, nod: -0.3, lookY: 0.7, smile: 0.7, tongueOut: 0.4, ...both(4, 7.5, 13) }],
  [22, { ...ON, bamboo: 1, bambooEar: 1, gait: 1, ...both(5, 7, 14), lookY: 0.6 }],
  [34, { ...ON, bamboo: 1, bambooEar: 1, gait: 1, ...both(5, 7, 14) }],
  // reaches up on tiptoe, can't; two jumps, the second catches the stalk
  [40, { ...ON, bamboo: 1, bambooEar: 1, lift: 1.2, ...HOLD_UP(1.2), nod: -0.4, ...mBoth(1, 3.3, -1), mLookY: 0.6 }],
  [46, { ...ON, bamboo: 1, bambooEar: 1, lift: 1.4, ...HOLD_UP(1.4), nod: -0.45, sqz: 0.08 }],
  [49, { ...ON, bamboo: 1, bambooEar: 1, crouch: 2, sqz: -0.12, ...both(3, 8, 14) }],
  [53, { ...ON, bamboo: 1, bambooEar: 1, jump: 6, air: 1, ...HOLD_UP(6), sqz: 0.12, nod: -0.4 }],
  [57, { ...ON, bamboo: 1, bambooEar: 1, crouch: 2, sqz: -0.14, ...both(3, 8, 14), browIn: 0.6 }],
  [61, { ...ON, bamboo: 1, bambooEar: 1, jump: 9, air: 1, ...HOLD_UP(9), sqz: 0.14, nod: -0.4, browIn: 0.8 }],
  [66, { ...ON, bamboo: 1, bambooEar: 1, crouch: 1.5, pitch: -0.15, ...PULL(-1.5, 6.6), browIn: 0.8, mouth: 0.4 }],
  // turns to us with the shoot in front of his nose, licks his lips, opens wide — it slips
  [72, { ...ON, bamboo: 1, bambooEar: 1, ...PULL(), smile: 1, tongueOut: 0.8, lid: 0.4 }],
  [78, { ...ON, bamboo: 1, bambooEar: 1, ...PULL(0.4, 7.4), mouth: 1, wide: 1, lid: 0.7, mBrowUp: 1, mPop: 0.4 }],
  [81, { ...ON, bamboo: 1, bambooEar: 1, ...hand('R', 7, 3.4, 16), ...hand('L', 7.4, -2.6, 18.6), mouth: 1, pop: 0.6, browUp: 1 }],
  // SMACK: the face pressed flat with a red welt, he spins like a top
  [83, { ...ON, bamboo: 1, bambooEar: 1, flatFace: 1, welt: 1, sqz: -0.1, pitch: -0.2, ...both(1, 10, 18), lid: 1, wavy: 1, earFlap: 1, mOn: 0.6, mPop: 1, mJump: 2 }],
  [90, { ...ON, bamboo: 1, bambooEar: 1, flatFace: 0.8, welt: 1, twist: 6.28, ...both(1, 10.5, 16), dizzy: 1, wavy: 1, tongueOut: 0.6, ...mBoth(0.6, 3.4, 0.4), mPop: 0.6 }],
  [100, { ...ON, bamboo: 1, bambooEar: 1, flatFace: 0.3, welt: 1, twist: 12.57, ...both(2, 10, 14), dizzy: 1, wavy: 1, tongueOut: 0.8, tilt: 0.2, ...mBoth(0.6, 3.4, 0.4) }],
  [106, { ...ON, bamboo: 1, bambooEar: 1, welt: 0.8, twist: 12.57, ...both(4, 9, 12), dizzy: 1, wavy: 1, tilt: -0.15 }],
  // shakes it off, determined; Шустрик hops down
  [110, { ...ON, bamboo: 1, bambooEar: 1, welt: 0.7, twist: 12.57, gaze: 0.3, browIn: 1, ...both(5, 8, 13), mOn: 0.5, mJump: 1 }],
  [112, { bamboo: 1, bambooEar: 1, welt: 0.6, twist: 12.57, gaze: -0.3, browIn: 1, ...both(4, 8, 14), mOn: 0, mJump: 0 }],
  [116, { bamboo: 1, bambooEar: 1, welt: 0.5, twist: 12.57, jump: 7, air: 1, ...HOLD_UP(7), browIn: 1, mOn: 0, mSit: 0.5 }],
  // hugs the bent stalk with arms and legs; Шустрик tickles his heel with the tail tip
  [124, { bamboo: 1, bambooEar: 1, welt: 0.4, twist: 12.57, crouch: 3, ...both(4.4, 2.2, 16), ...foot('L', 3.6, -2.2, 3.4), ...foot('R', 3.6, 2.2, 3.4), browIn: 1, mOn: 0, mSmirk: 1, mSmile: 1, mTail: 0.6 }],
  [132, { bamboo: 1, bambooEar: 1, welt: 0.3, twist: 12.57, crouch: 3, ...both(4.4, 2.2, 16), ...foot('L', 3.6, -2.2, 3.4), ...foot('R', 3.6, 2.2, 3.4), browIn: 0.6, squint: 0.4, mOn: 0, mLean: 1.4, mPitch: 0.5, ...mHand('R', 2.6, 1.2, -2.4), mSmirk: 1, mSmile: 1 }],
  [138, { bamboo: 1, bambooEar: 1, welt: 0.2, twist: 12.57, crouch: 3, ...both(4.4, 2.2, 16), ...foot('L', 3.6, -2.2, 3.4), ...foot('R', 3.2, 2.2, 4.4), squint: 0.8, mouth: 0.6, browSad: 0.6, mOn: 0, mLean: 1.4, mPitch: 0.5, ...mHand('R', 2.6, 1.6, -2.2), mSmirk: 1 }],
  [143, { bamboo: 1, bambooEar: 1, welt: 0.1, twist: 12.57, crouch: 2.6, roll: 0.15, ...both(4.4, 2.6, 16.4), ...foot('L', 3.6, -2.2, 3.4), ...foot('R', 3.0, 2.2, 5.0), lid: 1, mouth: 1, smile: 1, mOn: 0, mLean: 1.4, mPitch: 0.5, ...mHand('R', 2.6, 1.2, -2.4), mSquint: 0.8, mMouth: 1 }],
  // lets go: the stalk catapults him up and out over the top of the frame
  [146, { bamboo: 1, bambooEar: 1, twist: 12.57, crouch: 2, sqz: -0.18, sqx: 0.08, sqy: 0.08, ...both(3, 9, 16), pop: 0.6, browUp: 1, mouth: 0.8, mOn: 0, mJump: 2, mTail: -0.8, mPop: 0.8 }],
  [150, { bamboo: 1, bambooEar: 1, overAll: 1, twist: 12.57, lift: 30, air: 1, sqz: 0.4, sqx: -0.18, sqy: -0.18, ...both(0.6, 8.6, 21 + 30), pop: 1, browUp: 1, mouth: 1, mOn: 0, mTail: 0, mPop: 0.7, mBrowUp: 1 }],
  [156, { bamboo: 1, bambooEar: 1, overAll: 1, twist: 12.57, lift: 96, air: 1, sqz: 0.3, ...both(0.6, 8.6, 21 + 96), pop: 1, mouth: 1, mOn: 0, mGaze: 0, mNod: -0.5, ...mHand('R', 2.3, 0.8, 4.3) }],
  [158, { hidden: 1, twist: 12.57, mOn: 0, mNod: -0.55, ...mHand('R', 2.3, 0.8, 4.5), mLookY: 1 }],
  [184, { hidden: 1, twist: 12.57, mOn: 0, mNod: -0.5, ...mHand('R', 2.3, 0.8, 4.5), mLookY: 1, mGaze: -0.3 }],
  // falls back down tumbling, into the barrel
  [186, { bamboo: 1, bambooEar: 1, overAll: 1, twist: 12.57, lift: 80, air: 1, tuck: 1, pitch: 0, ...both(3, 9, 22 + 80), pop: 0.8, browUp: 1, mouth: 0.8, mOn: 0, mPop: 0.6, mLookY: 0.8 }],
  [192, { bamboo: 1, bambooEar: 1, twist: 12.57, lift: 34, air: 1, tuck: 1, pitch: -3.14, ...both(3, 9, 6 + 34), pop: 0.8, mouth: 0.8, mOn: 0, mRun: 1 }],
  [197, { bamboo: 1, bambooEar: 1, twist: 12.57, lift: 10, air: 1, pitch: -6.28 + 0.4, legsUp: 1, ...both(2, 9.5, 21 + 10), pop: 0.6, mOn: 0, mRun: 1 }],
  // legs kicking out of the barrel (upside down inside it)
  [199, { mOver: 1, bamboo: 1, bambooEar: 1, clipZ: BR.h, twist: 12.57, lift: -1, air: 1, pitch: -3.14 - 6.28, kick: 1, mOn: 0, mRun: 1 }],
  [204, { mOver: 1, bamboo: 1, bambooEar: 1, clipZ: BR.h, twist: 12.57, lift: -1, air: 1, pitch: -3.14 - 6.28, kick: -1, mOn: 0, mRun: 1 }],
  [209, { mOver: 1, bamboo: 1, bambooEar: 1, clipZ: BR.h, twist: 12.57, lift: -1, air: 1, pitch: -3.14 - 6.28, kick: 1, mOn: 0, mRun: 0, mPop: 0.6, mBrowUp: 1 }],
  [213, { mOver: 1, bamboo: 1, bambooEar: 1, clipZ: BR.h, twist: 12.57, lift: -1.4, air: 1, pitch: -3.14 - 6.28, kick: -0.5, mOn: 0, mPop: 0.5 }],
  // the head pops out under a ladle and spits a jet of water
  [215, { mOver: 1, bamboo: 1, bambooEar: 1, ladleHat: 1, clipZ: BR.h, twist: 12.57, lift: 1.4, air: 1, pitch: -12.57, lid: 0.5, wavy: 1, mOn: 0, mPop: 0.4 }],
  [220, { mOver: 1, bamboo: 1, bambooEar: 1, ladleHat: 1, clipZ: BR.h, twist: 12.57, lift: 2.2, air: 1, pitch: -12.57, lid: 0.4, mouth: 0.3, browSad: 0.6, mOn: 0 }],
  [222, { mOver: 1, bamboo: 1, bambooEar: 1, ladleHat: 1, clipZ: BR.h, twist: 12.57, lift: 2.2, air: 1, pitch: -12.57, lid: 0.4, mouth: 0.5, wide: -0.6, browSad: 0.8, mOn: 0, mMouth: 0.8, mSquint: 0.5 }],
  [230, { mOver: 1, bamboo: 1, bambooEar: 1, ladleHat: 1, clipZ: BR.h, twist: 12.57, lift: 2.2, air: 1, pitch: -12.57, lid: 0.3, mouth: 0.1, browSad: 0.6, mOn: 0, mMouth: 1, mSquint: 0.7 }],
  // climbs out, shakes himself — Шустрик gets soaked
  [236, { mOver: 0, bamboo: 1, bambooEar: 1, ladleHat: 1, twist: 12.57, jump: 6, air: 1, pitch: -12.57, ...both(2, 9, 26), mOn: 0, mMouth: 0.6 }],
  [241, { bamboo: 1, bambooEar: 1, ladleHat: 1, twist: 12.57, crouch: 1.5, sqz: -0.12, pitch: -12.57, ...both(4, 9, 12), mOn: 0 }],
  [243, { bamboo: 1, bambooEar: 1, twist: 12.57 + 0.5, pitch: -12.57, lid: 1, vib: 1, earFlap: 1, ...both(3, 10, 14), mOn: 0, mPop: 0.4 }],
  [245, { bamboo: 1, bambooEar: 1, twist: 12.57 - 0.5, pitch: -12.57, lid: 1, vib: 1, earFlap: 1, ...both(3, 10, 14), mOn: 0, mWet: 1, mPop: 0.8, mBrowUp: 1 }],
  [247, { bamboo: 1, bambooEar: 1, twist: 12.57 + 0.5, pitch: -12.57, lid: 1, vib: 1, earFlap: 1, ...both(3, 10, 14), mOn: 0, mWet: 1, mBrowIn: 1 }],
  [250, { bamboo: 1, bambooEar: 0.5, twist: 12.57, pitch: -12.57, smile: 0.8, toMouth: 1, mOn: 0, mWet: 1, mBrowIn: 1, ...mBoth(1.4, 0.6, 1.2) }],
  // home munching the shoot; Шустрик shakes himself dry and climbs aboard
  [254, { ...REST, twist: 12.57, pitch: -12.57, gait: 1, mOn: 0, mWet: 1, mBrowIn: 1, ...mBoth(1.4, 0.6, 1.2) }],
  [258, { ...REST, twist: 12.57, pitch: -12.57, gait: 1, mOn: 0, mWet: 1, mTwist: 0.6, mBrowIn: 0.5 }],
  [260, { ...REST, twist: 12.57, pitch: -12.57, gait: 1, mOn: 0, mWet: 0, mTwist: -0.6, mLid: 1 }],
  [262, { ...REST, twist: 12.57, pitch: -12.57, gait: 1, mOn: 0, mTwist: 0, mSmirk: 1 }],
  [270, { ...REST, twist: 12.57, pitch: -12.57, gait: 0, mOn: 0.7, ...mBoth(1.6, 2, 1) }],
  [276, { ...REST, twist: 12.57, pitch: -12.57 }],
];

// ---- trick_c «Горшок мёда» (11 s, 264 frames) ------------------------------------------------------------------------
// He sniffs the honey jar on the bench, puts his head in it and gets stuck; walks blind into the door, staggers back
// against the table — the steamer lid jumps up and lands on the jar twice (bom, bom) and back on the steamer. Шустрик rolls about laughing, then pulls the
// jar off in a tug of war (the neck stretches); the jar pops off and lands back on the bench, Шустрик flies into the
// flour sack. A white Шустрик steps out of the cloud; Пончик licks the honey off his nose and they go home.
const AT_JAR: [number, number] = [9, -38.5];
const DOOR_HIT: [number, number] = [-7, -37];
const TABLE_HIT: [number, number] = [-5, -24.5];
const TUG: [number, number] = [-4, -2];
const M_SIDE: [number, number] = [21, -29];
const M_ROLL: [number, number] = [16, -22];
const M_TUG0 = 17.5,
  M_TUG1 = 21;
const M_OUT: [number, number] = [33.5, 15];
const M_WAIT: [number, number] = [22, 10];
const trickCPanda = pathLanes([
  stay(0, 6, 0, 0, 0),
  run(8, 20, [0, 0], AT_JAR),
  stay(21, 40, AT_JAR[0], AT_JAR[1], FACE.away),
  // blind: a step toward us, a turn, and straight into the door
  run(40, 50, AT_JAR, [1, -30]),
  run(51, 62, [1, -30], DOOR_HIT),
  // bounced back off the door, staggering backwards; his hip bumps the table
  run(63, 74, DOOR_HIT, TABLE_HIT, false, FACE.away),
  stay(75, 92, TABLE_HIT[0], TABLE_HIT[1], FACE.away),
  // wanders blind to the middle of the floor
  run(93, 104, TABLE_HIT, [2, -14]),
  run(105, 116, [2, -14], TUG),
  stay(118, 244, TUG[0], TUG[1], FACE.right),
  run(246, 258, TUG, [0, 0]),
  stay(259, 264, 0, 0, 0),
]);
const trickCMonkey = pathLanes(
  [
    stay(0, 17, 0, 0, 0),
    { a: 18, b: 26, at: (u) => ({ x: AT_JAR[0] + (M_SIDE[0] - AT_JAR[0]) * Math.sin((u * Math.PI) / 2), y: AT_JAR[1] + (M_SIDE[1] - AT_JAR[1]) * Math.sin((u * Math.PI) / 2), z: 30 * (1 - u) + 12 * Math.sin(u * Math.PI), yaw: FACE.usLeft }) },
    stay(27, 70, M_SIDE[0], M_SIDE[1], FACE.usLeft),
    run(71, 76, M_SIDE, M_ROLL, false, FACE.us),
    stay(77, 106, M_ROLL[0], M_ROLL[1], FACE.us),
    run(107, 118, M_ROLL, [M_TUG0, TUG[1]]),
    { a: 119, b: 159, at: (u) => ({ x: M_TUG0 + (M_TUG1 - M_TUG0) * u, y: TUG[1], z: 0, yaw: FACE.left }) },
    // the pop: flies backward into the flour sack
    { a: 160, b: 166, at: (u) => ({ x: M_TUG1 + (KITCHEN.sack.x - M_TUG1) * u, y: TUG[1] + (KITCHEN.sack.y - TUG[1]) * u, z: 6 + 12 * Math.sin(u * Math.PI), yaw: FACE.left }) },
    stay(167, 175, KITCHEN.sack.x, KITCHEN.sack.y, FACE.us, 4),
    run(176, 184, [KITCHEN.sack.x, KITCHEN.sack.y], M_OUT, false, FACE.us),
    stay(185, 208, M_OUT[0], M_OUT[1], FACE.us),
    run(209, 222, M_OUT, M_WAIT),
    stay(223, 250, M_WAIT[0], M_WAIT[1], FACE.left),
    // hops up onto the head as Пончик comes home
    { a: 251, b: 258, at: (u) => ({ x: M_WAIT[0] * (1 - u), y: M_WAIT[1] * (1 - u) - 4 * Math.sin(u * Math.PI), z: 34 * Math.sin((u * Math.PI) / 2) + 8 * Math.sin(u * Math.PI), yaw: 0 }) },
    stay(259, 264, 0, 0, 0, 34),
  ],
  true,
);
/** Paws on the sides of the jar (pulling it off). */
const JAR_PAWS = (dz = 0): JointPose => both(0.8, 11.4, 21.5 + dz);
/** Arms out in front, feeling the way. */
const BLIND = (k = 0): JointPose => ({ ...hand('R', 7.6, 4.8 + k, 13.2 + k), ...hand('L', 7.6, -4.8 + k, 13.2 - k) });
/** Шустрик doubled up with laughter. */
const LAUGH = (k: number): JointPose => ({ mMouth: 1, mSquint: 1, mSmile: 1, mPitch: 0.45 + 0.15 * k, mLean: 0.6, ...mHand('R', 1.2, 2.2, -1.2), ...mHand('L', 1.6, -1.4, 0.6 + k) });
/** Rolling on his back with laughter, legs kicking. */
const ROLL = (k: number): JointPose => ({ mMouth: 1, mSquint: 1, mSmile: 1, mPitch: -1.45, mTwist: 0.5 * k, ...mHand('R', 1.0, 2.0, -0.4), ...mHand('L', 1.0, -2.0, -0.4), ...mFoot('L', 1.4, -1.4, -1.2 + k), ...mFoot('R', 1.4, 1.4, -1.2 - k) });
/** The tug of war: he sits bent forward, the neck stretching; Шустрик leans back hauling on the jar. */
const TUGK = (neck: number, k: number): JointPose => ({
  jar: 1,
  bamboo: 1,
  bambooEar: 1,
  sit: 1,
  pitch: 1.25 + 0.04 * k,
  neck,
  sqx: 0.04 * k,
  ...hand('R', 6.5, 8.5, 1.5 + k),
  ...hand('L', 6.5, -8.5, 1.5 - k),
  mOn: 0,
  mLean: -1.5 - 0.2 * k,
  mPitch: -0.45 - 0.1 * k,
  ...mBoth(3.4, 0.9, 1.6),
  ...mFoot('L', 2.4, -1.4, -3.0),
  ...mFoot('R', 1.8, 1.4, -3.0),
  mSquint: 1,
  mMouth: 0.4,
  mBrowIn: 1,
});
const trick_c: Track = [
  [0, { ...REST }],
  // sniffs: the nose goes up, the eyes half shut, a dreamy smile
  [4, { ...REST, chew: 0, toMouth: 0.4, nod: -0.35, lookY: 0.8, lid: 0.45, smile: 0.6, mGaze: 0.3 }],
  [8, { ...ON, bamboo: 1, bambooEar: 1, nod: -0.3, lid: 0.4, smile: 0.9, tongueOut: 0.4, gait: 1, ...mBoth(1.0, 3.3, -1.0) }],
  [16, { ...ON, bamboo: 1, bambooEar: 1, nod: -0.2, smile: 0.9, gait: 1, mJump: 1, mBrowUp: 1 }],
  // Шустрик hops off; Пончик takes the jar off the bench and lifts it
  [18, { ...ON, bamboo: 1, bambooEar: 1, gait: 1, ...both(6.6, 3.4, 13), mJump: 1.5 }],
  [20, { bamboo: 1, bambooEar: 1, ...both(7.0, 3.2, 12), mOn: 0.5, mJump: 0 }],
  [22, { bamboo: 1, bambooEar: 1, lift: 0.6, ...both(6.8, 4.2, 18.6), sqz: 0.08, mOn: 0, mPop: 0.5, mBrowUp: 1 }],
  // head in: the jar slams down, squash
  [24, { bamboo: 1, bambooEar: 1, jar: 1, crouch: 1.2, sqz: -0.14, sqx: 0.07, sqy: 0.07, ...JAR_PAWS(-1), mOn: 0, mSmirk: 1 }],
  // stuck: he tugs and twists, it won't come off
  [27, { bamboo: 1, bambooEar: 1, jar: 1, lift: 0.8, twist: 0.45, sqz: 0.1, ...JAR_PAWS(0.8), mOn: 0, mSmirk: 1, mSmile: 0.6 }],
  [30, { bamboo: 1, bambooEar: 1, jar: 1, crouch: 0.8, twist: -0.45, sqz: -0.08, ...JAR_PAWS(-0.6), vib: 0.4, mOn: 0, ...mHand('R', 1.4, 1.0, 1.6) }],
  [33, { bamboo: 1, bambooEar: 1, jar: 1, lift: 1.0, twist: 0.5, sqz: 0.12, ...JAR_PAWS(1), mOn: 0, ...mHand('R', 1.4, 1.0, 1.7), mSmile: 1 }],
  [36, { bamboo: 1, bambooEar: 1, jar: 1, crouch: 1, twist: -0.5, sqz: -0.1, ...JAR_PAWS(-0.8), vib: 0.5, mOn: 0, mSmirk: 1 }],
  [39, { bamboo: 1, bambooEar: 1, jar: 1, roll: 0.1, ...JAR_PAWS(0), mOn: 0, mSmirk: 1 }],
  // blind walk, arms out
  [42, { bamboo: 1, bambooEar: 1, jar: 1, gait: 1, roll: -0.1, ...BLIND(0.6), mOn: 0, mSmirk: 1, mSmile: 0.6 }],
  [48, { bamboo: 1, bambooEar: 1, jar: 1, gait: 1, roll: 0.1, ...BLIND(-0.6), mOn: 0, ...mHand('R', 1.4, 1.0, 1.6) }],
  [54, { bamboo: 1, bambooEar: 1, jar: 1, gait: 1, roll: -0.1, ...BLIND(0.6), mOn: 0, ...mHand('R', 1.4, 1.0, 1.7), mSmile: 1 }],
  [60, { bamboo: 1, bambooEar: 1, jar: 1, gait: 1, roll: 0.06, ...BLIND(-0.3), mOn: 0, mSmirk: 1 }],
  // BONK on the door: squash, the whole of him rings
  [62, { bamboo: 1, bambooEar: 1, jar: 1, pitch: -0.18, sqz: -0.16, sqx: 0.08, sqy: 0.08, vib: 1, ...both(3, 10, 13), mOn: 0, mPop: 0.6 }],
  [65, { bamboo: 1, bambooEar: 1, jar: 1, pitch: -0.3, lean: -1, vib: 0.7, ...hand('R', -1, 10, 22), ...hand('L', 5, -9, 11), gait: 1, mOn: 0, ...LAUGH(0) }],
  [69, { bamboo: 1, bambooEar: 1, jar: 1, pitch: -0.22, roll: 0.15, vib: 0.3, ...hand('R', 5, 9, 11), ...hand('L', -1, -10, 22), gait: 1, mOn: 0, ...LAUGH(1) }],
  // backs into the table: thump, the steamers jump
  [74, { bamboo: 1, bambooEar: 1, jar: 1, pitch: -0.1, sqz: -0.1, vib: 0.6, ...both(2, 9.5, 14), mOn: 0, ...LAUGH(0) }],
  [78, { bamboo: 1, bambooEar: 1, jar: 1, ...both(2, 9.5, 14), mOn: 0, ...ROLL(1) }],
  // bom! the first lid
  [80, { bamboo: 1, bambooEar: 1, jar: 1, crouch: 1.6, sqz: -0.16, sqx: 0.08, sqy: 0.08, vib: 1, ...JAR_PAWS(-1.6), mOn: 0, ...ROLL(-1) }],
  [84, { bamboo: 1, bambooEar: 1, jar: 1, roll: 0.1, ...JAR_PAWS(0), vib: 0.3, mOn: 0, ...ROLL(1) }],
  // bom! the second
  [86, { bamboo: 1, bambooEar: 1, jar: 1, crouch: 1.8, sqz: -0.18, sqx: 0.09, sqy: 0.09, vib: 1, ...JAR_PAWS(-1.8), mOn: 0, ...ROLL(-1) }],
  [90, { bamboo: 1, bambooEar: 1, jar: 1, roll: -0.16, ...both(4, 10, 12), vib: 0.3, mOn: 0, ...ROLL(1) }],
  [94, { bamboo: 1, bambooEar: 1, jar: 1, roll: 0.14, gait: 1, ...BLIND(0.5), mOn: 0, ...ROLL(-1) }],
  [100, { bamboo: 1, bambooEar: 1, jar: 1, roll: -0.12, gait: 1, ...BLIND(-0.5), mOn: 0, ...ROLL(1) }],
  [106, { bamboo: 1, bambooEar: 1, jar: 1, roll: 0.1, gait: 1, ...BLIND(0.5), mOn: 0, mPitch: 0, mMouth: 0.4, mSmile: 0.8, mBrowUp: 0.6 }],
  [112, { bamboo: 1, bambooEar: 1, jar: 1, roll: -0.08, gait: 1, ...BLIND(-0.4), mOn: 0, mRun: 1, mSmile: 0.6 }],
  // sits down; Шустрик grabs the jar
  [118, { bamboo: 1, bambooEar: 1, jar: 1, sit: 1, pitch: 0.5, sqz: -0.1, ...both(3, 9, 6), mOn: 0, mRun: 0, ...mBoth(3.2, 0.9, 1.8) }],
  [124, TUGK(0.6, 1)],
  [130, TUGK(1.6, -1)],
  [136, TUGK(1.2, 1)],
  [142, TUGK(2.4, -1)],
  [148, TUGK(2.0, 1)],
  [154, TUGK(3.2, -1)],
  [158, { ...TUGK(3.8, 1), vib: 0.6, mBrowIn: 0, mPop: 0.3 }],
  // POP: the jar flies off, he falls back on his bottom in honey up to the ears
  [160, { bamboo: 1, bambooEar: 1, honey: 0.8, sit: 1, pitch: -0.75, neck: 0, sqz: 0.18, sqx: -0.08, sqy: -0.08, legsUp: 0.5, air: 0.5, ...both(1, 10, 22), pop: 1, browUp: 1, mouth: 0.8, mOn: 0, mPop: 1, mBrowUp: 1, mPitch: -0.6, mLean: -1 }],
  [164, { bamboo: 1, bambooEar: 1, honey: 0.8, sit: 1, pitch: -0.2, sqz: -0.12, sqx: 0.06, sqy: 0.06, ...both(3, 9, 9), pop: 0.6, mouth: 0.5, mOn: 0, mPitch: -1, mFlour: 1 }],
  [168, { bamboo: 1, bambooEar: 1, honey: 0.8, sit: 1, ...both(3, 9, 9), lid: 0.4, smile: 0.4, mOn: 0, mFlour: 1 }],
  // licks the honey off his paw, delighted
  [174, { bamboo: 1, bambooEar: 1, honey: 0.8, sit: 1, ...hand('R', 6.4, 2.6, 15.5), ...hand('L', 3, -9, 9), tongueOut: 1, lid: 0.6, smile: 1, mOn: 0, mFlour: 1, mLid: 0.6 }],
  [180, { bamboo: 1, bambooEar: 1, honey: 0.8, sit: 1, ...hand('R', 6.2, 2.6, 16.5), ...hand('L', 3, -9, 9), tongueOut: 0.6, chew: 1, lid: 0.7, smile: 1, mOn: 0, mFlour: 1, mBlink: 1 }],
  [184, { bamboo: 1, bambooEar: 1, honey: 0.8, sit: 1, ...hand('R', 6.4, 2.6, 15.5), ...hand('L', 3, -9, 9), tongueOut: 1, lid: 0.6, smile: 1, mOn: 0, mFlour: 1, mLid: 0.5 }],
  [190, { bamboo: 1, bambooEar: 1, honey: 0.9, sit: 1, ...hand('L', 6.4, -2.6, 15.5), ...hand('R', 3, 9, 9), tongueOut: 1, lid: 0.6, smile: 1, mOn: 0, mFlour: 1, mBlink: 1 }],
  [198, { bamboo: 1, bambooEar: 1, honey: 0.85, sit: 1, ...hand('L', 6.2, -2.6, 16.5), ...hand('R', 3, 9, 9), tongueOut: 0.6, chew: 1, lid: 0.7, smile: 1, mOn: 0, mFlour: 1, mBrowIn: 0.6 }],
  [206, { bamboo: 1, bambooEar: 1, honey: 0.8, sit: 1, ...both(3, 9, 9), lid: 0.5, smile: 1, mOn: 0, mFlour: 1, mBrowIn: 0.8 }],
  // licks the honey off his nose: tongue up, cross-eyed
  [214, { bamboo: 1, bambooEar: 1, honey: 0.7, sit: 1, ...both(3, 9, 9), tongueOut: 1, nod: -0.15, lookY: -1, lookX: 0, squint: 0.3, mOn: 0, mFlour: 1, mBrowIn: 0.8 }],
  [222, { bamboo: 1, bambooEar: 1, honey: 0.55, sit: 1, ...both(3, 9, 9), tongueOut: 1, nod: -0.2, lookY: -1, squint: 0.3, mOn: 0, mFlour: 1 }],
  [230, { bamboo: 1, bambooEar: 1, honey: 0.4, sit: 1, ...both(3, 9, 9), tongueOut: 0.8, nod: -0.1, lookY: -0.8, mOn: 0, mFlour: 1, mSquint: 0.6, mMouth: 0.4 }],
  // Шустрик sneezes a cloud of flour
  [236, { bamboo: 1, bambooEar: 1, honey: 0.3, sit: 1, ...both(3, 9, 9), smile: 0.8, mOn: 0, mFlour: 1, mSquint: 1, mMouth: 0.8, mPitch: -0.3, mBrowUp: 1 }],
  [240, { bamboo: 1, bambooEar: 1, honey: 0.25, sit: 1, ...both(3, 9, 9), smile: 0.8, pop: 0.3, mOn: 0, mFlour: 1, mSquint: 1, mMouth: 1, mPitch: 0.5, sqz: 0 }],
  [244, { bamboo: 1, bambooEar: 1, honey: 0.2, ...both(4, 7.5, 13), smile: 0.8, mOn: 0, mFlour: 1, mBlink: 1 }],
  // home; Шустрик shakes the flour off and hops up
  [248, { bamboo: 1, bambooEar: 0.5, honey: 0.12, gait: 1, smile: 0.8, toMouth: 1, mOn: 0, mFlour: 1, mTwist: 0.6 }],
  [250, { bamboo: 1, bambooEar: 0.4, honey: 0.08, gait: 1, smile: 0.8, toMouth: 1, mOn: 0, mFlour: 0, mTwist: -0.6, mJump: 1 }],
  [254, { ...REST, honey: 0.04, gait: 1, mOn: 0, mJump: 0, ...mBoth(1.6, 2, 1) }],
  [258, { ...REST, gait: 0, mOn: 0.2, ...mBoth(1.6, 2, 1) }],
  [264, { ...REST }],
];

// ---- the second form: «Рыцарь из кастрюль» ---------------------------------------------------------------------------
/** Шустрик's place in the second form: on the floor to the right, the stolen shoot raised like a rapier. */
const M_F2: [number, number] = [21, 8];
/** The knight at rest: spoon up, the lid shield in front, chest out; Шустрик en garde with the shoot and a steamer lid. */
const KNIGHT: JointPose = {
  ...F2,
  pitch: -0.05,
  gaze: 0.25,
  ...hand('R', 2.8, 9.8, 12.4),
  ...hand('L', 6.2, -5.4, 12.2),
  spoonFwd: -0.4,
  spoonOut: 0.45,
  mOn: 0,
  mStick: 1,
  mLid: 1,
  mStickFwd: 0.4,
  mBrowIn: 0.6,
  mSmirk: 0.5,
  ...mHand('R', 2.4, 1.8, 1.0),
  ...mHand('L', 2.2, -1.6, -0.4),
};
const idle_f2: Track = [
  [0, { ...KNIGHT }],
  // the helmet slides down over his eyes; he pushes it back up with the spoon hand
  [10, { ...KNIGHT, helmetSlide: 0.35, mGaze: 0.2 }],
  [18, { ...KNIGHT, helmetSlide: 0.75, lid: 0.4, browSad: 0.4, mSmirk: 1 }],
  [24, { ...KNIGHT, helmetSlide: 0.7, ...hand('R', 3.0, 5.2, 21.5), spoonDown: 0.6, mSmirk: 1, mStickFwd: 0.6 }],
  [30, { ...KNIGHT, helmetSlide: 0.05, ...hand('R', 2.6, 8.8, 21), spoonDown: 0.6, browIn: 0.8, mStickFwd: 0.4 }],
  [38, { ...KNIGHT, blink: 1 }],
  [41, { ...KNIGHT }],
  [48, { ...KNIGHT }],
];
const phaseM = pathLanes(
  [
    stay(0, 8, 0, 0, 0),
    // off the head with the shoot, onto the floor to the right
    { a: 9, b: 17, at: (u) => ({ x: M_F2[0] * Math.sin((u * Math.PI) / 2), y: M_F2[1] * Math.sin((u * Math.PI) / 2), z: 31 * (1 - u) + 12 * Math.sin(u * Math.PI), yaw: FACE.usLeft }) },
    stay(18, 120, M_F2[0], M_F2[1], FACE.left),
  ],
  true,
);
export const CUP_AT: [number, number] = [42, -41];
const phaseP = pathLanes([
  stay(0, 33, 0, 0, 0),
  // a flat-out dash on a wheel of legs to the dish cupboard
  run(35, 43, [0, 0], CUP_AT),
  stay(44, 72, CUP_AT[0], CUP_AT[1], FACE.us),
  // out of the clatter as a knight; marches home, every step a clank
  run(86, 104, CUP_AT, [0, 0]),
  stay(105, 120, 0, 0, 0),
]);
const phase: Track = [
  [0, { ...REST }],
  // the big bite is coming; Шустрик hangs down over his forehead…
  [4, { ...REST, chew: 0, toMouth: 1, mouth: 0.7, lid: 0.3, mPitch: 1.6, mLean: 1.2, ...mHand('R', 3.2, 1.0, -2.4), mSmirk: 1 }],
  // …and snatches the shoot right out of his mouth: he bites the air
  [7, { ...ON, mouth: 0, teeth: 1, pop: 0.5, ...hand('R', 7.0, 6.6, 15.2), mPitch: 0.4, mStick: 1, mStickFwd: 0.3, ...mHand('R', 1.8, 2.4, 3.6), mSmirk: 1, mSmile: 1 }],
  [9, { ...ON, pop: 0.8, lookY: -0.6, ...hand('R', 6.0, 6.6, 13.5), mStick: 1, mJump: 1.5, mSmirk: 1 }],
  [13, { pop: 0.6, lookY: -0.7, lookX: 0.3, ...hand('R', 6.0, 6.6, 13), mOn: 0, mStick: 1, mStickFwd: 0.2, ...mHand('R', 1.0, 1.8, 3.6), mTongue: 1, mSquint: 0.7 }],
  // Шустрик waves it, giggling; Пончик stares at his empty paw, then at him
  [18, { lookY: -0.8, ...hand('R', 6.0, 6.6, 13), mOn: 0, mStick: 1, mStickFwd: 0.3, ...mHand('R', 1.4, 2.2, 3.2), mTongue: 1, mSquint: 1, mSmile: 1 }],
  [22, { gaze: 0.35, lookX: 0.8, browIn: 0.4, ...both(4, 8, 11), heat: 0.25, mOn: 0, mStick: 1, mStickFwd: -0.2, ...mHand('R', 1.0, 2.4, 3.6), mTongue: 1, mSquint: 1, mSmile: 1 }],
  // red rising from the feet up, steam from the ears, the brows come down
  [27, { gaze: 0.35, lookX: 0.8, browIn: 0.9, mouth: 0.2, teeth: 1, crouch: 0.6, vib: 0.4, ...both(4, 8.4, 10), heat: 0.6, earBack: 0.5, mOn: 0, mStick: 1, mPop: 0.4, mBrowUp: 0.6 }],
  [32, { gaze: 0.35, lookX: 0.8, browIn: 1, mouth: 0.4, teeth: 1, crouch: 1, vib: 0.7, sqz: -0.06, ...both(3.5, 8.6, 9.5), heat: 1, earBack: 0.8, mOn: 0, mStick: 1, mPop: 0.8, mBrowUp: 1 }],
  // anticipation, then off on a wheel of legs
  [34, { gaze: -0.4, browIn: 1, teeth: 1, crouch: 1.6, lean: -1.4, pitch: -0.2, sqz: -0.1, heat: 1, ...both(-1, 9, 12), earBack: 1, mOn: 0, mStick: 1, mPop: 1 }],
  [36, { ...RUN, bambooEar: 0, teeth: 1, browIn: 1, heat: 1, mOn: 0, mStick: 1, mPop: 0.6 }],
  [42, { ...RUN, bambooEar: 0, teeth: 1, browIn: 1, heat: 1, mOn: 0, mStick: 1, mPop: 0.4 }],
  // into the cupboard: gone inside a cloud of clatter
  [44, { hidden: 1, mOn: 0, mStick: 1, mPop: 1, mBrowUp: 1, mGaze: 0.4 }],
  [58, { hidden: 1, mOn: 0, mStick: 1, mPop: 0.6, mBrowUp: 1, mGaze: 0.4, mNod: -0.2 }],
  [70, { hidden: 1, mOn: 0, mStick: 1, mPop: 0.6, mBrowUp: 1, mGaze: 0.4 }],
  // steps out a knight, visor down; the last pot drops onto his head — a helmet
  [72, { ...F2, visor: 1, helmetSlide: -9, ...both(4, 8, 11), browIn: 1, mOn: 0, mStick: 1, mPop: 1, mMouth: 0.5, mGaze: 0.4 }],
  [79, { ...F2, visor: 1, helmetSlide: -0.4, ...both(4, 8, 11), browIn: 1, mOn: 0, mStick: 1, mPop: 1, mMouth: 0.5, mGaze: 0.4 }],
  [80, { ...F2, visor: 1, helmetSlide: 0.3, crouch: 1.2, sqz: -0.14, sqx: 0.07, sqy: 0.07, vib: 1, ...both(4, 8.6, 10), browIn: 1, mOn: 0, mStick: 1, mPop: 0.8 }],
  [84, { ...F2, visor: 1, helmetSlide: 0, ...both(4, 8, 11), browIn: 1, mOn: 0, mStick: 1, mMouth: 0.8, mBrowUp: 1 }],
  // the march home, clank clank; Шустрик gulps, a rolling lid reaches his feet — he picks it up for a shield
  [88, { ...F2, visor: 1, gait: 1, pitch: -0.08, ...hand('R', 4.4, 7.4, 13.4), ...hand('L', 6.2, -5.4, 12.2), mOn: 0, mStick: 1, mMouth: 0.8, mPop: 0.5 }],
  [96, { ...F2, visor: 1, gait: 1, pitch: -0.08, ...hand('R', 4.4, 7.4, 13.4), ...hand('L', 6.2, -5.4, 12.2), mOn: 0, mStick: 1, mSit: 0.5, mPitch: 0.6, ...mHand('L', 2.4, -1.4, -3.4) }],
  [100, { ...F2, visor: 1, gait: 1, pitch: -0.08, ...hand('R', 4.4, 7.4, 13.4), ...hand('L', 6.2, -5.4, 12.2), mOn: 0, mStick: 1, mLid: 1, mSit: 0, mPitch: 0, ...mHand('L', 2.2, -1.6, -0.4), mMouth: 0.6 }],
  // home: up goes the visor with a clang, up goes the spoon; Шустрик raises the shoot en garde
  [106, { ...F2, visor: 1, ...hand('R', 2.6, 8.8, 21), spoonDown: 0.6, ...hand('L', 6.2, -5.4, 12.2), mOn: 0, mStick: 1, mLid: 1, mStickFwd: 0.4, mBrowIn: 0.3 }],
  [109, { ...F2, visor: 0, ...hand('R', 2.6, 8.8, 21), spoonDown: 0.6, ...hand('L', 6.2, -5.4, 12.2), browIn: 1, mOn: 0, mStick: 1, mLid: 1, mPop: 0.5 }],
  [113, { ...KNIGHT, ...hand('R', 4.0, 7.6, 15.5), spoonFwd: -0.2, pitch: -0.12, mPop: 0.3 }],
  [120, { ...KNIGHT }],
];

// happy (knight): clangs the spoon on the shield, spins round, the cape flying; Шустрик taps his lid along
const happy_f2: Track = [
  [0, { ...KNIGHT }],
  [5, { ...KNIGHT, ...hand('R', 2.6, 8.8, 21), spoonDown: 0.6, pitch: -0.12, smile: 0.6, mStickFwd: 0.9 }],
  [9, { ...KNIGHT, ...hand('R', 6.8, 2.0, 13), spoonFwd: 0.6, spoonDown: 1.1, crouch: 0.6, sqz: -0.06, vib: 0.8, smile: 1, mouth: 0.4, ...mHand('R', 2.6, 0.6, 0.4), mStickDown: 0.8, mSmile: 1 }],
  [13, { ...KNIGHT, ...hand('R', 2.6, 8.8, 21), spoonDown: 0.6, smile: 1, lid: 0.3, mStickFwd: 0.9 }],
  [16, { ...KNIGHT, ...hand('R', 6.8, 2.0, 13), spoonFwd: 0.6, spoonDown: 1.1, crouch: 0.6, sqz: -0.06, vib: 0.8, smile: 1, mouth: 0.6, ...mHand('R', 2.6, 0.6, 0.4), mStickDown: 0.8, mSmile: 1, mMouth: 0.6 }],
  // the spin: one whole turn on the spot, the cape out flat
  [20, { ...KNIGHT, lift: 1.4, air: 1, twist: 0.4, capeFly: 2, ...both(3, 10, 16), smile: 1, lid: 0.5, mJump: 1.5, mSmile: 1 }],
  [26, { ...KNIGHT, lift: 2.4, air: 1, twist: 3.3, capeFly: 3, ...both(2, 10.5, 17), smile: 1, lid: 0.5, mJump: 0, mTwist: 0.6 }],
  [32, { ...KNIGHT, lift: 1.2, air: 1, twist: 6.0, capeFly: 2.4, ...both(3, 10, 16), smile: 1, lid: 0.4, mTwist: -0.6 }],
  [35, { ...KNIGHT, twist: 6.28, crouch: 1.0, sqz: -0.1, sqx: 0.05, sqy: 0.05, capeFly: 1, smile: 1, mTwist: 0 }],
  [40, { ...KNIGHT, twist: 6.28, smile: 0.6, helmetSlide: 0.3 }],
  [48, { ...KNIGHT, twist: 6.28 }],
];

// ---- trick-f2 «Поединок» (12 s, 288 frames) ---------------------------------------------------------------------------
// A duel: spoon against the stolen shoot, clack, clack. Шустрик ducks under his arm and climbs onto the helmet; the
// knight swings at him — the spoon comes down on his own helmet: BONG, spiral eyes. Шустрик taps it again — bong. The
// knight sits down hard, his foot jolts the table, and the steamer lid lands on the bowing Шустрик. Back to en garde.
const KN_FACE = Math.atan2(M_F2[1], M_F2[0]) - 1.0;
const D_RET: [number, number] = [-11, -18];
const M_FRONT: [number, number] = [5, -8];
const M_BOW: [number, number] = [9, -7];
/** Where Шустрик taps the helmet from: beside the head, clear of it. */
const TAP: [number, number] = [-0.5, -14.5];
const duelP = pathLanes([
  stay(0, 21, 0, 0, KN_FACE),
  run(22, 40, [0, 0], [7, 3], true, KN_FACE),
  run(42, 58, [7, 3], [12, 5], true, KN_FACE),
  // overreaches on the thrust and stumbles
  run(59, 64, [12, 5], [15, 6], false, KN_FACE),
  // Шустрик presses him back, step by step, toward the table
  run(66, 90, [15, 6], [0, -8], true, KN_FACE),
  run(91, 110, [0, -8], D_RET, true, KN_FACE),
  stay(111, 245, D_RET[0], D_RET[1], KN_FACE),
  run(246, 270, D_RET, [0, 0], true),
  stay(271, 288, 0, 0, 0),
]);
const duelM = pathLanes(
  [
    stay(0, 21, M_F2[0], M_F2[1], FACE.left),
    run(22, 40, M_F2, [26, 10], false, FACE.left),
    run(42, 56, [26, 10], [30, 9], false, FACE.left),
    // the dodge: a hop to the side, the thrust goes past
    { a: 57, b: 62, at: (u) => ({ x: 30 + 3 * u, y: 9 - 6 * u, z: 6 * Math.sin(u * Math.PI), yaw: FACE.left }) },
    run(66, 90, [35, 4], [20, 0], false, FACE.left),
    run(91, 110, [20, 0], [10, -8], false, FACE.left),
    stay(111, 117, 10, -8, FACE.left),
    // under his arm and round behind him, then up his back onto the helmet
    run(118, 127, [10, -8], [-16, -24], true),
    { a: 128, b: 136, at: (u) => ({ x: -16 + 4.4 * u, y: -24 + 5.2 * u, z: 36 * Math.sin((u * Math.PI) / 2), yaw: FACE.us }) },
    stay(137, 145, -11.6, -18.8, FACE.us, 36),
    // hops off just as the spoon comes down
    { a: 146, b: 152, at: (u) => ({ x: -11.6 + (M_FRONT[0] + 11.6) * u, y: -18.8 + (M_FRONT[1] + 18.8) * u, z: 36 * (1 - u) + 8 * Math.sin(u * Math.PI), yaw: FACE.us }) },
    stay(153, 169, M_FRONT[0], M_FRONT[1], FACE.usLeft),
    // up again to tap the helmet with the shoot — bong — and down in front to bow
    { a: 170, b: 178, at: (u) => ({ x: M_FRONT[0] + (TAP[0] - M_FRONT[0]) * u, y: M_FRONT[1] + (TAP[1] - M_FRONT[1]) * u, z: 26 * Math.sin((u * Math.PI) / 2), yaw: FACE.left }) },
    { a: 179, b: 186, at: (u) => ({ x: TAP[0] + (M_BOW[0] - TAP[0]) * u, y: TAP[1] + (M_BOW[1] - TAP[1]) * u, z: 26 * (1 - u) + 6 * Math.sin(u * Math.PI), yaw: FACE.us }) },
    stay(187, 235, M_BOW[0], M_BOW[1], FACE.us),
    run(236, 262, M_BOW, M_F2),
    stay(263, 288, M_F2[0], M_F2[1], FACE.left),
  ],
  true,
);
const KV: JointPose = { ...KNIGHT, visor: 1 };
const CHOP_UP = (p: JointPose = {}): JointPose => ({ ...KV, ...hand('R', -0.5, 10, 20.5), spoonFwd: -0.9, pitch: -0.12, browIn: 1, ...p });
const CHOP_DN = (p: JointPose = {}): JointPose => ({ ...KV, ...hand('R', 7.6, 4.2, 12), spoonFwd: 0.8, spoonDown: 1.3, pitch: 0.12, crouch: 0.8, browIn: 1, ...p });
const PARRY = (p: JointPose = {}): JointPose => ({ mStickFwd: 0.2, mStickDown: -0.6, ...mHand('R', 2.4, 1.6, 2.6), mBrowIn: 1, ...p });
const LUNGE = (p: JointPose = {}): JointPose => ({ mLean: 0.9, mStickFwd: 1.1, mStickDown: 0.15, ...mHand('R', 3.0, 1.0, 1.2), mBrowIn: 1, mSmirk: 1, ...p });
const trick_f2: Track = [
  [0, { ...KNIGHT }],
  // visor down, salute; Шустрик salutes back with the shoot
  [8, { ...KV, ...hand('R', 2.6, 8.8, 21), spoonDown: 0.6, mStickFwd: -0.2, ...mHand('R', 2.0, 1.6, 3.8) }],
  [16, { ...KV, browIn: 1, ...PARRY() }],
  // chop — clack — chop — clack
  [24, CHOP_UP({ gait: 1, ...PARRY() })],
  [28, CHOP_DN({ gait: 1, ...PARRY({ mSit: 0.4 }) })],
  [32, CHOP_UP({ gait: 1, ...PARRY() })],
  [36, CHOP_DN({ gait: 1, ...PARRY({ mSit: 0.4 }) })],
  [42, CHOP_UP({ gait: 1, ...PARRY() })],
  [46, CHOP_DN({ gait: 1, ...PARRY({ mSit: 0.5 }) })],
  [52, { ...KV, gait: 1, ...hand('R', 2, 7.5, 15), spoonFwd: -0.4, pitch: -0.1, browIn: 1, ...PARRY() }],
  // the thrust — Шустрик hops aside — the knight overreaches and stumbles
  [57, { ...KV, ...hand('R', 8.2, 4.2, 15), spoonFwd: 1.6, spoonDown: 0.7, pitch: 0.3, lean: 1.4, browIn: 1, mJump: 1, mPop: 0.4 }],
  [61, { ...KV, ...hand('R', 8.2, 4.2, 14), spoonFwd: 1.6, spoonDown: 0.8, pitch: 0.45, lean: 2.2, ...foot('R', 4.6, 4.4, 1.5), pop: 0.6, mJump: 0, mSmirk: 1 }],
  [65, { ...KV, ...hand('R', 4, 8, 13), pitch: 0.1, roll: 0.1, browUp: 0.6, ...LUNGE() }],
  // Шустрик attacks: lunge after lunge, the knight backs away fending him off with the shield
  [72, { ...KV, gait: 1, ...hand('L', 6.4, -4.0, 13), shieldTurn: 0.3, pitch: -0.1, browSad: 0.5, ...LUNGE() }],
  [78, { ...KV, gait: 1, ...hand('L', 7.0, -4.4, 12.4), shieldTurn: 0.1, pitch: -0.1, ...PARRY() }],
  [84, { ...KV, gait: 1, ...hand('L', 6.4, -4.0, 13), shieldTurn: 0.3, pitch: -0.1, vib: 0.3, ...LUNGE() }],
  [90, { ...KV, gait: 1, ...hand('L', 7.0, -4.4, 12.4), pitch: -0.1, ...PARRY() }],
  [96, { ...KV, gait: 1, ...hand('L', 6.4, -4.0, 13), shieldTurn: 0.3, pitch: -0.1, vib: 0.3, ...LUNGE() }],
  [104, { ...KV, gait: 1, ...hand('L', 7.0, -4.4, 12.4), pitch: -0.1, ...PARRY() }],
  [110, { ...KV, ...hand('L', 6.4, -4.0, 13), shieldTurn: 0.3, browIn: 1, ...LUNGE({ mLean: 0.6 }) }],
  // Шустрик ducks under his arm and is gone: where is he? left… right…
  [118, { ...KV, ...hand('R', 2, 9.5, 18), spoonFwd: -0.4, mRun: 1, mSmirk: 1 }],
  [126, { ...KV, gaze: 0.6, lookX: 0.9, browUp: 0.6, mRun: 1 }],
  [132, { ...KV, gaze: -0.6, lookX: -0.9, browUp: 0.6, mRun: 0, ...mBoth(2.2, 1.6, 2.4) }],
  [138, { ...KV, gaze: 0.5, lookX: 0.8, browIn: 0.6, mStickFwd: 0.6, ...mHand('R', 1.6, 2.2, 3.4), mSmirk: 1, mTongue: 1 }],
  // he looks up — there you are! — and swings
  [142, { ...KV, nod: -0.4, lookY: 1, browIn: 1, ...hand('R', 6, 5, 12), spoonDown: 0.6, mSmirk: 1, mTongue: 1 }],
  [146, { ...KV, nod: -0.35, lookY: 1, browIn: 1, ...hand('R', 1.6, 6, 22.4), spoonFwd: -0.4, spoonDown: -0.3, mJump: 1.5 }],
  // BONG: the spoon on his own helmet
  [150, { ...KV, nod: 0.1, helmetSlide: 0.85, ...hand('R', 2.2, 4.4, 22.6), spoonFwd: -0.3, spoonDown: -0.4, crouch: 1.6, sqz: -0.16, sqx: 0.08, sqy: 0.08, vib: 1, dizzy: 1, mJump: 0, mPop: 0.6 }],
  [156, { ...KV, helmetSlide: 0.85, ...both(4, 9.5, 12), crouch: 0.6, vib: 0.8, dizzy: 1, wavy: 1, tongueOut: 0.6, mMouth: 1, mSquint: 1, mSmile: 1 }],
  [164, { ...KV, helmetSlide: 0.85, ...both(4, 9.5, 12), roll: 0.12, vib: 0.4, dizzy: 1, wavy: 1, tongueOut: 0.8, mMouth: 1, mSquint: 1, mSmile: 1 }],
  [170, { ...KV, helmetSlide: 0.85, ...both(4, 9.5, 12), roll: -0.12, dizzy: 1, wavy: 1, tongueOut: 0.6, mJump: 1, mSmirk: 1 }],
  // the second bong: Шустрик taps the helmet with the shoot
  [176, { ...KV, helmetSlide: 0.85, ...both(4, 9.5, 12), roll: 0.08, dizzy: 1, wavy: 1, mJump: 0, mStickFwd: 0.4, mStickDown: -0.4, ...mHand('R', 2.4, 1.6, 3.4) }],
  [178, { ...KV, helmetSlide: 0.9, ...both(4, 9.5, 12), crouch: 1.2, sqz: -0.1, vib: 1, dizzy: 1, wavy: 1, mStickFwd: 0.8, mStickDown: 0.3, ...mHand('R', 2.8, 1.6, 2.4), mSmirk: 1 }],
  // sits down hard; his foot jolts the table
  [184, { ...KV, helmetSlide: 0.9, sit: 0.6, ...both(4, 10, 10), vib: 0.6, dizzy: 1, wavy: 1, mSmirk: 1 }],
  [190, { ...KV, helmetSlide: 0.9, sit: 1, sqz: -0.12, sqx: 0.06, sqy: 0.06, ...both(4, 10, 6), ...foot('R', 7.4, 4.6, 1.6), vib: 0.4, dizzy: 1, wavy: 1, mSmile: 0.6 }],
  [194, { ...KV, helmetSlide: 0.9, sit: 1, ...both(4, 10, 6), dizzy: 1, wavy: 1, tongueOut: 0.6 }],
  // Шустрик bows to us… and the lid comes down on his head
  [200, { ...KV, helmetSlide: 0.9, sit: 1, ...both(4, 10, 6), dizzy: 1, wavy: 1, tongueOut: 0.6, mPitch: 0.4, mStickFwd: -1, ...mHand('R', 0.4, 2.6, -1), mSmile: 1, mLid: 1 }],
  [204, { ...KV, helmetSlide: 0.9, sit: 1, ...both(4, 10, 6), dizzy: 1, wavy: 1, mPitch: 0.9, mStickFwd: -1, ...mHand('R', 0.2, 2.6, -1.2), mLid: 1, mSmile: 1 }],
  [206, { ...KV, helmetSlide: 0.9, sit: 1, ...both(4, 10, 6), dizzy: 1, wavy: 1, mPitch: 0.6, mSit: 0.8, mPop: 1, mDizzy: 1, ...mBoth(1.6, 2.6, 1.4) }],
  [212, { ...KV, helmetSlide: 0.9, sit: 1, ...both(4, 10, 6), dizzy: 0.5, mPitch: 0, mSit: 0.6, mDizzy: 1, ...mBoth(1.6, 2.6, 0.4) }],
  [222, { ...KV, helmetSlide: 0.9, sit: 1, ...both(4, 10, 6), lid: 0.5, mSit: 0.4, mDizzy: 1, mRoll: 0.2 }],
  // both come round: he pushes the helmet up, stands; Шустрик shakes his head
  [230, { ...KV, helmetSlide: 0.2, sit: 1, ...hand('R', 2.4, 9.6, 17), spoonDown: 0.6, ...hand('L', 6.2, -5.4, 8), browIn: 0.6, mSit: 0, mDizzy: 0, mTwist: 0.5 }],
  [236, { ...KV, sit: 0.5, ...both(4, 9, 12), browIn: 0.8, mTwist: -0.5, mRun: 1 }],
  [242, { ...KV, sit: 0, crouch: 0.6, browIn: 0.8, mTwist: 0, mRun: 1 }],
  [250, { ...KV, gait: 1, browIn: 0.8, mRun: 1 }],
  [262, { ...KV, gait: 1, browIn: 0.8, mRun: 0 }],
  [270, { ...KNIGHT, gait: 0, visor: 0.4, ...PARRY({ mBrowIn: 0.6 }) }],
  [276, { ...KNIGHT }],
  [288, { ...KNIGHT }],
];

export const tracks: Record<string, Track> = {
  idle,
  walk,
  look,
  fidget_a,
  fidget_b,
  happy,
  sleep_in,
  sleep,
  sleep_out,
  wake_startled,
  hatch,
  peek,
  trick,
  trick_b,
  trick_c,
  phase,
  'idle-f2': idle_f2,
  'happy-f2': happy_f2,
  'trick-f2': trick_f2,
};
export const lanes: Record<string, Record<string, Lane>> = {
  trick: { ...trickPanda, ...trickMonkey, rugX: lane([0, 0], [190, 0], [194, -9], [248, -9], [258, 0]) },
  trick_b: { ...trickBPanda, ...trickBMonkey },
  trick_c: { ...trickCPanda, ...trickCMonkey },
  phase: { ...phaseP, ...phaseM },
  'idle-f2': pathLanes([stay(0, 48, M_F2[0], M_F2[1], FACE.left)], true),
  'happy-f2': pathLanes([stay(0, 48, M_F2[0], M_F2[1], FACE.left)], true),
  'trick-f2': { ...duelP, ...duelM },
};

export const gesture = keyframer({ tracks, lanes, switches: SWITCHES, linear: LINEAR });
