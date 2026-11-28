// Pose book of Кайрос. Times are frames at 24 fps. Hand goals (hLf/hLs/hLu, hRf/hRs/hRu) are offsets from the hanging
// paw in the body frame (forward, outward, up); the IK keeps both arm bones at their length, so a goal out of reach
// is simply not reached. `spent` is how much of the chest sand has poured into the belly (0 = chest full).
// The story beats in `beats` are shared with the effects (kairos-fx.ts): the nest, the eggs, the wind and the
// backwards world read the same numbers, so moving a beat moves the body and the world together.
import { keyframer, somersault, type Lane, type Track } from '../kit/pet-moves';
import { everyday } from '../rig/figure';
import type { Animation } from '../types';

export const clips: Record<string, Animation> = {
  ...everyday,
  idle: { seconds: 3, loop: true },
  walk: { seconds: 1, loop: true },
  look: { seconds: 1.5 },
  fidget_a: { seconds: 3 },
  happy: { seconds: 2 },
  trick: { seconds: 15 },
};

/** «Миг назад»: the gust knocks the nest down; he turns the world back with his sand; he saves it by hand. */
export const beats = {
  trick: {
    notice: 20, // he looks up at the nest
    gust: 30, // the first gust starts (world time)
    slip: 50, // the nest slides off the fork
    land: 64, // the nest hits the ground, the eggs crack
    resolve: 74, // he decides: palms together
    snap: 86, // the tick: time stops and turns
    rewindEnd: 178, // the last grain: the world runs forward again
    worldFrom: -54, // the world time he turned back to (well before the gust)
    runStart: 198,
    runEnd: 226,
    press: 236, // paws on the nest, pressing it into the fork
    gust2: 262, // the gust again — the nest holds
    calm: 292,
    crouch: 300,
    flipAt: 306,
    flipAir: 16,
    chick: 330, // a chick pokes its head out of an egg
    homeStart: 338,
    homeEnd: 358,
  },
  // A pinch of time: a leaf falls, one grain of sand drops, the leaf jumps back up to its twig.
  fidget_a: { leafFall: 6, grain: 30, leafBack: 34, leafHome: 52 },
};

/** How far he runs to stand under the fork, field pixels. */
export const RUN_DX = 44,
  RUN_DY = -6;
/** Hands: palms together in front of the chest; arms wide and up (conducting time); up to the fork. */
const palms = (lift = 0) => ({ hLf: 4.4, hLs: -6.0, hLu: 5.2 + lift, hRf: 4.4, hRs: -6.0, hRu: 5.2 + lift });
const wide = (k = 1) => ({ hLf: 0.4 * k, hLs: 3.2 * k, hLu: 15 * k, hRf: 0.4 * k, hRs: 3.2 * k, hRu: 15 * k });
const reachUp = (press = 0) => ({ hLf: 5.4, hLs: -4.6, hLu: 18.4 - 1.2 * press, hRf: 5.4, hRs: -4.0, hRu: 18.0 - 1.2 * press });
const toTree = { yaw: -1.15 };
/** Turned towards the tree but still showing the face. */
const lunge = { yaw: -0.55 };
const t = beats.trick;
const rewindFrames = t.rewindEnd - t.snap;

