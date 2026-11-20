// Pose book of Огонёк. Times are frames at 24 fps. Foot goals are rig units in the owlet's floor frame (forward,
// right, up). Each key may name the easing INTO it: 'io' smoothstep (default), 'o' fast start / soft stop (snaps,
// throws), 'i' slow start / hard stop (falls, impacts), 'b' fast with a small overshoot (springy arrivals), 'l' linear,
// 's' step (holds, then jumps at the key; never on the key where `hidden` switches). Fast moves take 1–4 frames,
// holds 6–10.
import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';
import { SWITCHES } from './ember_panda-skin';

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

/** Foot and paw goals in the floor frame (forward, right, up); while it rears, paws are in the arm frame. */
export const goalOf = (name: string, f: number, r: number, u: number) => reach(name, [f, r, u]);
const paw = (side: 'L' | 'R', f: number, r: number, u: number) => reach('paw' + side, [f, r, u]);
/** On its haunches like a cat. */
const SIT: JointPose = { sit: 1 };
/** Asleep: lying curled on the tucked legs, the head sunk, the tail wrapped round. */
export const SLEEP: JointPose = { crouch: 3.3, tuck: 1, tailWrap: 1, nod: 0.6, blink: 1, headRoll: 0.25, fluff: 0.5, headYaw: -0.2 };
/** The red panda's threat display: up on the hind legs, turned to the viewer, arms spread high, claws and mouth open,
 * fur on end. Arms are in the arm frame (forward, right, up from the hips' floor). */
const THREAT: JointPose = { rear: 1.3, yaw: 1.0, headYaw: -0.5, claws: 1, mouth: 1, fluff: 1.1, ears: -0.6, tailUp: 0.7, ...paw('L', 3.4, -6.6, 18.2), ...paw('R', 3.4, 6.6, 18.2) };
/** Arms windmilling while it loses balance: paws on circles beside the shoulders, out of phase. */
const windmill = (a: number): JointPose => ({
  ...paw('L', 3 + 3.2 * Math.cos(a), -6.4, 15.5 + 3.2 * Math.sin(a)),
  ...paw('R', 3 + 3.2 * Math.cos(a + Math.PI), 6.4, 15.5 + 3.2 * Math.sin(a + Math.PI)),
});
/** Paws over the eyes while it sits (embarrassed). */
const hide = { ...paw('L', 5.4, 0.6, 12.8), ...paw('R', 2.4, 4.4, 13.2) };
/** Peeking: the near paw drops below the eye. */
const peek = { ...paw('L', 5.4, 0.6, 12.8), ...paw('R', 3.6, 3.4, 8.6) };
/** Feet pattering in place: one tap per key, round the four feet. */
const PATTER = ['tapLH', 'tapLF', 'tapRH', 'tapRF'];
const patter = (k: number): JointPose => ({ [PATTER[k % 4]]: 1 });

/** Effect beats shared with the painter of effects. */
export const beats = {
  // Страшилка: a maple leaf drifts down onto its nose; a gust flips it and the panda jumps; it rears up in its threat
  // display and hops at the viewer twice, loses balance, windmills, backflips by accident and lands on its bottom;
  // dizzy, it hides its face in its paws, peeks, hides again, smiles shyly, gets up.
  trick: { leaf: 0, nose: 14, gust: 18, jump: 19, threat: 24, hop1: 34, hop2: 40, wobble: 44, fall: 54, flip: 56, thump: 66, dizzy: 68, hide: 78, peek: 88, hideAgain: 93, smile: 100, up: 108 },
  // Хвост-пропеллер: bored, it swishes its tail faster and faster until the tail stands up as a mast and spins like a
  // rotor; amazed, it lifts off over the frame, the torque turns it round, the rotor sputters, a beat in the air, it
  // drops into a pile of leaves, pops out with leaves on its ears and shakes them off.
  trick_b: { swish: 2, mast: 24, spin: 27, lift: 34, takeoff: 40, fly: 50, sputter: 66, hang: 70, fall: 73, pile: 80, pop: 88, shake: 95, done: 102 },
  fidget_a: { sit: 4, lick: 6, wipe: 16, shake: 32 },
  fidget_b: { spot: 2, chase: 11, catch: 30 },
  hatch: { rustle: 0, slip: 6, land: 14, bounce: 17, dizzy: 22, shake: 35 },
  happy: { hop1: 6, hop2: 11, twirl: 18, land: 25, cheer: 27 },
  wake_startled: { jolt: 2, threat: 7 },
  sleep_in: { yawn: 4 },
};

/** Хвост-пропеллер: the leaf pile the tail sweeps up, field pixels left of home (the fx draws it there). */
export const PILE = 46;

