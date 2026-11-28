// Proven pet moves. Every helper here was written once in a pet's own files, broke there, and was fixed; a new pet
// takes it from here instead of re-deriving it (and re-breaking it). Origins in brackets.
//
//   keyframer      the key-and-lane sampler every Claude pet copied [Шмыг, Раскат: identical 40 lines]
//   snapTo         a move at the Astral tempo: wind-up → fast action → overshoot → settle (skill §«Темп»)
//   somersault     a whole flip: crouch, launch, a whole turn of `pitch`, landing squash [Шмыг, Раскат]
//   spinLane       an n-fold object turning by whole steps so it ends on its rest look [Раскат drum ring]
//   flipTuck       how tucked the legs are at a body pitch: knees up the moment he is thrown back [Раскат 21.11]
//   pivotLift      hips offset so a flip turns round the middle, not round the feet [Раскат]
//   takeoffFrame   the frame whose floor point a take-off effect uses [Раскат peek: the ring drew mid-air]
// Time-driven wobble (breathing, hover, a churning mane) goes on kit/clock.ts.
import type { JointPose } from '../technique';

export type Track = [number, JointPose][];
/** A single key on its own frames, laid over the main keys. */
export type Lane = [number, number][];

const smooth = (u: number) => u * u * (3 - 2 * u);

export interface KeyframerSpec {
  /** Main keys per clip: whole poses at frames (24 fps), smoothstep between them. */
  tracks: Record<string, Track>;
  /** Single keys per clip, laid over the main keys. */
  lanes?: Record<string, Record<string, Lane>>;
  /** Keys that switch at the next key's frame instead of blending (visibility, layer flags). */
  switches?: ReadonlySet<string>;
  /** Lane keys interpolated linearly (positions in flight, spins): no ease-in/out at every key. */
  linear?: ReadonlySet<string>;
  /** Clips with one fixed pose (e.g. sleep). */
  fixed?: Record<string, JointPose>;
}

/** The pose sampler `(anim, t) → JointPose` with exactly the behaviour of the copies in the pet files. */
export function keyframer({ tracks, lanes = {}, switches = new Set(), linear = new Set(), fixed = {} }: KeyframerSpec) {
  function laneValue(name: string, keys: Lane, f: number) {
    if (f <= keys[0][0]) return keys[0][1];
    const i = keys.findIndex(([time]) => time >= f);
    if (i < 0) return keys[keys.length - 1][1];
    const [start, a] = keys[i - 1],
      [end, b] = keys[i];
    if (switches.has(name)) return f >= end ? b : a;
    let u = (f - start) / (end - start);
    if (!linear.has(name)) u = smooth(u);
    return a + (b - a) * u;
  }
  return function gesture(anim: string, t: number): JointPose {
    if (fixed[anim]) return fixed[anim];
    const keys = tracks[anim];
    if (!keys) return {};
    const f = t * 24,
      i = keys.findIndex(([time]) => time >= f);
    let pose: JointPose = {};
    if (i <= 0) pose = { ...keys[i === 0 ? 0 : keys.length - 1][1] };
    else {
      const [start, a] = keys[i - 1],
        [end, b] = keys[i];
      const u = smooth((f - start) / (end - start));
      for (const name of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (switches.has(name)) pose[name] = f >= end ? (b[name] ?? 0) : (a[name] ?? 0);
        else pose[name] = (a[name] ?? 0) * (1 - u) + (b[name] ?? 0) * u;
      }
    }
    for (const [name, lane] of Object.entries(lanes[anim] ?? {})) pose[name] = laneValue(name, lane, f);
    return pose;
  };
}

export interface SnapTiming {
  /** Frame the fast action starts. */
  at: number;
  /** Wind-up frames before `at`, moving the other way. Default 4. */
  windup?: number;
  /** Frames of the action itself: 1–4 at the Astral tempo. Default 3. */
  act?: number;
  /** Frames from the overshoot back to the target: 6–10. Default 6. */
  settle?: number;
  /** Share of the travel for the wind-up (back) and the overshoot (past). Defaults 0.15 and 0.12. */
  back?: number;
  past?: number;
}

