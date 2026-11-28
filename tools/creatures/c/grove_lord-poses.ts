import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';
export const clips = {
  ...everyday,
  happy: { seconds: 2 },
  trick: { seconds: 4.5 },
  phase: { seconds: 2 },
  'idle-f2': { seconds: 3, loop: true },
  fidget_a: { seconds: 2 },
  fidget_b: { seconds: 2 },
  sleep: { seconds: 3.5, loop: true },
  sleep_in: { seconds: 1.25 },
  sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
  squirrel_peek: { seconds: 58 / 24, loop: true, companion: true },
  squirrel_throw: { seconds: 56 / 24, companion: true },
  squirrel_cheer: { seconds: 40 / 24, companion: true },
  squirrel_sleep: { seconds: 3.5, loop: true, companion: true },
};
const tracks: Record<string, [number, JointPose][]> = {
  idle: [
    [0, {}],
    [18, { crownSway: 0.21, 'head.yaw': 0.12 }],
    [38, { 'head.pitch': 0.08, squirrelUp: 1.2 }],
    [59, { blink: 1 }],
    [71, {}],
  ],
  look: [
    [0, {}],
    [8, { 'head.pitch': -0.16 }],
    [16, { 'head.yaw': -0.73, twist: -0.11 }],
    [25, { 'head.yaw': 0.53, crownSway: 0.42 }],
    [35, {}],
  ],
  fidget_a: [
    [0, {}],
    [10, { 'head.yaw': 0.32 }],
    [23, { 'head.yaw': 0.48, 'head.pitch': 0.35, squirrelUp: 2.3, ...reach('handR', [14, 20, 52]) }],
    [31, { 'head.yaw': 0.4, squirrelUp: 3.1, ...reach('handR', [11, 20, 55]) }],
    [47, {}],
  ],
  fidget_b: [
    [0, {}],
    [10, { roll: -0.13, crownSway: 0.7 }],
    [21, { 'head.pitch': -0.24, 'head.yaw': -0.24, ...reach('handL', [10, -23, 78]) }],
    [29, { crownSway: -0.6, ...reach('handL', [13, -20, 75]) }],
    [39, { crownSway: 0.29 }],
    [47, {}],
  ],
  sleep_in: [
    [0, {}],
    [8, { sleep: 0.2, jaw: 0.58 }],
    [18, { sleep: 0.65, 'head.pitch': 0.2 }],
    [24, { sleep: 1, squirrelClip: 3 }],
    [29, { sleep: 1, squirrelClip: 3 }],
  ],
  sleep_out: [
    [0, { sleep: 1, squirrelClip: 3 }],
    [8, { sleep: 0.8, squirrelClip: 3 }],
    [18, { sleep: 0.28, 'head.pitch': -0.16, handOpen: 0.5 }],
    [24, { 'head.yaw': 0.23 }],
    [29, {}],
  ],
  wake_startled: [
    [0, { sleep: 1, squirrelClip: 3 }],
    [4, { sleep: 0.6, squirrelUp: 1.2 }],
    [
      9,
      {
        lean: -3,
        pitch: -0.18,
        handOpen: 1,
        squirrelUp: 3,
        ...reach('handR', [13, 33, 61]),
        ...reach('handL', [13, -33, 63]),
      },
    ],
    [16, { 'head.yaw': 0.64, crouch: 3 }],
    [23, {}],
  ],
  squirrel_peek: [
    [0, { squirrelTime: 0 }],
    [12, { squirrelTime: 0.5, squirrelUp: 1.8 }],
    [32, { squirrelTime: 1.33, squirrelUp: 2.1 }],
    [49, { squirrelTime: 2.04, squirrelUp: -0.8 }],
    [57, { squirrelTime: 2.4 }],
  ],
  squirrel_cheer: [
    [0, {}],
    [5, { squirrelClip: 2, squirrelTime: 0, squirrelUp: 1 }],
    [14, { squirrelClip: 2, squirrelTime: 0.37, squirrelUp: 3 }],
    [22, { squirrelClip: 2, squirrelTime: 0.72, squirrelUp: 1 }],
    [30, { squirrelClip: 2, squirrelTime: 1.1, squirrelUp: 3 }],
    [39, {}],
  ],
  squirrel_throw: [
    [0, {}],
    [7, { squirrelClip: 1, squirrelTime: 0, squirrelNutHeld: 1, squirrelUp: 1 }],
    [16, { squirrelClip: 1, squirrelTime: 0.42, squirrelNutHeld: 1, crouch: 12 }],
    [21, { squirrelClip: 1, squirrelTime: 0.63, squirrelNutHeld: 0, squirrelReach: 2, crouch: 20 }],
    [32, { squirrelClip: 1, squirrelTime: 0.89, squirrelUp: 2, crouch: 22, 'head.pitch': -0.21 }],
    [43, { squirrelClip: 1, squirrelTime: 1.3, crouch: 11 }],
    [55, {}],
  ],
  squirrel_sleep: [
    [0, { squirrelClip: 3, squirrelTime: 0 }],
    [28, { squirrelClip: 3, squirrelTime: 1.17 }],
    [57, { squirrelClip: 3, squirrelTime: 2.37 }],
    [83, { squirrelClip: 3, squirrelTime: 3.5 }],
  ],
  'idle-f2': [
    [0, { phase: 1 }],
    [22, { phase: 1, crownSway: 0.42, squirrelUp: 1 }],
    [45, { phase: 1, crownSway: -0.32, 'head.yaw': 0.11 }],
    [71, { phase: 1 }],
  ],
  happy: [
    [0, {}],
    [4, { roll: -0.16, squirrelUp: 2, 'head.pitch': 0.21, ...reach('handR', [14, 17, 58]) }],
    [
      9,
      {
        lean: 3,
        roll: 0.2,
        squirrelClip: 2,
        squirrelTime: 0.18,
        'head.yaw': 0.33,
        ...reach('handR', [19, 19, 58]),
        ...reach('handL', [9, -24, 64]),
      },
    ],
    [
      16,
      {
        squirrelClip: 2,
        squirrelTime: 0.38,
        handOpen: 0.9,
        crownSway: 0.62,
        ...reach('handR', [15, 22, 77]),
        ...reach('handL', [12, -21, 76]),
      },
    ],
    [
      23,
      {
        crouch: 6,
        twist: 0.27,
        squirrelClip: 2,
        squirrelTime: 0.64,
        ...reach('handR', [16, 38, 59]),
        ...reach('handL', [5, -37, 62]),
      },
    ],
    [
      31,
      {
        roll: -0.17,
        squirrelClip: 2,
        squirrelTime: 0.92,
        'head.pitch': -0.16,
        ...reach('footR', [10, 13, 12]),
        ...reach('handL', [8, -22, 82]),
      },
    ],
    [39, { crouch: 4, crownSway: -0.53, 'head.pitch': 0.2 }],
    [47, {}],
  ],
  hatch: [
    [
      0,
      {
        sleep: 0.92,
        crouch: 7,
        pitch: 0.59,
        'head.pitch': 0.49,
        twist: 0.32,
        crownSway: -0.52,
        squirrelUp: -2,
        squirrelClip: 3,
        handOpen: 0.05,
        sx: 0.66,
        sy: 0.49,
        ...reach('handR', [20, 7, 16]),
        ...reach('handL', [17, -5, 27]),
      },
    ],
    [
      5,
      {
        sleep: 0.87,
        crouch: 6,
        pitch: 0.5,
        'head.pitch': 0.43,
        twist: 0.27,
        crownSway: -0.43,
        squirrelUp: -2,
        squirrelClip: 3,
        sx: 0.71,
        sy: 0.54,
        ...reach('handR', [21, 8, 18]),
        ...reach('handL', [18, -6, 30]),
      },
    ],
    [
      12,
      {
        sleep: 0.47,
        crouch: 7,
        pitch: 0.27,
        'head.pitch': 0.24,
        twist: 0.11,
        squirrelUp: -2,
        squirrelClip: 3,
        sx: 0.84,
        sy: 0.74,
        ...reach('handR', [16, 13, 31]),
        ...reach('handL', [14, -15, 33]),
      },
    ],
    [
      18,
      {
        lean: 1,
        pitch: -0.12,
        crownSway: 0.8,
        sx: 1,
        sy: 1,
        ...reach('handR', [10, 33, 62]),
        ...reach('handL', [7, -35, 62]),
      },
    ],
    [
      23,
      {
        lift: 4,
        crownSway: 0.53,
        handOpen: 1,
        squirrelUp: -2,
        sx: 1,
        sy: 1,
        ...reach('handR', [7, 39, 65]),
        ...reach('handL', [7, -39, 66]),
      },
    ],
    [28, { squirrelUp: 8, squirrelClip: 2, squirrelTime: 0.33, crouch: 3, sx: 1, sy: 1 }],
    [35, { sx: 1, sy: 1 }],
  ],
  phase: [
    [0, { phase: 0 }],
    [
      8,
      {
        phase: 0.08,
        crouch: 8,
        pitch: 0.15,
        ...reach('handR', [12, 16, 48]),
        ...reach('handL', [11, -17, 50]),
      },
    ],
    [
      16,
      {
        phase: 0.32,
        crouch: 6,
        roll: 0.12,
        ...reach('handR', [10, 35, 59]),
        ...reach('handL', [11, -34, 59]),
      },
    ],
    [
      24,
      {
        phase: 0.6,
        lean: 1,
        crownSway: 0.72,
        'head.pitch': -0.25,
        ...reach('handR', [5, 42, 69]),
        ...reach('handL', [8, -39, 65]),
      },
    ],
    [
      33,
      {
        phase: 0.88,
        'head.pitch': -0.18,
        squirrelUp: 3.6,
        squirrelClip: 2,
        squirrelTime: 0.31,
        ...reach('handR', [12, 32, 61]),
        ...reach('handL', [9, -33, 64]),
      },
    ],
    [39, { phase: 1, 'head.pitch': 0.1, squirrelUp: 2, squirrelClip: 2, squirrelTime: 0.58 }],
    [47, { phase: 1 }],
  ],
  trick: [
    [0, {}],
    [
      10,
      {
        crouch: 10,
        'head.pitch': 0.22,
        'head.yaw': 0.35,
        squirrelUp: 2,
        squirrelNutHeld: 1,
        ...reach('handL', [15, -23, 44]),
      },
    ],
    [
      18,
      {
        crouch: 21,
        pitch: 0.14,
        squirrelClip: 1,
        squirrelTime: 0.42,
        squirrelUp: 4,
        squirrelNutHeld: 1,
        ...reach('handL', [20, -27, 42]),
      },
    ],
    [
      23,
      {
        crouch: 22,
        squirrelClip: 1,
        squirrelTime: 0.64,
        squirrelReach: 2,
        squirrelUp: 5,
        squirrelNutHeld: 0,
        'head.pitch': -0.18,
        ...reach('handL', [21, -29, 45]),
      },
    ],
    [
      42,
      {
        crouch: 22,
        pitch: 0.12,
        'head.pitch': -0.38,
        'head.yaw': 0.32,
        squirrelUp: 2,
        squirrelClip: 1,
        squirrelTime: 0.96,
        handOpen: 1,
        ...reach('handR', [6, 29, 38]),
        ...reach('handL', [25, -28, 50]),
      },
    ],
    [54, { crouch: 12, twist: -0.14, 'head.pitch': -0.22, squirrelUp: 3, ...reach('handL', [30, -29, 62]) }],
    [
      63,
      {
        crouch: 9,
        pitch: 0.1,
        twist: -0.11,
        'head.pitch': 0.09,
        handOpen: 0.45,
        squirrelUp: 4,
        ...reach('handL', [33, -26, 56]),
      },
    ],
    [70, { crouch: 16, pitch: 0.32, 'head.pitch': 0.28, squirrelUp: 2, ...reach('handL', [34, -21, 24]) }],
    [78, { crouch: 20, pitch: 0.38, 'head.pitch': 0.35, handOpen: 1, ...reach('handL', [34, -19, 1]) }],
    [
      86,
      {
        crouch: 11,
        pitch: 0.13,
        'head.pitch': 0.09,
        handOpen: 0.9,
        ...reach('handR', [15, 32, 46]),
        ...reach('handL', [24, -28, 27]),
      },
    ],
    [
      94,
      {
        crouch: 1,
        'head.pitch': -0.18,
        squirrelClip: 2,
        squirrelTime: 0.37,
        squirrelUp: 3,
        crownSway: 0.6,
        ...reach('handR', [6, 39, 66]),
        ...reach('handL', [8, -36, 60]),
      },
    ],
    [101, { crouch: 5, pitch: 0.2, 'head.pitch': 0.18, squirrelClip: 2, squirrelTime: 0.82 }],
    [107, {}],
  ],
};
export function gesture(anim: string, t: number): JointPose {
  if (anim === 'sleep') return { sleep: 1, squirrelClip: 3, squirrelTime: t };
  const keys = tracks[anim];
  if (!keys) return {};
  const n = t * 24,
    i = keys.findIndex(([frame]) => frame >= n - 1e-8);
  if (i <= 0) return keys[i === 0 ? 0 : keys.length - 1][1];
  const [start, a] = keys[i - 1],
    [end, b] = keys[i],
    u = Math.min(1, (n - start) / (end - start)),
    s = u * u * (3 - 2 * u);
  const result: JointPose = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (k === 'squirrelClip') {
      result[k] = (u > 0.65 ? b[k] : a[k]) ?? 0;
      continue;
    }
    result[k] = (a[k] ?? 0) * (1 - s) + (b[k] ?? 0) * s;
  }
  return result;
}
