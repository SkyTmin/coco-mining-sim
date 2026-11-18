// Limb-in-body detector. A capsule (limb, shaft, tail, neck) whose axis sinks deep inside a large
// ellipsoid (torso, head, belly) further than it does in the rest pose is a clipping pose: on screen
// the arm "goes into the body" or a club passes through the head.
import type { Rig } from '../rig/f15-rig';

type V3 = [number, number, number];
interface Ell {
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
export interface ClipPair {
  cap: number;
  /** Capsule radius in rig units: thin rods (whiskers, chains) clip less visibly. */
  radius: number;
  ell: number;
  capLabel: string;
  ellLabel: string;
  /** Smallest normalised radius of the capsule axis inside the ellipsoid (1 = surface, 0 = centre). */
  depth: number;
}
export interface ClipAllow {
  a: string;
  b: string;
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
  const ells: Ell[] = [],
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

/** Depth of every capsule inside every ellipsoid that is clearly bigger than it. */
export function clipPairs(rig: Rig): ClipPair[] {
  const { ells, caps } = primitivesOf(rig);
  const out: ClipPair[] = [];
  for (const c of caps) {
    const capVolume = c.r * c.r * (c.len + c.r);
    for (const e of ells) {
      if (e.radii[0] * e.radii[1] * e.radii[2] < 3 * capVolume) continue;
      let depth = Infinity;
      for (let k = 0; k <= 10; k++) {
        const u = k / 10;
        const d = [0, 1, 2].map((j) => c.a[j] + (c.b[j] - c.a[j]) * u - e.c[j]);
        const n = e.inv.map((row) => row[0] * d[0] + row[1] * d[1] + row[2] * d[2]);
        depth = Math.min(depth, Math.hypot(n[0], n[1], n[2]));
      }
      if (depth < 1) out.push({ cap: c.i, radius: c.r, ell: e.i, capLabel: c.label, ellLabel: e.label, depth });
    }
  }
  return out;
}

export interface ClipBaseline {
  count: number;
  byIndex: Map<string, number>;
  byLabel: Map<string, number>;
}
export function baselineOf(rig: Rig): ClipBaseline {
  const byIndex = new Map<string, number>(),
    byLabel = new Map<string, number>();
  for (const p of clipPairs(rig)) {
    byIndex.set(p.cap + ':' + p.ell, p.depth);
    const k = p.capLabel + '|' + p.ellLabel;
    byLabel.set(k, Math.min(byLabel.get(k) ?? 1, p.depth));
  }
  return { count: rig.prims.length, byIndex, byLabel };
}

export const CLIP_DEPTH = 0.55; // axis deeper than this inside the volume
export const CLIP_DROP = 0.3; // and this much deeper than in the rest pose

function reference(base: ClipBaseline, sameShape: boolean, p: ClipPair) {
  return sameShape
    ? (base.byIndex.get(p.cap + ':' + p.ell) ?? base.byLabel.get(p.capLabel + '|' + p.ellLabel) ?? 1)
    : (base.byLabel.get(p.capLabel + '|' + p.ellLabel) ?? 1);
}
/** Worst new penetration in a frame, or null. Several rest poses may be given (idle, the animation's own
 *  first frame, the second form after a phase): an overlap present in any of them counts as designed. */
export function worstClip(rig: Rig, bases: ClipBaseline | ClipBaseline[], allow: ClipAllow[] = []): ClipPair | null {
  const list = Array.isArray(bases) ? bases : [bases];
  let worst: ClipPair | null = null,
    worstDrop = CLIP_DROP;
  for (const p of clipPairs(rig)) {
    if (p.depth >= CLIP_DEPTH) continue;
    if (allow.some((a) => (p.capLabel.includes(a.a) && p.ellLabel.includes(a.b)) || (p.capLabel.includes(a.b) && p.ellLabel.includes(a.a))))
      continue;
    const ref = Math.min(...list.map((b) => reference(b, rig.prims.length === b.count, p)));
    const drop = Math.min(ref, 1) - p.depth;
    if (drop > worstDrop) {
      worstDrop = drop;
      worst = p;
    }
  }
  return worst;
}
