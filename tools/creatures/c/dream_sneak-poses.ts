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
  trick: { seconds: 11.5 },
  trick_b: { seconds: 11 },
  phase: { seconds: 4 },
  'idle-f2': { seconds: 1.5, loop: true },
  'trick-f2': { seconds: 10.5 },
  'trick_b-f2': { seconds: 11 },
  show: { seconds: 7 },
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
  // Invisible: «тсс» to the viewer, the shield umbrella pops open toward the glass and spins up, he vanishes in a puff,
  // two eyes blink and look round in the dark, glowing footprints feint left, then run to the glass, a beat of
  // silence, «БУ!» right at the glass over the frame, a giggle fit, three hops home and a little bow.
  trick: { shh: 39, open: 61, spinStart: 72, poof: 100, eyesOn: 114, eyesOff: 138, boo: 198, giggle: 214, hop1: 230, land: 263, landings: [241, 252, 263] },
  // Dream sand: rummaging in the pouch, the glittering pinch shown to the viewer, a long breath, a blow; the viewer's
  // eyes fight the sleep and close, Z-z-z in the dark; they open on him hanging by the umbrella crook from the top rail;
  // he looks round, waves, gulps, opens it and floats home slowly, swaying, closes it with a twirl and winks.
  trick_b: { dip: 19, pinch: 35, blow: 72, dark: 104, wake: 139, letGo: 181, land: 231 },
  // Awakening: a yawn, a fistful of sand thrown up, a spin in a sand whirl, the cape turns inside out, sheep pop out.
  phase: { toss: 31, spinStart: 40, burst: 72 },
  // Counting sheep: a sand fence post by post, claps, two sheep over it, he dozes off, the third bonks, then jumps high;
  // he jumps it himself as number four; the fence crumbles.
  'trick-f2': { fenceStart: 16, postStep: 6, fenceEnd: 46, jump0: 70, jump1: 94, jump2: 122, bonk: 128, jump2b: 151, selfOver: 190, crumble: 210, hopLand: 229, home: 238 },
  // Umbrella flight: he grabs the floating umbrella, flies off small across the sky, pirouettes by the moon, swoops at
  // the glass and boops it, a gust pulls him out of the frame, he floats home.
  'trick_b-f2': { grab: 19, takeoff: 24, moon: 92, swoop: 112, boop: 150, up: 184, descend: 191, land: 244 },
  // Show: he floats down from above the frame hanging under the open umbrella, lands, twirls it shut, bows.
  show: { land: 86, twirl: 92, bow: 118 },
  fidget_a: { toss: 11, nose: 22, catch: 48 },
  hatch: { poke: 10, open: 18, out: 22, crumble: 34 },
  happy: { land: 22, open: 26 },
};

/** Glowing footprints of the invisible hop: the frame each lands and its field offset from his feet, pixels. A feint
 * to the left, a pause while he looks round, then the run to the glass, faster and faster. */
export const PRINTS: [number, number, number][] = [
  [144, -8, 6],
  [151, -20, 10],
  [158, -30, 6],
  [172, -24, 22],
  [178, -10, 34],
  [183, 4, 46],
  [187, -4, 60],
  [190, 8, 74],
];
/** «БУ!» at the glass: the offset of his feet over the bottom rail, and his size there. */
const BOO = { dx: 4, dy: 66, k: 1.55 };
/** At the glass over the bottom rail, big: «БУ!» and the giggle after it. */
const atGlass = (p: JointPose): JointPose => ({ overAll: 1, noShadow: 1, dx: BOO.dx, dy: BOO.dy, ...size(BOO.k), ...UP, umbOpen: 1, ...p });
const giggle = (up: boolean): JointPose =>
  atGlass({ ...L(5, -6, 16), ...R(8, 2.4, 16.5), blink: 1, smile: 1, earL: up ? 0.1 : 0.2, earR: up ? 0.1 : 0, tilt: up ? 0.08 : -0.08, lift: up ? 0.4 : -0.2 });
