import { reach } from '../bodies/goals';
import type { V3 } from '../rig/f15-rig';
import type { JointPose } from '../technique';

const tau = 2 * Math.PI;
type Ball = 'scope' | 'sabre' | 'map';
type Toss = {
  ball: Ball;
  from: number;
  to: number;
  release: number;
  catch: number;
  crest: number;
  side: number;
  spin: number;
};
// Three hands exchange the same three tools, then pass them back on a lower beat.
export const tosses: Toss[] = [
  { ball: 'scope', from: 1, to: 0, release: 10, catch: 39, crest: 89, side: -11, spin: 0.75 },
  { ball: 'sabre', from: 0, to: 2, release: 16, catch: 45, crest: 96, side: 18, spin: -0.64 },
  { ball: 'map', from: 2, to: 1, release: 22, catch: 51, crest: 93, side: -27, spin: 0.7 },
  { ball: 'scope', from: 0, to: 1, release: 44, catch: 68, crest: 68, side: 15, spin: -0.65 },
  { ball: 'sabre', from: 2, to: 0, release: 52, catch: 72, crest: 78, side: 22, spin: 0.45 },
  { ball: 'map', from: 1, to: 2, release: 58, catch: 76, crest: 68, side: -23, spin: -0.7 },
];
const stations: V3[] = [
  [21, -20, 39],
  [-12, 21, 39],
  [22, 16, 29],
];
const rest: V3[] = [
  [18, -20, 33],
  [-9, 21, 34],
  [21, 19, 16],
];
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => {
  v = clamp(v);
  return v * v * (3 - 2 * v);
};
function blend(a: V3, b: V3, u: number): V3 {
  return a.map((v, i) => v + (b[i] - v) * u) as V3;
}
function pulse(frame: number, at: number, radius: number) {
  return ease(1 - Math.abs(frame - at) / radius);
}
function arc(from: V3, to: V3, u: number, crest: number, side: number): V3 {
  const position = blend(from, to, u),
    rise = 4 * u * (1 - u);
  position[0] += side * 0.48 * rise;
  position[1] -= side * 0.52 * rise;
  position[2] += (crest - (from[2] + to[2]) / 2) * rise;
  return position;
}
export function jugglePose(n: number): JointPose {
  if (n <= 0 || n >= 89) return {};
  const active = ease(n / 10) * (1 - ease((n - 76) / 7)),
    beat = (1 - Math.cos((tau * (n - 8)) / 13)) * 0.5;
  const bow = pulse(n, 77, 6),
    salute = ease((n - 80) / 3) * (1 - ease((n - 86) / 3));
  const squat = active * (1 + beat * 8 + 11 * pulse(n, 39, 20)) + bow * 7;
  const p: JointPose = {
    crouch: squat,
    roll: 0.16 * active * Math.sin((tau * n) / 18),
    pitch: bow * 0.43,
    'head.pitch': bow * 0.4 - 0.19 * active,
    'head.yaw': 0.26 * active * Math.sin((tau * (n - 6)) / 31),
    spread: 0.65 * active,
    salute,
    mapOpen: 0.35 * active,
  };
  const wrists: V3[] = [];
  for (let i = 0; i < 3; i++) {
    const a = blend(rest[i], stations[i], active);
    for (const toss of tosses) {
      if (toss.from === i) a[2] -= 7 * pulse(n, toss.release - 4, 4);
      if (toss.to === i) a[2] -= 6 * pulse(n, toss.catch + 2, 2);
    }
    wrists.push(a);
    if (salute && i === 1) {
      Object.assign(p, reach('arm1', blend(rest[1], [6, 20, 48], salute)));
      p.salute = 0;
      p.scopeYaw = -0.45 * salute;
      continue;
    }
    Object.assign(p, reach('arm' + i, a));
  }
  for (const ball of ['scope', 'sabre', 'map'] as const) {
    for (const toss of tosses.filter((t) => t.ball === ball)) {
      if (n < toss.release) break;
      p[ball + 'Hand'] = toss.to + 1;
      if (n > toss.catch) continue;
      const u = clamp((n - toss.release) / (toss.catch - toss.release)),
        position = arc(stations[toss.from], stations[toss.to], u, toss.crest, toss.side);
      if (ball === 'scope' && toss.from === 1) {
        const forward = 12 * 4 * u * (1 - u);
        position[0] += forward;
        position[1] += forward * 0.9;
        position[2] += forward * 1.1;
      }
      p[ball + 'Loose'] = 1;
      p[ball + 'Roll'] = toss.spin * Math.sin(tau * u);
      const onRelease = blend(wrists[toss.from], position, ease(u * 10));
      const onCatch = blend(wrists[toss.to], onRelease, ease((1 - u) * 10));
      Object.assign(p, reach(ball + 'Free', onCatch));
      break;
    }
  }
  // Reach the front brim, lift it clear of the dome, then let it turn once.
  const grab = ease((n - 7) / 9),
    drop = 1 - ease((n - 23) / 8);
  p.hatPickup = grab * drop;
  p.hatHand = ease((n - 14) / 4) * drop;
  const arm = blend([34, -12, 20], [18, -5, 56], grab * drop);
  arm[2] += 3 * pulse(n, 22, 4);
  if (n < 32) Object.assign(p, reach('arm7', arm));
  if (n >= 23 && n <= 65) {
    const u = (n - 23) / 42;
    const v = arc([2, 1, 53], [-1, 0, 51.7], u, 106, 2);
    v[2] -= 10 * pulse(n, 51, 12);
    p.hatLoose = Math.min(1, (n - 23) / 2, (65 - n) / 3);
    p.hatRoll = tau * u;
    Object.assign(p, reach('hatFree', v));
  }
  return p;
}
