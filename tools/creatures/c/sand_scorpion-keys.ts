import { reach } from '../bodies/goals';
import { readCreatureCard } from '../bodies/card-data';
import { sixPoses, type TechniqueBook } from '../technique';
const book: TechniqueBook = {};
const moves = readCreatureCard('sand_scorpion').moves;
book.tech_sand_vortex = {
  ...moves.find((m) => m.id === 'tech_sand_vortex')!,
  contactKind: 'floor',
  seconds: 3.0,
  shake: 0.56,
  stop: 1 / 24,
  floorSocket: 'stingGround',
  recovery: 'rebound',
  pathKeys: [{ role: 'prep', frame: 12, pose: { tailCurl: 0.36, roll: -0.12, 'head.pitch': 0.16 } }],
  keys: sixPoses([
    [0, {}],
    [
      30,
      {
        dx: -18,
        tailCurl: 0.65,
        lean: -3,
        tailLift: 4,
        'head.pitch': -0.18,
        ...reach('sting', [-28, -6, 75]),
        ...reach('clawR', [39, 23, 25]),
      },
    ],
    [
      37,
      {
        dx: -3,
        lean: 3,
        pitch: 0.12,
        clawOpenL: 0.58,
        ...reach('sting', [24, -10, 51]),
        ...reach('clawR', [39, 23, 25]),
      },
    ],
    [
      41,
      {
        dx: 13,
        crouch: 7,
        lean: 6,
        pitch: 0.4,
        roll: 0.14,
        clawOpenR: 0.89,
        stingGlow: 1,
        ...reach('sting', [45, -13, 0]),
        ...reach('clawR', [39, 23, 27]),
      },
    ],
    [
      49,
      {
        dx: 16,
        crouch: 9,
        lean: 8,
        pitch: 0.34,
        stingGlow: 1,
        ...reach('sting', [49, -10, 17]),
        ...reach('clawR', [39, 23, 27]),
      },
    ],
    [71, {}],
  ]),
  interpolate: true,
};
book.tech_gate_claw = {
  ...moves.find((m) => m.id === 'tech_gate_claw')!,
  contactKind: 'floor',
  seconds: 2.0,
  shake: 0.56,
  stop: 1 / 24,
  floorSocket: 'clawRGround',
  recovery: 'rebound',
  pathKeys: [{ role: 'prep', frame: 19, pose: { dx: -34, roll: -0.29, ...reach('clawR', [-16, 28, 96]) } }],
  keys: sixPoses([
    [0, {}],
    [17, { dx: -28, lean: -5, roll: -0.25, clawOpenR: 0.78, ...reach('clawR', [-9, 27, 85]) }],
    [24, { dx: -3, lean: 2, clawOpenR: 0.45, ...reach('clawR', [29, 22, 34]) }],
    [
      28,
      { dx: 11, lean: 7, crouch: 6, pitch: 0.35, roll: 0.27, clawOpenR: 0.1, ...reach('clawR', [43, 20, 0]) },
    ],
    [35, { dx: 13, crouch: 9, lean: 8, pitch: 0.3, clawOpenR: 0.26, ...reach('clawR', [46, 21, 13]) }],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_crescent_cut = {
  ...moves.find((m) => m.id === 'tech_crescent_cut')!,
  contactKind: 'air',
  seconds: 2.0,
  shake: 0.27,
  stop: 1 / 24,

  keys: sixPoses([
    [0, {}],
    [17, { dx: -18, yaw: -0.55, lean: -4, roll: -0.14, clawOpenL: 1, ...reach('clawL', [-9, -33, 33]) }],
    [22, { dx: 1, yaw: -0.1, clawOpenL: 0.88, ...reach('clawL', [24, -36, 27]) }],
    [26, { dx: 9, lean: 7, crouch: 3, yaw: 0.55, clawOpenL: 0.14, ...reach('clawL', [42, -19, 24]) }],
    [33, { dx: 18, yaw: 0.6, lean: 8, clawOpenL: 0.06, ...reach('clawL', [48, -10, 22]) }],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_beacon = {
  ...moves.find((m) => m.id === 'tech_beacon')!,
  contactKind: 'air',
  seconds: 2.0,
  shake: 0.27,
  stop: 1 / 24,
  contacts: [27, 30, 33].map((frame) => ({ frame, socket: 'stingFacet', kind: 'air' as const })),
  keys: sixPoses([
    [0, {}],
    [
      17,
      {
        dx: -12,
        crouch: 6,
        tailCurl: 0.56,
        roll: -0.18,
        stingGlow: 0.6,
        ...reach('stingFacet', [-17, 10, 49]),
      },
    ],
    [23, { dx: 1, pitch: -0.14, stingGlow: 1, ...reach('stingFacet', [20, -12, 54]) }],
    [
      27,
      { dx: 11, lean: 6, pitch: -0.22, clawOpenR: 0.69, stingGlow: 1, ...reach('stingFacet', [36, -15, 51]) },
    ],
    [34, { dx: 17, lean: 6, pitch: -0.21, stingGlow: 0.8, ...reach('stingFacet', [43, -16, 50]) }],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_dune_drum = {
  ...moves.find((m) => m.id === 'tech_dune_drum')!,
  contactKind: 'floor',
  seconds: 2.0,
  shake: 0.56,
  stop: 1 / 24,
  floorSocket: 'footR0Ground',
  recovery: 'rebound',
  keys: sixPoses([
    [0, {}],
    [
      17,
      {
        dx: -27,
        roll: -0.32,
        crouch: 3,
        clawOpenR: 0.71,
        ...reach('footR0', [0, 26, 36]),
        ...reach('clawR', [43, 15, 33]),
      },
    ],
    [22, { dx: -3, roll: -0.1, ...reach('footR0', [24, 28, 18]), ...reach('clawR', [43, 15, 33]) }],
    [
      26,
      {
        dx: 6,
        crouch: 8,
        lean: 5,
        pitch: 0.24,
        roll: 0.33,
        ...reach('footR0', [31, 29, 0]),
        ...reach('clawR', [43, 15, 33]),
      },
    ],
    [
      33,
      {
        dx: 7,
        crouch: 9,
        lean: 6,
        roll: 0.29,
        ...reach('footR0', [34, 30, 12]),
        ...reach('clawR', [43, 15, 33]),
      },
    ],
    [47, {}],
  ]),
  interpolate: true,
};
export default book;
