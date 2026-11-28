// Native picture pixels for births and visibility; physical 3D bones for arm extension.
import type { compose } from '../engine';
import type { V3 } from '../rig/f15-rig';
import type { XY } from '../types';
import type { Px } from '../rig/px';
import type { MaterialInk } from '../technique-fx';

export const BIRTH_GAP = 6;
export const ARM_EXTENSION = 0.8;
export type ContactIssue = 'from-nowhere' | 'reach' | 'face-at-contact';
type SingleException = {
  kind: 'from-nowhere' | 'face-at-contact';
  anim: string;
  frame: number;
  /** Birth exceptions select one named object; face exceptions select the contact. */
  object?: string;
  reason: string;
};
export type ContactException =
  | SingleException
  | {
      kind: 'from-nowhere';
      anim: string;
      /** Exactly enumerated members of one designed sequence with a shared explanation. */
      appearances: Record<string, number>;
      reason: string;
    };
export function allowedContact(
  rules: ContactException[] | undefined,
  kind: ContactIssue,
  anim: string,
  frame: number,
  object?: string,
) {
  return (rules ?? []).some((r) => {
    if (r.kind !== kind || r.anim !== anim || typeof r.reason !== 'string' || !r.reason.trim()) return false;
    return 'appearances' in r
      ? object !== undefined && Object.hasOwn(r.appearances, object) && r.appearances[object] === frame
      : r.frame === frame && r.object === object;
  });
}
const distance = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export function extension(joints: Record<string, V3> | undefined, side: 'L' | 'R') {
  const a = joints?.['shoulder' + side],
    b = joints?.['elbow' + side],
    c = joints?.['hand' + side];
  if (!a || !b || !c) return null;
  const upper = distance(a, b),
    lower = distance(b, c);
  return upper > 0 && lower > 0 ? distance(a, c) / (upper + lower) : null;
}

type PaintFrame = Pick<ReturnType<typeof compose>, 'layers' | 'worldFeet' | 'feet' | 'points' | 'picture'>;
/** Pixels are on the FX field. Camera, framing, other layers and foreground props can hide them. */
export function visibleMaterial(frame: PaintFrame, ink: MaterialInk, without?: () => Px): XY[] {
  const { layers } = frame;
  const covers =
    ink.layer === 'under'
      ? [layers.body, layers.lit, layers.fxo, layers.bgf, layers.frame, layers.over]
      : [layers.bgf, layers.frame, layers.over];
  const source = ink.layer === 'under' ? layers.fxu : layers.fxo;
  const dx = frame.feet[0] - frame.worldFeet[0],
    dy = frame.feet[1] - frame.worldFeet[1];
  const field = new Uint32Array(source.data.buffer),
    final = new Uint32Array(frame.picture.data.buffer);
  let comparison: Uint32Array | undefined;
  return ink.pixels.filter(([x, y], i) => {
    const col = Math.round(x + dx),
      row = Math.round(y + dy);
    if (col < 0 || row < 0 || col >= source.w || row >= source.h) return false;
    const a = 4 * (row * source.w + col) + 3;
    if (!source.data[a] || covers.some((layer) => layer.data[a] === 255)) return false;
    const at = row * source.w + col;
    // Unchanged ink (including several identically colored coins leaving one slot) is visible.
    if (!without || field[at] === ink.colors[i]) return true;
    // A later brush touched the same layer. Determine whether this object still contributes
    // to the finished pixel, including translucent overpaint, instead of counting the new brush.
    comparison ??= new Uint32Array(without().data.buffer);
    return comparison[at] !== final[at];
  });
}

/** Ground projections and floor targets are not anatomy. Only the local ground line can originate a prop. */
export function birthDistance(pixels: XY[], points: Record<string, XY>, floorY: number) {
  const sockets = Object.entries(points).filter(([name]) => !/(ground|floor)/i.test(name));
  let distance = Infinity,
    nearest = 'floor';
  for (const [x, y] of pixels) {
    const ground = Math.abs(y - floorY);
    if (ground < distance) {
      distance = ground;
      nearest = 'floor';
    }
    for (const [name, pt] of sockets) {
      const d = Math.hypot(x - pt[0], y - pt[1]);
      if (d < distance) {
        distance = d;
        nearest = name;
      }
    }
  }
  return { distance, nearest };
}

/** The prefix gives custom props a stable ID shared with their later FX flight. */
export function rigMaterial(tag?: string) {
  const named = /^(?:material|projectile):(.+)$/i.exec(tag ?? '');
  if (named) return named[1];
  if (tag && /^(?:snowball|rock|stone|coin|bomb|charge|orb|caughtCoin)(?:[-_]?\d+)?$/i.test(tag)) return tag;
}
