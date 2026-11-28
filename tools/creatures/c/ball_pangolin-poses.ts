// Pose book of Клубок. Times are frames at 24 fps. Paw and foot goals are rig units in the pangolin's floor frame
// (forward, right, up). Each key may name the easing INTO it: 'io' smoothstep (default), 'o' fast start / soft stop
// (snaps, throws), 'i' slow start / hard stop (falls, impacts), 'b' fast with a small overshoot (springy arrivals),
// 'l' linear, 's' step (holds, then jumps at the key). Fast moves take 1–4 frames, holds 6–10.
import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';
import { SWITCHES } from './ball_pangolin-skin';

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

/** Paw goal in the floor frame (forward, right, up) with how far the claws open. */
export const paw = (name: 'L' | 'R', f: number, r: number, u: number) => reach('paw' + name, [f, r, u]);
const R = (f: number, r: number, u: number, open = 0) => ({ ...paw('R', f, r, u), pawROpen: open });
const L = (f: number, r: number, u: number, open = 0) => ({ ...paw('L', f, r, u), pawLOpen: open });
/** Painted size relative to natural (the skin reads sx / sy as offsets from 1). */
const size = (x: number, y = x) => ({ sx: x - 1, sy: y - 1 });
const TAU = Math.PI * 2;
/** Both paws thrown up, claws spread: the «ta-da». */
const tada = { ...R(7, 8.5, 33, 1), ...L(6.5, -8, 32.5, 1) };
/** Stretch: paws high over the head. */
const stretch = { ...R(4.5, 5, 36, 1), ...L(4, -5, 35.5, 1) };

/** Effect beats shared with the painter of effects. */
export const beats = {
  // Колобок: curls, winds up rolling left, shoots right, bonks the stone, flies back over the frame, lands, bounces,
  // rolls to a stop, hops and opens in the air into a «ta-da», hops back and bows.
  trick: { curl: 12, launch: 23, bonk: 31, land: 55, bounce: 64, open: 83, tada: 89, bow: 106 },
  // Термиты: sniffs, leans to the line of termites, three tongue zips, munches, a termite on the nose, sneeze that
  // blows it into a back somersault with its scales up like a pine cone, sits up, pats its belly, hops back.
  trick_b: { sniff: 2, zip1: 18, zip2: 28, zip3: 38, munch: 47, nose: 58, sneeze: 70, sit: 84, pat: 93 },
  fidget_a: { lick: 9, scrape: 24, shine: 38 },
  fidget_b: { rub: 9, bliss: 34, shiver: 38 },
  hatch: { rumble: 2, pop: 11, land: 18, open: 33, shake: 38 },
  happy: { jump: 6, open: 18, land: 20 },
  wake_startled: { jolt: 2, hide: 10 },
};

/** Rubbing the back with the tail tip: `n` strokes of 2 frames from `start`, a dog-like kick of the right foot. */
function rub(start: number, n: number, base: JointPose): Key[] {
  const keys: Key[] = [];
  for (let i = 0; i < n; i++) keys.push([start + i * 2, { ...base, tailWag: i % 2 ? -0.55 : 0.55, tapR: i % 2 ? 0 : 1 }, 'o']);
  return keys;
}
const lean = { bend: 0.55, lean: 1.5, crouch: 1.5, nod: 0.35, headYaw: 0.1, tailUp: 0.8 };
const lick = { ...R(12.5, 2, 27.5), pawRPitch: -0.9, pawROpen: 0.6, nod: 0.3, headYaw: 0.05 };
const together = { ...R(12, 1.2, 24), ...L(12, -1.2, 23.5), pawsOpen: 0.4, nod: 0.2, headYaw: 0.15 };
const show = { ...R(10.5, 5.5, 27.5, 1), ...L(10, -5, 27, 1), pawPitch: -0.9, bend: -0.2, headRoll: 0.3, headYaw: 0.35 };
const scratch = { tailUp: 4.4, lid: 0.8, nod: -0.25, headRoll: 0.2, flare: 0.15 };

