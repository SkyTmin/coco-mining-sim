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
  fidget_b: { seconds: 2.5 },
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
/** Painted size relative to natural (the skin reads sx / sy as offsets from 1). */
const size = (x: number, y = x) => ({ sx: x - 1, sy: y - 1 });
export const goalOf = (name: string, f: number, r: number, u: number) => reach(name, [f, r, u]);
const paw = (side: 'L' | 'R', f: number, r: number, u: number) => reach('paw' + side, [f, r, u]);
/** On its haunches like a cat. */
const SIT: JointPose = { sit: 1 };
/** Asleep: curled on its tucked legs, the mane closed into a bud for the night, the stem tail lying low. */
export const SLEEP: JointPose = { crouch: 2.4, tuck: 1, bud: 1, nod: 0.5, blink: 1, headRoll: 0.2, tailUp: -1.0, tailCurl: 0.4 };
/** Feet pattering while it runs on the spot of a pose: one tap per key, round the four feet. */
const PATTER = ['tapLH', 'tapLF', 'tapRH', 'tapRF'];
const patter = (k: number): JointPose => ({ [PATTER[k % 4]]: 1 });
/** Желание: the tail brought round the near flank, its little clock held in front of the mouth. */
const WISH: JointPose = { ...SIT, tailFront: 1, ...paw('R', 4.2, 1.8, 6.4), nod: 0.15, lookY: -0.5, ears: 0.4 };
/** A paw at the mouth / the cheek / the ear tip while it sits (washing). */
const RUB_MOUTH = paw('R', 3.6, 1.2, 9.6);
const RUB_CHEEK = paw('R', 3.0, 1.8, 8.6);
const EAR_TOP = paw('R', 2.0, 2.8, 12.0);
const EAR_MID = paw('R', 2.6, 2.6, 10.6);

