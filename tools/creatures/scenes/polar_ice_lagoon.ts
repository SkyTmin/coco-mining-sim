// A lead in the pack ice. The two banks cross the old polar horizon at different angles.
import polarNight from './polar_night';
import { face, type Point } from './relief';
import { hash, hx, TAU } from '../kit/f11-mobkit';
import type { Px } from '../rig/px';
import type { Scene } from '../types';

const shore: Point[] = [
  [-3, 59],
  [15, 57],
  [36, 60],
  [54, 56],
  [73, 55],
  [94, 58],
  [113, 57],
  [136, 53],
  [160, 53],
  [181, 50],
  [211, 52],
];
function lagoon(p: Px, phase: number) {
  const near: Point[] = shore.map(([x, y], i) => [x, y + 9 + (i % 3) * 2 + (x / 208) * 5]);
  face(p, [...shore, ...near.slice().reverse()], hx('#385667'));
  for (let i = 1; i < shore.length; i++) {
    const [x, y] = shore[i - 1],
      [nx, ny] = shore[i];
    p.line(x, y - 1, nx, ny - 1, hx('#aabcc1'));
    p.line(x, y, nx, ny, hx('#688a9b'));
    p.line(...near[i - 1], ...near[i], hx('#abbec5'));
  }
  for (let i = 0; i < 47; i++) {
    const edge = i % (shore.length - 1),
      a = shore[edge],
      b = shore[edge + 1],
      q = hash(i, 611);
    const x = a[0] + (b[0] - a[0]) * q,
      y = a[1] + (b[1] - a[1]) * q + 3 + hash(i, 612) * 5;
    const shimmer = (1 + Math.sin(phase + i * 1.37)) / 2;
    p.line(x, y, x + 2 + shimmer * 3, y, hx(i % 5 === 0 ? '#a5b7bb' : '#789fa3', 60 + shimmer * 160));
  }
}
const paint: Scene = (p, t) => {
  polarNight(p, t);
  const phase = (t * TAU) / 3;
  lagoon(p, phase);
  // A glacier arch on the far headland, with the dark mouth open to the sea.
  face(
    p,
    [
      [3, 55],
      [8, 42],
      [16, 39],
      [22, 31],
      [31, 29],
      [40, 35],
      [43, 46],
      [49, 52],
      [35, 54],
      [32, 43],
      [27, 40],
      [21, 43],
      [18, 52],
    ],
    hx('#68849b'),
  );
  face(
    p,
    [
      [8, 43],
      [18, 38],
      [22, 31],
      [30, 30],
      [37, 35],
      [28, 34],
      [24, 38],
      [18, 40],
    ],
    hx('#a3b0c2'),
  );
  face(
    p,
    [
      [32, 43],
      [28, 39],
      [23, 41],
      [18, 52],
      [21, 43],
      [26, 37],
      [32, 39],
    ],
    hx('#435d79'),
  );
  for (const [x, y] of [
    [18, 39],
    [30, 34],
    [39, 41],
    [7, 49],
  ])
    p.line(x, y, x - 1, y + 4, hx('#b5c3ce'));
};
paint.front = polarNight.front;
export default paint;
