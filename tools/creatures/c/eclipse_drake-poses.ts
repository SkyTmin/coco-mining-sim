// Pose book of Зенит. Times are frames at 24 fps. Hand goals are written relative to the resting hip (forward, right,
// up) in the feet frame; `lift` follows the body when it rises. Foot goals place the raised heel (hock) of the
// digitigrade leg in feet units. The effect timelines in eclipse_drake-fx.ts read the beat constants exported here.
import { reach } from '../bodies/goals';
import { keyframer, somersault, type Lane, type Track } from '../kit/pet-moves';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';

/** Height of the hip joint above the stone at rest, rig units. */
export const HIP = 14;

export const clips: Record<string, { seconds: number; loop?: boolean }> = {
  ...everyday,
  look: { seconds: 1.5 },
  fidget_a: { seconds: 2.5 },
  fidget_b: { seconds: 2.5 },
  happy: { seconds: 2 },
  'happy-f2': { seconds: 2 },
  trick: { seconds: 11 },
  trick_b: { seconds: 11.5 },
  trick_c: { seconds: 11.5 },
  phase: { seconds: 5 },
  'idle-f2': { seconds: 2, loop: true },
  'trick-f2': { seconds: 12 },
  'trick_b-f2': { seconds: 11.5 },
  'trick_c-f2': { seconds: 12 },
  show: { seconds: 7 },
  peek: { seconds: 2.5 },
  hatch: { seconds: 3 },
  sleep: { seconds: 3, loop: true },
  sleep_in: { seconds: 1.5 },
  sleep_out: { seconds: 1.5 },
  wake_startled: { seconds: 1.2 },
};
export const TAU = Math.PI * 2;
export const hand = (name: 'L' | 'R', x: number, y: number, z: number) => reach('hand' + name, [x, y, z]);
export const L = (x: number, y: number, z: number, lift = 0) => hand('L', x, y, HIP + z + lift);
export const R = (x: number, y: number, z: number, lift = 0) => hand('R', x, y, HIP + z + lift);
export const footL = (x: number, y: number, z: number) => reach('footL', [x, y, z]);
export const footR = (x: number, y: number, z: number) => reach('footR', [x, y, z]);
/** Painted size relative to natural (the skin reads sx / sy as offsets from 1). */
export const size = (x: number, y = x) => ({ sx: x - 1, sy: y - 1 });
/** The eclipse form: indigo scales, black wings with a corona rim, the black sun in the chest; he flies (the skin adds
 * the wing beats and the hover bob on the clip clock). */
export const F2: JointPose = { form: 1, hover: 5, charge: 0.5 };
export const f2 = (p: JointPose): JointPose => ({ ...F2, ...p });
/** Asleep: lying on the dial, the wings over him like a tent, the tail round, the head under a wing. */
export const asleep: JointPose = { sleep: 1, blink: 1, tailCurl: 1, wingOpen: 0.3, wingSweep: 0.75, wingBeat: -0.25 };
/** Keys that switch at the key instead of fading. */
export const SWITCHES = new Set(['hidden', 'overAll', 'blink', 'noShadow', 'egg', 'mirrorsOn', 'pearlDark']);
/** Lane keys that run linearly (positions in flight, spins). */
export const LINEAR = new Set(['dx', 'dy', 'twist', 'pitch']);

/** Rest positions of the hands (match the skin's rest so a goal fading in does not jerk). */
const RH = (p: JointPose = {}): JointPose => ({ ...R(12.8, 5.6, 0.6), ...L(13.4, -3.8, 3.4), ...p });
/** Wings thrown wide, the near one a little higher. */
const WIDE: JointPose = { wingOpen: 1, wingBeat: 0.25 };
/** Feet: rest hocks in the feet frame (the skin's stand: x = -3 + stride ± 1, y = ±4.6, z = 5.4). */
const HOCK_R: [number, number, number] = [-2.0, 4.6, 5.4];
const HOCK_L: [number, number, number] = [-4.0, -4.6, 5.4];

/** Effect beats shared with the painter of effects. */
export const beats = {
  look: { shade: 8, glance: 22 },
  fidget_a: { nibbles: [18, 24, 30], scale: 31, clink: 44 },
  fidget_b: { yawn: 12, flame: 14, ring: 22, slap: 44 },
  happy: { clap: 8, launch: 11, land: 30, ring: 34 },
  wake_startled: { flash: 8 },
  sleep_out: { stretch: 18 },
  hatch: { crack: 8, rock: [14, 32], burst: 38, gone: 43, wings: 46, puff: 54 },
  peek: { flap: 5, gone: 9, hang: [18, 24], blink: 30, grin: 36, puff: 40, up: [46, 50], land: 54 },
  // Солнечный луч: wings snap open toward the sun, sunlight runs into the membranes, he rears with the neck drawn
  // back, the beam strikes the stone and is led in an arc across the dial to the viewer, up into the glass, the burn
  // spot cools; the recoil throws him back, he shakes his head, the wings fold with a snap; he walks home over the
  // groove that cools from orange to red to dark glass.
  trick: { gulps: [20, 34], snort: 223, pose: [234, 248], open: [0, 12], sun: [12, 40], rear: [40, 56], shot: 56, sweep: [60, 108], glass: [108, 122], off: 122, spotCool: 160, recoil: [130, 170], snap: 160, walk: [178, 238], cool: [170, 250] },
  // К зениту: crouch, the tail a spring, take off (dust ring), up out of the painting; far away a small dark shape
  // crosses the sun, loops, becomes a spark; the spark grows into a comet diving at the viewer, the huge wings and fire
  // pass over the whole painting; he circles back in from the upper left, skids to a landing (shock ring, molten
  // cracks), roars at the sky under falling embers, folds the wings and walks home; the cracks cool and vanish.
  trick_b: { crouch: [0, 20], launch: 22, gone: 40, far: [40, 90], comet: [90, 100], pass: [100, 112], back: [112, 130], land: 130, roar: [140, 184], roarFront: 166, shake: [186, 198], walk: [204, 252], cool: [140, 262] },
  // Зеркала зенита: a tail strike raises three crystal mirrors out of the hour marks; he turns to the first, a beam
  // into it, reflected behind him into the second, into the third, back into the pearl — a triangle of light; he turns
  // slowly inside it while the pearl charges; rears, the triangle shrinks into the pearl, the mirrors crack; the solar
  // flash; the mirrors fall to golden dust, the marks smoulder and go out.
  trick_c: { strike: 8, rise: [8, 24], turn: [24, 40], beam: [40, 48], hold: [48, 120], packets: [64, 82, 100], rear: [120, 130], flash: 130, dust: [132, 200], marks: [132, 270], sniff: 185 },
  // Затмение: head to the sun, a roar; the moon slides over the sun; its shadow runs across the scene, stars; he opens
  // the wings and rises; totality at 56 (the pearl goes black); the scales flip in a wave 60–90; shock wave; flight.
  phase: { roar: [4, 20], moon: [6, 56], shadow: [20, 50], rise: [24, 50], total: 56, flip: [60, 90], wave: 92, flight: [92, 120] },
  'happy-f2': { loop: [10, 34], roar: 36 },
  // Вихрь короны: ribbons of corona drawn from the black sun, six whips, one slow turn, three turns faster and faster
  // (the whips a tornado, their tips lash the stone — silver arcs), a dead stop, the whips wrap him, he lunges at the
  // glass and roars — the corona ring hits the glass; sparks fade, the arcs cool.
  'trick-f2': { draw: [0, 30], whips: 30, turns: [30, 140], lashes: [] as number[], stop: 140, lunge: [140, 150], ring: 146, back: [176, 200], release: 214, flare: 226, cool: [146, 270] },
  // Лунная тень: he looks at his shadow, dives into it head first, the shadow races over the floor (left, deep, right,
  // to the viewer) leaving ripples, bursts at the bottom edge — he comes out huge over the frame, darkness on the glass;
  // a back somersault home, the shadow returns under him, the ripples and drops fade.
  'trick_b-f2': { look: [0, 24], dive: 30, gone: 34, race: [36, 110], burst: 110, glass: [110, 150], breath: 126, draw: [134, 144], flip: [150, 176], home: 180, slap: 224, fade: [110, 260] },
  // Звездопад: stars break off the corona and drift down; he catches them one by one, presses them into a ball, the
  // ball overhead, a turn, thrown up out of the painting; a flash, the starfall over the whole picture, crystals on the
  // stone; the last big star batted with the crescent at the viewer, it smashes on the glass; the crystals go out.
  'trick_c-f2': { reach: [0, 30], catches: [34, 46, 58, 70, 82], ball: [30, 90], overhead: [90, 120], throw: 122, flash: 128, fall: [128, 172], bat: 176, smash: 184, fade: [184, 270] },
  // Восход: a huge winged shadow sweeps over the empty dial with wind and dust, sweeps back shrinking; he drops from
  // above with open wings, lands hard (ring, dust, cracks), rises, the wings thrown wide, the pearl flares; a roar to
  // the sun with a column of flame and a smoke ring; the presentation pose, held still.
  show: { cross: [4, 18], shadow: [0, 30], scale: [22, 46], back: [30, 50], beat: [40, 52], descend: [52, 66], drop: 60, land: 66, rise: [72, 100], flare: 88, roar: [100, 130], ring: 124, pose: [130, 151], hold: 151 },
};

// ---- helpers -------------------------------------------------------------------------------------------------------
/**
 * Steps on the spot while the whole body travels `dx` screen pixels: each step lifts one hock and sets it down
 * forward; the screen offset moves while that foot is in the air. Returns keys to add to a track and a dx lane.
 */
