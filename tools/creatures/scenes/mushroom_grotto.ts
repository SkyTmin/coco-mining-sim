// Underground fen. Peat islands sit in open water below the clam-shaped cave roof.
import { Px } from '../rig/px';
import { hash, hx, mixc } from '../kit/f11-mobkit';
import { face, type Point } from './relief';
const c = hx;
let background: Px;

function lamp(p: Px, x: number, y: number, r: number, tone: 'honey' | 'wine' | 'mauve') {
  const stem = tone === 'honey' ? '#97815c' : tone === 'wine' ? '#918172' : '#756e69';
  const top = tone === 'honey' ? '#aa8550' : tone === 'wine' ? '#96695d' : '#73616a';
  const side = tone === 'honey' ? '#806846' : tone === 'wine' ? '#765051' : '#514851';
  const rim = tone === 'honey' ? '#c5a263' : tone === 'wine' ? '#aa8070' : '#9a817b';
  const v = (u: number, h: number): Point => [x + u * r, y + h * r];
  face(
    p,
    [
      v(-0.21, -0.06),
      v(0.15, -0.05),
      v(0.18, 0.42),
      v(0.1, 0.86),
      v(0.28, 1.04),
      v(0.01, 1.09),
      v(-0.16, 0.94),
      v(-0.19, 0.46),
    ],
    c(stem),
  );
  p.line(...v(-0.13, 0.2), ...v(-0.07, 0.78), c(rim));
  p.line(...v(0.1, 0.36), ...v(0.03, 0.72), c(side));
  face(
    p,
    [
      v(-1, 0.07),
      v(-0.93, -0.13),
      v(-0.63, -0.36),
      v(-0.32, -0.63),
      v(-0.02, -0.68),
      v(0.23, -0.58),
      v(0.45, -0.34),
      v(0.73, -0.21),
      v(0.98, -0.02),
      v(0.91, 0.12),
      v(0.53, 0.24),
      v(0.12, 0.29),
      v(-0.46, 0.24),
    ],
    c(side),
  );
  face(
    p,
    [
      v(-0.99, 0.06),
      v(-0.91, -0.15),
      v(-0.63, -0.36),
      v(-0.32, -0.63),
      v(-0.02, -0.68),
      v(0.23, -0.58),
      v(0.45, -0.34),
      v(0.73, -0.21),
      v(0.95, -0.03),
      v(0.62, -0.085),
      v(0.13, 0.025),
      v(-0.34, 0.065),
    ],
    c(top),
  );
  p.line(...v(-0.82, -0.19), ...v(-0.32, -0.56), c(rim));
  for (let j = -3; j <= 3; j++)
    p.line(...v(-0.04, 0.2), ...v(j * 0.25, 0.035 + 0.1 * Math.abs(j / 3)), c(j % 2 === 0 ? rim : stem));
  for (const [a, b] of [
    [-0.46, -0.15],
    [-0.22, -0.43],
    [0.23, -0.18],
  ]) {
    if (r > 7) {
      p.line(...v(a, b), ...v(a + 0.12, b - 0.035), c(rim));
      p.set(...v(a + 0.15, b + 0.05), c(side));
    }
  }
}
function roof(p: Px) {
  const wall = c('#283538');
  p.rect(0, 0, p.w - 1, p.h - 1, wall);
  // A broad hollow with successive dark shelves, with pockets of warmer air near the lamp.
  face(
    p,
    [
      [0, 0],
      [256, 0],
      [256, 70],
      [234, 73],
      [213, 55],
      [199, 49],
      [192, 33],
      [175, 29],
      [147, 19],
      [118, 23],
      [100, 19],
      [78, 25],
      [57, 41],
      [51, 56],
      [27, 79],
      [0, 86],
    ],
    c('#39403f'),
  );
  for (let j = 0; j < 12; j++) {
    const x = -11 + j * 24,
      depth = 8 + hash(j, 43) * 26;
    face(
      p,
      [
        [x, 0],
        [x + 30, 0],
        [x + 22, depth - 7],
        [x + 18, depth - 5],
        [x + 15, depth + 7],
        [x + 12, depth + 8],
        [x + 7, depth - 2],
        [x + 2, depth - 3],
      ],
      mixc(c('#33383d'), c('#51504a'), hash(j, 62) * 0.55),
    );
  }
  for (const [x, y, r] of [
    [-2, 21, 21],
    [14, 28, 14],
    [35, 37, 8],
    [19, 47, 15],
    [4, 55, 12],
    [239, 29, 20],
    [249, 45, 15],
    [224, 53, 8],
  ])
    lamp(p, x, y, r, 'mauve');
  for (let j = 0; j < 10; j++) {
    const x = 5 + j * 5,
      n = hash(j, 91),
      end = 45 + 12 * n;
    p.line(x, 9 + (j % 3), x + 4, 18 + j * 2, c('#484843'));
    p.line(x + 4, 18 + j * 2, x + 2, end, c('#504f42'));
  }
}
function hummock(p: Px, x: number, y: number, r: number, variant: number, seed: number) {
  const ry = r * (0.33 + hash(seed, 13) * 0.12),
    v = (u: number, h: number): Point => [x + u * r, y + h * ry];
  const palette = [c('#505a4e'), c('#525d52'), c('#5a614e'), c('#55564a'), c('#475651'), c('#555d4b')];
  const accent = mixc(palette[variant], c('#a5a07a'), 0.25);
  const outline: Point[] = [
    v(-1, 0.11),
    v(-0.89, -0.27),
    v(-0.65, -0.6),
    v(-0.46, -0.68),
    v(-0.21, -0.58),
    v(0.08, -0.85),
    v(0.4, -0.8),
    v(0.63, -0.6),
    v(0.85, -0.55),
    v(1, -0.15),
    v(0.94, 0.11),
    v(0.66, 0.19),
    v(0.57, 0.32),
    v(0.2, 0.5),
    v(-0.17, 0.47),
    v(-0.45, 0.38),
    v(-0.69, 0.41),
  ];
  if (variant === 0)
    outline.splice(
      1,
      6,
      v(-0.8, -0.4),
      v(-0.58, -0.65),
      v(-0.22, -0.91),
      v(0.05, -1.03),
      v(0.45, -0.88),
    );
  if (variant === 1)
    outline.splice(
      1,
      6,
      v(-0.84, -0.2),
      v(-0.62, -0.38),
      v(-0.34, -0.42),
      v(0.15, -0.45),
      v(0.49, -0.36),
    );
  if (variant === 2)
    outline.splice(
      1,
      6,
      v(-0.82, -0.35),
      v(-0.48, -0.92),
      v(-0.2, -0.96),
      v(0.03, -0.38),
      v(0.16, -0.6),
      v(0.38, -0.97),
    );
  if (variant === 3) outline.splice(9, 3, v(0.97, -0.32), v(0.95, 0.27), v(0.73, 0.4));
  if (variant === 4)
    outline.splice(
      1,
      6,
      v(-0.77, -0.41),
      v(-0.51, -0.64),
      v(-0.23, -0.62),
      v(-0.08, -0.2),
      v(0.16, -0.18),
      v(0.41, -0.66),
    );
  if (variant === 5)
    outline.splice(
      1,
      6,
      v(-0.83, -0.4),
      v(-0.61, -0.67),
      v(-0.43, -0.69),
      v(-0.28, -1.03),
      v(-0.12, -0.89),
      v(0.25, -0.65),
    );
  face(
    p,
    outline.map(([a, b]) => [a + 1, b + 2]),
    c('#344448'),
  );
  face(p, outline, palette[variant]);
  for (let i = 1; i < Math.min(outline.length - 2, 7); i++)
    p.line(...outline[i - 1], ...outline[i], accent);
  const stroke = Math.floor(r * 0.53);
  for (let i = 0; i < stroke; i++) {
    const u = hash(i, seed) * 1.52 - 0.76,
      h = -0.34 + hash(seed, i, 7) * 0.47;
    const start = v(u, h),
      dir = (i % 2 ? 1 : -1) * (1 + hash(seed, i, 8) * 3);
    p.line(
      ...start,
      start[0] + dir,
      start[1] - 1,
      mixc(palette[variant], c(i % 3 ? '#71806a' : '#3e4d48'), 0.56),
    );
  }
  if (variant === 3)
    for (let j = 0; j < 3; j++)
      p.line(...v(0.44 + j * 0.14, 0.1), ...v(0.49 + j * 0.14, 0.25), c('#3b4640'));
  if (variant === 5) {
    p.line(...v(0.37, 0.1), ...v(0.82, 0.62), c('#6b6451'));
    p.line(...v(0.82, 0.62), ...v(1.18, 0.68), c('#605d4d'));
  }
}
function fen(p: Px) {
  // A dark, quiet channel meanders between the banks; its long waterlines contrast with the moss.
  for (let y = 66; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const lamplight = Math.exp(-((x - 27) ** 2 / 1600 + (y - 78) ** 2 / 480));
      const reflected = 0.44 + 0.19 * Math.sin(y * 0.067 + x * 0.025) + 0.05 * Math.sin(y * 0.41);
      let tone = mixc(c('#2a3e42'), c('#425756'), Math.floor(reflected * 9) / 9);
      tone = mixc(tone, c('#887d52'), lamplight * 0.39);
      p.set(x, y, tone);
    }
  for (let i = 0; i < 85; i++) {
    const x = hash(i, 81) * p.w,
      y = 67 + hash(i, 82) * (p.h - 66),
      w = 3 + hash(i, 84) * 12;
    const color = mixc(p.get(Math.floor(x), Math.floor(y)), c('#8c9883'), 0.1 + 0.09 * hash(i, 89));
    p.line(x, y, x + w, y + (i % 3 === 0 ? -1 : 0), color);
  }
  const islands = [
    [-8, 74, 28],
    [25, 75, 22],
    [62, 70, 25],
    [93, 74, 24],
    [133, 70, 19],
    [168, 72, 23],
    [207, 74, 28],
    [247, 75, 18],
    [1, 89, 21],
    [34, 91, 23],
    [69, 95, 26],
    [111, 88, 18],
    [151, 90, 26],
    [190, 89, 20],
    [229, 92, 30],
    [-9, 114, 27],
    [26, 117, 21],
    [67, 117, 18],
    [96, 110, 22],
    [144, 118, 30],
    [188, 113, 24],
    [232, 116, 26],
    [258, 122, 18],
    [8, 142, 28],
    [43, 145, 18],
    [85, 140, 24],
    [106, 149, 19],
    [154, 139, 25],
    [188, 150, 30],
    [248, 145, 29],
    [-4, 171, 31],
    [29, 176, 22],
    [72, 165, 23],
    [102, 175, 24],
    [159, 171, 24],
    [199, 174, 31],
    [243, 177, 27],
    [3, 202, 35],
    [47, 201, 26],
    [87, 198, 18],
    [135, 201, 29],
    [174, 201, 24],
    [213, 204, 29],
    [250, 207, 24],
  ];
  for (const [j, [x, y, r]] of islands.entries())
    hummock(p, x, y, r, (j * 5 + Math.floor(j / 6)) % 6, j + 133);
  // A small candelabrum of amber mushrooms lights the left-hand shore.
  for (const [x, y, r] of [
    [14, 75, 7],
    [22, 72, 9],
    [33, 68, 13],
    [40, 74, 6],
  ])
    lamp(p, x, y, r, 'honey');
  for (const [x, y, r] of [
    [236, 100, 8],
    [245, 106, 6],
    [215, 168, 5],
    [13, 132, 6],
  ])
    lamp(p, x, y, r, 'mauve');
  for (let j = 0; j < 7; j++) {
    const y = 78 + j * 2,
      x = 27 + Math.sin(j * 0.97) * 4,
      cx = 3 + 0.75 * (6 - j);
    p.line(x - cx, y, x + cx, y, c(j % 3 ? '#737651' : '#8c8058'));
  }
}
function foreground(p: Px) {
  p.ell(65, 181, 25, 3, c('#394848'));
  hummock(p, 66, 180, 22, 0, 914);
  for (const [x, y, r] of [
    [48, 165, 11],
    [72, 156, 19],
    [61, 170, 10],
    [83, 171, 8],
  ])
    lamp(p, x, y, r, 'wine');
  for (let j = 0; j < 13; j++) {
    const x = 47 + hash(j, 16) * 35,
      y = 179 + hash(j, 97) * 4;
    p.line(x, y, x - 1 + hash(j, 23) * 3, y - 2 - hash(j, 38) * 4, c(j % 2 ? '#75765d' : '#646e58'));
  }
}
function render(p: Px, t: number) {
  if (!background || p.w !== background.w || p.h !== background.h) {
    background = new Px(p.w, p.h);
    roof(background);
    fen(background);
  }
  p.data.set(background.data);
  for (let j = 0; j < 2; j++) {
    const a = (t * Math.PI * 2) / 3 + j * 1.8,
      x = 28 + 12 * j + Math.cos(a) * 2.3,
      y = 53 + 4 * j + Math.sin(a) * 3.4;
    const xx = Math.round(x),
      yy = Math.round(y);
    p.set(xx, yy, mixc(c('#696a4f'), c('#c0a063'), 0.5 + 0.45 * Math.sin(a)));
  }
}
export default Object.assign(render, {
  front: [{ id: 'cinnabar-cluster', depth: 181, paint: foreground }],
});
