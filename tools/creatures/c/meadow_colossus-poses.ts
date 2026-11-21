import type { Animation } from '../types';
import type { JointPose } from '../technique';
import { meadowTrickPose, trickFrames } from './meadow_colossus-actions';
import { meadowTurnBearing, meadowWalkPose, meadowWalkTiming } from './meadow_colossus-walk';
import { meadowGesturePose, meadowGestureTiming } from './meadow_colossus-gestures';
import book, { meadowTravel } from './meadow_colossus-keys';

const walk: Animation = { seconds: 1, loop: true };
export const meadowAnimations: Record<string, Animation> = {
  idle: { seconds: 3.5, loop: true },
  walk,
  ...Object.fromEntries(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].map((d) => ['walk_' + d, walk])),
  fidget_a: { seconds: 2 },
  fidget_b: { seconds: 2 },
  look: { seconds: 1.5 },
  happy: { seconds: 2 },
  trick: { seconds: 2.5 },
  sleep_in: { seconds: 1.25 },
  sleep: { seconds: 3.5, loop: true },
  sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
  turn: {
    seconds: 4,
    loop: true,
    bearings: Array.from({ length: 96 }, (_, frame) => meadowTurnBearing(frame / 24)),
  },
  hatch: { seconds: 1.5 },
  tired: { seconds: 1.5 },
  ...Object.fromEntries(
    Object.entries(book).map(([name, spec]) => [
      name,
      {
        seconds: spec.seconds!,
        groundOffset: (t: number, side: number) => meadowTravel(spec, t, side),
      },
    ]),
  ),
};
export const meadowTiming = {
  ...meadowWalkTiming,
  ...meadowGestureTiming,
  trick: trickFrames,
  ...Object.fromEntries(
    Object.entries(book).map(([name, spec]) => [name, spec.keys.map((key) => key.frame)]),
  ),
};
export function meadowPose(anim: string, t: number, side: number): JointPose {
  if (anim === 'trick') return meadowTrickPose(t);
  return meadowWalkPose(anim, t, side) ?? meadowGesturePose(anim, t, side) ?? {};
}
