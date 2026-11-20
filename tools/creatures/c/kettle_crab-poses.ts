// Pose book of Котёл. Times are frames at 24 fps. Claw and foot goals are rig units in the crab's floor frame
// (forward, right, up). Each key may name the easing INTO it: 'io' smoothstep (default), 'o' fast start / soft stop
// (snaps, throws), 'i' slow start / hard stop (falls, impacts), 'b' fast with a small overshoot (springy arrivals),
// 'l' linear, 's' step (holds, then jumps at the key). Fast moves take 1–4 frames, holds 6–10.
import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';
import { SWITCHES } from './kettle_crab-skin';

export const clips: Record<string, { seconds: number; loop?: boolean }> = {
  ...everyday,
  idle: { seconds: 3, loop: true },
  look: { seconds: 1.5 },
  fidget_a: { seconds: 2 },
  fidget_b: { seconds: 2 },
  happy: { seconds: 1.75 },
  trick: { seconds: 5 },
  trick_b: { seconds: 4.5 },
  hatch: { seconds: 2 },
  sleep: { seconds: 3, loop: true },
  sleep_in: { seconds: 1.25 },
  sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
};
const TAU = Math.PI * 2;
type Ease = 'io' | 'o' | 'i' | 'b' | 'l' | 's';
type Key = [number, JointPose] | [number, JointPose, Ease];
type Track = Key[];

/** Claw goal in the floor frame. */
export const claw = (name: 'L' | 'R', f: number, r: number, u: number) => reach('claw' + name, [f, r, u]);
const R = (f: number, r: number, u: number, open = 0) => ({ ...claw('R', f, r, u), clawROpen: open });
const L = (f: number, r: number, u: number, open = 0) => ({ ...claw('L', f, r, u), clawLOpen: open });
/** Painted size relative to natural (the skin reads sx / sy as offsets from 1). */
const size = (x: number, y = x) => ({ sx: x - 1, sy: y - 1 });

/** Effect beats shared with the painter of effects. */
export const beats = {
  // Steam rocket: spits water on the sun-hot helmet, steam, hides, rattles, launches through the top rail, falls back.
  trick: { spit: 6, splash: 14, hide: 26, rattle: 30, launch: 52, gone: 58, fall: 72, land: 80, out: 90, tada: 104 },
  // Bubbles: blows a stream of bubbles, pops them one by one, a big one swallows it and lifts it, pop, fall, flip.
  trick_b: { blow: 4, pop1: 22, pop2: 30, pop3: 38, pop4: 46, big: 54, lift: 66, poke: 84, fall: 86, land: 94 },
  fidget_a: { huff: 8, wipe: 14, shine: 36 },
  fidget_b: { knock1: 10, knock2: 18, knock3: 26, puff: 30 },
  hatch: { shake: 4, eyes: 14, claw: 22, burst: 30 },
  happy: { spin: 10, land: 26 },
};

/** Circles of the big claw over a point (forward, right, up): `turns` loops of `period` frames from `start`. */
function wipe(start: number, turns: number, period: number, [f, r, u]: [number, number, number], extra: JointPose): Key[] {
  const keys: Key[] = [];
  for (let i = 1; i <= turns * 4; i++) {
    const a = (i / 4) * TAU;
    keys.push([start + (i * period) / 4, { ...extra, ...R(f, r + Math.cos(a) * 2.2, u + Math.sin(a) * 1.8, 0.1) }, 'l']);
  }
  return keys;
}
/** One knock of the big claw on the dome: wind up, strike, ring. */
function knock(at: number, hard: number): Key[] {
  const aim = { clawRYaw: 2.1, clawRPitch: -0.5, eyeR: -0.4, eyeL: -0.7, stalk: -2.5, lid: 0.35 };
  return [
    [at - 3, { ...aim, ...R(16, 10.5, 37, 0.25), lean: -0.6 }, 'o'],
    [at - 1, { ...aim, ...R(16.5, 11, 38.5, 0.3), lean: -0.8, lid: 0.55 }],
    [at, { ...aim, ...R(8, 6, 31.5, 0), rattle: 1.2 * hard, valve: 0.9 * hard, blink: 1, lean: -0.2 }, 'i'],
    [at + 2, { ...aim, ...R(9.5, 7, 33, 0), rattle: 0.5 * hard, valve: 0.3, lean: -0.3 }, 'o'],
  ];
}
const claws = (open: number) => ({ ...R(17, 9.5, 21, open), ...L(17, -11, 19, open), clawRPitch: -0.45, clawLPitch: -0.3 });

