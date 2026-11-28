import { ellFill, oval, progress, scatter, shard, pathSmear } from '../fx/field';
import { fillPoly, type Pen } from '../fx/pen';
import { paintImpact, paintMaterial, paintSocketTrail } from '../technique-fx';
import type { Creature, FxInput, XY } from '../types';

const tau = 2 * Math.PI;
const amber = ['#51382f', '#986138', '#d99b48', '#ffdf88'];
const moss = ['#303e39', '#586342', '#94a452', '#e4da89'];
const pink = ['#673e4b', '#ab6769', '#e8ad93', '#fff2c9'];
const dirt = ['#393535', '#775540', '#bc8859', '#e8c58a'];
function acorn(p: Pen, pt: XY, r: number, angle: number, a = 1) {
  const ca = Math.cos(angle),
    sa = Math.sin(angle);
  const v = (x: number, y: number): XY => [pt[0] + r * (ca * x - sa * y), pt[1] + r * (sa * x + ca * y)];
  const shape = (ink: string, coords: number[][]) => {
    p.col(ink, a);
    fillPoly(
      p,
      coords.flatMap(([x, y]) => v(x, y)),
    );
  };
  shape(amber[0], [
    [-0.9, -0.4],
    [-0.75, 0.38],
    [-0.12, 1.08],
    [0.35, 0.86],
    [0.82, 0.3],
    [0.86, -0.45],
    [0.55, -0.86],
    [-0.48, -0.86],
  ]);
  shape(amber[1], [
    [-0.68, -0.22],
    [-0.53, 0.35],
    [-0.08, 0.85],
    [0.48, 0.44],
    [0.68, 0.04],
    [0.55, -0.29],
  ]);
  shape(amber[2], [
    [-0.45, -0.18],
    [-0.34, 0.36],
    [-0.1, 0.58],
    [0.18, 0.26],
    [0.22, -0.16],
  ]);
  shape('#5d543b', [
    [-0.98, -0.38],
    [-0.72, -0.86],
    [-0.32, -1.01],
    [0.42, -0.93],
    [0.86, -0.68],
    [0.96, -0.27],
    [0.14, -0.12],
  ]);
  p.lineS(...v(-0.76, -0.47), ...v(0.59, -0.33), moss[2], a);
  p.lineS(...v(-0.06, -0.85), ...v(0.26, -1.25), dirt[1], a);
  p.lineS(...v(-0.4, -0.04), ...v(-0.26, 0.35), amber[3], a);
}
function bloom(p: Pen, at: XY, r: number, a: number) {
  if (r < 0.3 || a <= 0) return;
  for (let j = 0; j < 5; j++) {
    const q = (tau * j) / 5 - 0.25,
      x = at[0] + Math.cos(q) * r * 0.6,
      y = at[1] + Math.sin(q) * r * 0.55;
    ellFill(p, [x, y], r * 0.49, r * 0.44, pink[0], a);
    ellFill(p, [x, y - 0.5], r * 0.38, r * 0.31, pink[2 + (j % 2)], a);
  }
  ellFill(p, at, r * 0.31, r * 0.28, amber[2], a);
  p.lineS(at[0] - 1, at[1] - 1, at[0], at[1] - 1, amber[3], a);
}
function goldDust(p: Pen, at: XY, n: number, age: number, spread: number, count: number) {
  for (let j = 0; j < count; j++) {
    const q = (age * 0.058 + j * 0.137) % 1,
      a = Math.sin(q * Math.PI),
      angle = j * 2.37 + n * 0.018;
    const x = at[0] + Math.cos(angle) * spread * q,
      y = at[1] - spread * q * 0.78 + Math.sin(angle) * 7 * q;
    shard(p, x, y, 1.2, -1.8, (1 + (j % 2) * 0.45) * a, amber[3], amber[1], a);
  }
}
function sprout(p: Pen, at: XY, u: number, a: number, scale: number) {
  if (u <= 0 || a <= 0) return;
  const [x, y] = at,
    h = u * scale;
  p.lineS(x + 1, y, x + 2, y - h * 0.53, dirt[0], a);
  p.lineS(x, y, x + 1, y - h * 0.5, moss[2], a);
  p.lineS(x + 1, y - h * 0.5, x - 2, y - h, moss[1], a);
  for (let j = 0; j < 4; j++) {
    const s = j % 2 ? 1 : -1,
      base = y - h * (0.27 + j * 0.13),
      endX = x + s * h * (0.4 - j * 0.05),
      endY = base - h * 0.23;
    p.lineS(x, base, endX, endY, moss[0], a);
    shard(p, endX, endY, s * 4 * u, -2.2 * u, 2 * u, moss[3], moss[1], a);
  }
  bloom(p, [x - 2, y - h], 5 * u, a);
}
// A nut released by the small actor crosses the sky, lands in the great palm,
// then follows that same palm all the way down to the planting site.
function sow(f: FxInput, n: number) {
  const land = 63,
    plant = 78;
  if (n >= 23 && n <= plant + 5) {
    let at: XY;
    let turn = 0;
    if (n < land) {
      const from = f.pointAt(23 / 24, 'squirrelNut'),
        to = f.pointAt(land / 24, 'handL');
      const u = progress(n, 23, land),
        arc = 4 * u * (1 - u);
      const apex = Math.max(9, f.pointAt(42 / 24, 'crownTop')[1] - 63);
      at = [
        from[0] + (to[0] - from[0]) * u + 43 * arc,
        from[1] + (to[1] - from[1]) * u - ((from[1] + to[1]) / 2 - apex) * arc,
      ];
      turn = tau * u;
      for (let j = 1; j <= 3; j++)
        shard(f.under, at[0] - j * 2, at[1] + j * 2, 1.1, -1.7, 1, amber[3], amber[1], arc * (1 - j * 0.2));
    } else at = f.points.handL;
    paintMaterial(f, 'above', 'sowing-acorn', at, (p, x, y) =>
      acorn(p, [x, y], 6.4, turn, 1 - progress(n, plant, plant + 5)),
    );
  }
  const dim = Math.sin(Math.PI * progress(n, 10, 103));
  f.backdrop.col('#233840', dim * 0.26);
  f.backdrop.rect(0, 0, f.w, f.h);
  if (n >= plant && n < 106) {
    const at = f.pointAt(plant / 24, 'handL'),
      u = progress(n, plant, 92),
      a = 1 - progress(n, 99, 106);
    sprout(f.above, at, u, a, 19);
    // The ancient stone seats around the council clearing flower in sequence.
    for (const [i, p] of (
      [
        [37, 89],
        [77, 76],
        [194, 79],
        [224, 98],
      ] as XY[]
    ).entries()) {
      const g = progress(n, plant + i * 3, plant + i * 3 + 10);
      ellFill(f.backdrop, [p[0], p[1] - 10 * g], 13 * g, 15 * g, amber[2], 0.25 * g * a);
      sprout(f.backdrop, p, g, a, 16 + (i % 2) * 3);
    }
    oval(f.under, at, 4 + u * 35, 2 + u * 9, moss[3], a * (1 - u));
  }
}
function growthWave(f: FxInput, at: XY, age: number) {
  const u = progress(age, 0, 14),
    a = 1 - progress(age, 11, 22);
  for (let k = 0; k < 3; k++) {
    const rx = 5 + u * (24 + k * 10),
      ry = 3 + u * (7 + k * 4);
    oval(f.under, at, rx, ry, dirt[0], a);
    oval(f.under, [at[0], at[1] - 1], rx, ry, dirt[2], a * (1 - k * 0.14));
    for (let i = 0; i < 6; i++) {
      const q = ((i + k * 0.35) * tau) / 6,
        x = at[0] + rx * Math.cos(q),
        y = at[1] + ry * Math.sin(q);
      shard(f.under, x, y, Math.cos(q) * 3, -4 * (1 - u) + Math.sin(q), 1.5, dirt[3], dirt[1], a);
    }
  }
}
function quake(f: FxInput, n: number) {
  const age = n - 39;
  if (age >= 0 && age < 23) {
    const at = f.pointAt(39 / 24, 'handR');
    growthWave(f, at, age);
    for (let i = 0; i < 6; i++) {
      const u = progress(n, 39 + i * 0.9, 49 + i * 0.9),
        start = f.pointAt(39 / 24, 'crownTop');
      if (u > 0 && u < 1)
        acorn(
          f.above,
          [
            start[0] + (i - 2.5) * 12 + 8 * Math.sin(u * 3 + i),
            start[1] + (f.feet[1] - start[1] - 5) * u * u,
          ],
          3.8 + (i % 2),
          u * 3 + i,
          0.95,
        );
    }
  }
  if (n >= 48 && n < 68) {
    const from = f.pointAt(48 / 24, 'squirrelNut'),
      u = progress(n, 48, 67);
    const top = f.pointAt(57 / 24, 'crownTop');
    const rise = from[1] - Math.max(9, top[1] - 61);
    const pos: XY = [from[0] + 70 * u, from[1] + 8 * u - 4 * rise * u * (1 - u)];
    paintMaterial(f, 'above', 'herald-acorn', pos, (p, x, y) =>
      acorn(p, [x, y], 5.8, u * tau, 1 - progress(n, 64, 68)),
    );
  }
}
const hitBook: Record<string, [string, number]> = {
  tech_acorn_quake: ['handR', 39],
  tech_branch_hook: ['handL', 24],
  tech_root_step: ['footR', 25],
  tech_sap_breath: ['mouth', 25],
  tech_catkin_cast: ['boughTipR', 25],
};
function action(f: FxInput, n: number) {
  const [sock, hit] = hitBook[f.anim],
    age = n - hit,
    at = f.pointAt(hit / 24, sock);
  const ink = sock === 'mouth' ? amber : sock === 'handL' ? moss : dirt;
  if (n >= hit - 4 && n <= hit + 4) {
    pathSmear(f, sock, (hit - 4) / 24, hit / 24, 4, ink[0], ink[2], ink[3]);
    paintSocketTrail(f, 'above', sock, (hit - 4) / 24, Math.min(n, hit) / 24, {
      color: ink[3],
      width: 1,
      alpha: 1 - progress(age, 0, 4),
    });
  }
  if (age >= 0 && age < 18) {
    const a = 1 - progress(age, 7, 18);
    paintImpact(f, 'above', sock, at, (p, x, y) => {
      ellFill(p, [x, y], 3.5, 2.5, ink[1], a);
      shard(p, x, y, 2, -2, 2, ink[3], ink[2], a);
    });
  }
  if (sock === 'handR') {
    quake(f, n);
    return;
  }
  if (age < 0 || age >= 19) return;
  const u = progress(age, 0, 14),
    a = 1 - progress(age, 11, 19);
  if (sock === 'footR') {
    for (let i = -2; i <= 2; i++) {
      const x = at[0] + (i + 3) * 6 * u,
        y = at[1] + i * 3.8 * u,
        h = (9 + (i % 2) * 3) * Math.sin(u * Math.PI);
      f.under.col(dirt[0], a);
      fillPoly(f.under, [x - 4, y, x + 1, y - h, x + 4, y - 1]);
      f.under.lineS(x - 3, y, x + 1, y - h, dirt[2], a);
      shard(f.under, x + 3, y - h, 2, -2, 1, moss[3], moss[1], a);
    }
  } else if (sock === 'handL') {
    for (let j = 0; j < 8; j++) {
      const t = (age / 18 + j * 0.144) % 1;
      shard(
        f.above,
        at[0] + t * 27 - 4,
        at[1] - Math.sin(t * Math.PI) * 14 + (j % 3) * 2,
        3,
        -2 + t * 4,
        2,
        moss[3],
        moss[1],
        a,
      );
    }
  } else if (sock === 'mouth') {
    const origin = f.points.mouth,
      growth = progress(age, -0.35, 6),
      length = Math.min(96, f.w - origin[0] - 7) * growth;
    const centre = (t: number): XY => [
      origin[0] + length * t,
      origin[1] - 11 * t - 7 * Math.sin(Math.PI * t),
    ];
    // Resin catches the light on its upper surface; lower vapour stays umber.
    for (let j = 17; j >= 0; j--) {
      const t = j / 17,
        [x, y] = centre(t),
        radius = (1 + 5 * t) * growth;
      const drift = Math.sin(j * 2.1 - age * 0.42) * radius * 0.7;
      ellFill(f.above, [x, y + drift], radius * 1.8 + 0.6, radius + 0.7, amber[0], a * 0.88);
      ellFill(f.above, [x, y + drift - 0.8], radius * 1.6 + 0.6, radius * 0.75 + 0.5, amber[1], a);
      ellFill(f.above, [x, y + drift - 1.2], radius * 1.1 + 0.6, radius * 0.52 + 0.4, amber[2], a);
      if (j % 2 === 0)
        shard(f.above, x, y + drift - 1.4, 2.9, -0.9, radius * 0.42 + 0.6, amber[3], amber[2], a);
    }
    for (let j = 0; j < 11; j++) {
      const t = (age * 0.065 + j * 0.139) % 1,
        [x, y] = centre(t);
      shard(f.above, x, y + Math.sin(j + age * 0.2) * t * 11, 2 + t * 2, -1.5, 1 + t, amber[3], amber[1], a);
    }
  } else {
    const growth = progress(age, -0.2, 10);
    for (let i = 0; i < 5; i++) {
      const u = Math.max(0, Math.min(1, growth * 1.22 - i * 0.048));
      const travel = Math.min(107, f.w - at[0] - 12),
        x = at[0] + (travel - i * 2.6) * u,
        y = at[1] + (i - 2) * 11.5 * u + 8 * u * u - 11 * Math.sin(u * Math.PI);
      const angle = -0.8 + i * 0.31 + 2.1 * u,
        dx = Math.cos(angle),
        dy = Math.sin(angle),
        size = 2.1 + (i % 3) * 0.8;
      f.under.lineS(x - 10 * u, y + 4 * Math.sin(i), x - 3 * u, y, moss[2], a * 0.75);
      for (let j = -1; j <= 2; j++) {
        const cx = x + j * size * dx,
          cy = y + j * size * dy;
        ellFill(f.above, [cx, cy], size + 1.2, size + 0.7, dirt[0], a);
        ellFill(f.above, [cx, cy - 0.5], size + 0.5, size * 0.74, amber[1 + (i % 2)], a);
        f.above.lineS(cx - 1, cy - 0.8, cx + size * 0.35, cy - 1.2, amber[3], a);
      }
      f.above.lineS(
        x + 2 * size * dx,
        y + 2 * size * dy,
        x + 3.5 * size * dx,
        y + 3.5 * size * dy,
        moss[0],
        a,
      );
    }
  }
  if (age < 12) scatter(f, at, age / 24, 63, 6, ink, 0.51);
}
export const effects: Creature['effects'] = (f) => {
  const n = f.t * 24;
  if (f.anim === 'trick') {
    sow(f, n);
    return;
  }
  if (f.anim === 'squirrel_throw' && n >= 21 && n < 54) {
    const release = f.pointAt(21 / 24, 'squirrelNut'),
      u = progress(n, 21, 51);
    const top = f.pointAt(36 / 24, 'crownTop'),
      end: XY = [release[0] + 64, f.feet[1] - 3];
    const apex = Math.max(9, top[1] - 61);
    const at: XY = [
      release[0] + 64 * u,
      release[1] + (end[1] - release[1]) * u - 4 * ((release[1] + end[1]) / 2 - apex) * u * (1 - u),
    ];
    paintMaterial(f, 'above', 'squirrel-acorn', at, (p, x, y) =>
      acorn(p, [x, y], 6.1, tau * u, 1 - progress(n, 50, 54)),
    );
    return;
  }
  if (hitBook[f.anim]) {
    action(f, n);
    return;
  }
  const isPhase = f.anim === 'phase',
    hatch = f.anim === 'hatch',
    joy = f.anim === 'happy';
  if (!isPhase && !hatch && !joy) return;
  const end = hatch ? 35 : 47,
    fade = Math.sin(Math.PI * progress(n, 0, end));
  if (fade < 0.002) return;
  const source = hatch ? f.points.hollow : isPhase ? f.points.crownTop : f.points.squirrelPaw;
  const halo = joy ? 12 : isPhase ? 20 : 26;
  ellFill(f.under, source, halo * fade, halo * 0.7 * fade, amber[2], fade * 0.25);
  goldDust(f.above, source, n, n, halo + 6, isPhase ? 15 : 9);
  if ((isPhase && n > 20) || (hatch && n > 12)) {
    for (let i = 0; i < 7; i++) {
      const u = (n * 0.04 + i * 0.17) % 1;
      bloom(
        f.above,
        [source[0] + (i - 3) * 5 + 3 * Math.sin(u * 5 + i), source[1] + 3 + 18 * u],
        (1 + 2.2 * u) * fade,
        fade,
      );
    }
  }
};
