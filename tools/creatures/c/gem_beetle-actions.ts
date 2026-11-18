import { clamp01, easeIn3, easeOut, hash, lerp, sstep } from '../kit/f11-mobkit';
import { keyPose, type KeyPose } from '../kit/f14-mobkit';
import { fillPoly, flare, fly } from '../fx/pen';
import type { Animation, FxInput, XY } from '../types';
import { fissure, grit, oval, ripple, shard, springBack, strokeTrail } from './strike-brush';
const normal = {
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
  glow: 0,
  wing: 0,
  ghost: 0,
};
export const animations: Record<string, Animation> = {
  tech_horn: { seconds: 1.6, hits: [0.9], shake: 0.15, stop: 0.04 },
  tech_prism: { seconds: 1.4, hits: [0.8], shake: 0.07 },
  happy: { seconds: 1.1 },
  tired: { seconds: 1.5 },
  hatch: { seconds: 1.5 },
};
const tracks: Record<string, KeyPose<typeof normal>[]> = {
  tech_horn: [
    [0, {}],
    [0.44, { dx: -7, coil: 0.41, head: 0.23, pitch: 0.07, wing: 0.13, lift: -2 }],
    [0.73, { dx: -9, coil: 0.61, head: 0.37, lift: -3, glow: 1, reach: -1.5 }],
    [
      0.9,
      { dx: 12, pitch: 0.24, head: 0.5, reach: 1.6, sx: 1.06, sy: 0.91, ghost: 0.38, glow: 1 },
      easeIn3,
    ],
    [1.01, { dx: 15, pitch: 0.27, head: 0.61, lift: -2, wing: 0.16 }],
    [1.25, { dx: 5, head: 0.11, roll: -0.04, glow: 0.31 }],
    [1.45, { dx: -2, pitch: -0.035 }],
    [1.58, {}],
  ],
  tech_prism: [
    [0, {}],
    [0.28, { wing: 0.39, coil: 0.25, pitch: 0.06 }],
    [0.49, { wing: 0.97, coil: 0.55, lift: -2, glow: 0.47 }],
    [0.75, { wing: 1.2, coil: 0.48, lift: -2, glow: 1, roll: -0.07 }],
    [0.8, { wing: 1.31, glow: 1, head: -0.13, sx: 1.04, sy: 0.96 }],
    [0.99, { wing: 1.12, glow: 0.65 }],
    [1.12, { wing: -0.14, pitch: 0.08, sx: 0.97, sy: 1.04 }, easeIn3],
    [1.23, { wing: 0.15, head: -0.1 }],
    [1.38, {}],
  ],
  happy: [
    [0, {}],
    [0.23, { wing: 0.17, coil: 0.41 }],
    [0.42, { wing: 0.92, head: -0.23, lift: 2 }],
    [0.58, { wing: 0.14, roll: 0.08 }],
    [0.74, { wing: 0.72, roll: -0.07, glow: 0.66 }],
    [1.06, {}],
  ],
  tired: [
    [0, {}],
    [0.54, { coil: 0.61, head: 0.41, lift: -3, sx: 1.04, sy: 0.93 }],
    [0.92, { coil: 0.88, head: 0.5, lift: -4, squint: 1, wing: 0.08 }],
    [1.46, {}],
  ],
  hatch: [
    [0, { coil: 1, head: 0.68, wing: -0.2, sx: 0.62, sy: 0.64, glow: 0 }],
    [0.38, { coil: 0.96, head: 0.48, sx: 0.78, sy: 0.8 }],
    [0.73, { coil: 0.36, wing: 0.85, head: 0.27, lift: 1 }],
    [1.02, { wing: -0.15, glow: 1, head: -0.32 }],
    [1.18, { wing: 0.12, head: -0.21, glow: 0.65 }],
    [1.48, {}],
  ],
};
export function pose(anim: string, t: number) {
  const p = tracks[anim] ? keyPose(t, tracks[anim], normal) : { ...normal };
  if (anim === 'tech_horn') p.wing += 0.52 * springBack(t - 0.91);
  if (anim === 'tech_prism') p.head += 0.2 * springBack(t - 1.11);
  return p;
}
function horn(f: FxInput) {
  const { t, feet, under, above, points } = f,
    age = t - 0.9;
  const gold = f.variant === 'gold',
    glint = gold ? '#ffe6a8' : '#d6fff1',
    light = gold ? '#e8bb6d' : '#76d5db',
    mid = gold ? '#a87540' : '#508598';
  if (t < 0.9) {
    for (let j = 0; j < 5; j++) {
      const k = sstep(0.17 + j * 0.083, 0.6 + j * 0.04, t);
      if (!k) continue;
      const x = feet[0] + 23 + j * 7,
        y = feet[1] + 6 + j * 0.72;
      shard(under, x, y, 4 + k, 2, 0.07, mid, light, k * 0.7);
    }
    if (t > 0.12 && t < 0.64)
      grit(under, points.foot[0] - 3, points.foot[1], (t - 0.12) % 0.32, 5, 232, '#97877f');
    if (t > 0.44) flare(above, ...points.horn, 1 + 6 * sstep(0.44, 0.8, t), light, 0.87);
  }
  if (t > 0.76 && t < 1.02) strokeTrail(f, 'horn', mid, glint, 3.4);
  if (age < 0) return;
  const source = f.pointAt(0.9, 'horn'),
    x = source[0],
    y = feet[1] + 9;
  flare(above, ...source, 13 * clamp01(1 - age / 0.15), glint, clamp01(1 - age / 0.18));
  fissure(under, 'split-gem', 63, x, y, age, 23, '#344f64', light, 0.78);
  for (let j = 0; j < 13; j++) {
    const r = hash(j, 80),
      a = hash(j, 61) * Math.PI * 2,
      q = fly(age, 31 + 39 * r, 290, 0.38);
    const xx = x + Math.cos(a) * (16 + 34 * r) * q.h,
      gy = y + Math.sin(a) * (16 + 18 * r) * q.h;
    const fade = clamp01((0.71 - age) / 0.23);
    oval(under, xx, gy, 2.2, 0.8, '#283745', 0.6 * fade);
    shard(above, xx, gy - q.z, 2.9 + 2.3 * r, 1.6 + r, a + age * 9, mid, light, fade);
    if (r > 0.68 && age < 0.28) above.lineS(xx, gy - q.z - 1, xx + 1, gy - q.z - 1, glint, fade);
  }
  if (age > 0.11) {
    const to = points.foot;
    under.lineS(x - 13, y, to[0], to[1], '#687582', clamp01((0.6 - age) / 0.2) * 0.78);
  }
}
function prism(f: FxInput) {
  const { t, above, under, points, feet } = f,
    age = t - 0.8;
  const rays = [
    ['#d2ffef', '#6ed2bc'],
    ['#dbf6ff', '#73afda'],
    ['#eadfff', '#aa8cc7'],
  ];
  const names = ['leftWing', 'rightWing', 'rightWing'];
  for (let j = 0; j < 3; j++) {
    const c = rays[j],
      to: XY = [feet[0] + 52 + j * 2, feet[1] - 26 + j * 19];
    const current = points[names[j]];
    if (age < 0) {
      const u = sstep(0.27 + j * 0.08, 0.78, t);
      if (!u) continue;
      const x = lerp(to[0], current[0], u),
        y = lerp(to[1], current[1], u);
      above.lineS(x - 4, y - 1, x + 2, y, c[0], 0.72 * u);
      flare(above, ...current, 1 + 2 * u, c[0], u);
      continue;
    }
    const source = f.pointAt(0.8, names[j]),
      u = sstep(-0.035, 0.08, age),
      cut = clamp01(1 - (age - 0.12) / 0.49);
    const xx = lerp(source[0], to[0], u),
      yy = lerp(source[1], to[1], u);
    if (age < 0.22) {
      above.col(c[1], clamp01(1 - age / 0.24));
      fillPoly(above, [source[0], source[1] - 2, xx, yy, source[0], source[1] + 2.4]);
      above.lineS(...source, xx, yy, c[0], clamp01(1 - age / 0.22));
      flare(above, xx, yy, 4, c[0], clamp01(1 - age / 0.27));
    }
    if (cut > 0) {
      const start: XY = [feet[0] + 10, feet[1] + 3];
      under.lineS(...start, lerp(start[0], to[0], cut), lerp(start[1], to[1], cut), c[1], 0.77 * cut);
      oval(under, to[0], to[1], 3.5, 1, c[0], cut * 0.6);
    }
  }
  if (t > 1.11) {
    const age = t - 1.11;
    const [x, y] = f.pointAt(1.11, 'rightWing');
    ripple(above, x, y, 3 + age * 43, 0.46, '#bfead8', clamp01(1 - age / 0.3));
  }
}
export function effects(f: FxInput) {
  if (f.anim === 'tech_horn') horn(f);
  if (f.anim === 'tech_prism') prism(f);
  if (f.anim === 'happy' && f.t > 0.39 && f.t < 0.89)
    flare(f.above, ...f.points.leftWing, 4 * Math.sin((Math.PI * (f.t - 0.39)) / 0.5), '#c5f6e8', 0.86);
  if (f.anim === 'hatch' && f.t > 0.79 && f.t < 1.36)
    flare(f.above, ...f.points.horn, 7 * Math.sin((Math.PI * (f.t - 0.79)) / 0.57), '#d6ffef', 0.82);
}
