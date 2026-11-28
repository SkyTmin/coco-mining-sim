// Distances are measured on the nursery floor; height follows the arc above it.
import { keyframer, type Track } from '../kit/pet-moves';
import { everyday } from '../rig/figure';
import type { Animation, XY } from '../types';

export const home: XY = [68, 100];
export const hug = { grasp: 46, lift: 54, cheek: 65, lower: 84, rest: 96, release: 103 };
export const visit = {
  leave: 16,
  rounds: [
    { hide: 38, peek: 61, open: 84 },
    { hide: 105, peek: 130, open: 153 },
    { hide: 176, peek: 195, open: 214 },
  ],
  nose: 235,
  farewell: 255,
  home: 279,
  end: 287,
};
const doze = { low: 1, nod: 0.42, lids: 1, snuggle: 1, droop: 0.74, tilt: 0.19 };
const welcome = { grin: 0.92, wave: 1, ears: 0.15 };
const grooming = { yaw: 0.19, nod: 0.22, low: 0.14, grin: 0.82 };
const groomRight = { ...grooming, brushR: 1, lidR: 0.72, head: 0.08, tilt: 0.04 };
const groomLeft = { ...grooming, brushL: 1, lidL: 0.72, head: -0.14, tilt: -0.06 };
const seek = { yaw: -0.72, glance: 1, nod: 0.05, ears: 0.36 };
const hold = { yaw: 0.43, head: -0.48, reach: 1, grin: 0.6 };
const cuddle = { ...hold, reach: 1, lidL: 1, lidR: 1, grin: 1, tilt: 0.13, nest: 1, rise: 1.1 };
const curious = { yaw: 0.19, head: 0.42, glance: -0.9, nod: -0.18, ears: 0.68 };
const hiding = { yaw: 0.16, head: 0.08, low: 0.52, huddle: 1, coverL: 1, coverR: 1, droop: 0.52 };
const peekLeft = { ...hiding, coverL: 0, huddle: 0.78, tilt: 0.13, grin: 0.73, glance: 0.9, head: -0.06 };
const peekRight = { ...hiding, coverR: 0, huddle: 0.78, tilt: -0.16, grin: 0.72, glance: -0.9, head: 0.18 };
const found = { yaw: 0.2, head: 0.4, nod: -0.1, open: 0.7, grin: 1, ears: 0.65 };
const [first, second, third] = visit.rounds;
const watch = { yaw: 1.2, head: 0.21, gazeUp: 1, nod: -0.12, grin: 0.43, ears: 0.77 };
const stride = { aheadR: 1.5, aheadL: -1.5 };
const tracks: Record<string, Track> = {
  look: [
    [0, {}],
    [6, { head: -0.61, ears: 0.46, glance: 0.9, nod: -0.12 }],
    [14, { head: -0.61, ears: 0.46, glance: 0.9, nod: -0.12 }],
    [21, { head: 0.59, tilt: -0.18, glance: -1 }],
    [29, { head: 0.59, tilt: -0.18, glance: -1 }],
    [35, {}],
  ],
  prepare_walk: [
    [0, {}],
    [4, { shift: -0.65, liftR: 2 }],
    [9, { aheadR: 1.5, liftR: 1.4, shift: -0.7 }],
    [13, { aheadR: 1.5, shift: 0.6, liftL: 1.5 }],
    [17, stride],
    [18, stride],
    [22, { aheadR: 1.5, shift: 0.75, liftL: 2 }],
    [27, { aheadR: 1.5 }],
    [30, { liftR: 1.5, shift: -0.6 }],
    [35, {}],
  ],
  fidget_a: [
    [0, {}],
    [5, { grin: 0.4 }],
    [11, { ...welcome, wiggle: -1 }],
    [16, { ...welcome, wiggle: 1 }],
    [21, { ...welcome, wiggle: -1 }],
    [26, { ...welcome, wiggle: 1 }],
    [31, { ...welcome, wiggle: -0.8 }],
    [36, { wave: 0.6, grin: 0.75 }],
    [43, {}],
  ],
  fidget_b: [
    [0, {}],
    [5, { ...grooming, brushR: 0.35, stroke: -1 }],
    [8, { ...groomRight, stroke: -1 }],
    [12, { ...groomRight, stroke: 1 }],
    [16, { ...groomRight, stroke: -0.88 }],
    [20, { ...groomRight, stroke: 1 }],
    [23, { ...groomRight, stroke: 1 }],
    [28, { ...groomLeft, stroke: -1 }],
    [32, { ...groomLeft, stroke: 1 }],
    [36, { ...groomLeft, stroke: -0.88 }],
    [40, { ...groomLeft, stroke: 1 }],
    [42, { ...groomLeft, stroke: 1 }],
    [47, {}],
  ],
  happy: [
    [0, {}],
    [5, { low: 0.74, shy: 0.38 }],
    [11, { open: 1, grin: 1, tuck: 1, ears: 0.8 }],
    [16, { open: 0.67, grin: 1, low: 0.57 }],
    [22, { open: 0.88, grin: 1, tuck: 0.8, tilt: 0.21 }],
    [29, { low: 0.35, grin: 0.7 }],
    [38, {}],
  ],
  tired: [
    [0, {}],
    [10, { low: 0.42, nod: 0.2, lids: 0.57, droop: 0.48 }],
    [25, { low: 0.58, nod: 0.26, lids: 0.81, droop: 0.59 }],
    [35, {}],
  ],
  sleep_in: [
    [0, {}],
    [7, { low: 0.27, droop: 0.32, lids: 0.43 }],
    [15, { ...doze, snuggle: 0.65, lids: 0.72 }],
    [29, doze],
  ],
  sleep_out: [
    [0, doze],
    [8, { ...doze, lids: 0.4 }],
    [16, { low: 0.45, open: 0.54, ears: 0.55, nod: -0.16 }],
    [29, {}],
  ],
  wake_startled: [
    [0, doze],
    [5, { low: 0.42, ears: 1, head: -0.13 }],
    [9, { open: 0.72, tuck: 0.56, grin: 0.23 }],
    [15, { low: 0.36, ears: 0.38, grin: 0.6 }],
    [23, {}],
  ],
  hatch: [
    [0, { low: 0.5, yaw: -0.68 }],
    [9, { tuck: 0.72, yaw: -0.63, ears: 0.66 }],
    [18, { low: 0.64, yaw: -0.53 }],
    [26, { tuck: 0.85, yaw: -0.38, open: 0.58 }],
    [34, { low: 0.53, grin: 0.77 }],
    [40, { ...welcome, wiggle: -1 }],
    [45, { ...welcome, wiggle: 1 }],
    [55, {}],
  ],
  trick: [
    [0, {}],
    [7, { head: -0.55, glance: 0.86, ears: 0.55 }],
    [14, seek],
    [19, { ...seek, low: 0.62 }],
    [24, { ...seek, tuck: 0.8, open: 0.52 }],
    [30, { ...seek, low: 0.55 }],
    [36, { ...seek, tuck: 0.8, open: 0.8 }],
    [41, { ...seek, low: 0.42, reach: 0.36 }],
    [hug.grasp, hold],
    [hug.lift, hold],
    [hug.cheek, cuddle],
    [73, { ...cuddle, nod: 0.12 }],
    [80, cuddle],
    [hug.lower, { ...hold, grin: 0.7, tilt: 0.03, rise: 1 }],
    [hug.rest, { ...hold, nod: 0.15 }],
    [hug.release, { yaw: -0.62, head: -0.11, open: 0.21, grin: 0.86 }],
    [109, { yaw: -0.42, low: 0.58, grin: 0.85 }],
    [115, { tuck: 0.8, open: 0.6, grin: 0.82 }],
    [121, { low: 0.48, grin: 0.68 }],
    [127, { tuck: 0.6, grin: 0.68 }],
    [132, { low: 0.35, grin: 0.44 }],
    [139, {}],
  ],
  trick_b: [
    [0, {}],
    [7, { head: 0.26, glance: -0.75, ears: 0.43 }],
    [15, curious],
    [23, { ...curious, head: 0.62 }],
    [31, { ...curious, low: 0.34, shy: 0.33 }],
    [first.hide, hiding],
    [first.peek - 7, hiding],
    [first.peek, peekRight],
    [first.open - 6, peekRight],
    [first.open, found],
    [second.hide - 8, found],
    [second.hide, hiding],
    [second.peek - 7, hiding],
    [second.peek, peekLeft],
    [second.open - 6, peekLeft],
    [second.open, { ...found, yaw: -0.03, head: -0.49, glance: 1, tilt: -0.12 }],
    [third.hide - 8, { ...found, yaw: -0.03, head: -0.49, glance: 1, tilt: -0.12 }],
    [third.hide, { ...hiding, droop: 0.65 }],
    [third.peek - 6, { ...hiding, droop: 0.65 }],
    [third.peek, peekRight],
    [third.open - 6, peekRight],
    [third.open, { ...found, open: 1, ears: 0.9 }],
    [third.open + 7, { ...found, open: 1, ears: 0.9 }],
    [visit.nose - 3, watch],
    [visit.nose, { ...watch, lidR: 0.54 }],
    [visit.farewell - 5, { ...watch, lidR: 0.46, grin: 0.95 }],
    [visit.farewell, { ...watch, lidR: 0.46, grin: 0.88 }],
    [visit.farewell + 7, { yaw: 0.96, head: 0.07, wave: 1, wiggle: -0.8, grin: 0.93 }],
    [visit.farewell + 12, { yaw: 0.9, head: 0.03, wave: 1, wiggle: 1, grin: 0.93 }],
    [visit.farewell + 17, { yaw: 0.73, head: 0.08, wave: 1, wiggle: -0.8, grin: 0.81 }],
    [visit.home, { yaw: 0.36, head: 0.14, ears: 0.25, grin: 0.6 }],
    [visit.end, {}],
  ],
};
const sample = keyframer({ tracks, fixed: { sleep: doze } });
type Hop = [number, number, number, number];
const hops: Record<string, Hop[]> = {
  happy: [
    [5, 16, 0, 13],
    [17, 28, 0, 8],
  ],
  wake_startled: [[5, 14, 0, 5]],
  hatch: [
    [0, 18, 24, 18],
    [19, 34, 21, 12],
  ],
  trick: [
    [19, 30, 29, 9],
    [30, 41, 28, 11],
    [109, 121, -28, 11],
    [121, 132, -29, 9],
  ],
};
export function poseAt(anim: string, t: number) {
  const n = t * 24,
    p = sample(anim, t);
  let x = anim === 'hatch' ? -45 : 0,
    height = 0,
    drag = 0;
  for (const [a, b, dx, h] of hops[anim] ?? []) {
    const u = Math.max(0, Math.min(1, (n - a) / (b - a)));
    x += dx * u;
    height += 4 * h * u * (1 - u);
    if (n >= a && n < b) drag += (1 - 2 * u) * Math.sin(Math.PI * u) * 1.5;
  }
  const arrival = anim === 'trick' ? x / 57 : 0;
  return { ...p, x, y: -8 * arrival, alt: height, drag };
}
const clip = (frames: number): Animation => ({ seconds: frames / 24 });
const path = (name: string, frames: number): Animation => ({
  ...clip(frames),
  groundOffset(t) {
    const { x, y } = poseAt(name, t);
    return [x, y];
  },
});
export const clips: Record<string, Animation> = {
  ...everyday,
  prepare_walk: clip(36),
  fidget_a: clip(44),
  fidget_b: clip(48),
  happy: clip(39),
  sleep_in: clip(30),
  sleep_out: clip(30),
  wake_startled: clip(24),
  hatch: path('hatch', 56),
  trick: path('trick', 140),
  trick_b: clip(visit.end + 1),
};
export const pillowHome: XY = [132, 77];
export function cushionAt(n: number) {
  const smooth = (u: number) => {
    u = Math.max(0, Math.min(1, u));
    return u * u * (3 - 2 * u);
  };
  const lift =
    smooth((n - hug.lift) / (hug.cheek - hug.lift)) - smooth((n - hug.lower) / (hug.rest - hug.lower));
  const press = smooth((n - hug.grasp) / 6) - smooth((n - hug.rest) / 6);
  const nuzzle = lift * Math.sin(Math.PI * Math.min(1, Math.max(0, (n - 65) / 15)));
  return {
    x: pillowHome[0] + lift,
    y: pillowHome[1] - 7.5 * lift + nuzzle,
    lift,
    squeeze: press * 0.28 + lift * 0.72,
    // The crown yields after the cheek arrives and unfolds just after the mittens loosen.
    fold: smooth((n - hug.lift - 2) / 10) - smooth((n - hug.lower - 1) / 10),
    tilt: 0.09 * lift,
  };
}
