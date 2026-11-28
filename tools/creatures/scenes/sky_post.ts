// A cable post on the high islands. Letter baskets cross the saddle on a continuous loop.
import skyIslands from './sky_islands';
import { face, type Point } from './relief';
import { hx, TAU } from '../kit/f11-mobkit';
import type { Px } from '../rig/px';
import type { Scene } from '../types';

function station(p: Px, x: number, y: number, phase: number) {
  function part(vertices: Point[], colour: string) {
    face(
      p,
      vertices.map(([u, v]) => [x + u, y + v]),
      hx(colour),
    );
  }
  part(
    [
      [-14, 0],
      [-14, -19],
      [12, -19],
      [12, -3],
      [5, 1],
    ],
    '#7e6353',
  );
  part(
    [
      [1, -17],
      [12, -19],
      [12, -3],
      [1, 0],
    ],
    '#554b4a',
  );
  for (let j = 0; j < 5; j++) p.line(x - 12 + j * 3, y - 16, x - 12 + j * 3, y - 2, hx('#a48866'));
  part(
    [
      [-18, -18],
      [-8, -31],
      [10, -32],
      [18, -22],
      [9, -17],
    ],
    '#56656c',
  );
  for (let j = 0; j < 4; j++) p.line(x - 12 + 5 * j, y - 23, x - 7 + 5 * j, y - 30, hx('#97a2a1'));
  p.rect(x - 9, y - 13, x - 3, y - 7, hx('#373f49'));
  p.line(x - 10, y - 6, x - 2, y - 6, hx('#d9b988'));
  p.line(x + 7, y - 31, x + 7, y - 45, hx('#55494a'));
  part(
    [
      [7, -45],
      [15, -45 + Math.sin(phase)],
      [22, -42 + 2 * Math.sin(phase - 0.7)],
      [15, -40 + Math.sin(phase - 0.4)],
      [7, -41],
    ],
    '#bd765d',
  );
  p.set(x + 7, y - 46, hx('#eed7a2'));
}
const paint: Scene = (p, t) => {
  skyIslands(p, t);
  const phase = (TAU * t) / 3;
  station(p, 25, 64, phase);
  const lineY = (x: number) => 16 + 0.09 * x + 9 * Math.sin((Math.PI * x) / p.w);
  for (let x = 0; x < p.w; x++) p.set(x, lineY(x), hx('#616771'));
  for (let i = 0; i < 3; i++) {
    const x = (((i + t / 3) * p.w) / 3) % p.w,
      y = lineY(x);
    p.line(x - 2, y, x - 2, y + 4, hx('#716660'));
    p.line(x + 2, y, x + 2, y + 4, hx('#716660'));
    face(
      p,
      [
        [x - 4, y + 4],
        [x + 4, y + 4],
        [x + 3, y + 9],
        [x - 3, y + 9],
      ],
      hx('#937358'),
    );
    p.line(x - 3, y + 4, x + 2, y + 4, hx('#ead4a7'));
    p.set(x - 1, y + 6, hx('#bc8c67'));
  }
};
paint.front = skyIslands.front;
export default paint;