/** Lane keys for one move from `from` to `to`: wind-up against the move, a fast action, an overshoot, a settle. */
export function snapTo(from: number, to: number, { at, windup = 4, act = 3, settle = 6, back = 0.15, past = 0.12 }: SnapTiming): Lane {
  const d = to - from;
  return [
    [at - windup, from],
    [at, from - d * back],
    [at + act, to + d * past],
    [at + act + settle, to],
  ];
}

export interface SomersaultSpec {
  /** Frame of the launch (feet leave the floor). */
  at: number;
  /** Airborne frames. 10–14 reads as a snap flip at 24 fps. */
  air: number;
  /** -1 = backwards (head first back), +1 = forwards. */
  dir?: -1 | 1;
  /** Whole turns. Default 1. */
  turns?: number;
  /** Apex height in the pet's jump units. */
  height: number;
  /** Crouch depth before and after. */
  crouch: number;
  /** Pitch at rest, kept exactly at both ends. Default 0. */
  rest?: number;
}

/**
 * `pitch` (linear), `jump` and `crouch` lanes of a whole flip: a 4-frame crouch, the launch, `turns` whole turns in
 * the air (the jump arc is a parabola), a landing squash of 3 frames and a 6-frame settle. Pair with flipTuck and
 * pivotLift in the skin, and put `pitch` in the keyframer's `linear` set.
 */
export function somersault({ at, air, dir = -1, turns = 1, height, crouch, rest = 0 }: SomersaultSpec): Record<string, Lane> {
  const land = at + air;
  const spin = dir * turns * Math.PI * 2;
  const arc: Lane = [];
  for (let k = 0; k <= 4; k++) {
    const u = k / 4;
    arc.push([at + air * u, height * 4 * u * (1 - u)]);
  }
  return {
    // the turn starts a frame after the launch and is complete a frame before the landing
    pitch: [
      [at, rest],
      [at + 1, rest],
      [land - 1, rest + spin],
      [land + 9, rest + spin],
    ],
    jump: [[at - 4, 0], ...arc, [land + 9, 0]],
    crouch: [
      [at - 4, 0],
      [at - 1, crouch],
      [at + 1, 0],
      [land, 0],
      [land + 2, crouch * 0.8],
      [land + 8, 0],
    ],
  };
}

/**
 * Lane of a spin for an object with `folds`-fold symmetry over frames [from, to]: it advances by whole 1/folds steps
 * (at least one), so it looks exactly like its rest pose when it stops. Put the key in `linear`.
 */
export function spinLane(from: number, to: number, folds: number, turnsPerSecond: number, start = 0): Lane {
  const steps = Math.max(1, Math.round(((to - from) / 24) * turnsPerSecond * folds));
  return [
    [from, start],
    [to, start + (steps * Math.PI * 2) / folds],
  ];
}

const wrap = (a: number) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
/**
 * Leg tuck 0..1 at body `pitch` (rest pitch `rest`): tucked once the body is turned past ~75° either way, and at
 * once when thrown backwards (the knees came up only half way through a back flip and pierced the belly [Раскат]).
 * A forward lean on landing does not tuck.
 */
export function flipTuck(pitch: number, rest = 0): number {
  const sat = (x: number) => Math.min(1, Math.max(0, x));
  const pk = wrap(pitch - rest);
  return Math.max(sat((Math.min(pk, Math.PI * 2 - pk) - 1.3) / 0.6), pk > Math.PI ? sat((Math.PI * 2 - pk - 0.5) / 0.5) : 0);
}

/**
 * Hips offset [forward, up] in rig units so a body pitched by `pitch` turns round a point `radius` above the hips:
 * without it a flip pivots on the feet and the head sweeps through the floor [Раскат]. Off below ~45°.
 */
export function pivotLift(pitch: number, rest = 0, radius = 9): [number, number] {
  const p = pitch - rest;
  const w = Math.min(1, Math.max(0, (Math.abs(wrap(p + Math.PI) - Math.PI) - 0.8) / 0.8)) * radius;
  return [-w * Math.sin(p), w * (1 - Math.cos(p))];
}

/**
 * A take-off effect (shock ring, dust, bolt) is drawn at the floor point of two frames before the leap beat: at the
 * beat itself the feet have already left and the ring hangs in the air [Раскат peek].
 */
export const takeoffFrame = (leapBeat: number) => leapBeat - 2;