export const tracks: Record<string, Track> = {
  // Alive at rest: the eyes look about each on its own, a double claw snap, antennae flick, a foot taps.
  idle: [
    [0, {}],
    [6, { eyeL: 0.5, eyeR: -0.1 }, 'b'],
    [12, { eyeL: 0.5, eyeR: -0.1 }],
    [14, { eyeL: 0.5, eyeR: 0.6, clawROpen: 0.7 }, 'b'],
    [20, { eyeL: 0.45, eyeR: 0.55, clawROpen: 0.75, antennaWhip: 0.8 }],
    [21, { eyeL: 0.45, eyeR: 0.55, clawROpen: 0, sway: -0.6 }, 'o'],
    [24, { eyeL: 0.4, eyeR: 0.5, clawROpen: 0.6 }, 'o'],
    [25, { eyeL: 0.4, eyeR: 0.5, clawROpen: 0, sway: -0.4 }, 'o'],
    [34, { eyeL: -0.3, eyeR: -0.4, tapR0: 1 }, 'b'],
    [37, { eyeL: -0.3, eyeR: -0.4 }, 'o'],
    [40, { eyeL: -0.3, eyeR: -0.4, tapR0: 1 }, 'o'],
    [43, { eyeL: -0.3, eyeR: -0.4 }, 'o'],
    [52, { eyeL: -0.35, eyeR: -0.45, lean: 0.6, lookUp: 0.3, stalk: 1.5 }],
    [58, { eyeL: 0.1, eyeR: 0.2 }, 'b'],
    [72, {}],
  ],
  // Periscope: the stalks shoot up, the eyes split to opposite sides, both whip round behind, snap back to the owner.
  look: [
    [0, {}],
    [3, { stalk: 4.5, lean: 0.8, antennaUp: 0.6, lookAway: 0.4 }, 'b'],
    [7, { stalk: 4.5, lean: 0.8, eyeL: -1.2, eyeR: 1.2, lookAway: 1, antennaUp: 0.6 }, 'b'],
    [13, { stalk: 4.7, lean: 0.8, eyeL: -1.3, eyeR: 1.3, lookAway: 1, antennaUp: 0.6 }],
    [15, { stalk: 5.5, lean: 0.3, eyeL: 1.5, eyeR: 1.9, lookL: 1.1, lookR: 1.1, lookAway: 1, sway: -1, antennaWhip: 1 }, 'o'],
    [21, { stalk: 5.6, lean: 0.3, eyeL: 1.6, eyeR: 2.0, lookL: 1.2, lookR: 1.2, lookAway: 1, sway: -1 }],
    [23, { stalk: 3, eyeL: 0.1, eyeR: -0.1, lookUp: 0.15 }, 'b'],
    [25, { stalk: 3, blink: 1 }],
    [27, { stalk: 3 }],
    [30, { stalk: 0 }, 'b'],
    [36, {}],
  ],
  // Huffs on the front glass and wipes it with the big claw in quick circles until it shines.
  fidget_a: [
    [0, {}],
    [4, { lean: -1.2, pitch: -0.12, eyePitch: -0.35, stalk: 1.5, helmetPitch: 0.25, mouth: 0.4, eyeR: 0.5 }, 'b'],
    [8, { lean: 0.6, pitch: 0.08, helmetPitch: 0.3, mouth: 1.5, eyePitch: -0.3, stalk: 1.5, eyeR: 0.5 }, 'o'],
    [10, { lean: 0.4, helmetPitch: 0.3, mouth: 0.2, eyePitch: -0.3, stalk: 1.5, eyeR: 0.5 }],
    [13, { helmetPitch: 0.3, eyePitch: 0.1, stalk: 0.5, eyeL: -0.7, eyeR: -0.35, clawRYaw: 1.5, clawRPitch: -0.2, ...R(10.5, 9.2, 22.5, 0.1) }, 'b'],
    ...wipe(13, 3, 7, [10.5, 7.2, 22], { helmetPitch: 0.3, eyePitch: 0.1, stalk: 0.5, eyeL: -0.7, eyeR: -0.35, clawRYaw: 1.5, clawRPitch: -0.2, sway: 0.4 }),
    [36, { stalk: 2.8, lookUp: 0.2, lean: 0.5, ...R(17, 9, 15, 0.8) }, 'o'],
    [38, { stalk: 2.8, lookUp: 0.2, lean: 0.5, clawROpen: 0 }, 'o'],
    [42, { stalk: 2, lean: 0.3 }],
    [48, {}],
  ],
  // Drums on its own helmet with the big claw: three knocks, the dome rings, the valve answers with a puff.
  fidget_b: [
    [0, {}],
    ...knock(10, 1),
    ...knock(18, 1),
    ...knock(26, 1.4),
    [30, { valve: 1.8, stalk: 3, lookUp: 0.4, lean: 0.4, ...R(17, 9, 16, 0.6) }, 'o'],
    [33, { valve: 0.4, stalk: 3, lookUp: 0.4, lean: 0.4, clawROpen: 0 }, 'o'],
    [40, { stalk: 2, lean: 0.2 }],
    [48, {}],
  ],
  // A fast shimmy with clicking claws, a crouch, a leap with a full spin, a squashy landing, more clicks.
  happy: [
    [0, {}],
    [2, { sway: 2.5, stalk: 2, ...claws(0.9) }, 'o'],
    [4, { sway: -2.5, stalk: 2, ...claws(0) }, 'o'],
    [6, { sway: 2.5, stalk: 2, ...claws(0.9) }, 'o'],
    [8, { sway: 0, crouch: 3, stalk: 1, ...claws(0.5), ...size(1.08, 0.9) }, 'o'],
    [10, { lift: 13, yaw: Math.PI * 0.6, stalk: 3, ...claws(1), ...size(0.93, 1.1) }, 'o'],
    [17, { lift: 16, yaw: Math.PI * 1.4, stalk: 3, paddle: 1, ...claws(1) }, 'l'],
    [24, { lift: 3, yaw: TAU, stalk: 3.5, ...claws(1), ...size(0.96, 1.05) }, 'i'],
    [25, { lift: 0, yaw: 0, crouch: 2.5, stalk: 1.5, ...claws(0.6), ...size(1.12, 0.87) }, 'i'],
    [26, { crouch: 2.5, stalk: 1.5, ...claws(0.6), ...size(1.12, 0.87) }],
    [29, { crouch: -0.5, stalk: 2.5, ...claws(0.9), ...size(0.97, 1.04) }, 'b'],
    [31, { stalk: 2.5, ...claws(0) }, 'o'],
    [33, { stalk: 2.5, ...claws(0.9) }, 'o'],
    [35, { stalk: 2.5, ...claws(0) }, 'o'],
    [42, {}],
  ],
  // Buried helmet shakes, eyes pop out of the sand, the claw bursts up, then the whole crab jumps out and shakes off.
  hatch: [
    [0, { hide: 1, lift: -13, noShadow: 1 }],
    [3, { hide: 1, lift: -13, noShadow: 1 }],
    [4, { hide: 1, lift: -12.5, rattle: 1.2, valve: 0.8, noShadow: 1 }, 'o'],
    [8, { hide: 1, lift: -12.5, rattle: 0, noShadow: 1 }],
    [10, { hide: 1, lift: -11.5, rattle: 1, valve: 0.6, noShadow: 1 }, 'o'],
    [13, { hide: 1, lift: -11.5, noShadow: 1 }],
    [14, { hide: 0.62, lift: -10, stalk: 17, ...R(19, 12, 5, 0), noShadow: 1 }, 'b'],
    [16, { hide: 0.62, lift: -10, stalk: 17, ...R(19, 12, 5, 0), blink: 1, noShadow: 1 }],
    [18, { hide: 0.62, lift: -10, stalk: 17, ...R(19, 12, 5, 0), eyeL: 0.05, eyeR: 0.3, noShadow: 1 }, 'b'],
    [20, { hide: 0.62, lift: -10, stalk: 17, ...R(19, 12, 5, 0), eyeL: 0.9, eyeR: 1.3, noShadow: 1 }, 'b'],
    [22, { hide: 0.35, lift: -9, stalk: 9, ...R(18, 10, 14, 1), clawRPitch: -0.8, noShadow: 1 }, 'o'],
    [26, { hide: 0.35, lift: -9.5, stalk: 9, ...R(18, 10, 14.5, 0.2), clawRPitch: -0.8, noShadow: 1 }],
    [29, { hide: 0.2, lift: -10.5, stalk: 4, crouch: 1, noShadow: 1 }, 'i'],
    [30, { lift: 9, stalk: 3, ...claws(1), ...size(0.9, 1.15) }, 'o'],
    [34, { lift: 6, stalk: 3.5, paddle: 1, ...claws(1) }],
    [37, { lift: 0, crouch: 2, stalk: 1.5, ...claws(0.4), ...size(1.12, 0.88) }, 'i'],
    [39, { rattle: 1.4, sway: 1, stalk: 2 }, 'o'],
    [42, { rattle: 1.2, sway: -1, stalk: 2 }],
    [44, { rattle: 0, stalk: 2 }],
    [48, {}],
  ],
  // A yawn with both claws stretched, eyes droop, it snaps into the helmet and the closing eyes show in the glass.
  sleep_in: [
    [0, {}],
    [6, { ...claws(0.9), stalk: 3, lid: 0.5, mouth: 1.2, lean: -1, ...size(0.98, 1.03) }],
    [13, { ...claws(0.5), stalk: 2, lid: 0.7, mouth: 0, sway: 0.5 }],
    [18, { hide: 0.35, lid: 0.85 }],
    [21, { hide: 1, ...size(1.06, 0.94) }, 'i'],
    [22, { hide: 1, peekPort: 1 }, 'b'],
    [24, { hide: 1, peekPort: 1, eyes: -0.4 }],
    [26, { hide: 1, peekPort: 1, eyes: 0 }],
    [27, { hide: 1, peekPort: 1, blink: 1 }],
    [29, { hide: 1, peekPort: 1, blink: 1 }],
  ],
  // Asleep inside: the helmet rises and falls, the valve lid bobs with each breath.
  sleep: [
    [0, { blink: 1 }],
    [36, { blink: 1, helmetUp: 0.5, valve: 0.5 }],
    [72, { blink: 1 }],
  ],
  // Eyes open behind the glass, look around, it pops out and stretches.
  sleep_out: [
    [0, { hide: 1, peekPort: 1, blink: 1 }],
    [4, { hide: 1, peekPort: 1 }],
    [6, { hide: 1, peekPort: 1, blink: 1 }],
    [7, { hide: 1, peekPort: 1 }],
    [9, { hide: 1, peekPort: 1, eyes: -0.7 }, 'b'],
    [12, { hide: 1, peekPort: 1, eyes: 0.7 }, 'b'],
    [14, { hide: 1, peekPort: 1, eyes: 0 }],
    [16, { stalk: 2, ...size(0.95, 1.06) }, 'b'],
    [21, { ...claws(0.9), stalk: 3, mouth: 1.2, lean: -0.8 }],
    [26, { stalk: 1, mouth: 0 }],
    [30, {}],
  ],
  // Shocked awake: bursts out with eyes on full stalks, lands, snaps back in, peeks from the glass, comes out.
  wake_startled: [
    [0, { hide: 1, peekPort: 1, blink: 1 }],
    [2, { lift: 7, stalk: 5, ...claws(1), ...size(0.9, 1.14) }, 'o'],
    [5, { lift: 6, stalk: 5.5, ...claws(1) }],
    [7, { hide: 0.2, crouch: 1.5, ...size(1.1, 0.9) }, 'i'],
    [9, { hide: 1, peekPort: 1 }, 'i'],
    [11, { hide: 1, peekPort: 1, eyes: -0.9 }, 'b'],
    [13, { hide: 1, peekPort: 1, eyes: 0.9 }, 'b'],
    [15, { hide: 1, peekPort: 1, eyes: 0, ...R(19, 11, 12, 0.3) }],
    [17, { hide: 0.6, stalk: 1, ...R(19, 11, 12, 0.3) }],
    [19, { stalk: 1.5 }, 'b'],
    [24, {}],
  ],
  // Steam rocket: spits water on the sun-hot helmet, steam and a whistle, hides, rattles, blasts off through the top
  // rail, falls back spinning, lands, comes out dizzy, shakes it off, claw up.
  trick: [
    [0, {}],
    [3, { lookUp: 0.6, eyePitch: -0.15, stalk: 2, lean: -0.5 }, 'b'],
    [5, { lookUp: 1, eyePitch: -0.35, stalk: 2.5, crouch: 1.5, pitch: 0.08, lean: 0.8, mouth: 0.8, ...size(1.04, 0.96) }],
    [6, { lookUp: 1, eyePitch: -0.45, stalk: 2.5, lean: -1.6, pitch: -0.25, mouth: 2, ...claws(0.5), ...size(0.97, 1.04) }, 'o'],
    [11, { lookUp: 1, eyePitch: -0.45, stalk: 2.5, lean: -1.2, pitch: -0.18, mouth: 0.6, ...claws(0.3) }],
    [14, { stalk: 4, lookUp: 0.3, rattle: 0.6, valve: 0.6, ...size(1.03, 0.97) }, 'o'],
    [17, { stalk: 4.5, rattle: 0.2, valve: 0.2 }],
    [20, { stalk: 4, rattle: 0.4, valve: 1 }],
    [22, { stalk: 4, valve: 0.2 }],
    [24, { stalk: 4, valve: 1, clawROpen: 0.8 }],
    [26, { hide: 1, valve: 0.3 }, 'i'],
    [30, { hide: 1, rattle: 0.8, valve: 0.6, jet: 0.12 }],
    [40, { hide: 1, rattle: 1.4, valve: 1.2, jet: 0.25, ...size(1.06, 0.94) }],
    [48, { hide: 1, rattle: 2, valve: 1.6, jet: 0.35, ...size(1.12, 0.86) }],
    [51, { hide: 1, rattle: 2.2, valve: 1.6, jet: 0.45, ...size(1.16, 0.82) }],
    [52, { hide: 1, overAll: 1, noShadow: 1, dy: -22, jet: 1, ...size(0.85, 1.3) }, 'o'],
    [55, { hide: 1, overAll: 1, noShadow: 1, dy: -100, jet: 1, ...size(0.82, 1.32) }, 'l'],
    [58, { hide: 1, overAll: 1, noShadow: 1, dy: -200, jet: 1, ...size(0.85, 1.3) }, 'l'],
    [59, { hidden: 1, hide: 1, dy: -200 }],
    [71, { hidden: 1, hide: 1, dy: -200 }],
    [72, { hide: 1, overAll: 1, noShadow: 1, dy: -140, rot: 0.4, ...size(0.95, 1.05) }, 'l'],
    [76, { hide: 1, overAll: 1, noShadow: 1, dy: -100, rot: 2.6, ...size(0.94, 1.06) }, 'i'],
    [79, { hide: 1, overAll: 1, noShadow: 1, dy: -9, rot: TAU, ...size(0.92, 1.08) }, 'i'],
    [80, { hide: 1, ...size(1.25, 0.76) }, 'i'],
    [84, { hide: 1, dy: -10, ...size(0.93, 1.09) }, 'o'],
    [88, { hide: 1, ...size(1.07, 0.94) }, 'i'],
    [90, { eyeSpin: 1, stalk: 2, sway: 0.8, ...size(0.97, 1.04) }, 'b'],
    [94, { eyeSpin: 1, stalk: 2, sway: -0.8, roll: 0.1 }],
    [98, { eyeSpin: 1, stalk: 2, sway: 0.6, roll: -0.08 }],
    [100, { rattle: 1.2, stalk: 2 }, 'o'],
    [103, { stalk: 2.5 }],
    [104, { ...R(16, 9, 25, 1), clawRPitch: -0.7, ...L(15, -8, 18, 0.8), clawLPitch: -0.3, lift: 3, stalk: 3, ...size(0.95, 1.06) }, 'b'],
    [110, { ...R(16, 9, 24.5, 1), clawRPitch: -0.7, ...L(15, -8, 17.5, 0.8), clawLPitch: -0.3, lift: 2, stalk: 3 }],
    [112, { ...R(16, 9, 24.5, 0), clawRPitch: -0.7, ...L(15, -8, 17.5, 0), clawLPitch: -0.3, lift: 2, stalk: 3 }, 'o'],
    [120, {}],
  ],
  // Bubbles: blows a stream, pops them with fast sideways scuttles and a jump, a big one swallows it and floats it up
  // over the frame, it pokes the bubble, falls with a flip and lands.
  trick_b: [
    [0, {}],
    [2, { mouth: 0.6, lean: 0.5, stalk: 1 }],
    [4, { mouth: 1.5, lean: 1, stalk: 1 }, 'o'],
    [6, { mouth: 0.4, lean: 0.8, stalk: 1 }],
    [8, { mouth: 1.5, lean: 1, stalk: 1 }, 'o'],
    [10, { mouth: 0.4, lean: 0.8, stalk: 1 }],
    [12, { mouth: 1.4, lean: 1, stalk: 1 }, 'o'],
    [14, { stalk: 1 }],
    [18, { eyes: -0.6, lookUp: 0.5, lookAway: 0.6, stalk: 2.5 }],
    [20, { dx: -6, crouch: 1, eyes: -0.8, lookUp: 0.6, lookAway: 0.8, stalk: 2.5 }],
    [22, { dx: -24, paddle: 1, lift: 2, eyes: -0.5, lookUp: 0.8, lookAway: 0.8, stalk: 3, ...R(16, 8, 26, 0.9), clawRPitch: -0.6, ...size(0.93, 1.07) }, 'o'],
    [23, { dx: -24, lift: 2, lookUp: 0.8, lookAway: 0.8, stalk: 3, ...R(16, 8, 26, 0), clawRPitch: -0.6 }, 'o'],
    [26, { dx: -22, eyes: 0.7, lookUp: 0.6, lookAway: 0.8, stalk: 2.5 }],
    [28, { dx: -15, crouch: 1, eyes: 0.8, lookAway: 0.8, stalk: 2.5 }],
    [30, { dx: 20, paddle: 1, lift: 2, eyes: 0.6, lookUp: 0.6, lookAway: 0.8, stalk: 3, ...L(17, -8, 23, 0.9), clawLPitch: -0.5, ...size(0.93, 1.07) }, 'o'],
    [31, { dx: 20, lift: 2, lookUp: 0.6, lookAway: 0.8, stalk: 3, ...L(17, -8, 23, 0), clawLPitch: -0.5 }, 'o'],
    [35, { dx: 17, crouch: 2.5, lookUp: 0.9, lookAway: 0.8, stalk: 2.5, ...size(1.08, 0.92) }],
    [38, { dx: 5, lift: 15, lookUp: 0.9, lookAway: 0.8, stalk: 3.5, paddle: 1, ...R(15, 8, 31, 0.9), clawRPitch: -0.8, ...size(0.92, 1.1) }, 'o'],
    [39, { dx: 4, lift: 15, lookUp: 0.9, lookAway: 0.8, stalk: 3.5, ...R(15, 8, 31, 0), clawRPitch: -0.8 }, 'o'],
    [43, { dx: 2, crouch: 2, stalk: 2, ...size(1.1, 0.9) }, 'i'],
    [46, { stalk: 2, eyePitch: 0.3, ...R(21, 9, 11, 0.9), clawRPitch: 0.4 }, 'o'],
    [47, { stalk: 2, eyePitch: 0.3, ...R(21, 9, 11, 0), clawRPitch: 0.4 }, 'o'],
    [51, { mouth: 0.8, lean: -0.4, stalk: 1.5 }],
    [54, { mouth: 1.8, lean: 1, stalk: 1.5, bubble: 0.25 }, 'o'],
    [58, { mouth: 1.6, lean: 0.8, stalk: 2, bubble: 0.65 }],
    [62, { stalk: 4, bubble: 1, ...claws(0.8) }, 'b'],
    [66, { stalk: 4, bubble: 1, overAll: 1, noShadow: 1, dy: -6, lift: 3, paddle: 1, ...claws(0.6) }],
    [72, { stalk: 3.5, bubble: 1, overAll: 1, noShadow: 1, dy: -30, dx: -4, lift: 3, paddle: 1, ...claws(0.6) }],
    [78, { stalk: 3.5, bubble: 1, overAll: 1, noShadow: 1, dy: -50, dx: 4, lift: 3, paddle: 1, ...claws(0.6) }],
    [82, { stalk: 3, bubble: 1, overAll: 1, noShadow: 1, dy: -55, lift: 3, ...R(17, 9, 28, 0.2), clawRPitch: -0.9 }],
    [84, { stalk: 5, overAll: 1, noShadow: 1, dy: -56, lift: 3, ...claws(1), ...size(1.05, 0.95) }, 'l'],
    [86, { stalk: 5.5, overAll: 1, noShadow: 1, dy: -52, lift: 3, ...claws(1), ...size(0.95, 1.06) }, 'o'],
    [93, { stalk: 4, overAll: 1, noShadow: 1, dy: -4, rot: TAU, ...claws(1), ...size(0.95, 1.06) }, 'i'],
    [94, { crouch: 2.5, stalk: 1.5, ...claws(0.5), ...size(1.2, 0.8) }, 'i'],
    [98, { dy: -5, stalk: 2.5, ...size(0.96, 1.05) }, 'o'],
    [101, { rattle: 1.2, stalk: 2 }, 'i'],
    [104, { stalk: 2 }],
    [108, {}],
  ],
};

export function gesture(anim: string, t: number): JointPose {
  const keys = tracks[anim];
  if (!keys) return anim === 'sleep' ? { blink: 1 } : {};
  const f = t * 24,
    i = keys.findIndex(([time]) => time >= f);
  if (i <= 0) return keys[i === 0 ? 0 : keys.length - 1][1];
  const [start, a] = keys[i - 1],
    [end, b, ease = 'io'] = keys[i];
  const x = (f - start) / (end - start);
  const u =
    ease === 'o'
      ? 1 - (1 - x) ** 3
      : ease === 'i'
        ? x ** 3
        : ease === 'b'
          ? 1 + 2.4 * (x - 1) ** 3 + 1.4 * (x - 1) ** 2
          : ease === 'l'
            ? x
            : ease === 's'
              ? 0
              : x * x * (3 - 2 * x);
  const pose: JointPose = {};
  for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (SWITCHES.has(name)) pose[name] = f >= end ? (b[name] ?? 0) : (a[name] ?? 0);
    else pose[name] = (a[name] ?? 0) * (1 - u) + (b[name] ?? 0) * u;
  }
  return pose;
}
export const helpers = { R, L, size };