/** Effect beats shared with the painter of effects. */
export const beats = {
  // Детки-пушинки: a deep breath, it shakes its mane and five seed children float up; it watches them proudly. A gust
  // takes them: it gasps, runs after them, leaps and misses, sits down sadly. Little dandelions sprout at its feet,
  // turn into clocks, and their seeds fly back into its mane; it hops home happy.
  trick: { breath: 4, shake: 14, release: 26, gust: 48, chase: 52, leap: 66, miss: 76, sad: 80, sprout: 92, sniff: 106, back: 110, full: 122, home: 126 },
  // Парашютик: the wind rises, it braces, a gust lifts it by the mane; it rises and floats, swaying, over the meadow
  // (the mane pokes over the frame); the wind drops, it hangs for a moment, then parachutes down and lands on tiptoe.
  trick_b: { wind: 0, lift: 22, float: 38, calm: 64, descend: 70, land: 100, bow: 106 },
  // Цветёт: it lifts its face to the sun, the mane opens as a yellow flower; a bumblebee comes, circles, lands on its
  // nose — cross-eyed, it freezes; the bee lifts off in a puff of pollen, it sneezes and the flower closes back into a
  // clock; it rubs its nose and giggles.
  trick_c: { sun: 0, open: 18, bloom: 30, bee: 48, land: 66, off: 84, sneeze: 88, closed: 96, giggle: 100 },
  // Желание: it brings its tail round to its face, closes its eyes and makes a wish, takes a breath and blows on the
  // little clock — the seeds stream up and make a heart in the sky; the heart bursts into sparkles, the clock grows back.
  trick_d: { tail: 0, wish: 16, breath: 30, blow: 34, heart: 52, burst: 82, regrow: 92, joy: 100 },
  fidget_a: { rub: 4, ear: 20, snap: 30, shake: 34 },
  fidget_b: { loose: 4, bat: 26, back: 34 },
  fidget_c: { rise: 6, sails: 12, down: 46 },
  happy: { hop1: 8, hop2: 18, hop3: 28, land: 33 },
  hatch: { bud: 0, squeeze: 14, burst: 18, land: 26, shake: 32, look: 44 },
  sleep_in: { yawn: 4, curl: 16, close: 24 },
  sleep_out: { open: 4, stretch: 12, shake: 26 },
  wake_startled: { jolt: 2, look: 10 },
};
/** Детки-пушинки: how far left it runs after its seed children (field px). */
export const CHASE = -34;

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
  // Something rustles: the head turns, holds; back to the viewer with a curious tilt and raised brows.
  look: [
    [0, { wind: 0.3 }],
    [3, { headYaw: -0.8, nod: -0.2, stretch: 0.6, ears: 0.7, lookX: -0.5 }, 'o'],
    [15, { headYaw: -0.78, nod: -0.18, stretch: 0.6, ears: 0.7, lookX: -0.5 }],
    [18, { headYaw: 0.1, headRoll: -0.35, ears: 0.3, browUp: 1, lookY: 0.2 }, 'b'],
    [30, { headYaw: 0.1, headRoll: -0.33, ears: 0.3, browUp: 1, lookY: 0.2 }],
    [36, { wind: 0.3 }],
  ],
  // Умывается: sits, rubs its face twice with a paw, pulls its leaf ear down and smooths it, lets go — the ear springs
  // up — shakes its head, pleased.
  fidget_a: [
    [0, { wind: 0.3 }],
    [4, { ...SIT, ...RUB_MOUTH, nod: 0.2, blink: 1 }, 'b'],
    [8, { ...SIT, ...RUB_CHEEK, nod: 0.1, headRoll: 0.2, blink: 1 }, 'io'],
    [12, { ...SIT, ...RUB_MOUTH, nod: 0.2, blink: 1 }, 'io'],
    [16, { ...SIT, ...RUB_CHEEK, nod: 0.1, headRoll: 0.2, blink: 1 }, 'io'],
    [20, { ...SIT, ...EAR_TOP, headRoll: 0.35, earR: -1.2, lid: 0.5 }, 'o'],
    [29, { ...SIT, ...EAR_MID, headRoll: 0.35, earR: -1.4, lid: 0.6 }, 'io'],
    [31, { ...SIT, headRoll: 0.2, earR: 0.7 }, 'o'],
    [34, { ...SIT, headRoll: -0.32, ears: 0.2, blink: 1, fluff: 0.4 }, 'o'],
    [37, { ...SIT, headRoll: 0.28, blink: 1, fluff: 0.4 }, 'o'],
    [40, { ...SIT, headRoll: -0.1, joy: 1, blush: 0.5 }, 'o'],
    [48, { wind: 0.3 }],
  ],
  // Пушинка-беглянка: one seed comes loose and floats in front of its face; it follows it cross-eyed, bats at it and
  // misses; the seed sails up and back into the mane; it nods, content.
  fidget_b: [
    [0, { wind: 0.3 }],
    [4, { lookY: 0.5, lookX: 0.2, nod: -0.1, ears: 0.6, browUp: 1 }, 'o'],
    [16, { cross: 0.8, nod: 0.05, ears: 0.7, browUp: 1 }, 'io'],
    [22, { cross: 0.3, lookX: 0.6, headYaw: 0.35, nod: 0.1, ears: 0.7 }, 'io'],
    [26, { crouch: 0.6, lookX: 0.6, headYaw: 0.35, ...paw('R', 6.6, 1.4, 5.0), mouth: 0.4 }, 'o'],
    [30, { crouch: 0.3, lookX: 0.6, headYaw: 0.35, ...paw('R', 6.2, 1.2, 6.2), mouth: 0.4 }, 'o'],
    [34, { headYaw: 0.1, nod: -0.4, lookY: 1, browUp: 1, ears: 0.8 }, 'o'],
    [46, { nod: -0.42, lookY: 1, joy: 1, blush: 0.6, ears: 0.6 }, 'io'],
    [52, { nod: 0.15, joy: 1, ears: 0.4 }, 'io'],
    [60, { wind: 0.3 }],
  ],
  // Ловит ветер: half rises on its hind legs, spreads its leaf ears like sails, closes its eyes and sways in the
  // breeze, the mane combed by the wind.
  fidget_c: [
    [0, { wind: 0.3 }],
    [6, { rear: 0.5, wind: 0.6, ears: 0.8, nod: -0.25, lookY: 0.4 }, 'io'],
    [12, { rear: 0.7, wind: 1, earSpread: 1, nod: -0.3, blink: 1, puff: 0.6, tailWag: 0.5 }, 'io'],
    [24, { rear: 0.7, wind: 1, earSpread: 1, nod: -0.35, blink: 1, puff: 0.8, tailWag: -0.6, sway: 0.25, roll: 0.06 }, 'io'],
    [36, { rear: 0.65, wind: 1, earSpread: 1, nod: -0.3, blink: 1, puff: 0.8, tailWag: 0.6, sway: -0.25, roll: -0.06 }, 'io'],
    [46, { rear: 0.4, wind: 0.5, earSpread: 0.3, nod: -0.1, joy: 1, blush: 0.6 }, 'io'],
    [60, { wind: 0.3 }],
  ],
  // Three springy hops on the spot, the mane bouncing; up on its hind legs at the end, ears high.
  happy: [
    [0, { wind: 0.3 }],
    [4, { crouch: 0.8, joy: 1, ears: 0.5, ...size(1.06, 0.94) }, 'i'],
    [8, { lift: 5, joy: 1, blush: 1, ears: 1, puff: 0.8, tailUp: 0.6, mouth: 0.6, ...size(0.95, 1.06) }, 'o'],
    [13, { crouch: 0.8, joy: 1, ears: 0.4, ...size(1.06, 0.94) }, 'i'],
    [18, { lift: 6, yaw: 0.5, joy: 1, blush: 1, ears: 1, puff: 0.9, tailUp: 0.6, mouth: 0.6 }, 'o'],
    [23, { crouch: 0.8, yaw: 0.5, joy: 1, ...size(1.06, 0.94) }, 'i'],
    [28, { lift: 7, yaw: -0.3, joy: 1, blush: 1, ears: 1, puff: 1, mouth: 0.8 }, 'o'],
    [33, { crouch: 1, joy: 1, ...size(1.08, 0.92) }, 'i'],
    [38, { rear: 0.3, joy: 1, blush: 1, ears: 0.8, mouth: 0.6, tailWag: 0.6 }, 'b'],
    [44, { rear: 0.25, joy: 1, blush: 1, ears: 0.8, mouth: 0.4, tailWag: -0.4 }, 'io'],
    [48, { wind: 0.3 }],
  ],
  // From a bud: a closed green bud (about 60 % tall) wobbles, squeezes, bursts — the clock puffs out and the cub lands,
  // shakes the fluff into place, looks round and smiles.
  hatch: [
    [0, { bud: 1, crouch: 2.4, tuck: 1, blink: 1, ...size(0.88, 0.74) }],
    [6, { bud: 1, crouch: 2.4, tuck: 1, blink: 1, roll: 0.14, ...size(0.88, 0.74) }, 'io'],
    [10, { bud: 1, crouch: 2.4, tuck: 1, blink: 1, roll: -0.14, ...size(0.88, 0.74) }, 'io'],
    [14, { bud: 1, crouch: 2.6, tuck: 1, blink: 1, ...size(0.94, 0.66) }, 'i'],
    [18, { puff: 1.4, fluff: 1, lift: 3, ears: 1, mouth: 0.8, browUp: 1, ...size(0.94, 1.1) }, 'o'],
    [26, { crouch: 1, puff: 1, ears: 0.6, ...size(1.08, 0.92) }, 'i'],
    [30, { puff: 0.8, ears: 0.6, blink: 1 }, 'b'],
    [33, { puff: 0.8, headRoll: 0.3, blink: 1, fluff: 0.5 }, 'o'],
    [36, { puff: 0.7, headRoll: -0.3, blink: 1, fluff: 0.5 }, 'o'],
    [39, { puff: 0.5, headRoll: 0.15 }, 'o'],
    [44, { headYaw: -0.5, lookX: -0.6, ears: 0.7 }, 'io'],
    [50, { headYaw: 0.25, joy: 1, blush: 0.6, ears: 0.6 }, 'io'],
    [60, { wind: 0.3 }],
  ],
  // Night falls: a big yawn, it turns round and curls up, the mane closes into a bud.
  sleep_in: [
    [0, { wind: 0.3 }],
    [4, { nod: -0.4, mouth: 1, lid: 0.8, ears: -0.3, stretch: 0.4 }, 'io'],
    [12, { nod: -0.42, mouth: 1, blink: 1, ears: -0.4, stretch: 0.5 }, 'io'],
    [16, { crouch: 1.4, nod: 0.2, lid: 0.7, yaw: 0.5, ears: -0.2 }, 'io'],
    [24, { ...SLEEP, bud: 0.4, yaw: 0.1 }, 'io'],
    [32, { ...SLEEP, bud: 0.95 }, 'io'],
    [36, { ...SLEEP }],
  ],
  // Asleep as a closed bud: the ears twitch, the tail clock nods, it murmurs.
  sleep: [
    [0, { ...SLEEP }],
    [26, { ...SLEEP, earL: -0.5 }, 'o'],
    [28, { ...SLEEP }, 'b'],
    [50, { ...SLEEP, tailWag: 0.5, mouth: 0.2 }, 'io'],
    [60, { ...SLEEP }, 'io'],
    [72, { ...SLEEP }],
  ],
  // Morning: the bud opens, the clock puffs out; a long stretch with a yawn; a shake.
  sleep_out: [
    [0, { ...SLEEP }],
    [4, { ...SLEEP, bud: 0.6, blink: 1 }, 'io'],
    [10, { crouch: 1, bud: 0, puff: 1, nod: -0.1, lid: 0.6, ears: 0.3 }, 'io'],
    [16, { pitch: 0.35, lean: -0.4, crouch: 0.6, nod: -0.35, mouth: 1, blink: 1, ears: -0.2, tailUp: 0.8, ...paw('L', 7.8, -1.6, 0), ...paw('R', 7.6, 1.8, 0) }, 'io'],
    [24, { pitch: 0.35, lean: -0.45, crouch: 0.6, nod: -0.38, mouth: 1, blink: 1, ears: -0.2, tailUp: 0.8, ...paw('L', 7.8, -1.6, 0), ...paw('R', 7.6, 1.8, 0) }, 'io'],
    [27, { headRoll: 0.3, puff: 0.8, fluff: 0.6, blink: 1 }, 'o'],
    [30, { headRoll: -0.3, puff: 0.8, fluff: 0.6, blink: 1 }, 'o'],
    [36, { wind: 0.3 }],
  ],
  // Woken with a start: the bud bursts, every seed on end; it looks left and right, sees nothing, settles.
  wake_startled: [
    [0, { ...SLEEP }],
    [2, { lift: 3, puff: 1.5, fluff: 1.5, ears: 1, browUp: 1, mouth: 0.7, ...size(0.94, 1.08) }, 'o'],
    [5, { crouch: 0.6, puff: 1.4, fluff: 1.3, ears: 1, browUp: 1, mouth: 0.5 }, 'i'],
    [10, { puff: 1.3, fluff: 1.2, headYaw: -0.7, lookX: -0.8, ears: 0.9, browUp: 1 }, 'o'],
    [16, { puff: 1.2, fluff: 1.1, headYaw: 0.6, lookX: 0.8, ears: 0.9, browUp: 1 }, 'o'],
    [22, { puff: 0.6, fluff: 0.4, headRoll: -0.25, lid: 0.4, ears: 0.3, blush: 0.6 }, 'io'],
    [28, { wind: 0.3 }],
  ],
  // ДЕТКИ-ПУШИНКИ (see the beats).
  trick: [
    [0, { wind: 0.3 }],
    [4, { puff: 0.4, lid: 0.6, nod: -0.15, stretch: 0.4 }, 'io'],
    [12, { puff: 1, blink: 1, nod: -0.2, stretch: 0.6, ears: 0.3, ...size(1.03) }, 'io'],
    [14, { puff: 1, headRoll: 0.35, blink: 1 }, 'o'],
    [17, { puff: 1, headRoll: -0.35, blink: 1 }, 'o'],
    [20, { puff: 1, headRoll: 0.3, blink: 1 }, 'o'],
    [23, { puff: 0.8, headRoll: -0.2, blink: 1 }, 'o'],
    [26, { bald: 0.6, puff: 0.3, nod: -0.4, stretch: 0.8, lookY: 1, ears: 0.6, mouth: 0.4, browUp: 1 }, 'b'],
    [32, { ...SIT, bald: 0.6, nod: -0.45, stretch: 0.8, lookY: 1, joy: 1, blush: 0.6, ears: 0.6, tailWag: 0.5 }, 'io'],
    [46, { ...SIT, bald: 0.6, nod: -0.45, stretch: 0.8, lookY: 1, joy: 1, blush: 0.6, ears: 0.6, tailWag: -0.5 }, 'io'],
    [49, { ...SIT, bald: 0.6, nod: -0.3, headYaw: -0.6, lookX: -0.8, lookY: 0.6, ears: -0.6, wind: 1, mouth: 1, browUp: 1 }, 'o'],
    [52, { bald: 0.6, yaw: 2.2, headYaw: -0.3, dx: -2, ears: -0.3, wind: 0.8, mouth: 0.6, ...patter(0) }, 'o'],
    [55, { bald: 0.6, yaw: 2.4, dx: -9, lift: 1, ears: -0.3, wind: 0.7, ...patter(1) }, 'l'],
    [58, { bald: 0.6, yaw: 2.4, dx: -16, ears: -0.3, wind: 0.6, ...patter(2) }, 'l'],
    [61, { bald: 0.6, yaw: 2.4, dx: -22, lift: 1, ...patter(3) }, 'l'],
    [64, { bald: 0.6, yaw: 2.3, dx: -26, crouch: 1.2, ...size(1.05, 0.95) }, 'i'],
    [69, { bald: 0.6, yaw: 2.0, dx: -31, lift: 6, rear: 0.9, ...paw('L', 4, -1, 12), ...paw('R', 4, 1, 12), mouth: 1, ears: 0.8, ...size(0.95, 1.08) }, 'o'],
    [72, { bald: 0.6, yaw: 2.0, dx: -33, lift: 5.5, rear: 0.9, ...paw('L', 4, -1, 12), ...paw('R', 4, 1, 12), mouth: 0.4, ears: 0.8 }, 'io'],
    [76, { bald: 0.6, yaw: 1.6, dx: CHASE, crouch: 1.4, ears: -0.2, ...size(1.1, 0.9) }, 'i'],
    [80, { ...SIT, bald: 0.6, yaw: 1.0, dx: CHASE, headYaw: -0.6, nod: -0.3, lookY: 0.8, lookX: -0.6, ears: -0.9, browUp: 1 }, 'b'],
    [92, { ...SIT, bald: 0.6, yaw: 1.0, dx: CHASE, headYaw: -0.4, nod: 0.25, ears: -1, lid: 0.5, tailUp: -0.6 }, 'io'],
    [95, { ...SIT, bald: 0.6, yaw: 0.8, dx: CHASE, headYaw: 0.2, nod: 0.5, lookY: -1, ears: 0.1, earSpread: 0.7, browUp: 1, mouth: 0.3 }, 'o'],
    [104, { ...SIT, bald: 0.6, yaw: 0.8, dx: CHASE, nod: 0.55, lookY: -1, ears: 0.1, earSpread: 0.7, browUp: 1 }, 'io'],
    [107, { bald: 0.6, yaw: 0.8, dx: CHASE, crouch: 0.8, nod: 0.6, stretch: 0.6, lookY: -1, ears: 0.1, earSpread: 0.7, mouth: 0.2 }, 'o'],
    [110, { bald: 0.5, yaw: 0.8, dx: CHASE, nod: -0.3, lookY: 0.6, ears: 0.8, browUp: 1, mouth: 0.6 }, 'o'],
    [122, { bald: 0, puff: 1.2, yaw: 0.6, dx: CHASE, nod: -0.2, joy: 1, blush: 1, ears: 0.8, fluff: 1 }, 'io'],
    [126, { puff: 0.8, yaw: 0.3, dx: -24, lift: 6, joy: 1, blush: 1, ears: 0.9, tailUp: 0.6, ...size(0.95, 1.06) }, 'o'],
    [130, { puff: 0.6, yaw: 0.1, dx: -12, crouch: 0.8, joy: 1, ...size(1.06, 0.94) }, 'i'],
    [134, { puff: 0.5, dx: -4, lift: 4, joy: 1, blush: 1, ears: 0.6 }, 'o'],
    [138, { puff: 0.3, crouch: 0.6, joy: 1, ...size(1.04, 0.96) }, 'i'],
    [144, { wind: 0.3 }],
  ],
  // ПАРАШЮТИК (see the beats). The body goes over the frame: this clip is in `overClips`.
  trick_b: [
    [0, { wind: 0.3 }],
    [6, { wind: 0.8, lean: -0.6, crouch: 0.5, ears: -0.4, headYaw: -0.3, lid: 0.4, browUp: 0.5 }, 'io'],
    [14, { wind: 1, lean: -0.8, crouch: 0.6, ears: -0.6, headYaw: -0.3, lid: 0.5, tailWag: 0.6 }, 'io'],
    // The mane rises over the head and opens into the parachute; ears up, eyes wide.
    [22, { wind: 1, chute: 1, crouch: 0.3, ears: 1, mouth: 0.6, browUp: 1, lookY: 0.8, ...size(0.97, 1.04) }, 'o'],
    [26, { wind: 1, chute: 1, lift: 3, ears: 1, mouth: 0.8, browUp: 1, lookY: 0.6, overAll: 1, ...size(0.96, 1.06) }, 'o'],
    [38, { wind: 1, chute: 1, lift: 7.5, dx: 8, roll: 0.15, ears: 0.9, mouth: 0.6, browUp: 1, lookY: -0.6, overAll: 1 }, 'io'],
    [50, { wind: 1, chute: 1, lift: 10, dx: 18, roll: -0.18, joy: 1, blush: 0.6, mouth: 0.8, ears: 1, tailWag: 0.8, overAll: 1 }, 'io'],
    [62, { wind: 0.7, chute: 1, lift: 10, dx: 12, roll: 0.16, joy: 1, blush: 0.6, mouth: 0.8, ears: 1, tailWag: -0.8, overAll: 1 }, 'io'],
    // The wind drops: it hangs for a moment, looks down, then sways down like a seed.
    [68, { wind: 0, chute: 1, lift: 9.8, dx: 8, ears: 0.4, lookY: -1, nod: 0.3, browUp: 1, mouth: 0.3, overAll: 1 }, 'io'],
    [78, { wind: 0, chute: 1, lift: 7.6, dx: 4, roll: 0.14, ears: 0.6, lookY: -0.8, nod: 0.25, overAll: 1 }, 'io'],
    [88, { wind: 0, chute: 1, lift: 4.2, dx: 1, roll: -0.14, ears: 0.6, lookY: -0.6, nod: 0.2, lid: 0.3, overAll: 1 }, 'io'],
    [98, { wind: 0, chute: 1, lift: 0.8, roll: 0.06, ears: 0.6, lookY: -0.4, lid: 0.3, overAll: 1 }, 'io'],
    // Touchdown on tiptoe, the parachute folds back behind the head with a little shake, a proud bow.
    [100, { chute: 0.4, crouch: 0.4, ears: 0.5, ...size(1.03, 0.97) }, 'i'],
    [102, { chute: 0, crouch: 0.2, puff: 1, fluff: 0.6, ears: 0.6, blink: 1 }, 'o'],
    [106, { rear: 0.25, joy: 1, blush: 0.6, ears: 0.8, nod: -0.2, tailUp: 0.6, puff: 0.6 }, 'o'],
    [116, { rear: 0.2, joy: 1, blush: 0.6, ears: 0.8, nod: -0.15 }, 'io'],
    [120, { wind: 0.3 }],
  ],
  // ЦВЕТЁТ (see the beats).
  trick_c: [
    [0, { wind: 0.3 }],
    [8, { nod: -0.45, stretch: 0.6, lookY: 1, lid: 0.7, ears: 0.4 }, 'io'],
    [18, { nod: -0.5, stretch: 0.7, blink: 1, ears: 0.5, blush: 0.4 }, 'io'],
    [30, { bloom: 1, nod: -0.4, stretch: 0.7, joy: 1, blush: 0.8, ears: 0.7, puff: 0.6 }, 'io'],
    [32, { bloom: 1, nod: -0.4, stretch: 0.7, joy: 1, blush: 0.8, ears: 0.8, puff: 0.9, ...size(1.04) }, 'o'],
    [46, { bloom: 1, nod: -0.3, stretch: 0.5, joy: 1, blush: 0.8, ears: 0.6, sway: 0.2, roll: 0.05 }, 'io'],
    [52, { bloom: 1, nod: -0.1, headYaw: -0.4, lookX: -0.8, lookY: 0.4, ears: 0.7, browUp: 1 }, 'o'],
    [60, { bloom: 1, nod: -0.25, headYaw: 0.3, lookX: 0.8, lookY: 0.8, ears: 0.7, browUp: 1 }, 'io'],
    [66, { bloom: 1, nod: 0.1, cross: 1, ears: 0.9, browUp: 1, mouth: 0.2 }, 'o'],
    [82, { bloom: 1, nod: 0.12, cross: 1, ears: 0.9, browUp: 1, mouth: 0.2, lid: 0.2 }, 'io'],
    [85, { bloom: 1, nod: -0.25, lid: 0.8, mouth: 0.4, puff: 0.8, ears: 0.6, ...size(0.98, 1.04) }, 'i'],
    [88, { bloom: 0.6, nod: 0.45, blink: 1, mouth: 1, puff: 1.2, ears: -0.4, lean: 0.6, ...size(1.06, 0.94) }, 'o'],
    [96, { nod: 0.1, mouth: 0.2, lid: 0.6, ears: 0.2, puff: 0.6 }, 'io'],
    [100, { ...SIT, ...RUB_MOUTH, joy: 1, blush: 1, nod: 0.15 }, 'o'],
    [106, { ...SIT, ...RUB_CHEEK, joy: 1, blush: 1, nod: 0.1, headRoll: 0.15 }, 'io'],
    [112, { ...SIT, joy: 1, blush: 0.8, headRoll: -0.15, mouth: 0.5 }, 'io'],
    [120, { wind: 0.3 }],
  ],
  // ЖЕЛАНИЕ (see the beats).
  trick_d: [
    [0, { wind: 0.3 }],
    [10, { ...WISH }, 'io'],
    [16, { ...WISH }, 'io'],
    [20, { ...WISH, blink: 1, blush: 0.6, ears: 0.3, nod: 0.05 }, 'io'],
    [30, { ...WISH, blink: 1, blush: 0.6, ears: 0.3, nod: 0.1, puff: 0.3 }, 'io'],
    [33, { ...WISH, lid: 0.4, puff: 0.8, nod: -0.05, ...size(1.04, 1.02) }, 'i'],
    [36, { ...WISH, lid: 0.6, mouth: 0.6, puff: 0.2, nod: 0.2, lean: 0.4, tailBald: 0.3 }, 'o'],
    [48, { ...WISH, lid: 0.6, mouth: 0.5, nod: 0.2, lean: 0.3, tailBald: 1 }, 'io'],
    [52, { ...SIT, tailBald: 1, nod: -0.5, stretch: 0.6, lookY: 1, browUp: 1, ears: 0.8, mouth: 0.3 }, 'o'],
    [78, { ...SIT, tailBald: 1, nod: -0.5, stretch: 0.6, lookY: 1, joy: 1, blush: 1, ears: 0.8, tailWag: 0.6 }, 'io'],
    [82, { ...SIT, tailBald: 1, nod: -0.5, stretch: 0.7, lookY: 1, browUp: 1, ears: 1, mouth: 0.6, ...size(0.97, 1.03) }, 'o'],
    [92, { tailBald: 1, nod: -0.1, lookY: -0.2, joy: 1, ears: 0.6 }, 'io'],
    [100, { tailUp: 0.6, joy: 1, blush: 0.8, ears: 0.7, ...size(1.03) }, 'b'],
    [110, { joy: 1, blush: 0.6, ears: 0.6, tailWag: 0.5 }, 'io'],
    [120, { wind: 0.3 }],
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
