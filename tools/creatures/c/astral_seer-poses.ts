// Pose book of Астрал. Times are frames at 24 fps; goals are feet-relative (forward, right, up) rig units.
// The effect timelines in astral_seer-fx.ts read the beat constants exported here.
import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';

export const clips: Record<string, { seconds: number; loop?: boolean }> = {
  ...everyday,
  look: { seconds: 1.5 },
  fidget_a: { seconds: 2 },
  fidget_b: { seconds: 2 },
  happy: { seconds: 2 },
  sleep: { seconds: 3.5, loop: true },
  sleep_in: { seconds: 1.25 },
  sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
  hatch: { seconds: 2 },
};
type Track = [number, JointPose][];
export const hand = (name: 'L' | 'R', x: number, y: number, z: number) => reach('hand' + name, [x, y, z]);
const asleep = { sleep: 1, blink: 1, earL: 0.4, earR: 0.4 };
/** Keys that switch at the key instead of fading. */
const SWITCHES = new Set(['hidden', 'overAll', 'peekFront', 'blink', 'crystalsHidden', 'gemOpen']);

export const tracks: Record<string, Track> = {
  idle: [[0, {}], [18, { nod: -0.05, earL: 0.1 }], [36, { gaze: -0.12, tailSway: 0.2 }], [54, { earR: 0.15, tilt: 0.05 }], [72, {}]],
  look: [[0, {}], [6, { earL: -0.2, earR: -0.2 }], [14, { gaze: -0.8, nod: -0.12 }], [24, { gaze: 0.5, tilt: 0.08 }], [36, {}]],
  fidget_a: [[0, {}], [12, { lightR: 1, ...hand('R', 9, 7, 46) }], [30, { lightR: 1, ...hand('R', 9, 7, 47), gaze: 0.3, nod: 0.15 }], [48, {}]],
  fidget_b: [[0, {}], [12, { orbit: 1.2, gaze: -0.4 }], [30, { orbit: 2.6, gaze: 0.3 }], [48, { orbit: 3.4 }]],
  happy: [[0, {}], [8, { hover: 6, smile: 1, earL: -0.2, earR: -0.2 }], [16, { hover: 2, roll: 0.2 }], [24, { hover: 7, roll: -0.2 }], [36, { smile: 0.6 }], [48, {}]],
  sleep_in: [[0, {}], [12, { sleep: 0.4, nod: 0.2 }], [24, asleep], [30, asleep]],
  sleep_out: [[0, asleep], [10, { sleep: 0.6 }], [20, { sleep: 0.1, earL: -0.2 }], [30, {}]],
  wake_startled: [[0, asleep], [4, { sleep: 0.6, earL: -0.4, earR: -0.4 }], [10, { hover: 8, earL: -0.5, earR: -0.5 }], [24, {}]],
  hatch: [[0, {}], [24, { hover: 4 }], [48, {}]],
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
