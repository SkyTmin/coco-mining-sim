// Eight independent sucker beds carry the mantle. A grasping arm can keep its
// midsection planted while its narrowing distal section raises an implement.
import { F3, Rig, type Mat, type V3, vadd, vsub, vlerp } from '../rig/f15-rig';
import { hx, TAU } from '../kit/f11-mobkit';
import { life, projectFigure, scaleFigure } from '../rig/figure';
import { sizes, type Creature, type MotionPlan, type Variant } from '../types';
import type { JointPose } from '../technique';
import type { CreatureCard } from './card-data';
import { goalAt, toLocal } from './goals';

export interface Ray {
  index: number;
  nodes: V3[];
  pad: V3;
  tip: V3;
  down: boolean;
}
export interface CephalopodSkeleton {
  face: F3;
  body: F3;
  head: F3;
  arms: Ray[];
  points: Record<string, V3>;
  pose: JointPose;
  life: ReturnType<typeof life>;
  t: number;
  phase: number;
  anim: string;
}
export interface CephalopodAppearance {
  draw(r: Rig, s: CephalopodSkeleton, c: CreatureCard, variant: Variant): void;
  pose?(anim: string, t: number): JointPose;
  tips?: V3[];
  grip?(index: number, natural: V3, s: CephalopodSkeleton): V3;
}
const saturate = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => {
  const u = saturate(x);
  return u * u * (3 - 2 * u);
};

// Three cubic arcs meet at the leading and trailing edge of the sucker bed.
// This keeps a whole stretch of flesh parallel to the floor during stance.
function cubic(a: V3, b: V3, c: V3, d: V3, t: number): V3 {
  return vlerp(vlerp(vlerp(a, b, t), vlerp(b, c, t), t), vlerp(vlerp(b, c, t), vlerp(c, d, t), t), t);
}
export function cephalopodSkeleton(
  anim: string,
  t: number,
  side: number,
  pose: JointPose,
  lead: number,
  route: MotionPlan,
  card: CreatureCard,
  appearance?: CephalopodAppearance,
  phase = t,
): CephalopodSkeleton {
  const l = life(anim, t, 0),
    walking = anim === 'walk',
    turning = anim === 'turn';
  const sleep =
    pose.sleep ??
    (anim === 'sleep_in'
      ? smooth(t / 1.1)
      : anim === 'sleep_out'
        ? 1 - smooth(t / 1.08)
        : anim === 'wake_startled'
          ? 1 - smooth(t * 5)
          : l.sleep);
  l.sleep = sleep;
  l.hatch *= smooth((t * 24) / 5);
  const tuck = Math.max(sleep, l.hatch * 0.92);
  if (sleep > 0.8 || (pose.blink ?? 0) > 0.55) l.blink = 1;
  const jump = (pose.lift ?? 0) + (pose.jump ?? 0) + l.pop * 3;
  const sub = turning && Number.isInteger(side) ? (t * 4) % 1 : 0;
  const face = F3.yaw(route.yaw + ((side + sub) * Math.PI) / 8);
  const gait = walking ? Math.sin(phase * TAU) : 0;
  const phaseAngle = walking ? phase * TAU : (pose.wavePhase ?? (t * TAU) / 3);
  const body = face
    .at(
      (pose.lean ?? 0) + gait * 1.35,
      (pose.sway ?? 0) + gait * 0.55,
      24 + 0.65 * Math.sin(l.q) + jump - tuck * 13 - l.tired * 4 - (pose.crouch ?? 0),
    )
    .turn((pose.yaw ?? 0) + (pose.twist ?? 0))
    .pitch((pose.pitch ?? 0) + 0.15 * tuck + 0.13 * l.tired)
    .roll((pose.roll ?? 0) + 0.035 * gait);
  const head = body
    .at(0, 0, 16 - 4 * tuck)
    .turn((pose['head.yaw'] ?? 0) + Math.max(-0.6, Math.min(0.6, lead)) * 0.6)
    .pitch((pose['head.pitch'] ?? 0) + 0.1 * tuck);
  const points: Record<string, V3> = {
    body: body.o,
    mantle: head.o,
    head: head.o,
    chest: body.o,
    floor: [0, 0, 0],
  };
  const s: CephalopodSkeleton = {
    face,
    body,
    head,
    arms: [],
    points,
    pose,
    life: l,
    t,
    phase: phaseAngle,
    anim,
  };
  const scale = card.proportions.scale ?? 1;
  const delays = [0, 0.51, 0.26, 0.77, 0.11, 0.64, 0.37, 0.88];
  for (let i = 0; i < 8; i++) {
    const theta = (TAU * i) / 8,
      natural = appearance?.tips?.[i] ?? [26 * Math.cos(theta), 26 * Math.sin(theta), 8];
    const a = Math.atan2(natural[1], natural[0]),
      cf = Math.cos(a),
      cs = Math.sin(a);
    const clock = turning ? 2 * t : phase;
    const p = (((clock + delays[i]) % 1) + 1) % 1,
      stance = 0.62,
      u = saturate((p - stance) / (1 - stance));
    const turn = turning ? (Math.PI / 4) * (stance / 2 - p + smooth(u)) : 0;
    const padFrame = face.turn(turn);
    const swing = Math.sin(Math.PI * u) ** 2;
    const x = walking ? (route.stride / scale) * (stance / 2 - p + smooth(u)) : 0;
    const lift = (walking ? swing * (card.proportions.stepHeight ?? 4) : turning ? swing * 2.7 : 0) + jump;
    const radius = (21.5 + 3 * (i % 2) + (pose.spread ?? 0) * 4) * (1 - 0.26 * tuck);
    const ground = padFrame.p(radius * cf + x, radius * cs, lift);
    const pad = vadd(ground, [0, 0, 2.4]);
    const elbow = body.p(cf * 7.5, cs * 8, -3);
    const lag = Math.sin(phaseAngle - delays[i] * TAU);
    const rest = body.p(
      natural[0] * (1 - 0.23 * tuck) + (walking ? x * 0.35 : 0),
      natural[1] * (1 - 0.22 * tuck),
      (natural[2] - 24) * (1 - 0.68 * tuck) + lag * (1.0 + 0.28 * i) + (pose.curl ?? 0) * 4,
    );
    const desired = goalAt(pose, 'arm' + i, toLocal(face, rest));
    const wrist = desired ? face.p(...desired) : rest;
    const tip = appearance?.grip?.(i, wrist, s) ?? wrist;
    const inside = vadd(pad, padFrame.v(-cf * 2.7, -cs * 2.7, 0));
    const outside = vadd(pad, padFrame.v(cf * 2.7, cs * 2.7, 0));
    const enter = vadd(inside, padFrame.v(-cf * 5, -cs * 5, 0));
    const leave = vadd(outside, padFrame.v(cf * 7 - cs * 4, cs * 7 + cf * 4, 0));
    const curl = vadd(tip, padFrame.v(cf * 1.8 - cs * (4 + 2 * lag), cs * 1.8 + cf * (4 + 2 * lag), -6));
    const nodes = Array.from({ length: 13 }, (_, j) =>
      j < 5
        ? cubic(elbow, vadd(elbow, body.v(cf * 6, cs * 6, 1)), enter, inside, j / 5)
        : j <= 7
          ? vlerp(inside, outside, (j - 5) / 2)
          : cubic(outside, leave, curl, tip, (j - 7) / 5),
    );
    s.arms.push({
      index: i,
      nodes,
      pad: ground,
      tip,
      down: jump < 0.01 && (!(turning || walking) || p < stance),
    });
    points['arm' + i] = tip;
    points['pad' + i] = ground;
  }
  points.weaponTip = s.arms[0].tip;
  return s;
}

