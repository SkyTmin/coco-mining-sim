// Library moves keep the six approved timing landmarks and replace pilot-specific angles
// with targets for the body solver. The same book drives the renderer, contact tests and FX.
import { aim, goalAt, look, reach } from '../bodies/goals';
import type { V3 } from '../rig/f15-rig';
import type { BodyType, CardMove } from '../bodies/card-data';
import {
  sixPoses,
  type JointPose,
  type PoseKey,
  type Technique,
  type TechniqueBook,
  type TechniqueContact,
} from '../technique';
import { familyPath, movementFor } from './family-paths';
import { templateFor, type MoveId, type Track, type TargetPath } from './templates';
export { moveTemplates, defaultMoveParameters, weaponFor, type MoveId } from './templates';

const rigScale: Record<BodyType, number> = {
  'heavy-quadruped': 1,
  'light-quadruped': 1,
  'sky-swimmer': 1,
  arachnid: 1,
  cephalopod: 1,
  hexapod: 1,
  'long-flier': 1.15,
  'armed-biped': 1.4,
  'squat-mage': 1.2,
  giant: 1.45,
  'winged-dragon': 1.3,
};

const firstTravel: Record<'volley' | 'summon' | 'pillars', number[]> = {
  volley: [6, 8, 10, 12, 14],
  summon: [4, 8, 12],
  pillars: [5, 9, 13],
};
export const flightDelays = (id: MoveId): readonly number[] =>
  id === 'volley' || id === 'summon' || id === 'pillars' ? firstTravel[id] : [];

/** Author-specific endpoints are in this skeleton's own units, before side/amplitude. */
export interface MoveOverrides {
  targets?: TargetPath;
  advance?: Track;
  pitch?: Track;
  twist?: Track;
  crouch?: Track;
  lift?: Track;
}

