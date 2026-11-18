import type { TechniqueBook } from '../technique';

export default {
  tech_loop: {
    interpolate: true,
    title: 'Петля-вихрь',
    reference: 'mammoth-tusks',
    weapon: 'head',
    contactKind: 'air',
    stop: 0.06,
    keys: [
      { role: 'rest', frame: 0, pose: {} },
      {
        role: 'prep',
        frame: 19,
        pose: { curl: 0.96, skew: -0.21, tailSwing: -0.39, fins: -0.52, lunge: -5, dx: -18 },
      },
      {
        role: 'strike',
        frame: 23,
        pose: { curl: 0.8, skew: -0.08, tailSwing: 0.45, lunge: 2, dx: -11 },
      },
      {
        role: 'hit',
        frame: 26,
        pose: {
          curl: -0.32,
          lunge: 12,
          skew: 0.12,
          tailSwing: 0.69,
          fins: 0.48,
          tilt: 0.19,
          dx: 24,
          dy: 3,
        },
      },
      {
        role: 'follow',
        frame: 34,
        pose: { curl: -0.1, skew: 0.19, tailSwing: 0.91, lunge: 14, tilt: 0.18, dx: 34, dy: 8 },
      },
      { role: 'return', frame: 47, pose: {} },
    ],
  },
  tech_lash: {
    interpolate: true,
    title: 'Хлыст лентой',
    reference: 'hourlord-hour',
    weapon: 'tail',
    contactKind: 'floor',
    floorSocket: 'tailFloor',
    stop: 0.04,
    keys: [
      { role: 'rest', frame: 0, pose: {} },
      {
        role: 'prep',
        frame: 10,
        pose: { skew: 2.32, coilBack: 0.56, tailSwing: 0.15, curl: 0.16, tilt: -0.18, dx: 15 },
      },
      {
        role: 'strike',
        frame: 12,
        pose: { skew: 2.0, coilBack: 0.32, tailSwing: 0.1, brushDown: 0.2, dx: 9 },
      },
      {
        role: 'hit',
        frame: 15,
        pose: {
          skew: 0.82,
          coilBack: -0.14,
          tailSwing: 0.64,
          brushDown: 1,
          tilt: 0.19,
          dx: -18,
          dy: 15,
        },
      },
      {
        role: 'follow',
        frame: 19,
        pose: { skew: 1.06, tailSwing: 0.91, brushDown: 1, tilt: 0.24, dx: -33, dy: 18 },
      },
      { role: 'return', frame: 25, pose: {} },
    ],
  },
  tech_kites: {
    interpolate: true,
    title: 'Бумажные змеи',
    reference: 'puppeteer-cut',
    weapon: 'finR',
    contactKind: 'air',
    stop: 0.04,
    contacts: [
      { frame: 21, socket: 'finR', kind: 'air' },
      { frame: 21, socket: 'finL', kind: 'air' },
      { frame: 25, socket: 'finR', kind: 'projectile', projectile: 'kite-0' },
      { frame: 29, socket: 'finL', kind: 'projectile', projectile: 'kite-1' },
      { frame: 33, socket: 'finR', kind: 'projectile', projectile: 'kite-2' },
    ],
    keys: [
      { role: 'rest', frame: 0, pose: {} },
      {
        role: 'prep',
        frame: 17,
        pose: { skew: 0.79, curl: 0.24, fins: -0.78, coilBack: 0.48, dx: 16, dy: 4 },
      },
      {
        role: 'strike',
        frame: 18,
        pose: { skew: 0.58, curl: 0.16, fins: -0.55, coilBack: 0.32, dx: 13, dy: 1 },
      },
      {
        role: 'hit',
        frame: 21,
        pose: { skew: 1.25, tilt: 0.04, fins: 1.3, lunge: -6, coilBack: -0.42, dx: -17, dy: 1 },
      },
      {
        role: 'follow',
        frame: 31,
        pose: { skew: 1.43, tilt: 0.08, fins: 1.21, notch: 1, lunge: -4, dx: -30, dy: 0 },
      },
      { role: 'return', frame: 42, pose: {} },
    ],
  },
} satisfies TechniqueBook;
