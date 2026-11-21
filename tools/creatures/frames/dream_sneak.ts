// Шмыг's own secret frame, «Рама сновидца»: a padded indigo velvet frame quilted in diamonds with gold dashed
// stitches, a small gold button where the stitches cross, gold piping along the inner and outer edges, a gold crescent
// in every corner, embroidered stars on the side rails that twinkle in a wave, a cloud sheep embroidered at the bottom
// middle, and on top a round clasp with a dozing crescent-moon face that opens one eye once per loop to peek at the
// painting, then shuts it again.
import { hx, mixc } from '../kit/f11-mobkit';
import type { Border } from '../types';
import type { Px } from '../rig/px';

const velvetDeep = hx('#0a0820'),
  velvet = hx('#1a1640'),
  velvetLit = hx('#2c2660'),
  goldDark = hx('#7a5418'),
  gold = hx('#d6a438'),
  goldLit = hx('#ffe48e'),
  white = hx('#ffffff'),
  moonLit = hx('#fff2be'),
  moon = hx('#f2d47a'),
  moonDark = hx('#b8963e'),
  pink = hx('#e88aa8'),
  wool = hx('#e8e8ff'),
  woolDark = hx('#9a9ac8'),
  ink = hx('#1a1030');
type C = [number, number, number, number];

function inFrame(p: Px, b: number, x: number, y: number) {
  return x >= 0 && y >= 0 && x < p.w && y < p.h && (x < b || y < b || x >= p.w - b || y >= p.h - b);
}
/** Diamond quilting over the rails: puffed cells shaded by their position, dashed gold stitches on the seams. */
function quilt(p: Px, b: number) {
  const cell = 12;
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      if (!inFrame(p, b, x, y)) continue;
      const u = (x + y) / cell,
        v = (x - y) / cell;
      const fu = u - Math.floor(u),
        fv = v - Math.floor(v);
      // Each diamond is a little pillow: lighter in its upper-left, darker toward the seams.
      const puff = Math.min(fu, 1 - fu, fv, 1 - fv);
      const lit = puff * 2 + (fu < 0.5 ? 0.15 : -0.1);
      const c = lit > 0.62 ? velvetLit : lit > 0.22 ? velvet : velvetDeep;
      p.set(x, y, c as C);
      const seam = fu < 0.06 || fv < 0.06;
      if (seam && (x + y) % 3 === 0) p.set(x, y, goldDark as C);
    }
}
function button(p: Px, x: number, y: number) {
  for (let v = -2; v <= 2; v++)
    for (let u = -2; u <= 2; u++) {
      const d = Math.hypot(u, v);
      if (d <= 2.2) p.set(x + u, y + v, (d > 1.6 ? goldDark : u + v < 0 ? goldLit : gold) as C);
    }
  p.set(x, y, goldDark as C);
}
function crescent(p: Px, x: number, y: number, flip: number) {
  for (let v = -6; v <= 6; v++)
    for (let u = -6; u <= 6; u++) {
      const d = Math.hypot(u, v),
        cut = Math.hypot(u - 3 * flip, v - 2);
      if (d <= 6 && cut > 4.8) p.set(x + u, y + v, (d > 5.2 || cut < 5.6 ? goldDark : u * flip < -2 ? goldLit : gold) as C);
    }
}
function embroideredStar(p: Px, x: number, y: number, lit: number) {
  const c = mixc(gold, goldLit, lit) as C;
  for (const [u, v] of [[0, -3], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [0, 3], [-3, 0], [-2, 0], [-1, 0], [1, 0], [2, 0], [3, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]])
    p.set(x + u, y + v, (Math.abs(u) + Math.abs(v) >= 3 ? mixc(goldDark, gold, lit) : c) as C);
  if (lit > 0.7) p.set(x, y, white as C);
}
function sheepPatch(p: Px, x: number, y: number) {
  for (const [u, v, r] of [[0, 0, 3.2], [-3, 1, 2.4], [3, 1, 2.4], [-1, -2, 2.2], [2, -2, 2.0]] as const)
    for (let yy = -4; yy <= 4; yy++) for (let xx = -4; xx <= 4; xx++) if (Math.hypot(xx, yy) <= r) p.set(x + u + xx, y + v + yy, (yy < -1 ? wool : woolDark) as C);
  for (let yy = -1; yy <= 1; yy++) for (let xx = 0; xx <= 2; xx++) p.set(x + 5 + xx, y + yy, ink as C);
  p.set(x + 7, y, wool as C);
  for (const u of [-2, 2]) {
    p.set(x + u, y + 4, ink as C);
    p.set(x + u, y + 5, ink as C);
  }
}
/** The dozing moon clasp: a round gold-rimmed medallion with a crescent face; once per loop one eye peeks open. */
function moonClasp(p: Px, cx: number, t: number) {
  const cy = 10;
  for (let v = -11; v <= 11; v++)
    for (let u = -11; u <= 11; u++) {
      const d = Math.hypot(u, v);
      if (d <= 11) p.set(cx + u, cy + v, (d > 10 ? velvetDeep : d > 8.6 ? (u + v < 0 ? goldLit : gold) : d > 7.8 ? goldDark : velvetDeep) as C);
    }
  for (let v = -7; v <= 7; v++)
    for (let u = -7; u <= 7; u++) {
      const d = Math.hypot(u, v),
        cut = Math.hypot(u - 4, v - 3);
      if (d > 7 || cut < 5.4) continue;
      p.set(cx + u, cy + v, (d > 6.2 || cut < 6.2 ? moonDark : u + v < -3 ? moonLit : moon) as C);
    }
  const k = (((t / 3) % 1) + 1) % 1;
  const peek = k > 0.62 && k < 0.8;
  const ex = cx - 3,
    ey = cy - 1;
  if (peek) {
    // One eye pops open and glances at the painting.
    for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) p.set(ex + u, ey + v, white as C);
    p.set(ex + (k < 0.71 ? 0 : 1), ey + 1, ink as C);
    p.set(ex + (k < 0.71 ? 0 : 1), ey, ink as C);
  } else {
    for (let u = -2; u <= 2; u++) p.set(ex + u, ey + Math.round((u * u) / 3), moonDark as C);
    p.set(ex - 3, ey + 1, moonDark as C);
  }
  for (let u = -1; u <= 1; u++) p.set(cx - 2 + u, cy + 4 - (u === 0 ? 0 : 1), moonDark as C);
  p.set(cx - 5, cy + 2, mixc(moon, pink, 0.6) as C);
  p.set(cx - 5, cy + 3, mixc(moon, pink, 0.6) as C);
}

