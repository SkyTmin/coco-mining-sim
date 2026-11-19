// Target coordinates are in the native rig's forward, right and up axes. Columns describe
// anticipation, the start of the strike, contact and follow-through. Rest and return belong to the body.
import type { BodyType } from '../bodies/card-data';
import type { V3 } from '../rig/f15-rig';
import type { ContactKind, Technique } from '../technique';

export type Track = readonly [number, number, number, number];
export type TargetPath = readonly [V3, V3, V3, V3];
interface MoveTemplate {
  source: readonly [string, string];
  reference: string;
  weapon: string;
  kind: Exclude<ContactKind, 'projectile'>;
  frames: readonly [number, number, number, number, number, number];
  stop: number;
  recovery?: Technique['recovery'];
  target: TargetPath;
  advance: Track;
  pitch: Track;
  twist: Track;
  crouch: Track;
  lift?: Track;
}

export const defaultMoveParameters = { strength: 1, amplitude: 1, side: 1, repeats: 1 };

export const moveTemplates = {
  overhead: {
    source: ['frost_yeti', 'tech_slam'],
    reference: 'mammoth-stomp',
    weapon: 'weaponTip',
    kind: 'floor',
    frames: [0, 14, 16, 19, 23, 30],
    stop: 0.08,
    recovery: 'rebound',
    target: [
      [-18, 16, 76],
      [22, 12, 69],
      [40, 8, 0],
      [35, 10, 35],
    ],
    advance: [-6, -1, 12, 9],
    pitch: [-0.38, -0.08, 0.52, 0.18],
    twist: [0.16, 0.06, -0.18, -0.08],
    crouch: [-4, -1, 10, 4],
  },
  ram: {
    source: ['gem_beetle', 'tech_horn'],
    reference: 'mammoth-tusks',
    weapon: 'weaponTip',
    kind: 'body',
    frames: [0, 16, 18, 21, 26, 37],
    stop: 0.04,
    target: [
      [19, -7, 31],
      [24, -6, 27],
      [36, 1, 14],
      [38, 1, 12],
    ],
    advance: [-18, -12, 18, 23],
    pitch: [-0.25, -0.19, 0.24, 0.32],
    twist: [-0.22, -0.18, 0.16, 0.23],
    crouch: [5, 4, 0, -1],
  },
  slide: {
    source: ['penguin_marshal', 'tech_slide'],
    reference: 'puppeteer-cut',
    weapon: 'weaponTip',
    kind: 'floor',
    frames: [0, 21, 28, 31, 39, 53],
    stop: 0.04,
    target: [[5, 20, 49], [8, 20, 58], [39, 12, 0], [23, 14, 1]],
    advance: [-10, -4, 14, 18],
    pitch: [-0.13, 0.43, 1.23, 1.08],
    twist: [0.08, -0.1, -0.1, 0.05],
    crouch: [0, 3, 9, 8],
  },
  sweep: {
    source: ['coin_dragon', 'tech_claw'],
    reference: 'puppeteer-cut',
    weapon: 'weaponTip',
    kind: 'floor',
    frames: [0, 9, 10, 13, 16, 21],
    stop: 0.04,
    target: [
      [-2, 25, 33],
      [13, 29, 24],
      [31, -8, 0],
      [25, -20, 2],
    ],
    advance: [-14, -10, 14, 19],
    pitch: [-0.22, -0.1, 0.31, 0.45],
    twist: [0.82, 0.57, -0.64, -0.94],
    crouch: [-2, -1, 5, 8],
  },
  volley: {
    source: ['frost_yeti', 'tech_icicles'],
    reference: 'puppeteer-cut',
    weapon: 'weaponTip',
    kind: 'body',
    frames: [0, 19, 21, 24, 33, 47],
    stop: 0.04,
    target: [
      [25, -7, 13],
      [27, -2, 17],
      [31, 6, 35],
      [33, 7, 37],
    ],
    advance: [-17, -12, 17, 23],
    pitch: [0.46, 0.26, -0.35, -0.5],
    twist: [0.47, 0.29, -0.34, -0.43],
    crouch: [9, 6, -3, -4],
  },
  breath: {
    source: ['coin_dragon', 'tech_breath'],
    reference: 'guardian-strike',
    weapon: 'mouth',
    kind: 'air',
    frames: [0, 17, 20, 23, 31, 42],
    stop: 0.04,
    target: [
      [14, 9, 35],
      [18, 7, 30],
      [37, -4, 19],
      [40, -6, 17],
    ],
    advance: [-25, -19, 23, 30],
    pitch: [-0.4, -0.22, 0.34, 0.46],
    twist: [0.45, 0.25, -0.34, -0.55],
    crouch: [6, 3, -3, -4],
  },
  leap: {
    source: ['toad_shaman', 'tech_leap'],
    reference: 'mammoth-stomp',
    weapon: 'footL',
    kind: 'floor',
    frames: [0, 17, 24, 27, 33, 47],
    stop: 0.06,
    recovery: 'absorb',
    target: [
      [-10, -11, 2],
      [-24, -10, 14],
      [1, -13, 0],
      [1, -13, 0],
    ],
    advance: [-12, 0, 15, 15],
    pitch: [0.34, 0.05, 0.19, 0.38],
    twist: [0.21, -0.2, -0.3, -0.35],
    crouch: [15, -2, 3, 13],
    lift: [0, 27, 0, 0],
  },
  pillars: {
    source: ['crater_titan', 'tech_pillar'],
    reference: 'guardian-strike',
    weapon: 'weaponTip',
    kind: 'floor',
    frames: [0, 18, 20, 23, 34, 42],
    stop: 0.04,
    target: [
      [-7, 13, 43],
      [9, 15, 39],
      [27, 9, 0],
      [33, 11, 1],
    ],
    advance: [-22, -16, 20, 25],
    pitch: [-0.49, -0.32, 0.59, 0.68],
    twist: [0.43, 0.24, -0.38, -0.47],
    crouch: [-1, -2, 9, 12],
  },
  roar: {
    source: ['frost_yeti', 'tech_roar'],
    reference: 'mammoth-stomp',
    weapon: 'mouth',
    kind: 'air',
    frames: [0, 16, 19, 22, 28, 37],
    stop: 0.04,
    target: [
      [19, 5, 17],
      [21, 3, 20],
      [30, -3, 37],
      [33, -4, 40],
    ],
    advance: [-14, -11, 12, 18],
    pitch: [0.52, 0.28, -0.47, -0.61],
    twist: [0.3, 0.21, -0.29, -0.37],
    crouch: [9, 6, -4, -5],
  },
  summon: {
    source: ['silk_dragon', 'tech_kites'],
    reference: 'puppeteer-cut',
    weapon: 'handR',
    kind: 'air',
    frames: [0, 17, 18, 21, 31, 42],
    stop: 0.04,
    target: [
      [9, 14, 14],
      [16, 16, 18],
      [27, 20, 33],
      [30, 20, 36],
    ],
    advance: [-15, -10, 15, 19],
    pitch: [0.24, 0.17, -0.29, -0.35],
    twist: [-0.61, -0.48, 0.4, 0.66],
    crouch: [7, 5, -2, -3],
  },
  dive: {
    source: ['coin_dragon', 'tech_dive'],
    reference: 'mammoth-tusks',
    weapon: 'mouth',
    kind: 'body',
    frames: [0, 18, 19, 22, 34, 47],
    stop: 0.04,
    target: [
      [17, 4, 40],
      [23, 2, 34],
      [37, -1, 3],
      [40, -3, 24],
    ],
    advance: [-16, -11, 13, 27],
    pitch: [-0.49, -0.21, 0.77, -0.3],
    twist: [0.25, 0.14, -0.15, -0.26],
    crouch: [-3, -1, 9, -4],
  },
} satisfies Record<string, MoveTemplate>;
export type MoveId = keyof typeof moveTemplates;
export function templateFor(id: MoveId): MoveTemplate {
  return moveTemplates[id];
}

