import { keyframer, type Lane, type Track } from '../kit/pet-moves';
import { everyday } from '../rig/figure';
import type { Animation, XY } from '../types';
import { bellPivot } from '../scenes/bell_courtyard';

export const home: XY = [70, 98];
export const ring = { notice: 10, seize: 39, pull: 48, release: 61, clear: 69 };
export const bath = { land: 31, strokes: [41, 51, 66, 75], leap: 86, rail: 99, shake: 107, leave: 118 };
export const walking = { low: 0.18, lean: 0.7, tail: 0.13 };
const asleep = { low: 0.9, nod: 0.58, neck: -0.9, headTurn: 1.03, lids: 1, tail: 0.3 };
const preen = { groom: 1, headTurn: 2.12, nod: 0.28, neck: -0.62, wing: 0.24, low: 0.22 };
const fan = { turn: 0.81, tail: -0.34, fan: 1, spread: 0.12, headTurn: -0.74 };
const watch = { nod: -0.5, neck: 0.54, headTurn: -0.27, tail: 0.18 };
const ready = { ...watch, low: 0.8, wing: 0.3, tail: 0.4 };
const grip = { headTurn: -0.24, nod: -0.43, neck: 0.68, tuck: 0.86, wing: 0.88, tail: 0.22 };
const settle = { low: 0.59, wing: 0.61, tail: -0.2 };
const left = { turn: 2.33, headTurn: 0.15 };
const sand = { ...left, low: 1.02, nod: 0.09, tail: -0.32, neck: -0.72 };
const perch = { turn: 0.17, low: 0.27, tail: -0.17, grip: 0.9 };

