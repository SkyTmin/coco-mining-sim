import { jugglePose } from './ink_admiral-juggle';
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
    [18, { 'head.yaw': 0.15, scopePitch: -0.16 }],
    [39, { 'head.yaw': 0.34, 'head.pitch': -0.15, ...reach('arm1', [0, 18, 40]) }],
    [55, { blink: 1 }],
    [71, {}],
  ],
  look: [
    [0, {}],
    [6, { 'head.pitch': -0.21 }],
    [15, { 'head.yaw': -0.66, lean: 2 }],
    [25, { 'head.yaw': 0.65, roll: 0.15 }],
    [35, {}],
  ],
  fidget_a: [
    [0, {}],
    [9, { 'head.yaw': 0.3 }],
    [20, { 'head.yaw': 0.66, 'head.pitch': -0.12, scopePitch: -0.42, ...reach('arm1', [8, 15, 42]) }],
    [31, { 'head.yaw': 0.44, scopePitch: 0.06, ...reach('arm1', [9, 17, 41]) }],
    [47, {}],
  ],
  fidget_b: [
    [0, {}],
    [10, { mapOpen: 0.42, 'head.pitch': 0.22 }],
    [22, { mapOpen: 1, 'head.pitch': 0.37, ...reach('arm2', [22, 10, 24]), ...reach('quill', [24, 15, 24]) }],
    [31, { mapOpen: 1, 'head.pitch': 0.31, ...reach('arm2', [22, 10, 24]), ...reach('quill', [26, 17, 24]) }],
    [47, {}],
  ],
  sleep_in: [
    [0, {}],
    [8, { sleep: 0.22, 'head.pitch': -0.23 }],
    [17, { sleep: 0.69, 'head.pitch': 0.14 }],
    [29, { sleep: 1, blink: 1 }],
  ],
  sleep_out: [
    [0, { sleep: 1, blink: 1 }],
    [8, { sleep: 0.7 }],
    [17, { sleep: 0.24, curl: 0.8 }],
    [24, { 'head.pitch': -0.24 }],
    [29, {}],
  ],
  wake_startled: [
    [0, { sleep: 1, blink: 1 }],
    [4, { sleep: 0.4 }],
    [9, { spread: 0.85, curl: 1.6, 'head.pitch': -0.3 }],
    [16, { crouch: 3, 'head.yaw': -0.5 }],
    [23, {}],
  ],
  hatch: [
    [0, {}],
    [8, { spread: -0.8, hatLoose: 1, ...reach('hatFree', [6, 5, 60]) }],
    [15, { spread: 0.8, curl: 1, hatLoose: 1, ...reach('hatFree', [6, 5, 66]) }],
    [23, { spread: 0.6, hatLoose: 0.5, ...reach('hatFree', [2, 2, 55]) }],
    [30, { crouch: 2 }],
    [35, {}],
  ],
  happy: [
    [0, {}],
    [4, { roll: -0.24, crouch: 3, blink: 0.75, bellRoll: -0.7, ...reach('arm3', [-19, 19, 29]) }],
    [
      9,
      {
        pitch: -0.18,
        roll: -0.24,
        pennantRoll: -0.7,
        bellRoll: 0.6,
        ...reach('arm3', [-17, 18, 35]),
        ...reach('arm4', [3, -24, 38]),
      },
    ],
    [16, { roll: -0.31, spread: 0.8, 'head.pitch': -0.25, pennantRoll: 0.5, ...reach('arm4', [8, -23, 44]) }],
    [
      23,
      {
        roll: 0.27,
        crouch: 3,
        bellRoll: -0.9,
        mapOpen: 1,
        ...reach('arm3', [-17, 20, 29]),
        ...reach('arm2', [25, 10, 21]),
      },
    ],
    [31, { roll: -0.23, pennantRoll: -0.7, ...reach('arm4', [6, -22, 41]) }],
    [39, { crouch: 5, pitch: 0.32, spread: 0.65, ...reach('arm3', [-19, 16, 23]) }],
    [47, {}],
  ],
};
export function gesture(anim: string, t: number): JointPose {
  if (anim === 'trick') return jugglePose(t * 24);
  if (anim === 'sleep') return { sleep: 1, blink: 1 };
  const keys = tracks[anim];
  if (!keys) return {};
  const n = t * 24,
    i = keys.findIndex(([frame]) => frame >= n);
  if (i <= 0) return keys[i === 0 ? 0 : keys.length - 1][1];
  const [start, a] = keys[i - 1],
    [end, b] = keys[i],
    u = (n - start) / (end - start);
  const s = u * u * (3 - 2 * u);
  const result: JointPose = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]))
    result[k] = (a[k] ?? 0) * (1 - s) + (b[k] ?? 0) * s;
  return result;
}
