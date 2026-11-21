// An observatory terrace suspended above a star field. The astrolabe in the
// paving uses the same vanishing lines as the outlying terraces and causeway.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import { face, type Point } from './relief';
import type { Scene } from '../types';

const sky = ['#181b35', '#282b49', '#343450', '#48425e'].map((c) => hx(c));
const cloud = ['#373650', '#48405f', '#514361', '#674d68', '#635573', '#706481'].map((c) => hx(c));
const slate = ['#252639', '#343448', '#444154', '#504b5d', '#61596a', '#706478'].map((c) => hx(c));
const metal = ['#494354', '#796773', '#a18a82', '#bea58f'].map((c) => hx(c));
const pale = hx('#cfc1ae'),
  star = hx('#c3ccd1'),
  ice = hx('#939abd');
const horizon = 76;

export function sparkle(p: Px, x: number, y: number, bright: number) {
  const light = bright > 0.8 ? pale : bright > 0.36 ? star : ice;
  p.set(x, y, light);
  if (bright > 0.66) {
    p.line(x - 1, y, x + 1, y, ice);
    p.line(x, y - 1, x, y + 1, ice);
    p.set(x, y, light);
  }
  if (bright > 0.94) p.set(x, y + 2, cloud[5]);
}

export function islet(p: Px, x: number, y: number, width: number, depth: number) {
  const top: Point[] = [
    [x - width, y],
    [x - width * 0.72, y - 2],
    [x + width * 0.15, y - 4],
    [x + width, y - 2],
    [x + width * 0.77, y + 1],
    [x - width * 0.45, y + 2],
  ];
  face(
    p,
    [
      [x - width, y],
      [x + width, y - 2],
      [x + width * 0.37, y + depth * 0.45],
      [x + width * 0.12, y + depth],
      [x - width * 0.37, y + depth * 0.62],
    ],
    sky[1],
  );
  face(
    p,
    [
      [x - width * 0.55, y],
      [x + width * 0.3, y],
      [x + width * 0.12, y + depth],
      [x - width * 0.17, y + depth * 0.44],
    ],
    sky[2],
  );
  for (let i = 0; i < 5; i++) {
    const u = (i + 1) / 7,
      xx = x + width * (0.86 - u * 1.43);
    const yy = y + 2 + Math.sin(Math.PI * u) * (depth * 0.36);
    p.line(xx, yy, xx - width * 0.12, yy + 2, i % 2 ? cloud[0] : slate[1]);
    p.set(xx - 1, yy + 1, cloud[2]);
  }
  face(p, top, cloud[1]);
  p.line(x - width, y, x - width * 0.4, y + 1, cloud[4]);
  p.line(x - width * 0.33, y + 2, x + width * 0.3, y + 1, cloud[3]);
}

