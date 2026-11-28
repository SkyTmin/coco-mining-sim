import { reach } from '../bodies/goals';
import { readCreatureCard } from '../bodies/card-data';
import { sixPoses, type TechniqueBook } from '../technique';
const book: TechniqueBook = {};
const moves = readCreatureCard('herald_griffin').moves;
book.tech_great_seal = {
  ...moves.find((m) => m.id === 'tech_great_seal')!,
  contactKind: 'floor',
  seconds: 2.5,
  shake: 0.56,
  stop: 1 / 24,
  floorSocket: 'stampGround',
  recovery: 'rebound',
  pathKeys: [
    { role: 'prep', frame: 10, pose: { bagOpen: 1, 'head.yaw': 0.71, ...reach('foreR', [14, 21, 24]) } },
    {
      role: 'prep',
      frame: 29,
      pose: {
        lean: -5,
        dx: -13,
        pitch: -0.3,
        wingSpread: 0.5,
        bagOpen: 0.61,
        ...reach('stamp', [-7, 22, 54]),
        ...reach('foreR', [-5, 22, 56]),
      },
    },
  ],
  keys: sixPoses([
    [0, {}],
    [
      24,
      {
        dx: -13,
        lean: -4,
        pitch: -0.23,
        wingSpread: 0.33,
        bagOpen: 0.75,
        'head.pitch': -0.2,
        ...reach('stamp', [9, 18, 53]),
        ...reach('foreR', [10, 18, 55]),
      },
    ],
    [
      35,
      {
        lean: 2,
        pitch: 0.2,
        wingSpread: 0.48,
        ...reach('stamp', [29, 11, 26]),
        ...reach('foreR', [29, 11, 30]),
      },
    ],
    [
      39,
      {
        dx: 6,
        lean: 6,
        crouch: 3,
        pitch: 0.18,
        wingSpread: 0.72,
        wingBeat: 0.39,
        'head.pitch': 0.19,
        ...reach('stamp', [32, 12, 0]),
        ...reach('foreR', [32, 12, 4]),
      },
    ],
    [
      46,
      {
        dx: 6,
        crouch: 9,
        lean: 6,
        pitch: 0.29,
        wingSpread: 0.58,
        wingBeat: 0.01,
        ...reach('stamp', [32, 12, 9]),
        ...reach('foreR', [32, 12, 13]),
      },
    ],
    [59, {}],
  ]),
  interpolate: true,
};
book.tech_post_dive = {
  ...moves.find((m) => m.id === 'tech_post_dive')!,
  contactKind: 'air',
  seconds: 2.0,
  shake: 0.27,
  stop: 1 / 24,
  pathKeys: [{ role: 'prep', frame: 8, pose: { crouch: 7, pitch: 0.17, wingBeat: 0.25, wingSpread: 0.24 } }],
  keys: sixPoses([
    [0, {}],
    [17, { dx: -10, lift: 14, flightPitch: -0.23, wingSpread: 0.52, wingBeat: 0.15, featherFan: 0.62 }],
    [22, { dx: -4, lift: 11, pitch: 0.35, flightPitch: 0.26, wingBeat: -0.3, ...reach('beak', [35, 0, 34]) }],
    [
      26,
      {
        dx: 9,
        lift: 4,
        pitch: 0.54,
        flightPitch: 0.14,
        wingBeat: -0.44,
        bagOpen: 0.56,
        ...reach('beak', [44, 3, 14]),
      },
    ],
    [
      32,
      {
        dx: 13,
        lift: 2,
        pitch: 0.47,
        flightPitch: 0.19,
        wingSpread: 0.43,
        wingBeat: -0.24,
        bagOpen: 0.93,
        ...reach('beak', [45, 2, 9]),
      },
    ],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_talon = {
  ...moves.find((m) => m.id === 'tech_talon')!,
  contactKind: 'floor',
  seconds: 2.0,
  shake: 0.56,
  stop: 1 / 24,
  floorSocket: 'foreRGround',
  recovery: 'absorb',
  pathKeys: [
    {
      role: 'prep',
      frame: 8,
      pose: { dx: -8, lift: 5, roll: -0.19, wingSpread: 0.22, ...reach('foreR', [18, 23, 25]) },
    },
    {
      role: 'prep',
      frame: 19,
      pose: { dx: -24, lift: 25, pitch: -0.31, wingSpread: 0.42, ...reach('foreR', [12, 24, 76]) },
    },
  ],
  keys: sixPoses([
    [0, {}],
    [
      17,
      {
        dx: -19,
        lift: 19,
        pitch: -0.45,
        roll: -0.13,
        wingSpread: 0.55,
        wingBeat: 0.12,
        ...reach('foreR', [5, 15, 60]),
      },
    ],
    [22, { dx: -1, lift: 8, pitch: 0.18, wingBeat: 0.12, ...reach('foreR', [28, 12, 37]) }],
    [25, { dx: 9, lean: 6, pitch: 0.51, crouch: 2, wingBeat: -0.33, ...reach('foreR', [34, 11, 0]) }],
    [31, { dx: 9, lean: 8, crouch: 10, pitch: 0.36, wingBeat: -0.22, ...reach('foreR', [34, 11, 0]) }],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_wing_fan = {
  ...moves.find((m) => m.id === 'tech_wing_fan')!,
  contactKind: 'air',
  seconds: 2.0,
  shake: 0.27,
  stop: 1 / 24,

  keys: sixPoses([
    [0, {}],
    [
      17,
      { yaw: -0.46, roll: -0.13, wingSpreadR: 0.29, wingBeatR: 0.65, ...reach('wingTipR', [-21, 15, 51]) },
    ],
    [21, { yaw: -0.23, wingSpreadR: 0.47, wingBeatR: 0.23, ...reach('wingTipR', [-6, 23, 41]) }],
    [
      25,
      {
        yaw: 0.45,
        lean: 3,
        crouch: 3,
        roll: 0.13,
        wingSpreadR: 0.74,
        featherFan: 0.8,
        ...reach('wingTipR', [25, 24, 30]),
      },
    ],
    [31, { yaw: 0.62, lean: 4, wingSpreadR: 0.56, wingBeatR: -0.18, ...reach('wingTipR', [31, 21, 18]) }],
    [47, {}],
  ]),
  interpolate: true,
};
export default book;
