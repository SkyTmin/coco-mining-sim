// Pose book of Шмыг. Times are frames at 24 fps. Hand goals are written relative to the resting hip (forward, right,
// up) in the feet frame; `lift` follows the body when it rises. A free umbrella is placed by its grip in feet units;
// its direction keys umbF / umbS are offsets from the shoulder carry (umbF 0.3, umbS 0.55 stand it straight up).
// The effect timelines in dream_sneak-fx.ts read the beat constants exported here.
import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';

/** Height of the hip joint above the grass at rest, rig units. */
export const HIP = 10.5;

export const clips: Record<string, { seconds: number; loop?: boolean }> = {
  ...everyday,
  look: { seconds: 1.5 },
  fidget_a: { seconds: 2.5 },
  fidget_b: { seconds: 2.5 },
  happy: { seconds: 2 },
  'happy-f2': { seconds: 2 },
  trick: { seconds: 5.5 },
  trick_b: { seconds: 5.5 },
  phase: { seconds: 2.5 },
  'idle-f2': { seconds: 1.5, loop: true },
  'trick-f2': { seconds: 5.5 },
  'trick_b-f2': { seconds: 5.5 },
  show: { seconds: 5 },
  peek: { seconds: 2.5 },
  hatch: { seconds: 2.5 },
  sleep: { seconds: 3, loop: true },
  sleep_in: { seconds: 1.5 },
  sleep_out: { seconds: 1.5 },
  wake_startled: { seconds: 1.2 },
};
type Track = [number, JointPose][];
const TAU = Math.PI * 2;
export const hand = (name: 'L' | 'R', x: number, y: number, z: number) => reach('hand' + name, [x, y, z]);
const L = (x: number, y: number, z: number, lift = 0) => hand('L', x, y, HIP + z + lift);
const R = (x: number, y: number, z: number, lift = 0) => hand('R', x, y, HIP + z + lift);
const footL = (x: number, y: number, z: number) => reach('footL', [x, y, z]);
const footR = (x: number, y: number, z: number) => reach('footR', [x, y, z]);
/** Painted size relative to natural (the skin reads sx / sy as offsets from 1). */
const size = (x: number, y = x) => ({ sx: x - 1, sy: y - 1 });
/** Umbrella direction presets (offsets from the shoulder carry). */
const UP = { umbF: 0.3, umbS: 0.55 };
const AT_VIEWER = { umbF: 1.1, umbS: 1.27 };
const DOWN = { umbF: Math.PI + 0.3, umbS: 0.55 };
/** The second form: the cape inside out, the full moon on the tail, the umbrella open and floating overhead. */
const F2 = { form: 1, umbFree: 1, umbOpen: 1, umbX: 1.6, umbY: 0, umbZ: 42, umbF: 0.42, umbS: 0.55, sand: 0.6 };
const f2 = (p: JointPose): JointPose => ({ ...F2, ...p });
/** Asleep: curled up on the grass under the open umbrella laid over him like a tent. */
export const asleep: JointPose = { sleep: 1, blink: 1, tailCurl: 0.2, umbFree: 1, umbOpen: 1, umbX: 7, umbY: 5, umbZ: 1.2, umbF: -0.65, umbS: 0.55 };
/** Keys that switch at the key instead of fading. */
const SWITCHES = new Set(['hidden', 'overAll', 'blink', 'noShadow', 'umbFree', 'umbHidden', 'umbNose', 'umbInR', 'peekFront', 'sheepHidden', 'dizzy0', 'dizzy1', 'dizzy2']);

/** Effect beats shared with the painter of effects. */
export const beats = {
  // Invisible: the shield umbrella pops open and spins, he vanishes in a puff, two eyes blink in the dark, glowing
  // footprints hop to the glass, «БУ!» right at the glass over the frame, giggles, hops home.
  trick: { open: 24, spinEnd: 40, poof: 40, eyesOn: 44, eyesOff: 56, prints: 58, printStep: 4, boo: 84, giggle: 96, hop1: 106, hop2: 114, land: 120 },
  // Dream sand: a pinch from the pouch, a big breath, a blow at the viewer; the viewer's eyes close, Z-z-z in the dark;
  // they open on him hanging by the umbrella crook from the top rail; he opens it and floats home.
  trick_b: { dip: 14, pinch: 20, blow: 40, lidsStart: 48, dark: 60, darkEnd: 80, wake: 80, hang: 74, letGo: 100, land: 118 },
  // Awakening: a yawn, a fistful of sand over himself, a spin in a sand whirl, the cape turns inside out, sheep pop out.
  phase: { toss: 12, spinStart: 16, flip: 30, burst: 40 },
  // Counting sheep: sand builds a fence, three sheep jump it (the third bonks), then he jumps it himself; it crumbles.
  'trick-f2': { fenceStart: 6, fenceEnd: 20, jump0: 24, jump1: 39, jump2: 54, bonk: 60, jump2b: 75, self: 86, selfOver: 96, crumble: 111, home: 126 },
  // Umbrella flight: he grabs the floating umbrella, flies off small across the sky, swoops at the glass, floats home.
  'trick_b-f2': { grab: 8, takeoff: 12, far: 30, cross: 56, swoop: 66, close: 72, up: 90, descend: 96, land: 120 },
  // Show: he floats down from above the frame hanging under the open umbrella, lands, closes it with a twirl, bows.
  show: { land: 60, twirl: 66, bow: 84 },
  fidget_a: { toss: 11, nose: 22, catch: 48 },
  hatch: { poke: 10, open: 18, out: 22, crumble: 34 },
  happy: { land: 22, open: 26 },
};

/** Glowing footprints of the invisible hop toward the glass: field offsets from his feet, pixels. */
export const PRINTS: [number, number][] = [
  [6, 10],
  [-4, 20],
  [8, 32],
  [-6, 46],
  [10, 62],
  [-6, 80],
];
/** «БУ!» at the glass: the offset of his feet over the bottom rail, and his size there. */
const BOO = { dx: 4, dy: 66, k: 1.55 };
/** Hanging from the top rail by the umbrella crook. */
const HANG = { dx: 0, dy: -97 };
/** Holding on under the hooked umbrella: both paws on the shaft, toes pointed, feet dangling. */
const hanging = (swing: number, wave = false): JointPose => ({
  overAll: 1,
  noShadow: 1,
  dx: HANG.dx,
  dy: HANG.dy,
  umbInR: 1,
  ...R(2.4, 10.4, 19.8),
  ...(wave ? L(7, -9, 18 + (swing > 0 ? 0 : 3)) : { ...L(3.4, 9.2, 18.2), gripL: 1 }),
  ...DOWN,
  earL: 1.4,
  earR: 1.4,
  nod: -0.1,
  gaze: 0.2,
  point: 1,
  ...footL(1.5 + swing, -3, 3.4),
  ...footR(2.5 - swing, 4, 2.2),
  drift: swing,
  roll: 0.06 * swing,
  smile: 1,
});

/** Hanging under the umbrella in flight (second form): the left paw on the handle, the right on the shaft. */
const flying = (p: JointPose): JointPose => {
  const lift = (p.jump ?? 7) + (p.lift ?? 0);
  return f2({ umbFree: 0, umbInR: 1, jump: 7, ...R(1.5, 10.5, 19, lift), ...L(4, -8, 9, lift), umbF: 0.3, umbS: 0.4, noShadow: 1, point: 1, smile: 1, earL: -0.2, earR: -0.2, ...p });
};
/** Floating down under the open umbrella in the show: hung from the left paw, swaying, legs dangling. */
const floating = (dy: number, swing: number, wave = false, look = 0): JointPose => ({
  overAll: 1,
  noShadow: 1,
  dy,
  lift: 1.4,
  ...L(1.5, -10.5, 19, 1.4),
  ...(wave ? R(5, 10 + swing, 18 + 3 * swing, 1.4) : R(4, 8, 9, 1.4)),
  umbF: 0.3,
  umbS: 0.7,
  umbOpen: 1,
  point: 0.7,
  drift: swing,
  roll: 0.05 * swing,
  smile: 1,
  mouth: wave ? 0.4 : 0,
  capeLift: 1.6,
  lookY: -look,
  nod: 0.12 * look,
  earL: -0.2,
  earR: -0.2,
  ...footL(1 + swing, -3, 2.8),
  ...footR(2 - swing, 4, 2),
});

