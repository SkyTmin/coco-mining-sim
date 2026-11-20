// Pose book of Астрал. Times are frames at 24 fps. Hand goals are written relative to the resting pelvis
// (forward, right, up) and lifted with the body; prop positions (rock, star, sparks) are feet-relative rig units.
// The effect timelines in astral_seer-fx.ts read the beat constants exported here.
import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';

/** Height of the pelvis above the grass at rest, rig units. */
export const HOVER = 22;

export const clips: Record<string, { seconds: number; loop?: boolean }> = {
  ...everyday,
  look: { seconds: 1.5 },
  fidget_a: { seconds: 2 },
  fidget_b: { seconds: 2 },
  happy: { seconds: 2 },
  'happy-f2': { seconds: 2 },
  trick: { seconds: 5.5 },
  trick_b: { seconds: 5 },
  phase: { seconds: 2.5 },
  'idle-f2': { seconds: 1.5, loop: true },
  'trick-f2': { seconds: 5.5 },
  'trick_b-f2': { seconds: 5 },
  show: { seconds: 5 },
  peek: { seconds: 2.5 },
  hatch: { seconds: 2 },
  sleep: { seconds: 3.5, loop: true },
  sleep_in: { seconds: 1.25 },
  sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
};
type Track = [number, JointPose][];
export const hand = (name: 'L' | 'R', x: number, y: number, z: number) => reach('hand' + name, [x, y, z]);
/** Hand goals relative to the resting pelvis; `lift` follows the body when it rises. */
const L = (x: number, y: number, z: number, lift = 0) => hand('L', x, y, HOVER + z + lift);
const R = (x: number, y: number, z: number, lift = 0) => hand('R', x, y, HOVER + z + lift);
/** Palms pressed together in front of the chest: the seer's mudra. */
const mudra = (lift = 0) => ({ ...L(11, -2.4, 14, lift), ...R(11, 0.4, 14, lift) });
/** Painted size relative to natural (the skin reads sx / sy as offsets from 1). */
const size = (x: number, y = x) => ({ sx: x - 1, sy: y - 1 });
const asleep = { sleep: 1, blink: 1, earL: 0.4, earR: 0.4 };
/** The awakened form: crystal eyes and glowing runes, the gem opened, the torc as a halo, six crystals, two lights. */
const F2 = { form: 1, halo: 1, gemOpen: 1, split: 1, lightL: 1, lightR: 1, hover: 3 };
const f2 = (p: JointPose): JointPose => ({ ...F2, ...p });
/** Keys that switch at the key instead of fading. */
const SWITCHES = new Set(['hidden', 'overAll', 'peekFront', 'blink', 'crystalsHidden', 'gemOpen', 'rock', 'rockCrystal', 'rockOver', 'starOver', 'noShadow']);

/** Effect beats shared with the painter of effects. */
export const beats = {
  // Stone into a star: the ground trembles, the rock bursts out, is squeezed, sheds its shell, is flicked into the sky
  // and is born there as a new star; then the seer heals the hole.
  trick: { tremble: 8, burst: 24, squeeze: 44, shatter: 57, flick: 77, gone: 86, starBorn: 96, healStart: 100, healEnd: 118 },
  // Teleport: implode, far away and small, implode, right at the glass, implode, drop home.
  trick_b: { out1: 11, in1: 17, out2: 42, in2: 48, tap1: 58, tap2: 62, out3: 78, in3: 86, land: 89 },
  phase: { glyphs: 6, open: 22, wave: 26 },
  // Star storm: starlight pulled in, the galaxy spins, the light is pressed into a ball and thrown at the viewer.
  'trick-f2': { pullStart: 12, pullEnd: 60, press: 72, throw: 84, burst: 94, end: 112 },
  // Double: a ghost steps out, the two circle faster and faster and merge.
  'trick_b-f2': { split: 12, orbitStart: 36, merge: 84 },
  // Show: a rift tears open in the air, the seer unfolds out of it, the rift seals.
  show: { tear: 4, open: 30, emerge: 36, sealStart: 56, sealEnd: 72 },
  'happy-f2': { clap: 9 },
  fidget_a: { toss: 14, catch: 30 },
  hatch: { crack: 10, burst: 18 },
};

/** The double's orbit: both bodies circle the middle faster and faster while the circle shrinks. */
function doubleOrbit(): Track {
  const keys: Track = [];
  const { orbitStart, merge } = beats['trick_b-f2'];
  for (let f = orbitStart; f <= merge; f += 2) {
    const k = (f - orbitStart) / (merge - orbitStart),
      a = 4 * Math.PI * k * k,
      radius = 32 * (1 - Math.pow(k, 1.6));
    const x = radius * Math.cos(a),
      y = 0.32 * radius * Math.sin(a);
    keys.push([f, f2({ dx: x, dy: y, ghostX: -2 * x, ghostY: -2 * y, ghostA: 0.62, ...L(6, -15, 18), ...R(6, 13, 18), smile: 0.8, earL: -0.2, earR: -0.2, orbitR: 4 * (1 - k), tilt: 0.1 * Math.sin(a) })]);
  }
  return keys;
}

