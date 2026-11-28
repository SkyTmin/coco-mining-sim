import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';
export const clips = {
  ...everyday,
  happy: { seconds: 2 },
  trick: { seconds: 4.5 },
  phase: { seconds: 2 },
  'idle-f2': { seconds: 3, loop: true },
  hatch: { seconds: 1.75 },
  fidget_a: { seconds: 2 },
  fidget_b: { seconds: 2 },
  sleep: { seconds: 3.5, loop: true },
  sleep_in: { seconds: 1.25 },
  sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
};
const tracks: Record<string, [number, JointPose][]> = {
  idle: [
    [0, {}],
    [20, { tailSwing: 0.13, clawOpenR: 0.15 }],
    [40, { tailSwing: -0.16, 'head.yaw': 0.16 }],
    [57, { blink: 1 }],
    [71, {}],
  ],
  look: [
    [0, {}],
    [7, { 'head.pitch': -0.18, tailLift: 2 }],
    [15, { 'head.yaw': -0.57, clawOpenL: 0.5 }],
    [25, { 'head.yaw': 0.64, tailSwing: 0.22 }],
    [35, {}],
  ],
  fidget_a: [
    [0, {}],
    [10, { 'head.yaw': 0.33, clawOpenR: 0.65 }],
    [22, { 'head.yaw': 0.74, 'head.pitch': 0.25, clawOpenR: 0.12, ...reach('clawR', [29, 17, 28]) }],
    [33, { 'head.yaw': 0.51, clawOpenR: 0.62, ...reach('clawR', [31, 18, 23]) }],
    [47, {}],
  ],
  fidget_b: [
    [0, {}],
    [9, { tailCurl: 0.22, tailSwing: 0.22 }],
    [22, { roll: 0.12, tailSwing: 0.47, 'head.yaw': -0.5, stingGlow: 0.62 }],
    [32, { scarfWind: 0.48, 'head.yaw': -0.3 }],
    [47, {}],
  ],
  sleep_in: [
    [0, {}],
    [8, { sleep: 0.22, 'head.pitch': -0.16 }],
    [17, { sleep: 0.7, clawOpenR: 0.13, tailCurl: 0.28 }],
    [29, { sleep: 1, blink: 1 }],
  ],
  sleep_out: [
    [0, { sleep: 1, blink: 1 }],
    [8, { sleep: 0.74 }],
    [17, { sleep: 0.19, tailSwing: 0.19 }],
    [24, { 'head.pitch': -0.17 }],
    [29, {}],
  ],
  wake_startled: [
    [0, { sleep: 1, blink: 1 }],
    [4, { sleep: 0.46 }],
    [9, { roll: -0.17, clawOpenR: 1, clawOpenL: 1, tailSwing: -0.36 }],
    [17, { 'head.yaw': 0.57, tailLift: 3 }],
    [23, {}],
  ],
  happy: [
    [0, {}],
    [
      4,
      {
        crouch: 3,
        roll: -0.18,
        clawOpenR: 1,
        clawOpenL: 0.7,
        stingGlow: 0.7,
        ...reach('clawR', [32, 18, 30]),
      },
    ],
    [
      9,
      {
        lean: 3,
        pitch: -0.2,
        tailSwing: 0.36,
        clawOpenR: 1,
        clawOpenL: 1,
        stingGlow: 1,
        ...reach('clawR', [30, 14, 38]),
        ...reach('clawL', [35, 1, 36]),
      },
    ],
    [
      15,
      {
        roll: 0.12,
        clawOpenR: 0.12,
        clawOpenL: 0.15,
        ...reach('clawR', [33, 9, 35]),
        ...reach('clawL', [33, 8, 35]),
      },
    ],
    [23, { roll: 0.21, tailSwing: -0.34, clawOpenL: 0.9, clawOpenR: 0.65, ...reach('clawL', [32, -23, 38]) }],
    [31, { roll: -0.26, 'head.pitch': -0.2, tailLift: 6, stingGlow: 0.9, ...reach('clawR', [30, 23, 36]) }],
    [40, { crouch: 4, pitch: 0.26, clawOpenL: 0.65 }],
    [47, {}],
  ],
  hatch: [
    [0, {}],
    [6, { crouch: 5, tailCurl: 0.48, 'head.pitch': 0.24, ...reach('clawR', [44, 17, 17]) }],
    [
      12,
      {
        crouch: 8,
        pitch: 0.24,
        clawOpenR: 0.86,
        clawOpenL: 0.9,
        ...reach('clawR', [36, 22, 3]),
        ...reach('clawL', [32, -21, 5]),
      },
    ],
    [
      20,
      {
        lean: 5,
        pitch: -0.18,
        tailLift: 6,
        scarfWind: 0.63,
        stingGlow: 1,
        clawOpenL: 1,
        ...reach('clawR', [33, 25, 29]),
      },
    ],
    [27, { roll: -0.25, tailSwing: 0.34, clawOpenR: 0.8 }],
    [34, { roll: 0.14, 'head.pitch': -0.23 }],
    [41, {}],
  ],
  phase: [
    [0, {}],
    [8, { crouch: 5, roll: -0.12, scarfWind: 0.45 }],
    [17, { phase: 0.25, plateOpen: 0.14, scarfWind: 0.95, tailCurl: 0.21, stingGlow: 0.4 }],
    [26, { phase: 0.62, plateOpen: 0.56, scarfWind: 1, tailLift: 5, clawOpenR: 0.56 }],
    [34, { phase: 0.91, plateOpen: 0.94, tailSwing: -0.24, stingGlow: 1, clawOpenL: 0.46 }],
    [47, { phase: 1, plateOpen: 1, stingGlow: 1 }],
  ],
  'idle-f2': [
    [0, { phase: 1, plateOpen: 1, stingGlow: 1 }],
    [22, { phase: 1, plateOpen: 1, stingGlow: 1, tailSwing: 0.13, clawOpenR: 0.22 }],
    [43, { phase: 1, plateOpen: 1, stingGlow: 1, 'head.yaw': 0.18, tailLift: 2 }],
    [71, { phase: 1, plateOpen: 1, stingGlow: 1 }],
  ],
  trick: [
    [0, {}],
    [9, { 'head.yaw': 0.3, crouch: 2, ...reach('clawR', [21, 10, 32]) }],
    [
      16,
      { 'head.pitch': 0.03, diskHand: 0.9, clawRYaw: -0.97, clawOpenR: 0.15, ...reach('clawR', [22, 1, 26]) },
    ],
    [24, { diskHand: 1, crouch: 4, roll: -0.16, clawOpenR: 0.15, ...reach('clawR', [26, 25, 38]) }],
    [
      31,
      {
        diskHand: 1,
        diskLoose: 0.6,
        clawOpenR: 1,
        tailCurl: 0.25,
        ...reach('clawR', [31, 22, 48]),
        ...reach('diskFree', [29, 19, 54]),
      },
    ],
    [
      38,
      {
        diskLoose: 1,
        diskSpin: 1.9,
        crouch: 4,
        clawOpenR: 1,
        tailSwing: 0.35,
        tailLift: -7,
        ...reach('diskFree', [17, 13, 92]),
      },
    ],
    [
      46,
      {
        diskLoose: 1,
        diskSpin: 3.5,
        crouch: 9,
        clawOpenR: 0.86,
        tailCurl: 0.12,
        tailLift: -13,
        stingGlow: 1,
        ...reach('diskFree', [12, 7, 118]),
      },
    ],
    [
      55,
      {
        diskLoose: 1,
        diskSpin: 4.8,
        tailLift: -9,
        clawOpenR: 0.8,
        stingGlow: 1,
        ...reach('diskFree', [20, 8, 97]),
      },
    ],
    [
      63,
      {
        diskLoose: 1,
        diskSpin: 6.05,
        clawOpenR: 0.86,
        ...reach('diskFree', [29, 16, 56]),
        ...reach('clawR', [31, 21, 45]),
      },
    ],
    [
      68,
      {
        diskHand: 1,
        diskSpin: 6.28319,
        clawOpenR: 0.15,
        roll: -0.19,
        stingGlow: 1,
        ...reach('clawR', [33, 22, 43]),
      },
    ],
    [
      76,
      {
        diskHand: 1,
        clawRPitch: 0.77,
        clawOpenR: 0.14,
        'head.pitch': 0.3,
        crouch: 5,
        ...reach('clawR', [48, 13, 8]),
      },
    ],
    [
      83,
      {
        diskHand: 1,
        clawRPitch: 0.77,
        clawOpenR: 0.15,
        'head.pitch': 0.31,
        crouch: 7,
        ...reach('clawR', [49, 14, 7]),
        ...reach('clawL', [51, -2, 14]),
      },
    ],
    [88, { diskHand: 1, clawRPitch: 0.3, clawRYaw: -0.5, clawOpenR: 0.14, ...reach('clawR', [44, 20, 33]) }],
    [
      92,
      { diskHand: 1, clawRYaw: -0.97, clawOpenR: 0.16, 'head.pitch': 0.12, ...reach('clawR', [23, 4, 26]) },
    ],
    [
      98,
      {
        diskHand: 0.12,
        clawRYaw: -0.83,
        pitch: 0.22,
        crouch: 5,
        clawOpenR: 0.75,
        ...reach('clawR', [28, 10, 24]),
      },
    ],
    [107, {}],
  ],
};
export function gesture(anim: string, t: number): JointPose {
  if (anim === 'sleep') return { sleep: 1, blink: 1 };
  const keys = tracks[anim];
  if (!keys) return {};
  const n = t * 24,
    i = keys.findIndex(([frame]) => frame >= n);
  if (i <= 0) return keys[i === 0 ? 0 : keys.length - 1][1];
  const [start, a] = keys[i - 1],
    [end, b] = keys[i],
    u = (n - start) / (end - start);
  const s = anim === 'trick' && start >= 14 && end <= 68 ? u : u * u * (3 - 2 * u);
  const result: JointPose = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
    result[k] = (a[k] ?? 0) * (1 - s) + (b[k] ?? 0) * s;
  return result;
}
