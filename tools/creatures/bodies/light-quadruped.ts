// Light digitigrade and unguligrade animals share a four-contact diagonal gait.
// The feet live in the floor frame while the shoulder blades and hocks follow the trunk.
import { hx, ik, TAU } from '../kit/f11-mobkit';
import { life, projectFigure, scaleFigure } from '../rig/figure';
import { F3, Rig, vadd, vmul, vsub, type Mat, type V3 } from '../rig/f15-rig';
import { sizes, type Creature, type MotionPlan, type Variant } from '../types';
import type { CreatureCard } from './card-data';
import type { JointPose } from '../technique';
import { goalAt, lookAngles, toLocal } from './goals';

export interface LightLeg {
  name: string;
  fore: number;
  side: number;
  hip: V3;
  knee: V3;
  hock: V3;
  foot: V3;
  hoof: F3;
}
export interface LightSkeleton {
  anim: string;
  time: number;
  pose: JointPose;
  root: F3;
  body: F3;
  neck: F3;
  head: F3;
  tail: F3;
  legs: LightLeg[];
  points: Record<string, V3>;
  planted: string[];
  life: ReturnType<typeof life>;
  width: number;
  length: number;
  height: number;
  scale: number;
}
interface Offsets {
  muzzle?: V3;
  hornTip?: V3;
  tailTip?: V3;
}
export interface LightAppearance extends Offsets {
  draw(rig: Rig, skeleton: LightSkeleton, card: CreatureCard, variant: Variant): void;
  pose?(anim: string, t: number): JointPose;
}
const saturate = (x: number) => Math.max(0, Math.min(1, x));
function smooth(x: number) {
  const u = saturate(x);
  return u * u * (3 - 2 * u);
}

// Each foot carries the animal for 58% of the cycle. Hind feet touch slightly
// before their opposite forefeet, which separates all four contacts at slow speed.
function step(phase: number, stride: number) {
  const t = ((phase % 1) + 1) % 1;
  const stance = 0.58;
  const swing = saturate((t - stance) / (1 - stance));
  return {
    x: stride * (stance / 2 - t + smooth(swing)),
    lift: Math.sin(Math.PI * swing) ** 2,
    planted: t < stance,
  };
}

