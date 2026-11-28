import type { JointPose } from '../technique';
import { reach } from '../bodies/goals';

export type MeadowKey = readonly [frame: number, pose: JointPose];

/** Frame numbers in the drawing and pose registration use the same 24 Hz clock. */
export function sampleMeadowKeys(
  keys: readonly MeadowKey[],
  t: number,
  interpolate: boolean,
): JointPose {
  const frame = t * 24,
    index = keys.findIndex(([at]) => frame <= at + 1e-8);
  if (index < 0) return keys[keys.length - 1][1];
  const [end, to] = keys[index];
  if (index === 0 || Math.abs(end - frame) < 1e-8) return to;
  const [start, from] = keys[index - 1];
  if (!interpolate) return from;
  const u = (frame - start) / (end - start),
    ease = u * u * (3 - 2 * u);
  const result: JointPose = {};
  for (const channel of new Set([...Object.keys(from), ...Object.keys(to)])) {
    result[channel] = (from[channel] ?? 0) * (1 - ease) + (to[channel] ?? 0) * ease;
  }
  return result;
}

export const trickFrames = [0, 12, 22, 29, 36, 59];
const trickSupports = {
  ...reach('foreR', [10.16, 11.88, 2.3]),
  ...reach('foreL', [16.96, -6.18, 2.3]),
  ...reach('hindR', [-18.96, 11.88, 2.3]),
  ...reach('hindL', [-12.16, -6.18, 2.3]),
};
// The lower knees take the returning pebble before the shell rolls it into its hollow.
export const trick: readonly MeadowKey[] = [
  [0, {}],
  [
    12,
    {
      ...trickSupports,
      pitch: 0.13,
      crouch: 2.3,
      'head.pitch': -0.28,
      reach: -0.5,
      'rock.grip': 1,
      'rock.turn': 0.8,
      'tree.pitch': -0.12,
    },
  ],
  [
    22,
    {
      ...trickSupports,
      pitch: -0.035,
      lift: 0.45,
      'head.pitch': -0.81,
      reach: 2.3,
      'rock.grip': 1,
      'rock.turn': 1.3,
      'tree.pitch': 0.11,
    },
  ],
  [
    29,
    {
      ...trickSupports,
      pitch: -0.05,
      reach: 2.0,
      'head.pitch': -0.7,
      'rock.turn': 2.0,
      'tree.pitch': 0.13,
    },
  ],
  [
    36,
    {
      ...trickSupports,
      pitch: 0.08,
      crouch: 1.7,
      'head.pitch': -0.18,
      'rock.forward': -6.2,
      'rock.side': -0.6,
      'rock.up': 2.9,
      'rock.turn': 2.55,
      'eye.joy': 0.9,
      'tree.pitch': 0.28,
    },
  ],
  [59, {}],
];

export function meadowTrickPose(t: number): JointPose {
  return { ...sampleMeadowKeys(trick, t, true), 'rock.frame': t * 24 };
}
