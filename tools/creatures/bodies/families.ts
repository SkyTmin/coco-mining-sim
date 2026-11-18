// These five families keep the original pilots' articulated gait, detail and anatomy.
// The shared construction hook receives the real 3D parts before the first raster pass.
import beetle, { buildFrame as beetleFrame } from '../c/gem_beetle';
import silk, { bodyFrame as silkFrame } from '../c/silk_dragon';
import frog, { bodyFrame as frogFrame } from '../c/toad_shaman';
import titan, { craterTitanFrame } from '../c/crater_titan';
import coin, { coinDragonFrame } from '../c/coin_dragon';
import type { BodyType, CreatureCard } from './card-data';
import { sizes, type Creature, type MotionPlan, type Variant } from '../types';
import { F3, type Rig, type V3, vlen, vsub } from '../rig/f15-rig';
import { withFigureSetup, scaleFigure } from '../rig/figure';
import type { JointPose } from '../technique';
import { applyProportions } from './proportions';
import { cardMaterials } from './materials';
import { standardSockets, poseLimbs } from './limbs';
import { poseAxial } from './axial';
import { aim, goalAt, toLocal } from './goals';
import { clearGiantMuzzle } from './giant-head';
import { poseMageGrip } from './mage-grip';

export type PilotFamily = Exclude<BodyType, 'heavy-quadruped' | 'armed-biped'>;
const families = {
  hexapod: { pilot: beetle, yaw: 0.5 },
  'long-flier': { pilot: silk, yaw: 0.36 },
  'squat-mage': { pilot: frog, yaw: 1.22 },
  giant: { pilot: titan, yaw: 0.77 },
  'winged-dragon': { pilot: coin, yaw: 0.48 },
} satisfies Record<PilotFamily, { pilot: Creature; yaw: number }>;
export interface PilotSkeleton {
  basis: F3;
  points: Record<string, V3>;
}
export type PilotAppearance = (
  rig: Rig,
  skeleton: PilotSkeleton,
  card: CreatureCard,
  variant: Variant,
) => void;

/** The shared dictionary uses linear distances and radians. Native pilots use different
 * levers (e.g. a thirteen-unit pelvis drop is one unit of the giant's crouch). */
function gesture(
  body: PilotFamily,
  p: JointPose,
  t: number,
  side: number,
  variant: Variant,
  headSide: number,
) {
  const lean = p.lean ?? 0,
    twist = p.twist ?? 0,
    pitch = p.pitch ?? 0,
    crouch = p.crouch ?? 0;
  const stride = p.stride ?? 0,
    lift = p.lift ?? 0,
    jaw = p.jaw ?? 0;
  const frame = 'gesture';
  switch (body) {
    case 'hexapod':
      return beetleFrame(
        frame,
        t,
        side,
        variant,
        {
          pitch: pitch * 0.65,
          roll: twist * 0.2,
          lift: lift - crouch * 0.65,
          reach: lean * 0.3,
          coil: Math.max(0, crouch * 0.018),
          wing: stride * 0.025,
        },
        ((headSide - side) * Math.PI) / 8,
      );
    case 'long-flier':
      return silkFrame(
        frame,
        t,
        side,
        variant,
        {
          tilt: pitch * 0.42,
          skew: twist * 0.25,
          lift: lift - crouch * 0.35,
          lunge: lean,
          coilBack: Math.max(0, crouch * 0.012),
          fins: stride * 0.06,
          notch: jaw * 0.7,
        },
        headSide,
      );
    case 'squat-mage':
      return frogFrame(
        frame,
        t,
        side,
        variant,
        {
          hip: lean * 0.5,
          pitch: pitch * 0.5,
          twist: twist * 0.5,
          crouch: crouch * 0.55,
          lift,
          step: stride * 0.32,
          jaw,
        },
        headSide,
      );
    case 'giant':
      return craterTitanFrame(
        frame,
        t,
        side,
        variant,
        {
          hipForward: lean * 0.7,
          incline: pitch * 0.45,
          twist: twist * 0.7,
          crouch: (crouch - lift) / 13,
          advance: stride * 0.35,
        },
        headSide,
      );
    case 'winged-dragon':
      return coinDragonFrame(
        frame,
        t,
        side,
        variant,
        {
          reach: lean * 0.2,
          rear: pitch * 0.45,
          twist,
          squat: (crouch - lift) * 0.06,
          stance: stride * 0.25,
          jaw,
        },
        headSide,
      );
  }
}

