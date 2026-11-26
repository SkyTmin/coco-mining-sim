// Morning in the winter glasshouse. The left calathea stands in front of the cork bed.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { Px } from '../rig/px';
import type { Scene } from '../types';
import { face, type Point } from './relief';

const blue = ['#658897', '#8bafb5', '#b8ccbd', '#e7dabb'].map((c) => hx(c));
const iron = ['#435961', '#687b78', '#9caa93'].map((c) => hx(c));
const soil = ['#504639', '#66523d', '#816746', '#9a8052', '#b39c68'].map((c) => hx(c));
const greens = ['#233f43', '#345851', '#4d7561', '#72916f', '#a9ae79'].map((c) => hx(c));
const clay = ['#704b45', '#995e4c', '#ba795b', '#d69c73'].map((c) => hx(c));
// Cool glazed pots keep the coral samara readable as it passes the shelf.
const glaze = ['#435b66', '#647c85', '#819992', '#adb7a3'].map(c => hx(c));

function blade(p: Px, x: number, y: number, u: number, v: number, width: number, shade: number) {
  const dx = u - x,
    dy = v - y,
    len = Math.hypot(dx, dy),
    nx = (-dy / len) * width,
    ny = (dx / len) * width;
  const pt = (t: number, w: number): Point => [x + dx * t + nx * w, y + dy * t + ny * w];
  const mid = pt(0.54, 0.12);
  face(
    p,
    [[x, y], pt(0.24, 0.72), pt(0.5, 1), pt(0.8, 0.63), [u, v], pt(0.74, -0.47), pt(0.42, -0.82), pt(0.19, -0.55)],
    greens[0],
  );
  face(p, [[x, y], pt(0.24, 0.55), pt(0.5, 0.87), pt(0.81, 0.5), [u, v], mid], greens[shade + 1]);
  face(p, [[x, y], mid, [u, v], pt(0.7, -0.37), pt(0.42, -0.7), pt(0.2, -0.4)], greens[shade]);
  p.line(x, y, ...mid, greens[shade + 2]);
  p.line(...mid, u, v, greens[shade + 1]);
  for (const t of [0.25, 0.43, 0.61]) {
    p.line(...pt(t, 0.04), ...pt(t + 0.16, 0.48), greens[shade]);
    p.line(...pt(t, 0.03), ...pt(t + 0.15, -0.39), greens[shade + 1]);
  }
}
function calathea(p: Px) {
  for (const [u, v, w, shade] of [
    [-11, 37, 8, 0],
    [8, 48, 9, 0],
    [30, 48, 9, 1],
    [48, 58, 10, 0],
    [60, 72, 10, 1],
    [50, 86, 10, 0],
    [-8, 73, 10, 0],
    [5, 62, 10, 1],
    [19, 57, 9, 0],
    [38, 65, 9, 1],
    [54, 82, 8, 1],
    [40, 96, 9, 0],
    [20, 83, 11, 1],
    [-7, 95, 10, 1],
    [29, 104, 7, 0],
    [11, 92, 7, 0],
  ]) {
    const x = 7 + (u - 6) * 0.32,
      y = 120 + (v - 120) * 0.42;
    p.line(7, 121, x, y, greens[0]);
    p.line(8, 119, x + 1, y - 1, greens[1]);
    blade(p, x, y, u - 11, v + 3, w * 0.94, shade);
  }
  // The curved lip grounds the near plant. Its open end continues beyond the frame.
  p.ell(5, 121, 14, 3, soil[0]);
  face(
    p,
    [
      [-9, 118],
      [17, 118],
      [13, 129],
      [-8, 129],
    ],
    clay[1],
  );
  p.ell(4, 118, 14, 3, clay[0]);
  p.line(0, 118, 14, 118, clay[3]);
  p.line(2, 122, 12, 122, clay[2]);
}
const glasshouse: Scene = (p, t) => {
  const wave = Math.sin((TAU * t) / 3);
  for (let y = 0; y < 77; y++)
    for (let x = 0; x < p.w; x++) {
      const sun = Math.max(0, 1 - Math.hypot((x - 109) / 115, (y - 32) / 99));
      p.set(x, y, mixc(mixc(blue[0], blue[2], 0.27 + y / 112), blue[3], Math.round(sun * 9) / 13));
    }
  // Trees through frosted panes. Soft edges keep the dotted scales legible in front.
  for (let i = 0; i < 53; i++) {
    const x = hash(i, 8, 4) * 172 - 6,
      y = 37 + hash(i, 5, 2) * 27,
      r = 5 + hash(i, 0, 7) * 11;
    p.ell(x, y + r, r, r, mixc(blue[0], blue[2], 0.48 + hash(i, 4, 3) * 0.4));
  }
  for (const x of [-39, 1, 41, 81, 121, 161]) {
    p.line(x - 9, 0, x + 2, 25, iron[1]);
    p.line(x - 8, 0, x + 3, 25, iron[2]);
    p.line(x + 2, 25, x + 2, 61, iron[1]);
    p.line(x + 3, 25, x + 3, 61, iron[2]);
  }
  p.rect(0, 24, 159, 25, iron[1]);
  p.rect(0, 26, 159, 26, iron[2]);
  p.rect(0, 52, 159, 53, iron[1]);
  // Outside the back wall, stems and seed heads show through the milky lower panes.
  for (let i = 0; i < 32; i++) {
    const x = hash(i, 9, 14) * 162,
      h = 5 + hash(i, 3, 76) * 16,
      top = 56 - h;
    const c = mixc(blue[0], blue[2], 0.52 + hash(i, 4, 16) * 0.27);
    p.line(x, 56, x - 2, top, c);
    for (let j = 1; j < 4; j++) {
      const y = top + j * 2.3,
        side = j % 2 ? 1 : -1;
      p.line(x - 2, y + 3, x - 2 + side * (2 + j * 0.4), y, c);
    }
  }
  // The iron sill has a row of brass clips and shaded pane joints.
  for (const x of [2, 42, 82, 122]) {
    p.rect(x - 1, 23, x + 3, 26, iron[1]);
    p.set(x, 24, blue[3]);
    p.set(x + 2, 25, iron[0]);
  }
  // Side frames of the arched roof, stepped strips of reflected morning light.
  for (const side of [-1, 1]) {
    const x = (n: number) => (side === 1 ? n : 159 - n);
    for (const [a, b, c, d] of [
      [0, 29, 8, 17],
      [8, 17, 21, 7],
      [21, 7, 39, -2],
    ])
      for (let k = 0; k < 3; k++) p.line(x(a), b + k, x(c), d + k, iron[k]);
  }
  for (let i = 0; i < 30; i++) {
    const x = 5 + hash(i, 1, 95) * 149,
      y = 3 + hash(i, 8, 29) * 45;
    p.line(x, y, x + 1, y - 2, mixc(blue[2], blue[3], 0.28 + 0.14 * wave));
  }
  p.rect(0, 59, 159, 66, iron[0]);
  p.rect(0, 58, 159, 59, iron[2]);
  for (let i = 0; i < 2; i++) {
    const x = 136 + i * 15,
      y = 58 - i * 4;
    face(
      p,
      [
        [x - 7, y - 13],
        [x + 8, y - 13],
        [x + 5, y],
        [x - 4, y],
      ],
      glaze[1 + i],
    );
    p.rect(x - 8, y - 14, x + 8, y - 12, glaze[0]);
    p.line(x - 7, y - 14, x + 7, y - 14, glaze[3]);
  }
  // A second, lower pot holds a small rosette. The stones under its foot cast a short shadow.
  p.ell(136, 58, 8, 1.2, iron[0]);
  for (let j = 0; j < 10; j++) {
    const x = 136 + (j - 5) * 1.75,
      y = 34 + Math.abs(j - 5) * 1.18 + hash(j, 2, 5) * 3;
    face(
      p,
      [
        [135, 43],
        [x - 2, y + 4],
        [x, y],
        [x + 1, y + 4],
        [138, 44],
      ],
      j % 2 ? greens[2] : greens[3],
    );
  }
  p.line(129, 44, 142, 44, glaze[3]);
  p.line(132, 55, 138, 56, glaze[2]);
  p.line(146, 50, 152, 50, glaze[2]);
  // A potted maple carries the same single-winged keys as the loose one in the trick.
  const bark = hx('#716953');
  for (const [branchX, y, tipX, v] of [
    [143, 46, 149, 22],
    [149, 22, 158, 4],
    [149, 26, 131, 13],
    [144, 22, 124, 19],
    [152, 15, 140, 6],
    [132, 14, 129, 6],
  ]) {
    const x = branchX + 6,
      u = tipX + 6;
    p.line(x, y, u, v, bark);
    p.line(x + 1, y, u + 1, v, hx('#a49773'));
  }
  for (const [leafX, y, d] of [
    [128, 8, -1],
    [122, 18, -1],
    [139, 6, 1],
    [141, 18, -1],
    [155, 7, 1],
    [132, 14, 1],
    [151, 24, 1],
  ]) {
    const x = leafX + 6;
    face(
      p,
      [
        [x, y],
        [x + d * 3, y - 3],
        [x + d * 3, y - 1],
        [x + d * 7, y - 2],
        [x + d * 5, y + 1],
        [x + d * 7, y + 2],
        [x + d * 3, y + 3],
      ],
      clay[2],
    );
    p.set(x + d * 3, y + 1, clay[3]);
  }
  for (let y = 64; y < 128; y++)
    for (let x = 0; x < 160; x++) {
      const edge = 2 * Math.sin(x / 22) + 1.5 * Math.sin(x / 9);
      if (y < 67 + edge) continue;
      const noise = hash(Math.floor(x / 3), Math.floor(y / 2), 83);
      const light = 0.45 + 0.27 * Math.sin(x / 54 - 0.47) + 0.16 * Math.cos(y / 8 + x / 28) + noise * 0.1;
      p.set(x, y, mixc(soil[1], soil[4], Math.round(light * 8) / 10));
    }
  // Torn cork grain follows long seams; the bed has a raised, scalloped back lip.
  for (let x = 0; x < 160; x++) {
    const y = Math.ceil(67 + 2 * Math.sin(x / 22) + 1.5 * Math.sin(x / 9));
    p.set(x, y, soil[0]);
    p.set(x, y + 1, soil[2]);
    if (x % 4 !== 0) p.set(x, y + 2, soil[4]);
  }
  for (let i = 0; i < 32; i++) {
    const x = hash(i, 5, 91) * 160,
      y = 73 + hash(i, 3, 40) * 52,
      len = 5 + hash(i, 0, 68) * 12;
    let last = y;
    for (let j = 0; j < len; j++) {
      const yy = Math.round(y + Math.sin(j * 0.4 + i) * 0.63 + j * 0.08);
      p.line(x + j, last, x + j + 1, yy, i % 4 ? soil[2] : soil[1]);
      if (j < len * 0.6) p.set(x + j, yy - 1, soil[3]);
      last = yy;
    }
  }
  for (let i = 0; i < 255; i++) {
    const x = hash(i, 3, 3) * 162,
      y = 70 + hash(i, 6, 1) * 57,
      k = hash(i, 2, 8);
    p.line(x, y, x + 1 + k * 3, y - (k > 0.7 ? 1 : 0), k > 0.55 ? soil[3] : soil[2]);
    if (i % 9 === 0) p.set(x + 2, y - 1, soil[4]);
  }
  for (const [x, y, r] of [
    [67, 82, 7],
    [116, 112, 8],
    [33, 99, 4],
    [90, 125, 6],
  ]) {
    for (let i = 0; i < r; i++) {
      const a = hash(i, x, 5) * TAU,
        dx = Math.cos(a) * r * 0.9,
        dy = Math.sin(a) * r * 0.35;
      p.line(x + dx, y + dy, x + dx + 2, y + dy, greens[2]);
      p.set(x + dx + 1, y + dy - 1, greens[4]);
    }
  }
  blade(p, 158, 86, 146, 65, 4, 1);
  blade(p, 159, 88, 152, 73, 4, 0);
};
glasshouse.front = [{ id: 'calathea', depth: 119, paint: calathea }];
export default glasshouse;