export const tracks: Record<string, Track> = {
  idle: [[0, {}], [18, { gaze: -0.12, earL: 0.1 }], [36, { tailSway: 0.2, nod: 0.04 }], [54, { earR: 0.15, tilt: 0.05 }], [72, {}]],
  'idle-f2': [[0, f2({})], [9, f2({ nod: -0.05, earL: 0.1, tailSway: 0.2 })], [18, f2({ gaze: 0.12, tilt: 0.04 })], [27, f2({ earR: 0.12, nod: 0.04 })], [36, f2({})]],
  tired: [[0, {}], [8, { crouch: 1.6, lid: 0.35, earL: 0.5, earR: 0.5, nod: 0.18 }], [26, { crouch: 1.8, lid: 0.45, earL: 0.6, earR: 0.55, nod: 0.22, blink: 1 }], [30, { crouch: 1.6, lid: 0.35, earL: 0.5, earR: 0.5, nod: 0.18 }], [36, {}]],
  // Sneaky look round: crouches, ears swivel first, a long glance each way, a sly grin.
  look: [[0, {}], [4, { crouch: 1.4, earL: -0.3, earR: -0.3 }],
    [8, { crouch: 1.2, gaze: -0.8, yaw: -0.18, earL: -0.45, earR: 0.15, lookX: -0.7 }],
    [15, { crouch: 1.2, gaze: -0.82, yaw: -0.18, earL: -0.45, earR: 0.15, lookX: -0.7, blink: 1 }],
    [17, { crouch: 1.2, gaze: -0.8, yaw: -0.18, earL: -0.45, earR: 0.15, lookX: -0.7 }],
    [20, { crouch: 1.0, gaze: 0.6, yaw: 0.14, earL: 0.15, earR: -0.45, lookX: 0.7, smile: 0.6 }],
    [29, { crouch: 1.0, gaze: 0.62, yaw: 0.14, earL: 0.15, earR: -0.45, lookX: 0.7, smile: 0.8, lid: 0.15 }],
    [33, {}], [36, {}]],
  // Balances the umbrella on his nose: tosses it, it flips once and lands on the snout, wobbles, he catches it.
  fidget_a: [[0, {}],
    [5, { crouch: 1.4, ...L(7, -3, 6), ...UP, nod: 0.1, earL: -0.2, earR: -0.2 }],
    [8, { crouch: 2.0, ...L(7, -3, 3.5), ...UP, lookY: 0.4, nod: 0.12 }],
    [10, { lift: 0.6, ...L(6, -3, 16, 0.6), ...UP, nod: -0.3, lookY: 0.8, mouth: 0.3, earL: -0.3, earR: -0.3 }],
    [11, { lift: 0.6, ...L(6, -3, 17, 0.6), umbFree: 1, umbX: 6, umbY: -3, umbZ: HIP + 17.6, ...UP, nod: -0.4, lookY: 0.9, mouth: 0.3, earL: -0.3, earR: -0.3 }],
    [16, { lift: 0.4, ...L(5, -8, 12), ...R(4, 7, 9), umbFree: 1, umbX: 7, umbY: -1, umbZ: 50, umbF: 0.3 + Math.PI, umbS: 0.55, nod: -0.6, lookY: 1, mouth: 0.4, earL: -0.35, earR: -0.35 }],
    [21, { ...L(3, -9, 10), ...R(3, 9, 10), umbFree: 1, umbX: 8, umbY: 0, umbZ: 40, umbF: 0.3 + TAU - 0.15, umbS: 0.55, nod: -0.62, lookY: 1, mouth: 0.2 }],
    [22, { crouch: 1.6, ...L(3, -10, 10), ...R(3, 10, 10), umbFree: 1, umbNose: 1, umbF: 0.3 + TAU, umbS: 0.55, nod: -0.62, lookY: 1, earL: 0.2, earR: 0.2 }],
    [26, { crouch: 0.6, lean: 0.8, drift: -1.2, roll: 0.06, ...L(3, -11, 12), ...R(3, 8, 8), umbFree: 1, umbNose: 1, umbF: 0.3 + TAU, umbS: 0.75, nod: -0.62, lookY: 1, lookX: 0.4, earL: -0.2, earR: 0.3 }],
    [30, { lean: -0.6, drift: 1.2, roll: -0.06, ...L(3, -8, 8), ...R(3, 11, 12), umbFree: 1, umbNose: 1, umbF: 0.3 + TAU, umbS: 0.38, nod: -0.62, lookY: 1, lookX: -0.4, earL: 0.3, earR: -0.2 }],
    [34, { drift: -0.5, roll: 0.03, ...L(3, -10, 11), ...R(3, 10, 11), umbFree: 1, umbNose: 1, umbF: 0.3 + TAU, umbS: 0.62, nod: -0.62, lookY: 1 }],
    [38, { ...L(3, -10, 10.5), ...R(3, 10, 10.5), umbFree: 1, umbNose: 1, umbF: 0.3 + TAU, umbS: 0.55, nod: -0.62, lookY: 0.9, smile: 1, cheek: 0.8 }],
    [45, { ...L(3, -10, 10.5), ...R(3, 10, 10.5), umbFree: 1, umbNose: 1, umbF: 0.3 + TAU, umbS: 0.55, nod: -0.62, lookY: 0.9, smile: 1, cheek: 0.8, lid: 0.25 }],
    [48, { ...L(7, -2.4, 20.5), ...R(3, 10, 10), umbFree: 1, umbNose: 1, umbF: 0.3 + TAU, umbS: 0.55, nod: -0.5, lookY: 0.6, smile: 1 }],
    [49, { ...L(7, -2.4, 20.5), ...R(3, 10, 10), umbF: 0.3 + TAU, umbS: 0.55, nod: -0.5, lookY: 0.6, smile: 1 }],
    [51, { ...L(9, -8, 15), ...R(3.6, 8, 9), umbF: 0.3 + TAU, umbS: 0.4, nod: -0.15, lookY: 0.2, smile: 1 }],
    [54, { ...L(6.5, -6.5, 9.5), ...R(4.6, 5.2, 5.2), umbF: TAU, umbS: 0.15, nod: 0.08, smile: 0.8, tilt: 0.08 }],
    [60, { umbF: TAU, umbS: 0 }]],
  // A huge yawn and stretch, the ears flop, a head shake, rubs an eye.
  fidget_b: [[0, {}],
    [6, { crouch: 1.0, nod: 0.15, lid: 0.25, earL: 0.15, earR: 0.15 }],
    [14, { lift: 1.6, pitch: -0.14, ...R(2, 7, 24, 1.6), ...L(2, -7, 22, 1.6), ...UP, mouth: 1, blink: 1, earL: -0.45, earR: -0.45, tailCurl: 0.5, puff: 1, nod: -0.2 }],
    [24, { lift: 1.8, pitch: -0.16, ...R(2, 7.5, 24.5, 1.8), ...L(2, -7.5, 22.5, 1.8), ...UP, mouth: 1, blink: 1, earL: -0.5, earR: -0.5, tailCurl: 0.55, puff: 1, nod: -0.22 }],
    [28, { crouch: 1.6, mouth: 0, earL: 0.7, earR: 0.7, nod: 0.12, lid: 0.3 }],
    [31, { crouch: 1.2, gaze: -0.4, earL: 0.9, earR: 0.15, nod: 0.08, blink: 1 }],
    [33, { crouch: 1.2, gaze: 0.4, earL: 0.15, earR: 0.9, nod: 0.08, blink: 1 }],
    [35, { crouch: 1.1, gaze: -0.25, earL: 0.6, earR: 0.3, blink: 1 }],
    [37, { crouch: 1.0, gaze: 0.12, earL: 0.35, earR: 0.5 }],
    [42, { ...R(7.6, 2.6, 17.4), blink: 1, nod: 0.12, tilt: -0.1, earL: 0.3, earR: 0.3 }],
    [45, { ...R(7.9, 3.0, 17.8), blink: 1, nod: 0.12, tilt: -0.12, earL: 0.3, earR: 0.3 }],
    [48, { ...R(7.5, 2.4, 17.2), blink: 1, nod: 0.12, tilt: -0.1, earL: 0.3, earR: 0.3 }],
    [52, { lid: 0.45, smile: 0.4, earL: 0.15, earR: 0.15 }],
    [60, {}]],
  // A spring jump with a front flip, lands, pops the umbrella open overhead and twirls it.
  happy: [[0, {}],
    [5, { crouch: 3.2, earL: 0.45, earR: 0.45, ...size(1.1, 0.9), smile: 0.6 }],
    [7, { jump: 7, tuck: 0.4, ...size(0.92, 1.12), earL: -0.4, earR: -0.4, smile: 1, mouth: 0.4 }],
    [10, { jump: 15, tuck: 1, pitch: 1.6, earL: 0.3, earR: 0.3, smile: 1, tailCurl: -0.3, tailSway: 0.8 }],
    [14, { jump: 17, tuck: 1, pitch: 3.6, smile: 1, tailCurl: -0.3, tailSway: 0.9 }],
    [18, { jump: 10, tuck: 0.8, pitch: 5.6, smile: 1, tailCurl: -0.2, tailSway: 0.5 }],
    [21, { jump: 2, tuck: 0.2, pitch: TAU, earL: -0.3, earR: -0.3 }],
    [22, { crouch: 3.0, pitch: TAU, ...size(1.16, 0.84), earL: 0.5, earR: 0.5, smile: 1 }],
    [26, { pitch: TAU, lift: 0.8, ...L(3, -7.5, 22, 0.8), ...UP, umbOpen: 1, smile: 1, mouth: 0.6, earL: -0.3, earR: -0.3, ...size(0.96, 1.05) }],
    [32, { pitch: TAU, ...L(3, -7.5, 21.5), ...UP, umbOpen: 1, umbSpin: 2.4, smile: 1, mouth: 0.4, tilt: 0.1 }],
    [38, { pitch: TAU, ...L(3, -7.5, 21.5), ...UP, umbOpen: 1, umbSpin: 4.8, smile: 1, tilt: -0.08 }],
    [42, { pitch: TAU, ...L(6.5, -6.5, 9.5), umbOpen: 0, umbSpin: 5.5, smile: 0.8 }],
    [48, { pitch: TAU, umbSpin: TAU }]],
  'happy-f2': [[0, f2({})],
    [5, f2({ crouch: 2.6, earL: 0.4, earR: 0.4, sheepZ: -1, ...size(1.08, 0.92) })],
    [8, f2({ umbZ: 51, jump: 9, tuck: 0.6, ...L(5, -9, 14, 9), ...R(5, 9, 14, 9), earL: 0.1, earR: 0.1, smile: 1, mouth: 0.5, sheepZ: 6, twist: 1.6 })],
    [12, f2({ umbZ: 55, jump: 13, tuck: 0.8, ...L(4, -10, 12, 13), ...R(4, 10, 12, 13), smile: 1, mouth: 0.6, sheepZ: 9, twist: 3.4 })],
    [16, f2({ umbZ: 50, jump: 8, tuck: 0.5, ...L(5, -9, 14, 8), ...R(5, 9, 14, 8), smile: 1, sheepZ: 7, twist: 5.0 })],
    [20, f2({ jump: 0, crouch: 2.4, ...size(1.12, 0.88), smile: 1, sheepZ: 2, twist: TAU })],
    [26, f2({ ...L(6, -1.2, 14), ...R(6, 1.2, 14), smile: 1, mouth: 0.4, twist: TAU, sheepZ: 4 })],
    [29, f2({ ...L(6, -3.6, 14), ...R(6, 3.6, 14), smile: 1, twist: TAU, sheepZ: 1 })],
    [32, f2({ ...L(6, -1.2, 14), ...R(6, 1.2, 14), smile: 1, mouth: 0.4, twist: TAU, sheepZ: 4 })],
    [38, f2({ smile: 0.8, tilt: 0.08, twist: TAU })],
    [48, f2({ twist: TAU })]],
  // Invisible.
  trick: [[0, {}],
    [6, { crouch: 1.6, gaze: -0.45, lookX: -0.7, smile: 0.8, earL: -0.35, earR: -0.35 }],
    [11, { crouch: 1.6, gaze: -0.48, lookX: -0.7, smile: 0.8, earL: -0.35, earR: -0.35 }],
    [13, { crouch: 1.4, gaze: 0.5, lookX: 0.7, smile: 0.8, earL: -0.2, earR: -0.45 }],
    [17, { crouch: 1.4, gaze: 0.52, lookX: 0.7, smile: 0.8, earL: -0.2, earR: -0.45 }],
    [19, { crouch: 1.2, gaze: 0.1, smile: 1, lid: 0.3, tilt: 0.12, cheek: 0.6 }],
    [22, { crouch: 1.0, ...L(8, -2, 9), ...R(7, 3, 9), umbF: 0.9, umbS: 1.0, smile: 1, lid: 0.3 }],
    [24, { crouch: 1.0, ...L(8, -1, 9), ...R(7, 3, 9), ...AT_VIEWER, umbOpen: 0.3, smile: 1 }],
    [26, { crouch: 0.6, ...L(8, -1, 9), ...R(7, 3, 9), ...AT_VIEWER, umbOpen: 1.1, earL: -0.3, earR: -0.3 }],
    [28, { crouch: 0.8, ...L(8, -1, 9), ...R(7, 3, 9), ...AT_VIEWER, umbOpen: 1, umbSpin: 0.6, earL: -0.35, earR: -0.35 }],
    [33, { crouch: 1.6, ...L(8, -1, 8), ...R(7, 3, 8), ...AT_VIEWER, umbOpen: 1, umbSpin: 3.4, earL: 0.6, earR: 0.6 }],
    [37, { crouch: 2.4, ...L(8, -1, 7), ...R(7, 3, 7), ...AT_VIEWER, umbOpen: 1, umbSpin: 8.6, earL: 0.8, earR: 0.8, ...size(0.96, 0.96) }],
    [39, { crouch: 2.6, ...L(8, -1, 7), ...R(7, 3, 7), ...AT_VIEWER, umbOpen: 1, umbSpin: 13.4, earL: 0.8, earR: 0.8, ...size(0.6, 1.2), flash: 0.4 }],
    [40, { hidden: 1, noShadow: 1, ...size(0.2, 0.2) }],
    [83, { hidden: 1, noShadow: 1 }],
    [84, { overAll: 1, noShadow: 1, dx: BOO.dx, dy: BOO.dy, ...size(BOO.k * 0.75, BOO.k * 1.2), flash: 0.5, ...L(4, -11, 22), ...R(4, 11, 22), ...UP, umbOpen: 1, mouth: 1, wide: 1, earL: -0.55, earR: -0.55, puff: 1 }],
    [86, { overAll: 1, noShadow: 1, dx: BOO.dx, dy: BOO.dy, ...size(BOO.k * 1.08, BOO.k * 0.94), flash: 0.15, ...L(4, -12, 23), ...R(4, 12, 23), ...UP, umbOpen: 1.1, mouth: 1, wide: 1, earL: -0.6, earR: -0.6, puff: 1 }],
    [88, { overAll: 1, noShadow: 1, dx: BOO.dx, dy: BOO.dy, ...size(BOO.k), ...L(4, -12, 22.5), ...R(4, 12, 22.5), ...UP, umbOpen: 1, mouth: 1, wide: 1, earL: -0.55, earR: -0.55, puff: 0.8 }],
    [94, { overAll: 1, noShadow: 1, dx: BOO.dx, dy: BOO.dy, ...size(BOO.k), ...L(4, -12, 22.5), ...R(4, 12, 22.5), ...UP, umbOpen: 1, mouth: 0.9, wide: 1, earL: -0.55, earR: -0.55, puff: 0.8 }],
    [96, { overAll: 1, noShadow: 1, dx: BOO.dx, dy: BOO.dy, ...size(BOO.k), ...L(5, -6, 16), ...R(8, 2.4, 16.5), ...UP, umbOpen: 1, blink: 1, smile: 1, earL: 0.1, earR: 0.1, tilt: 0.08, lift: 0.4 }],
    [98, { overAll: 1, noShadow: 1, dx: BOO.dx, dy: BOO.dy, ...size(BOO.k), ...L(5, -6, 16), ...R(8, 2.4, 16.5), ...UP, umbOpen: 1, blink: 1, smile: 1, earL: 0.2, earR: 0.0, tilt: -0.08, lift: -0.2 }],
    [100, { overAll: 1, noShadow: 1, dx: BOO.dx, dy: BOO.dy, ...size(BOO.k), ...L(5, -6, 16), ...R(8, 2.4, 16.5), ...UP, umbOpen: 1, blink: 1, smile: 1, earL: 0.0, earR: 0.2, tilt: 0.08, lift: 0.4 }],
    [102, { overAll: 1, noShadow: 1, dx: BOO.dx, dy: BOO.dy, ...size(BOO.k), ...L(5, -6, 16), ...R(8, 2.4, 16.5), ...UP, umbOpen: 1, blink: 1, smile: 1, earL: 0.2, earR: 0.0, tilt: -0.08, lift: -0.2 }],
    [105, { overAll: 1, noShadow: 1, dx: BOO.dx, dy: BOO.dy, ...size(BOO.k * 1.06, BOO.k * 0.92), crouch: 2.4, ...L(6.5, -6.5, 9.5), ...UP, umbOpen: 0.6, smile: 1, earL: 0.4, earR: 0.4 }],
    [110, { overAll: 1, noShadow: 1, dx: BOO.dx * 0.5, dy: 44, ...size(1.32), jump: 8, tuck: 1, ...L(6.5, -6.5, 9.5), umbOpen: 0, smile: 1, earL: 0.2, earR: 0.2 }],
    [114, { dx: 0, dy: 28, ...size(1.22, 0.86), crouch: 2.2, smile: 1, earL: 0.4, earR: 0.4 }],
    [118, { dy: 8, ...size(1.06), jump: 6, tuck: 0.8, smile: 1 }],
    [120, { ...size(1.14, 0.86), crouch: 2.2, earL: 0.45, earR: 0.45, smile: 1 }],
    [124, { ...size(0.97, 1.04), smile: 1, lid: 0.25, tilt: 0.1 }],
    [129, { smile: 0.6 }], [132, {}]],
  // Dream sand.
  trick_b: [[0, {}],
    [6, { gaze: 0.2, smile: 1, lid: 0.25, tilt: 0.1 }],
    [12, { gaze: 0.22, smile: 1, lid: 0.3, tilt: 0.12 }],
    [14, { ...R(3.6, 6.8, 6.8), gripR: 1, sand: 1, gaze: 0.05, nod: 0.25, lookY: -0.6, earL: -0.2, earR: -0.2 }],
    [18, { ...R(3.4, 6.8, 6.2), gripR: 1, sand: 1, gaze: 0.05, nod: 0.25, lookY: -0.6, earL: -0.2, earR: -0.2 }],
    [20, { ...R(7, 4, 11), pinch: 1, sand: 0.4, gaze: 0.1, nod: 0.05, smile: 1 }],
    [24, { ...R(9, 4.5, 13), pinch: 1, gaze: 0.25, smile: 1, lid: 0.35, tilt: 0.1 }],
    [30, { ...R(8.5, 4.4, 14.5), pinch: 1, lift: 1.2, puff: 1, cheek: 1, pitch: -0.12, earL: -0.35, earR: -0.35, mouth: 0, gaze: 0.2 }],
    [38, { ...R(8.5, 4.4, 15.5), pinch: 1, lift: 1.4, puff: 1, cheek: 1.2, pitch: -0.14, earL: -0.4, earR: -0.4, gaze: 0.2 }],
    [40, { ...R(9.6, 3.6, 16), pinch: 0.4, lift: 0.6, pitch: 0.2, lean: 1.2, mouth: 0.45, cheek: 0.2, earL: 0.25, earR: 0.25, gaze: 0.25, blow: 0.05 }],
    [48, { ...R(9.8, 3.6, 15.5), lift: 0.4, pitch: 0.16, lean: 1.0, mouth: 0.4, earL: 0.2, earR: 0.2, gaze: 0.25, blow: 0.75, smile: 0.6, lids: 0.25 }],
    [52, { ...R(8, 4, 12), smile: 1, gaze: 0.25, blow: 1, lids: 0.6 }],
    [54, { smile: 1, gaze: 0.25, lids: 0.45 }],
    [58, { smile: 1, gaze: 0.25, lids: 0.9 }],
    [60, { lids: 1, hidden: 1, noShadow: 1 }],
    [73, { lids: 1, zzz: 0.7, hidden: 1, noShadow: 1 }],
    [74, { lids: 1, zzz: 0.75, ...hanging(0), lid: 0.3 }],
    [80, { lids: 1, zzz: 1, ...hanging(0), lid: 0.3 }],
    [83, { lids: 0.45, ...hanging(1), lid: 0.3 }],
    [86, { lids: 0.85, ...hanging(-1) }],
    [90, { lids: 0, ...hanging(1.2, true), mouth: 0.4, gaze: 0.3 }],
    [93, { ...hanging(-1.2, true), mouth: 0.4, gaze: 0.3 }],
    [96, { ...hanging(1.0, true), mouth: 0.4, gaze: 0.3 }],
    [99, { ...hanging(0), wide: 0.6, earL: -0.4, earR: -0.4 }],
    [102, { overAll: 1, noShadow: 1, dx: HANG.dx, dy: HANG.dy + 10, ...L(2.5, -5, 21), ...UP, umbOpen: 1, point: 0.6, smile: 1, mouth: 0.6, wide: 0.6, earL: -0.5, earR: -0.5, capeLift: 3 }],
    [108, { overAll: 1, noShadow: 1, dx: HANG.dx - 6, dy: HANG.dy + 34, ...L(2, -1.4, 23), ...UP, umbOpen: 1, point: 0.5, drift: -1, roll: -0.05, smile: 1, earL: -0.3, earR: -0.3, capeLift: 2 }],
    [112, { dx: HANG.dx + 4, dy: HANG.dy + 58, ...L(2, -1.4, 23), ...UP, umbOpen: 1, point: 0.4, drift: 1, roll: 0.05, smile: 1, capeLift: 1.6 }],
    [116, { dx: HANG.dx - 2, dy: HANG.dy + 84, ...L(2, -1.4, 23), ...UP, umbOpen: 1, point: 0.3, drift: -0.6, roll: -0.03, smile: 1, capeLift: 1.2 }],
    [118, { dy: 0, crouch: 2.2, ...size(1.12, 0.88), ...L(2, -1.4, 21), ...UP, umbOpen: 1, smile: 1, earL: 0.4, earR: 0.4 }],
    [122, { ...L(6.5, -6.5, 9.5), umbOpen: 0, umbSpin: 4.2, smile: 1, lid: 0.25, tilt: 0.1 }],
    [128, { smile: 0.8, umbSpin: TAU }], [132, { umbSpin: TAU }]],
  // Awakening.
  phase: [[0, {}],
    [4, { crouch: 1.2, mouth: 0.7, blink: 1, earL: 0.3, earR: 0.3, nod: -0.1 }],
    [8, { crouch: 1.0, ...R(3.6, 6.8, 6.8), gripR: 1, sand: 1, mouth: 0.2, earL: 0.1, earR: 0.1 }],
    [12, { crouch: 0.4, ...R(4, 9, 22, 1), pinch: 1, gaze: 0.1, nod: -0.25, lookY: 0.8, smile: 1 }],
    [16, { lift: 1.5, ...R(3, 7, 22, 1.5), ...L(3, -7, 20, 1.5), ...UP, umbFree: 1, umbX: 3, umbY: -7, umbZ: HIP + 21.5, twist: 0, blink: 1, smile: 1, capeLift: 1.6 }],
    [20, { tailCurl: 0.6, lift: 3, ...R(3, 10, 15, 3), ...L(3, -10, 15, 3), umbFree: 1, umbX: 1, umbY: 0, umbZ: 45, umbOpen: 0.4, ...UP, twist: Math.PI / 2, blink: 1, smile: 1, capeLift: 3, flare: 1 }],
    [24, { tailCurl: 0.6, lift: 4, ...R(3, 10, 15, 4), ...L(3, -10, 15, 4), umbFree: 1, umbX: 0, umbY: 0, umbZ: 46, umbOpen: 0.8, umbF: 0.42, umbS: 0.55, twist: Math.PI, blink: 1, capeLift: 4, flare: 2 }],
    [28, { tailCurl: 0.6, lift: 4.5, form: 0.35, ...R(3, 10, 15, 4.5), ...L(3, -10, 15, 4.5), umbFree: 1, umbX: -1, umbY: 0, umbZ: 46.5, umbOpen: 1, umbF: 0.42, umbS: 0.55, twist: (3 * Math.PI) / 2, blink: 1, capeLift: 4.5, flare: 2.4 }],
    [32, { tailCurl: 0.6, lift: 4.5, form: 0.65, ...R(3, 10, 15, 4.5), ...L(3, -10, 15, 4.5), umbFree: 1, umbX: -1, umbY: 0, umbZ: 46.5, umbOpen: 1, umbF: 0.42, umbS: 0.55, twist: TAU, blink: 1, capeLift: 4.5, flare: 2.4, sheepR: -8 }],
    [36, { tailCurl: 0.6, lift: 4, form: 0.9, ...R(3, 10, 15, 4), ...L(3, -10, 15, 4), umbFree: 1, umbX: -1, umbY: 0, umbZ: 46, umbOpen: 1, umbF: 0.42, umbS: 0.55, twist: TAU + Math.PI / 2, capeLift: 4, flare: 2, sheepR: -3, wide: 0.5 }],
    [40, f2({ umbZ: 45, lift: 3, twist: 2 * TAU, ...R(4, 12, 16, 3), ...L(4, -12, 16, 3), wide: 1, mouth: 0.6, earL: -0.5, earR: -0.5, flash: 0.25, sheepR: 4, sheepZ: 4, capeLift: 3, flare: 1.4 })],
    [44, f2({ umbZ: 44, lift: 2, twist: 2 * TAU, ...R(4, 12, 15, 2), ...L(4, -12, 15, 2), wide: 1, mouth: 0.4, earL: -0.45, earR: -0.45, sheepR: 2, sheepZ: 2, capeLift: 2 })],
    [49, f2({ twist: 2 * TAU, ...R(5, 8, 12), ...L(5, -8, 12), smile: 1, sheepR: 0 })],
    [55, f2({ twist: 2 * TAU, smile: 0.6 })],
    [60, f2({ twist: 2 * TAU })]],
  // Counting sheep: a sand fence, three sheep over it (the third bonks and he dozes off counting), then he jumps it
  // himself as number four, winks, the fence crumbles, two hops home. The sheep and the travel run on lanes below.
  'trick-f2': [[0, f2({})],
    [4, f2({ yaw: -0.25, crouch: 1.2, gaze: -0.2, lookX: -0.6, smile: 1, lid: 0.2, earL: -0.3, earR: 0.1, ...R(6, 4, 9) })],
    [6, f2({ yaw: -0.5, crouch: 0.8, gaze: -0.1, lookX: -0.5, smile: 1, ...R(9, 1, 11), ...L(8, -4, 12), sand: 1, earL: -0.4, earR: -0.1 })],
    [13, f2({ yaw: -0.55, lean: 0.4, roll: -0.04, gaze: -0.1, lookX: -0.4, ...R(10, 0, 12), ...L(9, -5, 13), sand: 1, smile: 0.8, earL: -0.4, earR: -0.2 })],
    [20, f2({ yaw: -0.4, gaze: 0, lookX: -0.3, ...R(10, 3, 11), ...L(9, -3, 12), sand: 1, smile: 1, earL: -0.2 })],
    [22, f2({ crouch: 1, ...L(6, -1.4, 13), ...R(6, 1.4, 13), smile: 1, mouth: 0.4, gaze: 0.1, earL: -0.45, earR: -0.45 })],
    [24, f2({ ...L(6, -4, 14), ...R(6, 4, 14), smile: 1, mouth: 0.2, gaze: -0.2, earL: -0.3, earR: -0.3 })],
    [28, f2({ ...L(7, -10.5, 18), gaze: -0.35, lookX: -0.7, smile: 0.8, earL: -0.2 })],
    [30, f2({ ...L(7, -10.5, 19), gaze: -0.55, lookX: -0.8, nod: 0.14, smile: 1, mouth: 0.3, lid: 0.15 })],
    [35, f2({ ...L(7, -10.5, 18), gaze: -0.62, lookX: -0.8, nod: 0.04, lid: 0.25, smile: 0.6 })],
    [38, f2({ crouch: 0.6, gaze: -0.2, lookX: -0.4, mouth: 0.55, lid: 0.45, earL: 0.25, earR: 0.25, ...R(7.6, 2.6, 17) })],
    [41, f2({ gaze: -0.3, lookX: -0.6, lid: 0.4, earL: 0.2, earR: 0.2, ...L(7, -10.5, 17) })],
    [46, f2({ gaze: -0.55, lookX: -0.8, nod: 0.18, lid: 0.45, smile: 0.6, mouth: 0.2, ...L(7, -10.5, 18) })],
    [50, f2({ gaze: -0.6, lookX: -0.7, nod: 0.12, lid: 0.55, ...L(7, -10.5, 16), earL: 0.35, earR: 0.35 })],
    [53, f2({ lift: 0.8, pitch: -0.1, mouth: 1, blink: 1, ...R(7.6, 2.6, 17.4, 0.8), earL: 0.5, earR: 0.5, nod: -0.15 })],
    [57, f2({ crouch: 1.2, nod: 0.32, blink: 1, earL: 0.8, earR: 0.8, drift: 0.6, roll: 0.05, tailCurl: 0.3 })],
    [60, f2({ crouch: 1.4, nod: 0.36, blink: 1, earL: 0.85, earR: 0.85, drift: -0.5, roll: -0.04, tailCurl: 0.3 })],
    [62, f2({ umbZ: 44.4, jump: 2.4, gaze: -0.5, lookX: -0.8, wide: 1, mouth: 0.6, earL: -0.3, earR: -0.3, ...L(6, -9, 16), ...R(6, 9, 16), tailCurl: 0.6, puff: 1 })],
    [65, f2({ crouch: 0.6, gaze: -0.45, lookX: -0.8, wide: 0.6, earL: -0.4, earR: -0.4, mouth: 0.3 })],
    [67, f2({ ...R(7.6, 2.6, 17), blink: 1, smile: 1, gaze: 0.1, tilt: 0.1, lift: 0.4, earL: 0.1, earR: 0.1 })],
    [68, f2({ ...R(7.6, 2.6, 16.6), blink: 1, smile: 1, gaze: 0.1, tilt: -0.08, lift: -0.2 })],
    [70, f2({ ...R(7.6, 2.6, 17), blink: 1, smile: 1, gaze: 0.1, tilt: 0.1, lift: 0.4 })],
    [72, f2({ ...R(7.6, 2.6, 16.6), blink: 1, smile: 1, gaze: 0.1, tilt: -0.08, lift: -0.2 })],
    [75, f2({ gaze: -0.4, lookX: -0.7, smile: 0.8, earL: -0.3, earR: -0.3 })],
    [78, f2({ ...L(6, -4, 14), ...R(6, 4, 14), gaze: -0.5, lookX: -0.8, smile: 1, earL: -0.4, earR: -0.4 })],
    [80, f2({ ...L(6, -1.3, 14), ...R(6, 1.3, 14), gaze: -0.55, lookX: -0.8, smile: 1, mouth: 0.5, earL: -0.5, earR: -0.5 })],
    [83, f2({ ...L(6, -4, 14), ...R(6, 4, 14), gaze: -0.5, lookX: -0.7, smile: 1 })],
    [86, f2({ yaw: -0.7, crouch: 3.2, ...size(1.1, 0.9), lean: -0.6, ...L(-2, -7, 8), ...R(-2, 7, 8), smile: 1, earL: 0.4, earR: 0.4, tailSway: 0.3 })],
    [89, f2({ yaw: -0.7, crouch: 3.4, ...size(1.12, 0.88), lean: -0.7, ...L(-3, -7, 7), ...R(-3, 7, 7), smile: 1, earL: 0.45, earR: 0.45, tailSway: 0.3 })],
    [91, f2({ umbZ: 50, yaw: -0.7, jump: 8, tuck: 0.5, ...size(0.92, 1.12), pitch: 0.2, ...L(6, -9, 14, 8), ...R(6, 9, 14, 8), earL: -0.6, earR: -0.6, mouth: 0.5, smile: 1, capeLift: 2 })],
    [93, f2({ umbZ: 59, yaw: -0.7, jump: 17, tuck: 1, pitch: 0.35, ...L(5, -10, 12, 17), ...R(5, 10, 12, 17), earL: -0.5, earR: -0.5, mouth: 0.6, smile: 1, capeLift: 3 })],
    [95, f2({ umbZ: 49, yaw: -0.7, jump: 7, tuck: 0.6, pitch: 0.1, ...L(5, -9.5, 12, 7), ...R(5, 9.5, 12, 7), earL: -0.2, earR: -0.2, smile: 1, capeLift: 2 })],
    [96, f2({ yaw: -0.4, crouch: 3, ...size(1.14, 0.86), earL: 0.55, earR: 0.55, smile: 1, capeLift: 1 })],
    [99, f2({ yaw: -0.1, lift: 0.8, ...L(5, -11, 21, 0.8), ...R(5, 11, 21, 0.8), smile: 1, mouth: 0.6, earL: -0.4, earR: -0.4, ...size(0.97, 1.04) })],
    [103, f2({ yaw: 0.1, ...L(5, -11, 20), ...R(5, 11, 20), smile: 1, mouth: 0.4, gaze: 0.25, lookX: 0.6, earL: -0.35, earR: -0.35 })],
    [105, f2({ yaw: 0.1, ...L(5, -11, 20), ...R(5, 11, 20), smile: 1, gaze: 0.3, lookX: 0.7, tilt: 0.14, lid: 0.45, cheek: 0.8, earL: -0.2, earR: -0.4 })],
    [110, f2({ yaw: 0.1, ...L(5, -10.5, 19.5), ...R(5, 10.5, 19.5), smile: 1, gaze: 0.3, lookX: 0.7, tilt: 0.14, lid: 0.45, cheek: 0.8, earL: -0.2, earR: -0.4 })],
    [113, f2({ yaw: 0.3, crouch: 1.6, ...L(6, -9, 12), ...R(6, 9, 12), gaze: -0.5, lookY: -0.6, lookX: -0.5, earL: 0.3, earR: 0.3, smile: 0.6, mouth: 0.3 })],
    [115, f2({ yaw: 0.5, crouch: 2.2, ...size(1.08, 0.92), smile: 1, earL: 0.4, earR: 0.4 })],
    [118, f2({ umbZ: 50, yaw: 0.5, jump: 8, tuck: 0.8, smile: 1, earL: -0.3, earR: -0.3, capeLift: 1.5 })],
    [121, f2({ yaw: 0.5, crouch: 2.2, ...size(1.08, 0.92), smile: 1, earL: 0.4, earR: 0.4 })],
    [123, f2({ umbZ: 50, yaw: 0.4, jump: 8, tuck: 0.8, smile: 1, earL: -0.3, earR: -0.3, capeLift: 1.5 })],
    [126, f2({ yaw: 0.2, crouch: 2.4, ...size(1.1, 0.9), smile: 1, earL: 0.45, earR: 0.45 })],
    [129, f2({ ...size(0.98, 1.03), smile: 0.6 })], [132, f2({})]],
  // Umbrella flight: hops up to the floating umbrella, flies off small across the moon with the flock, dives at the
  // glass and waves, is pulled up out of the frame, drops back in from the sky and lets the umbrella float up again.
  'trick_b-f2': [[0, f2({})],
    [4, f2({ crouch: 2.2, gaze: 0.2, nod: -0.35, lookY: 0.9, lookX: 0.4, earL: 0.4, earR: 0.4, smile: 1, umbX: 3, umbY: 12, umbZ: 33, umbF: 0.3, umbS: 0.4 })],
    [7, f2({ crouch: 2.8, ...size(1.08, 0.92), gaze: 0.2, nod: -0.35, lookY: 0.9, lookX: 0.4, earL: 0.5, earR: 0.5, smile: 1, umbX: 1.5, umbY: 10.5, umbZ: 36, umbF: 0.3, umbS: 0.4 })],
    [8, flying({ jump: 6, ...R(1.5, 10.5, 19.5, 6), ...L(5, -9, 14, 6), ...size(0.94, 1.08), nod: -0.2, lookY: 0.5, earL: -0.5, earR: -0.5, mouth: 0.4, noShadow: 0 })],
    [12, flying({ mouth: 0.5, capeLift: 2 })],
    [20, flying({ ...size(0.72), drift: 1, roll: 0.06, gaze: 0.3, lookX: 0.6, ...footL(0, -3, 3), ...footR(4, 4, 1.4) })],
    [30, flying({ ...size(0.5), drift: -1, roll: -0.06, ...footL(4, -3, 1.4), ...footR(0, 4, 3) })],
    [40, flying({ ...size(0.46), yaw: 0.6, drift: 1, roll: 0.06, ...footL(0, -3, 3), ...footR(4, 4, 1.4), mouth: 0.6 })],
    [50, flying({ ...size(0.46), yaw: 0.6, drift: -1, roll: -0.06, ...footL(4, -3, 1.4), ...footR(0, 4, 3) })],
    [56, flying({ ...size(0.5), yaw: 0.4, pitch: 0.2, ...footL(2, -3, 2), ...footR(2, 4, 2), earL: -0.6, earR: -0.6 })],
    [60, flying({ overAll: 1, ...size(0.9), yaw: 0.2, pitch: 0.3, earL: -0.65, earR: -0.65, mouth: 0.7, wide: 0.6, capeLift: 3 })],
    [66, flying({ overAll: 1, ...size(1.62), pitch: 0.1, earL: -0.5, earR: -0.5, mouth: 0.6, wide: 0.6, capeLift: 2.4 })],
    [72, flying({ overAll: 1, ...size(1.6), ...L(5, -10, 19, 7), gaze: 0.25, lookX: 0.6, tilt: 0.12, mouth: 0.5, ...footL(1, -3, 3), ...footR(4, 4, 1.4) })],
    [75, flying({ overAll: 1, ...size(1.6), ...L(5, -12, 14, 7), gaze: 0.25, lookX: 0.6, tilt: 0.12, lid: 0.45, cheek: 0.8, ...footL(4, -3, 1.4), ...footR(1, 4, 3) })],
    [78, flying({ overAll: 1, ...size(1.6), ...L(5, -10, 19, 7), gaze: 0.25, lookX: 0.6, tilt: 0.12, lid: 0.45, cheek: 0.8, ...footL(1, -3, 3), ...footR(4, 4, 1.4) })],
    [81, flying({ overAll: 1, ...size(1.6), ...L(5, -12, 14, 7), gaze: 0.25, lookX: 0.6, tilt: 0.12, mouth: 0.5, ...footL(4, -3, 1.4), ...footR(1, 4, 3) })],
    [84, flying({ overAll: 1, ...size(1.6), crouch: 1, ...footL(2, -3, 2), ...footR(2, 4, 2), mouth: 0.6, wide: 0.5, earL: -0.6, earR: -0.6 })],
    [89, flying({ overAll: 1, ...size(1.7), lift: 1, earL: -0.6, earR: -0.6, capeLift: 3, mouth: 0.6 })],
    [90, flying({ hidden: 1, ...size(1) })],
    [95, flying({ hidden: 1 })],
    [96, flying({ drift: 1, roll: 0.06, lookY: -0.4, nod: 0.1 })],
    [104, flying({ drift: -1, roll: -0.06, lookY: -0.5, nod: 0.12, ...footL(4, -3, 1.4), ...footR(0, 4, 3) })],
    [112, flying({ drift: 0.7, roll: 0.04, lookY: -0.6, nod: 0.15, noShadow: 0, ...footL(1, -3, 2.4), ...footR(3, 4, 2) })],
    [118, flying({ jump: 1, noShadow: 0, point: 0.4 })],
    [120, f2({ umbFree: 0, umbInR: 1, crouch: 1.2, ...size(1.12, 0.88), ...R(1.5, 10.5, 19), umbF: 0.3, umbS: 0.4, earL: 0.45, earR: 0.45, smile: 1 })],
    [122, f2({ umbFree: 1, crouch: 0.5, ...R(1.5, 10.5, 19), umbX: 1.5, umbY: 10.5, umbZ: HIP + 19, umbF: 0.3, umbS: 0.4, earL: 0.2, earR: 0.2, smile: 1, nod: -0.2, lookY: 0.6, lookX: 0.4 })],
    [124, f2({ ...R(3, 9.5, 13), umbX: 1.5, umbY: 10.5, umbZ: 37, umbF: 0.3, umbS: 0.4, smile: 1, nod: -0.3, lookY: 0.7, lookX: 0.4 })],
    [128, f2({ smile: 1, lid: 0.3, tilt: 0.1, gaze: 0.15 })],
    [132, f2({})]],
  // Show: floats down into the painting from above the frame under the open umbrella, swaying and waving, lands,
  // twirls himself and the umbrella shut, bows with a flourish, comes up with a wink.
  show: [[0, floating(-214, -1)], [12, floating(-170, 1, true)], [20, floating(-138, -1, true)], [28, floating(-104, 1, true)],
    [38, floating(-62, -1, false, 0.3)], [48, floating(-28, 0.7, false, 0.6)], [56, floating(-6, -0.3, false, 0.8)],
    [60, { crouch: 2.4, ...size(1.14, 0.86), ...L(1.5, -10.5, 19), umbF: 0.3, umbS: 0.7, umbOpen: 1, smile: 1, earL: 0.45, earR: 0.45 }],
    [64, { ...L(2, -10.5, 20), umbF: 0.3, umbS: 0.7, umbOpen: 1, smile: 1, ...size(0.97, 1.04), earL: -0.3, earR: -0.3 }],
    [66, { ...L(3, -10, 18), umbF: 0.3, umbS: 0.6, umbOpen: 0.9, umbSpin: 1, twist: 0.4, smile: 1 }],
    [72, { ...L(5, -8.5, 14), umbF: 0.2, umbS: 0.3, umbOpen: 0.3, umbSpin: 6, twist: Math.PI, smile: 1, mouth: 0.4, capeLift: 1.5, earL: -0.3, earR: -0.3 }],
    [78, { ...L(6.5, -6.5, 9.5), umbOpen: 0, umbSpin: 11, twist: TAU, smile: 1, capeLift: 0.6 }],
    [84, { pitch: 0.45, ...R(6, 1, 12), ...L(5, -11, 10), umbF: 0.9, umbS: 1.0, umbSpin: 4 * Math.PI, twist: TAU, nod: 0.3, blink: 1, smile: 1, earL: 0.65, earR: 0.65, tailSway: 0.3 }],
    [94, { pitch: 0.48, ...R(6, 1, 12), ...L(5, -11.5, 9.5), umbF: 0.9, umbS: 1.0, umbSpin: 4 * Math.PI, twist: TAU, nod: 0.32, blink: 1, smile: 1, earL: 0.7, earR: 0.7, tailSway: 0.35 }],
    [98, { lift: 0.6, umbSpin: 4 * Math.PI, twist: TAU, ...size(0.97, 1.04), smile: 1, mouth: 0.4, earL: -0.3, earR: -0.3 }],
    [102, { umbSpin: 4 * Math.PI, twist: TAU, lookX: 0.7, lid: 0.45, cheek: 0.8, smile: 1 }],
    [112, { umbSpin: 4 * Math.PI, twist: TAU, lookX: 0.7, lid: 0.45, cheek: 0.8, smile: 1 }],
    [116, { umbSpin: 4 * Math.PI, twist: TAU, smile: 0.5 }], [120, { umbSpin: 4 * Math.PI, twist: TAU }]],
  // Peek: the umbrella tip pokes up over the bottom rail and wiggles, pops open, ducks; the ears come up and swivel,
  // the eyes, the paws hook over the rail, a tilt and a giggle, he ducks and hops back in.
  peek: [[0, {}], [4, { crouch: 2.6, earL: -0.3, earR: -0.3, smile: 0.6, nod: 0.1 }],
    [9, { dy: 170, noShadow: 1, ...L(3, -7.5, 22), ...UP }],
    [14, { dy: 141, noShadow: 1, ...L(3, -7.5, 24), ...UP }],
    [17, { dy: 141, noShadow: 1, ...L(3, -7.5, 24), ...UP, drift: 1.2, roll: 0.12 }],
    [20, { dy: 141, noShadow: 1, ...L(3, -7.5, 24), ...UP, drift: -1.2, roll: -0.12 }],
    [22, { dy: 139, noShadow: 1, ...L(3, -7.5, 24), ...UP, umbOpen: 1.1 }],
    [26, { dy: 139, noShadow: 1, ...L(3, -7.5, 24), ...UP, umbOpen: 1, umbSpin: 2.5 }],
    [29, { dy: 172, noShadow: 1, ...L(3, -7.5, 22), ...UP, umbOpen: 0, umbSpin: TAU }],
    [33, { dy: 118, noShadow: 1, umbSpin: TAU, earL: -0.45, earR: -0.45 }],
    [36, { dy: 116, noShadow: 1, umbSpin: TAU, earL: 0.05, earR: -0.5 }],
    [39, { dy: 92, noShadow: 1, umbSpin: TAU, gaze: -0.1, earL: -0.3, earR: -0.3 }],
    [42, { dy: 83, noShadow: 1, umbSpin: TAU, peekFront: 1, curl: 1, ...L(8, -10, 11), ...R(8, 8, 11), smile: 0.6, earL: -0.3, earR: -0.3 }],
    [44, { dy: 83, noShadow: 1, umbSpin: TAU, peekFront: 1, curl: 1, ...L(8, -10, 11), ...R(8, 8, 11), smile: 0.6, blink: 1, earL: -0.3, earR: -0.3 }],
    [46, { dy: 82, noShadow: 1, umbSpin: TAU, peekFront: 1, curl: 1, ...L(8, -10, 11), ...R(8, 8, 11), gaze: 0.05, tilt: 0.16, smile: 1, lid: 0.35, earL: -0.1, earR: -0.4 }],
    [49, { dy: 82, noShadow: 1, umbSpin: TAU, peekFront: 1, curl: 1, ...L(8, -10, 11), ...R(8, 8, 11.6), gaze: 0.05, tilt: -0.1, smile: 1, blink: 1, earL: 0.1, earR: -0.3 }],
    [51, { dy: 83, noShadow: 1, umbSpin: TAU, peekFront: 1, curl: 1, ...L(8, -10, 11.6), ...R(8, 8, 11), gaze: 0.05, tilt: 0.1, smile: 1, blink: 1, earL: -0.3, earR: 0.1 }],
    [52, { dy: 86, noShadow: 1, umbSpin: TAU, ...L(8, -10, 11), ...R(8, 8, 11), smile: 1 }],
    [54, { dy: 172, noShadow: 1, umbSpin: TAU, crouch: 1.6, earL: 0.4, earR: 0.4 }],
    [56, { dy: 24, noShadow: 1, umbSpin: TAU, jump: 7, tuck: 0.6, earL: -0.4, earR: -0.4, smile: 1 }],
    [58, { umbSpin: TAU, crouch: 0.6, smile: 0.3 }], [59, { umbSpin: TAU }]],
  // Hatch: the umbrella tip pokes through a moon egg (effects), the top flies off as it pops open, he hops out small,
  // grows, lands, twirls the open umbrella, shuts it onto his shoulder.
  hatch: [[0, { hidden: 1, noShadow: 1 }], [17, { hidden: 1, noShadow: 1, ...size(0.42) }],
    [18, { ...size(0.42), dy: 3, flash: 1, ...L(3, -7.5, 22), ...UP, umbOpen: 1, blink: 1, nod: 0.3, earL: 0.6, earR: 0.6 }],
    [20, { ...size(0.46, 0.4), dy: 3, crouch: 2.4, ...L(3, -7.5, 20), ...UP, umbOpen: 1, wide: 0.6, earL: 0.3, earR: 0.3 }],
    [22, { ...size(0.72, 0.9), jump: 10, tuck: 0.8, ...L(3, -7.5, 22, 10), ...UP, umbOpen: 1, smile: 1, mouth: 0.6, earL: -0.5, earR: -0.5 }],
    [25, { ...size(0.94, 1.06), jump: 12, tuck: 0.5, ...L(3, -7.5, 22, 12), ...UP, umbOpen: 1, smile: 1, mouth: 0.5, earL: -0.4, earR: -0.4, capeLift: 2 }],
    [28, { ...size(1.04, 0.98), jump: 5, tuck: 0.3, ...L(3, -7.5, 22, 5), ...UP, umbOpen: 1, smile: 1, earL: -0.2, earR: -0.2 }],
    [31, { crouch: 2.4, ...size(1.12, 0.88), ...L(3, -7.5, 19), ...UP, umbOpen: 1, smile: 1, earL: 0.45, earR: 0.45 }],
    [36, { ...L(3, -7.5, 21), ...UP, umbOpen: 1, umbSpin: 3, smile: 1, mouth: 0.4, cheek: 0.8, gaze: 0.2, lookX: 0.5, earL: -0.3, earR: -0.3 }],
    [42, { ...L(6.5, -6.5, 9.5), umbOpen: 0, umbSpin: 8, smile: 1, lid: 0.3, tilt: 0.1 }],
    [50, { smile: 0.6, umbSpin: 4 * Math.PI }], [60, { umbSpin: 4 * Math.PI }]],
  // Falls asleep: a yawn, tosses the open umbrella up, it floats down over him like a tent as he curls up.
  sleep_in: [[0, {}],
    [6, { crouch: 1, lift: 0.6, mouth: 1, blink: 1, ...R(7.6, 2.6, 17.4), earL: 0.4, earR: 0.4, nod: -0.15 }],
    [11, { crouch: 1, mouth: 0.9, blink: 1, ...R(7.6, 2.6, 17.2), earL: 0.45, earR: 0.45, nod: -0.12 }],
    [16, { lift: 1, ...L(3, -7.5, 21, 1), ...UP, umbOpen: 1, lid: 0.5, earL: 0.5, earR: 0.5, nod: 0.1 }],
    [18, { lift: 1, ...L(3, -7.5, 21, 1), umbFree: 1, umbX: 3, umbY: -7.5, umbZ: HIP + 22, ...UP, umbOpen: 1, lid: 0.55, earL: 0.5, earR: 0.5, nod: 0.1 }],
    [22, { lift: 0.4, sleep: 0.2, blink: 1, earL: 0.45, earR: 0.45, umbFree: 1, umbX: 5, umbY: -14, umbZ: 30, umbF: 0.1, umbS: 0.55, umbOpen: 1 }],
    [26, { sleep: 0.55, blink: 1, earL: 0.4, earR: 0.4, umbFree: 1, umbX: 9, umbY: -12, umbZ: 16, umbF: -0.25, umbS: 0.55, umbOpen: 1, tailCurl: 0.15 }],
    [29, { sleep: 0.8, blink: 1, earL: 0.5, earR: 0.5, umbFree: 1, umbX: 9, umbY: -4, umbZ: 6, umbF: -0.5, umbS: 0.55, umbOpen: 1, tailCurl: 0.18 }],
    [32, asleep], [36, asleep]],
  // Wakes up: one sleepy peek, a stretch and a yawn, takes the umbrella from the air, shuts it onto the shoulder.
  sleep_out: [[0, asleep], [6, { ...asleep, sleep: 0.85 }], [10, { ...asleep, sleep: 0.55, blink: 0, lid: 0.5, earR: 0.2 }],
    [13, { ...asleep, sleep: 0.55 }],
    [20, { lift: 1.2, pitch: -0.12, mouth: 1, blink: 1, ...R(2, 7, 24, 1.2), ...L(2, -7, 22, 1.2), earL: -0.45, earR: -0.45, puff: 1, umbFree: 1, umbX: 3, umbY: -10, umbZ: 16, umbF: 0.3, umbS: 0.55, umbOpen: 1 }],
    [26, { crouch: 0.6, ...L(4, -7, 12), umbFree: 1, umbX: 4, umbY: -7, umbZ: HIP + 12, umbF: 0.3, umbS: 0.55, umbOpen: 1, lid: 0.3, earL: 0.1, earR: 0.1, nod: 0.05, gaze: -0.2 }],
    [27, { crouch: 0.6, ...L(4, -7, 12), umbF: 0.3, umbS: 0.55, umbOpen: 0.9, lid: 0.3, earL: 0.1, earR: 0.1, nod: 0.05, gaze: -0.2 }],
    [32, { ...L(6.5, -6.5, 9.5), umbOpen: 0, umbF: 0.2, smile: 0.4, lid: 0.2 }], [36, {}]],
  // Startled awake: the eyes snap open, he jumps with the ears straight up, the umbrella flies off and tumbles, a
  // look each way, catches it.
  wake_startled: [[0, asleep],
    [3, { ...asleep, sleep: 0.5, blink: 0, wide: 1, earL: -0.5, earR: -0.5 }],
    [6, { jump: 10, tuck: 0.5, wide: 1, mouth: 0.8, earL: -0.65, earR: -0.65, tailCurl: 0.7, puff: 1, ...L(6, -12, 22, 10), ...R(6, 12, 22, 10), capeLift: 3, umbFree: 1, umbX: 2, umbY: -9, umbZ: 30, umbF: 1.2, umbS: 0.55, umbOpen: 1 }],
    [10, { crouch: 2, wide: 0.8, gaze: 0.5, lookX: 0.7, earL: -0.4, earR: -0.4, ...L(6, -9, 14), ...R(6, 9, 14), umbFree: 1, umbX: 0, umbY: -11, umbZ: 38, umbF: 2.2, umbS: 0.55, umbOpen: 1 }],
    [13, { crouch: 1.4, wide: 0.6, gaze: -0.5, lookX: -0.7, earL: -0.3, earR: -0.3, umbFree: 1, umbX: 3, umbY: -9, umbZ: 30, umbF: 1.4, umbS: 0.55, umbOpen: 0.6 }],
    [16, { crouch: 0.8, ...L(4, -8.5, 11), wide: 0.3, gaze: 0.1, umbFree: 1, umbX: 4, umbY: -8.5, umbZ: HIP + 11, umbF: 0.3, umbS: 0.45, umbOpen: 0.2 }],
    [17, { crouch: 0.8, ...L(4, -8.5, 11), wide: 0.3, gaze: 0.1, umbF: 0.3, umbS: 0.45, umbOpen: 0.15 }],
    [22, { ...L(6.5, -6.5, 9.5), umbOpen: 0, umbF: 0.2, smile: 0.4, tilt: 0.1, earL: 0.1 }],
    [26, {}], [28, {}]],
};
/** Where he lands behind the counting fence: field pixels from his spot. */
const OVER = { dx: 81, dy: -17 };
export const lanes: Record<string, Record<string, Lane>> = {
  'trick-f2': {
    sj0: [[23, 0], [26, 1], [43, 1], [48, 0]],
    su0: [[26, 0], [35, 1]],
    sj1: [[38, 0], [41, 1], [56, 1], [62, 0]],
    su1: [[41, 0], [50, 1]],
    sj2: [[53, 0], [56, 1], [84, 1], [88, 0]],
    su2: [[56, 0], [60, 0.4], [64, 0.22], [75, 0.22], [84, 1]],
    sh2: [[56, 0.45], [60, 0.45], [63, 0.01], [74, 0.01], [76, 1.6]],
    dizzy2: [[0, 0], [60, 1], [75, 0]],
    dx: [[90, 0], [96, OVER.dx], [115, OVER.dx], [121, OVER.dx / 2], [126, 0]],
    dy: [[90, 0], [96, OVER.dy], [115, OVER.dy], [121, OVER.dy / 2], [126, 0]],
  },
  'trick_b-f2': {
    dx: [[12, 0], [30, 56], [56, -96], [62, -64], [66, -12], [72, 0], [84, 4], [90, 10], [91, 0]],
    dy: [[12, 0], [20, -40], [30, -96], [56, -106], [62, -44], [66, 34], [72, 46], [84, 44], [90, -300], [95, -300], [96, -210], [104, -146], [112, -74], [118, -14], [120, 0]],
  },
};
/** Lanes: single keys keyed on their own frames, eased on their own (or linear), laid over the main keys. */
type Lane = [number, number][];
const LINEAR = new Set(['su0', 'su1', 'su2', 'dx', 'dy']);
function laneValue(name: string, keys: Lane, f: number) {
  if (f <= keys[0][0]) return keys[0][1];
  const i = keys.findIndex(([time]) => time >= f);
  if (i < 0) return keys[keys.length - 1][1];
  const [start, a] = keys[i - 1],
    [end, b] = keys[i];
  if (SWITCHES.has(name)) return f >= end ? b : a;
  let u = (f - start) / (end - start);
  if (!LINEAR.has(name)) u = u * u * (3 - 2 * u);
  return a + (b - a) * u;
}
export function gesture(anim: string, t: number): JointPose {
  if (anim === 'sleep') return asleep;
  const keys = tracks[anim];
  if (!keys) return {};
  const f = t * 24,
    i = keys.findIndex(([time]) => time >= f);
  let pose: JointPose = {};
  if (i <= 0) pose = { ...keys[i === 0 ? 0 : keys.length - 1][1] };
  else {
    const [start, a] = keys[i - 1],
      [end, b] = keys[i];
    let u = (f - start) / (end - start);
    u = u * u * (3 - 2 * u);
    for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (SWITCHES.has(name)) pose[name] = f >= end ? (b[name] ?? 0) : (a[name] ?? 0);
      else pose[name] = (a[name] ?? 0) * (1 - u) + (b[name] ?? 0) * u;
    }
  }
  for (const [name, lane] of Object.entries(lanes[anim] ?? {})) pose[name] = laneValue(name, lane, f);
  return pose;
}
