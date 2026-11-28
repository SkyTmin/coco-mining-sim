// Pose book of Раскат. Times are frames at 24 fps. Hand goals are written relative to the resting hip (forward, right,
// up) in the feet frame; `lift` follows the body when it rises. Foot goals place the raised heel (hock) of the
// digitigrade leg in feet units. The effect timelines in storm_lord-fx.ts read the beat constants exported here.
import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';

/** Height of the hip joint above the stone at rest, rig units. */
export const HIP = 14.5;

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
export type Track = [number, JointPose][];
export const TAU = Math.PI * 2;
export const hand = (name: 'L' | 'R', x: number, y: number, z: number) => reach('hand' + name, [x, y, z]);
export const L = (x: number, y: number, z: number, lift = 0) => hand('L', x, y, HIP + z + lift);
export const R = (x: number, y: number, z: number, lift = 0) => hand('R', x, y, HIP + z + lift);
export const footL = (x: number, y: number, z: number) => reach('footL', [x, y, z]);
export const footR = (x: number, y: number, z: number) => reach('footR', [x, y, z]);
/** Painted size relative to natural (the skin reads sx / sy as offsets from 1). */
export const size = (x: number, y = x) => ({ sx: x - 1, sy: y - 1 });
/** The storm form: abyss fur, white-gold veins, lightning antlers, thunderhead mane, the drum ring open wide, hovering. */
export const F2: JointPose = { form: 1, hover: 5, ringR: 21, ringTilt: 1.32, charge: 0.6 };
export const f2 = (p: JointPose): JointPose => ({ ...F2, ...p });
/** Asleep: curled up on the stone like a great cat, the tail over the muzzle, the drums stacked behind. */
export const asleep: JointPose = { sleep: 1, blink: 1, earL: 0.6, earR: 0.6, ringR: 9, ringTilt: 0.2, tailCurl: 1 };
/** Keys that switch at the key instead of fading. */
export const SWITCHES = new Set(['hidden', 'overAll', 'blink', 'noShadow', 'peekFront', 'spearOn', 'orbOn', 'orbFront', 'drumsHidden', 'clawFront', 'egg', 'stonesGone']);

/** The resting drum ring (keys that reshape it must state it on both sides, or it would pass through radius 0). */
export const RING: JointPose = { ringR: 16, ringTilt: 0.22 };
/** The superhero landing: knee down, one claw on the stone, the other paw back. */
const landing = (k = 1): JointPose => ({ crouch: 6.5 * k, ...R(15, 6, -12.6), ...L(4, -6.6, 0.5), fistR: -0.4, earL: 0.4, earR: 0.4, snarl: 0.4 });

/** Effect beats shared with the painter of effects. */
export const beats = {
  look: { snap: 8, glance: 20 },
  // Neck cracks, the right paw opens in front of the face, a spark runs down the arm, an arc jumps between the claws,
  // the fist snaps shut on it.
  fidget_a: { crack: [4, 7], spark: 20, arc: 30, snap: 44 },
  fidget_b: { shake: 6, end: 22 },
  happy: { launch: 10, land: 24, roar: 30 },
  wake_startled: { land: 13 },
  sleep_out: { yawn: 18 },
  hatch: { crack: 8, poke: 26, burst: 38, roar: 48 },
  peek: { leap: 5, eyes: 9, rise: 16, grin: 30, drop: 48, home: 54 },
  // Громовой рывок: charge, six dashes faster and faster (left, right, deep in the field, back, closer, the glass),
  // claw marks on the glass, a grin, a back somersault home, the superhero landing, scorches looked at, sparks flicked
  // off the claws; the rain cools the scorches with steam.
  trick: {
    charge: 0,
    dashes: [24, 46, 68, 82, 90, 98],
    glass: 100,
    swipe: 104,
    flipStart: 136,
    land: 160,
    flicks: [207, 213],
    cool: 220,
  },
  // Зов молнии: paw to the sky, a bolt strikes into it and becomes a spear, a figure-eight twirl, the leap and the
  // spear driven into the stone, the slabs torn up round him float and tremble, he crushes them into glowing dust; the
  // pits fill with rain.
  trick_b: { raise: 14, strike: 30, twirl: [34, 70], leap: 74, slam: 86, rise: [90, 110], spearGone: 104, clench: 150, crush: 170, dust: 196 },
  // Барабаны войны: the ring lies down round him, hits L R L R, a double, a fast roll, a spin with the ring, the double
  // slam: eight bolts up from the eight drums, one giant bolt into the sky; the ring folds back, steam from the nose.
  trick_c: { unfold: [0, 30], hits: [] as number[], spin: [150, 190], slam: 202, giant: [202, 214], fold: [220, 250], steam: 236 },
  // Пробуждение бури: roar to the sky, four bolts hit him, a white silhouette that throbs, the burst into the storm form.
  phase: { roar: 24, strikes: [28, 36, 42, 46], white: [48, 70], form: 60, burst: 70, hover: [88, 100] },
  'happy-f2': { spin: [10, 26], roar: 26 },
  // Ураган: he spins up a tornado, travels deep in the field and back to the glass in it, throws it at the viewer; the
  // debris and rain hit the glass; a wind ring; he floats home.
  'trick-f2': { spin: [20, 146], deep: [60, 110], front: 135, windup: 150, throw: 160, hitGlass: 166, wind: 172, home: [200, 250] },
  // Шаровая молния: the ball grows between the paws, races round the drum ring and each drum zaps it bigger, raised
  // overhead the size of a man, thrown at the glass, bursts over the whole painting and its frame.
  'trick_b-f2': { grow: [4, 40], ring: [40, 130], lift: [130, 166], throw: 170, burst: 182, calm: 206 },
  // Удар с неба: up and out of the painting, the vortex brightens, shadows race over the stone, he comes down as a
  // giant bolt, white out, a crater with radial cracks; rises from it, a roar blows the rain away; takes off again.
  'trick_c-f2': { crouch: 10, launch: 16, gone: [40, 100], bolt: 100, impact: 104, rise: [110, 150], roar: 150, takeoff: [180, 200] },
  // Появление: the vortex brightens, a bolt column, smoke, in the smoke eyes, veins, horns light up, the smoke clears on
  // the kneeling lord; he stands and roars.
  show: { vortex: 0, strike: 44, eyes: 60, veins: 70, horns: 80, clear: [90, 110], stand: [110, 130], roar: 134 },
};