const tracks: Record<string, Track> = {
  look: [
    [0, {}],
    [5, { headTurn: -0.52, tilt: -0.28, neck: 0.55 }],
    [13, { headTurn: -0.52, tilt: -0.28, neck: 0.55 }],
    [16, { headTurn: 0.78, tilt: 0.31 }],
    [26, { headTurn: 0.78, tilt: 0.31 }],
    [35, {}],
  ],
  prepare_walk: [
    [0, {}],
    [5, { low: 0.27, tail: -0.16 }],
    [11, walking],
    [17, walking],
  ],
  fidget_a: [
    [0, {}],
    [6, { headTurn: 0.75, wing: 0.12 }],
    [12, preen],
    [15, { ...preen, comb: 1, open: 0.24 }],
    [20, preen],
    [24, { ...preen, comb: 1, open: 0.24 }],
    [29, preen],
    [34, { headTurn: 0.7, wing: 0.32 }],
    [39, { wing: 0.08 }],
    [47, {}],
  ],
  fidget_b: [
    [0, {}],
    [9, { turn: 0.58, headTurn: -0.38 }],
    [15, { ...fan, fan: 0.08 }],
    [20, fan],
    [33, fan],
    [38, { ...fan, fan: 0.64, tail: -0.16 }],
    [44, { turn: 0.44, fan: 0.12 }],
    [53, {}],
  ],
  happy: [
    [0, {}],
    [5, { low: 0.65, neck: -0.3 }],
    [10, { alt: 11, wing: 0.86, tuck: 0.8, open: 0.38, fan: 0.4 }],
    [14, { alt: 13, wing: 0.5, open: 0.6, tuck: 0.5 }],
    [20, { low: 0.58, wing: 0.46 }],
    [26, { headTurn: 0.32, nod: -0.18, open: 0.5 }],
    [30, { headTurn: 0.32, nod: -0.18 }],
    [38, {}],
  ],
  tired: [
    [0, {}],
    [10, { low: 0.44, lids: 0.44 }],
    [20, { low: 0.67, nod: 0.43, lids: 0.8 }],
    [25, { low: 0.2, nod: -0.1 }],
    [35, {}],
  ],
  sleep_in: [
    [0, {}],
    [6, { low: 0.22, nod: -0.24, open: 0.7 }],
    [11, { low: 0.37, open: 0.22 }],
    [19, { ...asleep, lids: 0.59 }],
    [27, asleep],
    [29, asleep],
  ],
  sleep_out: [
    [0, asleep],
    [6, { ...asleep, lids: 0 }],
    [14, { low: 0.5, nod: -0.24, wing: 0.36, neck: 0.56 }],
    [20, { wing: 0.24, neck: 0.55 }],
    [29, {}],
  ],
  wake_startled: [
    [0, asleep],
    [4, { ...asleep, lids: 0 }],
    [8, { wing: 0.8, alt: 7, tuck: 0.65, neck: 0.72, open: 0.6 }],
    [14, { low: 0.54, wing: 0.44 }],
    [23, {}],
  ],
  hatch: [
    [0, { alt: 28, wing: 0.84, tuck: 1 }],
    [10, { alt: 33, wing: 1, tuck: 0.86, tail: -0.14 }],
    [20, { alt: 23, wing: 0.9, tuck: 0.68 }],
    [28, { alt: 9, wing: 0.94, fan: 0.54 }],
    [32, settle],
    [38, { low: 0.14, wing: 0.16 }],
    [45, { headTurn: 0.51 }],
    [55, {}],
  ],
  trick: [
    [0, {}],
    [6, {}],
    [10, { headTurn: -0.23, nod: -0.21 }],
    [15, watch],
    [21, watch],
    [26, ready],
    [31, { ...grip, alt: 14, wing: 1 }],
    [36, { ...grip, alt: 22, open: 0.85 }],
    [38, { ...grip, alt: 22, open: 0.42 }],
    [39, { ...grip, alt: 21 }],
    [44, { ...grip, alt: 19 }],
    [48, { ...grip, nod: -0.18, neck: 0.22, tuck: 0.72, alt: 14, wing: 0.58, tail: -0.13 }],
    [54, { ...grip, nod: -0.16, neck: 0.15, tuck: 0.72, alt: 11, wing: 0.36, tail: -0.29 }],
    [60, { ...grip, nod: -0.16, neck: 0.15, tuck: 0.72, alt: 11, wing: 0.5, tail: -0.24 }],
    [61, { ...grip, alt: 12, wing: 0.74, open: 0.75 }],
    [65, { turn: -0.58, alt: 25, wing: 1, tuck: 0.9, tail: 0.18, open: 0.48 }],
    [73, { turn: -1.68, alt: 16, wing: 0.94, tuck: 0.84, tail: 0.12 }],
    [82, { turn: -2.78, alt: 18, wing: 1, tuck: 0.62, fan: 0.3 }],
    [90, { turn: -2.47, alt: 5, wing: 0.9, fan: 0.54 }],
    [93, { ...settle, turn: -1.92 }],
    [102, { low: 0.21, turn: -1.08, headTurn: 0.85, nod: -0.27 }],
    [109, { turn: -0.17, nod: -0.3, headTurn: 0.43 }],
    [117, { nod: -0.23, neck: 0.39 }],
    [126, {}],
    [133, {}],
  ],
  trick_b: [
    [0, {}],
    [6, { headTurn: 1.1, tilt: 0.26 }],
    [14, { turn: 1.47, headTurn: 0.62, nod: 0.29 }],
    [19, { ...left, low: 0.65 }],
    [24, { ...left, wing: 0.6, alt: 6, tuck: 0.58 }],
    [29, { ...left, alt: 3, wing: 0.48 }],
    [31, { ...left, low: 0.56, nod: 0.42 }],
    [35, { ...sand, nod: 0.6 }],
    [38, { ...sand, bank: 0.53, scoop: 0.25 }],
    [41, { ...sand, bank: 0.63, scoop: 1 }],
    [45, { ...sand, bank: 0.51, scoop: 0.3 }],
    [48, { ...sand, bank: 0.52, scoop: 0.17 }],
    [51, { ...sand, bank: 0.66, scoop: 1 }],
    [55, { ...sand, bank: 0.42, scoop: 0.28 }],
    [59, { turn: 1.3, low: 0.52, nod: -0.18 }],
    [63, { ...sand, turn: 0.13, low: 0.84, bank: -0.48, scoop: -0.24 }],
    [66, { ...sand, turn: 0.04, bank: -0.59, scoop: -1 }],
    [70, { ...sand, turn: 0.06, bank: -0.48, scoop: -0.22 }],
    [75, { ...sand, turn: 0.04, bank: -0.65, scoop: -1 }],
    [80, { ...sand, turn: 0.2, bank: -0.22 }],
    [86, { turn: 1.06, low: 0.77, wing: 0.31, headTurn: -0.15 }],
    [91, { turn: 0.68, wing: 1, alt: 21, tuck: 0.9, fan: 0.44 }],
    [95, { turn: 0.29, alt: 13, wing: 0.91, tuck: 0.32, fan: 0.68 }],
    [99, { ...perch, low: 0.63, wing: 0.58, fan: 0.35 }],
    [104, perch],
    [107, { ...perch, shake: 1, wing: 0.26 }],
    [112, { ...perch, shake: 0.8, wing: 0.18 }],
    [115, perch],
    [118, { ...perch, low: 0.67, wing: 0.35 }],
    [123, { turn: -1.35, alt: 15, wing: 0.86, tuck: 0.66 }],
    [131, { turn: -0.87, alt: 4, wing: 0.83, fan: 0.48 }],
    [134, { ...settle, turn: -0.46 }],
    [142, { headTurn: 0.24 }],
    [149, {}],
  ],
};
type Path = [number, number, number][];
const routes: Record<string, Path> = {
  hatch: [
    [0, -94, -15],
    [8, -77, -12],
    [18, -43, -7],
    [28, -8, -1],
    [32, 0, 0],
    [55, 0, 0],
  ],
  trick: [
    [0, 0, 0],
    [21, 0, 0],
    [26, -5, 0],
    [32, 9, -1],
    [38, 24, -2],
    [54, 26, -1],
    [61, 25, -1],
    [70, 32, -2],
    [79, 4, 3],
    [90, -18, -3],
    [98, -17, -2],
    [110, -7, -1],
    [121, 0, 0],
    [133, 0, 0],
  ],
  trick_b: [
    [0, 0, 0],
    [14, 0, 0],
    [19, -3, 0],
    [29, -20, -1],
    [34, -22, -1],
    [55, -22, -1],
    [63, -12, -1],
    [80, -12, -1],
    [86, -20, -1],
    [96, 14, 24],
    [99, 23, 28],
    [118, 23, 28],
    [122, 17, 24],
    [130, 3, 5],
    [134, 0, 0],
    [149, 0, 0],
  ],
};
const lanes: Record<string, Record<string, Lane>> = {};
for (const [name, path] of Object.entries(routes))
  lanes[name] = { x: path.map(([f, x]) => [f, x]), y: path.map(([f, , y]) => [f, y]) };
