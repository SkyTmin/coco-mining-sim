// Seven native colour steps with a sparse, material-locked transition between steps.
import type { F3, Mat, RGBA, V3 } from '../rig/f15-rig';
export function ramp(
  mat: Mat,
  light: number,
  grain: number,
  u: number,
  v: number,
): RGBA {
  const value = Math.min(6, Math.max(0, (light + 0.72) * 3.45 + grain));
  const cell = (Math.floor(u) & 1) + 2 * (Math.floor(v) & 1);
  const cut = [0.16, 0.75, 0.93, 0.43][cell];
  const n = Math.min(6, Math.floor(value) + (value % 1 > cut ? 1 : 0));
  if (n % 2 === 0) return mat.T[n / 2];
  const a = mat.T[n >> 1],
    b = mat.T[(n >> 1) + 1];
  return [(a[0] + b[0]) >> 1, (a[1] + b[1]) >> 1, (a[2] + b[2]) >> 1, 255];
}
export function localPoint(F: F3, P: V3): V3 {
  const x = P[0] - F.o[0],
    y = P[1] - F.o[1],
    z = P[2] - F.o[2];
  const project = (a: V3) =>
    (x * a[0] + y * a[1] + z * a[2]) /
    (a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
  return [project(F.f), project(F.s), project(F.u)];
}
