import { hx, mixc } from '../kit/f11-mobkit';
import type { Border } from '../types';
import { face } from '../scenes/relief';
import type { Px } from '../rig/px';
const black = hx('#212433'),
  iron = hx('#393c4e'),
  steel = hx('#606577'),
  silver = hx('#abb3b3'),
  gold = hx('#bd9565'),
  light = hx('#ffe2a1'),
  patina = hx('#54766f'),
  pale = hx('#a9cec0');
function hinge(p: Px, x: number, y: number, s: number) {
  const P = (u: number, v: number): [number, number] => [x + s * u, y + v];
  face(p, [P(-5, -4), P(4, -5), P(11, -2), P(17, 0), P(10, 2), P(4, 5), P(-5, 4)], black);
  face(p, [P(-4, -3), P(4, -3), P(10, -1), P(14, 0), P(4, 3), P(-4, 3)], steel);
  p.line(...P(-3, -3), ...P(8, -1), silver);
  for (const u of [-1, 6]) {
    p.ell(...P(u, 0), 1.6, 1.6, black);
    p.set(...P(u, -1), light);
  }
  for (let k = -5; k <= 5; k += 4) p.rect(x - 2, y + k, x + 1, y + k + 2, gold);
}
function escutcheon(p: Px, x: number, y: number, rad: number, lit: number) {
  for (let v = -rad; v <= rad; v++)
    for (let u = -rad; u <= rad; u++) {
      const t = Math.abs(u) / rad + Math.abs(v) / (rad * 1.2);
      if (t > 1.35) continue;
      const c = t > 1.12 ? black : t > 0.95 ? silver : t > 0.84 ? iron : t > 0.74 ? gold : patina;
      p.set(x + u, y + v, mixc(c, pale, lit * 0.24));
    }
  p.ell(x, y - 2.3, rad * 0.29, rad * 0.32, black);
  face(
    p,
    [
      [x, y - 1],
      [x - 2, y + 4],
      [x + 2, y + 4],
    ],
    black,
  );
  p.set(x - 2, y - 4, light);
}
const frame: Border = {
  wood: ['#171c2a', '#303448', '#515466', '#909096'],
  accent: '#cfac7e',
  decorate(p, b, t) {
    const tick = (t * Math.PI * 2) / 3,
      mid = b >> 1;
    for (let side = 0; side < 4; side++) {
      const len = side % 2 ? p.h : p.w;
      const at = (u: number, v: number): [number, number] =>
        side === 0
          ? [u, v]
          : side === 1
            ? [p.w - 1 - v, u]
            : side === 2
              ? [p.w - 1 - u, p.h - 1 - v]
              : [v, p.h - 1 - u];
      for (let k = 8; k < len - 8; k++) {
        const v = mid + Math.sin((k * Math.PI) / 12) * 2.2,
          bright = 0.5 + 0.5 * Math.cos((k / len) * 2 * Math.PI + side * 1.5 - tick);
        p.set(...at(k, mid - 4), steel);
        p.set(...at(k, mid - 3), black);
        p.set(...at(k, mid + 4), gold);
        p.set(...at(k, v), mixc(gold, light, bright ** 5));
        p.set(...at(k, 2 * mid - 2), mixc(steel, silver, bright * 0.5));
        if (k % 12 === 0) {
          p.set(...at(k, mid), black);
          p.set(...at(k + 1, mid - 1), silver);
        }
      }
    }
    for (const s of [-1, 1]) for (const y of [47, p.h - 45]) hinge(p, s < 0 ? 7 : p.w - 8, y, s < 0 ? 1 : -1);
    for (const x of [10, p.w - 11])
      for (const y of [10, p.h - 11]) escutcheon(p, x, y, 8, 0.15 + 0.15 * Math.sin(tick + x + y));
    for (const x of [p.w >> 1, (p.w >> 1) - 13, (p.w >> 1) + 13]) {
      const h = x === p.w >> 1 ? 6 : 3;
      p.ell(x, 9, h + 2, h + 1, black);
      p.ell(x, 8, h + 1, h, steel);
      p.ell(x, 8, h - 1, h - 1, patina);
      p.set(x - 1, 6, light);
    }
    // A flush map drawer is built into the left jamb, below its large key plate.
    p.rect(3, 129, 14, 144, black);
    p.rect(4, 130, 13, 143, steel);
    p.rect(5, 132, 12, 137, patina);
    p.line(4, 130, 13, 130, gold);
    p.line(5, 139, 12, 139, black);
    p.line(7, 140, 10, 140, silver);
    escutcheon(p, 9, 112, 8, 0.36);
    escutcheon(p, p.w - 10, 107, 8, 0.36);
  },
};
export default frame;