function night(p: Px) {
  // A broken river of nebula dust crosses the upper left and recedes behind
  // the right-hand spire. Ordered grain gives the clouds broad pixel clusters.
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const curve = 14 + x * 0.24 + 5 * Math.sin(x / 31);
      const drift = 3 * Math.sin(x / 8 + y / 10) + 3 * Math.cos(x / 17 - y / 9);
      const dust = (17 - Math.abs(y - curve + drift)) / 17;
      const grain = hash(x >> 1, y >> 1, 811);
      const band = Math.max(0, Math.min(3, Math.floor(y / 32 + grain * 0.34)));
      let color = sky[band];
      if (dust + grain * 0.16 > 0.15) {
        const seam = Math.sin(x / 15 - y / 7) * 0.17 + Math.cos(x / 20 + y / 12) * 0.12;
        const level = Math.floor((dust + seam + grain * 0.12) * 4);
        color = cloud[Math.max(0, Math.min(5, level))];
      }
      p.set(x, y, color);
    }
  }
  for (let i = 0; i < 112; i++) {
    const x = hash(i, 45) * p.w,
      y = hash(i, 901) * horizon;
    if (i % 13 === 0) sparkle(p, x, y, 0.76);
    else p.set(x, y, hash(i, 77) > 0.65 ? ice : cloud[5]);
  }
  // A remote crescent floats over the Outer Steps. Its dark side contains
  // the local sky, so the nebula remains visible between the two horns.
  const cx = 26,
    cy = 18,
    r = 9;
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      const radius = Math.hypot(x + 0.3, y);
      if (radius < r && Math.hypot(x - 3, y + 2) > r - 1) {
        p.set(cx + x, cy + y, radius > r - 1 ? metal[2] : hash(x >> 1, y >> 1, 45) > 0.73 ? pale : metal[3]);
      }
    }
  islet(p, 9, 67, 18, 13);
  islet(p, 53, 64, 9, 8);
  islet(p, 139, 63, 22, 17);
  islet(p, 104, 73, 6, 7);
  // Three dark arches of the distant, broken equatorial walkway.
  for (let i = 0; i < 3; i++) {
    const x = 119 + i * 8,
      y = 60 - i;
    p.line(x, y, x, y - 6, sky[0]);
    p.line(x + 5, y - 1, x + 5, y - 7, sky[0]);
    p.line(x, y - 6, x + 2, y - 9, sky[0]);
    p.line(x + 2, y - 9, x + 5, y - 7, sky[0]);
    p.line(x + 1, y - 7, x + 2, y - 8, cloud[3]);
  }
  face(
    p,
    [
      [140, 59],
      [141, 45],
      [143, 40],
      [145, 47],
      [146, 59],
    ],
    sky[1],
  );
  p.line(143, 41, 143, 49, metal[1]);
  // Broken apse of the far observatory. The gaps in its gallery still show the sky.
  face(
    p,
    [
      [4, 62],
      [4, 57],
      [8, 52],
      [12, 52],
      [16, 56],
      [16, 62],
    ],
    sky[1],
  );
  p.line(3, 57, 8, 51, cloud[3]);
  p.line(8, 51, 12, 51, metal[1]);
  p.line(12, 52, 16, 56, cloud[2]);
  p.line(8, 54, 6, 57, cloud[4]);
  p.line(9, 50, 10, 46, metal[2]);
  p.set(10, 45, ice);
  for (let j = 0; j < 4; j++) {
    const x = 4 + j * 4;
    p.line(x, 58, x, 64, sky[0]);
    p.set(x, 58, cloud[4]);
    p.line(x, 64, x + 3, 64, cloud[1]);
  }
  // The last dock light on a chain, hanging over the dream current.
  p.line(144, 68, 144, 76, sky[1]);
  p.set(144, 77, metal[2]);
  p.set(144, 78, ice);
  const lyre: Point[] = [
    [111, 8],
    [115, 13],
    [124, 11],
    [120, 6],
    [115, 13],
  ];
  for (let i = 1; i < lyre.length; i++) p.line(...lyre[i - 1], ...lyre[i], sky[2]);
  for (const [x, y] of lyre) p.set(x, y, ice);
}

function terrace(p: Px) {
  const edge = (x: number) => horizon + Math.round(5 * Math.cos((x - 73) / 85));
  for (let y = horizon - 4; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const z = y - edge(x);
      if (z < 0) continue;
      if (z < 2) {
        p.set(x, y, z === 0 ? metal[2] : slate[2]);
        continue;
      }
      const dx = x - 79,
        dy = (y - 122) * 2.65,
        radius = Math.hypot(dx, dy);
      const angle = Math.atan2(dx, -dy);
      const joints = [30, 58, 84, 109, 131];
      const slab = joints.filter((v) => radius > v).length;
      const span = slab < 2 ? 0.5 : 0.32,
        a = angle / span + slab * 0.43;
      const tile = Math.floor(a);
      const groove =
        joints.some((v) => Math.abs(radius - v) < 1.15) ||
        (radius > 12 && Math.abs(a - Math.round(a)) * span * radius < 0.7);
      const tone = Math.min(5, 2 + Math.floor(hash(tile, slab, 854) * 2) + Number(y > 113));
      let color = groove ? slate[1] : slate[tone];
      if (slab === 3 && radius > 86 && radius < 87.8) color = metal[1];
      if (!groove && y > edge(x) + 4 && hash(x, y, 39) > 0.967) color = mixc(color, slate[5], 0.46);
      p.set(x, y, color);
    }
  // Surveyor's scale and hand-cut star inlays, level with the walking surface.
  for (let j = -12; j <= 12; j++) {
    const a = j * 0.095,
      x = 79 + Math.sin(a) * 93,
      y = 122 - (Math.cos(a) * 93) / 2.65;
    const n = j % 3 === 0 ? 3.2 : 1.4;
    p.line(x, y, x + Math.sin(a) * n, y - (Math.cos(a) * n) / 2.65, metal[j % 3 === 0 ? 2 : 1]);
  }
  for (const [x, y] of [
    [21, 105],
    [133, 101],
    [51, 118],
    [99, 90],
  ]) {
    face(
      p,
      [
        [x - 4, y],
        [x - 1, y - 1],
        [x, y - 3],
        [x + 1, y - 1],
        [x + 4, y],
        [x + 1, y + 1],
        [x, y + 2],
        [x - 1, y + 1],
      ],
      metal[1],
    );
    p.set(x, y, metal[2]);
  }
}

