// The giant's vent is on the crown, well above the actual muzzle. Keep the
// contacted vent fixed while the broad jaw pivots clear of the pectoral plates.
import { primitivesOf } from '../rig/collision';
import { F3, type Rig, type V3, vadd, vsub } from '../rig/f15-rig';
import { segmentClearance, toLocal } from './goals';
import { transformPart } from './rig-transform';

export function clearGiantMuzzle(rig: Rig, points: Record<string, V3>, basis: F3) {
  const { caps, ells } = primitivesOf(rig);
  const parts = caps.filter((c) => c.label === 'head');
  const chest = ells.filter((e) => e.label === 'torso' || e.label === 'chest' || e.label === 'belly');
  const pairs = parts.map((c) => ({
    cap: c,
    shell: chest.filter((e) => e.radii[0] * e.radii[1] * e.radii[2] >= 3 * c.r * c.r * (c.len + c.r)),
  }));
  const contact = points.vent;
  function map(p: V3, angle: number) {
    const local = toLocal(basis, vsub(p, contact));
    const cos = Math.cos(angle),
      sin = Math.sin(angle);
    return vadd(contact, basis.v(local[0] * cos + local[2] * sin, local[1], local[2] * cos - local[0] * sin));
  }
  const clear = (a: number) =>
    pairs.every(({ cap, shell }) => segmentClearance(shell, map(cap.a, a), map(cap.b, a)) >= 0.57);
  if (clear(0)) return;
  for (let step = 1; step <= 36; step++)
    for (const sign of [-1, 1]) {
      const angle = sign * step * 0.045;
      if (!clear(angle)) continue;
      let lo = angle - sign * 0.045,
        hi = angle;
      for (let i = 0; i < 6; i++) {
        const middle = (lo + hi) / 2;
        if (clear(middle)) hi = middle;
        else lo = middle;
      }
      const posed = (p: V3) => map(p, hi);
      transformPart(rig, (t) => t === 'head' || t === 'steam', posed);
      if (rig.eye) rig.eye = posed(rig.eye);
      for (const socket of ['head', 'mouth', 'vent', 'eye']) points[socket] = posed(points[socket]);
      return;
    }
  throw RangeError('The giant cannot clear its jaw at the requested vent position');
}
