import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';
export const clips = {
  ...everyday,
  happy: { seconds: 2 },
  trick: { seconds: 3.75 },
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
    [17, { 'head.pitch': -0.12, featherFan: 0.16 }],
    [38, { 'head.yaw': 0.22, bagSwing: 0.3 }],
    [54, { blink: 1 }],
    [71, {}],
  ],
  look: [
    [0, {}],
    [6, { 'head.pitch': -0.23 }],
    [15, { 'head.yaw': -0.78, wingBeat: 0.15 }],
    [25, { 'head.yaw': 0.53, roll: 0.08 }],
    [35, {}],
  ],
  fidget_a: [
    [0, {}],
    [9, { 'head.yaw': 0.55 }],
    [21, { 'head.yaw': 1.16, 'head.pitch': 0.4, wingSpreadR: 0.52, wingBeatR: 0.18, beakOpen: 0.8 }],
    [30, { 'head.yaw': 1.08, 'head.pitch': 0.27, wingSpreadR: 0.48, beakOpen: 0.05 }],
    [38, { 'head.yaw': 0.65, featherFan: 0.45 }],
    [47, {}],
  ],
  fidget_b: [
    [0, {}],
    [10, { 'head.pitch': 0.3, 'head.yaw': 0.68 }],
    [20, { crouch: 4, bagOpen: 0.64, 'head.yaw': 0.61, ...reach('foreR', [9, 14, 24]) }],
    [29, { bagOpen: 0.2, stampLift: 0.55, 'head.yaw': 0.48, ...reach('foreR', [11, 15, 20]) }],
    [39, { 'head.pitch': -0.2 }],
    [47, {}],
  ],
  sleep_in: [
    [0, {}],
    [8, { sleep: 0.15, 'head.pitch': -0.27, beakOpen: 1 }],
    [17, { sleep: 0.72, 'head.yaw': 0.4 }],
    [24, { sleep: 1, blink: 1 }],
    [29, { sleep: 1, blink: 1 }],
  ],
  sleep_out: [
    [0, { sleep: 1, blink: 1 }],
    [8, { sleep: 0.79, wingSpread: 0.14 }],
    [17, { sleep: 0.33, wingSpread: 0.37, 'head.pitch': -0.2 }],
    [24, { 'head.yaw': 0.3 }],
    [29, {}],
  ],
  wake_startled: [
    [0, { sleep: 1, blink: 1 }],
    [4, { sleep: 0.58, beakOpen: 0.55 }],
    [9, { wingSpread: 0.6, wingBeat: 0.26, beakOpen: 0.85 }],
    [16, { crouch: 4, 'head.yaw': -0.64 }],
    [23, {}],
  ],
  hatch: [
    [0, {}],
    [8, { wingBeat: -0.3, crouch: 4 }],
    [15, { wingSpread: 0.8, wingBeat: 0.34, 'head.pitch': -0.32, beakOpen: 0.8 }],
    [23, { wingSpread: 0.33, 'head.pitch': -0.3, beakOpen: 0.12 }],
    [30, { 'head.pitch': 0.16 }],
    [35, {}],
  ],
  happy: [
    [0, {}],
    [4, { roll: -0.16, wingBeatL: 0.3, 'head.pitch': -0.16, ...reach('foreR', [19, 9, 24]) }],
    [
      9,
      { wingSpreadL: 0.55, wingBeatL: 0.27, 'head.yaw': 0.38, pitch: -0.19, ...reach('foreR', [26, 11, 36]) },
    ],
    [16, { wingSpread: 0.9, wingBeat: 0.23, beakOpen: 0.9, featherFan: 0.55, 'head.pitch': -0.35 }],
    [23, { dx: -4, wingSpreadR: 0.52, wingBeatR: -0.2, roll: -0.18, ...reach('foreL', [24, -11, 15]) }],
    [31, { dx: 3, wingSpreadL: 0.52, wingBeatL: -0.2, roll: 0.2, ...reach('foreR', [26, 13, 15]) }],
    [39, { crouch: 4, 'head.pitch': 0.34, bagSwing: 0.65, wingSpread: 0.22 }],
    [47, {}],
  ],
  trick: [
    [0, {}],
    [9, { 'head.yaw': 0.96, 'head.pitch': 0.34, bagOpen: 1, roll: 0.09 }],
    [16, { crouch: 8, 'head.pitch': -0.26, wingSpread: 0.32, wingBeat: 0.12, dx: -5 }],
    [23, { dx: 9, lift: 10, flightPitch: -0.57, wingSpread: 0.65, wingBeat: 0.18, beakOpen: 0.36 }],
    [29, { dx: 16, lift: 17, flightPitch: -1.58, wingSpread: 0.31, wingBeat: -0.12 }],
    [
      36,
      {
        dx: 0,
        lift: 22,
        flightPitch: -3.14,
        wingSpread: 0.19,
        wingBeat: -0.33,
        wingSpreadL: 0.48,
        featherFan: 0.32,
      },
    ],
    [43, { dx: -15, lift: 17, flightPitch: -4.69, wingSpread: 0.26, wingBeat: 0.07 }],
    [48, { dx: -8, lift: 10, flightPitch: -5.66, wingSpread: 0.44, beakOpen: 0.92 }],
    [
      52,
      {
        dx: 4,
        lift: 6,
        flightPitch: -6.28319,
        wingSpread: 0.6,
        wingBeat: 0.28,
        'head.pitch': 0.2,
        beakOpen: 0.22,
      },
    ],
    [57, { dx: 9, crouch: 5, flightPitch: -6.28319, wingSpread: 0.24, 'head.pitch': 0.29 }],
    [
      61,
      {
        dx: 7,
        flightPitch: -6.28319,
        'head.pitch': 0.32,
        ...reach('stamp', [26, 11, 31]),
        ...reach('foreR', [25, 11, 32]),
      },
    ],
    [
      65,
      {
        dx: 6,
        flightPitch: -6.28319,
        'head.pitch': 0.34,
        beakOpen: 0.08,
        ...reach('beak', [32, 9, 31]),
        ...reach('stamp', [32, 10, 31]),
        ...reach('foreR', [31, 11, 33]),
      },
    ],
    [72, { dx: 5, flightPitch: -6.28319, 'head.pitch': -0.22, wingSpread: 0.42 }],
    [79, { flightPitch: -6.28319, crouch: 7, pitch: 0.46, 'head.pitch': 0.6, wingBeat: -0.28 }],
    [89, { flightPitch: -6.28319 }],
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
  const s = anim === 'trick' && start >= 23 && end <= 52 ? u : u * u * (3 - 2 * u);
  const result: JointPose = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
    result[k] = (a[k] ?? 0) * (1 - s) + (b[k] ?? 0) * s;
  return result;
}
