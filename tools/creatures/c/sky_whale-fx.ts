import { ellFill, oval, progress, shard, pathSmear } from '../fx/field';
import { fillPoly, type Pen } from '../fx/pen';
import { paintImpact, paintSocketTrail } from '../technique-fx';
import type { Creature, FxInput, XY } from '../types';
const tau = Math.PI * 2;
const cloud = ['#353c5c', '#566680', '#8cabc0', '#e5e7cf'];
const aurora = ['#443455', '#836484', '#b59bc1', '#f2dde2'];
const lamp = ['#714a43', '#b57848', '#ebae63', '#fff1ba'];

function star(p: Pen, [x, y]: XY, r: number, pal: string[], a = 1) {
  if (r <= 0.25 || a <= 0) return;
  for (let i = 0; i < 2; i++) {
    const h = r * (i ? 0.72 : 1);
    p.col(pal[i ? 2 : 0], a);
    fillPoly(p, [
      x,
      y - h,
      x + h * 0.29,
      y - h * 0.28,
      x + h,
      y,
      x + h * 0.28,
      y + h * 0.28,
      x,
      y + h,
      x - h * 0.28,
      y + h * 0.28,
      x - h,
      y,
      x - h * 0.29,
      y - h * 0.28,
    ]);
  }
  p.lineS(x - r * 0.45, y, x + r * 0.45, y, pal[3], a);
  p.lineS(x, y - r * 0.63, x, y + r * 0.35, pal[3], a);
}
function vapour(p: Pen, at: XY, r: number, angle: number, a: number, palette = cloud) {
  for (let i = 0; i < 5; i++) {
    const theta = angle + (i * tau) / 5,
      rad = r * (0.38 + 0.04 * (i % 3)),
      x = at[0] + Math.cos(theta) * r * 0.5,
      y = at[1] + Math.sin(theta) * r * 0.34;
    ellFill(p, [x, y + 0.8], rad * 1.35, rad, palette[0], a * 0.8);
    ellFill(p, [x, y], rad * 1.25, rad * 0.86, palette[1], a * 0.94);
    ellFill(p, [x - 0.45, y - rad * 0.25], rad * 0.92, rad * 0.55, palette[2], a);
    if (i % 2 === 0) p.lineS(x - rad * 0.4, y - rad * 0.66, x + rad * 0.25, y - rad * 0.69, palette[3], a);
  }
}
function rings(f: FxInput, at: XY, age: number, pal: string[], span: number) {
  const u = progress(age, 0, 14),
    fade = 1 - progress(age, 8, 21);
  for (let i = 0; i < 3; i++) {
    const rx = 2 + u * (span - i * 4),
      ry = 2 + u * (span * 0.42 - i * 2);
    oval(f.under, at, rx, ry, pal[0], fade * 0.8);
    oval(f.under, [at[0], at[1] - 0.9], rx, ry, pal[2], fade);
    oval(f.under, [at[0], at[1] - 1.4], rx, ry, pal[3], fade * 0.9, 3.5, 5.7);
  }
}
const starWhale: XY[] = [
  [12, -3],
  [7, -8],
  [-2, -9],
  [-10, -6],
  [-16, -2],
  [-21, -5],
  [-23, -1],
  [-20, 2],
  [-24, 5],
  [-17, 5],
  [-12, 1],
  [-7, 5],
  [0, 7],
  [5, 6],
  [12, 2],
  [12, -3],
];
function constellation(p: Pen, at: XY, k: number, amount: number, alpha: number) {
  if (alpha <= 0 || amount <= 0) return;
  const pt = (point: XY): XY => [at[0] - point[0] * k, at[1] + point[1] * k];
  for (let i = 1; i < starWhale.length; i++) {
    if (i - 1 >= amount * (starWhale.length - 1)) break;
    const lo = pt(starWhale[i - 1]),
      hi = pt(starWhale[i]),
      u = Math.min(1, amount * (starWhale.length - 1) - i + 1);
    p.lineS(...lo, lo[0] + (hi[0] - lo[0]) * u, lo[1] + (hi[1] - lo[1]) * u, aurora[2], alpha);
    star(p, lo, i % 3 === 0 ? 3.4 : 1.9, aurora, alpha);
  }
  if (amount > 0.8) {
    const fin = pt([0, 6]),
      tip = pt([-4, 12]);
    p.lineS(...fin, ...tip, cloud[2], alpha);
    star(p, tip, 2.7, cloud, alpha);
    star(p, pt([8, -1]), 2.8, lamp, alpha);
  }
}
function reply(f: FxInput, n: number) {
  const veil = progress(n, 9, 30) * (1 - progress(n, 94, 122));
  f.backdrop.col('#181733', veil * 0.36);
  f.backdrop.rect(0, 0, f.w, f.h);
  const fade = progress(n, 13, 30) * (1 - progress(n, 100, 123)),
    u = progress(n, 17, 52);
  const at: XY = [183 - 9 * Math.sin(Math.PI * progress(n, 34, 108)), 52 + 5 * Math.sin(n * 0.055)];
  if (n > 11 && n < 102) {
    // The lighthouse paints the constellation into the fixed upper sky.
    f.sceneryRay(f.points.lamp, at, aurora[2], fade * 0.46);
    constellation(f.backdrop, at, 1.36, u, fade);
    constellation(f.backdrop, [at[0] + 25, at[1] + 16], 0.53, progress(n, 61, 79), fade * 0.85);
  }
  const tip = f.points.finTipL;
  if (n > 48 && n < 102) {
    const age = n - 48;
    for (let i = 0; i < 10; i++) {
      const w = (age * 0.032 + i * 0.1) % 1;
      const x = tip[0] + Math.sin(w * 4 + i) * 12 * w,
        y = tip[1] + 6 - 28 * w;
      star(f.above, [x, y], (1 + 2 * (i % 3 === 0 ? 1 : 0)) * (1 - w), aurora, fade);
    }
  }
}
function spout(f: FxInput, n: number) {
  const source = f.points.blowhole,
    u = progress(n, 33, 44),
    fade = 1 - progress(n, 50, 65);
  if (n > 32 && n < 65) {
    const height = Math.min(54, source[1] - 8) * u;
    for (let i = 14; i >= 0; i--) {
      const t = i / 14,
        x = source[0] + Math.sin(t * 4 + n * 0.12) * t * 4 + t * t * 6,
        y = source[1] - height * t;
      const r = (1.8 + 7 * t * t) * u;
      vapour(f.above, [x, y], r, i * 0.34 + n * 0.08, fade);
      if (i % 3 === 1)
        star(f.above, [x + Math.sin(i * 1.8) * r, y + Math.cos(i) * 2], 2.3 + t * 1.8, lamp, fade);
    }
    const crown = progress(n, 35, 46),
      rim = ['#4c5572', '#8297ad', '#c3cccb', '#fff1ca'];
    const apex: XY = [source[0] + 5, source[1] - height];
    for (let j = 0; j < 9; j++) {
      const a = Math.PI + (j * Math.PI) / 8;
      vapour(
        f.above,
        [apex[0] + Math.cos(a) * 18 * crown, apex[1] + Math.sin(a) * 7 * crown + 5],
        (7.6 + 2.8 * (j % 3 === 0 ? 1 : 0)) * crown,
        n * 0.033 + j * 0.7,
        fade * 0.98,
        rim,
      );
    }
    for (let i = 0; i < 9; i++) {
      const t = progress(n, 39 + (i % 3), 59 + (i % 5)),
        a = Math.PI + (i * Math.PI) / 8;
      const x = source[0] + 5 + Math.cos(a) * (7 + t * 24),
        y = source[1] - height + Math.sin(a) * 12 * t + 24 * t * t;
      star(f.above, [x, y], (2 + (i % 3)) * Math.sin(Math.PI * t), i % 2 ? aurora : lamp, fade);
    }
  }
  if (n > 47 && n < 73) {
    const turn = tau * progress(n, 47, 70);
    const target: XY = [128 + 113 * Math.cos(turn), 54 + 35 * Math.sin(turn)];
    f.sceneryRay(f.points.lamp, target, lamp[3], Math.sin(Math.PI * progress(n, 47, 73)) * 0.86);
    star(f.backdrop, target, 3.6, lamp, Math.sin(Math.PI * progress(n, 47, 73)));
  }
}
const hits: Record<string, [string, number]> = {
  tech_star_spout: ['blowhole', 38],
  tech_bow_ram: ['snout', 25],
  tech_tide_paddle: ['finTipR', 25],
  tech_fluke_break: ['tailTip', 25],
  tech_beacon_watch: ['lamp', 31],
  tech_cloud_keel: ['starKeel', 25],
};
function moves(f: FxInput, n: number) {
  const [sock, hit] = hits[f.anim],
    age = n - hit,
    at = f.pointAt(hit / 24, sock);
  const ink = sock === 'lamp' ? lamp : sock === 'starKeel' ? aurora : cloud;
  if (n >= hit - 4 && n < hit + 5) {
    pathSmear(f, sock, (hit - 4) / 24, hit / 24, 3.6, ink[0], ink[2], ink[3]);
    paintSocketTrail(f, 'above', sock, (hit - 4) / 24, Math.min(n, hit) / 24, {
      color: ink[3],
      width: 1,
      alpha: 1 - progress(age, 0, 5),
    });
  }
  if (sock === 'blowhole') spout(f, n);
  if (age < 0 || age > 20) return;
  const u = progress(age, 0, 12),
    fade = 1 - progress(age, 12, 20);
  paintImpact(f, 'above', sock, at, (p, x, y) => star(p, [x, y], 3.7, ink, fade));
  if (sock === 'finTipR') {
    for (let i = 0; i < 3; i++) {
      const p: XY = [at[0] + 10 * u, at[1] + i * 2];
      for (let b = 0; b < 3; b++)
        oval(f.above, p, 5 + u * (19 + i * 2) + b, 3 + u * (10 + i * 2) + b, cloud[b + 1], fade, -1.1, 1.55);
    }
  } else if (sock === 'tailTip') {
    rings(f, at, age, cloud, 35);
    for (let i = -2; i <= 2; i++)
      vapour(
        f.above,
        [at[0] + i * 8 * u, at[1] - Math.sin(Math.PI * u) * (17 - Math.abs(i) * 3)],
        3 + 2 * u,
        i * 0.7,
        fade,
      );
  } else if (sock === 'snout') {
    for (let i = 0; i < 8; i++) {
      const theta = (i - 3.5) * 0.24;
      shard(
        f.above,
        at[0] + Math.cos(theta) * (7 + u * 19),
        at[1] + Math.sin(theta) * u * 21,
        3.2 * Math.cos(theta),
        2 * Math.sin(theta),
        1.4,
        cloud[3],
        cloud[1],
        fade,
      );
    }
  } else if (sock === 'lamp') {
    const target: XY = [212, 24];
    f.sceneryRay(f.points.lamp, target, lamp[3], fade * 0.88);
    for (let j = 0; j < 6; j++) {
      const a = (j * tau) / 6;
      star(f.backdrop, [target[0] + Math.cos(a) * 13 * u, target[1] + Math.sin(a) * 13 * u], 2.7, lamp, fade);
    }
  } else if (sock === 'starKeel') {
    rings(f, at, age, aurora, 30);
    for (let j = 0; j < 7; j++) {
      const a = (j * tau) / 7;
      star(
        f.above,
        [at[0] + Math.cos(a) * (8 + 25 * u), at[1] + Math.sin(a) * 15 * u],
        3 + 2 * (j % 2),
        aurora,
        fade,
      );
    }
  }
}
export const effects: Creature['effects'] = (f) => {
  const n = f.t * 24;
  if (hits[f.anim]) {
    moves(f, n);
    return;
  }
  if (f.anim === 'trick') {
    reply(f, n);
    return;
  }
  if (f.anim === 'show') {
    const d = progress(n, 15, 43) * (1 - progress(n, 79, 109));
    f.backdrop.col('#111128', d * 0.63);
    f.backdrop.rect(0, 0, f.w, f.h);
    if (n >= 26 && n < 64) {
      const c = f.points.cloudCenter,
        fade = Math.sin(Math.PI * progress(n, 26, 64));
      for (let j = 0; j < 9; j++) {
        const a = (j * tau) / 9 + n * 0.06;
        star(
          f.above,
          [c[0] + Math.cos(a) * (10 + (j % 4)), c[1] + Math.sin(a) * (5 + (j % 3))],
          2.2 + (j % 3),
          aurora,
          fade,
        );
      }
    }
    if (n > 46 && n < 85) {
      // A bank of night mist follows the section of the whale crossing into view.
      const u = progress(n, 47, 83),
        fade = Math.sin(Math.PI * u),
        nose = f.points.snout,
        tail = f.points.tailTip;
      const x = nose[0] * (1 - u) + tail[0] * u,
        y = nose[1] * (1 - u) + tail[1] * u;
      for (let j = 0; j < 7; j++) {
        const a = (j * Math.PI) / 6 - 0.5;
        vapour(
          f.above,
          [x + Math.cos(a) * 5, y - 15 + 4.4 * j],
          5 + (j % 3) * 1.3,
          n * 0.056 + a,
          fade * 0.92,
        );
      }
    }
    if (n >= 69 && n < 111) {
      const u = progress(n, 69, 94),
        fade = Math.sin(Math.PI * progress(n, 69, 111));
      const end: XY = [219, 43 - 16 * u];
      for (let j = -7; j <= 7; j++) {
        const edge = Math.abs(j) / 7;
        f.sceneryRay(
          f.points.lamp,
          [end[0] - edge * 5, end[1] + j * 1.7],
          lamp[edge > 0.82 ? 1 : edge < 0.34 ? 3 : 2],
          fade * (0.68 - 0.3 * edge),
        );
      }
      for (let k = 0; k < 4; k++)
        star(f.backdrop, [end[0] - k * 8, end[1] + Math.sin(k) * 6], (2 + (k % 2)) * u, lamp, fade * 0.8);
      star(f.above, f.points.lamp, 4 + 7 * fade, lamp, fade);
    }
    return;
  }
  if (!['phase', 'idle-f2', 'happy', 'hatch'].includes(f.anim)) return;
  const isPhase = f.anim === 'phase' || f.anim === 'idle-f2';
  const a =
    f.anim === 'idle-f2'
      ? 0.82
      : isPhase
        ? progress(n, 8, 42)
        : Math.sin(Math.PI * progress(n, 0, 47));
  if (a < 0.015) return;
  const origin = f.points.island;
  if (isPhase) {
    const rx = 46,
      ry = 14;
    for (let j = 0; j < 13; j++) {
      const theta = (n * tau) / (f.anim === 'idle-f2' ? 72 : 65) + (j * tau) / 13,
        x = origin[0] + rx * Math.cos(theta),
        y = origin[1] + ry * Math.sin(theta) - 8;
      const p = Math.sin(theta) < 0 ? f.under : f.above;
      if (j % 3 === 0) star(p, [x, y], 4.6, lamp, a);
      else vapour(p, [x, y], 5.6 + 1.1 * (j % 3), theta, a * 0.96);
    }
    if (f.anim === 'phase') star(f.above, f.points.lamp, 2 + 5 * a, lamp, a);
  } else {
    const tip = f.anim === 'happy' ? f.points.finTipR : f.points.blowhole;
    for (let i = 0; i < 12; i++) {
      const u = (n * 0.047 + i * 0.117) % 1;
      star(
        f.above,
        [tip[0] + (i % 2 ? 1 : -1) * Math.sin(u * 2.6) * 18, tip[1] - 26 * u + 5 * Math.cos(i)],
        (2.4 + (i % 3)) * (1 - u),
        i % 2 ? cloud : lamp,
        a,
      );
    }
    if (f.anim === 'hatch') vapour(f.under, [f.feet[0], f.feet[1] - 4], 15 + 10 * a, n * 0.07, a * 0.85);
  }
};
