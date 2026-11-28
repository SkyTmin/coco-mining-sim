import { hash, hx, mixc } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import type { Scene } from '../types';
import { face } from './relief';

const c = hx;
function arch(p: Px, x: number, y: number, w: number, h: number) {
  const stone = c('#c0b59f'),
    shadow = c('#747f84'),
    radius = w / 2;
  p.ell(x, y - h, radius + 2, radius + 2, stone);
  p.rect(x - radius - 2, y - h, x + radius + 2, y, stone);
  p.ell(x, y - h, radius - 1, radius - 1, shadow);
  p.rect(x - radius + 1, y - h, x + radius - 1, y, shadow);
  for (let dx = -radius + 2; dx < radius; dx++)
    for (let yy = Math.ceil(y - h - Math.sqrt(Math.max(0, (radius - 2) ** 2 - dx * dx))); yy < y; yy++)
      p.set(x + dx, yy, mixc(c('#758b94'), c('#a4b6aa'), Math.max(0, (yy - y + h + radius) / (h + radius))));
  for (let i = 0; i <= 8; i++) {
    const a = (Math.PI * i) / 8;
    p.line(
      x + Math.cos(a) * (radius + 0.2),
      y - h - Math.sin(a) * (radius + 0.2),
      x + Math.cos(a) * (radius + 2),
      y - h - Math.sin(a) * (radius + 2),
      c('#e1ceb1'),
    );
  }
  p.rect(x - radius - 3, y - 4, x - radius + 1, y, c('#aa9e93'));
  p.rect(x + radius - 1, y - 4, x + radius + 3, y, c('#b7a594'));
}
const base = new Px(160, 128);
for (let y = 0; y < 128; y++)
  base.rect(
    0,
    y,
    159,
    y,
    y < 49 ? mixc(c('#81a7b2'), c('#e4cdb3'), y / 49) : mixc(c('#91a6a3'), c('#d3c4ae'), (y - 49) / 79),
  );
for (let i = 0; i < 11; i++) {
  const x = hash(i, 2, 75) * 170 - 8,
    y = 4 + hash(i, 3, 75) * 17;
  base.line(x, y, x + 4 + hash(i, 7, 7) * 13, y, c('#b9c9c5'));
}
face(
  base,
  [
    [0, 32],
    [12, 29],
    [23, 34],
    [39, 24],
    [57, 30],
    [76, 20],
    [95, 30],
    [116, 20],
    [136, 28],
    [159, 23],
    [159, 49],
    [0, 49],
  ],
  c('#9faeaa'),
);
base.rect(0, 26, 159, 48, c('#c3b39f'));
for (const x of [-3, 21, 46, 72, 98, 124, 150]) arch(base, x, 48, 17, 12);
base.rect(0, 24, 159, 25, c('#ad927f'));
base.rect(0, 23, 159, 23, c('#e4c7a7'));
base.rect(0, 49, 159, 51, c('#899a96'));
base.line(0, 52, 159, 52, c('#d4cec0'));
for (let row = 0; row < 6; row++) {
  const y = 54 + row * 10;
  base.line(0, y, 159, y, c('#a8b0a7'));
  for (let k = -2; k < 8; k++) {
    const x = 25 * k + 11 * (row % 2);
    base.line(x, y, x - 5, y + 9, c('#afbaae'));
    if ((k + row) % 3 === 0) base.line(x + 5, y + 2, x + 12, y + 2, c('#c9ceba'));
  }
}
for (let i = 0; i < 190; i++) {
  const x = hash(i, 0, 44) * 160,
    y = 53 + hash(i, 2, 44) * 75;
  base.set(x, y, i % 3 === 0 ? c('#b4b9aa') : c('#c6cab5'));
}
// Low ceramic trough. The back edge is on the far side of the actual waterline.
face(
  base,
  [
    [32, 109],
    [128, 109],
    [136, 120],
    [132, 127],
    [29, 127],
    [24, 121],
  ],
  c('#787c83'),
);
face(
  base,
  [
    [32, 108],
    [127, 108],
    [135, 120],
    [28, 120],
    [25, 119],
  ],
  c('#c7b69f'),
);
face(
  base,
  [
    [35, 110],
    [124, 110],
    [131, 118],
    [31, 118],
  ],
  c('#477e88'),
);
face(
  base,
  [
    [36, 112],
    [123, 112],
    [130, 119],
    [32, 119],
  ],
  c('#73a6a7'),
);
const scene: Scene = (p, t) => {
  p.data.set(base.data);
  const phase = (t * Math.PI * 2) / 3;
  for (let i = 0; i < 13; i++) {
    const x = 37 + ((i * 23) % 84) + 1.7 * Math.sin(phase + i * 1.3),
      y = 113 + ((i * 3) % 6);
    p.line(x, y, x + 2 + (i % 3), y, i % 2 ? c('#a7c7b8') : c('#82b6b0'));
  }
};
scene.front = [
  {
    id: 'ceramic-front-rim',
    depth: 126,
    paint(p) {
      p.line(30, 120, 133, 120, c('#e8cba7'));
      p.rect(30, 122, 132, 126, c('#829b9b'));
      for (let x = 33; x < 132; x += 9) {
        p.line(x, 122, x, 125, c('#617e87'));
        p.line(x + 3, 124, x + 5, 122, c('#c2c4aa'));
        p.line(x + 5, 122, x + 7, 124, c('#acc2b4'));
      }
    },
  },
];
export default scene;
