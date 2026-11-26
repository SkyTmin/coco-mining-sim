import { keyframer, type Lane, type Track } from '../kit/pet-moves';
import { everyday } from '../rig/figure';
import type { Animation, XY } from '../types';

export const home: XY = [80, 128 * 0.76];
export const seedContact: XY = [145, 40];
export const seedBeat = { notice: 10, aim: 23, touch: 41, retract: 47, lip: 53, release: 76 };
export const birdBeat = { notice: 12, dash: 25, hide: 48, clear: 67, peek: 74, rail: 100 };
const sleep = { low: 0.92, tuck: 1, nod: 0.38, lids: 1, turnHead: 0.22 };
const travel = { low: 0.3, loose: 0.62 };
export const walkingStance = { low: 0.3, unroll: 1 };
const aim = { ...travel, turn: -0.44, turnHead: -0.1, nod: -0.35, focus: 1 };
const lip = { turn: -0.37, turnHead: 0.02, nod: -0.21, focus: -0.8, open: 0.42, low: 0.13 };
const watch = { turnHead: -0.34, nod: -0.61, focus: 1, up: 1 };
const hide = { low: 0.94, tuck: 0.8, turn: 2.52, nod: 0.24, lids: 0.36, shade: 1 };
const peep = { low: 0.83, tuck: 0.68, turn: -0.03, turnHead: -0.27, nod: -0.46, up: 1, shade: 0.67, peek: 1 };
const jog = { low: 0.46, loose: 0.8 };
const rub = { weight: -1.16, nod: 0.26, turnHead: 0.24, lift: 1, lids: 0.57 };
const tracks: Record<string, Track> = {
  look: [
    [0, {}],
    [5, { scout: 1 }],
    [12, { scout: 1 }],
    [15, { turnHead: 0.65, nod: -0.22, focus: 1 }],
    [24, { turnHead: 0.56, nod: -0.18, focus: 1 }],
    [35, {}],
  ],
  prepare_walk: [
    [0, {}],
    [3, { lean: -0.45, unroll: 0.12 }],
    [7, { lean: 0.18, low: 0.14, unroll: 0.46 }],
    [13, walkingStance],
    [17, walkingStance],
  ],
  fidget_a: [
    [0, {}],
    [6, { scout: -1, turnHead: -0.13 }],
    [15, { scout: -1, turnHead: -0.12 }],
    [18, { scout: -1, up: 1, nod: -0.41, turnHead: -0.63 }],
    [27, { scout: -1, up: 1, nod: -0.43, turnHead: -0.62 }],
    [30, { scout: 0.95, up: 0.5, nod: -0.41, turnHead: -0.52 }],
    [34, { scout: 1, turnHead: 0.76, nod: 0.15 }],
    [43, { scout: 1, turnHead: 0.68, nod: 0.14 }],
    [51, { lids: 0.9 }],
    [59, {}],
  ],
  fidget_b: [
    [0, {}],
    [7, { weight: -1.16, nod: 0.16 }],
    [13, rub],
    [17, { ...rub, stroke: 1 }],
    [20, rub],
    [24, { ...rub, stroke: 1 }],
    [29, { ...rub, stroke: 1, lids: 0.9 }],
    [32, { ...rub, stroke: 0.3, lids: 0.2 }],
    [38, { weight: -1.16, nod: 0.12 }],
    [47, {}],
  ],
  happy: [
    [0, {}],
    [6, { low: 0.42, nod: 0.2 }],
    [10, { lean: 1, lift: 0.8, weight: -1.2, nod: -0.39, open: 0.62, tuck: 0.8 }],
    [15, { lean: 0.6, lift: 0.83, weight: -1.2, nod: -0.27, open: 0.4, tuck: 1 }],
    [20, { lean: -0.6, lift: 0.8, weight: -1.2, nod: -0.16, stroke: 1 }],
    [26, { low: 0.34 }],
    [35, {}],
  ],
  tired: [
    [0, {}],
    [12, { low: 0.38, nod: 0.24, lids: 0.43 }],
    [21, { low: 0.7, nod: 0.38, lids: 0.82 }],
    [26, { low: 0.24, nod: -0.18, lids: 0.1 }],
    [35, {}],
  ],
  sleep_in: [
    [0, {}],
    [6, { low: 0.16, lids: 0.35 }],
    [13, { low: 0.6, tuck: 0.6, nod: 0.29 }],
    [21, sleep],
    [29, sleep],
  ],
  sleep_out: [
    [0, sleep],
    [6, { ...sleep, lids: 0.34 }],
    [10, { ...sleep, nod: -0.15, lids: 0.04 }],
    [18, { low: 0.44, tuck: 0.45, nod: -0.21 }],
    [29, {}],
  ],
  wake_startled: [
    [0, sleep],
    [3, { ...sleep, lids: 0 }],
    [7, { nod: -0.48, lean: -1.2, open: 0.69, tuck: 0.71 }],
    [14, { low: 0.32, nod: -0.26, tuck: 0.5 }],
    [23, {}],
  ],
  hatch: [
    [0, { ...jog, turn: -0.67, nod: 0.16 }],
    [7, { ...jog, turn: -0.73 }],
    [15, { ...jog, turn: -0.71, up: 0.8, nod: -0.37 }],
    [21, { ...jog, turn: -0.67, up: 0.6, nod: -0.34 }],
    [28, { ...jog, turn: -0.72 }],
    [40, { ...jog, turn: -0.62 }],
    [46, { ...travel, turn: -0.49 }],
    [55, { turn: -0.09, tuck: 0.25 }],
    [63, {}],
  ],
  trick: [
    [0, {}],
    [6, {}],
    [10, { scout: 1, up: 0.84 }],
    [16, { scout: 1, up: 0.86, turnHead: -0.29, nod: -0.31 }],
    [21, { ...aim, lean: -0.48 }],
    [25, aim],
    [32, { ...aim, lean: 1.3 }],
    [36, { ...aim, lean: -0.5, low: 0.5, nod: -0.58, open: 0.58 }],
    [38, { ...aim, lean: -0.6, low: 0.52, nod: -0.7, open: 0.93 }],
    [41, { ...aim, open: 0.96, nod: -0.72, lean: 1.95, shot: 1 }],
    [47, { ...aim, open: 0.96, nod: -0.72, lean: 1.91, shot: 1 }],
    [53, { ...lip, shot: 0.115 }],
    [56, { ...lip, shot: 0.115, lean: -0.95 }],
    [64, { ...lip, shot: 0.115, lean: -0.95 }],
    [68, { ...lip, shot: 0.115, turnHead: -0.24, lean: -1.4 }],
    [73, { ...lip, shot: 0.115, turnHead: -0.23, lean: -1.45 }],
    [76, { ...lip, open: 0.94, shot: 0.24, turnHead: 0.1, lean: 2.2, nod: -0.49 }],
    [79, { ...lip, nod: -0.38, lean: 1.7, focus: 1, open: 0.7 }],
    [88, { ...travel, turn: -0.64, nod: -0.32, turnHead: -0.14, up: 0.85 }],
    [96, { ...travel, turn: -0.64, nod: -0.31, up: 0.74 }],
    [103, { ...travel, turn: 2.7 }],
    [114, { ...travel, turn: 2.69 }],
    [122, { turn: 0.45 }],
    [127, {}],
  ],
  trick_b: [
    [0, {}],
    [9, {}],
    [12, { scout: 1, up: 0.9 }],
    [16, watch],
    [22, { ...watch, low: 0.2 }],
    [25, { ...jog, turn: 1.8, turnHead: 0.43 }],
    [30, { ...jog, turn: 2.32 }],
    [39, { ...jog, turn: 2.43, shade: 0.6 }],
    [48, hide],
    [55, hide],
    [64, { ...hide, turn: 1.58 }],
    [68, { ...hide, turn: 0.03 }],
    [74, peep],
    [81, peep],
    [85, { ...jog, turn: -0.12, nod: -0.13 }],
    [92, { ...jog, turn: 0.12 }],
    [97, { ...jog, turn: 0.43 }],
    [100, { ...jog, turn: 0.48, lean: 1.85, low: 0.58 }],
    [104, { low: 0.5, turn: 0.68, lean: -0.7 }],
    [111, { ...jog, turn: 3.92 }],
    [120, { ...jog, turn: 4.39 }],
    [126, { ...travel, turn: 5.65 }],
    [133, { turn: Math.PI * 2 }],
  ],
};
type Path = [number, number, number][];
const paths: Record<string, Path> = {
  hatch: [
    [0, -100, 5],
    [6, -79, 5],
    [14, -62, 4],
    [20, -62, 4],
    [29, -42, 1],
    [43, -9, -1],
    [51, 0, 0],
    [63, 0, 0],
  ],
  trick: [
    [0, 0, 0],
    [16, 0, 0],
    [21, -3, 0],
    [27, 1, -1],
    [33, 6, -2],
    [38, 3, -2],
    [47, 3, -2],
    [54, 3, -2],
    [73, 3, -2],
    [76, 4, -2],
    [89, 20, -5],
    [97, 20, -5],
    [103, 19, -5],
    [116, 0, 0],
    [127, 0, 0],
  ],
  trick_b: [
    [0, 0, 0],
    [22, 0, 0],
    [25, -2, 1],
    [31, -19, 4],
    [40, -44, 8],
    [48, -77, 6],
    [67, -77, 6],
    [74, -50, 7],
    [81, -49, 8],
    [88, -28, 15],
    [98, -1, 26],
    [101, 2, 27],
    [108, 2, 27],
    [119, -5, 7],
    [124, 0, 0],
    [133, 0, 0],
  ],
};
const lanes: Record<string, Record<string, Lane>> = {};
for (const [clip, path] of Object.entries(paths))
  lanes[clip] = { x: path.map(([f, x]) => [f, x]), y: path.map(([f, , y]) => [f, y]) };
export const poseAt = keyframer({ tracks, lanes, fixed: { sleep } });
function moving(clip: string, frames: number): Animation {
  return {
    seconds: frames / 24,
    groundOffset(t): XY {
      const p = poseAt(clip, t);
      return [p.x, p.y];
    },
  };
}
export const clips: Record<string, Animation> = {
  ...everyday,
  prepare_walk: { seconds: 1.5 },
  fidget_a: { seconds: 2.5 },
  fidget_b: { seconds: 2 },
  happy: { seconds: 1.5 },
  sleep_in: { seconds: 1.25 },
  sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
  hatch: moving('hatch', 64),
  trick: moving('trick', 128),
  trick_b: moving('trick_b', 134),
};
