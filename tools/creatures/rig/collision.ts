// World-space inspection geometry, shared by posing and the workshop auditor.
import type { Rig, V3 } from './f15-rig';

export interface Ellipsoid {
  i: number;
  c: V3;
  inv: number[][];
  radii: V3;
  label: string;
}
interface Cap {
  i: number;
  a: V3;
  b: V3;
  r: number;
  len: number;
  label: string;
}
function hex(m: unknown) {
  const T = (m as { T?: unknown[] } | undefined)?.T;
  const c = (T?.[2] ?? T?.[1]) as number[] | undefined;
  if (!c) return '-';
  return '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}
function invert(a: V3[]): number[][] | null {
  // columns are the semi-axis vectors; invert the 3×3 matrix [a0 a1 a2]
  const m = [
    [a[0][0], a[1][0], a[2][0]],
    [a[0][1], a[1][1], a[2][1]],
    [a[0][2], a[1][2], a[2][2]],
  ];
  const [[p, q, r], [s, t, u], [v, w, x]] = m;
  const det = p * (t * x - u * w) - q * (s * x - u * v) + r * (s * w - t * v);
  if (Math.abs(det) < 1e-9) return null;
  return [
    [(t * x - u * w) / det, (r * w - q * x) / det, (q * u - r * t) / det],
    [(u * v - s * x) / det, (p * x - r * v) / det, (r * s - p * u) / det],
    [(s * w - t * v) / det, (q * v - p * w) / det, (p * t - q * s) / det],
  ];
}

export function primitivesOf(rig: Rig) {
  const ells: Ellipsoid[] = [],
    caps: Cap[] = [];
  (rig.prims as unknown as Record<string, unknown>[]).forEach((q, i) => {
    if (q.k === 0) {
      const a = q.a as V3[];
      const inv = invert(a);
      if (!inv) return;
      const radii = a.map((v) => Math.hypot(...v)) as V3;
      const label = (q.t as string) ?? 'ell ' + hex(q.m) + ' ' + radii.map((r) => Math.round(r)).join('×');
      ells.push({ i, c: q.c as V3, inv, radii, label });
    } else if (q.k === 1) {
      const a = q.a as V3,
        b = q.b as V3;
      const r = Math.max(q.r0 as number, q.r1 as number);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      caps.push({ i, a, b, r, len, label: (q.t as string) ?? 'cap ' + hex(q.m) + ' r' + Math.round(r) });
    }
  });
  return { ells, caps };
}