function bodyPose(
  move: CardMove,
  body: BodyType,
  stage: number,
  frame: number,
  overrides: MoveOverrides,
): JointPose {
  const template = templateFor(move.template);
  const { amplitude, strength, side } = move.parameters;
  const size = rigScale[body];
  const family = familyPath(body, move.weapon, move.template);
  const pole = body === 'armed-biped' && move.weapon === 'weaponTip' && family;
  const local = overrides.targets ?? family;
  const raw = (local ?? template.target)[stage];
  const scale = local ? 1 : size;
  // Swing about the prep-to-hit midpoint. Z=0 remains a physical ground target at any amplitude.
  // The rigid crook reaches the same planted contact when the wind-up is widened or mirrored.
  const fixedLanding = body === 'squat-mage' && move.template === 'overhead' && stage >= 2;
  const swingAmplitude = fixedLanding ? 1 : amplitude;
  const x = (24 + (raw[0] - 24) * swingAmplitude) * scale;
  const isLimb = /^(hand|foot|fore|hind|arm|leg)/.test(move.weapon);
  // A paired foot must remain on its own side of the hips. The two-handed staff
  // reverses the side of its arc around the neutral grip, without crossing the head.
  let lateral = raw[1] * side;
  if (isLimb) lateral = raw[1] * (side < 0 ? 1.16 : 1);
  const fixedHand = move.weapon === 'weaponTip' && ['giant', 'squat-mage', 'winged-dragon'].includes(body);
  if (fixedHand && side < 0) lateral = raw[1] + (fixedLanding ? 0 : stage < 2 ? -2 : 2);
  // A staff held in only the right hand reverses its leading edge over the wrist.
  // Mirroring the whole torso with that same grip would send the staff through the chest.
  const turn = fixedLanding ? 1 : fixedHand && side < 0 ? 0.9 : side;
  if (pole && side < 0) lateral = raw[1] + (stage < 2 ? -6 : 5);
  const point: V3 = [x, lateral * swingAmplitude * scale, raw[2] * scale];
  const isHit = stage === 2;
  const position = isLimb ? reach(move.weapon, point) : aim(move.weapon, point, isHit ? frame : undefined);
  const movement = movementFor(body, move.template);
  const advance = (overrides.advance ?? movement.advance ?? template.advance)[stage];
  const pose: JointPose = {
    ...position,
    dx: advance * size * strength,
    lean: (movement.lean?.[stage] ?? advance * 0.33) * size * strength,
    crouch: (overrides.crouch ?? movement.crouch ?? template.crouch)[stage] * size * strength,
    pitch: (overrides.pitch ?? movement.pitch ?? template.pitch)[stage] * swingAmplitude,
    twist: (overrides.twist ?? template.twist)[stage] * turn * swingAmplitude,
    stride: (stage + 1) * size * 1.5,
  };
  const lift = overrides.lift ?? movement.lift ?? template.lift;
  if (lift) pose.lift = lift[stage] * size * strength;
  if (move.template === 'roar' || move.template === 'breath') {
    pose.jaw = [0, 0.14, 1, 0.77][stage];
    pose['head.pitch'] = [-0.19, -0.08, 0.21, 0.24][stage];
  }
  if (isLimb && !/^foot/.test(move.weapon) && move.template !== 'leap') {
    const gazeHeight = body === 'squat-mage' && move.template === 'summon' ? 7 : 3;
    Object.assign(pose, look('head', [point[0] + 8, point[1], point[2] + gazeHeight]));
  }
  if (move.template === 'leap' && /^(foot|fore|hind)[LR]$/.test(move.weapon)) {
    const near = move.weapon.endsWith('R') ? 'L' : 'R';
    Object.assign(pose, reach(move.weapon.slice(0, -1) + near, [x, -point[1], point[2]]));
  }
  if (body === 'armed-biped' && move.template === 'overhead') {
    // Guide the two-handed shaft from above the brow to an extended grip at contact.
    pose.clubLift = [48, 40, -6, 10][stage] * amplitude;
    pose.clubForward = [3, 18, 46, 19][stage] * amplitude;
    pose.clubSide = [-3, -8, -12, -9][stage] * amplitude;
  }
  if (body === 'squat-mage' && move.template === 'leap' && move.weapon === 'handL') {
    // Carry the crook just outside the hock's sweep so the trailing leg never flicks its cap.
    pose['armR.forward'] = 5;
    pose['armR.right'] = 4;
    // The leading palm receives the weight. The hind feet kick behind the pelvis
    // in flight and are still raised when the palm first touches the ground.
    const feet = familyPath(body, 'footL', 'leap')![stage];
    for (const sign of [-1, 1]) {
      Object.assign(pose, reach(sign < 0 ? 'footL' : 'footR',
        [feet[0] * amplitude, sign * Math.abs(feet[1]) + (stage === 1 ? 13 : 0), stage === 2 ? 5 : feet[2]]));
    }
  }
  return pose;
}

/** Horn rams and tail sweeps have no striking wrist. A staff, fist or claw does. */
function drivingHand(move: CardMove, body: BodyType): 'L' | 'R' | undefined {
  if (!['sweep', 'overhead', 'ram', 'thrust', 'slide'].includes(move.template)) return;
  if (/^(arm|hand|fore)[LR]$/.test(move.weapon)) return move.weapon.endsWith('L') ? 'L' : 'R';
  if (move.weapon === 'weaponTip' && ['armed-biped', 'squat-mage', 'giant', 'winged-dragon'].includes(body))
    return 'R';
}

