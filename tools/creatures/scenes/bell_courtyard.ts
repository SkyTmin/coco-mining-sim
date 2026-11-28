// A sunny bell-ringer's yard. The sand hollow and the ironwork have fixed positions in the field.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { Scene } from '../types';
import type { Px } from '../rig/px';
import { face } from './relief';

export const bellPivot = [132, 13] as const;
export const sandHollow = [48, 97] as const;
const sky = ['#97bdba', '#cedbd0', '#f4e6c8'].map(hxColor);
const tile = ['#85594e', '#aa7460', '#c38d71', '#dab89a'].map(hxColor);
const sand = ['#936b50', '#ac805b', '#bd9169', '#cda57c', '#dcbb8e', '#edcfa0'].map(hxColor);
const stone = ['#78847b', '#98a296', '#b4b9a8', '#d1d1ba', '#e5dfc4'].map(hxColor);
const iron = ['#374c4c', '#536561', '#899385', '#c6c4a7'].map(hxColor);
function hxColor(value: string) {
  return hx(value);
}

function rosemary(p: Px, x: number, y: number, size: number) {
  const greens = ['#395e58', '#587d68', '#7f9472', '#aeae78'].map(hxColor);
  for (let i = 0; i < 8; i++) {
    const dx = (i - 3.5) * size * 0.43,
      dy = (5 + hash(i, 2, 8) * 7) * size;
    p.line(x, y, x + dx, y - dy, greens[0]);
    for (let j = 1; j < 7; j++) {
      const u = j / 7,
        sx = x + dx * u,
        sy = y - dy * u,
        dir = j % 2 ? 1 : -1;
      p.line(sx, sy, sx + dir * (2 + size), sy - 2 * size, greens[((i + j) % 3) + 1]);
    }
  }
}

