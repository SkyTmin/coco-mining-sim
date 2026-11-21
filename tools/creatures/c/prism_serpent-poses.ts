// Pose book of Ирис. Times are frames at 24 fps. Each key may name the easing INTO it: 'io' smoothstep (default), 'o'
// fast start / soft stop, 'i' slow start / hard stop, 'b' fast with a small overshoot, 'l' linear, 's' step. Tempo rule
// [20.11]: a jolt takes 1–4 frames, every pose of the story is held 10–12 frames or more, a five-second trick has 7–10
// beats.
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';
import { SWITCHES } from './prism_serpent-skin';

export const clips: Record<string, { seconds: number; loop?: boolean }> = {
  ...everyday,
  idle: { seconds: 3, loop: true },
  look: { seconds: 1.5 },
  fidget_a: { seconds: 2.5 },
  fidget_b: { seconds: 3 },
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
  wake_startled: { seconds: 1.2 },
};
/** Loop lengths for the spring (it reads the pose a few frames back). */
export const loops: Record<string, number> = Object.fromEntries(Object.entries(clips).filter(([, c]) => c.loop).map(([k, c]) => [k, c.seconds]));
type Ease = 'io' | 'o' | 'i' | 'b' | 'l' | 's';
type Key = [number, JointPose] | [number, JointPose, Ease];
type Track = Key[];
const TAU = Math.PI * 2;
const Q = Math.PI / 2;
/** Painted size relative to natural (the skin reads sx / sy as offsets from 1). */
const size = (x: number, y = x) => ({ sx: x - 1, sy: y - 1 });
/** Asleep: coiled on the ground, the chin on its own coil, wings and fan folded, the crest laid back. */
export const SLEEP: JointPose = { coil: 1, follow: 1, blink: 1, wings: -0.42, tuck: 0.6, fan: -0.6, crest: -0.4 };
/** Колесо: the hoop, the tail tip in its mouth, wings half folded. */
const HOOP: JointPose = { hoop: 1, follow: 1, wings: -0.3, tuck: 0.5, slim: 0.35, fan: 0.3, mouth: 0.25, crest: 0.6 };
/** Сердечко: the body drawn as a heart facing us, the face at the notch looking out. */
const HEART: JointPose = { heart: 1, slim: 1, yaw: -0.45, headYaw: 1.45, wings: -0.42, tuck: 1, fan: -0.3, crest: 0.3 };
/** Пружинка: a cobra on its coil, looking up. */
const SPRING: JointPose = { cobra: 1, wings: -0.42, tuck: 0.5, fan: -0.4, crest: 0.4, nod: -0.25, lookY: 0.8 };
/** Чистит перья: the neck curled round to the near wing, the wing lifted. */
const PREEN: JointPose = { bend: 0.75, headYaw: 1.9, nod: 0.35, rise: -0.4, wingR: 0.2, flapR: 0.3, lookX: 0.5 };

/** Радужная горка: the pool spot it dives into, and the slide from high over its home down into it (field px). */
export const SPLASH = { dx: -54, dy: -26 };
const SLIDE = { from: [0, -24], via: [-26, -42], to: [SPLASH.dx, SPLASH.dy] } as const;
/** Its painted size along the slide: it gets smaller as it rides away toward the falls. */
export const slideSize = (u: number) => 0.94 - 0.22 * u;
/** How far its belly floats above its feet on the slide (field px at natural size). */
export const BELLY = 17;
export function slideAt(u: number): [number, number] {
  const v = 1 - u;
  return [v * v * SLIDE.from[0] + 2 * v * u * SLIDE.via[0] + u * u * SLIDE.to[0], v * v * SLIDE.from[1] + 2 * v * u * SLIDE.via[1] + u * u * SLIDE.to[1]];
}