function walkSteps(keys: Track, from: number, every: number, n: number, dx0: number, dx1: number, base: JointPose, dxLane: Lane) {
  for (let i = 0; i < n; i++) {
    const f = from + i * every;
    const right = i % 2 === 0;
    const up = right ? footR(HOCK_R[0] + 1.8, HOCK_R[1], HOCK_R[2] + 2.6) : footL(HOCK_L[0] + 1.8, HOCK_L[1], HOCK_L[2] + 2.6);
    keys.push([f, { ...base, crouch: (base.crouch ?? 0) + 0.2 }], [f + every * 0.5, { ...base, ...up, crouch: (base.crouch ?? 0) - 0.3, nod: (base.nod ?? 0) - 0.05 }]);
    dxLane.push([f, dx0 + ((dx1 - dx0) * i) / n], [f + every, dx0 + ((dx1 - dx0) * (i + 1)) / n]);
  }
  keys.push([from + n * every, base]);
}
function shakeHead(keys: Track, from: number, to: number, step: number, amp: number, base: JointPose = {}) {
  for (let f = from, i = 0; f <= to; f += step, i++) {
    const k = 1 - (f - from) / (to - from + step);
    const s = i % 2 ? 1 : -1;
    keys.push([f, { ...base, tilt: s * amp * k, gaze: (base.gaze ?? 0) + s * amp * 0.6 * k, tailSway: 0.3 * s * k }]);
  }
}

