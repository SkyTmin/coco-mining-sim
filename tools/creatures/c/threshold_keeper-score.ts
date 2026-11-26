import { keyframer, type Track } from '../kit/pet-moves';
import { everyday } from '../rig/figure';
import type { Animation, XY } from '../types';
export const home: XY = [125, 168],
  exit: XY = [263, 90],
  lock: XY = [10, 94],
  city: XY = [186, 87];
export const tau = 2 * Math.PI,
  clamp = (x: number) => Math.max(0, Math.min(1, x));
export const ease = (a: number, b: number, n: number) => {
  const u = clamp((n - a) / (b - a));
  return u * u * (3 - 2 * u);
};
export const span = (n: number, a: number, b: number, c: number, d: number) => ease(a, b, n) - ease(c, d, n);
export const mix = (a: number, b: number, u: number) => a + (b - a) * u;
export const lerp = (a: XY, b: XY, u: number): XY => [mix(a[0], b[0], u), mix(a[1], b[1], u)];
const rest = {},
  high = { form: 1 },
  sleeping = { low: 1, shut: 1, ear: -0.7, curl: 1, chin: 0.3 };
const listen = { turnHead: 1.7, ear: 1, chin: -0.23 },
  knock = { turnHead: -0.72, ear: 0.67, reach: 1 };
const apart = { park: 1 },
  open = { ...apart, open: 1 },
  second = { ...high, ...apart };
const ground = { ...open, s: 0.49, yaw: 1.63 },
  step = { ...open, s: 0.75, leap: 1 };
const portal = { ...ground, pass: 1 },
  nearKey = { ...high, key: 1, reach: 1 },
  fold = { ...second, map: 1, reach: 1 };
