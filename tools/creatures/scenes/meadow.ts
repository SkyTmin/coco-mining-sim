// A late-summer hay meadow. Horizontal cuts in the distant fields set the scale
// against the colossus; the near clearing leaves room for its four footfalls.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import type { Scene } from '../types';
import { face, type Point } from './relief';

const sky = hx('#8bb6b2'),
  cream = hx('#f6dfad');
const green = hx('#737744'),
  hay = hx('#ccb77b'),
  shade = hx('#777952');
function blade(
  p: Px,
  x: number,
  y: number,
  h: number,
  w: number,
  light: string,
  dark: string,
) {
  const lean = w * 0.52;
  face(
    p,
    [
      [x - 1, y],
      [x - w * 0.16, y - h * 0.55],
      [x + lean, y - h],
      [x + w * 0.13, y - h * 0.38],
      [x + 2, y],
    ],
    hx(dark),
  );
  p.line(x, y - 1, x + lean, y - h, hx(light));
}
function seedhead(p: Px, x: number, y: number, height: number, bend: number) {
  const tx = x + bend,
    ty = y - height;
  p.line(x, y, x + 0.36 * bend, y - height * 0.49, hx('#7d7045'));
  p.line(x + 0.36 * bend, y - height * 0.49, tx, ty, hx('#a6935e'));
  for (let k = 0; k < 4; k++) {
    const bx = tx - k * 0.27 * bend,
      by = ty + k * 1.65;
    p.line(bx, by + 1, bx - 2, by - 1, hx('#d0bb7c'));
    p.line(bx, by, bx + 1.7, by - 2, hx('#dfcf90'));
  }
}
function ridge(p: Px, top: Point[], color: string) {
  face(p, [...top, [p.w + 1, p.h], [-1, p.h]], hx(color));
}
function grassPatch(
  p: Px,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
) {
  for (let i = 0; i < 18; i++) {
    const dx = (hash(i, seed) - 0.5) * w,
      dy = (hash(i, seed + 3) - 0.5) * 4;
    const k = hash(i, seed + 6);
    blade(
      p,
      x + dx,
      y + dy,
      h * (0.38 + 0.63 * k),
      2 + k * 4,
      k > 0.5 ? '#aba266' : '#9b9b61',
      k > 0.5 ? '#7b7848' : '#717849',
    );
  }
}
function summer(p: Px) {
  for (let y = 0; y < 48; y++) {
    const tone = mixc(sky, cream, 0.08 + 0.85 * (y / 48) ** 0.88);
    p.rect(0, y, p.w, y, tone);
  }
  p.ell(121.5, 15, 6.3, 6.3, hx('#f4dfab'));
  // A high mare's-tail cloud, a valley with blue shadow, and pale contour fields.
  for (const [x, y, w] of [
    [6, 13, 25],
    [18, 11, 16],
    [22, 10, 14],
    [31, 12, 15],
    [74, 6, 11],
    [80, 7, 13],
  ]) {
    p.line(x, y, x + w, y, hx('#dbe2c8'));
    p.line(x + 5, y + 1, x + w + 4, y + 1, hx('#cddac4'));
  }
  ridge(
    p,
    [
      [-1, 33],
      [15, 27],
      [27, 24],
      [44, 27],
      [60, 19],
      [74, 18],
      [97, 27],
      [117, 21],
      [134, 25],
      [147, 22],
      [160, 23],
    ],
    '#92a796',
  );
  ridge(
    p,
    [
      [-1, 34],
      [18, 35],
      [36, 32],
      [53, 28],
      [68, 26],
      [91, 28],
      [115, 32],
      [143, 30],
      [160, 26],
    ],
    '#7c9983',
  );
  ridge(
    p,
    [
      [-1, 48],
      [15, 42],
      [36, 38],
      [53, 36],
      [69, 37],
      [81, 41],
      [104, 41],
      [120, 36],
      [142, 33],
      [161, 34],
    ],
    '#87986e',
  );
  face(
    p,
    [
      [28, 39],
      [52, 35],
      [69, 36],
      [61, 39],
      [38, 40],
    ],
    hx('#b7b584'),
  );
  face(
    p,
    [
      [77, 40],
      [105, 40],
      [133, 34],
      [146, 34],
      [108, 42],
      [88, 43],
    ],
    hx('#bbac79'),
  );
  // A long, low hedge and the two winding tracks meet at a distant gate.
  for (let i = 0; i < 38; i++) {
    const x = 66 + i * 2.5,
      y = 40 - Math.sin(i * 0.053) * 3.7;
    p.ell(
      x,
      y,
      2.5 + hash(i, 2) * 2,
      1.5 + hash(i, 3) * 1.6,
      hx(i % 3 === 1 ? '#6d886e' : '#758e73'),
    );
  }
  for (let y = 44; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const v = (y - 44) / (p.h - 44),
        crease =
          (Math.sin(y * 0.145 - x * 0.034) + Math.sin(x * 0.056 + y * 0.091)) *
          0.043;
      const sun =
        0.47 +
        0.2 * Math.cos((x - 37) * 0.028 + v * 0.55) +
        0.08 * Math.sin(3 * v) +
        crease;
      p.set(
        x,
        y,
        mixc(
          green,
          hay,
          Math.round(Math.max(0.18, Math.min(0.91, sun)) * 23) / 23,
        ),
      );
    }
  face(
    p,
    [
      [0, 44],
      [27, 44],
      [62, 46],
      [36, 47],
      [17, 48],
      [0, 51],
    ],
    hx('#a4a577'),
  );
  face(
    p,
    [
      [47, 44],
      [75, 43],
      [127, 43],
      [95, 45],
      [66, 45],
    ],
    hx('#beaf7a'),
  );
  face(
    p,
    [
      [0, 71],
      [14, 65],
      [37, 60],
      [62, 57],
      [77, 53],
      [82, 49],
      [74, 46],
      [92, 48],
      [88, 53],
      [65, 60],
      [35, 65],
      [10, 71],
      [0, 76],
    ],
    hx('#bcaa72'),
  );
  for (let row = 0; row < 13; row++) {
    const y = 48 + row * 6.4;
    const growth = 0.4 + row / 12;
    for (let i = 0; i < 19; i++) {
      const x = i * 9.2 + 6 * hash(i, row, 51) - 3,
        fy = y + 4 * hash(i, row, 101);
      const a = x + growth * (2 + 5 * hash(i, row, 62));
      p.line(x, fy, a, fy - 1, hx(row < 3 ? '#a29d65' : '#98935f'));
      if (hash(i, row, 26) < 0.55)
        p.line(x + 1, fy + 1, a + 2, fy, hx('#b9ac72'));
      if (hash(i, row, 83) > 0.8)
        p.line(x + 1, fy, x + 2, fy - growth * 2, hx('#8d8e59'));
    }
  }
  // Bushes stay below the horizon, so looking or rising still silhouettes against sky.
  for (const [x, y, w, h] of [
    [-1, 62, 19, 6],
    [160, 60, 22, 6],
    [149, 57, 9, 4],
  ]) {
    p.ell(x, y, w, h, shade);
    for (let i = 0; i < 11; i++) {
      const cx = x + (i / 10 - 0.5) * w * 1.5,
        cy = y - h * (0.45 + 0.35 * hash(i, x));
      p.ell(
        cx,
        cy,
        w * 0.2,
        2 + hash(i, y) * 2,
        hx(i % 2 ? '#92945f' : '#7f8858'),
      );
    }
  }
  grassPatch(p, 0, 80, 23, 7, 19);
  grassPatch(p, 157, 84, 29, 9, 70);
  for (let i = 0; i < 52; i++) {
    const x = (i % 2 === 0 ? 0 : 125) + hash(i, 16) * 37,
      y = 60 + hash(i, 29) * 54;
    if (i % 4 === 0) {
      p.line(x, y, x + 1, y - 3, hx('#818447'));
      p.set(x + 1, y - 3, hx('#d8c48c'));
      p.set(x + 2, y - 3, hx('#e4d4ab'));
    }
  }
}
let cached: Px | undefined;
const paint: Scene = (p, t) => {
  if (!cached || cached.w !== p.w || cached.h !== p.h) {
    cached = new Px(p.w, p.h);
    summer(cached);
  }
  p.data.set(cached.data);
  // Two swifts wheel over the far ridge during the three-second light loop.
  for (let i = 0; i < 2; i++) {
    const phase = (t * TAU) / 3 + i * 2.5,
      x = 34 + i * 9 + Math.cos(phase) * 1.2,
      y = 19 + i * 2 + 0.7 * Math.sin(phase);
    p.set(x, y, hx('#859b89'));
    p.set(x - 1, y - Math.cos(phase), hx('#859b89'));
    p.set(x + 1, y - Math.cos(phase), hx('#859b89'));
  }
};
paint.front = [
  {
    id: 'meadow-oats',
    depth: 119,
    paint(p) {
      grassPatch(p, 10, 125, 29, 11, 82);
      for (const [x, h, b] of [
        [4, 22, 5],
        [9, 17, -4],
        [12, 26, 2],
        [18, 18, 4],
      ])
        seedhead(p, x, 125, h, b);
    },
  },
  {
    id: 'meadow-clover',
    depth: 121,
    paint(p) {
      grassPatch(p, 151, 128, 23, 13, 73);
      for (const [x, y] of [
        [139, 121],
        [146, 116],
        [155, 111],
        [158, 122],
      ]) {
        p.line(x, y + 9, x + 1, y, hx('#67784a'));
        p.ell(x + 1, y, 2.1, 2.3, hx('#a27877'));
        p.set(x, y - 1, hx('#cba18b'));
        p.set(x + 1, y - 2, hx('#dfb59b'));
      }
    },
  },
];
export default paint;
