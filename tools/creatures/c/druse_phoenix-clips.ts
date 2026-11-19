import { readCreatureCard } from '../bodies/card-data';
import { clamp, ease, frames } from './druse_phoenix-timing';
import type { PhoenixPose } from './druse_phoenix-rig';
import type { Animation } from '../types';

const yaw = readCreatureCard('druse_phoenix').life.yaw;

export const clips: Record<string, Animation> = {
  idle: { seconds: 3, loop: true },
  walk: { seconds: 1, loop: true },
  turn: {
    seconds: 4, loop: true,
    bearings: Array.from({ length: 96 }, (_, n) => yaw + n * Math.PI / 48),
  },
  look: { seconds: 1.5 },
  fidget_a: { seconds: 1.75 },
  fidget_b: { seconds: 1.75 },
  tired: { seconds: 1.5 },
  happy: { seconds: 2 },
  'happy-f2': { seconds: 2 },
  sleep_in: { seconds: 1.25 },
  sleep: { seconds: 3.5, loop: true },
  sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
  hatch: { seconds: 2 },
  phase: { seconds: 2 },
  'idle-f2': { seconds: 1.5, loop: true },
  trick: { seconds: 5.25 },
  trick_b: { seconds: 5.25, hits: frames.notes.map(n => n / 24) },
  'trick-f2': { seconds: 5.25 },
  'trick_b-f2': { seconds: 5.25 },
  show: { seconds: 5.75 },
  peek: { seconds: 3 },
};

const restFire: PhoenixPose = { phase: 1, glow: 0.35, wing: 0.14, fan: 0.18 };
const sleep: PhoenixPose = { crouch: 0.92, neck: -11, head: 0.68, eye: 1, fan: -0.55, tail: 0.25 };
const showHold: PhoenixPose = { wing: 0.57, head: -0.22, neck: 6, fan: 0.61, tail: -0.12, glow: 0.37 };
type Key = readonly [frame: number, pose: PhoenixPose, linear?: boolean];

const held = (pose: PhoenixPose) => ({ ...restFire, ...pose });

