import { toLocal } from '../bodies/goals';
import { wingedSkeleton } from '../bodies/winged-dragon';
import type { CreatureCard } from '../bodies/card-data';
import { transformPrimitive } from '../bodies/rig-transform';
import { Rig, F3, type V3 } from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import type { Creature, MotionPlan } from '../types';
import type { JointPose } from '../technique';
import { drawGriffin } from './herald_griffin-skin';

export function griffinFrame(
  card: CreatureCard,
  route: MotionPlan,
  gesture?: (anim: string, t: number) => JointPose,
): Creature['frame'] {
  return (anim, t, side, variant, steer) => {
    const pose = { ...gesture?.(anim, t), ...steer?.techniquePose };
    const headLead = steer ? ((((steer.headSide - side + 24) % 16) - 8) * Math.PI) / 8 : 0;
    const s = wingedSkeleton(anim, t, side, pose, headLead, route, card, [18.1, 0, -4.8], steer?.gaitPhase ?? t);
    const rig = new Rig();
    drawGriffin(rig, s, card, variant);
    const flight = pose.flightPitch ?? 0;
    if (flight) {
      const pivot = new F3(s.body.o, s.facing.f, s.facing.s, s.facing.u),
        wheel = pivot.pitch(flight);
      const map = (point: V3) => wheel.p(...toLocal(pivot, point));
      for (const primitive of rig.prims) transformPrimitive(primitive, map);
      if (rig.eye) rig.eye = map(rig.eye);
      for (const [key, point] of Object.entries(s.points)) s.points[key] = map(point);
    }
    const floorClearance = Math.min(...['foreL', 'foreR', 'hindL', 'hindR'].map((key) => s.points[key][2]));
    for (const [key, p] of Object.entries(s.points)) s.points[key + 'Ground'] = [p[0], p[1], 0];
    scaleFigure(rig, s.points, s.scale);
    const frame = projectFigure(rig, 128, [62, 102], s.points, '#302630', 3.8, true);
    const air = Math.max(0, floorClearance * s.scale);
    return {
      ...frame,
      planted: s.planted,
      dx: pose.dx,
      dy: pose.dy,
      sx: pose.sx,
      sy: pose.sy,
      groundShadow: { radius: 26 / (1 + air * 0.026), opacity: 1 / (1 + air * 0.045) },
    };
  };
}