// ---- builders ------------------------------------------------------------------------------------------------------
function shake(keys: Track, from: number, to: number, step: number, amp: number, base: JointPose = {}) {
  for (let f = from, i = 0; f <= to; f += step, i++) {
    const k = 1 - (f - from) / (to - from + step);
    const s = i % 2 ? 1 : -1;
    keys.push([f, { ...base, roll: s * amp * k, twist: -s * 0.1 * k, maneLift: 2.6 * k, earL: 0.4 * s, earR: -0.4 * s, tailSway: 0.5 * s }]);
  }
}
/** Six dashes of «Громовой рывок»: [frame he vanishes, dx, dy, size, yaw on arrival]. */
export const DASHES: [number, number, number, number, number][] = [
  [24, -64, -6, 1, 0],
  [46, 64, -10, 1, 1.9],
  [68, 10, -34, 0.68, 0.4],
  [82, -14, -8, 0.95, 0],
  [90, 12, 24, 1.18, 0.9],
  [98, 0, 62, 1.5, 0.5],
];
function trickTrack(): Track {
  const coil = (p: JointPose = {}): JointPose => ({ crouch: 3.5, lean: 0.8, pitch: 0.25, nod: 0.2, ...R(4.5, 7, 2.5), ...L(2, -6.6, 1.5), fistR: 0.8, fistL: 0.8, snarl: 0.6, earL: 0.5, earR: 0.5, charge: 1.1, ...p });
  const keys: Track = [
    [0, {}],
    [8, { crouch: 3, lean: 0.6, ...R(6, 7, 3), ...L(3, -8, 3), fistR: 0.8, fistL: 0.8, snarl: 0.3, charge: 0.8, earL: 0.3, earR: 0.3 }],
    [20, coil({ crouch: 4.5, lean: 1.0, pitch: 0.3, charge: 1.2, snarl: 0.8, maneLift: 1 })],
    [23, coil({ crouch: 4.6, lean: 1.0, pitch: 0.32, charge: 1.3, snarl: 0.8, maneLift: 1 })],
  ];
  let px = 0,
    py = 0,
    ps = 1;
  DASHES.forEach(([f, x, y, sz, yaw], n) => {
    const at = { dx: px, dy: py, ...size(ps) };
    keys.push([f, { ...coil(at), hidden: 1 }]);
    const glass = n === 5;
    const pos = { dx: x, dy: y, yaw, ...(glass ? { overAll: 1 } : {}) };
    // Arrival: squashed low and wide, a flash, the afterimage of where he was.
    keys.push([f + 2, { ...coil({ ...pos, ...size(sz * 1.22, sz * 0.8), crouch: 5, flash: 0.06 }), ghostA: 0.55, ghostDx: px - x, ghostDy: py - y }]);
    keys.push([f + 4, { ...coil({ ...pos, ...size(sz * 0.94, sz * 1.08), crouch: 2.5, flash: 0.02 }), ghostA: 0.25, ghostDx: px - x, ghostDy: py - y }]);
    const hold = glass ? 0 : n < 2 ? 14 : n < 3 ? 8 : 2;
    if (hold) keys.push([f + 6 + hold, coil({ ...pos, ...size(sz), crouch: 3.2, gaze: n % 2 ? 0.3 : -0.3, snarl: 0.9 })]);
    px = x;
    py = y;
    ps = sz;
  });
  const G = { dx: 0, dy: 62, overAll: 1, yaw: 0.5, ...size(1.5) };
  keys.push(
    // At the glass: the claw rises, three lines are raked across it, the grin.
    [104, { ...G, crouch: 2, ...R(8, 9, 19), ...L(5, -8, 6), fistR: -0.8, fistL: 0.6, snarl: 1, earL: 0.6, earR: 0.6, charge: 1.2, gaze: 0.2 }],
    [107, { ...G, crouch: 2.5, lean: 0.4, ...R(13, -3, 6), ...L(5, -8, 6), fistR: -0.8, fistL: 0.6, snarl: 1, earL: 0.6, earR: 0.6, charge: 1.2, gaze: 0.3 }],
    [110, { ...G, crouch: 2.4, lean: 0.3, ...R(12, -5, 4), ...L(5, -8, 6), fistR: -0.6, fistL: 0.6, snarl: 0.9, charge: 1.0, gaze: 0.3 }],
    [118, { ...G, crouch: 1.6, ...R(7, 6, 8), ...L(5, -8, 6), fistR: 0.4, fistL: 0.6, snarl: 0.6, lid: 0.35, charge: 0.8, gaze: 0.45, tilt: 0.05 }],
    [128, { ...G, crouch: 1.6, ...R(7, 6, 8), ...L(5, -8, 6), fistR: 0.4, fistL: 0.6, snarl: 0.7, lid: 0.4, charge: 0.8, gaze: 0.45, tilt: 0.16 }],
    // Back somersault home.
    [136, { ...G, crouch: 4, ...R(5, 7, 3), ...L(2, -8, 3), fistR: 0.8, fistL: 0.8, charge: 1, snarl: 0.4 }],
    [140, { dx: 0, dy: 50, overAll: 1, yaw: 0.3, ...size(1.38), jump: 10, pitch: -1.4, point: 1, ...R(6, 8, 10, 10), ...L(5, -8, 10, 10), fistR: 0.8, fistL: 0.8, maneLift: 2 }],
    [146, { dx: 0, dy: 28, ...size(1.2), jump: 18, pitch: -3.3, point: 1, ...R(9, 8, -1, 18), ...L(8, -8, -1, 18), fistR: 0.9, fistL: 0.9, maneLift: 1.2 }],
    [152, { dx: 0, dy: 10, ...size(1.06), jump: 12, pitch: -5.0, point: 0.6, ...R(9, 8, 6, 12), ...L(8, -8.5, 6, 12), fistR: 0.8, fistL: 0.8, maneLift: 1.6 }],
    [158, { jump: 2, pitch: -TAU + 0.6, ...R(12, 6, -6), ...L(4, -8, 4), fistR: -0.4, maneLift: 1 }],
    [160, { pitch: -TAU + 0.95, ...landing(), flash: 0.06, charge: 1.3, ...size(1.1, 0.9) }],
    [163, { pitch: -TAU + 0.9, ...landing(), charge: 1.2 }],
    [174, { pitch: -TAU + 0.85, ...landing(0.95), charge: 1.0, nod: 0.2 }],
    // Up; he looks at the scorches left and right.
    [182, { pitch: -TAU, crouch: 1.5, nod: 0.35, gaze: -0.45, lookX: -0.6, charge: 0.7 }],
    [190, { pitch: -TAU, crouch: 1.5, nod: 0.35, gaze: 0.45, lookX: 0.6, charge: 0.6 }],
    [198, { pitch: -TAU, crouch: 1, nod: 0.1, gaze: 0.2, ...R(12, 7.5, 10), fistR: -0.7, lookX: 0.3, charge: 0.9 }],
    // Two flicks: the sparks fly off the claws.
    [205, { pitch: -TAU, crouch: 1, gaze: 0.2, ...R(7, 3, 13), fistR: 0.6, charge: 1 }],
    [207, { pitch: -TAU, crouch: 1.2, gaze: 0.2, ...R(12, 10, 7), fistR: -0.9, charge: 0.9 }],
    [211, { pitch: -TAU, crouch: 1, gaze: 0.2, ...R(7, 3, 13), fistR: 0.6, charge: 0.8 }],
    [213, { pitch: -TAU, crouch: 1.2, gaze: 0.2, ...R(12, 10, 7), fistR: -0.9, charge: 0.7 }],
    [222, { pitch: -TAU, gaze: 0.1, ...R(6, 7, 6), fistR: 0.3, snarl: 0.3, lid: 0.25, charge: 0.5 }],
    [240, { pitch: -TAU, gaze: -0.1, snarl: 0.2, nod: 0.05 }],
    [264, { pitch: -TAU }],
  );
  return keys;
}
function trickBTrack(): Track {
  const keys: Track = [
    [0, {}],
    [8, { crouch: 1.5, nod: -0.3, lookY: 0.6, gaze: 0.1, earL: -0.3, earR: -0.3, charge: 0.6 }],
    [14, { crouch: 1, lean: -0.35, pitch: -0.2, nod: -0.4, lookY: 0.7, ...R(10, 4, 24), fistR: -0.6, ...L(2, -8, 4), charge: 0.8, earL: -0.2, earR: -0.2 }],
    [28, { crouch: 1.2, lean: -0.4, pitch: -0.22, nod: -0.45, lookY: 0.8, ...R(10.5, 4, 24.5), fistR: -0.7, ...L(2, -8, 4), charge: 1.1, snarl: 0.4, maneLift: 1 }],
    [30, { crouch: 2.6, nod: -0.3, lookY: 0.5, ...R(9.5, 4.5, 22.5), fistR: 0.95, ...L(2, -8, 3), charge: 1.4, snarl: 0.9, spearOn: 1, spearP: 1.45 }],
    [33, { crouch: 2.2, nod: -0.2, ...R(5, 6, 22), fistR: 0.95, ...L(2, -8, 3), charge: 1.3, snarl: 0.7, spearOn: 1, spearP: 1.45 }],
  ];
  // The figure eight in front of him, the spear wheeling in its own plane.
  for (let f = 36; f <= 70; f += 3) {
    const a = ((f - 36) / 34) * TAU * 1.5;
    keys.push([f, { crouch: 2 + 0.8 * Math.sin(2 * a), twist: -0.18 * Math.sin(a), lean: 0.3, ...R(11.8 + 1.5 * Math.cos(2 * a) - 1.4 * Math.sin(a), 5.8 + 3.6 * Math.sin(a), 12 + 3.6 * Math.sin(2 * a) + 3.6 * Math.sin(a)), fistR: 0.95, ...L(3, -8, 5), charge: 1.2, snarl: 0.5, gaze: 0.2 * Math.sin(a), spearOn: 1 }]);
  }
  keys.push(
    [72, { crouch: 4.5, lean: 0.4, ...R(4, 7, 25), fistR: 0.95, ...L(2, -8, 2), charge: 1.3, snarl: 0.8, spearOn: 1, earL: 0.5, earR: 0.5 }],
    [78, { jump: 11, crouch: 0, point: 1, ...R(5, 6, 24, 11), fistR: 0.95, ...L(2, -9, 12, 11), charge: 1.3, snarl: 1, roar: 0.5, spearOn: 1, maneLift: 2 }],
    [82, { jump: 9, crouch: 0, point: 1, pitch: 0.2, ...R(8, 5, 18, 9), fistR: 0.95, ...L(2, -9, 12, 9), charge: 1.3, snarl: 1, roar: 0.8, spearOn: 1, maneLift: 2 }],
    [86, { crouch: 6, pitch: 0.45, ...R(10, 4, -5), fistR: 0.95, ...L(3, -9, 4), charge: 1.4, snarl: 1, roar: 1, flash: 0.2, spearOn: 1, earL: 0.6, earR: 0.6, ...size(1.06, 0.94) }],
    [90, { crouch: 5.6, pitch: 0.4, ...R(10, 4, -6), fistR: 0.95, ...L(3, -9, 4), charge: 1.3, snarl: 0.8, roar: 0.5, spearOn: 1 }],
    [100, { crouch: 4.4, pitch: 0.3, ...R(10, 4, -8.5), fistR: 0.95, ...L(3, -10, 7), fistL: -0.6, charge: 1.2, snarl: 0.6, spearOn: 1 }],
    [104, { crouch: 3.5, pitch: 0.2, ...R(9, 5, -6), fistR: -0.5, ...L(3, -11, 9), fistL: -0.6, charge: 1.2, snarl: 0.5 }],
    // Arms spread, palms up: the slabs float round him and tremble.
    [114, { crouch: 1, lean: -0.1, ...R(9, 8, 12), ...L(9, -8, 12), fistR: -0.7, fistL: -0.7, nod: -0.15, charge: 1.2, snarl: 0.3, maneLift: 0.8 }],
    [132, { crouch: 0.8, lean: -0.1, ...R(9, 8.5, 13), ...L(9, -8.5, 13), fistR: -0.75, fistL: -0.75, nod: -0.2, charge: 1.3, snarl: 0.4, maneLift: 1, gaze: 0.2 }],
    [148, { crouch: 1, lean: -0.1, ...R(9, 8.5, 13.5), ...L(9, -8.5, 13.5), fistR: -0.8, fistL: -0.8, nod: -0.1, charge: 1.3, snarl: 0.5, maneLift: 1, gaze: -0.1 }],
    // The clench: the slabs close in and are crushed.
    [160, { crouch: 2.4, lean: 0.2, ...R(8, 7, 12), ...L(8, -7, 12), fistR: 1, fistL: 1, charge: 1.4, snarl: 1, earL: 0.6, earR: 0.6 }],
    [170, { crouch: 3.6, lean: 0.3, ...R(9.5, 2.6, 11), ...L(9.5, -2.6, 11), fistR: 1, fistL: 1, charge: 1.5, snarl: 1, roar: 0.6, flash: 0.16, ...size(1.04, 0.96) }],
    [176, { crouch: 3, lean: 0.25, ...R(9.5, 2.8, 11), ...L(9.5, -2.8, 11), fistR: 1, fistL: 1, charge: 1.1, snarl: 0.7, roar: 0.3 }],
    [190, { crouch: 1.5, ...R(8, 6, 8), ...L(6, -7, 7), fistR: 0.2, fistL: 0.2, charge: 0.7, snarl: 0.2, gaze: 0.3 }],
    // Dusts off the paws.
    [196, { crouch: 1.2, ...R(11, 1.5, 5), ...L(11, -2.5, 4), fistR: -0.3, fistL: -0.3, nod: 0.12, charge: 0.6 }],
    [199, { crouch: 1.2, ...R(11, 3.5, 4), ...L(11, -0.5, 5), fistR: -0.3, fistL: -0.3, nod: 0.12, charge: 0.6 }],
    [202, { crouch: 1.2, ...R(11, 1.5, 5), ...L(11, -2.5, 4), fistR: -0.3, fistL: -0.3, nod: 0.12, charge: 0.6 }],
    [205, { crouch: 1.2, ...R(11, 3.5, 4), ...L(11, -0.5, 5), fistR: -0.3, fistL: -0.3, nod: 0.12, charge: 0.6 }],
    // He looks at the pits filling with rain, one side, the other; then a shrug of static through the mane.
    [210, { crouch: 1.2, nod: 0.3, ...R(8, 8.5, 4), ...L(7, -8.5, 4), fistR: 0.2, fistL: 0.2, charge: 0.5 }],
    [218, { crouch: 1.2, nod: 0.35, gaze: -0.45, lookX: -0.6, charge: 0.5 }],
    [228, { crouch: 1.2, nod: 0.3, gaze: 0.45, lookX: 0.6, charge: 0.5 }],
    [242, { crouch: 0.8, nod: -0.05, gaze: 0.2, snarl: 0.4, lid: 0.25, charge: 0.6 }],
    [248, { crouch: 2.2, nod: 0.1, gaze: 0.2, snarl: 0.6, charge: 1.3, maneLift: 1.8, ...R(6, 8, 6), ...L(4, -8, 5), fistR: 0.9, fistL: 0.9, earL: 0.4, earR: 0.4 }],
    [256, { crouch: 0.6, gaze: 0.15, snarl: 0.3, lid: 0.2, charge: 0.7, maneLift: 0.4 }],
    [276, {}],
  );
  return keys;
}
function trickCTrack(): Track {
  const stance = (p: JointPose = {}): JointPose => ({ crouch: 2.4, lean: 0.25, ...R(5, 8, 7), ...L(5, -8, 7), fistR: 0.8, fistL: 0.8, snarl: 0.5, charge: 1, ...p });
  const keys: Track = [
    [0, {}],
    [14, stance({ crouch: 1.5, snarl: 0.3, ...R(4, 9, 10), ...L(4, -9, 10), fistR: -0.4, fistL: -0.4, nod: -0.1, charge: 0.9 })],
    [30, stance({ crouch: 2.2 })],
  ];
  const hits: number[] = [];
  // A hit: the fist rises (windup), snaps onto the front drum (contact), recoils.
  const hit = (c: number, side: 'L' | 'R' | 'both', wind = 4, k = 1) => {
    const up = (s: 'L' | 'R') => (s === 'R' ? { ...R(4.5, 8.5, 19) } : { ...L(4.5, -8.5, 19) });
    const w: JointPose = stance({ ...(side !== 'L' ? up('R') : {}), ...(side !== 'R' ? up('L') : {}), twist: side === 'R' ? -0.35 : side === 'L' ? 0.35 : 0, crouch: 0.8, lean: -0.15, pitch: -0.12, snarl: 0.6, maneLift: 0.8 });
    const strike: JointPose = stance({
      ...(side !== 'L' ? { hitR: 1 } : {}),
      ...(side !== 'R' ? { hitL: 1 } : {}),
      twist: side === 'R' ? 0.2 : side === 'L' ? -0.2 : 0,
      crouch: 3.8,
      lean: 0.7,
      pitch: 0.18,
      snarl: 1,
      flash: 0.03 * k,
      ...size(1.03, 0.97),
    });
    const recoil: JointPose = stance({ ...(side !== 'L' ? { hitR: 0.35 } : {}), ...(side !== 'R' ? { hitL: 0.35 } : {}), crouch: 2.6, snarl: 0.7 });
    keys.push([c - wind, w], [c, strike], [c + 2, recoil]);
    hits.push(c);
  };
  hit(34, 'L', 4);
  hit(48, 'R', 5);
  hit(62, 'L', 4);
  hit(72, 'R', 4);
  hit(82, 'L', 3);
  hit(86, 'R', 2);
  for (let c = 94, i = 0; c <= 146; c += 6, i++) hit(c, i % 2 ? 'R' : 'L', 3, 0.7);
  keys.push(
    // The spin with the ring: arms out, the drums whirl round him.
    [152, stance({ crouch: 1.5, ...R(3, 12, 11), ...L(3, -12, 11), fistR: 0.9, fistL: 0.9, snarl: 0.8, maneLift: 1.5 })],
    [184, stance({ crouch: 1.8, ...R(3, 11, 13), ...L(3, -11, 13), fistR: 0.9, fistL: 0.9, snarl: 0.9, maneLift: 2 })],
    // Jump, both fists overhead, the double slam on the stone.
    [190, stance({ crouch: 4.5, ...R(8, 5, 21), ...L(8, -5, 21), fistR: 1, fistL: 1, snarl: 1, charge: 1.3 })],
    [196, { jump: 12, point: 1, ...R(8, 5, 23, 12), ...L(8, -5, 23, 12), fistR: 1, fistL: 1, snarl: 1, roar: 0.7, charge: 1.4, maneLift: 2.4 }],
    [200, { jump: 8, point: 0.7, pitch: 0.3, ...R(11.5, 6, 15, 8), ...L(11.5, -6, 15, 8), fistR: 1, fistL: 1, snarl: 1, roar: 0.9, charge: 1.5, maneLift: 2 }],
    [202, { crouch: 6.8, pitch: 0.6, ...R(12, 4, -12.4), ...L(12, -4, -12.4), fistR: 1, fistL: 1, snarl: 1, roar: 1, charge: 1.6, flash: 0.2, ...size(1.08, 0.92) }],
    [206, { crouch: 6.4, pitch: 0.55, ...R(12, 4, -12.4), ...L(12, -4, -12.4), fistR: 1, fistL: 1, snarl: 1, roar: 1, charge: 1.5, flash: 0.08, nod: -0.4 }],
    [216, { crouch: 5.6, pitch: 0.45, ...R(12, 4.5, -11.6), ...L(12, -4.5, -11.6), fistR: 0.9, fistL: 0.9, snarl: 0.7, roar: 0.4, charge: 1.2, nod: -0.5, lookY: 0.7 }],
    [230, { crouch: 1.8, ...R(6, 7, 6), ...L(4, -8, 5), fistR: 0.5, fistL: 0.5, charge: 0.7, snarl: 0.3 }],
    // A breath of steam through the nose.
    [236, { crouch: 1.2, nod: 0.12, snarl: 0.4, lid: 0.3, charge: 0.6 }],
    [244, { crouch: 1, nod: -0.05, snarl: 0.2, charge: 0.5 }],
    [276, {}],
  );
  keys.sort((a, b) => a[0] - b[0]);
  beats.trick_c.hits = hits;
  return keys;
}
function phaseTrack(): Track {
  const jolt = (p: JointPose = {}): JointPose => ({ crouch: 3.6, lean: -0.3, ...R(7, 9, 19), ...L(6, -9, 19), fistR: -0.6, fistL: -0.6, roar: 1, nod: -0.5, charge: 1.4, earL: 0.6, earR: 0.6, maneLift: 1.6, ...p });
  return [
    [0, {}],
    [6, { crouch: 3, nod: 0.25, ...R(6, 8, 4), ...L(4, -8, 4), fistR: 0.9, fistL: 0.9, snarl: 0.6, charge: 0.9 }],
    [16, { crouch: 1, lean: -0.4, pitch: -0.2, nod: -0.6, roar: 0.8, ...R(8, 6, 22.5), ...L(6, -7, 22.5), fistR: -0.5, fistL: -0.5, charge: 1.1 }],
    [24, { crouch: 0.6, lean: -0.45, pitch: -0.25, nod: -0.7, roar: 1, ...R(8.5, 6, 23.5), ...L(6.5, -7, 23.5), fistR: -0.6, fistL: -0.6, charge: 1.2, maneLift: 1 }],
    [28, jolt({ crouch: 4.2, pitch: -0.1 })],
    [33, jolt({ crouch: 2.4, pitch: -0.25, nod: -0.6 })],
    [36, jolt({ crouch: 4.4, pitch: -0.05 })],
    [40, jolt({ crouch: 2.6, pitch: -0.2 })],
    [42, jolt({ crouch: 4.6 })],
    [44, jolt({ crouch: 3 })],
    [46, jolt({ crouch: 4.8, roll: 0.06 })],
    // The white silhouette: arms out wide, he throbs (sx, sy) faster and faster.
    [52, jolt({ crouch: 2, ...R(7, 10, 17), ...L(7, -10, 17), roar: 0.6, roll: -0.05 })],
    [66, jolt({ crouch: 2.4, ...R(7, 9, 8), ...L(7, -9, 8), fistR: 1, fistL: 1, roar: 0.3, nod: 0.3, pitch: 0.25 })],
    // The burst: thrown open.
    [70, jolt({ crouch: 0, ...R(7, 11, 17), ...L(7, -11, 17), fistR: -0.8, fistL: -0.8, roar: 1, nod: -0.4, maneLift: 2.6, pitch: -0.2 })],
    [80, f2({ ...R(7, 10, 15, 2), ...L(7, -10, 15, 2), fistR: -0.6, fistL: -0.6, roar: 0.5, nod: -0.2, maneLift: 1.4, charge: 1.2 })],
    [92, f2({ ...R(6, 8, 6, 3), ...L(5, -8, 6, 3), fistR: 0.8, fistL: 0.8, snarl: 0.6, nod: 0.1, charge: 0.9 })],
    [100, f2({ ...R(8, 8, 19, 5), ...L(7, -8, 19, 5), fistR: 1, fistL: 1, roar: 1, nod: -0.45, charge: 1.2, maneLift: 1 })],
    [108, f2({ roar: 0.4, nod: -0.1, charge: 0.9 })],
    [120, f2({})],
  ];
}
function trickF2Track(): Track {
  const keys: Track = [
    [0, f2({})],
    [12, f2({ crouch: 1.6, ...R(5, 10, 9, 5), ...L(4, -10, 9, 5), fistR: -0.5, fistL: -0.5, charge: 1, snarl: 0.4 })],
    [24, f2({ ...R(3, 12.5, 12, 5), ...L(3, -12.5, 12, 5), fistR: -0.7, fistL: -0.7, charge: 1.2, snarl: 0.6, maneLift: 1.5 })],
    // Arms drawn in: the spin speeds up.
    [60, f2({ ...R(10.5, 2, 8.5, 5), ...L(10.5, -2, 8.5, 5), fistR: 0.9, fistL: 0.9, charge: 1.3, snarl: 0.8, maneLift: 2.2, nod: 0.1 })],
    [120, f2({ ...R(10.5, 1.6, 9, 5), ...L(10.5, -1.6, 9, 5), fistR: 1, fistL: 1, charge: 1.4, snarl: 0.9, maneLift: 2.4, nod: 0.1 })],
    [146, f2({ ...R(8, 11, 12, 5), ...L(8, -10, 12, 5), fistR: 0.6, fistL: 0.6, charge: 1.3, snarl: 0.9, maneLift: 2 })],
    // Windup and throw at the viewer.
    [152, f2({ crouch: 1.5, lean: -0.5, ...R(-2, 9, 20, 5), ...L(-2, -9, 20, 5), fistR: -0.6, fistL: -0.6, charge: 1.5, snarl: 1, maneLift: 1.6, pitch: -0.25 })],
    [158, f2({ crouch: 1.5, lean: -0.6, ...R(-3, 8, 21, 5), ...L(-3, -8, 21, 5), fistR: -0.6, fistL: -0.6, charge: 1.6, snarl: 1, maneLift: 1.6, pitch: -0.3 })],
    [161, f2({ crouch: 2.5, lean: 0.5, pitch: 0.2, nod: -0.3, ...R(14, 8.5, 7, 5), ...L(14, -7.5, 7, 5), fistR: -0.8, fistL: -0.8, charge: 1.6, roar: 1, snarl: 1, maneLift: 2.4, flash: 0.12 })],
    [168, f2({ crouch: 2.2, lean: 0.4, pitch: 0.18, nod: -0.2, ...R(13.5, 8.5, 6.5, 5), ...L(13.5, -7.5, 6.5, 5), fistR: -0.8, fistL: -0.8, charge: 1.4, roar: 1, snarl: 1, maneLift: 2 })],
    [180, f2({ crouch: 1, lean: 0.2, ...R(8, 7, 9, 5), ...L(7, -8, 9, 5), fistR: 0.2, fistL: 0.2, charge: 1, roar: 0.3, snarl: 0.6 })],
    [200, f2({ gaze: 0.35, snarl: 0.5, lid: 0.3, charge: 0.9, tilt: 0.08 })],
    [232, f2({ gaze: 0.1, charge: 0.8 })],
    // A victory pulse: fists to the chest, the flash runs round the drum ring, a short roar.
    [242, f2({ crouch: 1.5, ...R(10.5, 5.5, 9.5, 5), ...L(10.5, -5.5, 9.5, 5), fistR: 1, fistL: 1, snarl: 0.7, charge: 1.3, maneLift: 1 })],
    [252, f2({ ...R(8, 11, 19, 6), ...L(7, -10, 19, 6), fistR: 1, fistL: 1, roar: 1, nod: -0.35, charge: 1.4, hover: 6.5, maneLift: 1.6 })],
    [264, f2({ roar: 0.2, charge: 0.9 })],
    [288, f2({})],
  ];
  return keys;
}
function trickBF2Track(): Track {
  const cup = (p: JointPose = {}): JointPose => f2({ ...R(11, 3.8, 7.5, 5), ...L(11, -3.8, 7.5, 5), fistR: -0.6, fistL: -0.6, charge: 1.1, orbOn: 1, ...p });
  return [
    [0, f2({})],
    [4, cup({ crouch: 1, nod: 0.08, lookY: -0.3, snarl: 0.3 })],
    [24, cup({ crouch: 1.5, nod: 0.12, lookY: -0.4, snarl: 0.5, ...R(11, 4.5, 7.5, 5), ...L(11, -4.5, 7.5, 5) })],
    [40, cup({ crouch: 1.2, nod: 0.08, lookY: -0.3, snarl: 0.6, ...R(11, 5.5, 8.5, 5), ...L(11, -5.5, 8.5, 5) })],
    // Release: it flies off round the drum ring; he conducts it with one paw.
    [46, cup({ ...R(7, 10, 15, 5), ...L(6, -9, 9, 5), fistR: -0.8, fistL: 0.4, nod: -0.05, gaze: 0.3, snarl: 0.6 })],
    [70, cup({ ...R(4, 11, 17, 5), ...L(6, -9, 9, 5), fistR: -0.8, fistL: 0.4, gaze: -0.3, snarl: 0.6, twist: 0.2 })],
    [94, cup({ ...R(7, 10, 15, 5), ...L(6, -9, 9, 5), fistR: -0.8, fistL: 0.4, gaze: 0.3, snarl: 0.7, twist: -0.15 })],
    [118, cup({ ...R(4, 11, 17, 5), ...L(6, -9, 9, 5), fistR: -0.8, fistL: 0.4, gaze: -0.2, snarl: 0.8, twist: 0.15 })],
    // It comes back overhead; held up there it grows to the size of a man.
    [134, cup({ ...R(8, 5, 22, 5), ...L(8, -5, 22, 5), fistR: -0.8, fistL: -0.8, nod: -0.4, lookY: 0.7, snarl: 0.8, charge: 1.3 })],
    [160, cup({ crouch: 1, ...R(8, 5, 23.5, 5), ...L(8, -5, 23.5, 5), fistR: -0.85, fistL: -0.85, nod: -0.45, lookY: 0.7, snarl: 1, charge: 1.5, maneLift: 1 })],
    [166, cup({ crouch: 1.6, lean: -0.5, pitch: -0.3, ...R(-2, 8, 24, 5), ...L(-2, -6, 24, 5), fistR: -0.85, fistL: -0.85, nod: -0.3, snarl: 1, charge: 1.6, maneLift: 1.4 })],
    [168, cup({ crouch: 2.2, lean: 0.2, pitch: 0.05, ...R(6, 10, 27, 5), ...L(6, -9, 27, 5), fistR: -0.9, fistL: -0.9, nod: -0.2, snarl: 1, charge: 1.6, maneLift: 1.8 })],
    [169, cup({ crouch: 2.4, lean: 0.1, pitch: 0.05, ...R(16.5, 9, 18, 5), ...L(16.5, -8, 18, 5), fistR: -0.9, fistL: -0.9, nod: -0.35, roar: 0.6, snarl: 1, charge: 1.6, maneLift: 2 })],
    [170, cup({ crouch: 2.8, lean: 0.55, pitch: 0.22, ...R(14, 8.5, 6, 5), ...L(14, -7.5, 6, 5), fistR: -0.9, fistL: -0.9, nod: -0.3, roar: 1, snarl: 1, charge: 1.6, maneLift: 2.4, flash: 0.1 })],
    [180, cup({ crouch: 2.4, lean: 0.4, pitch: 0.18, ...R(13.5, 8.5, 6, 5), ...L(13.5, -7.5, 6, 5), fistR: -0.8, fistL: -0.8, nod: -0.1, roar: 0.8, snarl: 1, charge: 1.3 })],
    [184, cup({ crouch: 2, lean: 0.2, ...R(5, 8, 16, 5), ...L(5, -8, 16, 5), fistR: 0.4, fistL: 0.4, nod: 0.2, blink: 1, earL: 0.6, earR: 0.6, charge: 1.2 })],
    [206, cup({ crouch: 1, ...R(6, 8, 8, 5), ...L(5, -8, 8, 5), fistR: 0.3, fistL: 0.3, nod: 0, snarl: 0.5, charge: 1, orbOn: 0 })],
    // He looks over the frame where the discharges ran, left, right; a pulse runs round the drums.
    [220, f2({ gaze: -0.45, lookX: -0.7, nod: -0.1, snarl: 0.3, charge: 0.9 })],
    [234, f2({ gaze: 0.45, lookX: 0.7, nod: -0.1, snarl: 0.3, charge: 0.9 })],
    [246, f2({ crouch: 1.2, gaze: 0.2, snarl: 0.7, lid: 0.35, charge: 1.3, ...R(10.5, 5.5, 9.5, 5), ...L(10.5, -5.5, 9.5, 5), fistR: 1, fistL: 1, maneLift: 1 })],
    [258, f2({ gaze: 0.2, snarl: 0.4, lid: 0.3, charge: 1.0, hover: 6 })],
    [276, f2({})],
  ];
}
function trickCF2Track(): Track {
  return [
    [0, f2({})],
    [10, f2({ crouch: 4, ...R(5, 8, 2, 2), ...L(4, -9, 2, 2), fistR: 0.9, fistL: 0.9, snarl: 0.8, charge: 1.3, nod: -0.2, lookY: 0.6 })],
    [16, f2({ crouch: 0, point: 1, ...R(8, 7, 23, 8), ...L(8, -7, 23, 8), fistR: 1, fistL: 1, roar: 1, nod: -0.5, charge: 1.6, maneLift: 2.6, ...size(0.86, 1.25) })],
    [30, f2({ crouch: 0, point: 1, ...R(8, 5, 23, 8), ...L(8, -5, 23, 8), fistR: 1, fistL: 1, roar: 0.6, nod: -0.5, charge: 1.6, maneLift: 2.6, ...size(0.8, 1.35) })],
    [39, f2({ crouch: 0, point: 1, ...R(8, 5, 23, 8), ...L(8, -5, 23, 8), fistR: 1, fistL: 1, nod: -0.5, charge: 1.6, ...size(0.75, 1.4) })],
    [40, f2({ hidden: 1 })],
    [103, f2({ hidden: 1 })],
    // Out of the giant bolt: knelt in the crater, white hot.
    [104, f2({ ...landing(0.85), pitch: 0.45, flash: 1, charge: 1.8, nod: 0.45, blink: 1 })],
    [112, f2({ ...landing(0.85), pitch: 0.45, flash: 0.14, charge: 1.6, nod: 0.45, blink: 1 })],
    [124, f2({ ...landing(0.8), pitch: 0.4, charge: 1.4, nod: 0.3, blink: 0 })],
    [140, f2({ crouch: 2.4, ...R(6, 8, 5), ...L(4, -8, 5), fistR: 0.9, fistL: 0.9, charge: 1.3, snarl: 0.8, nod: 0.15 })],
    [146, f2({ crouch: 3.2, ...R(5, 8, 4), ...L(4, -8, 4), fistR: 1, fistL: 1, charge: 1.4, snarl: 1, nod: 0.3 })],
    [150, f2({ crouch: 0.5, lean: -0.3, ...R(7, 10, 17), ...L(7, -10, 17), fistR: -0.8, fistL: -0.8, roar: 1, nod: -0.45, charge: 1.6, maneLift: 2.4, flash: 0.12 })],
    [166, f2({ crouch: 0.8, lean: -0.2, ...R(7, 10, 16), ...L(7, -10, 16), fistR: -0.7, fistL: -0.7, roar: 0.8, nod: -0.35, charge: 1.3, maneLift: 1.4 })],
    [180, f2({ crouch: 1.5, ...R(6, 8, 6), ...L(4, -8, 6), fistR: 0.6, fistL: 0.6, snarl: 0.5, charge: 1 })],
    [200, f2({ ...R(6, 8, 6, 5), ...L(4, -8, 6, 5), fistR: 0.4, fistL: 0.4, snarl: 0.4, charge: 0.9, gaze: 0.3 })],
    [230, f2({ gaze: 0.1, charge: 0.8 })],
    [288, f2({})],
  ];
}
function showTrack(): Track {
  const kneel = (p: JointPose = {}): JointPose => ({ ...landing(1.1), pitch: 0.55, nod: 0.5, blink: 1, ...p });
  return [
    [0, { hidden: 1 }],
    [43, { hidden: 1 }],
    [44, kneel({ flash: 1, charge: 1.6 })],
    [52, kneel({ flash: 0.08, charge: 1.2 })],
    [59, kneel({ charge: 0.8 })],
    [60, kneel({ blink: 0, lid: 0.5, charge: 0.8 })],
    [70, kneel({ blink: 0, lid: 0.4, charge: 1.4 })],
    [80, kneel({ blink: 0, lid: 0.35, charge: 1.5, nod: 0.45 })],
    [108, kneel({ blink: 0, lid: 0.3, charge: 1.4, nod: 0.35, gaze: 0.2 })],
    // He rises out of the clearing smoke and roars.
    [118, { crouch: 3.4, pitch: 0.3, ...R(9, 7, 0), ...L(4, -8, 4), fistR: 0.4, nod: 0.25, gaze: 0.25, lid: 0.3, charge: 1.2, snarl: 0.4 }],
    [130, { crouch: 2, ...R(6, 8, 5), ...L(4, -8, 5), fistR: 0.9, fistL: 0.9, nod: 0.2, gaze: 0.3, snarl: 0.6, charge: 1.2 }],
    [134, { crouch: 0.6, lean: -0.3, ...R(7, 10, 18), ...L(7, -10, 18), fistR: -0.8, fistL: -0.8, roar: 1, nod: -0.45, charge: 1.6, maneLift: 2.2, flash: 0.1 }],
    [140, { crouch: 0.8, lean: -0.2, ...R(7, 10, 16), ...L(7, -10, 16), fistR: -0.7, fistL: -0.7, roar: 0.6, nod: -0.3, charge: 1.2, maneLift: 1.2 }],
    [146, { crouch: 1.2, ...R(7, 8.5, 5), ...L(6, -8.5, 5), fistR: 0.5, fistL: 0.5, snarl: 0.4, gaze: 0.2, charge: 0.8 }],
    // He settles into his presentation pose and holds it to the end.
    [151, { charge: 0.5 }],
    [168, {}],
  ];
}