// ---- first form tricks ------------------------------------------------------------------------------------------
/** Where the beam points over the clip (head aim): gaze (turn of the head) and nod at key frames. */
export const BEAM_AIM: [number, number, number][] = [
  // frame, gaze, nod
  [56, -0.5, 0.5],
  [72, -0.2, 0.62],
  [90, 0.35, 0.66],
  [108, 0.8, 0.58],
  [116, 0.8, 0.3],
  [122, 0.75, 0.25],
];
function trickTrack(): Track {
  const rear = (p: JointPose = {}): JointPose => ({ ...WIDE, wingOpen: 1, bodyPitch: -0.3, lift: 1.5, crouch: 0.8, charge: 1.3, ...R(14, 6.5, 5), ...L(14.5, -4.5, 6.5), fistR: 0.6, fistL: 0.6, ...p });
  const keys: Track = [
    [0, {}],
    // Turns to the sun; the wings snap open with an overshoot.
    [4, RH({ gaze: 0.15, nod: -0.15, lookY: 0.4, wingOpen: 0.2, crouch: 0.6 })],
    [8, RH({ gaze: 0.2, nod: -0.25, lookY: 0.5, wingOpen: 1.18, wingBeat: 0.45, crouch: 0.2, neckUp: 1 })],
    [12, RH({ gaze: 0.2, nod: -0.25, lookY: 0.5, ...WIDE, neckUp: 1 })],
    // Sunlight runs into the membranes in two gulps: the wings tip to the sun and flare, the chest heaves, then settle.
    [16, RH({ gaze: 0.2, nod: -0.3, lookY: 0.5, ...WIDE, wingBeat: 0.12, neckUp: 1.1, lid: 0.2 })],
    [20, RH({ gaze: 0.22, nod: -0.4, lookY: 0.6, ...WIDE, wingBeat: 0.62, lift: 0.9, neckUp: 1.8, charge: 0.6, lid: 0.3, ...size(0.98, 1.03) })],
    [27, RH({ gaze: 0.18, nod: -0.3, lookY: 0.55, ...WIDE, wingBeat: 0.26, lift: 0.3, neckUp: 1.3, charge: 0.7, lid: 0.3 })],
    [30, RH({ gaze: 0.16, nod: -0.32, lookY: 0.5, ...WIDE, wingBeat: 0.1, lift: 0, neckUp: 1.1, charge: 0.7, lid: 0.3 })],
    [34, RH({ gaze: 0.2, nod: -0.45, lookY: 0.65, ...WIDE, wingBeat: 0.7, lift: 1.1, neckUp: 2.0, charge: 1.0, lid: 0.4, ...size(0.97, 1.04) })],
    [40, RH({ gaze: 0.15, nod: -0.3, lookY: 0.5, ...WIDE, wingBeat: 0.3, neckUp: 1.2, charge: 1.1, lid: 0.35 })],
    // Rears, the neck drawn back into an S; the ball of light grows at the jaws.
    [48, rear({ coil: 0.7, nod: 0.1, gaze: -0.3, snarl: 0.6 })],
    [54, rear({ coil: 1, nod: 0.25, gaze: -0.45, snarl: 0.9, roar: 0.3 })],
    // The shot: the head snaps forward, the jaws wide.
    [56, rear({ coil: 0, neckReach: 2.5, gaze: -0.55, nod: 0.55, fire: 1, bodyPitch: 0.05, lift: 0.4, crouch: 2.2, flash: 0.14, ...size(1.03, 0.97) })],
    [60, rear({ coil: 0.15, neckReach: 1.8, gaze: -0.5, nod: 0.58, fire: 1, bodyPitch: 0.1, lift: 0, crouch: 2.6, lean: -0.6 })],
  ];
  // The sweep: the head leads the beam; the recoil pushes the hips back over the scraping claws.
  for (const [f, g, n] of BEAM_AIM.slice(1)) keys.push([f, rear({ coil: 0.15, neckReach: 1.8, gaze: g, nod: n, fire: 1, bodyPitch: 0.1, lift: 0, crouch: 2.6 + (f > 108 ? -1 : 0), lean: -0.6 - (f - 60) * 0.012, neckUp: f > 108 ? 2.5 : 0 })]);
  keys.push(
    // The beam goes out; the recoil throws him back a step.
    [126, rear({ coil: 0.3, gaze: 0.6, nod: 0.1, fire: 0, roar: 0.4, bodyPitch: -0.1, crouch: 1.8, lean: -1.2, neckUp: 1.5, charge: 0.7 })],
    [134, { ...WIDE, wingBeat: 0.6, crouch: 3.4, lean: -1.6, bodyPitch: -0.25, nod: -0.2, gaze: 0.2, roar: 0.2, ...R(12, 8, 6), ...L(12, -7, 7), fistR: -0.5, fistL: -0.5, charge: 0.6 }],
    [140, { ...WIDE, wingBeat: 0.1, crouch: 2.4, lean: -1.4, nod: 0.25, gaze: 0, ...RH(), charge: 0.5 }],
  );
  // Shakes his head: sparks fly from the jaws.
  shakeHead(keys, 144, 156, 2, 0.32, { ...WIDE, crouch: 1.6, lean: -1.2, nod: 0.25, snarl: 0.4, blink: 1, ...RH() });
  keys.push(
    // The wings fold with a snap (overshoot past folded, back).
    [158, RH({ wingOpen: 0.9, crouch: 1.2, lean: -1, nod: 0.1 })],
    [161, RH({ wingOpen: -0.08, wingBeat: -0.1, crouch: 1.0, lean: -1, nod: 0.05 })],
    [166, RH({ wingOpen: 0, crouch: 0.6, lean: -0.8, gaze: -0.2, lookX: -0.5, nod: 0.3 })],
    [176, RH({ crouch: 0.4, lean: -0.6, gaze: -0.25, lookX: -0.6, nod: 0.35 })],
  );
  // He steps home over the cooling groove, looks along the scorched arc from end to end, snorts fire with a ring of
  // smoke, throws the wings up in the sun-dragon pose and snaps them shut.
  walkSteps(keys, 178, 10, 2, 0, 0, RH({ lean: -0.3, nod: 0.3, gaze: -0.1 }), []);
  keys.push(
    [200, RH({ gaze: -0.45, lookX: -0.8, nod: 0.38, lean: -0.1 })],
    [206, RH({ gaze: -0.42, lookX: -0.7, nod: 0.36 })],
    [214, RH({ gaze: 0.35, lookX: 0.8, nod: 0.3, tailSway: 0.3 })],
    [218, RH({ gaze: 0.3, lookX: 0.6, nod: 0.28 })],
    [221, RH({ gaze: 0.05, coil: 0.5, nod: -0.15, neckUp: 0.6, crouch: 0.6, lid: 0.3 })],
    [223, RH({ gaze: 0, coil: 0, neckReach: 1.2, nod: 0.15, flame: 1, snarl: 0.6, crouch: 1, ...size(1.02, 0.98) })],
    [229, RH({ gaze: 0.1, neckReach: 0.6, nod: 0.05, flame: 0.2, snarl: 0.4 })],
    [234, RH({ ...WIDE, wingOpen: 0.75, wingBeat: 0.45, lift: 0.8, neckUp: 1.6, nod: -0.25, gaze: 0.25, snarl: 0.5, charge: 0.6, ...size(0.98, 1.03) })],
    [244, RH({ ...WIDE, wingOpen: 0.7, wingBeat: 0.38, lift: 0.6, neckUp: 1.4, nod: -0.2, gaze: 0.3, snarl: 0.4, charge: 0.5 })],
    [248, RH({ wingOpen: -0.08, wingBeat: -0.12, lift: 0, crouch: 0.6, nod: 0.08, snarl: 0.2 })],
    [254, RH({ nod: 0.02, lid: 0.25 })],
    [264, {}],
  );
  keys.sort((a, b) => a[0] - b[0]);
  return keys;
}
function trickBTrack(): { keys: Track; lanes: Record<string, Lane> } {
  const fly = (p: JointPose = {}): JointPose => ({ ...WIDE, point: 1, tuck: 0.85, tailCurl: 0.3, ...R(11, 6, 4), ...L(11, -5, 4), fistR: 0.7, fistL: 0.7, ...p });
  const keys: Track = [
    [0, {}],
    // The spring: low, the tail coiled, the wings up.
    [10, RH({ crouch: 3.2, lean: 0.5, nod: 0.15, wingOpen: 0.7, wingBeat: 0.4, tailCurl: 0.6, lookY: 0.5 })],
    [20, RH({ crouch: 5.2, lean: 0.8, nod: 0.25, wingOpen: 1.1, wingBeat: 0.95, tailCurl: 0.9, lookY: 0.8, snarl: 0.5 })],
    // The downstroke: off the ground.
    [22, fly({ crouch: 0, jump: 4, wingBeat: -0.9, nod: -0.3, ...size(0.9, 1.15) })],
    [26, fly({ jump: 10, wingBeat: 0.7, nod: -0.4, ...size(0.86, 1.2) })],
    [30, fly({ jump: 14, wingBeat: -0.8, nod: -0.45, ...size(0.84, 1.24) })],
    [36, fly({ jump: 18, wingBeat: 0.6, nod: -0.5, ...size(0.8, 1.3) })],
    [39, fly({ jump: 20, wingBeat: -0.6, nod: -0.5, ...size(0.78, 1.32) })],
    [40, { hidden: 1 }],
    [99, { hidden: 1 }],
    // The comet: huge over the whole painting, flying across left to right, wings full, legs tucked, mouth open.
    [100, fly({ overAll: 1, noShadow: 1, bodyPitch: 0.75, wingBeat: 0.5, roar: 0.8, snarl: 1, neckReach: 3, nod: 0.6, ...size(2.4) })],
    [104, fly({ overAll: 1, noShadow: 1, bodyPitch: 0.75, wingBeat: -0.7, roar: 1, snarl: 1, neckReach: 3, nod: 0.6, ...size(2.5) })],
    [108, fly({ overAll: 1, noShadow: 1, bodyPitch: 0.7, wingBeat: 0.6, roar: 0.8, snarl: 1, neckReach: 3, nod: 0.6, ...size(2.6) })],
    [111, fly({ overAll: 1, noShadow: 1, bodyPitch: 0.7, wingBeat: -0.5, roar: 0.6, snarl: 1, neckReach: 3, nod: 0.6, ...size(2.6) })],
    [112, { hidden: 1 }],
    [123, { hidden: 1 }],
    // Back in from the upper left, gliding down.
    [124, fly({ bodyPitch: 0.35, wingBeat: 0.5, jump: 14, nod: 0.2, ...size(0.9) })],
    [128, fly({ bodyPitch: 0.1, wingBeat: -0.2, jump: 5, point: 0.6, nod: 0.25, wingOpen: 1.1 })],
    // The skid: crouched, the claws dragging, the wings braking.
    [130, RH({ ...WIDE, wingBeat: 0.7, crouch: 5.5, lean: -0.8, bodyPitch: 0.2, nod: 0.35, snarl: 0.8, flash: 0.08, ...size(1.08, 0.92) })],
    [136, RH({ ...WIDE, wingBeat: 0.5, crouch: 4.4, lean: -0.6, bodyPitch: 0.15, nod: 0.3, snarl: 0.7 })],
    // The roar at the sky, the wings thrown wide, embers raining.
    [144, { ...WIDE, wingOpen: 1.1, wingBeat: 0.45, crouch: 0.6, bodyPitch: -0.3, lift: 1.5, neckUp: 3.5, nod: -0.65, roar: 1, ...R(13, 8, 5), ...L(13, -7, 6), fistR: -0.6, fistL: -0.6, charge: 1.2 }],
    [158, { ...WIDE, wingOpen: 1.1, wingBeat: 0.35, crouch: 0.4, bodyPitch: -0.32, lift: 1.6, neckUp: 3.6, nod: -0.7, roar: 1, ...R(13, 8, 5.5), ...L(13, -7, 6.5), fistR: -0.6, fistL: -0.6, charge: 1.3 }],
    // The head comes down and the second roar goes straight at us: a lunge, the wings beat down.
    [163, { ...WIDE, wingBeat: 0.75, crouch: 0.4, bodyPitch: -0.1, lift: 0.6, lean: 0.3, neckUp: 1.2, nod: 0.12, gaze: 0.5, roar: 0.35, ...R(13, 8, 5), ...L(13, -7, 6), fistR: -0.6, fistL: -0.6, charge: 1.1 }],
    [166, { ...WIDE, wingBeat: -0.4, crouch: 1.3, bodyPitch: 0.05, lean: 0.8, neckReach: 2, nod: 0.2, gaze: 0.55, roar: 1, snarl: 1, ...R(13.5, 8, 4.5), ...L(13.5, -7, 5.5), fistR: -0.8, fistL: -0.8, charge: 1.3, flash: 0.05, ...size(1.03, 0.97) }],
    [178, { ...WIDE, wingBeat: -0.15, crouch: 1.1, bodyPitch: 0.05, lean: 0.75, neckReach: 1.8, nod: 0.18, gaze: 0.5, roar: 0.9, snarl: 1, ...R(13.5, 8, 4.5), ...L(13.5, -7, 5.5), fistR: -0.8, fistL: -0.8, charge: 1.2 }],
    [184, { ...WIDE, wingBeat: 0.3, crouch: 0.6, lean: 0.2, nod: 0.1, gaze: 0.3, roar: 0.15, snarl: 0.5, ...RH(), charge: 0.9 }],
    // Shakes the ash off: a shiver through the body and the wings.
    [188, { ...WIDE, wingBeat: 0.55, twist: 0.12, crouch: 0.5, nod: 0.15, blink: 1, ...RH() }],
    [191, { ...WIDE, wingBeat: 0.05, twist: -0.12, crouch: 0.6, nod: 0.1, blink: 1, ...RH() }],
    [194, { ...WIDE, wingBeat: 0.4, twist: 0.07, crouch: 0.5, nod: 0.12, ...RH() }],
    [197, { ...WIDE, wingBeat: 0.2, twist: 0, crouch: 0.4, nod: 0.1, ...RH() }],
    // Folds the wings (snap), looks at the cooling cracks, walks home.
    [198, RH({ wingOpen: 0.85, nod: 0.1, gaze: -0.2 })],
    [201, RH({ wingOpen: -0.06, nod: 0.2, gaze: -0.3, lookX: -0.5 })],
    [204, RH({ wingOpen: 0, nod: 0.3, gaze: -0.3, lookX: -0.5 })],
  ];
  const dxLane: Lane = [[0, 0], [123, 0], [124, -96], [128, -50], [130, -34], [136, -26], [204, -26]];
  walkSteps(keys, 204, 12, 4, -26, 0, RH({ nod: 0.25, gaze: -0.1 }), dxLane);
  keys.push([256, RH({ nod: 0, snarl: 0.3, lid: 0.25 })], [276, {}]);
  dxLane.push([276, 0]);
  keys.sort((a, b) => a[0] - b[0]);
  return {
    keys,
    lanes: {
      dx: [[0, 0], [99, 0], [100, -190], [111, 190], [112, 0], ...dxLane.slice(2)],
      dy: [[0, 0], [22, 0], [26, -24], [30, -70], [36, -160], [39, -230], [40, 0], [99, 0], [100, 30], [111, 52], [112, 0], [123, 0], [124, -150], [128, -40], [130, 0], [276, 0]],
    },
  };
}
/** The three mirrors stand where the skin puts them: front-near, back-near, front-far. He turns to the first. */
function trickCTrack(): { keys: Track; lanes: Record<string, Lane> } {
  const keys: Track = [
    [0, {}],
    // The tail strike that raises the mirrors.
    [4, RH({ tailLift: 0.9, tailSway: -0.3, crouch: 0.8, nod: 0.1, gaze: -0.2 })],
    [8, RH({ tailLift: -0.35, tailSway: 0.15, crouch: 1.4, nod: 0.2, gaze: -0.3, flash: 0.04, mirrorsOn: 1 })],
    [14, RH({ tailLift: 0, crouch: 0.8, nod: 0.1, gaze: -0.35, lookX: -0.6, mirrorsOn: 1 })],
    [24, RH({ crouch: 0.5, gaze: -0.2, nod: 0, lookX: -0.3, mirrorsOn: 1 })],
    // Turned to the first mirror; a deep breath.
    [36, RH({ crouch: 0.8, nod: 0.15, gaze: 0, charge: 0.9, lid: 0.2, mirrorsOn: 1, coil: 0.4 })],
    [40, RH({ crouch: 1.2, nod: 0.2, gaze: 0, charge: 1.1, mirrorsOn: 1, coil: 0.6, snarl: 0.4 })],
    // The beam: short and bright, into the first mirror; the jaws close on it.
    [42, RH({ crouch: 1.6, nod: 0.25, gaze: 0, fire: 1, neckReach: 1.5, mirrorsOn: 1, flash: 0.06 })],
    [48, RH({ crouch: 1.2, nod: 0.2, gaze: 0, fire: 0, snarl: 0.5, mirrorsOn: 1, charge: 1.2 })],
    // Inside the triangle: arms half spread, he turns slowly, the pearl charging.
    [60, { ...R(12, 8.5, 5), ...L(12.5, -7.5, 6), fistR: -0.5, fistL: -0.5, wingOpen: 0.35, crouch: 0.6, nod: -0.05, charge: 1.3, mirrorsOn: 1, lid: 0.3 }],
    [118, { ...R(12, 8.5, 6), ...L(12.5, -7.5, 7), fistR: -0.6, fistL: -0.6, wingOpen: 0.5, crouch: 0.4, nod: -0.15, charge: 1.6, mirrorsOn: 1, lid: 0.2, snarl: 0.4 }],
    // Three packets of light run round the triangle; each arrival in the pearl jolts him upright.
    [71, { ...R(12, 8.5, 5.24), ...L(12.5, -7.5, 6.24), fistR: -0.52, fistL: -0.52, mirrorsOn: 1, wingOpen: 0.39, crouch: 1.05, nod: -0.07, charge: 1.37, lid: 0.3 }],
    [74, { ...R(12, 8.5, 5.24), ...L(12.5, -7.5, 6.24), fistR: -0.52, fistL: -0.52, mirrorsOn: 1, wingOpen: 0.69, wingBeat: 0.45, crouch: 0, lift: 0.9, bodyPitch: -0.12, nod: -0.22, snarl: 0.8, charge: 1.6700000000000002, flash: 0.04, ...size(0.98, 1.03) }],
    [80, { ...R(12, 8.5, 5.24), ...L(12.5, -7.5, 6.24), fistR: -0.52, fistL: -0.52, mirrorsOn: 1, wingOpen: 0.39, crouch: 0.55, nod: -0.07, charge: 1.37, lid: 0.25, snarl: 0.3 }],
    [89, { ...R(12, 8.5, 5.55), ...L(12.5, -7.5, 6.55), fistR: -0.56, fistL: -0.56, mirrorsOn: 1, wingOpen: 0.43, crouch: 0.99, nod: -0.11, charge: 1.47, lid: 0.3 }],
    [92, { ...R(12, 8.5, 5.55), ...L(12.5, -7.5, 6.55), fistR: -0.56, fistL: -0.56, mirrorsOn: 1, wingOpen: 0.73, wingBeat: 0.45, crouch: 0, lift: 0.9, bodyPitch: -0.12, nod: -0.26, snarl: 0.8, charge: 1.77, flash: 0.04, ...size(0.98, 1.03) }],
    [98, { ...R(12, 8.5, 5.55), ...L(12.5, -7.5, 6.55), fistR: -0.56, fistL: -0.56, mirrorsOn: 1, wingOpen: 0.43, crouch: 0.49, nod: -0.11, charge: 1.47, lid: 0.25, snarl: 0.3 }],
    [107, { ...R(12, 8.5, 5.86), ...L(12.5, -7.5, 6.86), fistR: -0.59, fistL: -0.59, mirrorsOn: 1, wingOpen: 0.48, crouch: 0.9299999999999999, nod: -0.14, charge: 1.56, lid: 0.3 }],
    [110, { ...R(12, 8.5, 5.86), ...L(12.5, -7.5, 6.86), fistR: -0.59, fistL: -0.59, mirrorsOn: 1, wingOpen: 0.78, wingBeat: 0.45, crouch: 0, lift: 0.9, bodyPitch: -0.12, nod: -0.29000000000000004, snarl: 0.8, charge: 1.86, flash: 0.04, ...size(0.98, 1.03) }],
    [116, { ...R(12, 8.5, 5.86), ...L(12.5, -7.5, 6.86), fistR: -0.59, fistL: -0.59, mirrorsOn: 1, wingOpen: 0.48, crouch: 0.43, nod: -0.14, charge: 1.56, lid: 0.25, snarl: 0.3 }],
    // Rears, the wings full: the triangle shrinks into the pearl, the mirrors crack.
    [126, { ...WIDE, wingOpen: 1.15, bodyPitch: -0.35, lift: 1.8, neckUp: 2.5, nod: -0.45, roar: 0.7, ...R(12, 9, 8), ...L(12, -8, 9), fistR: -0.8, fistL: -0.8, charge: 1.8, mirrorsOn: 1 }],
    // The solar flash.
    [130, { ...WIDE, wingOpen: 1.2, bodyPitch: -0.4, lift: 2, neckUp: 3, nod: -0.55, roar: 1, ...R(12, 9.5, 8), ...L(12, -8.5, 9), fistR: -0.9, fistL: -0.9, charge: 2, mirrorsOn: 1, flash: 0.2 }],
    [132, { ...WIDE, wingOpen: 1.1, bodyPitch: -0.35, lift: 1.8, neckUp: 3, nod: -0.5, roar: 0.9, ...R(12, 9.5, 8), ...L(12, -8.5, 9), fistR: -0.9, fistL: -0.9, charge: 1.6, flash: 0.08 }],
    [150, { ...WIDE, wingBeat: 0.2, bodyPitch: -0.15, lift: 0.8, neckUp: 1.5, nod: -0.2, roar: 0.2, ...R(12, 8, 6), ...L(12, -7, 7), fistR: -0.4, fistL: -0.4, charge: 1 }],
    // Steps to the nearest smouldering mark and sniffs it; the ash makes him snort.
    [166, RH({ wingOpen: 0.6, wingBeat: 0.15, neckUp: 0.8, nod: 0.05, gaze: -0.2, lookX: -0.4, charge: 0.8 })],
    [176, RH({ wingOpen: 0.45, lean: 0.9, crouch: 1.3, neckReach: 1.6, nod: 0.5, gaze: -0.35, lookX: -0.6, charge: 0.7 })],
    [182, RH({ wingOpen: 0.45, lean: 0.95, crouch: 1.2, neckReach: 1.8, nod: 0.55, gaze: -0.32, lookX: -0.5, lid: 0.4 })],
    [185, RH({ wingOpen: 0.55, wingBeat: 0.3, lean: 0.7, crouch: 0.8, neckReach: 0.6, nod: 0.1, gaze: -0.2, snarl: 0.7, blink: 1, ...size(1.02, 0.98) })],
    [190, RH({ wingOpen: 0.7, lean: 0.3, crouch: 0.5, neckUp: 0.8, nod: 0.05, gaze: 0.05, snarl: 0.3 })],
    [196, { ...WIDE, wingBeat: 0.15, neckUp: 0.6, nod: 0.15, gaze: 0.1, ...RH(), charge: 0.7 }],
];
  // Shakes the golden dust off: the wings shiver, then fold.
  for (let f = 200, i = 0; f <= 216; f += 2, i++) keys.push([f, RH({ wingOpen: 0.8, wingBeat: (i % 2 ? 0.35 : -0.05) * (1 - (f - 200) / 20), tilt: (i % 2 ? 0.12 : -0.12) * (1 - (f - 200) / 20), blink: 1 })]);
  keys.push([222, RH({ wingOpen: 0.3, nod: 0.25, gaze: -0.2, lookX: -0.5 })], [236, RH({ nod: 0.3, gaze: 0.25, lookX: 0.5 })], [250, RH({ nod: 0.05, lid: 0.25, snarl: 0.2 })], [276, {}]);
  keys.sort((a, b) => a[0] - b[0]);
  return {
    keys,
    lanes: {
      mirrors: [[0, 0], [8, 0], [24, 1], [132, 1], [133, 0], [276, 0]],
      mirrorCrack: [[0, 0], [120, 0], [130, 0.7], [276, 0.7]],
      mirrorLit0: [[0, 0], [41, 0], [42, 1], [130, 1], [132, 0]],
      mirrorLit1: [[0, 0], [43, 0], [44, 1], [130, 1], [132, 0]],
      mirrorLit2: [[0, 0], [45, 0], [46, 1], [130, 1], [132, 0]],
      // Turn toward the first mirror (front-left), then slowly round inside the triangle and back to rest.
      twist: [[0, 0], [24, 0], [36, 0.45], [60, 0.45], [118, -0.55], [128, -0.2], [150, 0], [276, 0]],
    },
  };
}
function phaseTrack(): { keys: Track; lanes: Record<string, Lane> } {
  return {
    keys: [
      [0, {}],
      [6, RH({ crouch: 1.2, nod: 0.2, gaze: 0.15, lookY: 0.4, snarl: 0.4 })],
      [14, RH({ neckUp: 3.2, nod: -0.6, lookY: 0.8, gaze: 0.2, roar: 1, wingOpen: 0.4, charge: 1 })],
      [22, RH({ neckUp: 3.2, nod: -0.62, lookY: 0.8, gaze: 0.2, roar: 0.6, wingOpen: 0.5, charge: 1.1 })],
      // He opens the wings and rises as the shadow runs over the scene.
      [32, { ...WIDE, wingBeat: -0.5, neckUp: 2.5, nod: -0.45, gaze: 0.15, point: 0.6, ...R(12, 7, 6), ...L(12, -6, 7), charge: 1.2 }],
      [38, { ...WIDE, wingBeat: 0.6, neckUp: 2.5, nod: -0.45, point: 0.8, ...R(12, 7, 6), ...L(12, -6, 7), charge: 1.2 }],
      [44, { ...WIDE, wingBeat: -0.4, neckUp: 2.5, nod: -0.5, point: 1, ...R(12, 7, 7), ...L(12, -6, 8), charge: 1.3 }],
      [50, { ...WIDE, wingBeat: 0.5, neckUp: 2.8, nod: -0.55, point: 1, ...R(12, 8, 8), ...L(12, -7, 9), charge: 1.4 }],
      // Totality: arms and wings flung wide, the pearl goes black.
      [56, { ...WIDE, wingOpen: 1.15, wingBeat: 0.3, neckUp: 3, nod: -0.6, roar: 1, point: 1, ...R(12, 10, 9), ...L(12, -9, 10), fistR: -0.8, fistL: -0.8, charge: 1.6, pearlDark: 1, flash: 0.1 }],
      [76, { ...WIDE, wingOpen: 1.1, wingBeat: 0.2, neckUp: 2.6, nod: -0.4, roar: 0.5, point: 1, ...R(12, 10, 9), ...L(12, -9, 10), fistR: -0.8, fistL: -0.8, charge: 1.6, pearlDark: 1 }],
      [88, { ...WIDE, wingBeat: 0.55, neckUp: 2, nod: -0.2, point: 1, ...R(12, 8, 6), ...L(12, -7, 7), fistR: 0.8, fistL: 0.8, charge: 1.4, pearlDark: 1 }],
      // The shock wave from the chest, a wing beat: flight.
      [92, { ...WIDE, wingBeat: -0.8, neckUp: 1.5, nod: 0, point: 1, ...R(13, 9, 7), ...L(13, -8, 8), fistR: -0.6, fistL: -0.6, charge: 1.6, pearlDark: 1, flash: 0.12 }],
      [100, f2({ wingOpen: 0.4, wingBeat: 0.3, neckUp: 2.8, nod: -0.5, roar: 1, pearlDark: 1 })],
      [110, f2({ roar: 0.3, nod: -0.1, pearlDark: 1 })],
      [120, f2({ pearlDark: 1 })],
    ],
    lanes: {
      form: [[0, 0], [58, 0], [90, 1], [120, 1]],
      hover: [[0, 0], [24, 0], [40, 2.5], [56, 4.5], [92, 4.8], [100, 6], [120, 5]],
    },
  };
}

