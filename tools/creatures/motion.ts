import { SE } from './rig/f15-rig';
import { sizes, type Creature, type MotionPlan, type XY } from './types';

export const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
export type Direction = (typeof directions)[number];
export type { MotionPlan, MotionBeat } from './types';
const wrap = (v: number, m: number) => ((v % m) + m) % m;
const ease = (u: number) => u * u * (3 - 2 * u);
const mix = (a: number, b: number, u: number) => a + (b - a) * u;
const point = (a: XY, b: XY, u: number): XY => [
  mix(a[0], b[0], u),
  mix(a[1], b[1], u),
];
export function strideFoot(t: number, offset: number, stride: number) {
  const phase = wrap(t + offset, 1);
  if (phase < 0.5)
    return { forward: stride * (0.25 - phase), lift: 0, planted: true };
  const u = 2 * (phase - 0.5);
  // Cubic swing with the same rearward velocity at toe-off and touchdown.
  return {
    forward: stride * (-0.25 - 0.5 * u + 3 * u * u - 2 * u * u * u),
    lift: Math.sin(Math.PI * u) ** 2,
    planted: false,
  };
}
export function directionVector(dir: Direction, stride: number): XY {
  const i = directions.indexOf(dir),
    a = ((i - 2) * Math.PI) / 4;
  return [
    Math.abs(Math.cos(a)) < 1e-8 ? 0 : stride * Math.cos(a),
    Math.abs(Math.sin(a)) < 1e-8 ? 0 : stride * Math.sin(a) * SE,
  ];
}
function heading(v: XY, base: number) {
  return wrap(((Math.atan2(v[1] / SE, v[0]) - base) * 8) / Math.PI, 16);
}
const turn = (a: number, b: number, u: number) =>
  wrap(a + (wrap(b - a + 8, 16) - 8) * u, 16);
export const lifeDuration = (p: MotionPlan) =>
  p.beats.reduce((n, b) => n + b.seconds, 0);
// Frame indices keep short attacks and the six-frame rests exactly on a GIF tick.
export function reelChapters(c: Creature) {
  let cursor = 0;
  return Object.entries(c.animations)
    .filter(([name]) => name.startsWith('tech_'))
    .map(([name, action]) => {
      const frames = Math.round(action.seconds * 24);
      const start = cursor;
      cursor += frames + 6;
      return { name, start, frames, end: cursor };
    });
}

/** Play the complete authored technique on the 24 Hz clock when it occurs in life. */
export function resolveTechniqueBeats(c: Creature, plan: MotionPlan): MotionPlan {
  return {
    ...plan,
    beats: plan.beats.map((beat) =>
      beat.anim.startsWith('tech_') && c.animations[beat.anim]
        ? {
            ...beat,
            seconds: Math.round(c.animations[beat.anim].seconds * 24) / 24,
          }
        : beat,
    ),
  };
}

