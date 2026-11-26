// A moonlit nursery. The insect rests on the brass window catch. The pouf is painted
// in the field effect so its upholstery can take the weight of the removable cushion.
import { hash, hx, mixc } from '../kit/f11-mobkit';
import type { Scene, XY } from '../types';
import type { Px } from '../rig/px';
import { face } from './relief';

export const catchTop: XY = [24, 49];
const sw = (...v: string[]) => v.map((c) => hx(c));
const wood = sw('#665464', '#836675', '#a18084', '#bf9d96', '#dfb8a2');
const wall = sw('#88748d', '#a28c9f', '#be9fa8', '#d3b3ae');
const frame = sw('#554856', '#826474', '#b08886', '#ddaf99', '#ebc5a6');
const sky = sw('#444869', '#62658b', '#777fa0', '#9e9ab0', '#d3c1ba', '#ffe2a6');
const rug = sw('#7f6e83', '#898699', '#9895a7', '#aaa6b2', '#bab5ba', '#d2c2bf');
const room: Scene = (p) => {
  p.rect(0, 0, 159, 127, wood[1]);
  for (let y = 0; y < 79; y++) p.rect(0, y, 159, y, mixc(wall[0], wall[2], y / 92));
  for (let i = 0; i < 16; i++) {
    const x = i * 11 - 4;
    p.line(x, 0, x, 78, mixc(wall[1], wall[0], 0.48));
    if (i % 2 === 0)
      for (let j = 0; j < 4; j++) {
        const y = 11 + j * 18 + (i % 4) * 2;
        p.line(x + 5, y - 2, x + 7, y, wall[1]);
        p.line(x + 7, y, x + 5, y + 2, wall[1]);
        p.line(x + 5, y + 2, x + 3, y, wall[1]);
        p.line(x + 3, y, x + 5, y - 2, wall[1]);
      }
  }
  // Thick beveled porthole, violet glass, a little lit crescent and distant rolling clouds.
  for (const [r, c] of [
    [29, 0],
    [28, 1],
    [26, 3],
    [24.5, 2],
    [23.4, 0],
  ] as const)
    p.ell(26, 28, r, r, frame[c]);
  p.ell(26, 28, 22, 22, sky[1]);
  for (let y = 7; y <= 49; y++) {
    const half = Math.sqrt(Math.max(0, 22 * 22 - (y - 28) ** 2));
    p.line(26 - half, y, 26 + half, y, mixc(sky[0], sky[2], (y - 5) / 47));
  }
  for (const [x, y] of [
    [13, 22],
    [20, 16],
    [32, 24],
    [38, 27],
    [21, 31],
    [12, 32],
    [28, 10],
    [39, 18],
    [33, 34],
  ]) {
    p.set(x, y, sky[4]);
    if (x === 13 || x === 32) {
      p.line(x - 1, y, x + 1, y, sky[3]);
      p.line(x, y - 1, x, y + 1, sky[4]);
    }
  }
  p.ell(29, 18, 5, 5.2, sky[5]);
  p.ell(31, 16.3, 4.6, 4.7, mixc(sky[0], sky[2], 0.25));
  for (let x = 5; x < 48; x++) {
    const lower = 28 + Math.sqrt(Math.max(0, 22 ** 2 - (x - 26) ** 2));
    const upper = 38 + 2 * Math.sin(x * 0.23) + 1.3 * Math.cos(x * 0.48);
    if (lower >= upper) p.rect(x, upper, x, lower, sky[3]);
  }
  p.line(11, 43, 16, 46, frame[1]);
  p.line(14, 48, 36, 48, frame[2]);
  p.rect(12, 50, 40, 52, frame[0]);
  p.rect(12, 49, 39, 50, frame[3]);
  p.rect(22, 49, 25, 50, frame[0]);
  p.line(22, 48, 26, 48, frame[4]);
  // Little linen pennants above the right-hand alcove.
  p.line(105, 0, 122, 8, wood[1]);
  p.line(122, 8, 140, 9, wood[1]);
  p.line(140, 9, 159, 4, wood[1]);
  for (const [x, y, col] of [
    [112, 4, 0],
    [124, 8, 1],
    [137, 9, 2],
    [150, 7, 0],
  ]) {
    const fabric = sw('#ad8194', '#91a2a6', '#c8ab92')[col];
    face(
      p,
      [
        [x, y],
        [x + 7, y + 1],
        [x + 4, y + 9],
      ],
      fabric,
    );
    p.line(x + 1, y + 1, x + 5, y + 1, mixc(fabric, frame[4], 0.45));
  }
  p.rect(0, 69, 159, 78, wood[1]);
  p.line(0, 69, 159, 69, wood[3]);
  p.line(0, 72, 159, 72, wood[2]);
  p.line(0, 78, 159, 78, wood[0]);
  for (let y = 79; y < 128; y++) p.line(0, y, 159, y, mixc(wood[1], wood[3], 0.28 + (y - 79) / 130));
  for (const [j, y] of [85, 96, 112, 127].entries()) {
    p.line(0, y, 159, y, mixc(wood[1], wood[2], 0.34));
    p.line(0, y + 1, 159, y + 1, wood[2]);
    for (let x = j % 2 ? 16 : 42; x < 160; x += 66) p.line(x, y - 6 - j * 2, x + 3 + j * 2, y, wood[1]);
  }
  for (let i = 0; i < 55; i++) {
    const x = hash(i, 7) * 159,
      y = 80 + hash(i, 11) * 47;
    p.line(x, y, x + 2 + hash(i, 19) * 7, y, wood[2]);
  }
  // Woven oval with a double hem. Its quiet middle keeps the little paws legible.
  p.ell(76, 105, 70, 17, rug[0]);
  p.ell(76, 104, 70, 17, rug[2]);
  p.ell(76, 104, 66, 15, rug[3]);
  p.ell(76, 104, 62, 13, rug[1]);
  p.ell(76, 104, 60, 12, rug[2]);
  hem(p, 28, 56);
};
function hem(p: Px, start: number, end: number) {
  for (let i = start; i < end; i++) {
    const a = (i * Math.PI) / 28,
      x = 76 + 67 * Math.cos(a),
      y = 104 + 15.4 * Math.sin(a);
    p.line(x, y, x + 1.1, y + 0.3, rug[5]);
  }
}
room.front = [
  {
    id: 'woven_hem',
    depth: 120,
    paint(p) {
      // The near edge of the rug has tied loops. A paw can pass behind the braid.
      for (let i = 3; i <= 25; i += 2) {
        const a = (i * Math.PI) / 28,
          x = 76 + 69 * Math.cos(a),
          y = 104 + 16.6 * Math.sin(a);
        const dx = 1.6 * Math.cos(a),
          dy = 2.1 * Math.sin(a);
        p.line(x, y, x + dx, y + dy, rug[1]);
        p.line(x + 1, y, x + dx + 1, y + dy, rug[4]);
      }
      hem(p, 0, 28);
    },
  },
];
export default room;
