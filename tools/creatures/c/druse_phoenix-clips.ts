import { readCreatureCard } from '../bodies/card-data';
import { clamp, ease, frames, ramp } from './druse_phoenix-timing';
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
const showHold: PhoenixPose = { wing: .98, bearing: 1.05, flap: .19, head: -.23, neck: 4, fan: .44, tail: -.2, glow: .34 };
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
    [8, { crouch: .52, neck: -5, head: .36, wing: .21, fan: -.46 }],
    [15, { crouch: .79, head: .46, wing: .40, tail: .33, fan: -.3 }],
    [19, { crouch: .54, wing: .82, bearing: .70, fan: .28, tail: -.22, glow: .9 }],
    [22, { dy: -12, wing: 1, bearing: 1, flap: -.48, neck: 6, head: -.32, fan: .78, glow: 1 }],
    [26, held({ dy: -30, wing: 1, bearing: 1.1, flap: .25, head: -.39, fan: .73, glow: 1 })],
    [34, held({ dy: -19, wing: .82, bearing: .75, flap: -.3, neck: 3, head: -.2, fan: .68, glow: .9 })],
    [40, held({ crouch: .41, wing: .67, bearing: .29, flap: -.37, fan: .51, glow: .58 })],
    [47, restFire],
  ],
  trick: [
    [0, {}],
    [8, { crouch: .27, neck: -4, head: .2, wing: .32 }],
    [15, { dx: -9, crouch: .83, bearing: -2.55, wing: .72, flap: -.64, tail: .3 }],
    [18, { dx: -24, dy: -30, bearing: -2.21, size: .83, wing: 1, neck: 6, tuck: .65 }],
    [28, { dx: -57, dy: -75, bearing: -1.63, size: .72, wing: 1, tuck: .9, fan: -.3 }, true],
    [34, { dx: -50, dy: -75, bearing: 1.03, size: .73, wing: 1, tuck: .83, head: -.2, fan: .56 }],
    [42, { dx: -35, dy: -70, bearing: .9, size: .71, wing: .95, tuck: .78, head: -.17 }, true],
    [58, { dx: 17, dy: -39, bearing: .3, size: .74, wing: .94, tuck: .62, neck: 5 }, true],
    [69, { dx: 59, dy: -29, bearing: .02, size: .75, wing: .84, tuck: .58, head: -.32 }, true],
    [77, { dx: 56, dy: -25, bearing: .14, size: .78, wing: .7, tuck: .44, head: -.15 }],
    [86, { dx: 42, dy: -21, bearing: .87, size: .83, wing: .88, tuck: .2, head: .13 }],
    [96, { dx: 29, dy: -6, bearing: 1.38, size: .93, wing: .91, flap: -.36, tail: -.1 }, true],
    [100, { dx: 28, crouch: .58, bearing: 1, size: .97, wing: .88, flap: -.4, head: .31 }],
    [109, { dx: 20, crouch: .2, bearing: .54, wing: .34, head: .34 }],
    [118, { dx: 4, wing: .23, head: .1 }],
    [125, {}],
  ],
  trick_b: [
    [0, {}],
    [8, { crouch: .38, neck: -3, bearing: -.64, wing: .32, tail: .07 }],
    [13, { dx: -10, crouch: .74, bearing: -2.65, wing: .8, flap: -.58, tail: .16 }],
    [16, { dx: -31, dy: -33, bearing: -2.3, size: .8, wing: .99, tuck: .6 }],
    [23, { dx: -58, dy: -55, bearing: -1.71, size: .7, wing: 1, tuck: .71 }, true],
    [29, { dx: -50, dy: -57, bearing: .88, size: .73, wing: 1, tuck: .66, neck: 4 }],
    [35, { dx: -7, dy: -9, bearing: .14, size: .94, wing: .76, flap: -.39, head: -.18 }, true],
    [37, { dx: 2.92, crouch: .42, wing: .38, head: -.28, neck: 1 }],
    [frames.notes[0], { dx: 2.92, lean: .1, neck: 5, head: .5, crouch: .311, nearWing: .14, tail: .37 }],
    [frames.notes[0] + 3, { dx: 2.92, lean: .1, neck: 5, head: .5, crouch: .311, nearWing: .14, tail: .37 }],
    [47, { dx: 3, lean: -.18, head: -.39, neck: -4, wing: .27 }],
    [53, { dx: 16, step: [-3, 6], lift: [0, 4], wing: .26, neck: 5, head: -.05 }, true],
    [56, { dx: 23.5, lean: -.1, head: -.22, wing: .18 }],
    [frames.notes[1], { dx: 23.5, lean: .04, neck: 3, head: .45, crouch: .198, nearWing: .16, tail: .31 }],
    [frames.notes[1] + 3, { dx: 23.5, lean: .04, neck: 3, head: .45, crouch: .198, nearWing: .16, tail: .31 }],
    [67, { dx: 24, lean: -.18, head: -.33, wing: .36, tail: -.28 }],
    [75, { dx: 46, step: [6, -5], lift: [5, 0], lean: .01, head: -.16, wing: .31 }, true],
    [79, { dx: 48.52, lean: -.17, head: -.29, farWing: .44 }],
    [frames.notes[2], { dx: 48.52, lean: -.11, neck: 1, head: .55, crouch: .044, nearWing: .17, tail: .28 }],
    [frames.notes[2] + 3, { dx: 48.52, lean: -.11, neck: 1, head: .55, crouch: .044, nearWing: .17, tail: .28 }],
    [89, { dx: 42, dy: -8, wing: .71, head: -.4, tuck: .3, size: .92, bearing: -1.0 }],
    [99, { dx: 21, dy: -21, wing: .79, head: -.16, tuck: .43, size: .85, bearing: -1.98 }, true],
    [110, { dx: 4, wing: .77, flap: -.42, crouch: .5, bearing: -1.1 }],
    [119, { dx: 2, head: .09, wing: .23 }],
    [125, {}],
  ],
  'trick-f2': [
    [0, restFire],
    [4, held({ dx: -3.5, crouch: .3, bearing: -.77, wing: .29, tail: .29 })],
    [8, held({ dx: -7, crouch: .6, bearing: -1.54, wing: .44, tail: .49 })],
    [14, held({ dx: -29, crouch: .84, bearing: -2.6, wing: .77, flap: -.62, tail: .48 })],
    [17, held({ dx: -48, dy: -36, bearing: -2.22, size: .81, wing: .97, tuck: .66, tail: .10 })],
    [25, held({ dx: -61, dy: -96, bearing: -1.64, size: .72, wing: 1, tuck: .88, glow: 1 }), true],
    [34, held({ dx: -38, dy: -78, bearing: .96, size: .72, wing: 1, tuck: .85, glow: 1 })],
    [46, held({ dx: 17, dy: -42, bearing: .16, size: .72, wing: .94, tuck: .71, neck: 5 }), true],
    [56, held({ dx: 61, dy: -25, bearing: .45, size: .78, wing: .89, tuck: .63 }), true],
    [64, held({ dx: 40, dy: -15, bearing: 1.9, size: .78, wing: .8, tuck: .45, flap: -.35 })],
    [74, held({ dx: 9, dy: -2, bearing: -2.7, size: .85, wing: .68, crouch: .52, tail: .17 }), true],
    [81, held({ dx: -20, crouch: .75, bearing: -1.4, size: .91, wing: .55, flap: -.52, tail: .41 })],
    [88, held({ dx: -19, crouch: .69, bearing: .28, size: .82, wing: .58, flap: -.53, tail: .08 })],
    [91, held({ dx: -2, dy: -28, bearing: .1, size: .68, wing: .45, tuck: .84, lean: .32 }), true],
    [98, held({ dx: 26, dy: -41, bearing: .12, size: .67, wing: .34, tuck: .92, lean: .39 }), true],
    [105, held({ dx: 52, dy: -22, bearing: .16, size: .73, wing: .61, tuck: .63 }), true],
    [111, held({ dx: 46, crouch: .55, bearing: .98, size: .86, wing: .88, flap: -.35 })],
    [119, held({ dx: 11, crouch: .19, bearing: -.3, wing: .38 }), true],
    [125, restFire],
  ],
  'trick_b-f2': [
    [0, restFire],
    [4, held({ crouch: .22, bearing: -1.28, wing: .24, fan: .12, tail: .31 })],
    [8, held({ crouch: .45, bearing: -2.55, wing: .33, fan: .24, tail: .33 })],
    [14, held({ dx: -13, crouch: .84, bearing: -2.6, wing: .62, flap: -.52, tail: .28 })],
    [17, held({ dx: -26, dy: -28, bearing: -2.37, size: .87, wing: .96, tuck: .63, tail: .12 })],
    [26, held({ dx: -49, dy: -44, bearing: -1.65, size: .76, wing: 1, tuck: .76 }), true],
    [34, held({ dx: -58, dy: -23, bearing: -2.31, size: .38, wing: .16, tuck: 1, head: .75, crouch: .87, fan: -.76 })],
    [38, held({ dx: -55, dy: -19, bearing: 1.05, size: .22, tuck: 1, crouch: 1, head: .7, wing: .12, hidden: true })],
    [41, held({ dx: -52, hidden: true })],
    [65, held({ dx: 56, hidden: true }), true],
    [70, held({ dx: 59, hidden: true })],
    [73, held({ dx: 58, dy: -12, size: .48, crouch: .7, wing: .34, bearing: .93, tuck: .8, glow: 1 })],
    [78, held({ dx: 54, dy: -43, size: .72, wing: 1, bearing: 1, tuck: .77, glow: 1 })],
    [91, held({ dx: 12, dy: -63, size: .77, wing: 1, bearing: 1.1, tuck: .72, glow: .96 }), true],
    [103, held({ dx: -17, dy: -25, size: .86, wing: .92, bearing: 1.48, tuck: .33, glow: .84 }), true],
    [110, held({ dx: -11, crouch: .63, wing: .8, bearing: 1.04, flap: -.49, glow: .63 })],
    [119, held({ dx: -2, wing: .33, head: -.19 })],
    [125, restFire],
  ],
  show: [
    [0, { hidden: true }],
    [66, { hidden: true, dx: -36 }],
    [67, { dx: -36, dy: -28, size: .34, crouch: .74, wing: .22, bearing: 1, tuck: .9, glow: .68 }],
    [71, { dx: -38, dy: -49, size: .77, wing: 1, bearing: 1.03, tuck: .83, neck: 6, glow: .8 }],
    [80, { dx: -9, dy: -68, size: .80, wing: 1, bearing: 1.12, tuck: .72, head: -.2, glow: .82 }, true],
    [93, { dx: 44, dy: -53, size: .80, wing: 1, bearing: .35, tuck: .64 }, true],
    [106, { dx: 22, dy: -12, size: .95, wing: .99, bearing: 1.1, tuck: .31, flap: -.5 }, true],
    [111, { dx: 7, crouch: .53, wing: .96, bearing: 1.12, flap: -.44, head: .12 }],
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
  'tail', 'fan', 'tuck', 'phase', 'bearing', 'glow', 'eye', 'beak', 'size', 'nearWing', 'farWing',
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
  const pose: PhoenixPose = { remiges: 1, ...(keys ? sample(keys, n) : {}) };
  const airborne = flightWindows[anim]?.find(([from, to]) => n >= from && n < to);
  if (airborne) {
    const [from, to] = airborne;
    const age = n - from;
    const envelope = Math.min(1, age / 2, (to - n) / 4);
    const cycle = age % 8;
    const stroke = cycle < 3 ? ease(cycle / 3) : 1 - ease((cycle - 3) / 5);
    pose.flap = (pose.flap ?? 0) + envelope * (stroke * 1.33 - .69);
    pose.dy = (pose.dy ?? 0) - 4.8 * stroke * envelope;
  }
  if (anim === 'phase') pose.ignition = ramp(n, 15, 26);
  if ((anim === 'trick' && n >= 22 && n <= 39) ||
      (anim === 'trick_b' && n >= 19 && n <= 29) ||
      (anim === 'trick-f2' && n >= 17 && n <= 35) ||
      (anim === 'trick_b-f2' && n >= 20 && n <= 29) ||
      (anim === 'show' && n >= 77 && n <= 92)) pose.over = true;
  if (anim !== 'peek' || n < frames.feather || n >= 67) return pose;
  // Screen-space path digs across the lip of the frame, then spins free of the portrait.
  return { ...pose, overFeather: featherFall(n) };
}

const flightWindows: Record<string, [number, number][]> = {
  trick: [[17, 76]],
  trick_b: [[16, 34], [89, 107]],
  'trick-f2': [[17, 62], [91, 108]],
  'trick_b-f2': [[17, 34], [74, 108]],
  show: [[67, 107]],
  phase: [[22, 39]],
};

function featherFall(n: number): [number, number, number, number, number] {
  const f = n - frames.feather;
  const x = 46 + f * 0.74 + 8 * Math.sin(f * 0.17);
  const y = -175 + 0.10 * f * f;
  return [x, y, f * 0.17 + 0.31, 0.96, 1 - ease(clamp((n - 59) / 8))];
}
