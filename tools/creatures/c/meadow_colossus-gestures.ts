import { reach } from '../bodies/goals';
import type { JointPose } from '../technique';
import { sampleMeadowKeys, type MeadowKey } from './meadow_colossus-actions';
import { meadowStagger } from './meadow_colossus-stance';

type Foot = 'foreR' | 'foreL' | 'hindR' | 'hindL';

// Four floor sites belong to the painting, so a nod or the rolling weight of
// the hillside cannot drag a planted ankle with the shell.
function footAt(foot: Foot, stride = 0, width = 0, up = 0): JointPose {
  const side = foot.endsWith('R') ? 1 : -1;
  const [forward, right] = meadowStagger(side);
  const x = foot.startsWith('fore') ? 13.56 : -15.56;
  return reach(foot, [x + forward + stride, side * 10.78 + right + width, 2.82 + up]);
}
const stance: JointPose = {
  ...footAt('foreR'),
  ...footAt('foreL'),
  ...footAt('hindR'),
  ...footAt('hindL'),
};
const rest: JointPose = {};
const asleep: JointPose = {
  'eye.close': 1,
  'leg.tuck': 0.14,
  'neck.tuck': 0.15,
  'head.pitch': 0.075,
  'tree.pitch': 0.037,
  crouch: 0.95,
};
const settling: JointPose = {
  ...asleep,
  'leg.tuck': 0.32,
  'neck.tuck': 0.3,
  'head.pitch': 0.15,
  'tree.pitch': 0.11,
  crouch: 2.7,
};
const sleepingBreath: JointPose = {
  ...asleep,
  'leg.tuck': 0.62,
  'neck.tuck': 0.49,
  'head.pitch': 0.18,
  'tree.pitch': 0.185,
  crouch: 5.5,
};

const keys: Record<string, readonly MeadowKey[]> = {
  idle: [
    [0, rest],
    [22, { ...stance, crouch: 0.78, 'head.pitch': 0.13, 'neck.tuck': 0.08 }],
    [44, { ...stance, lift: 0.34, roll: 0.07, lean: 0.45, 'head.pitch': -0.028 }],
    [63, { ...stance, 'eye.close': 1, 'head.pitch': 0.042 }],
    [69, { ...stance, 'eye.close': 0.15 }],
    [83, rest],
  ],
  fidget_a: [
    [0, rest],
    [14, { ...stance, reach: 2.8, 'head.pitch': -0.36, 'brow.up': 0.3 }],
    [
      28,
      {
        ...stance,
        reach: 11.8,
        'neck.lift': 3.9,
        'head.pitch': -0.8,
        lean: 0.8,
        'head.yaw': -0.07,
        'tail.pitch': -0.11,
      },
    ],
    [47, rest],
  ],
  fidget_b: [
    [0, rest],
    [
      14,
      {
        ...stance,
        lean: 1,
        crouch: 0.6,
        'head.pitch': 0.48,
        'neck.lift': -7.15,
        ...reach('mouth', [32, 1.1, 1.2]),
        'jaw.open': 0.28,
      },
    ],
    [28, { ...stance, reach: 1.4, 'head.pitch': 0.1, 'jaw.open': 0.42, 'neck.tuck': 0.06 }],
    [35, { ...stance, 'head.pitch': 0.06, 'jaw.open': 0.08 }],
    [47, rest],
  ],
  look: [
    [0, rest],
    [12, { ...stance, reach: 2.6, 'head.yaw': 0.18, 'head.pitch': -0.07 }],
    [22, { ...stance, reach: 3.7, 'head.yaw': 0.66, 'head.pitch': -0.13, 'brow.up': 0.5 }],
    [35, rest],
  ],
  happy: [
    [0, rest],
    [4, { ...stance, crouch: 2.3, 'head.pitch': 0.19, 'tree.pitch': -0.07 }],
    [
      9,
      {
        ...stance,
        ...footAt('foreL', 2.5, 0, 6.6),
        roll: 0.09,
        reach: 2.4,
        'head.pitch': -0.43,
        'tree.roll': -0.16,
      },
    ],
    [
      17,
      {
        ...stance,
        ...footAt('foreR', 0.6, 0, 1.2),
        crouch: 0.55,
        'head.pitch': -0.41,
        'tree.roll': 0.11,
        'flower.bloom': 0.4,
      },
    ],
    [
      25,
      {
        ...stance,
        ...footAt('foreR', 4.4, 1.2, 8.4),
        roll: -0.12,
        pitch: -0.05,
        reach: 3.7,
        'neck.lift': 2.8,
        'head.pitch': -0.58,
        'eye.joy': 1,
        'tree.roll': 0.21,
        'tree.pitch': -0.1,
        'flower.bloom': 1,
      },
    ],
    [
      36,
      {
        ...stance,
        crouch: 2.1,
        lean: 0.45,
        'head.pitch': 0.12,
        'eye.close': 0.94,
        'tree.roll': -0.13,
        'flower.bloom': 0.8,
      },
    ],
    [47, rest],
  ],
  sleep_in: [
    [0, rest],
    [6, { ...stance, reach: 2.5, 'head.pitch': -0.12, 'jaw.open': 1, 'eye.close': 0.33 }],
    [
      14,
      {
        ...stance,
        crouch: 1.5,
        'jaw.open': 0.14,
        'eye.close': 0.73,
        'neck.tuck': 0.23,
        'leg.tuck': 0.12,
        'tree.pitch': 0.055,
      },
    ],
    [25, settling],
    [29, asleep],
  ],
  sleep: [
    [0, asleep],
    [42, sleepingBreath],
    [83, asleep],
  ],
  sleep_out: [
    [0, asleep],
    [6, { ...stance, crouch: 0.75, 'neck.tuck': 0.07, 'tree.pitch': 0.045, 'eye.close': 0.25 }],
    [
      16,
      {
        ...stance,
        ...footAt('foreR', 4.6),
        reach: 4.3,
        'head.pitch': -0.58,
        lean: 0.5,
        'tree.pitch': -0.061,
      },
    ],
    [29, rest],
  ],
  wake_startled: [
    [0, asleep],
    [
      5,
      {
        ...stance,
        ...footAt('foreR', 1.5, 0, 6.3),
        ...footAt('foreL', 2, 0, 5.8),
        lift: 2.8,
        pitch: -0.085,
        reach: 3.2,
        'neck.lift': 1.6,
        'head.pitch': -0.31,
        'tree.pitch': -0.18,
        'brow.up': 1,
      },
    ],
    [
      13,
      {
        ...stance,
        crouch: 1.65,
        'head.yaw': 0.48,
        'head.pitch': -0.04,
        'tree.pitch': 0.18,
        'brow.up': 0.7,
      },
    ],
    [23, rest],
  ],
};

export const meadowGestureTiming: Record<string, number[]> = {
  idle: [0, 22, 44, 63],
  fidget_a: [0, 14, 28, 47],
  fidget_b: [0, 14, 28, 47],
  look: [0, 12, 22, 35],
  happy: [0, 9, 17, 25, 36, 47],
  sleep_in: [0, 6, 14, 25],
  sleep: [0, 42],
  sleep_out: [0, 6, 16, 29],
  wake_startled: [0, 5, 13, 23],
};

export function meadowGesturePose(anim: string, t: number, _side: number): JointPose | undefined {
  const rows = keys[anim];
  return rows && sampleMeadowKeys(rows, t, true);
}