function armillary(p: Px, x: number, y: number, h: number) {
  const brass = metal[1];
  face(
    p,
    [
      [x - 6, y],
      [x - 3, y - 3],
      [x + 3, y - 3],
      [x + 6, y],
      [x + 3, y + 2],
      [x - 5, y + 2],
    ],
    slate[1],
  );
  face(
    p,
    [
      [x - 3, y],
      [x - 2, y - h],
      [x + 2, y - h],
      [x + 3, y],
    ],
    slate[3],
  );
  p.line(x - 2, y - h + 1, x - 2, y - 2, metal[2]);
  const cy = y - h - 5;
  for (let k = 0; k < 2; k++) {
    let prev: Point = [x, cy];
    for (let i = 0; i <= 22; i++) {
      const a = (i * TAU) / 22,
        rx = 5 * Math.cos(a),
        ry = 2 * Math.sin(a);
      const point: Point = k ? [x + rx * 0.55 - ry, cy + rx * 0.8 + ry * 0.45] : [x + rx, cy + ry];
      if (i) p.line(...prev, ...point, i < 10 ? metal[2] : brass);
      prev = point;
    }
  }
  p.set(x, cy, pale);
}

let cache: Px;
const paint: Scene = (p, t) => {
  if (!cache || cache.w !== p.w || cache.h !== p.h) {
    cache = new Px(p.w, p.h);
    night(cache);
    terrace(cache);
    armillary(cache, 9, 88, 8);
  }
  p.data.set(cache.data);
  const a = (t * TAU) / 3;
  for (let i = 0; i < 8; i++)
    sparkle(p, 4 + hash(i, 61) * (p.w - 8), 4 + hash(i, 83) * 58, 0.5 + 0.5 * Math.cos(a + i * 0.9));
  // Small dream lights drift in closed orbits under the outer rim.
  for (let i = 0; i < 5; i++) {
    const x = 13 + i * 32 + Math.cos(a + i * 1.3) * 3,
      y = 70 + 4 * Math.sin(a + i * 0.7);
    p.set(x - 1, y + 1, cloud[4]);
    p.set(x, y, i % 2 ? ice : metal[2]);
  }
  // The brass azimuth needle sweeps a small full circle once every 72 exposures.
  const needleX = 9 + Math.cos(a) * 3,
    needleY = 75 + Math.sin(a) * 1.7;
  p.line(9, 75, needleX, needleY, metal[2]);
  p.set(needleX, needleY, mixc(metal[2], pale, (1 + Math.sin(a + 0.28)) * 0.5));
  const u = (t / 3 + 0.07) % 1;
  if (u < 0.32) {
    const s = u / 0.32,
      x = 100 + 21 * s,
      y = 8 + 8 * s;
    p.line(x - 4, y - 1, x - 1, y, cloud[s > 0.72 ? 2 : 4]);
    p.set(x, y, s > 0.85 ? cloud[4] : star);
  }
};
paint.front = [{ id: 'near-star-globe', depth: 124, paint: (p) => armillary(p, 153, 123, 9) }];
export default paint;
