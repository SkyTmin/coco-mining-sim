import { reach } from '../bodies/goals';
import { readCreatureCard } from '../bodies/card-data';
import { sixPoses, type TechniqueBook } from '../technique';
const book: TechniqueBook = {};
const moves = readCreatureCard('grove_lord').moves;
book.tech_sap_breath = {
  ...moves.find((m) => m.id === 'tech_sap_breath')!,
  contactKind: 'air',
  seconds: 2.0,
  shake: 0.23,
  stop: 1 / 24,

  keys: sixPoses([
    [0, {}],
    [18, { dx: -28, lean: -8, pitch: -0.31, crownSway: 0.72, ...reach('mouth', [-9, 0, 85]) }],
    [22, { crouch: 4, lean: 2, pitch: 0.12, jaw: 0.34, ...reach('mouth', [17, 0, 64]) }],
    [25, { dx: 13, crouch: 13, lean: 9, pitch: 0.39, jaw: 1, ...reach('mouth', [34, 1, 50]) }],
    [31, { dx: 14, crouch: 14, lean: 11, pitch: 0.4, jaw: 0.9, ...reach('mouth', [38, 1, 47]) }],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_catkin_cast = {
  ...moves.find((m) => m.id === 'tech_catkin_cast')!,
  contactKind: 'air',
  seconds: 2.0,
  shake: 0.23,
  stop: 1 / 24,

  keys: sixPoses([
    [0, {}],
    [
      18,
      {
        dx: -19,
        twist: -0.72,
        crouch: 4,
        ...reach('handR', [-8, 24, 70]),
        ...reach('boughTipR', [-16, 33, 76]),
      },
    ],
    [
      22,
      {
        dx: -2,
        twist: 0.12,
        roll: 0.12,
        ...reach('handR', [16, 33, 54]),
        ...reach('boughTipR', [13, 43, 59]),
      },
    ],
    [
      25,
      {
        dx: 14,
        lean: 7,
        twist: 0.63,
        pitch: 0.25,
        ...reach('handR', [35, 25, 43]),
        ...reach('boughTipR', [45, 27, 48]),
      },
    ],
    [
      31,
      {
        dx: 15,
        lean: 9,
        twist: 0.71,
        pitch: 0.26,
        ...reach('handR', [39, 23, 40]),
        ...reach('boughTipR', [50, 25, 45]),
      },
    ],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_acorn_quake = {
  ...moves.find((m) => m.id === 'tech_acorn_quake')!,
  contactKind: 'floor',
  seconds: 2.9166666666666665,
  shake: 0.53,
  stop: 1 / 24,
  floorSocket: 'handRGround',
  recovery: 'rebound',
  pathKeys: [
    {
      role: 'prep',
      frame: 10,
      pose: { pitch: -0.13, handOpen: 0.7, ...reach('handR', [9, 34, 67]), ...reach('handL', [8, -34, 64]) },
    },
    {
      role: 'prep',
      frame: 30,
      pose: {
        lean: -3,
        pitch: -0.2,
        handOpen: 1,
        ...reach('handR', [-1, 32, 105]),
        ...reach('handL', [-3, -29, 98]),
      },
    },
    {
      role: 'follow',
      frame: 48,
      pose: {
        squirrelClip: 1,
        squirrelTime: 0.63,
        squirrelUp: 4,
        crouch: 12,
        ...reach('handR', [27, 25, 25]),
        ...reach('handL', [21, -26, 20]),
      },
    },
    {
      role: 'follow',
      frame: 55,
      pose: {
        crouch: 17,
        pitch: 0.18,
        squirrelClip: 1,
        squirrelTime: 0.98,
        squirrelUp: 3,
        ...reach('handR', [29, 27, 36]),
        ...reach('handL', [19, -29, 30]),
      },
    },
  ],
  keys: sixPoses([
    [0, {}],
    [
      25,
      {
        dx: -8,
        pitch: -0.21,
        lean: -3,
        handOpen: 1,
        crownSway: 0.38,
        ...reach('handR', [0, 34, 103]),
        ...reach('handL', [-2, -31, 100]),
      },
    ],
    [
      35,
      {
        dx: -2,
        lean: 3,
        crouch: 4,
        pitch: 0.25,
        handOpen: 0.82,
        ...reach('handR', [24, 28, 51]),
        ...reach('handL', [21, -28, 56]),
      },
    ],
    [
      39,
      {
        dx: 6,
        lean: 7,
        crouch: 18,
        pitch: 0.44,
        squirrelClip: 1,
        squirrelTime: 0.18,
        ...reach('handR', [34, 24, 0]),
        ...reach('handL', [30, -23, 0]),
      },
    ],
    [
      44,
      {
        dx: 6,
        lean: 5,
        crouch: 15,
        pitch: 0.31,
        squirrelClip: 1,
        squirrelTime: 0.38,
        ...reach('handR', [33, 25, 14]),
        ...reach('handL', [29, -23, 11]),
      },
    ],
    [69, {}],
  ]),
  interpolate: true,
};
book.tech_branch_hook = {
  ...moves.find((m) => m.id === 'tech_branch_hook')!,
  contactKind: 'air',
  seconds: 2.0,
  shake: 0.23,
  stop: 1 / 24,

  keys: sixPoses([
    [0, {}],
    [17, { dx: -17, twist: -0.64, pitch: -0.18, ...reach('handL', [-22, -28, 68]) }],
    [21, { lean: 3, twist: 0.1, crouch: 3, ...reach('handL', [7, -36, 47]) }],
    [24, { dx: 11, lean: 6, twist: 0.52, crouch: 8, handOpen: 0.68, ...reach('handL', [38, -26, 34]) }],
    [30, { dx: 13, lean: 9, twist: 0.69, crouch: 8, ...reach('handL', [45, -16, 32]) }],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_root_step = {
  ...moves.find((m) => m.id === 'tech_root_step')!,
  contactKind: 'floor',
  seconds: 2.0,
  shake: 0.53,
  stop: 1 / 24,
  floorSocket: 'footRGround',
  recovery: 'absorb',
  keys: sixPoses([
    [0, {}],
    [
      18,
      {
        dx: -29,
        lift: 16,
        pitch: -0.27,
        roll: -0.32,
        lean: -6,
        handOpen: 0.9,
        ...reach('footR', [8, 23, 63]),
        ...reach('footL', [-2, -11, 0]),
        ...reach('handR', [1, 37, 78]),
        ...reach('handL', [3, -35, 59]),
      },
    ],
    [22, { dx: -1, lean: 3, pitch: 0.11, roll: -0.09, ...reach('footR', [25, 17, 22]) }],
    [25, { dx: 7, lean: 7, crouch: 3, pitch: 0.26, ...reach('footR', [31, 16, 0]) }],
    [31, { dx: 7, lean: 8, crouch: 15, pitch: 0.34, ...reach('footR', [31, 16, 0]) }],
    [47, {}],
  ]),
  interpolate: true,
};
export default book;
