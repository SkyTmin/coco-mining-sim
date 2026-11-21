import { meadowPebble } from './meadow_colossus-pebble';
// The hill is part of the animal. Every root, flower and stone uses the shell's moving frame.
import { hx, hash, mixc, TAU, tn } from '../kit/f11-mobkit';
import { F3, Rig, type Mat, type V3 } from '../rig/f15-rig';
import type { HeavySkeleton } from '../bodies/heavy-quadruped';

function surface(
  colors: [string, string, string, string],
  vein: 'wood' | 'moss' | 'stone' | 'horn',
): Mat {
  const T = tn(...colors);
  const mids = [
    mixc(T[0], T[1], 0.56),
    mixc(T[1], T[2], 0.54),
    mixc(T[2], T[3], 0.55),
  ];
  return {
    T,
    pat: ([x, y, z], l) => {
      const grains =
        vein === 'wood'
          ? Math.sin(19 * y + 2 * Math.sin(7 * x) + 5 * z)
          : vein === 'horn'
            ? Math.cos(17 * z + 4 * Math.sin(1.2 * x + 1.6 * y))
            : vein === 'stone'
              ? Math.sin(8 * x + 9 * y + 3 * z) +
                0.66 * Math.sin(15 * y - 10 * z)
              : Math.sin(12 * x + 4 * z) * 0.74 +
                Math.sin(18 * y - 6 * x + 3 * z) * 0.61;
      return grains > 0.33 && grains < 1.01
        ? mids[l > 0.58 ? 2 : l > 0.03 ? 1 : 0]
        : null;
    },
  };
}
const sod = surface(['#34432b', '#536835', '#809740', '#b0bc57'], 'moss');
const loam = surface(['#493229', '#695039', '#937246', '#b18d55'], 'wood');
const horn = surface(['#614228', '#a8793d', '#d6a150', '#efc785'], 'horn');
const plate = surface(['#4d4634', '#776c44', '#9d8b57', '#bcac76'], 'horn');
const slate = surface(['#444541', '#676a5b', '#909180', '#b7b39a'], 'stone');
const wood = surface(['#49352b', '#765332', '#a27a43', '#c99a58'], 'wood');
const foliage = surface(['#34442b', '#526136', '#829141', '#b3ba54'], 'moss');
const leafyGold = surface(['#58472c', '#82703a', '#b29549', '#d8b95e'], 'moss');
const leafColors = ['#556a32', '#647d39', '#7b9141', '#9eaa4d', '#bbc26d'].map(
  (c) => hx(c),
);
const rimGlint = hx('#e9c276'),
  crease = hx('#695538'),
  mossDot = hx('#92994d');

const shellHalfWidth = 22.6;

