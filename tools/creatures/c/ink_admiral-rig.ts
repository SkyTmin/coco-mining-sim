import { cephalopodFrame, type CephalopodSkeleton } from '../bodies/cephalopod';
import { goalAt, toLocal } from '../bodies/goals';
import type { CreatureCard } from '../bodies/card-data';
import type { JointPose } from '../technique';
import type { MotionPlan } from '../types';
import { F3, vadd, vsub, vlerp, type V3 } from '../rig/f15-rig';
import { drawAdmiral } from './ink_admiral-skin';

export const implementsByArm = [
  'sabre',
  'scope',
  'map',
  'bell',
  'pennant',
  'compass',
  'quill',
  'lantern',
] as const;
export const admiralTips: V3[] = [
  [18, -20, 33],
  [-9, 21, 34],
  [21, 19, 16],
  [-14, 28, 19],
  [3, -26, 18],
  [5, 27, 11],
  [24, 6, 16],
  [34, -12, 20],
];
// Socket offset measured along the modelled prop from the point of grasp.
export function implementEnd(i: number, s: CephalopodSkeleton): V3 {
  const width = 7 + 4 * (s.pose.mapOpen ?? 0);
  return (
    [
      [7, 0, 18],
      [12, 0, 0],
      [4.24, width, -0.8 + 0.35 * Math.cos(width)],
      [0, 0, -6],
      [0, 6, 9],
      [2.8, 0, 0],
      [-2, 0, -3],
      [6.4, 0, -7],
    ] as V3[]
  )[i];
}
export function implementAxes(i: number, s: CephalopodSkeleton) {
  const name = implementsByArm[i];
  const yaw = [-0.55, 1.92, 0.67, 0, 0.3, 0.3, 0, 0][i];
  return new F3([0, 0, 0], s.body.f, s.body.s, s.body.u)
    .turn(yaw + (s.pose[name + 'Yaw'] ?? 0))
    .pitch((i === 1 ? -0.13 : 0) + (s.pose[name + 'Pitch'] ?? 0))
    .roll(s.pose[name + 'Roll'] ?? 0);
}
export function anchored(name: string, s: CephalopodSkeleton, seat: V3) {
  const free = goalAt(s.pose, name + 'Free');
  return free ? vlerp(seat, s.face.p(...free), Math.min(1, Math.max(0, s.pose[name + 'Loose'] ?? 0))) : seat;
}
export function admiralGrip(i: number, natural: V3, s: CephalopodSkeleton): V3 {
  const axes = implementAxes(i, s),
    end = axes.v(...implementEnd(i, s));
  if (i === 1 && (s.pose.salute ?? 0) > 0) natural = vlerp(natural, s.head.p(8, 11, 10), s.pose.salute);
  const target = goalAt(s.pose, implementsByArm[i], toLocal(s.face, vadd(natural, end)));
  return target ? vsub(s.face.p(...target), end) : natural;
}
export function admiralFrame(
  card: CreatureCard,
  route: MotionPlan,
  gesture?: (anim: string, t: number) => JointPose,
) {
  return cephalopodFrame(card, route, {
    pose: gesture,
    grip: admiralGrip,
    tips: admiralTips,
    draw: drawAdmiral,
  });
}
