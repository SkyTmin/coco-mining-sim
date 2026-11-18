import { clamp01, easeIn3, easeOut, hash, lerp, sstep, TAU } from '../kit/f11-mobkit';
import { keyPose, type KeyPose } from '../kit/f14-mobkit';
import { chunks, dust, fillPoly, flare, type Pen } from '../fx/pen';
import { paintImpact, paintSocketTrail, projectileAt } from '../technique-fx';
import type { Animation, FxInput, XY } from '../types';
import { fissure, grit, oval, projectile, ripple, shard, springBack } from './strike-brush';

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
  p.lineS(x - rx * 0.54, y, x - rx * 0.07, y - 2, embers[Math.min(5, Math.floor(age * 5.2))], 0.72 * fade);
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
function heatedStroke(f: FxInput, socket: string, hit: number, color: string, width = 2) {
  const start = hit - 4 / 24,
    end = hit + 2 / 24;
  if (f.t <= start || f.t > end + 2 / 24) return;
  paintSocketTrail(f, 'above', socket, Math.max(start, f.t - 4 / 24), Math.min(f.t, end), {
    color,
    width,
    alpha: 0.86 * (1 - sstep(end, end + 2 / 24, f.t)),
  });
}
function eruption(f: FxInput) {
  const [release, ...landings] = f.hits;
  heatedStroke(f, 'vent', release, '#e9a455', 1);
  for (const [i, target] of targets(f).entries()) {
    const born = release + i / 24,
      land = landings[i];
    if (land === undefined || f.t < born - 0.3 || f.t > land + 1.33) continue;
    const age = f.t - land,
      [x, y] = target;
    if (f.t < land) {
      const u = clamp01((f.t - born) / (land - born));
      ripple(f.under, x, y, 9, 0.36, '#e07c4a', 0.68, sstep(born - 0.3, born, f.t));
      oval(f.under, x, y, 2 + 7 * u, 1 + 2 * u, '#33252c', 0.65);
    }
    if (f.t < born) continue;
    const pos = projectileAt(f, 'bomb-' + i, 'vent', born, land, target, 36 + 8 * i);
    if (f.t === born) paintImpact(f, 'above', 'vent', f.points.vent, (p, bx, by) => bomb(p, bx, by, 4, 0));
    if (age < 0) {
      const u = clamp01((f.t - born) / (land - born));
      const tail = projectile(f.pointAt(born, 'vent'), target, Math.max(0, u - 0.12), 36 + 8 * i);
      f.above.lineS(...tail, ...pos, '#c4603c', 0.72);
      bomb(f.above, ...pos, 5 + i, age);
    } else {
      paintImpact(f, 'under', 'bomb-' + i, target, (p, px, py) => pool(p, px, py, 10 + i * 2, age));
      fissure(f.under, 'vent-bomb-' + i, 42 + i, x, y, age, 19, '#7a3b32', '#db7841', 1.05);
      grit(f.above, x, y, age, 11, 10 + i, '#ffd07b');
      dust(f.above, 91 + i, age, x, y, 4, 0, 3.14, 5, 19, 1.2, 4, 6, 0.44, 1, 0.63);
    }
  }
}
function fist(f: FxInput) {
  const { t, feet, points, under, above } = f,
    hit = f.hits[0],
    age = t - hit;
  if (t > 0.27 && age < 0.09) flare(above, ...points.fist, 2 + 6 * sstep(0.3, 0.71, t), '#ff9b4e', 0.86);
  heatedStroke(f, 'fist', hit, '#ffd176');
  const pt = age >= 0 ? f.pointAt(hit, 'fist') : points.fist;
  const x = pt[0],
    y = age >= 0 ? pt[1] : feet[1] + 4;
  if (age < 0) {
    ripple(under, x, y, 10, 0.34, '#a15c41', 0.52, sstep(0.2, 0.7, t));
    return;
  }
  paintImpact(f, 'under', 'fist', pt, (pen, x, y) => pool(pen, x, y, 13, age));
  fissure(under, 'basalt-fist', 58, x, y, age, 53, age < 0.24 ? '#ffbe68' : '#b7633c', '#5a3930', 1.1);
  chunks(above, 429, age, x, y, 16, 0, 3.14, 20, 39, 32, 50, [0.38, 0.74], 0.46, 1);
}
function sweep(f: FxInput) {
  const hit = f.hits[0],
    age = f.t - hit;
  heatedStroke(f, 'fist', hit, '#d5a87a', 2);
  if (age < 0) return;
  const start = f.pointAt(hit, 'fist');
  paintImpact(f, 'under', 'fist', start, (p, x, y) =>
    oval(p, x, y, 3 + Math.min(4, age * 24), 2, '#543f39', clamp01(1 - age)),
  );
  const stop = hit + 5 / 24;
  for (let k = 1; k <= 10; k++) {
    const when = hit + k / 48;
    if (f.t < when) break;
    const prev = f.pointAt(when - 1 / 48, 'fist'),
      next = f.pointAt(when, 'fist');
    const alpha = clamp01(1 - (f.t - stop));
    f.under.lineS(...prev, ...next, '#322932', alpha);
    f.under.lineS(prev[0], prev[1] + 1, next[0], next[1] + 1, '#b28362', alpha * 0.72);
    dust(f.above, 700 + k, f.t - when, next[0], next[1], 3, 0, 2.8, 10, 18, 2, 6, 8, 0.48, 2, 0.68);
  }
}
function quake(f: FxInput) {
  const hit = f.hits[0],
    age = f.t - hit;
  heatedStroke(f, 'foot', hit, '#ab7964', 2);
  if (age < 0) {
    oval(f.under, ...f.points.foot, 8 + 6 * sstep(0.3, 0.84, f.t), 3, '#24232d', 0.58);
    return;
  }
  const at = f.pointAt(hit, 'foot'),
    [x, y] = at;
  paintImpact(f, 'under', 'foot', at, (p, px, py) =>
    oval(
      p,
      px,
      py,
      5 + 12 * sstep(0, 0.09, age),
      2 + 3 * sstep(0, 0.09, age),
      '#b77748',
      clamp01((0.58 - age) * 4),
    ),
  );
  // Steam emerges only after the travelling front passes the corresponding rock seam.
  for (const [j, dir] of [-1, 1].entries()) {
    let prev: XY = at;
    for (let k = 1; k <= 10; k++) {
      const when = 0.016 * k;
      if (age < when) break;
      const next: XY = [x + dir * k * 9, y + Math.sin(k * 1.1 + j) * 3 + (j === 0 ? 1 : -1) * k * 0.74];
      f.under.lineS(...prev, ...next, age < when + 0.13 ? '#ffc673' : '#7a4940', clamp01(1.2 - age));
      if (k === 3 || k === 7)
        dust(
          f.above,
          613 + j * 11 + k,
          age - when,
          ...next,
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
      prev = next;
    }
  }
}
function ash(f: FxInput) {
  const hit = f.hits[0],
    age = f.t - hit;
  heatedStroke(f, 'vent', hit, '#b79b8f', 1);
  if (age < 0) {
    if (f.t > 0.32) flare(f.above, ...f.points.vent, 2 + 4 * sstep(0.34, 0.9, f.t), '#efac73', 0.75);
    return;
  }
  const source = f.pointAt(hit, 'vent'),
    wind = source[0] > f.w / 2 ? -1 : 1;
  const landing: XY = [Math.max(42, Math.min(f.w - 42, source[0] + wind * 101)), f.feet[1] + 8];
  const travel = 0.4,
    releaseDuration = 0.46;
  // A bent jet first rises above the rim, then loses buoyancy. Its last lobe is
  // the origin of the ground surge. There is no second emitter under the actor.
  const streamline = (u: number): XY => {
    const v = 1 - u;
    return [
      source[0] * v * v * v +
        3 * (source[0] + wind * 35) * v * v * u +
        3 * (landing[0] - wind * 29) * v * u * u +
        landing[0] * u * u * u,
      source[1] * v * v * v +
        3 * (source[1] - 82) * v * v * u +
        3 * (landing[1] - 27) * v * u * u +
        landing[1] * u * u * u,
    ];
  };
  if (age < releaseDuration + 0.11)
    paintImpact(f, 'above', 'vent', source, (p, x, y) => {
      const fade = clamp01((releaseDuration + 0.11 - age) * 8);
      oval(p, x, y, 4.5, 2.3, '#794d46', fade);
      p.lineS(x - wind * 2, y + 1, x + wind * 3, y - 2, '#ffe0aa', fade);
    });
  // The shutter opens on the released pressure front, already beyond the lip.
  const front = clamp01(0.21 + (0.79 * age) / travel),
    back = clamp01((age - releaseDuration) / travel);
  if (back < 1) {
    const steps = Math.max(1, Math.ceil((front - back) * 28));
    const lobes = [];
    const opacity = clamp01((travel + releaseDuration + 0.09 - age) * 8);
    for (let i = 0; i <= steps; i++) {
      const u = lerp(back, front, i / steps),
        [cx, cy] = streamline(u);
      const eddy = Math.sin(u * 19 - age * 9) + 0.37 * Math.sin(u * 37 + age * 6);
      const r = 2.7 + u * (11.5 + 3.3 * eddy);
      lobes.push({ u, x: cx + eddy * r * 0.26, y: cy + Math.cos(u * 22 - age * 11) * r * 0.29, r });
    }
    // Build the complete shadow first; overlapping puffs share their interior.
    // Local curls appear only intermittently in the otherwise continuous surface.
    for (const { x, y, r } of lobes) oval(f.above, x, y, r * 1.35, r * 0.88, '#5c525d', opacity);
    for (const { x, y, r, u } of lobes) {
      const relief = 0.64 + 0.11 * Math.sin(19 * u - age * 9);
      oval(f.above, x + wind * r * 0.26, y - r * 0.24, r * 1.12, r * relief, '#84787b', opacity * 0.98);
    }
    for (let i = 0; i < lobes.length; i++) {
      const { x, y, r, u } = lobes[i],
        a = Math.sin(u * 18 - age * 8);
      if (a > 0.05)
        oval(
          f.above,
          x + wind * r * 0.65,
          y - r * 0.46,
          r * (0.66 + 0.23 * a),
          r * (0.32 + 0.17 * a),
          '#aa9f99',
          opacity * 0.86,
        );
      if (a > 0.78)
        f.above.lineS(
          x + wind * r * 0.54,
          y - r * 0.74,
          x + wind * r * 0.95,
          y - r * 0.61,
          '#cbbfae',
          opacity * 0.84,
        );
      if (u < 0.42 && i % 5 === 0) f.above.lineS(x, y + 1, x + wind * 2, y, '#df9a62', opacity * 0.88);
    }
  }
  if (age < 0.16) {
    // The first hot core is visible through the ash at the exact release frame;
    // the pale pressure curl leads it and folds back into the slower grey plume.
    const light = 1 - sstep(0, 0.16, age),
      lip = streamline(0.042),
      neck = streamline(0.08),
      cap = streamline(front);
    f.above.lineS(...source, ...lip, '#ffe9b8', light);
    f.above.lineS(lip[0], lip[1] + 1, ...neck, '#d49668', light * 0.83);
    oval(f.above, cap[0], cap[1], 6.4 + (2 * age) / 0.16, 4.5, '#655962', light);
    oval(f.above, cap[0] + wind * 1.2, cap[1] - 1.6, 5.6, 3.9, '#bdb2a9', light * 0.98);
    f.above.lineS(cap[0] + wind * 5, cap[1] - 1, cap[0] + wind * 3, cap[1] - 3, '#e0d4ba', light);
    f.above.lineS(cap[0] + wind * 3, cap[1] - 3, cap[0] - wind, cap[1] - 4, '#c9bba7', light);
  }
  if (age >= travel) {
    const down = age - travel,
      fade = clamp01((1.04 - age) * 5);
    for (let i = 0; i < 15; i++) {
      const arrived = down - i * 0.024;
      if (arrived < 0) break;
      const x = landing[0] + wind * i * 3.9,
        y = landing[1] + Math.sin(i * 0.8) * 1.8;
      const size = 3 + 4 * sstep(0, 0.1, arrived),
        r = size * (1 - 0.022 * i);
      oval(f.under, x, y + 1, r * 1.48, r * 0.42, '#514852', fade);
      oval(f.under, x + wind, y, r * 1.29, r * 0.27, '#92817c', fade * 0.86);
      if (arrived < 0.28) {
        const lift = Math.sin(Math.PI * clamp01(arrived / 0.28)) * r * 0.56;
        oval(f.above, x + wind * 1.2, y - lift, r * 1.06, r * 0.61, '#72676d', fade * 0.93);
        oval(f.above, x + wind * r * 0.42, y - lift - r * 0.38, r * 0.62, r * 0.33, '#b0a296', fade * 0.82);
      }
    }
  }
}
function lavaTongue(
  p: Pen,
  x: number,
  y: number,
  h: number,
  width: number,
  lean: number,
  hot: string,
  alpha: number,
) {
  const midX = x + lean * 0.39,
    tipX = x + lean;
  p.col('#9b4739', alpha);
  fillPoly(p, [
    x - width,
    y,
    x - width * 0.93,
    y - h * 0.23,
    midX - width * 0.74,
    y - h * 0.61,
    tipX - width * 0.2,
    y - h * 0.89,
    tipX,
    y - h,
    tipX + width * 0.39,
    y - h * 0.81,
    midX + width * 0.57,
    y - h * 0.5,
    x + width,
    y - h * 0.13,
    x + width * 0.72,
    y,
  ]);
  p.col(hot, alpha);
  fillPoly(p, [
    x - width * 0.49,
    y,
    x - width * 0.35,
    y - h * 0.24,
    midX - width * 0.22,
    y - h * 0.59,
    tipX,
    y - h * 0.94,
    midX + width * 0.25,
    y - h * 0.46,
    x + width * 0.32,
    y - h * 0.18,
    x + width * 0.49,
    y,
  ]);
  p.lineS(x - 1, y - 1, midX, y - h * 0.48, '#ffe7a0', alpha * 0.91);
}
function pillars(f: FxInput) {
  const primary = f.hits[0],
    born = f.pointAt(primary, 'fist');
  const final = (Math.round(f.duration * 24) - 1) / 24;
  const remaining = 1 - sstep(final - 5 / 24, final, f.t);
  // All three fissures drain into their own crust before the last frame enters idle.
  const basin = (p: Pen, x: number, y: number, r: number, age: number) => {
    const grow = 0.28 + 0.72 * sstep(0, 0.105, age),
      rx = r * grow * (0.24 + 0.76 * remaining);
    const heat = (1 - sstep(0.07, 0.34, age)) * remaining;
    const shades = ['#574249', '#854c43', '#b46b45', '#e29a54', '#ffd27a'];
    const shade = shades[Math.min(4, Math.floor(heat * 5))];
    oval(p, x, y, rx + 1.3, rx * 0.36 + 1.1, '#392b32', remaining * 0.9);
    oval(p, x, y - 0.6, rx, Math.max(0.6, rx * 0.29), shade, remaining);
    p.lineS(
      x - rx * 0.45,
      y + 0.4,
      x + rx * 0.25,
      y - 0.6,
      heat > 0.55 ? '#ffdc8e' : '#8c5e4e',
      remaining * (0.37 + 0.58 * heat),
    );
  };
  heatedStroke(f, 'fist', primary, '#ef9950', 2);
  if (f.t >= primary) paintImpact(f, 'under', 'fist', born, (p, x, y) => basin(p, x, y, 6, f.t - primary));
  for (let i = 0; i < 3; i++) {
    const socket = 'pillar' + i,
      hit = f.hits[i + 1];
    if (hit === undefined) continue;
    const target = f.pointAt(hit, socket),
      [x, y] = target,
      age = f.t - hit;
    if (f.t >= primary) {
      let prev = born;
      const reach = clamp01((f.t - primary) / (hit - primary));
      for (let k = 1; k <= 12 && (k - 1) / 12 < reach; k++) {
        const u = Math.min(k / 12, reach),
          next: XY = [
            lerp(born[0], x, u),
            lerp(born[1], y, u) + Math.sin(u * 6 * Math.PI) * 3 * Math.sin(u * Math.PI),
          ];
        f.under.lineS(
          ...prev,
          ...next,
          remaining > 0.56 ? '#da7547' : '#7e5045',
          remaining * clamp01(1.4 - (f.t - primary)),
        );
        prev = next;
      }
    }
    if (age < 0) {
      ripple(f.under, x, y, 10 + i, 0.35, '#f1a64d', 0.77, sstep(primary, hit - 0.04, f.t));
      continue;
    }
    paintImpact(f, 'under', socket, target, (p, x, y) => basin(p, x, y, 12 + i, age));
    // The first basin fans sideways, the second forks and the last rises in a
    // thin white spire. Each silhouette jumps above its own lip on its birth frame.
    const duration = [0.64, 0.53, 0.41][i],
      fade = clamp01((duration - age) / 0.16) * remaining;
    if (fade <= 0) continue;
    const pressure = Math.sin(Math.PI * clamp01((age + 0.037) / duration)) ** 0.6;
    const h = (i === 2 ? 72 * (0.43 + 0.57 * sstep(0, 1 / 24, age)) : [30, 50][i] * pressure) * remaining,
      lean = [-12, 6, -3][i];
    if (i === 0) {
      lavaTongue(f.above, x - 2, y, h, 5.9, lean, '#ee944a', fade);
      lavaTongue(f.above, x + 2, y, h * 0.65, 3.7, 6, '#e57c42', fade);
    } else if (i === 1) {
      lavaTongue(f.above, x - 1, y, h * 0.86, 4.2, -8, '#ef9149', fade);
      lavaTongue(f.above, x + 1, y, h, 5, lean, '#ffc263', fade);
    } else {
      lavaTongue(
        f.above,
        x,
        y,
        h,
        2 + 3 * remaining,
        lean * remaining,
        remaining > 0.63 ? '#ffd47a' : remaining > 0.24 ? '#e18e51' : '#956044',
        fade,
      );
      lavaTongue(f.above, x - 2, y, h * 0.51, 2.5, -8, '#f28e45', fade);
      if (remaining > 0.33)
        oval(f.above, x + lean * remaining, y - h - 2, 2 * remaining, 3.2 * remaining, '#ffe8a3', fade);
    }
    f.above.lineS(x - 4, y, x + 2, y - 1, '#ffd379', fade);
    for (let k = 0; k < 3; k++) {
      const t = age - k * 0.042;
      if (t < 0 || t > 0.32) continue;
      const xx = x + lean + (k - 1) * 23 * t,
        yy = y - h * 0.76 - t * (38 + 9 * k) + 110 * t * t;
      f.above.lineS(xx, yy + 1, xx + 1, yy - 1, '#f2ac5e', fade * 0.9);
    }
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
      if (t < 77 / 24) oval(under, feet[0], feet[1] + 1, 8 + 5 * sstep(0.6, 2.7, t), 2.1, '#24202b', 0.55);
      if (t > 1.02) fissure(under, 'titan-awakens', 80, ...feet, t - 1.02, 36, '#e79750', '#5b3b36', 1.63);
      const hatch = 77 / 24;
      if (t >= hatch) {
        const age = t - hatch,
          edge = f.pointAt(hatch, 'fist'),
          opening = f.pointAt(hatch, 'vent'),
          fade = clamp01(1 - age / 0.75);
        // One half is held by the rig; heat escapes the opened vent as small pieces skid out of the other side.
        paintImpact(f, 'above', 'vent', opening, (p, x, y) => {
          oval(p, x, y, 3 + 2 * sstep(0, 0.12, age), 1.8, '#ffb76d', fade);
        });
        paintImpact(f, 'above', 'fist', edge, (p, x, y) =>
          shard(p, x + age * 7, y + age * 3, 4.5, 2, age * 2, '#553d41', '#c77d57', fade),
        );
        dust(
          above,
          465,
          age,
          ...opening,
          9,
          -Math.PI / 2,
          0.48,
          7,
          16,
          2,
          6,
          -8,
          0.74,
          3,
          0.61,
          (i) => i * 0.026,
        );
        chunks(under, 333, age, ...edge, 11, 0, 3.14, 12, 29, 20, 27, [0.4, 0.75], 0.34, 1);
      }
      return;
    }
    case 'phase': {
      const hit = 25 / 24,
        heat = sstep(0.2, hit, t),
        sole = f.points.foot,
        core = f.points.chest;
      if (heat > 0) {
        const mid: XY = [lerp(sole[0], core[0], 0.45) - 4, lerp(sole[1], core[1], 0.45)];
        const tip: XY = [lerp(mid[0], core[0], heat), lerp(mid[1], core[1], heat)];
        above.lineS(...sole, ...mid, '#a25a41', 0.63 * heat);
        above.lineS(...mid, ...tip, '#ed9951', 0.78 * heat);
      }
      if (t >= hit)
        paintImpact(f, 'above', 'chest', core, (p, x, y) => {
          flare(
            p,
            x,
            y,
            3 + 4 * Math.sin(sstep(hit, hit + 0.35, t) * Math.PI),
            '#ffc575',
            clamp01(1.55 - t * 0.55),
          );
        });
      fissure(under, 'titan-molts', 145, ...sole, t - 0.24, 44, '#eaa358', '#754336', 1.42);
      return;
    }
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
      if (t > 0.48) chunks(under, 834, t - 0.48, ...feet, 7, 0, 3.14, 11, 18, 19, 24, [0.5, 0.9], 0.25, 1);
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
