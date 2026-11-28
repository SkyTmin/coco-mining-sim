// Sweep the shaft outside the front of the coat. Distances are in the same
// ellipsoid coordinates that the studio uses to inspect a posed capsule.
import { primitivesOf } from '../rig/collision';
import { F3, Rig, vadd, vcross, vdot, vmul, vnorm, vsub, type V3 } from '../rig/f15-rig';
import { segmentClearance } from './goals';
import { ik } from '../kit/f11-mobkit';

export function bodyShell(rig: Rig) {
  return primitivesOf(rig).ells.filter(
    (e) => ['torso', 'head', 'hips', 'belt', 'serac'].includes(e.label) && Math.min(...e.radii) > 2,
  );
}
type Shell = ReturnType<typeof bodyShell>;
function normalized(inv: number[][], v: V3): V3 {
  return inv.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as V3;
}

// A tangent extension at the rim makes the joint enter and leave the constraint continuously.
export function moveGrip(shell: Shell, at: V3, shaft: V3, forward: V3) {
  let shift = 0;
  for (const e of shell) {
    const direction = normalized(e.inv, forward),
      speed = Math.hypot(...direction);
    if (speed < 1e-5) continue;
    const n = vmul(direction, 1 / speed);
    const size = Math.min(...e.radii);
    const padding = (size + 3) / size;
    for (let distance = -11; distance <= 53; distance += 4) {
      const point = vadd(at, vmul(shaft, distance));
      const d = normalized(e.inv, vsub(point, e.c));
      const along = vdot(d, n),
        perp = Math.sqrt(Math.max(0, vdot(d, d) - along * along)) / padding;
      const front =
        perp > 0.9 ? Math.sqrt(0.19) - (0.9 / Math.sqrt(0.19)) * (perp - 0.9) : Math.sqrt(1 - perp * perp);
      shift = Math.max(shift, (front * padding - along) / speed);
    }
  }
  return vadd(at, vmul(forward, shift));
}
export function swingingElbow(shell: Shell, root: V3, hand: V3, basis: F3, side: number, length = 24) {
  const axis = vnorm(vsub(hand, root));
  const restPole = basis.v(0, side * 0.88, -0.48);
  // Parallel transport the bend plane from the arm's forward reference. This stays
  // continuous when the wrist crosses the lateral pole on the pickup or rebound.
  const pole = vnorm(
    vsub(
      restPole,
      vmul(vadd(axis, basis.f), vdot(restPole, axis) / Math.max(0.001, 1 + vdot(axis, basis.f))),
    ),
  );
  const around = vcross(axis, pole);
  const elbowFor = (angle: number) =>
    ik(root, hand, length, length, vadd(vmul(pole, Math.cos(angle)), vmul(around, Math.sin(angle))));
  // Interpolate the swivel in angular space, then solve the two bones once at
  // that angle. Equal-cost candidates cannot flip the elbow to the other side.
  let moment = 0,
    mass = 0;
  for (let i = -5; i <= 5; i++) {
    const angle = i * 0.3;
    const elbow = elbowFor(angle);
    const clearance = Math.min(segmentClearance(shell, root, elbow), segmentClearance(shell, elbow, hand));
    const overlap = Math.max(0, 1.05 - clearance);
    const weight = Math.exp(-3 * overlap * overlap - 1.4 * angle * angle);
    moment += angle * weight;
    mass += weight;
  }
  return elbowFor(moment / mass);
}
