// At the edge of a glacier the wind combs snow over blue lake ice.
import { Px } from '../rig/px';
import { hash, hx, mixc } from '../kit/f11-mobkit';
import { face, type Point } from './relief';

let background: Px;
const c = hx;
function ridge(p: Px, x: number, y: number, w: number, h: number, near: boolean) {
  const rel = (pts: Point[]): Point[] => pts.map(([u, v]) => [x + w * u, y - h * v]);
  face(
    p,
    rel([
      [0, 0],
      [0.09, 0.13],
      [0.16, 0.23],
      [0.22, 0.31],
      [0.28, 0.56],
      [0.34, 0.55],
      [0.4, 0.69],
      [0.47, 0.74],
      [0.52, 1],
      [0.58, 0.9],
      [0.65, 0.56],
      [0.7, 0.53],
      [0.77, 0.36],
      [0.85, 0.36],
      [1, 0],
    ]),
    c(near ? '#384c63' : '#3d5364'),
  );
  face(
    p,
    rel([
      [0, 0],
      [0.22, 0.31],
      [0.28, 0.56],
      [0.34, 0.55],
      [0.4, 0.69],
      [0.47, 0.74],
      [0.52, 1],
      [0.55, 0.95],
      [0.5, 0.72],
      [0.48, 0.53],
      [0.41, 0.51],
      [0.37, 0.35],
      [0.32, 0.36],
      [0.26, 0.2],
      [0.19, 0.21],
    ]),
    c(near ? '#798d9b' : '#607989'),
  );
  face(
    p,
    rel([
      [0.42, 0.5],
      [0.47, 0.53],
      [0.52, 0.89],
      [0.55, 0.9],
      [0.56, 0.78],
      [0.53, 0.58],
      [0.55, 0.56],
      [0.5, 0.36],
      [0.47, 0.37],
    ]),
    c('#596d83'),
  );
  for (let j = 0; j < 3; j++) {
    const a = 0.22 + j * 0.105;
    p.line(
      x + w * a,
      y - h * (0.23 + 0.12 * j),
      x + w * (a + 0.07),
      y - h * (0.32 + 0.12 * j),
      c(near ? '#81939d' : '#6b8191'),
    );
  }
}
function sky(p: Px) {
  for (let y = 0; y < 62; y++)
    p.rect(0, y, p.w - 1, y, mixc(c('#182538'), c('#4c6676'), Math.floor(y / 3) / 20));
  for (let x = 0; x < p.w; x++) {
    const envelope = (1 + Math.cos((x - 53) / 57)) * 0.5;
    const wave = 16 + 6 * Math.sin(x * 0.039) + 2.5 * Math.sin(x * 0.074 + 0.6) + x * 0.048;
    const h = 4 + Math.floor((6 + 6 * Math.sin(x * 0.094)) * envelope);
    for (let j = 0; j < h; j++) {
      const yy = Math.round(wave - j),
        k = (1 - j / h) * (0.48 + 0.48 * envelope);
      p.set(x, yy, mixc(p.get(x, yy), c('#55857b'), Math.round(k * 5) / 5));
    }
    if (x % 5 === 0 && envelope > 0.5) p.set(x, wave - h - 1, c('#344c59'));
  }
  for (let i = 0; i < 33; i++) {
    const x = hash(i, 52) * p.w,
      y = hash(i, 56) * 30;
    p.set(x, y, c(i % 5 ? '#6d8290' : '#a5afb4'));
  }
  ridge(p, -46, 54, 135, 38, false);
  ridge(p, 51, 52, 116, 27, false);
  ridge(p, 104, 55, 135, 42, false);
  ridge(p, -26, 57, 70, 30, true);
  ridge(p, 160, 57, 79, 36, true);
}
function fissure(p: Px, pts: Point[], rim: string, deep: string) {
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1],
      b = pts[i];
    p.line(a[0], a[1] + 1, b[0], b[1] + 1, c(rim));
    p.line(...a, ...b, c(deep));
  }
}
function sastruga(p: Px, x: number, y: number, size: number, seed: number) {
  const long = size,
    high = (2 + hash(seed, 13) * 3) * Math.min(1, size / 12);
  const s = (u: number, v: number): Point => [x + u * long, y + v * high];
  face(
    p,
    [
      s(-1, 0),
      s(-0.6, -0.33),
      s(-0.25, -0.36),
      s(0.02, -1),
      s(0.32, -0.92),
      s(0.59, -0.42),
      s(1, -0.1),
      s(0.43, 0.3),
      s(-0.12, 0.43),
    ],
    c('#718491'),
  );
  face(
    p,
    [
      s(-1, 0),
      s(-0.26, -0.42),
      s(0.02, -1),
      s(0.32, -0.92),
      s(0.55, -0.48),
      s(0.13, -0.63),
      s(-0.24, -0.17),
    ],
    c('#8b9ca2'),
  );
  p.line(...s(-0.57, 0.38), ...s(0.09, 0.52), c('#5d7382'));
}
// The margin between exposed lake and accumulated powder is one continuous curve.
function bankY(x: number) {
  return 81 + 15 * Math.sin(x * 0.03 - 0.64) + 8 * Math.cos(x * 0.053 + 0.1) + 0.09 * x;
}
function floor(p: Px) {
  for (let x = 0; x < p.w; x++)
    for (let y = 50; y < p.h; y++) {
      const edge = bankY(x),
        n = hash(x >> 2, y >> 1, 906);
      let cold = mixc(
        c('#334c64'),
        c('#607d8b'),
        0.17 + 0.29 * Math.sin(x * 0.031 - 0.55) + 0.23 * (1 - Math.min(1, Math.abs(y - edge) / 55)),
      );
      if (y >= edge) {
        const bank = 0.38 + 0.14 * Math.sin(x * 0.039 + y * 0.078) + 0.08 * (y / 160) + 0.05 * n;
        cold = mixc(c('#586f80'), c('#8a99a0'), bank);
        if (y < edge + 1.4) cold = c('#455f71');
        else if (y < edge + 2.5) cold = c('#8b9aa1');
      }
      p.set(x, y, cold);
    }
  // Submerged bubbles and trapped hairline fractures in a broad diagonal sheet.
  for (let i = 0; i < 35; i++) {
    const x = hash(i, 61) * p.w,
      y = 54 + hash(i, 62) * 38;
    if (y > bankY(x) - 1) continue;
    const style = i % 4;
    if (style === 0) {
      p.ell(x, y, 2, 1, c('#4c667b'));
      p.set(x - 1, y - 1, c('#728c99'));
    } else if (style === 1) {
      p.line(x - 2, y + 1, x + 3, y, c('#647e8b'));
      p.line(x + 3, y, x + 5, y, c('#566f80'));
    } else if (style === 2) {
      p.line(x, y, x + 5, y + 1, c('#41596f'));
    } else {
      p.ell(x, y, 4.5, 1.4, c('#415b72'));
      p.line(x - 2, y - 1, x + 1, y - 1, c('#607c8b'));
    }
  }
  fissure(
    p,
    [
      [0, 85],
      [13, 82],
      [24, 82],
      [38, 78],
      [46, 79],
      [58, 74],
      [78, 73],
      [89, 69],
    ],
    '#78909c',
    '#2f475d',
  );
  fissure(
    p,
    [
      [37, 78],
      [41, 74],
      [49, 71],
      [52, 67],
    ],
    '#617d8d',
    '#364f65',
  );
  fissure(
    p,
    [
      [131, 88],
      [143, 86],
      [149, 87],
      [164, 82],
      [180, 82],
      [190, 78],
      [205, 77],
    ],
    '#708693',
    '#324b60',
  );
  // A polynya with a broken cornice interrupts the distant left bank.
  face(
    p,
    [
      [0, 62],
      [12, 60],
      [24, 62],
      [31, 65],
      [39, 65],
      [44, 68],
      [36, 71],
      [29, 70],
      [21, 73],
      [9, 72],
      [0, 75],
    ],
    c('#233b52'),
  );
  fissure(
    p,
    [
      [0, 63],
      [12, 61],
      [24, 63],
      [31, 66],
      [39, 66],
    ],
    '#8499a6',
    '#617d90',
  );
  for (let i = 0; i < 78; i++) {
    const x = hash(i, 45) * p.w,
      y = 73 + hash(i, 46) * 88;
    if (y < bankY(x) + 2) continue;
    const v = hash(i, 44),
      w = 3 + v * 12;
    if (i % 6 === 0) sastruga(p, x, y, w, 93 + i);
    else if (i % 6 === 1) {
      p.line(x - w, y + 1, x, y, c('#758994'));
      p.line(x, y, x + 5, y, c('#7e919b'));
    } else if (i % 6 === 2) {
      for (let j = 0; j < 5; j++)
        p.set(x + hash(i, j) * 8, y + hash(j, i) * 3, c(j % 2 ? '#718593' : '#82939b'));
    } else if (i % 6 === 3) {
      p.line(x - 3, y, x + 4, y - 1, c('#5e7685'));
      p.line(x + 2, y, x + 5, y - 1, c('#8999a2'));
    } else if (i % 6 === 4) {
      p.ell(x, y, w * 0.4, 1, c('#667d8b'));
      p.set(x + 1, y - 1, c('#87979e'));
    } else if (v > 0.7) {
      p.line(x, y, x + 2, y + 1, c('#80929a'));
      p.set(x + 3, y, c('#8d9ba2'));
    }
  }
}
function fin(p: Px) {
  const shade = c('#435d71'),
    mid = c('#648292'),
    light = c('#a3b7bb');
  p.ell(153, 146, 17, 4, c('#566c7c'));
  face(
    p,
    [
      [130, 145],
      [137, 136],
      [139, 125],
      [149, 119],
      [155, 99],
      [156, 115],
      [155, 129],
      [151, 142],
      [158, 140],
      [165, 134],
      [163, 144],
      [170, 147],
      [153, 149],
      [140, 149],
    ],
    shade,
  );
  face(
    p,
    [
      [132, 144],
      [140, 135],
      [143, 124],
      [149, 119],
      [155, 101],
      [151, 124],
      [147, 135],
      [143, 141],
    ],
    mid,
  );
  face(
    p,
    [
      [148, 139],
      [152, 132],
      [156, 115],
      [155, 129],
      [152, 141],
    ],
    c('#78939f'),
  );
  p.line(139, 132, 143, 124, light);
  p.line(149, 119, 154, 105, light);
  p.line(143, 137, 149, 129, c('#9cabb2'));
  p.line(149, 129, 147, 133, c('#688495'));
  sastruga(p, 148, 147, 17, 75);
  sastruga(p, 160, 145, 9, 76);
}
function paint(p: Px, t: number) {
  if (!background || p.w !== background.w || p.h !== background.h) {
    background = new Px(p.w, p.h);
    sky(background);
    floor(background);
  }
  p.data.set(background.data);
  const a = (t * Math.PI * 2) / 3;
  for (let i = 0; i < 2; i++) {
    const x = 20 + i * 153 + 5 * Math.cos(a + i),
      y = 42 + i * 9 + 3 * Math.sin(a + i);
    p.set(x, y, c('#c0cacf'));
    p.set(x - 1, y + 1, c('#8a9ba6'));
  }
  p.line(11 + 3 * Math.sin(a), 67, 16 + 3 * Math.sin(a), 67, c('#506c7d'));
}
export default Object.assign(paint, { front: [{ id: 'pressure-ridge', depth: 146, paint: fin }] });