export function attachMotion(c: Creature, plan: MotionPlan): Creature {
  if (
    !Number.isFinite(plan.stride) ||
    plan.stride <= 0 ||
    !Number.isFinite(plan.yaw)
  )
    throw Error(c.id + ' invalid gait');
  plan = resolveTechniqueBeats(c, plan);
  const chapters = reelChapters(c);
  const seconds = lifeDuration(plan);
  let start = 0;
  const lifeHits = plan.beats.flatMap((beat) => {
    const action = c.animations[beat.anim];
    const times = (action?.hits ?? []).map(
      (hit) =>
        Math.round((start + (hit * beat.seconds) / action.seconds) * 24) / 24,
    );
    start += beat.seconds;
    return times;
  });
  if (seconds < 12 - 1e-8 || seconds > 20 + 1e-8)
    throw Error(c.id + ' life must last 12–20 seconds');
  for (const beat of plan.beats) {
    if (
      !(beat.seconds > 0) ||
      beat.at.some((n) => !Number.isFinite(n) || n < 0 || n > 1)
    )
      throw Error(c.id + ' invalid life waypoint');
    if (
      !['walk', 'fly', 'turn'].includes(beat.anim) &&
      !c.animations[beat.anim]
    )
      throw Error(c.id + ' missing ' + beat.anim);
  }
  return {
    ...c,
    motion: plan,
    animations: {
      ...c.animations,
      life: { seconds, loop: true, hits: lifeHits },
      ...(chapters.length
        ? {
            showreel: {
              seconds: chapters.at(-1)!.end / 24,
              loop: true,
              hits: chapters.flatMap(({ name, start }) =>
                (c.animations[name].hits ?? []).map(
                  (t) => (start + Math.round(t * 24)) / 24,
                ),
              ),
            },
          }
        : {}),
      ...Object.fromEntries(
        directions.map((d) => ['walk_' + d, { seconds: 1, loop: true }]),
      ),
    },
  };
}
export interface Placement {
  feet: XY;
  side: number;
  headSide: number;
  anim: string;
  t: number;
  lift: number;
  start: number;
  duration: number;
  beat: number;
}
function routePlacement(
  c: Creature,
  anim: string,
  t: number,
  side: number,
  origin: XY,
): Placement {
  const [w, h] = sizes[c.rarity],
    plan = c.motion;
  const facing = anim === 'turn' ? wrap(Math.floor(t * 4), 16) : side;
  const fixed = {
    feet: origin,
    anim,
    t,
    side: facing,
    headSide: facing,
    lift: 0,
    start: 0,
    duration: c.animations[anim]?.seconds ?? 1,
    beat: -1,
  };
  if (anim === 'showreel') {
    const chapters = reelChapters(c);
    const tick = wrap(t * 24, chapters.at(-1)!.end);
    const chapter = chapters.find(({ end }) => tick < end)!;
    const age = tick - chapter.start;
    return age < chapter.frames
      ? {
          ...fixed,
          anim: chapter.name,
          t: age / 24,
          start: chapter.start / 24,
          duration: c.animations[chapter.name].seconds,
        }
      : {
          ...fixed,
          anim: 'idle',
          t: (age - chapter.frames) / 24,
          start: (chapter.start + chapter.frames) / 24,
          duration: 6 / 24,
        };
  }
  if (!plan) return fixed;
  const dir =
    anim === 'walk'
      ? 'se'
      : anim.startsWith('walk_')
        ? (anim.slice(5) as Direction)
        : undefined;
  if (dir && directions.includes(dir)) {
    const v = directionVector(dir, plan.stride),
      s = heading(v, plan.yaw);
    return {
      ...fixed,
      anim: 'walk',
      t,
      side: s,
      headSide: s,
      feet: [origin[0] + (t - 0.5) * v[0], origin[1] + (t - 0.5) * v[1]],
      lift: plan.fly ? 4 + 3 * Math.sin(t * Math.PI * 2) : 0,
    };
  }
  if (anim !== 'life') return fixed;
  const beats = plan.beats,
    total = lifeDuration(plan);
  const local = wrap(t, total);
  let start = 0,
    i = 0;
  while (i < beats.length - 1 && local >= start + beats[i].seconds - 1e-9) {
    start += beats[i].seconds;
    i++;
  }
  const beat = beats[i],
    next = beats[(i + 1) % beats.length];
  const project = (a: XY): XY => [a[0] * w, a[1] * h];
  const a = project(beat.at),
    b = project(next.at);
  const move = (index: number) => ['walk', 'fly'].includes(beats[index].anim);
  const dirAt = (index: number) => {
    const here = beats[index],
      end = beats[(index + 1) % beats.length];
    return move(index)
      ? heading(
          [(end.at[0] - here.at[0]) * w, (end.at[1] - here.at[1]) * h],
          plan.yaw,
        )
      : (here.side ?? 0);
  };
  const age = Math.max(0, local - start),
    u = Math.min(1, age / beat.seconds);
  const prior = (i + beats.length - 1) % beats.length,
    following = (i + 1) % beats.length;
  const continuesIn = move(prior),
    continuesOut = move(following);
  const progress = (v: number) =>
    continuesIn
      ? continuesOut
        ? v
        : 1 - (1 - v) ** 2 * (1 + v)
      : continuesOut
        ? v * v * (2 - v)
        : ease(v);
  const speed = progress(u),
    s = dirAt(i);
  let feet = move(i) ? point(a, b, speed) : a;
  const flight = plan.fly ? mix(beat.lift ?? 4, next.lift ?? 4, speed) : 0;
  const duration = c.animations[beat.anim]?.seconds ?? beat.seconds;
  if (move(i)) {
    let direction = s,
      head = s;
    const distance = Math.hypot(b[0] - a[0], (b[1] - a[1]) / SE);
    // Keep the leg clock running across intermediate waypoints.
    let previousDistance = 0;
    for (let j = i - 1; j >= 0 && move(j); j--) {
      const x = project(beats[j].at),
        y = project(beats[j + 1].at);
      previousDistance += Math.hypot(y[0] - x[0], (y[1] - x[1]) / SE);
    }
    if (plan.fly) {
      const prev = continuesIn ? project(beats[prior].at) : a;
      const next2 = continuesOut
        ? project(beats[(i + 2) % beats.length].at)
        : b;
      const curve = (v: number): XY =>
        [0, 1].map(
          (k) =>
            0.5 *
            (2 * a[k] +
              (b[k] - prev[k]) * v +
              (2 * prev[k] - 5 * a[k] + 4 * b[k] - next2[k]) * v * v +
              (-prev[k] + 3 * a[k] - 3 * b[k] + next2[k]) * v * v * v),
        ) as XY;
      const tangent = (v: number) => {
        const e = 0.0001,
          x = curve(v - e),
          y = curve(v + e);
        return heading([y[0] - x[0], y[1] - x[1]], plan.yaw);
      };
      feet = curve(speed);
      direction = tangent(speed);
      head = tangent(progress(Math.min(1, u + 2 / (24 * beat.seconds))));
    }
    return {
      feet,
      side: direction,
      headSide: head,
      anim: 'walk',
      t: (previousDistance + distance * speed) / plan.stride,
      lift: flight,
      start,
      duration: 1,
      beat: i,
    };
  }
  // Turn in place during pauses: the head finds the new direction two frames first.
  const before = dirAt((i + beats.length - 1) % beats.length),
    after = dirAt((i + 1) % beats.length);
  const face = (dt: number) => {
    const age2 = Math.max(0, Math.min(beat.seconds, age + dt));
    if (beat.anim === 'turn')
      return turn(before, after, ease(age2 / beat.seconds));
    const blend = Math.min(0.32, beat.seconds * 0.25);
    if (age2 < blend) return turn(before, s, ease(age2 / blend));
    if (age2 > beat.seconds - blend)
      return turn(s, after, ease((age2 - beat.seconds + blend) / blend));
    return s;
  };
  return {
    feet,
    side: face(0),
    headSide: face(2 / 24),
    anim: beat.anim === 'turn' ? 'idle' : beat.anim,
    t: beat.anim === 'turn' ? 0 : u * duration,
    lift: flight,
    start,
    duration,
    beat: i,
  };
}

/** Apply the action's own ground trajectory after resolving a life beat or showreel chapter. */
export function placement(c: Creature, anim: string, t: number, side: number, origin: XY): Placement {
  const at = routePlacement(c, anim, t, side, origin);
  const delta = c.animations[at.anim]?.groundOffset?.(at.t, at.side);
  return delta ? { ...at, feet: [at.feet[0] + delta[0], at.feet[1] + delta[1]] } : at;
}
