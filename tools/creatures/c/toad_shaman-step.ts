import { trk, type Key } from '../kit/f11-mobkit';
import type { XY } from '../types';
const staffSteps: Key[] = [
  [0, 0],
  [8, -13],
  [15, -26],
  [17, -4],
  [20, 25],
  [25, 25],
  [33, 0],
  [40, 0],
];
const leapSteps: Key[] = [
  [0, 0],
  [17, 0],
  [23, 28],
  [27, 46],
  [35, 46],
  [42, 16],
  [47, 0],
];
export function groundStep(anim: string, t: number, side: number): XY {
  const distance = trk(t * 24, anim === 'tech_staff' ? staffSteps : leapSteps);
  const angle = (side * Math.PI) / 8;
  return [distance * Math.cos(angle), 0.6 * distance * Math.sin(angle)];
}

type Step = readonly [frame: number, x: number, y: number];
// Positions on the stage floor. Repeated positions are real planted intervals; only the
// other web moves. Subtract the body's advance before converting the toe to rig space.
const staffL: Step[] = [
  [0, 58, 0],
  [8, 58, 0],
  [15, 39, 0],
  [17, 39, 0],
  [20, 79, -3],
  [25, 79, -3],
  [29, 79, -3],
  [33, 55, -1],
  [36, 55, -1],
  [40, 48.7, -2.91],
];
const staffR: Step[] = [
  [0, -61, -2],
  [8, -80, 1],
  [15, -80, 1],
  [17, -41, 1],
  [20, -41, 1],
  [25, -41, 1],
  [29, -54, 0],
  [33, -54, 0],
  [36, -40.32, 16.64],
  [40, -40.32, 16.64],
];
// After the landing, the folded hind legs walk back in two steps before the loop seam.
const leapL: Step[] = [
  [33, 116, -4],
  [37, 116, -4],
  [42, 85, 0],
  [45, 85, 0],
  [47, 49, -4],
];
const leapR: Step[] = [
  [33, -29, -4],
  [37, -47, -2],
  [42, -47, -2],
  [45, -40.32, 16.64],
  [47, -40.32, 16.64],
];
export function plantedStep(anim: string, t: number, sign: number) {
  const staff = anim === 'tech_staff',
    n = t * 24;
  if (staff ? n > 40 : n < 33) return undefined;
  const path = staff ? (sign < 0 ? staffL : staffR) : sign < 0 ? leapL : leapR;
  const i = path.findIndex((step) => step[0] >= n - 1e-8);
  if (i < 0) return undefined;
  const a = path[Math.max(0, i - 1)],
    b = path[i],
    u = i === 0 ? 0 : Math.min(1, Math.max(0, (n - a[0]) / (b[0] - a[0])));
  const blend = u * u * (3 - 2 * u),
    planted = a[1] === b[1] && a[2] === b[2];
  const advance = groundStep(anim, t, 0)[0];
  const x = (a[1] + blend * (b[1] - a[1]) - advance) / (1.11 * 1.22);
  const y = (a[2] + blend * (b[2] - a[2])) / (0.6 * 1.11 * 1.22);
  const z = 1 + (planted ? 0 : 5 * Math.sin(Math.PI * u));
  const c = Math.cos(1.22),
    s = Math.sin(1.22);
  return {
    target: [c * x + s * y, -s * x + c * y, z] as [number, number, number],
    planted: planted || u === 0 || u === 1,
  };
}