// The radial skeleton guides the selected arm's physical tip to the target.
const skySwimmerEffectors: Record<MoveId, string> = {
  overhead: 'tailTip', ram: 'snout', slide: 'finTipR', sweep: 'finTipR', volley: 'lamp',
  breath: 'blowhole', leap: 'tailTip', pillars: 'blowhole', roar: 'snout', summon: 'starKeel', dive: 'snout',
};
const arachnidEffectors: Record<MoveId, string> = {
  overhead: 'clawR', ram: 'clawR', slide: 'clawL', sweep: 'clawL', volley: 'sting',
  breath: 'sting', leap: 'footR0', pillars: 'footR0', roar: 'clawR', summon: 'sting', dive: 'sting',
};
const cephalopodEffectors: Record<MoveId, string> = {
  overhead: 'arm7', ram: 'arm0', slide: 'arm4', sweep: 'arm4', volley: 'arm1',
  breath: 'arm1', leap: 'arm5', pillars: 'arm2', roar: 'arm3', summon: 'arm0', dive: 'arm6',
};
export function weaponFor(body: BodyType, id: MoveId) {
  if (body === 'sky-swimmer') return skySwimmerEffectors[id];
  if (body === 'arachnid') return arachnidEffectors[id];
  if (body === 'cephalopod') return cephalopodEffectors[id];
  // A long flier lands its whip-like tail while the belly and fins remain airborne.
  if (id === 'leap' && body === 'long-flier') return 'tailTip';
  if (id === 'leap' && body === 'squat-mage') return 'handL';
  return templateFor(id).weapon;
}