export const tracks: Record<string, Track> = {
  // Alive at rest: a little head tilt, two sniffs, a tongue flick, a cute tilt the other way, the tail swishes with a
  // ripple of scales, a foot taps twice.
  idle: [
    [0, {}],
    [5, { headYaw: 0.15, headRoll: 0.14 }, 'b'],
    [9, { headYaw: 0.15, headRoll: 0.14, nod: -0.14 }, 'o'],
    [11, { headYaw: 0.15, headRoll: 0.14, nod: 0.06 }, 'o'],
    [13, { headYaw: 0.15, headRoll: 0.14, nod: -0.14 }, 'o'],
    [15, { headYaw: 0.15, headRoll: 0.14 }, 'o'],
    [20, { headYaw: 0.15, headRoll: 0.12 }],
    [22, { headYaw: 0.1, tongue: 7, tongueAim: 0.25, tongueWiggle: 0.6 }, 'o'],
    [24, { headYaw: 0.1, tongue: 8, tongueAim: 0.3, tongueWiggle: 0.7 }],
    [26, { headYaw: 0.1 }, 'i'],
    [30, { headRoll: -0.36, headYaw: 0.2 }, 'b'],
    [40, { headRoll: -0.33, headYaw: 0.2 }],
    [43, { tailWag: 1, flare: 0.35 }, 'o'],
    [46, { tailWag: -0.9, flare: 0.1 }, 'o'],
    [49, { tailWag: 0.7, flare: 0.3 }, 'o'],
    [52, { tailWag: -0.35 }, 'o'],
    [55, {}],
    [58, { tapR: 1 }, 'o'],
    [60, {}, 'i'],
    [62, { tapR: 1 }, 'o'],
    [64, {}, 'i'],
    [72, {}],
  ],
  // On tiptoes: snaps the head away, holds, snaps to the other side with a body twist, back to the owner with a tilt
  // and a blink.
  look: [
    [0, {}],
    [3, { lift: 1.5, bend: -0.25, headYaw: -0.95, nod: -0.15, tailWag: -0.4 }, 'o'],
    [10, { lift: 1.5, bend: -0.25, headYaw: -0.9, nod: -0.1, tailWag: -0.3 }],
    [12, { lift: 1.8, bend: -0.25, headYaw: 0.95, nod: -0.1, twist: 0.25, tailWag: 0.6 }, 'o'],
    [19, { lift: 1.8, bend: -0.25, headYaw: 0.9, twist: 0.2, tailWag: 0.4 }],
    [22, { headYaw: 0.25, headRoll: 0.42, blink: 1 }, 'b'],
    [24, { headYaw: 0.25, headRoll: 0.42 }],
    [30, { headYaw: 0.2, headRoll: 0.36 }],
    [36, {}],
  ],
  // Cleans its claws: paw to the mouth, three licks, scrapes the claws together three times, holds them out proudly.
  fidget_a: [
    [0, {}],
    [5, lick, 'o'],
    [8, lick],
    [9, { ...lick, tongue: 5, tongueAim: -0.4, tongueWiggle: 0.5 }, 'o'],
    [11, lick, 'i'],
    [13, { ...lick, tongue: 6, tongueAim: -0.5, tongueWiggle: 0.6 }, 'o'],
    [15, lick, 'i'],
    [17, { ...lick, tongue: 5, tongueAim: -0.4, tongueWiggle: 0.5 }, 'o'],
    [19, lick, 'i'],
    [22, together, 'o'],
    [24, { ...together, ...R(12.5, -1.6, 25.2) }, 'o'],
    [26, { ...together, ...R(11.5, 1.8, 23.4) }, 'o'],
    [28, { ...together, ...R(12.5, -1.6, 25.2) }, 'o'],
    [30, { ...together, ...R(11.5, 1.8, 23.4) }, 'o'],
    [32, { ...together, ...R(12.5, -1.6, 25.2) }, 'o'],
    [34, { ...together, ...R(11.5, 1.8, 23.4) }, 'o'],
    [37, show, 'b'],
    [44, show],
    [48, {}],
  ],
  // Scratches its back with the tail: the tail curls up over the back and rubs, eyes close in bliss, a foot kicks
  // like a dog's, a happy shiver of the scales.
  fidget_b: [
    [0, {}],
    [6, { tailUp: 4.2, bend: 0.1 }, 'o'],
    [8, { ...scratch, lid: 0.4 }, 'o'],
    ...rub(9, 12, scratch),
    [33, { ...scratch, lid: 0.9, headRoll: 0.32 }, 'io'],
    [36, { ...scratch, lid: 0.9, headRoll: 0.32 }],
    [38, { tailUp: 2, flare: 0.7, lid: 0.3 }, 'o'],
    [40, { tailUp: 1, flare: 0.1 }, 'o'],
    [42, { flare: 0.4 }, 'o'],
    [44, {}, 'io'],
    [48, {}],
  ],
  // «Шишка»: squat, jump, roll up in the air with the scales up like a pine cone, a full turn, pop open, land and
  // throw the paws up, shimmy.
  happy: [
    [0, {}],
    [3, { crouch: 2.5, bend: 0.3, pawsOpen: 0.3, ...size(1.1, 0.88) }, 'o'],
    [6, { lift: 9, curl: 0.7, flare: 0.4, ...size(0.94, 1.08) }, 'o'],
    [9, { lift: 15, curl: 1, flare: 1, spin: 2.1 }, 'l'],
    [12, { lift: 16, curl: 1, flare: 1, spin: 4.2 }, 'l'],
    [15, { lift: 11, curl: 1, flare: 0.8, spin: TAU }, 'l'],
    [18, { lift: 4, curl: 0.15, flare: 0.5, spin: TAU, pawsOpen: 1 }, 'o'],
    [20, { crouch: 2, flare: 0.4, ...tada, spin: TAU, ...size(1.12, 0.86) }, 'i'],
    [23, { lift: 1, ...tada, headRoll: 0.3, tailUp: 1.5, ...size(0.97, 1.04) }, 'o'],
    [26, { ...tada, headRoll: 0.3, tailUp: 1.5, sway: 1, flare: 0.4 }, 'o'],
    [29, { ...tada, headRoll: -0.3, tailUp: 1.5, sway: -1, flare: 0.1 }, 'o'],
    [32, { ...tada, headRoll: 0.3, tailUp: 1.5, sway: 0.8, flare: 0.35 }, 'o'],
    [35, { ...tada, headRoll: 0.1, tailUp: 1, flare: 0 }, 'o'],
    [42, {}],
  ],
  // Rolls out of its burrow: the ground trembles, the ball pops out, lands, rolls away and back, opens in the air,
  // lands and shakes off the dust with its scales up.
  hatch: [
    [0, { hidden: 1 }],
    [10, { hidden: 1 }],
    [11, { curl: 1, lift: 2, dy: 6, flare: 0.6, ...size(0.9, 1.15) }, 'o'],
    [14, { curl: 1, lift: 12, flare: 0.8, spin: 1.6 }, 'o'],
    [18, { curl: 1, lift: 0, spin: 3.0, ...size(1.12, 0.88) }, 'i'],
    [21, { curl: 1, lift: 3, dx: 6, spin: 3.4 }, 'o'],
    [24, { curl: 1, dx: 10, spin: 3.75, ...size(1.06, 0.94) }, 'i'],
    [28, { curl: 1, dx: 4, spin: 3.4 }, 'io'],
    [30, { curl: 1, dx: 2, spin: 3.3 }],
    [33, { curl: 0, lift: 5, dx: 2, spin: TAU, pawsOpen: 1, flare: 0.5 }, 'o'],
    [36, { crouch: 2, dx: 2, flare: 0.3, spin: TAU, ...size(1.1, 0.9) }, 'i'],
    [38, { roll: 0.25, flare: 0.9, dx: 2, tailWag: 0.8 }, 'o'],
    [40, { roll: -0.25, flare: 0.3, dx: 2, tailWag: -0.8 }, 'o'],
    [42, { roll: 0.2, flare: 0.8, dx: 1, tailWag: 0.6 }, 'o'],
    [44, { roll: 0, flare: 0, blink: 1, tailWag: 0 }, 'o'],
    [48, {}],
  ],
  // A big yawn with a stretch, the lids grow heavy, rolls up into a ball and settles.
  sleep_in: [
    [0, {}],
    [5, { bend: -0.35, nod: -0.5, ...stretch, tongue: 2.5, tongueDroop: 1, lid: 0.6, lift: 1 }, 'io'],
    [12, { bend: -0.35, nod: -0.5, ...stretch, tongue: 3, tongueDroop: 1, lid: 0.7, lift: 1 }],
    [15, { nod: 0.1, lid: 0.75 }, 'io'],
    [18, { curl: 0.45, lid: 1 }, 'o'],
    [22, { curl: 1, ...size(1.08, 0.92) }, 'o'],
    [25, { curl: 1, ...size(0.98, 1.02) }, 'io'],
    [30, { curl: 1 }],
  ],
  // Asleep in a ball: the shell breathes, the tail tip twitches once.
  sleep: [
    [0, { curl: 1 }],
    [30, { curl: 1 }],
    [33, { curl: 1, tailOpen: 0.12 }, 'o'],
    [37, { curl: 1 }, 'io'],
    [72, { curl: 1 }],
  ],
  // The ball rocks, the head peeks out sleepily and blinks, pops open, lands and stretches.
  sleep_out: [
    [0, { curl: 1 }],
    [3, { curl: 1, roll: 0.15 }, 'o'],
    [6, { curl: 1, roll: -0.15 }, 'o'],
    [8, { curl: 1 }],
    [11, { curl: 1, peek: 1, blink: 1 }, 'o'],
    [14, { curl: 1, peek: 1 }],
    [16, { curl: 1, peek: 1, blink: 1 }],
    [17, { curl: 1, peek: 1 }],
    [20, { lift: 4, flare: 0.4, pawsOpen: 1 }, 'b'],
    [23, { crouch: 1.5, ...size(1.06, 0.95) }, 'i'],
    [26, { ...stretch, bend: -0.2 }, 'o'],
    [30, {}],
  ],
  // A jolt: scales up, pops open in the air with its paws up, lands, rolls up again at once, peeks, comes out.
  wake_startled: [
    [0, { curl: 1 }],
    [2, { curl: 1, flare: 1.2, lift: 3, ...size(1.05, 1.05) }, 'o'],
    [5, { lift: 9, flare: 0.8, ...tada, headYaw: 0.4 }, 'o'],
    [8, { curl: 0.2, crouch: 1, flare: 0.5 }, 'i'],
    [10, { curl: 1, flare: 0.6, ...size(1.08, 0.92) }, 'o'],
    [13, { curl: 1, peek: 1, flare: 0.3 }, 'o'],
    [16, { curl: 1, peek: 1, blink: 1 }],
    [17, { curl: 1, peek: 1 }],
    [20, { lift: 2 }, 'b'],
    [24, {}],
  ],
  // «Колобок».
  trick: [
    [0, {}],
    [4, { headYaw: -0.7, nod: -0.1 }, 'o'],
    [8, { headYaw: 0.75, bend: 0.25, crouch: 1, flare: 0.4 }, 'o'],
    [10, { headYaw: 0.75, bend: 0.3, crouch: 1.5, flare: 0.6, tailWag: 0.8 }, 'o'],
    [12, { headYaw: 0.75, bend: 0.3, crouch: 1.5, flare: 0.6, tailWag: -0.8 }, 'o'],
    [15, { curl: 1, ...size(1.08, 0.92) }, 'o'],
    [21, { curl: 1, dx: -16, spin: -0.63 }, 'io'],
    [23, { curl: 1, dx: -17, spin: -0.67, ...size(0.95, 1.04) }],
    [27, { curl: 1, dx: 4, spin: 0.16, ...size(1.06, 0.95) }, 'i'],
    [31, { curl: 1, dx: 25, spin: 0.98 }, 'l'],
    [32, { curl: 1, dx: 23, spin: 0.95, flare: 0.8, ...size(0.84, 1.14) }, 'o'],
    [36, { curl: 1, dx: 16, lift: 20, spin: 0.1, flare: 0.5, overAll: 1, noShadow: 1 }, 'o'],
    [41, { curl: 1, dx: 6, lift: 30, spin: -1.3, flare: 0.3, overAll: 1, noShadow: 1 }, 'l'],
    [46, { curl: 1, dx: -8, lift: 28, spin: -2.8, overAll: 1, noShadow: 1 }, 'l'],
    [51, { curl: 1, dx: -20, lift: 16, spin: -4.3, overAll: 1, noShadow: 1 }, 'l'],
    [55, { curl: 1, dx: -27, spin: -5.4 }, 'i'],
    [56, { curl: 1, dx: -28, spin: -5.45, ...size(1.16, 0.84) }],
    [60, { curl: 1, dx: -32, lift: 7, spin: -5.8 }, 'o'],
    [64, { curl: 1, dx: -35, spin: -6.0 }, 'i'],
    [65, { curl: 1, dx: -35, spin: -6.0, ...size(1.08, 0.93) }],
    [67, { curl: 1, dx: -33, spin: -5.85 }, 'o'],
    [69, { curl: 1, dx: -38, spin: -6.4, roll: 0.12 }, 'o'],
    [71, { curl: 1, dx: -34, spin: -6.0, roll: -0.1 }, 'o'],
    [73, { curl: 1, dx: -37.5, spin: -6.35, roll: 0.06 }, 'o'],
    [76, { curl: 1, dx: -37, spin: -TAU }, 'io'],
    [79, { curl: 1, dx: -36, spin: -TAU, ...size(1.08, 0.92) }, 'o'],
    [83, { curl: 0.3, dx: -34, lift: 12, spin: -TAU, flare: 0.6, pawsOpen: 1 }, 'o'],
    [85, { dx: -33, lift: 12, spin: -TAU, ...tada, flare: 0.9, headYaw: 0.5, tailUp: 1.5 }, 'b'],
    [89, { dx: -32, crouch: 2, spin: -TAU, ...tada, flare: 0.4, ...size(1.1, 0.9) }, 'i'],
    [92, { dx: -32, ...tada, headRoll: 0.3, flare: 0.2 }, 'o'],
    [95, { dx: -22, lift: 4 }, 'o'],
    [97, { dx: -16, ...size(1.06, 0.95) }, 'i'],
    [100, { dx: -8, lift: 4 }, 'o'],
    [102, { dx: -3, ...size(1.06, 0.95) }, 'i'],
    [106, { bend: 0.45, nod: 0.45, headYaw: 0.2 }, 'io'],
    [111, { bend: 0.45, nod: 0.45, headYaw: 0.2 }],
    [116, {}],
    [120, {}],
  ],
  // «Термиты».
  trick_b: [
    [0, {}],
    [3, { nod: -0.15, headYaw: 0.5 }, 'o'],
    [5, { nod: 0.05, headYaw: 0.5 }, 'o'],
    [7, { nod: -0.15, headYaw: 0.6 }, 'o'],
    [9, { nod: 0.1, headYaw: 0.6 }, 'o'],
    [13, lean, 'o'],
    [16, lean],
    [18, { ...lean, tongue: 15, tongueAim: 0.1, tongueWiggle: 0.3 }, 'o'],
    [20, { ...lean, tongue: 14.5, tongueAim: 0.12, tongueWiggle: 0.8 }],
    [23, lean, 'i'],
    [26, { ...lean, nod: 0.3 }],
    [28, { ...lean, tongue: 13, tongueAim: 0.35, tongueWiggle: 0.5 }, 'o'],
    [30, { ...lean, tongue: 12.5, tongueAim: 0.38, tongueWiggle: 1 }],
    [33, lean, 'i'],
    [36, lean],
    [38, { ...lean, tongue: 20, tongueAim: -0.3, tongueWiggle: 0.8 }, 'o'],
    [41, { ...lean, tongue: 19.5, tongueAim: -0.28, tongueWiggle: 1.1 }],
    [45, lean, 'i'],
    [47, { bend: 0.1, nod: -0.2, lid: 0.7, headRoll: 0.25, tailWag: 0.8, ...size(0.97, 1.04) }, 'o'],
    [49, { nod: 0.16, lid: 0.7, headRoll: 0.25, tailWag: -0.8, ...size(1.04, 0.96) }, 'o'],
    [51, { nod: -0.2, lid: 0.7, headRoll: 0.25, tailWag: 0.8, ...size(0.97, 1.04) }, 'o'],
    [53, { nod: 0.16, lid: 0.7, headRoll: 0.25, tailWag: -0.8, ...size(1.04, 0.96) }, 'o'],
    [55, { nod: -0.2, lid: 0.7, headRoll: 0.25, tailWag: 0.6, ...size(0.98, 1.03) }, 'o'],
    [57, { headYaw: 0.35, headRoll: -0.1 }, 'b'],
    [60, { nod: -0.3, headYaw: 0.05, lid: 0.35 }, 'o'],
    [62, { nod: -0.15, headYaw: 0.05, lid: 0.2 }, 'o'],
    [64, { nod: -0.45, bend: -0.2, lid: 0.7, flare: 0.2, lift: 0.8 }, 'o'],
    [65, { nod: -0.35, bend: -0.15, lid: 0.6, flare: 0.1, lift: 0.6 }],
    [69, { nod: -0.75, bend: -0.4, lid: 1, flare: 0.35, lift: 1.8, ...size(0.97, 1.04) }, 'i'],
    [71, { nod: 0.55, bend: 0.4, flare: 1.0, lid: 1, dx: -4, ...size(0.92, 1.1) }, 'o'],
    [74, { curl: 0.95, flare: 0.7, dx: -10, lift: 6, spin: -1.8 }, 'o'],
    [78, { curl: 0.95, flare: 0.6, dx: -14, lift: 3, spin: -3.6 }, 'l'],
    [81, { curl: 0.1, flare: 0.5, dx: -15, lift: 2, spin: -5.2 }, 'o'],
    [84, { flare: 0.8, dx: -15, spin: -TAU, crouch: 1.5, ...size(1.08, 0.93) }, 'i'],
    [86, { flare: 0.3, dx: -15 }, 'o'],
    [88, { flare: 0.7, dx: -15 }, 'o'],
    [90, { flare: 0.1, dx: -15, blink: 1 }, 'o'],
    [93, { dx: -15, headYaw: 0.5, headRoll: -0.3, ...R(11, 2.5, 20) }, 'io'],
    [95, { dx: -15, headYaw: 0.5, headRoll: -0.3, ...R(9.2, 2.5, 19.5) }, 'o'],
    [97, { dx: -15, headYaw: 0.5, headRoll: -0.3, ...R(11, 2.5, 20) }, 'o'],
    [99, { dx: -15, headYaw: 0.5, headRoll: -0.3, ...R(9.2, 2.5, 19.5) }, 'o'],
    [101, { dx: -8, lift: 4 }, 'o'],
    [103, { dx: -4 }, 'i'],
    [105, { dx: -1, lift: 2 }, 'o'],
    [107, {}, 'i'],
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
    else if (name === 'spin') {
      // A roll takes the short way round: a ball that ends a full turn ahead is back at rest.
      const to = b[name] ?? 0,
        from = to + ((((a[name] ?? 0) - to + Math.PI) % TAU) + TAU) % TAU - Math.PI;
      pose[name] = from * (1 - u) + to * u;
    } else pose[name] = (a[name] ?? 0) * (1 - u) + (b[name] ?? 0) * u;
  }
  return pose;
}
export const helpers = { R, L, size };
