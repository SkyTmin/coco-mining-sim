// Key poses in frames at 24 Hz. Travel is in field pixels, jaw and spine angles are in radians.
// "low" unfolds the upright otter onto all four feet, "pocket" folds the stone under its foreleg.
import { keyframer, type Track } from '../kit/pet-moves';
import { everyday } from '../rig/figure';

export const clips = {
  ...everyday,
  fidget_a: { seconds: 2 },
  fidget_b: { seconds: 2 },
  happy: { seconds: 1.75 },
  hatch: { seconds: 2 },
  trick: { seconds: 4.5 },
  trick_b: { seconds: 4.5 },
  sleep_in: { seconds: 1.25 },
  sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
};
export const beats = {
  trick: { gather: 14, throw: 28, noseCatch: 47, noseThrow: 64, pawCatch: 80, bow: 91 },
  trick_b: { pocket: 9, set: 23, launch: 34, skim: 47, brake: 58, recover: 74, home: 98 },
  hatch: { surface: 10, shake: 25, sit: 37 },
};
export const sleeping = { low: 0.95, curl: 1, pocket: 1, lids: 1, headTurn: 0.58, nod: 0.24, ears: 0.8 };
const bowl = { pawUp: 0.25, nod: 0.22, whisk: 0.35 };
const wash = { pawUp: 0.94, pawsWide: 0.43, pocket: 1, lids: 0.85, nod: 0.17, whisk: 0.9 };
const tucked = { pocket: 1, pawUp: -0.4, ears: 0.6 };
const trot = { ...tucked, low: 0.86, run: 1 };
const skim = { ...tucked, low: 1, glide: 1, nod: -0.26, whisk: -0.8 };
const noseUp = { nod: -0.55, pawUp: 0.26, pawsWide: 0.55, whisk: 0.75 };
const toss = beats.trick, slide = beats.trick_b;