/** Effect beats shared with the painter of effects. */
export const beats = {
  // Радужная горка: it looks up at the falls, flies up flapping, fans its tail and a rainbow pours out of the feathers
  // down to the pool; it turns, hops on and slides down it — splash! It pops out of the water, shakes, flies home and
  // lands proud.
  trick: { look: 6, rise: 22, rainbow: 40, hop: 62, slide: 66, splash: 90, pop: 104, shake: 106, home: 116, land: 130, proud: 134 },
  // Колесо: a sly look at its tail, it bites it and becomes a hoop, rolls in the air faster and faster, lets go —
  // dizzy, wobbles, shakes its head, proud.
  trick_b: { look: 6, grab: 22, roll: 34, fast: 52, faster: 61, stop: 72, dizzy: 74, shake: 94, proud: 104 },
  // Сердечко: shy, it draws its body into a heart, the heart beats twice, it blows a kiss, unfolds and bows.
  trick_c: { shy: 6, form: 20, heart: 34, beat1: 42, beat2: 48, kiss: 62, open: 80, bow: 98, joy: 112 },
  // Пружинка: coils like a spring, squeezes, shoots up out of the picture, comes back down spinning like a maple seed
  // on spread wings and fan, lands with a squash.
  trick_d: { coil: 10, squeeze: 18, launch: 34, top: 40, fall: 50, land: 97, proud: 100 },
  fidget_a: { preen: 6, nibble: 9, shake: 37, done: 46 },
  fidget_b: { notice: 4, aim: 18, snap: 29, miss: 32, snap2: 45, got: 48, release: 64 },
  fidget_c: { open: 4, show: 20, flick: 38, fold: 50 },
  happy: { up: 8, roll: 8, top: 23, land: 38 },
  hatch: { wobble: 0, crack: 10, burst: 18, wake: 22, unfurl: 42 },
  sleep_in: { yawn: 4, curl: 18, close: 30 },
  sleep_out: { open: 4, rise: 10, stretch: 16, shake: 27 },
  wake_startled: { jolt: 2, look: 18 },
};

const slideKeys: Key[] = Array.from({ length: 7 }, (_, i) => {
  const k = (i + 1) / 7;
  const u = k ** 1.5;
  const [dx, dy] = slideAt(u);
  return [66 + Math.round(24 * k), { overAll: 1, dx, dy, yaw: 3.0, rise: -0.7, wings: -0.1, tuck: 0.3, fan: 0.2, crest: -0.5 - 0.2 * k, mouth: 0.7, joy: 1, noShadow: 1, roll: 0.15 * Math.sin(k * 5), ...size(slideSize(u)) }, 'l'] as Key;
});
/** The descent of Пружинка: two turns round on the spot, a quarter turn a key, slowing like a seed on its wings. */
const fallKeys: Key[] = Array.from({ length: 8 }, (_, i) => {
  const k = (i + 1) / 8;
  const dy = -110 + 106 * (1 - (1 - k) ** 1.3);
  return [50 + Math.round(44 * k), { overAll: 1, dy, yaw: (((i + 1) % 4) * Q) % TAU, wings: 0.58, flap: i % 2 ? -0.3 : 0.3, fan: 0.7, tailUp: 0.6, crest: 0.6, joy: 1, noShadow: 1 }, 'l'] as Key;
});
const quarterSpin = (from: number, to: number, start: number, quarter: number, ease: Ease = 'l'): Key[] => {
  const out: Key[] = [];
  for (let q = from + 1; q <= to; q++) out.push([Math.round(start + (q - from) * quarter), { ...HOOP, blush: 0.8, spin: (q % 4) * Q }, ease]);
  return out;
};