export const poseAt = keyframer({ tracks, lanes, fixed: { sleep: asleep } });
const clip = (count: number): Animation => ({ seconds: count / 24 });
const journey = (name: string, count: number): Animation => ({
  ...clip(count),
  groundOffset(t) {
    const q = poseAt(name, t);
    return [q.x, q.y];
  },
});
export const clips: Record<string, Animation> = {
  ...everyday,
  prepare_walk: clip(36),
  fidget_a: clip(48),
  fidget_b: clip(54),
  happy: clip(39),
  sleep_in: clip(30),
  sleep_out: clip(30),
  wake_startled: clip(24),
  hatch: journey('hatch', 56),
  trick: journey('trick', 134),
  trick_b: journey('trick_b', 150),
};

const sampleBell = keyframer({
  tracks: {
    ring: [
      [0, {}],
      [4, {}],
      [9, { sway: 0.22 }],
      [15, { sway: -0.12 }],
      [22, { sway: 0.07 }],
      [32, {}],
      [39, {}],
      [43, {}],
      [48, { angle: -0.34, sway: -0.15, clap: 0.23 }],
      [54, { angle: -0.7, sway: -0.24, clap: 0.63 }],
      [60, { angle: -0.71, sway: -0.25, clap: 0.57 }],
      [61, { angle: -0.71, sway: -0.25, clap: 0.57 }],
    ],
  },
});
export function bellAt(n: number) {
  const p = sampleBell('ring', n / 24);
  let angle = p.angle ?? 0,
    sway = p.sway ?? 0,
    clap = p.clap ?? 0;
  if (n > 61) {
    const d = n - 61,
      fade = Math.exp(-d / 22) * Math.min(1, Math.max(0, (68 - d) / 12));
    angle = -0.71 * fade * Math.cos(d * 0.26);
    sway = -0.25 * fade * Math.cos(d * 0.33);
    clap = 0.57 * fade * Math.cos(d * 0.33);
  }
  const part = (x: number, y: number): XY => [
    bellPivot[0] + x * Math.cos(angle) - y * Math.sin(angle),
    bellPivot[1] + x * Math.sin(angle) + y * Math.cos(angle),
  ];
  const tie = part(-15, 1);
  const knot: XY = [tie[0] + 25 * Math.sin(sway), tie[1] + 25 * Math.cos(sway)];
  return { angle, sway, clap, part, tie, knot };
}
