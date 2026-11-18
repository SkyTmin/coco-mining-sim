// Four planted hooves and a heavy, low neck. The skin is independent of the pose.
import {
  F3,
  Rig,
  vadd,
  vcross,
  vdot,
  vlen,
  vmul,
  vnorm,
  vsub,
  type Mat,
  type V3,
} from '../rig/f15-rig';
import { hx, ik, TAU } from '../kit/f11-mobkit';
import { life, projectFigure, scaleFigure } from '../rig/figure';
import { strideFoot } from '../motion';
import { collisionShell, goalAt, segmentClearance, solveReach, toLocal, type Shell } from './goals';
import type { CreatureCard } from '../studio/card';
import type { JointPose } from '../technique';
import { sizes, type Creature, type MotionPlan, type Variant } from '../types';

export type HeavyPose = Partial<JointPose>;

export interface HeavyLeg {
  name: string;
  fore: number; // 1 for forelegs, -1 for hind legs
  side: number; // 1 for the right leg
  hip: V3;
  knee: V3;
  foot: V3;
  hoof: F3;
}
export interface HeavySkeleton {
  anim: string;
  time: number;
  pose: HeavyPose;
  root: F3;
  body: F3;
  head: F3;
  tail: F3;
  legs: HeavyLeg[];
  life: ReturnType<typeof life>;
  points: Record<string, V3>;
  planted: string[];
  width: number;
  length: number;
  height: number;
  scale: number;
}
export interface HeavyAppearance {
  /** In the moving head frame; draw the working horn through this endpoint. */
  hornTip?: V3;
  draw(rig: Rig, skeleton: HeavySkeleton, card: CreatureCard, variant: Variant): void;
}

const defaultTip: V3 = [19, 6, 7];

function faceVector(basis: F3, offset: V3, direction: V3) {
  // Rotate the rigid head (including both horns) until the chosen tip is on the working ray.
  const from = vnorm(basis.v(...offset)),
    to = vnorm(direction);
  const cross = vcross(from, to),
    sine = vlen(cross),
    cosine = Math.max(-1, Math.min(1, vdot(from, to)));
  if (sine < 1e-8 && cosine > 0) return basis;
  const axis =
    sine > 1e-8
      ? vmul(cross, 1 / sine)
      : vnorm(vcross(from, Math.abs(from[2]) < 0.8 ? [0, 0, 1] : [1, 0, 0]));
  const rotate = (v: V3) =>
    vadd(
      vadd(vmul(v, cosine), vmul(vcross(axis, v), sine)),
      vmul(axis, vdot(axis, v) * (1 - cosine))
    );
  return new F3(basis.o, rotate(basis.f), rotate(basis.s), rotate(basis.u));
}

