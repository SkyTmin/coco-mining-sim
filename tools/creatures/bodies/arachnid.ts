// An eight-legged extension of the beetle's opposed tripod gait. Each side has
// four independently solved knees; the two stroking pedipalps never stand in for feet.
import { F3, Rig, vadd, vsub, vmul, vlerp, vnorm, vlen, vcross, type V3, type Mat } from '../rig/f15-rig';
import { ik, TAU, hx } from '../kit/f11-mobkit';
import { strideFoot } from '../motion';
import { life, projectFigure, scaleFigure } from '../rig/figure';
import { sizes, type Creature, type MotionPlan, type Variant } from '../types';
import type { JointPose } from '../technique';
import type { CreatureCard } from './card-data';
import { goalAt, toLocal } from './goals';
import { cutStone } from './kits/chitin-linen';

export interface ArachnidLeg {
  name: string;
  sign: number;
  row: number;
  hip: V3;
  knee: V3;
  ankle: V3;
  toe: V3;
  down: boolean;
}
export interface Chela {
  name: string;
  sign: number;
  shoulder: V3;
  elbow: V3;
  palm: F3;
  fixed: V3;
  finger: V3;
  open: number;
}
export interface ArachnidSkeleton {
  anim: string;
  t: number;
  pose: JointPose;
  face: F3;
  body: F3;
  head: F3;
  legs: ArachnidLeg[];
  claws: Chela[];
  tail: V3[];
  points: Record<string, V3>;
  phase: number;
  cycle: number;
  life: ReturnType<typeof life>;
}
export interface ArachnidAppearance {
  draw(r: Rig, s: ArachnidSkeleton, card: CreatureCard, variant: Variant): void;
  pose?(anim: string, t: number): JointPose;
}
const saturate = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => {
  const u = saturate(v);
  return u * u * (3 - 2 * u);
};
export function jointFrame(a: V3, b: V3, guide: V3 = [0, 0, 1]): F3 {
  const f = vnorm(vsub(b, a));
  let side = vcross(guide, f);
  if (vlen(side) < 0.001) side = vcross([0, 1, 0], f);
  side = vnorm(side);
  return new F3(a, f, side, vnorm(vcross(f, side)));
}
function solveChain(seed: V3[], target: V3): V3[] {
  const nodes = seed.map((p) => [...p] as V3),
    n = nodes.length - 1,
    base = seed[0];
  const lengths = seed.slice(1).map((p, i) => vlen(vsub(p, seed[i])));
  const span = vlen(vsub(target, base)),
    length = lengths.reduce((a, b) => a + b, 0);
  if (span >= length - 0.001) {
    let reach = 0;
    return nodes.map((_, i) => {
      if (i) reach += lengths[i - 1];
      return vlerp(base, target, reach / length);
    });
  }
  for (let k = 0; k < 28; k++) {
    nodes[n] = target;
    for (let i = n - 1; i >= 0; i--)
      nodes[i] = vadd(nodes[i + 1], vmul(vnorm(vsub(nodes[i], nodes[i + 1])), lengths[i]));
    nodes[0] = base;
    for (let i = 1; i <= n; i++)
      nodes[i] = vadd(nodes[i - 1], vmul(vnorm(vsub(nodes[i], nodes[i - 1])), lengths[i - 1]));
    if (vlen(vsub(nodes[n], target)) < 0.0001) break;
  }
  nodes[n] = target;
  return nodes;
}
export function arachnidSkeleton(
  anim: string,
  t: number,
  side: number,
  pose: JointPose,
  lead: number,
  route: MotionPlan,
  card: CreatureCard,
  gaitPhase = t,
): ArachnidSkeleton {
  const l = life(anim, t, 0),
    walking = anim === 'walk',
    turning = anim === 'turn';
  const phase = pose.phase ?? (anim === 'idle-f2' ? 1 : anim === 'phase' ? ease(t / 1.9) : 0);
  l.sleep =
    pose.sleep ??
    (anim === 'sleep_in'
      ? ease(t / 1.1)
      : anim === 'sleep_out'
        ? 1 - ease(t / 1.08)
        : anim === 'wake_startled'
          ? 1 - ease(t * 5)
          : l.sleep);
  l.hatch *= ease((t * 24) / 5);
  if (l.sleep > 0.78 || (pose.blink ?? 0) > 0.5) l.blink = 1;
  const tuck = Math.max(l.sleep, l.hatch * 0.78),
    jump = (pose.lift ?? 0) + (pose.jump ?? 0) + l.pop * 4;
  const sub = turning && Number.isInteger(side) ? (t * 4) % 1 : 0;
  const face = F3.yaw(route.yaw + ((side + sub) * Math.PI) / 8);
  const cycle = (walking ? gaitPhase : t / 3) * TAU,
    gait = walking ? Math.sin(cycle) : 0;
  const body = face
    .at(
      (pose.lean ?? 0) + 1.15 * gait,
      pose.sway ?? 0,
      20 + jump - 0.7 * Math.cos(l.q) - 8.4 * tuck - 3.3 * l.tired - (pose.crouch ?? 0),
    )
    .turn((pose.yaw ?? 0) + (pose.twist ?? 0))
    .pitch((pose.pitch ?? 0) + 0.14 * tuck + 0.1 * l.tired)
    .roll((pose.roll ?? 0) + 0.033 * gait);
  const head = body
    .at(13.6, 0, 3)
    .turn(Math.max(-0.45, Math.min(0.45, lead * 0.52)) + (pose['head.yaw'] ?? 0))
    .pitch(pose['head.pitch'] ?? 0);
  const points: Record<string, V3> = {
    floor: [0, 0, 0],
    body: body.o,
    head: head.o,
    crown: head.p(3.7, 0, 9.2),
  };
  const goal = (key: string, rest: V3) => {
    const at = goalAt(pose, key, toLocal(face, rest));
    return at ? face.p(...at) : rest;
  };
  const legs: ArachnidLeg[] = [],
    claws: Chela[] = [];
  for (const sign of [-1, 1]) {
    const suffix = sign < 0 ? 'L' : 'R';
    for (let i = 0; i < 4; i++) {
      const name = 'foot' + suffix + i,
        phaseOffset = ((i + (sign > 0 ? 0 : 1)) % 2) * 0.5 + ((i < 2 ? i : 3 - i) - 0.5) * 0.05;
      const step = strideFoot(
        walking ? gaitPhase : 2 * t,
        phaseOffset,
        walking ? route.stride / (card.proportions.scale ?? 1) : Math.PI / 4,
      );
      const floorFrame = turning ? face.turn(step.forward) : face;
      const h = 8.8 - 8.5 * i,
        endF = [23, 8, -9, -27][i],
        width = [22, 29, 30.7, 24.8][i];
      const natural = floorFrame.p(
        endF + (walking ? step.forward : 0),
        sign * (width - 4.7 * tuck),
        jump + (walking || turning ? step.lift * (card.proportions.stepHeight ?? 5) : 0),
      );
      const toe = goal(name, natural);
      const ankle = vadd(toe, body.v(2.2 - i * 0.95, -sign * 1.5, 3.8));
      const hip = body.p(h, sign * 7.8, -0.9);
      const knee = ik(hip, ankle, 17.5, 17.0, body.v((1.55 - i) * 0.72, sign * 0.8, 1.55));
      legs.push({
        name,
        sign,
        row: i,
        hip,
        knee,
        ankle,
        toe,
        down: toe[2] < 0.03 && (!(walking || turning) || step.planted),
      });
      points[name] = toe;
    }
    const name = 'claw' + suffix,
      open = saturate(pose['clawOpen' + suffix] ?? 0.47 + 0.13 * Math.sin(cycle - sign * 0.65));
    const shoulder = body.p(12, sign * 8.7, 0.3),
      neutral = body.p(
        32 - 9 * tuck,
        sign * (25.5 - 3 * tuck),
        3.8 - 2 * tuck + 1.25 * Math.sin(cycle - sign * 0.6),
      );
    const aim = body
      .turn(-sign * (0.25 - 0.13 * tuck) + (pose[name + 'Yaw'] ?? 0))
      .pitch(0.06 + (pose[name + 'Pitch'] ?? 0))
      .roll(sign * 0.1 + (pose[name + 'Roll'] ?? 0));
    const localTip: V3 = [18.8, -sign * 2.8, -1.45],
      vector = aim.v(...localTip);
    const fixed = goal(name, vadd(neutral, vector)),
      palmCenter = vsub(fixed, vector);
    const palm = new F3(palmCenter, aim.f, aim.s, aim.u);
    const elbow = ik(shoulder, palmCenter, 13.8, 15.2, body.v(-0.15, sign, 1));
    const finger = palm.p(17.8 - open * 1.9, -sign * (3.8 + open * 10), 0.1 + open * 1.2);
    claws.push({ name, sign, shoulder, elbow, palm, fixed, finger, open });
    points[name] = fixed;
    points['palm' + suffix] = palm.o;
    points['finger' + suffix] = finger;
  }
  const arch: V3[] = [
    [-19, 0, 1],
    [-30, 1, 11],
    [-37, 1.7, 27],
    [-39, 2.5, 46],
    [-30, 3.2, 59],
    [-13, 3, 66],
    [1, 2, 61],
    [10, -1.5, 39],
  ];
  const rest = arch.map(([f, r, z], i) => {
    const w = i / (arch.length - 1),
      lag = Math.sin(cycle - 0.38 * i);
    const curl = (pose.tailCurl ?? 0) * w;
    return body.p(
      f - 12 * tuck * w + curl * 7,
      r + w * (lag * 2.45 + 14 * Math.sin(pose.tailSwing ?? 0)),
      z * 0.826 * (1 - 0.48 * tuck) + w * ((pose.tailLift ?? 0) + lag * 1.55 + curl * 9),
    );
  });
  const stingLength = vlen(vsub(rest[7], rest[6]));
  const facet = (joints: V3[]) =>
    jointFrame(joints[6], joints[7]).p(stingLength * (0.11 + 0.89 * 0.24), 6.15, 0);
  let tail: V3[];
  const requestedFacet = goalAt(pose, 'stingFacet', toLocal(face, facet(rest)));
  if (requestedFacet) {
    const direction = vsub(rest[7], rest[6]);
    const pivot = vsub(face.p(...requestedFacet), vsub(facet(rest), rest[6]));
    tail = solveChain(rest.slice(0, 7), pivot);
    tail.push(vadd(pivot, direction));
  } else tail = solveChain(rest, goal('sting', rest.at(-1)!));
  tail.forEach((p, i) => (points['tail' + i] = p));
  points.sting = tail.at(-1)!;
  points.stingFacet = jointFrame(tail[6], tail[7]).p(
    vlen(vsub(tail[7], tail[6])) * (0.11 + 0.89 * 0.24),
    6.15,
    0,
  );
  points.weaponTip = points.sting;
  return { anim, t, pose, face, body, head, legs, claws, tail, points, phase, cycle, life: l };
}
function defaultDraw(r: Rig, s: ArachnidSkeleton, card: CreatureCard, variant: Variant) {
  const ramp = card.materials[0].tones,
    tones =
      variant === 'gold'
        ? ['#775532', '#a87a44', '#e1b45f', '#ffecaa']
        : [ramp[0], ramp[1], ramp.at(-2)!, ramp.at(-1)!];
  const shell: Mat = { T: tones.map((c) => hx(c)) as Mat['T'] };
  r.tag = 'body';
  r.ell(s.body, [-3, 0, 0], [19, 12, 9], shell);
  for (const l of s.legs) {
    r.tag = l.name;
    r.cap(l.hip, l.knee, 2.8, 2, shell);
    r.cap(l.knee, l.ankle, 2.2, 1.2, shell);
    r.cap(l.ankle, l.toe, 1.2, 0.3, shell);
  }
  for (const c of s.claws) {
    r.tag = c.name;
    r.cap(c.shoulder, c.elbow, 3, 2.5, shell);
    r.cap(c.elbow, c.palm.o, 2.5, 3.2, shell);
    r.ell(c.palm, [0, 0, 0], [6, 4, 3.3], shell);
    r.cap(c.palm.o, c.fixed, 2.4, 0.25, shell);
    r.cap(c.palm.o, c.finger, 2, 0.3, shell);
  }
  s.tail.slice(1, -1).forEach((p, i) => {
    r.tag = 'tail' + i;
    r.cap(s.tail[i], p, 4.8 - i * 0.44, 4.55 - i * 0.55, shell);
  });
  const a = s.tail[6],
    b = s.tail[7],
    f = jointFrame(a, b),
    len = vlen(vsub(b, a));
  r.tag = 'sting';
  r.cap(a, f.p(len * 0.11, 0, 0), 2.85, 3.45, shell);
  cutStone(r, f.at(len * 0.11, 0, 0), len * 0.89, 6.15, shell, shell, shell);
}
export function arachnidFrame(
  card: CreatureCard,
  route: MotionPlan,
  appearance?: ArachnidAppearance,
): Creature['frame'] {
  return (anim, t, side, variant, steer) => {
    const pose = { ...appearance?.pose?.(anim, t), ...steer?.techniquePose },
      lead = steer ? ((((steer.headSide - side + 24) % 16) - 8) * Math.PI) / 8 : 0;
    const s = arachnidSkeleton(anim, t, side, pose, lead, route, card, steer?.gaitPhase ?? t),
      r = new Rig();
    (appearance?.draw ?? defaultDraw)(r, s, card, variant);
    for (const [k, p] of Object.entries(s.points)) s.points[k + 'Ground'] = [p[0], p[1], 0];
    const scale = card.proportions.scale ?? 1,
      air = Math.max(0, Math.min(...s.legs.map((l) => l.toe[2])) * scale);
    scaleFigure(r, s.points, scale, scale * (card.proportions.vertical ?? 1));
    const size = sizes[card.rarity][2],
      frame = projectFigure(
        r,
        size,
        [Math.round(size * 0.5), Math.round(size * 0.785)],
        s.points,
        '#332730',
        3.8,
        true,
      );
    return {
      ...frame,
      planted: s.legs.filter((l) => l.down).map((l) => l.name),
      dx: pose.dx,
      dy: pose.dy,
      sx: pose.sx,
      sy: pose.sy,
      groundShadow: { radius: (size * 0.226) / (1 + air * 0.024), opacity: 1 / (1 + air * 0.037) },
    };
  };
}