const dreamer: Border = {
  wood: ['#0a0820', '#1a1640', '#2c2660', '#4a4288'],
  accent: '#ffe48e',
  decorate(p, b, t) {
    quilt(p, b);
    const perimeter = 2 * (p.w + p.h);
    const wave = (t / 3) * perimeter;
    const near = (s: number) => {
      const d = Math.abs((((s - wave) % perimeter) + perimeter) % perimeter);
      return Math.max(0, 1 - Math.min(d, perimeter - d) / 50);
    };
    // Gold piping: an outer and an inner bead.
    for (let x = 0; x < p.w; x++) {
      p.set(x, 1, goldDark as C);
      p.set(x, p.h - 2, goldDark as C);
      p.set(x, b - 2, gold as C);
      p.set(x, b - 1, goldDark as C);
      p.set(x, p.h - b, gold as C);
      p.set(x, p.h - b + 1, goldDark as C);
    }
    for (let y = 0; y < p.h; y++) {
      p.set(1, y, goldDark as C);
      p.set(p.w - 2, y, goldDark as C);
      p.set(b - 2, y, gold as C);
      p.set(b - 1, y, goldDark as C);
      p.set(p.w - b, y, gold as C);
      p.set(p.w - b + 1, y, goldDark as C);
    }
    // Buttons where the diamond stitches cross on the middle line of each rail.
    const m = Math.floor(b / 2);
    const cx = p.w >> 1;
    for (let x = 24; x < p.w - 20; x += 24) {
      if (Math.abs(x - cx) > 20) button(p, x, m);
      if (Math.abs(x - cx) > 14) button(p, x, p.h - 1 - m);
    }
    for (let y = 30; y < p.h - 24; y += 24) {
      if (Math.abs(y - p.h / 2) > 12) {
        button(p, m, y);
        button(p, p.w - 1 - m, y);
      }
    }
    crescent(p, m, m, 1);
    crescent(p, p.w - 1 - m, m, -1);
    crescent(p, p.w - 1 - m, p.h - 1 - m, -1);
    crescent(p, m, p.h - 1 - m, 1);
    // Embroidered stars in the middle of the side rails, twinkling as the wave passes.
    embroideredStar(p, m, p.h >> 1, near(2 * p.w + p.h + p.h / 2));
    embroideredStar(p, p.w - 1 - m, p.h >> 1, near(p.w + p.h / 2));
    sheepPatch(p, cx - 64, p.h - 1 - m);
    sheepPatch(p, cx + 60, p.h - 1 - m);
    moonClasp(p, cx, t);
  },
};
export default dreamer;