export function lightSkeleton(
  anim: string,
  t: number,
  side: number,
  pose: JointPose,
  headLead: number,
  route: MotionPlan,
  proportions: Record<string, number> = {},
  offsets: Offsets = {},
  phase = t,
): LightSkeleton {
  const width = proportions.width ?? 1,
    height = proportions.height ?? 1,
    length = proportions.length ?? 1;
  const neckLength = proportions.neckLength ?? 1,
    scale = proportions.scale ?? 1;
  const l = life(anim, t, 0),
    walking = anim === 'walk';
  const sleep =
    pose.sleep ??
    (anim === 'sleep_in'
      ? smooth((t * 24 - 4) / 23)
      : anim === 'sleep_out'
        ? 1 - smooth((t * 24 - 1) / 25)
        : anim === 'wake_startled'
          ? 1 - smooth(t * 6)
          : l.sleep);
  l.sleep = sleep;
  if (sleep > 0.82 || (pose.blink ?? 0) > 0.5) l.blink = 1;
  const startle = anim === 'wake_startled' ? Math.sin(Math.PI * saturate((t - 0.09) / 0.48)) ** 2 : 0;
  l.hatch *= smooth((t * 24) / 5);
  const tuck = Math.max(sleep, l.hatch * 0.9);
  const jump = (pose.lift ?? 0) + (pose.jump ?? 0) + 8 * startle + 5 * l.pop;
  const gait = walking ? Math.sin(phase * TAU) : 0;
  const breathing = anim === 'sleep' ? Math.sin((t * TAU) / 3.5) * 0.55 : Math.sin(l.q) * 0.55 * (1 - tuck);
  const turnLead = anim === 'turn' ? 0.14 * Math.sin(t * TAU * 2) : 0;
  // The route supplies sixteen quarter-second bearings for a four-second turn.
  // Interpolate between them and replant alternate diagonals around the pivot.
  const turning = anim === 'turn';
  const subBearing = turning && Math.abs(side - Math.round(side)) < 1e-8 ? (t * 4) % 1 : 0;
  const facing = F3.yaw(route.yaw + ((side + subBearing) * Math.PI) / 8);
  const root = facing.turn(pose.yaw ?? 0);
  const body = root
    .at(
      pose.lean ?? 0,
      gait * 0.47,
      (27 - 16.8 * tuck - 4.4 * l.tired) * height +
        breathing +
        (walking ? -0.95 * Math.cos(phase * TAU * 2) : 0) +
        jump -
        (pose.crouch ?? 0),
    )
    .pitch((pose.pitch ?? 0) + 0.12 * l.tired + 0.07 * tuck)
    .roll((pose.roll ?? 0) + 0.035 * gait)
    .turn((pose.twist ?? 0) - turnLead * 0.28);
  const goal = (key: string, natural: V3) => {
    const at = goalAt(pose, key, toLocal(facing, natural));
    return at && facing.p(...at);
  };
  const points: Record<string, V3> = {},
    planted: string[] = [],
    legs: LightLeg[] = [];
  for (const fore of [-1, 1])
    for (const sign of [-1, 1]) {
      const suffix = sign < 0 ? 'L' : 'R';
      const name = (fore > 0 ? 'fore' : 'hind') + suffix;
      const alias = (fore > 0 ? 'hand' : 'foot') + suffix;
      const g = step(phase + (fore === sign ? 0 : 0.5) + (fore < 0 ? 0.06 : 0), route.stride / scale);
      const hip = body.p(
        fore * 12.3 * length + (walking ? 0.85 * Math.cos((phase + (fore === sign ? 0 : 0.5)) * TAU) : 0),
        sign * 5.3 * width,
        -1.7 * height,
      );
      const pivot = step(2 * t + (fore === sign ? 0 : 0.5), Math.PI / 4);
      const footBasis = turning ? root.turn(pivot.x) : root;
      const rest = footBasis.p(
        fore * (13 * length - 6 * tuck + (pose.stride ?? 0)) + (walking ? g.x : 0),
        sign * (6.4 * width + 1.6 * tuck),
        jump + (walking ? (proportions.stepHeight ?? 5) * g.lift : turning ? 3.5 * pivot.lift : 0),
      );
      const foot = goal(name, rest) ?? goal(alias, rest) ?? rest;
      const hoof = new F3(foot, root.f, root.s, root.u).pitch(walking ? -0.27 * g.lift : -0.14 * tuck);
      const hock = hoof.p(
        fore > 0 ? -1.0 - 2.6 * tuck : -3.8 - 2.5 * tuck,
        0,
        (fore > 0 ? 5.5 : 7.8) * height * (1 - tuck * 0.54),
      );
      const knee = ik(
        hip,
        hock,
        (fore > 0 ? 11.8 : 10.7) * height,
        (fore > 0 ? 11.2 : 11.4) * height,
        body.v(-fore, sign * 0.12, 0.12),
      );
      legs.push({ name, fore, side: sign, hip, knee, hock, foot, hoof });
      points[name] = points[alias] = foot;
      points[name + 'Knee'] = knee;
      points[name + 'Hock'] = hock;
      if (fore > 0) {
        points['shoulder' + suffix] = hip;
        points['elbow' + suffix] = knee;
      }
      if ((walking && g.planted) || (turning && pivot.planted)) planted.push(name);
    }
  const neck = body
    .at(11.5 * length, 0, 3.7 * height)
    .turn(0.87 * sleep)
    .pitch(0.7 * tuck + 0.35 * l.tired + (pose['neck.pitch'] ?? 0));
  let head = neck
    .at(10.5 * neckLength + (pose.reach ?? 0), 0, (9 + (proportions.neckRise ?? 0)) * neckLength)
    .turn((pose['head.yaw'] ?? 0) + l.look * 0.78 + headLead + turnLead + 0.55 * tuck)
    .pitch((pose['head.pitch'] ?? 0) + 0.26 * tuck + 0.12 * l.tired - 0.12 * startle);
  const muzzle: V3 = offsets.muzzle ?? [11, 0, -2];
  const horn = offsets.hornTip ?? muzzle;
  const aimHead = goal('head', head.p(18, 0, 0));
  if (aimHead) {
    const angles = lookAngles(head, head.o, aimHead);
    head = head.turn(angles.yaw).pitch(angles.pitch);
  }
  // Orient the whole skull towards its target, then carry its pivot on the mobile neck.
  // The hide spans neck.o to head.o, including the reaching pose.
  const tipGoal = goal('weaponTip', head.p(...horn)) ?? goal('hornTip', head.p(...horn));
  const mouthGoal = goal('mouth', head.p(...muzzle)) ?? goal('snout', head.p(...muzzle));
  const target = tipGoal ?? mouthGoal;
  if (target) {
    const socket = tipGoal ? horn : muzzle;
    const aim = lookAngles(head, head.o, target);
    const rest = lookAngles(head, head.o, head.p(...socket));
    head = head.turn(aim.yaw - rest.yaw).pitch(aim.pitch - rest.pitch);
    head = new F3(vsub(target, head.v(...socket)), head.f, head.s, head.u);
  }
  const tail = body
    .at(-17 * length, 0, 3 * height)
    .turn((pose['tail.yaw'] ?? 0) + gait * 0.13 + 0.6 * tuck)
    .pitch((pose['tail.pitch'] ?? 0) + 0.16 * tuck + 0.12 * l.tired);
  points.body = body.o;
  points.neck = neck.o;
  points.head = head.o;
  points.mouth = points.snout = head.p(...muzzle);
  points.weaponTip = points.hornTip = offsets.hornTip ? head.p(...horn) : points.mouth;
  points.tail = tail.o;
  const tailEnd = tail.p(...(offsets.tailTip ?? [-13, 0, -6]));
  points.tailTip = goal('tailTip', tailEnd) ?? tailEnd;
  points.paw = points.foreR;
  return {
    anim,
    time: t,
    pose,
    root,
    body,
    head,
    neck,
    tail,
    legs,
    points,
    planted,
    life: l,
    width,
    height,
    length,
    scale,
  };
}

