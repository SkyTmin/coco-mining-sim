import { reach } from '../bodies/goals';
import type { JointPose } from '../technique';

export type Score = [number, JointPose][];
const foot = (leg: string, x: number, y: number, z: number) => reach(leg, [x, y, z]);
const neck = (pitch: number, yaw = 0, chin = 0) => ({
  'neck.pitch': pitch,
  'head.yaw': yaw,
  'head.pitch': chin,
});
const ear = (earLift: number, lanternSwing: number) => ({ earLift, lanternSwing });
const doze = { sleep: 1, blink: 1 };
export const scores: Record<string, Score> = {
  idle: [
    [0, {}],
    [19, { ...neck(-0.08, 0.09), earLift: 0.17 }],
    [39, { ...neck(0.08, -0.18), lanternSwing: 0.19 }],
    [58, { ...neck(0.02, 0.13), earLift: 0.45 }],
    [65, { blink: 1 }],
    [71, {}],
  ],
  look: [
    [0, {}],
    [7, { earLift: 0.85 }],
    [15, { ...neck(-0.12, -0.88), twist: -0.16 }],
    [26, { ...neck(0.12, 0.82), earLift: -0.55 }],
    [35, {}],
  ],
  fidget_a: [
    [0, {}],
    [9, { ...neck(0.22, -0.3), earLift: 0.65 }],
    [20, { ...neck(0.63, -1.05, 0.17), twist: -0.21, roll: 0.12, lanternSwing: 0.4 }],
    [31, { ...neck(0.34, -0.72, -0.18), earLift: -0.38 }],
    [47, {}],
  ],
  fidget_b: [
    [0, {}],
    [8, { ...neck(-0.19, 0.27), earLift: 0.36 }],
    [19, { ...foot('foreR', 23, 9, 10), pitch: 0.16, ...neck(0.48, 0.24), earLift: -0.55 }],
    [29, { ...foot('foreR', 31, 8, 0), ...neck(0.49, 0.23), lean: 3, lanternSwing: 0.27 }],
    [47, {}],
  ],
  happy: [
    [0, {}],
    [4, { ...foot('foreR', 24, 8, 17), ...neck(-0.4, -0.33), roll: -0.23, ...ear(0.9, -0.5) }],
    [11, { ...foot('foreL', 23, -10, 17), ...neck(0.18, 0.54, -0.21), roll: 0.26, ...ear(0.55, 0.8) }],
    [18, { crouch: 6, pitch: 0.17, twist: -0.3, ...ear(-0.5, -0.35) }],
    [
      26,
      {
        jump: 19,
        lean: 4,
        pitch: -0.23,
        twist: 0.18,
        ...foot('foreR', 31, 8, 25),
        ...foot('hindL', -24, -7, 23),
        ...neck(-0.21, 0.27),
        ...ear(1, 0.72),
      },
    ],
    [32, { crouch: 5, pitch: 0.28, ...neck(0.24), maneLift: 1 }],
    [40, { ...foot('foreL', 18, -9, 10), ...neck(-0.19, -0.38), earLift: 0.8 }],
    [47, {}],
  ],
  trick: [
    [0, {}],
    [8, { ...neck(0.28, -0.57), crouch: 4, earLift: -0.6, lanternSwing: -0.7 }],
    [13, { ...neck(-0.16, 0.7), twist: 0.21, antlerFlex: 0.9, lanternSwing: 0.94 }],
    [17, { ...neck(0.15, -0.57), twist: -0.22, antlerFlex: -0.7, lanternSwing: -0.88 }],
    [23, { ...neck(-0.64, 0.12, -0.19), pitch: -0.19, earLift: 0.85, antlerFlex: 0.7 }],
    [35, { ...neck(0.13, -0.84, -0.33), roll: -0.09, earLift: 0.65 }],
    [47, { ...neck(0.37, -0.95, -0.19), crouch: 3, ...foot('foreR', 22, 8, 0) }],
    [
      57,
      {
        ...neck(0.81, 0.15, 0.26),
        pitch: 0.31,
        crouch: 5,
        lean: 3,
        ...foot('foreR', 27, 8, 0),
        maneLift: 0.58,
      },
    ],
    [66, { ...neck(0.2, 0.21, -0.26), earLift: 0.72 }],
    [73, { ...neck(-0.23, 0.08, -0.2), earLift: 0.85, blink: 0.36 }],
    [78, { ...neck(0.68, -0.25, 0.32), pitch: 0.25, crouch: 5, blink: 1, ...ear(-0.92, 1), maneLift: 1 }],
    [84, { ...neck(-0.28, 0.16), earLift: 0.78, antlerFlex: -0.58 }],
    [89, {}],
  ],
  sleep_in: [
    [0, {}],
    [9, { sleep: 0.15, ...neck(0.23), earLift: -0.43 }],
    [20, { sleep: 0.8, blink: 1 }],
    [29, doze],
  ],
  sleep_out: [
    [0, doze],
    [9, { sleep: 0.86, earLift: 0.51 }],
    [20, { sleep: 0.2, ...neck(-0.25), earLift: 0.7 }],
    [29, {}],
  ],
  wake_startled: [
    [0, doze],
    [4, { sleep: 0.66, ...neck(-0.18), earLift: 0.75 }],
    [10, { ...neck(-0.4, -0.25), earLift: 1 }],
    [16, { ...neck(0.16, 0.54), roll: 0.14, crouch: 4 }],
    [23, {}],
  ],
  hatch: [
    [0, {}],
    [9, { crouch: 3, ...neck(0.29), earLift: -0.5 }],
    [21, { ...neck(-0.4, 0.28), earLift: 0.93 }],
    [35, {}],
  ],
  tech_root_ring: [
    [0, {}],
    [
      18,
      {
        pitch: -0.48,
        lean: -9,
        ...neck(-0.28, -0.2),
        ...foot('foreR', -2, 19, 29),
        ...foot('foreL', 12, -8, 15),
      },
    ],
    [
      22,
      { pitch: -0.29, lean: -4, ...foot('foreR', 19, 15, 20), ...foot('foreL', 11, -7, 4), ...neck(-0.12) },
    ],
    [
      25,
      {
        crouch: 7,
        pitch: 0.39,
        lean: 8,
        ...neck(0.4, 0.17),
        ...foot('foreR', 43, 9, 0),
        ...foot('hindL', -20, -8, 0),
      },
    ],
    [31, { crouch: 2, pitch: 0.13, lean: 4, ...neck(-0.08, 0.27), ...foot('foreR', 29, 9, 12) }],
    [47, {}],
  ],
  tech_antler_sweep: [
    [0, {}],
    [
      18,
      { crouch: 6, lean: -7, pitch: 0.12, twist: -0.61, ...neck(-0.18, -1.23), ...foot('foreR', 8, 12, 0) },
    ],
    [21, { lean: 1, crouch: 4, twist: -0.3, ...neck(0.3, -0.5), ...foot('foreL', 24, -11, 0) }],
    [
      24,
      {
        lean: 9,
        crouch: 6,
        pitch: 0.27,
        twist: 0.46,
        ...neck(0.22, 0.93, 0.34),
        ...foot('foreL', 27, -10, 0),
        ...foot('foreR', 25, 12, 0),
      },
    ],
    [
      30,
      {
        lean: 11,
        crouch: 6,
        pitch: 0.34,
        twist: 0.63,
        ...neck(0.1, 1.78, 0.62),
        ...foot('foreL', 27, -10, 0),
        ...foot('foreR', 25, 12, 0),
      },
    ],
    [47, {}],
  ],
  tech_firefly: [
    [0, {}],
    [18, { lean: -6, crouch: 8, pitch: 0.27, twist: -0.27, ...neck(0.8, -0.44, 0.26), earLift: -0.6 }],
    [22, { lean: 1, crouch: 3, ...neck(0.16, -0.24), ...foot('foreR', 23, 8, 6) }],
    [
      25,
      {
        lean: 6,
        pitch: -0.33,
        twist: 0.25,
        ...neck(-0.54, 0.28, -0.29),
        ...foot('foreR', 26, 8, 15),
        earLift: 0.86,
      },
    ],
    [
      31,
      {
        lean: 8,
        pitch: -0.41,
        twist: 0.37,
        ...neck(-0.61, 0.42, -0.38),
        ...foot('foreR', 28, 8, 16),
        lanternSwing: 0.72,
      },
    ],
    [47, {}],
  ],
};