export const tracks: Record<string, Track> = {
  // Hovering: the body waves, the wings quiver; it flicks its forked tongue, tilts its head, looks up with the crest
  // raised and the fan a little open.
  idle: [
    [0, {}],
    [6, {}],
    [8, { tongue: 1 }, 'o'],
    [10, { tongue: 0.35 }, 'o'],
    [12, { tongue: 1 }, 'o'],
    [15, { tongue: 0 }, 'i'],
    [26, { headRoll: 0.15, headYaw: 0.25, lookX: 0.4, crest: 0.2 }, 'io'],
    [40, { headRoll: 0.15, headYaw: 0.25, lookX: 0.4, crest: 0.2 }],
    [50, { nod: -0.12, crest: 0.35, fan: 0.12, lookY: 0.4 }, 'io'],
    [62, { nod: -0.12, crest: 0.33, fan: 0.12, lookY: 0.4 }],
    [72, {}],
  ],
  // Something rustles: the head snaps round with the crest up, holds; back with a curious tilt and a tongue flick.
  look: [
    [0, {}],
    [3, { headYaw: 1.0, lookX: 0.7, crest: 0.7, browUp: 1, wide: 1, rise: 0.25 }, 'o'],
    [15, { headYaw: 0.98, lookX: 0.7, crest: 0.68, browUp: 1, wide: 1, rise: 0.25 }],
    [18, { headYaw: 0.2, headRoll: -0.35, lookY: 0.3, crest: 0.4 }, 'b'],
    [21, { headYaw: 0.2, headRoll: -0.35, lookY: 0.3, crest: 0.4, tongue: 1 }, 'o'],
    [23, { headYaw: 0.2, headRoll: -0.35, lookY: 0.3, crest: 0.4 }, 'o'],
    [30, { headYaw: 0.18, headRoll: -0.33, lookY: 0.3, crest: 0.4 }],
    [36, {}],
  ],
  // Чистит перья: curls its neck round to the near wing, nibbles the feathers three times, holds content; shakes all
  // its feathers out and is pleased.
  fidget_a: [
    [0, {}],
    [6, { ...PREEN, lid: 0.3 }, 'o'],
    [9, { ...PREEN, mouth: 0.35, nod: 0.45, lid: 0.5 }, 'o'],
    [12, { ...PREEN, mouth: 0, lid: 0.5 }, 'o'],
    [15, { ...PREEN, mouth: 0.35, nod: 0.45, lid: 0.5, headRoll: 0.15 }, 'o'],
    [18, { ...PREEN, mouth: 0, lid: 0.5 }, 'o'],
    [21, { ...PREEN, mouth: 0.35, nod: 0.45, lid: 0.5, headRoll: -0.1 }, 'o'],
    [24, { ...PREEN, mouth: 0.1, lid: 0.6 }, 'o'],
    [34, { ...PREEN, mouth: 0.05, lid: 0.7, wingR: 0.25 }],
    [37, { fluff: 1, puff: 1, wings: 0.2, flap: 0.4, roll: 0.15, headRoll: 0.35, blink: 1, fan: 0.3 }, 'o'],
    [40, { fluff: 1, puff: 1, wings: 0.2, flap: -0.3, roll: -0.15, headRoll: -0.35, blink: 1, fan: 0.3 }, 'o'],
    [43, { fluff: 0.7, puff: 0.6, roll: 0.1, headRoll: 0.25, blink: 1 }, 'o'],
    [46, { fluff: 0.3, joy: 1, crest: 0.4 }, 'o'],
    [56, { joy: 1, crest: 0.35 }],
    [60, {}],
  ],
  // Ловит свой хвост: the fan wiggles at it; it narrows its eyes, snaps — the tail flicks away; puzzled; snaps again
  // and catches it, holds it in its mouth, blushing, lets go.
  fidget_b: [
    [0, {}],
    [4, { bend: 0.45, headYaw: 1.5, lookX: 0.8, curl: 0.6, fan: 0.3, crest: 0.4, browUp: 1 }, 'o'],
    [8, { bend: 0.45, headYaw: 1.5, lookX: 0.8, curl: 0.9, fan: 0.45, crest: 0.4, browUp: 1 }, 'io'],
    [12, { bend: 0.45, headYaw: 1.5, lookX: 0.8, curl: 0.5, fan: 0.25, crest: 0.4, browUp: 1 }, 'io'],
    [16, { bend: 0.45, headYaw: 1.5, lookX: 0.8, curl: 0.9, fan: 0.45, crest: 0.4, browUp: 1 }, 'io'],
    [18, { bend: 0.5, headYaw: 1.6, lookX: 0.8, rise: -0.3, curl: 0.7, fan: 0.35, crest: 0.6, lid: 0.35 }, 'io'],
    [26, { bend: 0.52, headYaw: 1.62, lookX: 0.8, rise: -0.32, curl: 0.7, fan: 0.35, crest: 0.62, lid: 0.4 }],
    [29, { bend: 0.95, headYaw: 2.2, nod: 0.3, rise: -0.6, mouth: 0.9, curl: 1, fan: 0.35, crest: 0.8, wide: 1 }, 'b'],
    [32, { bend: 0.95, headYaw: 2.2, nod: 0.3, rise: -0.6, mouth: 0, curl: -0.6, fan: 0.6, crest: 0.6, browUp: 1, cross: 0.5 }, 'o'],
    [42, { bend: 0.8, headYaw: 2.0, nod: 0.25, rise: -0.5, mouth: 0.2, curl: -0.4, fan: 0.4, browUp: 1, cross: 0.4 }],
    [45, { bend: 0.95, headYaw: 2.3, nod: 0.35, rise: -0.6, mouth: 0.9, curl: 1, fan: 0.35, crest: 0.7, wide: 1 }, 'b'],
    [48, { bend: 0.95, headYaw: 2.3, nod: 0.35, rise: -0.6, mouth: 0.3, curl: 1, fan: 0.3, crest: 0.5, joy: 1, blush: 1 }, 'o'],
    [58, { bend: 0.93, headYaw: 2.28, nod: 0.34, rise: -0.58, mouth: 0.3, curl: 1, fan: 0.3, crest: 0.5, joy: 1, blush: 1 }],
    [64, { joy: 1, blush: 0.6, crest: 0.3 }, 'io'],
    [72, {}],
  ],
  // Хвастается веером: the fan snaps open, the eyes on it shimmer; it turns to show it off, proud, flicks its tongue,
  // folds the fan, a little shy.
  fidget_c: [
    [0, {}],
    [4, { fan: 0.7, tailUp: 1.3, wings: -0.35, crest: 0.5, rise: 0.3, ...size(1.02) }, 'b'],
    [16, { fan: 0.65, tailUp: 1.3, wings: -0.35, crest: 0.55, rise: 0.3, shimmer: 1, headYaw: 0.4, lookX: 0.5 }],
    [20, { fan: 0.7, tailUp: 1.5, wings: -0.35, crest: 0.8, rise: 0.5, yaw: -0.35, headYaw: 0.9, lookX: 0.8, joy: 1, fluff: 0.6, shimmer: 2 }, 'o'],
    [34, { fan: 0.7, tailUp: 1.5, wings: -0.35, crest: 0.8, rise: 0.5, yaw: -0.38, headYaw: 0.9, lookX: 0.8, joy: 1, fluff: 0.6, shimmer: 3 }],
    [38, { fan: 0.7, tailUp: 1.4, wings: -0.3, crest: 0.7, rise: 0.4, yaw: -0.2, headYaw: 0.5, tongue: 1, shimmer: 3.4 }, 'o'],
    [41, { fan: 0.7, tailUp: 1.4, wings: -0.3, crest: 0.7, rise: 0.4, yaw: -0.2, headYaw: 0.5, tongue: 0, shimmer: 3.6 }, 'o'],
    [50, { fan: 0, tailUp: 0.2, blush: 0.7, joy: 1, crest: 0.3, shimmer: 4 }, 'io'],
    [60, {}],
  ],
  // Пируэт: a crouch, up with a flap, a whole turn round on the spot in the air, beaming at the top, down with a squash.
  happy: [
    [0, {}],
    [4, { rise: -0.4, wings: 0.1, crest: 0.4, ...size(1.05, 0.94) }, 'o'],
    [8, { lift: 3, dy: -10, wings: 0.58, flap: 0.7, joy: 1, crest: 0.7, fan: 0.4, ...size(0.97, 1.04) }, 'o'],
    [11, { lift: 3, dy: -12, wings: 0.58, flap: -0.6, joy: 1, crest: 0.7, fan: 0.4, yaw: Q, lookX: 0.6 }, 'l'],
    [14, { lift: 3, dy: -14, wings: 0.58, flap: 0.6, joy: 1, crest: 0.7, fan: 0.4, yaw: 2 * Q }, 'l'],
    [17, { lift: 3, dy: -14, wings: 0.58, flap: -0.6, joy: 1, crest: 0.7, fan: 0.4, yaw: 3 * Q, lookX: 0.6 }, 'l'],
    [20, { lift: 3, dy: -14, wings: 0.58, flap: 0.5, joy: 1, crest: 0.8, fan: 0.5, yaw: 0 }, 'l'],
    [23, { lift: 3, dy: -14, wings: 0.58, flap: 0.3, joy: 1, crest: 0.8, fan: 0.5 }, 'o'],
    [33, { lift: 2.5, dy: -12, wings: 0.5, flap: -0.2, joy: 1, crest: 0.8, fan: 0.5, blush: 0.6 }],
    [38, { wings: 0.3, ...size(1.06, 0.94) }, 'i'],
    [42, { joy: 1, crest: 0.5 }, 'b'],
    [48, {}],
  ],
  // Из яйца: the egg rocks and cracks (effects); the shell bursts and there it is, curled small; eyes open wide, it
  // looks round both ways, then unfurls wings, fan and crest all at once.
  hatch: [
    [0, { hidden: 1 }],
    [17, { hidden: 1 }],
    [18, { cobra: 1, tuck: 1, wings: -0.42, fan: -0.6, crest: -0.6, rise: -1, nod: 0.3, blink: 1, ...size(0.55) }, 's'],
    [22, { cobra: 1, tuck: 1, wings: -0.42, fan: -0.6, crest: -0.2, rise: -0.6, nod: 0.1, wide: 1, ...size(0.58) }, 'o'],
    [30, { cobra: 1, tuck: 0.9, wings: -0.4, fan: -0.5, rise: -0.4, headYaw: 0.7, lookX: 0.8, ...size(0.6) }, 'io'],
    [38, { cobra: 1, tuck: 0.9, wings: -0.4, fan: -0.5, rise: -0.4, headYaw: -0.5, lookX: -0.8, ...size(0.62) }, 'io'],
    [42, { wings: 0.58, flap: 0.6, fan: 0.6, crest: 0.9, joy: 1, rise: 0.4, fluff: 1, ...size(1.04) }, 'b'],
    [46, { wings: 0.5, flap: -0.4, fan: 0.5, crest: 0.8, joy: 1, fluff: 0.5 }, 'o'],
    [52, { joy: 1, crest: 0.6, fan: 0.3 }, 'io'],
    [60, {}],
  ],
  sleep: [
    [0, { ...SLEEP }],
    [36, { ...SLEEP, crest: -0.35, fan: -0.55 }],
    [72, { ...SLEEP }],
  ],
  // A big yawn with the crest up, then it coils down and closes its eyes.
  sleep_in: [
    [0, {}],
    [4, { mouth: 0.9, nod: -0.35, lid: 0.6, crest: 0.4, rise: 0.3 }, 'o'],
    [14, { mouth: 0.9, nod: -0.32, lid: 0.7, crest: 0.4, rise: 0.3 }],
    [18, { mouth: 0, lid: 0.8 }, 'io'],
    [26, { cobra: 1, lid: 0.9, wings: -0.42, tuck: 0.4, fan: -0.4, crest: -0.2, rise: -0.6, nod: 0.3 }, 'io'],
    [34, { ...SLEEP }, 'io'],
    [36, { ...SLEEP }],
  ],
  // Eyes open, it rises out of the coil in a long stretch-yawn with wings and fan spread, shakes itself awake.
  sleep_out: [
    [0, { ...SLEEP }],
    [4, { ...SLEEP, blink: 0, lid: 0.5 }, 'o'],
    [10, { cobra: 1, lid: 0.6, wings: -0.3, tuck: 0.3, fan: -0.3, rise: 0.2, mouth: 0.4, nod: -0.1 }, 'io'],
    [16, { rise: 0.9, mouth: 0.9, lid: 0.7, wings: 0.58, flap: 0.4, fan: 0.4, crest: 0.6, nod: -0.3 }, 'io'],
    [24, { rise: 0.92, mouth: 0.85, lid: 0.75, wings: 0.58, flap: 0.45, fan: 0.4, crest: 0.6, nod: -0.32 }],
    [27, { fluff: 1, roll: 0.12, headRoll: 0.3, blink: 1 }, 'o'],
    [30, { fluff: 0.6, roll: -0.12, headRoll: -0.3, blink: 1 }, 'o'],
    [36, {}],
  ],
  // Woken with a fright: out of the coil in two frames, crest and feathers up, eyes wide; looks round, calms down.
  wake_startled: [
    [0, { ...SLEEP }],
    [2, { rise: 1, crest: 1, wide: 1, browUp: 1, fan: 0.5, wings: 0.58, flap: 0.6, fluff: 1, mouth: 0.5, lift: 1.5, ...size(0.96, 1.06) }, 'o'],
    [12, { rise: 0.9, crest: 0.95, wide: 1, browUp: 1, fan: 0.45, wings: 0.55, flap: 0.3, fluff: 0.8, mouth: 0.4, lift: 1.2 }],
    [18, { headYaw: 0.5, lookX: 0.6, crest: 0.5, rise: 0.3, fluff: 0.3, browUp: 1 }, 'io'],
    [28, {}],
  ],
  // РАДУЖНАЯ ГОРКА (see the beats). Up in the air it is drawn over the frame.
  trick: [
    [0, {}],
    [6, { headYaw: -0.5, nod: -0.35, lookY: 0.8, lookX: -0.4, crest: 0.5, browUp: 1 }, 'o'],
    [18, { headYaw: -0.45, nod: -0.32, lookY: 0.8, lookX: -0.4, crest: 0.55, browUp: 1 }],
    [20, { rise: -0.4, crest: 0.3, wings: 0.2, ...size(1.04, 0.95) }, 'o'],
    [22, { overAll: 1, dy: -4, lift: 1, wings: 0.58, flap: 0.7, fan: 0.2, crest: 0.6, ...size(0.97, 1.04) }, 'o'],
    [26, { overAll: 1, dy: -10, lift: 2, wings: 0.58, flap: -0.7, fan: 0.3, crest: 0.6, mouth: 0.3 }, 'l'],
    [30, { overAll: 1, dy: -16, lift: 2, wings: 0.58, flap: 0.7, fan: 0.35, crest: 0.6 }, 'l'],
    [34, { overAll: 1, dy: -21, lift: 2, wings: 0.58, flap: -0.7, fan: 0.4, crest: 0.6 }, 'l'],
    [38, { overAll: 1, dy: -24, lift: 2, wings: 0.58, flap: 0.5, fan: 0.5, crest: 0.6 }, 'o'],
    [40, { overAll: 1, dy: -24, lift: 2, wings: 0.5, flap: 0, fan: 0.6, tailUp: 1, crest: 0.8, joy: 1, shimmer: 1 }, 'b'],
    [46, { overAll: 1, dy: -25, lift: 2, wings: 0.5, flap: 0.3, fan: 0.6, tailUp: 1, crest: 0.8, joy: 1, shimmer: 2, headYaw: -0.4, lookX: -0.6 }, 'io'],
    [52, { overAll: 1, dy: -26, lift: 2, wings: 0.5, flap: -0.2, fan: 0.6, tailUp: 1, crest: 0.8, joy: 1, shimmer: 3, headYaw: -0.6, lookX: -0.8 }, 'io'],
    [58, { overAll: 1, dy: -26, lift: 2, wings: 0.5, flap: 0.2, fan: 0.6, tailUp: 1, crest: 0.8, joy: 1, shimmer: 4, headYaw: -0.6, lookX: -0.8 }, 'io'],
    [62, { overAll: 1, dy: -28, lift: 2, yaw: 3.0, wings: 0.2, tuck: 0.2, fan: 0.3, crest: 0.4, joy: 1, noShadow: 1, ...size(1.04, 0.96) }, 'o'],
    [66, { overAll: 1, dx: 0, dy: -24, lift: 2, yaw: 3.0, rise: -0.7, wings: -0.1, tuck: 0.3, fan: 0.2, crest: -0.5, mouth: 0.7, joy: 1, noShadow: 1, ...size(0.94) }, 'o'],
    ...slideKeys,
    [91, { dx: SPLASH.dx, dy: SPLASH.dy, yaw: 3.0, hidden: 1, noShadow: 1 }, 's'],
    [103, { dx: SPLASH.dx, dy: SPLASH.dy, yaw: 3.0, hidden: 1, noShadow: 1 }],
    [104, { dx: SPLASH.dx, dy: SPLASH.dy - 4, yaw: 3.0, fluff: 1, crest: 0.6, wings: 0.4, wide: 1, noShadow: 1, ...size(0.74) }, 's'],
    [106, { dx: SPLASH.dx, dy: SPLASH.dy - 8, yaw: 3.0, fluff: 1, roll: 0.25, headRoll: 0.4, blink: 1, wings: 0.4, noShadow: 1, ...size(0.74) }, 'o'],
    [109, { dx: SPLASH.dx, dy: SPLASH.dy - 9, yaw: 3.0, fluff: 1, roll: -0.25, headRoll: -0.4, blink: 1, wings: 0.4, noShadow: 1, ...size(0.75) }, 'o'],
    [112, { dx: SPLASH.dx, dy: SPLASH.dy - 10, yaw: 3.0, fluff: 0.7, roll: 0.15, headRoll: 0.25, blink: 1, wings: 0.4, noShadow: 1, ...size(0.76) }, 'o'],
    [116, { dx: SPLASH.dx, dy: SPLASH.dy - 10, yaw: 0.2, wings: 0.58, flap: 0.6, fluff: 0.3, joy: 1, noShadow: 1, ...size(0.78) }, 'o'],
    [120, { dx: -36, dy: -28, yaw: 0.1, wings: 0.58, flap: -0.6, joy: 1, noShadow: 1, ...size(0.85) }, 'l'],
    [124, { dx: -18, dy: -18, yaw: 0.05, wings: 0.58, flap: 0.6, joy: 1, noShadow: 1, ...size(0.93) }, 'l'],
    [128, { dx: -4, dy: -6, wings: 0.58, flap: -0.4, joy: 1, ...size(1) }, 'l'],
    [130, { wings: 0.3, ...size(1.06, 0.94) }, 'i'],
    [134, { joy: 1, crest: 0.9, fan: 0.5, tailUp: 0.6, blush: 0.6 }, 'b'],
    [144, {}],
  ],
  // КОЛЕСО (see the beats).
  trick_b: [
    [0, {}],
    [6, { bend: 0.5, headYaw: 1.6, lookX: 0.8, curl: 0.5, browUp: 1, crest: 0.4 }, 'o'],
    [9, { bend: 0.5, headYaw: 1.6, lookX: 0.8, curl: 0.5, browUp: 1, crest: 0.4, tongue: 1 }, 'o'],
    [12, { bend: 0.5, headYaw: 1.6, lookX: 0.8, curl: 0.5, browUp: 1, crest: 0.4 }, 'o'],
    [18, { bend: 0.55, headYaw: 1.7, lookX: 0.8, curl: 0.6, browUp: 1, crest: 0.45 }],
    [22, { ...HOOP }, 'b'],
    [34, { ...HOOP, blush: 0.8 }],
    ...quarterSpin(0, 4, 34, 4.5, 'l'),
    ...quarterSpin(4, 8, 52, 2.25, 'l'),
    ...quarterSpin(8, 12, 61, 1.75, 'l'),
    [72, { wings: 0.4, fan: 0.4, cross: 1, mouth: 0.4, crest: 0.2, sway: 0.6, headRoll: 0.4 }, 'b'],
    [78, { cross: 1, sway: -0.6, headRoll: -0.4, roll: -0.1, mouth: 0.3, crest: 0.1 }, 'io'],
    [84, { cross: 1, sway: 0.5, headRoll: 0.35, roll: 0.1, mouth: 0.3 }, 'io'],
    [90, { cross: 0.8, sway: -0.3, headRoll: -0.25, mouth: 0.2 }, 'io'],
    [94, { headRoll: 0.4, blink: 1 }, 'o'],
    [97, { headRoll: -0.4, blink: 1 }, 'o'],
    [100, { headRoll: 0.2 }, 'o'],
    [104, { joy: 1, crest: 0.8, fan: 0.4, tailUp: 0.5, rise: 0.3 }, 'b'],
    [114, { joy: 1, crest: 0.7, fan: 0.35, tailUp: 0.4, rise: 0.25 }],
    [120, {}],
  ],
  // СЕРДЕЧКО (see the beats).
  trick_c: [
    [0, {}],
    [6, { headYaw: 1.0, lookX: 0.6, headRoll: 0.25, blush: 1, nod: 0.1, crest: 0.2 }, 'o'],
    [18, { headYaw: 1.05, lookX: 0.6, headRoll: 0.28, blush: 1, nod: 0.12, crest: 0.2 }],
    [34, { ...HEART, joy: 1, blush: 1 }, 'io'],
    [40, { ...HEART, joy: 1, blush: 1 }],
    [42, { ...HEART, joy: 1, blush: 1, puff: 1, ...size(1.06) }, 'o'],
    [45, { ...HEART, joy: 1, blush: 1 }, 'io'],
    [48, { ...HEART, joy: 1, blush: 1, puff: 1, ...size(1.06) }, 'o'],
    [51, { ...HEART, joy: 1, blush: 1 }, 'io'],
    [60, { ...HEART, lookX: 0.3, blush: 1, wide: 0.5 }],
    [62, { ...HEART, mouth: 0.3, lid: 0.5, blush: 1, nod: -0.1 }, 'o'],
    [66, { ...HEART, joy: 1, blush: 1 }, 'o'],
    [80, { ...HEART, joy: 1, blush: 1 }],
    [94, { rise: -0.2, nod: 0.2, joy: 1, blush: 0.6, crest: 0.3 }, 'io'],
    [98, { rise: -0.7, nod: 0.6, crest: 0.6, fan: 0.4, tailUp: 0.4, lid: 1 }, 'o'],
    [108, { rise: -0.72, nod: 0.62, crest: 0.6, fan: 0.4, tailUp: 0.4, lid: 1 }],
    [112, { joy: 1, crest: 0.5, fan: 0.3 }, 'b'],
    [120, {}],
  ],
  // ПРУЖИНКА (see the beats).
  trick_d: [
    [0, {}],
    [10, { ...SPRING }, 'io'],
    [16, { ...SPRING, lookY: 1, browUp: 1 }],
    [18, { ...SPRING, rise: -0.5, crest: 0.6, ...size(1.06, 0.9) }, 'o'],
    [24, { ...SPRING, rise: -0.7, crest: 0.6, sway: 0.2, ...size(1.08, 0.86) }, 'io'],
    [28, { ...SPRING, rise: -0.8, crest: 0.6, sway: -0.2, lid: 0.4, ...size(1.1, 0.84) }, 'io'],
    [31, { ...SPRING, rise: -0.9, crest: 0.6, lid: 0.6, ...size(1.12, 0.82) }, 'io'],
    [34, { overAll: 1, dy: -70, lift: 2, rise: 1, wings: -0.3, tuck: 0.4, fan: -0.2, crest: -0.5, wide: 1, mouth: 0.5, noShadow: 1, ...size(0.9, 1.18) }, 'o'],
    [40, { overAll: 1, dy: -150, lift: 2, rise: 1, wings: -0.2, fan: 0, crest: -0.4, noShadow: 1 }, 'o'],
    [48, { overAll: 1, dy: -150, lift: 2, rise: 1, wings: -0.2, fan: 0, crest: -0.4, noShadow: 1 }],
    [50, { overAll: 1, dy: -110, yaw: 0, wings: 0.58, flap: 0.3, fan: 0.7, tailUp: 0.6, crest: 0.6, joy: 1, noShadow: 1 }, 'o'],
    ...fallKeys,
    [97, { wings: 0.3, fan: 0.4, ...size(1.08, 0.92) }, 'i'],
    [100, { joy: 1, crest: 0.8, fan: 0.5, tailUp: 0.5, cross: 0.6 }, 'b'],
    [112, { joy: 1, crest: 0.7, fan: 0.4, tailUp: 0.4 }],
    [120, {}],
  ],
};

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
