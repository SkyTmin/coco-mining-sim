// Key poses in frames at 24 Hz. Travel is in field pixels, jaw and spine angles are in radians.
// "low" unfolds the upright otter onto all four feet, "pocket" folds the stone under its foreleg.
import { keyframer, type Track } from '../kit/pet-moves';
import { everyday } from '../rig/figure';

export const clips = {
  ...everyday,
  fidget_a: { seconds: 3 },
  fidget_b: { seconds: 2 },
  happy: { seconds: 1.75 },
  hatch: { seconds: 3 },
  trick: { seconds: 4.5 },
  trick_b: { seconds: 5.5 },
  sleep_in: { seconds: 1.25 },
  sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
};
export const beats = {
  trick: { gather: 14, throw: 28, noseCatch: 47, noseThrow: 64, pawCatch: 80, bow: 91 },
  trick_b: { pocket: 6, set: 34, launch: 53, skim: 70, brake: 84, recover: 101, home: 123 },
  hatch: { surface: 8, eyes: 15, swim: 24, bank: 45, shake: 59, sit: 67 },
  fidget_a: { stow: 7, rub: 13, slip: 18, land: 26, bounce: 30, rest: 34, reach: 48, catch: 54, lift: 59 },
};
export const sleeping = { low: 0.95, curl: 1, pocket: 1, lids: 1, headTurn: 0.58, nod: 0.24, ears: 0.8 };
const bowl = { pawUp: 0.25, nod: 0.22, whisk: 0.35 };
const wash = { pawUp: 0.96, pawsWide: 0.48, lids: 0.82, nod: 0.16, whisk: 0.92 };
const rub = (stroke: number) => ({ ...wash, stroke, tilt: stroke * 0.12 });
const searching = { low: 0.87, turn: 1.8, headTurn: 0.05, nod: 0.7, lean: 6, whisk: -0.42, fetch: 0.32 };
const cupping = { ...searching, low: 0.94, headTurn: 0.08, nod: 0.57, lean: 7, fetch: 1 };
const submerged = { low: 1, turn: 0.49, periscope: 1, pocket: 1, ears: 1, nod: -1.01, x: 40, y: -38, zoom: -0.19 };
const swimming = { low: 1, turn: 1.75, pocket: 1, ears: 0.8, nod: -0.44, paddle: 1, periscope: 0.78, dive: 0.31, zoom: -0.12 };
const climb = { pocket: 1, low: 0.93, run: 1, tailCarry: 1, turn: 2.76, onBank: 1, incline: 0.23 };
const crest = { pocket: 1, low: 0.7, onBank: 1, x: -44, zoom: -0.45, tailCarry: 0.8 };
const chute = { pocket: 1, low: 1, glide: 1, onBank: 1, bellyTrack: 1, incline: 0.52, turn: -0.42, nod: -0.16 };

const tucked = { pocket: 1, pawUp: -0.4, ears: 0.6 };
const trot = { ...tucked, low: 0.86, run: 1 };
const skim = { ...tucked, low: 1, glide: 1, nod: -0.26, whisk: -0.8 };
const noseUp = { nod: -0.55, pawUp: 0.26, pawsWide: 0.55, whisk: 0.75 };
const toss = beats.trick, slide = beats.trick_b, bath = beats.fidget_a;

