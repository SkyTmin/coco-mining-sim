// Limb-in-body detector. A capsule (limb, shaft, tail, neck) whose axis sinks deep inside a large
// ellipsoid (torso, head, belly) further than it does in the rest pose is a clipping pose: on screen
// the arm "goes into the body" or a club passes through the head.
import type { Rig } from '../rig/f15-rig';

import { primitivesOf } from '../rig/collision';
export { primitivesOf } from '../rig/collision';

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
