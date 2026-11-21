// A crooked staff pivots around either its declared tip or the magician's wrist.
// Its lantern, ferrules, gills and butt all follow that same rigid transform.
import type { JointPose } from '../technique';
import { F3, type Rig, type V3, vadd, vcross, vdot, vlen, vmul, vnorm, vsub } from '../rig/f15-rig';
import { primitivesOf } from '../rig/collision';
import { goalAt, segmentClearance, solveReach, toLocal, type Shell, type SolvedReach } from './goals';
import { readChain } from './limbs';
import { rotateFromTo, transformPart, transformPrimitive } from './rig-transform';

type Points = Record<string, V3>;
type MapPoint = (point: V3) => V3;
const sides = [-1, 1] as const;
const separation = 0.85;
const distance = (a: V3, b: V3) => vlen(vsub(a, b));

function aimAt(pose: JointPose, basis: F3, point: V3, ids: string[], joint?: string) {
  for (const id of ids) {
    const local = goalAt(pose, id, toLocal(basis, point));
    if (local) {
      const w = pose['goal.' + id + '.weight'];
      // Cast along a lateral arc when leaving or recovering the resting wrist.
      // Both ends of the arc are the exact authored points.
      const swing = 4 * w * (1 - w);
      return basis.p(
        local[0] + 6 * swing,
        local[1] + (id.endsWith('L') ? -18 : 18) * swing,
        local[2] + 8 * swing,
      );
    }
  }
  if (joint) {
    const offset: V3 = [pose[joint + '.forward'] ?? 0, pose[joint + '.right'] ?? 0, pose[joint + '.up'] ?? 0];
    if (offset.some(Boolean)) return vadd(point, basis.v(...offset));
  }
}

function armAt(basis: F3, shell: Shell, chain: SolvedReach, side: number, hand: V3) {
  if (
    distance(chain.hand, hand) < 1e-7 &&
    Math.min(
      segmentClearance(shell, chain.shoulder, chain.elbow),
      segmentClearance(shell, chain.elbow, chain.hand),
    ) >= separation
  )
    return chain;
  const upper = distance(chain.elbow, chain.shoulder),
    lower = distance(chain.hand, chain.elbow);
  return solveReach({
    basis,
    side,
    upper,
    lower,
    shoulder: chain.shoulder,
    target: hand,
    shell,
    maxAdvance: (upper + lower) * 0.45,
  });
}

function* orientations(preferred: V3, basis: F3) {
  yield preferred;
  const axis = vnorm(vcross(preferred, Math.abs(vdot(preferred, basis.u)) < 0.8 ? basis.u : basis.s));
  const other = vcross(preferred, axis);
  for (let i = 1; i <= 18; i++) {
    const angle = (Math.PI * i) / 18,
      count = Math.max(1, Math.ceil(20 * Math.sin(angle)));
    for (let j = 0; j < count; j++) {
      const phi = (2 * Math.PI * j) / count,
        radial = vadd(vmul(axis, Math.cos(phi)), vmul(other, Math.sin(phi)));
      yield vadd(vmul(preferred, Math.cos(angle)), vmul(radial, Math.sin(angle)));
    }
  }
}

