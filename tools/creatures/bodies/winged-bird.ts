// A two-legged bird: the wings fold at the carpi, the fan follows the pelvis,
// and the two opposing stance phases transmit the bird's weight to the floor.
import { strideFoot } from '../motion';
import { F3, Rig, vadd, vlerp, vnorm, vsub, type Mat, type V3, type Tones } from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import { hx } from '../kit/f11-mobkit';
import { sizes, type Creature, type MotionPlan, type Variant } from '../types';
import type { CreatureCard } from './card-data';
import { applyProportions } from './proportions';

export interface BirdPose {
  dx?: number;
  dy?: number;
  lean?: number;
  crouch?: number;
  neck?: number;
  head?: number;
  yaw?: number;
  wing?: number;
  nearWing?: number;
  farWing?: number;
  flap?: number;
  tail?: number;
  fan?: number;
  tuck?: number;
  step?: [number, number];
  lift?: [number, number];
  facing?: -1 | 1;
  bearing?: number;
  remiges?: number;
}

interface FlightFeather {
  root: V3;
  tip: V3;
}
interface BirdWing {
  side: -1 | 1;
  shoulder: V3;
  elbow: V3;
  wrist: V3;
  flight: FlightFeather[];
  spread: number;
}
interface BirdLeg {
  side: -1 | 1;
  hip: V3;
  knee: V3;
  hock: V3;
  toe: V3;
}

export interface BirdSkeleton {
  facing: F3;
  body: F3;
  neckRoot: V3;
  throat: V3;
  head: F3;
  wings: BirdWing[];
  legs: BirdLeg[];
  tail: F3;
  points: Record<string, V3>;
  planted: string[];
  pulse(lag: number): number;
}

export type BirdDraw = (rig: Rig, skeleton: BirdSkeleton, variant: Variant) => void;
export type BirdPoseSource<P extends BirdPose = BirdPose> = (anim: string, t: number, side: number) => P;
export interface WingedBirdAppearance {
  draw?: BirdDraw;
  pose?: BirdPoseSource;
}

