// A walking winged dragon carries two independent shoulder/elbow/carpus chains
// above four weight-bearing legs. The floor skeleton also supplies sleep and turn.
import { lightSkeleton, type LightSkeleton } from './light-quadruped';
import { goalAt, toLocal } from './goals';
import { F3, vadd, vlerp, vmul, vsub, type V3 } from '../rig/f15-rig';
import type { CreatureCard } from './card-data';
import type { JointPose } from '../technique';
import type { MotionPlan } from '../types';

export interface Wing {
  side: number;
  shoulder: V3;
  elbow: V3;
  wrist: V3;
  quills: { root: V3; tip: V3 }[];
}
export type WingedSkeleton = LightSkeleton & { wings: Wing[]; facing: F3; pulse: (lag: number) => number };
const clamp = (n: number) => Math.max(0, Math.min(1, n));

export function wingedSkeleton(
  anim: string,
  t: number,
  side: number,
  pose: JointPose,
  headLead: number,
  route: MotionPlan,
  card: CreatureCard,
  muzzle: V3,
  phase: number,
): WingedSkeleton {
  // The beak is the bird's mouth socket. Preserve partial Cartesian goal weights.
  const drive = { ...pose };
  for (const key of ['forward', 'right', 'up', 'weight']) {
    const value = pose['goal.beak.' + key];
    if (value !== undefined) drive['goal.mouth.' + key] = value;
  }
  const s = lightSkeleton(anim, t, side, drive, headLead, route, card.proportions, { muzzle }, phase);
  const facing = F3.yaw(route.yaw + (side * Math.PI) / 8);
  const loop = anim === 'walk' || anim === 'idle' || anim === 'sleep' || anim === 'turn';
  const duration = anim === 'walk' ? 1 : anim === 'turn' ? 4 : anim === 'sleep' ? 3.5 : 3;
  const frequency = (2 * Math.PI) / duration;
  const pulse = (lag: number) => (loop ? Math.sin((anim === 'walk' ? phase : t) * frequency - lag) : Math.sin(-lag));
  const wings: Wing[] = [];
  const sleep = s.life.sleep;
  for (const sign of [-1, 1]) {
    const suffix = sign < 0 ? 'L' : 'R',
      b = s.body;
    const spread = clamp((pose.wingSpread ?? 0) + (pose['wingSpread' + suffix] ?? 0));
    const beat = (pose.wingBeat ?? 0) + (pose['wingBeat' + suffix] ?? 0);
    const fan = pose.featherFan ?? 0;
    const shoulder = b.p(7, sign * 5.4, 6);
    const elbow = b.p(-0.8 - 1.8 * spread, sign * (7 + 7 * spread), 13 - 5 * sleep + beat * 3);
    const wrist = b.p(
      1 - 3 * spread,
      sign * (9.5 + 15 * spread),
      24.8 - 13 * sleep - 8 * spread + beat * 12 + 0.45 * pulse(0.22),
    );
    const quills = [];
    for (let i = 0; i < 7; i++) {
      const u = i / 6;
      const heel = b.p(3.4, sign * 8.5, 8 - 2 * sleep);
      const root = vlerp(heel, wrist, 0.1 + 0.9 * u);
      const lateral = 9.4 + 7 * u + spread * (13 + 15 * u) + fan * (1 + 5 * u);
      const tip = b.p(
        -7 - 25 * u + spread * (5 + 13 * u),
        sign * lateral,
        -7 +
          6 * u -
          2.5 * Math.sin(Math.PI * u) +
          sleep * 2 +
          spread * (2 + 11 * u) +
          beat * (7 + 15 * u) +
          pulse(0.38 + u * 0.8) * (0.4 + u * 0.8),
      );
      quills.push({ root, tip });
    }
    const last = quills.at(-1)!;
    const target = goalAt(pose, 'wingTip' + suffix, toLocal(facing, last.tip));
    if (target) {
      const delta = vsub(facing.p(...target), last.tip);
      quills.forEach((q, i) => {
        q.tip = vadd(q.tip, vmul(delta, (i + 1) / 7));
      });
    }
    s.points['wingWrist' + suffix] = wrist;
    s.points['wingTip' + suffix] = last.tip;
    wings.push({ side: sign, shoulder, elbow, wrist, quills });
  }
  s.points.beak = s.points.mouth;
  return Object.assign(s, { wings, facing, pulse });
}
