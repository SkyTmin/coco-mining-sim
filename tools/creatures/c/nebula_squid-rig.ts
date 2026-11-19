import { cephalopodFrame, type CephalopodSkeleton } from '../bodies/cephalopod';
import { goalAt, toLocal } from '../bodies/goals';
import type { CreatureCard } from '../bodies/card-data';
import type { MotionPlan, Creature } from '../types';
import type { JointPose } from '../technique';
import type { V3 } from '../rig/f15-rig';
import { clamp } from '../bodies/kits/nebula';
import { drawNebulaSquid } from './nebula_squid-skin';
import { clips } from './nebula_squid-poses';
import techniques from './nebula_squid-keys';
const tips: V3[] = [
  [21, -19, 11],
  [24, -7, 6],
  [18, 13, 9],
  [10, 24, 10],
  [-7, 25, 15],
  [-18, 14, 8],
  [-22, -4, 12],
  [-7, -24, 17],
];
function grip(i: number, p: V3, s: CephalopodSkeleton) {
  const goal = goalAt(s.pose, 'star' + i, toLocal(s.face, p));
  return goal ? s.face.p(...goal) : p;
}
export function squidFrame(
  card: CreatureCard,
  route: MotionPlan,
  gesture?: (anim: string, t: number) => JointPose,
): Creature['frame'] {
  const run = cephalopodFrame(card, route, { draw: drawNebulaSquid, grip, tips });
  return (anim, t, side, variant, steer) => {
    const pose = { ...gesture?.(anim, t), ...steer?.techniquePose };
    const clock = t + (4.25 - t) * clamp(pose.showHold ?? 0);
    const spec = (clips as Record<string, { seconds: number; loop?: boolean }>)[anim] ?? techniques[anim];
    if (spec && !('loop' in spec && spec.loop) && anim !== 'show') {
      const end = (Math.round((spec.seconds ?? 1) * 24) - 1) / 24,
        start = Math.max(0, end - 0.36);
      if (t > start) {
        const u = clamp((t - start) / (end - start)),
          ease = u * u * (3 - 2 * u),
          base = (start * Math.PI * 2) / 3;
        const boundary = Math.round(end / 3) * Math.PI * 2;
        pose.wavePhase = base + (boundary - base) * ease;
      }
    } else if (anim === 'show') {
      pose.wavePhase = ((t * Math.PI * 2) / 3) * (1 - clamp(pose.showHold ?? 0));
    }
    const frame = run(anim, clock, side, variant, {
      headSide: steer?.headSide ?? side,
      gaitPhase: steer?.gaitPhase ?? clock,
      techniquePose: pose,
    });
    const show = clamp(pose.showReveal ?? 1);
    if (show >= 1) return frame;
    const origin = frame.points.nucleus,
      px = frame.px,
      lit = frame.lit;
    // An irregular outward spiral develops through the physical silhouette. Both
    // the normal and emissive layers follow the same exposure, including the eyes.
    let radius = 1;
    for (let y = 0; y < px.h; y++)
      for (let x = 0; x < px.w; x++)
        if (px.data[(y * px.w + x) * 4 + 3]) {
          radius = Math.max(radius, Math.hypot(x - origin[0], y - origin[1]));
        }
    for (let y = 0; y < px.h; y++)
      for (let x = 0; x < px.w; x++) {
        const i = (y * px.w + x) * 4 + 3;
        if (!px.data[i] && !lit?.data[i]) continue;
        const dx = x - origin[0],
          dy = y - origin[1],
          u = Math.hypot(dx, dy) / radius,
          angle = Math.atan2(dy, dx);
        const edge = u + 0.087 * Math.sin(angle * 3 + u * 7.3) + 0.039 * Math.sin(angle * 7 - u * 15.1);
        const v = show === 0 ? 0 : clamp((show * 1.27 - edge - 0.1) * 6.4);
        px.data[i] = Math.round(px.data[i] * v);
        if (lit) lit.data[i] = Math.round(lit.data[i] * v);
      }
    if (frame.groundShadow) {
      frame.groundShadow.opacity *= show * show;
      frame.groundShadow.radius *= 0.18 + 0.82 * show;
      const reflection = clamp((show - 0.54) / 0.46);
      frame.groundShadow.reflectionOpacity = reflection * reflection * (3 - 2 * reflection);
    }
    if (frame.eye && !px.data[(Math.floor(frame.eye[1]) * px.w + Math.floor(frame.eye[0])) * 4 + 3])
      frame.eye = null;
    return frame;
  };
}
