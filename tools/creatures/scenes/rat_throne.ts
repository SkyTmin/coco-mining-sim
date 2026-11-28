// Floor 1, Gnawed Drifts: a little timber-crowned throne on the red carpet.
// Original pixel geometry. The map motifs come from coco-instruments/f1.ts.
import { hash, hx, mixc } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import { face, type Point } from './relief';
import type { Scene } from '../types';
const ink = hx('#212026'),
  soot = hx('#302c32'),
  shale = hx('#453d40'),
  clay = hx('#69574d');
const beam = hx('#51403a'),
  grain = hx('#79604c'),
  iron = hx('#46454a'),
  pin = hx('#887762');
const wine = hx('#54323b'),
  velvet = hx('#68404a'),
  fringe = hx('#887055');
function timber(p: Px, x: number, y: number, dx: number, dy: number, width: number) {
  const lengths = [0, 2, width - 2, width];
  const norm = Math.hypot(dx, dy),
    nx = dy / norm,
    ny = -dx / norm;
  const at = (u: number, v: number): Point => [x + dx * u + nx * v, y + dy * u + ny * v];
  for (let i = 0; i < 3; i++)
    face(
      p,
      [at(0, lengths[i]), at(1, lengths[i]), at(1, lengths[i + 1]), at(0, lengths[i + 1])],
      [ink, beam, grain][i],
    );
  for (let i = 0; i < 4; i++) {
    const u = 0.1 + i * 0.16,
      v = 2 + hash(x, y, i) * (width - 4);
    p.line(...at(u, v), ...at(u + 0.13, v + 0.6), i % 2 ? grain : soot);
  }
  for (const u of [0.12, 0.86]) {
    p.line(...at(u, 0), ...at(u, width), iron);
    p.set(...at(u, width * 0.48), pin);
  }
}
function banner(p: Px, x: number, y: number, w: number, h: number) {
  face(
    p,
    [
      [x, y],
      [x + w, y + 1],
      [x + w - 1, y + h - 4],
      [x + w * 0.65, y + h],
      [x + w * 0.3, y + h - 4],
      [x + 1, y + h - 2],
    ],
    wine,
  );
  p.line(x + 2, y + 1, x + 3, y + h - 4, velvet);
  p.line(x + w - 2, y + 3, x + w - 3, y + h - 5, velvet);
  // The three-tined royal mark also occurs along the runner.
  const v = y + h * 0.47,
    cx = x + w * 0.5;
  p.line(cx - 3, v - 2, cx - 2, v + 2, fringe);
  p.line(cx - 2, v + 2, cx + 2, v + 2, fringe);
  p.line(cx + 2, v + 2, cx + 3, v - 2, fringe);
  p.line(cx, v - 3, cx, v + 1, fringe);
  p.line(x - 3, y - 1, x + w + 3, y, grain);
}
function throne(p: Px, x: number, y: number) {
  for (let i = 0; i < 3; i++) {
    const w = 32 - i * 5,
      z = y - i * 4;
    face(
      p,
      [
        [x - w, z],
        [x - w + 6, z - 4],
        [x + w - 6, z - 4],
        [x + w, z],
        [x + w, z + 2],
        [x - w, z + 2],
      ],
      i % 2 ? shale : beam,
    );
    p.line(x - w + 2, z, x + w - 2, z, clay);
  }
  for (let i = -2; i <= 2; i++) {
    const h = 20 + (2 - Math.abs(i)) * 4,
      xx = x + i * 4;
    face(
      p,
      [
        [xx - 2, y - 11],
        [xx - 2, y - h - 11],
        [xx, y - h - 15],
        [xx + 2, y - h - 11],
        [xx + 2, y - 10],
      ],
      i % 2 ? beam : grain,
    );
  }
  face(
    p,
    [
      [x - 8, y - 27],
      [x + 8, y - 27],
      [x + 8, y - 13],
      [x + 11, y - 9],
      [x - 11, y - 9],
      [x - 8, y - 13],
    ],
    velvet,
  );
  // The back is upholstered around a stamped brass nail; a split down the
  // centre and two rows of studs keep the throne distinct from a mine chair.
  for (const d of [-5, 0, 5]) {
    p.line(x + d - 2, y - 24, x + d, y - 20, wine);
    p.line(x + d, y - 20, x + d + 2, y - 24, wine);
    p.set(x + d, y - 20, fringe);
  }
  p.line(x - 8, y - 12, x + 8, y - 12, fringe);
  p.ell(x, y - 33, 2, 3, fringe);
  p.set(x, y - 34, hx('#b67d65'));
  for (const s of [-1, 1]) {
    p.rect(x + s * 12 - 1, y - 18, x + s * 12 + 1, y - 8, grain);
    p.ell(x + s * 12, y - 18, 3, 2, pin);
  }
}
function cavern(w: number, h: number) {
  const p = new Px(w, h),
    horizon = Math.round(h * 0.31),
    cx = w * 0.53;
  p.rect(0, 0, w - 1, h - 1, ink);
  for (let row = 0; row < 7; row++) {
    for (let col = -1; col < 13; col++) {
      const x = col * 25 + (row % 2) * 11,
        y = row * 11,
        z = hash(col, row, 4);
      face(
        p,
        [
          [x + 1, y],
          [x + 20, y - 1],
          [x + 25, y + 3],
          [x + 22, y + 9],
          [x + 5, y + 11],
          [x, y + 7],
        ],
        mixc(soot, shale, z * 0.85),
      );
      p.line(x + 3, y, x + 17, y - 1, mixc(shale, clay, z * 0.32));
    }
  }
  for (const x of [-7, w * 0.24, w * 0.77, w + 6]) {
    p.ell(x, horizon - 2, 22, 30, soot);
    p.ell(x, horizon - 1, 17, 25, ink);
    for (let j = -1; j <= 1; j++) p.line(x + j * 7, horizon - 14, x + j * 7 + 1, horizon, beam);
    timber(p, x - 25, horizon + 2, 3, -43, 6);
    timber(p, x + 24, horizon + 1, -3, -43, 6);
    timber(p, x - 24, horizon - 37, 21, -12, 6);
    timber(p, x - 4, horizon - 49, 26, 9, 6);
  }
  // Veins of ochre follow the broken ceiling. Roots catch individually on
  // the upper timbers and fork around the mine supports.
  for (const [x, y, side] of [
    [15, 0, 1],
    [75, -2, -1],
    [201, -3, 1],
    [247, 1, -1],
  ]) {
    let xx = x,
      yy = y;
    for (let k = 0; k < 9; k++) {
      const nextX = xx + side * (1 + Math.round(hash(x, k, 7) * 5));
      const nextY = yy + 2 + Math.round(hash(x, k, 9) * 3);
      p.line(xx, yy, nextX, nextY, beam);
      if (k < 4) p.line(xx - 1, yy, nextX - 1, nextY, clay);
      if (k % 3 === 1) {
        p.line(nextX, nextY, nextX - side * 4, nextY + 5, beam);
        p.line(nextX - side * 4, nextY + 5, nextX - side * 2, nextY + 8, beam);
      }
      xx = nextX;
      yy = nextY;
    }
  }
  // Flagstones enlarge toward the front; each row shares a continuous perspective grid.
  p.rect(0, horizon, w - 1, h - 1, soot);
  let y = horizon,
    row = 0;
  while (y < h) {
    const height = Math.round(5 + (y - horizon) * 0.087),
      width = height * 2.75;
    for (let col = -2; col < w / width + 2; col++) {
      const x = Math.round(width * (col + (row % 2) * 0.47));
      const top = x + (cx - x) * 0.032,
        right = x + width,
        rt = right + (cx - right) * 0.032;
      const c = mixc(shale, clay, 0.13 + 0.44 * hash(row, col, 11));
      face(
        p,
        [
          [top + 1, y],
          [rt - 2, y],
          [right - 1, y + height - 3],
          [right - 4, y + height - 1],
          [x + 2, y + height - 1],
          [x, y + height - 4],
        ],
        c,
      );
      p.line(top + 2, y, rt - 4, y, mixc(c, pin, 0.19));
      if (hash(row, col, 15) > 0.4) {
        const a = x + width * 0.48;
        p.line(a, y + 1, a - 4, y + height * 0.36, shale);
        p.line(a - 4, y + height * 0.36, a - 2, y + height * 0.59, shale);
      }
    }
    y += height;
    row++;
  }
  // Woven carpet opens toward the viewer. Scuffs expose warp and the floor.
  for (let y = horizon - 1; y < h; y++) {
    const depth = (y - horizon) / (h - horizon),
      width = 10 + depth * 72,
      centre = cx - depth * w * 0.075;
    for (let x = Math.ceil(centre - width); x <= centre + width; x++) {
      const edge = width - Math.abs(x - centre),
        wear = hash(Math.floor(x / 3), Math.floor(y / 2), 84);
      if (edge < 1 && wear > 0.66) continue;
      let c = wear > 0.94 ? velvet : wine;
      if (edge > 2 + depth && edge < 3.4 + 3 * depth) c = fringe;
      if (edge > 5 + depth * 3 && edge < 8 + depth * 3 && (((y + (x < centre ? x : -x)) % 11) + 11) % 11 < 3)
        c = fringe;
      p.set(x, y, c);
    }
  }
  // Fallen stone at the mouths of the side drifts, bedded into the flags.
  for (const [baseX, baseY, count] of [
    [1, horizon + 2, 14],
    [w * 0.24 - 20, horizon + 1, 9],
    [w * 0.79 + 16, horizon + 1, 11],
    [w - 3, horizon, 7],
  ]) {
    for (let k = 0; k < count; k++) {
      const x = baseX + (hash(k, baseX, 2) - 0.5) * 25,
        y = baseY + hash(k, baseX, 3) * 7;
      const a = 2 + hash(k, baseX, 8) * 4,
        b = 1 + hash(k, baseX, 10) * 3;
      p.ell(x, y + 1, a + 1, b, soot);
      face(
        p,
        [
          [x - a, y],
          [x - a + 1, y - b],
          [x + 1, y - b - 1],
          [x + a, y - 1],
          [x + a - 1, y + 1],
          [x - 1, y + 2],
        ],
        mixc(shale, clay, 0.25 + hash(k, baseX, 18) * 0.5),
      );
      p.line(x - a + 1, y - b, x + 1, y - b - 1, clay);
    }
  }
  // A mine rattle hangs off the western cross-brace. Old animal teeth hang
  // from the lower chain beside a narrow bucket, above the carpet traffic.
  for (let j = 0; j < 7; j++) {
    const xx = 31 + (j > 3 ? 1 : 0),
      yy = 24 + 4 * j;
    p.ell(xx, yy, j % 2 ? 1 : 2, 2, iron);
    p.set(xx, yy - 1, pin);
    p.set(xx, yy, ink);
  }
  for (const d of [-3, 0, 3]) {
    p.line(31, 48, 31 + d * 2, 55 + Math.abs(d), beam);
    p.line(31 + d * 2, 54 + Math.abs(d), 30 + d * 2, 57 + Math.abs(d), fringe);
  }
  for (const x of [w * 0.23, w * 0.8]) {
    const y = horizon - 29;
    for (let k = 0; k < 3; k++) p.line(x - 6 + 3 * k, y, x - 3 + 3 * k, y - 6, clay);
  }
  banner(p, cx - 40, 8, 12, 32);
  banner(p, cx + 28, 8, 12, 32);
  throne(p, cx, horizon + 2);
  for (const [x, y] of [
    [18, 107],
    [203, 109],
    [225, 140],
    [45, 158],
    [86, 183],
    [11, 173],
  ]) {
    for (let i = 0; i < 11; i++) {
      const u = x + Math.round(hash(x, y, i) * 17),
        v = y + Math.round(hash(y, x, i) * 7);
      p.line(u, v, u + 3 + hash(i, x, y) * 6, v - 2 - (i % 3), i % 3 ? clay : grain);
    }
  }
  const amber = hx('#cf8555'),
    wet = hx('#494857');
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const source = Math.min(
        Math.hypot((x - w * 0.35) * 0.86, (y - h * 0.2) * 1.19),
        Math.hypot((x - w * 0.7) * 0.86, (y - h * 0.2) * 1.19),
      );
      const light = Math.max(0, 1 - source / 44),
        shadow = Math.max(0, (Math.abs(x - w * 0.5) - w * 0.29) / (w * 0.25));
      const albedo = p.get(x, y);
      p.set(
        x,
        y,
        mixc(mixc(albedo, amber, Math.floor(light * light * 11) * 0.018), wet, Math.floor(shadow * 9) * 0.016),
      );
    }
  return p;
}
let stone: Px | undefined;
const hall: Scene = (p, t) => {
  if (!stone || stone.w !== p.w || stone.h !== p.h) stone = cavern(p.w, p.h);
  p.data.set(stone.data);
  const phase = (t * Math.PI * 2) / 3;
  for (const [i, x] of [p.w * 0.35, p.w * 0.7].entries()) {
    const y = Math.round(p.h * 0.204),
      a = phase * (2 + i) + 1.7 * i;
    p.line(x, y, x + 2, y - 13, beam);
    p.ell(x + 1, y - 12, 4, 2, iron);
    const top = y - 19 - 2 * Math.cos(a);
    face(
      p,
      [
        [x - 2, y - 13],
        [x - 2, y - 17],
        [x + Math.sin(a) * 2, top - 2],
        [x + 1, y - 18],
        [x + 4, y - 20],
        [x + 3, y - 15],
        [x + 2, y - 12],
      ],
      hx('#ad6243'),
    );
    p.line(x + 1, y - 14, x + Math.cos(a), y - 18, hx('#dec38b'));
    for (let j = 0; j < 3; j++) {
      const u = (t / 3 + j / 3 + i * 0.25) % 1;
      p.set(Math.round(x + 6 * Math.sin(u * 5 + j)), Math.round(y - 18 - u * 14), mixc(clay, grain, 1 - u));
    }
  }
  // Water from a broken gallery roof. Two drops are offset by half a cycle.
  for (const [j, x] of [p.w * 0.09, p.w * 0.85].entries()) {
    const u = (t / 3 + 0.5 * j) % 1,
      floor = p.h * (0.51 + 0.15 * j),
      c = hx('#78747a');
    if (u < 0.54) p.line(x, 20 + (floor - 20) * (u / 0.54) ** 2, x, 22 + (floor - 20) * (u / 0.54) ** 2, c);
    else {
      const k = (u - 0.54) / 0.46,
        r = 1 + k * 8;
      p.line(x - r, floor, x - r * 0.58, floor + 1, c);
      p.line(x + r * 0.58, floor - 1, x + r, floor, c);
    }
  }
};
hall.front = [
  {
    id: 'gnawed-brace',
    depth: 189,
    paint(p) {
      timber(p, -7, 195, 19, -48, 9);
      timber(p, 1, 188, 23, -9, 5);
      for (let i = 0; i < 5; i++) p.line(8 + (i % 3), 161 + i * 2, 14 + (i % 4), 160 + i * 2, clay);
    },
  },
  {
    id: 'abandoned-ore-cart',
    depth: 195,
    paint(p) {
      const x = p.w - 15,
        y = p.h - 13;
      for (const dx of [-12, 6]) {
        p.ell(x + dx, y, 5, 5, ink);
        p.ell(x + dx, y, 2, 2, iron);
      }
      face(
        p,
        [
          [x - 22, y - 17],
          [x - 4, y - 22],
          [x + 19, y - 16],
          [x + 17, y - 4],
          [x - 3, y + 1],
          [x - 19, y - 4],
        ],
        beam,
      );
      face(
        p,
        [
          [x - 22, y - 17],
          [x - 4, y - 22],
          [x + 19, y - 16],
          [x - 1, y - 11],
        ],
        iron,
      );
      for (let j = 0; j < 8; j++) {
        const xx = x - 12 + 3 * j,
          yy = y - 18 - (j % 3);
        p.ell(xx, yy, 3, 2, shale);
        p.set(xx, yy - 1, pin);
      }
      for (const d of [-15, -2, 12]) p.line(x + d, y - 12, x + d + 1, y - 4, iron);
      p.line(x - 18, y - 14, x - 2, y - 10, grain);
    },
  },
];
export default hall;
