import { skySwimmerFrame } from '../bodies/sky-swimmer';
import type { CreatureCard } from '../bodies/card-data';
import type { JointPose } from '../technique';
import type { MotionPlan } from '../types';
import { drawAltan, beaconLight } from './sky_whale-skin';
export function whaleFrame(
  card: CreatureCard,
  route: MotionPlan,
  gesture?: (anim: string, t: number) => JointPose,
) {
  return skySwimmerFrame(card, route, { draw: drawAltan, pose: gesture, light: beaconLight });
}