/** Hopping home from the glass: `dy` pixels toward the glass, painted bigger the closer he is, `sx` / `sy` the squash. */
const hopAt = (dy: number, sx: number, sy: number, p: JointPose): JointPose => {
  const k = 1 + ((BOO.k - 1) * dy) / BOO.dy;
  return { ...(dy >= 40 ? { overAll: 1, noShadow: 1 } : {}), dx: (BOO.dx * dy) / BOO.dy, dy, ...size(k * sx, k * sy), ...p };
};
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
    [3, { earL: -0.5, earR: -0.5, gaze: 0.2, wide: 0.4, lift: 0.4 }],
    [8, { earL: -0.4, earR: -0.4, gaze: 0.25, smile: 0.6, lid: 0.2 }],
    [11, { crouch: 1.6, gaze: -0.45, lookX: -0.7, smile: 0.8, earL: -0.35, earR: -0.35 }],
    [17, { crouch: 1.6, gaze: -0.48, lookX: -0.7, smile: 0.8, earL: -0.35, earR: -0.35, blink: 1 }],
    [19, { crouch: 1.6, gaze: -0.48, lookX: -0.7, smile: 0.8, earL: -0.4, earR: -0.3 }],
    [22, { crouch: 1.6, gaze: -0.5, lookX: -0.75, smile: 0.8, earL: -0.35, earR: -0.35 }],
    [25, { crouch: 1.4, gaze: 0.5, lookX: 0.7, smile: 0.8, earL: -0.2, earR: -0.45 }],
    [33, { crouch: 1.4, gaze: 0.52, lookX: 0.7, smile: 0.8, earL: -0.25, earR: -0.5 }],
    [36, { crouch: 1.2, gaze: 0.1, smile: 1, lid: 0.3, tilt: 0.12, cheek: 0.6 }],
    // «Тсс»: a paw to the lips, a sly squint at the viewer.
    [39, { crouch: 1.0, ...R(7.6, 2.6, 17), gaze: 0.2, lid: 0.35, smile: 0.5, tilt: -0.08, earL: -0.3, earR: -0.3 }],
    [45, { crouch: 1.0, ...R(7.6, 2.6, 17.2), gaze: 0.22, lid: 0.4, smile: 0.6, tilt: -0.1, earL: -0.45, earR: -0.25 }],
    [50, { crouch: 1.1, ...R(7.6, 2.6, 17), gaze: 0.2, lid: 0.4, smile: 0.6, tilt: -0.08, earL: -0.3, earR: -0.4, cheek: 0.6 }],
    [54, { crouch: 1.6, ...L(8, -2, 9), ...R(7, 3, 9), umbF: 0.9, umbS: 1.0, smile: 1, lid: 0.3, gaze: 0.2 }],
    [58, { crouch: 1.9, ...L(8, -1, 9), ...R(7, 3, 9), ...AT_VIEWER, umbOpen: 0.1, smile: 1, earL: 0.2, earR: 0.2 }],
    [61, { crouch: 0.6, ...L(8, -1, 9), ...R(7, 3, 9), ...AT_VIEWER, umbOpen: 1.1, earL: -0.3, earR: -0.3 }],
    [64, { crouch: 0.8, ...L(8, -1, 9), ...R(7, 3, 9), ...AT_VIEWER, umbOpen: 1, earL: -0.35, earR: -0.35 }],
    [72, { crouch: 0.9, ...L(8, -1, 9), ...R(7, 3, 9), ...AT_VIEWER, umbOpen: 1, earL: -0.3, earR: -0.35 }],
    // The spin builds up slowly (the speed is on the umbSpin lane), he sinks behind the shield and shrinks into it.
    [80, { crouch: 1.1, ...L(8, -1, 9), ...R(7, 3, 9), ...AT_VIEWER, umbOpen: 1, earL: 0.1, earR: 0.1 }],
    [87, { crouch: 1.5, ...L(8, -1, 8), ...R(7, 3, 8), ...AT_VIEWER, umbOpen: 1, earL: 0.5, earR: 0.5 }],
    [93, { crouch: 2.1, ...L(8, -1, 7.5), ...R(7, 3, 7.5), ...AT_VIEWER, umbOpen: 1, earL: 0.7, earR: 0.7 }],
    [97, { crouch: 2.4, ...L(8, -1, 7), ...R(7, 3, 7), ...AT_VIEWER, umbOpen: 1, earL: 0.8, earR: 0.8, ...size(0.96, 0.96) }],
    [99, { crouch: 2.6, ...L(8, -1, 7), ...R(7, 3, 7), ...AT_VIEWER, umbOpen: 1, earL: 0.8, earR: 0.8, ...size(0.6, 1.2), flash: 0.4 }],
    [100, { hidden: 1, noShadow: 1, ...size(0.2, 0.2) }],
    [197, { hidden: 1, noShadow: 1 }],
    // «БУ!» at the glass, a frozen scare, then a giggle fit.
    [198, atGlass({ ...size(BOO.k * 0.75, BOO.k * 1.2), flash: 0.5, ...L(4, -11, 22), ...R(4, 11, 22), mouth: 1, wide: 1, earL: -0.55, earR: -0.55, puff: 1 })],
    [200, atGlass({ ...size(BOO.k * 1.08, BOO.k * 0.94), flash: 0.15, ...L(4, -12, 23), ...R(4, 12, 23), umbOpen: 1.1, mouth: 1, wide: 1, earL: -0.6, earR: -0.6, puff: 1 })],
    [202, atGlass({ ...L(4, -12, 22.5), ...R(4, 12, 22.5), mouth: 1, wide: 1, earL: -0.55, earR: -0.55, puff: 0.8 })],
    [207, atGlass({ ...L(4, -12, 22.8), ...R(4, 12, 22.2), mouth: 1, wide: 1, earL: -0.6, earR: -0.5, puff: 0.85, drift: 0.4 })],
    [212, atGlass({ ...L(4, -12, 22.5), ...R(4, 12, 22.5), mouth: 0.9, wide: 1, earL: -0.55, earR: -0.55, puff: 0.8 })],
    [214, giggle(true)], [217, giggle(false)], [220, giggle(true)], [223, giggle(false)], [226, giggle(true)],
    // Three hops home, each a real arc with a squash on landing, then a little bow.
    [230, hopAt(BOO.dy, 1.06, 0.92, { crouch: 2.4, ...L(6.5, -6.5, 9.5), ...UP, umbOpen: 0.6, smile: 1, earL: 0.4, earR: 0.4 })],
    [233, hopAt(BOO.dy, 0.94, 1.08, { lift: 1, ...L(6.5, -6.5, 9.5), umbOpen: 0.1, smile: 1, earL: -0.3, earR: -0.3 })],
    [237, hopAt(54, 1, 1, { jump: 9, tuck: 1, ...L(6.5, -6.5, 9.5), smile: 1, earL: 0.2, earR: 0.2 })],
    [241, hopAt(42, 1.1, 0.88, { crouch: 2.4, smile: 1, earL: 0.45, earR: 0.45 })],
    [244, hopAt(42, 0.96, 1.05, { lift: 0.6, smile: 1, earL: -0.2, earR: -0.2 })],
    [248, hopAt(30, 1, 1, { jump: 8, tuck: 0.9, smile: 1, earL: 0.2, earR: 0.2 })],
    [252, hopAt(18, 1.1, 0.88, { crouch: 2.2, smile: 1, earL: 0.45, earR: 0.45 })],
    [255, hopAt(18, 0.96, 1.05, { lift: 0.5, smile: 1, earL: -0.2, earR: -0.2 })],
    [259, hopAt(8, 1, 1, { jump: 7, tuck: 0.8, smile: 1 })],
    [263, { ...size(1.14, 0.86), crouch: 2.2, smile: 1, earL: 0.45, earR: 0.45 }],
    [267, { ...size(0.97, 1.04), smile: 1, lid: 0.25, tilt: 0.1 }],
    [270, { pitch: 0.3, nod: 0.25, blink: 1, smile: 1, earL: 0.5, earR: 0.5 }],
    [273, { smile: 0.6 }], [276, {}]],
  // Dream sand.
  trick_b: [[0, {}],
    [4, { gaze: 0.2, smile: 0.6, earL: -0.3, earR: -0.3, lift: 0.3 }],
    [10, { gaze: 0.2, smile: 1, lid: 0.25, tilt: 0.1 }],
    [16, { gaze: 0.22, smile: 1, lid: 0.3, tilt: 0.12 }],
    // Rummages in the pouch, peering in, for the right pinch.
    [19, { ...R(3.6, 6.8, 6.8), gripR: 1, sand: 1, gaze: 0.05, nod: 0.25, lookY: -0.6, earL: -0.2, earR: -0.2 }],
    [23, { ...R(3.4, 6.8, 6.2), gripR: 1, sand: 1, gaze: 0.05, nod: 0.3, lookY: -0.65, earL: 0.1, earR: -0.2 }],
    [26, { ...R(3.8, 6.6, 7.0), gripR: 1, sand: 1, gaze: 0.05, nod: 0.28, lookY: -0.6, earL: -0.2, earR: 0.1, tilt: 0.08 }],
    [29, { ...R(3.4, 6.8, 6.0), gripR: 1, sand: 1, gaze: 0.05, nod: 0.32, lookY: -0.7, earL: 0.1, earR: 0.15, tilt: -0.06 }],
    [32, { ...R(3.6, 6.8, 6.6), gripR: 1, sand: 1, gaze: 0.05, nod: 0.3, lookY: -0.6, earL: -0.1, earR: -0.1 }],
    // Shows the glittering pinch to the viewer and wiggles it.
    [35, { ...R(7, 4, 11), pinch: 1, sand: 0.4, gaze: 0.1, nod: 0.05, smile: 1 }],
    [39, { ...R(9, 4.5, 13), pinch: 1, gaze: 0.25, smile: 1, lid: 0.35, tilt: 0.1 }],
    [43, { ...R(9.2, 4.2, 13.4), pinch: 1, gaze: 0.25, smile: 1, lid: 0.35, tilt: -0.1, cheek: 0.6 }],
    [46, { ...R(8.8, 4.6, 12.8), pinch: 1, gaze: 0.25, smile: 1, lid: 0.38, tilt: 0.1, cheek: 0.6 }],
    [49, { ...R(9.2, 4.2, 13.4), pinch: 1, gaze: 0.25, smile: 1, lid: 0.4, tilt: -0.08, cheek: 0.8 }],
    // A long breath in, then the blow.
    [56, { ...R(8.5, 4.4, 14.5), pinch: 1, lift: 0.8, puff: 0.6, cheek: 0.6, pitch: -0.08, earL: -0.25, earR: -0.25, gaze: 0.2 }],
    [66, { ...R(8.5, 4.4, 15.5), pinch: 1, lift: 1.4, puff: 1, cheek: 1.2, pitch: -0.14, earL: -0.4, earR: -0.4, gaze: 0.2 }],
    [70, { ...R(8.5, 4.4, 15.6), pinch: 1, lift: 1.5, puff: 1.05, cheek: 1.25, pitch: -0.15, earL: -0.45, earR: -0.45, gaze: 0.2 }],
    [72, { ...R(9.6, 3.6, 16), pinch: 0.4, lift: 0.6, pitch: 0.2, lean: 1.2, mouth: 0.45, cheek: 0.2, earL: 0.25, earR: 0.25, gaze: 0.25, blow: 0.05 }],
    [80, { ...R(9.8, 3.6, 15.5), lift: 0.4, pitch: 0.16, lean: 1.0, mouth: 0.4, earL: 0.2, earR: 0.2, gaze: 0.25, blow: 0.75, smile: 0.6, lids: 0.25 }],
    [84, { ...R(8, 4, 12), smile: 1, gaze: 0.25, blow: 1, lids: 0.6 }],
    // The viewer fights the sleep: the lids sag, lift, sag again, and close.
    [88, { smile: 1, gaze: 0.25, lids: 0.3, lid: 0.3, tilt: 0.1 }],
    [93, { smile: 1, gaze: 0.25, lids: 0.75, lid: 0.35, tilt: 0.1 }],
    [97, { smile: 1, gaze: 0.25, lids: 0.5, lid: 0.4, tilt: -0.06, cheek: 0.6 }],
    [102, { smile: 1, gaze: 0.25, lids: 0.95, lid: 0.4 }],
    [104, { lids: 1, hidden: 1, noShadow: 1 }],
    [138, { lids: 1, zzz: 0.75, hidden: 1, noShadow: 1 }],
    // The lids open on him hanging from the top rail: a look round, a wave, a gulp at the drop, the umbrella opens.
    [139, { lids: 1, zzz: 0.78, ...hanging(0), lid: 0.3 }],
    [146, { lids: 1, zzz: 1, ...hanging(0), lid: 0.3 }],
    [150, { lids: 0.45, ...hanging(1), lid: 0.3 }],
    [154, { lids: 0.85, ...hanging(-1) }],
    [158, { lids: 0.2, ...hanging(0.6), gaze: -0.3, lookX: -0.6 }],
    [162, { lids: 0, ...hanging(-0.4), gaze: 0.3, lookX: 0.6 }],
    [166, { ...hanging(1.2, true), mouth: 0.4, gaze: 0.3 }],
    [169, { ...hanging(-1.2, true), mouth: 0.4, gaze: 0.3 }],
    [172, { ...hanging(1.0, true), mouth: 0.4, gaze: 0.3 }],
    [175, { ...hanging(-0.4), lookY: -0.7, nod: 0.2, gaze: 0.1 }],
    [178, { ...hanging(0), wide: 0.6, earL: -0.4, earR: -0.4, lookY: -0.5 }],
    [181, { overAll: 1, noShadow: 1, dx: HANG.dx, dy: HANG.dy + 10, ...L(2.5, -5, 21), ...UP, umbOpen: 1, point: 0.6, smile: 1, mouth: 0.6, wide: 0.6, earL: -0.5, earR: -0.5, capeLift: 3 }],
    // A slow, swaying float down with a wave on the way.
    [192, { overAll: 1, noShadow: 1, dx: HANG.dx - 6, dy: HANG.dy + 26, ...L(2, -1.4, 23), ...UP, umbOpen: 1, point: 0.5, drift: -1, roll: -0.05, smile: 1, earL: -0.3, earR: -0.3, capeLift: 2 }],
    [204, { dx: HANG.dx + 5, dy: HANG.dy + 46, ...L(2, -1.4, 23), ...R(5, 11, 21), ...UP, umbOpen: 1, point: 0.45, drift: 1, roll: 0.05, smile: 1, mouth: 0.4, capeLift: 1.8 }],
    [210, { dx: HANG.dx + 3, dy: HANG.dy + 56, ...L(2, -1.4, 23), ...R(5, 9, 15), ...UP, umbOpen: 1, point: 0.4, drift: 0.4, roll: 0.02, smile: 1, mouth: 0.4, capeLift: 1.6 }],
    [216, { dx: HANG.dx - 3, dy: HANG.dy + 66, ...L(2, -1.4, 23), ...R(5, 11, 21), ...UP, umbOpen: 1, point: 0.35, drift: -1, roll: -0.05, smile: 1, capeLift: 1.4 }],
    [224, { dx: HANG.dx + 1, dy: HANG.dy + 82, ...L(2, -1.4, 23), ...UP, umbOpen: 1, point: 0.3, drift: 0.6, roll: 0.03, smile: 1, capeLift: 1.2 }],
    [229, { dx: HANG.dx, dy: HANG.dy + 94, ...L(2, -1.4, 23), ...UP, umbOpen: 1, point: 0.2, smile: 1, capeLift: 1 }],
    [231, { dy: 0, crouch: 2.2, ...size(1.12, 0.88), ...L(2, -1.4, 21), ...UP, umbOpen: 1, smile: 1, earL: 0.4, earR: 0.4 }],
    [235, { ...size(0.97, 1.04), ...L(2, -1.4, 22), ...UP, umbOpen: 1, smile: 1, earL: -0.2, earR: -0.2 }],
    [241, { ...L(6.5, -6.5, 9.5), umbOpen: 0, umbSpin: 4.2, smile: 1, lid: 0.25, tilt: 0.1 }],
    [247, { smile: 1, umbSpin: TAU, lookX: 0.7, lid: 0.45, cheek: 0.8 }],
    [255, { smile: 1, umbSpin: TAU, lookX: 0.7, lid: 0.45, cheek: 0.8 }],
    [259, { smile: 0.6, umbSpin: TAU }], [264, { umbSpin: TAU }]],
  // Awakening: a slow yawn, a fistful of sand thrown up, it rains on him, he rises and spins faster and faster in the
  // sand whirl (the spin is on the twist lane), the cape turns inside out, a burst, the second form hovers.
  phase: [[0, {}],
    [6, { mouth: 0.4, lid: 0.4, earL: 0.2, earR: 0.2, lift: 0.4, ...size(0.98, 1.03) }],
    [14, { mouth: 1, blink: 1, earL: 0.5, earR: 0.5, nod: -0.2, lift: 0.8, ...size(0.96, 1.05), tailCurl: 0.3 }],
    [20, { crouch: 0.8, mouth: 0.2, lid: 0.5, earL: 0.3, earR: 0.3, nod: 0.05 }],
    [24, { crouch: 1.0, ...R(3.6, 6.8, 6.8), gripR: 1, sand: 1, lid: 0.3, nod: 0.2, lookY: -0.5, earL: 0.1, earR: 0.1 }],
    [28, { crouch: 1.2, ...R(3.4, 6.8, 6.2), gripR: 1, sand: 1, lid: 0.3, nod: 0.22, lookY: -0.55, earL: 0.15, earR: 0.15 }],
    [31, { crouch: 0.4, ...R(4, 9, 22, 1), pinch: 1, gaze: 0.1, nod: -0.25, lookY: 0.8, smile: 1 }],
    [36, { lift: 0.8, ...R(4, 9, 20, 0.8), blink: 1, smile: 1, nod: -0.2, lookY: 0.6, earL: -0.2, earR: -0.2 }],
    [40, { lift: 1.5, ...R(3, 7, 22, 1.5), ...L(3, -7, 20, 1.5), ...UP, umbFree: 1, umbX: 3, umbY: -7, umbZ: HIP + 21.5, blink: 1, smile: 1, capeLift: 1.6 }],
    [46, { tailCurl: 0.6, lift: 2.6, ...R(3, 10, 15, 2.6), ...L(3, -10, 15, 2.6), umbFree: 1, umbX: 1, umbY: 0, umbZ: 45, umbOpen: 0.4, ...UP, blink: 1, smile: 1, capeLift: 2.6, flare: 1 }],
    [52, { tailCurl: 0.6, lift: 3.6, ...R(3, 10, 15, 3.6), ...L(3, -10, 15, 3.6), umbFree: 1, umbX: 0, umbY: 0, umbZ: 46, umbOpen: 0.8, umbF: 0.42, umbS: 0.55, blink: 1, capeLift: 3.6, flare: 1.8 }],
    [57, { tailCurl: 0.6, lift: 4.2, form: 0.2, ...R(3, 10, 15, 4.2), ...L(3, -10, 15, 4.2), umbFree: 1, umbX: -1, umbY: 0, umbZ: 46.5, umbOpen: 1, umbF: 0.42, umbS: 0.55, blink: 1, capeLift: 4.2, flare: 2.2 }],
    [61, { tailCurl: 0.6, lift: 4.5, form: 0.42, ...R(3, 10, 15, 4.5), ...L(3, -10, 15, 4.5), umbFree: 1, umbX: -1, umbY: 0, umbZ: 46.5, umbOpen: 1, umbF: 0.42, umbS: 0.55, blink: 1, capeLift: 4.5, flare: 2.4, sheepR: -1 }],
    [64, { tailCurl: 0.6, lift: 4.6, form: 0.62, ...R(3, 10, 15, 4.6), ...L(3, -10, 15, 4.6), umbFree: 1, umbX: -1, umbY: 0, umbZ: 46.5, umbOpen: 1, umbF: 0.42, umbS: 0.55, blink: 1, capeLift: 4.6, flare: 2.4, sheepR: -5 }],
    [67, { tailCurl: 0.6, lift: 4.6, form: 0.8, ...R(3, 10, 15, 4.6), ...L(3, -10, 15, 4.6), umbFree: 1, umbX: -1, umbY: 0, umbZ: 46.5, umbOpen: 1, umbF: 0.42, umbS: 0.55, blink: 1, capeLift: 4.6, flare: 2.4, sheepR: -6 }],
    [70, { tailCurl: 0.6, lift: 4.4, form: 0.93, ...R(3, 10, 15, 4.4), ...L(3, -10, 15, 4.4), umbFree: 1, umbX: -1, umbY: 0, umbZ: 46, umbOpen: 1, umbF: 0.42, umbS: 0.55, capeLift: 4.4, flare: 2, sheepR: -3, wide: 0.5 }],
    [72, f2({ umbZ: 45, lift: 3, ...R(4, 12, 16, 3), ...L(4, -12, 16, 3), wide: 1, mouth: 0.6, earL: -0.5, earR: -0.5, flash: 0.25, sheepR: 4, sheepZ: 4, capeLift: 3, flare: 1.4 })],
    [76, f2({ umbZ: 44, lift: 2, ...R(4, 12, 15, 2), ...L(4, -12, 15, 2), wide: 1, mouth: 0.4, earL: -0.45, earR: -0.45, sheepR: 2, sheepZ: 2, capeLift: 2 })],
    [82, f2({ ...R(5, 8, 12), ...L(5, -8, 12), smile: 1, sheepR: 0 })],
    [88, f2({ smile: 0.6 })],
    [96, f2({})]],
  // Counting sheep: he rubs his paws, builds a sand fence post by post, steps back to admire it, claps for the flock;
  // two sheep jump and he counts them, yawning; he dozes off, the third bonks the fence, he jolts awake and giggles,
  // it jumps high; he jumps it himself as number four, a bow and a wink; the fence crumbles, two hops home.
  'trick-f2': [[0, f2({})],
    [4, f2({ yaw: -0.25, crouch: 1.2, gaze: -0.2, lookX: -0.6, smile: 1, lid: 0.2, earL: -0.3, earR: 0.1, ...R(6, 4, 9) })],
    [8, f2({ yaw: -0.2, ...L(6, -1.3, 14), ...R(6, 1.3, 14), gaze: 0.1, smile: 1, mouth: 0.3, lid: 0.25, tilt: 0.08, earL: -0.3, earR: -0.3 })],
    [10, f2({ yaw: -0.2, ...L(6, -2.4, 14.4), ...R(6, 2.4, 13.6), gaze: 0.1, smile: 1, lid: 0.25, tilt: -0.06, earL: -0.25, earR: -0.35 })],
    [12, f2({ yaw: -0.2, ...L(6, -1.3, 13.6), ...R(6, 1.3, 14.4), gaze: 0.1, smile: 1, mouth: 0.3, lid: 0.25, tilt: 0.08, earL: -0.35, earR: -0.25 })],
    [16, f2({ yaw: -0.5, crouch: 0.8, gaze: -0.1, lookX: -0.5, smile: 1, ...R(9, 1, 11), ...L(8, -4, 12), sand: 1, earL: -0.4, earR: -0.1 })],
    // One flick of the paws for every post.
    ...[0, 1, 2, 3, 4].flatMap((n): Track => [
      [20 + 6 * n, f2({ yaw: -0.52, lean: 0.35, roll: -0.03, gaze: -0.1, lookX: -0.6 + 0.06 * n, ...R(10.5, -0.5 + 0.8 * n, 12.5), ...L(9.5, -5.5 + 0.6 * n, 13), sand: 1, smile: 1, mouth: 0.3, earL: -0.45, earR: -0.15 })],
      [23 + 6 * n, f2({ yaw: -0.5, lean: 0.15, gaze: -0.1, lookX: -0.55 + 0.06 * n, ...R(9, 0.5 + 0.6 * n, 11), ...L(8, -4.5 + 0.4 * n, 12), sand: 1, smile: 0.9, earL: -0.35, earR: -0.1 })],
    ]),
    [49, f2({ yaw: -0.3, lean: -0.5, ...L(4.5, -8.5, 9), ...R(4.5, 8.5, 9), smile: 1, gaze: -0.3, lookX: -0.6, earL: -0.2, earR: -0.2, ...size(0.98, 1.03) })],
    [56, f2({ yaw: -0.3, lean: -0.5, ...L(4.5, -8.5, 9), ...R(4.5, 8.5, 9), smile: 1, lid: 0.2, nod: 0.15, gaze: -0.3, lookX: -0.6, earL: -0.15, earR: -0.25 })],
    // Two claps call the flock.
    [58, f2({ ...L(6, -4, 14), ...R(6, 4, 14), gaze: 0.1, smile: 1, earL: -0.3, earR: -0.3 })],
    [60, f2({ ...L(6, -1.3, 14), ...R(6, 1.3, 14), gaze: 0.1, smile: 1, mouth: 0.5, earL: -0.45, earR: -0.45 })],
    [62, f2({ ...L(6, -4, 14), ...R(6, 4, 14), gaze: 0.1, smile: 1, earL: -0.3, earR: -0.3 })],
    [64, f2({ ...L(6, -1.3, 14), ...R(6, 1.3, 14), gaze: 0.1, smile: 1, mouth: 0.5, earL: -0.45, earR: -0.45 })],
    [66, f2({ ...L(6, -4, 14), ...R(6, 4, 14), gaze: -0.4, lookX: -0.7, smile: 1, earL: -0.3, earR: -0.3 })],
    // «Раз»…
    [70, f2({ ...L(7, -10.5, 18), gaze: -0.35, lookX: -0.7, smile: 0.8, earL: -0.2 })],
    [76, f2({ ...L(7, -10.5, 19), gaze: -0.55, lookX: -0.8, nod: 0.14, smile: 1, mouth: 0.3, lid: 0.15 })],
    [84, f2({ ...L(7, -10.5, 18), gaze: -0.62, lookX: -0.8, nod: 0.04, lid: 0.25, smile: 0.6 })],
    // …«два», the lids grow heavy.
    [88, f2({ crouch: 0.6, gaze: -0.2, lookX: -0.4, mouth: 0.55, lid: 0.45, earL: 0.25, earR: 0.25, ...R(7.6, 2.6, 17) })],
    [93, f2({ gaze: -0.3, lookX: -0.6, lid: 0.4, earL: 0.2, earR: 0.2, ...L(7, -10.5, 17) })],
    [100, f2({ gaze: -0.55, lookX: -0.8, nod: 0.18, lid: 0.45, smile: 0.6, mouth: 0.2, ...L(7, -10.5, 18) })],
    [108, f2({ gaze: -0.6, lookX: -0.7, nod: 0.12, lid: 0.55, ...L(7, -10.5, 16), earL: 0.35, earR: 0.35 })],
    // A huge yawn, he dozes off standing, the third sheep bonks the fence, he jolts awake.
    [113, f2({ lift: 0.8, pitch: -0.1, mouth: 1, blink: 1, ...R(7.6, 2.6, 17.4, 0.8), earL: 0.5, earR: 0.5, nod: -0.15 })],
    [118, f2({ crouch: 1.2, nod: 0.32, blink: 1, earL: 0.8, earR: 0.8, drift: 0.6, roll: 0.05, tailCurl: 0.3 })],
    [122, f2({ crouch: 1.4, nod: 0.36, blink: 1, earL: 0.85, earR: 0.85, drift: -0.5, roll: -0.04, tailCurl: 0.3 })],
    [126, f2({ crouch: 1.3, nod: 0.3, blink: 1, earL: 0.8, earR: 0.8, drift: 0.4, roll: 0.03, tailCurl: 0.3 })],
    [129, f2({ umbZ: 44.4, jump: 2.4, gaze: -0.5, lookX: -0.8, wide: 1, mouth: 0.6, earL: -0.3, earR: -0.3, ...L(6, -9, 16), ...R(6, 9, 16), tailCurl: 0.6, puff: 1 })],
    [133, f2({ crouch: 0.6, gaze: -0.45, lookX: -0.8, wide: 0.6, earL: -0.4, earR: -0.4, mouth: 0.3 })],
    [137, f2({ ...R(7.6, 2.6, 17), blink: 1, smile: 1, gaze: 0.1, tilt: 0.1, lift: 0.4, earL: 0.1, earR: 0.1 })],
    [139, f2({ ...R(7.6, 2.6, 16.6), blink: 1, smile: 1, gaze: 0.1, tilt: -0.08, lift: -0.2 })],
    [141, f2({ ...R(7.6, 2.6, 17), blink: 1, smile: 1, gaze: 0.1, tilt: 0.1, lift: 0.4 })],
    [143, f2({ ...R(7.6, 2.6, 16.6), blink: 1, smile: 1, gaze: 0.1, tilt: -0.08, lift: -0.2 })],
    [145, f2({ ...R(7.6, 2.6, 17), blink: 1, smile: 1, gaze: 0.1, tilt: 0.1, lift: 0.4 })],
    [147, f2({ ...R(7.6, 2.6, 16.6), blink: 1, smile: 1, gaze: 0.1, tilt: -0.08, lift: -0.2 })],
    [150, f2({ gaze: -0.4, lookX: -0.7, smile: 0.8, earL: -0.3, earR: -0.3 })],
    // Applause for the high jump, «три».
    [156, f2({ ...L(6, -4, 14), ...R(6, 4, 14), gaze: -0.5, lookX: -0.8, smile: 1, earL: -0.4, earR: -0.4 })],
    [158, f2({ ...L(6, -1.3, 14), ...R(6, 1.3, 14), gaze: -0.55, lookX: -0.8, smile: 1, mouth: 0.5, earL: -0.5, earR: -0.5 })],
    [160, f2({ ...L(6, -4, 14), ...R(6, 4, 14), gaze: -0.5, lookX: -0.7, smile: 1 })],
    [162, f2({ ...L(6, -1.3, 14), ...R(6, 1.3, 14), gaze: -0.55, lookX: -0.8, smile: 1, mouth: 0.5, earL: -0.5, earR: -0.5 })],
    [165, f2({ ...L(7, -10.5, 18), gaze: -0.5, lookX: -0.8, smile: 1, mouth: 0.3, nod: 0.1 })],
    [168, f2({ ...L(7, -10.5, 18.4), gaze: -0.5, lookX: -0.8, smile: 1, nod: 0.06 })],
    // He backs up, wiggles and jumps the fence himself.
    [172, f2({ yaw: -0.7, crouch: 3.2, ...size(1.1, 0.9), lean: -0.6, ...L(-2, -7, 8), ...R(-2, 7, 8), smile: 1, earL: 0.4, earR: 0.4, tailSway: 0.3 })],
    [176, f2({ yaw: -0.7, crouch: 3.3, ...size(1.11, 0.89), lean: -0.65, ...L(-2.5, -7, 7.5), ...R(-2.5, 7, 7.5), smile: 1, earL: 0.45, earR: 0.4, tailSway: -0.4, drift: -0.5 })],
    [179, f2({ yaw: -0.7, crouch: 3.4, ...size(1.12, 0.88), lean: -0.7, ...L(-3, -7, 7), ...R(-3, 7, 7), smile: 1, earL: 0.45, earR: 0.45, tailSway: 0.4, drift: 0.4 })],
    [182, f2({ umbZ: 50, yaw: -0.7, jump: 8, tuck: 0.5, ...size(0.92, 1.12), pitch: 0.2, ...L(6, -9, 14, 8), ...R(6, 9, 14, 8), earL: -0.6, earR: -0.6, mouth: 0.5, smile: 1, capeLift: 2 })],
    [185, f2({ umbZ: 59, yaw: -0.7, jump: 17, tuck: 1, pitch: 0.35, ...L(5, -10, 12, 17), ...R(5, 10, 12, 17), earL: -0.5, earR: -0.5, mouth: 0.6, smile: 1, capeLift: 3 })],
    [188, f2({ umbZ: 49, yaw: -0.7, jump: 7, tuck: 0.6, pitch: 0.1, ...L(5, -9.5, 12, 7), ...R(5, 9.5, 12, 7), earL: -0.2, earR: -0.2, smile: 1, capeLift: 2 })],
    [190, f2({ yaw: -0.4, crouch: 3, ...size(1.14, 0.86), earL: 0.55, earR: 0.55, smile: 1, capeLift: 1 })],
    [193, f2({ yaw: -0.1, lift: 0.8, ...L(5, -11, 21, 0.8), ...R(5, 11, 21, 0.8), smile: 1, mouth: 0.6, earL: -0.4, earR: -0.4, ...size(0.97, 1.04) })],
    [197, f2({ yaw: 0.1, ...L(5, -11, 20), ...R(5, 11, 20), smile: 1, mouth: 0.4, gaze: 0.25, lookX: 0.6, earL: -0.35, earR: -0.35 })],
    [199, f2({ yaw: 0.1, ...L(5, -11, 20), ...R(5, 11, 20), smile: 1, gaze: 0.3, lookX: 0.7, tilt: 0.14, lid: 0.45, cheek: 0.8, earL: -0.2, earR: -0.4 })],
    [206, f2({ yaw: 0.1, ...L(5, -10.5, 19.5), ...R(5, 10.5, 19.5), smile: 1, gaze: 0.3, lookX: 0.7, tilt: 0.14, lid: 0.45, cheek: 0.8, earL: -0.2, earR: -0.4 })],
    // The fence crumbles under his nose: a look down, a shrug.
    [211, f2({ yaw: 0.3, crouch: 1.6, ...L(6, -9, 12), ...R(6, 9, 12), gaze: -0.5, lookY: -0.6, lookX: -0.5, earL: 0.3, earR: 0.3, smile: 0.6, mouth: 0.3 })],
    [217, f2({ yaw: 0.3, lift: 0.6, ...L(5, -10, 15, 0.6), ...R(5, 10, 15, 0.6), gaze: 0.2, lookX: 0.4, tilt: 0.12, smile: 1, mouth: 0.3, earL: 0.1, earR: 0.3 })],
    [222, f2({ yaw: 0.5, crouch: 2.2, ...size(1.08, 0.92), smile: 1, earL: 0.4, earR: 0.4 })],
    [226, f2({ umbZ: 50, yaw: 0.5, jump: 8, tuck: 0.8, smile: 1, earL: -0.3, earR: -0.3, capeLift: 1.5 })],
    [229, f2({ yaw: 0.5, crouch: 2.2, ...size(1.08, 0.92), smile: 1, earL: 0.4, earR: 0.4 })],
    [232, f2({ yaw: 0.45, crouch: 2.0, ...size(1.06, 0.94), smile: 1, earL: 0.35, earR: 0.35 })],
    [235, f2({ umbZ: 50, yaw: 0.4, jump: 8, tuck: 0.8, smile: 1, earL: -0.3, earR: -0.3, capeLift: 1.5 })],
    [238, f2({ yaw: 0.2, crouch: 2.4, ...size(1.1, 0.9), smile: 1, earL: 0.45, earR: 0.45 })],
    [244, f2({ ...size(0.98, 1.03), smile: 0.6, lid: 0.2 })], [252, f2({})]],
  // Umbrella flight: eyes the floating umbrella, bounces, jumps and grabs it, kicks his feet as it lifts him, flies off
  // small across the sky, pirouettes in front of the moon (the twist lane), swoops at the glass, waves, boops the glass
  // with his nose, giggles; a gust pulls him up out of the frame; a slow swaying descent from the sky; he lets go.
  'trick_b-f2': [[0, f2({})],
    [4, f2({ crouch: 2.2, gaze: 0.2, nod: -0.35, lookY: 0.9, lookX: 0.4, earL: 0.4, earR: 0.4, smile: 1, umbX: 3, umbY: 12, umbZ: 33, umbF: 0.3, umbS: 0.4 })],
    [9, f2({ lift: 0.6, ...size(0.97, 1.04), gaze: 0.2, nod: -0.35, lookY: 0.9, lookX: 0.4, earL: -0.3, earR: -0.3, smile: 1, mouth: 0.3, umbX: 2.5, umbY: 11.5, umbZ: 34.5, umbF: 0.3, umbS: 0.4 })],
    [13, f2({ crouch: 2.4, ...size(1.06, 0.94), gaze: 0.2, nod: -0.35, lookY: 0.9, lookX: 0.4, earL: 0.45, earR: 0.45, smile: 1, umbX: 1.8, umbY: 10.8, umbZ: 35.5, umbF: 0.3, umbS: 0.4 })],
    [17, f2({ crouch: 3.0, ...size(1.1, 0.9), gaze: 0.2, nod: -0.35, lookY: 0.9, lookX: 0.4, earL: 0.5, earR: 0.5, smile: 1, umbX: 1.5, umbY: 10.5, umbZ: 36, umbF: 0.3, umbS: 0.4 })],
    [19, flying({ jump: 6, ...R(1.5, 10.5, 19.5, 6), ...L(5, -9, 14, 6), ...size(0.94, 1.08), nod: -0.2, lookY: 0.5, earL: -0.5, earR: -0.5, mouth: 0.4, noShadow: 0 })],
    [23, flying({ mouth: 0.5, capeLift: 2, gaze: 0.3, lookX: 0.4, ...footL(3, -3, 1.4), ...footR(0, 4, 3) })],
    [26, flying({ mouth: 0.6, gaze: 0.3, lookX: 0.4, ...footL(0, -3, 3), ...footR(3, 4, 1.4) })],
    [29, flying({ mouth: 0.5, gaze: 0.3, lookX: 0.4, ...footL(3, -3, 1.4), ...footR(0, 4, 3) })],
    [32, flying({ mouth: 0.5, capeLift: 2 })],
    [46, flying({ ...size(0.72), drift: 1, roll: 0.06, gaze: 0.3, lookX: 0.6, ...footL(0, -3, 3), ...footR(4, 4, 1.4) })],
    [60, flying({ ...size(0.5), drift: -1, roll: -0.06, ...footL(4, -3, 1.4), ...footR(0, 4, 3) })],
    [76, flying({ ...size(0.46), yaw: 0.6, drift: 1, roll: 0.06, ...footL(0, -3, 3), ...footR(4, 4, 1.4), mouth: 0.6 })],
    [92, flying({ ...size(0.46), drift: -0.4, ...footL(2, -3, 2), ...footR(2, 4, 2), mouth: 0.4 })],
    [102, flying({ ...size(0.46), ...footL(1, -3, 2.6), ...footR(3, 4, 1.6), mouth: 0.6, earL: -0.4, earR: -0.4 })],
    [112, flying({ ...size(0.46), drift: 0.4, ...footL(2, -3, 2), ...footR(2, 4, 2) })],
    [116, flying({ ...size(0.5), yaw: 0.4, pitch: 0.2, ...footL(2, -3, 2), ...footR(2, 4, 2), earL: -0.6, earR: -0.6 })],
    [120, flying({ overAll: 1, ...size(0.9), yaw: 0.2, pitch: 0.3, earL: -0.65, earR: -0.65, mouth: 0.7, wide: 0.6, capeLift: 3 })],
    [126, flying({ overAll: 1, ...size(1.62), pitch: 0.1, earL: -0.5, earR: -0.5, mouth: 0.6, wide: 0.6, capeLift: 2.4 })],
    [132, flying({ overAll: 1, ...size(1.6), ...L(5, -10, 19, 7), gaze: 0.25, lookX: 0.6, tilt: 0.12, mouth: 0.5, ...footL(1, -3, 3), ...footR(4, 4, 1.4) })],
    [135, flying({ overAll: 1, ...size(1.6), ...L(5, -12, 14, 7), gaze: 0.25, lookX: 0.6, tilt: 0.12, lid: 0.45, cheek: 0.8, ...footL(4, -3, 1.4), ...footR(1, 4, 3) })],
    [138, flying({ overAll: 1, ...size(1.6), ...L(5, -10, 19, 7), gaze: 0.25, lookX: 0.6, tilt: 0.12, lid: 0.45, cheek: 0.8, ...footL(1, -3, 3), ...footR(4, 4, 1.4) })],
    [141, flying({ overAll: 1, ...size(1.6), ...L(5, -12, 14, 7), gaze: 0.25, lookX: 0.6, tilt: 0.12, mouth: 0.5, ...footL(4, -3, 1.4), ...footR(1, 4, 3) })],
    [144, flying({ overAll: 1, ...size(1.6), gaze: 0.2, lookX: 0.3, smile: 1, ...footL(2, -3, 2), ...footR(2, 4, 2) })],
    // A boop on the glass with the nose.
    [148, flying({ overAll: 1, ...size(1.62), pitch: 0.22, gaze: 0.1, smile: 1, cheek: 0.6, earL: -0.4, earR: -0.4 })],
    [150, flying({ overAll: 1, ...size(1.74, 1.5), pitch: 0.3, blink: 1, smile: 1, cheek: 1, flash: 0.25, earL: 0.4, earR: 0.4 })],
    [153, flying({ overAll: 1, ...size(1.6), pitch: 0, wide: 0.6, mouth: 0.5, earL: -0.5, earR: -0.5 })],
    [156, flying({ overAll: 1, ...size(1.6), blink: 1, smile: 1, tilt: 0.1, lift: 0.4 })],
    [159, flying({ overAll: 1, ...size(1.6), blink: 1, smile: 1, tilt: -0.08, lift: -0.2 })],
    [162, flying({ overAll: 1, ...size(1.6), blink: 1, smile: 1, tilt: 0.1, lift: 0.4 })],
    [165, flying({ overAll: 1, ...size(1.6), blink: 1, smile: 1, tilt: -0.08, lift: -0.2 })],
    [170, flying({ overAll: 1, ...size(1.6), gaze: 0.25, lookX: 0.6, smile: 1, lid: 0.3, ...footL(1, -3, 3), ...footR(4, 4, 1.4) })],
    // A gust pulls him up out of the frame.
    [176, flying({ overAll: 1, ...size(1.6), crouch: 1, ...footL(2, -3, 2), ...footR(2, 4, 2), mouth: 0.6, wide: 0.5, earL: -0.6, earR: -0.6 })],
    [181, flying({ overAll: 1, ...size(1.7), lift: 1, earL: -0.6, earR: -0.6, capeLift: 3, mouth: 0.6 })],
    [184, flying({ hidden: 1, ...size(1) })],
    [190, flying({ hidden: 1 })],
    [191, flying({ drift: 1, roll: 0.06, lookY: -0.4, nod: 0.1 })],
    [204, flying({ drift: -1, roll: -0.06, lookY: -0.5, nod: 0.12, ...footL(4, -3, 1.4), ...footR(0, 4, 3) })],
    [218, flying({ drift: 1, roll: 0.06, lookY: -0.5, nod: 0.12, gaze: 0.2, lookX: 0.4, smile: 1, ...footL(0, -3, 3), ...footR(4, 4, 1.4) })],
    [230, flying({ drift: -0.7, roll: -0.04, lookY: -0.6, nod: 0.15, noShadow: 0, ...footL(1, -3, 2.4), ...footR(3, 4, 2) })],
    [241, flying({ jump: 1, noShadow: 0, point: 0.4 })],
    [244, f2({ umbFree: 0, umbInR: 1, crouch: 1.2, ...size(1.12, 0.88), ...R(1.5, 10.5, 19), umbF: 0.3, umbS: 0.4, earL: 0.45, earR: 0.45, smile: 1 })],
    [246, f2({ umbFree: 1, crouch: 0.5, ...R(1.5, 10.5, 19), umbX: 1.5, umbY: 10.5, umbZ: HIP + 19, umbF: 0.3, umbS: 0.4, earL: 0.2, earR: 0.2, smile: 1, nod: -0.2, lookY: 0.6, lookX: 0.4 })],
    [248, f2({ ...R(3, 9.5, 13), umbX: 1.5, umbY: 10.5, umbZ: 37, umbF: 0.3, umbS: 0.4, smile: 1, nod: -0.3, lookY: 0.7, lookX: 0.4 })],
    [256, f2({ smile: 1, lid: 0.3, tilt: 0.1, gaze: 0.15 })],
    [264, f2({})]],
  // Show: floats down into the painting from above the frame under the open umbrella, swaying, waving, peering down;
  // lands, twirls shut with the umbrella and once more on his own (the twist lane), bows with a flourish, a wink.
  show: [[0, floating(-186, -1)], [12, floating(-160, 1, true)], [24, floating(-134, -1, true)], [36, floating(-108, 1, true)],
    [48, floating(-84, -1)], [58, floating(-58, 0.8, false, 0.3)], [68, floating(-34, -0.6, false, 0.6)], [76, floating(-14, 0.3, false, 0.8)],
    [83, floating(-3, 0, false, 0.8)],
    [86, { crouch: 2.4, ...size(1.14, 0.86), ...L(1.5, -10.5, 19), umbF: 0.3, umbS: 0.7, umbOpen: 1, smile: 1, earL: 0.45, earR: 0.45 }],
    [90, { ...L(2, -10.5, 20), umbF: 0.3, umbS: 0.7, umbOpen: 1, smile: 1, ...size(0.97, 1.04), earL: -0.3, earR: -0.3 }],
    [92, { ...L(3, -10, 18), umbF: 0.3, umbS: 0.6, umbOpen: 0.9, umbSpin: 1, smile: 1 }],
    [98, { ...L(5, -8.5, 14), umbF: 0.2, umbS: 0.3, umbOpen: 0.3, umbSpin: 6, smile: 1, mouth: 0.4, capeLift: 1.5, earL: -0.3, earR: -0.3 }],
    [104, { ...L(6.5, -6.5, 9.5), umbOpen: 0, umbSpin: 11, smile: 1, capeLift: 0.6 }],
    [109, { lift: 0.6, umbSpin: 4 * Math.PI, smile: 1, mouth: 0.4, capeLift: 1.6, earL: -0.3, earR: -0.3 }],
    [112, { crouch: 1.2, ...size(1.06, 0.94), umbSpin: 4 * Math.PI, smile: 1, earL: 0.3, earR: 0.3 }],
    [118, { pitch: 0.45, ...R(6, 1, 12), ...L(5, -11, 10), umbF: 0.9, umbS: 1.0, umbSpin: 4 * Math.PI, nod: 0.3, blink: 1, smile: 1, earL: 0.65, earR: 0.65, tailSway: 0.3 }],
    [128, { pitch: 0.48, ...R(6, 1, 12), ...L(5, -11.5, 9.5), umbF: 0.9, umbS: 1.0, umbSpin: 4 * Math.PI, nod: 0.32, blink: 1, smile: 1, earL: 0.7, earR: 0.7, tailSway: 0.35 }],
    [132, { lift: 0.6, umbSpin: 4 * Math.PI, ...size(0.97, 1.04), smile: 1, mouth: 0.4, earL: -0.3, earR: -0.3 }],
    [136, { umbSpin: 4 * Math.PI, lookX: 0.7, lid: 0.45, cheek: 0.8, smile: 1 }],
    [150, { umbSpin: 4 * Math.PI, lookX: 0.7, lid: 0.45, cheek: 0.8, smile: 1 }],
    [156, { umbSpin: 4 * Math.PI, smile: 0.5 }], [168, { umbSpin: 4 * Math.PI }]],
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
  // The spin-up of the shield: slow first, then faster and faster till the poof.
  trick: {
    umbSpin: [[72, 0], [80, 1.2], [87, 4], [93, 8.8], [97, 14], [99, 19], [100, 19]],
  },
  // Two turns in the sand whirl, accelerating, stopped dead by the burst.
  phase: {
    twist: [[40, 0], [46, Math.PI / 2], [52, Math.PI], [57, 1.5 * Math.PI], [61, 2 * Math.PI], [64, 2.5 * Math.PI], [67, 3 * Math.PI], [70, 3.5 * Math.PI], [72, 2 * TAU]],
  },
  'trick-f2': {
    sj0: [[66, 0], [70, 1], [90, 1], [96, 0]],
    su0: [[70, 0], [84, 1]],
    sj1: [[90, 0], [94, 1], [114, 1], [120, 0]],
    su1: [[94, 0], [108, 1]],
    sj2: [[118, 0], [122, 1], [170, 1], [176, 0]],
    su2: [[122, 0], [128, 0.4], [132, 0.22], [150, 0.22], [166, 1]],
    sh2: [[122, 0.45], [128, 0.45], [131, 0.01], [148, 0.01], [151, 1.6]],
    dizzy2: [[0, 0], [128, 1], [150, 0]],
    dx: [[182, 0], [190, OVER.dx], [222, OVER.dx], [229, OVER.dx / 2], [232, OVER.dx / 2], [238, 0]],
    dy: [[182, 0], [190, OVER.dy], [222, OVER.dy], [229, OVER.dy / 2], [232, OVER.dy / 2], [238, 0]],
  },
  'trick_b-f2': {
    dx: [[24, 0], [32, 0], [60, 56], [76, -20], [92, -96], [112, -90], [120, -64], [126, -12], [132, 0], [150, 4], [176, 6], [184, 10], [190, 10], [204, -8], [218, 10], [230, -6], [244, 0]],
    dy: [[19, 0], [24, -4], [32, -10], [46, -50], [60, -96], [76, -116], [92, -106], [112, -110], [120, -44], [126, 34], [132, 46], [150, 48], [178, 44], [184, -300], [190, -300], [191, -150], [204, -118], [218, -84], [230, -48], [239, -16], [244, 0]],
    // Two turns in front of the moon, easing in and out.
    twist: [[92, 0], [96, Math.PI / 2], [100, 1.5 * Math.PI], [104, 2.5 * Math.PI], [108, 3.5 * Math.PI], [112, 2 * TAU]],
  },
  // The twirl shut with the umbrella, then a quicker one on his own.
  show: {
    twist: [[90, 0], [92, 0.4], [98, Math.PI], [104, TAU], [106, TAU], [109, TAU + Math.PI], [112, 2 * TAU]],
  },
};
/** Lanes: single keys keyed on their own frames, eased on their own (or linear), laid over the main keys. */
type Lane = [number, number][];
const LINEAR = new Set(['su0', 'su1', 'su2', 'dx', 'dy', 'twist', 'umbSpin']);
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
