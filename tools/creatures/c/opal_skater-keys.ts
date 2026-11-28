import { keyframer, type Track } from '../kit/pet-moves';
import { readCreatureCard } from '../bodies/card-data';
import { runnerTip } from './opal_skater-runner';
import { everyday } from '../rig/figure';
import type { Animation, XY } from '../types';

export const home: XY = [75, 99];
export const figureScale = readCreatureCard('opal_skater').proportions.scale!;
export const idleYaw = 1.03;
export const roundels: XY[] = [
  [53, 98],
  [97, 98],
];
export const puckMark: XY = [113, 119];
export const railX = 143;
export const radius = 5.5;
const tau = Math.PI * 2;
const pushTravel = 9;
export const clamp = (x: number) => Math.max(0, Math.min(1, x));
export function ease(a: number, b: number, n: number) {
  const u = clamp((n - a) / (b - a));
  return u * u * (3 - 2 * u);
}
const asleep = { low: 1, tuck: 1, lids: 1, fan: -0.74, nod: 0.42, hands: -0.8 };
const yawKick = -idleYaw;
const address = { yaw: yawKick, head: 0.27, low: 0.57, nod: 0.47, hands: 0.48, fan: 0.16 };
const follow = { yaw: yawKick, head: 0.13, low: 0.28, nod: 0.15, hands: 0.78, fan: 0.66 };
const tracks: Record<string, Track> = {
  look: [
    [0, {}],
    [7, { head: -0.57, fan: 0.65, nod: -0.12 }],
    [14, { head: -0.57, fan: 0.7 }],
    [23, { head: 0.53, bank: -0.15, gaze: 0.9 }],
    [29, { head: 0.5, gaze: 0.65 }],
    [35, {}],
  ],
  fidget_a: [
    [0, {}],
    [6, { head: 0.32, fan: -1.32, lids: 0.28 }],
    [14, { head: 0.32, fan: -1.32 }],
    [23, { head: 0.32, fan: 2.45, smile: 1 }],
    [34, { head: 0.32, fan: 2.45, smile: 1 }],
    [45, {}],
  ],
  fidget_b: [
    [0, {}],
    [7, { head: 0.34, front: 0.14, hands: 0.8, smile: 0.8 }],
    [15, { head: 0.3, front: 0.17, bow: 0.52, nod: 0.38, low: 0.7, hands: 0.85, lids: 0.66 }],
    [24, { head: 0.3, front: 0.17, bow: 0.55, nod: 0.4, low: 0.74, hands: 0.74, lids: 0.85 }],
    [31, { head: 0.3, front: 0.17, bow: 0.45, nod: 0.29, low: 0.6, hands: 0.74, lids: 0.58 }],
    [39, { head: 0.23, front: 0.1, hands: 0.5, smile: 0.95 }],
    [46, {}],
  ],
  happy: [
    [0, {}],
    [8, { low: 0.75, fan: -0.42 }],
    [14, { hands: 1, fan: 1, smile: 1, nod: -0.19 }],
    [23, { low: 0.66, hands: 0.58, fan: -0.3 }],
    [30, { hands: 0.84, fan: 0.78, smile: 1 }],
    [38, { low: 0.21, smile: 0.8 }],
    [47, {}],
  ],
  tired: [
    [0, {}],
    [8, { low: 0.43, nod: 0.17, lids: 0.45 }],
    [15, { low: 0.55, nod: -0.14, yawn: 1, lids: 0.78 }],
    [23, { low: 0.6, nod: -0.1, yawn: 0.9, fan: -0.5 }],
    [29, { low: 0.45, nod: 0.25, lids: 0.7 }],
    [35, {}],
  ],
  sleep_in: [
    [0, {}],
    [9, { low: 0.55, nod: 0.18, fan: -0.23 }],
    [19, { ...asleep, lids: 0.64 }],
    [29, asleep],
  ],
  sleep_out: [
    [0, asleep],
    [8, { ...asleep, lids: 0.34 }],
    [18, { low: 0.52, nod: -0.22, fan: 0.64, hands: 0.9 }],
    [23, { low: 0.22, fan: 0.3, hands: 0.6 }],
    [29, {}],
  ],
  wake_startled: [
    [0, asleep],
    [5, { ...asleep, lids: 0.18, fan: 0.12 }],
    [10, { nod: -0.18, fan: 1, hands: 1, yawn: 0.45 }],
    [15, { low: 0.41, fan: 0.52, hands: 0.63 }],
    [23, {}],
  ],
  prepare_walk: [
    [0, {}],
    [7, { low: 0.26, weight: -0.7, hands: 0.35 }],
    [17, { split: 1, hands: 0.18 }],
    [18, { split: 1, hands: 0.18 }],
    [26, { low: 0.16, weight: 0.45 }],
    [35, {}],
  ],
  trick: [
    [0, {}],
    [8, { head: -0.41, nod: 0.54, gaze: -0.5 }],
    [17, { ...address, yaw: -0.68, bank: 0.12 }],
    [24, address],
    [29, address],
    [34, { ...follow, nod: 0.38, bank: -0.16 }],
    [42, follow],
    [52, { ...follow, head: -0.08, fan: 0.94, nod: 0.06 }],
    [58, { ...follow, fan: 1, nod: 0.18 }],
    [67, { ...address, hands: 0.8 }],
    [78, address],
    [85, { ...address, smile: 1, fan: 0.85 }],
    [94, { yaw: -0.65, low: 0.18, smile: 0.85 }],
    [107, {}],
  ],
};
const key = keyframer({ tracks, fixed: { sleep: asleep } });
export function puckAt(n: number) {
  const wall = railX - radius,
    rest = puckMark[0];
  let x = rest;
  if (n >= 29 && n < 34) x += pushTravel * ((n - 29) / 5) ** 2;
  if (n >= 34 && n < 51) {
    const u = (n - 34) / 17;
    x = rest + pushTravel + (wall - rest - pushTravel) * (1.06 * u - 0.06 * u * u);
  }
  if (n >= 51 && n <= 58) x = wall + 2.9 * Math.sin((Math.PI * (n - 51)) / 7);
  if (n > 58 && n < 78) {
    const u = (n - 58) / 20;
    x = wall - (wall - rest - 3) * (1.1 * u - 0.1 * u * u);
  }
  if (n >= 78) x = rest + 3 * (1 - clamp((n - 78) / 5)) ** 2;
  return { x, y: puckMark[1], compression: Math.max(0, x - wall) };
}
export function course(n: number) {
  const u = clamp((n - 19) / 120);
  // Eight frames to build speed, a long glide, then eight frames to shed it.
  const ramp = 0.13;
  const distance =
    u < ramp ? (0.5 * u * u) / ramp : u > 1 - ramp ? 1 - ramp - (0.5 * (1 - u) ** 2) / ramp : u - ramp / 2;
  const a = (tau * distance) / (1 - ramp);
  const s = Math.sin(a),
    c = Math.cos(a);
  const x = 42 * s,
    y = -12 * s * s - 14 * Math.sin(2 * a);
  const dx = 42 * c,
    dy = -24 * s * c - 28 * Math.cos(2 * a);
  const speed = Math.min(1, u / ramp, (1 - u) / ramp);
  return { x, y, yaw: Math.atan2(dy / 0.6, dx), a, speed, u };
}
export function score(anim: string, t: number) {
  const n = t * 24;
  const p = { ...key(anim, t) };
  let x = 0,
    y = 0,
    alt = 0,
    kick = 0,
    stroke = 0;
  if (anim === 'trick') {
    // A half-pixel of overlap lets the rounded toe meet the curved rim of the disk.
    const addressX = puckMark[0] - radius + 0.65 - runnerTip * figureScale - home[0];
    const approach = ease(8, 24, n) - ease(85, 107, n);
    x = addressX * approach;
    y = (puckMark[1] - 106) * approach;
    const puck = puckAt(n);
    const extension =
      n <= 34
        ? puck.x - puckMark[0]
        : n <= 47
          ? pushTravel * (1 - ease(35, 47, n))
          : n < 78
            ? 3 * ease(62, 74, n)
            : puck.x - puckMark[0];
    kick = extension / figureScale;
    stroke = ease(8, 15, n) - ease(17, 24, n) - (ease(85, 92, n) - ease(98, 107, n));
  }
  if (anim === 'trick_b') {
    const c = course(n);
    x = c.x;
    y = c.y;
    const steer = ease(3, 21, n) - ease(138, 156, n);
    const delta = c.yaw - idleYaw;
    p.yaw = Math.atan2(Math.sin(delta), Math.cos(delta)) * steer;
    p.bank = 0.36 * Math.sin(c.a) * c.speed;
    p.head = 0.16 * Math.sin(2 * c.a) * c.speed;
    p.insideEdge = steer;
    p.hands = 0.83 * steer;
    p.low =
      0.45 * (ease(3, 15, n) - ease(22, 36, n)) +
      0.32 * c.speed +
      0.54 * (ease(123, 137, n) - ease(138, 153, n));
    p.fan = (0.65 - 0.27 * Math.cos(2 * c.a)) * steer;
    p.smile = steer;
    stroke = Math.sin(c.a * 3) * c.speed;
  }
  if (anim === 'hatch') {
    // A first circle starts from rest. A push opens the arc; both edges check the glide at home.
    const u = ease(8, 66, n),
      a = tau * u;
    x = 14.5 * Math.sin(a);
    y = -8.5 * (1 - Math.cos(a));
    const heading = Math.atan2((-8.5 * Math.sin(a)) / 0.6, 14.5 * Math.cos(a));
    const ready = ease(1, 10, n) - ease(65, 75, n),
      moving = Math.sin(Math.PI * u);
    p.yaw = Math.atan2(Math.sin(heading - idleYaw), Math.cos(heading - idleYaw)) * ready;
    p.low = 0.49 * (ease(1, 9, n) - ease(12, 23, n)) + 0.36 * (ease(51, 65, n) - ease(66, 75, n));
    p.hands = 0.75 * ready;
    p.fan = 0.48 * moving;
    p.bank = -0.21 * moving;
    p.smile = ready;
    stroke = Math.sin(2 * a) * moving;
  }
  if (anim === 'happy') {
    for (const [start, end, height] of [
      [9, 21, 10],
      [25, 36, 6],
    ]) {
      const u = clamp((n - start) / (end - start));
      alt += 4 * height * u * (1 - u);
    }
  }
  if (anim === 'idle' || anim === 'sleep') {
    const wave = Math.sin((t * tau) / 3);
    p.breath = (anim === 'sleep' ? 0.5 : 0.42) * wave;
    if (anim === 'idle') {
      p.fan = 0.17 * wave;
      p.head = 0.075 * wave;
      p.gaze = 0.58 * Math.sin((t * tau) / 3);
      p.lids = Math.sin(Math.PI * clamp((n - 49) / 6)) ** 2;
    }
  }
  return { p, x, y, alt, kick, stroke };
}
const clip = (frames: number): Animation => ({ seconds: frames / 24 });
function moving(name: string, count: number): Animation {
  return {
    ...clip(count),
    groundOffset(t) {
      const { x, y } = score(name, t);
      return [x, y];
    },
  };
}
export const clips = {
  ...everyday,
  happy: clip(48),
  hatch: moving('hatch', 76),
  prepare_walk: clip(36),
  fidget_a: clip(46),
  fidget_b: clip(47),
  sleep_in: clip(30),
  sleep_out: clip(30),
  wake_startled: clip(24),
  trick: moving('trick', 108),
  trick_b: moving('trick_b', 157),
};