const cheer = { rear: 1.2, yaw: 1.0, headYaw: -0.5, joy: 1, mouth: 1, ears: 0.5, tailUp: 0.5, blush: 1 };

export const tracks: Record<string, Track> = {
  // Alive at rest: a curious tilt, an ear flick, a swish of the tail, a sniff of the air with a twitching nose, a blink,
  // a shift of weight and a tap of the paw.
  idle: [
    [0, {}],
    [5, { headRoll: 0.32, headYaw: 0.22, lookX: 0.3 }, 'b'],
    [13, { headRoll: 0.3, headYaw: 0.2, lookX: 0.3 }],
    [15, { headRoll: 0.3, headYaw: 0.2, lookX: 0.3, earL: -0.7 }, 'o'],
    [17, { headRoll: 0.28, headYaw: 0.2, lookX: 0.3, earL: 0.3 }, 'b'],
    [21, {}, 'io'],
    [26, { tailWag: 0.9, sway: 0.15 }, 'o'],
    [30, { tailWag: -0.8, sway: -0.12 }, 'io'],
    [34, { tailWag: 0.5 }, 'io'],
    [38, {}, 'io'],
    [41, { nod: -0.38, stretch: 0.7, lookY: 0.6, ears: 0.4 }, 'b'],
    [43, { nod: -0.3, stretch: 0.7, lookY: 0.6, ears: 0.4 }, 'o'],
    [45, { nod: -0.4, stretch: 0.75, lookY: 0.6, ears: 0.4 }, 'o'],
    [47, { nod: -0.32, stretch: 0.7, lookY: 0.6, ears: 0.4 }, 'o'],
    [51, {}, 'b'],
    [54, { blink: 1 }, 's'],
    [56, { blink: 0 }, 's'],
    [59, { sway: 0.45, lean: -0.3, roll: -0.05 }, 'io'],
    [62, { sway: 0.45, lean: -0.3, roll: -0.05, tapRF: 1 }, 'o'],
    [64, { sway: 0.45, lean: -0.3, roll: -0.05, tapRF: 0 }, 'i'],
    [72, {}],
  ],
  // Something rustles: ears up, the head snaps to one side, then the other, then a tilted curious look at the viewer.
  look: [
    [0, {}],
    [2, { headYaw: -0.95, nod: -0.25, stretch: 0.9, ears: 0.7, tailUp: 0.3, lookX: -0.5 }, 'o'],
    [10, { headYaw: -0.9, nod: -0.22, stretch: 0.9, ears: 0.7, tailUp: 0.3, lookX: -0.5 }],
    [12, { headYaw: 0.95, nod: -0.1, headRoll: 0.2, stretch: 0.8, ears: 0.6, tailUp: 0.3, lookX: 0.5 }, 'o'],
    [17, { headYaw: 0.9, nod: -0.1, headRoll: 0.2, stretch: 0.8, ears: 0.6, tailUp: 0.3, lookX: 0.5 }],
    [18, { headYaw: 0.9, nod: -0.1, headRoll: 0.2, stretch: 0.8, earR: -0.8, tailUp: 0.3, lookX: 0.5 }, 'o'],
    [20, { headYaw: 0.88, nod: -0.1, headRoll: 0.2, stretch: 0.8, earR: 0.4, tailUp: 0.3, lookX: 0.5 }, 'b'],
    [23, { headYaw: -0.1, headRoll: -0.4, nod: 0.05, ears: 0.3, browUp: 1, lookY: 0.2 }, 'b'],
    [31, { headYaw: -0.1, headRoll: -0.38, nod: 0.05, ears: 0.3, browUp: 1, lookY: 0.2 }],
    [36, {}],
  ],
  // Умывается: sits, licks its right paw (the head bobs), wipes the face and the ear twice, shakes its head, gets up.
  fidget_a: [
    [0, {}],
    [4, { ...SIT, tailWrap: 0.4 }, 'b'],
    [6, { ...SIT, tailWrap: 0.4, ...paw('R', 2.4, 3.2, 10.6), nod: 0.3, mouth: 0.5, lid: 0.7 }, 'o'],
    [8, { ...SIT, tailWrap: 0.4, ...paw('R', 2.4, 3.2, 10.9), nod: 0.15, mouth: 0.2, lid: 0.7 }, 'o'],
    [10, { ...SIT, tailWrap: 0.4, ...paw('R', 2.4, 3.2, 10.6), nod: 0.35, mouth: 0.6, lid: 0.7 }, 'o'],
    [12, { ...SIT, tailWrap: 0.4, ...paw('R', 2.4, 3.2, 10.9), nod: 0.15, mouth: 0.2, lid: 0.7 }, 'o'],
    [14, { ...SIT, tailWrap: 0.4, ...paw('R', 2.4, 3.2, 10.6), nod: 0.35, mouth: 0.6, lid: 0.7 }, 'o'],
    [16, { ...SIT, tailWrap: 0.4, ...paw('R', 2.2, 4.2, 12.0), nod: 0.25, headRoll: 0.2, blink: 1 }, 'o'],
    [19, { ...SIT, tailWrap: 0.4, ...paw('R', 1.2, 4.6, 13.8), nod: 0.15, headRoll: 0.38, blink: 1 }, 'o'],
    [22, { ...SIT, tailWrap: 0.4, ...paw('R', 0.2, 3.8, 15.0), nod: 0.25, headRoll: 0.42, earR: -0.7, blink: 1 }, 'o'],
    [24, { ...SIT, tailWrap: 0.4, ...paw('R', 2.2, 4.2, 12.0), nod: 0.25, headRoll: 0.2, earR: 0.2, blink: 1 }, 'o'],
    [27, { ...SIT, tailWrap: 0.4, ...paw('R', 1.2, 4.6, 13.8), nod: 0.15, headRoll: 0.38, blink: 1 }, 'o'],
    [30, { ...SIT, tailWrap: 0.4, ...paw('R', 0.2, 3.8, 15.0), nod: 0.25, headRoll: 0.42, earR: -0.7, blink: 1 }, 'o'],
    [32, { ...SIT, tailWrap: 0.4, headRoll: 0.4, blink: 1, earR: 0 }, 'o'],
    [33.5, { ...SIT, tailWrap: 0.4, headRoll: -0.42, lid: 0.8, fluff: 0.5 }, 'o'],
    [35, { ...SIT, tailWrap: 0.4, headRoll: 0.36, lid: 0.8, fluff: 0.5 }, 'o'],
    [36.5, { ...SIT, tailWrap: 0.4, headRoll: -0.25, lid: 0.8, fluff: 0.3 }, 'o'],
    [38, { ...SIT, tailWrap: 0.4, headRoll: 0 }, 'o'],
    [40, { ...SIT, tailWrap: 0.4, joy: 1, blush: 1 }, 's'],
    [44, { ears: 0.3 }, 'io'],
    [48, {}],
  ],
  // Ловит свой хвост: spots the tail, wiggles its bottom, spins round chasing it (the tail always just ahead), catches
  // it, flops down hugging it and nuzzles it happily, lets go, gets up.
  fidget_b: [
    [0, {}],
    [2, { headYaw: 1.85, stretch: 0.9, nod: 0.1, ears: 0.8, lookX: 0.4, tailWag: 0.5 }, 'o'],
    [5, { headYaw: 1.85, stretch: 0.9, nod: 0.15, crouch: 1.6, pitch: 0.2, sway: 0.6, ears: 0.8, tailWag: 0.8 }, 'o'],
    [6.5, { headYaw: 1.85, stretch: 0.9, nod: 0.15, crouch: 1.6, pitch: 0.2, sway: -0.6, ears: 0.8, tailWag: 0.4 }, 'o'],
    [8, { headYaw: 1.85, stretch: 0.9, nod: 0.15, crouch: 1.6, pitch: 0.2, sway: 0.6, ears: 0.8, tailWag: 0.8 }, 'o'],
    [9.5, { headYaw: 1.85, stretch: 0.9, nod: 0.15, crouch: 1.6, pitch: 0.2, sway: -0.6, ears: 0.8, tailWag: 0.4 }, 'o'],
    [11, { headYaw: 1.9, stretch: 0.9, nod: -0.1, crouch: 0.4, yaw: 0.4, tailWag: 1, mouth: 0.6, ...patter(0) }, 'o'],
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k): Key => [11 + k * 1.6, { headYaw: 1.9, stretch: 0.9, nod: -0.1, crouch: 0.4, yaw: 0.4 + (k * Math.PI) / 4, tailWag: 1, mouth: 0.6, joy: k > 6 ? 1 : 0, ...patter(k) }, 'l']),
    [29, { headYaw: 1.6, crouch: 0.6, yaw: 0.4 + (11 * Math.PI) / 4 - TAU, tailWag: 0.5, joy: 1 }, 'o'],
    [31, { ...SIT, tailWrap: 1, crouch: 0.4, headYaw: 0.5, nod: 0.45, joy: 1, blush: 1, ...size(1.08, 0.92) }, 'i'],
    [34, { ...SIT, tailWrap: 1, headYaw: 0.4, nod: 0.55, headRoll: 0.3, joy: 1, blush: 1 }, 'b'],
    [37, { ...SIT, tailWrap: 1, headYaw: 0.5, nod: 0.45, headRoll: -0.2, joy: 1, blush: 1 }, 'io'],
    [40, { ...SIT, tailWrap: 1, headYaw: 0.4, nod: 0.55, headRoll: 0.3, joy: 1, blush: 1 }, 'io'],
    [44, { tailWag: 0.6, ears: 0.4 }, 'o'],
    [48, {}],
  ],
  // Скачет: the red panda's happy hop — two springy hops from side to side, the body twisting in the air, a big jump
  // with a whole twirl in the air, and a cheer up on the hind legs with the arms waving.
  happy: [
    [0, {}],
    [3, { crouch: 1.8, ears: -0.2, ...size(1.1, 0.9) }, 'o'],
    [6, { lift: 5.5, dx: 9, yaw: 0.6, joy: 1, mouth: 0.7, tailUp: 0.6, ...size(0.94, 1.08) }, 'o'],
    [9, { crouch: 1.2, dx: 9, yaw: 0.2, joy: 1, ...size(1.1, 0.9) }, 'i'],
    [11, { lift: 5.5, dx: -6, yaw: -0.6, joy: 1, mouth: 0.7, tailUp: 0.6, ...size(0.94, 1.08) }, 'o'],
    [14, { crouch: 1.2, dx: -6, yaw: -0.2, joy: 1, ...size(1.1, 0.9) }, 'i'],
    [16, { crouch: 2.4, dx: -2, joy: 1, ears: -0.3, ...size(1.14, 0.86) }, 'o'],
    [18, { lift: 5.5, dx: 0, yaw: Math.PI / 2, joy: 1, mouth: 1, tailUp: 0.8, ...size(0.92, 1.1) }, 'o'],
    [19.5, { lift: 6.5, yaw: Math.PI, joy: 1, mouth: 1, tailUp: 0.6 }, 'l'],
    [21, { lift: 6, yaw: 1.5 * Math.PI, joy: 1, mouth: 1, tailUp: 0.4 }, 'l'],
    [22.5, { lift: 3.5, yaw: 0, joy: 1, mouth: 0.8, tailUp: 0.4 }, 'l'],
    [25, { crouch: 2, joy: 1, ...size(1.16, 0.84) }, 'i'],
    [27, { ...cheer, ...paw('L', 3.2, -6.2, 18.6), ...paw('R', 3.6, 6.6, 16.4) }, 'b'],
    [29, { ...cheer, ...paw('L', 3.6, -6.6, 16.4), ...paw('R', 3.2, 6.2, 18.6) }, 'o'],
    [31, { ...cheer, ...paw('L', 3.2, -6.2, 18.6), ...paw('R', 3.6, 6.6, 16.4) }, 'o'],
    [33, { ...cheer, ...paw('L', 3.6, -6.6, 16.4), ...paw('R', 3.2, 6.2, 18.6) }, 'o'],
    [36, { crouch: 0.8, joy: 1, blush: 0.6, ...size(1.06, 0.94) }, 'i'],
    [42, {}],
  ],
  // Сваливается с бамбука: the stalk overhead rustles, the panda slips off it head over heels, lands flat, bounces,
  // sits up dizzy, shakes itself and perks up.
  hatch: [
    [0, { hidden: 1, dy: -100, spin: Math.PI }],
    [5, { hidden: 1, dy: -100, spin: Math.PI }],
    [6, { dy: -100, spin: Math.PI, claws: 1, mouth: 1, browUp: 1, ears: 1, tailUp: 1.4, ...size(0.94, 1.06) }, 's'],
    [8, { dy: -94, spin: 3.9, claws: 1, mouth: 1, browUp: 1, ears: 1, tailUp: 1.4 }, 'l'],
    [10, { dy: -75, spin: 4.7, claws: 1, mouth: 1, browUp: 1, ears: 1, tailUp: 1.3 }, 'l'],
    [12, { dy: -44, spin: 5.5, claws: 1, mouth: 1, browUp: 1, ears: 1, tailUp: 1.2 }, 'l'],
    [14, { crouch: 2.2, spin: 0, ears: -0.7, lid: 1, tailUp: 0.4, ...size(1.24, 0.78) }, 'l'],
    [17, { lift: 3.2, ears: 0.6, lid: 0.4, tailUp: 0.8, ...size(0.93, 1.08) }, 'o'],
    [20, { crouch: 1.2, ears: -0.2, lid: 0.5, ...size(1.08, 0.93) }, 'i'],
    [22, { ...SIT, headRoll: 0.32, nod: 0.18, sway: 0.4, lid: 0.55, ears: -0.2 }, 'io'],
    [25, { ...SIT, headRoll: -0.32, nod: -0.15, sway: -0.4, lid: 0.55, ears: -0.2 }, 'io'],
    [28, { ...SIT, headRoll: 0.3, nod: 0.15, sway: 0.35, lid: 0.55, ears: -0.2 }, 'io'],
    [31, { ...SIT, headRoll: -0.25, nod: -0.1, sway: -0.3, lid: 0.5 }, 'io'],
    [33, { ...SIT, headRoll: 0, nod: 0, sway: 0, lid: 0.3 }, 'io'],
    [35, { roll: 0.22, headRoll: 0.35, fluff: 1.1, ears: 0.6 }, 'o'],
    [36.5, { roll: -0.22, headRoll: -0.35, fluff: 1.1, ears: 0.6 }, 'o'],
    [38, { roll: 0.18, headRoll: 0.28, fluff: 0.9, ears: 0.6 }, 'o'],
    [39.5, { roll: -0.1, headRoll: -0.15, fluff: 0.5, ears: 0.5 }, 'o'],
    [41, { ears: 0.6, joy: 1, tailWag: 0.5 }, 'b'],
    [44, { ears: 0.4, joy: 1, tailWag: -0.3 }, 'io'],
    [48, {}],
  ],
  // A big yawn, a turn round on the spot, and it curls up with the tail round it.
  sleep_in: [
    [0, {}],
    [4, { mouth: 1, nod: -0.5, stretch: 0.8, lid: 1, ears: -0.3, tailUp: 0.3 }, 'io'],
    [10, { mouth: 1, nod: -0.55, stretch: 0.9, lid: 1, ears: -0.35, tailUp: 0.3 }],
    [12, { mouth: 0.1, nod: 0.1, lid: 0.7, crouch: 0.8 }, 'o'],
    [14, { lid: 0.7, crouch: 1, yaw: Math.PI / 2, ...patter(0) }, 'io'],
    [16, { lid: 0.75, crouch: 1, yaw: Math.PI, ...patter(1) }, 'l'],
    [18, { lid: 0.8, crouch: 1.2, yaw: 1.5 * Math.PI, ...patter(2) }, 'l'],
    [20, { lid: 0.85, crouch: 1.4, yaw: 0, tailWrap: 0.3 }, 'l'],
    [24, { ...SLEEP, blink: 0, lid: 1, ...size(1.08, 0.92) }, 'i'],
    [26, { ...SLEEP }, 'b'],
    [30, { ...SLEEP }],
  ],
  // Asleep in a curl: the body breathes (the skin), an ear twitches, the tail tip flicks, it mumbles.
  sleep: [
    [0, { ...SLEEP }],
    [20, { ...SLEEP }],
    [22, { ...SLEEP, earR: -0.6 }, 'o'],
    [25, { ...SLEEP, earR: 0 }, 'b'],
    [40, { ...SLEEP }],
    [43, { ...SLEEP, tailWag: 0.35 }, 'io'],
    [47, { ...SLEEP }, 'io'],
    [56, { ...SLEEP }],
    [59, { ...SLEEP, mouth: 0.25, nod: 0.66 }, 'io'],
    [63, { ...SLEEP }, 'io'],
    [72, { ...SLEEP }],
  ],
  // An ear wakes first, the head comes up, a long stretch with the bottom high and a yawn, a shake, up.
  sleep_out: [
    [0, { ...SLEEP }],
    [4, { ...SLEEP, earL: 0.7 }, 'o'],
    [7, { ...SLEEP, earL: 0.5, nod: 0, headRoll: 0.1, blink: 0, lid: 0.6 }, 'io'],
    [11, { pitch: 0.38, lean: 1.2, crouch: 0.8, mouth: 1, lid: 1, nod: -0.3, ears: -0.3, tailUp: 0.9, ...paw('L', 10, -2.4, 0), ...paw('R', 10.4, 2.4, 0) }, 'io'],
    [17, { pitch: 0.42, lean: 1.3, crouch: 0.9, mouth: 1, lid: 1, nod: -0.35, ears: -0.35, tailUp: 1, ...paw('L', 10.2, -2.4, 0), ...paw('R', 10.6, 2.4, 0) }],
    [19, { roll: 0.2, headRoll: 0.3, fluff: 0.9, ears: 0.5 }, 'o'],
    [20.5, { roll: -0.2, headRoll: -0.3, fluff: 0.9, ears: 0.5 }, 'o'],
    [22, { roll: 0.12, headRoll: 0.2, fluff: 0.5, ears: 0.4 }, 'o'],
    [24, { blink: 1 }, 'o'],
    [26, { blink: 0 }, 's'],
    [30, {}],
  ],
  // Jolted awake: up in the air with the fur on end, then straight into the threat display; it sees nothing is there,
  // drops it and looks embarrassed.
  wake_startled: [
    [0, { ...SLEEP }],
    [2, { blink: 0, lift: 3, fluff: 1.3, ears: 1, browUp: 1, tailUp: 1.2, ...size(0.94, 1.08) }, 'o'],
    [5, { crouch: 1, fluff: 1.2, ears: 0.8, browUp: 1, tailUp: 1 }, 'i'],
    [7, { ...THREAT }, 'b'],
    [13, { ...THREAT, fluff: 1.2 }],
    [16, { blink: 1, blush: 1, ears: -0.2 }, 'o'],
    [18, { headRoll: 0.2, blush: 1, ears: -0.2 }, 's'],
    [24, {}],
  ],
  trick: [
    [0, {}],
    [3, { headYaw: -0.6, nod: -0.45, lookY: 0.8, lookX: -0.3, ears: 0.8 }, 'o'],
    [7, { headYaw: -0.3, nod: -0.3, lookY: 0.6, lookX: -0.1, ears: 0.7 }, 'io'],
    [11, { headYaw: 0.1, nod: -0.05, lookY: 0.2, ears: 0.7 }, 'io'],
    [14, { headYaw: 0.15, nod: 0.12, lookY: -0.6, ears: 0.9, browUp: 1 }, 'i'],
    [17, { headYaw: 0.15, nod: 0.14, lookY: -0.7, ears: 0.9, browUp: 1 }],
    [19, { lift: 5, fluff: 1.3, ears: -0.8, browUp: 1, mouth: 0.6, tailUp: 1.3, lean: -1, ...size(0.92, 1.1) }, 'o'],
    [22, { crouch: 1.6, fluff: 1.2, ears: -0.7, browUp: 1, tailUp: 1.2, lean: -1, ...size(1.1, 0.9) }, 'i'],
    [25, { ...THREAT }, 'b'],
    ...[27, 28, 29, 30, 31, 32].map((fr, i): Key => [fr, { ...THREAT, fluff: 1.2, dx: i % 2 ? 1 : -1 }, 'l']),
    [34, { ...THREAT, crouch: 0.6, fluff: 1.2 }, 'o'],
    [36, { ...THREAT, lift: 3.2, dy: 7, ...size(1.08) }, 'o'],
    [38, { ...THREAT, crouch: 0.5, dy: 7, ...size(1.08, 1.02) }, 'i'],
    [40, { ...THREAT, lift: 4, dy: 14, ...size(1.16) }, 'o'],
    [43, { ...THREAT, dy: 14, rear: 1.45, ...size(1.16) }, 'i'],
    [45, { ...THREAT, ...windmill(0), dy: 14, rear: 1.6, mouth: 0.6, claws: 0.4, browUp: 1, ears: 0.6, ...size(1.16) }, 'o'],
    [47, { ...THREAT, ...windmill(1.6), dy: 14, rear: 1.15, mouth: 0.6, claws: 0.4, browUp: 1, ears: 0.6, ...size(1.16) }, 'io'],
    [49, { ...THREAT, ...windmill(3.2), dy: 14, rear: 1.7, mouth: 0.8, claws: 0.4, browUp: 1, ears: 0.7, ...size(1.16) }, 'io'],
    [51, { ...THREAT, ...windmill(4.8), dy: 14, rear: 1.25, mouth: 0.8, claws: 0.4, browUp: 1, ears: 0.7, ...size(1.16) }, 'io'],
    [54, { ...THREAT, ...windmill(6.4), dy: 13, rear: 1.8, spin: -0.4, lift: 1.5, mouth: 1, claws: 0, browUp: 1, ears: 1, tailUp: 1.3, ...size(1.14) }, 'i'],
    [56, { rear: 0.5, tuck: 0.7, spin: -1.5, lift: 6, dy: 9, mouth: 1, browUp: 1, ears: 1, tailUp: 1.3, overAll: 1, ...size(1.1) }, 'o'],
    [58, { rear: 0.2, tuck: 1, spin: -2.8, lift: 9.5, dy: 7, mouth: 1, lid: 1, ears: 1, tailUp: 1.2, overAll: 1, ...size(1.08) }, 'l'],
    [60, { rear: 0.2, tuck: 1, spin: -4.1, lift: 10, dy: 5, mouth: 1, lid: 1, ears: 1, tailUp: 1.1, overAll: 1, ...size(1.06) }, 'l'],
    [62, { rear: 0.2, tuck: 1, spin: -5.3, lift: 8, dy: 3, mouth: 0.6, lid: 1, ears: 0.6, tailUp: 1, overAll: 1, ...size(1.04) }, 'l'],
    [64, { rear: 0.4, tuck: 0.4, spin: -6.1, lift: 3.5, dy: 1, mouth: 0.6, lid: 1, ears: 0.3, tailUp: 0.8, overAll: 1, ...size(1.02) }, 'l'],
    [66, { ...SIT, tailWrap: 0.6, crouch: 0.6, lid: 1, ears: -0.7, ...size(1.16, 0.84) }, 'i'],
    [68, { ...SIT, tailWrap: 0.8, headRoll: 0.35, nod: 0.2, sway: 0.4, lid: 0.55, ears: -0.2 }, 'o'],
    [71, { ...SIT, tailWrap: 0.9, headRoll: -0.32, nod: -0.15, sway: -0.4, lid: 0.55, ears: -0.2 }, 'io'],
    [74, { ...SIT, tailWrap: 1, headRoll: 0.25, nod: 0.12, sway: 0.25, lid: 0.5 }, 'io'],
    [76, { ...SIT, tailWrap: 1, headRoll: 0, nod: 0, lid: 0, browUp: 1, ears: 0.6, lookX: 0.4 }, 'o'],
    [79, { ...SIT, tailWrap: 1, ...hide, nod: 0.35, ears: -0.5, blush: 1, lid: 1 }, 'o'],
    [87, { ...SIT, tailWrap: 1, ...hide, nod: 0.38, ears: -0.5, blush: 1, lid: 1, tailWag: 0.2 }],
    [89, { ...SIT, tailWrap: 1, ...peek, nod: 0.12, headYaw: -0.3, headRoll: 0.32, ears: -0.2, blush: 1, lookX: -0.4, lookY: -0.3, browUp: 1 }, 'o'],
    [92, { ...SIT, tailWrap: 1, ...peek, nod: 0.12, headYaw: -0.3, headRoll: 0.34, ears: -0.2, blush: 1, lookX: -0.4, lookY: -0.3, browUp: 1 }],
    [93.5, { ...SIT, tailWrap: 1, ...hide, nod: 0.38, ears: -0.6, blush: 1, lid: 1 }, 'o'],
    [98, { ...SIT, tailWrap: 1, ...hide, nod: 0.36, ears: -0.6, blush: 1, lid: 1 }],
    [101, { ...SIT, tailWrap: 1, headRoll: 0.28, nod: 0.1, ears: 0.2, blush: 1, joy: 1, tailWag: 0.4 }, 'b'],
    [106, { ...SIT, tailWrap: 0.8, headRoll: 0.3, nod: 0.1, ears: 0.3, blush: 1, joy: 1, tailWag: -0.3 }, 'io'],
    [110, { lift: 2.5, ears: 0.5, tailUp: 0.5, blush: 0.6, ...size(0.95, 1.05) }, 'o'],
    [113, { crouch: 0.8, blush: 0.4, ...size(1.06, 0.94) }, 'i'],
    [120, {}],
  ],
  trick_b: [
    [0, {}],
    [2, { headYaw: 1.75, stretch: 0.9, nod: -0.1, lookX: 0.4, ears: 0.3, tailWag: 0.3 }, 'o'],
    ...([[5, 1], [9, -1], [12.5, 1], [15.5, -1], [18, 1], [20, -1], [21.5, 1], [23, -1]] as const).map(([fr, w]): Key => [fr, { headYaw: 1.75 + 0.25 * w, stretch: 0.9, nod: -0.1, lookX: 0.4 * w, ears: 0.3, tailWag: w * 1.1, fluff: fr > 15 ? 0.4 : 0 }, 'io']),
    [24, { headYaw: 0.4, nod: -0.4, lookY: 0.8, ears: 0.6, tailRotor: 0.6, tailSpin: 0, browUp: 1 }, 'o'],
    [27, { headYaw: 0.3, nod: -0.65, lookY: 1, ears: -0.2, tailRotor: 1, tailSpin: 0.3, browUp: 1, mouth: 0.6 }, 'b'],
    ...[1, 2, 3, 4, 5, 6].map((k): Key => [27 + k * 1.15, { headYaw: 0.3, nod: -0.65, lookY: 1, ears: -0.3, tailRotor: 1, tailSpin: 0.3 + 0.35 * k * (k + 1), browUp: 1, mouth: 0.6, fluff: 0.4 }, 'l']),
    ...[1, 2, 3, 4, 5].map((k): Key => [33.9 + k, { headYaw: 0.25, nod: -0.6, lookY: 1, ears: -0.4, tailRotor: 1, tailSpin: 15 + 2.4 * k, browUp: 1, mouth: 0.8, fluff: 0.5, lift: 0.25 * k, ...patter(k) }, 'l']),
    ...Array.from({ length: 26 }, (_, i): Key => {
      const fr = 40 + i,
        up = Math.min(1, i / 10),
        swing = Math.sin((i / 26) * TAU);
      return [fr, { headYaw: 0.1, nod: -0.25 + 0.15 * up, ears: -0.4, tailRotor: 1, tailSpin: 27 + 2.5 * (i + 1), joy: i > 6 ? 1 : 0, mouth: 1, fluff: 0.5, rear: 0.25 * up, lift: 1.25 + 8 * up, dy: -(26 * Math.min(1, i / 8) ** 2 * (3 - 2 * Math.min(1, i / 8)) + 15 * Math.exp(-(((i - 10) / 3) ** 2))), dx: 18 * swing - PILE * (i / 26) ** 2, yaw: -((i / 26) * TAU) % TAU, overAll: i > 3 ? 1 : 0 }, 'l'];
    }),
    [67, { headYaw: 0.1, nod: -0.6, lookY: 1, ears: -0.2, tailRotor: 1, tailSpin: 94, browUp: 1, mouth: 0.3, rear: 0.25, lift: 9.25, dy: -26, overAll: 1, dx: -PILE }, 'l'],
    [68.5, { headYaw: 0.1, nod: -0.6, lookY: 1, ears: 0, tailRotor: 0.9, tailSpin: 95.5, browUp: 1, mouth: 0.2, rear: 0.25, lift: 9.25, dy: -26, overAll: 1, dx: -PILE }, 'o'],
    [70, { headYaw: -0.3, nod: 0, lookY: 0, ears: 0.3, tailRotor: 0.8, tailSpin: 96, browUp: 1, mouth: 0, rear: 0.2, lift: 9.25, dy: -25, overAll: 1, dx: -PILE }, 'o'],
    [73, { headYaw: -0.3, nod: 0, ears: 0.3, tailRotor: 0.7, tailSpin: 96.2, browUp: 1, blink: 1, rear: 0.2, lift: 9.25, dy: -25, overAll: 1, dx: -PILE }],
    [74, { headYaw: -0.3, nod: -0.2, ears: 1, tailRotor: 0.4, tailSpin: 96.2, tailUp: 1.3, browUp: 1, mouth: 1, rear: 0.1, lift: 9, dy: -24, overAll: 1, dx: -PILE }, 's'],
    [77, { headYaw: -0.2, nod: -0.3, ears: 1, tailRotor: 0.1, tailUp: 1.4, browUp: 1, mouth: 1, lift: 6, dy: -13, overAll: 1, dx: -PILE }, 'i'],
    [80, { crouch: 3.4, tuck: 0, nod: 0.6, ears: 0.6, tailUp: 1.25, tailWag: 0.4, lid: 1, ...size(1.1, 0.9), dx: -PILE }, 'i'],
    [83, { crouch: 3.4, tuck: 0, nod: 0.6, ears: 0.4, tailUp: 1.25, tailWag: -0.6, lid: 1, dx: -PILE }, 'o'],
    [85, { crouch: 3.4, tuck: 0, nod: 0.6, ears: 0.6, tailUp: 1.25, tailWag: 0.6, lid: 0.5, dx: -PILE }, 'o'],
    [87, { crouch: 3.4, tuck: 0, nod: 0.6, earL: 0.9, tailUp: 1.25, tailWag: -0.4, lid: 0.5, dx: -PILE }, 'o'],
    [89, { lift: 6, ears: 0.8, browUp: 1, joy: 1, mouth: 0.8, fluff: 0.6, tailUp: 0.8, ...size(0.92, 1.1), dx: -PILE * 0.55 }, 'o'],
    [91, { lift: 6.6, ears: 0.8, joy: 1, mouth: 0.8, fluff: 0.6, tailUp: 0.7, dx: -PILE * 0.2 }, 'io'],
    [93, { crouch: 1.2, ears: 0.4, joy: 1, fluff: 0.5, ...size(1.12, 0.88) }, 'i'],
    [95, { roll: 0.24, headRoll: 0.38, fluff: 1.1, ears: 0.5, lid: 1 }, 'o'],
    [96.5, { roll: -0.24, headRoll: -0.38, fluff: 1.1, ears: 0.5, lid: 1 }, 'o'],
    [98, { roll: 0.2, headRoll: 0.3, fluff: 1, ears: 0.5, lid: 1 }, 'o'],
    [99.5, { roll: -0.14, headRoll: -0.2, fluff: 0.7, ears: 0.4, lid: 1 }, 'o'],
    [101, { roll: 0, headRoll: 0, fluff: 0.3 }, 'o'],
    [103, { headRoll: 0.25, joy: 1, blush: 1, tailWag: 0.5, ears: 0.5 }, 'b'],
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
    else if (name === 'spin' || name === 'headYaw' || name === 'yaw') {
      // Full turns take the short way back: a head or a body that ends a whole turn ahead is back at rest.
      const to = b[name] ?? 0,
        from = to + ((((a[name] ?? 0) - to + Math.PI) % TAU) + TAU) % TAU - Math.PI;
      pose[name] = from * (1 - u) + to * u;
    } else pose[name] = (a[name] ?? 0) * (1 - u) + (b[name] ?? 0) * u;
  }
  return pose;
}
export const helpers = { size };
