import { Px } from '../rig/px';
import { hx } from '../kit/f11-mobkit';
import type { XY } from '../types';
import { ease, mix } from './threshold_keeper-stage';

const ink = hx('#302c43'),
  dark = hx('#45374b'),
  plum = hx('#725365'),
  wood = hx('#9e6b65');
const bronze = hx('#9c7555'),
  gold = hx('#dfac74'),
  cream = hx('#ffdf9d'),
  glass = hx('#58999b');

export function doorHeight(open: number) {
  return 25 + 61 * ease(0.08, 0.73, open) + 15 * ease(0.68, 1, open);
}

// The portable door unfolds like a concertina. The sill and two lower hinge pins never move.
export function unfoldingDoor(p: Px, sill: XY, open: number, foreground: boolean) {
  if (open <= 0.005) return;
  const [edge, floor] = sill;
  const width = 12 + 42 * ease(0, 0.72, open);
  const height = doorHeight(open),
    left = edge - width,
    crown = floor - height;
  if (foreground) {
    p.line(edge, floor - height + 8, edge, floor + 1, ink);
    p.line(edge + 1, floor - height + 8, edge + 1, floor, gold);
    for (let k = 0; k < 3; k++) p.set(edge + 1, floor - ((height - 10) * (k + 0.5)) / 3, cream);
    return;
  }
  for (let u = 0; u <= Math.ceil(width); u++) {
    const x = left + u,
      t = u / width;
    const arch = crown + 8 * (2 * t - 1) ** 2;
    const depth = Math.min(1, Math.max(0, (t - 0.06) / 0.7));
    p.line(x, arch, x, floor, u < 5 || u > width - 4 ? bronze : dark);
    p.line(x, arch + 5, x, floor - 3, depth > 0.8 ? ink : Math.floor(u / 4) % 2 ? plum : dark);
    p.line(x, arch, x, arch + 2, gold);
    p.set(x, arch, cream);
    p.line(x, floor - 2, x, floor + 1, wood);
    p.set(x, floor - 2, cream);
  }
  // The linkage changes angle while opening. The rails emerge in three overlapping lengths.
  for (const x of [left + 1, edge - 4]) {
    for (let k = 0; k < 3; k++) {
      const a = floor - (k * (height - 7)) / 3,
        b = floor - ((k + 1) * (height - 7)) / 3;
      p.line(x + k, a, x + k, b, gold);
      p.line(x + k - 1, a, x + k - 1, b, bronze);
      p.rect(x + k - 2, b + 1, x + k + 1, b + 3, cream);
    }
  }
  if (open > 0.2) {
    // Nested jambs converge on a lit landing. The green leaf swings aside on the left hinge.
    const vanX = left + width * 0.58,
      vanY = crown + height * 0.59;
    const amber = hx('#cc895f'),
      stone = hx('#968487');
    for (let depth = 0; depth < 4; depth++) {
      const z = depth / 4;
      const l = mix(left + 5, vanX - 3, z),
        r = mix(edge - 6, vanX + 3, z);
      const top = mix(crown + 14, vanY - 7, z),
        low = mix(floor - 4, vanY + 6, z);
      p.line(l, top, l, low, depth % 2 ? stone : wood);
      p.line(l, top, r, top, bronze);
      p.line(l, low, r, low, depth % 2 ? bronze : stone);
    }
    p.line(left + 4, floor - 3, vanX, vanY, gold);
    p.line(edge - 6, floor - 3, vanX + 2, vanY, bronze);
    // The turn in the hallway has a visible side wall. A paw crosses this grating before the tail clears it.
    const rear = edge - 34 * open;
    for (let k = 0; k < 5; k++) {
      const X = rear + k,
        base = floor - 14 - k;
      p.line(X, crown + 17 + k, X, base, k % 2 ? dark : wood);
      p.set(X, base, bronze);
    }
    for (let k = 0; k < 4; k++) {
      const X = rear + k * 7 + 2,
        Y = floor - 14 + k * 3;
      p.line(X, Y, X + 5, Y - 2, k % 2 ? cream : bronze);
    }
    const swung = ease(0.56, 0.94, open);
    const tip = left + width * (0.87 - 1.08 * swung);
    for (let u = 0; u <= Math.ceil(Math.abs(tip - left)); u++) {
      const t = u / Math.max(1, Math.abs(tip - left)),
        xx = left + Math.sign(tip - left) * u;
      const skew = 4 * t * swung;
      p.line(xx, crown + 13 + skew, xx, floor - 3 + skew, u % 7 === 0 ? dark : glass);
      p.set(xx, crown + 14 + skew, gold);
    }
    p.line(left, crown + height * 0.31, tip, crown + height * 0.31 + 4 * swung, bronze);
    p.line(left, crown + height * 0.78, tip, crown + height * 0.78 + 4 * swung, gold);
    p.ell(mix(left, tip, 0.74), crown + height * 0.57 + 3 * swung, 1.5, 2, gold);
    p.rect(vanX - 2, vanY - 6, vanX + 3, vanY + 3, amber);
    p.line(vanX - 2, vanY - 5, vanX + 2, vanY - 5, cream);
    for (let k = 0; k < 4; k++) {
      const x1 = mix(left + 4, edge - 4, k / 4),
        x2 = mix(left + 4, edge - 4, (k + 1) / 4);
      const y = crown + 7,
        dy = 3 + 4 * open;
      p.line(x1, y, x2, y + dy, bronze);
      p.line(x1, y + dy, x2, y, gold);
      p.set(x1, y, cream);
    }
    const x = left + 0.18 * width,
      y = floor - height * 0.59;
    const r = 1.3 + 1.5 * open;
    for (let k = -Math.ceil(r); k <= r; k++) {
      const v = Math.max(0, r - Math.abs(k));
      p.line(x + k, y - v, x + k, y + v, k < 0 ? glass : cream);
    }
  }
}