const tracks: Record<string, Key[]> = {
  idle: [
    [0, {}],
    [19, { neck: 1.2, tail: -0.06, fan: 0.12 }],
    [40, { neck: -0.8, tail: 0.04, head: 0.035 }],
    [57, { eye: 0.92 }],
    [60, { eye: 0.1 }],
    [71, {}],
  ],
  'idle-f2': [
    [0, restFire],
    [12, held({ neck: 1.4, head: -0.035, fan: 0.27, tail: -0.075, glow: 0.42 })],
    [23, held({ neck: -0.7, head: 0.03, tail: 0.05 })],
    [32, held({ eye: 0.85 })],
    [35, restFire],
  ],
  look: [
    [0, {}],
    [7, { neck: 3, yaw: -0.16, head: -0.12 }],
    [13, { neck: 5, yaw: -0.37, head: -0.23, tail: 0.13 }],
    [22, { neck: 3, yaw: 0.32, head: -0.12, lean: 0.08 }],
    [30, { yaw: 0.22, tail: -0.08 }],
    [35, {}],
  ],
  fidget_a: [
    [0, {}],
    [8, { yaw: -0.44, head: 0.17, nearWing: 0.09 }],
    [15, { head: 0.68, yaw: -0.59, neck: -8, nearWing: 0.41, tail: 0.12 }],
    [19, { head: 0.91, yaw: -0.62, neck: -9, nearWing: 0.43, beak: 0.24 }],
    [23, { head: 0.59, yaw: -0.56, neck: -8, nearWing: 0.49 }],
    [27, { head: 0.9, yaw: -0.62, neck: -9, nearWing: 0.42, beak: 0.2 }],
    [35, { tail: -0.12, nearWing: 0.15, head: 0.13 }],
    [41, {}],
  ],
  fidget_b: [
    [0, {}],
    [7, { head: 0.11, fan: -0.35, tail: 0.15, lean: 0.07 }],
    [13, { head: -0.19, nearWing: 0.21, farWing: 0.33, fan: 0.81, tail: -0.27, lean: -0.1 }],
    [17, { nearWing: 0.31, farWing: 0.09, fan: 0.94, tail: 0.19, lean: 0.11 }],
    [22, { nearWing: 0.15, farWing: 0.23, fan: 0.67, tail: -0.14, glow: 0.2 }],
    [31, { fan: 0.3, tail: 0.06 }],
    [41, {}],
  ],
  happy: [
    [0, {}],
    [5, { crouch: 0.63, neck: -3, eye: 0.54, head: 0.13, wing: 0.12 }],
    [10, { dy: -8, flap: -0.75, wing: 0.55, head: -0.43, beak: 0.68, glow: 0.57 }],
    [16, { dy: -14, flap: 0.25, wing: 0.58, head: -0.35, beak: 0.35, fan: 0.67, tuck: 0.25 }],
    [22, { crouch: 0.41, wing: 0.28, tail: -0.17 }],
    [28, { dy: -6, nearWing: 0.58, farWing: 0.19, head: -0.31, yaw: 0.21, beak: 0.55 }],
    [37, { nearWing: 0.24, wing: 0.2, head: 0.13, fan: 0.28 }],
    [47, {}],
  ],
  'happy-f2': [
    [0, restFire],
    [5, held({ wing: 0.31, lean: -0.14, head: -0.34, glow: 0.85, fan: -0.43 })],
    [10, held({ crouch: 0.33, farWing: 0.64, nearWing: 0.33, head: 0.23, fan: 0.9, eye: 0.32, glow: 1 })],
    [16, held({ dy: -11, wing: 0.67, flap: -0.63, head: -0.32, beak: 0.77, glow: 1, tail: -0.31, fan: 0.74 })],
    [23, held({ dy: -9, wing: 0.48, flap: 0.47, lean: 0.14, yaw: -0.37, beak: 0.25, glow: 0.89, fan: 0.8 })],
    [29, held({ crouch: 0.44, farWing: 0.39, nearWing: 0.62, fan: 0.73, head: 0.19, glow: 0.87 })],
    [38, held({ wing: 0.31, yaw: 0.17, head: -0.22, glow: 0.62, fan: 0.59 })],
    [47, restFire],
  ],
  sleep_in: [
    [0, {}],
    [7, { neck: 5, head: -0.37, beak: 0.95, eye: 0.53, fan: 0.11 }],
    [13, { neck: -2, head: 0.13, crouch: 0.27, beak: 0.18 }],
    [22, { neck: -9, head: 0.61, crouch: 0.81, eye: 0.76, fan: -0.31, tail: 0.16 }],
    [29, sleep],
  ],
  sleep: [
    [0, sleep],
    [40, { ...sleep, crouch: 0.86, neck: -10.2, tail: 0.22 }],
    [83, sleep],
  ],
  sleep_out: [
    [0, sleep],
    [7, { ...sleep, eye: 0.41, head: 0.39 }],
    [17, { neck: 5, head: -0.37, crouch: 0.18, wing: 0.36, flap: -0.36, fan: 0.4 }],
    [23, { neck: 2, head: -0.13, wing: 0.18, tail: -0.15 }],
    [29, {}],
  ],
  wake_startled: [
    [0, sleep],
    [3, { crouch: 0.48, head: 0.31, neck: -3, eye: 0.2 }],
    [8, { dy: -9, head: -0.27, wing: 0.53, flap: -0.65, beak: 0.77, fan: 0.6 }],
    [13, { head: 0.18, yaw: -0.51, wing: 0.31, crouch: 0.38, fan: 0.3 }],
    [18, { yaw: 0.39, tail: -0.17 }],
    [23, {}],
  ],
  tired: [
    [0, {}],
    [9, { crouch: 0.48, head: 0.54, eye: 0.48, flap: 0.34, wing: 0.14, fan: -0.35 }],
    [21, { crouch: 0.45, head: 0.44, eye: 0.6, neck: -5, beak: 0.12 }],
    [35, {}],
  ],
  hatch: [
    [0, { size: 0.65, ...sleep, neck: -10, fan: -0.73 }],
    [8, { size: 0.66, crouch: 0.96, neck: -6, head: -0.25, eye: 0.25, fan: -0.55 }],
    [15, { size: 0.81, crouch: 0.52, neck: 6, head: -0.37, beak: 0.51, glow: 0.56 }],
    [22, { size: 0.98, dy: -12, wing: 0.58, flap: -0.57, head: -0.27, fan: 0.7, glow: 0.8 }],
    [28, { dy: -8, wing: 0.7, flap: 0.28, fan: 0.84, beak: 0.26 }],
    [34, { crouch: 0.39, wing: 0.29, tail: -0.21, fan: 0.43 }],
    [47, {}],
  ],
  phase: [
    [0, {}],
    [7, { crouch: 0.43, head: 0.38, wing: 0.09, fan: -0.6, glow: 0.25 }],
    [13, { crouch: 0.65, head: 0.44, phase: 0.16, glow: 0.77, tail: 0.12, fan: -0.37 }],
    [19, { crouch: 0.32, phase: 0.43, glow: 1, wing: 0.28, head: 0.2, fan: 0.2 }],
    [25, { phase: 0.74, glow: 1, dy: -10, neck: 7, head: -0.42, wing: 0.7, flap: -0.34, fan: 0.76 }],
    [31, { phase: 0.94, glow: 1, dy: -12, neck: 4, head: -0.32, wing: 0.83, flap: 0.12, fan: 1, tail: -0.19 }],
    [38, held({ glow: 0.62, wing: 0.54, flap: 0.35, crouch: 0.19, fan: 0.51 })],
    [47, restFire],
  ],
  trick: [
    [0, {}],
    [12, { head: 0.21, yaw: -0.23, crouch: 0.2, nearWing: 0.14 }],
    [19, { head: 0.49, yaw: -0.45, crouch: 0.29, neck: -5, nearWing: 0.38, fan: -0.35 }],
    [25, { wing: 0.26, nearWing: 0.51, farWing: 0.21, flap: -0.4, head: -0.2, neck: 4, glow: 0.41 }],
    [36, { wing: 0.4, flap: 0.19, head: -0.38, yaw: 0.08, neck: 5, tail: -0.15, fan: 0.56, glow: 0.4 }],
    [51, { nearWing: 0.17, farWing: 0.34, head: -0.29, yaw: -0.12, neck: 2, tail: 0.1, fan: 0.39 }],
    [64, { lean: -0.09, wing: 0.23, head: -0.42, neck: 3, yaw: 0.08, eye: 0.2, fan: 0.43 }],
    [76, { crouch: 0.17, head: -0.08, neck: 0, wing: 0.16, fan: 0.22 }],
    [82, { crouch: 0.24, head: 0.17, wing: 0.19, fan: 0.35, eye: 0.42 }],
    [93, { wing: 0.46, neck: 5, head: -0.22, fan: 0.73, glow: 0.49 }],
    [105, { wing: 0.45, neck: 4, head: -0.18, fan: 0.68, glow: 0.45 }],
    [114, { crouch: 0.21, neck: 3, head: 0.31, fan: 0.61, wing: 0.29, eye: 0.41 }],
    [125, {}],
  ],
  trick_b: [
    [0, {}],
    [12, { dx: 3, neck: 3, head: 0.16, yaw: 0.15, wing: 0.11 }],
    [22, { dx: 3, lean: -0.12, neck: -3, head: -0.3, farWing: 0.19, tail: -0.16 }],
    [frames.notes[0], { dx: 2.92, lean: 0.1, neck: 5, head: 0.5, crouch: 0.311, nearWing: 0.14, tail: 0.37 }],
    [32, { dx: 9, lean: -0.09, neck: 1, head: -0.14, nearWing: 0.19, fan: 0.25 }],
    [42, { dx: 20, lean: 0.05, step: [-4, 5], lift: [0, 4], head: 0.18, tail: 0.12 }],
    [47, { dx: 23.5, lean: -0.12, neck: 0, head: -0.28, farWing: 0.27, tail: -0.13 }],
    [frames.notes[1], { dx: 23.5, lean: 0.04, neck: 3, head: 0.45, crouch: 0.198, nearWing: 0.16, tail: 0.31 }],
    [58, { dx: 24, lean: -0.12, head: -0.2, farWing: 0.3, fan: 0.22 }],
    [67, { dx: 43, lean: 0.06, step: [6, -4], lift: [5, 0], neck: 2, head: 0.13 }],
    [71, { dx: 47, lean: -0.16, neck: -2, head: -0.31, tail: -0.19, farWing: 0.35 }],
    [frames.notes[2], { dx: 48.52, lean: -0.11, neck: 1, head: 0.55, crouch: 0.044, nearWing: 0.17, tail: 0.28 }],
    [83, { dx: 44, lean: -0.24, neck: -5, head: -0.34, wing: 0.53, fan: 0.63, beak: 0.46 }],
    [93, { dx: 35, lean: -0.13, step: [3, -3], lift: [0, 5], head: -0.13, wing: 0.34, fan: 0.42 }],
    [105, { dx: 16, lean: -0.08, step: [-3, 3], lift: [4, 0], head: -0.24, fan: 0.27 }],
    [116, { dx: 4, nearWing: 0.18, yaw: -0.15, head: 0.04 }],
    [125, {}],
  ],
  'trick-f2': [
    [0, restFire],
    [12, held({ dx: -8, crouch: 0.43, wing: 0.25, neck: -3, head: 0.13, fan: -0.37 })],
    [20, held({ dx: -10, crouch: 0.66, wing: 0.61, flap: -0.76, head: -0.19, fan: 0.22 })],
    [30, held({ dx: 8, dy: -27, lean: -0.19, wing: 0.61, flap: 0.39, neck: 3, head: -0.27, fan: 0.76, tuck: 0.55, glow: 0.81 })],
    [40, held({ dx: 28, dy: -34, lean: 0.22, nearWing: 0.44, farWing: 0.66, flap: -0.32, head: 0.28, fan: 0.77, tuck: 0.68, glow: 0.99 })],
    [51, held({ dx: 17, dy: -28, lean: 0.16, wing: 0.6, flap: 0.43, head: 0.2, tail: 0.29, tuck: 0.25, glow: 0.89 })],
    [61, held({ dx: -16, dy: -15, lean: -0.17, wing: 0.54, flap: -0.24, head: -0.16, fan: 0.6 })],
    [71, held({ dx: -42, crouch: 0.41, wing: 0.29, flap: 0.27, head: 0.11, fan: 0.28 })],
    [82, held({ dx: -43, crouch: 0.77, neck: -5, head: -0.26, wing: 0.39, flap: -0.45 })],
    [89, held({ dx: -31, dy: -22, lean: 0.35, neck: 5, head: -0.09, wing: 0.36, tuck: 0.63, fan: -0.28 }), true],
    [96, held({ dx: -4, dy: -36, lean: 0.58, neck: 3, head: 0.12, wing: 0.25, fan: -0.55, tuck: 0.87, glow: 0.7 }), true],
    [103, held({ dx: 31, dy: -27, lean: 0.23, neck: 2, head: -0.12, wing: 0.33, flap: -0.32, tuck: 0.45 }), true],
    [111, held({ dx: 26, crouch: 0.54, wing: 0.39, flap: 0.36, tail: -0.22, fan: 0.67 })],
    [120, held({ dx: 6, neck: 3, head: -0.18, fan: 0.41 })],
    [125, restFire],
  ],
  'trick_b-f2': [
    [0, restFire],
    [13, held({ head: -0.23, neck: 5, wing: 0.26, fan: 0.54, glow: 0.7 })],
    [21, held({ dy: -8, crouch: 0.42, head: 0.41, wing: 0.49, flap: -0.37, tuck: 0.41, glow: 0.8 })],
    [31, held({ dy: -20, crouch: 0.67, head: 0.75, neck: -9, wing: 0.34, flap: 0.35, fan: -0.75, tuck: 0.9, eye: 0.84, size: 0.77, glow: 1 })],
    [38, held({ hidden: true, dy: -17, crouch: 0.81, head: 0.7, wing: 0.38, tuck: 0.9, size: 0.64, glow: 1 })],
    [65, held({ hidden: true, dy: -9, crouch: 0.75, head: 0.65, wing: 0.23, tuck: 0.8, size: 0.67, glow: 1 })],
    [68, held({ dy: -17, crouch: 0.61, head: 0.16, wing: 0.27, tuck: 0.5, size: 0.69, glow: 1 })],
    [76, held({ dy: -31, head: -0.37, neck: 5, wing: 0.64, flap: -0.31, size: 0.98, fan: 0.87, tuck: 0.38, glow: 1 })],
    [85, held({ dy: -20, head: -0.25, neck: 4, wing: 0.75, flap: 0.37, fan: 0.95, glow: 1 })],
    [95, held({ crouch: 0.42, wing: 0.53, flap: 0.48, head: 0.18, fan: 0.63, glow: 0.96 })],
    [109, held({ wing: 0.44, head: -0.18, fan: 0.62, glow: 0.79 })],
    [125, restFire],
  ],
  show: [
    [0, { hidden: true, size: 0.71 }],
    [62, { hidden: true, size: 0.71, crouch: 0.77, neck: -5, head: 0.32 }],
    [65, { size: 0.75, crouch: 0.71, neck: -2, head: 0.38, tail: 0.19, glow: 0.49 }],
    [70, { size: 0.81, dy: -5, crouch: 0.5, neck: 5, head: -0.11, wing: 0.19, farWing: 0.49 }],
    [77, { size: 0.97, dy: -22, neck: 5, head: -0.37, wing: 0.62, flap: -0.38, tail: -0.21, tuck: 0.39, glow: 0.86 }],
    [88, { dy: -28, head: -0.29, neck: 5, wing: 0.84, flap: 0.23, tail: -0.17, fan: 0.75, glow: 0.94, tuck: 0.29 }],
    [103, { crouch: 0.39, head: 0.12, wing: 0.57, flap: 0.3, fan: 0.62, tail: 0.24, glow: 0.58 }],
    [111, { nearWing: 0.68, farWing: 0.57, head: -0.26, neck: 7, fan: 0.84, tail: -0.19, glow: 0.46 }],
    [117, showHold],
    [137, showHold],
  ],
  peek: [
    [0, {}],
    [9, { crouch: 0.57, head: -0.43, nearWing: 0.43, farWing: 0.48, flap: -0.39, fan: 0.37 }],
    [17, { dx: 7, dy: -31, size: 0.78, lean: -0.09, wing: 0.58, flap: 0.31, head: -0.38, tuck: 0.45 }, true],
    [25, { dx: 27, dy: -98, size: 0.48, lean: -0.11, wing: 0.71, flap: -0.48, tuck: 0.58, head: -0.33 }, true],
    [31, { dx: 34, dy: -151, size: 0.39, wing: 0.52, flap: 0.4, tuck: 0.18, over: true }, true],
    [37, { dx: 38, dy: -154, size: 0.33, lift: [0, 8], wing: 0.16, head: 0.83, neck: -8, crouch: 0.7, fan: -0.46, over: true }],
    [46, { dx: 38, dy: -154, size: 0.33, lift: [0, 8], wing: 0.16, head: 0.89, neck: -9, crouch: 0.73, fan: -0.46, yaw: -0.16, over: true }],
    [53, { dx: 33, dy: -151, size: 0.39, wing: 0.46, head: 0.22, over: true }],
    [59, { dx: 27, dy: -105, size: 0.49, wing: 0.71, flap: 0.38, head: 0.22, tuck: 0.42, over: true }, true],
    [65, { dx: 13, dy: -39, size: 0.78, wing: 0.56, flap: -0.41, head: 0.08, tuck: 0.31 }, true],
    [70, { wing: 0.19, crouch: 0.32, head: 0.12 }],
    [71, {}],
  ],
};

