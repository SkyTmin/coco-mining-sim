import { reach } from '../bodies/goals';
import { readCreatureCard } from '../bodies/card-data';
import { sixPoses, type TechniqueBook } from '../technique';
const book: TechniqueBook = {};
const moves = readCreatureCard('nebula_squid').moves;
book.tech_star_spiral = {
  ...moves.find((m) => m.id === 'tech_star_spiral')!,
  contactKind: 'air',
  seconds: 3.25,
  shake: 0.23,
  stop: 1 / 24,
  pathKeys: [
    {
      role: 'strike',
      frame: 36,
      pose: { dx: -26, dy: -21, roll: -0.46, harvest: 0.9, finSpread: 0.9, ...reach('funnel', [10, 8, 41]) },
    },
    {
      role: 'strike',
      frame: 38,
      pose: { dx: -4, dy: -25, roll: -0.05, harvest: 1, finSpread: 0.72, ...reach('funnel', [17, -3, 47]) },
    },
  ],
  keys: sixPoses([
    [0, {}],
    [
      32,
      {
        dx: -36,
        dy: 13,
        roll: -0.36,
        spread: 1,
        finSpread: 1,
        harvest: 0.81,
        ...reach('funnel', [8, 12, 29]),
      },
    ],
    [41, { dx: 10, dy: -12, roll: 0.22, harvest: 1, curl: 0.5, ...reach('funnel', [24, -6, 43]) }],
    [45, { dx: 21, dy: 5, pitch: 0.31, roll: 0.2, harvest: 0.71, glow: 1, ...reach('funnel', [37, -6, 32]) }],
    [
      54,
      { dx: 26, dy: 9, roll: 0.36, spread: 1, finBeat: 0.85, glow: 0.75, ...reach('funnel', [39, -8, 30]) },
    ],
    [77, {}],
  ]),
  interpolate: true,
};
book.tech_lunar_hook = {
  ...moves.find((m) => m.id === 'tech_lunar_hook')!,
  contactKind: 'air',
  seconds: 2.0,
  shake: 0.23,
  stop: 1 / 24,

  keys: sixPoses([
    [0, {}],
    [17, { dx: -25, dy: 3, roll: -0.33, yaw: -0.49, curl: 0.65, ...reach('star2', [-14, 29, 18]) }],
    [21, { dx: -2, roll: -0.14, yaw: -0.1, finBeatR: 0.7, ...reach('star2', [16, 3, 15]) }],
    [25, { dx: 12, roll: 0.25, yaw: 0.5, spread: 0.59, ...reach('star2', [39, -22, 23]) }],
    [31, { dx: 22, roll: 0.31, yaw: 0.64, dy: -4, ...reach('star2', [47, -30, 27]) }],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_tidal_club = {
  ...moves.find((m) => m.id === 'tech_tidal_club')!,
  contactKind: 'floor',
  seconds: 2.0,
  shake: 0.53,
  stop: 1 / 24,
  floorSocket: 'clubLGround',
  recovery: 'rebound',
  keys: sixPoses([
    [0, {}],
    [18, { dx: -21, dy: -11, roll: -0.31, finSpread: 0.65, ...reach('clubL', [-10, -18, 82]) }],
    [23, { dx: 1, dy: 0, pitch: 0.12, ...reach('clubL', [26, -25, 41]) }],
    [27, { dx: 14, dy: 5, roll: 0.43, pitch: 0.31, crouch: 7, ...reach('clubL', [45, -13, 0]) }],
    [34, { dx: 17, dy: 2, roll: 0.31, crouch: 5, ...reach('clubL', [47, -11, 18]) }],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_long_cast = {
  ...moves.find((m) => m.id === 'tech_long_cast')!,
  contactKind: 'air',
  seconds: 2.0,
  shake: 0.23,
  stop: 1 / 24,

  keys: sixPoses([
    [0, {}],
    [17, { dx: -24, dy: 4, pitch: -0.31, clubCurl: 0.88, finSpread: 0.25, ...reach('clubR', [-9, 18, 28]) }],
    [22, { dx: -1, dy: -1, pitch: -0.05, spread: 0.21, ...reach('clubR', [31, 21, 31]) }],
    [26, { dx: 14, dy: -4, pitch: 0.29, clubFan: 0.86, curl: 0.5, ...reach('clubR', [57, 16, 39]) }],
    [32, { dx: 20, dy: -5, roll: -0.17, finBeat: 0.62, ...reach('clubR', [59, 14, 42]) }],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_orbit_chimes = {
  ...moves.find((m) => m.id === 'tech_orbit_chimes')!,
  contactKind: 'floor',
  seconds: 2.75,
  shake: 0.53,
  stop: 1 / 24,
  floorSocket: 'star6Ground',
  recovery: 'rebound',
  keys: sixPoses([
    [0, {}],
    [27, { dx: 18, dy: -12, roll: 0.38, finBeatR: 0.81, spread: 0.6, ...reach('star6', [0, 27, 60]) }],
    [31, { dx: 2, dy: -2, roll: 0.12, ...reach('star6', [19, 27, 27]) }],
    [35, { dx: -13, dy: 6, roll: -0.38, crouch: 6, finBeatL: 0.78, ...reach('star6', [34, 22, 0]) }],
    [42, { dx: -19, dy: 2, roll: -0.28, glow: 0.8, ...reach('star6', [37, 24, 16]) }],
    [65, {}],
  ]),
  interpolate: true,
};
book.tech_comet_form = {
  ...moves.find((m) => m.id === 'tech_comet_form')!,
  contactKind: 'air',
  seconds: 2.25,
  shake: 0.23,
  stop: 1 / 24,

  keys: sixPoses([
    [0, {}],
    [
      21,
      {
        dx: 28,
        dy: -5,
        roll: 0.47,
        comet: 0.48,
        curl: 0.73,
        mantlePitch: 0.43,
        ...reach('mantleTip', [22, -15, 79]),
      },
    ],
    [26, { dx: -2, dy: -9, comet: 0.83, mantlePitch: -0.55, ...reach('mantleTip', [-22, 8, 66]) }],
    [
      30,
      {
        dx: -26,
        dy: -6,
        comet: 1,
        mantlePitch: -0.92,
        roll: -0.35,
        glow: 1,
        ...reach('mantleTip', [-51, 25, 40]),
      },
    ],
    [
      37,
      {
        dx: -28,
        dy: -4,
        comet: 0.89,
        mantlePitch: -0.9,
        finSpread: 0.3,
        ...reach('mantleTip', [-57, 29, 35]),
      },
    ],
    [53, {}],
  ]),
  interpolate: true,
};
export default book;
