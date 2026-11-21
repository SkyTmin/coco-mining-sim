import type { F3 } from '../rig/f15-rig';
import type { HeavySkeleton } from '../bodies/heavy-quadruped';
// The near and far feet stand on offset tracks; all four soles remain visible in the idle view.
export function meadowStagger(side: number): [forward: number, right: number] {
  return [-3.4 * side, side < 0 ? 4.6 : 1.1];
}

export function meadowHeadFrame(s: HeavySkeleton) {
  const tuck = Math.min(1, Math.max(0, s.pose['neck.tuck'] ?? 0));
  return s.head
    .at(0.8 - 17 * tuck, 0, 5.15 - 3.65 * tuck + (s.pose['neck.lift'] ?? 0))
    .pitch(-0.12 * (1 - tuck));
}

export const meadowNose = (head: F3) => head.p(18.5, 0, 1.2);
