// Cartesian landmarks transferred from the registered drawings, in the actor's forward/right/up frame.
import { aim, goalAt, look, reach } from '../bodies/goals';
import { aimedBipedKey } from '../bodies/armed-keys';
import type { V3 } from '../rig/f15-rig';
import type { JointPose } from '../technique';

export const slamPoses: Record<number, JointPose> = {
  8: {
    ...reach('footR', [0.08, 13.84, 0]),
    ...reach('footL', [6.13, -14.21, 0]),
    ...aim('weaponTip', [53.99, -16.88, 112.19]),
    solveGrips: 1,
    ...look('head', [96, -16, 64]),
    crouch: -6.066, hip: 2.035, lean: -11.579, pitch: -0.12,
    twist: 0.12, stride: 4, clubAngle: 0.383, clubYaw: 0.383, neckForward: 6, neckLift: 4,
  },
  14: {
    ...reach('footR', [0.87, 15.25, 1]),
    ...reach('footL', [6.74, -15.31, 0]),
    ...aim('weaponTip', [24.53, 53.17, 120.41]),
    solveGrips: 1,
    ...look('head', [96, -16, 64]),
    crouch: -7.409, hip: 2.771, lean: -12.3, pitch: -0.141,
    twist: 0.27, stride: 6, heel: 1, clubAngle: -0.36, clubYaw: 2.487, neckForward: 4, neckLift: 2,
  },
  // The club crosses the crown before its downhill arc, with both hands still raised.
  15: {
    ...reach('footR', [.35, 16.17, 1]), ...reach('footL', [7.16, -16.05, 0]),
    ...aim('weaponTip', [-6.17, -15.39, 97.59]), ...look('head', [96, -16, 64]),
    solveGrips: 1, crouch: -5.23, hip: 2.05, lean: -8.51, pitch: -.15,
    twist: .06, stride: 6, heel: 1, clubAngle: -.843, clubYaw: -1.496, neckForward: 5, neckLift: 3,
  },
  16: {
    ...reach('footR', [-0.16, 17.09, 1]),
    ...reach('footL', [7.57, -16.78, 0]),
    ...aim('weaponTip', [-18.63, -70.15, 57.69]),
    solveGrips: 1,
    ...look('head', [96, -16, 64]),
    crouch: -3.053, hip: 1.337, lean: -4.717, pitch: -0.152,
    twist: -0.15, stride: 6, heel: 1, clubAngle: -0.67, clubYaw: -0.978, neckForward: 6, neckLift: 4,
  },
  19: {
    ...reach('footR', [4.88, 17.98, 5]),
    ...reach('footL', [7.56, -15.34, 0]),
    ...aim('weaponTip', [32.31, -58.05, 0], 19),
    solveGrips: 1,
    ...look('head', [96, -16, 64]),
    crouch: 5.405, hip: 5.937, lean: -8.367, pitch: 0.451,
    twist: -0.29, stride: 9, heel: 5, clubAngle: -1.325, clubYaw: -0.636, neckForward: 6, neckLift: 4,
  },
  23: {
    ...reach('footR', [2.26, 16.99, 3]),
    ...reach('footL', [7.56, -15.34, 0]),
    ...aim('weaponTip', [54.37, -40.85, 87.16]),
    solveGrips: 1,
    ...look('head', [96, -16, 64]),
    crouch: -4.001, hip: 4.242, lean: -8.312, pitch: -0.064,
    twist: -0.12, stride: 6, heel: 3, clubAngle: 0.14, clubYaw: 0.695, neckForward: 4, neckLift: 2,
  },
};

