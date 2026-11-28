import { keyframer, type Track } from '../kit/pet-moves';
import { everyday } from '../rig/figure';
import { F3, CE, SE, vdot, vsub, type V3 } from '../rig/f15-rig';
import type { Animation, XY } from '../types';
import { arc, ease, windowAt } from './painted-toys';
import { readCreatureCard } from '../bodies/card-data';

const card = readCreatureCard('apricot_bubbler');
export const yaw = card.life.yaw;
export const scale = card.proportions.scale;
export const home: XY = [66, 91];
export const dock: XY = [54, 117];
export const farDock = 105;
const asleep = { low: 1, nod: 0.48, tuck: 0.8, lids: 1, tail: -0.78, crest: -0.62 };
const tracks: Record<string, Track> = {
  look: [
    [0, {}],
    [8, { head: -0.52, ear: 0.5 }],
    [16, { head: -0.52 }],
    [25, { head: 0.52, nod: 0.16 }],
    [30, { head: 0.5 }],
    [35, {}],
  ],
  fidget_a: [
    [0, {}],
    [8, { head: 0.35 }],
    [16, { head: 0.42, cheek: 1, nod: -0.12 }],
    [32, { head: 0.42, cheek: 1 }],
    [39, { head: 0.36, cheek: -0.32, lids: 0.8 }],
    [48, {}],
  ],
  fidget_b: [
    [0, {}],
    [8, { yaw: -0.6, head: 0.18 }],
    [15, { yaw: -0.93, head: 0.39, tail: 0.93, wag: -0.9 }],
    [23, { yaw: -0.93, head: 0.46, tail: 1, wag: 0.96 }],
    [31, { yaw: -0.93, head: 0.44, tail: 1, wag: -0.96 }],
    [39, { yaw: -0.8, head: 0.37, tail: 0.82, wag: 0.88 }],
    [48, { yaw: -0.51, tail: 0.3 }],
    [57, {}],
  ],
  happy: [
    [0, {}],
    [7, { low: 0.65, tail: -0.45 }],
    [14, { nod: -0.27, tail: 0.92, ear: 0.62 }],
    [24, { low: 0.6 }],
    [30, { ear: 0.55, tail: 0.75 }],
    [39, { low: 0.34 }],
    [47, {}],
  ],
  tired: [
    [0, {}],
    [9, { nod: 0.18, lids: 0.55 }],
    [16, { nod: -0.18, lids: 0.7, open: 0.9 }],
    [24, { nod: -0.12, open: 1 }],
    [30, { nod: 0.24, lids: 0.65 }],
    [35, {}],
  ],
  sleep_in: [
    [0, {}],
    [10, { low: 0.48, nod: 0.25, tail: -0.4 }],
    [20, { ...asleep, lids: 0.58 }],
    [29, asleep],
  ],
  sleep_out: [
    [0, asleep],
    [8, { ...asleep, lids: 0.32 }],
    [18, { low: 0.46, nod: -0.22, tail: 0.75 }],
    [24, { nod: -0.12 }],
    [29, {}],
  ],
  wake_startled: [
    [0, asleep],
    [5, { ...asleep, lids: 0.18 }],
    [10, { nod: -0.21, tail: 1, crest: 0.8 }],
    [15, { low: 0.45 }],
    [23, {}],
  ],
  prepare_walk: [
    [0, {}],
    [7, { low: 0.17, weight: -0.6 }],
    [17, { split: 1 }],
    [18, { split: 1 }],
    [27, { weight: 0.4, low: 0.14 }],
    [35, {}],
  ],
  hatch: [
    [0, {}],
    [9, { low: 0.5, head: 0.34 }],
    [18, { nod: -0.39, tail: 0.82 }],
    [25, { low: 0.45 }],
    [34, { head: 0.4, ear: 0.4 }],
    [43, { head: 0.42 }],
    [52, {}],
  ],
  trick: [
    [0, {}],
    [11, { yaw: -0.65, nod: -0.16 }],
    [19, { yaw: -yaw, cheek: 1.05, tail: 0.62 }],
    [27, { yaw: -yaw, cheek: 0.9, nod: -0.1 }],
    [44, { yaw: -yaw, cheek: 0.06, nod: -0.16 }],
    [49, { yaw: -yaw, cheek: -0.22, nod: -0.16 }],
    [58, { yaw: -yaw, nod: -0.34, ear: 0.64 }],
    [68, { yaw: -yaw, low: 0.44, nod: -0.28 }],
    [81, { yaw: -yaw, low: 0.12, nod: -0.3 }],
    [87, { yaw: -yaw, nod: -0.29 }],
    [92, { yaw: -yaw, nod: -0.16, lids: 0.96 }],
    [99, { yaw: -yaw, low: 0.78, lids: 0.33 }],
    [107, { yaw: 0.98, nod: 0.23, head: 0.16 }],
    [119, { yaw: 2.15 }],
    [132, { yaw: 2.14, tail: 0.4 }],
    [148, {}],
  ],
};
const sample = keyframer({ tracks, fixed: { sleep: asleep } });
export function pose(anim: string, t: number) {
  const n = t * 24,
    p = { ...sample(anim, t) };
  let x = 0,
    y = 0,
    alt = 0,
    jog = 0;
  if (anim === 'idle' || anim === 'sleep') {
    const wave = Math.sin((n * 2 * Math.PI) / 72);
    p.breath = (anim === 'idle' ? 0.44 : 0.29) * wave;
    if (anim === 'idle') {
      p.tail = 0.15 * wave;
      p.crest = 0.18 * wave;
      p.lids = windowAt(n, 45, 48, 49, 53);
    }
  }
  if (anim === 'happy') alt = arc(n, 8, 23, 11) + arc(n, 25, 38, 6);
  if (anim === 'hatch') alt = arc(n, 10, 25, 12);
  if (anim === 'trick') {
    x = 23 * (ease(61, 88, n) - ease(119, 141, n));
    y = -2 * (ease(61, 83, n) - ease(118, 141, n));
    alt = arc(n, 78, 98, 11);
    jog = windowAt(n, 60, 65, 76, 81) + windowAt(n, 117, 122, 136, 142);
  }
  if (anim === 'trick_b') {
    // Both crossings stay on the dry promenade behind the trough.
    x = -15 * ease(10, 34, n) + 57 * ease(62, 103, n) - 42 * ease(144, 178, n);
    // Step to the windward side of each mooring before blowing along the trough.
    x += -9 * windowAt(n, 32, 41, 55, 67) + 9 * windowAt(n, 100, 112, 132, 143);
    y =
      4 * (ease(10, 32, n) - ease(60, 71, n)) +
      4 * (ease(91, 104, n) - ease(143, 156, n)) -
      9 * windowAt(n, 62, 77, 88, 103);
    p.yaw =
      2.16 * windowAt(n, 1, 11, 29, 41) +
      0.43 * windowAt(n, 33, 42, 58, 65) -
      0.84 * windowAt(n, 57, 67, 94, 108) +
      1.01 * windowAt(n, 95, 108, 175, 189) +
      0.99 * windowAt(n, 139, 148, 170, 183);
    p.head = 0.13 * windowAt(n, 32, 41, 55, 61) - 0.12 * windowAt(n, 104, 111, 137, 143);
    p.nod = 0.49 * (windowAt(n, 35, 43, 58, 68) + windowAt(n, 105, 114, 138, 147));
    p.low = 0.45 * (windowAt(n, 36, 43, 57, 65) + windowAt(n, 106, 113, 138, 146));
    p.cheek = 1.2 * (windowAt(n, 33, 42, 42, 60) + windowAt(n, 104, 113, 113, 132));
    p.ear = 0.47 * (windowAt(n, 40, 45, 58, 63) + windowAt(n, 111, 116, 130, 137));
    jog = windowAt(n, 10, 16, 28, 34) + windowAt(n, 61, 68, 98, 105) + windowAt(n, 143, 150, 171, 179);
  }
  return { p, x, y, alt, jog };
}
export function bodyFrames(anim: string, t: number, side = 0, gait?: number) {
  const state = pose(anim, t),
    { p, jog } = state,
    n = t * 24;
  const pivot = anim === 'turn' && Number.isInteger(side) ? (4 * t) % 1 : 0;
  const f = F3.yaw(yaw + ((side + pivot) * Math.PI) / 8 + (p.yaw ?? 0));
  const low = p.low ?? 0,
    trot = gait !== undefined ? Math.sin(2 * Math.PI * gait) : jog * Math.sin(n * 0.48);
  const b = f
    .at(-1.1, 0.78 * (p.weight ?? 0) + 0.46 * trot, 12.1 - low * 4.1 + (p.breath ?? 0) + 0.5 * Math.abs(trot))
    .roll(trot * 0.048);
  const neck = b.at(7.65 - 1.1 * (p.tuck ?? 0), 0, 9.8 - 1.2 * low);
  let turn = p.head ?? 0,
    tilt = -0.06 + (p.nod ?? 0);
  if (anim === 'trick_b') {
    const aim = windowAt(n, 31, 41, 60, 68) + windowAt(n, 103, 112, 132, 141);
    if (aim > 0) {
      const boat = boatFrame(n);
      const sail: V3 = [
        (boat.x - home[0] - state.x) / scale,
        (boat.y - home[1] - state.y) / (SE * scale),
        7 / (CE * scale),
      ];
      const to = vsub(sail, neck.o),
        forward = vdot(to, neck.f),
        right = vdot(to, neck.s),
        up = vdot(to, neck.u);
      const distance = Math.hypot(forward, right);
      // The tube grows below the head pivot and points eight hundredths of a radian upwards.
      // Aim its actual bore at the sail, including the offset between those two axes.
      const boreHeight = (-1.6 - 6.8 * Math.tan(0.08)) * Math.cos(0.08);
      const headPitch = 0.08 + Math.asin(boreHeight / Math.hypot(distance, up)) - Math.atan2(up, distance);
      const diff = Math.atan2(right, forward) - turn;
      turn += aim * Math.atan2(Math.sin(diff), Math.cos(diff));
      tilt += aim * (headPitch - tilt);
    }
  }
  const h = neck.turn(turn).pitch(tilt);
  const tube = h.at(6.8, 0, -1.6).pitch(-0.08);
  return { ...state, f, b, h, tube, trot };
}
export function boatFrame(n: number) {
  const outbound = ease(42, 83, n),
    inbound = ease(113, 155, n);
  const x = dock[0] + (farDock - dock[0]) * (outbound - inbound);
  const speed = Math.sin(Math.PI * clamped(42, 83, n)) - Math.sin(Math.PI * clamped(113, 155, n));
  return { x, y: dock[1], speed };
}
function clamped(a: number, b: number, n: number) {
  return Math.min(1, Math.max(0, (n - a) / (b - a)));
}
const clip = (n: number): Animation => ({ seconds: n / 24 });
const moving = (name: string, n: number): Animation => ({
  ...clip(n),
  groundOffset(t) {
    const q = pose(name, t);
    return [q.x, q.y];
  },
});
export const clips = {
  ...everyday,
  prepare_walk: clip(36),
  fidget_a: clip(49),
  fidget_b: clip(58),
  happy: clip(48),
  hatch: clip(53),
  sleep_in: clip(30),
  sleep_out: clip(30),
  wake_startled: clip(24),
  trick: moving('trick', 149),
  trick_b: moving('trick_b', 192),
};
