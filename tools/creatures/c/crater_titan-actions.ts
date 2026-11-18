import { clamp01, easeIn3, easeOut, hash, lerp, sstep, TAU } from '../kit/f11-mobkit';
import { keyPose, type KeyPose } from '../kit/f14-mobkit';
import { chunks, dust, flare, type Pen } from '../fx/pen';
import type { Animation, FxInput, XY } from '../types';
import { fissure, grit, oval, projectile, ripple, shard, springBack, strokeTrail } from './strike-brush';

const base = {
  dx: 0,
  dy: 0,
  sx: 1,
  sy: 1,
  rot: 0,
  flash: 0,
  trail: 0,
  vent: 0,
  arm: 0,
  tip: 0,
  sweep: 0,
  foot: 0,
  crouch: 0,
  phase: 0,
  twist: 0,
  glance: 0,
};
type Key = KeyPose<typeof base>;
export const animations: Record<string, Animation> = {
  tech_eruption: { seconds: 2.4, hits: [34 / 24, 40 / 24, 46 / 24], shake: 0.22 },
  tech_fist: { seconds: 1.2, hits: [0.75], shake: 0.4, stop: 0.08 },
  tech_sweep: { seconds: 1.4, hits: [0.7], shake: 0.19 },
  tech_quake: { seconds: 1.6, hits: [1], shake: 0.33, stop: 0.045 },
  tech_ash: { seconds: 2, hits: [22 / 24], shake: 0.07 },
  tech_pillar: { seconds: 1.8, hits: [1.2, 32 / 24, 35 / 24], shake: 0.19 },
  happy: { seconds: 1.1 },
  tired: { seconds: 1.5 },
  hatch: { seconds: 1.5 },
  phase: { seconds: 2 },
  show: { seconds: 5, hits: [3.3], shake: 0.25 },
  away: { seconds: 1.5 },
  back: { seconds: 1.5 },
  peek: { seconds: 1.8 },
};
const tracks: Record<string, Key[]> = {
  tech_eruption: [
    [0, {}],
    [0.68, { crouch: 0.85, vent: 0.65, arm: 0.18, tip: 0.1 }],
    [0.97, { crouch: 1, vent: 1, twist: -0.25 }],
    [1.1, { dy: -4, sy: 1.08, vent: 1.6, arm: 0.34, tip: 0.32 }, easeOut],
    [1.48, { vent: 0.9, crouch: 0.38 }],
    [1.9, { vent: 0.5, arm: 0.1, crouch: 0.18 }],
    [2.3, {}],
  ],
  tech_fist: [
    [0, {}],
    [0.43, { arm: 0.88, twist: -1, crouch: 0.25 }],
    [0.61, { arm: 1.18, tip: 0.12, twist: -1.25, sweep: -0.24 }],
    [0.75, { arm: -0.15, sweep: 0.24, twist: 0.8, crouch: 0.67, trail: 1 }, easeIn3],
    [0.85, { arm: -0.14, tip: 0.17, crouch: 0.94, sweep: 0.26, twist: 0.58 }],
    [1.01, { arm: 0.19, crouch: 0.4 }],
    [1.19, {}],
  ],
  tech_sweep: [
    [0, {}],
    [0.42, { twist: -1, crouch: 0.66, sweep: -1, arm: 0.13 }],
    [0.57, { sweep: -0.66, arm: 0.05, crouch: 0.8 }],
    [0.76, { sweep: 1.5, arm: -0.11, twist: 0.85, trail: 1, crouch: 0.72 }, easeIn3],
    [0.93, { sweep: 1.72, arm: 0.12, twist: 1.16, crouch: 0.47 }],
    [1.15, { sweep: 0.37, arm: 0.23, twist: 0.46 }],
    [1.36, {}],
  ],
  tech_quake: [
    [0, {}],
    [0.45, { foot: 0.43, arm: 0.16, rot: -0.035 }],
    [0.83, { foot: 1, arm: 0.51, tip: 0.31, crouch: 0.09, rot: -0.07 }],
    [1, { foot: 0, crouch: 0.85, sy: 0.94, rot: 0.012 }, easeIn3],
    [1.17, { crouch: 0.56, arm: 0.15, tip: 0.27 }],
    [1.4, { crouch: -0.12 }],
    [1.57, {}],
  ],
  tech_ash: [
    [0, {}],
    [0.64, { vent: -0.74, crouch: 0.92, arm: 0.16 }],
    [0.91, { vent: 1.4, crouch: -0.15, sy: 1.05 }, easeOut],
    [1.17, { vent: 0.87, tip: 0.28 }],
    [1.54, { twist: 0.62, glance: 0.64, vent: 0.65 }],
    [1.98, {}],
  ],
  tech_pillar: [
    [0, {}],
    [0.48, { arm: 0.45, tip: 0.2, twist: -0.41 }],
    [0.86, { arm: 1, tip: 0.95, sweep: 0.56, crouch: 0.42 }],
    [1.16, { arm: 1.1, tip: 1.0, sweep: 0.69 }],
    [1.31, { arm: 0.05, tip: 0.82, crouch: 0.63 }, easeIn3],
    [1.45, { arm: 0.2, tip: 0.05, crouch: 0.85 }, easeIn3],
    [1.75, {}],
  ],
  happy: [
    [0, {}],
    [0.23, { crouch: 0.62, vent: -0.3 }],
    [0.48, { arm: 1, tip: 0.85, vent: 1, sy: 1.07 }, easeOut],
    [0.71, { arm: 0.74, tip: 1, vent: 0.65 }],
    [1.06, {}],
  ],
  tired: [
    [0, {}],
    [0.55, { crouch: 0.85, arm: -0.12, tip: -0.05, rot: 0.065 }],
    [0.92, { crouch: 1.3, arm: -0.1, tip: 0.08, vent: -0.65, rot: 0.08 }],
    [1.45, {}],
  ],
  hatch: [
    [0, { sx: 0.4, sy: 0.24, crouch: 1, arm: 0.42, tip: 0.34, vent: -1 }],
    [0.46, { sx: 0.7, sy: 0.4, crouch: 1, vent: -1 }],
    [0.79, { sx: 1.02, sy: 0.79, crouch: 0.52, arm: 0.7, tip: 0.45 }],
    [1.08, { sy: 1.04, vent: 0.9, arm: 0.31, tip: 0.7 }],
    [1.47, {}],
  ],
  phase: [
    [0, {}],
    [0.47, { crouch: 0.66, arm: 0.43, phase: 0.08 }],
    [0.96, { crouch: 0.55, vent: 0.88, arm: 0.75, tip: 0.44, phase: 0.46 }],
    [1.41, { vent: 1.22, arm: 0.48, tip: 0.58, phase: 0.89, sy: 1.025 }],
    [1.97, { phase: 1 }],
  ],
  show: [
    [0, { sx: 0, sy: 0 }],
    [1.43, { sx: 0, sy: 0 }],
    [1.62, { sx: 0.2, sy: 0.13, vent: -1, crouch: 1 }],
    [2.35, { sx: 0.63, sy: 0.59, crouch: 0.75, vent: -0.5, arm: 0.22 }],
    [2.97, { sx: 1, sy: 0.91, vent: 0.43, crouch: 0.48, arm: 0.46, tip: 0.49 }],
    [3.3, { sx: 1.04, sy: 1.07, vent: 1.53, arm: 0.71, tip: 0.77, flash: 0.22 }, easeOut],
    [3.65, { sy: 0.95, crouch: 0.47, vent: 0.54 }],
    [4.25, {}],
    [5, {}],
  ],
  peek: [
    [0, {}],
    [0.48, { dy: 27, sx: 1.03, sy: 1.04, crouch: 0.55, arm: -0.11 }],
    [0.83, { dy: 53, arm: -0.08, tip: 0.42, crouch: 0.88, glance: 0.74 }],
    [1.18, { dy: 53, arm: -0.1, crouch: 0.93, glance: 1 }],
    [1.77, {}],
  ],
};
export function pose(anim: string, t: number) {
  if (anim === 'away' || anim === 'back') {
    const k = anim === 'away' ? sstep(0.09, 1.4, t) : 1 - sstep(0.03, 1.38, t);
    return {
      ...base,
      dx: -235 * k,
      rot: 0.027 * Math.sin(t * TAU * 2) * Math.sin(k * Math.PI),
      twist: -0.65 * Math.sin(k * Math.PI),
    };
  }
  const p = tracks[anim] ? keyPose(t, tracks[anim], base) : { ...base };
  if (anim === 'tech_fist') p.tip += 0.42 * springBack(t - 0.77);
  if (anim === 'tech_quake') p.twist += 0.32 * springBack(t - 1);
  return p;
}
const embers = ['#fff1af', '#feb755', '#e76533', '#a13f30', '#582e32', '#332936'];
function pool(p: Pen, x: number, y: number, r: number, age: number) {
  if (age < 0) return;
  const fade = clamp01((1.33 - age) / 0.3),
    grow = easeOut((age + 0.02) / 0.14),
    rx = r * grow;
  oval(p, x, y, rx + 2, rx * 0.39 + 1, '#2d222d', fade);
  oval(p, x, y - 1, rx, rx * 0.34, embers[Math.min(5, Math.floor(age * 5.5))], fade);
  p.lineS(
    x - rx * 0.54,
    y,
    x - rx * 0.07,
    y - 2,
    embers[Math.min(5, Math.floor(age * 5.2))],
    0.72 * fade,
  );
}
function bomb(p: Pen, x: number, y: number, r: number, age: number) {
  const a = age * 8;
  shard(p, x, y, r, r * 0.9, a, '#4b3035', '#c35331');
  p.lineS(x - r * 0.34, y - r * 0.2, x + r * 0.2, y - r * 0.44, '#ffcb63', 0.95);
  p.dot(x + r * 0.2, y - r * 0.3, 2, 1);
}
const targets = (f: FxInput): XY[] => [
  [f.w * 0.18, f.h * 0.76],
  [f.w * 0.78, f.h * 0.86],
  [f.w * 0.89, f.h * 0.62],
];
function eruption(f: FxInput, reveal = false) {
  const hits = reveal ? [3.63, 3.86, 4.12] : animations.tech_eruption.hits!;
  const originTime = reveal ? 3.27 : 1;
  for (const [i, target] of targets(f).entries()) {
    const release = originTime + [0, 0.09, 0.15][i],
      hit = hits[i],
      t = f.t,
      age = t - hit;
    if (t < release - 0.45 || age > 1.32) continue;
    const [x, y] = target;
    if (t < hit) {
      const u = clamp01((t - release) / (hit - release));
      ripple(f.under, x, y, 9, 0.36, '#e07c4a', 0.68, clamp01((t - release + 0.45) / 0.45));
      oval(f.under, x, y, 2 + 7 * u, 1 + 2 * u, '#33252c', 0.65);
      if (t < release) continue;
      const from = f.pointAt(release, 'vent'),
        pos = projectile(from, target, u, 36 + 8 * i);
      const tail = projectile(from, target, Math.max(0, u - 0.1), 36 + 8 * i);
      f.above.lineS(...tail, ...pos, '#c4603c', 0.72);
      bomb(f.above, ...pos, 5 + i, age);
    } else {
      pool(f.under, x, y, 10 + i * 2, age);
      fissure(f.under, 'vent-bomb-' + i, 42 + i, x, y, age, 19, '#7a3b32', '#db7841', 1.05);
      grit(f.above, x, y, age, 11, 10 + i, '#ffd07b');
      dust(f.above, 91 + i, age, x, y, 4, 0, 3.14, 5, 19, 1.2, 4, 6, 0.44, 1, 0.63);
    }
  }
}
function fist(f: FxInput) {
  const { t, feet, points, under, above } = f,
    hit = 0.75,
    age = t - hit;
  if (t > 0.27 && age < 0.09) flare(above, ...points.fist, 2 + 6 * sstep(0.3, 0.71, t), '#ff9b4e', 0.86);
  if (t > 0.6 && t < 0.84) strokeTrail(f, 'fist', '#df792f', '#ffd176', 5);
  const pt = age >= 0 ? f.pointAt(hit, 'fist') : points.fist;
  const x = pt[0],
    y = age >= 0 ? pt[1] : feet[1] + 4;
  if (age < 0) {
    ripple(under, x, y, 10, 0.34, '#a15c41', 0.52, sstep(0.2, 0.7, t));
    return;
  }
  pool(under, x, y, 13, age);
  fissure(under, 'basalt-fist', 58, x, y, age, 53, age < 0.24 ? '#ffbe68' : '#b7633c', '#5a3930', 1.1);
  chunks(above, 429, age, x, y, 16, 0, 3.14, 20, 39, 32, 50, [0.38, 0.74], 0.46, 1);
}
function sweep(f: FxInput) {
  const { t, feet, under, above } = f;
  if (t > 0.48 && t < 0.92) strokeTrail(f, 'fist', '#80635e', '#d4ad85', 7);
  const offsets = [0.48, 0.55, 0.63, 0.7, 0.77, 0.85];
  for (let j = 1; j < offsets.length; j++) {
    if (t < offsets[j]) break;
    const a = f.pointAt(offsets[j - 1], 'fist'),
      b = f.pointAt(offsets[j], 'fist'),
      ag = t - offsets[j];
    const ay = lerp(a[1], feet[1] + 4, 0.35),
      by = lerp(b[1], feet[1] + 4, 0.35);
    under.lineS(a[0], ay, b[0], by, '#322932', clamp01(1 - ag));
    under.lineS(a[0], ay + 1, b[0], by + 1, '#a47c64', 0.7 * clamp01(1 - ag));
    dust(above, 700 + j, ag, b[0], by, 3, 0, 2.8, 10, 18, 2, 6, 8, 0.48, 2, 0.68);
  }
}
function quake(f: FxInput) {
  const age = f.t - 1;
  const at = age >= 0 ? f.pointAt(1, 'foot') : f.points.foot,
    x = at[0],
    y = age >= 0 ? at[1] : f.feet[1];
  if (age < 0) {
    oval(f.under, x, y, 8 + 6 * sstep(0.3, 0.84, f.t), 3, '#24232d', 0.58);
    return;
  }
  fissure(f.under, 'basalt-quake', 372, x, y, age, 107, '#f3a95b', '#6c4840', 1.2);
  for (const [j, dir] of [-1, 0.45, 0.94].entries()) {
    const d = age - 0.06 - j * 0.045;
    if (d >= 0)
      dust(
        f.above,
        613 + j,
        d,
        x + dir * (26 + 9 * j),
        y + (j - 1) * 8,
        5,
        -Math.PI / 2,
        0.28,
        4,
        7,
        2,
        5,
        21,
        0.53,
        3,
        0.64,
        (i) => i * 0.028,
      );
  }
}
function ash(f: FxInput) {
  const age = f.t - 22 / 24;
  if (age < 0) {
    if (f.t > 0.32) flare(f.above, ...f.points.vent, 2 + 4 * sstep(0.34, 0.9, f.t), '#f68e40', 0.65);
    return;
  }
  const [x, y] = f.pointAt(22 / 24, 'vent'),
    gain = Math.sin(Math.PI * clamp01(age / 1.07));
  f.under.col('#302731', 0.31 * gain);
  f.under.rect(0, 0, f.w, f.h);
  for (let i = 0; i < 4; i++) {
    const d = age - 0.072 * i;
    if (d < 0) continue;
    const xx = x + (i - 1.5) * 12,
      yy = lerp(y, f.feet[1], 0.19 * i);
    dust(
      f.above,
      187 + i,
      d,
      xx,
      yy,
      9,
      Math.PI * 0.5,
      2.25,
      40,
      85,
      3,
      15,
      -13,
      1,
      1,
      0.77,
      (j) => 0.014 * j,
      undefined,
      [-19, 12],
    );
  }
  // The heavy ash spills down, then mushrooms sideways across the plates.
  const spread = sstep(0.05, 0.62, age),
    melt = clamp01((1.09 - age) / 0.32);
  if (spread > 0) {
    const floorY = f.feet[1] + 4,
      width = spread * 96;
    oval(f.under, f.feet[0], floorY, width, 7 + 5 * spread, '#322d37', melt * 0.76);
    for (let j = -6; j <= 6; j++) {
      const front = Math.abs(j) / 6,
        xx = f.feet[0] + (j * width) / 6;
      const yy = floorY + 6 * Math.cos(j * 0.87) - front * 4;
      const r = (5 + 5 * spread + 3 * Math.cos(j * 2.1)) * Math.min(1, spread * 4);
      oval(f.above, xx, yy, r * 1.7, r * 0.66, '#423e48', melt * 0.87);
      oval(f.above, xx - 2, yy - 2, r * 1.38, r * 0.58, '#655b62', melt * 0.78);
      if (j % 3 === 0 && age > 0.27) {
        f.above.lineS(xx - r * 0.9, yy + 1, xx - r * 0.25, yy - 1, '#d98750', melt * 0.87);
        f.above.lineS(xx - r * 0.25, yy - 1, xx, yy, '#a3664a', melt * 0.83);
      }
    }
  }
  grit(f.above, x, y + 26, age - 0.15, 18, 78, '#e7a768');
}
function pillars(f: FxInput) {
  const hits = animations.tech_pillar.hits!;
  for (const [i, [x, y]] of targets(f).entries()) {
    const age = f.t - hits[i];
    if (age < 0) {
      ripple(f.under, x, y, 10 + i, 0.35, '#f1a64d', 0.77, sstep(0.28 + i * 0.08, hits[i] - 0.04, f.t));
      continue;
    }
    pool(f.under, x, y, 12 + i, age);
    const h = (36 + i * 9) * Math.sin(Math.PI * clamp01(age / 0.43)) ** 0.56;
    for (let j = -2; j <= 2; j++) {
      const xx = x + j * 2.6,
        v = h * (1 - 0.14 * Math.abs(j));
      shard(
        f.above,
        xx,
        y - v * 0.29,
        v * 0.71,
        4,
        -Math.PI / 2 + Math.sin(age * 14 + j) * 0.07,
        '#bd4b2c',
        j === -1 ? '#ffe491' : '#ed8b3f',
      );
    }
    grit(f.above, x, y - h * 0.74, age, 11, 90 + i, '#ffce73');
  }
}
export function effects(f: FxInput) {
  const { t, anim, above, under, feet } = f;
  switch (anim) {
    case 'tech_eruption':
      return eruption(f);
    case 'tech_fist':
      return fist(f);
    case 'tech_sweep':
      return sweep(f);
    case 'tech_quake':
      return quake(f);
    case 'tech_ash':
      return ash(f);
    case 'tech_pillar':
      return pillars(f);
    case 'show': {
      const a = clamp01((1.78 - t) / 0.33);
      if (a > 0) {
        oval(under, feet[0], feet[1] + 1, 9, 2, '#24202b', a);
        shard(above, feet[0], feet[1] - 3, 8, 6, -0.22, '#38333e', '#756777', a);
        if (t > 0.77)
          above.lineS(
            feet[0] - 2,
            feet[1] - 5,
            feet[0] + 2,
            feet[1] - 2,
            '#ffa555',
            a * sstep(0.77, 1.37, t),
          );
      }
      if (t > 1.02)
        fissure(under, 'titan-awakens', 80, ...feet, t - 1.02, 36, '#e79750', '#5b3b36', 1.63);
      if (t > 2.8) eruption(f, true);
      return;
    }
    case 'phase':
      fissure(under, 'titan-molts', 145, ...feet, t - 0.24, 44, '#eaa358', '#754336', 1.42);
      return;
    case 'happy':
      if (t > 0.42) {
        const at = f.pointAt(0.42, 'vent'),
          age = t - 0.42;
        ripple(
          above,
          at[0] - age * 8,
          at[1] - age * 26,
          5 + age * 11,
          0.49,
          '#b0a4a3',
          clamp01(1 - age * 1.5),
        );
      }
      return;
    case 'hatch':
      if (t > 0.48)
        chunks(under, 834, t - 0.48, ...feet, 7, 0, 3.14, 11, 18, 19, 24, [0.5, 0.9], 0.25, 1);
      return;
    case 'peek':
      if (t > 0.8 && t < 1.54)
        dust(
          above,
          431,
          t - 0.8,
          f.points.fist[0],
          Math.min(f.h - 2, f.points.fist[1]),
          6,
          -Math.PI / 2,
          0.3,
          5,
          10,
          1.4,
          4,
          15,
          0.51,
          3,
          0.62,
          (j) => j * 0.04,
        );
      return;
  }
}
