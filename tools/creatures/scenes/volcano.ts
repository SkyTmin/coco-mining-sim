// Cooling basalt terraces, viewed across a collapsed caldera.
import { Px } from '../rig/px';
import { hash, hx, mixc } from '../kit/f11-mobkit';
import { face, type Point } from './relief';
import type { Scene } from '../types';

const sky = hx('#242335'),
  haze = hx('#594047'),
  rim = hx('#66505b'),
  coal = hx('#292631');
const bank = hx('#413640'),
  cinder = hx('#7b4945'),
  hot = hx('#ab6751');
function ridge(p: Px, knuckles: Point[], base: number, color: ReturnType<typeof hx>) {
  face(p, [...knuckles, [p.w, base], [0, base]], color);
}
function caldera(w: number, h: number) {
  const p = new Px(w, h),
    horizon = Math.round(h * 0.29);
  for (let y = 0; y < horizon; y++)
    p.rect(0, y, w - 1, y, mixc(sky, haze, Math.floor((y / horizon) * 6) / 6));
  // Shear faces and ash ledges on the far rim. The central saddle stays soft and low.
  const peaks: Point[] = [
    [0, 32],
    [10, 31],
    [21, 20],
    [29, 19],
    [42, 32],
    [53, 35],
    [64, 43],
    [78, 36],
    [96, 39],
    [111, 44],
    [136, 42],
    [155, 35],
    [165, 33],
    [178, 23],
    [193, 23],
    [216, 46],
    [232, 39],
    [250, 23],
    [w, 25],
  ];
  ridge(p, peaks, horizon + 4, hx('#493a47'));
  for (const [x, y] of [
    [21, 20],
    [178, 23],
    [250, 23],
  ]) {
    face(
      p,
      [
        [x, y],
        [x + 8, y],
        [x + 20, y + 16],
        [x + 13, y + 13],
        [x + 17, y + 20],
      ],
      hx('#35323f'),
    );
    p.line(x - 7, y + 9, x - 1, y + 2, hx('#5b454d'));
  }
  ridge(
    p,
    [
      [0, 47],
      [18, 48],
      [33, 41],
      [44, 41],
      [53, 52],
      [72, 49],
      [93, 56],
      [117, 53],
      [140, 55],
      [158, 50],
      [181, 50],
      [207, 41],
      [220, 44],
      [235, 35],
      [w, 33],
    ],
    horizon + 6,
    hx('#35303a'),
  );
  // The lower wall breaks into a lava fan. Basalt columns, clinker and rope
  // lava cut across one another, so the cooling directions remain legible.
  const ash = hx('#746170'),
    glass = hx('#3a3747'),
    clinker = hx('#53434a'),
    obsidian = hx('#292b38');
  const fan = [glass, hx('#48404b'), hx('#50464e'), hx('#584b51'), hx('#63505a')];
  const channel = (x: number) => horizon + 36 + 13 * Math.sin(x * 0.037) + 0.11 * (w - x);
  const plates: { u: number; v: number; kind: number; seed: number }[] = [];
  for (let row = -1; row < 11; row++)
    for (let col = -1; col < 11; col++) {
      const seed = hash(col, row, 97);
      plates.push({
        u: col * 33 + (seed - 0.5) * 25,
        v: horizon + row * 21 + (hash(col, row, 93) - 0.5) * 17,
        kind: Math.floor(hash(col, row, 155) * 6),
        seed,
      });
    }
  for (let y = horizon; y < h; y++)
    for (let x = 0; x < w; x++) {
      // Unequal cooling centres split the crust into irregular polygonal plates.
      let first = 1e9,
        second = 1e9,
        near = plates[0];
      for (const plate of plates) {
        const dx = x - plate.u,
          dy = (y - plate.v) * 1.48,
          d = dx * dx + dy * dy;
        if (d < first) {
          second = first;
          first = d;
          near = plate;
        } else if (d < second) second = d;
      }
      const dx = x - near.u,
        dy = y - near.v,
        v = near.seed,
        flow = y - channel(x);
      const edge = (second - first) / (1 + Math.sqrt(second) + Math.sqrt(first));
      const vein = dy - dx * (v - 0.4) * 0.76 + 1.5 * Math.sin(dx * 0.38);
      const ripple = Math.sin(
        (dy + 0.22 * dx) * (0.52 + v * 0.24) + 1.3 * Math.sin(dx * 0.13 + v * 3),
      );
      let tone = fan[[1, 2, 1, 2, 3, 1][near.kind]];
      if (near.kind === 0 && edge > 1.8 && Math.abs(dx) < 12 && ripple > 0.54) tone = fan[2]; // rope lava
      if (near.kind === 1 && Math.abs(vein) < 0.85 && dx > -9 && dx < 20 * v) tone = glass; // slate split
      if (near.kind === 2 && vein < 1 && vein > -3.5 && dx < 12 && dx > -9) tone = fan[0]; // glass shard
      if (near.kind === 3 && Math.abs(vein) < 4 && dx > -6 && hash(x >> 1, y >> 1, 317) > 0.72)
        tone = fan[3]; // clinker
      if (near.kind === 4 && edge < 1.8) tone = fan[2]; // ash between the facets
      if (near.kind === 5 && dy > -4 && dy < 6 && dx < 11 && dx > -8 && ripple > 0.77) tone = fan[2]; // weathered polish
      if (edge < 0.62) {
        tone = dx + dy > 0 ? glass : fan[2];
      }
      if (Math.abs(flow) < 11)
        tone = mixc(tone, hx('#81433e'), Math.floor((1 - Math.abs(flow) / 11) * 5) / 12);
      p.set(x, y, tone);
    }
  // Individual splintered tables cast small shadows; a bright fracture stops at each notch.
  for (const [x, y, len, h, slant] of [
    [12, 153, 30, 9, 4],
    [84, 195, 42, 9, -6],
    [166, 173, 39, 7, 5],
    [196, 118, 28, 8, -4],
    [71, 82, 23, 5, 3],
  ]) {
    const slab: Point[] = [
      [x - len * 0.5, y + 3],
      [x - len * 0.25, y - h],
      [x + 8, y - h + slant],
      [x + len * 0.47, y - h + 3 + slant],
      [x + len * 0.31, y - 1],
      [x + len * 0.42, y + 2],
      [x + 4, y + h * 0.32],
    ];
    face(
      p,
      slab.map(([u, v]) => [u + 2, v + 2]),
      glass,
    );
    face(p, slab, fan[2]);
    p.line(...slab[0], ...slab[1], fan[3]);
    p.line(...slab[1], ...slab[2], fan[3]);
    p.line(x + 2, y - h + 3, x + 5, y - h + 5, glass);
    p.line(x + 5, y - h + 5, x + 11, y - h + 4, glass);
    p.line(x + 9, y + 1, x + 16, y - 1, fan[1]);
  }
  // Coarse shattered ends of basalt columns in seven irregular groups.
  for (const [cx, cy, n] of [
    [6, 82, 13],
    [19, 125, 6],
    [246, 112, 10],
    [235, 175, 9],
    [132, 204, 8],
    [67, 90, 5],
    [166, 66, 5],
  ]) {
    for (let i = 0; i < n; i++) {
      const X = cx + Math.round((hash(i, cx, 12) - 0.5) * 32),
        Y = cy + Math.round((hash(i, cy, 13) - 0.5) * 11);
      const R = 3 + Math.floor(hash(i, cx, 14) * 6);
      const stone: Point[] = [
        [X - R, Y],
        [X - R * 0.4, Y - R * 0.45],
        [X + R * 0.6, Y - R * 0.35],
        [X + R, Y],
        [X + R * 0.4, Y + R * 0.43],
        [X - R * 0.6, Y + R * 0.5],
      ];
      face(
        p,
        stone.map(([u, v]) => [u, v + 2]),
        coal,
      );
      face(p, stone, fan[(i % 4) + 1]);
      p.line(...stone[0], ...stone[1], mixc(ash, fan[2], 0.6));
      if (i % 3 === 1) p.line(X - 2, Y + 1, X + 1, Y, clinker);
    }
  }
  for (const [cx, cy] of [
    [29, 167],
    [75, 119],
    [197, 181],
    [147, 97],
    [214, 135],
  ]) {
    for (let i = 0; i < 16; i++) {
      const x = cx + (hash(i, cx, 18) - 0.5) * 21,
        y = cy + (hash(i, cy, 11) - 0.5) * 7;
      p.ell(x, y, 1.3 + hash(i, cx, 17) * 2, 1.1, obsidian);
      p.set(x - 1, y - 1, fan[3]);
    }
  }
  // Broken liquid seam, with dull crust bridges and reflected light on the lee bank.
  for (let x = 0; x < w; x++) {
    const y = Math.round(channel(x) + Math.round(Math.sin(x * 0.23) * 2)),
      wave = Math.sin(x * 0.18) + Math.cos(x * 0.09);
    if (wave < -0.85) continue;
    p.line(x, y - 1, x, y + 2, cinder);
    p.set(x, y + 2, obsidian);
    if (wave > 0.32) p.set(x, y, hot);
    if (wave > 1.25) p.set(x, y - 1, hx('#bc7755'));
  }
  // Split in the upper terrace with a dull, broken line of molten rock.
  const fissure: Point[] = [
    [w - 1, 68],
    [w - 17, 69],
    [w - 26, 73],
    [w - 39, 72],
    [w - 55, 80],
    [w - 76, 80],
    [w - 91, 85],
  ];
  for (let i = 1; i < fissure.length; i++) {
    const [x, y] = fissure[i - 1],
      [u, v] = fissure[i];
    p.line(x, y - 1, u, v - 1, hx('#684340'));
    p.line(x, y, u, v, cinder);
    p.line(x, y + 2, u, v + 2, hx('#302931'));
    if (i % 2) p.line(x, y, (x * 2 + u) / 3, (y * 2 + v) / 3, hot);
  }
  // Columnar basalt on opposite sides, individual shafts broken at different heights.
  for (const [x, y, height, width] of [
    [2, 92, 30, 14],
    [13, 82, 18, 9],
    [0, 101, 27, 8],
    [235, 63, 21, 10],
    [246, 66, 29, 12],
    [225, 66, 13, 9],
  ]) {
    const top = y - height;
    face(
      p,
      [
        [x - width / 2, top],
        [x + 2, top + 2],
        [x + 2, y],
        [x - width / 2, y - 3],
      ],
      hx('#4c404a'),
    );
    face(
      p,
      [
        [x + 2, top + 2],
        [x + width / 2, top],
        [x + width / 2, y - 2],
        [x + 2, y],
      ],
      hx('#302c37'),
    );
    face(
      p,
      [
        [x - width / 2, top],
        [x - 2, top - 3],
        [x + width / 2, top - 2],
        [x + width / 2, top],
        [x + 2, top + 2],
      ],
      rim,
    );
    p.line(x - 2, y - 9, x - 1, y - 6, bank);
  }
  return p;
}
let base: Px | undefined;
const volcano: Scene = (p, t) => {
  if (!base || p.w !== base.w || p.h !== base.h) base = caldera(p.w, p.h);
  p.data.set(base.data);
  for (let i = 0; i < 2; i++) {
    const q = (((t / 3 + i * 0.48) % 1) + 1) % 1;
    const x = p.w - 28 - i * 10 + Math.round(Math.sin(q * 6.283) * 2),
      y = 71 - Math.floor(q * 12);
    if (q > 0.12 && q < 0.86) p.set(x, y, mixc(bank, hot, Math.sin(q * Math.PI) * 0.8));
  }
};
volcano.front = [
  {
    id: 'split-basalt',
    depth: 180,
    paint(p) {
      const x = Math.round(p.w * 0.22),
        y = Math.round(p.h * 0.865);
      p.ell(x + 3, y + 1, 20, 4, hx('#302b36'));
      for (const [dx, dy, height, width] of [
        [-9, -1, 11, 13],
        [5, -2, 24, 11],
        [-2, 0, 33, 13],
        [10, 2, 6, 10],
      ]) {
        const X = x + dx,
          Y = y + dy,
          T = Y - height;
        face(
          p,
          [
            [X - width / 2, T],
            [X + 1, T + 2],
            [X + 1, Y],
            [X - width / 2, Y - 2],
          ],
          hx('#534751'),
        );
        face(
          p,
          [
            [X + 1, T + 2],
            [X + width / 2, T],
            [X + width / 2, Y - 2],
            [X + 1, Y],
          ],
          hx('#302e3b'),
        );
        face(
          p,
          [
            [X - width / 2, T],
            [X - 1, T - 3],
            [X + width / 2, T - 2],
            [X + width / 2, T],
            [X + 1, T + 2],
          ],
          hx('#70616b'),
        );
        p.line(X - width / 2 + 1, T + 1, X - width / 2 + 1, T + height * 0.32, hx('#705a61'));
        p.line(X - 2, T + height * 0.4, X, Y - height * 0.4, coal);
        p.line(X, Y - height * 0.4, X - 2, Y - height * 0.27, hx('#8e594e'));
      }
    },
  },
];
export default volcano;
