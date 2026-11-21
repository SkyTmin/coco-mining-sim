// Pose book of Ушастик. Times are frames at 24 fps. Foot goals are rig units in the owlet's floor frame (forward,
// right, up). Each key may name the easing INTO it: 'io' smoothstep (default), 'o' fast start / soft stop (snaps,
// throws), 'i' slow start / hard stop (falls, impacts), 'b' fast with a small overshoot (springy arrivals), 'l' linear,
// 's' step (holds, then jumps at the key; never on the key where `hidden` switches). Fast moves take 1–4 frames,
// holds 6–10.
import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';
import { SWITCHES } from './tuft_owlet-skin';

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
/** Loop lengths for the spring (it reads the pose a few frames back). */
export const loops: Record<string, number> = Object.fromEntries(Object.entries(clips).filter(([, c]) => c.loop).map(([k, c]) => [k, c.seconds]));
type Ease = 'io' | 'o' | 'i' | 'b' | 'l' | 's';
type Key = [number, JointPose] | [number, JointPose, Ease];
type Track = Key[];
const TAU = Math.PI * 2;
/** Painted size relative to natural (the skin reads sx / sy as offsets from 1). */
const size = (x: number, y = x) => ({ sx: x - 1, sy: y - 1 });

/** Foot goal in the floor frame (forward, right, up). */
const foot = (name: 'L' | 'R', f: number, r: number, u: number) => reach('foot' + name, [f, r, u]);
/** Sitting on its bottom with the feet up (after the fall in «Мотылёк»). */
const SIT = { crouch: 3.4, pitch: -0.7, lean: -1.3, ...foot('L', 4.4, -2.7, 3.2), ...foot('R', 4.9, 2.7, 3.8) };
/** Asleep on one leg: fluffed into a ball, the head sunk, the tufts laid back, the right foot tucked in. */
export const SLEEP: JointPose = { fluff: 0.9, stretch: -1.7, tufts: -0.75, nod: 0.32, headRoll: 0.1, blink: 1, tuckR: 1, sway: -0.7, roll: -0.05, tailUp: 0.15 };
/** The loop of «Мёртвая петля»: radius in field pixels, the bottom where the owlet took off. */
const LOOP_R = 28;
const loopAt = (k: number) => {
  const a = (k * Math.PI) / 4;
  return { dx: Math.round(LOOP_R * Math.sin(a) * 10) / 10, dy: Math.round(-LOOP_R * (1 - Math.cos(a)) * 10) / 10, spin: -a };
};

/** Effect beats shared with the painter of effects. */
export const beats = {
  // Мотылёк: notices a moth and follows it with its head all round, wiggles, pounces and snaps (miss), chases it up
  // over the frame, drops back, looks round; the moth lands on its tuft, it squints up cross-eyed, twists to snap,
  // topples onto its bottom, waves the moth goodbye, hops up and bows.
  trick: { notice: 3, wiggle: 22, pounce: 28, snap: 32, gone: 44, back: 47, land: 56, perch: 64, twist: 78, thump: 82, leave: 86, wave: 90, hop: 105, bow: 112 },
  // Мёртвая петля: looks up, crouches with wings ready, takes off with a downstroke, a full loop over the frame, a
  // swoop right at the viewer, banks away, lands, stumbles in two hops, dizzy, shakes it off, a proud «ta-da».
  trick_b: { ready: 8, takeoff: 14, loop: 17, top: 26, loopEnd: 38, swoop: 44, bank: 50, land: 60, hop1: 63, hop2: 67, dizzy: 71, tada: 88, bow: 104 },
  fidget_a: { nibble: 7, puff: 22, shake: 24, proud: 34 },
  fidget_b: { hear: 3, spin: 8, dizzy: 22, shake: 38 },
  hatch: { rumble: 2, pop: 11, land: 26, shake: 29 },
  happy: { jump: 7, puff: 13, land: 23, dance: 29 },
  wake_startled: { jolt: 2, threat: 11 },
  sleep_in: { yawn: 5 },
};

/** Wing beats: `n` alternating up/down strokes every `step` frames from `start`, laid over `base`. */
function flaps(start: number, n: number, step: number, base: JointPose, up = 1.2, down = -0.5): Key[] {
  const keys: Key[] = [];
  for (let i = 0; i < n; i++) keys.push([start + i * step, { ...base, flap: i % 2 ? down : up }, 'o']);
  return keys;
}
const wiggle = { crouch: 1.6, lean: 0.8, pitch: 0.25, headYaw: -0.45, nod: 0.3, tufts: -0.6, pupil: 0.7, brow: 0.7, wings: 0.1 };
const cheer = { stretch: 0.6, wings: 0.55, flap: 1.3, tufts: 1, joy: 1, blush: 1 };

