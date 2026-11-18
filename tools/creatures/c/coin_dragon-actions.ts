import { clamp01, easeIn3, easeOut, hash, lerp, sstep, TAU } from '../kit/f11-mobkit';
import { keyPose, type KeyPose } from '../kit/f14-mobkit';
import { fillPoly, flare, fly, type Pen } from '../fx/pen';
import { paintMaterial, paintImpact, paintSocketTrail, projectileAt } from '../technique-fx';
import type { Animation, FxInput, XY } from '../types';
import { grit, oval, projectile, ripple, shard, springBack } from './strike-brush';

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
    [2.48, { sx: 1.04, sy: 1.08, dy: -10, neck: 1, wings: 0.93, tail: 0.68, jaw: 0.53, flash: 0.2 }, easeOut],
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
export function pose(anim: string, t: number, side = 0) {
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
  if (anim === 'tech_dive' && side !== 0) {
    // Project the burrowing stride in the facing direction. The motion path
    // can stage the same dive against the right wall without leaving the field.
    const a = 0.48 + (side * TAU) / 16,
      stride = p.dx;
    p.dx = (stride * Math.cos(a)) / Math.cos(0.48);
    p.dy += stride * (Math.sin(a) - Math.sin(0.48)) * 0.25;
    p.rot *= Math.cos(a) / Math.cos(0.48);
  }
  if (anim === 'tech_tail') p.wings += 0.4 * springBack(t - 0.6);
  if (anim === 'tech_claw') p.tail += 0.64 * springBack(t - 0.51);
  if (anim === 'tech_chest') p.lid += 0.26 * springBack(t - 0.96);
  return p;
}
// Face, milled rim, coin stamp and cold edge, all on the native pixel grid.
function coin(p: Pen, x: number, y: number, r: number, angle: number, flat = 0, opacity = 1, silver = false) {
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
function glintTrail(f: FxInput, socket: string, hit: number, color: string, width = 1) {
  const start = hit - 4 / 24,
    end = hit + 1 / 24;
  if (f.t <= start || f.t >= end + 2 / 24) return;
  paintSocketTrail(f, 'above', socket, Math.max(start, f.t - 3 / 24), Math.min(f.t, end), {
    color,
    width,
    alpha: 0.89 * (1 - sstep(end, end + 2 / 24, f.t)),
  });
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
  flight?: { name: string; socket: string; release: number },
  terrain?: { id: string; floorY: number },
) {
  if (age < 0 || age > duration + 0.75) return;
  const { under, above } = f,
    u = clamp01(age / duration),
    end = age - duration;
  const wobble = hash(id, 927),
    spin = id + age * (12 + 6 * wobble),
    land = clamp01(end / 0.16);
  let [x, y] = flight
    ? projectileAt(f, flight.name, flight.socket, flight.release, flight.release + duration, to, apex)
    : projectile(start, to, u, apex);
  if (end > 0) {
    const b = fly(end, 19 + 11 * wobble, 320, 0.3),
      d = (12 + 15 * wobble) * b.h;
    x += Math.sign(to[0] - start[0]) * d;
    y -= b.z;
  }
  const shade = lerp(start[1] + 5, to[1], u),
    fade = clamp01((duration + 0.75 - age) / 0.31);
  oval(under, x, shade, 1.9 + 1.7 * u, 0.7 + u * 0.55, '#41342d', fade * 0.7);
  paintMaterial(f, 'above', flight?.name ?? terrain?.id ?? 'coin-' + id, [x, y],
    (pen, x, y) => coin(pen, x, y, r, spin, 0.84 * land, fade), terrain?.floorY);
  if (end >= -1e-8 && end < 0.23) {
    const mark = (pen: Pen, x: number, y: number) => {
      const radius = 2 + Math.max(0, end) * 32;
      ripple(pen, x, y, radius, 0.36, '#e1bf77', 0.82 * (1 - end / 0.23));
      pen.lineS(x, y, x + 2, y, '#fae2aa', clamp01(1 - end / 0.08));
    };
    if (flight) paintImpact(f, 'under', flight.name, to, mark);
    else mark(under, ...to);
  }
}
function breath(f: FxInput) {
  const hit = f.hits[0],
    t = f.t;
  if (t > 0.43 && t < hit) flare(f.above, ...f.points.slot, 1 + 5 * sstep(0.43, hit, t), '#ffe39b', 0.77);
  glintTrail(f, 'mouth', hit, '#f3d087');
  // Three salvos sit on different depth planes. Distances are fractions of the open
  // floor in front of the actual tooth, so no two missiles are pinned to one border.
  for (let group = 0; group < 3; group++) {
    const released = hit + (group * 2) / 24;
    if (t < released) continue;
    const from = f.pointAt(released, 'mouth'),
      eye = f.pointAt(released, 'eye');
    const heading = Math.sign(from[0] - eye[0]) || 1;
    const space = Math.max(4, heading > 0 ? f.w - 14 - from[0] : from[0] - 14);
    const reach = Math.min(103, space);
    const age = t - released;
    if (age < 0.11)
      paintImpact(f, 'above', 'mouth', from, (p, x, y) => {
        coin(p, x + heading * age * 11, y, 3.2, 0.3 + age * 5, 0.13, clamp01((0.11 - age) * 15));
      });
    for (let i = 0; i < 4; i++) {
      const fraction = [0.8, 0.62, 0.44][group] + (i - 1.5) * 0.116;
      const end: XY = [
        from[0] + heading * reach * fraction,
        f.feet[1] + [-19, 1, 23][group] + (i - 1.5) * 4.8,
      ];
      const airtime = ([8, 9.5, 11][group] + i * 0.17) / 24;
      const height = [25, 14, 6][group] + (i - 1.5) * 3.0;
      mintedFlight(f, from, end, age, airtime, height, group * 4 + i, 2.7 + group * 0.59 + i * 0.08, {
        name: 'breath-' + group + '-' + i,
        socket: 'mouth',
        release: released,
      });
    }
  }
}
function clampX(f: FxInput, x: number) {
  return Math.max(6, Math.min(f.w - 7, x));
}
function tail(f: FxInput) {
  const beat = f.hits[0],
    age = f.t - beat;
  glintTrail(f, 'tail', beat, '#f3d58a', 2);
  if (age < 0) return;
  const hit = f.pointAt(beat, 'tail'),
    dir = Math.sign(hit[0] - f.feet[0]) || -1;
  const floor = hit[1];
  paintImpact(f, 'under', 'tail', hit, (pen, x, y) => {
    oval(pen, x, y, 13, 4, '#48382a', clamp01(1 - age));
    pen.lineS(x - 4, y + 1, x + 4, y, '#e8bb75', clamp01(0.9 - age));
  });
  ripple(f.under, hit[0], floor, 7 + age * 32, 0.34, '#c6a168', clamp01(1 - age * 1.7));
  for (let i = 0; i < 12; i++) {
    const to: XY = [clampX(f, hit[0] + dir * (13 + hash(i, 84) * 41)), floor + (hash(i, 233) - 0.45) * 36];
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
  paintMaterial(f, 'above', 'purse-tie', tie, (pen, x, y) => shard(pen, x, y, 6, 1.5, age * 9, '#604337', '#ba865b', clamp01(1 - age / 0.44)), floor);
}
function chest(f: FxInput) {
  const { t, points, under, above, feet } = f,
    hit = f.hits[0],
    age = t - hit;
  glintTrail(f, 'chest', hit, '#f4cf79', 2);
  if (t > 0.37 && age < 0.17) flare(above, ...points.chest, 3 + 6 * sstep(0.38, 0.91, t), '#ffdb84', 0.77);
  if (age < 0) return;
  const edge = f.pointAt(hit, 'chest');
  paintImpact(f, 'above', 'chest', edge, (p, x, y) => {
    p.lineS(x - 4, y + 1, x + 4, y - 1, '#fff4bc', clamp01((0.24 - age) * 6));
    p.lineS(x - 3, y + 2, x + 3, y, '#b17d43', clamp01((0.24 - age) * 6));
  });
  const [x, y] = edge,
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
  const hit = f.hits[0],
    age = f.t - hit;
  for (const [i, socket] of ['clawL', 'claw', 'clawR'].entries()) {
    glintTrail(f, socket, hit, i === 1 ? '#f8f1d8' : '#9daea6', 1);
    if (age < 0) continue;
    const tip = f.pointAt(hit, socket),
      prior = f.pointAt(hit - 1 / 48, socket);
    let dx = tip[0] - prior[0],
      dy = (tip[1] - prior[1]) * 0.38,
      len = Math.hypot(dx, dy);
    if (len < 0.01) {
      dx = 1;
      dy = 0;
      len = 1;
    }
    const cut = 2 + 15 * sstep(0, 0.15, age);
    paintImpact(f, 'under', socket, tip, (p, x, y) => {
      p.lineS(x, y, x + (cut * dx) / len, y + (cut * dy) / len, '#433830', clamp01(1 - age * 1.45));
      p.lineS(
        x,
        y + 1,
        x + (cut * dx) / len,
        y + (cut * dy) / len + 1,
        '#c8a979',
        0.78 * clamp01(1 - age * 1.45),
      );
    });
    grit(f.above, ...tip, age, 4 + i, 914 + i, '#ffd67c');
  }
}
function rain(f: FxInput, show = false) {
  const release = show ? 84 / 24 : f.hits[0],
    waves = show ? [92 / 24, 96 / 24, 100 / 24] : f.hits.slice(1),
    socket = show ? 'slot' : 'claw',
    source = f.pointAt(release, socket);
  glintTrail(f, socket, release, '#e5c477', 2);
  if (f.t >= release && f.t < release + 0.13)
    paintImpact(f, 'above', socket, source, (p, x, y) =>
      coin(p, x, y, 4, 0.42, 0.12, 1 - (f.t - release) / 0.13),
    );
  for (let i = 0; i < 21; i++) {
    const wave = Math.floor(i / 7),
      which = i % 7,
      hit = waves[wave],
      age = f.t - release;
    if (hit === undefined || age < 0 || f.t > hit + 0.75) continue;
    const x = clampX(f, f.feet[0] + [-54, 44, 16][wave] + (which === 0 ? 0 : (hash(i, 617) - 0.5) * 22));
    const y = f.feet[1] + [9, -4, 24][wave] + (which === 0 ? 0 : (hash(i, 91) - 0.5) * 13);
    const name = (show ? 'show-rain' : 'rain') + (wave + 1) + (which === 0 ? '' : '-' + which);
    if (f.t < hit) oval(f.under, x, y, 2 + 2 * sstep(release, hit, f.t), 1.2, '#534133', 0.57);
    mintedFlight(
      f,
      source,
      [x, y],
      age,
      hit - release,
      30 + 17 * hash(i, 118),
      100 + i,
      2.5 + 1.9 * hash(i, 717),
      { name, socket, release },
    );
  }
}
function dive(f: FxInput) {
  const { t, feet } = f;
  const [entry, exit] = f.hits;
  glintTrail(f, 'mouth', entry, '#dfb16d', 2);
  // At exit the last submerged samples are below the marble, outside the exposed
  // muzzle. Its visible stroke starts at the lip, after the one-frame contact hold.
  if (t >= exit + 2 / 24 && t <= exit + 4 / 24) {
    const from = Math.max(exit, t - 2 / 24);
    if (f.pointAt(from, 'mouth')[1] <= f.pointAt(exit, 'mouth')[1] + 1)
      paintSocketTrail(f, 'above', 'mouth', from, t, {
        color: '#f2d48f',
        width: 1,
        alpha: 0.76 * (1 - sstep(exit + 3 / 24, exit + 4 / 24, t)),
      });
  }
  const burrow = f.pointAt(entry, 'mouth');
  const emerge = f.pointAt(exit, 'mouth');
  for (const [i, hit] of f.hits.entries()) {
    const age = t - hit;
    if (age < 0) continue;
    const center = f.pointAt(hit, 'mouth'),
      y = center[1],
      dir = (i ? -1 : 1) * (Math.sign(burrow[0] - feet[0]) || 1);
    paintImpact(f, 'above', 'mouth', center, (pen, x, y) => {
      // A pair of edge-on coins is pushed apart exactly where the snout enters the brushed pile.
      for (const side of [-1, 1])
        coin(
          pen,
          x + side * age * 21,
          y - 3 * Math.sin(sstep(0, 0.24, age) * Math.PI),
          3.4,
          age * 7 + side * 0.3,
          0.55,
          clamp01((0.36 - age) * 5),
        );
    });
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
        undefined,
        { id: 'ridge-' + i + '-' + j, floorY: y },
      );
    }
    ripple(f.under, center[0], y, 5 + age * 38, 0.34, '#cda764', clamp01(1 - age * 2));
  }
  if (t > entry && t < exit) {
    const u = sstep(entry, exit, t);
    const x = lerp(burrow[0], emerge[0], u),
      y = lerp(burrow[1], emerge[1], u);
    for (let j = -3; j <= 3; j++) {
      const pos: XY = [x + j * 3.6, y - (4 - Math.abs(j)) * 2];
      paintMaterial(f, 'above', 'ridge-wake-' + j, pos, pen => coin(pen, ...pos, 3.6, j * 0.7 + t * 6, 0.53, 0.87), y);
    }
    f.under.lineS(burrow[0], burrow[1] + 4, x, y + 4, '#91683f', 0.88);
  }
}
function hoard(f: FxInput) {
  const [entry, exit] = f.hits.length >= 2 ? f.hits : [22 / 24, 34 / 24],
    at = f.pointAt(entry, 'mouth'),
    next = f.pointAt(exit, 'mouth');
  const distance = Math.hypot(next[0] - at[0], next[1] - at[1]);
  const stations = Math.max(2, Math.ceil(distance / 5));
  // The leading lip passes through each of the two actual snout contacts.
  // Rear and front ranks use distinct layers so the head can vanish into them.
  for (let j = -3; j <= stations + 3; j++) {
    const u = clamp01(j / stations),
      ridgeX = lerp(at[0], next[0], u),
      ridgeY = lerp(at[1], next[1], u);
    const tangent = Math.sign(next[0] - at[0]) || 1;
    const edge = j < 0 ? j : Math.max(0, j - stations),
      x = ridgeX + edge * 4 * tangent,
      y = ridgeY + Math.abs(edge) * 2.4;
    const taper = clamp01(1 - Math.abs(edge) / 4);
    oval(f.under, x + 1, y + 6, 6.2, 3.4, '#54432f', 0.66);
    for (let row = -2; row <= 2; row++) {
      const noise = hash(j, row, 743);
      const pos: XY = [x + (Math.abs(row) % 2) * 2.3, y + row * 2.85 + (noise - 0.5) * 1.7];
      // This standing mound is the ground surface that the later flights displace.
      paintMaterial(f, row < 0 ? 'under' : 'above', 'coin-bank', pos, pen => coin(
        pen,
        ...pos,
        (2.8 + 0.62 * (row + 2) + noise * 0.55) * (0.54 + 0.46 * taper),
        0.4 + noise * 0.97,
        0.56 + 0.11 * row,
        1,
      ), ridgeY + Math.abs(edge) * 2.4 + 6);
    }
  }
}
function tokenHalves(f: FxInput) {
  const { t, under, feet } = f;
  const opening = 60 / 24,
    split = 55 / 24;
  if (t < split) {
    const die = f.points.claw;
    oval(under, die[0], feet[1] + 1, 5 + 7 * sstep(0, opening, t), 2.5, '#3c332b', 0.56);
  } else {
    const to = f.pointAt(opening, 'claw'),
      from = f.pointAt(split - 1 / 24, 'claw'),
      grip = sstep(split, opening, t),
      edge: XY = [lerp(from[0], to[0], grip), lerp(from[1], to[1], grip)],
      age = t - split;
    if (age < 0.9) {
      const shift = 3 * sstep(split, opening, t) + 15 * sstep(opening, opening + 0.3, t),
        fade = clamp01((0.9 - age) * 2.5);
      paintImpact(f, 'above', 'claw', edge, (p, x, y) => {
        for (const side of [-1, 1]) {
          // A serrated surface exposes the bright core of each broken mint blank.
          for (let j = -13; j <= 13; j++) {
            const width = Math.round(Math.sqrt(169 - j * j) * 0.59),
              xx = x + side * (shift + ((j + 15) % 5) * 0.48);
            p.lineS(xx, y + j + shift * 0.2, xx + side * width, y + j + shift * 0.2, '#bc8a47', fade);
            p.lineS(xx, y + j + shift * 0.2, xx + side, y + j + shift * 0.2, '#f6d88f', fade);
          }
        }
      });
    }
  }
}
export function props(f: FxInput) {
  if (f.anim === 'tech_dive') hoard(f);
  if (f.anim === 'show') tokenHalves(f);
}
function showCoin(f: FxInput) {
  const { t, above } = f,
    slot = 84 / 24,
    caught = 104 / 24;
  if (t >= slot) rain(f, true);
  if (t >= slot && t <= caught) {
    const to = f.pointAt(caught, 'mouth'),
      pos = projectileAt(f, 'last-mint', 'slot', slot, caught, to, 25);
    if (t < caught) paintMaterial(f, 'above', 'last-mint', pos, (pen, x, y) => coin(pen, x, y, 4.8, 0.38 + (t - slot) * 5, 0.11));
  }
  if (t >= caught && t < caught + 0.14)
    paintImpact(f, 'above', 'mouth', f.points.mouth, (p, x, y) => {
      const fade = clamp01((caught + 0.14 - t) * 9);
      p.lineS(x, y, x + 2, y - 2, '#fff1c1', fade);
      p.lineS(x + 3, y - 3, x + 4, y - 3, '#fbd18a', fade * 0.78);
    });
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
      paintMaterial(f, 'above', 'happy-coin', p, (pen, x, y) => coin(pen, x, y, 4.2, 5 * f.t, 0.04, clamp01((0.91 - f.t) / 0.08)));
      return;
    }
    case 'hatch': {
      if (f.t > 0.78)
        mintedFlight(f, f.pointAt(0.78, 'mouth'), [f.feet[0] + 65, f.feet[1] + 6], f.t - 0.78, 0.37, 12, 91);
      return;
    }
    case 'phase': {
      const hit = 25 / 24,
        age = f.t - hit;
      if (age >= 0) {
        const core = f.points.slot;
        paintImpact(f, 'above', 'slot', core, (p, x, y) =>
          p.lineS(x - 3, y + 1, x + 4, y - 1, '#ffe6a4', clamp01((1 - age) * 2)),
        );
        const up = clamp01(age / 0.62),
          tip = f.points.tail;
        for (let i = 1; i <= 8; i++) {
          const k = i / 9,
            dt = up - k;
          if (dt < 0 || dt > 0.24) continue;
          const x = lerp(core[0], tip[0], k),
            y = lerp(core[1], tip[1], k) - Math.sin(k * Math.PI) * 6;
          paintMaterial(f, 'above', 'mint-scale-' + i, [x,y], pen => coin(pen, x, y, 2.2 + 1.1 * Math.sin(k * Math.PI), 0.5 + dt * 7, 0.51, clamp01(1 - dt / 0.24)));
        }
        oval(
          f.under,
          f.feet[0],
          f.feet[1] + 2,
          21 * sstep(0, 0.19, age),
          3,
          '#d7ac60',
          0.33 * clamp01(1 - age),
        );
      }
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
