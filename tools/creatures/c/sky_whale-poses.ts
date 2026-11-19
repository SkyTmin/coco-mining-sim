import { reach } from '../bodies/goals';
import { everyday } from '../rig/figure';
import type { JointPose } from '../technique';
export const clips = {
  ...everyday,
  happy: { seconds: 2 },
  trick: { seconds: 5.5 },
  show: { seconds: 5.5 },
  hatch: { seconds: 2 },
  phase: { seconds: 2 },
  'idle-f2': { seconds: 3, loop: true },
  fidget_a: { seconds: 2 },
  fidget_b: { seconds: 2 },
  sleep: { seconds: 3.5, loop: true },
  sleep_in: { seconds: 1.25 },
  sleep_out: { seconds: 1.25 },
  wake_startled: { seconds: 1 },
};
const tracks: Record<string, [number, JointPose][]> = {
  idle: [
    [0, {}],
    [16, { inflate: 0.22, finBeatR: 0.13 }],
    [37, { tailBeat: 0.18, beamTurn: 0.19 }],
    [58, { finBeatL: -0.22, roll: 0.04 }],
    [71, {}],
  ],
  look: [
    [0, {}],
    [7, { inflate: 0.18, beamPower: 0.35 }],
    [17, { yaw: -0.29, roll: 0.14, finSpread: 0.31 }],
    [25, { yaw: 0.24, tailSweep: -0.24, beamTurn: 0.5 }],
    [35, {}],
  ],
  fidget_a: [
    [0, {}],
    [10, { finBeatR: 0.52, roll: -0.11 }],
    [22, { finBeatR: 0.86, jaw: 0.38, roll: -0.18, finBeatL: -0.28 }],
    [32, { finBeatR: 0.53, tailSweep: 0.47 }],
    [47, {}],
  ],
  fidget_b: [
    [0, {}],
    [10, { inflate: 0.43, beamTurn: -0.6 }],
    [20, { roll: 0.14, finBeatL: 0.56, beamTurn: -1.2, beamPower: 0.75 }],
    [30, { yaw: -0.2, tailBeat: -0.42, beamTurn: 0.42 }],
    [47, {}],
  ],
  sleep_in: [
    [0, {}],
    [8, { sleep: 0.2, finBeatR: -0.25 }],
    [17, { sleep: 0.63, jaw: 0.25 }],
    [24, { sleep: 1 }],
    [29, { sleep: 1 }],
  ],
  sleep_out: [
    [0, { sleep: 1 }],
    [8, { sleep: 0.74 }],
    [18, { sleep: 0.26, finSpread: 0.33, inflate: 0.36 }],
    [24, { beamTurn: 0.25 }],
    [29, {}],
  ],
  wake_startled: [
    [0, { sleep: 1 }],
    [4, { sleep: 0.62, beamPower: 0.7 }],
    [10, { lift: 4, pitch: -0.11, finSpread: 0.75, tailBeat: 0.67, jaw: 0.4 }],
    [17, { roll: -0.08, beamTurn: 0.42 }],
    [23, {}],
  ],
  phase: [
    [0, { phase: 0 }],
    [8, { phase: 0.05, pitch: 0.12, finBeatR: -0.32, beamPower: 0.08 }],
    [16, { phase: 0.28, inflate: 0.58, beamTurn: -0.72, finSpread: 0.51 }],
    [25, { phase: 0.62, pitch: -0.14, beamPower: 1, beamTurn: 1.37, finBeatR: 0.59 }],
    [36, { phase: 0.92, glow: 0.84, beamTurn: 2.83, finBeatL: 0.44 }],
    [47, { phase: 1 }],
  ],
  'idle-f2': [
    [0, { phase: 1 }],
    [18, { phase: 1, finBeatR: 0.17, inflate: 0.28 }],
    [39, { phase: 1, roll: 0.04, tailBeat: 0.21 }],
    [59, { phase: 1, finBeatL: -0.16 }],
    [71, { phase: 1 }],
  ],
  happy: [
    [0, {}],
    [4, { finBeatR: 0.75, finBeatL: -0.38, roll: 0.17, beamPower: 0.8, tailBeat: 0.44 }],
    [9, { finBeatR: 0.96, roll: 0.27, tailSweep: 0.68, beamTurn: 0.62, finSpread: 0.48 }],
    [17, { roll: -0.19, tailBeat: -0.63, pitch: -0.15, jaw: 0.61, finBeatL: 0.9, finSpread: 0.73 }],
    [24, { roll: 0.16, dx: 6, tailBeat: 0.7, finBeatR: 0.8, glow: 0.73 }],
    [32, { roll: -0.19, finBeatL: 0.7, tailSweep: -0.41, beamPower: 0.81 }],
    [39, { pitch: 0.12, tailBeat: 0.3 }],
    [47, {}],
  ],
  show: [
    [0, { showReveal: 0 }],
    [12, { showReveal: 0, dx: -2, cloudDark: 0.04 }],
    [24, { showReveal: 0, cloudDark: 0.25 }],
    [37, { showReveal: 0, cloudDark: 1, sparks: 0.58 }],
    [47, { showReveal: 0.025, cloudDark: 0.96, sparks: 1, dx: -12 }],
    [57, { showReveal: 0.23, dx: -12, pitch: -0.12, finSpread: 0.25, beamPower: 0.18 }],
    [70, { showReveal: 0.6, dx: -7, roll: -0.14, pitch: -0.13, finSpread: 0.63, finBeatR: 0.52 }],
    [85, { showReveal: 1, lift: 3, finSpread: 0.76, beamPower: 0.63, pitch: -0.08 }],
    [96, { showReveal: 1, beamPower: 1, glow: 0.85, finBeatR: 0.6, finBeatL: -0.23, roll: 0.08 }],
    [
      108,
      {
        showReveal: 1,
        phase: 0.53,
        beamPower: 1,
        finSpread: 0.65,
        finBeatR: 0.45,
        finBeatL: -0.2,
        roll: 0.06,
      },
    ],
    [
      131,
      {
        showReveal: 1,
        phase: 0.53,
        beamPower: 1,
        finSpread: 0.65,
        finBeatR: 0.45,
        finBeatL: -0.2,
        roll: 0.06,
      },
    ],
  ],
  hatch: [
    [
      0,
      {
        showReveal: 0.14,
        sx: 0.65,
        sy: 0.56,
        cloudDark: 0.14,
        finBeatR: -0.39,
        finBeatL: -0.44,
        tailBeat: 0.4,
      },
    ],
    [8, { showReveal: 0.22, sx: 0.72, sy: 0.62, beamPower: 0.12, finSpread: 0.19 }],
    [16, { showReveal: 0.52, sx: 0.85, sy: 0.79, pitch: -0.13, jaw: 0.39, inflate: 0.47 }],
    [25, { showReveal: 0.9, sx: 0.97, sy: 0.95, lift: 4, finSpread: 0.72, tailBeat: -0.58, beamPower: 0.75 }],
    [32, { showReveal: 1, sx: 1, sy: 1, lift: 2, finBeatR: 0.54, finBeatL: 0.52, beamPower: 0.95 }],
    [41, { showReveal: 1, sx: 1, sy: 1, finSpread: 0.2, beamPower: 0.6 }],
    [47, { showReveal: 1, sx: 1, sy: 1 }],
  ],
  trick: [
    [0, {}],
    [12, { pitch: 0.15, tailBeat: 0.39, jaw: 0.4 }],
    [24, { pitch: -0.23, finBeatR: 0.77, finBeatL: 0.46, beamTurn: -1, dx: -7 }],
    [
      39,
      {
        cloudMorph: 0.55,
        lift: 3,
        roll: 0.28,
        tailBeat: 0.62,
        beamPower: 0.88,
        pitch: -0.22,
        ...reach('finTipR', [0, 33, 51]),
        ...reach('finTipL', [8, -32, 43]),
      },
    ],
    [
      51,
      {
        cloudMorph: 1,
        lift: 3,
        pitch: -0.36,
        finBeatR: 0.92,
        tailSweep: 0.62,
        roll: 0.48,
        tailBeat: -0.42,
        ...reach('finTipR', [-6, 38, 62]),
        ...reach('finTipL', [18, -33, 54]),
      },
    ],
    [
      66,
      {
        cloudMorph: 1,
        lift: 3,
        pitch: -0.47,
        finBeatR: 0.98,
        finSpread: 0.91,
        beamTurn: 1.4,
        roll: 0.7,
        tailBeat: -0.85,
        ...reach('finTipR', [-12, 38, 74]),
        ...reach('finTipL', [27, -34, 71]),
      },
    ],
    [
      78,
      {
        cloudMorph: 0.97,
        pitch: -0.38,
        finBeatR: 0.78,
        beamTurn: 2.6,
        lift: 3,
        roll: 0.52,
        tailBeat: -0.65,
        ...reach('finTipR', [-4, 39, 65]),
        ...reach('finTipL', [21, -31, 61]),
      },
    ],
    [
      92,
      {
        cloudMorph: 0.6,
        roll: -0.28,
        finBeatL: 0.75,
        tailBeat: 0.62,
        pitch: -0.11,
        lift: 3,
        ...reach('finTipR', [-3, 34, 37]),
        ...reach('finTipL', [4, -28, 38]),
      },
    ],
    [107, { cloudMorph: 0.12, beamPower: 1, finBeatL: 0.75, finBeatR: 0.55 }],
    [119, { pitch: 0.19, tailBeat: 0.63, beamPower: 0.43 }],
    [131, {}],
  ],
};
export function gesture(anim: string, t: number): JointPose {
  if (anim === 'sleep') return { sleep: 1 };
  const keys = tracks[anim];
  if (!keys) return {};
  const n = t * 24,
    i = keys.findIndex(([frame]) => frame >= n - 1e-8);
  if (i <= 0) return keys[i === 0 ? 0 : keys.length - 1][1];
  const [start, a] = keys[i - 1],
    [end, b] = keys[i],
    u = Math.min(1, (n - start) / (end - start)),
    s = u * u * (3 - 2 * u);
  const result: JointPose = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    result[k] = (a[k] ?? 0) * (1 - s) + (b[k] ?? 0) * s;
  }
  return result;
}
