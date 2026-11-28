// The original biped swing interpolates its shoulder guide in the hip frame. Invert
// that constraint at the authored Cartesian target, then interpolate the guide.
// This preserves its curved path between keys and allows a new target to steer it.
import { F3, vadd, vmul, vsub, type V3 } from '../rig/f15-rig';
import { life } from '../rig/figure';
import type { JointPose, PoseKey } from '../technique';
import { goalAt, toLocal } from './goals';

export function clubGuide(basis: F3, pose: JointPose, drop: number, sway: number, foot: V3, length = 53) {
  const angle =
    0.68 +
    (pose.clubAngle ?? 0) +
    0.055 * Math.sin(sway - 0.8) +
    (pose['guide.sleep'] ?? 0) * 0.34 -
    (pose['guide.tired'] ?? 0) * 0.66;
  const grip = basis
    .at(
      15 + (pose.clubForward ?? 0),
      5 + (pose.clubSide ?? 0),
      27 - drop * 0.56 + (pose.clubLift ?? 0) + 1.4 * Math.sin(sway),
    )
    .turn(pose.clubYaw ?? 0);
  const direction = grip.v(0.38 * Math.cos(angle), -0.925 * Math.cos(angle), Math.sin(angle));
  if (pose.plant) {
    grip.o[2] -= pose.plant * (grip.o[2] + length * direction[2] - (pose.targetHeightOffset ?? 0));
    grip.o[1] -= pose.plant * (grip.o[1] + length * direction[1] - foot[1] - (pose.targetDepthOffset ?? 0));
  }
  return { angle, grip, direction };
}
function armedKeyGuide(anim: string, key: PoseKey, yaw: number, length: number) {
  const pose = key.pose,
    basis = F3.yaw(yaw).at(-3, 0, 0),
    sway = life(anim, key.frame / 24, 3.2).q;
  const foot = basis.at(1 + (pose.stride ?? 0), -13, 0).p(6, 0, 0);
  const { grip, direction } = clubGuide(basis, pose, pose.crouch ?? 0, sway, foot, length);
  return { basis, tip: vadd(grip.o, vmul(direction, length)) };
}
export function aimedBipedKey(anim: string, key: PoseKey, yaw: number, length: number): JointPose {
  const target = goalAt(key.pose, 'weaponTip');
  if (!target) throw Error(anim + ' requires an authored weaponTip at frame ' + key.frame);
  const { basis, tip } = armedKeyGuide(anim, key, yaw, length);
  const d = vsub(basis.p(...target), tip),
    free = 1 - (key.pose.plant ?? 0);
  const depth = free > 1e-8 ? d[1] / free : (key.pose.approachDepth ?? 0);
  const height = free > 1e-8 ? d[2] / free : (key.pose.approachLift ?? 0);
  const [forward, right] = toLocal(basis, vadd(basis.o, [d[0], depth, height]));
  // The accepted pilot's guide was authored to hundredths. New targets retain
  // micro-unit precision; rounding removes only inverse-transform noise.
  const clean = (v: number) => Math.round(v * 1e6) / 1e6;
  const guide = Object.fromEntries(
    Object.entries(key.pose).filter(([name]) => !name.startsWith('goal.weaponTip.')),
  );
  return {
    ...guide,
    guidedTarget: 1,
    clubForward: clean(forward),
    clubSide: clean(right),
    clubLift: clean(height),
    targetHeightOffset: free > 1e-8 ? 0 : clean(d[2]),
    targetDepthOffset: free > 1e-8 ? 0 : clean(d[1]),
  };
}
