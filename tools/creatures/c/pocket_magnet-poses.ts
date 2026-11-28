import { everyday } from '../rig/figure';
import { F3, proj, vadd, vlerp, vmul, type V3 } from '../rig/f15-rig';
import { keyframer, type Track } from '../kit/pet-moves';
import { arc, clamp, ease, windowAt } from './painted-toys';
import type { Animation, XY } from '../types';

export const home: XY = [79, 94];
export const yaw = 2;
const asleep = { low: 1, lids: 1, nod: 0.38, rest: 1, ears: -0.48 };
const tracks: Record<string, Track> = {
  look: [
    [0, {}],
    [9, { head: 0.48, ears: 0.32 }],
    [15, { head: 0.5, ears: 0.28 }],
    [26, { head: -0.5, nod: -0.17 }],
    [29, { head: -0.5, nod: -0.17 }],
    [35, {}],
  ],
  prepare_walk: [
    [0, {}],
    [9, { low: 0.36 }],
    [16, { paw: 0.25, step: 0.75 }],
    [24, { step: 0.16 }],
    [31, {}],
  ],
  fidget_a: [
    [0, {}],
    [9, { head: -0.1, rub: 0.4 }],
    [17, { head: -0.22, nod: 0.22, rub: 1, lids: 0.82 }],
    [23, { head: -0.22, nod: 0.22, rub: 0.79, lids: 0.82 }],
    [30, { head: -0.22, nod: 0.2, rub: 1, lids: 0.94 }],
    [38, { head: -0.2, nod: 0.16, rub: 0.83, lids: 0.75 }],
    [45, { head: -0.18, nod: 0.17, rub: 1, lids: 0.86 }],
    [59, {}],
  ],
  fidget_b: [
    [0, {}],
    [9, { ears: 0.5 }],
    [20, { head: -0.73, ears: 0.83, wag: 1 }],
    [29, { head: -0.82, ears: 0.82, wag: 0.61 }],
    [38, { head: -0.65, ears: 0.46, wag: 1.13 }],
    [47, { head: -0.68, ears: 0.26, wag: 0.8 }],
    [61, {}],
  ],
  happy: [
    [0, {}],
    [7, { low: 0.83, ears: -0.45 }],
    [12, { ears: 0.7, open: 0.95, paw: 0.7 }],
    [22, { ears: 0.55, open: 0.85, paw: 0.6 }],
    [27, { low: 0.7, ears: -0.4 }],
    [34, { ears: 0.45, open: 0.37 }],
    [45, {}],
  ],
  tired: [
    [0, {}],
    [9, { lids: 0.48, low: 0.25 }],
    [19, { nod: -0.32, open: 1, lids: 0.79, low: 0.34 }],
    [27, { nod: -0.25, open: 0.85, lids: 0.88, low: 0.38 }],
    [35, {}],
  ],
  sleep_in: [
    [0, {}],
    [9, { low: 0.25, lids: 0.46 }],
    [17, { low: 0.61, nod: 0.23, lids: 0.86, rest: 0.48, ears: -0.3 }],
    [28, asleep],
    [33, asleep],
  ],
  sleep_out: [
    [0, asleep],
    [7, asleep],
    [16, { low: 0.72, lids: 0.28, rest: 0.74, ears: 0.25, nod: 0.21 }],
    [25, { low: 0.17, nod: -0.23, ears: 0.42 }],
    [35, {}],
  ],
  wake_startled: [
    [0, asleep],
    [5, asleep],
    [10, { low: 0.08, ears: 0.95, nod: -0.28, open: 0.63, paw: 0.6 }],
    [16, { low: 0.25, ears: 0.54 }],
    [27, {}],
  ],
  hatch: [
    [0, {}],
    [7, { low: 0.89, lids: 0.42, ears: -0.4 }],
    [14, { ears: 0.92, open: 0.84, paw: 0.85 }],
    [23, { ears: 0.42, paw: 0.45 }],
    [27, { low: 0.73, ears: -0.32 }],
    [36, { head: 0.46, ears: 0.73 }],
    [43, { head: 0.39, ears: 0.4 }],
    [53, {}],
  ],
};
const gestures = keyframer({ tracks, fixed: { sleep: asleep } });
export const fishTab: XY = [121, 96];
export const hook: XY = [29, 24],
  cord = 28;
