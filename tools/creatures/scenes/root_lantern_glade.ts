// At dusk the old beech has a hollow door. Bracket fungi reflect in the spring below it.
import rootEdge from './root_edge';
import { face, type Point } from './relief';
import { hash, hx, TAU } from '../kit/f11-mobkit';
import type { Px } from '../rig/px';
import type { Scene } from '../types';

function hollow(p: Px, x: number, y: number) {
  const local = (shape: Point[], colour: string) =>
    face(
      p,
      shape.map(([dx, dy]) => [x + dx, y + dy]),
      hx(colour),
    );
  local(
    [
      [-28, 2],
      [-12, -10],
      [-10, -34],
      [-15, -64],
      [16, -64],
      [10, -40],
      [12, -10],
      [26, 4],
      [10, 1],
      [-2, 5],
    ],
    '#33333c',
  );
  local(
    [
      [-26, 2],
      [-10, -10],
      [-6, -36],
      [-10, -64],
      [-4, -64],
      [-1, -37],
      [-5, -11],
      [-14, -1],
    ],
    '#615247',
  );
  local(
    [
      [-13, 1],
      [-3, -12],
      [-2, -30],
      [4, -38],
      [9, -26],
      [6, -9],
      [12, 0],
    ],
    '#242d35',
  );
  local(
    [
      [2, -33],
      [4, -38],
      [9, -27],
      [7, -15],
      [6, -26],
    ],
    '#816447',
  );
  for (const [dx, dy, w] of [
    [-8, -19, 5],
    [-12, -15, 7],
    [10, -36, 4],
    [11, -31, 5],
    [-9, -46, 5],
  ]) {
    p.ell(x + dx, y + dy + 1, w, 2, hx('#453b3d'));
    p.ell(x + dx, y + dy, w, 2, hx('#ab8460'));
    p.line(x + dx - w + 2, y + dy - 1, x + dx + 1, y + dy - 1, hx('#d5b480'));
  }
}

const pool: Point[] = [
  [127, 75],
  [142, 69],
  [165, 67],
  [178, 60],
  [201, 62],
  [213, 69],
  [210, 91],
  [191, 90],
  [178, 95],
  [157, 94],
  [150, 87],
  [133, 85],
];
const paint: Scene = (p, t) => {
  rootEdge(p, t);
  p.rect(0, 0, p.w - 1, p.h - 1, hx('#272747', 84));
  hollow(p, 176, 53);
  face(p, pool, hx('#3c494a'));
  face(
    p,
    pool.map(([x, y]) => [x, y - 2]),
    hx('#506367'),
  );
  const phase = (TAU * t) / 3;
  for (let i = 0; i < 18; i++) {
    const x = 151 + hash(i, 51) * 49,
      y = 72 + hash(i, 52) * 11;
    const spread = 2 + 2 * Math.sin(phase + i);
    p.line(x - spread, y, x + spread, y, hx(i % 3 ? '#66807c' : '#8f9581'));
  }
  for (let i = 0; i < 13; i++) {
    const x = 13 + hash(i, 61) * (p.w - 25) + 4 * Math.sin(phase + i);
    const y = 31 + hash(i, 62) * 29 + 3 * Math.cos(phase + i * 1.9);
    const intensity = (1 + Math.sin(phase + i)) / 2;
    p.ell(x, y, 2.6, 2, hx('#e1bb74', 18 + intensity * 39));
    p.set(x, y, hx('#eed593', 90 + intensity * 162));
  }
};
paint.front = rootEdge.front;
export default paint;
