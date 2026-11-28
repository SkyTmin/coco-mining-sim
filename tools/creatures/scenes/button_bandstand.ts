import { hx, hash, mixc } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import type { Scene } from '../types';
import { face } from './relief';

const c = hx,
  base = new Px(160, 128);
for (let y = 0; y < 128; y++)
  base.rect(
    0,
    y,
    159,
    y,
    y < 65 ? mixc(c('#a9b1a0'), c('#d6c9a2'), y / 65) : mixc(c('#bfab91'), c('#dec3a2'), (y - 65) / 63),
  );
for (let x = 3; x < 160; x += 12) {
  base.line(x, 1, x, 61, c('#bac0a6'));
  base.line(x + 2, 2, x + 2, 60, c('#bbc0a6'));
}
// An arched morning window, with a wide ochre sill and a glimpse of distant rooftops.
base.ell(25, 25, 19, 20, c('#938d85'));
base.rect(6, 25, 44, 52, c('#938d85'));
base.ell(25, 25, 17, 18, c('#ddc7a3'));
base.rect(8, 25, 42, 50, c('#ddc7a3'));
base.ell(25, 25, 15, 16, c('#97bac1'));
base.rect(10, 25, 40, 48, c('#a9c7c2'));
base.ell(29, 17, 4, 4, c('#e6d6a5'));
face(
  base,
  [
    [10, 38],
    [19, 30],
    [25, 35],
    [33, 28],
    [40, 34],
    [40, 47],
    [10, 47],
  ],
  c('#9ca9a7'),
);
base.rect(24, 9, 26, 49, c('#cfb795'));
base.rect(10, 29, 40, 31, c('#dac5a3'));
base.rect(3, 50, 47, 52, c('#b29983'));
base.line(4, 50, 46, 50, c('#e5d3af'));
for (const [x, y, w, h] of [
  [102, 22, 20, 10],
  [126, 17, 22, 15],
  [113, 46, 30, 9],
]) {
  base.rect(x, y, x + w, y + h, c('#9b8785'));
  base.rect(x + 1, y + 1, x + w - 2, y + h - 1, c('#c5a58c'));
  base.line(x, y + 3, x + w, y + 3, c('#e2c4a0'));
  base.rect(x + w / 2 - 2, y + 4, x + w / 2 + 2, y + 5, c('#978783'));
}
for (const [x, y, r] of [
  [58, 20, 3],
  [71, 14, 2],
  [85, 21, 3],
  [57, 39, 2],
  [75, 35, 3],
]) {
  base.ell(x, y, r + 1, r + 1, c('#a9a38e'));
  base.ell(x - 1, y - 1, r, r, c('#d1c8ac'));
  base.set(x - 2, y - 1, c('#9ea28e'));
  base.set(x, y, c('#a5a38e'));
}
base.rect(0, 60, 159, 63, c('#ad9987'));
base.line(0, 60, 159, 60, c('#e3cfa9'));
for (let j = 0; j < 8; j++) {
  const y = 65 + j * 10;
  base.line(0, y, 159, y, c('#b6a08e'));
  base.line(0, y + 1, 159, y + 1, c('#ddc6a4'));
  for (let i = -1; i < 5; i++) {
    const x = i * 53 + (j % 3) * 17;
    base.line(x, y + 2, x - 3, y + 9, c('#b29e8d'));
    base.line(x + 10, y + 6, x + 19, y + 5, c('#c7b196'));
    base.set(x + 4, y + 4, c('#aa9989'));
  }
}
for (let i = 0; i < 105; i++) {
  const x = hash(i, 1, 91) * 160,
    y = 66 + hash(i, 2, 91) * 62;
  base.set(x, y, c('#d5bfa1'));
}
const scene: Scene = (p) => {
  p.data.set(base.data);
};
scene.front = [
  {
    id: 'drawer-shelves',
    depth: 62,
    paint(p) {
      for (const y of [34, 56]) {
        p.rect(97, y, 152, y + 1, c('#e1c29a'));
        p.line(98, y + 2, 152, y + 2, c('#aa9080'));
      }
    },
  },
];
export default scene;
