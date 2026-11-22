// Pose book of Зенит, written for his own wyvern body: the wings are his fore limbs. On the ground he stands and walks
// on four — the hind feet and the folded wrists; he rears on the hind legs to open the wings; braced (`brace`) he plants
// the wrists wide and the half-open wings rise behind him like a hood; wrapped (`wrap`) the wings close round him like
// a cloak. The three-clawed hands at the wrists catch, hold and draw (`R` / `L` goals lift a wrist off the stone).
// Times are frames at 24 fps. Hand goals: (forward, right, up above the resting hip) in the feet frame. Fore and hind
// foot goals: absolute points in the feet frame (the wrist on the stone, the raised hock). Screen lanes dx / dy are
// output pixels of the 384×312 painting. The effect timelines in eclipse_drake-fx.ts read the beats exported here.
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
export const foreL = (x: number, y: number, z: number) => reach('foreL', [x, y, z]);
export const foreR = (x: number, y: number, z: number) => reach('foreR', [x, y, z]);
/** Painted size relative to natural (the skin reads sx / sy as offsets from 1). */
export const size = (x: number, y = x) => ({ sx: x - 1, sy: y - 1 });
/** The eclipse form: indigo scales, black wings with a corona rim, the black sun in the chest; he flies (the skin adds
 * the wing beats and the hover bob on the clip clock). */
export const F2: JointPose = { form: 1, hover: 5, charge: 0.5 };
export const f2 = (p: JointPose): JointPose => ({ ...F2, ...p });
/** Asleep: lying on the dial, the wings folded over him, the tail round, the head down by the near wrist. */
export const asleep: JointPose = { sleep: 1, blink: 1 };
/** Keys that switch at the key instead of fading. */
export const SWITCHES = new Set(['hidden', 'overAll', 'blink', 'noShadow', 'egg', 'mirrorsOn', 'pearlDark']);
/** Lane keys that run linearly (positions in flight, spins). */
export const LINEAR = new Set(['dx', 'dy', 'twist', 'pitch']);

/** Wings thrown wide (on the ground this rears him on the hind legs). */
const WIDE: JointPose = { wingOpen: 1, wingBeat: 0.25 };
/** Braced on the wrists, claws in the stone, the wings up behind him as a hood. */
const braced = (p: JointPose = {}): JointPose => ({ brace: 1, wingOpen: 0.8, fistR: 0.7, fistL: 0.7, ...p });
/** Rest contacts in the feet frame (match the skin's STANCE): the raised hock and the wrist on the stone. */
const HOCK: [number, number, number] = [-2.8, 4.3, 4.8];
const WRIST: [number, number, number] = [13.4, 6.0, 1.8];

/** Effect beats shared with the painter of effects. */
export const beats = {
  look: { shade: 8, glance: 22 },
  fidget_a: { nibbles: [18, 24, 30], scale: 31, clink: 44 },
  fidget_b: { yawn: 12, flame: 14, ring: 22, slap: 44 },
  happy: { clap: 12, launch: 10, land: 30, ring: 34 },
  wake_startled: { flash: 8 },
  sleep_out: { stretch: 22 },
  hatch: { crack: 8, rock: [14, 32], burst: 38, gone: 43, wings: 46, puff: 54 },
  peek: { flap: 5, gone: 9, hang: [18, 24], blink: 30, grin: 36, puff: 40, up: [46, 50], land: 54 },
  // Солнечный луч: he rears and throws the wings open to the sun, sunlight runs into the membranes in two gulps; he
  // settles low on the hind legs, claws in the stone, draws the neck back, the beam strikes the stone and is led in an
  // arc across the dial to the viewer and up into the glass; the recoil drives him back over the stone, the hind claws
  // cutting two grooves, the wings beating against it; the beam goes out, a last shove drops him onto his
  // wrists (dust), he shakes his head, the wings fold with a snap; he walks home on four over the groove that cools from orange to red to dark glass, snorts a
  // ring of fire and rears into the sun pose.
  trick: { gulps: [20, 34], open: [0, 12], sun: [12, 40], rear: [40, 56], brace: 46, drop: 134, shot: 56, sweep: [60, 108], glass: [108, 122], off: 122, scrape: [56, 134], recoil: [130, 170], snap: 160, spotCool: 160, walk: [170, 202], snort: 223, pose: [234, 248], cool: [170, 250] },
  // К зениту: low on four, the tail a spring; the wrists vault him up (dust ring), the wings open at the top and beat
  // him out of the painting; far away a small dark shape crosses the sun, loops, becomes a spark; the spark grows into
  // a comet diving at the viewer, the huge wings and fire pass over the whole painting; he glides back in from the
  // upper left, lands hind feet first and slams the wrists down (shock ring, molten cracks), skids braced, rears and
  // roars at the sky under falling embers, leans at us with the wings spread and roars at the viewer, folds the wings and walks home on four.
  trick_b: { crouch: [0, 20], launch: 22, gone: 40, far: [40, 90], comet: [90, 100], pass: [100, 112], back: [112, 130], land: 130, roar: [140, 184], roarFront: 166, shake: [186, 198], walk: [206, 246], cool: [140, 262] },
  // Зеркала зенита: a tail strike raises three crystal mirrors out of the hour marks; he braces toward the first, a
  // beam into it, reflected behind him into the second, into the third, back into the pearl — a triangle of light; he
  // turns slowly inside it, braced, the wings up, while the pearl charges; he rears and draws the triangle into the
  // pearl with both hands, the claws close on the light, the mirrors crack; the solar flash flings hands and wings
  // wide; the mirrors fall to golden dust, the marks smoulder and go out.
  trick_c: { strike: 8, rise: [8, 24], turn: [24, 40], beam: [40, 48], hold: [48, 120], packets: [64, 82, 100], draw: [120, 128], rear: [120, 130], flash: 130, dust: [132, 200], marks: [132, 270], sniff: 185 },
  // Затмение: head to the sun, a roar on the hind legs; the moon slides over the sun; its shadow runs across the
  // scene, stars; he opens the wings and rises; totality at 56 (the pearl goes black, the claws spread); the scales
  // flip in a wave 60–90 (the claws clench); shock wave; flight.
  phase: { roar: [4, 20], moon: [6, 56], shadow: [20, 50], rise: [24, 50], total: 56, flip: [60, 90], wave: 92, flight: [92, 120] },
  'happy-f2': { loop: [10, 34], roar: 36 },
  // Вихрь короны: both wing-hands up to the black sun (he sinks — wings up cannot beat), the claws catch ribbons of
  // corona; six whips; one slow turn with the wings spread, three faster and faster as he draws the wings in like a
  // skater (the whips a tornado, their tips lash the stone — silver arcs); a dead stop, wings and whips wrap him; the
  // wings burst open, he lunges at the glass and roars — the corona ring hits the glass; he gives the ribbons back to
  // the sun from open claws; the arcs cool.
  'trick-f2': { draw: [0, 30], whips: 30, turns: [30, 140], lashes: [] as number[], stop: 140, lunge: [140, 150], ring: 146, back: [176, 200], release: 214, flare: 226, cool: [146, 270] },
  // Лунная тень: he looks at his shadow, stoops into it head first with the wings folded, the shadow races over the
  // floor (left, deep, right, to the viewer) leaving ripples, bursts at the bottom edge — he comes out huge over the
  // frame, darkness on the glass; breathes on the glass and draws a crescent in the fog with the claws of his near
  // wing-hand; a back somersault home, the shadow returns under him, the ripples and drops fade.
  'trick_b-f2': { look: [0, 24], dive: 30, gone: 34, race: [36, 110], burst: 110, glass: [110, 150], breath: 126, draw: [134, 144], flip: [150, 176], home: 180, slap: 224, fade: [110, 260] },
  // Звездопад: stars break off the corona and drift down; he snatches them one by one with the hands at the wrists
  // (each catch stops that wing — he dips and rights himself with the other) and presses each to his chest, where they
  // fuse into a ball; he drops onto the dial on his hind legs with the ball in both hands, lifts it overhead, turns
  // with it, throws it up out of the painting with a downstroke that lifts him again; a flash, the starfall over the
  // whole picture, crystals on the stone; the last big star batted with the crescent at the viewer, it smashes on the
  // glass; the crystals go out.
  'trick_c-f2': { reach: [0, 30], catches: [34, 46, 58, 70, 82], ball: [30, 90], land: 90, overhead: [100, 120], throw: 122, flash: 128, fall: [128, 172], bat: 176, smash: 184, fade: [184, 270] },
  // Восход: a huge winged shadow sweeps over the empty dial with wind and dust, sweeps back shrinking; he drops from
  // above with open wings, lands hind feet first and slams both wrists down wide (ring, dust, cracks), rises on the
  // hind legs with the wings thrown wide, the pearl flares; a roar to the sun with a column of flame and a smoke
  // ring; the heraldic pose — reared, the wings raised behind his back — held still.
  show: { cross: [4, 18], shadow: [0, 30], scale: [22, 46], back: [30, 50], beat: [40, 52], descend: [52, 66], drop: 60, land: 66, rise: [72, 100], flare: 88, roar: [100, 130], ring: 124, pose: [132, 144], hold: 144 },
};

