// Pose book of Пушинка. Times are frames at 24 fps. Foot goals are rig units in the floor frame (forward, right, up).
// Each key may name the easing INTO it: 'io' smoothstep (default), 'o' fast start / soft stop, 'i' slow start / hard
// stop, 'b' fast with a small overshoot, 'l' linear, 's' step (jumps on its own key). Tempo after the owner's
// verdict on Огонёк [20.11]: a jolt takes 1–4 frames, but every pose of the story is held 10–12 frames or more, and a
// five-second trick has 7–10 beats.
import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';
import { SWITCHES } from './puff_kit-skin';

export const clips: Record<string, { seconds: number; loop?: boolean }> = {
  ...everyday,
  idle: { seconds: 3, loop: true },
  look: { seconds: 1.5 },
  fidget_a: { seconds: 2 },
  fidget_b: { seconds: 2 },
  fidget_c: { seconds: 2.5 },
  happy: { seconds: 2 },
  trick: { seconds: 6 },
  trick_b: { seconds: 5 },
  trick_c: { seconds: 5 },
  trick_d: { seconds: 5 },
  hatch: { seconds: 2.5 },
  sleep: { seconds: 3, loop: true },
  sleep_in: { seconds: 1.5 },
  sleep_out: { seconds: 1.5 },
  wake_startled: { seconds: 1 },
};
/** Loop lengths for the spring (it reads the pose a few frames back). */
export const loops: Record<string, number> = Object.fromEntries(Object.entries(clips).filter(([, c]) => c.loop).map(([k, c]) => [k, c.seconds]));
type Ease = 'io' | 'o' | 'i' | 'b' | 'l' | 's';
type Key = [number, JointPose] | [number, JointPose, Ease];
type Track = Key[];
const TAU = Math.PI * 2;
/** Painted size relative to natural (the skin reads sx / sy as offsets from 1). */
const size = (x: number, y = x) => ({ sx: x - 1, sy: y - 1 });
export const goalOf = (name: string, f: number, r: number, u: number) => reach(name, [f, r, u]);

/** Effect beats shared with the painter of effects. */
export const beats = {};

export const tracks: Record<string, Track> = {
  // At rest in the wind: the ears flutter, the mane sways, it sniffs the air, tilts its head, blinks, the tail nods.
  idle: [
    [0, { wind: 0.3 }],
    [12, { wind: 0.6, headRoll: 0.18, headYaw: 0.15, lookX: 0.3 }, 'io'],
    [24, { wind: 0.6, headRoll: 0.18, headYaw: 0.15, lookX: 0.3 }],
    [30, { wind: 0.3, nod: -0.25, stretch: 0.5, lookY: 0.5, ears: 0.4 }, 'b'],
    [42, { wind: 0.3, nod: -0.22, stretch: 0.5, lookY: 0.5, ears: 0.4 }],
    [46, { wind: 0.2, blink: 1 }, 's'],
    [48, { wind: 0.2, blink: 0 }, 's'],
    [58, { wind: 0.4, tailWag: 0.6, sway: 0.15 }, 'io'],
    [72, { wind: 0.3 }],
  ],
  look: [
    [0, {}],
    [3, { headYaw: -0.8, nod: -0.2, stretch: 0.6, ears: 0.7, lookX: -0.5 }, 'o'],
    [15, { headYaw: -0.78, nod: -0.18, stretch: 0.6, ears: 0.7, lookX: -0.5 }],
    [18, { headYaw: 0.1, headRoll: -0.35, ears: 0.3, browUp: 1, lookY: 0.2 }, 'b'],
    [30, { headYaw: 0.1, headRoll: -0.33, ears: 0.3, browUp: 1, lookY: 0.2 }],
    [36, {}],
  ],
};

// PREVIEW ONLY (replaced by the real tricks): the two forms of the mane.
tracks.trick = [[0, { bald: 1, ears: -0.4, browUp: 1 }], [144, { bald: 1, ears: -0.4, browUp: 1 }]];
tracks.trick_b = [[0, { bloom: 1, joy: 1, blush: 1 }], [120, { bloom: 1, joy: 1, blush: 1 }]];

export function gesture(anim: string, t: number): JointPose {
  const keys = tracks[anim];
  if (!keys) return {};
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
              ? x >= 1
                ? 1
                : 0
              : x * x * (3 - 2 * x);
  const pose: JointPose = {};
  for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (SWITCHES.has(name)) pose[name] = f >= end ? (b[name] ?? 0) : (a[name] ?? 0);
    else if (name === 'spin' || name === 'headYaw' || name === 'yaw') {
      const to = b[name] ?? 0,
        from = to + ((((a[name] ?? 0) - to + Math.PI) % TAU) + TAU) % TAU - Math.PI;
      pose[name] = from * (1 - u) + to * u;
    } else pose[name] = (a[name] ?? 0) * (1 - u) + (b[name] ?? 0) * u;
  }
  return pose;
}
export const helpers = { size };
