// A clearing under two interlocking beech roots. The oldest growth rings
// form a council floor, worn smooth in front of the little woodland seats.
import { hash, hx, TAU } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import type { Scene } from '../types';
import { face, type Point } from './relief';
import rootEdge from './root_edge';

function arch(p: Px, mirror: boolean) {
  const point = (x: number, y: number): Point => [mirror ? p.w - 1 - x : x, y];
  const wood = (vertices: Point[], color: string) =>
    face(
      p,
      vertices.map(([x, y]) => point(x, y)),
      hx(color),
    );
  wood(
    [
      [-4, -2],
      [26, -4],
      [48, 0],
      [81, 3],
      [104, -2],
      [91, 8],
      [57, 15],
      [36, 32],
      [28, 52],
      [33, 64],
      [47, 72],
      [32, 72],
      [22, 68],
      [10, 78],
      [-4, 80],
    ],
    '#352e32',
  );
  wood(
    [
      [1, 0],
      [30, 0],
      [55, 6],
      [85, 4],
      [54, 13],
      [34, 24],
      [22, 43],
      [20, 59],
      [29, 68],
      [17, 65],
      [8, 70],
    ],
    '#654636',
  );
  for (let i = 0; i < 5; i++) {
    const x = 2 + 4 * i;
    const path: Point[] = [
      [x, 65 - i],
      [x + 3, 47 - i],
      [x + 10, 28 - i],
      [x + 28, 13 - i],
      [x + 44, 8 - i],
    ];
    for (let j = 1; j < path.length; j++)
      p.line(...point(...path[j - 1]), ...point(...path[j]), hx(i % 2 ? '#987046' : '#4d3833'));
  }
  for (let i = 0; i < 36; i++) {
    const x = 5 + hash(i, 44) * 84,
      y = 4 + hash(i, 45) * 10 - x * 0.08;
    const [u, v] = point(x, y);
    p.ell(u, v, 4 + hash(i, 46) * 4, 3, hx(i % 3 ? '#44553b' : '#697546'));
    p.line(u - 2, v - 2, u + 1, v - 2, hx('#88935a'));
  }
}
function dais(p: Px, x: number, y: number, w: number, h: number) {
  p.ell(x, y + 4, w, h, hx('#393c37'));
  p.ell(x, y + 2, w, h, hx('#685a43'));
  p.ell(x, y, w, h, hx('#877658'));
  for (let i = 5; i >= 1; i--) {
    const k = i / 6;
    for (let j = 0; j < 64; j++) {
      const a = (TAU * j) / 64,
        b = (TAU * (j + 1)) / 64;
      if ((j + 3 * i) % 22 === 0) continue;
      const radius = (angle: number) => k * (1 + 0.06 * Math.sin(3 * angle + i * 0.7));
      p.line(
        x + Math.cos(a) * w * radius(a),
        y + Math.sin(a) * h * radius(a),
        x + Math.cos(b) * w * radius(b),
        y + Math.sin(b) * h * radius(b),
        hx(i % 2 ? '#a49770' : '#6d644d'),
      );
    }
  }
  p.line(x - w + 6, y + 1, x - w * 0.6, y - 1, hx('#534c40'));
}
let staticLayer: Px;
const paint: Scene = (p, t) => {
  if (!staticLayer || staticLayer.w !== p.w || staticLayer.h !== p.h) {
    const s = (staticLayer = new Px(p.w, p.h));
    rootEdge(s, 0);
    s.rect(0, 0, s.w - 1, s.h - 1, hx('#14322c', 72));
    const far: Point[] = [
      [81, 58],
      [113, 31],
      [133, 27],
      [159, 29],
      [168, 45],
      [156, 57],
      [122, 66],
    ];
    face(s, far, hx('#63745b'));
    for (let i = 0; i < 20; i++) {
      const x = 79 + hash(i, 69) * 94,
        y = 41 + hash(i, 78) * 18;
      s.line(x, y, x + 6, y - 3, hx(i % 3 ? '#6a805b' : '#8c9869'));
    }
    // The amber seed is sheltered in the fork of the ancient stump.
    for (const [x, y, h] of [
      [101, 54, 18],
      [152, 47, 16],
      [113, 55, 23],
      [143, 52, 24],
    ]) {
      face(
        s,
        [
          [x - 3, y],
          [x - 3, y - h],
          [x, y - h - 5],
          [x + 3, y - h],
          [x + 3, y],
        ],
        hx('#36453c'),
      );
      s.line(x - 2, y - h, x - 2, y - 2, hx('#849073'));
      s.ell(x, y + 1, 5, 2, hx('#56654b'));
    }
    face(
      s,
      [
        [118, 48],
        [118, 26],
        [112, 16],
        [120, 20],
        [126, 28],
        [128, 16],
        [136, 8],
        [132, 28],
        [139, 21],
        [145, 20],
        [137, 31],
        [134, 49],
      ],
      hx('#413d36'),
    );
    s.line(121, 43, 122, 26, hx('#857359'));
    s.line(133, 45, 132, 29, hx('#766649'));
    s.ell(128, 35, 5, 8, hx('#4e4539'));
    s.ell(128, 34, 3, 6, hx('#bf8c42'));
    s.ell(127, 33, 1.5, 3, hx('#f5d87c'));
    for (let i = 0; i < 14; i++) {
      const y = 51 + i * 3,
        x = 128 + Math.sin(i * 0.48) * 11;
      s.line(x - 4 - i * 0.32, y, x + 4 + i * 0.6, y - 1, hx(i % 3 ? '#556f64' : '#859881'));
    }
    dais(s, 132, 154, 85, 23);
    for (const [x, y, w] of [
      [37, 96, 15],
      [77, 83, 12],
      [194, 86, 13],
      [224, 105, 14],
    ]) {
      s.ell(x, y + 1, w + 3, 5, hx('#3b4138'));
      s.rect(x - w, y - 7, x + w, y, hx('#51473a'));
      s.ell(x, y - 7, w, 4, hx('#918260'));
      s.ell(x - 1, y - 7, w - 5, 2, hx('#706f50'));
      for (let h = 0; h < 3; h++) s.line(x - w + 3 + h * 5, y - 4, x - w + 4 + h * 5, y - 1, hx('#796344'));
    }
    arch(s, false);
    arch(s, true);
  }
  p.data.set(staticLayer.data);
  const phase = ((Math.round(t * 24) % 72) + 72) % 72,
    a = (TAU * phase) / 72;
  for (let i = 0; i < 15; i++) {
    const u = (phase / 72 + hash(i, 312)) % 1,
      x = 48 + hash(i, 318) * 162 + Math.sin(a + i) * 7 + u * 6;
    const y = 18 + u * 78,
      light = Math.round(205 * Math.sin(u * Math.PI));
    p.line(x - 1, y + 1, x + 1, y - 1, hx('#dcb971', light));
    p.set(x, y, hx('#ffea94', light));
  }
  for (let i = 0; i < 2; i++) {
    const x = 61 + 139 * i + 11 * Math.cos(a + i),
      y = 63 + 7 * Math.sin(2 * a + i);
    p.set(x, y, hx('#463d38'));
    p.line(x - 1, y - 1, x - 2, y - 1 - Math.round(2 * Math.abs(Math.sin(4 * a))), hx('#d7a04f'));
    p.set(x + 1, y - 1, hx('#f1c274'));
  }
};
paint.front = [
  {
    id: 'council-ferns',
    depth: 191,
    paint(p) {
      for (let i = 0; i < 12; i++) {
        const x = i < 6 ? 4 + i * 4 : 230 + (i - 6) * 5,
          y = 184 + (i % 4) * 4;
        p.line(x, y, x + 2, y - 10, hx('#48543d'));
        for (let k = 1; k < 5; k++)
          p.line(x + 1, y - 2 * k, x + 4 + (k % 2), y - 2 * k - 2, hx(k % 2 ? '#737e4c' : '#9b9761'));
      }
    },
  },
];
export default paint;
