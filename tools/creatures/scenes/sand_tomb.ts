// Wind blows through a ruined hypostyle hall. The lit floor stays cooler
// than the gold on the scorpion, with warm light only near the two braziers.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import type { Scene } from '../types';
import { face, type Point } from './relief';

function glyph(p: Px, x: number, y: number, id: number) {
  const dark = hx('#5d4545'),
    light = hx('#b2956c');
  const symbols: Point[][] = [
    [
      [0, 2],
      [3, 0],
      [6, 2],
      [3, 4],
      [0, 2],
    ],
    [
      [0, 4],
      [1, 2],
      [3, 2],
      [4, 0],
      [6, 1],
    ],
    [
      [0, 0],
      [1, 2],
      [5, 2],
      [6, 0],
      [5, 4],
      [1, 4],
      [0, 4],
    ],
    [
      [1, 4],
      [4, 1],
      [6, 0],
      [4, 2],
      [4, 4],
      [2, 4],
    ],
    [
      [0, 4],
      [2, 1],
      [4, 4],
      [6, 1],
    ],
  ];
  const path = symbols[id % symbols.length];
  for (let j = 1; j < path.length; j++) {
    const [a, b] = path[j - 1],
      [c, d] = path[j];
    p.line(x + a, y + b + 1, x + c, y + d + 1, light);
    p.line(x + a, y + b, x + c, y + d, dark);
  }
}
function pillar(p: Px, x: number, foot: number, w: number) {
  p.rect(x - w - 1, 0, x + w + 1, foot - 5, hx('#473b43'));
  for (let i = -w; i <= w; i++) {
    const u = (i + w) / (2 * w),
      curve = Math.max(0, 1 - ((u - 0.29) / 0.77) ** 2);
    const light = Math.floor(curve * 4) / 4;
    p.line(x + i, 0, x + i, foot - 3, mixc(hx('#65505a'), hx('#b29373'), light));
  }
  for (let y = 4; y < foot - 8; y += 21) {
    p.rect(x - w, y, x + w, y + 1, hx('#5a4550'));
    p.line(x - w + 1, y + 2, x + w - 2, y + 2, hx('#d3ae7c'));
    glyph(p, x - 3, y + 7, Math.floor(y / 21) + Math.abs(x));
  }
  p.ell(x, foot - 4, w + 3, 3, hx('#b19778'));
  p.rect(x - w - 3, foot - 3, x + w + 3, foot, hx('#7b6362'));
  p.ell(x, foot, w + 5, 3, hx('#55484e'));
  p.line(x - w - 2, foot - 2, x + w - 3, foot - 2, hx('#ae9276'));
}
function jar(p: Px, x: number, y: number, size: number) {
  const c = (shape: Point[], tone: string) =>
    face(
      p,
      shape.map(([u, v]) => [x + u * size, y + v * size]),
      hx(tone),
    );
  c(
    [
      [-2, -15],
      [3, -15],
      [3, -12],
      [7, -9],
      [6, -4],
      [3, 0],
      [-3, 0],
      [-6, -4],
      [-7, -9],
      [-2, -12],
    ],
    '#594044',
  );
  c(
    [
      [-2, -13],
      [2, -13],
      [3, -10],
      [5, -8],
      [3, -2],
      [-2, -1],
      [-5, -6],
      [-5, -9],
    ],
    '#a76751',
  );
  p.line(x - 3 * size, y - 8 * size, x + 4 * size, y - 8 * size, hx('#d3a56f'));
  p.line(x - 2 * size, y - 13 * size, x - 4 * size, y - 9 * size, hx('#e2bb81'));
}
const torches: Point[] = [
  [45, 68],
  [211, 70],
];
let base: Px;
const paint: Scene = (p, t) => {
  if (!base || base.w !== p.w || base.h !== p.h) {
    const s = (base = new Px(p.w, p.h));
    for (let y = 0; y < s.h; y++) {
      const shade =
        y < 75
          ? mixc(hx('#514250'), hx('#8c7369'), Math.floor(y / 9) / 9)
          : mixc(hx('#8b7368'), hx('#baa184'), Math.floor((y - 75) / 12) / 11);
      s.line(0, y, s.w - 1, y, shade);
    }
    for (let y = 12; y < 76; y += 14) {
      s.line(0, y, 255, y, hx('#554952'));
      s.line(0, y + 1, 255, y + 1, hx('#ab8e75'));
      for (let x = (y % 3) * 13; x < 256; x += 37) s.line(x, y + 2, x + 1, y + 13, hx('#695652'));
    }
    face(
      s,
      [
        [91, 79],
        [91, 17],
        [99, 11],
        [156, 11],
        [164, 17],
        [164, 80],
      ],
      hx('#ad9277'),
    );
    s.rect(99, 17, 156, 75, hx('#423e4a'));
    s.rect(105, 22, 151, 75, hx('#292d3b'));
    for (let k = 0; k < 3; k++) {
      s.rect(104 - k * 5, 75 + k * 3, 152 + k * 5, 77 + k * 3, hx('#675c60'));
      s.line(103 - k * 5, 75 + k * 3, 153 + k * 5, 75 + k * 3, hx('#af947d'));
    }
    for (let i = 0; i < 10; i++) glyph(s, 13 + 23 * i, 4, (i * 7) % 11);
    for (const [x, y, w] of [
      [31, 70, 7],
      [75, 62, 5],
      [181, 63, 5],
      [231, 73, 8],
      [4, 92, 11],
      [252, 94, 10],
    ])
      pillar(s, x, y, w);
    // A winged sun crowns the lintel. Its feathers echo the chevrons in the stone.
    const cx = 128;
    for (const direction of [-1, 1]) {
      const wing: Point[] = [
        [2, 12],
        [14, 10],
        [33, 6],
        [28, 13],
        [17, 16],
        [5, 15],
      ];
      face(
        s,
        wing.map(([u, v]) => [cx + direction * u, v]),
        hx('#67515d'),
      );
      for (let j = 0; j < 7; j++) {
        const x = cx + direction * (6 + 3 * j),
          y = 12 - j * 0.41;
        s.line(x, y, x + direction * 4, y - 2, hx(j % 2 ? '#b19b78' : '#9d8774'));
      }
    }
    s.ell(cx, 12, 5, 5, hx('#765648'));
    s.ell(cx, 11, 4, 4, hx('#c99c5c'));
    s.set(cx - 1, 9, hx('#f2d58e'));
    for (const side of [-1, 1]) {
      const x = 128 + side * 70;
      for (let j = 0; j < 3; j++) {
        const y = 27 + j * 10;
        s.line(x - 7, y, x + 8, y, hx('#92797a'));
        glyph(s, x - 6, y + 2, j + 2);
        glyph(s, x + 2, y + 2, j + 5);
      }
    }
    for (let row = 0; row < 10; row++) {
      const y = 81 + row * 13;
      for (let i = -1; i < 9; i++) {
        const x = (row % 2) * 16 + i * 34;
        if (hash(i, row, 5) > 0.3) s.line(x, y, x + 15 + hash(i, row, 8) * 12, y + 1, hx('#9b8174'));
        if (hash(i, row, 8) > 0.52) s.line(x + 1, y + 1, x + 4, y + 7, hx('#a58c7b'));
      }
    }
    for (let i = 0; i < 330; i++) {
      const x = hash(i, 332) * 256,
        y = 79 + hash(i, 337) * 129;
      s.line(x, y, x + 1 + hash(i, 338) * 3, y, hx(i % 3 ? '#ad9380' : '#cab08c'));
    }
    for (const [x, y] of torches) {
      s.ell(x, y + 1, 7, 2, hx('#675451'));
      s.rect(x - 2, y - 10, x + 2, y, hx('#604a45'));
      face(
        s,
        [
          [x - 8, y - 15],
          [x + 8, y - 15],
          [x + 4, y - 9],
          [x - 4, y - 9],
        ],
        hx('#614847'),
      );
      s.line(x - 8, y - 15, x + 7, y - 15, hx('#d19c68'));
    }
    jar(s, 19, 101, 0.77);
    jar(s, 225, 94, 0.65);
  }
  p.data.set(base.data);
  const phase = ((Math.round(t * 24) % 72) + 72) % 72,
    a = (TAU * phase) / 72;
  for (const [x, y] of torches) {
    const u = a + (x % 5),
      tip = x + 2.6 * Math.sin(u * 3);
    p.ell(x, y - 19, 9 + 2 * Math.sin(u), 10, hx('#eba75a', 26));
    face(
      p,
      [
        [x - 5, y - 15],
        [x - 5, y - 20],
        [tip - 2, y - 25],
        [tip + 1, y - 31 + Math.sin(2 * u) * 3],
        [tip + 2, y - 24],
        [x + 5, y - 20],
        [x + 3, y - 15],
      ],
      hx('#d77a49'),
    );
    face(
      p,
      [
        [x - 3, y - 15],
        [x - 3, y - 19],
        [tip + 1, y - 24],
        [x + 3, y - 17],
        [x + 2, y - 15],
      ],
      hx('#ffc46c'),
    );
    p.set(x, y - 18, hx('#ffebad'));
  }
  for (let i = 0; i < 36; i++) {
    const u = (phase / 72 + hash(i, 19)) % 1,
      x = -12 + u * (p.w + 25),
      y = 87 + hash(i, 20) * 112 + Math.sin(a + i) * 1.8;
    p.line(x, y, x + 1 + hash(i, 22) * 5, y, hx('#e8cda0', Math.round(130 * Math.sin(Math.PI * u))));
  }
};
paint.front = [
  {
    id: 'fallen-canopus',
    depth: 193,
    paint(p) {
      jar(p, 241, 194, 1.15);
      jar(p, 252, 191, 0.68);
    },
  },
];
export default paint;
