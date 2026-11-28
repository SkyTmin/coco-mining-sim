import { Px } from './rig/px';
import { hx } from './kit/f11-mobkit';
import type { Border } from './types';

// Each bevel has square, fixed-size corners. Straight sections tile in field
// coordinates, so extending a painting never stretches a highlight or a rivet.
export function frameImage(
  style: Border,
  w: number,
  h: number,
  b: number,
  t: number,
): Px {
  const p = new Px(w + 2 * b, h + 2 * b);
  const shades = style.wood.map((c) => hx(c));
  const edge = hx('#1a1518'),
    metal = hx(style.accent);
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      const right = p.w - 1 - x,
        bottom = p.h - 1 - y;
      const d = Math.min(x, y, right, bottom);
      if (d >= b) continue;
      const light = x === d || y === d;
      const rail = y === d || bottom === d ? x : y;
      const inside = b - 1 - d;
      let color = shades[1];
      if (d === 0 || inside === 0) color = edge;
      else if (d === 1 || inside === 2) color = shades[light ? 3 : 0];
      else if (d === 2 || inside === 3) color = shades[light ? 2 : 1];
      else if (inside === 1) color = metal;
      else if (d === 3 || rail % 8 === 0) color = shades[0];
      p.set(x, y, color);
    }
  style.decorate?.(p, b, ((t % 3) + 3) % 3);
  // Fixed empty nameplate. Its local coordinate system is the bottom rail.
  const cx = p.w >> 1,
    base = p.h - 2,
    half = Math.round(b * 1.55);
  const top = base - Math.max(3, Math.floor(b * 0.48));
  p.rect(cx - half, top, cx + half, base, edge);
  p.rect(cx - half + 1, top + 1, cx + half - 1, base - 1, shades[2]);
  p.line(cx - half + 2, top + 1, cx + half - 2, top + 1, shades[3]);
  for (const sign of [-1, 1]) p.set(cx + sign * (half - 2), base - 2, metal);
  return p;
}
