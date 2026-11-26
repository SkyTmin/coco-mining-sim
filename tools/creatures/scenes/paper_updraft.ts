// A last patch of meadow on a bluff. The folding table is set into the front edge of the lookout.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { Px } from '../rig/px';
import type { Scene } from '../types';
import { face } from './relief';

export const wheelAxle = [138, 43] as const;
const tones = (...colors: string[]) => colors.map((c) => hx(c));
const sky = tones('#97b9c3', '#d5d4bf', '#fbdfb1', '#f6ead2');
const hills = tones('#a5b6ab', '#91a5a2', '#a0b49d', '#849a8c', '#bac1a0');
const grass = tones('#798e72', '#94a583', '#a9b493', '#bec39a', '#d2ce9e');
const wood = tones('#62585a', '#8f7766', '#b09576', '#ceb28a', '#dfc8a1');
const clay = tones('#9a8a76', '#bead8e', '#d1c099', '#e2cca3');

function tuft(p: Px, x: number, y: number, h: number, lean: number) {
  for (let i = -1; i <= 1; i++) {
    const end = x + lean + i * (2.2 + h * 0.26);
    p.line(x, y, end, y - h + Math.abs(i) * 2, grass[i === 0 ? 0 : 1]);
    p.set(end, y - h + Math.abs(i) * 2, grass[3]);
  }
}

