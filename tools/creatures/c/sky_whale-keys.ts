import { reach } from '../bodies/goals';
import { readCreatureCard } from '../bodies/card-data';
import { sixPoses, type TechniqueBook } from '../technique';
const book: TechniqueBook = {};
const moves = readCreatureCard('sky_whale').moves;
book.tech_star_spout = {
  ...moves.find((m) => m.id === 'tech_star_spout')!,
  contactKind: 'air',
  seconds: 3.0833333333333335,
  shake: 0.23,
  stop: 1 / 24,

  keys: sixPoses([
    [0, {}],
    [27, { dx: -48, dy: 0, pitch: 0.14, inflate: 1, finBeatR: 0.8, finBeatL: 0.62, tailBeat: 0.78 }],
    [34, { dx: -7, dy: 34, pitch: 0.65, inflate: 0.92, jaw: 0.67 }],
    [38, { dx: 39, dy: -7, pitch: -0.56, inflate: 0.22, jaw: 0.44, finBeatR: -0.9, tailBeat: -0.83 }],
    [44, { dx: 42, dy: -11, pitch: -0.63, beamPower: 1, beamTurn: 0.54, tailBeat: -0.88 }],
    [73, {}],
  ]),
  interpolate: true,
};
book.tech_bow_ram = {
  ...moves.find((m) => m.id === 'tech_bow_ram')!,
  contactKind: 'air',
  seconds: 2.0,
  shake: 0.23,
  stop: 1 / 24,

  keys: sixPoses([
    [0, {}],
    [18, { dx: -30, pitch: 0.24, finBeatR: 0.89, tailBeat: 0.77, ...reach('snout', [35, -6, 28]) }],
    [22, { dx: 9, dy: 8, pitch: -0.14, finBeatR: -0.45 }],
    [25, { dx: 34, pitch: -0.23, finSpread: 0.74, tailBeat: -0.92, ...reach('snout', [51, 2, 50]) }],
    [31, { dx: 39, pitch: -0.28, finBeatR: -0.64, ...reach('snout', [55, 3, 54]) }],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_tide_paddle = {
  ...moves.find((m) => m.id === 'tech_tide_paddle')!,
  contactKind: 'air',
  seconds: 2.0,
  shake: 0.23,
  stop: 1 / 24,

  keys: sixPoses([
    [0, {}],
    [18, { dx: -14, roll: -0.29, pitch: 0.18, tailSweep: 0.89, ...reach('finTipR', [-18, 22, 60]) }],
    [22, { dx: 4, roll: 0.16, finBeatL: 0.79, ...reach('finTipR', [-4, 40, 45]) }],
    [25, { dx: 22, roll: 0.28, tailSweep: -0.85, ...reach('finTipR', [28, 38, 9]) }],
    [31, { dx: 27, roll: 0.34, tailBeat: -0.74, ...reach('finTipR', [34, 37, 5]) }],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_fluke_break = {
  ...moves.find((m) => m.id === 'tech_fluke_break')!,
  contactKind: 'floor',
  seconds: 2.0,
  shake: 0.53,
  stop: 1 / 24,
  floorSocket: 'tailTipGround',
  recovery: 'rebound',
  keys: sixPoses([
    [0, {}],
    [18, { dx: 17, dy: -16, pitch: 0.45, tailBeat: 1, finBeatR: -0.8, ...reach('tailTip', [-43, -2, 67]) }],
    [22, { dx: -5, dy: 3, pitch: -0.25, tailBeat: 0.57, ...reach('tailTip', [-56, 6, 44]) }],
    [
      25,
      { dx: -17, dy: 6, pitch: -0.44, tailBeat: -0.97, finBeatR: 0.95, ...reach('tailTip', [-52, 11, 0]) },
    ],
    [31, { dx: -19, dy: 2, pitch: -0.35, tailBeat: -0.6, ...reach('tailTip', [-53, 11, 21]) }],
    [47, {}],
  ]),
  interpolate: true,
};
book.tech_beacon_watch = {
  ...moves.find((m) => m.id === 'tech_beacon_watch')!,
  contactKind: 'air',
  seconds: 2.75,
  shake: 0.23,
  stop: 1 / 24,

  keys: sixPoses([
    [0, {}],
    [25, { dx: -39, dy: 6, roll: 0.47, finBeatR: -0.85, beamTurn: -1.4, pitch: -0.17 }],
    [28, { dx: -4, dy: 30, roll: 0.1, beamTurn: -0.4, beamPower: 0.52, pitch: 0.16 }],
    [31, { dx: 27, dy: 9, roll: -0.6, beamTurn: 1.3, beamPower: 1, finBeatR: 0.89, pitch: 0.4 }],
    [39, { dx: 32, dy: 10, roll: -0.67, beamTurn: 2.7, beamPower: 0.99, pitch: 0.47 }],
    [65, {}],
  ]),
  interpolate: true,
};
book.tech_cloud_keel = {
  ...moves.find((m) => m.id === 'tech_cloud_keel')!,
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
        dy: -8,
        cloudMorph: 0.86,
        roll: -0.23,
        finSpread: 0.76,
        tailBeat: 0.64,
        ...reach('starKeel', [-2, 6, 30]),
      },
    ],
    [22, { dx: -2, dy: 8, cloudMorph: 1, roll: 0.2, beamPower: 0.78 }],
    [25, { dx: 27, dy: 11, cloudMorph: 1, roll: 0.41, finBeatR: 0.92, ...reach('starKeel', [15, 12, 8]) }],
    [31, { dx: 32, dy: 15, cloudMorph: 0.88, roll: 0.48, finBeatR: 0.95, ...reach('starKeel', [17, 13, 6]) }],
    [47, {}],
  ]),
  interpolate: true,
};
export default book;