function defaultDraw(r: Rig, s: CephalopodSkeleton, card: CreatureCard, variant: Variant) {
  const tones = card.materials[0].tones;
  const ramp =
    variant === 'gold'
      ? ['#68452b', '#ab713c', '#dfad5c', '#fff0a0']
      : [tones[0], tones[1], tones.at(-2)!, tones.at(-1)!];
  const skin: Mat = { T: ramp.map((c) => hx(c)) as Mat['T'] };
  r.tag = 'mantle';
  r.ell(s.head, [0, 0, 0], [12, 13, 16], skin);
  for (const arm of s.arms) {
    r.tag = 'arm' + arm.index;
    arm.nodes.slice(1).forEach((p, j) => r.cap(arm.nodes[j], p, 4 - 0.22 * j, 3.78 - 0.22 * j, skin));
  }
}
export function cephalopodFrame(
  card: CreatureCard,
  route: MotionPlan,
  appearance?: CephalopodAppearance,
): Creature['frame'] {
  return (anim, t, side, variant, steer) => {
    const pose = { ...appearance?.pose?.(anim, t), ...steer?.techniquePose };
    const lead = steer ? ((((steer.headSide - side + 24) % 16) - 8) * Math.PI) / 8 : 0;
    const s = cephalopodSkeleton(anim, t, side, pose, lead, route, card, appearance, steer?.gaitPhase ?? t);
    const r = new Rig();
    (appearance?.draw ?? defaultDraw)(r, s, card, variant);
    for (const [key, p] of Object.entries(s.points)) s.points[key + 'Ground'] = [p[0], p[1], 0];
    const scale = card.proportions.scale ?? 1,
      air = Math.max(0, Math.min(...s.arms.map((a) => a.pad[2])) * scale);
    scaleFigure(r, s.points, scale, scale * (card.proportions.vertical ?? 1));
    const size = sizes[card.rarity][2];
    const frame = projectFigure(
      r,
      size,
      [Math.round(size * 0.5), Math.round((size * 99) / 128)],
      s.points,
      '#362532',
      3.8,
      true,
    );
    return {
      ...frame,
      planted: s.arms.filter((a) => a.down).map((a) => 'pad' + a.index),
      dx: pose.dx,
      dy: pose.dy,
      sx: pose.sx,
      sy: pose.sy,
      groundShadow: { radius: (26 * size) / 128 / (1 + 0.027 * air), opacity: 1 / (1 + 0.042 * air) },
    };
  };
}
