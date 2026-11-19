import type { FrostPose } from '../bodies/armed-biped';
import { everyday } from '../rig/figure';

export const clips = {
  ...everyday,
  idle: { seconds: 3, loop: true },
  happy: { seconds: 2 },
  trick: { seconds: 2.5 },
  fidget_a: { seconds: 2 },
  fidget_b: { seconds: 2 },
  sleep_in: { seconds: 1.25 },
  sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
  sleep: { seconds: 3.5, loop: true },
};
const asleep = { nest: 1, nod: 0.6, blink: 1 };
type Key = [number, FrostPose];
const tracks: Record<string, Key[]> = {
  idle: [
    [0, {}],
    [12, { stretch: 1.8, nod: -0.14 }],
    [30, { stretch: -1 }],
    [42, { lapel: 1 }],
    [57, { lapel: 0.3, blink: 1 }],
    [71, {}],
  ],
  look: [
    [0, {}],
    [8, { nod: 0.65 }],
    [17, { nod: -0.55, stretch: 2 }],
    [26, { gaze: 2.2 }],
    [35, {}],
  ],
  fidget_a: [
    [0, {}],
    [9, { nod: 0.4, gaze: 0.45 }],
    [20, { lapel: 1, nod: 0.42 }],
    [30, { lapel: 0.7, twist: 0.25 }],
    [39, { nod: -0.15 }],
    [47, {}],
  ],
  fidget_b: [
    [0, {}],
    [10, { nod: 0.53 }],
    [18, { leg: 1, wing: 0.3, roll: 0.16 }],
    [26, { leg: 0.5, wing: 0.7, roll: 0.1 }],
    [34, { leg: 1, wing: 0.4 }],
    [47, {}],
  ],
  happy: [
    [0, {}],
    [8, { squat: 5, wing: 1 }],
    [16, { clap: 1, stretch: 2, nod: -0.2 }],
    [22, { wing: 0.85, nod: -0.15 }],
    [28, { clap: 1, stretch: 2 }],
    [36, { wing: 1, nod: -0.4, stretch: 3 }],
    [47, {}],
  ],
  trick: [
    [0, {}],
    [9, { squat: 3 }],
    [21, { leg: 1, wing: 1, roll: 0.16 }],
    [31, { leg: 1.15, wing: 1, roll: -0.12 }],
    [45, { bow: 0.68, wing: -0.66 }],
    [59, {}],
  ],
  sleep_in: [
    [0, {}],
    [8, { nod: -0.4 }],
    [17, { nest: 0.6, nod: 0.3 }],
    [29, asleep],
  ],
  sleep_out: [
    [0, asleep],
    [10, { nest: 0.7, nod: 0.2, blink: 0.3 }],
    [19, { stretch: 3, nod: -0.42 }],
    [29, {}],
  ],
  wake_startled: [
    [0, asleep],
    [4, { nest: 0.7, nod: 0.14 }],
    [9, { jump: 9, wing: 1, nod: -0.4 }],
    [14, { squat: 5, wing: 0.65, gaze: -0.27 }],
    [23, {}],
  ],
  hatch: [
    [0, {}],
    [6, { nest: 1.3, nod: 0.3, shell: 1, stretch: -4 }],
    [15, { stretch: 3, wing: 0.55, roll: 0.15 }],
    [18, { wing: 0.5, roll: -0.12 }],
    [27, { salute: 1, nod: -0.24 }],
    [35, {}],
  ],
};
export function gesture(anim: string, t: number): FrostPose {
  if (anim === 'sleep') return asleep;
  const keys = tracks[anim];
  if (!keys) return {};
  const f = t * 24,
    i = keys.findIndex(([frame]) => frame >= f);
  if (i <= 0) return keys[i === 0 ? 0 : keys.length - 1][1];
  const [lo, a] = keys[i - 1],
    [hi, b] = keys[i];
  let u = (f - lo) / (hi - lo);
  u = u * u * (3 - 2 * u);
  return Object.fromEntries(
    [...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [
      k,
      (a[k] ?? 0) * (1 - u) + (b[k] ?? 0) * u,
    ]),
  );
}
