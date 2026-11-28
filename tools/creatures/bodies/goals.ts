// Goals are authored in the unprojected body frame: forward, right, up. The
// renderer projects the solved joints, so side and camera never specify depth order.
import type { JointPose } from '../technique';
import { type Rig, F3, type V3, vadd, vcross, vdot, vlen, vlerp, vmul, vnorm, vsub } from '../rig/f15-rig';
import { primitivesOf, type Ellipsoid } from '../rig/collision';

function goal(socket: string, point: V3): JointPose {
  if (!socket || point.length !== 3 || !point.every(Number.isFinite))
    throw Error('A goal requires a socket and three finite coordinates');
  const key = 'goal.' + socket + '.';
  return {
    [key + 'forward']: point[0],
    [key + 'right']: point[1],
    [key + 'up']: point[2],
    [key + 'weight']: 1,
  };
}
export const reach = goal;
export const look = goal;
export function aim(socket: string, point: V3, contactFrame?: number): JointPose {
  const values = goal(socket, point);
  if (contactFrame !== undefined) {
    if (!Number.isInteger(contactFrame) || contactFrame < 0) throw RangeError('Invalid contact frame');
    values['goal.' + socket + '.contactFrame'] = contactFrame;
  }
  return values;
}
export function goalAt(pose: JointPose, socket: string, rest?: V3): V3 | undefined {
  const key = 'goal.' + socket + '.',
    weight = pose[key + 'weight'] ?? 0;
  if (weight <= 0) return undefined;
  // Ordinary pose interpolation premultiplies a newly appearing target by its weight.
  const target: V3 = [
    pose[key + 'forward'] / weight,
    pose[key + 'right'] / weight,
    pose[key + 'up'] / weight,
  ];
  return rest ? vlerp(rest, target, Math.min(weight, 1)) : target;
}
export function toLocal(basis: F3, world: V3): V3 {
  const d = vsub(world, basis.o);
  return [basis.f, basis.s, basis.u].map((a) => vdot(a, d) / vdot(a, a)) as V3;
}
export function lookAngles(basis: F3, origin: V3, target: V3) {
  const d = vsub(target, origin),
    forward = vdot(d, basis.f),
    right = vdot(d, basis.s),
    up = vdot(d, basis.u);
  return { yaw: Math.atan2(right, forward), pitch: -Math.atan2(up, Math.hypot(forward, right)) };
}
export type Shell = readonly Ellipsoid[];
export function collisionShell(rig: Rig): Ellipsoid[] {
  return primitivesOf(rig).ells.filter((e) =>
    /^(torso|body|head|neck|belly|chest|hips|thorax|hull|pelvis|abdomen)/i.test(e.label),
  );
}
function normalized(inv: number[][], v: V3): V3 {
  return inv.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]) as V3;
}
/** Minimum ellipsoid radius reached by the segment axis, including between the auditor's samples. */
export function segmentClearance(shell: Shell, a: V3, b: V3) {
  let clearance = Infinity;
  for (const e of shell) {
    const p = normalized(e.inv, vsub(a, e.c)),
      d = normalized(e.inv, vsub(b, a));
    const t = Math.min(1, Math.max(0, -vdot(p, d) / (vdot(d, d) || 1)));
    clearance = Math.min(clearance, Math.hypot(...vadd(p, vmul(d, t))));
  }
  return clearance;
}
export interface ReachOptions {
  shoulder: V3;
  target: V3;
  upper: number;
  lower: number;
  basis: F3;
  side: number;
  shell: Shell;
  /** Maximum physical protraction, in original rig units. */ maxAdvance?: number;
}
export interface SolvedReach {
  shoulder: V3;
  elbow: V3;
  hand: V3;
}
export function solveReach({
  shoulder,
  target,
  upper,
  lower,
  basis,
  side,
  shell,
  maxAdvance = 0,
}: ReachOptions): SolvedReach {
  if (
    !(upper > 0 && lower > 0 && maxAdvance >= 0) ||
    ![...target, ...shoulder, upper, lower, maxAdvance].every(Number.isFinite)
  )
    throw RangeError('Arm lengths, reach allowance and target must be finite');
  if (segmentClearance(shell, target, target) < 0.85) throw RangeError('Reach target is inside the body');
  const gap = vsub(target, shoulder),
    distance = vlen(gap),
    axis = vnorm(gap);
  if (
    distance > upper + lower + maxAdvance + 1e-8 ||
    distance < Math.abs(upper - lower) - 1e-8 ||
    distance < 1e-8
  )
    throw RangeError('Reach target is outside the two-bone workspace');
  const out = basis.v(0, side < 0 ? -1 : 1, 0);
  const travel = Math.max(0, distance - upper - lower);
  const candidates: V3[] = [vadd(shoulder, vmul(axis, travel))];
  if (maxAdvance > travel) {
    for (const fraction of [0.25, 0.5, 0.75, 1]) {
      const space = (maxAdvance - travel) * fraction;
      for (const d of [axis, out, basis.f, basis.u]) candidates.push(vadd(candidates[0], vmul(d, space)));
    }
  }
  for (const root of candidates) {
    const line = vsub(target, root),
      length = vlen(line);
    if (length < 1e-8 || length > upper + lower + 1e-8 || length < Math.abs(upper - lower) - 1e-8) continue;
    const u = vmul(line, 1 / length);
    // Parallel transport an anatomical pole from the forward direction to the current reach.
    const rest = vnorm(vadd(vmul(out, 0.88), vmul(basis.u, -0.48)));
    const denom = 1 + vdot(basis.f, u);
    const pole =
      denom > 1e-5
        ? vnorm(vsub(rest, vmul(vadd(basis.f, u), vdot(rest, u) / denom)))
        : vnorm(vsub(rest, vmul(u, vdot(rest, u))));
    const twist = vnorm(vcross(u, pole));
    const x = (upper * upper - lower * lower + length * length) / (2 * length);
    const middle = vadd(root, vmul(u, x)),
      radius = Math.sqrt(Math.max(0, upper * upper - x * x));
    const point = (angle: number) =>
      vadd(middle, vmul(vadd(vmul(pole, Math.cos(angle)), vmul(twist, Math.sin(angle))), radius));
    const clearance = (elbow: V3) =>
      Math.min(segmentClearance(shell, root, elbow), segmentClearance(shell, elbow, target));
    const natural = point(0);
    if (clearance(natural) >= 0.85) return { shoulder: root, elbow: natural, hand: target };
    // Find the nearest safe swivel on either side of the pole. Refine its boundary so that
    // a slowly moving target can slide continuously around the obstacle.
    for (let n = 1; n <= 36; n++) {
      const step = Math.PI / 36;
      for (const sign of [1, -1]) {
        const angle = sign * n * step;
        if (clearance(point(angle)) < 0.85) continue;
        let blocked = angle - sign * step,
          clear = angle;
        for (let j = 0; j < 12; j++) {
          const mid = (blocked + clear) * 0.5;
          if (clearance(point(mid)) < 0.85) blocked = mid;
          else clear = mid;
        }
        return { shoulder: root, elbow: point(clear), hand: target };
      }
    }
  }
  throw RangeError('No collision-free elbow plane or shoulder position reaches the target');
}