export const tracks: Record<string, Track> = {
  // Alive at rest: a curious head tilt, a blink, a snap to the other side, the owl's head bob (judging distance), a
  // ruffle of the feathers with a little shake, a foot taps twice, a big-eyed look at the owner.
  idle: [
    [0, {}],
    [4, { headRoll: 0.36, headYaw: 0.22, lookX: 0.3 }, 'b'],
    [12, { headRoll: 0.34, headYaw: 0.2, lookX: 0.3 }],
    [14, { headRoll: 0.34, headYaw: 0.2, blink: 1 }, 's'],
    [16, { headRoll: 0.34, headYaw: 0.2 }, 's'],
    [18, { headRoll: -0.4, headYaw: -0.35, lookX: -0.3 }, 'o'],
    [24, { headRoll: -0.38, headYaw: -0.34, lookX: -0.3 }],
    [26, { stretch: 0.9, headYaw: -0.1 }, 'o'],
    [28, { stretch: -0.5, headYaw: -0.1, nod: 0.1 }, 'o'],
    [30, { stretch: 0.9, headYaw: -0.1 }, 'o'],
    [32, { stretch: -0.4, headYaw: -0.1, nod: 0.1 }, 'o'],
    [35, {}, 'b'],
    [38, { fluff: 0.9, wings: 0.25, flap: 0.35, tufts: 0.6, roll: 0.08 }, 'o'],
    [40, { fluff: 0.9, wings: 0.25, flap: 0.1, tufts: 0.6, roll: -0.09 }, 'o'],
    [42, { fluff: 0.8, wings: 0.2, flap: 0.3, tufts: 0.5, roll: 0.07 }, 'o'],
    [44, { fluff: 0.6, wings: 0.1, tufts: 0.3, roll: -0.04 }, 'o'],
    [48, { fluff: 0 }, 'io'],
    [51, { tapR: 1, lookY: -0.4, nod: 0.15 }, 'o'],
    [53, { tapR: 0, lookY: -0.4, nod: 0.15 }, 'i'],
    [55, { tapR: 1, lookY: -0.4, nod: 0.15 }, 'o'],
    [57, { tapR: 0, lookY: -0.3, nod: 0.1 }, 'i'],
    [61, { pupil: 0.45, blush: 1, headRoll: 0.12, tufts: 0.3 }, 'b'],
    [67, { pupil: 0.4, blush: 1, headRoll: 0.1, tufts: 0.3 }],
    [72, {}],
  ],
  // A rustle: up on its toes and slim, the head snaps right, a hold, then swivels all the way past the other
  // shoulder (an owl's turn), a hold, back to the owner with a tilt and a blink.
  look: [
    [0, {}],
    [3, { stretch: 1.3, fluff: -0.35, tufts: 0.7, pupil: 0.3 }, 'o'],
    [6, { stretch: 1.3, fluff: -0.35, tufts: 0.7, pupil: 0.3, headYaw: -1.45, lookX: -0.5 }, 'o'],
    [13, { stretch: 1.2, fluff: -0.3, tufts: 0.6, pupil: 0.4, headYaw: -1.4, lookX: -0.5, nod: 0.06 }],
    [16, { stretch: 1.2, fluff: -0.3, tufts: 0.6, pupil: 0.4, headYaw: 1.5, twist: 0.25, lookX: 0.5 }, 'o'],
    [18, { stretch: 1.2, fluff: -0.3, tufts: 0.6, pupil: 0.5, headYaw: 2.45, twist: 0.3, lookX: 0.6 }, 'b'],
    [25, { stretch: 1.1, fluff: -0.25, tufts: 0.5, pupil: 0.5, headYaw: 2.4, twist: 0.3, lookX: 0.6 }],
    [28, { stretch: 0.3, headYaw: 0.1, headRoll: 0.34, blink: 1 }, 'o'],
    [30, { stretch: 0.2, headYaw: 0.1, headRoll: 0.32, blink: 0, pupil: 0.3 }, 's'],
    [36, {}],
  ],
  // Preening: turns to its wing and nibbles the feathers three times, puffs up and shakes all over, then smooths down
  // slim and proud with a satisfied squint.
  fidget_a: [
    [0, {}],
    [4, { headYaw: 1.15, nod: 0.5, headRoll: 0.2, wingR: 0.4, flapR: -0.25, sweepR: -0.25, lean: -0.3, twist: 0.25, lid: 0.3 }, 'b'],
    [7, { headYaw: 1.2, nod: 0.72, headRoll: 0.2, wingR: 0.4, flapR: -0.25, sweepR: -0.25, lean: -0.3, twist: 0.25, beak: 0.7, lid: 0.4 }, 'o'],
    [9, { headYaw: 1.15, nod: 0.45, headRoll: 0.25, wingR: 0.42, flapR: -0.2, sweepR: -0.25, lean: -0.3, twist: 0.25, lid: 0.3 }, 'o'],
    [11, { headYaw: 1.25, nod: 0.78, headRoll: 0.15, wingR: 0.42, flapR: -0.2, sweepR: -0.25, lean: -0.3, twist: 0.25, beak: 0.8, lid: 0.4 }, 'o'],
    [13, { headYaw: 1.15, nod: 0.45, headRoll: 0.25, wingR: 0.4, flapR: -0.25, sweepR: -0.25, lean: -0.3, twist: 0.25, lid: 0.3 }, 'o'],
    [15, { headYaw: 1.3, nod: 0.75, headRoll: 0.2, wingR: 0.45, flapR: -0.2, sweepR: -0.2, lean: -0.3, twist: 0.25, beak: 0.7, lid: 0.4 }, 'o'],
    [17, { headYaw: 1.2, nod: 0.5, headRoll: 0.2, wingR: 0.4, flapR: -0.25, sweepR: -0.25, lean: -0.3, twist: 0.25, lid: 0.3 }, 'o'],
    [20, { headYaw: 0.1, lid: 0.2 }, 'o'],
    [22, { fluff: 1.3, wings: 0.3, flap: 0.3, tufts: 0.9, roll: 0.15, headRoll: 0.2, lid: 0.6, ...size(1.06, 0.97) }, 'o'],
    [24, { fluff: 1.3, wings: 0.3, flap: 0.1, tufts: 0.9, roll: -0.17, headRoll: -0.35, lid: 0.6 }, 'o'],
    [26, { fluff: 1.2, wings: 0.25, flap: 0.3, tufts: 0.8, roll: 0.17, headRoll: 0.35, lid: 0.6 }, 'o'],
    [28, { fluff: 1.1, wings: 0.2, flap: 0.1, tufts: 0.7, roll: -0.13, headRoll: -0.25, lid: 0.6 }, 'o'],
    [30, { fluff: 0.8, wings: 0.1, flap: 0.2, tufts: 0.5, roll: 0.09, headRoll: 0.15, lid: 0.5 }, 'o'],
    [32, { fluff: 0.3, roll: 0, lid: 0.3 }, 'o'],
    [35, { fluff: -0.3, stretch: 0.7, nod: -0.18, lid: 0.55, blush: 1, tufts: 0.55, bend: -0.15 }, 'b'],
    [43, { fluff: -0.28, stretch: 0.65, nod: -0.16, lid: 0.55, blush: 1, tufts: 0.5, bend: -0.12 }],
    [48, {}],
  ],
  // Hears something behind, the head spins a full turn round, a little past; dizzy, the eyes roll round, then it
  // shakes the head and blinks.
  fidget_b: [
    [0, {}],
    [3, { tufts: 0.85, pupil: 0.5, browUp: 0.7, headYaw: 0.15 }, 'b'],
    [8, { tufts: 0.7, pupil: 0.5, headYaw: 1.45, browUp: 0.3 }, 'o'],
    [11, { tufts: 0.6, pupil: 0.5, headYaw: 2.95 }, 'l'],
    [14, { tufts: 0.6, pupil: 0.5, headYaw: 4.45 }, 'l'],
    [17, { tufts: 0.6, pupil: 0.5, headYaw: 5.95 }, 'l'],
    [19, { tufts: 0.4, pupil: 0.4, headYaw: 6.75, headRoll: 0.2 }, 'o'],
    [22, { tufts: -0.4, headYaw: 6.4, headRoll: 0.3, roll: 0.1, lookX: 0.7, lid: 0.3 }, 'io'],
    [25, { tufts: -0.5, headYaw: 6.35, headRoll: -0.25, roll: -0.1, lookY: 0.7, lid: 0.3 }, 'io'],
    [28, { tufts: -0.5, headYaw: 6.3, headRoll: 0.3, roll: 0.12, lookX: -0.7, lid: 0.3 }, 'io'],
    [31, { tufts: -0.5, headYaw: 6.3, headRoll: -0.25, roll: -0.1, lookY: -0.7, lid: 0.3 }, 'io'],
    [34, { tufts: -0.5, headYaw: 6.3, headRoll: 0.2, roll: 0.08, lookX: 0.7, lid: 0.25 }, 'io'],
    [36, { tufts: -0.3, headYaw: 6.28, headRoll: 0, roll: 0, lid: 0.2 }, 'io'],
    [38, { tufts: 0.2, headYaw: 6.7 }, 'o'],
    [40, { tufts: 0.3, headYaw: 5.9 }, 'o'],
    [42, { tufts: 0.3, headYaw: 6.5 }, 'o'],
    [44, { headYaw: 6.28, blink: 1 }, 'o'],
    [46, { headYaw: 6.28, blink: 0, pupil: 0.3 }, 's'],
    [48, {}],
  ],
  // «Пух-пух»: a crouch, a jump with flapping wings, it puffs into a fluffy ball with happy eyes at the top, lands,
  // wings up, a little dance from foot to foot.
  happy: [
    [0, {}],
    [4, { crouch: 1.7, fluff: 0.3, wings: 0.2, tufts: -0.3, ...size(1.1, 0.9) }, 'o'],
    [7, { lift: 7, wings: 1, flap: 1.25, fluff: 0.7, tufts: 0.9, pupil: 0.5, ...size(0.94, 1.08) }, 'o'],
    [9, { lift: 10, wings: 1, flap: -0.5, fluff: 0.9, tufts: 0.7 }, 'o'],
    [11, { lift: 12, wings: 1, flap: 1.25, fluff: 1.1, tufts: 0.8 }, 'o'],
    [13, { lift: 12.6, wings: 0.7, flap: -0.3, fluff: 1.6, tufts: 1, joy: 1, blush: 1, roll: 0.1 }, 'o'],
    [16, { lift: 12, wings: 0.6, flap: 0.8, fluff: 1.6, tufts: 1, joy: 1, blush: 1, roll: -0.1 }, 'io'],
    [18, { lift: 9.5, wings: 1, flap: 1.25, fluff: 1.2, tufts: 0.8, joy: 1, blush: 1 }, 'o'],
    [21, { lift: 4, wings: 1, flap: 0.3, fluff: 0.8, tufts: 0.5, joy: 1 }, 'i'],
    [23, { crouch: 1.5, wings: 0.6, flap: 0.6, fluff: 0.6, tufts: 0.2, joy: 1, ...size(1.12, 0.88) }, 'i'],
    [26, { ...cheer }, 'b'],
    [29, { ...cheer, sway: 1.1, roll: 0.15, tapL: 1, flap: 1.1, headRoll: 0.2 }, 'o'],
    [32, { ...cheer, sway: -1.1, roll: -0.15, tapR: 1, flap: 1.0, headRoll: -0.2 }, 'o'],
    [35, { ...cheer, sway: 0.6, roll: 0.1, tapL: 1, flap: 1.1, headRoll: 0.15 }, 'o'],
    [38, { joy: 0, blush: 1, wings: 0.1, tufts: 0.3, blink: 1 }, 'io'],
    [40, { blush: 0.6, blink: 0 }, 's'],
    [42, {}],
  ],
  // Out of a pumpkin (drawn by the effects at its feet): hidden while it rumbles, the lid pops and the owlet shoots
  // up flapping, surprised; drops, lands, shakes the pumpkin bits off, perks up at the owner.
  hatch: [
    [0, { hidden: 1, crouch: 2.5, fluff: 1, tufts: -1, lid: 1, ...size(0.7) }],
    [10, { hidden: 1, crouch: 2.5, fluff: 1, tufts: -1, lid: 1, ...size(0.7) }],
    [11, { hidden: 0, lift: 3, crouch: 0, stretch: 1, fluff: 0.4, wings: 0.8, flap: 1.2, tufts: 0.6, pupil: 0.8, browUp: 1, beak: 1, ...size(0.9, 1.1) }, 'o'],
    [13, { lift: 13, stretch: 1, wings: 1, flap: 1.3, tufts: 1, pupil: 0.8, browUp: 1, beak: 1 }, 'o'],
    [15, { lift: 15.5, stretch: 0.6, wings: 1, flap: -0.5, tufts: 0.8, pupil: 0.7, browUp: 0.8, beak: 0.5 }, 'o'],
    [17, { lift: 15, wings: 1, flap: 1.2, tufts: 0.7, pupil: 0.6, browUp: 0.6 }, 'o'],
    [19, { lift: 12, wings: 1, flap: -0.4, tufts: 0.6, pupil: 0.5 }, 'o'],
    [21, { lift: 9, wings: 1, flap: 1.0, tufts: 0.5, pupil: 0.4 }, 'o'],
    [24, { lift: 3, wings: 0.8, flap: 0.6, tufts: 0.4 }, 'i'],
    [26, { crouch: 1.6, wings: 0.4, flap: 0.3, tufts: 0.2, ...size(1.12, 0.88) }, 'i'],
    [29, { fluff: 1.3, roll: 0.16, headRoll: 0.3, wings: 0.2, lid: 0.6, tufts: 0.6 }, 'o'],
    [31, { fluff: 1.3, roll: -0.17, headRoll: -0.35, wings: 0.25, lid: 0.6, tufts: 0.6 }, 'o'],
    [33, { fluff: 1.0, roll: 0.12, headRoll: 0.25, wings: 0.15, lid: 0.6, tufts: 0.5 }, 'o'],
    [35, { fluff: 0.2, roll: 0, headRoll: 0, lid: 0.2 }, 'o'],
    [38, { tufts: 0.9, headRoll: 0.3, pupil: 0.4, blush: 1 }, 'b'],
    [40, { tufts: 0.85, headRoll: 0.3, pupil: 0.4, blush: 1, blink: 1 }, 'o'],
    [42, { tufts: 0.8, headRoll: 0.28, pupil: 0.4, blush: 1, blink: 0 }, 's'],
    [48, {}],
  ],
  // A big yawn with the wings stretched up, the lids grow heavy, the head droops and jerks up once, then it fluffs
  // into a ball on one leg.
  sleep_in: [
    [0, {}],
    [5, { beak: 1, stretch: 1, nod: -0.45, lid: 0.75, wings: 0.75, flap: 1.05, tufts: 0.6 }, 'io'],
    [11, { beak: 1, stretch: 1.2, nod: -0.5, lid: 0.9, wings: 0.8, flap: 1.15, tufts: 0.7 }],
    [14, { lid: 0.6 }, 'o'],
    [18, { lid: 0.9, nod: 0.25, headRoll: 0.18, stretch: -0.5 }, 'io'],
    [20, { lid: 0.45, nod: -0.05 }, 'o'],
    [26, { ...SLEEP, blink: 0, lid: 1 }, 'io'],
    [27, { ...SLEEP }, 's'],
    [30, { ...SLEEP }],
  ],
  // Asleep on one leg: the ball breathes (the skin), a tuft twitches, it mumbles with the beak.
  sleep: [
    [0, { ...SLEEP }],
    [28, { ...SLEEP }],
    [30, { ...SLEEP, tuftL: 0.7 }, 'o'],
    [33, { ...SLEEP, tuftL: 0 }, 'b'],
    [48, { ...SLEEP }],
    [51, { ...SLEEP, beak: 0.25, nod: 0.36 }, 'io'],
    [54, { ...SLEEP }, 'io'],
    [72, { ...SLEEP }],
  ],
  // One eye peeks, then the other; it wakes, stretches the wings and a leg, shakes and stands.
  sleep_out: [
    [0, { ...SLEEP }],
    [4, { ...SLEEP, blink: 0, lid: 0, lidR: 1, lidL: 0.55 }, 's'],
    [9, { ...SLEEP, blink: 0, lid: 0, lidR: 1, lidL: 0.5, headRoll: 0.2 }],
    [11, { ...SLEEP, blink: 0, lid: 0, lidR: 0.15, lidL: 0.1, pupil: 0.4, tufts: 0 }, 'o'],
    [15, { stretch: 1.1, fluff: 0.2, wings: 0.8, flap: 1.2, beak: 0.7, nod: -0.4, tuckR: 0.3, ...foot('R', 2.4, 3.2, 2.2) }, 'o'],
    [20, { stretch: 1.2, fluff: 0.2, wings: 0.85, flap: 1.25, beak: 0.6, nod: -0.4, ...foot('R', 2.6, 3.4, 2.4) }],
    [23, { stretch: 0.4, fluff: -0.2, tufts: 0.8 }, 'o'],
    [25, { roll: 0.12, headRoll: 0.25, tufts: 0.8 }, 'o'],
    [27, { roll: -0.1, headRoll: -0.2, tufts: 0.6 }, 'o'],
    [30, {}],
  ],
  // Jolted awake: slim and tall like a startled owl, eyes huge, a hold; then it puffs up big with the wings spread to
  // look scary, a hold, folds, blinks.
  wake_startled: [
    [0, { ...SLEEP }],
    [2, { blink: 0, fluff: -1, stretch: 2, tufts: 1.3, pupil: 1, browUp: 1, wings: 0.25, lift: 1.6, sway: 0, ...size(0.92, 1.08) }, 'o'],
    [9, { blink: 0, fluff: -1, stretch: 1.9, tufts: 1.3, pupil: 1, browUp: 1, wings: 0.25, lift: 0 }, 'i'],
    [11, { fluff: 1.3, wings: 1, flap: 0.55, fan: 0.6, tufts: 0.4, pupil: 0.3, brow: 0.8, beak: 1, ...size(1.06, 0.98) }, 'b'],
    [15, { fluff: 1.3, wings: 1, flap: 0.6, fan: 0.6, tufts: 0.4, pupil: 0.3, brow: 0.8, beak: 0.6 }],
    [18, { fluff: 0.2, wings: 0.1, blink: 1 }, 'o'],
    [20, { blink: 0, headRoll: 0.2, blush: 1 }, 's'],
    [24, {}],
  ],
  // «Мотылёк».
  trick: [
    [0, {}],
    [3, { tufts: 0.9, pupil: 0.6, browUp: 0.8, headYaw: -0.95, nod: -0.3 }, 'o'],
    [8, { tufts: 0.6, pupil: 0.7, headYaw: -0.6, nod: -0.8, stretch: 0.8, lookY: 0.4 }, 'io'],
    [11, { tufts: 0.6, pupil: 0.7, headYaw: 0.2, nod: -1.0, stretch: 1.0, lookY: 0.5 }, 'io'],
    [14, { tufts: 0.6, pupil: 0.7, headYaw: 1.25, nod: -0.5, stretch: 0.6, twist: 0.2 }, 'io'],
    [18, { tufts: 0.5, pupil: 0.8, headYaw: 0.75, nod: 0.15, twist: 0.1, lookY: -0.3 }, 'io'],
    [20, { tufts: 0.5, pupil: 0.8, headYaw: -0.85, nod: 0.05 }, 'o'],
    [22, { ...wiggle, sway: 0.75, tailWag: 0.45 }, 'o'],
    [23.5, { ...wiggle, sway: -0.75, tailWag: -0.45 }, 'o'],
    [25, { ...wiggle, sway: 0.75, tailWag: 0.45 }, 'o'],
    [26.5, { ...wiggle, sway: -0.75, tailWag: -0.45 }, 'o'],
    [28, { ...wiggle, crouch: 2.3, ...size(1.08, 0.9) }, 'o'],
    [31, { lift: 9, dx: 12, lean: 1.4, pitch: 0.45, wings: 1, flap: 1.15, fan: 0.6, beak: 1, headYaw: -0.4, nod: 0.25, tufts: -1, pupil: 0.8, brow: 0.9, ...foot('L', 5, -2.4, 15), ...foot('R', 5.5, 2.4, 15.5), ...size(0.94, 1.08) }, 'o'],
    [32, { lift: 10, dx: 12, lean: 1.4, pitch: 0.4, wings: 1, flap: 0.6, fan: 0.6, beak: 0, headYaw: -0.4, nod: 0.25, tufts: -1, pupil: 0.8, brow: 0.9, ...foot('L', 5, -2.4, 16), ...foot('R', 5.5, 2.4, 16.5) }, 'o'],
    [34, { lift: 13, dx: 12, wings: 1, flap: -0.5, headYaw: 0.1, nod: -0.95, browUp: 0.8, pupil: 0.9, tufts: 0.4, overAll: 1 }, 'o'],
    ...flaps(36, 5, 2, { wings: 1, fan: 0.5, headYaw: 0.1, nod: -0.9, pupil: 0.8, overAll: 1 }).map(([fr, p], i): Key => [fr, { ...p, lift: 16 + i * 4, dy: -12 - i * 22, dx: 10 - i * 2 }, 'o']),
    [44, { lift: 30, dy: -110, dx: 2, wings: 1, flap: 1.2, overAll: 1, hidden: 1 }, 'o'],
    [46, { lift: 30, dy: -110, dx: 0, wings: 1, flap: 1.2, overAll: 1, hidden: 1 }],
    [47, { lift: 30, dy: -90, wings: 1, flap: 1.0, fan: 0.6, overAll: 1, tufts: -0.6, nod: 0.2, headYaw: 0.3 }, 'o'],
    [50, { lift: 22, dy: -50, wings: 1, flap: -0.4, fan: 0.6, overAll: 1, tufts: -0.6, nod: 0.15 }, 'io'],
    [53, { lift: 12, dy: -16, wings: 1, flap: 1.25, fan: 0.6, overAll: 1, tufts: -0.6, nod: 0.1 }, 'i'],
    [56, { crouch: 1.8, wings: 0.8, flap: 1.0, tufts: -0.2, ...size(1.12, 0.88) }, 'i'],
    [58, { crouch: 0.4, wings: 0.3, flap: 0.5, tufts: 0.3, headYaw: -1.05, pupil: 0.4 }, 'o'],
    [61, { wings: 0.1, tufts: 0.3, headYaw: 1.15, pupil: 0.4 }, 'o'],
    [64, { headYaw: 0.1, browUp: 0.6, pupil: 0.3 }, 'o'],
    [66, { headYaw: 0.1, browUp: 0.6, pupil: 0.3 }],
    [70, { nod: -0.5, lookY: 1, cross: 0.75, pupil: 0.2, tufts: 0.1 }, 'io'],
    [72, { nod: -0.5, lookY: 1, cross: 0.75, pupil: 0.2, tufts: 0.1, tuftWiggle: 0.9 }],
    [76, { nod: -0.55, lookY: 1, cross: 0.8, pupil: 0.2, tufts: 0.1, tuftWiggle: 0.9, brow: 0.5 }],
    [78, { nod: -1.15, headYaw: 1.4, headRoll: 0.5, beak: 1, stretch: 0.8, lean: -1.0, pitch: -0.3, wings: 0.4, flap: 0.8, brow: 0.7 }, 'o'],
    [80, { nod: -1.25, headYaw: 2.4, headRoll: 0.6, beak: 0, pitch: -0.55, lean: -1.6, wings: 0.85, flap: 1.25, fan: 0.6, tufts: 1, pupil: 0.8, browUp: 1 }, 'o'],
    [82, { ...SIT, headYaw: 0.4, nod: -0.4, wings: 0.6, flap: 0.6, blink: 1, tufts: -0.3, ...size(1.1, 0.9) }, 'i'],
    [84, { ...SIT, crouch: 2.8, headYaw: 0.3, nod: -0.25, wings: 0.4, flap: 0.5, lid: 0.3, tufts: -0.4 }, 'o'],
    [86, { ...SIT, headYaw: 0.25, nod: -0.3, wings: 0.3, lid: 0.25, tufts: -0.2 }, 'i'],
    [90, { ...SIT, headYaw: -0.35, nod: -0.4, wingR: 0.95, flapR: 1.25, sweepR: 0.3, blush: 1, pupil: 0.4 }, 'b'],
    [93, { ...SIT, headYaw: -0.35, nod: -0.4, wingR: 0.95, flapR: 0.5, sweepR: 0.3, blush: 1, pupil: 0.4 }, 'o'],
    [96, { ...SIT, headYaw: -0.3, nod: -0.4, wingR: 0.95, flapR: 1.3, sweepR: 0.3, blush: 1, pupil: 0.4 }, 'o'],
    [99, { ...SIT, headYaw: -0.3, nod: -0.35, wingR: 0.95, flapR: 0.6, sweepR: 0.3, blush: 1, pupil: 0.4 }, 'o'],
    [102, { ...SIT, headYaw: 0.2, wingR: 0.3, flapR: 0.3, blush: 0.6 }, 'io'],
    [105, { lift: 4.5, wings: 0.5, flap: 1.0, tufts: 0.5 }, 'o'],
    [108, { crouch: 1.2, wings: 0.2, ...size(1.08, 0.92) }, 'i'],
    [112, { nod: 0.75, bend: 0.6, wings: 0.25, flap: -0.3, sweep: 0.45, lid: 0.8, blush: 1 }, 'io'],
    [116, { nod: 0.1, bend: 0, blush: 0.5 }, 'b'],
    [120, {}],
  ],
  // «Мёртвая петля».
  trick_b: [
    [0, {}],
    [3, { headYaw: -0.2, nod: -0.8, pupil: 0.5, tufts: 0.6, stretch: 0.6, lookY: 0.5 }, 'b'],
    [8, { crouch: 2.2, lean: 0.4, wings: 1, flap: 0.5, fan: 0.4, tufts: -0.8, brow: 0.8, nod: -0.4, headYaw: -0.3, ...size(1.08, 0.92) }, 'o'],
    [12, { crouch: 2.4, lean: 0.5, wings: 1, flap: 0.8, fan: 0.4, tufts: -0.8, brow: 0.8, nod: -0.35, headYaw: -0.3, ...size(1.1, 0.9) }],
    [14, { lift: 10, wings: 1, flap: -0.6, fan: 0.6, tufts: -1, brow: 0.6, nod: -0.2, grip: 0.6, overAll: 1, ...size(0.92, 1.1) }, 'o'],
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((k): Key => [14 + k * 3, { lift: 10, ...loopAt(k), wings: 1, flap: k % 2 ? 1.25 : -0.5, fan: 0.6, tufts: -1, grip: 0.6, overAll: 1, pupil: k >= 3 && k <= 5 ? 1 : 0.4, beak: k === 4 ? 1 : 0, joy: k === 4 ? 1 : 0, brow: k === 4 ? 0 : 0.5 }, 'l']),
    [41, { lift: 6, dy: 4, wings: 1, flap: 1.0, fan: 0.8, tufts: -1, pupil: 0.8, beak: 1, overAll: 1, ...size(1.25) }, 'o'],
    [44, { lift: 4, dy: 14, wings: 1, flap: 0.2, fan: 1, tufts: -1, pupil: 0.8, browUp: 1, beak: 1, overAll: 1, ...size(1.6) }, 'o'],
    [47, { lift: 4, dy: 15, wings: 1, flap: 1.1, fan: 1, tufts: -1, pupil: 0.8, browUp: 1, beak: 1, overAll: 1, ...size(1.65) }, 'io'],
    [50, { lift: 14, dy: -10, dx: -20, wings: 1, flap: -0.5, fan: 0.6, tufts: -1, spin: 0.45, overAll: 1, ...size(0.85) }, 'o'],
    [53, { lift: 16, dy: -16, dx: -10, wings: 1, flap: 1.25, fan: 0.6, tufts: -0.8, spin: 0.2, overAll: 1, ...size(0.9) }, 'o'],
    [57, { lift: 8, wings: 1, flap: 1.25, fan: 0.6, tufts: -0.6, grip: 0, overAll: 1, ...foot('L', 4.5, -2.6, 10), ...foot('R', 5, 2.6, 10.5) }, 'io'],
    [60, { crouch: 2, wings: 0.8, flap: 0.9, tufts: -0.2, ...size(1.12, 0.88) }, 'i'],
    [63, { lift: 2.5, dx: 6, roll: 0.2, wings: 0.5, flap: 0.7, tufts: -0.5, pupil: 0.3 }, 'o'],
    [65, { dx: 9, roll: -0.15, crouch: 0.6, wings: 0.3, tufts: -0.5 }, 'i'],
    [67, { lift: 2, dx: 13, roll: 0.25, wings: 0.45, flap: 1.0, tufts: -0.5 }, 'o'],
    [69, { dx: 15, roll: -0.1, crouch: 0.6, tufts: -0.6 }, 'i'],
    [71, { dx: 15, roll: 0.15, headRoll: 0.35, lookX: 0.7, tufts: -0.6, lid: 0.3 }, 'io'],
    [73, { dx: 15, roll: -0.1, headRoll: -0.3, lookY: 0.7, tufts: -0.6, lid: 0.3 }, 'io'],
    [75, { dx: 15, roll: 0.12, headRoll: 0.3, lookX: -0.7, tufts: -0.6, lid: 0.3 }, 'io'],
    [77, { dx: 15, roll: -0.1, headRoll: -0.25, lookY: -0.7, tufts: -0.6, lid: 0.3 }, 'io'],
    [79, { dx: 15, roll: 0.05, headRoll: 0.1, lookX: 0.6, tufts: -0.5, lid: 0.2 }, 'io'],
    [81, { dx: 15, headYaw: 0.45, tufts: 0.2 }, 'o'],
    [83, { dx: 15, headYaw: -0.45, tufts: 0.3 }, 'o'],
    [85, { dx: 15, headYaw: 0, tufts: 0.4 }, 'o'],
    [88, { dx: 15, stretch: 1, fluff: 0.4, bend: -0.3, wings: 1, flap: 0.7, fan: 1, tufts: 1, joy: 1, blush: 1, nod: -0.2 }, 'b'],
    [95, { dx: 15, stretch: 0.95, fluff: 0.4, bend: -0.28, wings: 1, flap: 0.75, fan: 1, tufts: 0.9, joy: 1, blush: 1, nod: -0.2 }],
    [98, { dx: 8, lift: 3, wings: 0.3, flap: 0.6, tufts: 0.5 }, 'o'],
    [100, { dx: 4, crouch: 0.5 }, 'i'],
    [102, { dx: 1, lift: 2 }, 'o'],
    [104, { nod: 0.6, bend: 0.5, wings: 0.2, sweep: 0.4, lid: 0.7, blush: 1 }, 'io'],
    [108, {}],
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
              ? 0
              : x * x * (3 - 2 * x);
  const pose: JointPose = {};
  for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (SWITCHES.has(name)) pose[name] = f >= end ? (b[name] ?? 0) : (a[name] ?? 0);
    else if (name === 'spin' || name === 'headYaw') {
      // Full turns take the short way back: a head or a body that ends a whole turn ahead is back at rest.
      const to = b[name] ?? 0,
        from = to + ((((a[name] ?? 0) - to + Math.PI) % TAU) + TAU) % TAU - Math.PI;
      pose[name] = from * (1 - u) + to * u;
    } else pose[name] = (a[name] ?? 0) * (1 - u) + (b[name] ?? 0) * u;
  }
  return pose;
}
export const helpers = { size };