export function pilotFrame(card: CreatureCard, route: MotionPlan, draw?: PilotAppearance): Creature['frame'] {
  const body = card.body as PilotFamily,
    { pilot, yaw } = families[body];
  const repaint = cardMaterials(card.materials);
  const pixelScale = sizes[card.rarity][2] / sizes[pilot.rarity][2];
  // The rigid crook spans up to 182 native pixels across a turn, including its lantern.
  // Reserve that space for every frame so the mage keeps the same size throughout a move.
  const figureScale = pixelScale * (card.proportions.scale ?? (body === 'squat-mage' ? 0.82 : 1));
  return (anim, t, side, variant, motion) => {
    const pose = motion?.techniquePose;
    const facing = side + ((route.yaw - yaw) * 8) / Math.PI;
    const basis = F3.yaw(yaw + (facing * Math.PI) / 8);
    const headSide = facing + (motion?.headSide ?? side) - side;
    const flight =
      (anim === 'fly' || (anim === 'walk' && route.fly)) &&
      (body === 'winged-dragon' || body === 'long-flier');
    const out = withFigureSetup(
      (rig, points, size, anchor) => {
        applyProportions(rig, points, basis, card.proportions);
        standardSockets(body, rig, points, basis);
        if (pose) {
          const controls = { ...pose };
          // A hand-authored nudge of the weapon acts on the physical tip; an explicit
          // contact target owns the endpoint for the duration of its key.
          const weapon = points.weaponTip;
          const manual = [
            pose['weapon.forward'] ?? 0,
            pose['weapon.right'] ?? 0,
            pose['weapon.up'] ?? 0,
          ] as V3;
          if (weapon && manual.some(Boolean) && !goalAt(pose, 'weaponTip')) {
            const rest = toLocal(basis, weapon);
            Object.assign(
              controls,
              aim('weaponTip', [rest[0] + manual[0], rest[1] + manual[1], rest[2] + manual[2]]),
            );
          }
          const goals = Object.keys(controls).flatMap((key) => {
            const socket = /^goal\.(.+)\.weight$/.exec(key)?.[1];
            return socket && controls[key] > 0 ? [socket] : [];
          });
          for (const socket of goals) {
            const articulated =
              /^(hand|arm|foot|leg|fore|hind)[LR]$/.test(socket) ||
              [
                'head',
                'mouth',
                'weaponTip',
                'tail',
                'tailTip',
                'horn',
                'hornTip',
                'fist',
                'claw',
                'staffTip',
              ].includes(socket);
            if (!articulated || !points[socket]) throw RangeError(body + ' has no controllable ' + socket);
          }
          poseAxial(body, rig, points, basis, controls);
          if (body === 'giant' && controls['goal.mouth.weight'] > 0) clearGiantMuzzle(rig, points, basis);
          poseLimbs(body, rig, points, basis, controls);
          if (body === 'squat-mage') poseMageGrip(rig, points, basis, controls);
          for (const socket of goals) {
            // The head looks *towards* a point. All other fully weighted goals
            // must agree with their physical endpoints, also for simultaneous limbs.
            if (socket === 'head' || controls['goal.' + socket + '.weight'] < 1 - 1e-8) continue;
            const expected = goalAt(controls, socket)!;
            const distance = vlen(vsub(expected, toLocal(basis, points[socket]))) * figureScale;
            if (distance > 1)
              throw RangeError(body + ' cannot place ' + socket + ' within one pixel of its goal');
          }
        }
        if (variant === 'normal') repaint(rig);
        draw?.(rig, { basis, points }, card, variant);
        for (const [key, p] of Object.entries(points)) {
          if (!p) throw Error(body + ' has no physical point for ' + key);
          if (!key.endsWith('Ground') && !key.endsWith('Floor')) points[key + 'Ground'] = [p[0], p[1], 0];
        }
        if (figureScale !== 1) scaleFigure(rig, points, figureScale);
        if (pixelScale !== 1) {
          return {
            size: Math.round(size * pixelScale),
            anchor: anchor.map((x) => Math.round(x * pixelScale)) as [number, number],
          };
        }
      },
      () => {
        if (pose) return gesture(body, pose, t, facing, variant, headSide);
        if (flight) {
          const beat = Math.sin(t * Math.PI * 2);
          if (body === 'winged-dragon')
            return coinDragonFrame(
              'idle',
              t,
              facing,
              variant,
              { wings: 0.5 + 0.45 * beat, tail: 0.18 * beat },
              headSide,
            );
          return silkFrame('walk', t, facing, variant, { fins: 0.38 * beat }, headSide);
        }
        return pilot.frame(anim, t, facing, variant, { headSide, gaitPhase: motion?.gaitPhase ?? t });
      },
    );
    if (anim === 'fly') out.dy = (out.dy ?? 0) - pixelScale * (5 + 2 * Math.sin(t * Math.PI * 2));
    if (pose) {
      out.dx = (pose.dx ?? 0) * pixelScale;
      out.dy = (out.dy ?? 0) + (pose.dy ?? 0) * pixelScale;
    }
    return out;
  };
}
