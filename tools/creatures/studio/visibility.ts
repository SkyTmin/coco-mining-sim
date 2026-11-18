// "The arm went into the body" as the viewer sees it: a named part (handR, club, tail…) that is mostly visible in
// the rest pose but almost gone from the picture around a strike — hidden inside or behind the torso or head.
// The engine orders parts per pixel by depth (z-buffer), so there are no fixed layers to get wrong: the near arm
// is in front of the chest and the far arm behind it because of where they are. What goes wrong is the pose.
// This catches occlusion that `clip` (3D penetration) cannot: a fist tucked behind the torso without touching it.
//
// Works on parts named with `rig.tag` (a part is many primitives: a furry arm is a dozen overlapping clumps, so a
// single primitive's visibility means nothing). Creatures without tags are skipped.
import { Rig, renderRig } from '../rig/f15-rig';

const W = 420,
  H = 420,
  AX = 210,
  AY = 320;
/** Below this share of its own unoccluded area a part counts as gone. */
export const GONE = 0.25;
/** It must have been at least this much more visible in the rest pose. */
export const GONE_DROP = 0.5;
/** Parts smaller than this (px, drawn alone) are details, not limbs. */
export const MIN_AREA = 24;
/** Tags that are the body a limb must not vanish into or behind. */
export const BODY_TAG = /^(torso|body|chest|belly|abdomen|thorax|hull|head|neck|pelvis|hips)/i;

export interface PartView {
  tag: string;
  /** visible pixels / pixels of the part drawn alone */
  share: number;
  area: number;
  /** The part that covers most of the hidden pixels. */
  by: string;
  byBody: boolean;
}

function idsOf(rig: Rig) {
  return renderRig(rig, W, H, AX, AY, { ids: true, outline: null, inner: 0 }).id!;
}
const tagOf = (rig: Rig, i: number) => (rig.prims[i] as { t?: string }).t;

/** Named parts: tag → primitive indices. */
export function partsOf(rig: Rig) {
  const parts = new Map<string, number[]>();
  rig.prims.forEach((_, i) => {
    const t = tagOf(rig, i);
    if (!t) return;
    const list = parts.get(t) ?? [];
    list.push(i);
    parts.set(t, list);
  });
  return parts;
}

/** Visibility of every named limb-like part; `need` limits the "alone" renders to the parts worth checking. */
export function partViews(rig: Rig, need?: (tag: string, visible: number) => boolean): Map<string, PartView> {
  const parts = partsOf(rig);
  const out = new Map<string, PartView>();
  if (!parts.size) return out;
  const id = idsOf(rig);
  const visible = new Map<string, number>();
  for (const v of id) {
    if (v < 0) continue;
    const t = tagOf(rig, v);
    if (t) visible.set(t, (visible.get(t) ?? 0) + 1);
  }
  for (const [tag, idx] of parts) {
    if (BODY_TAG.test(tag)) continue;
    const vis = visible.get(tag) ?? 0;
    if (need && !need(tag, vis)) continue;
    const alone = new Rig();
    alone.prims = idx.map((i) => rig.prims[i]);
    const own = idsOf(alone);
    let area = 0;
    const cover = new Map<string, number>();
    for (let k = 0; k < own.length; k++) {
      if (own[k] < 0) continue;
      area++;
      const owner = id[k] >= 0 ? (tagOf(rig, id[k]) ?? '?') : '-';
      if (owner !== tag) cover.set(owner, (cover.get(owner) ?? 0) + 1);
    }
    if (area < MIN_AREA) continue;
    let by = '-',
      most = 0;
    for (const [t, c] of cover) if (c > most) (most = c), (by = t);
    out.set(tag, { tag, share: Math.min(1, vis / area), area, by, byBody: BODY_TAG.test(by) });
  }
  return out;
}

export type ViewBaseline = Map<string, PartView>;
export const viewBaseline = (rig: Rig): ViewBaseline => partViews(rig);

export interface GonePart {
  tag: string;
  share: number;
  rest: number;
  by: string;
}
/** The named part that lost the most visibility to the body against the rest poses, or null. */
export function worstGone(rig: Rig, bases: ViewBaseline[], skip: (tag: string) => boolean = () => false): GonePart | null {
  const restOf = (tag: string) => {
    let best: PartView | null = null;
    for (const b of bases) {
      const v = b.get(tag);
      if (v && (!best || v.share > best.share)) best = v;
    }
    return best;
  };
  // Cheap first pass: only parts that were visible at rest and now show few pixels get the "alone" render
  // (a margin of 1.5 covers foreshortening).
  const views = partViews(rig, (tag, vis) => {
    const r = restOf(tag);
    return !!r && r.share >= GONE + GONE_DROP && vis < 1.5 * GONE * r.area;
  });
  let worst: GonePart | null = null;
  for (const v of views.values()) {
    const rest = restOf(v.tag)?.share ?? 0;
    // Covered by another limb (an arm swung in front of the other arm) is normal; vanishing into the body is not.
    if (v.share >= GONE || rest - v.share < GONE_DROP || !v.byBody || skip(v.tag)) continue;
    if (!worst || rest - v.share > worst.rest - worst.share) worst = { tag: v.tag, share: v.share, rest, by: v.by };
  }
  return worst;
}