/** Pivot a rigid shaft around its prescribed contact. The butt and the entire shaft
 * use the same ellipsoid metric as the arms. The optional constraint represents the grip(s). */
export function solveShaft(
  shell: Shell,
  target: V3,
  preferred: V3,
  span: number,
  basis: F3,
  canGrip: (dir: V3) => boolean = () => true,
): V3 {
  if (!(span > 0) || vlen(preferred) < 1e-8 || !target.every(Number.isFinite))
    throw RangeError('Invalid shaft direction, target or length');
  if (segmentClearance(shell, target, target) < 0.85) throw RangeError('Weapon target is inside the body');
  const axis = vnorm(preferred);
  const test = (dir: V3) =>
    segmentClearance(shell, target, vsub(target, vmul(dir, span))) >= 0.85 && canGrip(dir);
  if (test(axis)) return axis;
  const side = vnorm(vcross(axis, Math.abs(vdot(axis, basis.u)) < 0.8 ? basis.u : basis.s));
  const up = vcross(side, axis);
  // Search cones in increasing angle, so both the elbow and the grip keep their preferred plane
  // until an obstacle requires them to pivot. Each candidate preserves the rigid length.
  for (let ring = 1; ring <= 24; ring++) {
    const a = (ring * Math.PI) / 24;
    const samples = Math.max(1, Math.ceil(24 * Math.sin(a)));
    for (let i = 0; i < samples; i++) {
      const b = (i * 2 * Math.PI) / samples,
        radial = vadd(vmul(side, Math.cos(b)), vmul(up, Math.sin(b)));
      const at = (angle: number) => vadd(vmul(axis, Math.cos(angle)), vmul(radial, Math.sin(angle)));
      if (!test(at(a))) continue;
      let clear = a,
        blocked = a - Math.PI / 24;
      for (let j = 0; j < 7; j++) {
        const mid = (blocked + clear) / 2;
        if (test(at(mid))) clear = mid;
        else blocked = mid;
      }
      return at(clear);
    }
  }
  throw RangeError('No collision-free shaft orientation is reachable by both grips');
}
