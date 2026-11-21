// The abandoned star nursery downstream of the observatory. A split bronze
// meridian hangs out over the dust, above a shallow bank of glass fragments.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import type { Scene } from '../types';
import { face, type Point } from './relief';
import { islet, sparkle } from './star_abyss';

const blue = hx('#171d36'),
  plum = hx('#42344d'),
  dust = hx('#6b566f');
const bronze = hx('#7c6c77'),
  glint = hx('#a29092');

function meridian(p: Px, x: number, y: number, size: number, start: number, end: number) {
  const point = (a: number, r: number, depth = 0): Point => {
    const u = Math.cos(a) * r,
      v = Math.sin(a) * r * 0.45;
    return [x + u * 0.81 - v * 0.57, y + u * 0.57 + v * 0.81 + depth];
  };
  let last = point(start, size);
  for (let a = start + 0.036; a <= end + 0.036; a += 0.036) {
    const q = point(Math.min(end, a), size);
    p.line(last[0], last[1] + 1.5, q[0], q[1] + 1.5, hx('#352c40'));
    p.line(...last, ...q, bronze);
    last = q;
  }
  for (let tick = Math.ceil(start * 12); tick < end * 12; tick++) {
    const a = tick / 12,
      end = point(a, size - (tick % 5 === 0 ? 4 : 1.9));
    p.line(...point(a, size), ...end, tick % 5 === 0 ? glint : hx('#615363'));
  }
}
function crystal(p: Px, x: number, y: number, h: number, lean: number) {
  face(
    p,
    [
      [x - 4, y],
      [x - 3, y - h * 0.62],
      [x + lean, y - h],
      [x + 3, y - h * 0.42],
      [x + 4, y],
    ],
    hx('#39364a'),
  );
  face(
    p,
    [
      [x - 3, y - h * 0.62],
      [x + lean, y - h],
      [x + lean * 0.55, y - h * 0.38],
      [x, y - 2],
    ],
    hx('#655b72'),
  );
  p.line(x - 3, y - h * 0.62, x + lean, y - h, hx('#938b9a'));
}
function nursery(p: Px) {
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const wave = 117 - 0.42 * x + 12 * Math.sin(x / 36);
      const d = y - wave + 8 * Math.sin(x / 14 + y / 26) + 4 * Math.sin(y / 8 - x / 31);
      const cluster = hash(x >> 2, y >> 2, 71) * 0.18 + hash(x >> 1, y >> 1, 42) * 0.07;
      const near = Math.max(0, 1 - Math.abs(d) / 38);
      const band = Math.max(0, near * 0.75 + cluster - 0.19);
      let color = mixc(blue, plum, 0.12 + (0.45 * y) / p.h);
      if (band > 0.03) {
        const rim = near > 0.52 && near < 0.72 && Math.sin(x * 0.034 + y * 0.071) > 0.1;
        color = mixc(color, rim ? hx('#716784') : dust, Math.floor(band * 6) / 6);
      }
      p.set(x, y, color);
    }
  for (let i = 0; i < 195; i++) {
    const x = hash(i, 49) * p.w,
      y = hash(i, 85) * p.h;
    if (i % 22 === 0) sparkle(p, x, y, 0.51);
    else p.set(x, y, i % 4 === 0 ? hx('#8e8ca3') : hx('#60647e'));
  }
  // Small stars remain visible through the animal's translucent mantle.
  const chain: Point[] = [
    [94, 67],
    [105, 79],
    [115, 73],
    [129, 80],
    [139, 72],
  ];
  for (let i = 1; i < chain.length; i++) {
    p.line(...chain[i - 1], ...chain[i], hx('#49495f'));
    p.set(...chain[i - 1], hx('#a39caa'));
  }
  islet(p, 7, 142, 18, 23);
  islet(p, 201, 88, 14, 19);
  islet(p, 245, 124, 24, 28);
  meridian(p, 242, 55, 44, 1.1, 3.2);
  meridian(p, 242, 55, 44, 3.53, 5.95);
  meridian(p, 241, 56, 38, 2.8, 4.55);
  p.line(220, 84, 236, 69, hx('#575062'));
  // Broken curved steps are low in the frame; the open centre is in space.
  for (let j = 0; j < 7; j++) {
    const x = j * 39 - 11,
      y = 193 + Math.round(5 * Math.sin(j * 0.75));
    const rise = 4 + hash(j, 20) * 3;
    face(
      p,
      [
        [x, y],
        [x + 16, y - 3],
        [x + 43, y + 1],
        [x + 30, y + 5],
      ],
      hx('#514756'),
    );
    face(
      p,
      [
        [x, y],
        [x + 30, y + 5],
        [x + 29, y + rise + 4],
        [x + 2, y + rise],
      ],
      hx('#302f43'),
    );
    p.line(x + 2, y, x + 16, y - 3, hx('#796975'));
    p.line(x + 19, y - 2, x + 35, y, hx('#675b6b'));
  }
}
let cache: Px;
const paint: Scene = (p, t) => {
  if (!cache || cache.w !== p.w || cache.h !== p.h) {
    cache = new Px(p.w, p.h);
    nursery(cache);
  }
  p.data.set(cache.data);
  const a = (TAU * t) / 3;
  for (let i = 0; i < 15; i++) {
    const x = 7 + hash(i, 501) * (p.w - 14),
      y = 9 + hash(i, 224) * (p.h - 32);
    sparkle(p, x, y, (1 + Math.cos(a + i * 1.27)) / 2);
  }
  for (let i = 0; i < 7; i++) {
    const x = 25 + i * 31 + 4 * Math.cos(a + i),
      y = 109 - i * 7 + 2 * Math.sin(a + i);
    p.set(x, y, mixc(hx('#66546d'), hx('#c2a7a1'), 0.5 + 0.5 * Math.sin(a - i * 0.67)));
    p.set(x - 1, y + 1, hx('#685a72'));
  }
  const bearing = 0.5 + 0.5 * Math.cos(a);
  p.set(205, 46, mixc(hx('#675568'), hx('#ddc5aa'), bearing));
};
paint.front = [
  {
    id: 'crystals-on-the-broken-bank',
    depth: 177,
    paint(p) {
      for (const [x, y, h, k] of [
        [3, 188, 19, 3],
        [10, 189, 13, 1],
        [19, 191, 9, -2],
        [227, 187, 10, 2],
        [239, 190, 25, -2],
        [249, 191, 15, 1],
      ])
        crystal(p, x, y, h, k);
    },
  },
];
export default paint;
