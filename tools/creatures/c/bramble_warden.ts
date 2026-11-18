// The pale thorns grow out of three braided vines. All markings turn with the hide.
import { F3, Rig, type Mat, type V3 } from '../rig/f15-rig';
import { hx, tn, TAU } from '../kit/f11-mobkit';
import { everyday, life, projectFigure } from '../rig/figure';
import { animations, pose, effects } from './bramble_warden-actions';
import type { Creature, Variant } from '../types';

export interface BramblePose {
  dx?: number;
  dy?: number;
  sx?: number;
  sy?: number;
  pitch?: number;
  roll?: number;
  yaw?: number;
  lift?: number;
  head?: number;
  coil?: number;
  flare?: number;
  reach?: number;
  squint?: number;
  glow?: number;
  ghost?: number;
}
export function buildFrame(
  anim: string,
  t: number,
  side: number,
  variant: Variant,
  a: BramblePose = {},
) {
  const r = new Rig(),
    gold = variant === 'gold',
    l = life(anim, t, 0);
  const bark: Mat = {
    T: gold
      ? tn('#503337', '#8e5944', '#c88b51', '#ffe1a0')
      : tn('#392d39', '#624838', '#9b7451', '#d0ad78'),
  };
  const vine: Mat = {
    T: gold
      ? tn('#49323b', '#915d38', '#d89b48', '#ffe49a')
      : tn('#302e34', '#4b4c39', '#77724c', '#b5a278'),
  };
  const horn: Mat = {
    T: gold
      ? tn('#624951', '#b57f4f', '#ebbd69', '#fff1b6')
      : tn('#56494c', '#8e7860', '#bfa983', '#f2deb1'),
  };
  const berry: Mat = {
    T: tn('#251e33', '#492c4c', '#774764', '#ae7186'),
    spec: true,
  };
  const mask: Mat = {
    ...bark,
    pat: ([x, y, z], v) =>
      Math.sin(x * 14 + 3 * z + 2 * y) > 0.95 ? bark.T[v > 0.45 ? 2 : 0] : null,
  };
  const coil = Math.max(a.coil ?? 0, l.hatch * 0.95),
    flare = (a.flare ?? 0) + 0.5 * l.happy;
  const step = anim === 'walk' ? 1 : 0,
    breath = Math.sin(l.q) * 0.85;
  const root = F3.yaw(0.49 + (TAU * side) / 16 + (a.yaw ?? 0));
  const b = root
    .at(
      -1,
      0,
      20 + breath - 4 * l.sleep - 3 * l.tired + (a.lift ?? 0) + 4 * l.pop,
    )
    .pitch((a.pitch ?? 0) - 0.04 * l.happy)
    .roll(a.roll ?? 0);
  const ground: Record<string, V3> = {};
  for (const k of [-1, 1])
    for (const s of [-1, 1]) {
      const phase = l.q + (s === k ? 0 : Math.PI),
        swing = step * Math.max(0, Math.sin(phase));
      const walk = 2 * swing * Math.cos(phase);
      const scrape =
        anim === 'idle' && k === 1 && s === 1
          ? Math.max(0, Math.sin(l.q * 2 - 1)) ** 6
          : 0;
      const foot = b.p(
        k * (14 - 4 * coil) + 4 * walk - 3 * scrape,
        s * (9.8 - 2 * coil),
        -17 + 8 * coil + 4 * swing + scrape * 2 + 3 * l.sleep,
      );
      if (anim === 'walk') foot[2] = 3.2 + 4 * swing;
      const greave: Mat = {
        T: gold ? horn.T : tn('#4a3740', '#745443', '#b68a60', '#ead1a0'),
      };
      r.cap(b.p(k * 12, s * 8, -5), foot, 5.1, 3.2, k === 1 ? greave : bark);
      if (k === 1)
        r.cap(
          b.p(k * 13, s * 10.9, -9),
          b.p(k * 14.4, s * 11, -13.1),
          1.6,
          1.15,
          greave,
        );
      if (k === 1 && s === 1) ground.paw = foot;
    }
  r.ell(b, [-4, 0, 0], [24, 15.5, 16], {
    ...bark,
    pat: ([x, y, z], v) => {
      const angle = Math.atan2(z, y),
        under = Math.cos(3 * angle + 8 * x + 0.75 * Math.sin(x * 8));
      if (under > 0.3) return vine.T[under > 0.8 && v > 0.35 ? 2 : 1];
      return under > -0.02 ? bark.T[0] : null;
    },
  });
  const h = b
    .at(14 - 9 * coil + (a.reach ?? 0), 0, -2 - 3 * coil)
    .turn(0.86 * l.look)
    .pitch(
      (a.head ?? 0) +
        0.24 * l.sleep +
        0.26 * l.tired -
        0.1 * l.happy -
        0.13 * Math.max(0, Math.sin(l.q - 1.3)) ** 7,
    );
  r.ell(h, [4, 0, 0], [11.8, 10.7, 9.4], mask);
  r.ell(h, [13, 0, -2.8], [7, 6.7, 4.2], bark);
  r.ell(h, [18, 0, -2], [2.8, 4.9, 2.5], {
    T: tn('#282331', '#47323b', '#6d514a', '#ab8970'),
  });
  for (const s of [-1, 1]) {
    const visor: V3[] = [
      [-2, s * 9, 6],
      [4, s * 8, 8.5],
      [14, s * 4.1, 5],
      [11, s * 8, 1.5],
      [4, s * 10.5, 3.1],
      [-2, s * 10.6, 1.8],
    ];
    r.poly(
      visor.map((p) => h.p(...p)),
      horn,
      0.55,
    );
    const eye = h.p(7.3, s * 10.7, 1.55);
    const shut = l.blink || (a.squint ?? 0) > 0.8;
    const corner = h.p(12, s * 8.5, 1.65);
    r.cap(eye, corner, 1.9, 1.25, {
      T: tn('#342834', '#47293b', '#683c4d', '#754254'),
    });
    r.line(eye, corner, hx(shut ? '#4b393b' : '#ffb846'), 0, 2.4);
    if (!shut) r.dot(h.p(8.1, s * 10.8, 1.95), hx('#fff3ae'), 0, 2, 2.5);
    if (s === 1) r.eye = eye;
  }
  let spine = b.p(-1, 0, 20);
  for (const s of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const x = -23 + i * 9.6,
        sideBand = i % 2 ? 8 : 5.6,
        z =
          4 +
          12 *
            Math.sqrt(
              Math.max(0, 1 - ((x + 4) / 25) ** 2 - (sideBand / 18) ** 2),
            );
      const wave = 1.5 * Math.sin(l.q - i * 0.8) + 4.2 * flare;
      const base = b.p(x, s * sideBand, z - 2);
      const tip = b.p(
        x - 7.4 + 2.5 * flare,
        s * (sideBand + 3.6),
        z + 7.1 + wave,
      );
      r.cap(base, tip, 3, 0.25, horn);
      if (i === 2 && s === 1) spine = tip;
    }
  for (const [x, s, z] of [
    [-12, 13, 6],
    [-7, 14, 7],
    [-10, 14, 2],
    [5, -12, 9],
  ]) {
    r.ball(b.p(x, s, z), 2.7, berry);
  }
  const frame = projectFigure(
    r,
    80,
    [38, 58],
    { ...ground, snout: h.p(20, 0, -2), spine },
    '#28242e',
  );
  return {
    ...frame,
    dx: a.dx,
    dy: a.dy,
    sx: a.sx,
    sy: a.sy,
    ghost: a.ghost ? { dx: -4, dy: 0.5, alpha: a.ghost } : undefined,
  };
}
const creature: Creature = {
  id: 'bramble_warden',
  rarity: 'common',
  theme: 'root_edge',
  animations: { ...everyday, ...animations },
  effects,
  frame: (anim, t, side, variant) =>
    buildFrame(anim, t, side, variant, pose(anim, t)),
};
export default creature;
