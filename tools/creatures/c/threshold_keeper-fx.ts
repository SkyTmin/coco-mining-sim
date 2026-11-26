import { disc, fillPoly, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';
import {
  city,
  clamp,
  drawer,
  filed,
  ease,
  exit,
  lerp,
  lock,
  mix,
  porchTop,
  pose,
  span,
  tau,
} from './threshold_keeper-score';

type Quad = XY[];
const outline = '#49445c',
  plum = '#655369',
  dusk = '#9a7783',
  shade = '#776278',
  stone = '#b19491',
  warm = '#ddb69e',
  gold = '#ffdb98',
  ivory = '#fff1c9',
  green = '#658b89',
  ocean = '#446575';
const poly = (p: Pen, v: Quad, c: string, a = 1) => {
  p.col(c, a);
  fillPoly(p, v.flat());
};
const line = (p: Pen, A: XY, B: XY, c: string, a = 1) => {
  p.col(c, a);
  p.line(...A, ...B);
};
function circ(p: Pen, A: XY, r: number, c: string, alpha = 1) {
  if (r < 0.4) return;
  p.col(c, alpha);
  disc(p, ...A, r);
}
function oval(p: Pen, c: XY, rx: number, ry: number, color: string, alpha: number, half = 0) {
  if (rx < 1 || ry < 0.5) return;
  p.col(color, alpha);
  let last: XY | null = null,
    end = half ? Math.PI : tau;
  for (let k = 0; k <= 26; k++) {
    const a = (half === -1 ? Math.PI : 0) + (k * end) / 26;
    const q: XY = [c[0] + rx * Math.cos(a), c[1] + ry * Math.sin(a)];
    if (last) p.line(...last, ...q);
    last = q;
  }
}
function shine(p: Pen, A: XY, u: number, color = ivory) {
  if (u <= 0) return;
  const r = 1 + 5 * u;
  line(p, [A[0] - r, A[1]], [A[0] + r, A[1]], color, 0.83 * u);
  line(p, [A[0], A[1] - r], [A[0], A[1] + r], color, 0.88 * u);
  circ(p, A, 1.2, color, u);
}
function chips(p: Pen, A: XY, n: number, count: number, color = warm) {
  const u = clamp(n / 17);
  if (u <= 0 || u >= 1) return;
  for (let k = 0; k < count; k++) {
    const a = k * 2.4,
      dx = Math.cos(a) * (5 + (k % 4) * 3),
      dy = -8 - (k % 5) * 3;
    circ(p, [A[0] + dx * u, A[1] + dy * u + 14 * u * u], mix(1.6, 0.45, u), color, (1 - u) * 0.85);
  }
}
/** The same silhouette is a distant town, a pleated sheet in the hands and a city being put back. */
function skyline(p: Pen, origin: XY, size: number, fold: number, lit: number) {
  const F = (x: number, y: number): XY => [
    origin[0] + x * size * (1 - 0.34 * fold),
    origin[1] + size * (y * (1 - 0.45 * fold) + Math.sin(((x + 38) * Math.PI) / 12) * 5 * fold),
  ];
  const plane = (a: Quad, c: string) =>
    poly(
      p,
      a.map(([x, y]) => F(x, y)),
      c,
    );
  const penline = (x: number, y: number, X: number, Y: number, c: string) => line(p, F(x, y), F(X, Y), c);
  if (fold > 0.2) {
    const v = clamp((fold - 0.2) / 0.8);
    for (let k = 0; k < 6; k++) {
      const x = -35 + k * 11.7,
        y = -19 * v + (k % 2 ? 3 : -3) * v;
      plane(
        [
          [x, 4],
          [x, y],
          [x + 11.7, -19 * v + (k % 2 ? -3 : 3) * v],
          [x + 11.7, 5],
        ],
        k % 2 ? '#dac79f' : '#a5c4ad',
      );
      penline(x, y, x, 4, '#745f75');
    }
  }
  plane(
    [
      [-36, 0],
      [-22, 3],
      [-5, 1],
      [11, 6],
      [35, 0],
      [25, 9],
      [5, 15],
      [-10, 9],
      [-19, 12],
      [-28, 6],
    ],
    shade,
  );
  for (let k = 0; k < 7; k++) {
    const x = -31 + k * 9,
      h = [10, 19, 14, 29, 12, 22, 11][k],
      w = [8, 7, 8, 10, 7, 8, 7][k];
    plane(
      [
        [x - w / 2, 0],
        [x - w / 2, -h],
        [x + w / 2, -h],
        [x + w / 2, 1],
      ],
      k % 2 ? stone : dusk,
    );
    plane(
      [
        [x + w / 2 - 2, -h],
        [x + w / 2, -h],
        [x + w / 2, 1],
        [x + w / 2 - 2, 1],
      ],
      shade,
    );
    plane(
      [
        [x - w / 2 - 1, -h],
        [x + 0.8, -h - 5 - (k % 3)],
        [x + w / 2 + 1, -h],
      ],
      k % 2 ? green : plum,
    );
    penline(x - 1, -h - 4, x - w / 2, -h, warm);
    if (k === 3 || k === 5) {
      penline(x, -h - 5, x, -h - 11, plum);
      penline(x + 1, -h - 10, x + 5, -h - 9, warm);
    }
    for (let z = 0; z < Math.floor(h / 6); z++)
      for (const s of [-1, 1]) {
        const v = F(x + s * 1.85, -3 - z * 5);
        p.col(lit > 0.5 ? ivory : warm);
        p.rect(Math.round(v[0]), Math.round(v[1]), Math.max(1, Math.round(size)), Math.max(1, Math.round(2 * size)));
      }
  }
  penline(-35, 0.5, 34, 0.5, warm);
  if (fold > 0.07) {
    for (let k = 0; k <= 5; k++) {
      const x = -30 + k * 12;
      penline(x, 2, x, -10 - (k % 3) * 3, k % 2 ? gold : plum);
    }
    penline(-32, 3, 0, 8, ivory);
    penline(0, 8, 32, 2, warm);
  }
}
/** The entire far pass is an arched, double-leaf copper gate. Unlocking it opens a view into another sky. */
function horizonGate(p: Pen, open: number, breath: number) {
  const x = 93,
    y = 98,
    w = 44,
    h = 68;
  const crown = (u: number) => y - h - 13 * (1 - Math.abs(u)) ** 0.8 + 8 * Math.abs(u) ** 2;
  const arch: XY[] = [
    [x - w, y],
    [x + w, y],
  ];
  for (let k = 12; k >= 0; k--) {
    const u = k / 6 - 1;
    arch.push([x + w * u, crown(u)]);
  }
  poly(p, arch, open > 0.01 ? '#615975' : '#99828b');
  if (open > 0.01) {
    // Each strip is bounded by the gothic arch; no surrounding sky is repainted.
    for (let k = 0; k < 22; k++) {
      const u = k / 11 - 1,
        X = x + w * u,
        Z = crown(u) + 1;
      const base = y - 3 - 5 * Math.sin(k * 0.72);
      poly(
        p,
        [
          [X, Z],
          [X + 4, crown(u + 1 / 11) + 1],
          [X + 4, base],
          [X, base + 2],
        ],
        k % 4 ? '#535970' : '#5d6277',
        open,
      );
      if (k % 2 === 0) {
        line(p, [X, base], [X + 3, base - 1], '#a6c4b6', open);
        circ(p, [X + 2, Z + 7 + ((k * 19) % 32)], 0.9, k % 4 ? ivory : '#a7c9cb', open);
      }
    }
    for (let k = 0; k < 5; k++) {
      const X = x + (k - 2) * 12,
        Y = y - 11 - (k % 2) * 7;
      poly(
        p,
        [
          [X - 3, Y + 4],
          [X - 3, Y - 5],
          [X, Y - 8],
          [X + 3, Y - 5],
          [X + 3, Y + 4],
        ],
        '#b6a7a3',
        open,
      );
      poly(
        p,
        [
          [X - 1, Y + 4],
          [X - 1, Y - 4],
          [X + 1, Y - 5],
          [X + 1, Y + 4],
        ],
        '#69647d',
        open,
      );
    }
  }
  for (const side of [-1, 1]) {
    const outer = x + side * w,
      mid = x + side * w * 0.94 * open;
    const P = (u: number, z: number): XY => [mix(outer, mid, u), z + 3.2 * u * open];
    const v: XY[] = [P(0, y), P(1, y)];
    for (let k = 10; k >= 0; k--) v.push(P(k / 10, crown(1 - k / 10) + 1));
    poly(p, v, side < 0 ? '#97818c' : '#a38991');
    for (let k = 0; k < 5; k++) {
      const u = (k + 0.5) / 5;
      line(p, P(u, crown(1 - u) + 3), P(u, y - 2), side < 0 ? '#897988' : '#957d89');
    }
    for (const z of [y - 46, y - 17]) {
      line(p, P(0, z), P(0.73, z + 2), '#897988');
      circ(p, P(0.71, z + 2), 1.25, '#c0a398');
    }
    line(p, P(1, crown(0) + 1), P(1, y - 1), '#d6b39e');
    oval(p, P(0.88, y - 28), 2.4, 3.5, '#cdb095', 0.87);
    for (let k = 0; k < 13; k++) {
      const a = k / 13,
        b = (k + 1) / 13,
        A: XY = [x + side * w * a, crown(a)],
        B: XY = [x + side * w * b, crown(b)];
      poly(p, [A, B, [B[0] + 2 * side, B[1] - 3], [A[0] + 2 * side, A[1] - 3]], k % 3 ? '#a48a93' : '#b39b9a');
      if (open > 0.03) line(p, A, B, gold, open * (0.65 + 0.16 * Math.sin(breath + k * 0.3)));
    }
    for (let k = 0; k < 8; k++) {
      const a = y - k * 8.7;
      poly(
        p,
        [
          [outer - 1, a],
          [outer + side * 6, a + 1],
          [outer + side * 6, a - 7],
          [outer - 1, a - 8],
        ],
        k % 3 ? '#a58e96' : '#b19a9c',
      );
    }
  }
}
function foldedMap(p: Pen, origin: XY, u: number) {
  const y = origin[1],
    x = origin[0],
    W = 33 * u,
    H = 11 * u;
  const point = (k: number, h: number): XY => [x + (k / 4 - 0.5) * W, y + h * H + ((k % 2) * 2 - 1) * 1.35 * u];
  for (let k = 0; k < 4; k++) {
    const A = point(k, -0.31),
      B = point(k + 1, -0.31),
      C = point(k + 1, 0.75),
      D = point(k, 0.75);
    poly(p, [A, B, C, D], k % 2 ? '#e7ce99' : '#b6c3a6');
    line(p, A, B, ivory);
    line(p, C, D, '#927763');
    line(p, B, C, '#957f71');
    const a = point(k, 0.15 + 0.22 * Math.sin(k * 1.7)),
      b = point(k + 1, 0.15 + 0.22 * Math.sin((k + 1) * 1.7));
    line(p, a, b, '#568c91');
    if (k % 2 === 1) {
      const v = lerp(A, C, 0.58);
      line(p, [v[0] - 2, v[1] + 1], [v[0], v[1] - 2], '#937b79');
      line(p, [v[0], v[1] - 2], [v[0] + 2, v[1] + 1], '#937b79');
    }
  }
  const pin = point(3, 0.13);
  circ(p, pin, 1.6 * u, '#a75468');
  line(p, point(0, 0.65), point(1, 0.57), '#ad8266');
}
function worldStairs(p: Pen, angle: number, energy: number) {
  const pivot: XY = [10, 113];
  const P = (x: number, y: number): XY => [
    pivot[0] + x * Math.cos(angle) - y * Math.sin(angle),
    pivot[1] + x * Math.sin(angle) + y * Math.cos(angle),
  ];
  // A single connected stone flight and its rail rotate on a real axle next to the lock.
  poly(
    p,
    [
      [0, 89],
      [10, 88],
      [15, 94],
      [13, 113],
      [8, 116],
      [5, 110],
      [5, 100],
      [0, 98],
    ],
    outline,
  );
  line(p, [8, 96], [9, 112], stone);
  circ(p, lock, 5.3, dusk);
  oval(p, lock, 4.5, 4.5, warm, 0.95);
  circ(p, lock, 1.9, outline);
  poly(p, [P(-2, 0), P(2, 0), P(4, 38), P(-1, 38)], shade);
  line(p, P(0, 3), P(2, 37), stone);
  line(p, P(1, 12), P(17, 41), shade);
  circ(p, pivot, 4.1, plum);
  circ(p, pivot, 2.2, warm);
  const count = 26;
  for (let i = 0; i < count; i++) {
    const x = i * 7.2,
      y = 38 + x * 0.22,
      w = 7.4;
    poly(p, [P(x, y), P(x + w, y), P(x + w, y + 4), P(x, y + 4)], i % 3 ? shade : plum);
    poly(p, [P(x, y), P(x + 2, y - 2), P(x + w + 2, y - 2), P(x + w, y)], energy > 0.2 ? warm : stone);
    line(p, P(x, y), P(x + w, y), energy > 0.2 ? gold : stone);
    if (i % 4 === 0) {
      line(p, P(x + 1, y), P(x + 1, y - 8), shade);
      circ(p, P(x + 1, y - 8), 1.25, energy > 0.2 ? ivory : stone);
    }
  }
  line(p, P(0, 30), P(181, 70), energy > 0.2 ? gold : dusk, 0.9);
}
function accordion(p: Pen, root: XY, end: XY, amount: number) {
  if (amount <= 0.004) return;
  const count = 19,
    reach = lerp(root, end, amount);
  for (let i = 0; i < count; i++) {
    const a = i / count,
      b = (i + 1) / count,
      A = lerp(root, reach, a),
      B = lerp(root, reach, b);
    const bend = (u: number) => Math.sin(u * Math.PI) * (10 - amount * 4);
    A[1] += bend(a);
    B[1] += bend(b);
    const riser = mix(5, 0.6, amount) * (i % 2 ? 1 : -1);
    const farA: XY = [A[0] - 2, A[1] - 3],
      farB: XY = [B[0] - 2, B[1] - 3 + riser],
      nearA: XY = [A[0] + 3, A[1] + 3.5],
      nearB: XY = [B[0] + 3, B[1] + 3.5 + riser];
    poly(p, [nearA, nearB, [nearB[0], nearB[1] + 3], [nearA[0], nearA[1] + 4]], i % 2 ? '#615367' : ocean);
    poly(p, [farA, farB, nearB, nearA], i % 2 ? '#b2bc9f' : '#7eaa9e');
    line(p, farA, farB, ivory);
    line(p, nearB, nearA, i % 2 ? gold : warm);
    line(p, farA, nearA, ocean);
    if (i % 2 === 0) {
      line(p, [nearA[0], nearA[1] + 3], [nearB[0], nearB[1] + 7], ocean);
      circ(p, [nearB[0], nearB[1] + 7], 1.25, gold);
    }
    if (i % 3 === 0) {
      line(p, farA, [farA[0], farA[1] - 5], outline);
      circ(p, [farA[0], farA[1] - 5], 1.35, gold);
    }
  }
}
function frontSteps(p: Pen, root: XY, opened: number) {
  if (opened < 0.01) return;
  for (let i = 0; i < 8; i++) {
    const x = root[0] + i * 6.6 * opened,
      X = x + 6.6 * opened,
      y = porchTop(x, root),
      Y = porchTop(X, root);
    poly(
      p,
      [
        [x - 2, y - 2],
        [X - 2, y - 2],
        [X + 4, y + 2.5],
        [x + 4, y + 2.5],
      ],
      i % 2 ? '#b58f7c' : '#d1a58c',
    );
    poly(
      p,
      [
        [x + 4, y + 2.5],
        [X + 4, y + 2.5],
        [X + 4, Y + 4],
        [x + 4, Y + 3],
      ],
      i % 2 ? shade : plum,
    );
    line(p, [x + 4, y + 2], [X + 4, y + 2], gold);
  }
}
function sideDoor(p: Pen, open: number, lit: number) {
  if (open < 0.01) return;
  const [x, y] = exit,
    w = 11 * open,
    h = 18.5 * open;
  poly(
    p,
    [
      [x - w, y + h],
      [x - w, y - h * 0.67],
      [x - w * 0.5, y - h],
      [x + 1, y - h - 2],
      [x + 5, y - h],
      [x + 5, y + h],
    ],
    outline,
  );
  poly(
    p,
    [
      [x - w + 2, y + h - 2],
      [x - w + 2, y - h * 0.65],
      [x - w * 0.4, y - h + 2],
      [x + 5, y - h],
      [x + 5, y + h - 2],
    ],
    '#383b54',
  );
  line(p, [x - w, y + h], [x - w, y - h * 0.7], warm);
  line(p, [x - w, y - h * 0.7], [x - w * 0.4, y - h], gold);
  line(p, [x - w * 0.4, y - h], [x + 4, y - h - 2], ivory);
  line(p, [x - w - 3, y + h + 1], [x + 5, y + h + 1], warm);
  if (lit > 0.01) shine(p, [x - w * 0.6, y - h], lit);
}
export function gestures(f: FxInput) {
  const n = Math.round(f.t * 24),
    a = f.anim,
    p = pose(a, n),
    j = f.points,
    back = f.backdrop,
    front = f.above,
    under = f.under;
  // The latch has a bell pull reachable from the saddle. The ring follows the paw only after the grasp.
  if (['fidget_a', 'idle', 'look', 'fidget_b', 'idle-f2', 'sleep', 'happy', 'happy-f2'].includes(a)) {
    const origin = j.latch,
      rest: XY = [j.house[0] + 19, j.house[1] + 30],
      grasp = a === 'fidget_a' ? span(n, 13, 21, 40, 48) : 0;
    const pull = lerp(rest, j.handL, grasp),
      bow: XY = [mix(origin[0], pull[0], 0.57) + 2.8, mix(origin[1], pull[1], 0.57) + 2.4 * (1 - grasp)];
    for (const [c, s] of [
      [outline, 1],
      [warm, 0],
    ] as [string, number][]) {
      line(under, [origin[0] + s, origin[1]], [bow[0] + s, bow[1]], c);
      line(under, [bow[0] + s, bow[1]], [pull[0] + s, pull[1] - 2], c);
    }
    oval(under, pull, 2.4, 3.1, gold, 0.95);
  }
  const second = a === 'trick-f2',
    paper = a === 'trick_b-f2';
  const turn = second ? span(n, 46, 64, 131, 145) : 0,
    folding = paper ? span(n, 41, 68, 137, 150) : 0;
  horizonGate(back, turn, n * 0.09);
  worldStairs(back, -0.78 * turn, turn);
  const hand = lerp(j.handL, j.handR, 0.5);
  // The far island has a permanent iron shoe for the last tread.
  poly(
    back,
    [
      [218, 126],
      [224, 123],
      [233, 126],
      [229, 129],
      [221, 131],
    ],
    shade,
  );
  line(back, [219, 126], [229, 128], stone);
  line(back, [224, 130], [229, 120], shade);
  const side = paper ? span(n, 56, 66, 122, 134) : 0;
  const town = paper ? lerp(city, [hand[0] - side * (9 + 12 * filed(n)), hand[1] + 3.5], folding) : city;
  const crease = ease(0.43, 0.83, folding);
  if (crease < 1) skyline(folding > 0.55 ? front : back, town, mix(1, 0.12, crease), folding, paper ? folding : 0);
  if (crease > 0.01) foldedMap(front, town, crease);
  if (paper) shine(front, drawer, span(n, 110, 113, 117, 121));
  if (paper && folding > 0.02) {
    const source: XY = [city[0], city[1] + 3];
    oval(back, source, 35, 4, stone, 0.65 * folding);
    for (let k = 0; k < 6; k++)
      circ(back, [source[0] - 27 + k * 10, source[1] + 3 + 2 * Math.sin(k)], 1.25, k % 2 ? gold : warm, folding * 0.85);
    shine(
      front,
      [town[0] - 15 * (1 - 0.55 * folding), town[1] - 3],
      span(n, 48, 55, 62, 72) + span(n, 135, 141, 145, 151),
    );
  }
  // Warm puffs issue separately from the moving chimney rim, with a quiet breathing pause.
  if (!['turn', 'walk'].includes(a)) {
    const chimney = j.chimney;
    for (let k = 0; k < 3; k++) {
      const cycle = ((n + 24 * k) % 72) / 72;
      const x = chimney[0] - cycle * 7 + Math.sin(5 * cycle) * 2,
        y = chimney[1] - 3 - cycle * 15;
      const fade = Math.sin(Math.PI * cycle) * 0.38;
      circ(under, [x, y], 1.5 + cycle * 2.6, '#edccae', fade);
    }
  }
  if ((p.park || 0) > 0.02) {
    const u = p.park || 0,
      c = j.house;
    oval(under, [c[0], 170], 23 * u, 3.6 * u, outline, 0.42 * u);
    if (a !== 'show') oval(under, [j.root[0], 169], Math.max(4, 14 * (p.s || 1)), 2, outline, 0.3 * u);
  }
  if (a === 'show' || a === 'trick') {
    const open = a === 'show' ? span(n, 17, 29, 67, 81) : span(n, 21, 31, 77, 96);
    frontSteps(under, j.sill, open);
  }
  if (a === 'trick') {
    const wide = span(n, 27, 41, 102, 114),
      flare = span(n, 57, 63, 87, 99);
    sideDoor(back, wide, flare);
    if (flare > 0.02) {
      const ray = lerp(j.lintel, [exit[0] - 7, exit[1] - 19], 0.5);
      for (let k = 0; k < 19; k++) {
        const q = (n * 0.017 + k / 19) % 1,
          A = lerp(j.lintel, [exit[0] - 7, exit[1] - 19], q);
        A[1] -= Math.sin(q * Math.PI) * 24;
        circ(back, A, k % 3 === 0 ? 1.1 : 0.6, k % 3 === 0 ? gold : warm, flare * (0.48 + 0.19 * Math.sin(k)));
      }
      shine(under, j.lintel, flare * 0.8);
      shine(back, [ray[0], ray[1] - 24], flare * 0.5);
    }
    if (n >= 40 && n <= 103) line(front, [exit[0] + 1, exit[1] - 19], [exit[0] + 1, exit[1] + 17], gold, 0.64 * wide);
    for (const hit of [24, 113, 142]) chips(front, n < 50 ? j.house : j.bootR, n - hit, 7);
  } else if (a === 'trick_b') {
    const width = span(n, 36, 94, 114, 142),
      sill = j.sill;
    accordion(under, sill, [224, 129], width);
    for (const land of [66, 84, 103]) {
      chips(front, j.bootR, n - land, 8, ivory);
      shine(under, j.bootR, span(n, land - 1, land + 1, land + 3, land + 7));
    }
    shine(front, sill, span(n, 36, 42, 47, 54) + span(n, 131, 135, 140, 146));
  } else if (second) {
    const engage = span(n, 31, 36, 141, 148);
    // The same bit stays in the keyhole while the front paws are free on the stairs.
    if (engage > 0.01) {
      circ(back, lock, 5, plum, engage);
      oval(back, lock, 7, 7, gold, engage);
      if (n >= 62 && n < 135) {
        const bow = j.keyBow;
        line(front, lock, bow, gold);
        line(front, [lock[0], lock[1] + 1], [bow[0], bow[1] + 1], warm);
        oval(front, bow, 3.1, 3.3, gold, 0.99);
        line(front, lock, [lock[0] + 1, lock[1] + 2], ivory);
      }
      shine(front, lock, span(n, 46, 50, 54, 61) + span(n, 138, 142, 145, 149));
    }
    for (let i = 0; i < 8 && turn > 0.01; i++)
      shine(back, [lock[0] + i * 15, 111 - i * 5], turn * (0.37 + 0.25 * Math.sin(i + n * 0.18)));
    for (const land of [83, 103, 158]) chips(front, j.bootR, n - land, 7);
  } else if (a === 'phase') {
    const u = span(n, 17, 28, 49, 64),
      z = ease(23, 45, n);
    if (u > 0.03) {
      for (let k = 0; k < 13; k++) {
        const q = k / 12,
          B: XY = [j.house[0] + (q - 0.5) * 81, j.house[1] - z * 64 - 6 * Math.sin(q * Math.PI)];
        shine(under, B, u * (0.36 + 0.22 * Math.sin(k)));
      }
      shine(front, j.tower, u * 0.95);
      shine(front, j.latch, u * 0.6);
      shine(front, j.pennant, u * 0.72);
    }
  } else if (a === 'show') {
    for (const hit of [16, 26, 75, 124, 151]) chips(front, hit < 40 ? j.sill : j.bootR, n - hit, 8);
    if (n < 39)
      for (const hit of [14, 24])
        oval(front, j.latch, 3 + (n - hit) * 0.65, 2 + (n - hit) * 0.5, gold, span(n, hit, hit + 3, hit + 6, hit + 11));
  } else if (a === 'fidget_a') {
    for (const hit of [5, 22, 36]) {
      const u = span(n, hit, hit + 2, hit + 4, hit + 9);
      if (u > 0.02) oval(front, j.latch, 2 + (n - hit) * 0.55, 2 + (n - hit) * 0.44, gold, u * 0.86);
    }
  } else if (a === 'fidget_b') shine(front, j.keyTip, span(n, 21, 27, 32, 40));
}