// ---- helpers -------------------------------------------------------------------------------------------------------
/**
 * Walks on four while the whole body travels `dx` screen pixels: a lateral walk — in each step the hind foot of one
 * side lifts and sets down forward, then the wrist of the same side. The screen offset moves through the step.
 */
function walkSteps(keys: Track, from: number, every: number, n: number, dx0: number, dx1: number, base: JointPose, dxLane: Lane) {
  const c = base.crouch ?? 0,
    nod = base.nod ?? 0;
  for (let i = 0; i < n; i++) {
    const f = from + i * every;
    const s = i % 2 === 0 ? 1 : -1;
    const hind = (s > 0 ? footR : footL)(HOCK[0] + 1.8, s * HOCK[1], HOCK[2] + 2.6);
    const fore = (s > 0 ? foreR : foreL)(WRIST[0] + 2.2, s * WRIST[1], WRIST[2] + 2.8);
    keys.push(
      [f, { ...base, crouch: c + 0.2 }],
      [f + every * 0.25, { ...base, ...hind, crouch: c - 0.2 }],
      [f + every * 0.5, { ...base, crouch: c + 0.15, nod: nod + 0.04 }],
      [f + every * 0.75, { ...base, ...fore, crouch: c - 0.1, nod: nod - 0.05 }],
    );
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
function trickTrack(): { keys: Track; lanes: Record<string, Lane> } {
  const sun = (p: JointPose = {}): JointPose => ({ rear: 1, ...WIDE, ...p });
  const keys: Track = [
    [0, {}],
    // Turns to the sun, rears; the wings snap open with an overshoot.
    [4, { gaze: 0.15, nod: -0.15, lookY: 0.4, wingOpen: 0.2, crouch: 0.6 }],
    [8, { gaze: 0.2, nod: -0.25, lookY: 0.5, rear: 1, wingOpen: 1.18, wingBeat: 0.45, crouch: 0.2, neckUp: 1 }],
    [12, sun({ gaze: 0.2, nod: -0.25, lookY: 0.5, neckUp: 1 })],
    // Sunlight runs into the membranes in two gulps: the wings tip to the sun and flare, the chest heaves, then settle.
    [16, sun({ gaze: 0.2, nod: -0.3, lookY: 0.5, wingBeat: 0.12, neckUp: 1.1, lid: 0.2 })],
    [20, sun({ gaze: 0.22, nod: -0.4, lookY: 0.6, wingBeat: 0.62, lift: 0.9, neckUp: 1.8, charge: 0.6, lid: 0.3, ...size(0.98, 1.03) })],
    [27, sun({ gaze: 0.18, nod: -0.3, lookY: 0.55, wingBeat: 0.26, lift: 0.3, neckUp: 1.3, charge: 0.7, lid: 0.3 })],
    [30, sun({ gaze: 0.16, nod: -0.32, lookY: 0.5, wingBeat: 0.1, lift: 0, neckUp: 1.1, charge: 0.7, lid: 0.3 })],
    [34, sun({ gaze: 0.2, nod: -0.45, lookY: 0.65, wingBeat: 0.7, lift: 1.1, neckUp: 2.0, charge: 1.0, lid: 0.4, ...size(0.97, 1.04) })],
    [40, sun({ gaze: 0.15, nod: -0.3, lookY: 0.5, wingBeat: 0.3, neckUp: 1.2, charge: 1.1, lid: 0.35 })],
    // Settles low on the hind legs, the claws dug in, the sun-filled wings held wide; the neck draws back into an S.
    [44, sun({ wingBeat: 0.35, crouch: 0.8, coil: 0.3, nod: 0.05, gaze: -0.2, snarl: 0.4, charge: 1.2, fistR: 0.6, fistL: 0.6 })],
    [46, sun({ wingBeat: 0.2, crouch: 2.4, coil: 0.5, nod: 0.12, gaze: -0.3, snarl: 0.6, charge: 1.3, flash: 0.04, fistR: 0.7, fistL: 0.7, ...size(1.04, 0.96) })],
    [50, sun({ wingBeat: 0.3, crouch: 1.8, coil: 0.8, nod: 0.18, gaze: -0.38, snarl: 0.8, charge: 1.3, fistR: 0.7, fistL: 0.7 })],
    [54, sun({ wingBeat: 0.4, crouch: 2, coil: 1, nod: 0.25, gaze: -0.45, snarl: 0.9, roar: 0.3, charge: 1.3, neckUp: 0.6, fistR: 0.7, fistL: 0.7 })],
    // The shot: the head snaps forward and down, the jaws wide; the wings beat forward against the recoil.
    [56, sun({ coil: 0, neckReach: 2.5, gaze: -0.55, nod: 0.55, fire: 1, crouch: 2.6, wingBeat: 0.05, flash: 0.14, charge: 1.3, ...size(1.03, 0.97) })],
    [60, sun({ coil: 0.15, neckReach: 1.8, gaze: -0.5, nod: 0.58, fire: 1, crouch: 2.8, wingBeat: 0.15, lean: -0.4, charge: 1.3 })],
  ];
  // The sweep: the head leads the beam; the recoil drives him back, the hind claws scraping (the dx lane), the wings
  // pushing forward against it.
  BEAM_AIM.slice(1).forEach(([f, g, n], i) =>
    keys.push([f, sun({ coil: 0.15, neckReach: 1.8, gaze: g, nod: n, fire: 1, crouch: 2.8 + (f > 108 ? -1 : 0), wingBeat: i % 2 ? 0.08 : 0.32, lean: -0.4 - (f - 60) * 0.008, neckUp: f > 108 ? 2.5 : 0, charge: 1.3 })]),
  );
  keys.push(
    // The beam goes out; the last shove throws him back onto his wrists, the wings flare.
    [126, sun({ coil: 0.3, gaze: 0.6, nod: 0.1, fire: 0, roar: 0.4, crouch: 1.8, lean: -1.0, neckUp: 1.5, charge: 0.7 })],
    [134, braced({ wingOpen: 1, wingBeat: 0.4, crouch: 3.2, lean: -1.4, bodyPitch: -0.15, nod: -0.2, gaze: 0.2, roar: 0.2, charge: 0.6, fistR: 0.6, fistL: 0.6, flash: 0.03, ...size(1.04, 0.96) })],
    [140, braced({ wingOpen: 0.85, crouch: 2.2, lean: -1.1, nod: 0.25, gaze: 0, charge: 0.5, fistR: 0.3, fistL: 0.3 })],
  );
  // Shakes his head: sparks fly from the jaws.
  shakeHead(keys, 144, 156, 2, 0.32, braced({ crouch: 1.6, lean: -1, nod: 0.25, snarl: 0.4, blink: 1, fistR: 0.2, fistL: 0.2 }));
  keys.push(
    // The wings fold with a snap (overshoot past folded, back).
    [158, { brace: 1, wingOpen: 0.9, crouch: 1.2, lean: -0.8, nod: 0.1 }],
    [161, { brace: 0.3, wingOpen: -0.08, wingBeat: -0.1, crouch: 1.0, lean: -0.7, nod: 0.05 }],
    [166, { wingOpen: 0, crouch: 0.6, lean: -0.5, gaze: -0.2, lookX: -0.5, nod: 0.3 }],
  );
  // He walks home on four over the cooling groove, looks along the scorched arc from end to end, snorts fire with a
  // ring of smoke, rears into the sun pose and snaps the wings shut.
  const dx: Lane = [[0, 0], [56, 0], [122, -34], [134, -44], [170, -44]];
  walkSteps(keys, 170, 8, 4, -44, 0, { lean: -0.2, nod: 0.3, gaze: -0.1 }, dx);
  dx.push([264, 0]);
  keys.push(
    [204, { gaze: -0.45, lookX: -0.8, nod: 0.38, lean: -0.1 }],
    [208, { gaze: -0.42, lookX: -0.7, nod: 0.36 }],
    [214, { gaze: 0.35, lookX: 0.8, nod: 0.3, tailSway: 0.3 }],
    [218, { gaze: 0.3, lookX: 0.6, nod: 0.28 }],
    [221, { gaze: 0.05, coil: 0.5, nod: -0.15, neckUp: 0.6, crouch: 0.6, lid: 0.3 }],
    [223, { gaze: 0, coil: 0, neckReach: 1.2, nod: 0.15, flame: 1, snarl: 0.6, crouch: 1, ...size(1.02, 0.98) }],
    [229, { gaze: 0.1, neckReach: 0.6, nod: 0.05, flame: 0.2, snarl: 0.4 }],
    [234, sun({ wingOpen: 0.8, wingBeat: 0.45, lift: 0.8, neckUp: 1.6, nod: -0.25, gaze: 0.25, snarl: 0.5, charge: 0.6, ...size(0.98, 1.03) })],
    [244, sun({ wingOpen: 0.75, wingBeat: 0.38, lift: 0.6, neckUp: 1.4, nod: -0.2, gaze: 0.3, snarl: 0.4, charge: 0.5 })],
    [248, { rear: 0.2, wingOpen: -0.08, wingBeat: -0.12, lift: 0, crouch: 0.6, nod: 0.08, snarl: 0.2 }],
    [254, { nod: 0.02, lid: 0.25 }],
    [264, {}],
  );
  keys.sort((a, b) => a[0] - b[0]);
  return { keys, lanes: { dx, wingHeat: [[0, 0], [12, 0], [40, 1], [60, 1], [122, 0.7], [134, 0.3], [160, 0], [264, 0]] } };
}
function trickBTrack(): { keys: Track; lanes: Record<string, Lane> } {
  const fly = (p: JointPose = {}): JointPose => ({ ...WIDE, point: 1, tuck: 0.7, tailCurl: 0.3, fistR: 0.7, fistL: 0.7, ...p });
  const keys: Track = [
    [0, {}],
    // The spring: low on four, the wrists drawn back under the chest, the tail coiled.
    [10, { crouch: 3.2, lean: 0.5, bodyPitch: 0.12, nod: 0.15, tailCurl: 0.6, lookY: 0.5, brace: 1, wingOpen: 0.25 }],
    [18, { crouch: 5.2, lean: 0.8, bodyPitch: 0.2, nod: 0.25, tailCurl: 0.9, lookY: 0.8, snarl: 0.5, brace: 1, wingOpen: 0.3, ...foreR(11.5, 6, 1.8), ...foreL(11.5, -6, 1.8) }],
    // The vault, as pterosaurs launched [вики: Pterosaur — Habib, Witton]: the wings fold tight, the hind legs throw
    // him forward over the planted wrists, the arms straighten and give the main push; the wings open only when the
    // wrists leave the stone, at the top, and the first downstroke follows.
    [20, { crouch: 4.6, lean: 1.0, bodyPitch: 0.28, nod: 0.3, tailCurl: 0.9, lookY: 0.8, snarl: 0.6, vault: 1, wingOpen: 0, ...foreR(12.5, 6, 1.8), ...foreL(12.5, -6, 1.8), ...size(1.06, 0.94) }],
    [22, { crouch: 0, jump: 3.2, lean: 0.6, bodyPitch: -0.1, vault: 1, wingOpen: 0.05, point: 0.9, nod: -0.2, tailCurl: 0.4, ...foreR(12.5, 6, 1.8), ...foreL(12.5, -6, 1.8), ...size(0.92, 1.12) }],
    [24, fly({ jump: 6.5, vault: 0, wingOpen: 0.8, wingBeat: 0.95, nod: -0.35, tuck: 0.4, ...size(0.88, 1.18) })],
    [26, fly({ jump: 10, wingBeat: -0.9, nod: -0.4, ...size(0.86, 1.2) })],
    [30, fly({ jump: 14, wingBeat: 0.7, nod: -0.45, ...size(0.84, 1.24) })],
    [34, fly({ jump: 17, wingBeat: -0.8, nod: -0.5, ...size(0.81, 1.28) })],
    [37, fly({ jump: 19, wingBeat: 0.6, nod: -0.5, ...size(0.79, 1.31) })],
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
    // Back in from the upper left, gliding down, the feet reaching for the stone.
    [124, fly({ bodyPitch: 0.35, wingBeat: 0.5, jump: 14, nod: 0.2, ...size(0.9) })],
    // The stall before the touch [вики: Pterosaur; Crayssac landing track — it stalled to bleed off speed]: nose up,
    // the wings spread wide and swept forward like air brakes, the hind feet reaching ahead for the stone.
    [127, fly({ bodyPitch: 0.05, wingBeat: -0.3, jump: 7.5, point: 0.5, tuck: 0, nod: 0.2, wingOpen: 1.1 })],
    [128, { ...WIDE, wingOpen: 1.15, wingBeat: 0.4, wingSweep: -0.4, bodyPitch: -0.32, rear: 0.6, jump: 3.6, point: 0.2, nod: 0.32, tailCurl: 0.2, fistR: 0.5, fistL: 0.5, ...footR(0.6, 4.3, 5.2), ...footL(0.6, -4.3, 5.2) }],
    // the hind feet touch first, the wrists still up
    [129, { ...WIDE, wingOpen: 1.1, wingBeat: 0.55, wingSweep: -0.25, bodyPitch: -0.12, rear: 0.45, jump: 1.6, crouch: 1.5, nod: 0.3, fistR: 0.6, fistL: 0.6, ...size(1.04, 0.96) }],
    // The landing: hind feet, then both wrists slam down; the skid on four, the wings braking as a hood.
    [130, braced({ wingOpen: 0.95, wingBeat: 0.6, crouch: 5.5, lean: -0.8, bodyPitch: 0.2, nod: 0.35, snarl: 0.8, flash: 0.08, fistR: 0.8, fistL: 0.8, ...size(1.08, 0.92) })],
    [136, braced({ wingOpen: 0.85, wingBeat: 0.45, crouch: 4.4, lean: -0.6, bodyPitch: 0.15, nod: 0.3, snarl: 0.7, fistR: 0.8, fistL: 0.8 })],
    // Rears and roars at the sky, the wings thrown wide, the claws spread, embers raining.
    [144, { rear: 1, ...WIDE, wingOpen: 1.1, wingBeat: 0.45, crouch: 0.6, lift: 1.5, neckUp: 3.5, nod: -0.65, roar: 1, fistR: -0.6, fistL: -0.6, charge: 1.2 }],
    [158, { rear: 1, ...WIDE, wingOpen: 1.1, wingBeat: 0.35, crouch: 0.4, lift: 1.6, neckUp: 3.6, nod: -0.7, roar: 1, fistR: -0.6, fistL: -0.6, charge: 1.3 }],
    // Half down, leaning at us with the wings spread wide, and the second roar straight at the viewer.
    [163, { ...WIDE, wingOpen: 1.05, wingBeat: 0.3, crouch: 0.6, lean: 0.3, bodyPitch: 0.2, neckUp: 1.2, nod: 0.12, gaze: 0.5, roar: 0.35, charge: 1.1, fistR: -0.6, fistL: -0.6 }],
    [166, { ...WIDE, wingOpen: 1.1, wingBeat: -0.25, crouch: 1.5, lean: 0.8, bodyPitch: 0.34, neckReach: 2, nod: 0.2, gaze: 0.55, roar: 1, snarl: 1, charge: 1.3, flash: 0.05, fistR: -0.9, fistL: -0.9, ...size(1.03, 0.97) }],
    [178, { ...WIDE, wingOpen: 1.1, wingBeat: -0.1, crouch: 1.3, lean: 0.75, bodyPitch: 0.32, neckReach: 1.8, nod: 0.18, gaze: 0.5, roar: 0.9, snarl: 1, charge: 1.2, fistR: -0.9, fistL: -0.9 }],
    [184, braced({ wingOpen: 0.8, wingBeat: 0.2, crouch: 0.6, lean: 0.2, nod: 0.1, gaze: 0.3, roar: 0.15, snarl: 0.5, charge: 0.9 })],
    // Shakes the ash off: a shiver through the body and the raised wings.
    [188, braced({ wingBeat: 0.45, twist: 0.12, crouch: 0.5, nod: 0.15, blink: 1 })],
    [191, braced({ wingBeat: -0.05, twist: -0.12, crouch: 0.6, nod: 0.1, blink: 1 })],
    [194, braced({ wingBeat: 0.35, twist: 0.07, crouch: 0.5, nod: 0.12 })],
    [197, braced({ wingBeat: 0.15, twist: 0, crouch: 0.4, nod: 0.1 })],
    // Folds the wings (snap), looks at the cooling cracks, walks home on four.
    [198, { brace: 1, wingOpen: 0.85, nod: 0.1, gaze: -0.2 }],
    [201, { brace: 0.3, wingOpen: -0.06, nod: 0.2, gaze: -0.3, lookX: -0.5 }],
    [204, { wingOpen: 0, nod: 0.3, gaze: -0.3, lookX: -0.5 }],
  ];
  const back: Lane = [[0, 0], [123, 0], [124, -144], [128, -75], [130, -51], [136, -39], [206, -39]];
  walkSteps(keys, 206, 10, 4, -39, 0, { nod: 0.25, gaze: -0.1 }, back);
  keys.push([256, { nod: 0, snarl: 0.3, lid: 0.25 }], [276, {}]);
  back.push([276, 0]);
  keys.sort((a, b) => a[0] - b[0]);
  return {
    keys,
    lanes: {
      dx: [[0, 0], [99, 0], [100, -285], [111, 285], [112, 0], [123, 0], ...back.slice(2)],
      dy: [[0, 0], [22, 0], [26, -36], [30, -105], [36, -240], [39, -345], [40, 0], [99, 0], [100, 45], [111, 78], [112, 0], [123, 0], [124, -225], [128, -60], [130, 0], [276, 0]],
    },
  };
}
/** The three mirrors stand where the skin puts them: front-near, back-near, front-far. He turns to the first. */
function trickCTrack(): { keys: Track; lanes: Record<string, Lane> } {
  const hold = (p: JointPose = {}): JointPose => braced({ wingOpen: 0.6, crouch: 0.6, nod: -0.05, charge: 1.3, mirrorsOn: 1, lid: 0.3, fistR: 0.4, fistL: 0.4, ...p });
  const keys: Track = [
    [0, {}],
    // The tail strike that raises the mirrors.
    [4, { tailLift: 0.9, tailSway: -0.3, crouch: 0.8, nod: 0.1, gaze: -0.2 }],
    [8, { tailLift: -0.35, tailSway: 0.15, crouch: 1.4, nod: 0.2, gaze: -0.3, flash: 0.04, mirrorsOn: 1 }],
    [14, { tailLift: 0, crouch: 0.8, nod: 0.1, gaze: -0.35, lookX: -0.6, mirrorsOn: 1 }],
    [24, { crouch: 0.5, gaze: -0.2, nod: 0, lookX: -0.3, mirrorsOn: 1 }],
    // Turned to the first mirror; braces, a deep breath.
    [36, { crouch: 0.8, nod: 0.15, gaze: 0, charge: 0.9, lid: 0.2, mirrorsOn: 1, coil: 0.4, brace: 0.6, wingOpen: 0.2 }],
    [40, braced({ wingOpen: 0.4, crouch: 1.2, nod: 0.2, gaze: 0, charge: 1.1, mirrorsOn: 1, coil: 0.6, snarl: 0.4 })],
    // The beam: short and bright, into the first mirror; the jaws close on it.
    [42, braced({ wingOpen: 0.5, crouch: 1.6, nod: 0.25, gaze: 0, fire: 1, neckReach: 1.5, mirrorsOn: 1, flash: 0.06 })],
    [48, braced({ wingOpen: 0.55, crouch: 1.2, nod: 0.2, gaze: 0, fire: 0, snarl: 0.5, mirrorsOn: 1, charge: 1.2 })],
    // Inside the triangle: braced, the wings up, he turns slowly while the pearl charges.
    [60, hold()],
    [118, hold({ wingOpen: 0.7, crouch: 0.4, nod: -0.15, charge: 1.6, lid: 0.2, snarl: 0.4 })],
    // Rears and draws the triangle into the pearl with both hands: the claws close on the light, the mirrors crack.
    [124, { rear: 1, wingOpen: 0.5, lift: 1.2, neckUp: 2, nod: -0.3, ...R(14, 3.2, 9), ...L(14, -3.2, 9.5), fistR: -0.8, fistL: -0.8, charge: 1.7, mirrorsOn: 1 }],
    [128, { rear: 1, wingOpen: 0.45, lift: 1.5, neckUp: 2.4, nod: -0.4, roar: 0.4, ...R(11.5, 2.2, 10.5), ...L(11.5, -2.2, 11), fistR: 0.9, fistL: 0.9, charge: 1.9, mirrorsOn: 1 }],
    // The solar flash: hands and wings flung wide.
    [130, { rear: 1, ...WIDE, wingOpen: 1.2, lift: 2, neckUp: 3, nod: -0.55, roar: 1, fistR: -0.9, fistL: -0.9, charge: 2, mirrorsOn: 1, flash: 0.2 }],
    [132, { rear: 1, ...WIDE, wingOpen: 1.1, lift: 1.8, neckUp: 3, nod: -0.5, roar: 0.9, fistR: -0.9, fistL: -0.9, charge: 1.6, flash: 0.08 }],
    [150, { rear: 0.8, ...WIDE, wingBeat: 0.2, lift: 0.8, neckUp: 1.5, nod: -0.2, roar: 0.2, fistR: -0.4, fistL: -0.4, charge: 1 }],
    // Down to the nearest smouldering mark and sniffs it; the ash makes him snort.
    [166, { brace: 1, wingOpen: 0.4, wingBeat: 0.15, neckUp: 0.8, nod: 0.05, gaze: -0.2, lookX: -0.4, charge: 0.8 }],
    [176, { brace: 1, wingOpen: 0.3, lean: 0.9, crouch: 1.3, neckReach: 1.6, nod: 0.5, gaze: -0.35, lookX: -0.6, charge: 0.7 }],
    [182, { brace: 1, wingOpen: 0.3, lean: 0.95, crouch: 1.2, neckReach: 1.8, nod: 0.55, gaze: -0.32, lookX: -0.5, lid: 0.4 }],
    [185, { brace: 1, wingOpen: 0.5, wingBeat: 0.3, lean: 0.7, crouch: 0.8, neckReach: 0.6, nod: 0.1, gaze: -0.2, snarl: 0.7, blink: 1, ...size(1.02, 0.98) }],
    [190, { brace: 1, wingOpen: 0.6, lean: 0.3, crouch: 0.5, neckUp: 0.8, nod: 0.05, gaze: 0.05, snarl: 0.3 }],
    [196, braced({ wingBeat: 0.15, neckUp: 0.6, nod: 0.15, gaze: 0.1, charge: 0.7, fistR: 0, fistL: 0 })],
  ];
  // Three packets of light run round the triangle; each arrival in the pearl jolts him up off his wrists.
  beats.trick_c.packets.forEach((p, i) => {
    const w = 0.6 + i * 0.04,
      ch = 1.37 + i * 0.1;
    keys.push(
      [p + 7, hold({ wingOpen: w, crouch: 1.05, nod: -0.07, charge: ch })],
      [p + 10, hold({ wingOpen: w + 0.3, wingBeat: 0.45, crouch: 0, lift: 0.9, bodyPitch: -0.12, nod: -0.22 - i * 0.04, snarl: 0.8, charge: ch + 0.3, flash: 0.04, ...size(0.98, 1.03) })],
      [p + 16, hold({ wingOpen: w, crouch: 0.55 - i * 0.05, nod: -0.07, charge: ch, lid: 0.25, snarl: 0.3 })],
    );
  });
  // Shakes the golden dust off: the raised wings shiver, then fold.
  for (let f = 200, i = 0; f <= 216; f += 2, i++) keys.push([f, { brace: 1, wingOpen: 0.8, wingBeat: (i % 2 ? 0.35 : -0.05) * (1 - (f - 200) / 20), tilt: (i % 2 ? 0.12 : -0.12) * (1 - (f - 200) / 20), blink: 1 }]);
  keys.push([222, { brace: 0.2, wingOpen: 0.1, nod: 0.25, gaze: -0.2, lookX: -0.5 }], [236, { nod: 0.3, gaze: 0.25, lookX: 0.5 }], [250, { nod: 0.05, lid: 0.25, snarl: 0.2 }], [276, {}]);
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
      [6, { crouch: 1.2, nod: 0.2, gaze: 0.15, lookY: 0.4, snarl: 0.4 }],
      [14, { rear: 0.8, neckUp: 3.2, nod: -0.6, lookY: 0.8, gaze: 0.2, roar: 1, charge: 1 }],
      [22, { rear: 0.85, neckUp: 3.2, nod: -0.62, lookY: 0.8, gaze: 0.2, roar: 0.6, wingOpen: 0.4, charge: 1.1 }],
      // He opens the wings and rises as the shadow runs over the scene.
      [32, { ...WIDE, wingBeat: -0.5, neckUp: 2.5, nod: -0.45, gaze: 0.15, point: 0.6, charge: 1.2 }],
      [38, { ...WIDE, wingBeat: 0.6, neckUp: 2.5, nod: -0.45, point: 0.8, tuck: 0.2, charge: 1.2 }],
      [44, { ...WIDE, wingBeat: -0.4, neckUp: 2.5, nod: -0.5, point: 1, tuck: 0.3, charge: 1.3 }],
      [50, { ...WIDE, wingBeat: 0.5, neckUp: 2.8, nod: -0.55, point: 1, tuck: 0.3, charge: 1.4 }],
      // Totality: the wings flung wide, the claws spread, the pearl goes black.
      [56, { ...WIDE, wingOpen: 1.15, wingBeat: 0.3, neckUp: 3, nod: -0.6, roar: 1, point: 1, fistR: -0.8, fistL: -0.8, charge: 1.6, pearlDark: 1, flash: 0.1 }],
      [76, { ...WIDE, wingOpen: 1.1, wingBeat: 0.2, neckUp: 2.6, nod: -0.4, roar: 0.5, point: 1, fistR: -0.8, fistL: -0.8, charge: 1.6, pearlDark: 1 }],
      // The scales flip: the claws clench.
      [88, { ...WIDE, wingBeat: 0.55, neckUp: 2, nod: -0.2, point: 1, fistR: 0.8, fistL: 0.8, charge: 1.4, pearlDark: 1 }],
      // The shock wave from the chest, a wing beat: flight.
      [92, { ...WIDE, wingBeat: -0.8, neckUp: 1.5, nod: 0, point: 1, fistR: -0.6, fistL: -0.6, charge: 1.6, pearlDark: 1, flash: 0.12 }],
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
  // the wings spread (the eclipse form adds 0.62 to wingOpen), the claws closed on the ribbons
  const whirl = (p: JointPose = {}): JointPose => f2({ wingOpen: 0.4, wingBeat: 0.1, fistR: 0.7, fistL: 0.7, snarl: 0.6, charge: 1.2, ...p });
  const toSun = (p: JointPose = {}): JointPose => f2({ ...R(13, 7.5, 24), ...L(13, -7.5, 25), neckUp: 2, nod: -0.5, lookY: 0.8, gaze: 0.2, ...p });
  const keys: Track = [
    [0, f2({})],
    // Both wing-hands up to the black sun; with the wings up he cannot beat, so he sinks a little.
    // the hands go up round the sides, wide of the crown
    [5, f2({ ...R(9, 11, 15), ...L(9, -11, 16), fistR: -0.5, fistL: -0.5, neckUp: 1, nod: -0.25, lookY: 0.5, hover: 4.5 })],
    [10, toSun({ fistR: -0.7, fistL: -0.7, charge: 0.9, hover: 4 })],
    [26, toSun({ ...R(13, 8, 24.5), ...L(13, -8, 25.5), fistR: 0.6, fistL: 0.6, neckUp: 2.2, charge: 1.2, hover: 3.2 })],
    // The whips burst out; one slow turn with the wings spread.
    [30, whirl({ flash: 0.06, roar: 0.6 })],
    [60, whirl({ roar: 0, nod: 0.05 })],
    // Faster: the wings drawn in like a skater's arms.
    [100, whirl({ wingOpen: -0.25, fistR: 0.9, fistL: 0.9, snarl: 0.9, charge: 1.4, nod: 0.1 })],
    [137, whirl({ wingOpen: -0.5, fistR: 1, fistL: 1, snarl: 1, charge: 1.5, nod: 0.12 })],
    [138, whirl({ wingOpen: -0.5, wrap: 0.45, fistR: 1, fistL: 1, snarl: 1, charge: 1.5, nod: 0.12 })],
    // The dead stop: wings and whips wrap him.
    [140, whirl({ wingOpen: -0.5, wrap: 1, fistR: 1, fistL: 1, snarl: 1, charge: 1.5, ...size(1.04, 0.96) })],
    // The wings burst open; the lunge at the glass and the roar.
    [144, whirl({ overAll: 1, wrap: 0, wingOpen: 0.6, wingBeat: -0.5, fistR: -0.9, fistL: -0.9, roar: 1, neckReach: 3, nod: 0.3, gaze: 0.5, snarl: 1, charge: 1.8, flash: 0.1 })],
    [150, whirl({ overAll: 1, wingOpen: 0.6, wingBeat: 0.4, fistR: -0.9, fistL: -0.9, roar: 1, neckReach: 3, nod: 0.28, gaze: 0.5, snarl: 1, charge: 1.6 })],
    [172, whirl({ overAll: 1, wingOpen: 0.4, fistR: 0, fistL: 0, roar: 0.3, neckReach: 1, nod: 0.15, gaze: 0.4, snarl: 0.6, charge: 1.2, lid: 0.3 })],
    [176, whirl({ wingOpen: 0.4, fistR: 0, fistL: 0, roar: 0.2, nod: 0.12, gaze: 0.35, snarl: 0.5, charge: 1.1 })],
    [200, f2({ gaze: 0.2, snarl: 0.4, lid: 0.3, charge: 0.8 })],
    // He gives the corona back: fists up to the black sun, the claws open, the ribbons fly home, the corona flares.
    [208, toSun({ fistR: 0.8, fistL: 0.8, charge: 1, hover: 4 })],
    [212, toSun({ ...R(13, 7.5, 24.5), ...L(13, -7.5, 25.5), fistR: 0.9, fistL: 0.9, neckUp: 2.1, lookY: 0.85, charge: 1.1, crouch: 0.8, hover: 3.6 })],
    [214, toSun({ ...R(13.5, 8, 26), ...L(13.5, -8, 27), fistR: -0.9, fistL: -0.9, neckUp: 2.4, nod: -0.6, lookY: 0.9, lift: 0.6, charge: 1.3, flash: 0.03, hover: 4 })],
    [224, f2({ wingBeat: -0.6, neckUp: 2.2, nod: -0.55, lookY: 0.9, gaze: 0.2, charge: 0.9 })],
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
      dy: [[0, 0], [140, 0], [144, 81], [172, 87], [176, 78], [196, 0], [288, 0]],
      sx: [[0, 0], [140, 0.04], [144, 0.5], [172, 0.52], [176, 0.45], [196, 0], [288, 0]],
      sy: [[0, 0], [140, -0.04], [144, 0.5], [172, 0.52], [176, 0.45], [196, 0], [288, 0]],
    },
  };
}
function trickBF2Track(): { keys: Track; lanes: Record<string, Lane> } {
  const glass = (p: JointPose = {}): JointPose => f2({ overAll: 1, noShadow: 1, wingOpen: 0.45, neckUp: 1, charge: 1, ...p });
  const keys: Track = [
    [0, f2({})],
    // Looks down at his shadow.
    [10, f2({ nod: 0.6, lookY: -0.8, gaze: -0.1, neckReach: 1, charge: 0.7 })],
    [24, f2({ nod: 0.65, lookY: -0.8, gaze: 0.1, neckReach: 1.5, snarl: 0.5, charge: 0.9, wingBeat: 0.6 })],
    // Up a beat, then the stoop: the wings folded, head first.
    [28, f2({ nod: 0.3, wingOpen: 0.4, wingBeat: 0.68, point: 1, hover: 7 })],
    [31, f2({ pitch: 1.1, nod: 0.5, wingOpen: -0.5, wingBeat: -0.3, point: 1, tuck: 0.6, hover: 3, ...size(0.9, 1.15) })],
    [33, f2({ pitch: 1.5, nod: 0.6, wingOpen: -0.62, point: 1, tuck: 0.8, hover: -2, ...size(0.75, 1.35) })],
    [34, { hidden: 1, form: 1 }],
    [109, { hidden: 1, form: 1 }],
    // Out of the shadow at the bottom edge: huge, wings over the frame, the roar.
    [110, glass({ wingOpen: 0.5, wingBeat: 0.8, roar: 1, snarl: 1, neckUp: 2, nod: -0.2, gaze: 0.45, fistR: -0.9, fistL: -0.9, charge: 1.5, flash: 0.08 })],
    [114, glass({ wingOpen: 0.5, wingBeat: -0.3, roar: 1, snarl: 1, neckUp: 2, nod: -0.15, gaze: 0.45, fistR: -0.9, fistL: -0.9, charge: 1.5 })],
    // Breathes on the glass (it fogs).
    [122, glass({ wingBeat: 0.1, roar: 0.1, snarl: 0.3, neckReach: 2.5, nod: 0.12, gaze: 0.45, fistR: 0.5, fistL: 0.5, charge: 1.1 })],
    [126, glass({ wingBeat: 0.25, roar: 0.55, snarl: 0, lid: 0.35, neckReach: 3, nod: 0.15, gaze: 0.45, fistR: 0.5, fistL: 0.5, lift: 0.4 })],
    // Draws a crescent in the fog with the claws of the near wing-hand, grins.
    [131, glass({ wingBeat: 0.1, snarl: 0.2, neckReach: 2, nod: 0.1, gaze: 0.4, ...R(27, 7, 19), fistR: -0.4, fistL: 0.5 })],
    [134, glass({ snarl: 0.3, neckReach: 2, nod: 0.12, gaze: 0.35, ...R(28.5, 9.5, 17), fistR: -0.5, fistL: 0.5 })],
    [139, glass({ snarl: 0.4, neckReach: 2, nod: 0.15, gaze: 0.3, ...R(28, 6.5, 15), fistR: -0.5, fistL: 0.5 })],
    [144, glass({ snarl: 0.5, neckReach: 2, nod: 0.12, gaze: 0.35, ...R(27, 9, 13.5), fistR: -0.5, fistL: 0.5 })],
    [147, glass({ wingOpen: 0.4, wingBeat: 0.3, snarl: 1, nod: 0.05, gaze: 0.5, lid: 0.2, fistR: 0.6, fistL: 0.6, charge: 1.1 })],
    [150, glass({ wingOpen: 0.4, wingBeat: 0.6, nod: 0.05, gaze: 0.3, fistR: 0.8, fistL: 0.8, point: 1, snarl: 0.6, charge: 1.1 })],
    // The back somersault home, legs tucked.
    [176, f2({ fistR: 0.6, fistL: 0.6, snarl: 0.4, charge: 0.9 })],
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
      dy: [[0, 0], [30, 0], [33, 12], [34, 0], [109, 0], [110, 93], [150, 93], [174, 0], [276, 0]],
      sx: [[0, 0], [109, 0], [110, 0.62], [150, 0.62], [174, 0], [276, 0]],
      sy: [[0, 0], [109, 0], [110, 0.62], [150, 0.62], [174, 0], [276, 0]],
    },
  };
}
function trickCF2Track(): { keys: Track; lanes: Record<string, Lane> } {
  const lookUp = (p: JointPose = {}): JointPose => f2({ neckUp: 2, nod: -0.45, lookY: 0.8, charge: 0.9, ...p });
  /** A catch: the hand of one wing snaps up and out to the star and closes on it; that wing stops beating, so he
   * dips to its side and the other wing beats down hard to right him. */
  const catchKey = (side: 'L' | 'R' | 'both', i: number): JointPose => {
    const r: JointPose = side !== 'L' ? { ...R(16, 10, 18), fistR: 0.9 } : { fistR: 0.3, wingBeatR: -0.8 };
    const l: JointPose = side !== 'R' ? { ...L(16, -9, 19), fistL: 0.9 } : { fistL: 0.3, wingBeatL: -0.8 };
    const dir = side === 'R' ? 1 : side === 'L' ? -1 : 0;
    return f2({ ...r, ...l, nod: -0.2, lookY: 0.5, neckUp: 1, roll: dir * 0.1, gaze: dir * 0.25, snarl: 0.6, charge: 1.1 + i * 0.1, flash: 0.03, hover: side === 'both' ? 3.6 : 4.3 });
  };
  /** The star pressed to the chest: the hand opens over the pearl and the star joins the ball. */
  const pressKey = (side: 'L' | 'R' | 'both', i: number): JointPose =>
    f2({ ...(side !== 'L' ? { ...R(16, 2.8, 4.5), fistR: -0.4 } : {}), ...(side !== 'R' ? { ...L(16, -2.8, 5), fistL: -0.4 } : {}), nod: 0.25, lookY: -0.3, snarl: 0.3, charge: 1.15 + i * 0.1, wingBeat: 0.3 });
  const keys: Track = [
    [0, f2({})],
    [12, lookUp({})],
    [28, lookUp({ nod: -0.3, lookY: 0.5 })],
  ];
  const catches = beats['trick_c-f2'].catches;
  const sides: ('L' | 'R' | 'both')[] = ['L', 'R', 'L', 'R', 'both'];
  catches.forEach((c, i) => {
    const s = sides[i];
    keys.push([c - 3, f2({ nod: -0.1, gaze: s === 'R' ? 0.3 : s === 'L' ? -0.3 : 0, lookY: 0.3, charge: 1, wingBeat: 0.6 })]);
    keys.push([c, catchKey(s, i)]);
    keys.push([c + 5, pressKey(s, i)]);
  });
  keys.push(
    // Down onto the dial on his hind legs with the ball in both hands before his chest, the wings folded.
    [90, f2({ hover: 0, rear: 1, wingOpen: -0.62, ...R(14, 3.2, 10.5), ...L(14, -3.2, 11), fistR: -0.5, fistL: -0.5, nod: 0.3, charge: 1.6, snarl: 0.4, crouch: 1.2, ...size(1.03, 0.97) })],
    [94, f2({ hover: 0, rear: 1, wingOpen: -0.62, ...R(14, 3.2, 10.5), ...L(14, -3.2, 11), fistR: -0.5, fistL: -0.5, nod: 0.3, charge: 1.6, snarl: 0.4 })],
    // Lifts it overhead and turns with it.
    [100, f2({ hover: 0, rear: 1, wingOpen: -0.4, ...R(15, 5.2, 22), ...L(15, -5.2, 22.5), fistR: -0.8, fistL: -0.8, neckReach: -2.2, neckUp: 0.6, nod: -0.45, lookY: 0.8, charge: 1.6 })],
    [118, f2({ hover: 0, rear: 1, wingOpen: -0.4, ...R(15, 5.2, 22.5), ...L(15, -5.2, 23), fistR: -0.8, fistL: -0.8, neckReach: -2.2, neckUp: 0.6, nod: -0.45, lookY: 0.8, charge: 1.7 })],
    // The throw up out of the picture: the same downstroke lifts him off the dial again.
    [120, f2({ hover: 0, rear: 1, wingOpen: -0.4, ...R(14, 5.2, 19), ...L(14, -5.2, 19.5), fistR: -0.8, fistL: -0.8, crouch: 1.6, neckReach: -2.2, neckUp: 0.9, nod: -0.3, charge: 1.7, wingBeat: 0.7 })],
    [122, f2({ hover: 1.5, rear: 0.6, wingOpen: 0.3, wingBeat: -0.8, ...R(12, 3.5, 28), ...L(12, -3.5, 28.5), fistR: -0.9, fistL: -0.9, crouch: -1, neckReach: -1.2, neckUp: 3, nod: -0.7, roar: 0.8, charge: 1.8, flash: 0.06 })],
    [132, f2({ wingBeat: 0.4, neckUp: 2.5, nod: -0.6, lookY: 0.9, charge: 1.2 })],
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
  keys.sort((a, b) => a[0] - b[0]);
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
  const heraldic: JointPose = { rear: 0.95, wingOpen: 0.6, wingSweep: 0.45, neckUp: 1.3, nod: -0.06, gaze: 0.2, snarl: 0.25, lid: 0.15, charge: 0.8, fistR: -0.3, fistL: -0.3 };
  const slam = { ...foreR(15.5, 7.5, 1.8), ...foreL(15.5, -7.5, 1.8) };
  return [
    [0, { hidden: 1 }],
    [51, { hidden: 1 }],
    // Comes down from above the frame, beating hard, legs tucked, then reaches for the ground.
    [52, { ...WIDE, wingBeat: -0.7, point: 1, tuck: 0.7, jump: 12, bodyPitch: 0.25, nod: 0.3, fistR: 0.6, fistL: 0.6 }],
    [55, { ...WIDE, wingBeat: 0.75, point: 1, tuck: 0.6, jump: 12, bodyPitch: 0.25, nod: 0.25, fistR: 0.6, fistL: 0.6 }],
    [58, { ...WIDE, wingBeat: -0.6, point: 1, tuck: 0.2, jump: 11, bodyPitch: 0.22, roar: 0.3, nod: 0.2, fistR: -0.6, fistL: -0.6 }],
    [60, { ...WIDE, wingBeat: 0.6, point: 1, jump: 10, bodyPitch: 0.2, roar: 0.6, nod: 0.2, fistR: -0.6, fistL: -0.6 }],
    // the stall over the stone: nose up, the wings swept forward as brakes, the hind feet reaching ahead
    [63, { ...WIDE, wingOpen: 1.15, wingBeat: 0.5, wingSweep: -0.4, bodyPitch: -0.3, rear: 0.6, jump: 4, point: 0.2, roar: 0.4, nod: 0.3, ...footR(0.6, 4.3, 5.2), ...footL(0.6, -4.3, 5.2) }],
    [65, { ...WIDE, wingOpen: 1.1, wingBeat: 0.6, wingSweep: -0.2, bodyPitch: -0.1, rear: 0.45, jump: 1, crouch: 1.8, roar: 0.3, nod: 0.3, ...size(1.04, 0.96) }],
    // The heavy landing: hind feet, then both wrists slammed down wide, the wings up.
    [66, braced({ wingOpen: 0.95, wingBeat: 0.5, crouch: 6.5, lean: 0.6, bodyPitch: 0.35, nod: 0.45, snarl: 0.8, flash: 0.12, fistR: 0.9, fistL: 0.9, ...slam, ...size(1.08, 0.92) })],
    [72, braced({ wingOpen: 0.85, wingBeat: 0.35, crouch: 6, lean: 0.5, bodyPitch: 0.3, nod: 0.45, snarl: 0.6, fistR: 0.9, fistL: 0.9, ...slam })],
    // Rises on the hind legs, the wings thrown wide; the pearl flares.
    [86, { rear: 1, ...WIDE, wingOpen: 1.15, wingBeat: 0.3, crouch: 1, lift: 0.6, neckUp: 1.5, nod: -0.1, fistR: -0.6, fistL: -0.6, charge: 1.8 }],
    [98, { rear: 1, ...WIDE, wingOpen: 1.1, wingBeat: 0.25, crouch: 0.6, lift: 0.5, neckUp: 1.5, nod: -0.05, fistR: -0.6, fistL: -0.6, charge: 1.4 }],
    // The roar to the sun with a column of flame.
    [104, { rear: 1, ...WIDE, wingOpen: 1.1, bodyPitch: -0.15, lift: 1.4, neckUp: 3.6, nod: -0.85, fire: 1, fistR: 0.8, fistL: 0.8, charge: 1.6 }],
    [122, { rear: 1, ...WIDE, wingOpen: 1.1, bodyPitch: -0.17, lift: 1.5, neckUp: 3.6, nod: -0.85, fire: 1, fistR: 0.8, fistL: 0.8, charge: 1.6 }],
    [126, { rear: 1, ...WIDE, lift: 0.8, neckUp: 2.4, nod: -0.4, fire: 0, roar: 0.3, charge: 1 }],
    // The heraldic pose: reared, the wings raised behind his back, the head high; held still, then he settles.
    [132, heraldic],
    [144, heraldic],
    [151, {}],
    [168, {}],
  ];
}
const peekHang = (p: JointPose = {}): JointPose => ({ hidden: 1, noShadow: 1, ...p });
/** A startled spring off the hind legs, the wings flung open (not a launch: launches vault over the wrists). */
const springUp = (p: JointPose = {}): JointPose => ({ rear: 0.6, wingOpen: 0.8, wingBeat: 0.9, point: 1, ...p });
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
  // Sits up on the haunches and shades his eyes from the low sun with the hand of the near wing; glances away.
  look: [
    [0, {}],
    [4, { rear: 0.35, nod: -0.05, neckUp: 0.4 }],
    [8, { rear: 0.6, ...R(16, 3.6, 22.5), fistR: -0.5, nod: -0.22, lookY: 0.45, lid: 0.35, neckUp: 1.2, gaze: 0.12 }],
    [18, { rear: 0.6, ...R(16.2, 3.6, 22.7), fistR: -0.5, nod: -0.24, lookY: 0.45, lid: 0.4, neckUp: 1.3, gaze: 0.08 }],
    [22, { rear: 0.4, gaze: -0.6, lookX: -0.8, neckUp: 0.8 }],
    [28, { rear: 0.15, gaze: -0.55, lookX: -0.8, neckUp: 0.5 }],
    [36, {}],
  ],
  // Lifts the near wing off the stone, spreads it and nibbles the membrane; a glowing scale falls.
  fidget_a: [
    [0, {}],
    [6, { brace: 1, wingOpenR: 0.4, ...R(11, 12, 3), gaze: 0.3 }],
    [12, { brace: 1, wingOpenR: 0.85, wingSweepR: 0.25, wingBeatR: 0.15, ...R(8, 17, 4), gaze: 0.95, nod: 0.35, neckReach: -2.5, tilt: 0.15 }],
    [18, { brace: 1, wingOpenR: 0.85, wingSweepR: 0.25, wingBeatR: 0.15, ...R(8, 17, 4), gaze: 0.98, nod: 0.38, neckReach: -2.6, tilt: 0.15, roar: 0.25 }],
    [21, { brace: 1, wingOpenR: 0.85, wingSweepR: 0.25, wingBeatR: 0.15, ...R(8, 17, 4), gaze: 0.98, nod: 0.36, neckReach: -2.6, tilt: 0.15 }],
    [24, { brace: 1, wingOpenR: 0.85, wingSweepR: 0.25, wingBeatR: 0.18, ...R(8, 17, 4.2), gaze: 1.02, nod: 0.4, neckReach: -2.7, tilt: 0.18, roar: 0.25 }],
    [27, { brace: 1, wingOpenR: 0.85, wingSweepR: 0.25, wingBeatR: 0.18, ...R(8, 17, 4.2), gaze: 1.02, nod: 0.38, neckReach: -2.7, tilt: 0.18 }],
    [30, { brace: 1, wingOpenR: 0.85, wingSweepR: 0.25, wingBeatR: 0.2, ...R(8, 17, 4.4), gaze: 1.05, nod: 0.42, neckReach: -2.8, tilt: 0.2, roar: 0.3, snarl: 0.4 }],
    [33, { brace: 1, wingOpenR: 0.85, wingSweepR: 0.25, wingBeatR: 0.2, ...R(8, 17, 4.4), gaze: 1.0, nod: 0.38, neckReach: -2.6, tilt: 0.15 }],
    // A shiver of the wing; he watches the scale fall.
    [36, { brace: 1, wingOpenR: 0.85, wingSweepR: 0.2, wingBeatR: 0.45, ...R(8, 16.5, 4.8), gaze: 0.6, nod: 0.3, lookX: 0.5, neckReach: -1 }],
    [38, { brace: 1, wingOpenR: 0.85, wingSweepR: 0.2, wingBeatR: -0.1, ...R(8, 16.5, 4.2), gaze: 0.5, nod: 0.3, lookX: 0.5 }],
    [40, { brace: 1, wingOpenR: 0.8, wingSweepR: 0.2, wingBeatR: 0.35, ...R(8.5, 16, 4.4), gaze: 0.45, nod: 0.35, lookX: 0.5, lookY: -0.4 }],
    [43, { brace: 1, wingOpenR: 0.75, wingSweepR: 0.15, wingBeatR: 0.05, ...R(9, 15, 4), gaze: 0.35, nod: 0.45, lookY: -0.6 }],
    [50, { brace: 0.4, wingOpenR: 0.15, gaze: 0.25, nod: 0.35, lookY: -0.5 }],
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
  // Vaults off the wrists into a spinning hop, lands on all four, a happy roar.
  happy: [
    [0, {}],
    // a pterosaur launch: wings folded tight, the hind legs throw him over the planted wrists, the arms push, the
    // wings open only in the air
    [6, { crouch: 4, lean: 0.4, bodyPitch: 0.12, tailCurl: 0.3, wingOpen: 0 }],
    [8, { crouch: 4.6, lean: 0.75, bodyPitch: 0.24, tailCurl: 0.4, vault: 1, wingOpen: 0, ...foreR(12.5, 6, 1.8), ...foreL(12.5, -6, 1.8), ...size(1.05, 0.95) }],
    [10, { jump: 2.8, lean: 0.5, bodyPitch: -0.1, vault: 1, wingOpen: 0.05, point: 0.8, ...foreR(12.5, 6, 1.8), ...foreL(12.5, -6, 1.8), ...size(0.94, 1.08) }],
    [12, { ...WIDE, vault: 0, wingOpen: 0.9, wingBeat: 0.9, point: 1, jump: 6, tuck: 0.3 }],
    [14, { ...WIDE, wingBeat: -0.7, point: 1, jump: 9.5, tuck: 0.4 }],
    [16, { ...WIDE, wingBeat: 0.6, point: 1, jump: 13, tailCurl: 0.4, tuck: 0.5 }],
    [20, { ...WIDE, wingBeat: -0.4, point: 1, jump: 15, tailCurl: 0.4, tuck: 0.5 }],
    [26, { ...WIDE, wingBeat: 0.4, point: 0.6, jump: 8, tuck: 0.2 }],
    // stall: nose up, the wings spread forward as brakes, hind feet first
    [28, { ...WIDE, wingOpen: 1.1, wingBeat: 0.45, wingSweep: -0.35, bodyPitch: -0.25, rear: 0.5, jump: 3, point: 0.2 }],
    [29, { ...WIDE, wingBeat: 0.5, wingSweep: -0.2, bodyPitch: -0.1, rear: 0.4, jump: 1, crouch: 1.2 }],
    [30, braced({ wingOpen: 0.55, wingBeat: 0.1, crouch: 3.5, flash: 0.04, fistR: 0.3, fistL: 0.3, ...size(1.06, 0.94) })],
    [34, { brace: 0.6, wingOpen: 0.3, crouch: 1, roar: 1, nod: -0.4, neckUp: 1.6, snarl: 0.4 }],
    [40, { wingOpen: 0.1, roar: 0.2, nod: -0.1, neckUp: 0.4 }],
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
    [14, { crouch: 4.5, nod: 0.3, lid: 0.5, wingOpen: 0.3, wingSweep: 0.2, brace: 1 }],
    [22, { ...asleep, sleep: 0.6 }],
    [30, { ...asleep, sleep: 0.92 }],
    [36, asleep],
  ],
  // Wakes, bows into a stretch on the wrists (chest down, hips up), then rears with the wings thrown wide and yawns.
  sleep_out: [
    [0, asleep],
    [8, { ...asleep, sleep: 0.75, blink: 0, lid: 0.6 }],
    [12, { ...asleep, sleep: 0.4, blink: 0, lid: 0.4 }],
    [16, { brace: 1, lift: 1.6, bodyPitch: 0.42, ...foreR(19, 6.5, 1.8), ...foreL(19, -6.5, 1.8), neckReach: 2, nod: 0.3, roar: 0.6, blink: 1, lean: -0.6, tailLift: 0.5 }],
    [22, { rear: 1, ...WIDE, wingBeat: 0.5, neckUp: 3.2, nod: -0.55, roar: 1, blink: 1, fistR: -0.5, fistL: -0.5 }],
    [28, { wingOpen: 0.3, roar: 0.1, nod: 0.05, neckUp: 0.5 }],
    [36, {}],
  ],
  // Jolted awake: a jump with the wings thrown open, lands braced with the wings up as a hood, hissing.
  wake_startled: [
    [0, asleep],
    [3, { ...asleep, sleep: 0.7, blink: 0, wide: 1 }],
    [8, { ...WIDE, wingBeat: 0.7, jump: 5, wide: 1, snarl: 0.6, charge: 1.2, fistR: 0.5, fistL: 0.5 }],
    [13, braced({ wingOpen: 0.9, wingBeat: -0.2, crouch: 3, snarl: 1, charge: 1.4, flash: 0.1, fistR: 0.8, fistL: 0.8 })],
    [20, braced({ wingOpen: 0.35, crouch: 1, snarl: 0.3, charge: 0.7, fistR: 0.2, fistL: 0.2 })],
    [28, {}],
  ],
  hatch: [
    [0, { hidden: 1, egg: 1 }],
    [37, { hidden: 1, egg: 1 }],
    // Out of the egg: small, curled, the wings still wrapped round him, blinking.
    [38, { egg: 1, crouch: 7, ...size(0.7), blink: 1, tailCurl: 1, nod: 0.45, flash: 0.6, wrap: 0.6 }],
    [42, { egg: 1, crouch: 4.5, ...size(0.8), wide: 1, nod: 0.15, tailCurl: 0.6, wrap: 0.3 }],
    [43, { crouch: 4.2, ...size(0.82), wide: 1, nod: 0.12, tailCurl: 0.6, wrap: 0.25 }],
    // The wings unfold (he sits up to open them), the neck rises; a puff of flame.
    [46, { crouch: 2, ...size(0.9), wingOpen: 1.05, wingBeat: 0.5, neckUp: 2, nod: -0.3, wide: 0.6 }],
    [54, { crouch: 1, ...size(0.96), wingOpen: 0.6, wingBeat: 0.2, neckUp: 1.4, nod: -0.2, fire: 0.6, roar: 0.4 }],
    [58, { crouch: 0.6, wingOpen: 0.25, nod: 0, fire: 0, roar: 0.1, snarl: 0.3 }],
    [72, {}],
  ],
  peek: [
    [0, {}],
    [3, { crouch: 3, brace: 1, wingOpen: 0.4, bodyPitch: 0.12, lookY: 0.6, nod: -0.2 }],
    [5, springUp({ jump: 4, ...size(0.9, 1.15) })],
    [7, { ...WIDE, wingBeat: -0.7, point: 1, jump: 8, tuck: 0.4, ...size(0.86, 1.22) }],
    [8, { ...WIDE, wingBeat: 0.4, point: 1, jump: 10, tuck: 0.4, ...size(0.85, 1.25) }],
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
    // Drops home, lands on all four.
    [51, { ...WIDE, wingBeat: 0.5, point: 1, jump: 6 }],
    [54, braced({ wingOpen: 0.5, crouch: 3, flash: 0.04, fistR: 0.3, fistL: 0.3, ...size(1.05, 0.95) })],
    [58, {}],
    [60, {}],
  ],
  show: showTrack(),
};
export const lanes: Record<string, Record<string, Lane>> = {
  show: { dy: [[0, 0], [51, 0], [52, -255], [55, -165], [58, -87], [61, -33], [64, -9], [66, 0], [168, 0]] },
  happy: { twist: [[0, 0], [12, 0], [26, TAU], [48, TAU]] },
  hatch: {
    eggCrack: [[0, 0], [8, 0], [10, 0.2], [20, 0.4], [30, 0.7], [36, 1], [72, 1]],
    eggRock: [[0, 0], [14, 0], [16, 0.12], [18, -0.12], [20, 0.1], [22, 0], [28, 0], [30, 0.16], [32, -0.14], [34, 0], [72, 0]],
    eggOpen: [[0, 0], [37, 0], [38, 0.25], [42, 1], [72, 1]],
  },
  peek: { dy: [[0, 0], [4, 0], [5, -60], [8, -285], [9, 0], [50, 0], [51, -120], [54, 0], [60, 0]] },
  'happy-f2': {
    pitch: [[0, 0], [10, 0], [34, TAU], [48, TAU]],
  },
};
// The tricks that build lanes along with their keys.
for (const [name, build] of [
  ['trick', trickTrack],
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
  [8, f2({ wingBeat: 0.8, crouch: 1, snarl: 0.4, fistR: 0.6, fistL: 0.6 })],
  [12, f2({ wingBeat: -0.7, point: 1, hover: 8, tuck: 0.35 })],
  [22, f2({ wingOpen: -0.3, point: 1, hover: 9, tuck: 0.35 })],
  [34, f2({ wingBeat: 0.6, point: 0.6, hover: 6, tuck: 0.3 })],
  [37, f2({ roar: 1, nod: -0.35, neckUp: 1.5, wingBeat: 0.3 })],
  [44, f2({ roar: 0.1 })],
  [48, f2({})],
];
export const gesture = keyframer({ tracks, lanes, switches: SWITCHES, linear: LINEAR, fixed: { sleep: asleep } });
