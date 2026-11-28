import { everyday } from '../rig/figure';
import { aim, reach } from '../bodies/goals';
import type { JointPose } from '../technique';

export const clips = {
  ...everyday,
  sleep: { seconds: 3.5, loop: true },
  happy: { seconds: 2 },
  trick: { seconds: 2.5 },
  fidget_a: { seconds: 2 },
  fidget_b: { seconds: 2 },
  sleep_in: { seconds: 1.25 },
  sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
  phase: { seconds: 2 },
  show: { seconds: 5 },
  'idle-f2': { seconds: 3, loop: true },
};
const sleep = {
  ...aim('weaponTip', [29, 13, 1.2]),
  ...reach('handR', [7, 17, 6]),
  ...reach('footR', [7, 12, 0]),
  ...reach('footL', [12, -11, 0]),
  tailWrap: 0.16,
  nest: 1.12,
  crouch: 3,
  nod: 0.52,
  blink: 1,
  tailSweep: 0.75,
  clubAngle: -0.65,
  hip: -6.4,
  lean: 4.8,
  pitch: -0.21,
  twist: -0.26,
  tailLift: -4,
};
const left = (x: number, y: number, z: number) => reach('handL', [x, y, z]);
const salute = left(15, -22, 72);
const tracks: Record<string, [number, JointPose][]> = {
  idle: [
    [0, {}],
    [12, { crouch: -1, nod: -0.07 }],
    [31, { crouch: 1.2, nod: 0.08 }],
    [54, { ear: 0.24, gaze: 0.13, lean: 1 }],
    [71, {}],
  ],
  look: [
    [0, {}],
    [8, { nod: 0.37, pitch: 0.09 }],
    [17, { nod: -0.35, ear: 0.14 }],
    [27, { gaze: -0.77, twist: -0.13 }],
    [35, {}],
  ],
  fidget_a: [
    [0, {}],
    [8, { nod: 0.19, gaze: -0.13 }],
    [22, { ...salute, nod: 0.27, roll: 0.05 }],
    [30, { ...left(7, -15, 58), nod: 0.2 }],
    [38, { ...left(12, -16, 43), nod: -0.17 }],
    [47, {}],
  ],
  fidget_b: [
    [0, {}],
    [9, { nod: 0.32, gaze: 0.23 }],
    [24, { ...left(23, -9, 50), gaze: -0.29, ear: -0.18 }],
    [30, { ...left(21, -14, 52), gaze: -0.24 }],
    [37, { nod: -0.16, ear: 0.2 }],
    [47, {}],
  ],
  happy: [
    [0, {}],
    [8, { crouch: 6, tailLift: 4 }],
    [17, { jump: 8, nod: -0.21, jaw: 0.55, ...salute, ear: 0.24 }],
    [22, { crouch: 2, nod: -0.07, jaw: 0.45 }],
    [28, { jump: 3, nod: -0.15, jaw: 0.42, tailLift: 6 }],
    [34, { crouch: 5, ear: -0.15, cape: 1.6 }],
    [47, {}],
  ],
  trick: [
    [0, {}],
    [12, { heel: 3, lean: -1, ...left(16, -20, 41) }],
    [
      28,
      {
        ...reach('footR', [13, 19, 15]),
        ...left(14, -26, 45),
        lean: -3,
        roll: 0.13,
        tailLift: 8,
        tailSweep: 0.31,
      },
    ],
    [34, { ...reach('footR', [12, 16, 12]), ...left(14, -24, 44), lean: -2, roll: 0.08, tailLift: 9 }],
    [46, { pitch: 0.38, nod: 0.24, crouch: 2, ...left(14, -9, 44) }],
    [59, {}],
  ],
  sleep_in: [
    [0, {}],
    [6, { jaw: 0.83, nod: -0.27 }],
    [16, { nest: 0.48, crouch: 3, nod: 0.18 }],
    [29, sleep],
  ],
  sleep_out: [
    [0, sleep],
    [13, { nest: 0.49, nod: 0.05, blink: 0.15 }],
    [24, { nod: -0.25, crouch: -2 }],
    [29, {}],
  ],
  wake_startled: [
    [0, sleep],
    [4, { nest: 0.5, ear: 0.2, jaw: 0.24 }],
    [8, { jump: 7, nod: -0.27, jaw: 0.83, ear: 0.5, ...left(19, -18, 45) }],
    [15, { crouch: 6, gaze: 0.29, ear: -0.15, cape: 2 }],
    [23, {}],
  ],
  hatch: [
    [0, {}],
    [7, { nest: 0.87, crouch: 4, blink: 0.7 }],
    [17, { crouch: -2, nod: -0.2, ...left(21, -18, 43) }],
    [27, { ...salute, nod: -0.1 }],
    [35, {}],
  ],
  phase: [
    [0, {}],
    [11, { pitch: -0.14, twist: -0.26, heel: 2 }],
    [24, { rail: 0.58, clubLift: 6, clubAngle: 0.64, twist: 0.25 }],
    [40, { rail: 1, nod: -0.2, crouch: -1 }],
    [47, { rail: 1 }],
  ],
  show: [
    [0, {}],
    [24, { nest: 0.85, nod: 0.33, crouch: 3 }],
    [44, { nest: 0.45, nod: 0.12, tailLift: 4 }],
    [62, { crouch: -3, nod: -0.4, jaw: 1, cape: 5, tailLift: 11, ...left(27, -17, 65) }],
    [77, { guard: 1, nod: -0.15, jaw: 0.3 }],
    [90, { guard: 0.55, ...salute, nod: -0.17 }],
    [104, { ...left(14, -14, 43), tailSweep: 0.28 }],
    [119, {}],
  ],
};
const characterKeys: Record<string, Record<number, JointPose>> = {
  happy: {
    17: { hip: -6.4, pitch: -0.21, crouch: -4.8, nod: 0.05, tailSweep: -0.29 },
  },
  trick: {
    28: { hip: -6.4, pitch: -0.21, nod: 0.26, tailSweep: 0.02, tailLift: 4, roll: 0.02 },
    46: { lean: -4.8, pitch: 0.17, nod: 0.5, twist: -0.26, tailSweep: -0.29 },
  },
  look: {
    17: { hip: -6.4, lean: -4.8, crouch: -4.8, nod: -0.61, twist: -0.26, tailSweep: -0.29, tailLift: -4 },
    27: { hip: -6.4, lean: -4.8, pitch: -0.21, nod: 0.26, twist: -0.39, tailSweep: -0.29, tailLift: -4 },
  },
  show: {
    24: { hip: -6.4, lean: -4.8, pitch: -0.21, crouch: -1.8, nod: 0.07, twist: -0.26, tailLift: -4 },
    62: { hip: -6.4, pitch: -0.34, crouch: -6, nod: -0.3, twist: -0.42, lean: 3 },
    90: { hip: -6.4, lean: -4.8, pitch: -0.21, crouch: -4.8, nod: 0.09, twist: -0.26, tailLift: -4 },
  },
};
for (const [name, frames] of Object.entries(characterKeys)) {
  for (const [frame, pose] of tracks[name]) Object.assign(pose, frames[frame] ?? {});
}
export function gesture(anim: string, t: number): JointPose {
  if (anim === 'sleep') return sleep;
  const keys = tracks[anim === 'idle-f2' ? 'idle' : anim];
  if (!keys) return {};
  const frame = t * 24;
  const i = keys.findIndex(([n]) => n >= frame);
  if (i < 1) return keys[i === 0 ? 0 : keys.length - 1][1];
  const [lo, a] = keys[i - 1],
    [hi, b] = keys[i];
  const u = (frame - lo) / (hi - lo),
    v = u * u * (3 - 2 * u);
  return Object.fromEntries(
    [...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [k, (a[k] ?? 0) * (1 - v) + (b[k] ?? 0) * v]),
  );
}
