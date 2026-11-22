// Pose book of Пончик и Шустрик. Times are frames at 24 fps. Hand and foot goals are (forward, right, up) in Пончик's
// feet frame; Шустрик's spot (`mX/mY/mZ`) is in the same frame, `mOn` 1 seats him on Пончик's head. Squash and stretch
// of Пончик alone: `sqx/sqy/sqz` (offsets from 1, world axes about his feet). Screen lanes dx / dy are output pixels of
// the 384×312 painting. The effect timelines in bun_panda-fx.ts read the beats exported here.
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
  'trick-f2': { seconds: 11 },
  'trick_b-f2': { seconds: 11 },
  'trick_c-f2': { seconds: 11 },
  show: { seconds: 7 },
  peek: { seconds: 3 },
  hatch: { seconds: 3 },
  sleep: { seconds: 3, loop: true },
  sleep_in: { seconds: 1.5 },
  sleep_out: { seconds: 1.5 },
  wake_startled: { seconds: 1.2 },
  // key-pose sheet for the owner (not shipped): one pose every 12 frames
  keys: { seconds: 3 },
};
export const hand = (name: 'L' | 'R', x: number, y: number, z: number) => reach('hand' + name, [x, y, z]);
export const mHand = (name: 'L' | 'R', x: number, y: number, z: number) => reach('mHand' + name, [x, y, z]);
/** Шустрик on Пончик's head (the default of the everyday clips). */
export const ON: JointPose = { mOn: 1 };
/** Пончик holds the bamboo stalk in his near paw and chews. */
export const CHEW: JointPose = { bamboo: 1, ...hand('R', 7.0, 6.6, 15.2), chew: 1 };
/** The knight from the pots. */
export const F2: JointPose = { form: 1, visor: 0, browIn: 0.6 };
export const f2 = (p: JointPose): JointPose => ({ ...F2, ...p });
/** Keys that switch at the key instead of fading. */
export const SWITCHES = new Set(['hidden', 'mHidden', 'blink', 'mBlink', 'noShadow', 'bamboo', 'bun', 'bunL', 'chew', 'mFlour', 'form', 'dizzy', 'mDizzy']);
/** Lane keys that run linearly (positions in flight, spins). */
export const LINEAR = new Set(['dx', 'dy', 'twist', 'gaitT', 'mGait']);

export const beats = {
  keys: {},
};