// ---- second form tricks -----------------------------------------------------------------------------------------
function trickF2Track(): { keys: Track; lanes: Record<string, Lane> } {
  const whirl = (p: JointPose = {}): JointPose => f2({ ...R(9, 10.5, 9), ...L(9, -9.5, 10), fistR: -0.7, fistL: -0.7, wingOpen: 0.1, snarl: 0.6, charge: 1.2, ...p });
  const keys: Track = [
    [0, f2({})],
    // Claws up to the black sun: ribbons of corona drawn down into his hands.
    [10, f2({ ...R(11, 6, 19), ...L(11, -5, 20), fistR: -0.7, fistL: -0.7, neckUp: 2, nod: -0.5, lookY: 0.8, gaze: 0.2, charge: 0.9 })],
    [26, f2({ ...R(11, 6.5, 19.5), ...L(11, -5.5, 20.5), fistR: 0.6, fistL: 0.6, neckUp: 2.2, nod: -0.5, lookY: 0.8, gaze: 0.2, charge: 1.2 })],
    // The whips burst out.
    [30, whirl({ flash: 0.06, roar: 0.6 })],
    [60, whirl({ roar: 0, nod: 0.05 })],
    // Faster: arms drawn in, wings tighter.
    [100, whirl({ ...R(11, 6, 8), ...L(11, -5, 9), fistR: 0.9, fistL: 0.9, wingOpen: -0.2, snarl: 0.9, charge: 1.4, nod: 0.1 })],
    [138, whirl({ ...R(11, 5.5, 8), ...L(11, -4.5, 9), fistR: 1, fistL: 1, wingOpen: -0.25, snarl: 1, charge: 1.5, nod: 0.12 })],
    // The dead stop, the whips wrap him; the lunge at the glass and the roar.
    [140, whirl({ ...R(11, 6, 8), ...L(11, -5, 9), fistR: 1, fistL: 1, wingOpen: -0.2, snarl: 1, charge: 1.5, crouch: 1.5, ...size(1.04, 0.96) })],
    [144, whirl({ overAll: 1, wingOpen: 0.5, wingBeat: -0.5, ...R(14, 9, 8), ...L(14, -8, 9), fistR: -0.9, fistL: -0.9, roar: 1, neckReach: 3, nod: 0.3, gaze: 0.5, snarl: 1, charge: 1.8, flash: 0.1 })],
    [150, whirl({ overAll: 1, wingOpen: 0.5, wingBeat: 0.4, ...R(14, 9, 8), ...L(14, -8, 9), fistR: -0.9, fistL: -0.9, roar: 1, neckReach: 3, nod: 0.28, gaze: 0.5, snarl: 1, charge: 1.6 })],
    [172, whirl({ overAll: 1, wingOpen: 0.3, ...R(13, 8, 7), ...L(13, -7, 8), fistR: 0, fistL: 0, roar: 0.3, neckReach: 1, nod: 0.15, gaze: 0.4, snarl: 0.6, charge: 1.2, lid: 0.3 })],
    [176, whirl({ wingOpen: 0.3, ...R(13, 8, 7), ...L(13, -7, 8), fistR: 0, fistL: 0, roar: 0.2, nod: 0.12, gaze: 0.35, snarl: 0.5, charge: 1.1 })],
    [200, f2({ gaze: 0.2, snarl: 0.4, lid: 0.3, charge: 0.8 })],
    // He gives the corona back: fists up to the black sun, the claws open, the ribbons fly home, the corona flares.
    [208, f2({ ...R(11, 6, 19), ...L(11, -5, 20), fistR: 0.8, fistL: 0.8, neckUp: 2, nod: -0.5, lookY: 0.8, gaze: 0.2, charge: 1 })],
    [212, f2({ ...R(11, 6, 19.5), ...L(11, -5, 20.5), fistR: 0.9, fistL: 0.9, neckUp: 2.1, nod: -0.5, lookY: 0.85, gaze: 0.2, charge: 1.1, crouch: 0.8 })],
    [214, f2({ ...R(11.5, 6.5, 21), ...L(11.5, -5.5, 22), fistR: -0.9, fistL: -0.9, neckUp: 2.4, nod: -0.6, lookY: 0.9, gaze: 0.2, wingBeat: 0.5, lift: 0.6, charge: 1.3, flash: 0.03 })],
    [224, f2({ ...R(11, 6.5, 18), ...L(11, -5.5, 19), fistR: -0.6, fistL: -0.6, neckUp: 2.2, nod: -0.55, lookY: 0.9, gaze: 0.2, charge: 0.9 })],
    [232, f2({ gaze: 0.1, nod: 0.1, snarl: 0.3, lid: 0.25, charge: 0.6 })],
    // Looks over the silver arcs going out on the stone.
    [248, f2({ gaze: -0.3, lookX: -0.6, nod: 0.25, charge: 0.6 })],
    [264, f2({ gaze: 0.05, nod: 0.05, snarl: 0.3, lid: 0.25 })],
    [288, f2({})],
  ];
  // Six whips, the turns: one slow (30–60), then three faster and faster (60–140); the tips lash at each half turn.
  const twist: Lane = [[0, 0], [30, 0], [60, TAU], [92, TAU * 2], [118, TAU * 3], [140, TAU * 4], [288, TAU * 4]];
  const lashes: number[] = [];
  for (let k = 1; k < twist.length - 2; k++) {
    const [f0] = twist[k],
      [f1] = twist[k + 1];
    if (f0 >= 30) lashes.push(Math.round((f0 + f1) / 2), f1);
  }
  beats['trick-f2'].lashes = lashes;
  return {
    keys,
    lanes: {
      twist,
      dy: [[0, 0], [140, 0], [144, 54], [172, 58], [176, 52], [196, 0], [288, 0]],
      sx: [[0, 0], [140, 0.04], [144, 0.5], [172, 0.52], [176, 0.45], [196, 0], [288, 0]],
      sy: [[0, 0], [140, -0.04], [144, 0.5], [172, 0.52], [176, 0.45], [196, 0], [288, 0]],
    },
  };
}
function trickBF2Track(): { keys: Track; lanes: Record<string, Lane> } {
  const keys: Track = [
    [0, f2({})],
    // Looks down at his shadow.
    [10, f2({ nod: 0.6, lookY: -0.8, gaze: -0.1, neckReach: 1, charge: 0.7 })],
    [24, f2({ nod: 0.65, lookY: -0.8, gaze: 0.1, neckReach: 1.5, snarl: 0.5, charge: 0.9, wingBeat: 0.6 })],
    // Up a little, then the dive head first.
    [28, f2({ nod: 0.3, wingOpen: 0.4, wingBeat: 0.9, ...R(13, 8, 13), ...L(13, -7.5, 14), point: 1, hover: 7 })],
    [31, f2({ pitch: 1.1, nod: 0.5, wingOpen: -0.3, wingBeat: -0.4, ...R(15, 6, 7), ...L(15, -6, 7.5), point: 1, hover: 3, ...size(0.9, 1.15) })],
    [33, f2({ pitch: 1.5, nod: 0.6, wingOpen: -0.45, ...R(16, 4.5, 5), ...L(16, -4.5, 5.5), point: 1, hover: -2, ...size(0.75, 1.35) })],
    [34, { hidden: 1, form: 1 }],
    [109, { hidden: 1, form: 1 }],
    // Out of the shadow at the bottom edge: huge, wings over the frame, the roar.
    [110, f2({ overAll: 1, noShadow: 1, wingOpen: 0.5, wingBeat: 0.8, roar: 1, snarl: 1, neckUp: 2, nod: -0.2, gaze: 0.45, ...R(13, 9, 9), ...L(13, -8, 10), fistR: -0.9, fistL: -0.9, charge: 1.5, flash: 0.08 })],
    [114, f2({ overAll: 1, noShadow: 1, wingOpen: 0.5, wingBeat: -0.3, roar: 1, snarl: 1, neckUp: 2, nod: -0.15, gaze: 0.45, ...R(13, 9.5, 9), ...L(13, -8.5, 10), fistR: -0.9, fistL: -0.9, charge: 1.5 })],
    // Breathes on the glass (it fogs), draws a crescent in the fog with one claw, grins.
    [122, f2({ overAll: 1, noShadow: 1, wingOpen: 0.45, wingBeat: 0.1, roar: 0.1, snarl: 0.3, neckUp: 1, neckReach: 2.5, nod: 0.12, gaze: 0.45, ...R(12, 8, 7), ...L(12, -7, 8), fistR: 0.5, fistL: 0.5, charge: 1.1 })],
    [126, f2({ overAll: 1, noShadow: 1, wingOpen: 0.45, wingBeat: 0.25, roar: 0.55, snarl: 0, lid: 0.35, neckUp: 1, neckReach: 3, nod: 0.15, gaze: 0.45, ...R(12, 8, 7), ...L(12, -7, 8), fistR: 0.5, fistL: 0.5, charge: 1, lift: 0.4 })],
    [131, f2({ overAll: 1, noShadow: 1, wingOpen: 0.45, wingBeat: 0.1, roar: 0, snarl: 0.2, neckUp: 1, neckReach: 2, nod: 0.1, gaze: 0.4, ...R(15, 9, 14), ...L(12, -7, 8), fistR: -0.4, fistL: 0.5, charge: 1 })],
    [134, f2({ overAll: 1, noShadow: 1, wingOpen: 0.45, roar: 0, snarl: 0.3, neckUp: 1, neckReach: 2, nod: 0.12, gaze: 0.35, ...R(16, 11, 15), ...L(12, -7, 8), fistR: -0.5, fistL: 0.5, charge: 1 })],
    [139, f2({ overAll: 1, noShadow: 1, wingOpen: 0.45, roar: 0, snarl: 0.4, neckUp: 1, neckReach: 2, nod: 0.15, gaze: 0.3, ...R(16.5, 9, 11.5), ...L(12, -7, 8), fistR: -0.5, fistL: 0.5, charge: 1 })],
    [144, f2({ overAll: 1, noShadow: 1, wingOpen: 0.45, roar: 0, snarl: 0.5, neckUp: 1, neckReach: 2, nod: 0.12, gaze: 0.35, ...R(16, 11.5, 9), ...L(12, -7, 8), fistR: -0.5, fistL: 0.5, charge: 1 })],
    [147, f2({ overAll: 1, noShadow: 1, wingOpen: 0.4, wingBeat: 0.3, snarl: 1, neckUp: 1, nod: 0.05, gaze: 0.5, lid: 0.2, ...R(12, 8, 7), ...L(12, -7, 8), fistR: 0.6, fistL: 0.6, charge: 1.1 })],
    [150, f2({ overAll: 1, noShadow: 1, wingOpen: 0.4, wingBeat: 0.6, nod: 0.05, gaze: 0.3, ...R(10, 6, 9), ...L(10, -5, 10), fistR: 0.8, fistL: 0.8, point: 1, snarl: 0.6, charge: 1.1 })],
    // The back somersault home, legs tucked.
    [176, f2({ ...R(11, 6, 6), ...L(11, -5, 7), fistR: 0.6, fistL: 0.6, snarl: 0.4, charge: 0.9 })],
    // Admires his crescent on the glass and chuckles; then slaps his tail into his own shadow, which splashes and closes.
    [194, f2({ gaze: 0.5, lookX: 0.7, lookY: 0.5, nod: -0.2, snarl: 0.5, charge: 0.7 })],
    [202, f2({ gaze: 0.5, lookX: 0.7, lookY: 0.5, nod: -0.15, snarl: 0.9, crouch: 0.6, charge: 0.7 })],
    [205, f2({ gaze: 0.5, lookX: 0.6, lookY: 0.5, nod: -0.28, snarl: 0.9, crouch: -0.4, charge: 0.7 })],
    [208, f2({ gaze: 0.48, lookX: 0.6, lookY: 0.5, nod: -0.15, snarl: 0.8, crouch: 0.5, charge: 0.7 })],
    [211, f2({ gaze: 0.45, lookX: 0.5, lookY: 0.4, nod: -0.22, snarl: 0.7, crouch: -0.2, charge: 0.7 })],
    [220, f2({ nod: 0.42, lookY: -0.6, gaze: -0.15, tailLift: 1, tailSway: -0.6, tailCurl: 0.5, charge: 0.7 })],
    [224, f2({ nod: 0.48, lookY: -0.7, gaze: -0.1, tailLift: -0.7, tailSway: 0.35, tailCurl: -0.2, crouch: 0.6, flash: 0.02, charge: 0.8 })],
    [232, f2({ nod: 0.3, lookY: -0.4, gaze: 0, tailLift: 0, tailSway: 0, snarl: 0.4, charge: 0.6 })],
    [244, f2({ nod: 0.1, gaze: 0.25, snarl: 0.4, lid: 0.3, charge: 0.6 })],
    [276, f2({})],
  ];
  const flip = somersault({ at: 152, air: 22, dir: -1, height: 6, crouch: 0 });
  return {
    keys,
    lanes: {
      pitch: [[0, 0], [28, 0], [31, 1.1], [33, 1.5], [34, 0], ...flip.pitch.slice(0)],
      dy: [[0, 0], [30, 0], [33, 8], [34, 0], [109, 0], [110, 62], [150, 62], [174, 0], [276, 0]],
      sx: [[0, 0], [109, 0], [110, 0.62], [150, 0.62], [174, 0], [276, 0]],
      sy: [[0, 0], [109, 0], [110, 0.62], [150, 0.62], [174, 0], [276, 0]],
    },
  };
}
function trickCF2Track(): { keys: Track; lanes: Record<string, Lane> } {
  const reachUp = (p: JointPose = {}): JointPose => f2({ ...R(11, 6, 19), ...L(11, -5, 20), fistR: -0.7, fistL: -0.7, neckUp: 2, nod: -0.45, lookY: 0.8, charge: 0.9, ...p });
  /** A catch: the claw snaps to the star at its point, a flash. */
  const catchKey = (side: 'L' | 'R' | 'both', p: JointPose = {}): JointPose => {
    // the catching claw shoots up and out to the star; the other stays low by the chest
    const r = side !== 'L' ? { ...R(14, 10, 18), fistR: 0.9 } : { ...R(12, 6, 8), fistR: 0.4 };
    const l = side !== 'R' ? { ...L(14, -9, 19), fistL: 0.9 } : { ...L(12, -5, 9), fistL: 0.4 };
    return f2({ ...r, ...l, nod: -0.2, lookY: 0.5, neckUp: 1, lift: 0.8, roll: side === 'R' ? 0.08 : side === 'L' ? -0.08 : 0, gaze: side === 'R' ? 0.25 : side === 'L' ? -0.25 : 0, snarl: 0.6, charge: 1.1, flash: 0.03, wingBeat: 0.4, ...p });
  };
  const keys: Track = [
    [0, f2({})],
    [12, reachUp({})],
    [28, reachUp({ nod: -0.3, lookY: 0.5 })],
  ];
  const catches = beats['trick_c-f2'].catches;
  const sides: ('L' | 'R' | 'both')[] = ['L', 'R', 'L', 'R', 'both'];
  catches.forEach((c, i) => {
    keys.push([c - 3, f2({ ...R(13, 8, 13), ...L(13, -7, 14), fistR: -0.6, fistL: -0.6, nod: -0.1, gaze: sides[i] === 'R' ? 0.3 : sides[i] === 'L' ? -0.3 : 0, lookY: 0.3, charge: 1 })]);
    keys.push([c, catchKey(sides[i])]);
    keys.push([c + 4, f2({ ...R(13, 2.6, 8.5), ...L(13, -2.6, 9), fistR: -0.4, fistL: -0.4, nod: 0.25, lookY: -0.3, snarl: 0.3, charge: 1.1 + i * 0.1 })]);
  });
  keys.push(
    // The ball between the palms, then raised overhead; a turn with it.
    [90, f2({ ...R(14.5, 3.4, 10.5), ...L(14.5, -3.4, 11), fistR: -0.5, fistL: -0.5, nod: 0.3, charge: 1.6, snarl: 0.4 })],
    [100, f2({ ...R(9, 4, 21), ...L(9, -4, 21.5), fistR: -0.8, fistL: -0.8, neckUp: 2, nod: -0.5, lookY: 0.8, charge: 1.6 })],
    [118, f2({ ...R(9, 4, 21.5), ...L(9, -4, 22), fistR: -0.8, fistL: -0.8, neckUp: 2, nod: -0.5, lookY: 0.8, charge: 1.7 })],
    // The throw up out of the picture.
    [120, f2({ ...R(8, 4, 18), ...L(8, -4, 18.5), fistR: -0.8, fistL: -0.8, crouch: 2, neckUp: 1, nod: -0.3, charge: 1.7, wingBeat: 0.7 })],
    [122, f2({ ...R(11, 4, 24), ...L(11, -4, 24.5), fistR: -0.9, fistL: -0.9, crouch: -1, neckUp: 3, nod: -0.7, roar: 0.8, charge: 1.8, wingBeat: -0.6, flash: 0.06 })],
    [132, f2({ ...R(11, 7, 14), ...L(11, -6, 15), fistR: -0.5, fistL: -0.5, neckUp: 2.5, nod: -0.6, lookY: 0.9, charge: 1.2 })],
    // The starfall: he watches it come down round him.
    [150, f2({ gaze: -0.3, lookX: -0.6, nod: 0.2, charge: 1 })],
    [164, f2({ gaze: 0.3, lookX: 0.6, nod: 0.25, charge: 1, tailSway: -0.4, tailLift: 0.6 })],
    // The bat: the crescent swings round at the last big star, sending it at the viewer.
    [172, f2({ gaze: 0.2, nod: 0.1, snarl: 0.6, tailSway: -1, tailLift: 1, tailCurl: 0.8, crouch: 1.5, charge: 1.1 })],
    [176, f2({ gaze: 0.45, nod: 0.05, snarl: 0.9, tailSway: 1, tailLift: 0.8, tailCurl: -0.3, crouch: -0.5, wingBeat: -0.5, charge: 1.2, flash: 0.04 })],
    [182, f2({ gaze: 0.5, nod: 0.05, snarl: 0.8, tailSway: 0.6, tailLift: 0.4, charge: 1, wide: 0.5 })],
    [192, f2({ gaze: 0.35, snarl: 0.5, lid: 0.3, charge: 0.8 })],
    [230, f2({ gaze: -0.3, lookX: -0.5, nod: 0.3, charge: 0.6 })],
    [260, f2({ gaze: 0.05, nod: 0.05, snarl: 0.3, lid: 0.2 })],
    [288, f2({})],
  );
  return {
    keys,
    lanes: {
      // the bat lives in the lane too: a wind-up turn away, then the whole body whips round past the front
      twist: [[0, 0], [100, 0], [118, TAU], [160, TAU], [172, TAU - 0.7], [175, TAU + 0.55], [177, TAU + 0.75], [186, TAU + 0.3], [204, TAU], [288, TAU]],
      orb: [[0, 0], [33, 0], [34, 0.25], [46, 0.4], [58, 0.55], [70, 0.7], [82, 0.9], [90, 1], [118, 1.25], [122, 1.25], [123, 0], [288, 0]],
    },
  };
}

