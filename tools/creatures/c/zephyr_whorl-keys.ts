import { keyframer, type Lane, type Track } from '../kit/pet-moves';
import { everyday } from '../rig/figure';
import type { Animation, XY } from '../types';
import { turnsInBreeze } from './zephyr_whorl-wind';

export const home: XY = [56, 99];
export const wind = { inhale: 45, lips: 54, breath: 57, hit: 61, stop: 79 };
export const glider = { enter: 11, lift: 26, catch: 51, perch: 85, throw: 107, free: 108 };
export const footfalls = { leaving: 11, arriving: 27 };
export const walking = { low: 0.15, lean: 0.48, tilt: -0.06 };
const doze = { low: 0.85, nod: 0.41, lids: 1, bud: 0.75, armsIn: 0.85, tail: 0.5 };
const puff = { cheek: 1, armsDown: 1, headTurn: 0.25, lean: -0.55, nod: -0.13 };
const gaze = { headTurn: -0.57, nod: -0.22, gaze: 1, tail: 0.23 };
const fly = { tuck: 1, armsOut: 0.7, lean: 0.18, bud: -0.3 };
const ready = { reach: 0.86, high: 0.72, grip: 0, headTurn: -0.43, gaze: 1, tilt: -0.05 };
const held = { reach: 1, high: 0.77, grip: 1, headTurn: -0.42, gaze: 1 };
const perch = { reach: 0.95, high: 0.34, grip: 1, headTurn: -0.34, gaze: 0.82, feetGrip: 1 };
// The forward stance meets the first gait sample. Lift a foot before changing its footprint.
const stance = { ...walking, aheadR: 1.75, aheadL: -1.75 };
const rightKnee = {
  weight: -3.0,
  highR: 8.3,
  outR: 1.4,
  aheadR: 6.2,
  armsIn: 0.33,
  armSwing: -2.7,
  nod: 0.15,
  tilt: -0.16,
};
const leftKnee = {
  aheadR: 1.75,
  weight: 2.7,
  highL: 6.6,
  outL: 1.2,
  aheadL: 4.2,
  armsIn: 0.27,
  armSwing: 2.5,
  nod: 0.18,
  tilt: 0.14,
};
const tracks: Record<string, Track> = {
  look: [
    [0, {}],
    [5, { headTurn: -0.68, nod: -0.16, gaze: 1, tail: 0.56 }],
    [13, { headTurn: -0.68, nod: -0.16, gaze: 1, tail: 0.56 }],
    [17, { headTurn: 0.64, tilt: 0.24, gaze: -0.9 }],
    [26, { headTurn: 0.64, tilt: 0.24, gaze: -0.9 }],
    [35, {}],
  ],
  prepare_walk: [
    [0, {}],
    [3, { low: 0.28, weight: -1.8, armsIn: 0.37 }],
    [6, rightKnee],
    [8, rightKnee],
    [footfalls.leaving, { aheadR: 1.75, weight: -0.48, lean: 0.73, low: 0.29, armSwing: -1.2 }],
    [14, { aheadR: 1.75, aheadL: -0.75, highL: 1.7, weight: 1.2, lean: 0.89 }],
    [17, stance],
    [18, stance],
    [20, { ...stance, low: 0.25, weight: 1.3 }],
    [23, leftKnee],
    [25, leftKnee],
    [footfalls.arriving, { aheadR: 1.75, weight: 0.43, low: 0.24, armSwing: 0.8 }],
    [30, { aheadR: 0.8, highR: 1.35, weight: -0.84, low: 0.11 }],
    [35, {}],
  ],
  fidget_a: [
    [0, {}],
    [5, { armsDown: 0.8, headTurn: 0.24, low: 0.12 }],
    [11, puff],
    [21, puff],
    [25, { cheek: 0.71, armsDown: 1, headTurn: 0.12, purse: 1, nod: -0.19 }],
    [30, { cheek: 0.12, armsDown: 1, purse: 1, nod: -0.19, lean: 0.48 }],
    [34, { purse: 0.35, armsDown: 0.55, smile: 0.49 }],
    [41, { tilt: 0.12 }],
    [47, {}],
  ],
  fidget_b: [
    [0, {}],
    [6, { tilt: 0.17, gaze: -0.7 }],
    [10, { bud: 0.15, nod: -0.24, eyesUp: 1 }],
    [17, { bud: 1, nod: -0.3, eyesUp: 1, armsIn: 0.4 }],
    [28, { bud: 1, nod: -0.3, eyesUp: 1, armsIn: 0.4 }],
    [34, { bud: -0.22, nod: 0.13, armsOut: 0.35 }],
    [40, { bud: 0.08, tilt: -0.18 }],
    [49, {}],
  ],
  happy: [
    [0, {}],
    [6, { low: 0.72, bud: 0.41 }],
    [9, { alt: 10, armsOut: 1, tuck: 0.82, smile: 0.85, bud: -0.22 }],
    [13, { alt: 15, armsOut: 1, tuck: 1, smile: 1, bud: -0.28 }],
    [19, { low: 0.49, armsOut: 0.35 }],
    [23, { alt: 6, tuck: 0.5, smile: 0.9 }],
    [28, { low: 0.26 }],
    [38, {}],
  ],
  tired: [
    [0, {}],
    [12, { low: 0.35, nod: 0.2, lids: 0.68, bud: 0.33 }],
    [30, { low: 0.48, nod: 0.26, lids: 0.77, bud: 0.43 }],
    [35, {}],
  ],
  sleep_in: [
    [0, {}],
    [7, { low: 0.28, lids: 0.46, armsIn: 0.5 }],
    [16, { ...doze, lids: 0.86 }],
    [29, doze],
  ],
  sleep_out: [
    [0, doze],
    [7, { ...doze, lids: 0.54 }],
    [12, { low: 0.41, armsOut: 0.73, bud: 0.42 }],
    [19, { nod: -0.24, bud: -0.17 }],
    [29, {}],
  ],
  wake_startled: [
    [0, doze],
    [4, { low: 0.5, lids: 0, bud: 0.55 }],
    [8, { armsOut: 1, alt: 8, tuck: 0.8, bud: -0.25, smile: 0.72 }],
    [14, { low: 0.48, armsOut: 0.56 }],
    [23, {}],
  ],
  hatch: [
    [0, { ...fly, alt: 13 }],
    [10, { ...fly, alt: 16, tilt: -0.24 }],
    [20, { ...fly, alt: 11, nod: -0.13 }],
    [30, { tuck: 0.29, alt: 5, armsOut: 0.65 }],
    [34, { low: 0.74, armsOut: 0.7, bud: 0.2 }],
    [43, { headTurn: 0.32, smile: 0.87 }],
    [55, {}],
  ],
  trick: [
    [0, {}],
    [6, { headTurn: 0.28 }],
    [11, gaze],
    [18, gaze],
    [21, { low: 0.78, tail: 0.3 }],
    [25, { ...fly, alt: 13 }],
    [31, { ...fly, alt: 16, armsOut: 0.54 }],
    [37, { alt: 3, tuck: 0.3 }],
    [40, { low: 0.53, nod: -0.15 }],
    [45, { ...puff, cheek: 0.59, headTurn: -0.98 }],
    [51, { ...puff, headTurn: -0.98 }],
    [54, { ...puff, headTurn: -0.98, purse: 0.76 }],
    [57, { ...puff, headTurn: -0.98, purse: 1, lean: 0.6 }],
    [65, { headTurn: -0.98, armsDown: 1, purse: 1, cheek: 0.71, lean: 0.97, low: 0.26, brows: 0.6 }],
    [72, { headTurn: -0.98, armsDown: 1, purse: 1, cheek: 0.37, lean: 0.79, low: 0.3 }],
    [79, { headTurn: -0.98, armsDown: 0.8, purse: 0.69, cheek: 0.12, lean: 0.56 }],
    [82, { alt: 5, tuck: 0.45, armsOut: 0.8, bud: -0.22 }],
    [86, { alt: 11, tuck: 1, armsOut: 1, nod: -0.27 }],
    [94, { alt: 2, armsOut: 0.5 }],
    [97, { low: 0.66, armsOut: 0.3 }],
    [103, { ...gaze, smile: 0.9 }],
    [110, { ...gaze, smile: 0.5, low: 0.48 }],
    [114, { alt: 6, tuck: 0.53, tail: -0.1 }],
    [119, { alt: 7, tuck: 0.51, nod: -0.14 }],
    [125, { low: 0.41 }],
    [131, {}],
  ],
  trick_b: [
    [0, {}],
    [7, {}],
    [11, { headTurn: 0.62, eyesUp: 0.45 }],
    [15, { headTurn: 1.55, eyesUp: 1, tilt: 0.18 }],
    [19, { headTurn: 1.52, eyesUp: 1, low: 0.39, armsOut: 0.23 }],
    [25, { low: 0.85, headTurn: 1.18, eyesUp: 1, bud: 0.15 }],
    [29, { ...fly, alt: 3.5, headTurn: 0.84, eyesUp: 0.8 }],
    [38, { ...fly, alt: 8.5, ...ready, reach: 0.46, high: 0.14 }],
    [45, { ...fly, alt: 15, ...ready, high: 0.4 }],
    [50, { ...fly, alt: 15, ...ready, high: 0.8 }],
    [51, { ...fly, alt: 15, ...held }],
    [56, { ...fly, alt: 15, ...held }],
    [64, { ...fly, alt: 12.6, ...held, tilt: 0.12, tuck: 0.83 }],
    [73, { ...fly, alt: 8.6, ...held, high: 0.59, tuck: 0.48 }],
    [80, { ...fly, alt: 3.9, ...perch, high: 0.45, tuck: 0.19 }],
    [84, { ...perch, alt: 0.9, tuck: 0.04, highL: 2.3 }],
    [85, { ...perch, low: 0.09, highL: 2.1, armsOut: 0.44 }],
    [87, { ...perch, low: 0.42, armsOut: 0.42 }],
    [89, { ...perch, low: 0.66, armsOut: 0.33 }],
    [94, { ...perch, low: 0.19 }],
    [96, { ...perch, low: 0.19, eyesUp: 0.85, nod: -0.19 }],
    [101, { ...perch, windup: 1, high: 0.96, low: 0.5, lean: -0.8 }],
    [104, { ...perch, windup: 0.9, high: 0.91, low: 0.45, lean: -0.5 }],
    [107, { ...held, release: 1, high: 1, lean: 0.81, feetGrip: 1 }],
    [108, { ...ready, release: 1, high: 1, lean: 0.82, feetGrip: 1 }],
    [114, { ...ready, release: 0.78, lean: 0.48, feetGrip: 1 }],
    [121, { ...gaze, feetGrip: 1, smile: 0.83 }],
    [125, { low: 0.68, feetGrip: 0.5 }],
    [129, { ...fly, alt: 10 }],
    [136, { ...fly, alt: 8 }],
    [141, { low: 0.52, bud: 0.25 }],
    [151, {}],
  ],
};
const routes: Record<string, [number, number, number][]> = {
  hatch: [
    [0, -83, -1],
    [10, -64, -4],
    [20, -30, -2],
    [34, 0, 0],
    [55, 0, 0],
  ],
  trick: [
    [0, 0, 0],
    [21, 0, 0],
    [30, 12, -3],
    [40, 24, -6],
    [79, 24, -6],
    [86, -2, -3],
    [97, -23, 0],
    [110, -23, 0],
    [119, -9, 0],
    [125, 0, 0],
    [131, 0, 0],
  ],
  trick_b: [
    [0, 0, 0],
    [25, 0, 0],
    [37, -14, -3],
    [50, 4, -7],
    [54, 4, -7],
    [85, 30, 22],
    [125, 30, 22],
    [135, 14, 6],
    [141, 0, 0],
    [151, 0, 0],
  ],
};
const rotations: Record<string, Lane> = {
  hatch: [
    [0, 0],
    [22, 2.15],
    [34, 2.85],
    [42, 3],
    [55, 3],
  ],
  trick: [
    [0, 0],
    [22, 0],
    [26, 0.2],
    [34, 0.85],
    [41, 1],
    [131, 1],
  ],
  trick_b: [
    [0, 0],
    [18, 0],
    [25, 0.17],
    [29, 0.365],
    [50, 1.45],
    [60, 1.975],
    [74, 2.7],
    [85, 3.2],
    [93, 3.47],
    [98, 3.5],
    [125, 3.5],
    [134, 3.875],
    [143, 4],
    [151, 4],
  ],
};
const lanes: Record<string, Record<string, Lane>> = {};
for (const [clip, path] of Object.entries(routes))
  lanes[clip] = { x: path.map(([n, x]) => [n, x]), y: path.map(([n, , y]) => [n, y]), rev: rotations[clip] };
export const poseAt = keyframer({ tracks, lanes, linear: new Set(['rev']), fixed: { sleep: doze } });
export const crestInBreeze = turnsInBreeze((n) => home[0] + poseAt('trick_b', n / 24).x, 3, 0.39);
const clip = (n: number): Animation => ({ seconds: n / 24 });
const route = (name: string, n: number): Animation => ({
  ...clip(n),
  groundOffset(t) {
    const p = poseAt(name, t);
    return [p.x, p.y];
  },
});
export const clips: Record<string, Animation> = {
  ...everyday,
  prepare_walk: clip(36),
  fidget_a: clip(48),
  fidget_b: clip(50),
  happy: clip(39),
  sleep_in: clip(30),
  sleep_out: clip(30),
  wake_startled: clip(24),
  hatch: route('hatch', 56),
  trick: route('trick', 132),
  trick_b: route('trick_b', 152),
};