export const tracks: Record<string, Track> = {
  idle: [
    [0, { ...ON, ...CHEW, mHandR: 0 }],
    [18, { ...ON, ...CHEW, gaze: 0.06, earFlap: 0.15, mGaze: -0.5, mLookX: -0.8 }],
    [36, { ...ON, ...CHEW, nod: 0.04, mGaze: 0.4, mLookX: 0.8, mSmile: 0.6 }],
    [50, { ...ON, ...CHEW, blink: 1, nod: 0.03 }],
    [54, { ...ON, ...CHEW, tilt: 0.04 }],
    [72, { ...ON, ...CHEW }],
  ],
  keys: [
    // 1. at rest: chewing bamboo, Шустрик on his head
    [0, { ...ON, ...CHEW, mSmile: 0.6, mLookX: 0.5 }],
    [11, { ...ON, ...CHEW, mSmile: 0.6, mLookX: 0.5 }],
    // 2. startled: eyes pop, brows up, mouth open, ears flap; Шустрик laughs
    [12, { ...ON, jump: 3, pop: 0.55, browUp: 1, mouth: 0.9, teeth: 1, earFlap: 1, sqz: 0.2, sqx: -0.08, sqy: -0.08, ...hand('R', 4, 9.5, 24), ...hand('L', 4, -9.5, 24), mMouth: 1, mSquint: 0.6, mBrowUp: 1, lookY: 0.3 }],
    [23, { ...ON, jump: 3, pop: 0.55, browUp: 1, mouth: 0.9, teeth: 1, earFlap: 1, sqz: 0.2, sqx: -0.08, sqy: -0.08, ...hand('R', 4, 9.5, 24), ...hand('L', 4, -9.5, 24), mMouth: 1, mSquint: 0.6, mBrowUp: 1, lookY: 0.3 }],
    // 3. bonked and dizzy: spiral eyes, wavy mouth, head on one side; Шустрик points and giggles
    [24, { dizzy: 1, wavy: 1, tilt: 0.25, gaze: -0.15, sit: 0.4, browSad: 0.6, ...hand('R', 5, 9, 6), ...hand('L', 5, -9, 6), mOn: 0, mX: 9.8, mY: -8.5, mYaw: 1.45, mMouth: 1, mSquint: 0.5, ...mHand('R', 3.2, 1.5, 2), ...mHand('L', 1.2, -2.2, -0.6) }],
    [35, { dizzy: 1, wavy: 1, tilt: 0.25, gaze: -0.15, sit: 0.4, browSad: 0.6, ...hand('R', 5, 9, 6), ...hand('L', 5, -9, 6), mOn: 0, mX: 9.8, mY: -8.5, mYaw: 1.45, mMouth: 1, mSquint: 0.5, ...mHand('R', 3.2, 1.5, 2), ...mHand('L', 1.2, -2.2, -0.6) }],
    // 4. flattened like a pancake (a rolling pin fell on him); eyes blink up from the pancake
    [36, { sqz: -0.48, sqx: 0.28, sqy: 0.28, lid: 0.25, browSad: 1, wavy: 0.6, earFlap: 0.6, ...hand('R', 3.4, 8.6, 6), ...hand('L', 3.4, -8.6, 6), mOn: 0, mX: 0.5, mY: -0.5, mZ: 16.6, mYaw: 0.6, mMouth: 1, mSquint: 0.7, ...mHand('R', 0.6, 2.6, -1.4), ...mHand('L', 0.6, -2.6, -1.4) }],
    [47, { sqz: -0.48, sqx: 0.28, sqy: 0.28, lid: 0.25, browSad: 1, wavy: 0.6, earFlap: 0.6, ...hand('R', 3.4, 8.6, 6), ...hand('L', 3.4, -8.6, 6), mOn: 0, mX: 0.5, mY: -0.5, mZ: 16.6, mYaw: 0.6, mMouth: 1, mSquint: 0.7, ...mHand('R', 0.6, 2.6, -1.4), ...mHand('L', 0.6, -2.6, -1.4) }],
    // 5. the knight from the pots: spoon up, lid shield, visor up, brave brows; Шустрик with a chopstick
    [48, f2({ visor: 0.1, ...hand('R', 3.5, 9.2, 22), ...hand('L', 6.5, -6.5, 12), spoonFwd: -0.2, smile: 0.5, mOn: 0, mX: 9.8, mY: -8.5, mYaw: 1.3, mBrowIn: 1, ...mHand('R', 2.6, 2.4, 3.8) })],
    [59, f2({ visor: 0.1, ...hand('R', 3.5, 9.2, 22), ...hand('L', 6.5, -6.5, 12), spoonFwd: -0.2, smile: 0.5, mOn: 0, mX: 9.8, mY: -8.5, mYaw: 1.3, mBrowIn: 1, ...mHand('R', 2.6, 2.4, 3.8) })],
    // 6. the bun falls into his mouth: wide open, eyes shut in bliss; Шустрик stunned on the floor, eyes spinning
    [60, { mouth: 1, wide: 1, lid: 1, browUp: 0.6, lean: -1.2, pitch: -0.18, nod: -0.35, ...hand('R', 3, 8.5, 18), ...hand('L', 3, -8.5, 18), mOn: 0, mX: 8, mY: -10, mYaw: 0.4, mSit: 1, mDizzy: 1, mMouth: 0.5, mTilt: 0.3 }],
    [72, { mouth: 1, wide: 1, lid: 1, browUp: 0.6, lean: -1.2, pitch: -0.18, nod: -0.35, ...hand('R', 3, 8.5, 18), ...hand('L', 3, -8.5, 18), mOn: 0, mX: 8, mY: -10, mYaw: 0.4, mSit: 1, mDizzy: 1, mMouth: 0.5, mTilt: 0.3 }],
  ],
};
export const lanes: Record<string, Record<string, Lane>> = {};

export const asleep: JointPose = { sit: 1, lid: 1, blink: 1, ...ON };
export const gesture = keyframer({ tracks, lanes, switches: SWITCHES, linear: LINEAR, fixed: { sleep: asleep } });