const yard: Scene = (p, t) => {
  for (let y = 0; y < 65; y++) p.rect(0, y, 159, y, mixc(sky[0], sky[1], Math.min(1, (y + 6) / 54)));
  for (const [x, y, r] of [
    [24, 14, 17],
    [36, 14, 14],
    [13, 16, 14],
    [77, 9, 11],
    [88, 10, 9],
  ]) {
    const drift = Math.sin((t * TAU) / 3) * 0.85;
    p.ell(x + drift, y, r, 2.6, mixc(sky[1], sky[2], 0.39));
  }
  // Distant cypresses, chimneys and tiled roofs beyond the garden wall.
  for (let i = 0; i < 17; i++) {
    const x = -3 + i * 10 + hash(i, 2, 9) * 5,
      h = 5 + hash(i, 8, 9) * 14;
    p.ell(x, 49 - h / 2, 3.1 + hash(i, 4, 6) * 2, h / 2, mixc(stone[1], sky[0], 0.38));
  }
  for (const [x, y, w] of [
    [-12, 31, 39],
    [23, 40, 34],
    [64, 33, 28],
    [99, 42, 26],
  ]) {
    p.rect(x + 2, y + 9, x + w - 2, 62, stone[3]);
    p.rect(x + w * 0.7, y - 3, x + w * 0.7 + 3, y + 6, tile[1]);
    face(
      p,
      [
        [x - 2, y + 10],
        [x + w * 0.41, y],
        [x + w * 0.64, y],
        [x + w + 3, y + 10],
      ],
      tile[1],
    );
    for (let j = 2; j < 9; j += 3) p.line(x + w * 0.4 - j * 1.7, y + j, x + w * 0.63 + j * 1.7, y + j, tile[2]);
    p.line(x, y + 10, x + w + 2, y + 10, tile[0]);
    for (let j = 7; j < w - 3; j += 10) {
      p.rect(x + j, y + 13, x + j + 3, y + 20, stone[1]);
      p.line(x + j, y + 13, x + j + 3, y + 13, stone[0]);
    }
  }
  // The old campanile carries two open arches under a hipped clay roof.
  const tower = stone[3],
    shadow = mixc(stone[0], sky[1], 0.37);
  p.rect(13, 25, 26, 53, tower);
  p.rect(24, 25, 28, 52, stone[2]);
  for (const x of [16, 21]) {
    p.rect(x, 29, x + 2, 37, shadow);
    p.ell(x + 1, 29, 1.4, 2.1, shadow);
    p.line(x + 1, 33, x + 1, 36, stone[0]);
    p.set(x, 28, stone[4]);
  }
  p.rect(12, 38, 28, 39, stone[2]);
  p.line(12, 38, 27, 38, stone[4]);
  p.ell(20, 44, 3.1, 3.1, tile[1]);
  p.ell(20, 44, 2.1, 2.1, stone[4]);
  p.line(20, 44, 20, 42, shadow);
  p.line(20, 44, 22, 45, shadow);
  p.rect(11, 24, 29, 26, tile[0]);
  p.line(11, 25, 28, 25, tile[3]);
  face(
    p,
    [
      [9, 24],
      [18, 15],
      [22, 14],
      [31, 24],
    ],
    tile[1],
  );
  face(
    p,
    [
      [9, 24],
      [19, 15],
      [18, 22],
    ],
    tile[2],
  );
  for (let k = 0; k < 3; k++) p.line(13 + k * 2, 22 - k * 2, 26 - k, 22 - k * 2, tile[2]);
  p.line(20, 14, 20, 10, shadow);
  p.line(17, 11, 24, 11, shadow);
  p.set(23, 10, tile[2]);
  for (let y = 54; y < 83; y++) p.rect(0, y, 159, y, mixc(stone[2], stone[3], (y - 54) / 33));
  p.rect(0, 51, 159, 53, stone[3]);
  p.line(0, 50, 159, 50, stone[4]);
  p.line(0, 54, 159, 54, stone[1]);
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 11; i++) {
      const x = (i - 1) * 18 + (row % 2) * 9,
        y = 56 + row * 12;
      p.line(x, y, x + 1, y + 7, stone[2]);
      p.line(x + 2, y + 8, x + 10, y + 8, stone[2]);
    }
  for (let i = 0; i < 43; i++) {
    const x = hash(i, 1, 24) * 160,
      y = 56 + hash(i, 1, 25) * 17;
    p.line(x, y, x + 2 + hash(i, 1, 45) * 5, y, mixc(stone[2], stone[3], 0.55));
    p.set(x, y - 1, stone[3]);
  }
  // Training wires and an old climbing rose frame the far left opening.
  for (let j = 0; j < 3; j++) {
    const bx = -5 + j * 2,
      tx = 5 + j * 3,
      ty = 18 + j * 7;
    p.line(bx, 77, tx, ty, mixc(stone[0], tile[1], 0.29));
    for (let k = 0; k < 11; k++) {
      const u = k / 12,
        ex = bx + (tx - bx) * u,
        ey = 77 - (77 - ty) * u,
        dir = k % 2 ? -1 : 1;
      p.line(ex, ey, ex + dir * 4, ey - 3, stone[0]);
      face(
        p,
        [
          [ex + dir, ey - 1],
          [ex + dir * 3, ey - 4],
          [ex + dir * 7, ey - 5],
          [ex + dir * 5, ey - 2],
        ],
        mixc(stone[j % 2], sky[0], 0.19),
      );
      if (k > 5 && (k + j) % 4 === 0) {
        p.ell(ex + dir * 5, ey - 4, 1.5, 1.4, tile[1]);
        p.set(ex + dir * 5, ey - 5, tile[3]);
      }
    }
  }
  // The hanging bell and its rope are painted together on the fixed scenery layer.
  p.rect(154, 4, 158, 73, iron[1]);
  p.line(155, 4, 155, 72, iron[2]);
  p.rect(126, 5, 158, 7, iron[0]);
  p.line(126, 5, 157, 5, iron[2]);
  p.line(156, 19, 144, 7, iron[0]);
  p.line(155, 19, 143, 7, iron[1]);
  p.rect(131, 7, 133, 13, iron[1]);
  p.set(132, 12, iron[3]);
  // The packed clay is distinct from the loose, scooped-out sand.
  for (let y = 76; y < 128; y++)
    for (let x = 0; x < 160; x++) {
      const horizon = 77 + Math.sin(x * 0.059) * 2;
      if (y < horizon) continue;
      const grain = hash(Math.floor(x / 4), Math.floor(y / 2), 18);
      const v = 0.29 + (0.25 * (y - 76)) / 52 + 0.11 * Math.sin(x / 18 + y / 13) + 0.1 * grain;
      p.set(x, y, mixc(sand[1], sand[5], Math.round(v * 9) / 9));
    }
  const [cx, cy] = sandHollow;
  for (let y = cy - 11; y <= cy + 12; y++)
    for (let x = cx - 34; x <= cx + 34; x++) {
      const u = (x - cx) / 32,
        v = (y - cy) / 10.4,
        d = u * u + v * v;
      if (d > 1 + 0.06 * Math.sin(x * 0.49)) continue;
      const g = hash(x, y, 67);
      p.set(x, y, d > 0.87 ? (v < 0 ? sand[1] : sand[5]) : mixc(sand[2], sand[5], 0.48 + g * 0.4 - 0.2 * u));
      if (g > 0.94) p.set(x, y, sand[v < 0 ? 2 : 4]);
    }
  // Loose material heaps on the sunlit lip, with fingernail-sized shadows along the far edge.
  for (let i = 0; i < 73; i++) {
    const a = hash(i, 3, 75) * TAU,
      rx = 29 + hash(i, 7, 71) * 7,
      ry = 8.7 + hash(i, 5, 71) * 3.6;
    const x = cx + rx * Math.cos(a),
      y = cy + ry * Math.sin(a),
      len = 1 + hash(i, 8, 77) * 2;
    p.line(x, y, x + len, y, sand[Math.sin(a) < 0 ? 1 : 3]);
    p.set(x, y - 1, sand[4 + (i % 2)]);
  }
  for (let i = 0; i < 12; i++) {
    const x = cx - 18 + hash(i, 2, 37) * 30,
      y = cy - 5 + hash(i, 3, 42) * 10;
    p.line(x, y, x + 3, y - 1, sand[3]);
    p.line(x + 1, y + 1, x + 3, y, sand[5]);
  }
  for (let i = 0; i < 156; i++) {
    const x = hash(i, 7, 4) * 160,
      y = 79 + hash(i, 8, 2) * 49;
    if (((x - cx) / 34) ** 2 + ((y - cy) / 13) ** 2 < 1) continue;
    p.line(x, y, x + hash(i, 4, 2) * 3, y, hash(i, 9, 1) > 0.45 ? sand[2] : sand[4]);
  }
  // The sill projects into the yard from the frame. Its two edges support the far and near claws.
  const wood = ['#58413b', '#785341', '#9e7153', '#c0976d', '#dbb58b'].map(hxColor);
  face(
    p,
    [
      [60, 119],
      [120, 119],
      [128, 125],
      [55, 125],
    ],
    wood[2],
  );
  p.line(60, 119, 120, 119, wood[0]);
  p.line(61, 120, 119, 120, wood[4]);
  p.rect(55, 125, 128, 127, wood[1]);
  p.line(55, 125, 127, 125, wood[3]);
  p.line(57, 127, 126, 127, wood[0]);
  for (const x of [64, 76, 105]) p.line(x, 122, x + 8, 122, wood[3]);
  for (const x of [62, 118]) {
    p.set(x, 123, wood[0]);
    p.set(x + 1, 122, wood[4]);
  }
  rosemary(p, 3, 79, 1.1);
  rosemary(p, 156, 86, 0.8);
};
yard.front = [
  {
    id: 'yard-edge',
    depth: 125,
    paint(p) {
      rosemary(p, -1, 126, 1.25);
      rosemary(p, 162, 127, 1.0);
    },
  },
];
export default yard;
