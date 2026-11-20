// Астрал's own secret frame, «Рама провидца»: deep indigo obsidian with a gold inlay line, runes cut along the rails
// that light up turquoise in a wave running round the frame, a gold crescent with a turquoise stone in each corner,
// floating crystals at the middle of the side rails, and on top a gold eye clasp whose turquoise iris looks round the
// painting and blinks once per loop.
import { hx, mixc } from '../kit/f11-mobkit';
import type { Border } from '../types';
import type { Px } from '../rig/px';
import { face, type Point } from '../scenes/relief';

const abyss = hx('#07081a'),
  obsidian = hx('#141634'),
  sheen = hx('#2c3266'),
  goldDark = hx('#7a5418'),
  gold = hx('#d4a040'),
  goldLit = hx('#ffe08a'),
  white = hx('#ffffff'),
  teal = hx('#2ec4c8'),
  tealDark = hx('#0e5a66'),
  tealLit = hx('#b8fff6');
type C = [number, number, number, number];

/** Eight rune shapes, each a list of pixel offsets inside a 5×5 cell. */
const RUNES: [number, number][][] = [
  [[0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [-1, -1], [1, -1]],
  [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [0, -2], [0, 2]],
  [[-1, -2], [1, -2], [-2, -1], [2, -1], [-2, 0], [2, 0], [-1, 1], [1, 1], [0, 2]],
  [[0, -2], [-1, -1], [1, -1], [-2, 0], [2, 0], [-2, 1], [2, 1], [-2, 2], [-1, 2], [0, 2], [1, 2], [2, 2]],
  [[-2, -2], [-1, -1], [0, 0], [1, 1], [2, 2], [2, -2], [1, -1]],
  [[-1, -2], [0, -2], [1, -2], [0, -1], [0, 0], [-1, 1], [1, 1], [-2, 2], [2, 2]],
  [[0, -2], [-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1], [0, 2]],
  [[-2, -1], [-1, -2], [0, -2], [1, -2], [2, -1], [2, 0], [1, 1], [0, 1], [0, 2]],
];
function rune(p: Px, x: number, y: number, k: number, lit: number) {
  const c = lit > 0.05 ? mixc(gold, tealLit, lit) : goldDark;
  for (const [u, v] of RUNES[k % RUNES.length]) p.set(x + u, y + v, c);
  if (lit > 0.4) for (const [u, v] of [[-3, 0], [3, 0], [0, -3], [0, 3]]) p.set(x + u, y + v, mixc(obsidian, teal, lit * 0.5));
}
function crescent(p: Px, x: number, y: number, flip: number, lit: number) {
  for (let v = -7; v <= 7; v++)
    for (let u = -7; u <= 7; u++) {
      const d = Math.hypot(u, v);
      if (d <= 7) p.set(x + u, y + v, d > 6 ? abyss : obsidian);
    }
  for (let v = -6; v <= 6; v++)
    for (let u = -6; u <= 6; u++) {
      const d = Math.hypot(u, v),
        cut = Math.hypot(u - 3 * flip, v + 2);
      if (d <= 5.5 && cut > 4.6) p.set(x + u, y + v, u * flip < -2 ? mixc(gold, goldLit, 0.5 + 0.5 * lit) : gold);
    }
  for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) if (Math.abs(u) + Math.abs(v) < 2) p.set(x + 2 * flip + u, y - 1 + v, mixc(teal, tealLit, lit));
}
function floatingCrystal(p: Px, x: number, y: number, lit: number) {
  const pts: Point[] = [[x, y - 6], [x + 3, y - 1], [x, y + 5], [x - 3, y - 1]];
  face(p, pts.map(([a, b]) => [a + (a > x ? 1 : a < x ? -1 : 0), b + (b > y ? 1 : -1)] as Point), abyss);
  face(p, pts, tealDark);
  face(p, [[x, y - 6], [x + 3, y - 1], [x, y]], mixc(teal, tealLit, lit));
  p.set(x - 1, y - 2, white);
}
function eyeClasp(p: Px, cx: number, t: number, lit: number) {
  // Gold almond with rays; the iris wanders along a slow figure-eight and the lid drops once per loop.
  const look = (t / 3) * Math.PI * 2;
  const ix = Math.round(3.2 * Math.sin(look)),
    iy = Math.round(1.2 * Math.sin(look * 2));
  const blink = (t % 3) > 2.55 && (t % 3) < 2.75;
  for (let k = 0; k < 9; k++) {
    const a = Math.PI + (k / 8) * Math.PI;
    const r0 = 13,
      r1 = k % 2 ? 16 : 18;
    p.line(Math.round(cx + Math.cos(a) * r0), Math.round(12 + Math.sin(a) * r0 * 0.75), Math.round(cx + Math.cos(a) * r1), Math.round(12 + Math.sin(a) * r1 * 0.75), k % 2 ? goldDark : gold);
  }
  for (let v = -9; v <= 9; v++)
    for (let u = -15; u <= 15; u++) {
      const lens = Math.abs(v) <= 8.5 * Math.cos((u / 15.5) * (Math.PI / 2));
      if (lens) p.set(cx + u, 12 + v, abyss);
    }
  for (let v = -8; v <= 8; v++)
    for (let u = -14; u <= 14; u++) {
      const edge = 7.5 * Math.cos((u / 14.5) * (Math.PI / 2));
      if (Math.abs(v) <= edge) p.set(cx + u, 12 + v, Math.abs(v) > edge - 1.2 ? (v < 0 ? goldLit : gold) : hx('#e8ecf6'));
    }
  if (blink) {
    for (let u = -13; u <= 13; u++) for (let v = -6; v <= 6; v++) if (Math.abs(v) <= 6.5 * Math.cos((u / 14.5) * (Math.PI / 2))) p.set(cx + u, 12 + v, gold);
    p.line(cx - 12, 12, cx + 12, 12, goldDark);
    return;
  }
  for (let v = -5; v <= 5; v++)
    for (let u = -5; u <= 5; u++) {
      const d = Math.hypot(u, v);
      if (d <= 5) p.set(cx + ix + u, 12 + iy + v, d > 4 ? tealDark : d > 2.6 ? mixc(teal, tealLit, lit) : teal);
    }
  for (let v = -3; v <= 3; v++) p.set(cx + ix, 12 + iy + v, abyss);
  p.set(cx + ix - 2, 10 + iy, white);
  p.set(cx + ix - 1, 10 + iy, white);
}
const seer: Border = {
  wood: ['#07081a', '#141634', '#2c3266', '#5a62a0'],
  accent: '#ffe08a',
  decorate(p, b, t) {
    const perimeter = 2 * (p.w + p.h);
    const wave = (t / 3) * perimeter;
    const near = (s: number) => {
      const d = Math.abs((((s - wave) % perimeter) + perimeter) % perimeter);
      return Math.max(0, 1 - Math.min(d, perimeter - d) / 40);
    };
    const m = Math.floor(b / 2);
    const cx = p.w >> 1;
    // Gold inlay line along the middle of every rail, a darker groove beside it.
    for (let x = b; x < p.w - b; x++) {
      p.set(x, m - 4, gold);
      p.set(x, m - 3, goldDark);
      p.set(x, p.h - 1 - m + 4, gold);
      p.set(x, p.h - 1 - m + 3, goldDark);
    }
    for (let y = b; y < p.h - b; y++) {
      p.set(m - 4, y, gold);
      p.set(m - 3, y, goldDark);
      p.set(p.w - 1 - m + 4, y, gold);
      p.set(p.w - 1 - m + 3, y, goldDark);
    }
    // Runes along the rails, lit by the running wave.
    let k = 0;
    for (let x = b + 12; x < p.w - b - 8; x += 14, k++) if (Math.abs(x - cx) > 26) rune(p, x, m + 1, k, near(x));
    for (let y = b + 12; y < p.h - b - 8; y += 14, k++) if (Math.abs(y - p.h / 2) > 10) rune(p, p.w - 1 - m - 1, y, k, near(p.w + y));
    for (let x = p.w - b - 12; x > b + 8; x -= 14, k++) if (Math.abs(x - cx) > 34) rune(p, x, p.h - 1 - m - 1, k, near(p.w + p.h + (p.w - x)));
    for (let y = p.h - b - 12; y > b + 8; y -= 14, k++) if (Math.abs(y - p.h / 2) > 10) rune(p, m + 1, y, k, near(2 * p.w + p.h + (p.h - y)));
    // A faint sheen along the inner bead where the wave passes.
    for (let s = 0; s < perimeter; s++) {
      const lit = near(s);
      if (lit < 0.35) continue;
      let x: number, y: number;
      if (s < p.w) [x, y] = [s, b - 2];
      else if (s < p.w + p.h) [x, y] = [p.w - b + 1, s - p.w];
      else if (s < 2 * p.w + p.h) [x, y] = [p.w - (s - p.w - p.h), p.h - b + 1];
      else [x, y] = [b - 2, p.h - (s - 2 * p.w - p.h)];
      if (x >= 0 && y >= 0 && x < p.w && y < p.h) p.set(Math.round(x), Math.round(y), mixc(sheen, tealLit, lit * 0.8) as C);
    }
    crescent(p, m, m, 1, near(0));
    crescent(p, p.w - 1 - m, m, -1, near(p.w));
    crescent(p, p.w - 1 - m, p.h - 1 - m, -1, near(p.w + p.h));
    crescent(p, m, p.h - 1 - m, 1, near(2 * p.w + p.h));
    const bob = Math.round(Math.sin((t / 3) * Math.PI * 2) * 1.5);
    floatingCrystal(p, m, (p.h >> 1) + bob, near(2 * p.w + p.h + p.h / 2));
    floatingCrystal(p, p.w - 1 - m, (p.h >> 1) - bob, near(p.w + p.h / 2));
    eyeClasp(p, cx, t, near(cx));
  },
};
export default seer;
