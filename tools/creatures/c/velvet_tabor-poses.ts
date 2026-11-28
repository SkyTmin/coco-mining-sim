import { keyframer, type Track } from '../kit/pet-moves';
import { everyday } from '../rig/figure';
import { arc, clamp, ease, windowAt } from './painted-toys';
import { vadd, vlerp, vmul, vnorm, vsub, type V3 } from '../rig/f15-rig';
import { TAU } from '../kit/f11-mobkit';
import type { Animation, XY } from '../types';

export const home: XY = [79, 98];
const asleep = { low: 1, nod: 0.25, fold: 0.86, lids: 1, hug: 1 };
const tracks: Record<string, Track> = {
  look: [
    [0, {}],
    [6, { head: -0.34, ears: 0.24 }],
    [14, { head: -0.48, ears: 0.38 }],
    [23, { head: 0.43, nod: 0.08 }],
    [29, { head: 0.43 }],
    [35, {}],
  ],
  prepare_walk: [
    [0, {}],
    [7, { low: 0.24, weight: -1 }],
    [17, { split: 1 }],
    [18, { split: 1 }],
    [26, { low: 0.18, weight: 0.6 }],
    [35, {}],
  ],
  fidget_a: [
    [0, {}],
    [8, { head: -0.3, nod: -0.1 }],
    [17, { head: -0.45, listen: 1.06, nod: -0.21 }],
    [31, { head: -0.46, listen: 1.08 }],
    [40, { head: -0.21, listen: 0.55 }],
    [49, {}],
  ],
  fidget_b: [
    [0, {}],
    [8, { head: 0.36, nod: 0.4 }],
    [18, { head: 0.36, nod: 0.38 }],
    [29, { head: 0.22, nod: -0.05 }],
    [40, { head: 0.3, nod: 0, smile: 1 }],
    [50, { head: 0.35, nod: 0.35 }],
    [62, {}],
  ],
  happy: [
    [0, {}],
    [8, { low: 0.71, fold: 0.2 }],
    [15, { nod: -0.24, ears: 0.81, smile: 1 }],
    [22, { low: 0.6, ears: -0.28 }],
    [30, { ears: 0.87, smile: 1 }],
    [40, { low: 0.23 }],
    [47, {}],
  ],
  tired: [
    [0, {}],
    [9, { lids: 0.54, nod: 0.26 }],
    [16, { lids: 0.68, nod: -0.24, yawn: 1 }],
    [24, { lids: 0.68, yawn: 1 }],
    [30, { nod: 0.14, lids: 0.56 }],
    [35, {}],
  ],
  sleep_in: [
    [0, {}],
    [9, { low: 0.49, fold: 0.33, nod: 0.21 }],
    [19, { ...asleep, lids: 0.52 }],
    [29, asleep],
  ],
  sleep_out: [
    [0, asleep],
    [8, { ...asleep, lids: 0.28 }],
    [18, { low: 0.43, nod: -0.16, ears: 0.5 }],
    [24, { low: 0.16, nod: -0.09 }],
    [29, {}],
  ],
  wake_startled: [
    [0, asleep],
    [5, { ...asleep, lids: 0.15, fold: 0.5 }],
    [10, { nod: -0.22, ears: 1.15, yawn: 0.45 }],
    [16, { low: 0.38 }],
    [23, {}],
  ],
  hatch: [
    [0, {}],
    [8, { low: 0.56, head: 0.2 }],
    [19, { ears: 0.6, nod: -0.11 }],
    [39, { ears: 0.7, nod: -0.12 }],
    [56, { low: 0.5 }],
    [67, {}],
  ],
  trick: [
    [0, {}],
    [8, { head: 0.22, nod: 0.13 }],
    [18, { head: 0.22, nod: 0.15, ears: 0.43 }],
    [33, { head: 0.27, nod: 0.18 }],
    [60, { head: 0.22, nod: 0.18 }],
    [80, { head: 0.17, nod: 0.03, smile: 1 }],
    [96, { head: 0.21, smile: 1, ears: 0.5 }],
    [107, {}],
  ],
  trick_b: [
    [0, {}],
    [9, { head: 0.47, nod: 0.42 }],
    [23, { head: 0.52, nod: 0.38 }],
    [39, { head: 0.22, nod: -0.02 }],
    [46, { head: 0.21, nod: -0.02 }],
    [60, { head: 0.16, nod: 0.44 }],
    [75, { head: 0.25, nod: -0.43 }],
    [90, { head: 0.14, nod: 0.38 }],
    [102, { head: 0.23, nod: -0.25 }],
    [113, { head: 0.32, nod: -0.08, smile: 1 }],
    [128, { head: 0.47, nod: 0.23 }],
    [143, { head: 0.46, nod: 0.39 }],
    [157, {}],
  ],
};
const read = keyframer({ tracks, fixed: { sleep: asleep } });
export type Beat = { at: number; side: number; f: number; s: number };
export const phrase: Beat[] = [
  { at: 24, side: 1, f: 2.5, s: 4.3 },
  { at: 40, side: -1, f: 1.8, s: -4.2 },
  { at: 57, side: 1, f: 2.5, s: 4.3 },
  { at: 68, side: -1, f: 1.8, s: -4.2 },
  { at: 89, side: 1, f: 2.5, s: 4.3 },
  { at: 89, side: -1, f: 1.8, s: -4.2 },
];
export const pickups: Beat[] = [{ at: 62, side: -1, f: 1.5, s: -4.5 }];
export function beats(anim: string) {
  return anim === 'trick' ? phrase : anim === 'trick_b' ? pickups : [];
}
export function dip(n: number, at: number) {
  const age = n - at;
  return age < 0 || age > 7 ? 0 : age <= 2 ? 0.72 - 0.13 * age : 0.46 * (1 - ease(2, 7, age));
}
export function membrane(anim: string, n: number, x: number, y: number) {
  let depth = 0;
  for (const beat of beats(anim)) {
    const d = (x - beat.f) ** 2 + (y - beat.s) ** 2;
    depth += dip(n, beat.at) * Math.exp(-d / 5.4);
  }
  if (anim === 'trick_b') {
    depth += dip(n, 59) * Math.exp(-((x - 4.2) ** 2 + (y - 2.0) ** 2) / 5);
    depth += dip(n, 89) * Math.exp(-((x - 4.15) ** 2 + (y + 1.0) ** 2) / 5);
  }
  return -depth;
}
export function pose(anim: string, t: number) {
  const n = t * 24,
    p = { ...read(anim, t) };
  let alt = 0,
    spin = 0;
  if (anim === 'idle' || anim === 'sleep') {
    const wave = Math.sin((n * TAU) / 72);
    p.breath = (anim === 'sleep' ? 0.23 : 0.4) * wave;
    if (anim === 'idle') {
      p.ears = 0.18 * wave;
      p.head = 0.065 * wave;
      p.lids = windowAt(n, 45, 48, 50, 53);
    }
  }
  if (anim === 'trick') p.yaw = -0.33 * windowAt(n, 0, 12, 94, 107);
  if (anim === 'trick_b') p.yaw = -1.02 * windowAt(n, 0, 15, 144, 157);
  if (anim === 'happy') alt = arc(n, 9, 21, 8.5) + arc(n, 24, 37, 6);
  if (anim === 'hatch') {
    spin = TAU * ease(9, 54, n);
    p.weight = 0.7 * Math.sin(spin);
  }
  for (const b of beats(anim)) {
    const recoil = windowAt(n, b.at - 2, b.at + 1, b.at + 2, b.at + 8);
    p.low = (p.low ?? 0) + 0.17 * recoil;
    p.nod = (p.nod ?? 0) + 0.11 * recoil;
    p.ears = (p.ears ?? 0) - 0.26 * windowAt(n, b.at + 1, b.at + 4, b.at + 5, b.at + 12);
  }
  return { p, alt, spin };
}
export function footTurn(anim: string, n: number, s: number) {
  const first = s < 0 ? 0 : 1;
  if (anim !== 'trick' && anim !== 'trick_b') return { angle: 0, lift: 0 };
  const end = anim === 'trick' ? 107 : 157,
    turn = anim === 'trick' ? -0.33 : -1.02;
  const a = first * 6,
    b = a + 7,
    c = end - 14 + first * 6,
    d = c + 7;
  const u = ease(a, b, n),
    v = ease(c, d, n);
  return { angle: turn * (u - v), lift: 1.75 * (Math.sin(Math.PI * u) + Math.sin(Math.PI * v)) };
}
export const crown = 4.6,
  ballSize = 2.48;
