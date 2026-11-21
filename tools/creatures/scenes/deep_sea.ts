// The admiral's anchorage sits below the kelp line. Shafts and suspended silt move on a three-second tide.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import { face, type Point } from './relief';
import type { Scene } from '../types';

const trench = hx('#182b42'),
  distance = hx('#456779'),
  sand = hx('#82755f'),
  shale = hx('#43505a');
function rock(p: Px, x: number, y: number, size: number) {
  const draw = (corners: Point[], shade: string) =>
    face(
      p,
      corners.map(([u, v]) => [x + u * size, y + v * size]),
      hx(shade),
    );
  draw(
    [
      [-1, 0],
      [-0.76, -0.52],
      [-0.22, -0.78],
      [0.58, -0.59],
      [1, -0.04],
      [0.62, 0.14],
      [-0.55, 0.16],
    ],
    '#3a4851',
  );
  draw(
    [
      [-1, 0],
      [-0.71, -0.51],
      [-0.18, -0.72],
      [0.51, -0.56],
      [0.17, -0.29],
      [-0.54, -0.19],
    ],
    '#71756a',
  );
  draw(
    [
      [-0.54, -0.19],
      [0.17, -0.29],
      [0.51, -0.56],
      [0.92, -0.05],
      [0.61, 0.07],
      [-0.53, 0.09],
    ],
    '#505b5b',
  );
  p.line(x - 0.72 * size, y - 0.45 * size, x - 0.23 * size, y - 0.69 * size, hx('#93917b'));
}
function kelp(p: Px, x: number, y: number, h: number, phase: number, far = false) {
  let last: Point = [x, y];
  const [dark, mid, lit] = (far ? ['#324f58', '#3e5e60', '#60766e'] : ['#2b464a', '#47716a', '#798972']).map(
    (hxValue) => hx(hxValue),
  );
  for (let i = 1; i <= 9; i++) {
    const q = i / 9,
      px = x + Math.sin(q * 5 + phase) * 4.5 * q,
      py = y - h * q;
    p.line(...last, px, py, dark);
    p.line(last[0] + 1, last[1], px + 1, py, mid);
    const direction = i % 2 === 0 ? 1 : -1,
      reach = direction * h * (0.14 - 0.07 * q);
    face(
      p,
      [
        [px, py + 1],
        [px + reach * 0.72, py - 2],
        [px + reach, py - 8 + q * 3],
        [px + reach * 0.3, py - 5],
        [px, py - 1],
      ],
      mid,
    );
    p.line(px, py, px + reach * 0.74, py - 4, lit);
    last = [px, py];
  }
}
let base: Px;
function seabed(p: Px) {
  const horizon = Math.round(p.h * 0.42);
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      if (y < horizon + 3 * Math.sin(x / 35)) {
        const light = 0.12 + 0.68 * (1 - y / horizon) + 0.14 * Math.cos((x / p.w) * 4);
        p.set(x, y, mixc(trench, distance, light));
      } else {
        const ridges = 0.09 * Math.sin(y * 0.38 + x * 0.055 + Math.sin(x * 0.042) * 2);
        p.set(
          x,
          y,
          mixc(
            shale,
            sand,
            0.18 + (0.49 * (y - horizon)) / (p.h - horizon) + ridges + 0.05 * Math.cos(x * 0.08),
          ),
        );
      }
    }
  }
  for (let i = 0; i < 19; i++) {
    const x = hash(i, 7) * p.w,
      y = horizon + hash(i, 91) * 9;
    kelp(p, x, y, 8 + hash(i, 12) * 13, i, true);
  }
  for (let i = 0; i < 135; i++) {
    const x = hash(i, 31) * p.w,
      y = horizon + hash(i, 32) * (p.h - horizon);
    const width = 1 + Math.floor((hash(i, 33) * (y - horizon)) / 21);
    p.line(x, y, x + width, y - 1, hx(i % 4 === 0 ? '#a69978' : '#5d6562'));
  }
  for (const [x, y, r] of [
    [14, 77, 12],
    [200, 86, 16],
    [190, 82, 8],
    [6, 120, 14],
    [175, 149, 8],
    [199, 132, 10],
  ])
    rock(p, x, y, r);
  // The staggered ribs of a wreck lead from the left edge into the distant kelp.
  const ribs: Point[] = [
    [-2, 82],
    [6, 79],
    [14, 77],
    [23, 75],
    [31, 73],
    [38, 72],
  ];
  for (const [i, [x, y]] of ribs.entries()) {
    const h = 18 - i * 2;
    face(
      p,
      [
        [x - 2, y],
        [x - 5, y - h * 0.5],
        [x - 5, y - h],
        [x - 3, y - h + 1],
        [x - 2, y - h * 0.5],
        [x + 2, y],
      ],
      hx('#494f53'),
    );
    p.line(x - 5, y - h + 1, x - 4, y - h * 0.5, hx('#827c69'));
    if (i) p.line(x - 7, y + 2, x, y, hx('#68695e'));
  }
  // Cockle fans and their shadows are picked out against the nearest sand ripples.
  for (const [x, y, size] of [
    [31, 135, 4],
    [178, 119, 3],
    [53, 150, 3],
    [187, 100, 2],
  ]) {
    p.ell(x + 1, y + 1, size + 1, 1.7, hx('#51585a'));
    for (let j = -2; j <= 2; j++) {
      const dx = (j * size) / 2,
        dy = -size * 0.85 + Math.abs(j) * 0.6;
      p.line(x, y, x + dx, y + dy, hx(j % 2 ? '#99917b' : '#b3a183'));
    }
  }
  // A half-buried ship's wheel is the landmark of this anchorage.
  const x = 179,
    y = 65;
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8,
      px = x + Math.cos(a) * 12,
      py = y + Math.sin(a) * 10;
    p.line(x, y, px, py, hx('#796d5b'));
    p.line(px, py, x + Math.cos(a) * 15, y + Math.sin(a) * 13, hx('#908066'));
    p.line(px, py, x + Math.cos(a + TAU / 8) * 12, y + Math.sin(a + TAU / 8) * 10, hx('#6e6356'));
  }
  p.ell(x, y, 2.8, 2.2, hx('#a88b64'));
}
const paint: Scene = (p, t) => {
  if (!base || base.w !== p.w || base.h !== p.h) {
    base = new Px(p.w, p.h);
    seabed(base);
  }
  p.data.set(base.data);
  const phase = (TAU * t) / 3;
  for (const [x, w] of [
    [36, 7],
    [54, 3],
    [141, 12],
    [165, 4],
  ]) {
    const drift = 4 * Math.sin(phase + x / 16);
    face(
      p,
      [
        [x, 0],
        [x + w, 0],
        [x - 17 + drift, 73],
        [x - 26 + drift, 73],
      ],
      hx('#bad3ac', 13),
    );
  }
  for (const [x, y, h] of [
    [5, 88, 44],
    [13, 91, 33],
    [24, 83, 27],
    [187, 92, 41],
    [198, 93, 49],
    [204, 100, 36],
  ])
    kelp(p, x, y, h, phase + x);
  for (let i = 0; i < 21; i++) {
    const q = (t / 3 + hash(i, 42)) % 1,
      x = 8 + hash(i, 47) * (p.w - 16) + 2.5 * Math.sin(phase + i);
    const y = 84 * (1 - q),
      r = 0.7 + hash(i, 48) * 1.55,
      alpha = Math.round(155 * Math.sin(q * Math.PI));
    p.ell(x, y, r, r, hx('#adc8bf', alpha));
    p.ell(x + 0.3, y + 0.3, r * 0.63, r * 0.63, hx('#456678', alpha));
    p.set(x - r * 0.6, y - r * 0.5, hx('#c2d2c0', alpha));
  }
};
paint.front = [
  {
    id: 'reef-corner',
    depth: 155,
    paint(p) {
      rock(p, 9, 152, 17);
      rock(p, 22, 154, 10);
      for (let i = 0; i < 8; i++) {
        const x = 2 + i * 2.3,
          y = 144 + Math.sin(i) * 2;
        p.line(x, y, x - 2, y - 5 - (i % 3), hx('#8b735f'));
        p.set(x - 2, y - 5 - (i % 3), hx('#b69072'));
      }
    },
  },
];
export default paint;