const tracks: Record<string, Track> = {
  fidget_a: [
    [0, rest],
    [5, { ear: 0.15 }],
    [8, listen],
    [17, listen],
    [21, { ...knock, reach: 0.55 }],
    [24, knock],
    [29, { ...listen, open: 0.24 }],
    [34, { ...knock, reach: 0.45 }],
    [37, knock],
    [45, { ...listen, open: 0.33, grin: 1 }],
    [52, rest],
  ],
  look: [
    [0, rest],
    [5, { ear: 1, turnHead: 0.54 }],
    [12, { ear: 1, turnHead: 0.54 }],
    [17, { ear: 0.36, turnHead: -0.64, chin: -0.15 }],
    [26, { ear: 0.36, turnHead: -0.64, chin: -0.15 }],
    [35, rest],
  ],
  fidget_b: [
    [0, rest],
    [6, { chin: 0.42 }],
    [13, { reach: 0.6, chin: 0.37, key: 0.72 }],
    [20, { reach: 1, key: 1, chin: -0.15 }],
    [26, { reach: 1, key: 1, chin: -0.15 }],
    [30, { reach: 1, key: 1, keyTip: 0.96, ear: 1 }],
    [38, { reach: 0.8, key: 1, grin: 1 }],
    [48, rest],
  ],
  happy: [
    [0, rest],
    [5, { low: 0.82 }],
    [9, { lift: 11, ear: 1, grin: 1 }],
    [16, { lift: 14, curl: 1, grin: 1 }],
    [21, { low: 0.8 }],
    [30, { ear: 1, grin: 1, open: 0.27 }],
    [42, rest],
  ],
  'happy-f2': [
    [0, high],
    [5, { ...high, low: 0.8 }],
    [9, { ...high, lift: 17, banner: 1, open: 0.55 }],
    [18, { ...high, lift: 17, banner: 1, open: 0.55, grin: 1 }],
    [24, { ...high, low: 0.75 }],
    [40, high],
  ],
  sleep_in: [
    [0, rest],
    [8, { ear: -0.55, shut: 0.4 }],
    [20, sleeping],
    [29, sleeping],
  ],
  sleep_out: [
    [0, sleeping],
    [8, { ...sleeping, shut: 0.34 }],
    [17, { ear: 0.9, chin: -0.2, grin: 0.6 }],
    [29, rest],
  ],
  wake_startled: [
    [0, sleeping],
    [5, { ...sleeping, shut: 0, ear: 1 }],
    [9, { lift: 15, curl: 1, ear: 1 }],
    [15, { low: 0.74 }],
    [23, rest],
  ],
  tired: [
    [0, rest],
    [11, { low: 0.7, shut: 0.67, chin: 0.41 }],
    [24, { low: 0.68, shut: 0.64 }],
    [35, rest],
  ],
  hatch: [
    [0, { houseS: 0.46, s: 0.07, hide: 1, low: 1 }],
    [10, { houseS: 0.46, s: 0.07, hide: 1, low: 1 }],
    [16, { houseS: 0.54, s: 0.35, low: 1, open: 0.3 }],
    [25, { houseS: 0.79, s: 0.78, low: 1 }],
    [32, { lift: 10, s: 1.03, ear: 1 }],
    [38, { low: 0.75 }],
    [51, rest],
  ],
  // The empty house stands on jacks. The animal crosses one virtual threshold nose first.
  trick: [
    [0, rest],
    [9, listen],
    [15, { low: 1, park: 0.35 }],
    [23, { park: 1, x: 34, s: 0.75, leap: 1 }],
    [33, { ...open, x: 45, s: 0.62, yaw: 1.48 }],
    [43, { ...portal, passMix: 1, slide: 47 }],
    [51, { ...portal, passMix: 1, slide: 43, low: 0.28 }],
    [65, { ...portal, passMix: 1, slide: 7, leap: 0.6 }],
    [74, { ...portal, passMix: 1, slide: -6, ear: 0.8 }],
    [82, { ...portal, passMix: 1, slide: -16, ear: 0.8 }],
    [94, { ...portal, passMix: 1, slide: -45 }],
    [105, { ...open, x: 73, lift: 47, s: 0.79, yaw: 1.4, leap: 1 }],
    [113, { ...apart, x: 64, lift: 4, s: 0.86, low: 0.8 }],
    [122, { ...apart, x: 64, s: 0.86, turnHead: -0.8 }],
    [132, { ...apart, x: 22, lift: 21, s: 0.9, yaw: 1.55, leap: 1 }],
    [142, { park: 0.74, low: 0.8 }],
    [152, { ear: 1, grin: 1 }],
    [161, rest],
  ],
  // A real concertina staircase grows from the threshold and carries its maker across a gap.
  trick_b: [
    [0, rest],
    [9, knock],
    [17, { park: 0.52, low: 1 }],
    [27, { ...open, x: -26, lift: 8, s: 0.76, yaw: 1.18, reach: 1 }],
    [38, { ...open, x: -40, lift: 11, s: 0.66, yaw: 0.8, reach: 1 }],
    [48, { ...open, x: -36, lift: 12, s: 0.68, reach: 1 }],
    [58, { ...open, x: 0, lift: 24, s: 0.73, reach: 1, leap: 1 }],
    [66, { ...open, x: 7, lift: 6, s: 0.72, low: 0.74 }],
    [77, { ...step, x: 43, lift: 41 }],
    [84, { ...step, x: 54, lift: 24, low: 0.65, leap: 0 }],
    [96, { ...step, x: 91, lift: 59, s: 0.64 }],
    [103, { ...step, x: 94, lift: 41, s: 0.65, leap: 0 }],
    [112, { ...open, x: 89, lift: 44, s: 0.7, ear: 1, turnHead: -0.75 }],
    [121, { ...step, x: 48, lift: 62, yaw: 1.63 }],
    [132, { ...open, x: 0, lift: 22, s: 0.86, yaw: 1.7 }],
    [141, { park: 0.75, low: 0.86 }],
    [151, { grin: 1 }],
    [158, rest],
  ],
  phase: [
    [0, rest],
    [8, { chin: -0.15, ear: 1 }],
    [15, { low: 0.8, open: 0.65 }],
    [22, { low: 1, open: 0.95, keyTip: 0.9 }],
    [29, { low: 0.78, form: 0.18, banner: 1 }],
    [39, { form: 0.84, lift: 7, banner: 1, ear: 1 }],
    [48, { ...high, lift: 5, grin: 1, banner: 1 }],
    [57, { ...high, low: 0.45 }],
    [71, high],
  ],
  'trick-f2': [
    [0, high],
    [9, { ...high, chin: 0.4 }],
    [16, { ...nearKey, low: 0.74 }],
    [25, { ...nearKey, x: -53, lift: 24, s: 0.65, leap: 1 }],
    [35, { ...nearKey, x: -101, lift: 43, s: 0.54, turnHead: 0.7 }],
    [47, { ...nearKey, x: -101, lift: 43, s: 0.54, turnHead: 0.7 }],
    [51, { ...nearKey, x: -101, lift: 43, s: 0.54, keyTip: 1, low: 0.4 }],
    [65, { ...nearKey, x: -91, lift: 47, s: 0.54, keyTip: 1 }],
    [76, { ...high, x: -65, lift: 65, s: 0.57, leap: 1 }],
    [83, { ...high, x: -51, lift: 52, s: 0.6, low: 0.78 }],
    [94, { ...high, x: -9, lift: 100, s: 0.68, leap: 1 }],
    [103, { ...high, x: 4, lift: 86, s: 0.7, low: 0.64 }],
    [116, { ...high, x: 54, lift: 95, s: 0.71, ear: 1, banner: 1 }],
    [126, { ...nearKey, x: 12, lift: 103, s: 0.68, keyTip: 1 }],
    [135, { ...nearKey, x: -99, lift: 43, s: 0.54, keyTip: 1 }],
    [142, { ...nearKey, x: -101, lift: 43, s: 0.54 }],
    [149, { ...nearKey, x: -62, lift: 54, s: 0.68, leap: 1 }],
    [158, { ...high, low: 0.85 }],
    [167, high],
  ],
  'trick_b-f2': [
    [0, high],
    [10, { ...high, ear: 1, turnHead: -0.55 }],
    [19, { ...second, low: 0.9 }],
    [30, { ...second, x: 47, lift: 42, s: 0.6, leap: 1 }],
    [39, { ...fold, x: 64, lift: 55, s: 0.51 }],
    [51, { ...fold, x: 64, lift: 55, s: 0.51 }],
    [60, { ...fold, x: 47, lift: 55, s: 0.61, chin: 0.3 }],
    [72, { ...fold, x: 15, lift: 40, s: 0.77, turnHead: -0.43 }],
    [81, { ...fold, x: -4, lift: 38, s: 0.81, low: 0.34 }],
    [90, { ...fold, x: -19, lift: 42, s: 0.75, ear: 1 }],
    [104, { ...fold, x: -100, lift: 38, s: 0.94, leap: 1 }],
    [113, { ...fold, x: -110, lift: 43, s: 1.05, grin: 1 }],
    [124, { ...fold, x: -56, lift: 52, s: 0.86 }],
    [137, { ...fold, x: 60, lift: 57, s: 0.53 }],
    [148, { ...second, x: 63, lift: 55, s: 0.53, ear: 1 }],
    [156, { ...second, x: 23, lift: 42, s: 0.77, leap: 1 }],
    [165, { ...high, low: 0.8 }],
    [173, high],
  ],
  show: [
    [0, { hide: 1, park: 1, s: 0.46 }],
    [16, { hide: 1, park: 1, s: 0.46 }],
    [22, { hide: 1, park: 1, s: 0.46, open: 0.42, emerge: 1, slide: -40 }],
    [28, { park: 1, s: 0.46, open: 1, emerge: 1, slide: -36 }],
    [35, { park: 1, s: 0.46, open: 1, emerge: 1, slide: -13, ear: 1 }],
    [42, { park: 1, s: 0.46, open: 1, emerge: 1, slide: -11, ear: 1 }],
    [52, { park: 1, s: 0.48, open: 1, emerge: 1, slide: 13 }],
    [61, { park: 1, s: 0.53, open: 1, emerge: 1, slide: 36 }],
    [68, { park: 1, s: 0.6, open: 0.76, x: 29, lift: 8, leap: 0.6 }],
    [75, { park: 1, s: 0.75, x: 34, low: 0.8 }],
    [82, { park: 1, s: 0.75, x: 29, turnHead: 1.3, ear: 1 }],
    [91, { park: 0.65, s: 0.88, x: 5, low: 0.83 }],
    [99, { low: 0.78, ear: 1 }],
    [106, { lift: 17, x: 14, leap: 1 }],
    [115, { x: 43, lift: -17, s: 1.18, leap: 1 }],
    [124, { x: 55, lift: -37, s: 1.27, low: 0.54, grin: 1 }],
    [133, { x: 53, lift: -29, s: 1.21, ear: 1 }],
    [143, { lift: 18, x: 21, s: 0.96, leap: 1 }],
    [151, { low: 0.5 }],
    [160, { ear: 0.6, grin: 1 }],
    [181, { ear: 0.6, grin: 1 }],
  ],
  peek: [
    [0, rest],
    [5, { low: 0.83, yaw: 0.7 }],
    [10, { x: -18, lift: 10, s: 0.86, yaw: 1.69, leap: 1 }],
    [18, { x: -105, lift: 36, s: 0.73, yaw: 1.77, leap: 0.5 }],
    [24, { x: -155, lift: 42, s: 0.72, yaw: 1.7 }],
    [28, { x: -148, lift: 41, s: 0.76, yaw: 0.24 }],
    [33, { x: -117, lift: 39, s: 0.87, ear: 1, reach: 1 }],
    [41, { x: -117, lift: 39, s: 0.87, ear: 1, reach: 1 }],
    [47, { x: -136, lift: 43, s: 0.77, low: 0.45 }],
    [54, { x: -50, lift: 28, s: 0.84, leap: 1 }],
    [62, rest],
  ],
};
for (const keys of Object.values(tracks))
  for (const [, p] of keys) {
    p.s ??= 1;
    p.houseS ??= p.s;
  }
