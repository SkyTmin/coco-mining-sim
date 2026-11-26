import { keyframer, type Track } from '../kit/pet-moves';
import { everyday } from '../rig/figure';
import type { Animation } from '../types';
import { scenePose, span, stages, tau } from './threshold_keeper-stage';
export {
  home,
  exit,
  lock,
  city,
  drawer,
  bridgeTop,
  porchTop,
  clamp,
  ease,
  filed,
  lerp,
  mix,
  span,
  tau,
} from './threshold_keeper-stage';
const rest = {},
  high = { form: 1 },
  sleeping = { low: 1, shut: 1, ear: -0.7, curl: 1, chin: 0.3 };
const tracks: Record<string, Track> = {
  fidget_a: [
    [0, rest],
    [9, { ear: 0.8, chin: -0.12 }],
    [18, { ear: 1, turnHead: 0.66, chin: -0.3 }],
    [27, { ear: 0.8, turnHead: 0.43, reach: 0.65 }],
    [34, { reach: 1, low: 0.53, ear: 0.4 }],
    [41, { reach: 0.38, open: 0.26, turnHead: 0.38 }],
    [49, { open: 0.16, grin: 0.7, ear: 0.7 }],
    [57, rest],
  ],
  look: [
    [0, rest],
    [6, { ear: 0.65 }],
    [14, { ear: 1, turnHead: 0.73, chin: -0.26 }],
    [22, { ear: 1, turnHead: 0.8, chin: -0.19 }],
    [29, { ear: 0.42, turnHead: 0.21 }],
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
    [9, { ear: 0.6, grin: 0.6 }],
    [19, { reach: 0.65, low: 0.4, grin: 1 }],
    [27, { reach: 0.8, low: 0.75, chin: 0.3, grin: 1 }],
    [34, { reach: 0.77, low: 0.7, chin: 0.23, grin: 1 }],
    [44, { ear: 0.8, grin: 1 }],
    [55, rest],
  ],
  'happy-f2': [
    [0, high],
    [9, { ...high, ear: 0.8, chin: -0.22 }],
    [19, { ...high, reach: 0.8, ring: 1, low: 0.55 }],
    [25, { ...high, ring: 1, reach: 1, low: 0.68, banner: 0.5 }],
    [36, { ...high, ear: 0.95, grin: 1, banner: 1 }],
    [46, { ...high, grin: 0.8, ear: 0.53, turnHead: 0.53 }],
    [56, high],
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
};
for (const keys of Object.values(tracks))
  for (const [, p] of keys) {
    p.s ??= 1;
    p.houseS ??= p.s;
  }
const one = keyframer({ tracks, fixed: { sleep: sleeping, 'idle-f2': high } });
export const clips: Record<string, Animation> = { ...everyday, 'idle-f2': { seconds: 1.5, loop: true } };
for (const [name, ks] of Object.entries(tracks)) clips[name] = { seconds: (ks.at(-1)![0] + 1) / 24 };
for (const [name, count] of Object.entries(stages)) clips[name] = { seconds: count / 24 };
export function pose(anim: string, n: number) {
  const staged = scenePose(anim, n);
  if (staged) return staged;
  const p = { ...one(anim, n / 24) };
  p.s ??= 1;
  p.houseS ??= p.s;
  const loop = ['idle', 'idle-f2', 'walk', 'sleep'].includes(anim),
    a = (n * tau) / (anim === 'walk' ? 24 : 72);
  if (anim === 'fidget_a') {
    p.ring = span(n, 19, 29, 37, 45);
    p.lean = -0.07 * p.ring;
  }
  if (anim === 'idle' || anim === 'idle-f2') {
    p.ear = 0.15 * Math.sin(a - 0.4);
    p.chin = 0.045 * Math.sin(a);
    p.turnHead = 0.065 * Math.sin(a - 0.8);
  }
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