export const fishStop = 144;
export function fishAt(n: number) {
  const lift = windowAt(n, 52, 79, 98, 126);
  const swing = n < 69 ? 0 : Math.sin((n - 69) * 0.24) * Math.exp(-(n - 69) * 0.08) * 0.25 * lift;
  const angle = (lift * Math.PI) / 2 + swing;
  const feed = (fishStop - 21 - fishTab[0]) * windowAt(n, 125, 131, 138, 146);
  const x = fishTab[0] + 4.6 * lift + feed;
  // The far tail first pivots against the felt. It clears the lip before it swings free.
  const y = fishTab[1] - 21.5 * Math.sin((lift * Math.PI) / 2) - 15.5 * lift;
  return { tab: [x, y] as XY, angle, lift };
}
const release = 76,
  catchFrame = 111,
  amplitude = 0.55,
  period = 42;
function cordAngle(n: number) {
  let a = amplitude * ease(48, 70, n);
  if (n > release && n < catchFrame) a = amplitude * Math.cos(((n - release) * 2 * Math.PI) / period);
  if (n >= catchFrame) {
    const phase = ((catchFrame - release) * 2 * Math.PI) / period;
    const angle = amplitude * Math.cos(phase),
      velocity = (-amplitude * Math.sin(phase) * 2 * Math.PI) / period;
    const u = clamp((n - catchFrame) / 9);
    a = (angle + velocity * 9 * (u - (u * u) / 2)) * (1 - ease(120, 144, n));
  }
  return a;
}
export function starAt(n: number) {
  const a = cordAngle(n),
    tilt = 0.7 * a + 0.3 * cordAngle(n - 3);
  const ring: XY = [hook[0] + cord * Math.sin(a), hook[1] + cord * Math.cos(a)];
  const sin = Math.sin(tilt),
    cos = Math.cos(tilt);
  const center: XY = [ring[0] + 10 * sin, ring[1] + 10 * cos];
  const contact: XY = [center[0] + 6.5 * cos - 0.9 * sin, center[1] - 6.5 * sin - 0.9 * cos];
  return { a, tilt, ring, center, contact };
}
export const starStep = (n: number) => windowAt(n, 48, 71, 116, 144);
export const pullDistance = 16;
export function pose(anim: string, t: number) {
  const n = t * 24,
    p = { ...gestures(anim, t) };
  let x = 0,
    y = 0,
    bearing = yaw,
    alt = 0,
    progress = 0;
  if (anim === 'idle' || anim === 'sleep') {
    const breath = Math.sin((n * 2 * Math.PI) / 72);
    p.breath = (anim === 'idle' ? 0.65 : 0.31) * breath;
    if (anim === 'idle') {
      p.wag = 0.1 * breath;
      p.lids = windowAt(n, 38, 41, 42, 46);
    }
  }
  if (anim === 'happy') alt = arc(n, 8, 26, 13);
  if (anim === 'hatch') alt = arc(n, 8, 26, 15);
  if (anim === 'trick' || anim === 'trick_b') {
    const fish = anim === 'trick';
    progress = fish ? windowAt(n, 7, 33, 137, 162) : windowAt(n, 6, 32, 148, 174);
    x = progress * (fish ? 9 : -3) + (fish ? 0 : pullDistance * starStep(n));
    y = progress * (fish ? 2 : 1);
    bearing += progress * (fish ? -0.1 : 0.02);
    if (fish) {
      const look = windowAt(n, 3, 29, 136, 158),
        bent = windowAt(n, 28, 44, 55, 76) + windowAt(n, 99, 119, 129, 143);
      p.head = -1.1 * look;
      p.low = 0.74 * bent + 0.15 * look;
      p.nod = 0.57 * bent + 0.14 * look - 0.23 * windowAt(n, 66, 77, 94, 109);
      p.ears = 0.52 * windowAt(n, 56, 70, 98, 115);
      p.open = 0.36 * windowAt(n, 73, 80, 92, 102);
      p.paw = 0.38 * windowAt(n, 57, 78, 94, 110);
    } else {
      const look = windowAt(n, 2, 26, 145, 170);
      p.head = 0.61 * look;
      p.low =
        0.32 * windowAt(n, 30, 44, 65, 76) +
        0.89 * windowAt(n, 78, 89, 102, 115) +
        0.45 * windowAt(n, 107, 115, 122, 136);
      p.nod = 0.27 * windowAt(n, 79, 89, 101, 116) - 0.16 * look;
      p.ears = 0.6 * windowAt(n, 76, 82, 107, 118);
      p.paw = 0.32 * windowAt(n, 106, 111, 119, 133);
    }
  }
  return { n, p, x, y, bearing, alt, progress };
}

