// Мурлен's own secret frame: black silver with card suits running round the rails, a star in each
// corner, a little top hat as the clasp on top and a crossed wand on the bottom rail. A silver glint
// travels round the frame once per loop and the suits light up as it passes.
import { hx, mixc } from '../kit/f11-mobkit';
import type { Border } from '../types';
import type { Px } from '../rig/px';
import { face, type Point } from '../scenes/relief';

const abyss = hx('#14151f'),
  black = hx('#24252f'),
  tarnish = hx('#4d505d'),
  silver = hx('#a7aebb'),
  white = hx('#eef1f6'),
  ruby = hx('#8c2a43'),
  rubyLit = hx('#d4566e'),
  gold = hx('#d4a64a');

type Suit = 'spade' | 'heart' | 'club' | 'diamond';
function pip(p: Px, x: number, y: number, suit: Suit, lit: number) {
  const red = suit === 'heart' || suit === 'diamond';
  const base = red ? ruby : tarnish,
    hi = red ? rubyLit : silver;
  const c = mixc(base, hi, Math.min(1, 0.35 + lit));
  const set = (u: number, v: number, col = c) => p.set(x + u, y + v, col);
  if (suit === 'diamond') {
    face(p, [[x, y - 4], [x + 3, y], [x, y + 4], [x - 3, y]], abyss);
    face(p, [[x, y - 3], [x + 2, y], [x, y + 3], [x - 2, y]], c);
    set(-1, -1, mixc(c, white, lit));
  } else if (suit === 'heart') {
    for (const [u, v] of [[-2, -2], [-1, -2], [1, -2], [2, -2], [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1],
      [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-1, 2], [0, 2], [1, 2], [0, 3]])
      set(u, v);
    set(-2, -1, mixc(c, white, lit));
  } else if (suit === 'spade') {
    for (const [u, v] of [[0, -3], [-1, -2], [0, -2], [1, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [-3, 0], [-2, 0], [-1, 0],
      [0, 0], [1, 0], [2, 0], [3, 0], [-2, 1], [-1, 1], [1, 1], [2, 1], [0, 1], [0, 2], [-1, 3], [0, 3], [1, 3]])
      set(u, v);
    set(-1, -1, mixc(c, white, lit));
  } else {
    for (const [u, v] of [[0, -3], [-1, -2], [0, -2], [1, -2], [-1, -1], [0, -1], [1, -1], [-3, 0], [-2, 0], [2, 0], [3, 0], [-3, 1],
      [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [3, 1], [-2, 2], [2, 2], [0, 2], [-1, 3], [0, 3], [1, 3]])
      set(u, v);
    set(0, -2, mixc(c, white, lit));
  }
}
function cornerStar(p: Px, x: number, y: number, lit: number) {
  for (let v = -6; v <= 6; v++)
    for (let u = -6; u <= 6; u++) {
      const d = Math.hypot(u, v);
      if (d <= 6) p.set(x + u, y + v, d > 5 ? abyss : d > 4 ? tarnish : black);
    }
  const pts: Point[] = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2,
      r = k % 2 ? 1.7 : 4.2;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  face(p, pts, mixc(silver, white, lit));
  p.set(x - 1, y - 1, white);
}
const magician: Border = {
  wood: ['#191a24', '#33343f', '#6d717e', '#c3c8d2'],
  accent: '#e8ecf2',
  decorate(p, b, t) {
    const perimeter = 2 * (p.w + p.h);
    const glint = (t / 3) * perimeter;
    const near = (s: number) => {
      const d = Math.abs(((s - glint) % perimeter + perimeter) % perimeter);
      return Math.max(0, 1 - Math.min(d, perimeter - d) / 26);
    };
    const suits: Suit[] = ['spade', 'heart', 'club', 'diamond'];
    const m = Math.floor(b / 2);
    let k = 0;
    // Top rail (left to right), right rail (down), bottom (right to left), left rail (up).
    for (let x = b + 10; x < p.w - b - 8; x += 18, k++) if (Math.abs(x - p.w / 2) > 22) pip(p, x, m, suits[k % 4], near(x));
    for (let y = b + 10; y < p.h - b - 8; y += 18, k++) pip(p, p.w - 1 - m, y, suits[k % 4], near(p.w + y));
    for (let x = p.w - b - 10; x > b + 8; x -= 18, k++) if (Math.abs(x - p.w / 2) > 30) pip(p, x, p.h - 1 - m, suits[k % 4], near(p.w + p.h + (p.w - x)));
    for (let y = p.h - b - 10; y > b + 8; y -= 18, k++) pip(p, m, y, suits[k % 4], near(2 * p.w + p.h + (p.h - y)));
    // The running glint itself along the inner metal bead.
    for (let s = 0; s < perimeter; s += 1) {
      const lit = near(s);
      if (lit < 0.3) continue;
      let x: number, y: number;
      if (s < p.w) [x, y] = [s, b - 2];
      else if (s < p.w + p.h) [x, y] = [p.w - b + 1, s - p.w];
      else if (s < 2 * p.w + p.h) [x, y] = [p.w - (s - p.w - p.h), p.h - b + 1];
      else [x, y] = [b - 2, p.h - (s - 2 * p.w - p.h)];
      if (x >= 0 && y >= 0 && x < p.w && y < p.h) p.set(Math.round(x), Math.round(y), mixc(silver, white, lit));
    }
    cornerStar(p, m, m, near(0));
    cornerStar(p, p.w - 1 - m, m, near(p.w));
    cornerStar(p, p.w - 1 - m, p.h - 1 - m, near(p.w + p.h));
    cornerStar(p, m, p.h - 1 - m, near(2 * p.w + p.h));
    // Top-hat clasp at the top centre: brim, crown, ruby band and a silver star.
    const x = p.w >> 1;
    face(p, [[x - 13, 13], [x + 13, 13], [x + 11, 16], [x - 11, 16]], abyss);
    face(p, [[x - 12, 13], [x + 12, 13], [x + 10, 15], [x - 10, 15]], black);
    face(p, [[x - 8, 0], [x + 8, 0], [x + 8, 13], [x - 8, 13]], abyss);
    face(p, [[x - 7, 1], [x + 7, 1], [x + 7, 12], [x - 7, 12]], black);
    for (let v = 1; v < 12; v++) p.set(x - 5, v, tarnish);
    p.line(x - 7, 9, x + 7, 9, ruby);
    p.line(x - 7, 10, x + 7, 10, ruby);
    p.line(x - 7, 11, x + 7, 11, hx('#5a1a2b'));
    p.line(x - 12, 13, x + 12, 13, tarnish);
    const lit = near(x);
    face(p, [[x, 7], [x + 2, 10], [x, 13], [x - 2, 10]], mixc(silver, white, lit));
    p.set(x, 10, white);
    // Crossed wand under the nameplate: black shaft, white tips, a gold star spark.
    const y = p.h - 1 - m;
    for (let u = -26; u <= 26; u++) {
      const yy = y + Math.round(u * 0.08);
      if (Math.abs(u) < 14) continue;
      p.set(x + u, yy, Math.abs(u) > 22 ? white : abyss);
      p.set(x + u, yy + 1, Math.abs(u) > 22 ? silver : black);
    }
    for (const s of [-1, 1]) {
      const sx = x + s * 29,
        sy = y + Math.round(s * 2.3);
      face(p, [[sx, sy - 3], [sx + 1, sy - 1], [sx + 3, sy], [sx + 1, sy + 1], [sx, sy + 3], [sx - 1, sy + 1], [sx - 3, sy], [sx - 1, sy - 1]], mixc(gold, white, near(p.w + p.h + p.w / 2)));
    }
  },
};
export default magician;