const one = keyframer({ tracks, fixed: { sleep: sleeping, 'idle-f2': high } });
export const clips: Record<string, Animation> = { ...everyday, 'idle-f2': { seconds: 3, loop: true } };
for (const [name, ks] of Object.entries(tracks)) clips[name] = { seconds: (ks.at(-1)![0] + 1) / 24 };
export function pose(anim: string, n: number) {
  const p = { ...one(anim, n / 24) };
  p.s ??= 1;
  p.houseS ??= p.s;
  const loop = ['idle', 'idle-f2', 'walk', 'sleep'].includes(anim),
    a = (n * tau) / (anim === 'walk' ? 24 : 72);
  if (anim === 'trick-f2') p.yaw = 1.65 * (span(n, 13, 24, 58, 74) + span(n, 111, 124, 142, 155));
  if (anim === 'trick_b') p.counterweight = span(n, 13, 23, 44, 57);
  if (anim === 'trick_b-f2') p.yaw = 1.94 * span(n, 54, 64, 119, 132);
  p.breathe = loop ? Math.sin(a) : 0;
  p.swing = loop ? Math.sin(a) - Math.sin(a * 2) * 0.35 : 0;
  if (anim === 'walk') {
    p.gait = Math.sin(a);
    p.bounce = Math.abs(p.gait) * 2.1;
    p.step = n / 24;
  }
  if (loop && anim !== 'sleep' && n % 72 >= 49 && n % 72 <= 55) p.shut = Math.sin((((n % 72) - 49) * Math.PI) / 6);
  return p;
}

export function bridgeTop(x: number, sill: XY) {
  const u = clamp((x - sill[0]) / (224 - sill[0]));
  return mix(sill[1], 129, u) + 6 * Math.sin(Math.PI * u);
}
export function stairTop(x: number, rotation: number) {
  const a = -0.78 * rotation,
    c = Math.cos(a),
    s = Math.sin(a),
    slope = 0.22;
  const d = (x - 10 + 38 * s) / (c - slope * s);
  return 113 + d * s + (38 + d * slope) * c;
}

// The drawer receives the map across its brass lip. Its position is fixed to the left jamb.
export const drawer: XY = [7, 119];
export const filed = (n: number) => span(n, 105, 112, 117, 125);

export const porchTop = (x: number, sill: XY) => sill[1] + Math.max(0, Math.min(52, x - sill[0])) * 0.43;
