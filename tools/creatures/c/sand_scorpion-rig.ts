import { arachnidFrame } from '../bodies/arachnid';
import type { CreatureCard } from '../bodies/card-data';
import type { MotionPlan } from '../types';
import type { JointPose } from '../technique';
import { drawAnkhar } from './sand_scorpion-skin';

export function scorpionFrame(
  card: CreatureCard,
  route: MotionPlan,
  gesture?: (anim: string, t: number) => JointPose,
) {
  return arachnidFrame(card, route, { draw: drawAnkhar, pose: gesture });
}
