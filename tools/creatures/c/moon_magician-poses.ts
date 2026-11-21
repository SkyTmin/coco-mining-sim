// Pose book of Мурлен. Times are frames at 24 fps; goals are feet-relative (forward, right, up) rig units.
// The effect timelines in moon_magician-fx.ts read the beat constants exported here.
import { aim, reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';

export const clips: Record<string, { seconds: number; loop?: boolean }> = {
  ...everyday,
  look: { seconds: 1.5 },
  fidget_a: { seconds: 2 },
  fidget_b: { seconds: 2 },
  happy: { seconds: 2 },
  'happy-f2': { seconds: 2 },
  trick: { seconds: 5.5 },
  trick_b: { seconds: 6 },
  phase: { seconds: 2 },
  'idle-f2': { seconds: 1.5, loop: true },
  'trick-f2': { seconds: 5.5 },
  'trick_b-f2': { seconds: 6 },
  show: { seconds: 5.5 },
  peek: { seconds: 2.5 },
  hatch: { seconds: 2 },
  sleep: { seconds: 3.5, loop: true },
  sleep_in: { seconds: 1.25 },
  sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
};
const left = (x: number, y: number, z: number) => reach('handL', [x, y, z]);
const right = (x: number, y: number, z: number) => reach('handR', [x, y, z]);
const wandAt = (x: number, y: number, z: number) => aim('wandTip', [x, y, z]);
const foot = (name: 'L' | 'R', x: number, y: number, z: number) => reach('foot' + name, [x, y, z]);
type Track = [number, JointPose][];
const F2 = { form: 1, hatLift: 6 };
const f2 = (p: JointPose): JointPose => ({ ...F2, ...p });
const asleep = { sleep: 1, blink: 1, nod: 0.32, ear: -0.22, hatTilt: 0.5, tailUp: -0.3 };

/** Effect beats shared with the painter of effects. */
export const beats = {
  trick: { tap1: 38, tap2: 46, pullStart: 54, pullEnd: 80, burst: 84, flyEnd: 110, landHat: 118, popDove: 124 },
  trick_b: { fanStart: 10, fanEnd: 26, springStart: 30, springEnd: 50, throwUp: 58, cardLand: 70, growEnd: 84, hopIn: 92, flipStart: 100, flipEnd: 114, hopOut: 120, cardBack: 128, caught: 136 },
  'trick-f2': { liftStart: 16, ringIn: 26, ringOut: 98, deck: 108, land: 118 },
  'trick_b-f2': { wrap: 16, spinEnd: 40, vanish: 50, wobble: 70, emergeStart: 84, emergeEnd: 100, hatUp: 104 },
  show: { hatDrop: 0, hatLand: 20, stallStart: 30, stallEnd: 58, burst: 60, emergeEnd: 72, hatUp: 78, hatOn: 86 },
  phase: { flash: 20 },
  hatch: { puff: 4, appear: 16 },
};

export const tracks: Record<string, Track> = {
  idle: [[0, {}], [14, { nod: -0.07, ear: 0.08, shaftYaw: 0.1 }], [33, { pitch: 0.06, squat: 1.2, roll: 0.05, tailSway: 0.3, shaftYaw: -0.12 }],
    [47, { gaze: 0.16, ear: -0.12 }], [60, { blink: 1 }], [65, { ear: 0.09 }], [71, {}]],
  look: [[0, {}], [7, { ear: -0.3, nod: 0.12 }], [14, { gaze: -0.7, nod: -0.18, twist: -0.12, ...left(14, -7, 55) }],
    [24, { gaze: 0.62, ear: -0.1, twist: 0.2, ...left(14, -6, 56) }], [36, {}]],
  // Twirls the wand end over end between the fingers and catches a spark on the tip.
  fidget_a: [[0, {}], [6, { ...right(12, 12, 44), gaze: 0.2, ear: 0.15 }], [14, { ...right(12, 12, 46), shaftPitch: 2.2, nod: 0.12 }],
    [22, { ...right(12, 12, 47), shaftPitch: 4.4, smile: 0.4 }], [30, { ...right(12, 12, 46), shaftPitch: 6.28, gaze: 0.3, smile: 0.6 }],
    [38, { ...right(10, 12, 42), shaftPitch: 6.28, ear: 0.2 }], [48, { shaftPitch: 6.28 }]],
  // A card appears between the gloved fingers, flips, and vanishes again.
  fidget_b: [[0, {}], [6, { ...left(12, -8, 44), gaze: -0.25 }], [12, { ...left(13, -7, 50), gaze: -0.35, nod: 0.15, palmL: 0.4 }],
    [24, { ...left(13, -7, 51), gaze: -0.32, nod: 0.18, palmL: 0.8, smile: 0.4 }], [34, { ...left(13, -7, 50), gaze: -0.3, palmL: 0.2, smile: 0.7 }],
    [40, { ...left(10, -9, 44), ear: 0.2 }], [48, {}]],
  happy: [[0, {}], [3, { squat: 6, smile: 1, ear: 0.4, tailUp: 0.4 }],
    [8, { jump: 16, tuck: 0.45, twist: 0.6, ...right(8, 14, 74), shaftPitch: 1.6, tailUp: 0.7, smile: 1, ear: 0.6, mouth: 0.6 }],
    [12, { squat: 4, ...left(2, -7, 76), hatTilt: 0.3, smile: 1, tailUp: 0.5 }],
    [18, { jump: 6, hatLift: 4, ...left(2, -7, 84), ...right(9, 14, 66), shaftPitch: 3.2, smile: 1, ear: 0.4 }],
    [24, { squat: 3, smile: 1, tailWag: 1 }], [30, { twist: 0.25, tailWag: 1, smile: 1, ...right(10, 16, 56) }],
    [38, { twist: -0.2, smile: 0.8, ...right(10, 18, 62), shaftPitch: 0.6 }], [48, {}]],
  'happy-f2': [[0, f2({})], [4, f2({ ...left(12, -6, 50), ...right(12, 6, 52), squat: 2, smile: 1 })],
    [7, f2({ ...left(13, -3, 46), ...right(13, 3, 46), squat: 3, smile: 1, ear: 0.4 })],
    [12, f2({ ...left(6, -18, 66), ...right(6, 20, 68), smile: 1, tailUp: 0.6 })],
    [17, f2({ jump: 10, hatLift: 14, hatSpin: 3.14, ...left(6, -18, 76), ...right(6, 20, 78), smile: 1 })],
    [24, f2({ squat: 4, hatLift: 9, hatSpin: 6.28, smile: 1 })],
    [29, f2({ ...left(12, -6, 50), ...right(12, 6, 52), hatSpin: 6.28, smile: 1 })],
    [32, f2({ ...left(13, -3, 46), ...right(13, 3, 46), hatSpin: 6.28, squat: 2, smile: 1 })],
    [40, f2({ twist: 0.3, hatSpin: 6.28, ...right(10, 18, 60), smile: 0.8, tailWag: 1 })], [48, f2({ hatSpin: 6.28 })]],
  // Doves from the top hat.
  trick: [[0, {}], [6, { ...left(4, -8, 70), squat: 2, ear: 0.2 }], [12, { ...left(2, -6, 80), gaze: -0.1 }],
    [20, { ...left(16, -6, 46), hatInHand: 1, hatTipToward: 0.35, smile: 0.4, gaze: -0.15, ear: 0.3 }],
    [30, { ...left(16, -6, 47), hatInHand: 1, hatTipToward: 0.35, smile: 0.5, nod: 0.1 }],
    [36, { ...left(16, -6, 46), hatInHand: 1, hatTipToward: 0.3, ...right(13, 4, 58), ...wandAt(17, -5, 47), smile: 0.5 }],
    [40, { ...left(16, -6, 46), hatInHand: 1, hatTipToward: 0.3, ...right(11, 9, 64), ...wandAt(13, 6, 82) }],
    [44, { ...left(16, -6, 46), hatInHand: 1, hatTipToward: 0.2, ...right(13, 4, 58), ...wandAt(17, -5, 47), nod: 0.15 }],
    [50, { ...left(16, -6, 44), hatInHand: 1, squat: 3, ...right(15, -2, 52), ...wandAt(16, -6, 44), nod: 0.25, ear: 0.4 }],
    [62, { ...left(16, -6, 44), hatInHand: 1, ...right(12, 10, 70), smile: 0.8, ear: 0.4, tailUp: 0.3 }],
    [74, { ...left(16, -6, 44), hatInHand: 1, ...right(8, 18, 86), smile: 1, ear: 0.5, tailUp: 0.5, nod: -0.25 }],
    [82, { ...left(16, -6, 44), hatInHand: 1, ...right(10, 24, 92), twist: 0.2, smile: 1, nod: -0.3, mouth: 0.6 }],
    [92, { ...left(16, -6, 44), hatInHand: 1, ...right(9, 15, 46), gaze: -0.5, nod: -0.35, smile: 1 }],
    [104, { ...left(16, -6, 44), hatInHand: 1, ...right(9, 15, 44), gaze: 0.6, nod: -0.2, smile: 1, twist: 0.12 }],
    [112, { ...left(16, -6, 46), hatInHand: 1, hatTipToward: 0.3, ...right(10, 14, 44), nod: 0.2, smile: 0.8 }],
    [118, { ...left(14, -6, 42), hatInHand: 1, squat: 3, smile: 0.8 }],
    [121, { ...left(2, -6, 80), hatInHand: 0, smile: 1 }],
    [125, { pitch: 0.32, nod: 0.3, ...right(15, 12, 36), smile: 1 }], [130, {}], [132, {}]],
  // The card door: fan, spring, a card grows into a door, he hops through it and back.
  trick_b: [[0, {}], [6, { ...left(14, -6, 44), ...right(14, 4, 44), wandHidden: 1, gaze: -0.1 }],
    [18, { ...left(15, -8, 46), ...right(14, 2, 44), wandHidden: 1, smile: 0.4, nod: 0.15 }],
    [30, { ...left(14, -13, 44), ...right(14, 13, 50), wandHidden: 1, smile: 0.7, nod: 0.05 }],
    [40, { ...left(14, -13, 44), ...right(14, 13, 52), wandHidden: 1, gaze: 0.3, smile: 0.8 }],
    [52, { ...left(14, -3, 45), ...right(14, 1, 46), wandHidden: 1, squat: 2 }],
    [58, { ...left(13, -6, 44), ...right(12, 13, 70), wandHidden: 1, nod: -0.3, ear: 0.3 }],
    [70, { ...left(12, -8, 42), ...right(10, 12, 50), wandHidden: 1, gaze: 0.5, nod: -0.05 }],
    [80, { ...left(8, -18, 58), ...right(8, 20, 60), wandHidden: 1, smile: 1, ear: 0.4, gaze: 0.4 }],
    [86, { squat: 6, wandHidden: 1, gaze: 0.6, pitch: 0.15 }],
    [92, { jump: 14, tuck: 0.3, shiftX: 14, wandHidden: 1, gaze: 0.5, tailUp: 0.5 }],
    [98, { squat: 3, shiftX: 28, wandHidden: 1 }],
    [100, { shiftX: 28, shrink: 1, wandHidden: 1 }], [114, { shiftX: 28, shrink: 1, wandHidden: 1 }],
    [116, { shiftX: 24, squat: 3, wandHidden: 1, smile: 1 }],
    [120, { jump: 12, tuck: 0.3, shiftX: 12, wandHidden: 1, smile: 1, gaze: -0.3 }],
    [126, { squat: 5, wandHidden: 1, smile: 1 }],
    [134, { ...left(14, -8, 46), wandHidden: 1, smile: 1, ear: 0.3 }],
    [136, { ...left(14, -8, 46), ...right(14, 14, 50), smile: 1 }],
    [140, { pitch: 0.25, nod: 0.25, smile: 1 }], [144, {}]],
  phase: [[0, {}], [5, { squat: 3, capeWrap: 0.3, ear: -0.3, nod: 0.15 }],
    [11, { jump: 6, twist: 0.5, cape: 0.6, ...left(8, -10, 54), ...right(8, 12, 56), ear: 0.2 }],
    [19, { jump: 9, twist: 1.0, form: 0.49, cape: 1, ...left(6, -20, 62), ...right(6, 22, 66), mouth: 0.5 }],
    [21, { jump: 9, twist: 1.1, form: 1, cape: 1, ...left(6, -20, 62), ...right(6, 22, 66), mouth: 0.5, hatLift: 2 }],
    [29, { squat: 4, form: 1, cape: 0.8, hatLift: 6, ...left(6, -20, 56), ...right(6, 22, 60), smile: 1 }],
    [38, { form: 1, hatLift: 6, cape: 0.4, smile: 0.6 }], [48, f2({})]],
  'idle-f2': [[0, f2({})], [9, f2({ hatLift: 7, nod: -0.05, cape: 0.2, tailSway: 0.3 })], [18, f2({ hatLift: 6.5, pitch: 0.05, squat: 1, shaftYaw: 0.15 })],
    [27, f2({ hatLift: 7.2, gaze: 0.15, ear: 0.1, cape: 0.25 })], [30, f2({ blink: 1, hatLift: 7 })], [36, f2({})]],
  // Levitation: rises cross-legged, a ring of cards orbits him, the hat spins, he settles with the deck.
  'trick-f2': [[0, f2({})], [8, f2({ squat: 4, ...left(6, -16, 32), ...right(6, 18, 34), cape: 0.3, ear: -0.2 })],
    [16, f2({ jump: 6, crossLegs: 0.5, ...left(5, -17, 44), ...right(5, 19, 46), cape: 0.5 })],
    [30, f2({ jump: 17, crossLegs: 1, ...left(4, -18, 84), ...right(4, 20, 86), cape: 0.8, smile: 0.6, palmL: -0.6, palmR: -0.6, hatLift: 8 })],
    [50, f2({ jump: 20, crossLegs: 1, twist: 0.35, ...left(5, -17, 86), ...right(5, 19, 88), cape: 1, smile: 0.8, hatLift: 9, hatSpin: 9 })],
    [70, f2({ jump: 18, crossLegs: 1, twist: -0.3, ...left(5, -17, 82), ...right(5, 19, 84), cape: 0.9, smile: 1, hatLift: 8, hatSpin: 18 })],
    [90, f2({ jump: 20, crossLegs: 1, twist: 0.1, ...left(7, -14, 84), ...right(7, 16, 86), cape: 1, smile: 1, hatLift: 9, hatSpin: 27 })],
    [100, f2({ jump: 19, crossLegs: 1, ...left(12, -6, 72), ...right(10, 10, 76), cape: 0.8, hatLift: 8, hatSpin: 31.4, nod: 0.15 })],
    [108, f2({ jump: 11, crossLegs: 0.6, ...left(12, -6, 58), cape: 0.6, hatLift: 7, hatSpin: 31.4, nod: 0.2 })],
    [118, f2({ squat: 6, ...left(12, -6, 44), cape: 0.4, hatSpin: 31.4, ear: 0.3 })],
    [124, f2({ ...left(14, -10, 50), ...right(10, 16, 56), smile: 1, hatSpin: 31.4 })],
    [128, f2({ pitch: 0.25, nod: 0.2, hatSpin: 31.4, smile: 1 })], [132, f2({ hatSpin: 31.4 })]],
  // Disappears in a twist of the cape and climbs out of the hat on the floor.
  'trick_b-f2': [[0, f2({})], [8, f2({ capeWrap: 0.5, ...left(9, 6, 46), ...right(9, -6, 48), wandHidden: 1, ear: -0.2 })],
    [16, f2({ capeWrap: 1, squat: 3, ...left(8, 5, 48), ...right(8, -5, 50), wandHidden: 1, ear: -0.4, blink: 0.6 })],
    [28, f2({ capeWrap: 1, jump: 4, twist: 3.14, ...left(8, 5, 52), ...right(8, -5, 54), wandHidden: 1, ear: -0.4 })],
    [40, f2({ capeWrap: 1, jump: 2, twist: 6.28, ...left(8, 5, 50), ...right(8, -5, 52), wandHidden: 1, ear: -0.4 })],
    [50, f2({ capeWrap: 1, twist: 6.28, shrink: 1, hatOff: 1, wandHidden: 1, flash: 1 })],
    [84, f2({ capeWrap: 1, twist: 6.28, shrink: 1, hatOff: 1, wandHidden: 1 })],
    [100, f2({ capeWrap: 0.3, twist: 6.28, hatOff: 1, wandHidden: 1, ...left(6, -16, 60), ...right(6, 18, 62), smile: 1 })],
    [104, f2({ twist: 6.28, hatOff: 1, wandHidden: 1, ...left(6, -18, 66), ...right(6, 20, 68), smile: 1 })],
    [110, f2({ twist: 6.28, ...left(6, -20, 64), ...right(6, 22, 70), smile: 1, ear: 0.3 })],
    [124, f2({ twist: 6.28, ...left(6, -16, 56), ...right(8, 20, 62), smile: 1 })],
    [134, f2({ twist: 6.28, pitch: 0.32, nod: 0.3, smile: 1, ...right(14, 12, 38) })], [144, f2({ twist: 6.28 })]],
  // Appearance: a top hat drops onto the stage, stalls, bursts, and the cat springs out of it.
  show: [[0, { shrink: 1, hatOff: 1, wandHidden: 1 }], [60, { shrink: 1, hatOff: 1, wandHidden: 1, flash: 1 }],
    [66, { shrink: 0.4, hatOff: 1, wandHidden: 1, jump: 10, tuck: 0.4 }],
    [72, { hatOff: 1, wandHidden: 1, jump: 20, tuck: 0.2, ...left(6, -16, 70), ...right(6, 18, 72), smile: 1, tailUp: 0.6 }],
    [80, { hatOff: 1, squat: 6, ...left(6, -18, 56), ...right(6, 20, 58), smile: 1 }],
    [86, { ...left(6, -20, 62), ...right(8, 22, 68), smile: 1, ear: 0.4 }],
    [98, { ...left(6, -20, 62), ...right(8, 22, 70), smile: 1, gaze: 0.2 }],
    [108, { pitch: 0.38, nod: 0.3, ...right(12, 10, 40), ...left(9, -10, 34), smile: 1 }],
    [132, { pitch: 0.38, nod: 0.3, ...right(12, 10, 40), ...left(9, -10, 34), smile: 1 }]],
  // Peeks up from under the bottom rail and lifts the top hat over it.
  peek: [[0, {}], [6, { squat: 4, ear: 0.3, gaze: 0.2 }], [14, { peekDrop: 1, squat: 2 }],
    [20, { peekDrop: 0.55, ...left(14, -6, 78), gaze: 0.1, smile: 0.6, ear: 0.3 }],
    [26, { peekDrop: 0.5, ...left(6, -16, 100), hatInHand: 1, hatTipToward: 0.3, smile: 1, ear: 0.4 }],
    [36, { peekDrop: 0.5, ...left(6, -16, 102), hatInHand: 1, hatTipToward: 0.25, smile: 1, blink: 1, nod: 0.15 }],
    [42, { peekDrop: 0.55, ...left(14, -6, 78), hatInHand: 0, smile: 0.8 }],
    [60, {}]],
  hatch: [[0, { shrink: 1, hatOff: 1 }], [14, { shrink: 1, hatOff: 1 }], [20, { shrink: 0.2, squat: 6 }],
    [26, { jump: 8, ...left(6, -18, 64), ...right(6, 20, 66), smile: 1, ear: 0.4 }],
    [32, { squat: 4, ...left(6, -18, 58), ...right(6, 20, 62), smile: 1 }],
    [40, { pitch: 0.3, nod: 0.25, ...right(12, 10, 40), smile: 1 }], [48, {}]],
  sleep_in: [[0, {}], [7, { nod: -0.3, ear: 0.1, blink: 0.6, hatTilt: 0.2 }], [15, { sleep: 0.47, ear: -0.18, nod: 0.16, hatTilt: 0.35 }],
    [24, { ...asleep, blink: 0.85 }], [29, asleep]],
  sleep_out: [[0, asleep], [8, { sleep: 0.8, nod: 0.24, ear: 0.14, hatTilt: 0.4 }], [17, { sleep: 0.35, nod: -0.32, ear: 0.4, ...left(7, -9, 74), hatTilt: 0.1 }],
    [24, { nod: -0.22, ear: 0.27 }], [29, {}]],
  wake_startled: [[0, asleep], [4, { sleep: 0.68, ear: 0.4, nod: -0.2, hatTilt: 0.3 }],
    [9, { jump: 8, tuck: 0.36, ear: 0.62, nod: -0.3, roll: -0.14, hatLift: 9, hatSpin: 1.5, mouth: 0.8 }],
    [14, { squat: 6, ...foot('L', 13, -12, 0), twist: 0.4, gaze: 0.7, ear: 0.2, hatLift: 2, hatSpin: 3.14 }], [20, { gaze: -0.36, hatSpin: 3.14 }], [23, { hatSpin: 6.28 }]],
};

export function gesture(anim: string, t: number): JointPose {
  if (anim === 'sleep') return asleep;
  const keys = tracks[anim];
  if (!keys) return {};
  const f = t * 24,
    i = keys.findIndex(([time]) => time >= f);
  if (i <= 0) return keys[i === 0 ? 0 : keys.length - 1][1];
  const [start, a] = keys[i - 1],
    [end, b] = keys[i];
  let u = (f - start) / (end - start);
  u = u * u * (3 - 2 * u);
  const pose: JointPose = {};
  for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
    // Switches (hidden wand, removed hat) flip at the key instead of fading.
    if (name === 'wandHidden' || name === 'hatOff') pose[name] = f >= end ? (b[name] ?? 0) : (a[name] ?? 0);
    else pose[name] = (a[name] ?? 0) * (1 - u) + (b[name] ?? 0) * u;
  }
  return pose;
}