const tracks: Record<string, Track> = {
  look: [[0, {}], [5, { nod: 0.18 }], [8, { headTurn: -0.52, nod: -0.12, whisk: 0.5 }],
    [16, { headTurn: -0.55, nod: -0.15 }], [19, { headTurn: 0.48, tilt: -0.16 }], [27, { headTurn: 0.42, tilt: -0.11 }], [35, {}]],
  fidget_a: [[0, {}], [bath.stow, { put: 1, nod: 0.25, headTurn: 0.46 }], [10, { put: 1, nod: 0.23, headTurn: 0.45 }],
    [bath.rub, rub(-0.35)], [bath.slip, rub(0.94)], [22, rub(-0.85)], [26, rub(0.95)], [30, rub(-0.9)],
    [34, rub(1)], [38, rub(-0.95)], [41, rub(0.48)], [44, { pawUp: 0.49, headTurn: 0.22, turn: 0.47, low: 0.23, nod: 0.49 }],
    [bath.reach, searching], [bath.catch, cupping], [bath.lift, cupping],
    [63, { low: 0.42, turn: 0.85, headTurn: 0.13, nod: 0.35, fetch: 0.42, lean: 3.9 }], [67, bowl], [71, {}]],
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
  hatch: [[0, { ...submerged, dive: 0.95 }], [4, { ...submerged, dive: 0.8 }],
    [beats.hatch.surface, { ...submerged, dive: 0.625 }], [11, { ...submerged, dive: 0.605 }],
    [beats.hatch.eyes, { ...submerged, dive: 0.405, nod: -0.19 }], [19, { ...submerged, dive: 0.365, nod: -0.16 }],
    [beats.hatch.swim, { ...swimming, turn: 1.12 }],
    [32, { ...swimming, turn: 1.32, dive: 0.33 }], [39, { ...swimming, turn: 1.52, dive: 0.28 }],
    [beats.hatch.bank, { ...swimming, x: 4, y: -4, dive: 0.14, periscope: 0.44, haul: 0.85, nod: -0.25 }],
    [50, { ...swimming, x: 0, y: 0, dive: 0, periscope: 0, haul: 1, nod: -0.18, zoom: 0 }],
    [55, { pocket: 1, turn: 1.08, low: 0.48, whisk: 1 }], [58, { pocket: 1, tilt: -0.28 }],
    [beats.hatch.shake, { pocket: 1, tilt: -0.34 }], [62, { pocket: 0.7, tilt: 0.32, whisk: -0.65 }],
    [65, { pocket: 0.35, tilt: -0.14, whisk: 0.72 }], [beats.hatch.sit, bowl], [71, {}]],
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
  trick_b: [[0, {}], [slide.pocket, tucked], [11, { ...trot, x: -1, y: -1, turn: 2.7, tailCarry: 1 }],
    [16, { ...climb, x: -3, zoom: -0.22 }], [26, { ...climb, x: -28, zoom: -0.36 }],
    [slide.set, { ...crest, turn: 2.74 }], [39, { ...crest, turn: 2.75, nod: -0.37 }],
    [44, { ...crest, turn: -0.2, headTurn: 0.12, nod: 0.29 }], [48, { ...crest, turn: -0.3, nod: 0.43 }],
    [slide.launch, { ...chute, x: -42, zoom: -0.44, incline: 0.12, tailCarry: 1 }], [58, { ...chute, x: -37, zoom: -0.4, incline: 0.35, tailCarry: 0.5 }],
    [65, { ...chute, x: -12, zoom: -0.23 }], [slide.skim, { ...chute, x: 12, zoom: -0.12, incline: 0.16 }],
    [75, { ...skim, x: 28, y: 8, turn: 0.16 }], [80, { ...skim, x: 37, y: 13, turn: 0.6, zoom: 0.1 }],
    [slide.brake, { ...skim, x: 39, y: 14, turn: 0.72, zoom: 0.12, tail: 1.45 }],
    [91, { ...skim, x: 31, y: 14, turn: 1.28, zoom: 0.1, tail: 1.5, nod: -0.4 }],
    [96, { ...tucked, low: 0.6, x: 10, y: 11, turn: 2.3, tail: 0.65 }],
    [slide.recover, { ...trot, x: 4, y: 9, turn: 2.8 }], [109, { ...trot, x: 0, y: 5, turn: 2.82 }],
    [117, { ...trot, x: -6, turn: 3.05 }], [slide.home, { ...tucked, x: -2, low: 0.3, turn: 0.75 }],
    [127, bowl], [131, {}]],
};
export const poseAt = keyframer({
  tracks, fixed: { sleep: sleeping },
  lanes: { hatch: {
    guide: [[19, 0], [23, 1], [50, 1], [55, 0]],
    shoreX: [[19, 128], [24, 122], [32, 114], [39, 101], [45, 79], [50, 56]],
    shoreY: [[19, 75], [24, 80], [32, 92], [39, 102], [45, 106], [50, 100]],
  } },
});
