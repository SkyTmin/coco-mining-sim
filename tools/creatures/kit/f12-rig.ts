// From SkyTmin/coco-instruments dungeon-floors/f12-rig.ts, commit 523bae1 (MIT).
import type { RGBA } from '../rig/f15-rig';
export function hash(x: number, y: number, s = 0): number {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Плавный шум по мировым пикселям: дюны снега, разводы льда. */
export function vnoise(x: number, y: number, s: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, s);
  const b = hash(xi + 1, yi, s);
  const c = hash(xi, yi + 1, s);
  const d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export const fbm = (x: number, y: number, s: number) =>
  vnoise(x, y, s) * 0.55 +
  vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 +
  vnoise(x * 4.3, y * 4.3, s + 13) * 0.15;

/** Порядковый дизеринг 4×4: тон между ступенями без каши. */
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (v) => (v + 0.5) / 16,
);
export const dither = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

/**
 * Тон по доле 0…1. Без дизеринга — ступени ложатся пятнами по шуму, как
 * у пиксель-арта; `dith` — шахматка только узкой полосой у самого порога.
 */
export function toneOf(r: RGBA[], k: number, x: number, y: number, dith = false): RGBA {
  const f = Math.max(0, Math.min(0.999, k)) * (r.length - 1);
  const i = Math.floor(f);
  const fr = f - i;
  const th = dith ? 0.5 + (dither(x, y) - 0.5) * 0.35 : 0.5;
  return r[Math.min(r.length - 1, i + (fr > th ? 1 : 0))];
}
