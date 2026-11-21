import { ik } from '../kit/f11-mobkit';
import { goalAt, segmentClearance, solveReach, toLocal, type Shell } from '../bodies/goals';
import { rotateFromTo } from '../bodies/rig-transform';
import { F3, vadd, vcross, vdot, vlen, vlerp, vmul, vnorm, vsub, type V3 } from '../rig/f15-rig';
import type { JointPose } from '../technique';

export function frogTarget(pose: JointPose, frame: F3, name: string, rest: V3) {
  const local = goalAt(pose, name, toLocal(frame, rest));
  return local ? frame.p(...local) : rest;
}

export function positionStaff(pose: JointPose, body: F3, staff: F3, phase: number) {
  const crown = staff
    .at(-6, -9, 71.3)
    .roll(-0.3)
    .pitch(-0.36)
    .p(0, 0, 7.4 + phase);
  const heel = frogTarget(pose, body, 'staffFoot', staff.o);
  const tip = frogTarget(pose, body, 'staffTip', crown);
  const rotate = rotateFromTo(vsub(crown, staff.o), vsub(tip, heel));
  return new F3(heel, rotate(staff.f), rotate(staff.s), rotate(staff.u));
}

// The palm slides on the original crook. Its fingers curl around the same piece of wood.
export function gripOnCrook(target: V3, crook: V3[]) {
  let hand = crook[0],
    best = Infinity;
  for (let i = 1; i < crook.length; i++) {
    const edge = vsub(crook[i], crook[i - 1]);
    const along = Math.max(0, Math.min(1, vdot(vsub(target, crook[i - 1]), edge) / vdot(edge, edge)));
    const p = vadd(crook[i - 1], vmul(edge, along));
    const gap = vlen(vsub(target, p));
    if (gap < best) {
      hand = p;
      best = gap;
    }
  }
  return hand;
}

// On the rigid crook a hand can slide longitudinally, never off the wood. A free palm can
// shorten its reach if the painted target is beyond the physical workspace.
export function frogArm(
  shell: Shell,
  basis: F3,
  root: V3,
  target: V3,
  side: number,
  upper: number,
  lower: number,
  crook?: V3[],
) {
  const scale = vlen(basis.f);
  const axes = new F3(basis.o, vnorm(basis.f), vnorm(basis.s), vnorm(basis.u));
  const candidates: V3[] = [target];
  if (crook) {
    for (let i = 1; i < crook.length; i++) {
      const n = Math.ceil(vlen(vsub(crook[i], crook[i - 1])) / scale);
      for (let j = 0; j <= n; j++) candidates.push(vlerp(crook[i - 1], crook[i], j / n));
    }
  } else {
    // Contract toward the anatomical shoulder along the direction of the reaching palm.
    const gap = vsub(target, root),
      span = vlen(gap);
    for (let d = scale; d < span; d += scale) candidates.push(vadd(target, vmul(gap, -d / span)));
  }
  candidates.sort((a, b) => vlen(vsub(a, target)) - vlen(vsub(b, target)));
  for (const hand of candidates) {
    try {
      const arm = solveReach({
        shell,
        basis: axes,
        side,
        shoulder: root,
        target: hand,
        upper,
        lower,
        maxAdvance: 13 * scale,
      });
      return arm;
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
    }
  }
  throw new RangeError('Unreachable frog grip ' + side);
}

export function frogKnee(shell: Shell, root: V3, heel: V3, thigh: number, shin: number, pole: V3) {
  const axis = vnorm(vsub(heel, root)),
    first = ik(root, heel, thigh, shin, pole);
  const limit = Math.min(0.85, segmentClearance(shell, root, root));
  const safe = (knee: V3) =>
    segmentClearance(shell, root, knee) >= limit - 1e-5 && segmentClearance(shell, knee, heel) >= 0.85;
  if (safe(first)) return first;
  const out = vnorm(vsub(pole, vmul(axis, vdot(pole, axis)))),
    tangent = vcross(axis, out);
  for (let i = 1; i <= 36; i++)
    for (const sign of [-1, 1]) {
      const a = (sign * i * Math.PI) / 36;
      const knee = ik(root, heel, thigh, shin, vadd(vmul(out, Math.cos(a)), vmul(tangent, Math.sin(a))));
      if (safe(knee)) return knee;
    }
  return first;
}