function defaultSkin(r: Rig, s: LightSkeleton, card: CreatureCard, variant: Variant) {
  const ramp = card.materials[0].tones;
  const mat = (tones: string[]): Mat => ({ T: tones.map((tone) => hx(tone)) as Mat['T'] });
  const coat = mat(
    variant === 'gold'
      ? ['#68452b', '#ab713c', '#dfad5c', '#fff0a0']
      : [ramp[0], ramp[1], ramp.at(-2)!, ramp.at(-1)!],
  );
  const point = mat(['#28232e', '#483c45', '#78696a', '#ac9891']);
  for (const leg of s.legs) {
    r.tag = leg.name;
    r.cap(leg.hip, leg.knee, leg.fore > 0 ? 3.8 : 4.6, 2.2, coat);
    r.cap(leg.knee, leg.hock, 2.3, 1.35, coat);
    r.cap(leg.hock, leg.foot, 1.45, 0.95, point);
    r.ell(leg.hoof, [1, 0, 1.2], [2.3, 1.4, 1.45], point);
  }
  r.tag = 'torso';
  r.ell(s.body, [0, 0, 0], [18 * s.length, 7 * s.width, 8 * s.height], coat);
  r.tag = 'tail';
  r.cap(s.tail.o, s.points.tailTip, 3.5, 0.65, coat);
  r.tag = 'neck';
  r.cap(s.neck.o, s.head.o, 5.6, 4.2, coat);
  r.tag = 'head';
  r.ell(s.head, [2, 0, 0], [7.2, 4.8, 5.4], coat);
  r.cap(s.head.p(5, 0, -0.7), s.points.mouth, 3.6, 1.8, coat);
  if (s.points.weaponTip !== s.points.mouth) r.cap(s.head.p(3, 0, 0.7), s.points.weaponTip, 1.4, 0.6, point);
  for (const sign of [-1, 1]) {
    r.tag = 'ear' + (sign < 0 ? 'L' : 'R');
    r.cap(s.head.p(-0.8, sign * 2.4, 3), s.head.p(-4, sign * 4.4, 10), 2, 0.28, coat);
    const eye = s.head.p(4, sign * 4, 1.3);
    r.tag = 'eye' + (sign < 0 ? 'L' : 'R');
    const start = r.size;
    r.ell(s.head, [4, sign * 4, 1.3], [1.6, 0.78, s.life.blink ? 0.35 : 1.25], point);
    if (!s.life.blink) r.dot(vadd(eye, vmul(s.head.u, 0.55)), coat.T[3], 0, 0.65);
    r.markEye(start, sign, !s.life.blink);
    if (sign > 0) r.eye = eye;
  }
}

export function lightFrame(
  card: CreatureCard,
  route: MotionPlan,
  appearance?: LightAppearance,
): Creature['frame'] {
  return (anim, t, side, variant, steer) => {
    const pose = steer?.techniquePose ?? appearance?.pose?.(anim, t) ?? {};
    const lead = steer ? ((((steer.headSide - side + 24) % 16) - 8) * Math.PI) / 8 : 0;
    const s = lightSkeleton(
      anim,
      t,
      side,
      pose,
      lead,
      route,
      card.proportions,
      appearance,
      steer?.gaitPhase ?? t,
    );
    const rig = new Rig();
    (appearance?.draw ?? defaultSkin)(rig, s, card, variant);
    for (const [key, p] of Object.entries(s.points))
      if (!key.endsWith('Ground')) s.points[key + 'Ground'] = [p[0], p[1], 0];
    if (s.scale !== 1) scaleFigure(rig, s.points, s.scale);
    const size = sizes[card.rarity][2];
    const frame = projectFigure(
      rig,
      size,
      [Math.round(size * 0.5), Math.round(size * 0.79)],
      s.points,
      '#272532',
      undefined,
      true,
    );
    const air = Math.max(0, Math.min(...s.legs.map((leg) => leg.foot[2])) * s.scale);
    return {
      ...frame,
      planted: s.planted,
      dx: pose.dx,
      dy: pose.dy,
      sx: pose.sx,
      sy: pose.sy,
      groundShadow: { radius: (size * 0.21) / (1 + 0.025 * air), opacity: 1 / (1 + 0.035 * air) },
    };
  };
}
