// Strokes in field coordinates for the thorn, crystal, basalt and coin effects.
import { clamp01, hash, lerp, TAU } from '../kit/f11-mobkit';
import { spring } from '../kit/f13-art';
import { crackOf, drawCrack, fillPoly, starBranches, type Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';

export function oval(p: Pen, x: number, y: number, rx: number, ry: number, color: string, alpha = 1) {
  if (rx < 0.5 || ry < 0.5 || alpha <= 0) return;
  p.col(color, alpha);
  for (let row = Math.ceil(y - ry); row <= y + ry; row++) {
    const half = rx * Math.sqrt(Math.max(0, 1 - ((row - y) / ry) ** 2));
    const l = Math.round(x - half),
      r = Math.round(x + half);
    p.rect(l, row, Math.max(1, r - l + 1), 1);
  }
}
export function ripple(
  p: Pen,
  x: number,
  y: number,
  r: number,
  flatten: number,
  color: string,
  alpha = 1,
  portion = 1,
) {
  if (alpha <= 0 || r <= 1) return;
  const count = Math.max(12, Math.ceil(r * 3)),
    n = Math.floor(count * clamp01(portion));
  p.col(color, alpha);
  let xx = x + r,
    yy = y;
  for (let i = 1; i <= n; i++) {
    const a = (i / count) * TAU,
      nx = x + Math.cos(a) * r,
      ny = y + Math.sin(a) * r * flatten;
    p.line(xx, yy, nx, ny);
    xx = nx;
    yy = ny;
  }
}
export function shard(
  p: Pen,
  x: number,
  y: number,
  length: number,
  width: number,
  a: number,
  dark: string,
  light: string,
  alpha = 1,
) {
  if (alpha <= 0) return;
  const ux = Math.cos(a),
    uy = Math.sin(a),
    tip = [x + length * ux, y + length * uy],
    tail = [x - length * 0.42 * ux, y - length * 0.42 * uy];
  p.col(dark, alpha);
  fillPoly(p, [...tip, x + width * uy, y - width * ux, ...tail, x - width * uy, y + width * ux]);
  p.col(light, alpha);
  fillPoly(p, [...tip, x + width * uy, y - width * ux, ...tail]);
}
export function fissure(
  p: Pen,
  name: string,
  seed: number,
  x: number,
  y: number,
  age: number,
  size: number,
  color: string,
  lip: string,
  fade = 0.85,
) {
  if (age < 0 || age > fade) return;
  const c = crackOf(name, seed, starBranches(seed, 7, 0.28, size * 0.43, size, 2), 0.38, 0.15, 0.41);
  drawCrack(p, c, x, y, (age + 0.017) * size * 8, color, lip, clamp01((fade - age) / 0.22));
}
export function springBack(age: number, speed = 22) {
  if (age <= 0 || age > 0.72) return 0;
  return spring(0, speed, 0, 19, 0.4, age)[0];
}
export function projectile(from: XY, to: XY, u: number, apex: number): XY {
  const x = lerp(from[0], to[0], u),
    y = lerp(from[1], to[1], u) - 4 * apex * u * (1 - u);
  return [x, y];
}
export function strokeTrail(
  f: FxInput,
  name: string,
  color: string,
  bright: string,
  width: number,
  offset = 0,
) {
  const now = f.points[name],
    q1 = f.pointAt(Math.max(0, f.t - 0.042), name),
    q2 = f.pointAt(Math.max(0, f.t - 0.085), name);
  const points = [q2, q1, now];
  for (let i = 1; i < 3; i++) {
    const a = points[i - 1],
      b = points[i],
      h = width * i * 0.48;
    f.above.col(color, i * 0.26);
    fillPoly(f.above, [a[0], a[1] + offset, b[0], b[1] + offset - h, b[0], b[1] + offset + h]);
    f.above.lineS(a[0], a[1] + offset - h, b[0], b[1] + offset - h, bright, 0.35 * i);
  }
}
export function grit(p: Pen, x: number, y: number, age: number, n: number, seed: number, color: string) {
  if (age < 0 || age > 0.56) return;
  for (let j = 0; j < n; j++) {
    const a = hash(j, seed) * TAU,
      v = 10 + hash(j, seed, 1) * 37,
      q = Math.min(0.45, age);
    const xx = x + q * v * Math.cos(a),
      yy = y + q * v * 0.34 * Math.sin(a) - Math.max(0, age * (38 + v - 180 * age));
    p.col(color, clamp01((0.56 - age) * 6));
    p.dot(xx, yy, j % 4 === 0 ? 2 : 1, 1);
  }
}