const TAU = Math.PI * 2;
const clamp = (n: number) => Math.min(1, Math.max(0, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const sides = [-1, 1] as const;

export function birdSkeleton(
  anim: string, t: number, side: number, stride: number, yaw: number, pose: BirdPose,
  motion?: { headSide: number; gaitPhase: number }, loopSeconds?: number,
): BirdSkeleton {
  const walking = anim === 'walk' || anim.startsWith('walk_');
  const turning = anim === 'turn';
  const loop = anim === 'idle' || anim === 'idle-f2' || anim === 'sleep' || walking || turning;
  const frequency = TAU / (walking ? 1 : loopSeconds ?? (turning ? 4 : 3));
  const gait = motion?.gaitPhase ?? t;
  const pulse = (lag: number) => Math.sin((loop ? (walking ? gait : t) * frequency : 0) - lag);
  const crouch = clamp(pose.crouch ?? (anim === 'sleep' ? 1 : 0));
  const flying = clamp(pose.tuck ?? 0);
  const facing = F3.yaw(yaw + side * Math.PI / 8 + (pose.bearing ?? 0) + (pose.facing === -1 ? Math.PI - yaw * 2 : 0));
  const body = facing.at(pose.lean ? 2 * Math.sin(pose.lean) : 0, 0,
    55 - 21 * crouch + (walking ? 0 : 0.9) * pulse(0.26) + (walking ? 2.2 * Math.abs(pulse(0)) : 0))
    .pitch((pose.lean ?? 0) + (walking ? 0.032 : 0) + pulse(0.2) * 0.016)
    .roll(pulse(1.1) * (walking ? 0.051 : 0.018));
  const pitch = pose.head ?? 0;
  const stretch = pose.neck ?? 0;
  const bend = Math.sin(pitch);
  const neckRoot = body.p(11, 0, 14);
  const throat = body.p(18 + stretch * 0.43, 0, 29 - 9 * bend - 8 * crouch);
  const head = body.at(16 + stretch + 12 * bend, 0, 52 - 22 * bend - 18 * crouch + pulse(0.91) * 1.5)
    .turn((pose.yaw ?? 0) + Math.sin(((motion?.headSide ?? side) - side) * Math.PI / 8) * 0.4)
    .pitch(pitch + pulse(1.05) * 0.025);
  const tail = body.at(-19, 0, -3).pitch((pose.tail ?? 0) + pulse(1.25) * 0.06);
  const legs: BirdLeg[] = [], wings: BirdWing[] = [], planted: string[] = [];
  const points: Record<string, V3> = {
    pelvis: body.o, body: body.o, head: head.o, chest: body.p(23, 0, 14),
    tail: tail.o, beak: head.p(24, 0, -4.5), mouth: head.p(19, 0, -5),
    crest: head.p(-10, 0, 30), crown: head.p(-5, 0, 37),
  };
  const near = facing.s[1] >= 0 ? 1 : -1;
  for (const sign of sides) {
    const foot = sign === -1 ? 0 : 1;
    const suffix = foot ? 'R' : 'L';
    const g = strideFoot(gait, foot * 0.5, stride);
    const toeF = foot * 4 - 1 + (walking ? g.forward : 0) + (pose.step?.[foot] ?? 0);
    const toeZ = (walking ? 8 * g.lift : 0) + (pose.lift?.[foot] ?? 0);
    const toe = facing.p(toeF - 13 * flying, sign * (11 - flying * 2), 1 + toeZ + 13 * flying - 3 * flying * foot);
    const hip = body.p(-2, sign * 10, -5);
    const knee = vlerp(hip, facing.p(toeF + 9, sign * 12, 27 + toeZ), 0.83);
    const hock = facing.p(toeF - 7 - 16 * flying, sign * 11, 14 + toeZ + 9 * flying);
    legs.push({ side: sign, hip, knee, hock, toe });
    points['foot' + suffix] = points[foot ? 'rightFoot' : 'leftFoot'] = toe;
    points['hock' + suffix] = hock;
    if (flying === 0 && (walking ? g.planted : toeZ <= 0.01)) planted.push('foot' + suffix);

    const leading = sign === near;
    const spread = clamp((leading ? pose.nearWing : pose.farWing) ?? pose.wing ?? 0.12);
    const stroke = pose.flap ?? 0;
    const remiges = pose.remiges ?? 0;
    const folded = remiges * (1 - spread);
    const lag = leading ? 0.46 : 0.81;
    const shoulder = body.p(-2, sign * (11.5 + spread * 0.7), 11);
    const elbow = body.p(mix(-17, 3, spread), sign * (18 + spread * 17 + folded * 4), 14 + spread * 15 + folded * 11 - stroke * 12 + pulse(lag) * 1.5);
    const wrist = body.p(mix(-27, -4, spread), sign * (23 + spread * 35 + folded * 6), 8 + spread * 26 + folded * 18 - stroke * 26 + pulse(lag + 0.48) * 2.4);
    const flight: FlightFeather[] = [];
    for (let i = 0; i < 14; i++) {
      const u = i / 13;
      const root = u < 0.45
        ? vlerp(shoulder, elbow, 0.14 + u * 1.7)
        : vlerp(elbow, wrist, (u - 0.45) / 0.55);
      const tip = body.p(
        mix(-21 - (36 + 9 * folded) * u, -35 - 15 * Math.sin(u * Math.PI) + 19 * u, spread),
        sign * mix(15 + (16 + 7 * folded) * u, 23 + (64 + 26 * remiges) * u + 2 * (pose.fan ?? 0), spread),
        mix(-17 + (13 + 32 * folded) * u, 2 + (47 - 17 * remiges) * u, spread) - stroke * (13 + 29 * u) + 2.1 * pulse(lag + 1 + u),
      );
      flight.push({ root, tip });
    }
    wings.push({ side: sign, shoulder, elbow, wrist, flight, spread });
    points[leading ? 'wingNear' : 'wingFar'] = flight.at(-1)!.tip;
    points['wingWrist' + suffix] = wrist;
  }
  return { facing, body, neckRoot, throat, head, tail, wings, legs, points, planted, pulse };
}


// Material and anatomy for an ordinary studio draft. Each feather is attached
// to the same anatomical trail as a finished skin.
function draftBird(rig: Rig, s: BirdSkeleton, mat: Mat) {
  rig.tag = 'body';
  rig.ell(s.body, [0, 0, 2], [27, 17.5, 25], mat);
  rig.tag = 'neck';
  rig.cap(s.neckRoot, s.throat, 13.8, 11, mat).cap(s.throat, s.head.o, 10.6, 8.1, mat);
  rig.tag = 'head';
  rig.ell(s.head, [-2, 0, 1], [14, 10.3, 12.5], mat)
    .spike(s.head.p(7, 0, -2), s.head.f, 17, 4.9, { ...mat, bias: 0.39 }, 4, Math.PI / 4);
  rig.eye = s.head.p(3, 10 * (s.head.s[1] >= 0 ? 1 : -1), 3);
  for (const side of sides) {
    rig.dot(s.head.p(3, 10.1 * side, 3), mat.T[3], 0.18, 2);
    rig.tag = 'crest';
    for (let i = 0; i < 4; i++) {
      const root = s.head.p(-4, side * i * 1.8, 8);
      const tip = s.head.p(-4 - i * 2.9 + s.pulse(1.3 + i * 0.12), side * i * 2.8, 35 - i * 2.5);
      rig.spike(root, vsub(tip, root), Math.hypot(...vsub(tip, root)), 2.8, mat);
    }
  }
  for (const wing of s.wings) {
    rig.tag = 'wing' + (wing.side < 0 ? 'L' : 'R');
    rig.cap(wing.shoulder, wing.elbow, 6, 4.5, mat).cap(wing.elbow, wing.wrist, 4.5, 2, mat);
    for (const { root, tip } of wing.flight) {
      const mid = vlerp(root, tip, 0.42), wide = s.body.v(0, 1.4 * wing.side, 3.5);
      const ridge = vadd(mid, s.body.v(1.5, 1.96 * wing.side, 0.73));
      rig.poly([root, ridge, tip, vadd(mid, wide)], mat)
        .poly([root, vsub(mid, wide), tip, ridge], { ...mat, bias: -0.14 });
    }
  }
  rig.tag = 'tail';
  for (let i = -4; i <= 4; i++) {
    const root = s.tail.p(0, i, 0);
    const tip = s.tail.p(-67 + 4 * Math.abs(i), i * 8, -17 + i * i * 1.2 + s.pulse(2.1 + i * 0.15) * 3);
    rig.spike(root, vnorm(vsub(tip, root)), Math.hypot(...vsub(tip, root)), 3.4, mat);
  }
  for (const leg of s.legs) {
    rig.tag = 'leg' + (leg.side < 0 ? 'L' : 'R');
    rig.cap(leg.hip, leg.knee, 8, 4.7, mat).cap(leg.knee, leg.hock, 4.7, 2.5, mat).cap(leg.hock, leg.toe, 2.5, 1.8, mat);
    for (let i = -1; i <= 1; i++)
      rig.cap(leg.toe, vadd(leg.toe, s.facing.v(12 - 2 * Math.abs(i), i * 3.8, -0.2)), 1.45, 0.65, mat);
  }
}

export function wingedBirdFrame(card: CreatureCard, route: MotionPlan, appearance: WingedBirdAppearance = {}): Creature['frame'] {
  const size = sizes[card.rarity][2];
  const scale = size / 160 * (card.proportions.scale ?? 1);
  const stride = route.stride / (scale * (card.proportions.length ?? 1));
  const tones = card.materials[0].tones;
  const mat: Mat = { T: [0, 1, 2, 3].map(i => hx(tones[Math.round(i * (tones.length - 1) / 3)])) as Tones };
  return (anim, t, side, variant, motion) => {
    const action = motion?.techniquePose;
    const flight = anim === 'fly' || (anim === 'walk' && route.fly);
    const pose = appearance.pose?.(anim, t, side) ?? {
      dx: action?.dx, dy: -(action?.lift ?? 0), lean: action?.pitch,
      crouch: (action?.crouch ?? 0) / 20, neck: action?.lean, head: action?.['head.pitch'],
      wing: flight ? 0.88 : undefined,
      flap: flight ? Math.sin(TAU * t) : undefined,
      tuck: flight ? 0.8 : undefined,
    };
    const s = birdSkeleton(anim, t, side, stride, route.yaw, pose, motion);
    s.points.weaponTip = s.points.beak;
    s.points.handL = s.wings[0].wrist;
    s.points.handR = s.wings[1].wrist;
    s.points.tailTip = s.tail.p(-67, 0, -17);
    const r = new Rig();
    if (appearance.draw) appearance.draw(r, s, variant);
    else draftBird(r, s, mat);
    applyProportions(r, s.points, s.facing, card.proportions);
    if (scale !== 1) scaleFigure(r, s.points, scale);
    const frame = projectFigure(r, size, [size / 2, size * 0.855], s.points, undefined, 3.8, true);
    frame.dx = pose.dx;
    frame.dy = pose.dy;
    frame.planted = s.planted;
    return frame;
  };
}