const tracks: Record<string, Track> = {
  look: [[0, {}], [5, { nod: 0.18 }], [8, { headTurn: -0.52, nod: -0.12, whisk: 0.5 }],
    [16, { headTurn: -0.55, nod: -0.15 }], [19, { headTurn: 0.48, tilt: -0.16 }], [27, { headTurn: 0.42, tilt: -0.11 }], [35, {}]],
  fidget_a: [[0, {}], [7, { pocket: 1, nod: 0.12 }], [11, wash], [16, wash],
    [19, { ...wash, pawUp: 0.51, nod: -0.09 }], [23, wash], [27, { ...wash, pawUp: 0.45, tilt: 0.12 }],
    [31, wash], [34, { pocket: 1, whisk: 0.75, ears: 0.6 }], [41, bowl], [47, {}]],
  fidget_b: [[0, {}], [7, bowl], [11, { ...bowl, pawUp: 0.52, rollStone: 1.3 }],
    [17, { ...bowl, pawUp: 0.52, rollStone: 1.3, headTurn: -0.15 }],
    [21, { pawUp: 0.72, nod: 0.32, rollStone: 3.1 }], [29, { pawUp: 0.72, nod: 0.34, rollStone: 3.1 }],
    [34, { ...bowl, tilt: 0.14, rollStone: 4.8 }], [43, { rollStone: Math.PI * 2 }], [47, { rollStone: Math.PI * 2 }]],
  happy: [[0, {}], [5, { low: 0.39, nod: 0.26 }], [8, { jump: 9, pawUp: 0.75, tilt: -0.25, tail: 1.1 }],
    [14, { jump: 5, pawUp: 0.7, tilt: 0.22 }], [17, { low: 0.48, nod: 0.18 }],
    [21, { jump: 5.5, pawUp: 0.44, tilt: 0.23, tail: -0.7 }], [25, { low: 0.28 }], [33, { whisk: 0.5 }], [41, {}]],
  tired: [[0, {}], [9, { nod: 0.18, lids: 0.42 }], [21, { nod: 0.44, lids: 0.8, low: 0.18 }], [27, { nod: -0.1 }], [35, {}]],
  sleep_in: [[0, {}], [6, { pocket: 1, lids: 0.4 }], [11, { ...tucked, low: 0.65, curl: 0.3 }],
    [18, { ...sleeping, curl: 0.87 }], [27, sleeping], [29, sleeping]],
  sleep_out: [[0, sleeping], [6, { ...sleeping, lids: 0.52 }], [9, { ...sleeping, curl: 0.73, nod: -0.3, lids: 0.18 }],
    [16, { ...tucked, low: 0.8, nod: -0.15 }], [21, { pocket: 0.5, pawUp: 0.5 }], [29, {}]],
  wake_startled: [[0, sleeping], [3, { ...sleeping, lids: 0 }], [6, { ...tucked, low: 0.15, jump: 7, pawsWide: 0.8, whisk: 1.1 }],
    [10, { ...tucked, jump: 4.5, tilt: 0.2 }], [13, { low: 0.38, pocket: 0.7 }], [19, bowl], [23, {}]],
  hatch: [[0, { ...tucked, low: 0.7, nod: -0.65, dive: 1, x: 6, y: -2 }],
    [6, { ...tucked, low: 0.7, nod: -0.65, dive: 0.86, x: 6, y: -2 }],
    [beats.hatch.surface, { ...tucked, low: 0.66, nod: -0.58, dive: 0.38, x: 5, y: -1 }], [16, { ...tucked, low: 0.35, nod: -0.3 }],
    [21, { pocket: 1, tilt: -0.35, whisk: 1 }], [25, { pocket: 1, tilt: 0.4, whisk: -0.5 }],
    [28, { pocket: 0.7, tilt: -0.2, whisk: 0.65 }], [37, bowl], [47, {}]],
  trick: [[0, {}], [6, bowl], [10, { ...bowl, low: 0.53, run: 1, x: -8 }], [toss.gather, { ...bowl, low: 0.32, x: -23 }],
    [22, { ...bowl, low: 0.34, x: -23 }], [25, { low: 0.44, x: -25, nod: 0.27 }],
    [toss.throw, { x: -23, jump: 2, pawUp: 0.94, nod: -0.37 }], [32, { x: -20, low: 0.45, pawUp: 0.67, nod: -0.42 }],
    [37, { x: 0, jump: 2.5, low: 0.72, run: 1, nod: -0.57 }],
    [42, { x: 24, ...noseUp, low: 0.25 }], [toss.noseCatch, { ...noseUp, x: 25, nod: -0.35, low: 0.15 }],
    [51, { ...noseUp, x: 24 }], [58, { ...noseUp, tilt: 0.16, x: 24 }], [61, { x: 24, ...noseUp, nod: -0.2, low: 0.18 }],
    [toss.noseThrow, { x: 23, ...noseUp, nod: -0.65, jump: 1.7 }], [70, { x: 4, run: 1, low: 0.46, nod: -0.42, headTurn: -0.23, pawUp: 0.44, present: 0.75 }],
    [75, { x: -8, nod: -0.21, headTurn: -0.22, pawUp: 0.33, present: 1, spread: 1 }],
    [78, { x: -5, nod: 0.07, headTurn: -0.25, pawUp: 0.24, present: 1, spread: 0.75 }], [toss.pawCatch, { x: -2, low: 0.19, nod: 0.19, headTurn: -0.2, pawUp: 0.14, present: 0.95 }],
    [84, { x: -2, low: 0.21, nod: 0.21, pawUp: 0.12, present: 0.92 }],
    [86, { x: -2, ...bowl }], [toss.bow, { low: 0.28, nod: 0.43, whisk: 0.5 }], [97, { ...bowl }], [107, {}]],
  trick_b: [[0, {}], [5, bowl], [slide.pocket, tucked], [14, { ...trot, x: -11, y: -3, turn: 1.35, zoom: -0.13 }],
    [19, { ...trot, x: -31, y: -11, turn: 2.08, zoom: -0.22 }], [slide.set, { ...tucked, x: -34, y: -14, low: 0.89, turn: 0.78, zoom: -0.23 }],
    [29, { ...tucked, x: -27, y: -14, low: 0.88, turn: -0.27, zoom: -0.24 }], [32, { ...trot, x: -25, y: -13, turn: -0.28, zoom: -0.22 }],
    [slide.launch, { ...trot, x: -23, y: -12, jump: 6, turn: -0.28, zoom: -0.2 }], [40, { ...skim, x: 0, y: -1, jump: 8, turn: -0.19, zoom: -0.1 }],
    [slide.skim, { ...skim, x: 21, y: 9, turn: 0.25 }], [53, { ...skim, x: 32, y: 13, turn: 0.52, zoom: 0.09 }],
    [slide.brake, { ...skim, x: 39, y: 14, turn: 0.72, zoom: 0.12, tail: 1.45 }],
    [65, { ...skim, x: 31, y: 14, turn: 1.28, zoom: 0.1, tail: 1.5, nod: -0.4 }],
    [70, { ...tucked, low: 0.6, x: 5, y: 11, turn: 2.3, tail: 0.65 }],
    [slide.recover, { ...trot, x: 4, y: 9, turn: 2.8 }], [83, { ...trot, x: 0, y: 5, turn: 2.82 }],
    [91, { ...trot, x: -6, y: 0, turn: 3.05 }], [slide.home, { ...tucked, x: -2, low: 0.3, turn: 0.75 }],
    [102, bowl], [107, {}]],
};
export const poseAt = keyframer({ tracks, fixed: { sleep: sleeping } });
