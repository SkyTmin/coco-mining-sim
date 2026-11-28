import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { fishStop } from '../c/pocket_magnet-poses';
import { hx } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import type { Scene, XY } from '../types';
import { face } from './relief';

const plate = PNG.sync.read(readFileSync(new URL('./sunlit_bench-plate.png', import.meta.url)));
const wood = new Px(160, 128);
wood.data.set(plate.data);
const polygon = (p: Px, points: XY[], color: string) => face(p, points, hx(color));
const bar = (points: XY[], c: string) => polygon(wood, points, c);
bar(
  [
    [2, 9],
    [7, 6],
    [8, 38],
    [4, 39],
  ],
  '#694938',
);
bar(
  [
    [5, 11],
    [28, 13],
    [29, 17],
    [7, 16],
  ],
  '#9d603b',
);
bar(
  [
    [6, 13],
    [23, 16],
    [7, 32],
  ],
  '#7c5138',
);
bar(
  [
    [7, 16],
    [16, 17],
    [7, 26],
  ],
  '#cc8f51',
);
bar(
  [
    [3, 8],
    [27, 10],
    [32, 12],
    [29, 15],
    [4, 12],
  ],
  '#cf9458',
);
wood.line(5, 9, 27, 11, hx('#f0bc75'));
wood.line(6, 14, 27, 16, hx('#6f4438'));
wood.set(5, 10, hx('#53463c'));
wood.set(5, 28, hx('#614737'));
wood.rect(27, 15, 30, 20, hx('#58453e'));
wood.ell(29, 21.2, 3.45, 4.3, hx('#554948'));
wood.ell(29, 21.2, 2.35, 3.1, hx('#b5aea0'));
wood.ell(29, 21, 1.32, 2.1, hx('#796142'));
wood.set(27, 20, hx('#f3deb1'));
// Shallow felt-lined pewter cradle, behind the near edge and its wooden stop.
bar(
  [
    [111, 100],
    [116, 94],
    [146, 94],
    [151, 100],
    [148, 108],
    [112, 108],
  ],
  '#5e4742',
);
bar(
  [
    [111, 99],
    [117, 93],
    [145, 93],
    [150, 99],
    [147, 105],
    [111, 105],
  ],
  '#497477',
);
bar(
  [
    [114, 99],
    [118, 95],
    [144, 95],
    [147, 99],
    [144, 103],
    [114, 103],
  ],
  '#254f55',
);
wood.line(118, 94, 144, 94, hx('#85a6a0'));
wood.line(117, 100, 144, 100, hx('#386065'));
bar(
  [
    [fishStop, 94],
    [147, 94],
    [148, 98],
    [146, 102],
    [fishStop, 102],
  ],
  '#d2a063',
);
wood.line(fishStop, 95, fishStop, 101, hx('#f1c88d'));
wood.line(146, 96, 146, 100, hx('#a37550'));
const scene: Scene = (p, t) => {
  p.data.set(wood.data);
  for (const [x, y, phase] of [
    [41, 28, 0],
    [53, 36, 2.1],
    [98, 13, 4.2],
    [21, 46, 1.3],
  ]) {
    const a = (2 * Math.PI * t) / 3 + phase;
    p.set(x + 1.65 * Math.cos(a), y + 2 * Math.sin(a), [255, 236, 189, Math.round(57 + 24 * Math.cos(a))]);
  }
};
scene.front = [
  {
    id: 'felt-tray-front',
    depth: 106,
    paint(p) {
      polygon(
        p,
        [
          [111, 103],
          [147, 103],
          [149, 101],
          [147, 107],
          [112, 107],
        ],
        '#456b68',
      );
      p.line(113, 103, 146, 103, hx('#8fa398'));
      p.line(113, 107, 145, 107, hx('#3c5455'));
      polygon(
        p,
        [
          [114, 101],
          [116, 99],
          [118, 101],
          [117, 104],
          [114, 104],
        ],
        '#b48555',
      );
      p.set(115, 101, hx('#edc389'));
    },
  },
];
// Felt under the tray lip, or the tabletop at the depth of the hanging star (sparks of the B22 effects land here).
scene.ground = (x) => (x >= 111 && x <= 148 ? 102 : 95);
export default scene;