function shellPoint(f: F3, angle: number, latitude: number, relief = 0): V3 {
  const u = Math.sin(latitude),
    v = Math.cos(latitude);
  const headArch = Math.max(0, Math.cos(angle)) ** 4 * 3.3;
  return f.p(
    -3.8 + (24 + relief) * Math.cos(angle) * u,
    (shellHalfWidth + relief) * Math.sin(angle) * u,
    4.3 + 12.6 * v + headArch * u ** 3,
  );
}
function rim(r: Rig, f: F3) {
  const count = 16;
  for (let i = 0; i < count; i++) {
    const a = ((i + 0.05) * TAU) / count,
      b = ((i + 0.94) * TAU) / count,
      m = (a + b) / 2;
    const upper = [
      shellPoint(f, a, 1.37, 0.4),
      shellPoint(f, m, 1.34, 0.5),
      shellPoint(f, b, 1.36, 0.4),
    ];
    const base = [
      shellPoint(f, b, 1.65, 0.2),
      shellPoint(f, m, 1.72, 0.45),
      shellPoint(f, a, 1.69, 0.3),
    ];
    r.poly([...upper, ...base], horn);
    r.line(upper[0], upper[1], rimGlint, 0, 0.95);
    r.line(base[1], base[2], crease, 0, 0.4);
  }
}
function shellPlates(r: Rig, f: F3) {
  for (let i = 0; i < 10; i++) {
    const a = (i * TAU) / 10 + 0.025,
      b = ((i + 1) * TAU) / 10 - 0.024,
      m = (a + b) / 2;
    const contour = [
      [a + 0.08, 1.02],
      [m, 0.9],
      [b - 0.02, 0.97],
      [b, 1.23],
      [b - 0.03, 1.37],
      [m, 1.42],
      [a + 0.04, 1.34],
      [a, 1.2],
    ];
    const polygon = contour.map(([ang, lat]) => shellPoint(f, ang, lat, 0.78));
    const center = shellPoint(f, m, 1.17, 1.24);
    for (let j = 0; j < polygon.length; j++)
      r.poly([polygon[j], polygon[(j + 1) % polygon.length], center], plate);
    r.line(polygon[2], polygon[3], hx('#5b513b'), 0, 1.4);
    r.line(polygon[3], polygon[4], hx('#5b513b'), 0, 1.4);
    r.line(
      shellPoint(f, a + 0.12, 1.28, 1.3),
      shellPoint(f, m, 1.32, 0.9),
      crease,
      0,
      1,
    );
    r.line(
      shellPoint(f, m, 1.32, 0.9),
      shellPoint(f, b - 0.09, 1.27, 0.9),
      crease,
      0,
      1,
    );
    r.line(
      shellPoint(f, a + 0.09, 1.13, 0.94),
      shellPoint(f, a + 0.16, 1.02, 0.94),
      rimGlint,
      0,
      0.8,
    );
    if (i % 3 !== 1) {
      for (let j = 0; j < 6; j++) {
        const n = hash(i, j, 41);
        r.dot(
          shellPoint(
            f,
            m + (n - 0.5) * 0.21,
            1.08 + hash(i, j, 12) * 0.1,
            1.03,
          ),
          j % 3 ? mossDot : hx('#b4b285'),
          0,
          0.8,
          0.95,
        );
      }
    }
  }
}
function turfZ(x: number, y: number) {
  return (
    4.9 +
    13.1 *
      Math.sqrt(
        Math.max(0, 1 - ((x + 4.2) / 24.0) ** 2 - (y / shellHalfWidth) ** 2),
      )
  );
}
function boulder(r: Rig, f: F3, w: number, d: number, h: number, spin = 0) {
  const g = f.turn(spin),
    bottom: V3[] = [],
    brow: V3[] = [],
    top: V3[] = [];
  const radius = [1, 0.95, 0.89, 1.06, 0.92, 1.0];
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6 + 0.18,
      x = Math.cos(a) * w * radius[i],
      y = Math.sin(a) * d * radius[i];
    bottom.push(g.p(x * 0.87, y * 0.87, -h * 0.47));
    brow.push(g.p(x, y, h * (-0.02 + 0.16 * Math.sin(2 * a))));
    top.push(
      g.p(x * 0.66 - w * 0.11, y * 0.68, h * (0.47 + 0.12 * Math.cos(a))),
    );
  }
  for (let i = 0; i < 6; i++) {
    const j = (i + 1) % 6;
    r.poly([bottom[i], bottom[j], brow[j], brow[i]], slate);
    r.poly([brow[i], brow[j], top[j], top[i]], slate);
  }
  r.poly(top, slate);
  r.line(top[1], top[2], hx('#c8c3a5'), 0, 0.9);
  r.line(top[0], g.p(w * 0.42, d * 0.37, h * 0.1), hx('#69695b'), 0, 0.9);
}
function tree(r: Rig, s: HeavySkeleton, golden: boolean) {
  const o = s.body.at(-9.8, 5.0, turfZ(-9.8, 5.0) - 1.15);
  const f = o.pitch(s.pose['tree.pitch'] ?? 0).roll(s.pose['tree.roll'] ?? 0);
  r.tag = 'tree';
  for (const [x, y] of [
    [-4.6, 2.2],
    [4.5, 1.9],
    [1, -4.8],
  ]) {
    const foot = s.body.p(-9.8 + x, 5.0 + y, turfZ(-9.8 + x, 5.0 + y) + 0.22);
    r.cap(f.p(0, 0, 2.2), foot, 1.5, 0.39, wood);
  }
  const hip = f.p(0.7, 0, 3),
    elbow = f.p(-1.8, 0, 6.7),
    fork = f.p(0.25, 0, 10.4);
  r.cap(o.o, hip, 2.0, 1.65, wood);
  r.cap(hip, elbow, 1.65, 1.35, wood);
  r.cap(elbow, fork, 1.38, 1.0, wood);
  r.line(f.p(0.6, 0.9, 1), f.p(-1, 1.12, 6.6), hx('#bc9254'));
  const tips: V3[] = [
    [-5.9, 4.4, 10.4],
    [0.0, -0.3, 16.5],
    [5.8, -4.9, 13.1],
  ];
  const canopy = golden ? leafyGold : foliage;
  for (let i = 0; i < 3; i++) {
    const [x, y, z] = tips[i];
    const joint = f.p(x * 0.56, y * 0.65, z - 3.5);
    r.cap(i === 0 ? elbow : fork, joint, 1.1, 0.73, wood);
    r.cap(joint, f.p(x, y, z), 0.75, 0.4, wood);
    const c = f.at(x, y, z),
      w = i === 1 ? 5.85 : 5.35,
      h = i === 1 ? 4.1 : 3.4;
    r.ell(c, [0, 0, 0], [w, 4.1, h], canopy);
    for (let j = 0; j < 7; j++) {
      const a = (j * TAU) / 7 + 0.22 * i;
      r.ell(
        c,
        [
          w * 0.63 * Math.cos(a),
          2.7 * Math.sin(a),
          0.4 + 0.74 * Math.sin(a * 2),
        ],
        [2.35, 1.75, 2.15],
        canopy,
      );
    }
    for (let j = 0; j < 12; j++) {
      const a = j * 2.399 + i * 0.61,
        v = 0.22 + 0.66 * hash(i, j, 13),
        u = Math.sqrt(1 - v * v);
      const p = c.p(w * u * Math.cos(a), 4.1 * u * Math.sin(a), h * v);
      r.dot(p, leafColors[2 + (j % 3)], 0, 1, 0.8);
    }
  }
  s.points.treeCrown = f.p(...tips[1]);
}
function flower(
  r: Rig,
  f: F3,
  x: number,
  y: number,
  z: number,
  opening: number,
) {
  const p = f.p(x, y, z + 1.8);
  r.line(f.p(x - 0.35, y, z - 0.5), p, hx('#627636'));
  for (const [dx, dy] of [
    [-0.75, 0],
    [0.75, 0],
    [0, -0.64],
    [0, 0.64],
  ]) {
    r.dot(
      f.p(x + dx * opening, y + dy * opening, z + 1.9),
      hx('#f4e6bb'),
      0,
      0.95,
      1.2,
    );
  }
  r.dot(p, hx('#ddae48'), 0, 0.68, 1.45);
}
export function drawHill(r: Rig, s: HeavySkeleton, gold: boolean) {
  const f = s.body;
  r.tag = 'shell';
  r.ell(
    f,
    [-3.8, 0, 4.3],
    [24.15, shellHalfWidth + 0.05, 12.6],
    plate,
    (q) => q[2] < -0.23,
  );
  shellPlates(r, f);
  r.tag = 'rim';
  rim(r, f);
  r.tag = 'turf';
  r.ell(
    f,
    [-4.15, 0, 4.6],
    [24.4, shellHalfWidth + 0.1, 13],
    loam,
    (q) => q[2] < 0.57 + 0.045 * Math.sin(16 * q[0] + 4 * q[1]),
  );
  r.ell(
    f,
    [-4.2, 0, 4.9],
    [24, shellHalfWidth, 13.1],
    sod,
    (q) => q[2] < 0.65 + 0.044 * Math.cos(17 * q[1] + 7 * q[0]),
  );
  for (let i = 0; i < 45; i++) {
    const a = i * 2.399963,
      rad = Math.sqrt((i + 0.5) / 45) * 0.88;
    const x = -4.2 + 24 * rad * Math.cos(a),
      y = shellHalfWidth * rad * Math.sin(a),
      z = turfZ(x, y);
    if (i % 5 === 2)
      flower(r, f, x, y, z, 1 + (s.pose['flower.bloom'] ?? 0) * 0.85);
    else {
      const c = leafColors[i % 5],
        start = f.p(x, y, z);
      r.ell(f, [x, y, z - 0.4], [1.7, 1.3, 0.72], sod);
      r.line(
        start,
        f.p(x - 0.4, y - 0.25, z + 1.3 + (i % 3) * 0.48),
        c,
        0,
        0.92,
      );
      if (i % 3 === 0)
        r.line(start, f.p(x + 1.05, y + 0.4, z + 1.3), leafColors[4], 0, 1);
    }
  }
  tree(r, s, gold);
  r.tag = 'rock';
  boulder(r, f.at(-18, -0.7, turfZ(-18, -0.7) + 1.2), 2.75, 2.3, 4.1, 0.38);
  boulder(r, f.at(-0.7, -3.8, turfZ(-0.7, -3.8) + 1.65), 5.0, 3.25, 5.9, -0.26);
  const rx = 12.2,
    ry = 2.75,
    rz = turfZ(rx, ry) + 1.55;
  s.points.rockRest = f.p(rx, ry, rz);
  const pebble = meadowPebble(s, [rx, ry, rz]);
  boulder(r, pebble.turn(s.pose['rock.turn'] ?? 0), 3.0, 2.6, 4.9, 0.36);
  s.points.rock = pebble.o;
  s.points.shellFront = f.p(16.9, 1, turfZ(16.9, 1));
}