export const tracks: Record<string, Track> = {
  idle: [
    [0, {}],
    [18, { gaze: -0.1, earL: 0.15 }],
    [36, { tailSway: 0.25, nod: 0.04, charge: 0.25 }],
    [54, { earR: 0.15, tilt: 0.04 }],
    [72, {}],
  ],
  'idle-f2': [
    [0, f2({})],
    [12, f2({ nod: -0.04, earL: 0.1, tailSway: 0.2, charge: 0.8, hover: 6 })],
    [24, f2({ gaze: 0.1, tilt: 0.03, hover: 5.4 })],
    [36, f2({ earR: 0.12, nod: 0.03, charge: 0.7, hover: 6.2 })],
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
    [4, { earL: -0.5, earR: -0.5, charge: 0.3 }],
    [8, { nod: -0.55, lookY: 0.7, gaze: 0.15, earL: -0.45, earR: -0.45, charge: 0.7, maneLift: 0.7 }],
    [16, { nod: -0.55, lookY: 0.7, gaze: 0.12, earL: -0.4, earR: -0.4, charge: 0.95, snarl: 0.25, maneLift: 0.3 }],
    [20, { nod: -0.1, gaze: -0.55, lookX: -0.8, earL: 0.2, earR: -0.3, charge: 0.5 }],
    [28, { nod: -0.05, gaze: -0.5, lookX: -0.8, earR: -0.3, charge: 0.4 }],
    [36, {}],
  ],
  fidget_a: [
    [0, {}],
    [4, { tilt: 0.28, nod: 0.05 }],
    [7, { tilt: -0.28, nod: 0.05 }],
    [11, { tilt: 0.02, gaze: 0.15 }],
    [16, { ...R(12, 7.5, 12), fistR: -0.65, gaze: 0.35, nod: 0.15, lookX: 0.5, charge: 0.5, earR: -0.2 }],
    [30, { ...R(12, 7.5, 12.2), fistR: -0.7, gaze: 0.35, nod: 0.15, lookX: 0.5, charge: 0.9, earR: -0.2 }],
    [42, { ...R(12, 7.5, 12.4), fistR: -0.75, gaze: 0.35, nod: 0.15, lookX: 0.5, charge: 1.1, snarl: 0.35, earL: 0.2, earR: 0.2 }],
    [44, { ...R(12.5, 7, 11), fistR: 0.9, gaze: 0.35, nod: 0.18, lookX: 0.5, charge: 1.1, snarl: 0.6, flash: 0.08, earL: 0.3, earR: 0.3 }],
    [50, { ...R(8, 5.5, 10), fistR: 0.7, gaze: 0.25, nod: 0.08, charge: 0.6, snarl: 0.15 }],
    [60, {}],
  ],
  fidget_b: (() => {
    const keys: Track = [
      [0, {}],
      [4, { crouch: 0.8, earL: 0.3, earR: 0.3, blink: 1 }],
    ];
    shake(keys, 6, 20, 2, 0.24, { crouch: 0.6, blink: 1 });
    keys.push([24, { maneLift: 1, earL: -0.1, earR: -0.1, tailSway: 0.3 }], [30, { blink: 1, tailSway: -0.2 }], [32, { gaze: 0.15 }], [44, { gaze: 0.15, nod: 0.06, charge: 0.4 }], [60, {}]);
    return keys;
  })(),
  happy: [
    [0, {}],
    [6, { crouch: 4, lean: 0.5, ...R(5, 6, 1), ...L(2, -7, 1), fistR: 0.8, fistL: 0.8, earL: 0.3, earR: 0.3, charge: 0.7 }],
    [10, { jump: 14, pitch: -1.2, point: 1, ...R(4, 6, 10, 14), ...L(2, -7, 10, 14), fistR: 0.8, fistL: 0.8, charge: 0.9, maneLift: 2 }],
    [14, { jump: 17, pitch: -3.2, point: 1, ...R(9, 8, -1, 17), ...L(8, -8, -1, 17), fistR: 0.9, fistL: 0.9, charge: 1, maneLift: 1.2 }],
    [19, { jump: 10, pitch: -5.0, point: 0.6, ...R(9, 8, 6, 10), ...L(8, -8.5, 6, 10), fistR: 0.8, fistL: 0.8, charge: 1, maneLift: 1.6 }],
    [24, { pitch: -TAU + 0.95, ...landing(), flash: 0.1, charge: 1.2, ...size(1.08, 0.92) }],
    [30, { pitch: -TAU + 0.5, crouch: 4.5, roar: 1, nod: -0.45, earL: 0.6, earR: 0.6, ...R(9, 9, 4), ...L(6, -9, 4), fistR: 0.8, fistL: 0.8, charge: 1.2, flash: 0.04 }],
    [40, { pitch: -TAU + 0.1, crouch: 0.8, roar: 0.2, charge: 0.6 }],
    [48, { pitch: -TAU }],
  ],
  tired: [
    [0, {}],
    [8, { crouch: 2.2, nod: 0.25, lid: 0.35, earL: 0.4, earR: 0.4, roar: 0.25, charge: -0.3, ...R(6, 7, 2), ...L(3, -8, 1) }],
    [18, { crouch: 2.6, nod: 0.3, lid: 0.45, earL: 0.5, earR: 0.5, roar: 0.4, charge: -0.3, ...R(6, 7, 1.5), ...L(3, -8, 0.5) }],
    [26, { crouch: 2.4, nod: 0.28, lid: 0.4, earL: 0.5, earR: 0.5, roar: 0.15, blink: 1, charge: -0.3, ...R(6, 7, 2), ...L(3, -8, 1) }],
    [36, {}],
  ],
  sleep_in: [
    [0, { ...RING }],
    [8, { ...RING, crouch: 3, nod: 0.2, gaze: 0.3, earL: 0.2, earR: 0.2, roar: 0.7, blink: 1 }],
    [14, { ...RING, crouch: 3.5, nod: 0.25, lid: 0.5, earL: 0.3, earR: 0.3, ...R(8, 8, 1), ...L(7, -8.5, 1) }],
    [20, { ...RING, crouch: 4.5, nod: 0.3, lid: 0.7, earL: 0.4, earR: 0.4, ...R(9, 8, -6), ...L(8, -8.5, -6) }],
    [26, { ...asleep, sleep: 0.85 }],
    [36, asleep],
  ],
  sleep_out: [
    [0, asleep],
    [10, { ...asleep, sleep: 0.6, blink: 0, lid: 0.6 }],
    [12, { ...asleep, sleep: 0.35, blink: 0, lid: 0.4, ...R(9, 8, -5), ...L(8, -8.5, -5) }],
    [18, { ringR: 14, ringTilt: 0.22, crouch: 2, lean: -0.5, pitch: -0.25, roar: 1, nod: -0.4, blink: 1, ...R(7, 11, 20), ...L(7, -10, 20), fistR: -0.5, fistL: -0.5, charge: 0.9, earL: 0.5, earR: 0.5, maneLift: 1 }],
    [28, { ...RING, crouch: 0.5, roar: 0.1, charge: 0.5, nod: 0.05 }],
    [36, { ...RING }],
  ],
  wake_startled: [
    [0, asleep],
    [3, { ...asleep, sleep: 0.7, blink: 0, wide: 1, earL: -0.5, earR: -0.5 }],
    [8, { ...RING, jump: 6, wide: 1, earL: -0.6, earR: -0.6, charge: 1.2, ...R(9, 7, 8, 6), ...L(6, -8, 6, 6), snarl: 0.6, maneLift: 2 }],
    [13, { ...RING, crouch: 4, charge: 1.3, snarl: 1, ...R(11, 6, 6), ...L(7, -8, 4), fistR: 0.8, fistL: 0.8, flash: 0.12, earL: 0.6, earR: 0.6 }],
    [22, { ...RING, crouch: 2, snarl: 0.4, charge: 0.8, ...R(8, 6, 6), ...L(5, -8, 5), fistR: 0.6, fistL: 0.6 }],
    [28, { ...RING }],
  ],
  hatch: (() => {
    const keys: Track = [
      [0, { hidden: 1, drumsHidden: 1 }],
      [37, { hidden: 1, drumsHidden: 1 }],
      [38, { ringR: 4, ringTilt: 0.22, crouch: 6, ...size(0.7), flash: 0.8, blink: 1, earL: 0.6, earR: 0.6, ...R(4, 6, 2), ...L(3, -6, 2), fistR: 0.8, fistL: 0.8, tailCurl: 1, nod: 0.5 }],
      [44, { ringR: 10, ringTilt: 0.22, crouch: 2, ...size(0.85), flash: 0.08, wide: 1, nod: 0.1, earL: -0.3, earR: -0.3, tailCurl: 0.5, ...R(8, 8, 8), ...L(7, -8, 8), fistR: 0.6, fistL: 0.6 }],
      [48, { ...RING, crouch: 1, roar: 1, nod: -0.5, ...R(8, 7, 21), ...L(7, -7, 21), fistR: 0.8, fistL: 0.8, charge: 1, flash: 0.12, maneLift: 1.5 }],
      [56, { ...RING, roar: 0.3, ...R(5, 8, 10), ...L(3, -8, 10), fistR: 0.6, fistL: 0.6, charge: 0.8 }],
    ];
    shake(keys, 58, 64, 2, 0.15, { ...RING });
    keys.push([72, { ...RING }]);
    return keys;
  })(),
  peek: [
    // From his rest he crouches and shoots straight up out of the picture; in the dark only his eyes remain.
    [0, { ...RING }],
    [3, { ...RING, crouch: 3.6, lean: 0.3, nod: -0.2, lookY: 0.6, ...R(6, 8, 2), ...L(4, -8, 2), fistR: 0.8, fistL: 0.8, snarl: 0.4, charge: 0.8, earL: 0.4, earR: 0.4 }],
    [5, { ...RING, dy: -70, jump: 8, point: 1, ...size(0.9, 1.2), ...R(6, 8, 18, 8), ...L(5, -8, 18, 8), fistR: 0.9, fistL: 0.9, charge: 1.2, maneLift: 2, flash: 0.06 }],
    [7, { ...RING, dy: -230, jump: 10, point: 1, ...size(0.85, 1.3), ...R(6, 8, 20, 10), ...L(5, -8, 20, 10), fistR: 0.9, fistL: 0.9, charge: 1.2, maneLift: 2.4 }],
    [8, { hidden: 1, drumsHidden: 1 }],
    [15, { hidden: 1, drumsHidden: 1 }],
    [16, { dy: 140, ...size(1.3), peekFront: 1, noShadow: 1, drumsHidden: 1, ...R(10, 6, 13), ...L(10, -6, 13), fistR: -0.4, fistL: -0.4, lid: 0.3, charge: 0.8 }],
    [22, { dy: 117, ...size(1.3), peekFront: 1, noShadow: 1, drumsHidden: 1, ...R(10, 6, 13), ...L(10, -6, 13), fistR: 0.6, fistL: 0.6, lid: 0.3, charge: 0.9, earL: -0.2, earR: -0.2 }],
    [30, { dy: 116, ...size(1.3), peekFront: 1, noShadow: 1, drumsHidden: 1, ...R(10, 6, 13), ...L(10, -6, 13), fistR: 0.6, fistL: 0.6, snarl: 0.7, lid: 0.35, charge: 1, gaze: 0.2, tilt: 0.1 }],
    [44, { dy: 116, ...size(1.3), peekFront: 1, noShadow: 1, drumsHidden: 1, ...R(10, 6, 13), ...L(10, -6, 13), fistR: 0.6, fistL: 0.6, snarl: 0.8, lid: 0.4, charge: 1.1, gaze: 0.25, tilt: 0.14 }],
    [48, { dy: 165, ...size(1.3), peekFront: 1, noShadow: 1, drumsHidden: 1, ...R(10, 6, 13), ...L(10, -6, 13), fistR: 0.6, fistL: 0.6, snarl: 0.5, charge: 1 }],
    [49, { hidden: 1, drumsHidden: 1 }],
    [50, { ...RING, dy: -90, jump: 4, point: 1, ...R(5, 8, 12, 4), ...L(4, -8, 12, 4), fistR: 0.8, fistL: 0.8, maneLift: 2 }],
    [54, { ...RING, crouch: 5, ...landing(0.8), pitch: 0.4, flash: 0.06 }],
    [57, { ...RING, crouch: 1.2, nod: 0.08 }],
    [59, { ...RING }],
  ],
  trick: trickTrack(),
  trick_b: trickBTrack(),
  trick_c: trickCTrack(),
  phase: phaseTrack(),
  'happy-f2': [
    [0, f2({})],
    [6, f2({ crouch: 2, ...R(6, 7, 6, 5), ...L(4, -8, 6, 5), fistR: 0.8, fistL: 0.8, charge: 0.9 })],
    [14, f2({ ...R(8, 9, 15, 6), ...L(8, -9, 15, 6), fistR: -0.6, fistL: -0.6, charge: 1.1, hover: 7, maneLift: 1.6 })],
    [26, f2({ roar: 1, nod: -0.4, ...R(8, 11.5, 21, 8), ...L(8, -10.5, 21, 8), fistR: 0.9, fistL: 0.9, charge: 1.3, hover: 8, flash: 0.08, maneLift: 1.4 })],
    [32, f2({ roar: 0.5, hover: 7, charge: 1, ...R(9, 10, 9, 7), ...L(8, -10, 9, 7), fistR: 0.5, fistL: 0.5 })],
    [38, f2({ roar: 0.2, hover: 6, charge: 0.9 })],
    [48, f2({})],
  ],
  'trick-f2': trickF2Track(),
  'trick_b-f2': trickBF2Track(),
  'trick_c-f2': trickCF2Track(),
  show: showTrack(),
};
/** Lanes: single keys keyed on their own frames, eased on their own (or linear), laid over the main keys. */
export type Lane = [number, number][];
const pulse = (from: number, to: number, periods: [number, number][], amp: number): Lane => {
  // A throb that speeds up: [until frame, period] segments.
  const keys: Lane = [[from, 0]];
  let f = from,
    s = 1;
  for (const [until, period] of periods)
    while (f + period / 2 <= until && f < to) {
      f += period / 2;
      keys.push([f, s * amp]);
      s = -s;
    }
  keys.push([Math.min(to, f + 2), 0]);
  return keys;
};
/** The path of «Ураган»: round deep in the field and back, then to the glass. */
function stormPath() {
  const dx: Lane = [],
    dy: Lane = [],
    sx: Lane = [],
    sy: Lane = [];
  const at = (f: number): [number, number] => {
    if (f <= 40) return [0, 0];
    if (f <= 120) {
      const u = (f - 40) / 80,
        a = u * TAU;
      return [50 * Math.sin(a), -42 * Math.sin(a / 2) ** 2 * 1.0];
    }
    if (f <= 140) {
      const u = (f - 120) / 20;
      return [0, 18 * (u * u * (3 - 2 * u))];
    }
    if (f <= 200) return [0, 18];
    if (f <= 232) {
      const u = (f - 200) / 32;
      return [0, 18 * (1 - u * u * (3 - 2 * u))];
    }
    return [0, 0];
  };
  for (let f = 0; f <= 288; f += 4) {
    const [x, y] = at(f);
    dx.push([f, x]);
    dy.push([f, y]);
    const k = 1 + y * 0.0072;
    sx.push([f, k - 1]);
    sy.push([f, k - 1]);
  }
  return { dx, dy, sx, sy };
}
const hitSpins = (): Lane => {
  const keys: Lane = [[0, 0]];
  let s = 0;
  for (const c of beats.trick_c.hits) {
    keys.push([c + 1, s]);
    s += TAU / 8;
    keys.push([c + 4, s]);
  }
  keys.push([276, s]);
  return keys;
};
export const lanes: Record<string, Record<string, Lane>> = {
  phase: {
    flash: [[0, 0], [27, 0], [28, 0.9], [31, 0.2], [35, 0.2], [36, 1], [39, 0.3], [41, 0.3], [42, 1], [44, 0.5], [46, 1], [48, 1], [70, 1], [74, 0.8], [84, 0]],
    sx: pulse(48, 70, [[58, 8], [65, 4], [70, 2]], 0.07),
    sy: pulse(48, 70, [[58, 8], [65, 4], [70, 2]], -0.07),
    form: [[0, 0], [59, 0], [61, 1], [120, 1]],
    // The halo rises over his head in the white-out, lies flat as a crown, and on the burst drops round him as the storm girdle.
    ringBack: [[0, 0], [46, 0], [52, 7], [62, 7], [67, 0], [120, 0]],
    ringUp: [[0, 0], [48, 0], [58, 30], [66, 30], [71, 6], [76, 0], [120, 0]],
    ringR: [[0, 16], [66, 16], [72, 24], [80, 21], [120, 21]],
    ringTilt: [[0, 0.22], [57, 0.22], [64, 1.36], [82, 1.32], [120, 1.32]],
    hover: [[0, 0], [86, 0], [100, 5.4], [110, 4.8], [120, 5]],
    charge: [[0, 0], [28, 1.2], [70, 1.6], [100, 1.2], [120, 0.6]],
  },
  'happy-f2': {
    twist: [[0, 0], [10, 0], [26, TAU], [48, TAU]],
    drumWave: [[0, 0], [11, 0], [12, 0.01], [30, 1], [31, 0]],
  },
  trick_b: {
    // The spear wheels flat across his front (in the plane of his shoulders), so neither end swings through him.
    spearY: [[0, Math.PI / 2], [276, Math.PI / 2]],
    spearP: [[0, 1.45], [33, 1.45], [36, 1.45], [70, 1.45 + 4 * Math.PI], [72, -1.57 + 6 * Math.PI], [104, -1.57 + 6 * Math.PI]],
    spearSink: [[0, 0], [85, 0], [86, 0.18], [90, 0.3], [104, 1]],
    stonesUp: [[0, 0], [88, 0], [90, 0.05], [110, 1], [150, 1.05], [170, 0.9]],
    stonesIn: [[0, 0], [150, 0], [170, 1]],
    stonesGone: [[0, 0], [170, 0], [171, 1]],
    flash: [[0, 0], [29, 0], [30, 0.85], [33, 0.2], [38, 0], [85, 0], [86, 0.2], [90, 0.04], [169, 0], [170, 0.16], [176, 0]],
  },
  trick_c: {
    // Unfold: the halo rises over his head, lies flat as a crown and drops round his waist. Fold: the same backwards.
    ringBack: [[0, 0], [6, 5], [14, 5], [20, 0], [236, 0], [242, 5], [250, 5], [258, 0], [276, 0]],
    ringUp: [[0, 0], [12, 30], [18, 30], [30, 0], [222, 0], [234, 30], [242, 30], [254, 0], [276, 0]],
    ringTilt: [[0, 0.22], [12, 0.22], [18, 1.3], [236, 1.3], [242, 0.22], [276, 0.22]],
    ringR: [[0, 16], [30, 15], [150, 15], [160, 17], [190, 17], [200, 15], [222, 15], [242, 16], [276, 16]],
    drumBig: [[0, 0], [30, 0.45], [222, 0.45], [246, 0], [276, 0]],
    ringSpin: hitSpins(),
    twist: [[0, 0], [150, 0], [156, 0.6], [186, 4 * Math.PI], [190, 4 * Math.PI], [276, 4 * Math.PI]],
    roll: pulse(152, 186, [[186, 6]], 0.06),
  },
  'trick-f2': {
    twist: [[0, 0], [20, 0], [40, TAU], [70, TAU * 4], [110, TAU * 9], [140, TAU * 12.5], [150, TAU * 13], [288, TAU * 13]],
    ...stormPath(),
    torn: [[0, 0], [20, 0], [50, 1], [150, 1], [160, 1], [161, 0]],
    tornThrow: [[0, 0], [160, 0], [172, 1]],
    glassHit: [[0, 0], [165, 0], [166, 0.04], [200, 1], [201, 0]],
    drumWave: [[0, 0], [241, 0], [242, 0.01], [262, 1], [263, 0]],
  },
  'trick_b-f2': {
    orb: [[0, 0], [4, 0], [40, 0.5], [130, 1.0], [166, 2.0], [276, 2.0]],
    orbRing: [[0, 0], [40, 0], [48, 1], [122, 1], [132, 0]],
    orbLap: [[0, 0], [40, 0], [130, 4], [276, 4]],
    orbFly: [[0, 0], [170, 0], [182, 1], [276, 1]],
    orbBurst: [[0, 0], [182, 0], [206, 1], [276, 1]],
    orbFront: [[0, 0], [169, 0], [170, 1], [206, 1], [207, 0]],
    drumWave: [[0, 0], [245, 0], [246, 0.01], [264, 1], [265, 0]],
  },
  'trick_c-f2': {
    dy: [[0, 0], [16, 0], [20, -16], [26, -60], [32, -140], [39, -300], [40, 0], [276, 0]],
    hover: [[0, 5], [10, 2], [16, 8], [39, 8], [40, 0], [180, 0], [200, 5], [288, 5]],
  },
  show: {
    charge: [[0, 0], [44, 1.6], [60, 0.8], [70, 1.4], [80, 1.5], [110, 1.4], [134, 1.6], [168, 0]],
  },
};
const LINEAR = new Set(['dx', 'dy', 'twist', 'ringSpin', 'yawSpin', 'spearP', 'spearSpin', 'orbLap']);
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
