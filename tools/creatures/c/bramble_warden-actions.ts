import { clamp01, easeIn3, easeOut, hash, lerp, lin, sstep } from '../kit/f11-mobkit';
import { keyPose, type KeyPose } from '../kit/f14-mobkit';
import { chunks, dust, fillPoly, fly } from '../fx/pen';
import type { Animation, FxInput, XY } from '../types';
import { fissure, oval, projectile, ripple, shard, springBack, strokeTrail } from './strike-brush';
const neutral = {
  dx: 0,
  dy: 0,
  sx: 1,
  sy: 1,
  pitch: 0,
  roll: 0,
  yaw: 0,
  lift: 0,
  head: 0,
  coil: 0,
  flare: 0,
  reach: 0,
  squint: 0,
  ghost: 0,
};
export const animations: Record<string, Animation> = {
  tech_ram: { seconds: 2, hits: [1.2], shake: 0.2, stop: 0.06 },
  tech_volley: { seconds: 1.6, hits: [0.55, 0.7, 0.85], shake: 0.08 },
  happy: { seconds: 1.1 },
  tired: { seconds: 1.5 },
  hatch: { seconds: 1.5 },
};
const tracks: Record<string, KeyPose<typeof neutral>[]> = {
  tech_ram: [
    [0, {}],
    [0.42, { dx: -6, pitch: 0.12, head: 0.48, squint: 0.7, flare: 0.93, lift: -1 }],
    [0.69, { dx: -10, coil: 1, head: 0.6, pitch: -0.24, flare: 1, sx: 0.9, sy: 1.04 }],
    [0.94, { dx: 5, coil: 1, pitch: 2.78, flare: 1, sx: 0.91, sy: 1.08, ghost: 0.2 }, lin],
    [1.2, { dx: 30, coil: 0.9, pitch: 6.38, head: 0.26, flare: 1, ghost: 0.32 }, lin],
    [1.3, { dx: 33, coil: 0.82, pitch: 6.49, head: 0.27, flare: 0.8 }],
    [1.53, { dx: 18, pitch: 6.07, coil: 0.38, flare: -0.23, head: -0.29 }],
    [1.79, { dx: 3, pitch: 6.34, head: 0.16, flare: 0.18 }],
    [1.98, { pitch: Math.PI * 2 }],
  ],
  tech_volley: [
    [0, {}],
    [0.34, { coil: 0.63, head: 0.13, flare: 1.44, lift: -3, sy: 0.93 }],
    [0.48, { coil: 0.39, flare: 1.62, pitch: -0.14 }],
    [0.55, { flare: 0.35, pitch: 0.13, head: -0.22 }, easeOut],
    [0.64, { coil: 0.51, flare: 1.25, pitch: -0.09 }],
    [0.7, { flare: 0.24, pitch: 0.12, head: -0.16 }, easeOut],
    [0.79, { coil: 0.54, flare: 1.19, pitch: -0.11 }],
    [0.85, { flare: -0.15, pitch: 0.17, head: -0.22 }, easeOut],
    [1.02, { flare: -0.27, head: 0.15, coil: 0.37 }],
    [1.24, { flare: 0.26, coil: 0.08 }],
    [1.56, {}],
  ],
  happy: [
    [0, {}],
    [0.26, { coil: 0.3, lift: -1.5, flare: -0.32 }],
    [0.47, { lift: 3, head: -0.37, roll: 0.1, flare: 1.14 }],
    [0.65, { roll: -0.11, flare: 0.26 }],
    [0.82, { roll: 0.08, flare: 0.59 }],
    [1.08, {}],
  ],
  tired: [
    [0, {}],
    [0.49, { head: 0.42, coil: 0.25, lift: -3, sy: 0.94, flare: -0.25 }],
    [0.91, { head: 0.52, coil: 0.55, lift: -4, squint: 1, sy: 0.9 }],
    [1.28, { head: 0.17, squint: 0.38 }],
    [1.48, {}],
  ],
  hatch: [
    [0, { coil: 1, sx: 0.61, sy: 0.59, squint: 1, head: 0.66, pitch: -0.74 }],
    [0.41, { coil: 1, sx: 0.77, sy: 0.73, squint: 1, head: 0.76, pitch: -0.52 }],
    [0.78, { coil: 0.52, sx: 0.91, sy: 1.05, head: -0.21, flare: 0.66, squint: 1 }],
    [1.06, { pitch: 0.08, head: 0.26, flare: 0.9, squint: 0.86 }],
    [1.24, { head: -0.09, flare: 0.26 }],
    [1.48, {}],
  ],
};
export function pose(anim: string, t: number) {
  const p = tracks[anim] ? keyPose(t, tracks[anim], neutral) : { ...neutral };
  if (anim === 'tech_ram') p.flare += springBack(t - 1.28) * 0.6;
  if (anim === 'tech_volley') p.head += 0.18 * springBack(t - 0.86);
  return p;
}
function leaves(f: FxInput, age: number, origin: XY, count: number) {
  if (age < 0 || age > 1.45) return;
  for (let i = 0; i < count; i++) {
    const q = age - 0.025 * (i % 5);
    if (q < 0) continue;
    const rand = hash(i, 11, 97),
      fall = fly(q, 41 + 29 * rand, 175, 0.22);
    const x = origin[0] - (20 + 41 * rand) * fall.h + 4 * Math.sin(q * 9 + i) * Math.min(1, q * 3);
    const floor = origin[1] + (hash(i, 19) - 0.45) * 18 * q,
      y = floor - fall.z;
    const a = q * (4 + 8 * rand) + i,
      fade = clamp01((1.45 - q) / 0.35);
    oval(f.under, x, floor, 2.6, 0.65, '#352c28', 0.55 * fade);
    shard(
      f.above,
      x,
      y,
      2.5 + 2 * rand,
      1 + 1.1 * Math.abs(Math.sin(a)),
      a * 0.58,
      '#534333',
      Math.cos(a) > 0.1 ? '#aa905e' : '#806d49',
      fade,
    );
  }
}
function ram(f: FxInput) {
  const { under, above, t, feet, points } = f,
    age = t - 1.2;
  if (t < 1.22) {
    const growth = sstep(0.1, 0.65, t);
    for (let i = -1; i <= 1; i++) {
      const o = feet[0] + 1,
        start = feet[1] + 5,
        dist = (49 - Math.abs(i) * 6) * growth;
      under.col('#39302f', 0.65);
      for (let j = 1; j <= 6; j++) {
        const last = (j - 1) / 6,
          u = j / 6;
        const y = (v: number) => start + 5 * i * v + Math.sin(i + v * 11) * 2 * v;
        under.line(o + last * dist, y(last), o + u * dist, y(u));
      }
    }
  }
  if (t > 0.7) {
    const u = clamp01((t - 0.7) / 0.5),
      x = feet[0] - 10 + 41 * u;
    under.lineS(feet[0] - 9, feet[1] + 7, x, feet[1] + 8, '#44312e', clamp01(1.7 - t));
    leaves(f, t - 0.75, [feet[0] + 3, feet[1] + 7], 6);
    if (t < 1.24) strokeTrail(f, 'spine', '#765c48', '#c2ab77', 3);
  }
  if (age < 0) return;
  const at = f.pointAt(1.2, 'snout'),
    x = at[0],
    y = Math.max(feet[1], at[1]);
  oval(under, x, y, 9, 3, '#3b292b', clamp01((0.85 - age) / 0.3));
  fissure(under, 'briar-furrow', 910, x, y, age, 24, '#42332e', '#a78b64', 0.85);
  chunks(above, 26, age, x, y, 14, 0, 2.8, 20, 48, 30, 48, [0.48, 0.8], 0.37, 1);
  for (let i = 0; i < 13; i++) {
    const v = hash(i, 518),
      q = age - 0.006 * i;
    if (q < 0) continue;
    const path = fly(q, 29 + 41 * v, 280, 0.12),
      xx = x + (hash(i, 158) - 0.4) * 83 * path.h,
      gy = y + (v - 0.4) * 25 * path.h;
    const settled = !path.air || q > 0.35,
      fade = clamp01((0.88 - q) / 0.29);
    oval(
      settled ? under : above,
      xx,
      settled ? gy : gy - path.z,
      settled ? 2.7 : 1.7,
      settled ? 1.25 : 1.5,
      '#62384f',
      fade,
    );
    if (!settled) above.lineS(xx - 1, gy - path.z - 1, xx, gy - path.z - 1, '#b06b7c', fade);
  }
  leaves(f, age, [x, y], 8);
}
function volley(f: FxInput) {
  for (const [wave, hit] of animations.tech_volley.hits!.entries()) {
    const release = hit - 0.17,
      age = f.t - hit;
    if (f.t < release - 0.26 || age > 0.78) continue;
    for (let j = -1; j <= 1; j++) {
      const target: XY = [f.feet[0] + 31 + wave * 10 + j * 4, f.feet[1] + j * 13 + wave * 3];
      if (f.t < release) {
        const u = sstep(release - 0.24, release, f.t);
        f.under.lineS(target[0] - 6 * u, target[1] - 2 * j, target[0], target[1], '#9b8863', 0.5 * u);
        continue;
      }
      if (age < 0) {
        const src = f.pointAt(release, 'spine'),
          u = clamp01((f.t - release) / 0.17);
        const p = projectile(src, target, u, 5 + 2 * wave),
          delayed = projectile(src, target, Math.max(0, u - 0.14), 5 + 2 * wave);
        const angle = Math.atan2(p[1] - delayed[1], p[0] - delayed[0]);
        f.above.lineS(...delayed, ...p, '#b49976', 0.67);
        shard(f.above, ...p, 4, 1.6, angle, '#665142', '#dfc8a2');
      } else if (age < 0.5) {
        const a = -2.02 + springBack(age, 28) * 0.68;
        shard(f.above, target[0], target[1] - 2, 7, 1.5, a, '#6b534a', '#e0c598');
        f.under.lineS(target[0] - 2, target[1] + 1, target[0] + 3, target[1], '#493a34', 0.78);
        ripple(f.under, ...target, 2 + age * 14, 0.41, '#bda07c', clamp01(1 - age * 4));
      } else
        chunks(
          f.above,
          wave * 10 + j + 420,
          age - 0.5,
          ...target,
          3,
          0,
          3,
          7,
          9,
          13,
          22,
          [0.09, 0.25],
          0.1,
          1,
        );
    }
  }
}
export function effects(f: FxInput) {
  if (f.anim === 'tech_ram') ram(f);
  if (f.anim === 'tech_volley') volley(f);
  if (f.anim === 'happy') leaves(f, f.t - 0.41, [f.points.spine[0], f.feet[1] - 3], 5);
  if (f.anim === 'hatch' && f.t > 0.64)
    dust(f.under, 34, f.t - 0.64, ...f.feet, 5, 0, 3, 8, 12, 1, 3, 5, 0.52, 6, 0.66);
}
