import { hx, mixc } from '../kit/f11-mobkit';
import type { Border } from '../types';
import type { Px } from '../rig/px';
import { face, type Point } from '../scenes/relief';

const abyss = hx('#171a25'),
  black = hx('#282a37'),
  tarnish = hx('#535563');
const silver = hx('#a5acb7'),
  white = hx('#e8ecf2');
function crown(p: Px, x: number, y: number) {
  p.ell(x, y, 7, 7, abyss);
  p.ell(x, y - 1, 6, 5, tarnish);
  p.ell(x, y - 1, 4, 4, silver);
  p.line(x - 3, y - 4, x, y - 5, white);
  p.line(x - 2, y + 1, x + 2, y - 2, tarnish);
}
const secret: Border = {
  wood: ['#212330', '#3d3d4a', '#777b88', '#c9cdd6'],
  accent: '#e8ecf2',
  decorate(p, b, t) {
    function coins(length: number, at: (u: number, v: number) => Point) {
      let j = 0;
      for (let u = b - 3; u < length - b + 5; u += 10, j++) {
        const a = 8 + (j % 2);
        const outline: Point[] = [
          [u - 6, a],
          [u - 5, a - 2],
          [u - 2, a - 4],
          [u + 4, a - 4],
          [u + 7, a - 1],
          [u + 7, a + 2],
          [u + 4, a + 4],
          [u - 3, a + 4],
          [u - 6, a + 2],
        ];
        face(
          p,
          outline.map(([x, y]) => at(x, y)),
          abyss,
        );
        face(
          p,
          outline.map(([x, y]) => at(u + (x - u) * 0.84, a + (y - a) * 0.76)),
          tarnish,
        );
        p.line(...at(u - 4, a - 1), ...at(u - 1, a - 3), silver);
        p.line(...at(u, a - 3), ...at(u + 3, a - 3), silver);
        p.line(...at(u + 3, a + 2), ...at(u + 5, a), black);
        p.line(...at(u - 1, a + 1), ...at(u + 2, a - 1), black);
        const q = (((u / length - t / 3) % 1) + 1) % 1;
        if (q < 0.05)
          p.line(...at(u - 2, a - 2), ...at(u + 1, a - 3), mixc(silver, white, 1 - q / 0.05));
      }
    }
    coins(p.w, (u, v) => [u, v]);
    coins(p.w, (u, v) => [p.w - 1 - u, p.h - 1 - v]);
    coins(p.h, (u, v) => [v, p.h - 1 - u]);
    coins(p.h, (u, v) => [p.w - 1 - v, u]);
    const m = Math.floor(b / 2);
    for (const x of [m, p.w - m - 1]) for (const y of [m, p.h - m - 1]) crown(p, x, y);
    // A little vault lid with hinges, a coin slot and a hanging escutcheon.
    const x = p.w >> 1;
    face(
      p,
      [
        [x - 20, 12],
        [x - 18, 5],
        [x - 11, 3],
        [x - 7, 1],
        [x + 9, 1],
        [x + 14, 4],
        [x + 18, 5],
        [x + 21, 12],
        [x + 8, 13],
        [x + 5, 16],
        [x - 5, 16],
        [x - 9, 13],
      ],
      abyss,
    );
    face(
      p,
      [
        [x - 17, 10],
        [x - 14, 5],
        [x - 6, 3],
        [x + 8, 3],
        [x + 16, 7],
        [x + 17, 10],
      ],
      tarnish,
    );
    p.line(x - 14, 6, x - 6, 3, silver);
    p.line(x - 7, 6, x + 7, 6, abyss);
    p.line(x - 6, 7, x + 6, 7, silver);
    p.rect(x - 4, 9, x + 4, 14, silver);
    p.rect(x - 2, 10, x + 2, 13, tarnish);
    p.set(x, 11, abyss);
    p.set(x, 12, abyss);
    p.set(x - 3, 9, white);
  },
};
export default secret;