const meadow: Scene = (p, t) => {
  const wind = Math.sin((TAU * t) / 3);
  p.rect(0, 0, p.w - 1, p.h - 1, hills[4]);
  for (let y = 0; y < 75; y++) {
    p.rect(0, y, 159, y, mixc(sky[0], sky[2], Math.min(1, (y + 2) / 65)));
  }
  for (const [x, y, w] of [
    [20, 15, 14],
    [26, 13, 8],
    [78, 10, 12],
    [83, 8, 6],
    [109, 27, 9],
  ]) {
    p.ell(x + wind * 0.65, y, w, 1.7, mixc(sky[1], sky[3], 0.76));
  }
  // The low sun catches one bank of cloud. Its warm disk silhouettes the taller flags.
  p.ell(112, 17, 8, 8, mixc(sky[2], sky[3], 0.38));
  p.ell(112, 17, 6.5, 6.5, sky[3]);
  for (const [x, y, w] of [
    [5, 23, 11],
    [11, 21.5, 8],
    [18, 22, 6],
    [96, 17, 9],
  ]) {
    p.ell(x + wind * 0.5, y, w, 1.66, mixc(sky[1], sky[3], 0.58));
  }
  // Folded ridgelines and a lake fading into the foothills.
  for (let x = 0; x < 160; x++) {
    const far = 36 + 7 * Math.sin(x * 0.053 + 0.8) + 3 * Math.cos(x * 0.1);
    const near = 49 + 5 * Math.sin(x * 0.06 + 1.5) + 6 * Math.cos(x * 0.038);
    p.rect(x, far, x, 67, hills[0]);
    p.rect(x, near, x, 72, hills[1]);
    p.rect(x, 63 + 2 * Math.sin(x * 0.038), x, 75, mixc(sky[0], hills[4], 0.32));
    const top = 71 + 4 * Math.sin(x * 0.041 + 0.55) + 2 * Math.sin(x * 0.1);
    p.rect(x, top, x, 127, grass[2]);
  }
  for (let i = 0; i < 24; i++) {
    const x = hash(i, 4, 19) * 158,
      y = 66 + hash(i, 3, 20) * 7;
    p.line(x, y, x + 2 + hash(i, 5, 15) * 7, y, mixc(sky[1], hills[4], 0.5));
  }
  // Pale facets on the far bluff and three tiny sails on the water separate its depth planes.
  for (const [x, y, w] of [
    [27, 32, 12],
    [91, 34, 10],
    [134, 41, 9],
  ]) {
    face(
      p,
      [
        [x - w, y + 6],
        [x, y],
        [x + 6, y + 8],
        [x + 1, y + 4],
      ],
      mixc(hills[0], sky[1], 0.29),
    );
  }
  for (const [x, y] of [
    [42, 68],
    [85, 67],
    [111, 70],
  ]) {
    face(
      p,
      [
        [x, y - 3],
        [x, y],
        [x - 3, y],
      ],
      mixc(sky[3], hills[4], 0.43),
    );
    p.line(x - 3, y + 1, x + 2, y + 1, hills[1]);
  }
  // One distant weather vane, small enough to leave the paper toy a clean sky.
  p.rect(13, 49, 14, 68, hills[3]);
  p.line(9, 51, 20, 51, hills[3]);
  p.line(16, 51, 20, 48, hills[3]);
  for (const [x, y] of [
    [31, 66],
    [37, 69],
    [84, 65],
    [94, 61],
    [121, 66],
    [113, 66],
  ]) {
    face(
      p,
      [
        [x - 4, y + 3],
        [x - 2, y - 2],
        [x + 1, y - 4],
        [x + 5, y + 2],
      ],
      hills[3],
    );
    p.line(x - 2, y - 2, x + 1, y - 4, hills[4]);
  }
  for (let x = 0; x < 160; x++) {
    const path = 95 + 5 * Math.sin(x * 0.043 - 0.9) - x * 0.043;
    p.rect(x, path, x, 127, clay[2]);
    p.line(x, path - 1, x, path + 1, grass[3]);
    if ((x + 3) % 7 < 3) p.set(x, path + 2, clay[3]);
  }
  for (let i = 0; i < 132; i++) {
    const x = hash(i, 3, 5) * 160,
      y = 78 + hash(i, 3, 36) * 49;
    if (y > 97 + 5 * Math.sin(x * 0.043 - 0.9) - x * 0.043) {
      p.line(x, y, x + 2 + hash(i, 7, 4) * 3, y, i % 3 ? clay[1] : clay[3]);
    } else if (y > 77) {
      p.line(x, y, x + 2, y - 1, grass[i % 4]);
      if (i % 8 === 0) p.set(x + 2, y - 2, sky[3]);
    }
  }
  for (const [x, y, h] of [
    [4, 91, 6],
    [11, 82, 4],
    [27, 81, 5],
    [77, 79, 4],
    [123, 83, 4],
    [150, 91, 6],
    [158, 87, 8],
  ])
    tuft(p, x, y, h, wind);
  // Muslin pennants on the meadow fence give a quieter, more distant sign of the breeze.
  p.line(0, 59, 15, 62, hills[3]);
  p.line(15, 62, 33, 58, hills[3]);
  for (const [x, y] of [
    [4, 60],
    [11, 61],
    [19, 61],
    [27, 60],
  ]) {
    face(
      p,
      [
        [x, y],
        [x + 4, y],
        [x + 1.2 + wind, y + 4],
      ],
      mixc(x % 2 ? clay[1] : hills[1], sky[1], 0.22),
    );
  }
  for (const [x, y] of [
    [5, 92],
    [16, 86],
    [22, 88],
    [76, 81],
    [119, 83],
    [152, 91],
    [147, 88],
  ]) {
    p.line(x, y + 2, x + 1, y - 2, grass[0]);
    p.set(x, y - 2, sky[3]);
    p.set(x + 2, y - 2, sky[3]);
    p.set(x + 1, y - 3, clay[3]);
    p.set(x + 1, y - 2, clay[0]);
  }
  // The pinwheel is hinged to this stationary post; only its paper and axle cap move.
  const [wx, wy] = wheelAxle;
  face(
    p,
    [
      [wx + 2, wy],
      [wx + 4, wy + 1],
      [wx + 3, 91],
      [wx, 91],
    ],
    wood[1],
  );
  p.line(wx + 2, wy + 4, wx + 1, 89, wood[3]);
  p.line(wx - 3, 91, wx + 7, 91, grass[0]);
  // The lookout sill has a broad top for both feet and a bevel over the frame.
  face(
    p,
    [
      [69, 118],
      [126, 118],
      [135, 125],
      [63, 125],
    ],
    wood[2],
  );
  p.line(69, 118, 126, 118, wood[0]);
  p.line(69, 119, 126, 119, wood[4]);
  p.rect(63, 125, 135, 127, wood[1]);
  p.line(64, 125, 134, 125, wood[3]);
  p.line(64, 127, 134, 127, wood[0]);
  for (const x of [73, 88, 113]) p.line(x, 121, x + 8, 121, wood[3]);
  for (const x of [71, 124]) {
    p.set(x, 123, wood[0]);
    p.set(x + 1, 122, wood[4]);
  }
};
meadow.front = [
  {
    id: 'clover',
    depth: 126,
    paint(p) {
      tuft(p, 0, 128, 11, 1.6);
      tuft(p, 7, 126, 6, 1);
      tuft(p, 158, 128, 9, 1.5);
    },
  },
];
export default meadow;