export function buildMove(move: CardMove, body: BodyType, overrides: MoveOverrides = {}): Technique {
  const def = templateFor(move.template);
  if (!def) throw Error('Unknown move template ' + move.template);
  const { repeats } = move.parameters;
  if (!Number.isSafeInteger(repeats) || repeats < 1) throw Error('Expected a positive strike count');
  const [, p, s, h, f, last] = def.frames;
  const gap = f - h + 7;
  const added = (repeats - 1) * gap;
  const windup = Math.round(added * 0.75);
  const prep = p + windup,
    strike = s + windup,
    hit = h + windup,
    follow = f + windup;
  const end = last + windup + added;
  const keys = sixPoses([
    [0, {}],
    [prep, bodyPose(move, body, 0, prep, overrides)],
    [strike, bodyPose(move, body, 1, strike, overrides)],
    [hit, bodyPose(move, body, 2, hit, overrides)],
    [follow, bodyPose(move, body, 3, follow, overrides)],
    [end, {}],
  ]);
  let pathKeys: PoseKey[] | undefined;
  if (move.template === 'overhead' && body === 'armed-biped' && move.weapon === 'weaponTip') {
    // Lift the handle in front of the face before carrying it back over the crown (the mochi swing).
    const lift = { ...keys[2].pose, dx: 0, lean: 0, crouch: 0 };
    const [forward, right, up] = goalAt(lift, move.weapon)!;
    Object.assign(lift, aim(move.weapon, [forward * .63, right * .75, up * .88]));
    pathKeys = [{ role: 'prep', frame: Math.round(prep * 8 / 14), pose: lift }];
  }
  const contacts: TechniqueContact[] = [];
  const repeatKeys: PoseKey[] = [];
  const ground = def.kind === 'floor' ? move.weapon + 'Ground' : undefined;
  for (let wave = 0; wave < repeats; wave++) {
    const at = hit + wave * gap;
    contacts.push({ frame: at, socket: move.weapon, kind: def.kind, floorSocket: ground });
    if (move.template === 'dive') {
      // The animal hits the mound on the way in and breaks out again at its follow-through.
      contacts.push({ frame: at + f - h, socket: move.weapon, kind: 'body' });
    }
    if (move.template === 'leap' && /^(foot|fore|hind)[LR]$/.test(move.weapon)) {
      const foot = move.weapon.slice(0, -1) + (move.weapon.endsWith('R') ? 'L' : 'R');
      contacts.push({ frame: at, socket: foot, kind: 'floor', floorSocket: foot + 'Ground' });
    }
    for (const [branch, delay] of flightDelays(move.template).entries())
      contacts.push({
        frame: at + delay,
        kind: 'projectile',
        socket: move.weapon,
        projectile: move.id + '-' + wave + '-' + branch,
      });
    if (wave) {
      repeatKeys.push(
        { role: 'strike', frame: at - (h - s), pose: keys[2].pose },
        { role: 'hit', frame: at, pose: bodyPose(move, body, 2, at, overrides) },
        { role: 'follow', frame: at + (f - h), pose: keys[4].pose },
      );
    }
  }
  for (const weight of move.contacts ?? []) {
    const at = contacts.filter(hit => hit.frame === weight.frame);
    if (!at.length) throw Error(move.id + ' has no contact at frame ' + weight.frame);
    for (const hit of at) Object.assign(hit, weight);
  }
  contacts.sort((a, b) => a.frame - b.frame);
  return {
    title: move.title,
    weapon: move.weapon,
    reachHand: drivingHand(move, body),
    reference: move.reference,
    contactKind: def.kind,
    recovery: def.recovery,
    floorSocket: ground,
    contacts,
    keys,
    pathKeys,
    repeatKeys,
    seconds: (end + 1) / 24,
    stop: def.stop,
    shake: Math.min(0.36, 0.08 * move.parameters.strength),
    interpolate: true,
  };
}

export function buildMoveBook(
  moves: readonly CardMove[],
  body: BodyType,
  overrides: Record<string, MoveOverrides> = {},
): TechniqueBook {
  const book: TechniqueBook = {};
  for (const move of moves) {
    if (move.id in book) throw Error('Duplicate move id ' + move.id);
    book[move.id] = buildMove(move, body, overrides[move.id]);
  }
  return book;
}
