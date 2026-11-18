import { clamp01, easeIn3, easeOut, hash, lerp, sstep, TAU } from '../kit/f11-mobkit';
import { keyPose, type KeyPose } from '../kit/f14-mobkit';
import { fillPoly, flare, fly, type Pen } from '../fx/pen';
import type { Animation, FxInput, XY } from '../types';
import { grit, oval, projectile, ripple, shard, springBack, strokeTrail } from './strike-brush';

const normal = {
  dx: 0,
  dy: 0,
  sx: 1,
  sy: 1,
  rot: 0,
  flash: 0,
  trail: 0,
  jaw: 0,
  neck: 0,
  tail: 0,
  wings: 0,
  chest: 0,
  lid: 0,
  claw: 0,
  phase: 0,
  twist: 0,
  glance: 0,
};
export const animations: Record<string, Animation> = {
  tech_breath: { seconds: 1.8, hits: [1], shake: 0.13 },
  tech_tail: { seconds: 1.1, hits: [0.6], shake: 0.19, stop: 0.035 },
  tech_chest: { seconds: 1.6, hits: [0.95], shake: 0.16, stop: 0.04 },
  tech_claw: { seconds: 0.9, hits: [0.5], shake: 0.18 },
  tech_rain: { seconds: 2.2, hits: [32 / 24, 37 / 24, 42 / 24], shake: 0.09 },
  tech_dive: { seconds: 2, hits: [20 / 24, 34 / 24], shake: 0.17 },
  happy: { seconds: 1.1 },
  tired: { seconds: 1.5 },
  hatch: { seconds: 1.5 },
  phase: { seconds: 2 },
  show: { seconds: 5, hits: [2.48], shake: 0.2 },
  away: { seconds: 1.5 },
  back: { seconds: 1.5 },
  peek: { seconds: 1.8 },
};
const tracks: Record<string, KeyPose<typeof normal>[]> = {
  tech_breath: [
    [0, {}],
    [0.38, { neck: -0.62, tail: 0.36, chest: 0.2, wings: 0.4 }],
    [0.64, { neck: -0.9, tail: 0.65, wings: 0.77, sx: 1.045, sy: 1.035, jaw: 0.28 }],
    [0.86, { neck: 0.12, jaw: 0.77, wings: 0.66, tail: 0.54 }],
    [1, { neck: 1.25, jaw: 1.1, wings: 0.34, dx: 5, sy: 0.97 }, easeOut],
    [1.21, { neck: 0.97, jaw: 0.92, wings: 0.3, dx: 3 }],
    [1.49, { neck: 0.44, jaw: 0.4 }],
    [1.77, {}],
  ],
  tech_tail: [
    [0, {}],
    [0.22, { tail: 0.68, twist: -0.62, neck: -0.2 }],
    [0.43, { tail: 1.43, twist: -0.96, wings: 0.35 }],
    [0.6, { tail: -1.64, twist: 0.82, trail: 0.69, rot: -0.035 }, easeIn3],
    [0.7, { tail: -1.14, twist: 1.01, wings: 0.22 }],
    [0.86, { tail: 0.29, twist: 0.22 }],
    [1.075, {}],
  ],
  tech_chest: [
    [0, {}],
    [0.38, { chest: 0.43, lid: 0.17, claw: 0.13, neck: -0.16 }],
    [0.66, { chest: 0.97, lid: 1.09, claw: 0.25, neck: -0.34, wings: 0.28 }],
    [0.88, { chest: 1.1, lid: 1.2, glance: 0.45 }],
    [0.95, { chest: 0.82, lid: 0, claw: -0.07, sy: 0.96, jaw: 0.24 }, easeIn3],
    [1.12, { chest: 0.61, lid: 0.17, twist: 0.26 }],
    [1.35, { chest: 0.25, lid: 0 }],
    [1.58, {}],
  ],
  tech_claw: [
    [0, {}],
    [0.17, { chest: 0.16, claw: 0.52, twist: -0.35 }],
    [0.35, { claw: 1.39, chest: 0.25, twist: -1.12, tail: 0.35 }],
    [0.5, { claw: -0.79, chest: -0.04, twist: 1.03, trail: 1 }, easeIn3],
    [0.62, { claw: -0.84, twist: 0.74, wings: 0.22 }],
    [0.75, { claw: 0.21, twist: 0.24 }],
    [0.88, {}],
  ],
  tech_rain: [
    [0, {}],
    [0.35, { chest: 0.38, lid: 0.86, claw: -0.31, neck: -0.44 }],
    [0.63, { claw: -0.57, lid: 1.0, twist: -0.71, chest: 0.6 }],
    [0.86, { claw: 1.36, chest: 0.93, lid: 0.55, twist: 0.72, wings: 0.54 }, easeOut],
    [1.08, { claw: 1.18, chest: 0.68, neck: 0.37, glance: 0.65 }],
    [1.42, { chest: 0.31, claw: 0.29, neck: 0.45 }],
    [1.78, { neck: 0.31, glance: 0.4 }],
    [2.16, {}],
  ],
  tech_dive: [
    [0, {}],
    [0.43, { neck: -0.52, tail: 0.92, wings: 0.88, sy: 0.91, dx: -5 }],
    [0.65, { neck: 1.12, tail: 1.2, wings: 0.67, dx: 17, dy: 3, rot: 0.14 }],
    [20 / 24, { neck: 1.25, wings: -0.8, dx: 37, dy: 19, sx: 0.72, sy: 0.36, rot: 0.22 }, easeIn3],
    [0.97, { sx: 0, sy: 0, dx: 45, dy: 18 }],
    [1.3, { sx: 0, sy: 0, dx: -40, dy: 13 }],
    [34 / 24, { sx: 0.68, sy: 0.54, dx: -36, dy: -3, wings: -0.4, neck: 1, jaw: 0.38 }, easeOut],
    [1.56, { sx: 1.05, sy: 1.08, dx: -29, dy: -7, wings: 0.95, tail: 0.69, glance: -0.52 }],
    [1.75, { dx: -14, dy: 0, wings: 0.3, sy: 0.96, tail: 0.4 }],
    [1.97, {}],
  ],
  happy: [
    [0, {}],
    [0.2, { lid: 0.53, claw: -0.22 }],
    [0.42, { claw: 0.77, lid: 0.22, neck: 0.32 }],
    [0.69, { neck: 0.67, jaw: 0.45, glance: 0.54 }],
    [0.85, { claw: 0.27, jaw: 0, neck: 0.09 }],
    [1.08, {}],
  ],
  tired: [
    [0, {}],
    [0.57, { wings: -0.83, neck: -0.71, chest: 0.4, sy: 0.95, rot: 0.04 }],
    [0.97, { wings: -1.12, neck: -0.97, chest: 0.49, glance: -0.43, sy: 0.91 }],
    [1.46, {}],
  ],
  hatch: [
    [0, { sx: 0.54, sy: 0.39, wings: -1, neck: -1, tail: 1, chest: 0.74 }],
    [0.46, { sx: 0.72, sy: 0.61, wings: -0.81, neck: -0.66, tail: 0.77, jaw: 0.21 }],
    [0.81, { sx: 0.94, sy: 1.02, neck: 0.61, jaw: 0.91, wings: 0.66, tail: 0.43 }],
    [1.1, { neck: 0.75, jaw: 0.26, sy: 1.04, wings: 0.28 }],
    [1.47, {}],
  ],
  phase: [
    [0, {}],
    [0.33, { neck: 0.44, wings: 0.16, phase: 0.03 }],
    [0.82, { neck: 0.94, wings: 0.62, tail: -0.25, phase: 0.38, glance: 0.46 }],
    [1.28, { neck: 0.46, wings: 1, tail: 0.8, phase: 0.71, chest: 0.27 }],
    [1.7, { phase: 0.98, wings: 0.32, tail: 1 }],
    [1.98, { phase: 1 }],
  ],
  show: [
    [0, { sx: 0, sy: 0 }],
    [2.12, { sx: 0, sy: 0 }],
    [2.33, { sx: 0.39, sy: 0.54, neck: 0.67, tail: 0.6, wings: -0.74, dy: 3 }],
    [
      2.48,
      { sx: 1.04, sy: 1.08, dy: -10, neck: 1, wings: 0.93, tail: 0.68, jaw: 0.53, flash: 0.2 },
      easeOut,
    ],
    [2.79, { sx: 1.02, sy: 0.94, neck: 0.66, wings: 0.56, chest: 0.28 }],
    [3.29, { wings: 0.35, tail: 0.54, neck: 0.55, lid: 0.64 }],
    [3.84, { neck: 0.62, jaw: 0.64, wings: 0.37 }],
    [4.28, { neck: 0.34, jaw: 0.12 }],
    [5, { neck: 0.34, jaw: 0.12 }],
  ],
  peek: [
    [0, {}],
    [0.44, { dy: 34, neck: 0.47, glance: 0.33, claw: 0.18 }],
    [0.83, { dy: 108, neck: 0.63, glance: 0.58, jaw: 0.85, claw: 0.32 }],
    [1.04, { dy: 114, neck: 0.72, jaw: 0.04, claw: 0.21 }],
    [1.28, { dy: 92, neck: 0.51, jaw: 0.35 }],
    [1.77, {}],
  ],
};
export function pose(anim: string, t: number) {
  if (anim === 'away' || anim === 'back') {
    const k = anim === 'away' ? sstep(0.07, 1.38, t) : 1 - sstep(0.04, 1.39, t);
    return {
      ...normal,
      dx: 225 * k,
      tail: Math.sin(k * Math.PI) * 0.65,
      neck: 0.48 * Math.sin(k * Math.PI),
      twist: 0.68 * Math.sin(k * Math.PI),
    };
  }
  const p = tracks[anim] ? keyPose(t, tracks[anim], normal) : { ...normal };
  if (anim === 'tech_tail') p.wings += 0.4 * springBack(t - 0.6);
  if (anim === 'tech_claw') p.tail += 0.64 * springBack(t - 0.51);
  if (anim === 'tech_chest') p.lid += 0.26 * springBack(t - 0.96);
  return p;
}
// Face, milled rim, coin stamp and cold edge, all on the native pixel grid.
function coin(
  p: Pen,
  x: number,
  y: number,
  r: number,
  angle: number,
  flat = 0,
  opacity = 1,
  silver = false,
) {
  const rim = silver ? '#55656c' : '#775033',
    body = silver ? '#989e9b' : '#cf9c4c',
    face = silver ? '#d4d9ca' : '#f6d17f';
  const rx = r * (0.22 + 0.78 * Math.abs(Math.cos(angle))),
    ry = r * lerp(1, 0.31, flat);
  oval(p, x + 1, y + 1, rx, ry, rim, opacity);
  oval(p, x, y, rx, ry, body, opacity);
  if (rx > 1.1) {
    p.lineS(x - rx * 0.55, y - ry * 0.68, x + rx * 0.39, y - ry * 0.72, face, opacity);
  }
  if (rx > 2 && ry > 1.6) {
    p.lineS(x - rx * 0.22, y + ry * 0.31, x + rx * 0.22, y - ry * 0.29, rim, opacity * 0.84);
    p.lineS(x - rx * 0.28, y - ry * 0.04, x + rx * 0.24, y - ry * 0.04, face, opacity * 0.78);
  }
}
function mintedFlight(
  f: FxInput,
  start: XY,
  to: XY,
  age: number,
  duration: number,
  apex: number,
  id: number,
  r = 3.5,
) {
  if (age < 0 || age > duration + 0.75) return;
  const { under, above } = f,
    u = clamp01(age / duration),
    end = age - duration;
  const wobble = hash(id, 927),
    spin = id + age * (12 + 6 * wobble),
    land = clamp01(end / 0.16);
  let [x, y] = projectile(start, to, u, apex);
  if (end > 0) {
    const b = fly(end, 19 + 11 * wobble, 320, 0.3),
      d = (12 + 15 * wobble) * b.h;
    x += Math.sign(to[0] - start[0]) * d;
    y -= b.z;
  }
  const shade = lerp(start[1] + 5, to[1], u),
    fade = clamp01((duration + 0.75 - age) / 0.31);
  oval(under, x, shade, 1.9 + 1.7 * u, 0.7 + u * 0.55, '#41342d', fade * 0.7);
  coin(above, x, y, r, spin, 0.84 * land, fade);
  if (end >= 0 && end < 0.23)
    ripple(under, ...to, 2 + end * 32, 0.36, '#e1bf77', 0.82 * (1 - end / 0.23));
}
function breath(f: FxInput) {
  const { t, points, feet, under, above } = f;
  if (t > 0.45 && t < 1.1) flare(above, ...points.slot, 1 + 5 * sstep(0.45, 0.93, t), '#ffe39b', 0.77);
  const source = f.pointAt(1, 'mouth');
  const dir = Math.sign(source[0] - feet[0]) || 1;
  for (let j = 0; j < 18; j++) {
    const release = 1 + Math.floor(j / 6) * 0.067,
      life = 0.24 + hash(j, 77) * 0.17,
      age = t - release;
    if (age < -0.35) continue;
    const start = release === 1 ? source : f.pointAt(release, 'mouth');
    const to: XY = [clampX(f, start[0] + dir * (24 + hash(j, 1) * 41)), feet[1] - 11 + hash(j, 12) * 38];
    if (age < 0) {
      oval(under, ...to, 4, 1.5, '#b89457', 0.21 * sstep(-0.3, 0, age));
      continue;
    }
    mintedFlight(f, start, to, age, life, 3 + hash(j, 39) * 12, j, 2.8 + hash(j, 71) * 1.6);
  }
  if (t >= 1 && t < 1.17) flare(above, ...source, 6 * (1 - (t - 1) / 0.17), '#fff0b9', 0.88);
}
function clampX(f: FxInput, x: number) {
  return Math.max(6, Math.min(f.w - 7, x));
}
function tail(f: FxInput) {
  const age = f.t - 0.6;
  if (f.t > 0.42 && f.t < 0.72) strokeTrail(f, 'tail', '#a27b4e', '#f3d58a', 6);
  if (age < 0) return;
  const hit = f.pointAt(0.6, 'tail'),
    dir = Math.sign(hit[0] - f.feet[0]) || -1;
  const floor = Math.max(f.feet[1] - 5, hit[1]);
  oval(f.under, hit[0], floor, 13, 5, '#48382a', clamp01(1 - age));
  ripple(f.under, hit[0], floor, 7 + age * 32, 0.34, '#c6a168', clamp01(1 - age * 1.7));
  for (let i = 0; i < 12; i++) {
    const to: XY = [
      clampX(f, hit[0] + dir * (13 + hash(i, 84) * 41)),
      floor + (hash(i, 233) - 0.45) * 36,
    ];
    mintedFlight(
      f,
      hit,
      to,
      age,
      0.2 + hash(i, 887) * 0.19,
      8 + hash(i, 904) * 14,
      60 + i,
      2.8 + hash(i, 91) * 1.1,
    );
  }
  const tie = projectile(hit, [hit[0] + dir * 22, floor + 3], clamp01(age / 0.33), 14);
  shard(f.above, ...tie, 6, 1.5, age * 9, '#604337', '#ba865b', clamp01(1 - age / 0.44));
}
function chest(f: FxInput) {
  const { t, points, under, above, feet } = f,
    age = t - 0.95;
  if (t > 0.37 && age < 0.17)
    flare(above, ...points.chest, 3 + 6 * sstep(0.38, 0.91, t), '#ffdb84', 0.77);
  if (age < 0) return;
  const [x, y] = f.pointAt(0.95, 'chest'),
    rise = 17 + 34 * sstep(0, 0.13, age),
    fade = clamp01((0.4 - age) / 0.25);
  for (let i = -2; i <= 2; i++) {
    const endX = x + i * rise * 0.41,
      endY = y - rise * (1 - 0.1 * Math.abs(i));
    above.col(i % 2 ? '#efbd63' : '#ffe99b', fade * 0.78);
    fillPoly(above, [
      x - 1,
      y,
      x + i * rise * 0.27 - 2,
      y - rise * 0.58,
      endX,
      endY,
      x + i * rise * 0.27 + 2,
      y - rise * 0.56,
      x + 1,
      y,
    ]);
  }
  const floor = feet[1] + 2;
  under.col('#e3bb64', fade * 0.52);
  fillPoly(under, [x - 17, floor, x + 9, floor - 5, x + 22, floor - 2, x - 4, floor + 4]);
  grit(above, x, y, age, 14, 345, '#ffe2a1');
}
function claw(f: FxInput) {
  const age = f.t - 0.5;
  if (f.t > 0.33 && f.t < 0.61)
    for (let k = -1; k <= 1; k++) strokeTrail(f, 'claw', '#a5a79a', '#e4e9db', 2.1, k * 4);
  if (age < 0) return;
  const [x, y] = f.pointAt(0.5, 'claw');
  for (let k = -1; k <= 1; k++) {
    const yy = Math.max(f.feet[1], y) + k * 3;
    f.under.lineS(x - 14, yy + 4, x + 9, yy - 1, '#453930', clamp01(1 - age * 1.8));
    f.under.lineS(x - 13, yy + 5, x + 6, yy + 1, '#ab9374', 0.76 * clamp01(1 - age * 1.8));
  }
  grit(f.above, x, y, age, 18, 914, '#ffd67c');
}
function rain(f: FxInput, show = false) {
  const waves = show ? [3.7, 3.88, 4.07] : animations.tech_rain.hits!,
    start = show ? 3.22 : 0.85,
    socket = show ? 'slot' : 'claw';
  for (let i = 0; i < 21; i++) {
    const wave = Math.floor(i / 7),
      release = start + 0.065 * wave,
      hit = waves[wave],
      age = f.t - release;
    if (age < -0.1 || age > hit - release + 0.75) continue;
    const source = f.pointAt(release, socket);
    const x = f.feet[0] + (hash(i, 617) - 0.5) * 164,
      y = f.feet[1] + (hash(i, 91) - 0.35) * 42;
    if (f.t < hit) oval(f.under, x, y, 2 + 2 * sstep(release, hit, f.t), 1.2, '#534133', 0.53);
    mintedFlight(
      f,
      source,
      [x, y],
      age,
      hit - release,
      32 + 23 * hash(i, 118),
      100 + i,
      2.6 + 2 * hash(i, 717),
    );
  }
}
function dive(f: FxInput) {
  const { t, feet } = f;
  const mound = clamp01(sstep(0, 0.25, t) * (1 - sstep(1.52, 1.93, t)));
  if (mound > 0) {
    const x = feet[0] + 78,
      y = feet[1] + 20;
    oval(f.under, x + 3, y + 1, 40, 7, '#332c2c', 0.77 * mound);
    // The back of the hoard sits on the stone. Its front ranks pass in front
    // of the diving head and hide the belly where it breaks the surface.
    const silhouette = [
      x - 42,
      y - 3,
      x - 32,
      y - 8,
      x - 23,
      y - 12,
      x - 11,
      y - 21,
      x - 4,
      y - 24,
      x + 2,
      y - 29,
      x + 8,
      y - 26,
      x + 18,
      y - 22,
      x + 29,
      y - 16,
      x + 39,
      y - 8,
      x + 40,
      y - 1,
      x + 25,
      y + 3,
      x - 23,
      y + 3,
    ];
    f.under.col('#715532', mound);
    fillPoly(f.under, silhouette);
    for (let row = 0; row < 5; row++) {
      const radius = 2 + row,
        pen = row < 2 ? f.under : f.above;
      for (let j = -radius; j <= radius; j++) {
        const u = hash(j, row, 702),
          xx = x + j * 5.5 + (row % 2) * 2.7;
        const yy = y - 25 + row * 5.35 + Math.abs(j) * 0.75 + u * 1.85;
        coin(pen, xx, yy, 3.8 + (u - 0.5), 0.58 + u * 0.73, 0.67, mound);
      }
    }
    for (let j = -3; j <= 4; j++) {
      const u = hash(j, 228),
        xx = x + j * 7.9,
        yy = y + u * 2;
      coin(f.above, xx, yy, 4 + u * 0.6, j * 0.62, 0.76, mound);
    }
  }
  for (const [i, hit] of animations.tech_dive.hits!.entries()) {
    const age = t - hit;
    if (age < 0) continue;
    const center = f.pointAt(hit, 'mouth'),
      y = feet[1] + 7,
      dir = i ? -1 : 1;
    for (let j = 0; j < 12; j++) {
      const xx = center[0] + (j - 5.5) * 3.2,
        off = age - 0.014 * Math.abs(j - 5);
      if (off < 0) continue;
      mintedFlight(
        f,
        [xx, y - 2],
        [clampX(f, xx + dir * (hash(j, 691) - 0.14) * 28), y + (hash(j, 190) - 0.5) * 21],
        off,
        0.32,
        5 + (6 - Math.abs(j - 5)) * 2.1,
        j,
        3.2,
      );
    }
    ripple(f.under, center[0], y, 5 + age * 38, 0.34, '#cda764', clamp01(1 - age * 2));
  }
  if (t > 0.78 && t < 1.49) {
    const u = sstep(0.78, 1.46, t),
      x = lerp(feet[0] + 78, feet[0] - 5, u);
    for (let j = -4; j <= 4; j++)
      coin(f.above, x + j * 3.8, feet[1] + 4 - (5 - Math.abs(j)) * 2.1, 4, j * 0.7 + t * 6, 0.53, 0.87);
  }
}
function showCoin(f: FxInput) {
  const { t, above, under, feet } = f;
  if (t < 2.77) {
    const z = sstep(0.12, 1.6, t),
      r = 5 + z * 24,
      split = sstep(1.72, 2.43, t),
      y = feet[1] - r * 0.88;
    const a = (0.12 + 0.27 * Math.sin(t * 6) * (1 - z)) * Math.PI,
      fade = 1 - sstep(2.2, 2.74, t);
    oval(under, feet[0], feet[1] + 2, r + split * 8, 2.2 + r * 0.09, '#3c332b', fade * 0.73);
    // The mint mark tears in two with the flan. Each independently offset half keeps its relief.
    for (const sign of [-1, 1]) {
      const shift = Math.round(split * 17) * sign;
      for (let j = Math.ceil(-r); j <= r; j++) {
        const h = r * Math.sqrt(Math.max(0, 1 - (j / r) ** 2)),
          edge = Math.floor(h * Math.cos(a));
        const seam = Math.round(Math.sin((j + r) * 0.36) * 2.2);
        const lo = sign < 0 ? -edge : seam,
          hi = sign < 0 ? seam : edge;
        if (hi <= lo) continue;
        const lift = split * (sign === 1 ? 6 : -2);
        above.col(Math.abs(j) > r * 0.85 ? '#f4d58c' : '#ad7840', fade);
        above.rect(Math.round(feet[0] + lo + shift), Math.round(y + j + lift), hi - lo + 1, 1);
        if (hi - lo > 3 && Math.abs(j) < r * 0.89) {
          above.col('#d8ab60', fade);
          above.rect(Math.round(feet[0] + lo + shift + 1), Math.round(y + j + lift), hi - lo - 1, 1);
        }
        if (z > 0.27 && Math.abs(j) < r * 0.41) {
          const glyph = Math.round(-j * 0.32) + sign * 2;
          if (glyph >= lo && glyph <= hi)
            above.lineS(
              feet[0] + glyph + shift,
              y + j + lift,
              feet[0] + glyph + shift + 1,
              y + j + lift,
              '#8a6138',
              fade,
            );
        }
        if (t > 1.55 && split < 0.81)
          above.lineS(
            feet[0] + seam + shift,
            y + j + lift,
            feet[0] + seam + shift,
            y + j + lift,
            '#ffebaf',
            fade,
          );
      }
    }
    if (t > 1.65 && t < 2.2) flare(above, feet[0], y - 4, 5, '#ffe7ad', 0.87);
  }
  if (t > 3.05) rain(f, true);
  if (t > 3.74) {
    const to = f.points.mouth,
      u = sstep(3.74, 4.29, t),
      start = f.pointAt(3.74, 'slot');
    const p = projectile(start, to, u, 19);
    coin(above, ...p, 5.1, lerp(0.4, 1.01, u), 0.07);
  }
}
export function effects(f: FxInput) {
  switch (f.anim) {
    case 'tech_breath':
      return breath(f);
    case 'tech_tail':
      return tail(f);
    case 'tech_chest':
      return chest(f);
    case 'tech_claw':
      return claw(f);
    case 'tech_rain':
      return rain(f);
    case 'tech_dive':
      return dive(f);
    case 'show':
      return showCoin(f);
    case 'happy': {
      if (f.t < 0.35 || f.t > 0.91) return;
      const u = sstep(0.35, 0.83, f.t),
        p = projectile(f.pointAt(0.35, 'claw'), f.points.mouth, u, 24);
      coin(f.above, ...p, 4.2, 5 * f.t, 0.04, clamp01((0.91 - f.t) / 0.08));
      return;
    }
    case 'hatch': {
      if (f.t > 0.78)
        mintedFlight(
          f,
          f.pointAt(0.78, 'mouth'),
          [f.feet[0] + 65, f.feet[1] + 6],
          f.t - 0.78,
          0.37,
          12,
          91,
        );
      return;
    }
    case 'phase': {
      const u = sstep(0.2, 1.55, f.t),
        p = projectile(f.points.mouth, f.points.tail, u, 15);
      if (u > 0 && u < 1) flare(f.above, ...p, 5 + 3 * Math.sin(u * Math.PI), '#ffe099', 0.85);
      if (f.t > 1.12) flare(f.above, ...f.points.slot, 4 + 2 * Math.sin(f.t * 5), '#f5d890', 0.72);
      return;
    }
    case 'peek': {
      if (f.t > 0.66 && f.t < 1.31) {
        const [x, y] = f.points.mouth;
        coin(f.above, x + 2, Math.min(f.h - 2, y), 4.1, 0.82, 0.03, 0.95, true);
      }
      return;
    }
  }
}