export function poseMageGrip(rig: Rig, points: Points, basis: F3, pose: JointPose) {
  const { ells, caps } = primitivesOf(rig);
  const obstacle = (tag: string) => /^(head|leg[LR]|torso|cloak|neckWattle|neckBeads|throatFold)$/.test(tag);
  const shell = ells.filter((e) => obstacle(e.label));
  const headAndLegs = caps.filter((c) => obstacle(c.label));
  const lantern = ells.filter((e) => e.label === 'staff');
  const shaft = caps.filter((c) => c.label === 'staff');
  const handTarget = aimAt(pose, basis, points.handR, ['handR', 'foreR', 'armR'], 'armR');
  const tipTarget = aimAt(pose, basis, points.staffTip, ['weaponTip', 'staffTip']);
  const chain = readChain(rig, 'squat-mage', points, 'handR')!;
  const stem = vsub(points.staffTip, chain.hand),
    span = vlen(stem);
  if (handTarget && tipTarget && Math.abs(distance(handTarget, tipTarget) - span) > 1e-5)
    throw RangeError('The staff cannot span the requested wrist and tip');
  const direction = tipTarget ? vnorm(vsub(tipTarget, handTarget ?? chain.hand)) : vnorm(stem);
  let solved: SolvedReach | undefined, staff: MapPoint | undefined;
  const wristCandidates = tipTarget || handTarget ? [0] : [0, 3, 6, 10, 15, 20];
  for (const slide of wristCandidates) {
    for (const dir of orientations(direction, basis)) {
      const wrist = tipTarget
        ? vsub(tipTarget, vmul(dir, span))
        : (handTarget ?? vadd(chain.hand, basis.v(0, slide, slide * 0.15)));
      if (handTarget && distance(wrist, handTarget) > 1e-5) continue;
      const rotate = rotateFromTo(stem, dir);
      const map = (p: V3) => vadd(wrist, rotate(vsub(p, chain.hand)));
      if (shaft.some((c) => segmentClearance(shell, map(c.a), map(c.b)) < separation)) continue;
      // Test the body against the wide mushroom cap as well as the staff against the body.
      const inverse = rotateFromTo(dir, stem);
      const back = (p: V3) => vadd(chain.hand, inverse(vsub(p, wrist)));
      if (
        headAndLegs.some((c) =>
          lantern.some(
            (e) =>
              e.radii[0] * e.radii[1] * e.radii[2] > 3 * c.r * c.r * (c.len + c.r) &&
              segmentClearance([e], back(c.a), back(c.b)) < separation,
          ),
        )
      )
        continue;
      try {
        solved = armAt(basis, shell, chain, 1, wrist);
        staff = map;
        break;
      } catch (error) {
        if (!(error instanceof RangeError)) throw error;
      }
    }
    if (solved) break;
  }
  if (!solved || !staff)
    throw RangeError('No reachable wrist holds the full staff clear of the cloak, head and hocks');
  transformPart(rig, (t) => t === 'staff', staff);
  const tip = staff(points.staffTip);
  points.staffFoot = staff(points.staffFoot);
  points.staffTip = points.weaponTip = tip;
  for (const side of sides) {
    const name = side > 0 ? 'R' : 'L';
    const arm = side > 0 ? chain : readChain(rig, 'squat-mage', points, 'handL')!;
    let joint = solved;
    if (side < 0) {
      const requested = aimAt(pose, basis, points.handL, ['handL', 'foreL', 'armL'], 'armL');
      joint = armAt(basis, shell, arm, side, requested ?? arm.hand);
    }
    // The palm and its fingers are rigid around the grip. Moving each corner of
    // the palm through the nearest bone separately can inflate its volume at a bent wrist.
    const lowerTurn = rotateFromTo(vsub(arm.hand, arm.elbow), vsub(joint.hand, joint.elbow));
    const wristMap = side > 0 ? staff : (p: V3) => vadd(joint.hand, lowerTurn(vsub(p, arm.hand)));
    for (const q of rig.prims) {
      if (q.t !== 'arm' + name) continue;
      if (q.k === 1 && distance(q.a, arm.shoulder) < 1e-6) {
        q.a = joint.shoulder;
        q.b = joint.elbow;
      } else if (q.k === 1 && distance(q.a, arm.elbow) < 1e-6 && distance(q.b, arm.hand) < 1e-6) {
        q.a = joint.elbow;
        q.b = joint.hand;
      } else transformPrimitive(q, wristMap);
    }
    points['shoulder' + name] = joint.shoulder;
    points['elbow' + name] = joint.elbow;
    points['hand' + name] = points['fore' + name] = points['arm' + name] = joint.hand;
    if (side > 0) points.staffHand = joint.hand;
  }
}
