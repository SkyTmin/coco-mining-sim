// Pose book of Раскат. Times are frames at 24 fps. Hand goals are written relative to the resting hip (forward, right,
// up) in the feet frame; `lift` follows the body when it rises. Foot goals place the raised heel (hock) of the
// digitigrade leg in feet units. The effect timelines in storm_lord-fx.ts read the beat constants exported here.
import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';

/** Height of the hip joint above the stone at rest, rig units. */
export const HIP = 14.5;

export const clips: Record<string, { seconds: number; loop?: boolean }> = {
  ...everyday,
  look: { seconds: 1.5 },
  fidget_a: { seconds: 2.5 },
  fidget_b: { seconds: 2.5 },
  happy: { seconds: 2 },
  'happy-f2': { seconds: 2 },
  trick: { seconds: 11 },
  trick_b: { seconds: 11.5 },
  trick_c: { seconds: 11.5 },
  phase: { seconds: 5 },
  'idle-f2': { seconds: 2, loop: true },
  'trick-f2': { seconds: 12 },
  'trick_b-f2': { seconds: 11.5 },
  'trick_c-f2': { seconds: 12 },
  show: { seconds: 7 },
  peek: { seconds: 2.5 },
  hatch: { seconds: 3 },
  sleep: { seconds: 3, loop: true },
  sleep_in: { seconds: 1.5 },
  sleep_out: { seconds: 1.5 },
  wake_startled: { seconds: 1.2 },
};
export type Track = [number, JointPose][];
export const TAU = Math.PI * 2;
export const hand = (name: 'L' | 'R', x: number, y: number, z: number) => reach('hand' + name, [x, y, z]);
export const L = (x: number, y: number, z: number, lift = 0) => hand('L', x, y, HIP + z + lift);
export const R = (x: number, y: number, z: number, lift = 0) => hand('R', x, y, HIP + z + lift);
export const footL = (x: number, y: number, z: number) => reach('footL', [x, y, z]);
export const footR = (x: number, y: number, z: number) => reach('footR', [x, y, z]);
/** Painted size relative to natural (the skin reads sx / sy as offsets from 1). */
export const size = (x: number, y = x) => ({ sx: x - 1, sy: y - 1 });
/** The storm form: abyss fur, white-gold veins, lightning antlers, thunderhead mane, the drum ring open wide, hovering. */
export const F2: JointPose = { form: 1, hover: 5, ringR: 21, ringTilt: 1.32, charge: 0.6 };
export const f2 = (p: JointPose): JointPose => ({ ...F2, ...p });
/** Asleep: curled up on the stone like a great cat, the tail over the muzzle, the drums stacked behind. */
export const asleep: JointPose = { sleep: 1, blink: 1, earL: 0.6, earR: 0.6, ringR: 9, ringTilt: 0.2, tailCurl: 1 };
/** Keys that switch at the key instead of fading. */
export const SWITCHES = new Set(['hidden', 'overAll', 'blink', 'noShadow', 'peekFront', 'spearOn', 'orbOn', 'drumsHidden', 'clawFront', 'egg']);

/** Effect beats shared with the painter of effects. */
export const beats: Record<string, Record<string, number | number[]>> = {};

export const tracks: Record<string, Track> = {
  idle: [
    [0, {}],
    [18, { gaze: -0.1, earL: 0.15 }],
    [36, { tailSway: 0.25, nod: 0.04, charge: 0.25 }],
    [54, { earR: 0.15, tilt: 0.04 }],
    [72, {}],
  ],
  'idle-f2': [
    [0, f2({})],
    [12, f2({ nod: -0.04, earL: 0.1, tailSway: 0.2, charge: 0.8, hover: 6 })],
    [24, f2({ gaze: 0.1, tilt: 0.03, hover: 5.4 })],
    [36, f2({ earR: 0.12, nod: 0.03, charge: 0.7, hover: 6.2 })],
    [48, f2({})],
  ],
};
/** Lanes: single keys keyed on their own frames, eased on their own (or linear), laid over the main keys. */
export type Lane = [number, number][];
export const lanes: Record<string, Record<string, Lane>> = {};
const LINEAR = new Set(['dx', 'dy', 'twist', 'ringSpin', 'yawSpin']);
function laneValue(name: string, keys: Lane, f: number) {
  if (f <= keys[0][0]) return keys[0][1];
  const i = keys.findIndex(([time]) => time >= f);
  if (i < 0) return keys[keys.length - 1][1];
  const [start, a] = keys[i - 1],
    [end, b] = keys[i];
  if (SWITCHES.has(name)) return f >= end ? b : a;
  let u = (f - start) / (end - start);
  if (!LINEAR.has(name)) u = u * u * (3 - 2 * u);
  return a + (b - a) * u;
}
export function gesture(anim: string, t: number): JointPose {
  if (anim === 'sleep') return asleep;
  const keys = tracks[anim];
  if (!keys) return {};
  const f = t * 24,
    i = keys.findIndex(([time]) => time >= f);
  let pose: JointPose = {};
  if (i <= 0) pose = { ...keys[i === 0 ? 0 : keys.length - 1][1] };
  else {
    const [start, a] = keys[i - 1],
      [end, b] = keys[i];
    let u = (f - start) / (end - start);
    u = u * u * (3 - 2 * u);
    for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (SWITCHES.has(name)) pose[name] = f >= end ? (b[name] ?? 0) : (a[name] ?? 0);
      else pose[name] = (a[name] ?? 0) * (1 - u) + (b[name] ?? 0) * u;
    }
  }
  for (const [name, lane] of Object.entries(lanes[anim] ?? {})) pose[name] = laneValue(name, lane, f);
  return pose;
}
