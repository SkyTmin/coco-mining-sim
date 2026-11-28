import { reach } from '../bodies/goals';
import { readCreatureCard } from '../bodies/card-data';
import { sixPoses, type TechniqueBook } from '../technique';
const book: TechniqueBook = {};
const moves = readCreatureCard('ink_admiral').moves;
book.tech_chart_route = {
  ...moves.find((m) => m.id === 'tech_chart_route')!,
  contactKind: 'floor',
  seconds: 3.0,
  shake: 0.56,
  stop: 1 / 24,
  floorSocket: 'sabreGround',
  recovery: 'rebound',
  pathKeys: [
    { role: 'prep', frame: 10, pose: { mapOpen: 0.5, 'head.pitch': 0.23, ...reach('arm2', [22, 11, 20]) } },
    {
      role: 'prep',
      frame: 24,
      pose: {
        mapOpen: 1,
        'head.pitch': 0.38,
        ...reach('arm2', [24, 11, 24]),
        ...reach('sabre', [0, -20, 51]),
      },
    },
  ],
  keys: sixPoses([
    [0, {}],
    [
      30,
      {
        dx: -19,
        mapOpen: 1,
        roll: -0.12,
        'head.pitch': 0.34,
        ...reach('arm2', [23, 11, 24]),
        ...reach('sabre', [-21, -22, 67]),
      },
    ],
    [
      35,
      {
        dx: -2,
        mapOpen: 1,
        pitch: 0.21,
        sabrePitch: 0.7,
        ...reach('arm2', [23, 11, 24]),
        ...reach('sabre', [24, -16, 26]),
      },
    ],
    [
      39,
      {
        dx: 12,
        lean: 5,
        crouch: 5,
        pitch: 0.34,
        mapOpen: 1,
        sabrePitch: 2.05,
        ...reach('arm2', [23, 11, 20]),
        ...reach('sabre', [30, -13, 0]),
      },
    ],
    [
      46,
      {
        dx: 7,
        crouch: 6,
        lean: 6,
        pitch: 0.26,
        mapOpen: 1,
        sabrePitch: 1.95,
        ...reach('sabre', [32, -12, 12]),
      },
    ],
    [71, {}],
  ]),
  interpolate: true,
};
book.tech_signal_bell = {
  ...moves.find((m) => m.id === 'tech_signal_bell')!,
  contactKind: 'air',
  seconds: 2.0,
  shake: 0.27,
  stop: 1 / 24,

  keys: sixPoses([
    [0, {}],
    [17, { dx: -18, roll: -0.25, 'head.yaw': 0.38, ...reach('bell', [-23, 25, 39]) }],
    [21, { dx: -2, lean: 2, bellPitch: -0.9, ...reach('bell', [19, 26, 37]) }],
    [25, { dx: 13, lean: 6, roll: 0.28, bellPitch: -1.43, ...reach('bell', [37, -6, 34]) }],
    [31, { dx: 21, lean: 9, bellPitch: -0.97, ...reach('bell', [43, -10, 27]) }],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_sounding = {
  ...moves.find((m) => m.id === 'tech_sounding')!,
  contactKind: 'floor',
  seconds: 2.0,
  shake: 0.56,
  stop: 1 / 24,
  floorSocket: 'lanternGround',
  recovery: 'rebound',
  keys: sixPoses([
    [0, {}],
    [17, { dx: -34, lift: 16, roll: -0.32, 'head.pitch': -0.3, ...reach('lantern', [-9, -35, 79]) }],
    [24, { dx: -5, lean: 2, ...reach('lantern', [36, -19, 38]) }],
    [28, { dx: -5, lean: -5, crouch: 10, roll: -0.46, pitch: 0.24, ...reach('lantern', [34, 9, 0]) }],
    [34, { dx: -4, lean: -4, crouch: 10, roll: -0.44, pitch: 0.21, ...reach('lantern', [35, 10, 14]) }],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_pennant = {
  ...moves.find((m) => m.id === 'tech_pennant')!,
  contactKind: 'air',
  seconds: 2.0,
  shake: 0.27,
  stop: 1 / 24,

  keys: sixPoses([
    [0, {}],
    [17, { dx: -6, yaw: -0.54, roll: -0.21, pennantRoll: 0.85, ...reach('pennant', [-23, -26, 39]) }],
    [21, { lean: 2, yaw: -0.17, pennantRoll: 0.38, ...reach('pennant', [6, -31, 40]) }],
    [25, { dx: 7, yaw: 0.49, lean: 6, crouch: 3, pennantRoll: -0.77, ...reach('pennant', [33, -13, 33]) }],
    [31, { dx: 17, yaw: 0.56, lean: 8, pennantRoll: -1, ...reach('pennant', [41, -15, 26]) }],
    [47, {}],
  ]),
  interpolate: true,
};
export default book;
