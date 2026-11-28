// Side-on fungo stance. Each coordinate gives a toe's position on the snow relative
// to its own idle print. The support toe stays in one place while the other crosses.
import { reach } from '../bodies/goals';
import { trk } from '../kit/f11-mobkit';
import type { JointPose } from '../technique';
import type { XY } from '../types';

const weightShift: [number, number][] = [
  [0, 0], [8, -32], [14, -42], [17, -42], [25, -25],
  [29, -12], [32, -14], [42, -14], [57, 0],
];
export function battingGround(t: number): XY {
  return [trk(t * 24, weightShift), 0];
}

type Step = [start: number, end: number, landing: number, clearance: number];
const leftFoot: Step[] = [[5, 12, -41, 8], [17, 24, -6, 9], [48, 55, 0, 5]];
const rightFoot: Step[] = [[0, 5, -38, 8], [12, 17, -48, 5], [24, 30, -28, 8], [42, 48, 0, 7]];

function toe(frame: number, steps: Step[]): XY {
  let from = 0;
  for (const [start, end, landing, clearance] of steps) {
    if (frame <= start) return [from, 0];
    if (frame < end) {
      const u = (frame - start) / (end - start);
      return [from + (landing - from) * u * u * (3 - 2 * u), clearance * Math.sin(Math.PI * u)];
    }
    from = landing;
  }
  return [from, 0];
}

export function battingPose(t: number, yaw: number, controls: JointPose): JointPose {
  const frame = t * 24, centre = battingGround(t)[0];
  function foot(sign: number, path: Step[]) {
    const [at, lift] = toe(frame, path);
    const x = (at - centre) / 1.23;
    return reach(sign < 0 ? 'footL' : 'footR', [7 + x * Math.cos(yaw), sign * 13 - x * Math.sin(yaw), lift]);
  }
  // After contact the hands travel around the torso and finish over the shoulder.
  const u = Math.max(0, Math.min(1, (frame - 34) / 7));
  const recovery = Math.sin(Math.PI * u);
  const carry = trk(frame, [[32, 0], [33, 12], [34, 16], [36, 7], [38, 0]]) / 1.23;
  return {
    ...controls, ...foot(-1, leftFoot), ...foot(1, rightFoot),
    clubForward: (controls.clubForward ?? 0) + carry * Math.cos(yaw),
    clubSide: (controls.clubSide ?? 0) - carry * Math.sin(yaw),
    clubLift: (controls.clubLift ?? 0) + 21 * recovery,
  };
}