export const pocket: V3 = [0.35, 10.4, 2.25],
  overSkin: V3 = [4.2, 2.0, 13.8],
  landing: V3 = [4.2, 2.0, crown + ballSize];
const second: V3 = [4.15, -1.0, crown + ballSize],
  caught: V3 = [4.35, 5.0, 11.35],
  abovePocket: V3 = [1.0, 10.4, 9.7];
const present: V3 = [3.1, 9.4, 11.9];
const between = (a: V3, b: V3, n: number, from: number, to: number) => vlerp(a, b, ease(from, to, n));
export function ballPose(anim: string, n: number) {
  let at: V3 = [...pocket],
    flat = 0,
    roll = 0;
  if (anim === 'fidget_b') {
    at = n <= 40 ? between(pocket, present, n, 15, 31) : between(present, pocket, n, 41, 55);
    roll = 0.65 * windowAt(n, 17, 32, 43, 55);
  }
  if (anim === 'trick_b') {
    if (n < 30) at = between(pocket, abovePocket, n, 22, 30);
    else if (n < 46) at = between(abovePocket, overSkin, n, 30, 40);
    else if (n < 59) at = vlerp(overSkin, landing, clamp((n - 46) / 13) ** 2);
    else if (n < 63) {
      at = [...landing];
      flat = dip(n, 59);
    } else if (n < 89) {
      const u = clamp((n - 63) / 26);
      at = vlerp(landing, second, u);
      at[2] += arc(n, 63, 89, 14.4);
    } else if (n < 93) {
      at = [...second];
      flat = dip(n, 89);
    } else if (n < 111) {
      at = between(second, caught, n, 93, 111);
      at[2] += arc(n, 93, 111, 6.4);
    } else if (n < 121) at = [...caught];
    else if (n < 133) at = between(caught, abovePocket, n, 121, 133);
    else at = between(abovePocket, pocket, n, 133, 143);
    if (flat) at[2] -= flat * 1.8;
    roll = TAU * (ease(46, 89, n) + ease(89, 143, n));
  }
  return { at, flat, roll };
}
const restHand = (s: number): V3 => [-0.5, s * 9.45, 7.15];
const readyHand = (s: number): V3 => [1.35, s * 5.62, 10.45];
function contactHand(beat: Beat, anim: string, n: number): V3 {
  const hit: V3 = [beat.f, beat.s, crown + 1.72 + membrane(anim, n, beat.f, beat.s)];
  const up: V3 = [0.2, beat.side * 6.1, 13.75],
    base = readyHand(beat.side);
  if (n < beat.at - 4) return between(base, up, n, beat.at - 11, beat.at - 4);
  if (n < beat.at) return between(up, hit, n, beat.at - 4, beat.at);
  if (n <= beat.at + 2) return hit;
  return between(hit, base, n, beat.at + 2, beat.at + 9);
}
export function handPose(anim: string, n: number, side: number): V3 {
  const rest = restHand(side),
    ready = readyHand(side);
  if (anim === 'trick') {
    let target = vlerp(rest, ready, windowAt(n, 5, 13, 97, 107));
    for (const b of phrase)
      if (b.side === side && n >= b.at - 11 && n <= b.at + 9) target = contactHand(b, anim, n);
    return target;
  }
  if (anim === 'trick_b' && side < 0) {
    if (n >= 51 && n <= 71) return contactHand(pickups[0], anim, n);
    return vlerp(rest, ready, windowAt(n, 40, 51, 71, 81));
  }
  if ((anim === 'trick_b' || anim === 'fidget_b') && side > 0) {
    const { at } = ballPose(anim, n);
    const grip = (ball: V3): V3 => {
      const towardsArm = vnorm(vsub([-3.7, 7.45, 8.2], ball));
      const pad = 1 / Math.hypot(towardsArm[0] / 2.32, towardsArm[1] / 2.22, towardsArm[2] / 1.74);
      return vadd(ball, vmul(towardsArm, ballSize + pad - 0.16));
    };
    if (anim === 'fidget_b') return vlerp(rest, grip(at), windowAt(n, 6, 15, 55, 62));
    if (n <= 46) return vlerp(rest, grip(at), ease(8, 19, n));
    if (n <= 100) {
      const wait: V3 = [-0.3, 10, 9.4];
      return n < 57 ? between(grip(overSkin), wait, n, 46, 55) : between(wait, grip(caught), n, 91, 101);
    }
    if (n < 111) return grip(caught);
    return vlerp(rest, grip(at), 1 - ease(143, 154, n));
  }
  return rest;
}
const clip = (n: number): Animation => ({ seconds: n / 24 });
export const clips = {
  ...everyday,
  prepare_walk: clip(36),
  fidget_a: clip(50),
  fidget_b: clip(63),
  happy: clip(48),
  hatch: clip(68),
  sleep_in: clip(30),
  sleep_out: clip(30),
  wake_startled: clip(24),
  trick: clip(108),
  trick_b: clip(158),
};
