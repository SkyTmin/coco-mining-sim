import { strideFoot } from '../motion';
import { F3 } from '../rig/f15-rig';
import type { JointPose } from '../technique';

export const runnerTip = 7.8;
export const runnerSide = 6.5;
export function runner(
  f: F3,
  s: number,
  p: JointPose,
  stride: number,
  stroke: number,
  kick: number,
  gait?: number,
  pivot?: number,
) {
  const offset = s < 0 ? 0.5 : 0;
  let forward = (s * (p.split ?? 0) * stride) / 4 + (s > 0 ? kick : 0) - s * 2.3 * stroke;
  let lift = 0;
  if (gait !== undefined) {
    const step = strideFoot(gait, offset, stride);
    forward = step.forward;
    lift = 2.65 * step.lift;
  } else if (pivot !== undefined) lift = 1.05 * Math.max(0, Math.sin(2 * Math.PI * (pivot + offset)));
  return f.at(
    forward,
    s * (runnerSide - 2.2 * (p.insideEdge ?? 0) + Math.max(0, -s * stroke) * 1.2),
    1.58 + lift,
  );
}