// Swivel the neck around the shoulder-to-tip axis. Pick the first clear
// anatomical bend, keeping the tip fixed while the head and horn rotate.
function aimedHead(base: F3, neck: V3, target: V3, tip: V3, hornRoot: V3, shell: Shell) {
  const neckLength = vlen(vsub(base.o, neck)),
    tipLength = vlen(tip);
  let distance = vlen(vsub(target, neck));
  if (segmentClearance(shell, target, target) < 0.85)
    throw new RangeError('Horn or muzzle target is inside the torso');
  if (
    !distance ||
    distance < Math.abs(neckLength - tipLength) ||
    distance > neckLength + tipLength + 6
  )
    throw new RangeError(
      'Goal outside the articulated neck reach: ' + target.map((n) => n.toFixed(1)).join(',')
    );
  const axis = vnorm(vsub(target, neck));
  // Neck muscles can advance their origin along the upper back by six units.
  const advance = Math.max(0, distance - neckLength - tipLength + 0.001);
  neck = vadd(neck, vmul(axis, advance));
  distance = vlen(vsub(target, neck));
  const along = (neckLength ** 2 - tipLength ** 2 + distance ** 2) / (2 * distance);
  const ring = vadd(neck, vmul(axis, along));
  const radius = Math.sqrt(Math.max(0, neckLength ** 2 - along ** 2));
  const natural = vsub(base.o, ring);
  let pole = vsub(natural, vmul(axis, vdot(natural, axis)));
  if (vlen(pole) < 0.001) pole = vcross(axis, Math.abs(axis[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]);
  pole = vnorm(pole);
  const transverse = vcross(axis, pole);
  for (let i = 0; i < 48; i++) {
    const angle = ((i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2) * Math.PI) / 24;
    const bend = vadd(vmul(pole, Math.cos(angle)), vmul(transverse, Math.sin(angle)));
    const pivot = vadd(ring, vmul(bend, radius));
    const head = faceVector(new F3(pivot, base.f, base.s, base.u), tip, vsub(target, pivot));
    if (segmentClearance(shell, head.p(...hornRoot), head.p(...tip)) >= 0.8) return head;
  }
  throw new RangeError('No clear neck swivel places the horn on its target');
}

/** Goals are in the neutral animal grid (forward, right, up), with the floor at zero. */
export function heavySkeleton(
  anim: string,
  t: number,
  side: number,
  a: HeavyPose,
  headLead: number,
  route: MotionPlan,
  proportions: Record<string, number> = {},
  hornTip: V3 = defaultTip
): HeavySkeleton {
  const l = life(anim, t, 0);
  const width = proportions.width ?? 1,
    length = proportions.length ?? 1,
    height = proportions.height ?? 1;
  const scale = 1.19 * (proportions.scale ?? 1),
    coil = Math.max(a.coil ?? 0, l.hatch * 0.95);
  const yaw = route.yaw + (TAU * side) / 16;
  const facing = F3.yaw(yaw),
    root = F3.yaw(yaw + (a.yaw ?? 0));
  const breath = Math.sin(l.q) * 0.85;
  const body = root
    .at(
      -1 + (a.lean ?? 0),
      0,
      20 * height + breath - 4 * l.sleep - 3 * l.tired + (a.lift ?? 0) + 4 * l.pop - (a.crouch ?? 0)
    )
    .pitch((a.pitch ?? 0) - 0.04 * l.happy)
    .roll(a.roll ?? 0)
    .turn(a.twist ?? 0);
  const posed = a as JointPose;
  let obstacles: Shell | undefined;
  function torso() {
    if (!obstacles) {
      const core = new Rig();
      core.tag = 'torso';
      core.ell(body, [-4, 0, 0], [23 * length, 14 * width, 14 * height], {
        T: [hx('#222222'), hx('#444444'), hx('#888888'), hx('#bbbbbb')],
      });
      obstacles = collisionShell(core);
    }
    return obstacles;
  }
  const worldGoal = (socket: string, rest: V3) => {
    const target = goalAt(posed, socket, toLocal(facing, rest));
    return target && facing.p(...target);
  };
  const legs: HeavyLeg[] = [],
    planted: string[] = [];
  const points: Record<string, V3> = {};
  for (const k of [-1, 1])
    for (const s of [-1, 1]) {
      const name = (k === 1 ? 'fore' : 'hind') + (s === 1 ? 'R' : 'L');
      const gait = strideFoot(t, k === s ? 0 : 0.5, route.stride / scale);
      const scrape =
        anim === 'idle' && k === 1 && s === 1 ? Math.max(0, Math.sin(l.q * 2 - 1)) ** 6 : 0;
      let hip = body.p(k * 12 * length, s * 8 * width, -5 * height);
      const alias = (k === 1 ? 'hand' : 'foot') + (s === 1 ? 'R' : 'L');
      const rest =
        anim === 'walk'
          ? root.p(k * 14 * length - 1 + gait.forward, s * 9.8 * width, 2.4 + 4.3 * gait.lift)
          : body.p(
              k * (14 * length - 4 * coil) - 3 * scrape + k * (a.stride ?? 0),
              s * (9.8 * width - 2 * coil),
              -17 * height + 8 * coil + scrape * 2 + 3 * l.sleep
            );
      const target = worldGoal(name, rest) ?? worldGoal(alias, rest);
      const foot = target ?? rest;
      const upper = 11 * height,
        lower = 12 * height;
      let knee: V3;
      if (target) {
        const solved = solveReach({
          shoulder: hip,
          target,
          upper,
          lower,
          basis: body,
          side: s,
          shell: torso(),
          maxAdvance: 8,
        });
        hip = solved.shoulder;
        knee = solved.elbow;
      } else knee = ik(hip, foot, upper, lower, body.v(k === 1 ? -1 : 1, s * 0.4, 0.3));
      legs.push({ name, fore: k, side: s, hip, knee, foot, hoof: F3.yaw(yaw, foot) });
      points[name] = foot;
      points[alias] = foot;
      if (k === 1 && s === 1) points.paw = foot;
      if (anim === 'walk' && gait.planted) planted.push(name);
    }
  const naturalHead = body
    .at(14 * length - 9 * coil + (a.reach ?? 0), 0, -2 * height - 3 * coil)
    .turn(0.86 * l.look + headLead + (a['head.yaw'] ?? 0))
    .pitch(
      (a.head ?? 0) +
        0.24 * l.sleep +
        0.26 * l.tired -
        0.1 * l.happy -
        0.13 * Math.max(0, Math.sin(l.q - 1.3)) ** 7 +
        (a['head.pitch'] ?? 0)
    );
  const muzzle: V3 = [20, 0, -2],
    neutralTip = naturalHead.p(...hornTip),
    neutralMuzzle = naturalHead.p(...muzzle);
  const aim = worldGoal('hornTip', neutralTip) ?? worldGoal('weaponTip', neutralTip);
  const muzzleGoal = worldGoal('mouth', neutralMuzzle) ?? worldGoal('snout', neutralMuzzle);
  const look = worldGoal('head', naturalHead.p(26, 0, 0));
  const head =
    aim || muzzleGoal
      ? aimedHead(
          naturalHead,
          body.p(-6 * length, 0, 0),
          (aim ?? muzzleGoal)!,
          aim ? hornTip : muzzle,
          aim ? [3, 7, 6] : [8, 0, 1],
          torso()
        )
      : look
        ? faceVector(naturalHead, [1, 0, 0], vsub(look, naturalHead.o))
        : naturalHead;
  const tailBase = body
    .at(-23 * length, 0, 3 * height)
    .turn(a['tail.yaw'] ?? 0)
    .pitch(a['tail.pitch'] ?? 0);
  const tailRest: V3 = [-8, 0, -5],
    tailGoal = worldGoal('tailTip', tailBase.p(...tailRest));
  const tail = tailGoal ? faceVector(tailBase, tailRest, vsub(tailGoal, tailBase.o)) : tailBase;
  points.tailTip = tail.p(...tailRest);
  if (tailGoal && vlen(vsub(tailGoal, points.tailTip)) > 1)
    throw new RangeError('Tail target outside its reach');
  points.head = head.o;
  points.mouth = points.snout = head.p(...muzzle);
  points.weaponTip = points.hornTip = head.p(...hornTip);
  points.hornRootL = head.p(3, -7, 6);
  points.hornRootR = head.p(3, 7, 6);
  for (const [name, [x, y]] of Object.entries(points)) points[name + 'Ground'] = [x, y, 0];
  return {
    anim,
    time: t,
    pose: a,
    root,
    body,
    head,
    tail,
    legs,
    points,
    planted,
    life: l,
    width,
    length,
    height,
    scale,
  };
}

function defaultSkin(r: Rig, s: HeavySkeleton, card: CreatureCard, variant: Variant) {
  // Card paints supply shadows, midtones, light and rim on the default scaffold.
  const material = (index: number): Mat => {
    const colours = card.materials[index % card.materials.length].tones.map((tone) => hx(tone));
    const T: Mat['T'] = [
      colours[0],
      colours[Math.floor(colours.length / 3)],
      colours[colours.length - 2],
      colours.at(-1)!,
    ];
    return {
      T,
      pat: ([x, y, z], light) =>
        Math.sin(13 * x + 8 * z + 3 * y) > 0.65 && light > 0.1 ? colours[2] : null,
    };
  };
  const coat = material(0),
    hoof = material(1),
    horn = material(2);
  if (variant === 'gold') coat.T = [hx('#65493e'), hx('#ac7544'), hx('#e2ba68'), hx('#fff0ae')];
  for (const leg of s.legs) {
    r.tag = leg.name;
    r.cap(leg.hip, leg.knee, 4.1, 3.2, coat);
    r.cap(leg.knee, leg.foot, 3.2, 2.3, hoof);
    for (const side of [-1, 1]) r.ell(leg.hoof, [2, side * 1.8, -1.4], [4.1, 1.7, 2.2], hoof);
  }
  r.tag = 'torso';
  r.ell(s.body, [-4, 0, 0], [23 * s.length, 14 * s.width, 14 * s.height], coat);
  r.tag = 'tail';
  r.cap(s.tail.o, s.points.tailTip, 2.8, 1, coat);
  r.tag = 'neck';
  r.cap(s.body.p(9, 0, 3), s.head.o, 9, 7, coat);
  r.tag = 'head';
  r.ell(s.head, [4, 0, 0], [11, 8, 8], coat);
  r.ell(s.head, [13.5, 0, -2.5], [7, 5, 4], hoof);
  for (const side of [-1, 1]) {
    r.tag = side > 0 ? 'eyeR' : 'eyeL';
    r.ell(s.head, [7, side * 7.4, 1.7], [2.4, 1.1, 1.7], hoof);
    const e = s.head.p(7.5, side * 8.5, 2.2);
    if (!s.life.blink) r.dot(e, hx('#fff3ab'), 0, 1);
    if (side > 0) r.eye = e;
    r.tag = side > 0 ? 'hornR' : 'hornL';
    const tip = side > 0 ? s.points.hornTip : s.head.p(defaultTip[0], -defaultTip[1], defaultTip[2]);
    r.cap(s.head.p(3, side * 7, 6), s.head.p(9, side * 9, 12), 3.3, 2.1, horn);
    r.cap(s.head.p(9, side * 9, 12), tip, 2.1, 0.35, horn);
  }
}

export function heavyFrame(
  card: CreatureCard,
  route: MotionPlan,
  appearance?: HeavyAppearance
): Creature['frame'] {
  return (anim, t, side, variant, steer) => {
    const pose = steer?.techniquePose ?? {};
    const headLead = steer ? ((((steer.headSide - side + 24) % 16) - 8) * Math.PI) / 8 : 0;
    const s = heavySkeleton(
      anim,
      t,
      side,
      pose,
      headLead,
      route,
      card.proportions,
      appearance?.hornTip
    );
    const r = new Rig();
    (appearance?.draw ?? defaultSkin)(r, s, card, variant);
    scaleFigure(r, s.points, s.scale, 1.36 * (card.proportions.scale ?? 1));
    const size = sizes[card.rarity][2];
    const frame = projectFigure(
      r,
      size,
      [Math.round(size * 0.48), Math.round(size * 0.75)],
      s.points,
      '#272835'
    );
    return { ...frame, planted: s.planted, dx: pose.dx, dy: pose.dy, sx: pose.sx, sy: pose.sy };
  };
}
