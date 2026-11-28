// The giant's hips, two long arm chains and opposed stride reuse the Crater Titan
// construction. Rooted feet remain on the floor as the mobile trunk changes height.
import { strideFoot } from '../motion';
import { F3, Rig, vlen, vsub, type V3 } from '../rig/f15-rig';
import { goalAt, toLocal, lookAngles } from '../bodies/goals';
import { ik } from '../kit/f11-mobkit';
import { projectFigure, scaleFigure } from '../rig/figure';
import type { JointPose } from '../technique';
import type { CreatureCard } from '../bodies/card-data';
import type { Creature, MotionPlan } from '../types';
import { drawGrove } from './grove_lord-skin';
export interface GroveLimb {
  side: number;
  shoulder: V3;
  elbow: V3;
  hand: F3;
  hip: V3;
  knee: V3;
  foot: F3;
  bough: V3;
}
export interface GroveRig {
  root: F3;
  trunk: F3;
  head: F3;
  limbs: GroveLimb[];
  points: Record<string, V3>;
  pose: JointPose;
  anim: string;
  time: number;
  sleep: number;
  bloom: number;
  wave: (lag: number) => number;
  past: (seconds: number) => JointPose;
}
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const u = clamp(x);
  return u * u * (3 - 2 * u);
};
export function groveFrame(
  card: CreatureCard,
  route: MotionPlan,
  gesture?: (anim: string, t: number) => JointPose,
): Creature['frame'] {
  return (anim, t, side, variant, steer) => {
    const pose = { ...gesture?.(anim, t), ...steer?.techniquePose };
    const past = (d: number) => (steer?.techniquePose ? pose : (gesture?.(anim, Math.max(0, t - d)) ?? pose));
    const walking = anim === 'walk',
      turn = anim === 'turn',
      phase = steer?.gaitPhase ?? t;
    const lead = steer ? ((((steer.headSide - side + 24) % 16) - 8) * Math.PI) / 8 : 0;
    const sleep =
      pose.sleep ??
      (anim === 'sleep'
        ? 1
        : anim === 'sleep_in'
          ? smooth(t / 1.15)
          : anim === 'sleep_out'
            ? 1 - smooth(t / 1.15)
            : anim === 'wake_startled'
              ? 1 - smooth(t * 5)
              : 0);
    const turnSub = turn && Math.abs(side - Math.round(side)) < 1e-6 ? (t * 4) % 1 : 0;
    const facing = F3.yaw(route.yaw + ((side + turnSub) * Math.PI) / 8);
    const root = facing.turn(pose.yaw ?? 0);
    const period = walking ? 1 : anim === 'sleep' ? 3.5 : turn ? 4 : 3;
    const wave = (lag: number) =>
      Math.sin(
        ((walking ? phase : anim === 'idle' || anim === 'idle-f2' || turn || anim === 'sleep' ? t : 0) *
          2 *
          Math.PI) /
          period -
          lag,
      );
    const jump = (pose.lift ?? 0) + (pose.jump ?? 0),
      stride = walking ? wave(0) : 0;
    const hatch = anim === 'hatch' ? smooth(t / 0.16) * (1 - smooth((t - 0.16) / 0.91)) : 0,
      tired = anim === 'tired' ? Math.sin(Math.PI * clamp(t / 1.5)) ** 2 : 0;
    const fold = Math.max(sleep, hatch);
    const trunk = root
      .at(
        (pose.lean ?? 0) - 2 * fold,
        stride * 0.9,
        46 + 0.9 * wave(0) - 19 * fold - 5 * tired - (pose.crouch ?? 0) + jump,
      )
      .turn((pose.twist ?? 0) + stride * 0.045)
      .pitch((pose.pitch ?? 0) + fold * 0.28 + tired * 0.12)
      .roll((pose.roll ?? 0) + 0.035 * stride);
    let head = trunk
      .at(0, 0, 29 - 6.7 * fold)
      .turn(lead + (pose['head.yaw'] ?? 0))
      .pitch((pose['head.pitch'] ?? 0) + 0.16 * fold);
    const aim = (key: string, point: V3) => {
      const g = goalAt(pose, key, toLocal(facing, point));
      return g ? facing.p(...g) : point;
    };
    const lip: V3 = [10.8, 0, -4.1],
      mouth = aim('mouth', head.p(...lip));
    if ((pose['goal.mouth.weight'] ?? 0) > 0) {
      const angles = lookAngles(head, head.o, mouth);
      head = head.turn(angles.yaw * 0.55).pitch(angles.pitch * 0.55);
      head = new F3(vsub(mouth, head.v(...lip)), head.f, head.s, head.u);
    }
    const points: Record<string, V3> = { body: trunk.o, torso: trunk.o, head: head.o, mouth };
    const limbs: GroveLimb[] = [],
      planted: string[] = [];
    for (const sign of [-1, 1]) {
      const suffix = sign < 0 ? 'L' : 'R',
        g = strideFoot(phase, sign < 0 ? 0.5 : 0, route.stride / (card.proportions.scale ?? 1));
      const swivel = turn ? strideFoot(2 * t, sign < 0 ? 0.5 : 0, 0.66) : null;
      const ground = swivel ? root.turn(swivel.forward) : root;
      const toe = aim(
        'foot' + suffix,
        ground.p(
          4 + (walking ? g.forward : 0) + sign * (pose.stride ?? 0),
          sign * (12 + 3 * fold),
          jump + (walking ? 7 * g.lift : swivel ? 3 * swivel.lift : 0),
        ),
      );
      const foot = new F3(toe, ground.f, ground.s, ground.u);
      const hip = trunk.p(-1, sign * 10, -10),
        ankle = foot.p(-1.3, 0, 4.1),
        knee = ik(hip, ankle, 18, 19, root.v(0.85, sign * 0.24, 0.05));
      const shoulder = trunk.p(-1, sign * 16, 16.2),
        natural = trunk.p(9 + stride * sign * 7 + fold * 2, sign * (27 - 5 * fold), -12 + 9 * fold);
      const palm = aim('hand' + suffix, natural),
        span = vlen(vsub(palm, shoulder)),
        arm = Math.max(18.5, span * 0.52);
      const elbow = ik(shoulder, palm, arm, arm * 0.98, trunk.v(-0.55, sign * 0.98, 0.08));
      const hand = new F3(palm, trunk.f, trunk.s, trunk.u)
        .turn((pose['handYaw' + suffix] ?? 0) + sign * 0.12)
        .pitch(pose['handPitch' + suffix] ?? 0);
      const bough = aim('boughTip' + suffix, hand.p(-1, sign * 6.6, 6.2));
      Object.assign(points, {
        ['hand' + suffix]: palm,
        ['foot' + suffix]: toe,
        ['elbow' + suffix]: elbow,
        ['shoulder' + suffix]: shoulder,
        ['knee' + suffix]: knee,
        ['boughTip' + suffix]: bough,
      });
      limbs.push({ side: sign, shoulder, elbow, hand, hip, knee, foot, bough });
      if ((walking && g.planted) || swivel?.planted) planted.push('foot' + suffix);
    }
    const bloom = anim === 'idle-f2' ? 1 : clamp(pose.phase ?? (anim === 'phase' ? smooth(t / 1.6) : 0));
    const rig = new Rig();
    drawGrove(
      rig,
      { root, trunk, head, points, limbs, anim, time: t, pose, sleep, bloom, wave, past },
      card,
      variant,
    );
    for (const [key, p] of Object.entries(points)) points[key + 'Ground'] = [p[0], p[1], 0];
    const scale = card.proportions.scale ?? 1;
    scaleFigure(rig, points, scale);
    const air = Math.max(0, Math.min(points.footL[2], points.footR[2]));
    return {
      ...projectFigure(rig, 160, [80, 133], points, '#30272d', 4.1, true),
      dx: pose.dx,
      dy: pose.dy,
      sx: pose.sx,
      sy: pose.sy,
      planted,
      groundShadow: { radius: 32 / (1 + 0.023 * air), opacity: 1 / (1 + 0.035 * air) },
    };
  };
}
