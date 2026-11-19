import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import type { Px } from '../rig/px';
import { face } from '../scenes/relief';
import type { Border, XY } from '../types';

const shadow = hx('#111322'), recess = hx('#252536'), silver = hx('#74788d');
const lip = hx('#a9afbc'), fineSilver = hx('#c9d0d9'), glint = hx('#f3eef1');
const violet = hx('#704e82'), mauve = hx('#a983a5'), violetDark = hx('#332642');

function mount(p: Px, cx: number, cy: number, sx: number, sy: number, shimmer: number) {
  const at = (u: number, v: number): XY => [cx + sx * u, cy + sy * v];
  for (const k of [0, 1]) {
    const arm = (u: number, v: number) => k ? at(v, u) : at(u, v);
    face(p, [arm(-1, 2), arm(5, -5), arm(15, -5), arm(23, -1), arm(26, 0), arm(19, 3), arm(10, 4)], shadow);
    face(p, [arm(4, 1), arm(7, -4), arm(15, -4), arm(21, -2), arm(23, 0), arm(15, 2), arm(9, 2)], silver);
    p.line(...arm(7, -4), ...arm(14, -4), lip);
    p.line(...arm(15, -4), ...arm(20, -2), fineSilver);
    p.line(...arm(11, 1), ...arm(18, 0), recess);
    p.set(...arm(16, -1), fineSilver);
  }
  // The facets fan from a common drilled cup and catch a reflection in sequence.
  const cluster: XY[][] = [
    [at(0, 3), at(-6, 1), at(-8, -4), at(-6, -8), at(-2, -7), at(0, -2)],
    [at(-1, 2), at(-2, -5), at(2, -9), at(6, -8), at(7, -3), at(4, 2)],
    [at(1, 4), at(2, -1), at(8, -4), at(9, -1), at(7, 3), at(2, 6)],
    [at(-2, 6), at(-6, 4), at(-7, 1), at(-4, -1), at(-1, 1), at(1, 5)],
  ];
  p.ell(cx, cy, 8, 7, shadow);
  for (const [i, shape] of cluster.entries()) {
    const [base, a, b, c, d, e] = shape;
    const tip: XY = [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2];
    const ref = (Math.sin(shimmer + i * 1.05) + 1) * .5;
    face(p, shape, violetDark);
    face(p, [a, b, tip, base], violet);
    face(p, [b, c, d, tip], mixc(mauve, fineSilver, .19 + .52 * ref));
    face(p, [base, tip, d, e], mixc(violetDark, violet, .57));
    p.line(...a, ...b, mixc(lip, glint, .62 * ref));
    p.set(...tip, mixc(mauve, glint, ref * .7));
  }
  p.set(...at(0, 6), lip);
  p.line(...at(-3, 5), ...at(-1, 6), lip);
  p.set(...at(4, 4), recess);
}

