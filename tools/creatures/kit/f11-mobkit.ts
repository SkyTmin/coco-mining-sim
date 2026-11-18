// From SkyTmin/coco-instruments dungeon-floors/f11-mobkit.ts, commit 523bae1 (MIT).
import { Px } from '../rig/px';
import type { RGBA, RigOut, Tones, V3 } from '../rig/f15-rig';
export const TAU = Math.PI * 2;
export const PI = Math.PI;
export const FPS = 24;

export const hx = (h: string, a = 255): RGBA => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
  a,
];
export const tn = (a: string, b: string, c: string, d: string): Tones => [
  hx(a),
  hx(b),
  hx(c),
  hx(d),
];
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const mixc = (a: RGBA, b: RGBA, k: number): RGBA => [
  Math.round(a[0] + (b[0] - a[0]) * k),
  Math.round(a[1] + (b[1] - a[1]) * k),
  Math.round(a[2] + (b[2] - a[2]) * k),
  a[3],
];
export const alpha = (c: RGBA, a: number): RGBA => [c[0], c[1], c[2], Math.round(clamp01(a) * 255)];
export const smooth = (k: number) => {
  const x = clamp01(k);
  return x * x * (3 - 2 * x);
};
export const sstep = (a: number, b: number, x: number) => smooth((x - a) / (b - a));
export const easeOut = (k: number) => 1 - (1 - clamp01(k)) ** 3;
export const easeIn = (k: number) => clamp01(k) ** 2;
export const easeIn3 = (k: number) => clamp01(k) ** 3;
export const lin = (k: number) => clamp01(k);
export const vlerp = (a: V3, b: V3, k: number): V3 => [
  a[0] + (b[0] - a[0]) * k,
  a[1] + (b[1] - a[1]) * k,
  a[2] + (b[2] - a[2]) * k,
];
export const vadd = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const vsub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const vmul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const vlen = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const vnorm = (a: V3): V3 => {
  const l = vlen(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const vcross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Детерминированный шум по числам (рисунок не трогает `sim.rng`). */
export const hash = (a: number, b: number, c = 0) => {
  let h = (a * 374761393 + b * 668265263 + c * 1274126177) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Номер кадра техники 24 к/с (не больше `max`). */
export const fi = (t: number, max: number) =>
  Math.min(max, Math.max(0, Math.floor(t * FPS + 1e-6)));
/** Время середины кадра `f` техники, с. */
export const tf = (f: number) => (f + 0.5) / FPS;

export type Ease = (x: number) => number;
export type Key = [number, number, Ease?];
/** Дорожка ключей: время → значение; кривая — у ключа, к которому идём. */
export function trk(k: number, keys: Key[]): number {
  if (k <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [k1, v1, e] = keys[i];
    if (k <= k1) {
      const [k0, v0] = keys[i - 1];
      const x = (k - k0) / (k1 - k0 || 1);
      return v0 + (v1 - v0) * (e ?? smooth)(x);
    }
  }
  return keys[keys.length - 1][1];
}

/**
 * Сустав двух звеньев (колено, локоть): от `a` к `b` длинами `l1`, `l2`,
 * сгиб — в сторону `pole`. Не дотягивается — прямая.
 */
export function ik(a: V3, b: V3, l1: number, l2: number, pole: V3): V3 {
  const d = vsub(b, a);
  const L = Math.min(vlen(d), l1 + l2 - 1e-3);
  const u = vnorm(d);
  const x = (l1 * l1 - l2 * l2 + L * L) / (2 * L || 1);
  const h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  let p = vsub(pole, vmul(u, pole[0] * u[0] + pole[1] * u[1] + pole[2] * u[2]));
  if (vlen(p) < 1e-4) p = vcross(u, [0, 0, 1]);
  p = vnorm(p);
  return vadd(a, vadd(vmul(u, x), vmul(p, h)));
}

export const INK = hx('#150f0b');
export const WHITE = hx('#ffffff');
export const GOLDK = hx('#ffcc40');

/** Заливка многоугольника в 2D: `fn(x, y)` — цвет пикселя или null. */
export function fill2(
  p: Px,
  pts: [number, number][],
  fn: (x: number, y: number) => RGBA | null,
): void {
  let minX = 1e9;
  let maxX = -1e9;
  let minY = 1e9;
  let maxY = -1e9;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.max(0, Math.floor(minY)); y <= Math.min(p.h - 1, Math.ceil(maxY)); y++)
    for (let x = Math.max(0, Math.floor(minX)); x <= Math.min(p.w - 1, Math.ceil(maxX)); x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) {
        const c = fn(x, y);
        if (c) p.set(x, y, c);
      }
    }
}

/**
 * След оружия (смаз): лента между дугой острия `tips` и дугой основания
 * `bases` (точки экрана по времени, от старой к новой). Старое — прозрачнее.
 * Рисуется ЗА телом (только в пустых пикселях) и светом — в `lit`.
 */
export function smear(
  o: RigOut,
  tips: [number, number][],
  bases: [number, number][],
  c: RGBA,
  glowA = 0.55,
): void {
  const n = Math.min(tips.length, bases.length);
  const lit = glowA > 0 ? litOn(o) : null;
  for (let i = 0; i < n - 1; i++) {
    const a = (0.25 + (0.75 * (i + 1)) / (n - 1)) * (c[3] / 255);
    const q: [number, number][] = [tips[i], tips[i + 1], bases[i + 1], bases[i]];
    const col = alpha(c, a);
    fill2(o.p, q, (x, y) => (o.p.data[(y * o.p.w + x) * 4 + 3] ? null : col));
    if (lit) fill2(lit, q, () => alpha(c, a * glowA));
  }
}

/** Точка света в 2D: в кадр и поверх темноты. */
export function spark2(o: RigOut, x: number, y: number, c: RGBA, glow = 1): void {
  o.p.set(x, y, c);
  if (glow > 0) litOn(o).set(x, y, alpha(c, glow));
}
export const litOn = (o: RigOut): Px => (o.lit ??= new Px(o.p.w, o.p.h));
