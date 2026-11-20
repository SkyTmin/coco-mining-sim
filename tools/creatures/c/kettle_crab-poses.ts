// Pose book of Котёл. Times are frames at 24 fps. Claw and foot goals are rig units in the crab's floor frame
// (forward, right, up). Each key may name the easing INTO it: 'io' smoothstep (default), 'o' fast start / soft stop
// (snaps, throws), 'i' slow start / hard stop (falls, impacts), 'b' fast with a small overshoot (springy arrivals),
// 'l' linear, 's' step (holds, then jumps at the key). Fast moves take 1–4 frames, holds 6–10.
import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';
import { SWITCHES } from './kettle_crab-skin';

export const clips: Record<string, { seconds: number; loop?: boolean }> = {
  ...everyday,
  idle: { seconds: 3, loop: true },
  look: { seconds: 1.5 },
  fidget_a: { seconds: 2 },
  fidget_b: { seconds: 2 },
  happy: { seconds: 1.75 },
  trick: { seconds: 5 },
  trick_b: { seconds: 4.5 },
  hatch: { seconds: 2 },
  sleep: { seconds: 3, loop: true },
  sleep_in: { seconds: 1.25 },
  sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
};
type Ease = 'io' | 'o' | 'i' | 'b' | 'l' | 's';
type Key = [number, JointPose] | [number, JointPose, Ease];
type Track = Key[];

/** Claw goal in the floor frame. */
export const claw = (name: 'L' | 'R', f: number, r: number, u: number) => reach('claw' + name, [f, r, u]);
const R = (f: number, r: number, u: number, open = 0) => ({ ...claw('R', f, r, u), clawROpen: open });
const L = (f: number, r: number, u: number, open = 0) => ({ ...claw('L', f, r, u), clawLOpen: open });
/** Painted size relative to natural (the skin reads sx / sy as offsets from 1). */
const size = (x: number, y = x) => ({ sx: x - 1, sy: y - 1 });

/** Effect beats shared with the painter of effects. */
export const beats = {
  // Steam rocket: spits water on the sun-hot helmet, steam, hides, rattles, launches through the top rail, falls back.
  trick: { spit: 6, splash: 14, hide: 26, rattle: 30, launch: 52, gone: 58, fall: 72, land: 80, out: 90, tada: 104 },
  // Bubbles: blows a stream of bubbles, pops them one by one, a big one swallows it and lifts it, pop, fall, flip.
  trick_b: { blow: 4, pop1: 22, pop2: 30, pop3: 38, pop4: 46, big: 54, lift: 66, poke: 84, fall: 86, land: 94 },
  fidget_a: { huff: 8, wipe: 14, shine: 36 },
  fidget_b: { knock1: 10, knock2: 18, knock3: 26, puff: 30 },
  hatch: { shake: 4, eyes: 14, claw: 22, burst: 30 },
  happy: { spin: 10, land: 26 },
};

export const tracks: Record<string, Track> = {
  // Alive at rest: the eyes look about each on its own, a double claw snap, antennae flick, a foot taps.
  idle: [
    [0, {}],
    [8, { eyeL: 0.5, eyeR: -0.1 }, 'b'],
    [14, { eyeL: 0.5, eyeR: -0.1 }],
    [16, { eyeL: 0.5, eyeR: 0.6, clawROpen: 0.7 }, 'b'],
    [22, { eyeL: 0.45, eyeR: 0.55, clawROpen: 0.75, antennaWhip: 0.8 }],
    [23, { eyeL: 0.45, eyeR: 0.55, clawROpen: 0, sway: -0.6 }, 'o'],
    [26, { eyeL: 0.4, eyeR: 0.5, clawROpen: 0.6 }, 'o'],
    [27, { eyeL: 0.4, eyeR: 0.5, clawROpen: 0, sway: -0.4 }, 'o'],
    [36, { eyeL: -0.3, eyeR: -0.4, tapR0: 1 }, 'b'],
    [40, { eyeL: -0.3, eyeR: -0.4 }],
    [52, { eyeL: -0.35, eyeR: -0.45, lean: 0.6, lookUp: 0.3 }],
    [60, { eyeL: 0.1, eyeR: 0.2 }, 'b'],
    [72, {}],
  ],
};

export function gesture(anim: string, t: number): JointPose {
  const keys = tracks[anim];
  if (!keys) return anim === 'sleep' ? { blink: 1 } : {};
  const f = t * 24,
    i = keys.findIndex(([time]) => time >= f);
  if (i <= 0) return keys[i === 0 ? 0 : keys.length - 1][1];
  const [start, a] = keys[i - 1],
    [end, b, ease = 'io'] = keys[i];
  const x = (f - start) / (end - start);
  const u =
    ease === 'o'
      ? 1 - (1 - x) ** 3
      : ease === 'i'
        ? x ** 3
        : ease === 'b'
          ? 1 + 2.4 * (x - 1) ** 3 + 1.4 * (x - 1) ** 2
          : ease === 'l'
            ? x
            : ease === 's'
              ? 0
              : x * x * (3 - 2 * x);
  const pose: JointPose = {};
  for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (SWITCHES.has(name)) pose[name] = f >= end ? (b[name] ?? 0) : (a[name] ?? 0);
    else pose[name] = (a[name] ?? 0) * (1 - u) + (b[name] ?? 0) * u;
  }
  return pose;
}
export const helpers = { R, L, size };