export const tracks: Record<string, Track> = {
  idle: [[0, {}], [18, { nod: -0.05, earL: 0.1 }], [36, { gaze: -0.12, tailSway: 0.2 }], [54, { earR: 0.15, tilt: 0.05 }], [72, {}]],
  // Turns in the air to look round, ears first, the whole body following the gaze.
  look: [[0, {}], [5, { earL: -0.3, earR: -0.3 }], [12, { gaze: -0.7, yaw: -0.25, nod: -0.12, earL: -0.35 }], [16, { gaze: -0.75, yaw: -0.28, nod: -0.14, blink: 1 }],
    [18, { gaze: -0.75, yaw: -0.28, nod: -0.14 }], [26, { gaze: 0.55, yaw: 0.2, tilt: 0.08, earR: -0.3 }], [36, {}]],
  // Tosses the light from the right palm over its head into the left palm.
  fidget_a: [[0, {}], [8, { ...R(9, 9, 6), lightR: 1, gaze: 0.1, nod: 0.1 }], [12, { ...R(8, 8, 10), lightR: 1, squat: 1 }],
    [14, { ...R(7, 7, 18), lightR: 0, nod: -0.25, gaze: -0.1 }], [22, { ...R(8, 8, 6), ...L(9, -9, 8), nod: -0.35, gaze: -0.35, earL: -0.2, earR: -0.2 }],
    [30, { ...L(9, -10, 6), lightL: 1, nod: 0.1, gaze: -0.3, smile: 0.6 }], [34, { ...L(9, -10, 4), lightL: 1.2, smile: 1 }], [48, {}]],
  // The crystals speed up and dance round the body on a tilting ring while the seer follows them with its eyes.
  fidget_b: [[0, {}], [10, { orbit: 1.2, orbitR: -3, orbitTilt: 0.3, gaze: -0.4, orbitLift: 4 }], [20, { orbit: 3.1, orbitR: 4, orbitTilt: -0.25, gaze: 0.35, orbitLift: 8, nod: -0.1 }],
    [30, { orbit: 5.0, orbitR: -2, orbitTilt: 0.2, gaze: -0.2, orbitLift: 3, smile: 0.5 }], [40, { orbit: 6.0, orbitR: 1, smile: 0.6 }], [48, { orbit: 2 * Math.PI }]],
  // A backward somersault in the air, ears and tassels trailing, then a pleased bob.
  happy: [[0, {}], [5, { squat: 2, smile: 1, earL: -0.3, earR: -0.3 }], [9, { hover: 9, pitch: -0.9, smile: 1, mouth: 0.6 }], [13, { hover: 14, pitch: -2.6, smile: 1, mouth: 0.6, tailCurl: 0.6 }],
    [17, { hover: 13, pitch: -4.4, smile: 1, tailCurl: 0.6 }], [21, { hover: 8, pitch: -6.0, smile: 1 }], [24, { hover: 3, squat: 2, pitch: -2 * Math.PI, smile: 1, earL: 0.3, earR: 0.3 }],
    [30, { hover: 4, pitch: -2 * Math.PI, smile: 1, tilt: 0.12 }], [38, { hover: 1, pitch: -2 * Math.PI, smile: 0.8, tilt: -0.08 }], [48, { pitch: -2 * Math.PI }]],
  'happy-f2': [[0, f2({})], [5, f2({ ...L(9, -8, 22), ...R(9, 6, 22), hover: 4, smile: 1 })], [9, f2({ ...L(6, -2.2, 33, 3), ...R(6, 0.2, 33, 3), hover: 6, earL: -0.3, earR: -0.3, mouth: 0.5 })],
    [12, f2({ ...L(6, -2.2, 33, 5), ...R(6, 0.2, 33, 5), hover: 8, smile: 1 })], [17, f2({ hover: 12, twist: Math.PI, orbitR: 8, smile: 1 })], [23, f2({ hover: 13, twist: 2 * Math.PI, orbitR: 10, smile: 1 })],
    [31, f2({ hover: 7, twist: 2 * Math.PI, orbitR: 3, ...L(8, -10, 12, 4), ...R(8, 8, 12, 4), smile: 1 })], [40, f2({ twist: 2 * Math.PI, smile: 0.8, gaze: 0.3 })], [48, f2({ twist: 2 * Math.PI })]],
  // Stone into a star.
  trick: [[0, {}],
    [8, { ...R(12, 3, 4), palmDownR: 1, lightR: 1, pitch: 0.1, gaze: -0.4, nod: 0.25, earL: -0.25, earR: -0.25 }],
    [12, { ...R(12.4, 3.2, 3.6), palmDownR: 1, lightR: 1, pitch: 0.12, gaze: -0.4, nod: 0.28, earL: -0.35, earR: -0.35, blink: 1 }],
    [14, { ...R(11.8, 2.8, 4.4), palmDownR: 1, lightR: 1, pitch: 0.12, gaze: -0.4, nod: 0.28, earL: -0.35, earR: -0.35 }],
    [16, { ...R(12.5, 3.3, 3.5), palmDownR: 1, lightR: 1.2, pitch: 0.13, gaze: -0.4, nod: 0.3, earL: -0.4, earR: -0.4, squat: 1 }],
    [18, { ...R(11.8, 2.8, 4.5), palmDownR: 1, lightR: 1.2, pitch: 0.13, gaze: -0.4, nod: 0.3, earL: -0.4, earR: -0.4, squat: 1 }],
    [20, { ...R(12.6, 3.3, 3.4), palmDownR: 1, lightR: 1.4, pitch: 0.14, gaze: -0.4, nod: 0.3, earL: -0.45, earR: -0.45, squat: 1.5 }],
    [22, { ...R(11.8, 2.8, 4.6), palmDownR: 1, lightR: 1.4, pitch: 0.14, gaze: -0.4, nod: 0.3, earL: -0.45, earR: -0.45, squat: 1.5 }],
    [23, { ...R(12.6, 3.3, 3.2), palmDownR: 1, lightR: 1.5, pitch: 0.15, gaze: -0.4, nod: 0.32, earL: -0.45, earR: -0.45, squat: 2 }],
    [24, { ...R(12, 3, 8), palmDownR: 1, lightR: 1.5, pitch: 0.05, gaze: -0.4, nod: 0.15, earL: -0.3, earR: -0.3, rock: 1, rockX: 15, rockY: -7, rockZ: 5, rockSize: 0.8, mouth: 0.4 }],
    [27, { ...R(11, 3, 14), palmDownR: 1, lightR: 1, gaze: -0.4, nod: 0.05, earL: -0.3, earR: -0.3, rock: 1, rockX: 15, rockY: -7, rockZ: 17, rockSize: 1, rockSpin: 0.5, mouth: 0.4 }],
    [31, { ...R(11, 3, 13), palmDownR: 1, lightR: 1, gaze: -0.4, nod: 0.08, earL: -0.2, earR: -0.2, rock: 1, rockX: 15, rockY: -7, rockZ: 14, rockSize: 1, rockSpin: 0.8 }],
    [40, { ...R(11, 3, 15), palmDownR: 1, lightR: 1, gaze: -0.35, nod: 0.02, rock: 1, rockX: 14.5, rockY: -6.5, rockZ: 21, rockSize: 1, rockSpin: 1.6 }],
    [44, { ...L(13.5, -14.5, 17.5), ...R(13.5, 2.5, 17.5), gaze: -0.15, nod: 0.18, pitch: 0.1, rock: 1, rockX: 14.5, rockY: -6, rockZ: 39.5, rockSize: 0.95, rockSpin: 2.0 }],
    [47, { ...L(13.5, -12.8, 17.5), ...R(13.5, 0.8, 17.5), gaze: -0.1, nod: 0.2, pitch: 0.12, blink: 1, earL: -0.4, earR: -0.4, rock: 1, rockX: 14.5, rockY: -6, rockZ: 40.5, rockSize: 0.78, rockSpin: 2.1, rockCrack: 0.35 }],
    [49, { ...L(13.5, -13.6, 17.5), ...R(13.5, 1.6, 17.5), gaze: -0.1, nod: 0.2, pitch: 0.12, blink: 1, earL: -0.4, earR: -0.4, rock: 1, rockX: 14.5, rockY: -6, rockZ: 40.5, rockSize: 0.86, rockSpin: 2.1, rockCrack: 0.45 }],
    [52, { ...L(13.5, -11.6, 17.5), ...R(13.5, -0.4, 17.5), gaze: -0.1, nod: 0.22, pitch: 0.14, squat: 1, blink: 1, earL: -0.45, earR: -0.45, rock: 1, rockX: 14.5, rockY: -6, rockZ: 40.5, rockSize: 0.62, rockSpin: 2.2, rockCrack: 0.8 }],
    [54, { ...L(13.5, -12.0, 17.5), ...R(13.5, 0.0, 17.5), gaze: -0.1, nod: 0.22, pitch: 0.14, squat: 1, blink: 1, earL: -0.45, earR: -0.45, rock: 1, rockX: 14.5, rockY: -6, rockZ: 40.5, rockSize: 0.67, rockSpin: 2.2, rockCrack: 0.85 }],
    [56, { ...L(13.5, -11.0, 17.5), ...R(13.5, -1.0, 17.5), gaze: -0.1, nod: 0.24, pitch: 0.15, squat: 1.5, blink: 1, earL: -0.5, earR: -0.5, rock: 1, rockX: 14.5, rockY: -6, rockZ: 40.5, rockSize: 0.55, rockSpin: 2.3, rockCrack: 1 }],
    [57, { ...L(11, -16, 19), ...R(11, 5, 19), gaze: -0.1, nod: 0.05, pitch: -0.08, hover: 2, mouth: 0.5, earL: -0.1, earR: -0.1, rock: 1, rockCrystal: 1, rockX: 14.5, rockY: -6, rockZ: 39, rockSize: 0.8, rockSpin: 2.4 }],
    [61, { ...L(11, -15, 17), ...R(11, 4, 17), gaze: -0.08, nod: 0.02, hover: 2, mouth: 0.3, rock: 1, rockCrystal: 1, rockX: 14.5, rockY: -6, rockZ: 40.5, rockSize: 0.8, rockSpin: 3.0 }],
    [68, { ...L(12.5, -11, 14), ...R(12.5, -1, 14), lightL: 1, lightR: 1, gaze: -0.05, nod: 0.06, tilt: 0.12, smile: 1, earL: 0.1, earR: 0.1, rock: 1, rockCrystal: 1, rockX: 14.5, rockY: -6, rockZ: 41, rockSize: 0.8, rockSpin: 4.2 }],
    [74, { ...L(11, -12, 11), ...R(14, -5, 12), gaze: -0.05, nod: 0.12, tilt: 0.06, smile: 0.7, squat: 2, rock: 1, rockCrystal: 1, rockX: 14.5, rockY: -6, rockZ: 39.5, rockSize: 0.8, rockSpin: 5.0 }],
    [76, { ...L(11, -12, 11), ...R(14.5, -5.5, 10), gaze: -0.05, nod: 0.2, smile: 0.6, squat: 2.5, earL: -0.2, earR: -0.2, rock: 1, rockCrystal: 1, rockX: 14.5, rockY: -6, rockZ: 38.5, rockSize: 0.8, rockSpin: 5.2 }],
    [77, { ...L(10, -9, 12), ...R(13, -3.5, 17), gaze: -0.08, nod: 0.05, squat: 1, rock: 1, rockCrystal: 1, rockX: 14.8, rockY: -6.1, rockZ: 44, rockSize: 0.8, rockSpin: 5.8 }],
    [78, { ...L(9, -10, 13), ...R(9, 6, 26), gaze: -0.1, nod: -0.15, hover: 1, mouth: 0.5, rock: 1, rockCrystal: 1, rockX: 15.3, rockY: -6.3, rockZ: 52, rockSize: 0.78, rockSpin: 6.6 }],
    [79, { ...L(9, -10, 13), ...R(5, 10, 30, 3), gaze: -0.12, nod: -0.3, hover: 3, pitch: -0.12, mouth: 0.6, earL: -0.3, earR: -0.3, rock: 1, rockCrystal: 1, rockX: 16, rockY: -6.5, rockZ: 63, rockSize: 0.74, rockSpin: 7.6 }],
    [80, { ...L(9, -10, 13), ...R(2, 13, 30, 3), gaze: -0.14, nod: -0.4, hover: 3, pitch: -0.14, mouth: 0.6, earL: -0.3, earR: -0.3, rock: 1, rockCrystal: 1, rockX: 17, rockY: -6.8, rockZ: 77, rockSize: 0.7, rockSpin: 8.8 }],
    [81, { ...L(9, -10, 13), ...R(2, 13, 29.5, 3), gaze: -0.15, nod: -0.45, hover: 3, pitch: -0.14, mouth: 0.5, earL: -0.3, earR: -0.3, rock: 1, rockCrystal: 1, rockX: 18.2, rockY: -7.1, rockZ: 93, rockSize: 0.66, rockSpin: 10 }],
    [82, { ...L(9, -10, 13), ...R(2, 13, 29, 3), gaze: -0.16, nod: -0.48, hover: 3, pitch: -0.13, mouth: 0.4, earL: -0.3, earR: -0.3, rock: 1, rockCrystal: 1, rockOver: 1, rockX: 19.5, rockY: -7.4, rockZ: 111, rockSize: 0.62, rockSpin: 11.4 }],
    [83, { ...L(9, -10, 13), ...R(2.5, 13, 28, 3), gaze: -0.17, nod: -0.5, hover: 3, pitch: -0.12, smile: 0.4, earL: -0.3, earR: -0.3, rock: 1, rockCrystal: 1, rockOver: 1, rockX: 20.8, rockY: -7.7, rockZ: 130, rockSize: 0.58, rockSpin: 12.8 }],
    [84, { ...L(9, -10, 13), ...R(3, 13, 27, 3), gaze: -0.18, nod: -0.5, hover: 3, pitch: -0.11, smile: 0.5, earL: -0.3, earR: -0.3, rock: 1, rockCrystal: 1, rockOver: 1, rockX: 22, rockY: -8, rockZ: 149, rockSize: 0.55, rockSpin: 14.2 }],
    [85, { ...L(9, -10, 13), ...R(4, 13, 25, 3), gaze: -0.19, nod: -0.5, hover: 3, pitch: -0.1, smile: 0.5, earL: -0.3, earR: -0.3 }],
    [92, { ...R(10, 9, 12), gaze: -0.25, nod: -0.5, hover: 2, smile: 0.8, earL: -0.2, earR: -0.2 }],
    [97, { gaze: -0.28, nod: -0.52, hover: 1, smile: 1, mouth: 0.4, tilt: 0.1, earL: -0.35, earR: -0.35 }],
    [101, { ...L(13, -8, 4), palmDownL: 1, lightL: 1, gaze: -0.45, nod: 0.3, pitch: 0.08, smile: 0.8 }],
    [106, { ...L(13.4, -8.4, 3.6), palmDownL: 1, lightL: 1.3, gaze: -0.45, nod: 0.32, pitch: 0.1, smile: 0.8 }],
    [112, { ...L(13, -8, 4.4), palmDownL: 1, lightL: 1.3, gaze: -0.45, nod: 0.3, pitch: 0.1, smile: 0.9 }],
    [118, { ...L(10, -9, 3), gaze: 0.25, nod: 0, smile: 1, earL: 0.1, earR: 0.1 }],
    [125, {}], [132, {}]],
  // Teleport in three blinks.
  trick_b: [[0, {}],
    [6, { ...mudra(), blink: 1, earL: -0.25, earR: -0.25, nod: 0.15, orbitR: -6 }],
    [9, { ...mudra(2), blink: 1, hover: 2, orbitR: -8, ...size(0.85, 1.25), flash: 0.3 }],
    [11, { ...mudra(2), blink: 1, hover: 2, orbitR: -10, ...size(0.25, 1.45), flash: 1 }],
    [12, { hidden: 1, ...size(0.1, 0.1) }],
    [16, { hidden: 1, dx: 44, dy: -72, noShadow: 1, ...size(0.5) }],
    [17, { dx: 44, dy: -72, noShadow: 1, ...size(0.3, 0.8), flash: 0.6, gaze: 0.2 }],
    [19, { dx: 44, dy: -72, noShadow: 1, ...size(0.6, 0.42), flash: 0.2, gaze: 0.2 }],
    [22, { dx: 44, dy: -72, noShadow: 1, ...size(0.5), gaze: -0.4, earL: -0.3, earR: -0.3 }],
    [26, { dx: 44, dy: -74, noShadow: 1, ...size(0.5), gaze: 0.55, ...R(6, 11, 26), smile: 1, earL: -0.2, earR: -0.2 }],
    [29, { dx: 44, dy: -75, noShadow: 1, ...size(0.5), gaze: 0.55, ...R(6, 8, 27), smile: 1 }],
    [32, { dx: 44, dy: -74, noShadow: 1, ...size(0.5), gaze: 0.55, ...R(6, 11, 26), smile: 1 }],
    [36, { dx: 44, dy: -72, noShadow: 1, ...size(0.5), gaze: 0.2, ...R(8, 9, 10), smile: 0.6 }],
    [39, { dx: 44, dy: -72, noShadow: 1, ...size(0.5), ...mudra(), blink: 1 }],
    [41, { dx: 44, dy: -72, noShadow: 1, ...size(0.2, 0.95), ...mudra(), blink: 1, flash: 1 }],
    [42, { hidden: 1, dx: 44, dy: -72, noShadow: 1, ...size(0.1) }],
    [47, { hidden: 1, overAll: 1, dx: -8, dy: 150, noShadow: 1, ...size(2) }],
    [48, { overAll: 1, dx: -8, dy: 150, noShadow: 1, ...size(1.6, 2.4), flash: 0.6, gaze: 0.6, earL: -0.4, earR: -0.4, mouth: 0.6 }],
    [50, { overAll: 1, dx: -8, dy: 150, noShadow: 1, ...size(2.1, 1.9), flash: 0.2, gaze: 0.65, earL: -0.4, earR: -0.4, mouth: 0.4 }],
    [53, { overAll: 1, dx: -8, dy: 150, noShadow: 1, ...size(2), gaze: 0.7, nod: 0.1, tilt: 0.18, smile: 0.7, earL: -0.3, earR: -0.3 }],
    [56, { overAll: 1, dx: -8, dy: 150, noShadow: 1, ...size(2), gaze: 0.7, nod: 0.05, tilt: 0.15, smile: 0.8, ...R(11, 14, 25) }],
    [58, { overAll: 1, dx: -8, dy: 150, noShadow: 1, ...size(2), gaze: 0.7, nod: 0.05, tilt: 0.15, smile: 0.8, ...R(12.5, 15.5, 26) }],
    [60, { overAll: 1, dx: -8, dy: 150, noShadow: 1, ...size(2), gaze: 0.7, nod: 0.05, tilt: 0.12, smile: 0.9, ...R(11, 14, 25) }],
    [62, { overAll: 1, dx: -8, dy: 150, noShadow: 1, ...size(2), gaze: 0.7, nod: 0.05, tilt: 0.12, smile: 1, ...R(12.5, 15.5, 26) }],
    [66, { overAll: 1, dx: -8, dy: 150, noShadow: 1, ...size(2), gaze: 0.6, tilt: -0.15, smile: 1, blink: 1, ...R(10, 11, 14) }],
    [69, { overAll: 1, dx: -8, dy: 150, noShadow: 1, ...size(2), gaze: 0.5, tilt: -0.12, smile: 1, earL: 0.1, earR: -0.2 }],
    [74, { overAll: 1, dx: -8, dy: 150, noShadow: 1, ...size(2), ...mudra(), blink: 1 }],
    [76, { overAll: 1, dx: -8, dy: 150, noShadow: 1, ...size(0.7, 2.4), ...mudra(), blink: 1, flash: 0.6 }],
    [78, { overAll: 1, dx: -8, dy: 150, noShadow: 1, ...size(0.15, 2.7), ...mudra(), blink: 1, flash: 1 }],
    [79, { hidden: 1, dy: -26, ...size(0.6, 1.4) }],
    [85, { hidden: 1, dy: -26, ...size(0.6, 1.4) }],
    [86, { dy: -26, ...size(0.6, 1.4), flash: 0.5, earL: -0.4, earR: -0.4 }],
    [89, { dy: 0, ...size(1.25, 0.76), squat: 2, earL: 0.4, earR: 0.4, blink: 1 }],
    [92, { ...size(0.92, 1.1), hover: 3, earL: -0.2, earR: -0.2 }],
    [96, { ...size(1.04, 0.97), gaze: -0.3, earL: 0.3, earR: -0.1 }],
    [100, { gaze: 0.3, earL: -0.1, earR: 0.3, tilt: 0.06 }],
    [105, { gaze: 0.15, smile: 1, earL: 0.05, earR: 0.05 }],
    [113, {}], [120, {}]],
  // Awakening: the mudra, the rise, six crystals, the gem opens as an eye, the torc becomes a halo.
  phase: [[0, {}], [6, { ...mudra(), blink: 1, earL: -0.2, earR: -0.2, nod: 0.15 }],
    [12, { ...mudra(5), blink: 1, hover: 5, split: 0.5, orbitR: 3, form: 0.2, nod: 0.1 }],
    [18, { ...mudra(9), blink: 1, hover: 9, split: 1, orbitR: 5, form: 0.5, halo: 0.5, nod: 0.05, earL: -0.3, earR: -0.3 }],
    [22, { ...mudra(10), hover: 10, split: 1, orbitR: 6, form: 1, halo: 1, gemOpen: 1, flash: 0.35, mouth: 0.4, earL: -0.45, earR: -0.45, pitch: -0.05 }],
    [26, { ...L(5, -16, 26, 10), ...R(5, 14, 26, 10), lightL: 1, lightR: 1, hover: 10, split: 1, orbitR: 9, form: 1, halo: 1, gemOpen: 1, mouth: 0.3, pitch: -0.12, earL: -0.4, earR: -0.4 }],
    [34, { ...L(6, -14, 22, 8), ...R(6, 12, 22, 8), lightL: 1, lightR: 1, hover: 8, split: 1, orbitR: 6, form: 1, halo: 1, gemOpen: 1, pitch: -0.08, smile: 0.4 }],
    [44, { ...L(8, -11, 10, 4), ...R(8, 9, 10, 4), lightL: 1, lightR: 1, hover: 4, split: 1, orbitR: 1, form: 1, halo: 1, gemOpen: 1, smile: 0.5 }],
    [53, f2({})], [60, f2({})]],
  'idle-f2': [[0, f2({})], [9, f2({ nod: -0.05, earL: 0.1, tailSway: 0.2 })], [18, f2({ gaze: 0.12, tilt: 0.04 })], [27, f2({ earR: 0.12, nod: 0.04 })], [36, f2({})]],
  // Star storm.
  'trick-f2': [[0, f2({})],
    [12, f2({ hover: 9, ...L(4, -12, 30, 9), ...R(4, 10, 30, 9), palmDownL: 0, nod: -0.3, gaze: -0.1, earL: -0.3, earR: -0.3, orbitR: 4 })],
    [20, f2({ hover: 9, ...L(1, -9.5, 32, 9), ...R(1, 7.5, 32, 9), lightL: 0.4, lightR: 0.4, nod: -0.35, earL: -0.3, earR: -0.3, orbitR: 6, yaw: 0.25, star: 1, starX: 3, starY: -1, starZ: 74 })],
    [36, f2({ hover: 10, ...L(1, -9.5, 32, 10), ...R(1, 7.5, 32, 10), lightL: 0.4, lightR: 0.4, nod: -0.35, orbitR: 9, orbit: 2, yaw: 1.4, star: 3, starX: 3, starY: -1, starZ: 76, mouth: 0.3 })],
    [52, f2({ hover: 10, ...L(1, -9.5, 32, 10), ...R(1, 7.5, 32, 10), lightL: 0.4, lightR: 0.4, nod: -0.3, orbitR: 10, orbit: 6, yaw: 3.9, star: 4.2, starX: 3, starY: -1, starZ: 77, mouth: 0.3 })],
    [60, f2({ hover: 10, ...L(1, -9.5, 32, 10), ...R(1, 7.5, 32, 10), lightL: 0.4, lightR: 0.4, nod: -0.28, orbitR: 10, orbit: 9, yaw: 2 * Math.PI, star: 4.6, starX: 3, starY: -1, starZ: 77 })],
    [66, f2({ hover: 7, ...L(11, -4.6, 18, 7), ...R(11, 2.6, 18, 7), nod: 0.05, orbitR: 6, orbit: 10.5, yaw: 2 * Math.PI, star: 4, starX: 12, starY: -1, starZ: 50, blink: 1 })],
    [72, f2({ hover: 5, ...L(12, -3.8, 15, 5), ...R(12, 1.8, 15, 5), nod: 0.12, orbitR: 3, orbit: 11.5, yaw: 2 * Math.PI, star: 2.8, starX: 13, starY: -1, starZ: 43, blink: 1, earL: -0.4, earR: -0.4 })],
    [78, f2({ hover: 5, lean: -2, pitch: -0.2, ...L(9, -3.8, 17, 5), ...R(9, 1.8, 17, 5), nod: 0.05, gaze: 0.35, orbitR: 2, orbit: 12, yaw: 2 * Math.PI, star: 3, starX: 9, starY: -1, starZ: 45, earL: -0.4, earR: -0.4 })],
    [83, f2({ hover: 4, lean: -3, pitch: -0.28, ...L(8, -3.6, 18, 4), ...R(8, 1.6, 18, 4), gaze: 0.55, orbitR: 2, orbit: 12.2, yaw: 2 * Math.PI, star: 3.2, starX: 8, starY: -1, starZ: 45, mouth: 0.3 })],
    [86, f2({ hover: 4, lean: 2, pitch: 0.12, ...L(14, 3, 17, 4), ...R(13, 9, 17, 4), gaze: 0.6, orbitR: 2, orbit: 12.4, yaw: 2 * Math.PI, star: 5, starOver: 1, starX: 22, starY: 7, starZ: 40, mouth: 0.8, earL: -0.5, earR: -0.5 })],
    [88, f2({ hover: 4, lean: 2.5, pitch: 0.14, ...L(14, 4, 17, 4), ...R(13, 10, 17, 4), gaze: 0.6, orbitR: 2, orbit: 12.5, yaw: 2 * Math.PI, star: 8, starOver: 1, starX: 30, starY: 13, starZ: 36, mouth: 0.8, earL: -0.5, earR: -0.5 })],
    [90, f2({ hover: 4, lean: 2.5, pitch: 0.14, ...L(14, 4, 17, 4), ...R(13, 10, 17, 4), gaze: 0.6, orbitR: 2, orbit: 12.6, yaw: 2 * Math.PI, star: 11, starOver: 1, starX: 36, starY: 18, starZ: 33, mouth: 0.7, earL: -0.5, earR: -0.5 })],
    [92, f2({ hover: 4, lean: 2.5, pitch: 0.13, ...L(14, 4, 17, 4), ...R(13, 10, 17, 4), gaze: 0.6, orbitR: 2, orbit: 12.7, yaw: 2 * Math.PI, star: 14, starOver: 1, starX: 40, starY: 21, starZ: 31, mouth: 0.6, earL: -0.5, earR: -0.5 })],
    [93, f2({ hover: 4, lean: 2.5, pitch: 0.13, ...L(14, 4, 17, 4), ...R(13, 10, 17, 4), gaze: 0.6, orbitR: 2, orbit: 12.7, yaw: 2 * Math.PI, star: 16, starOver: 1, starX: 42, starY: 22, starZ: 30, mouth: 0.6, earL: -0.5, earR: -0.5 })],
    [94, f2({ hover: 6, lean: -4, pitch: -0.25, ...L(6, -14, 22, 6), ...R(6, 12, 22, 6), gaze: 0.3, orbitR: 8, orbit: 12.8, yaw: 2 * Math.PI, flash: 0.3, sparks: 0.05, sparkX: 42, sparkY: 22, sparkZ: 30, earL: 0.6, earR: 0.6, blink: 1 })],
    [100, f2({ hover: 7, lean: -3, pitch: -0.18, ...L(6, -15, 20, 7), ...R(6, 13, 20, 7), gaze: 0.2, orbitR: 6, orbit: 13.4, yaw: 2 * Math.PI, flash: 0.1, sparks: 0.5, sparkX: 42, sparkY: 22, sparkZ: 30, earL: 0.5, earR: 0.5, blink: 1, smile: 0.5 })],
    [106, f2({ hover: 5, lean: -1, pitch: -0.06, ...L(8, -11, 12, 5), ...R(8, 9, 12, 5), gaze: 0.3, orbitR: 3, orbit: 13.8, yaw: 2 * Math.PI, sparks: 1, sparkX: 42, sparkY: 22, sparkZ: 30, smile: 1 })],
    [116, f2({ orbit: 14.2, yaw: 2 * Math.PI, smile: 1, gaze: 0.2, tilt: 0.08 })],
    [124, f2({ orbit: 4 * Math.PI + (2 * Math.PI) / 3, yaw: 2 * Math.PI })], [132, f2({ orbit: 4 * Math.PI + (2 * Math.PI) / 3, yaw: 2 * Math.PI })]],
  // The double.
  'trick_b-f2': [[0, f2({})],
    [8, f2({ ...mudra(3), blink: 1, earL: -0.2, earR: -0.2, orbitR: -5 })],
    [12, f2({ ...mudra(3), blink: 1, orbitR: -5, flash: 0.25, ghostA: 0.6 })],
    [20, f2({ dx: 32, ghostX: -64, ghostA: 0.6, gaze: 0.35, ...L(6, -15, 18), ...R(6, 13, 18), smile: 0.5 })],
    [26, f2({ dx: 32, ghostX: -64, ghostA: 0.6, gaze: -0.5, ...L(6, -15, 18), ...R(6, 11, 30), smile: 0.8, earR: -0.3 })],
    [31, f2({ dx: 32, ghostX: -64, ghostA: 0.6, gaze: -0.5, ...L(6, -15, 18), ...R(6, 13, 26), smile: 0.8, earR: -0.3, tilt: -0.1 })],
    ...doubleOrbit(),
    [85, f2({ flash: 0.45, ghostA: 0, hover: 6, ...L(6, -16, 22, 3), ...R(6, 14, 22, 3), orbitR: 10, mouth: 0.6, earL: -0.4, earR: -0.4 })],
    [90, f2({ hover: 7, ...L(6, -15, 20, 4), ...R(6, 13, 20, 4), orbitR: 7, smile: 1 })],
    [100, f2({ hover: 4, ...L(8, -10, 10, 2), ...R(8, 8, 10, 2), orbitR: 2, smile: 1, gaze: 0.3 })],
    [112, f2({})], [120, f2({})]],
  // The rift show: hidden behind the opening rift, unfolds out of it, presents itself.
  show: [[0, { hidden: 1, noShadow: 1 }], [35, { hidden: 1, noShadow: 1, ...size(0.15, 1.1) }],
    [36, { ...size(0.15, 1.1), flash: 1, blink: 1, nod: 0.3, earL: 0.5, earR: 0.5, tailCurl: 0.6, hover: 4, ...L(10, -9, 4, 4), ...R(10, 7, 4, 4) }],
    [40, { ...size(0.65, 1.12), flash: 0.5, blink: 1, nod: 0.28, earL: 0.5, earR: 0.5, tailCurl: 0.5, hover: 5, ...L(10, -9, 4, 5), ...R(10, 7, 4, 5) }],
    [44, { ...size(1.15, 0.92), flash: 0.15, blink: 1, nod: 0.2, earL: 0.2, earR: 0.2, tailCurl: 0.3, hover: 6, ...L(8, -9, 12, 6), ...R(8, 7, 12, 6) }],
    [48, { ...size(0.96, 1.04), nod: -0.1, earL: -0.4, earR: -0.4, hover: 7, ...L(5, -16, 26, 7), ...R(5, 14, 26, 7), lightL: 1, lightR: 1, mouth: 0.5, orbitR: 8 }],
    [52, { hover: 7, nod: -0.12, earL: -0.35, earR: -0.35, ...L(5, -16, 26, 7), ...R(5, 14, 26, 7), lightL: 1, lightR: 1, mouth: 0.4, orbitR: 8, pitch: -0.1 }],
    [64, { hover: 5, nod: 0, gaze: 0.3, ...L(6, -15, 22, 5), ...R(6, 13, 22, 5), lightL: 1, lightR: 1, smile: 0.8, orbitR: 5, pitch: -0.06 }],
    [76, { hover: 4, gaze: 0.45, tilt: 0.1, ...L(5, -16, 26, 4), ...R(5, 14, 26, 4), lightL: 1.4, lightR: 1.4, smile: 1, orbitR: 7, earL: -0.2, earR: -0.2 }],
    [86, { hover: 2, gaze: 0.5, tilt: 0.12, nod: 0.15, ...L(10, -11, 8, 2), ...R(10, 9, 8, 2), lightL: 1, lightR: 1, smile: 1, orbitR: 3 }],
    [96, { hover: 2, gaze: 0.5, tilt: 0.12, nod: 0.15, ...L(10, -11, 8, 2), ...R(10, 9, 8, 2), lightL: 1, lightR: 1, smile: 1, orbitR: 3 }],
    [120, { hover: 2, gaze: 0.5, tilt: 0.12, nod: 0.15, ...L(10, -11, 8, 2), ...R(10, 9, 8, 2), lightL: 1, lightR: 1, smile: 1, orbitR: 3 }]],
  // Peeks up from behind the bottom rail: ears, then eyes, then the paws hook over the rail.
  peek: [[0, {}], [5, { hover: 5, earL: -0.2, earR: -0.2, smile: 0.3 }], [10, { dy: 170, noShadow: 1, yaw: 0.67, earL: 0.3, earR: 0.3 }], [16, { dy: 170, noShadow: 1, yaw: 0.67 }],
    [22, { dy: 150, noShadow: 1, yaw: 0.67, earL: -0.35, earR: -0.35 }], [25, { dy: 148, noShadow: 1, yaw: 0.67, earL: -0.1, earR: -0.45 }], [28, { dy: 104, noShadow: 1, yaw: 0.67, gaze: -0.1, earL: -0.3, earR: -0.3 }],
    [32, { dy: 98, noShadow: 1, yaw: 0.67, peekFront: 1, curl: 1, ...L(8, -10, 19), ...R(8, 8, 19), gaze: 0, earL: -0.3, earR: -0.3, smile: 0.4 }],
    [36, { dy: 96, noShadow: 1, yaw: 0.67, peekFront: 1, curl: 1, ...L(8, -10, 19), ...R(8, 8, 19), gaze: 0.05, tilt: 0.16, smile: 0.7 }],
    [38, { dy: 96, noShadow: 1, yaw: 0.67, peekFront: 1, curl: 1, ...L(8, -10, 19), ...R(8, 8, 19), gaze: 0.05, tilt: 0.16, smile: 0.7, blink: 1 }],
    [40, { dy: 96, noShadow: 1, yaw: 0.67, peekFront: 1, curl: 1, ...L(8, -10, 19), ...R(8, 8, 19), gaze: 0.05, tilt: 0.16, smile: 0.8 }],
    [44, { dy: 96, noShadow: 1, yaw: 0.67, peekFront: 1, curl: 1, ...L(8, -10, 19), ...R(8, 8, 19), gaze: -0.1, tilt: -0.12, smile: 1, earL: 0.1, earR: -0.3 }],
    [47, { dy: 98, noShadow: 1, yaw: 0.67, ...L(8, -10, 19), ...R(8, 8, 19), gaze: 0, smile: 1 }],
    [50, { dy: 170, noShadow: 1, yaw: 0.67 }], [52, { dy: 170, noShadow: 1 }], [53, { dy: 140, noShadow: 1, earL: 0.3, earR: 0.3 }], [56, { hover: 4, earL: -0.2, earR: -0.2 }], [60, {}]],
  // Born from a crystal egg (drawn by the effects): the egg cracks and bursts, the seer unfolds.
  hatch: [[0, { hidden: 1, noShadow: 1 }], [17, { hidden: 1, noShadow: 1, ...size(0.4) }],
    [18, { ...size(0.4), flash: 1, blink: 1, nod: 0.35, earL: 0.5, earR: 0.5, hover: 4 }],
    [22, { ...size(1.1, 0.9), flash: 0.4, blink: 1, nod: 0.2, earL: 0.3, earR: 0.3, hover: 6 }],
    [26, { ...size(0.95, 1.05), nod: -0.1, earL: -0.4, earR: -0.4, hover: 7, ...L(5, -15, 24, 7), ...R(5, 13, 24, 7), smile: 1, mouth: 0.5 }],
    [34, { hover: 4, gaze: 0.3, ...L(8, -11, 12, 4), ...R(8, 9, 12, 4), smile: 1 }], [42, { smile: 0.6 }], [48, {}]],
  sleep_in: [[0, {}], [10, { nod: 0.15, blink: 1, earL: 0.15, earR: 0.15 }], [18, { sleep: 0.5, blink: 1, earL: 0.3, earR: 0.3 }], [26, asleep], [30, asleep]],
  sleep_out: [[0, asleep], [8, { sleep: 0.7 }], [14, { sleep: 0.3, nod: -0.25, earL: -0.2, earR: -0.2, mouth: 0.7, ...R(9, 9, 24) }], [22, { nod: -0.1, earL: 0.1, earR: 0.1 }], [30, {}]],
  wake_startled: [[0, asleep], [3, { sleep: 0.6, earL: -0.4, earR: -0.4, blink: 0 }], [7, { hover: 10, earL: -0.55, earR: -0.55, orbitR: 8, mouth: 0.7, tailCurl: 0.7, ...L(6, -15, 22, 10), ...R(6, 13, 22, 10) }],
    [12, { hover: 6, gaze: 0.5, orbitR: 3, earL: -0.3, earR: -0.3 }], [17, { gaze: -0.4 }], [24, {}]],
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
    if (SWITCHES.has(name)) pose[name] = f >= end ? (b[name] ?? 0) : (a[name] ?? 0);
    else pose[name] = (a[name] ?? 0) * (1 - u) + (b[name] ?? 0) * u;
  }
  return pose;
}
