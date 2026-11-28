import { hash, hx, mixc } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import type { Scene, XY } from '../types';
import { roundels, puckMark, railX } from '../c/opal_skater-keys';
import { face } from './relief';

const color = (s: string) => hx(s);
function spruce(p: Px, x: number, y: number, h: number, dark: string, snow: string) {
  p.line(x, y - h, x, y, color(dark));
  for (let i = 1; i <= 4; i++) {
    const z = y - h + (i * h) / 5,
      w = (i * h) / 23;
    face(
      p,
      [
        [x, z - h / 4],
        [x + w, z + 1],
        [x - w, z + 2],
      ],
      color(dark),
    );
    p.line(x - w + 1, z, x - 0.5, z - h / 5, color(snow));
  }
}
function cottage(p: Px, x: number, y: number, width: number, h: number) {
  const left = x - width / 2,
    right = x + width / 2,
    ridge = y - h - 6;
  p.rect(left + 2, y - h, right - 2, y, color('#976f79'));
  p.rect(right - 5, ridge - 1, right - 3, y - h, color('#835e6b'));
  face(
    p,
    [
      [left - 2, y - h + 1],
      [x - 2, ridge],
      [right + 2, y - h],
      [right, y - h + 3],
      [left, y - h + 4],
    ],
    color('#76697c'),
  );
  face(
    p,
    [
      [left - 2, y - h],
      [x - 2, ridge - 1],
      [right + 2, y - h - 1],
      [right - 1, y - h + 1],
      [x - 2, ridge + 2],
    ],
    color('#e6d3ce'),
  );
  for (let k = left + 4; k < right - 3; k += 5) {
    p.rect(k, y - h + 5, k + 2, y - 2, color('#f0bb92'));
    p.set(k, y - 3, color('#ffe3a6'));
  }
}
function paintField(p: Px) {
  for (let y = 0; y < 64; y++)
    p.rect(0, y, 159, y, mixc(color('#8994ae'), color('#f8ceaa'), Math.min(1, y / 49)));
  p.ell(128, 27, 12, 12, color('#f4c6a4'));
  p.ell(128, 27, 9, 9, color('#ffe1b0'));
  for (let i = 0; i < 18; i++) {
    const x = hash(i, 1, 67) * 160,
      y = 3 + hash(i, 2, 67) * 27;
    p.line(x, y, x + 6 + hash(i, 3, 67) * 18, y, color(y < 16 ? '#aaa5b3' : '#e7bcb1'));
  }
  face(
    p,
    [
      [0, 52],
      [0, 35],
      [14, 30],
      [22, 34],
      [46, 20],
      [60, 32],
      [73, 27],
      [89, 39],
      [105, 26],
      [127, 39],
      [144, 32],
      [159, 37],
      [159, 54],
    ],
    color('#ab9cab'),
  );
  face(
    p,
    [
      [27, 32],
      [46, 20],
      [54, 27],
      [49, 26],
      [46, 24],
      [43, 26],
      [40, 26],
    ],
    color('#e2ccd1'),
  );
  face(
    p,
    [
      [94, 33],
      [105, 26],
      [113, 31],
      [107, 30],
      [105, 29],
      [102, 31],
    ],
    color('#dfc7ca'),
  );
  face(
    p,
    [
      [0, 42],
      [19, 37],
      [37, 45],
      [59, 38],
      [85, 45],
      [112, 37],
      [135, 44],
      [159, 34],
      [159, 61],
      [0, 61],
    ],
    color('#91899a'),
  );
  for (let i = 0; i < 24; i++)
    spruce(
      p,
      i * 7 + hash(i, 4, 76) * 4,
      53 + hash(i, 2, 13) * 4,
      7 + hash(i, 6, 68) * 9,
      '#827e8f',
      '#b6a6b1',
    );
  cottage(p, 22, 54, 24, 13);
  cottage(p, 44, 53, 16, 10);
  cottage(p, 131, 54, 18, 12);
  spruce(p, 4, 58, 30, '#676f80', '#bdadba');
  spruce(p, 153, 58, 25, '#647381', '#b2b7c0');
  for (let x = 0; x < 160; x++) {
    const bank = 57 + Math.round(2 * Math.cos(x / 23));
    p.line(x, bank - 2, x, 63, color('#e6d5d0'));
    p.set(x, bank - 1, color('#fff0d7'));
  }
  // Weathered rails follow the far bank; only the windows and lamp wicks are bright.
  for (let x = 0; x <= 160; x += 16) {
    p.rect(x, 51, x + 1, 59, color('#857782'));
    p.set(x, 50, color('#e6d9d4'));
  }
  p.line(0, 54, 159, 54, color('#ae959a'));
  p.line(0, 55, 159, 55, color('#cdb3ad'));
  for (const x of [10, 146]) {
    p.line(x, 39, x, 60, color('#5c6070'));
    p.line(x, 39, x + 5, 39, color('#626272'));
    p.rect(x + 2, 40, x + 6, 47, color('#716373'));
    p.rect(x + 3, 41, x + 5, 45, color('#f8cb8d'));
    p.set(x + 4, 43, color('#ffedb4'));
    p.rect(x + 2, 46, x + 6, 46, color('#5e6170'));
  }
  for (let y = 62; y < p.h; y++) {
    const band = (y - 62) / 66;
    for (let x = 0; x < p.w; x++) {
      const line = Math.sin(0.35 * y + 0.029 * x + 0.9 * Math.sin(x * 0.031));
      const sunset = Math.max(0, 1 - Math.abs(x - 128) / (14 + band * 65)) * (1 - band) * 0.53;
      const ice = mixc(color('#a7bdc7'), color('#cfdbda'), 0.17 + 0.67 * band + 0.072 * line);
      p.set(x, y, mixc(ice, color('#e9c5b9'), sunset));
    }
  }
  for (let i = 0; i < 99; i++) {
    const x = hash(i, 1, 112) * 160,
      y = 63 + hash(i, 2, 112) * 64,
      w = 2 + hash(i, 3, 112) * 10;
    p.line(x, y, x + w, y - 0.5, [242, 239, 219, Math.round(39 + hash(i, 4, 112) * 49)]);
  }
  for (const [x, y, width] of [
    [13, 75, 24],
    [109, 76, 25],
    [1, 113, 26],
    [120, 121, 32],
    [44, 119, 14],
  ]) {
    p.line(x, y, x + width * 0.68, y - 2, [114, 148, 161, 102]);
    p.line(x + width * 0.68, y - 2, x + width, y - 4, [114, 148, 161, 90]);
    p.line(x + 3, y + 1, x + width * 0.65, y - 1, [240, 242, 228, 160]);
  }
  const [x, y] = puckMark;
  for (let i = 0; i < 48; i++) {
    const a = (2 * Math.PI * i) / 48;
    p.set(x + 8 * Math.cos(a), y + 3.3 * Math.sin(a), [110, 143, 149, 112]);
  }
}
function bracket(p: Px) {
  // The bumper is bolted to a two-footed wooden bracket. Its moving face is painted separately.
  const dy = puckMark[1] - 106;
  p.ell(154, dy + 110, 13, 3, [91, 110, 128, 105]);
  face(
    p,
    [
      [152, dy + 99],
      [158, dy + 97],
      [159, dy + 109],
      [153, dy + 111],
    ],
    color('#74636b'),
  );
  p.rect(152, dy + 100, 155, dy + 109, color('#ad8a79'));
  p.line(153, dy + 100, 153, dy + 108, color('#d5ad8b'));
  p.rect(151, dy + 109, 158, dy + 111, color('#857981'));
  p.rect(151, dy + 108, 157, dy + 109, color('#b6a29b'));
  p.set(154, dy + 108, color('#e2d3bd'));
}
// These two enamel snowflakes are set flush with the ice. Feet can cross them on a normal walk.
function roundel(p: Px, [x, y]: XY, blue: boolean) {
  const rim = color(blue ? '#7298a5' : '#ba9a7f'),
    face = color(blue ? '#aac7c9' : '#ddc4a2');
  p.ell(x, y, 7.6, 3.7, rim);
  p.ell(x, y - 0.4, 6.6, 2.9, face);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    p.line(x, y, x + 5.5 * Math.cos(a), y + 2.6 * Math.sin(a), rim);
  }
  p.set(x, y, color('#f4e7cc'));
  p.line(x - 4, y - 2, x - 2, y - 2, color('#e6e7d6'));
}
const cached = new Px(160, 128);
paintField(cached);
roundels.forEach((pos, i) => roundel(cached, pos, !!i));
const scene: Scene = (p) => {
  p.data.set(cached.data);
};
scene.front = [{ id: 'bumper-bracket', depth: puckMark[1] + 3, paint: bracket }];
export default scene;