type NumericChannel = {
  [Channel in keyof PhoenixPose]-?: NonNullable<PhoenixPose[Channel]> extends number ? Channel : never
}[keyof PhoenixPose];
const channels: NumericChannel[] = [
  'dx', 'dy', 'lean', 'crouch', 'neck', 'head', 'yaw', 'wing', 'flap',
  'tail', 'fan', 'tuck', 'phase', 'glow', 'eye', 'beak', 'size', 'nearWing', 'farWing',
];

function sample(keys: Key[], n: number): PhoenixPose {
  const i = keys.findIndex(([frame]) => frame >= n - 1e-8);
  if (i <= 0) return keys[i === 0 ? 0 : keys.length - 1][1];
  const [lo, a] = keys[i - 1], [hi, b, linear] = keys[i];
  if (Math.abs(n - hi) < 1e-8) return b;
  const progress = clamp((n - lo) / (hi - lo));
  const u = linear ? progress : ease(progress);
  const mix = (from: number, to: number) => from + (to - from) * u;
  const pose: PhoenixPose = { hidden: a.hidden, over: a.over };
  for (const channel of channels) {
    const base = channel === 'size' ? 1 : 0;
    const wing = channel === 'nearWing' || channel === 'farWing' || channel === 'wing';
    const from = a[channel] ?? (wing ? a.wing ?? 0.12 : base);
    const to = b[channel] ?? (wing ? b.wing ?? 0.12 : base);
    pose[channel] = mix(from, to);
  }
  if (a.step || b.step)
    pose.step = [0, 1].map(j => mix(a.step?.[j] ?? 0, b.step?.[j] ?? 0)) as [number, number];
  if (a.lift || b.lift)
    pose.lift = [0, 1].map(j => mix(a.lift?.[j] ?? 0, b.lift?.[j] ?? 0)) as [number, number];
  return pose;
}

export function gesture(anim: string, t: number): PhoenixPose {
  const keys = tracks[anim];
  const n = 24 * t;
  const pose = keys ? sample(keys, n) : {};
  if (anim !== 'peek' || n < frames.feather || n >= 67) return pose;
  // Screen-space path digs across the lip of the frame, then spins free of the portrait.
  return { ...pose, overFeather: featherFall(n) };
}

function featherFall(n: number): [number, number, number, number, number] {
  const f = n - frames.feather;
  const x = 46 + f * 0.74 + 8 * Math.sin(f * 0.17);
  const y = -175 + 0.10 * f * f;
  return [x, y, f * 0.17 + 0.31, 0.96, 1 - ease(clamp((n - 59) / 8))];
}