function rewindTrack(): Track {
  // While the sand pours, the body stays still and stretched like a conductor; the arms breathe with the flow.
  const keys: Track = [];
  for (let f = t.snap + 6; f < t.rewindEnd; f += 8) {
    const k = (f - t.snap) / rewindFrames;
    keys.push([f, { ...wide(1 + 0.08 * Math.sin(k * 12)), lean: -0.6, nod: -0.22, earL: -0.35, earR: -0.35, spent: k, pour: 1, glow: 1,
      tailSway: 0.25 * Math.sin(k * 9), squat: 0.4 }]);
  }
  return keys;
}
const tracks: Record<string, Track> = {
  idle: [[0, {}], [20, { nod: -0.04, earL: 0.08 }], [40, { gaze: -0.1, tilt: 0.04 }], [56, { earR: 0.12 }], [72, {}]],
  look: [[0, {}], [6, { earL: -0.25, earR: -0.25 }], [12, { gaze: 0.6, yaw: 0.2, nod: -0.1 }], [20, { gaze: 0.62, yaw: 0.22, blink: 1 }],
    [22, { gaze: 0.62, yaw: 0.22 }], [30, { gaze: -0.4, yaw: -0.1, tilt: 0.06 }], [36, {}]],
  happy: [[0, {}], [5, { squat: 1.4, smile: 1 }], [10, { jump: 4, smile: 1, mouth: 0.6, ...wide(0.7), earL: -0.4, earR: -0.4 }],
    [16, { jump: 0.5, smile: 1, ...wide(0.5) }], [20, { squat: 1, smile: 1 }], [30, { smile: 0.8, tilt: 0.1 }], [48, {}]],
  // A pinch of time. He watches a leaf fall, lifts one paw, lets one grain drop — and the leaf jumps back up.
  fidget_a: [[0, {}], [8, { gaze: -0.5, nod: -0.3, earL: -0.2 }], [20, { gaze: -0.35, nod: 0.25, earR: -0.2 }],
    // He taps the brass waist with one finger: one grain falls through.
    [26, { gaze: -0.3, nod: 0.35, hRf: 2.8, hRs: -5.2, hRu: 1.6, curl: 1 }],
    [29, { gaze: -0.3, nod: 0.38, hRf: 2.6, hRs: -6.2, hRu: 0.4, curl: 1, pour: 0.8, glow: 0.9 }],
    [32, { gaze: -0.4, nod: 0.1, hRf: 3.0, hRs: -4.8, hRu: 1.8, curl: 1, pour: 0, glow: 0.7, earL: -0.3, earR: -0.3 }],
    [38, { gaze: -0.45, nod: -0.25, earL: -0.35, earR: -0.35, glow: 0.4 }],
    [44, { gaze: -0.4, nod: -0.4, smile: 0.8, hRf: 1, hRu: 1 }], [56, { smile: 1, tilt: 0.12 }], [72, {}]],
  trick: [
    [0, {}],
    [t.notice, { gaze: 0.55, nod: -0.32, smile: 0.4 }],
    [t.gust, { gaze: 0.55, nod: -0.32, earL: 0.25, earR: 0.25, tailSway: -0.3 }],
    [t.slip - 4, { gaze: 0.55, nod: -0.34, earL: -0.45, earR: -0.45, mouth: 0.6 }],
    // One lunge: he steps towards it, but the nest is too far and too fast.
    [t.slip + 2, { ...lunge, fwd: 2.2, lean: 1.2, stepL: 3.4, liftL: 1.8, gaze: -0.3, nod: 0.05, hLf: 6, hLs: -3, hLu: 9, earL: -0.6, earR: -0.6, mouth: 0.8 }],
    [t.land - 2, { ...lunge, fwd: 2.6, lean: 1.4, stepL: 3.8, gaze: -0.25, nod: 0.45, hLf: 6, hLs: -2.5, hLu: 7, earL: -0.6, earR: -0.6, mouth: 0.9 }],
    [t.land + 6, { ...lunge, fwd: 2.2, lean: 0.5, stepL: 3.8, nod: 0.5, earL: 0.6, earR: 0.6, mouth: 0.2 }],
    [t.resolve - 2, { ...lunge, fwd: 1.8, nod: 0.2, earL: 0.4, earR: 0.4, blink: 1 }],
    [t.resolve + 4, { yaw: -0.4, fwd: 0.8, squat: 0.6, nod: -0.05, earL: -0.2, earR: -0.2, ...palms(), glow: 0.3 }],
    [t.snap - 3, { yaw: -0.25, squat: 1.2, nod: 0.08, earL: -0.3, earR: -0.3, ...palms(0.5), glow: 0.7, blink: 1 }],
    [t.snap, { yaw: -0.2, squat: 0.2, lean: -0.4, nod: -0.2, ...wide(), glow: 1, pour: 1, flash: 0.4, earL: -0.5, earR: -0.5 }],
    [t.snap + 3, { yaw: -0.2, squat: 0.3, lean: -0.5, nod: -0.21, ...wide(), glow: 1, pour: 1, earL: -0.5, earR: -0.5, spent: 0.02 }],
    ...rewindTrack(),
    [t.rewindEnd, { spent: 1, pour: 0.3, glow: 0.4, ...wide(0.8), lean: -0.4, squat: 0.4 }],
    // Empty chest: heavy at the bottom, he sags and wobbles.
    [t.rewindEnd + 8, { spent: 1, squat: 2.2, nod: 0.45, roll: 0.12, earL: 0.6, earR: 0.6, tailSway: 0.3 }],
    [t.rewindEnd + 14, { spent: 1, squat: 1.6, nod: 0.3, roll: -0.1, earL: 0.5, earR: 0.5 }],
    [t.runStart - 2, { spent: 1, yaw: -0.8, nod: -0.2, earL: -0.3, earR: -0.3, gaze: -0.3 }],
    [t.runEnd, { spent: 1, ...toTree, dx: RUN_DX, dy: RUN_DY, nod: -0.4, earL: -0.3, earR: -0.3 }],
    [t.press - 4, { spent: 1, ...toTree, dx: RUN_DX, dy: RUN_DY, rise: 2.6, nod: -0.55, ...reachUp() }],
    [t.press + 6, { spent: 1, ...toTree, dx: RUN_DX, dy: RUN_DY, rise: 2.2, nod: -0.5, ...reachUp(1), smile: 0.3 }],
    // The gust again: he leans into it and keeps both paws on the nest.
    [t.gust2, { spent: 1, ...toTree, dx: RUN_DX, dy: RUN_DY, rise: 2.0, lean: 0.8, nod: -0.5, ...reachUp(1), blink: 1, earL: 0.7, earR: 0.7, tailSway: -0.6 }],
    [t.gust2 + 16, { spent: 1, ...toTree, dx: RUN_DX, dy: RUN_DY, rise: 2.0, lean: 1.0, nod: -0.5, ...reachUp(1), blink: 1, earL: 0.8, earR: 0.8, tailSway: -0.7 }],
    [t.calm, { spent: 1, ...toTree, dx: RUN_DX, dy: RUN_DY, rise: 1.4, nod: -0.5, ...reachUp(0.6), smile: 0.6 }],
    [t.crouch, { spent: 1, yaw: -0.6, dx: RUN_DX - 4, dy: RUN_DY, nod: 0, smile: 0.4 }],
    // The flip refills the chest: upside down, the sand falls back up into it.
    [t.flipAt + 5, { spent: 0.95, pour: 1, tuck: 1, earL: 0.9, earR: 0.9, yaw: -0.6, dx: RUN_DX - 6, dy: RUN_DY, glow: 0.4 }],
    [t.flipAt + 11, { spent: 0.05, pour: 1, tuck: 1, earL: 0.9, earR: 0.9, yaw: -0.6, dx: RUN_DX - 8, dy: RUN_DY, glow: 0.8 }],
    [t.flipAt + t.flipAir, { spent: 0, pour: 0, tuck: 0, yaw: -0.6, dx: RUN_DX - 9, dy: RUN_DY, glow: 1, gearSpin: 0.52 }],
    [t.chick - 2, { yaw: -0.9, dx: RUN_DX - 9, dy: RUN_DY, gaze: -0.4, nod: -0.4, glow: 0.2, gearSpin: 0.52 }],
    [t.chick + 6, { yaw: -0.9, dx: RUN_DX - 9, dy: RUN_DY, gaze: -0.4, nod: -0.45, smile: 1, mouth: 0.4, earL: -0.4, earR: -0.4, gearSpin: 0.52 }],
    [t.homeStart, { yaw: 0.6, dx: RUN_DX - 9, dy: RUN_DY, smile: 1, gearSpin: 0.52 }],
    [t.homeEnd, { smile: 0.6, gearSpin: 0.52 }],
    [360, { gearSpin: 0.52 }],
  ],
};
/** Lanes: the rewind spins the gear backwards; the run and the walk home step the legs; the somersault. */
function steps(from: number, to: number, count: number): Record<string, Lane> {
  const L: Lane = [[from, 0]],
    R: Lane = [[from, 0]],
    LL: Lane = [[from, 0]],
    RL: Lane = [[from, 0]],
    bob: Lane = [[from, 0]];
  const span = (to - from) / count;
  for (let i = 0; i < count; i++) {
    const a = from + i * span,
      m = a + span / 2,
      b = a + span;
    const lane = i % 2 ? R : L,
      lift = i % 2 ? RL : LL;
    lane.push([a, -1.6], [b, 1.6]);
    lift.push([a, 0], [m, 2.2], [b, 0]);
    bob.push([m, 0.9], [b, 0]);
  }
  for (const lane of [L, R]) lane.push([to + 4, 0]);
  return { gaitL: L, gaitR: R, gliftL: LL, gliftR: RL, hop: bob };
}
const run = steps(t.runStart, t.runEnd, 4),
  home = steps(t.homeStart, t.homeEnd, 4);
const flip = somersault({ at: t.flipAt, air: t.flipAir, dir: -1, turns: 1, height: 15, crouch: 2.4 });
const merge = (...lanes: Lane[]): Lane => lanes.flat().sort((a, b) => a[0] - b[0]);
const lanes: Record<string, Record<string, Lane>> = {
  trick: {
    gearSpin: [[0, 0], [t.snap, 0], [t.snap + 4, 0.6], [t.rewindEnd - 6, 14.1], [t.rewindEnd, 14.66], [t.flipAt + t.flipAir, 14.66], [t.flipAt + t.flipAir + 2, 15.18], [360, 15.18]],
    gaitL: merge(run.gaitL, home.gaitL),
    gaitR: merge(run.gaitR, home.gaitR),
    gliftL: merge(run.gliftL, home.gliftL),
    gliftR: merge(run.gliftR, home.gliftR),
    hop: merge(run.hop, flip.jump, home.hop.slice(1)),
    pitch: flip.pitch,
    crouch: [[0, 0], ...flip.crouch],
  },
};
export const gesture = keyframer({ tracks, lanes, linear: new Set(['gearSpin', 'pitch']) });
