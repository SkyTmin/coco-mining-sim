// Pelagic body plan. Vertebrae transmit a pitched travelling wave; the paired
// paddles stroke independently. All deck fixtures inherit the middle vertebra.
import { F3, Rig, vcross, vdot, vnorm, vlen, vsub, vadd, vmul, vlerp, type V3, type Mat } from '../rig/f15-rig';
import { projectFigure, scaleFigure } from '../rig/figure';
import { goalAt, toLocal } from './goals';
import { hx } from '../kit/f11-mobkit';
import { sizes, type Creature, type MotionPlan, type Variant, type BodyFrame } from '../types';
import type { CreatureCard } from './card-data';
import type { JointPose } from '../technique';
export interface SwimSection {
  frame: F3;
  width: number;
  height: number;
}
export interface Paddle {
  side: number;
  root: V3;
  knuckle: V3;
  tip: V3;
}
export interface SkySwimmerSkeleton {
  root: F3;
  body: F3;
  head: F3;
  island: F3;
  sections: SwimSection[];
  paddles: Paddle[];
  tail: V3[];
  flukes: V3[];
  points: Record<string, V3>;
  pose: JointPose;
  t: number;
  anim: string;
  phase: number;
  morph: number;
  reveal: number;
  wave: (lag: number) => number;
}
export interface SkySwimmerAppearance {
  draw(r: Rig, s: SkySwimmerSkeleton, card: CreatureCard, variant: Variant): void;
  pose?(anim: string, t: number): JointPose;
  light?(f: BodyFrame, s: SkySwimmerSkeleton): void;
}
const tau = 2 * Math.PI,
  clamp = (x: number) => Math.max(0, Math.min(1, x));