export const snowballPoses: Record<number, JointPose> = {
  8: {
    ...reach('footR', [-3.61, 13.22, 0]),
    ...reach('footL', [6.34, -17.47, 0]),
    ...aim('weaponTip', [1.7, -6.05, 93.7]),
    ...reach('handL', [29.48, -34.97, 8.92]),
    solveGrips: 1,
    ...look('head', [96, -16, 64]),
    crouch: 9.414, hip: 5.442, lean: -10.989, pitch: 0.437,
    twist: 0.12, stride: 2, clubAngle: 0.031, clubYaw: -0.537, neckForward: 6, neckLift: 4,
  },
  16: {
    ...reach('footR', [-1.77, 14.26, 0]),
    ...reach('footL', [4.28, -13.79, 0]),
    ...aim('weaponTip', [0.42, 1.94, 95.72]),
    ...reach('handL', [19.02, -28.58, 21.65]),
    solveGrips: 1,
    ...look('head', [96, -16, 64]),
    crouch: 4.89, hip: 2.806, lean: -8.016, pitch: 0.239,
    twist: -0.1, stride: 2, clubAngle: 0.075, clubYaw: -0.647, neckForward: 6, neckLift: 4,
  },
  25: {
    ...reach('footR', [0.64, 18.5, 2]),
    ...reach('footL', [9.01, -17.91, 0]),
    ...aim('weaponTip', [23.86, 50.87, 118.16]),
    solveGrips: 1,
    ...look('head', [96, -16, 64]),
    crouch: 3.176, hip: 3.614, lean: -12.162, pitch: -0.035,
    twist: 0.42, stride: 7, heel: 2, clubAngle: 0.371, clubYaw: 2.496, neckForward: 4, neckLift: 2,
  },
  29: {
    ...reach('footR', [-3.91, 22.24, 3]),
    ...reach('footL', [11.27, -19.06, 0]),
    ...aim('weaponTip', [-23.14, 44.84, 24.29]),
    solveGrips: 1,
    ...look('head', [96, -16, 64]),
    crouch: -5.508, hip: 4.756, lean: -11.692, pitch: -0.062,
    twist: 0.32, stride: 11, heel: 3, clubAngle: -0.951, clubYaw: 3.555, neckForward: 4, neckLift: 2,
  },
  32: {
    ...reach('footR', [0.76, 22.44, 5]),
    ...reach('footL', [10.86, -19.78, 0]),
    ...aim('weaponTip', [32.86, -49.7, 35.36], 32),
    solveGrips: 1,
    ...look('head', [96, -16, 64]),
    crouch: -2.069, hip: 4.901, lean: -0.193, pitch: -0.023,
    twist: -0.65, stride: 11, heel: 5, clubAngle: -1.235, clubYaw: 5.498, neckForward: 6, neckLift: 4,
  },
  42: {
    ...reach('footR', [0.3, 24.6, 7]),
    ...reach('footL', [11.47, -19.43, 0]),
    ...aim('weaponTip', [25.37, 68.15, 103.35]),
    solveGrips: 1,
    ...look('head', [96, -16, 64]),
    crouch: -5.609, hip: 4.426, lean: 0.495, pitch: -0.311,
    twist: -0.8, stride: 11, heel: 7, clubAngle: -0.356, clubYaw: 2.591, neckForward: 4, neckLift: 2,
  },
};

// Carry the barrel over the crown through the drawn extremes and the high guide.
// A quadratic through all three positions avoids steering the middle of the arc through the face.
export function overheadCrown(frame: number, controls: JointPose, yaw: number, length: number) {
  const u = (frame - 14) / 2, a = goalAt(slamPoses[14], 'weaponTip')!,
    top = goalAt(slamPoses[15], 'weaponTip')!, b = goalAt(slamPoses[16], 'weaponTip')!;
  const target = a.map((x, i) => (1 - u) * x + u * b[i] + 4 * u * (1 - u) * (top[i] - (x + b[i]) / 2)) as V3;
  return aimedBipedKey('tech_slam', {
    frame, role: 'strike', pose: { ...controls, clubForward: 0, clubSide: 0, clubLift: 0, ...aim('weaponTip', target) },
  }, yaw, length);
}