const border: Border = {
  wood: ['#171927', '#292d3c', '#5f6476', '#bcc0cc'],
  accent: '#adb3c2',
  decorate(p, b, t) {
    const sides = [p.w, p.h, p.w, p.h];
    const perimeter = 2 * (p.w + p.h);
    const sideOrigins = [0, p.w, p.w + p.h, 2 * p.w + p.h];
    const head = t / 3 * perimeter;
    function rail(index: number, at: (u: number, v: number) => XY) {
      const length = sides[index];
      p.line(...at(b - 1, 5), ...at(length - b, 5), silver);
      p.line(...at(b, 6), ...at(length - b - 1, 6), shadow);
      p.line(...at(b, 12), ...at(length - b - 1, 12), recess);
      p.line(...at(b, 13), ...at(length - b - 1, 13), silver);
      for (let u = b; u < length - b - 11; u += 13) {
        const dark = [at(u, 9), at(u + 4, 7), at(u + 8, 7), at(u + 11, 9), at(u + 7, 11), at(u + 3, 11)];
        face(p, dark, shadow);
        p.line(...at(u + 1, 9), ...at(u + 5, 7), silver);
        p.line(...at(u + 5, 7), ...at(u + 8, 7), lip);
        p.line(...at(u + 5, 10), ...at(u + 9, 9), hx('#4d4b60'));
        p.set(...at(u + 11, 11), silver);
        if (hash(index, u, 32) > .68) p.set(...at(u + 2, 3), recess);
        const distance = (head - sideOrigins[index] - u + perimeter) % perimeter;
        const gleam = 1 - distance / 92;
        if (gleam > 0) {
          p.line(...at(u + 3, 8), ...at(u + 7, 7), mixc(silver, glint, gleam ** 2));
          p.set(...at(u + 7, 9), mixc(recess, fineSilver, gleam * .8));
          p.set(...at(u + 6, 13), mixc(silver, fineSilver, gleam));
        }
      }
    }
    rail(0, (u, v) => [u, v]);
    rail(1, (u, v) => [p.w - 1 - v, u]);
    rail(2, (u, v) => [p.w - 1 - u, p.h - 1 - v]);
    rail(3, (u, v) => [v, p.h - 1 - u]);

    const phase = t / 3 * TAU, m = Math.floor(b / 2);
    mount(p, m, m, 1, 1, phase);
    mount(p, p.w - 1 - m, m, -1, 1, phase + 1.35);
    mount(p, p.w - 1 - m, p.h - 1 - m, -1, -1, phase + 2.71);
    mount(p, m, p.h - 1 - m, 1, -1, phase + 4.3);

    // The clasp reads as a cracked geode in a pierced black-silver setting.
    const x = p.w >> 1;
    const at = (a: number, y: number): XY => [x + a, y];
    face(p, [at(-28, 9), at(-21, 6), at(-14, 6), at(-11, 2), at(7, 1), at(14, 4),
      at(17, 6), at(24, 6), at(29, 9), at(24, 13), at(15, 13), at(6, 17),
      at(-6, 17), at(-15, 13), at(-25, 13)], shadow);
    p.line(...at(-22, 8), ...at(-14, 8), lip);
    p.line(...at(-24, 11), ...at(-14, 11), silver);
    p.line(...at(15, 8), ...at(23, 8), lip);
    p.line(...at(17, 11), ...at(25, 11), silver);
    p.set(...at(-24, 9), fineSilver);
    p.set(...at(24, 9), fineSilver);
    face(p, [at(-13, 8), at(-8, 3), at(5, 2), at(12, 6), at(14, 10), at(7, 15),
      at(-6, 16), at(-12, 13)], silver);
    p.line(...at(-12, 8), ...at(-7, 3), lip);
    p.line(...at(-7, 3), ...at(5, 2), fineSilver);
    p.line(...at(4, 14), ...at(10, 13), lip);
    face(p, [at(-10, 8), at(-6, 5), at(4, 4), at(10, 6), at(11, 10), at(5, 13),
      at(-4, 14), at(-9, 12)], mauve);
    face(p, [at(-7, 9), at(-4, 6), at(4, 6), at(9, 8), at(7, 11), at(-3, 13),
      at(-6, 11)], violetDark);
    face(p, [at(-7, 9), at(-4, 7), at(-2, 8), at(-2, 12)], violet);
    face(p, [at(-3, 12), at(1, 6), at(5, 8), at(4, 11)], mauve);
    face(p, [at(4, 11), at(5, 8), at(8, 8), at(8, 10)], violet);
    p.line(...at(-4, 7), ...at(-2, 8), lip);
    p.line(...at(-1, 11), ...at(1, 6), mixc(lip, glint, .5 + .5 * Math.cos(phase)));
    p.set(...at(7, 8), fineSilver);

    // A projecting silver hinge on the right supports the bird's toes in peek.
    face(p, [at(22, 12), at(35, 12), at(36, 18), at(31, 24), at(40, 27), at(39, 30),
      at(22, 30), at(19, 28), at(25, 24), at(27, 18)], shadow);
    face(p, [at(27, 15), at(34, 15), at(34, 19), at(29, 25), at(38, 27), at(23, 27),
      at(28, 23), at(30, 18)], silver);
    p.line(...at(30, 17), ...at(32, 16), lip);
    p.line(...at(24, 27), ...at(37, 27), mixc(lip, fineSilver, .5 + .5 * Math.sin(phase)));
    p.set(...at(37, 28), recess);
  },
};
export default border;