export function swimAxis(a: V3, b: V3, up: V3): F3 {
  const f = vnorm(vsub(b, a));
  let s = vcross(up, f);
  if (vlen(s) < 0.001) s = vcross(Math.abs(f[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1], f);
  s = vnorm(s);
  return new F3(a, f, s, vnorm(vcross(f, s)));
}
const shape: V3[] = [
  [-47, 2.6, 2.8],
  [-39, 3.9, 4.1],
  [-31, 6.3, 7.7],
  [-22, 10.6, 10.8],
  [-12, 13.65, 14.2],
  [-2, 15.6, 16.4],
  [8, 16.35, 17.05],
  [17, 15.75, 16.15],
  [26, 14.4, 15.3],
  [33, 13.15, 13.65],
  [38, 11.48, 11.15],
  [42, 6.1, 6.35],
  [43.4, 0.3, 0.65],
];
export function swimPoint(q: SwimSection, angle: number, skin = 0): V3 {
  return q.frame.p(
    0,
    (q.width + skin) * Math.cos(angle),
    (q.height + skin) * Math.sin(angle) * (Math.sin(angle) < 0 && q.width > 8 ? 1.32 : 1),
  );
}
export function skySkeleton(
  anim: string,
  t: number,
  side: number,
  route: MotionPlan,
  pose: JointPose,
  gait = t,
  headLead = 0,
): SkySwimmerSkeleton {
  const walking = anim === 'walk' || anim === 'fly',
    turn = anim === 'turn';
  const fside = side + (turn && Number.isInteger(side) ? (t * 4) % 1 : 0);
  const facing = F3.yaw(route.yaw + (fside * Math.PI) / 8);
  const root = facing.turn(pose.yaw ?? 0);
  const time = walking ? gait : anim === 'idle' || anim === 'idle-f2' || anim === 'sleep' || turn ? t : 0;
  const period = walking ? 1 : turn ? 4 : anim === 'sleep' ? 3.5 : 3;
  const wave = (lag: number) => Math.sin((time * tau) / period - lag);
  const sleep = pose.sleep ?? (anim === 'sleep' ? 1 : 0),
    amplitude = (walking ? 1 : 0.36) * (1 - 0.5 * sleep);
  const lift = pose.lift ?? 0,
    body = root
      .at(pose.lean ?? 0, 0, 34 + wave(0.1) * 1.15 + lift - (pose.crouch ?? 0) - 4.5 * sleep)
      .pitch((pose.pitch ?? 0) + amplitude * wave(-0.3) * 0.039)
      .roll((pose.roll ?? 0) + amplitude * wave(0.3) * 0.05)
      .turn(pose.twist ?? 0);
  const point = (key: string, p: V3) => {
    const g = goalAt(pose, key, toLocal(facing, p));
    return g ? facing.p(...g) : p;
  };
  const head = body
    .at(12, 0, 0.1)
    .turn((pose['head.yaw'] ?? 0) + headLead * 0.32)
    .pitch(pose['head.pitch'] ?? 0);
  const snoutRest = head.p(31.4, 0, amplitude * 0.65 * wave(0.5) - 0.1),
    snout = point('snout', snoutRest),
    noseShift = vsub(snout, snoutRest);
  const profile = shape.map(([x, w, h]) => {
    const u = clamp((-x - 2) / 45),
      fore = clamp((x - 4) / 39.4),
      swell = 1 + (pose.inflate ?? 0) * 0.14 * Math.sin(Math.PI * clamp((x + 35) / 80));
    const z =
      (x < -22 ? (x + 22) * -0.27 : 0) +
      amplitude * (0.65 + 8.1 * u * u) * wave(0.5 + 2.65 * u) +
      u * u * (pose.tailBeat ?? 0) * 12;
    const lateral = u * u * (amplitude * 1.35 * wave(1.16 + u * 2) + (pose.tailSweep ?? 0) * 11);
    const stern = body.p(x, lateral, z),
      bow = head.p(x - 12, 0, z - 0.1);
    return { o: vadd(vlerp(stern, bow, fore), vmul(noseShift, fore * fore)), width: w * swell, height: h * swell };
  });
  const sections = profile.map((q, i) => {
    const t = swimAxis(profile[Math.max(0, i - 1)].o, profile[Math.min(profile.length - 1, i + 1)].o, body.u);
    return { frame: new F3(q.o, t.f, t.s, t.u), width: q.width, height: q.height };
  });
  const station = sections[5].frame,
    shelf = station.at(-3.7, 0, 15.4).roll(-(pose.roll ?? 0) * 0.12);
  const deck = new F3(shelf.o, vmul(shelf.f, 1.2), vmul(shelf.s, 1.18), shelf.u);
  const bore0 = swimPoint(sections[8], Math.PI / 2),
    blowhole = point('blowhole', bore0);
  const lamp = point('lamp', deck.p(-2.3, -0.4, 46.4)),
    starKeel = point('starKeel', swimPoint(sections[6], -0.89, 1.3));
  const points: Record<string, V3> = {
    body: body.o,
    head: head.o,
    snout: sections.at(-1)!.frame.o,
    mouth: head.p(28, 0, -2.6),
    blowhole,
    lamp,
    starKeel,
    island: deck.o,
    islandPier: deck.p(14, 8, 6),
    cabin: deck.p(6.5, 5.5, 11.5),
    cloudCenter: body.at(0, 0, -1).o,
  };
  const paddles: Paddle[] = [];
  for (const sign of [-1, 1]) {
    const suffix = sign < 0 ? 'L' : 'R',
      hip = swimPoint(sections[6], sign > 0 ? -0.075 : Math.PI + 0.075);
    const stroke = (pose['finBeat' + suffix] ?? 0) + amplitude * wave(sign > 0 ? 0.31 : 0.95) * 0.68;
    const spread = (pose.finSpread ?? 0) - sleep * 0.7;
    const knee = vadd(
      hip,
      body.v((sign > 0 ? -4 : 3) - stroke * 2.6, sign * (8.1 + spread * 2), -5.2 + stroke * 7.2),
    );
    const tip = point(
      'finTip' + suffix,
      vadd(
        hip,
        body.v(
          (sign > 0 ? -18.5 : 22.5) - stroke * 5.5,
          sign * ((sign > 0 ? 20.8 : 17.0) + spread * 6.2),
          -15.35 + stroke * 12 + 4 * sleep - (sign < 0 ? 16.5 : 0),
        ),
      ),
    );
    paddles.push({ side: sign, root: hip, knuckle: knee, tip });
    points['finRoot' + suffix] = hip;
    points['finTip' + suffix] = tip;
  }
  const fork = sections[0].frame.o;
  const tip = point(
    'tailTip',
    vadd(fork, body.v(-5.2, 0, 6.5 + amplitude * wave(2.8) * 5.3 + (pose.tailBeat ?? 0) * 7.4)),
  );
  const flukes = [-1, 1].map((sign) =>
    vadd(
      tip,
      body.v(
        -8.0,
        sign * 19.8,
        3.15 - sign * 2.25 + sign * (pose.tailSweep ?? 0) * 1.3 + amplitude * 2.1 * wave(sign < 0 ? 2.71 : 3.34),
      ),
    ),
  );
  points.tailBase = sections[2].frame.o;
  points.tailFork = fork;
  points.tailTip = tip;
  points.flukeL = flukes[0];
  points.flukeR = flukes[1];
  const phase = anim === 'idle-f2' ? 1 : clamp(pose.phase ?? (anim === 'phase' ? t / 1.8 : 0));
  const beamYaw = (pose.beamTurn ?? 0) + (time * tau) / (walking ? 1 : 3);
  points.beamTip = vadd(
    lamp,
    root.v((28 + phase * 23) * Math.cos(beamYaw), (28 + phase * 23) * Math.sin(beamYaw), 1.7),
  );
  return {
    root,
    body,
    head,
    island: deck,
    sections,
    paddles,
    tail: [points.tailBase, sections[1].frame.o, fork, tip],
    flukes,
    points,
    pose,
    t,
    anim,
    phase,
    morph: clamp(pose.cloudMorph ?? 0),
    reveal: clamp(pose.showReveal ?? 1),
    wave,
  };
}
const paint = (...t: string[]): Mat => ({ T: t.map((v) => hx(v)) as Mat['T'] });
const blue = paint('#223746', '#315361', '#508087', '#8aa9a1'),
  pale = paint('#63727a', '#889c9c', '#b9c8bc', '#e8e2c7'),
  amber = { ...paint('#8d6339', '#b78b45', '#e1b767', '#ffe394'), glow: 0.62 };
function neutral(r: Rig, s: SkySwimmerSkeleton) {
  for (let i = 1; i < s.sections.length; i++) {
    const a = s.sections[i - 1],
      b = s.sections[i];
    r.tag = i < 3 ? 'tail' : 'torso';
    for (let j = 0; j < 12; j++) {
      const u = (j * tau) / 12,
        v = ((j + 1) * tau) / 12;
      r.poly(
        [swimPoint(a, u), swimPoint(b, u), swimPoint(b, v), swimPoint(a, v)],
        Math.sin((u + v) / 2) < -0.18 ? pale : blue,
      );
    }
  }
  for (const p of s.paddles) {
    r.tag = 'fin' + (p.side < 0 ? 'L' : 'R');
    r.cap(p.root, p.knuckle, 2.6, 3.2, blue);
    r.cap(p.knuckle, p.tip, 3.2, 0.65, pale);
  }
  r.tag = 'tail';
  for (const tip of s.flukes) {
    r.poly([s.points.tailFork, vlerp(s.points.tailFork, tip, 0.65), tip, s.points.tailTip], blue);
    r.cap(s.points.tailTip, tip, 0.85, 0.25, blue);
  }
  r.tag = 'blowhole';
  r.cap(swimPoint(s.sections[8], Math.PI / 2), s.points.blowhole, 1.6, 1.6, blue);
  r.ball(s.points.blowhole, 1.0, pale);
  r.tag = 'snout';
  r.ball(s.points.snout, 1.12, blue);
  r.tag = 'lamp';
  r.cap(s.island.o, s.points.lamp, 3.1, 1.4, pale);
  r.ball(s.points.lamp, 2.55, amber);
  r.tag = 'starKeel';
  r.cap(swimPoint(s.sections[6], -0.89), s.points.starKeel, 0.64, 0.43, pale);
  r.ball(s.points.starKeel, 1.85, amber);
  for (const d of [-1, 1]) {
    const eye = swimPoint(s.sections[9], d < 0 ? Math.PI - 0.18 : 0.18);
    r.tag = 'eye' + (d < 0 ? 'L' : 'R');
    const n = r.size;
    r.ball(eye, 1.2, amber);
    r.markEye(n, d, true);
    if (d > 0) r.eye = eye;
  }
}
export function skySwimmerFrame(
  card: CreatureCard,
  route: MotionPlan,
  appearance?: SkySwimmerAppearance,
): Creature['frame'] {
  return (anim, t, side, variant, steer) => {
    const pose = { ...appearance?.pose?.(anim, t), ...steer?.techniquePose };
    const lead = steer ? ((((steer.headSide - side + 24) % 16) - 8) * Math.PI) / 8 : 0;
    const s = skySkeleton(anim, t, side, route, pose, steer?.gaitPhase ?? t, lead),
      rig = new Rig();
    (appearance?.draw ?? neutral)(rig, s, card, variant);
    for (const [key, p] of Object.entries(s.points)) s.points[key + 'Ground'] = [p[0], p[1], 0];
    const size = sizes[card.rarity][2],
      scale = ((card.proportions.scale ?? 1) * size) / 160;
    scaleFigure(rig, s.points, scale * (card.proportions.width ?? 1), scale * (card.proportions.height ?? 1));
    const frame = projectFigure(
      rig,
      size,
      [Math.round(size * 0.5), Math.round(size * 0.77)],
      s.points,
      '#242a38',
      4.0,
      true,
    );
    appearance?.light?.(frame, s);
    const air = Math.max(0, Math.min(s.points.finTipL[2], s.points.finTipR[2]));
    return {
      ...frame,
      dx: pose.dx,
      dy: pose.dy,
      sx: pose.sx,
      sy: pose.sy,
      groundShadow: { radius: (size * 0.24) / (1 + 0.012 * air), opacity: 0.78 / (1 + 0.019 * air) },
    };
  };
}
