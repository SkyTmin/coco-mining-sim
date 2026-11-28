import { ellFill, oval, progress } from '../fx/field';
import { fillPoly, type Pen } from '../fx/pen';
import { paintImpact, paintMaterial, paintSocketTrail, projectileAt } from '../technique-fx';
import type { Creature, FxInput, XY } from '../types';

export const lamps = ['R0', 'L1', 'R1', 'L0'];
const tau = Math.PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function arc(a: XY, b: XY, t: number, height: number, bend = 0): XY {
  const wave = Math.sin(Math.PI * t);
  return [lerp(a[0], b[0], t) + bend * wave, lerp(a[1], b[1], t) - height * wave];
}
function firefly(p: Pen, [x, y]: XY, phase: number, alpha = 1) {
  ellFill(p, [x, y], 7, 6, '#ffd576', 0.24 * alpha);
  const wing = Math.sin(phase * 1.4) > 0 ? 3 : 2;
  for (const side of [-1, 1]) {
    ellFill(p, [x + side * 2.8, y - wing], 2.5, 1.6, '#554539', alpha);
    p.lineS(x + side, y - 1, x + side * 4, y - wing, '#e5f2c8', alpha);
  }
  ellFill(p, [x, y], 2.8, 3.3, '#422c36', alpha);
  ellFill(p, [x, y + 0.5], 2, 2.1, '#e39636', alpha);
  p.lineS(x - 1, y + 1, x + 1, y + 1, '#fff6ba', alpha);
}
function pollen(p: Pen, at: XY, u: number, count: number, color: string) {
  if (u >= 1) return;
  for (let i = 0; i < count; i++) {
    const a = (tau * (i + 0.12)) / count,
      r = (7 + (i % 4) * 3) * u;
    const x = at[0] + r * Math.cos(a),
      y = at[1] + r * Math.sin(a) * 0.74 + 3 * u * u;
    p.lineS(x, y, x + (i % 3 === 0 ? 1 : 0), y - 1, color, 1 - u);
  }
}
// Four fireflies draw distinct limbs and crown branches, leaving a dotted afterimage.
const constellation: XY[][] = [
  [
    [-22, -5],
    [-14, -9],
    [-2, -9],
    [8, -13],
    [12, -19],
    [18, -20],
    [21, -17],
    [15, -14],
    [9, -11],
  ],
  [
    [12, -19],
    [10, -24],
    [8, -28],
    [6, -27],
    [8, -28],
    [5, -30],
    [8, -28],
    [10, -24],
    [12, -26],
    [13, -30],
  ],
  [
    [-22, -5],
    [-17, -1],
    [-19, 5],
    [-25, 8],
    [-29, 8],
    [-25, 8],
    [-15, 4],
    [-9, -2],
    [3, -3],
  ],
  [
    [-14, -9],
    [-21, -11],
    [-24, -14],
    [-22, -5],
    [-12, -2],
    [2, -2],
    [7, 3],
    [13, 4],
    [9, 5],
    [4, 5],
    [-1, 1],
  ],
];
function skyPosition(f: FxInput, node: XY): XY {
  return [
    Math.max(35, Math.min(f.w - 34, f.feet[0] - 30)) + node[0] * 1.17,
    Math.max(47, f.feet[1] - 83) + node[1] * 1.14,
  ];
}
function drawTrack(p: Pen, points: XY[], u: number, alpha: number) {
  const steps = (points.length - 1) * u;
  for (let i = 0; i < Math.ceil(steps); i++) {
    const a = points[i],
      b = arc(a, points[i + 1], Math.min(1, steps - i), 0);
    p.lineS(a[0], a[1] + 1, b[0], b[1] + 1, '#975a44', alpha * 0.9);
    p.lineS(...a, ...b, '#fff1a2', alpha);
    p.lineS(a[0], a[1] - 1, a[0], a[1] + 1, '#fff6c2', alpha);
  }
  const index = Math.min(points.length - 2, Math.floor(steps));
  return arc(points[index], points[index + 1], steps - index, 0);
}
function trick(f: FxInput, n: number) {
  for (const [i, lamp] of lamps.entries()) {
    const release = 17 + i,
      home = i === 3 ? 86 : 57 + i * 4;
    if (n < release || n >= home) continue;
    const name = 'lantern' + lamp,
      stroke = constellation[i].map((v) => skyPosition(f, v));
    const start = f.pointAt(release / 24, name),
      draw = progress(n, 27, 41);
    const atEnd = stroke[stroke.length - 1];
    let at: XY;
    if (n < 27) at = arc(start, stroke[0], progress(n, release, 27), 8 + i * 2);
    else {
      at = drawTrack(f.above, stroke, draw, 1 - progress(n, 51, 60));
      if (n >= 50) {
        if (i < 3) at = arc(atEnd, f.points[name], progress(n, 50, home), 6 + i, 2 - i * 2);
        else if (n < 68) at = arc(atEnd, f.points.snout, progress(n, 50, 68), 13, 13);
        else if (n < 77) at = f.points.snout;
        else at = arc(f.pointAt(77 / 24, 'snout'), f.points[name], progress(n, 77, 86), 14, 8);
      }
    }
    firefly(f.above, at, n + i * 2);
  }
  if (n >= 34 && n < 60) {
    const u = progress(n, 34, 43),
      light = 1 - progress(n, 50, 60);
    const branches: XY[][] = [
      [
        [14, -19],
        [16, -23],
        [19, -28],
        [17, -29],
        [19, -28],
        [21, -30],
      ],
      [
        [16, -23],
        [18, -23],
        [21, -25],
      ],
      [
        [10, -23],
        [7, -23],
        [5, -25],
      ],
      [
        [7, -13],
        [10, -8],
        [13, -9],
        [15, -12],
      ],
      [
        [-9, -2],
        [-11, 2],
        [-17, 6],
      ],
    ];
    for (const line of branches)
      drawTrack(
        f.above,
        line.map((point) => skyPosition(f, point)),
        u,
        light * 0.85,
      );
  }
  if (n >= 77 && n < 85) pollen(f.above, f.pointAt(77 / 24, 'snout'), progress(n, 77, 85), 9, '#fff0b2');
}
function root(p: Pen, x: number, y: number, height: number, lean: number, alpha: number) {
  if (height < 1) return;
  const tip: XY = [x + lean, y - height],
    knee: XY = [x - lean * 0.36, y - height * 0.56];
  p.col('#403039', alpha);
  fillPoly(
    p,
    [
      x - 4,
      y + 1,
      ...knee,
      knee[0] + 1,
      knee[1] - 2,
      ...tip,
      x + lean * 0.4,
      y - height * 0.22,
      x + 4,
      y,
    ].flat(),
  );
  p.lineS(x - 1, y, ...knee, '#895435', alpha);
  p.lineS(...knee, ...tip, '#c99558', alpha);
  p.lineS(x + 1, y, x + lean * 0.36, y - height * 0.23, '#bc7847', alpha);
  p.lineS(knee[0], knee[1], knee[0] - lean * 0.7, knee[1] - height * 0.23, '#b98b56', alpha);
  p.lineS(tip[0], tip[1], tip[0] + 2, tip[1] - 1, '#bfd384', alpha);
}
function rootRing(f: FxInput, n: number) {
  if (n >= 20 && n < 29)
    paintSocketTrail(f, 'above', 'hoofFR', Math.max(19, n - 3) / 24, Math.min(25, n) / 24, {
      color: '#d4be81',
      width: 2,
      alpha: 0.82,
    });
  if (n < 25 || n >= 46) return;
  const at = f.pointAt(25 / 24, 'hoofFR'),
    u = progress(n, 25, 46),
    fade = 1 - progress(n, 38, 46);
  paintImpact(f, 'under', 'hoofFR', at, (p, x, y) => {
    ellFill(p, [x, y], 3 + u * 4, 2, '#6a4437', fade);
    p.lineS(x - 1, y, x + 1, y, '#e5cd83', fade);
    oval(p, at, 2 + 38 * progress(n, 25, 38), 1 + 12 * progress(n, 25, 38), '#af885a', fade * 0.9);
  });
  for (let i = 0; i < 10; i++) {
    const a = (tau * i) / 10,
      rx = at[0] + Math.cos(a) * 32,
      ry = at[1] + Math.sin(a) * 9;
    const h = (12 + (i % 3) * 4) * Math.sin(Math.PI * progress(n, 25 + (i % 4), 45));
    root(Math.sin(a) < 0 ? f.under : f.above, rx, ry, h, Math.cos(a) * (5 + (i % 4)), fade);
    pollen(f.above, [rx, ry - h], progress(n, 26 + (i % 4), 42 + (i % 3)), 4, '#d7b179');
  }
}
function sweep(f: FxInput, n: number) {
  if (n >= 18 && n < 29) {
    const from = Math.max(18, n - 4) / 24,
      to = Math.min(n, 25) / 24;
    if (from < to) {
      paintSocketTrail(f, 'above', 'hornTip', from, to, { color: '#a99a55', width: 2, alpha: 0.8 });
      paintSocketTrail(f, 'above', 'hornTip', Math.max(from, to - 1 / 24), to, {
        color: '#fff2ba',
        width: 1,
      });
    }
  }
  if (n < 15 || n >= 41) return;
  const at = f.pointAt(24 / 24, 'hornTip'),
    u = progress(n, 24, 41);
  if (n < 24) {
    const alpha = progress(n, 15, 19);
    const [x, y] = at;
    const p = f.above;
    p.col('#382839', alpha);
    fillPoly(p, [
      x - 9,
      y + 4,
      x - 8,
      y + 1,
      x + 2,
      y - 3,
      x + 1,
      y - 9,
      x + 4,
      y - 8,
      x + 5,
      y - 4,
      x + 10,
      y - 8,
      x + 12,
      y - 6,
      x + 6,
      y - 1,
      x - 6,
      y + 6,
    ]);
    p.col('#a66639', alpha);
    fillPoly(p, [x - 7, y + 3, x + 4, y - 3, x + 10, y - 7, x + 5, y - 1, x - 6, y + 5]);
    p.lineS(x - 6, y + 3, x + 4, y - 2, '#e1aa69', alpha);
    p.lineS(x + 3, y - 4, x + 2, y - 8, '#d49355', alpha);
    ellFill(p, [x - 7, y + 4], 2.5, 2, '#efc18a', alpha);
    p.lineS(x - 8, y + 4, x - 7, y + 3, '#8c583b', alpha);
  } else
    paintImpact(f, 'above', 'hornTip', at, (p, x, y) => {
      p.lineS(x - 2, y, x + 2, y, '#ffe7a1', 1 - u);
      for (let i = 0; i < 8; i++) {
        const a = (tau * i) / 8,
          dx = Math.cos(a),
          dy = Math.sin(a),
          r = (8 + (i % 3) * 7) * u;
        const xx = x + r * dx + 8 * u,
          yy = y + r * dy + 6 * u * u;
        p.col('#583b37', 1 - u);
        fillPoly(p, [xx - 1, yy, xx + dx * 6, yy + dy * 4, xx + 2, yy + 2, xx - 1, yy + 1]);
        p.lineS(xx, yy, xx + dx * 4, yy + dy * 3, '#d79858', 1 - u);
        p.lineS(xx, yy - 1, xx + dx * 2, yy + dy - 1, '#ffe4a4', 1 - u);
      }
    });
}
function volley(f: FxInput, n: number) {
  if (n >= 17 && n < 28)
    paintSocketTrail(f, 'above', 'lanternR0', Math.max(17, n - 3) / 24, Math.min(n, 25) / 24, {
      color: '#fbc269',
      width: 2,
      alpha: 0.8,
    });
  for (const [i, lamp] of lamps.entries()) {
    const rise = 19 + i,
      hit = 25 + i * 2,
      home = 39 + i;
    if (n < rise || n >= home) continue;
    const socket = 'lantern' + lamp,
      id = 'pollen' + i;
    const landing: XY = [Math.min(f.w - 9, f.feet[0] + 40 + i * 9), f.feet[1] - 4 + (i % 2) * 8];
    const flight = projectileAt(f, id, socket, rise / 24, hit / 24, landing, 4 + i);
    const at =
      n <= hit ? flight : arc(landing, f.points[socket], progress(n, hit + 2, home), 11 + i * 2, -9 + i * 2);
    paintMaterial(f, 'above', id, at, (p, x, y) => firefly(p, [x, y], n + i), landing[1]);
    if (n >= hit) {
      const u = progress(n, hit, hit + 8);
      paintImpact(f, 'under', id, landing, (p, x, y) => {
        p.lineS(x - 1, y, x + 1, y, '#ffeb9e', 1 - u);
        oval(p, [x, y], 1 + 10 * u, 1 + 3 * u, '#c99947', 1 - u);
      });
      pollen(f.above, landing, u, 6, '#fff1a5');
    }
  }
}
export const stagEffects: Creature['effects'] = (f) => {
  const n = f.t * 24;
  if (f.anim === 'trick') trick(f, n);
  if (f.anim === 'tech_root_ring') rootRing(f, n);
  if (f.anim === 'tech_antler_sweep') sweep(f, n);
  if (f.anim === 'tech_firefly') volley(f, n);
  if (f.anim === 'happy' && n >= 30 && n < 40)
    pollen(f.under, f.pointAt(31 / 24, 'foreR'), progress(n, 30, 40), 7, '#c9a16a');
};