export function frames(anim: string, t: number, side: number, gait?: number) {
  const q = pose(anim, t),
    { p, n } = q;
  const stand = anim === 'turn' && Number.isInteger(side) ? (4 * t) % 1 : 0;
  const f = F3.yaw(q.bearing + ((side + stand) * Math.PI) / 8);
  const trot = gait === undefined ? 0 : Math.sin(2 * Math.PI * gait);
  const bob = 0.65 * Math.abs(trot) + 0.5 * Math.sin(Math.PI * q.progress) ** 2;
  const b = f
    .at(0, 0.9 * trot, 25 - (p.low ?? 0) * 6.5 - (p.rest ?? 0) * 4.6 + (p.breath ?? 0) + bob)
    .roll(0.044 * trot);
  const h = b
    .at(1.4, 0, 31.5 - 2.7 * (p.low ?? 0) - 1.35 * (p.rest ?? 0))
    .turn(p.head ?? 0)
    .pitch(-0.32 + (p.nod ?? 0));
  return { ...q, f, b, h, trot };
}
type Stage = ReturnType<typeof frames>;
// One pole is the load-bearing socket in both numbers. The same rigid U is rotated
// about this point, so it cannot stretch between the tail and the piece of metal.
export function magnetFrame(anim: string, q: Stage) {
  const { n, p, b, f } = q;
  const bearing = Math.atan2(f.f[1], f.f[0]) - yaw;
  const tip = f.p(
    -25 - 2.3 * (p.wag ?? 0),
    -23.5 + 3 * (p.wag ?? 0),
    43 + 5.6 * (p.wag ?? 0) - 35 * (p.rest ?? 0),
  );
  tip[1] += 9 * (p.rest ?? 0);
  const localRight: V3 = [Math.cos(bearing), Math.sin(bearing), 0];
  const localUp: V3 = [0.6 * Math.sin(bearing), -0.6 * Math.cos(bearing), 0.8];
  const localNormal: V3 = [-0.8 * Math.sin(bearing), 0.8 * Math.cos(bearing), 0.6];
  let grip = 0,
    angle = 0.075 + 0.37 * (p.wag ?? 0) + 0.14 * (p.rest ?? 0),
    target: XY = [0, 0];
  if (anim === 'trick') {
    grip = windowAt(n, 22, 44, 136, 153);
    angle += (Math.PI - 0.075) * windowAt(n, 20, 43, 137, 155);
    target = fishAt(n).tab;
    const peel = windowAt(n, 131, 138, 141, 152);
    target = [target[0] + 7 * peel, target[1] - 4 * peel];
  } else if (anim === 'trick_b') {
    grip = windowAt(n, 17, 43, 148, 167);
    angle += (-Math.PI / 2 - 0.075) * windowAt(n, 16, 43, 146, 168);
    target = starAt(n).contact;
    if (n > release && n < catchFrame) {
      const from = starAt(release).contact,
        to = starAt(catchFrame).contact;
      const move = ease(90, catchFrame, n),
        back = windowAt(n, release, 82, 97, catchFrame);
      target = [from[0] + (to[0] - from[0]) * move - 3 * back, from[1] + (to[1] - from[1]) * move + 18 * back];
    }
    target = [
      target[0] + 5 * windowAt(n, 144, 150, 151, 165),
      target[1] + 14 * windowAt(n, 20, 29, 34, 43) - 3 * windowAt(n, 144, 150, 151, 165),
    ];
  }
  const right = vlerp(localRight, [1, 0, 0], grip),
    up = vlerp(localUp, [0, -0.6, 0.8], grip),
    normal = vlerp(localNormal, [0, 0.8, 0.6], grip);
  const across = vadd(vmul(right, Math.cos(angle)), vmul(up, -Math.sin(angle)));
  const open = vadd(vmul(right, Math.sin(angle)), vmul(up, Math.cos(angle)));
  const relative = (x: number, z: number, d = 0) => vadd(vadd(vmul(across, x), vmul(open, z)), vmul(normal, d));
  const desiredDepth = -7;
  const worldTip: V3 = [
    target[0] - home[0] - q.x,
    desiredDepth,
    (home[1] + q.y - q.alt + 0.6 * desiredDepth - target[1]) / 0.8,
  ];
  const restingPole = vadd(tip, relative(5.9, 4.5));
  // The magnet passes behind the hips when changing sides. Shift along the camera ray:
  // its visible arc is unchanged, while its steel and the tail stay outside the body.
  const around = anim === 'trick_b' ? 32 * Math.sin(Math.PI * grip) ** 2 : 0;
  const pole = vadd(vlerp(restingPole, worldTip, grip), [0, -0.8 * around, -0.6 * around]);
  const at = (x: number, z: number, d = 0) => vadd(pole, relative(x - 5.9, z - 4.5, d));
  const flank = -1 + (anim === 'trick_b' ? 2 * q.progress : 0);
  const root = b.p(-14.5, 0, -4.3),
    join = at(0, -7.3);
  const bend = anim === 'trick_b' ? grip : 0;
  const elbow = vadd(root, f.v(-12 + 5 * bend, flank * (13 + 10 * bend), 1.4 + 3.4 * grip));
  // For the pendulum the curl rises beside the hip. The shank stays visible below the silver poles.
  const lowCurl = anim === 'trick_b' ? grip : 0;
  const wrist = vadd(vadd(join, vmul(open, -12 + 8 * lowCurl)), [0, 0, -13 * lowCurl]);
  if ((p.rest ?? 0) > 0) wrist[2] = Math.max(2.5, wrist[2]);
  return { at, pole, root, elbow, wrist, join };
}
export function projectedPole(anim: string, t: number): XY {
  const q = frames(anim, t, 0),
    v = magnetFrame(anim, q).pole;
  const [x, y] = proj(v, home[0] + q.x, home[1] + q.y - q.alt);
  return [x, y];
}
const clip = (frames: number): Animation => ({ seconds: frames / 24 });
const moving = (name: string, frames: number): Animation => ({
  ...clip(frames),
  groundOffset(t) {
    const q = pose(name, t);
    return [q.x, q.y];
  },
});
export const clips = {
  ...everyday,
  look: clip(36),
  prepare_walk: clip(32),
  fidget_a: clip(60),
  fidget_b: clip(62),
  happy: clip(46),
  hatch: clip(54),
  sleep_in: clip(34),
  sleep_out: clip(36),
  wake_startled: clip(28),
  trick: moving('trick', 166),
  trick_b: moving('trick_b', 178),
};