// ---- show, peek, hatch, everyday ------------------------------------------------------------------------------
function showTrack(): Track {
  return [
    [0, { hidden: 1 }],
    [51, { hidden: 1 }],
    // Comes down from above the frame, beating hard, legs tucked, then reaches for the ground.
    [52, { ...WIDE, wingBeat: -0.7, point: 1, tuck: 0.7, jump: 12, bodyPitch: 0.25, nod: 0.3, ...R(11, 6, 4, 12), ...L(11, -5, 4, 12), fistR: 0.6, fistL: 0.6 }],
    [55, { ...WIDE, wingBeat: 0.75, point: 1, tuck: 0.6, jump: 12, bodyPitch: 0.25, nod: 0.25, ...R(11, 6, 4, 12), ...L(11, -5, 4, 12), fistR: 0.6, fistL: 0.6 }],
    [58, { ...WIDE, wingBeat: -0.6, point: 1, tuck: 0.2, jump: 11, bodyPitch: 0.22, roar: 0.3, nod: 0.2, ...R(12, 8, 8, 11), ...L(12, -7, 9, 11), fistR: -0.6, fistL: -0.6 }],
    [60, { ...WIDE, wingBeat: 0.6, point: 1, jump: 10, bodyPitch: 0.2, roar: 0.6, nod: 0.2, ...R(12, 8, 8, 10), ...L(12, -7, 9, 10), fistR: -0.6, fistL: -0.6 }],
    [64, { ...WIDE, wingBeat: 0.8, point: 0.7, jump: 3, bodyPitch: 0.1, roar: 0.4, nod: 0.25, ...R(12, 8, 6, 3), ...L(12, -7, 7, 3), fistR: -0.6, fistL: -0.6 }],
    // The heavy landing.
    [66, RH({ ...WIDE, wingBeat: 0.5, crouch: 6.5, lean: 0.6, bodyPitch: 0.35, nod: 0.45, snarl: 0.8, flash: 0.12, ...size(1.08, 0.92), ...R(15, 6, -7.5), fistR: -0.3 })],
    [72, RH({ ...WIDE, wingBeat: 0.35, crouch: 6, lean: 0.5, bodyPitch: 0.3, nod: 0.45, snarl: 0.6, ...R(15, 6, -7.5), fistR: -0.3 })],
    // Rises, the wings thrown wide; the pearl flares.
    [86, { ...WIDE, wingOpen: 1.15, wingBeat: 0.3, crouch: 1, bodyPitch: -0.15, lift: 0.6, neckUp: 1.5, nod: -0.1, ...R(12, 9, 6), ...L(12, -8, 7), fistR: -0.6, fistL: -0.6, charge: 1.8 }],
    [98, { ...WIDE, wingOpen: 1.1, wingBeat: 0.25, crouch: 0.6, bodyPitch: -0.12, lift: 0.5, neckUp: 1.5, nod: -0.05, ...R(12, 9, 6), ...L(12, -8, 7), fistR: -0.6, fistL: -0.6, charge: 1.4 }],
    // The roar to the sun with a column of flame.
    [104, { ...WIDE, wingOpen: 1.1, bodyPitch: -0.3, lift: 1.4, neckUp: 3.6, nod: -0.85, fire: 1, ...R(12, 8, 6), ...L(12, -7, 7), fistR: 0.8, fistL: 0.8, charge: 1.6 }],
    [122, { ...WIDE, wingOpen: 1.1, bodyPitch: -0.32, lift: 1.5, neckUp: 3.6, nod: -0.85, fire: 1, ...R(12, 8, 6), ...L(12, -7, 7), fistR: 0.8, fistL: 0.8, charge: 1.6 }],
    [126, { ...WIDE, bodyPitch: -0.2, lift: 0.8, neckUp: 2.4, nod: -0.4, fire: 0, roar: 0.3, ...RH(), charge: 1 }],
    // The presentation pose: wings half folded, head high; settles to his stance and holds it.
    [138, RH({ wingOpen: 0.5, neckUp: 1.2, nod: -0.05, gaze: 0.25, snarl: 0.3, lid: 0.2, charge: 0.7 })],
    [146, RH({ wingOpen: 0.2, neckUp: 0.4, gaze: 0.12, snarl: 0.2, lid: 0.15, charge: 0.4 })],
    [151, {}],
    [168, {}],
  ];
}
const peekHang = (p: JointPose = {}): JointPose => ({ hidden: 1, noShadow: 1, ...p });
export const tracks: Record<string, Track> = {
  idle: [
    [0, {}],
    [18, { gaze: -0.08, tailSway: 0.15 }],
    [36, { nod: 0.04, charge: 0.25, tailSway: -0.1, wingBeatR: 0.08 }],
    [42, { nod: 0.04, charge: 0.25, tailSway: -0.08, wingBeatR: -0.03 }],
    [54, { tilt: 0.04, gaze: 0.06 }],
    [72, {}],
  ],
  'idle-f2': [
    [0, f2({})],
    [12, f2({ nod: -0.04, tailSway: 0.2, charge: 0.7 })],
    [24, f2({ gaze: 0.1, tilt: 0.03 })],
    [36, f2({ nod: 0.03, charge: 0.6 })],
    [48, f2({})],
  ],
  walk: [
    [0, { crouch: 0.6, nod: 0.06 }],
    [6, { crouch: 0.6, nod: -0.04, gaze: 0.04 }],
    [12, { crouch: 0.6, nod: 0.06 }],
    [18, { crouch: 0.6, nod: -0.04, gaze: -0.04 }],
    [24, { crouch: 0.6, nod: 0.06 }],
  ],
  look: [
    [0, {}],
    [4, { wingOpenR: 0.3, wingSweepR: 0.3, nod: -0.05 }],
    [8, { wingOpenR: 0.6, wingSweepR: 0.8, wingBeatR: 0.25, nod: -0.22, lookY: 0.45, lid: 0.35, neckUp: 1.2, gaze: 0.12 }],
    [18, { wingOpenR: 0.6, wingSweepR: 0.82, wingBeatR: 0.25, nod: -0.24, lookY: 0.45, lid: 0.4, neckUp: 1.3, gaze: 0.08 }],
    [22, { wingOpenR: 0.45, wingSweepR: 0.5, nod: -0.05, gaze: -0.6, lookX: -0.8, neckUp: 0.8 }],
    [28, { wingOpenR: 0.1, wingSweepR: 0.1, gaze: -0.55, lookX: -0.8, neckUp: 0.5 }],
    [36, {}],
  ],
  fidget_a: [
    [0, {}],
    [6, { wingOpenR: 0.4, gaze: 0.3 }],
    [12, { wingOpenR: 0.85, wingSweepR: 0.25, wingBeatR: 0.15, gaze: 0.95, nod: 0.35, neckReach: -2.5, tilt: 0.15 }],
    [18, { wingOpenR: 0.85, wingSweepR: 0.25, wingBeatR: 0.15, gaze: 0.98, nod: 0.38, neckReach: -2.6, tilt: 0.15, roar: 0.25 }],
    [21, { wingOpenR: 0.85, wingSweepR: 0.25, wingBeatR: 0.15, gaze: 0.98, nod: 0.36, neckReach: -2.6, tilt: 0.15 }],
    [24, { wingOpenR: 0.85, wingSweepR: 0.25, wingBeatR: 0.18, gaze: 1.02, nod: 0.4, neckReach: -2.7, tilt: 0.18, roar: 0.25 }],
    [27, { wingOpenR: 0.85, wingSweepR: 0.25, wingBeatR: 0.18, gaze: 1.02, nod: 0.38, neckReach: -2.7, tilt: 0.18 }],
    [30, { wingOpenR: 0.85, wingSweepR: 0.25, wingBeatR: 0.2, gaze: 1.05, nod: 0.42, neckReach: -2.8, tilt: 0.2, roar: 0.3, snarl: 0.4 }],
    [33, { wingOpenR: 0.85, wingSweepR: 0.25, wingBeatR: 0.2, gaze: 1.0, nod: 0.38, neckReach: -2.6, tilt: 0.15 }],
    // A shiver of the wing; he watches the scale fall.
    [36, { wingOpenR: 0.85, wingSweepR: 0.2, wingBeatR: 0.45, gaze: 0.6, nod: 0.3, lookX: 0.5, neckReach: -1 }],
    [38, { wingOpenR: 0.85, wingSweepR: 0.2, wingBeatR: -0.1, gaze: 0.5, nod: 0.3, lookX: 0.5 }],
    [40, { wingOpenR: 0.8, wingSweepR: 0.2, wingBeatR: 0.35, gaze: 0.45, nod: 0.35, lookX: 0.5, lookY: -0.4 }],
    [43, { wingOpenR: 0.75, wingSweepR: 0.15, wingBeatR: 0.05, gaze: 0.35, nod: 0.45, lookY: -0.6 }],
    [50, { wingOpenR: 0.15, gaze: 0.25, nod: 0.35, lookY: -0.5 }],
    [60, {}],
  ],
  fidget_b: [
    [0, {}],
    [6, { neckUp: 2, nod: -0.3, crouch: 0.2 }],
    [12, { neckUp: 3.6, nod: -0.62, roar: 1, lid: 0.6, wingOpen: 0.2, wingBeat: 0.2 }],
    [20, { neckUp: 3.2, nod: -0.55, roar: 0.95, blink: 1, wingOpen: 0.2, wingBeat: 0.25 }],
    [24, { neckUp: 1, nod: -0.1, roar: 0.1, blink: 1 }],
    [30, { nod: 0.05, lid: 0.2 }],
    [38, { tailLift: 0.9, tailSway: 0.3, gaze: -0.3, lookX: -0.5 }],
    [44, { tailLift: -0.35, tailSway: 0.1, gaze: -0.35, lookX: -0.6, crouch: 0.5 }],
    [48, { tailLift: 0, gaze: -0.3, lookX: -0.4 }],
    [60, {}],
  ],
  happy: [
    [0, {}],
    [6, RH({ crouch: 4, lean: 0.4, wingOpen: 0.6, wingBeat: 0.5, tailCurl: 0.3 })],
    [8, RH({ crouch: 4.5, lean: 0.5, wingOpen: 1.1, wingBeat: 0.95, tailCurl: 0.4 })],
    [11, { ...WIDE, wingBeat: -0.6, point: 1, jump: 4, ...R(11, 6, 4, 4), ...L(11, -5, 4, 4), fistR: 0.6, fistL: 0.6 }],
    [14, { ...WIDE, wingBeat: 0.6, point: 1, jump: 12, tailCurl: 0.4, ...R(11, 6, 4, 12), ...L(11, -5, 4, 12), fistR: 0.6, fistL: 0.6 }],
    [20, { ...WIDE, wingBeat: -0.4, point: 1, jump: 15, tailCurl: 0.4, ...R(11, 6, 4, 15), ...L(11, -5, 4, 15), fistR: 0.6, fistL: 0.6 }],
    [26, { ...WIDE, wingBeat: 0.4, point: 0.6, jump: 8, ...R(11, 6, 4, 8), ...L(11, -5, 4, 8), fistR: 0.4, fistL: 0.4 }],
    [30, RH({ wingOpen: 0.6, wingBeat: 0.1, crouch: 3.5, flash: 0.04, ...size(1.06, 0.94) })],
    [34, RH({ wingOpen: 0.45, crouch: 1, roar: 1, nod: -0.4, neckUp: 1.6, snarl: 0.4 })],
    [40, RH({ wingOpen: 0.1, roar: 0.2, nod: -0.1, neckUp: 0.4 })],
    [48, {}],
  ],
  tired: [
    [0, {}],
    [8, { crouch: 2, nod: 0.3, lid: 0.4, roar: 0.25, charge: -0.3, wingOpen: 0.1 }],
    [18, { crouch: 2.4, nod: 0.35, lid: 0.5, roar: 0.4, charge: -0.3, wingOpen: 0.1 }],
    [26, { crouch: 2.2, nod: 0.32, lid: 0.45, roar: 0.15, blink: 1, charge: -0.3 }],
    [36, {}],
  ],
  sleep_in: [
    [0, {}],
    [8, { crouch: 2.5, nod: 0.2, roar: 0.7, blink: 1, gaze: 0.2 }],
    [14, { crouch: 4.5, nod: 0.3, lid: 0.5, wingOpen: 0.3, wingSweep: 0.2 }],
    [22, { ...asleep, sleep: 0.6 }],
    [30, { ...asleep, sleep: 0.92 }],
    [36, asleep],
  ],
  sleep_out: [
    [0, asleep],
    [8, { ...asleep, sleep: 0.75, blink: 0, lid: 0.6 }],
    [12, { ...asleep, sleep: 0.45, blink: 0, lid: 0.4, wingOpen: 0.5, wingSweep: 0.3 }],
    // The stretch: neck up, a yawn, the wings thrown wide.
    [18, { ...WIDE, wingBeat: 0.5, crouch: 1, neckUp: 3.2, nod: -0.55, roar: 1, blink: 1, ...R(13, 8, 5), ...L(13, -7, 6), fistR: -0.5, fistL: -0.5 }],
    [26, { wingOpen: 0.3, roar: 0.1, nod: 0.05, neckUp: 0.5 }],
    [36, {}],
  ],
  wake_startled: [
    [0, asleep],
    [3, { ...asleep, sleep: 0.7, blink: 0, wide: 1 }],
    [8, { ...WIDE, wingBeat: 0.7, jump: 5, wide: 1, snarl: 0.6, charge: 1.2, ...R(12, 7, 6, 5), ...L(12, -6, 7, 5), fistR: 0.5, fistL: 0.5 }],
    [13, RH({ ...WIDE, wingBeat: -0.3, crouch: 3, snarl: 1, charge: 1.4, flash: 0.1, fistR: 0.8, fistL: 0.8 })],
    [20, RH({ wingOpen: 0.3, crouch: 1, snarl: 0.3, charge: 0.7 })],
    [28, {}],
  ],
  hatch: [
    [0, { hidden: 1, egg: 1 }],
    [37, { hidden: 1, egg: 1 }],
    // Out of the egg: small, curled, blinking.
    [38, { egg: 1, crouch: 7, ...size(0.72), blink: 1, tailCurl: 1, nod: 0.45, flash: 0.6, ...R(9, 5, -2), ...L(9, -4, -2) }],
    [42, { egg: 1, crouch: 4.5, ...size(0.82), wide: 1, nod: 0.15, tailCurl: 0.6, ...R(11, 6, 0), ...L(11, -5, 1) }],
    [43, { crouch: 4.2, ...size(0.84), wide: 1, nod: 0.12, tailCurl: 0.6, ...R(11, 6, 0), ...L(11, -5, 1) }],
    // The wings unfold, the neck rises; a puff of flame.
    [46, RH({ crouch: 2, ...size(0.92), wingOpen: 1.05, wingBeat: 0.5, neckUp: 2, nod: -0.3, wide: 0.6 })],
    [54, RH({ crouch: 1, ...size(0.97), wingOpen: 0.6, wingBeat: 0.2, neckUp: 1.4, nod: -0.2, fire: 0.6, roar: 0.4 })],
    [58, RH({ crouch: 0.6, wingOpen: 0.25, nod: 0, fire: 0, roar: 0.1, snarl: 0.3 })],
    [72, {}],
  ],
  peek: [
    [0, {}],
    [3, RH({ crouch: 3, wingOpen: 0.8, wingBeat: 0.7, lookY: 0.6, nod: -0.2 })],
    [5, { ...WIDE, wingBeat: -0.7, point: 1, jump: 6, ...size(0.9, 1.15), ...R(11, 6, 4, 6), ...L(11, -5, 4, 6) }],
    [8, { ...WIDE, wingBeat: 0.6, point: 1, jump: 10, ...size(0.85, 1.25), ...R(11, 6, 4, 10), ...L(11, -5, 4, 10) }],
    [9, { hidden: 1, noShadow: 1 }],
    [17, { hidden: 1, noShadow: 1 }],
    // The head hangs down from above the frame, upside down.
    [18, peekHang({ peekHang: 0.15, wide: 0.6 })],
    [24, peekHang({ peekHang: 1, wide: 0.3 })],
    [29, peekHang({ peekHang: 0.96, lookX: -0.4 })],
    [30, peekHang({ peekHang: 0.96, lookX: -0.4, blink: 1 })],
    [32, peekHang({ peekHang: 0.96, lookX: 0.4 })],
    [36, peekHang({ peekHang: 0.98, snarl: 0.8, tilt: 0.2, lookX: 0.2 })],
    [42, peekHang({ peekHang: 0.98, snarl: 0.6, tilt: 0.24 })],
    [46, peekHang({ peekHang: 1, snarl: 0.3, tilt: 0.1 })],
    [50, peekHang({ peekHang: 0.001 })],
    // Drops home, lands.
    [51, { ...WIDE, wingBeat: 0.5, point: 1, jump: 6, ...R(11, 6, 4, 6), ...L(11, -5, 4, 6) }],
    [54, RH({ wingOpen: 0.5, crouch: 3, flash: 0.04, ...size(1.05, 0.95) })],
    [58, {}],
    [60, {}],
  ],
  trick: trickTrack(),
  show: showTrack(),
};
export const lanes: Record<string, Record<string, Lane>> = {
  trick: { wingHeat: [[0, 0], [12, 0], [40, 1], [60, 1], [122, 0.7], [134, 0.3], [160, 0], [264, 0]] },
  show: { dy: [[0, 0], [51, 0], [52, -170], [55, -110], [58, -58], [61, -22], [64, -6], [66, 0], [168, 0]] },
  happy: { twist: [[0, 0], [12, 0], [26, TAU], [48, TAU]] },
  hatch: {
    eggCrack: [[0, 0], [8, 0], [10, 0.2], [20, 0.4], [30, 0.7], [36, 1], [72, 1]],
    eggRock: [[0, 0], [14, 0], [16, 0.12], [18, -0.12], [20, 0.1], [22, 0], [28, 0], [30, 0.16], [32, -0.14], [34, 0], [72, 0]],
    eggOpen: [[0, 0], [37, 0], [38, 0.25], [42, 1], [72, 1]],
  },
  peek: { dy: [[0, 0], [4, 0], [5, -40], [8, -190], [9, 0], [50, 0], [51, -80], [54, 0], [60, 0]] },
  'happy-f2': {
    pitch: [[0, 0], [10, 0], [34, TAU], [48, TAU]],
  },
};
// The tricks that build lanes along with their keys.
for (const [name, build] of [
  ['trick_b', trickBTrack],
  ['trick_c', trickCTrack],
  ['phase', phaseTrack],
  ['trick-f2', trickF2Track],
  ['trick_b-f2', trickBF2Track],
  ['trick_c-f2', trickCF2Track],
] as const) {
  const { keys, lanes: l } = build();
  tracks[name] = keys;
  lanes[name] = l;
}
tracks['happy-f2'] = [
  [0, f2({})],
  [8, f2({ wingBeat: 0.8, crouch: 1, ...R(11, 6, 6), ...L(11, -5, 7), fistR: 0.6, fistL: 0.6, snarl: 0.4 })],
  [12, f2({ wingBeat: -0.7, point: 1, hover: 8, ...R(11, 5, 6), ...L(11, -4, 7), fistR: 0.8, fistL: 0.8 })],
  [22, f2({ wingOpen: -0.3, point: 1, hover: 9, ...R(11, 5, 6), ...L(11, -4, 7), fistR: 0.8, fistL: 0.8 })],
  [34, f2({ wingBeat: 0.6, point: 0.6, hover: 6, ...R(11, 6, 6), ...L(11, -5, 7), fistR: 0.5, fistL: 0.5 })],
  [37, f2({ roar: 1, nod: -0.35, neckUp: 1.5, wingBeat: 0.3 })],
  [44, f2({ roar: 0.1 })],
  [48, f2({})],
];
export const gesture = keyframer({ tracks, lanes, switches: SWITCHES, linear: LINEAR, fixed: { sleep: asleep } });
