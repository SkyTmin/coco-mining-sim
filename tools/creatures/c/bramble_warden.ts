// The pale thorns grow out of three braided vines. All markings turn with the hide.
import { F3, Rig, type Mat, type V3 } from '../rig/f15-rig';
import { hx, tn, TAU } from '../kit/f11-mobkit';
import { everyday, life, projectFigure, scaleFigure } from '../rig/figure';
import plan from './bramble_warden-life';
import { strideFoot } from '../motion';
import { forestMaterials, addBriar, visorGrain } from './bramble-bark';
import { ramp } from './engraving';
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
  headLead = 0,
) {
  const r = new Rig(),
    gold = variant === 'gold',
    l = life(anim, t, 0);
  const materials = forestMaterials(gold);
  const { bark, ivy: vine, thorn: horn, armour, cambium, soil } = materials;
  const mask: Mat = {
    ...bark,
    pat: ([x, y, z], l) =>
      ramp(
        cambium,
        l,
        0.5 * Math.sin(x * 6 + z * 4 + y) + 0.3 * Math.sin(z * 10 + x * 2),
        x * 13,
        z * 11,
      ),
  };
  const coil = Math.max(a.coil ?? 0, l.hatch * 0.95),
    flare = (a.flare ?? 0) + 0.5 * l.happy;
  const breath = Math.sin(l.q) * 0.85;
  const root = F3.yaw(0.49 + (TAU * side) / 16 + (a.yaw ?? 0));
  const b = root
    .at(
      -1,
      0,
      20 + breath - 4 * l.sleep - 3 * l.tired + (a.lift ?? 0) + 4 * l.pop,
    )
    .pitch((a.pitch ?? 0) - 0.04 * l.happy)
    .roll(a.roll ?? 0);
  const ground: Record<string, V3> = {},
    planted: string[] = [];
  const scale = 1.19;
  for (const k of [-1, 1])
    for (const s of [-1, 1]) {
      const gait = strideFoot(t, k === s ? 0 : 0.5, plan.stride / scale);
      const scrape =
        anim === 'idle' && k === 1 && s === 1
          ? Math.max(0, Math.sin(l.q * 2 - 1)) ** 6
          : 0;
      const foot =
        anim === 'walk'
          ? root.p(k * 14 - 1 + gait.forward, s * 9.8, 2.4 + 4.3 * gait.lift)
          : b.p(
              k * (14 - 4 * coil) - 3 * scrape,
              s * (9.8 - 2 * coil),
              -17 + 8 * coil + scrape * 2 + 3 * l.sleep,
            );
      const F = F3.yaw(0.49 + (TAU * side) / 16, foot);
      r.cap(b.p(k * 12, s * 8, -5), foot, 5.2, 3.2, {
        ...cambium,
        pat: ([u, x, y], l) =>
          ramp(
            cambium,
            l,
            (1 - u) * 0.6 * Math.sin(u * 21 + x * 3) +
              0.43 * Math.cos(y * 6) +
              0.75 * x,
            u * 16,
            x * 5,
          ),
      });
      // Split hoof toes share one planted pivot; both move with the lower leg.
      for (const toe of [-1, 1])
        r.ell(F, [2.0, toe * 2.12, -1.55], [4.1, 1.82, 2.25], soil);
      r.line(F.p(3.1, 0, -0.55), F.p(5.7, 0, -1.95), soil.T[0], 0, 1.5);
      r.cap(F.p(-1.6, -s * 2, 4), F.p(2.0, s * 2.8, 3), 1.05, 0.8, vine);
      if (k === 1)
        r.line(
          F.p(-1.2, s * 3, 5.1),
          F.p(1.8, s * 2.8, 6.5),
          cambium.T[3],
          0,
          0.82,
        );
      else r.ell(F, [-1, s * 2.1, 0.7], [1.8, 1.2, 1.7], vine);
      const name = (k === 1 ? 'fore' : 'hind') + (s === 1 ? 'R' : 'L');
      ground[name] = foot;
      if (k === 1 && s === 1) ground.paw = foot;
      if (anim === 'walk' && gait.planted) planted.push(name);
    }
  r.ell(b, [-4, 0, 0], [24, 15.5, 16], armour);
  r.ell(b, [-1, 0, -8.4], [17.5, 13.8, 7.6], {
    ...soil,
    pat: ([x, y, z], l) =>
      ramp(soil, l - 0.24, 0.7 * Math.cos(x * 13 + z * 4), x * 24, z * 10),
  });
  const h = b
    .at(14 - 9 * coil + (a.reach ?? 0), 0, -2 - 3 * coil)
    .turn(0.86 * l.look + headLead)
    .pitch(
      (a.head ?? 0) +
        0.24 * l.sleep +
        0.26 * l.tired -
        0.1 * l.happy -
        0.13 * Math.max(0, Math.sin(l.q - 1.3)) ** 7,
    );
  r.ell(h, [4, 0, 0], [11.8, 10.7, 9.4], mask);
  r.ell(h, [12.9, 0, -6.2], [6.8, 6.5, 2.45], soil);
  r.line(h.p(9, 7.4, -4.2), h.p(17, 5.4, -3.5), soil.T[0], 0, 1);
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
      visorGrain(h, horn),
      0.55,
    );
    const eye = h.p(7.3, s * 10.7, 1.55);
    const shut = l.blink || (a.squint ?? 0) > 0.8;
    const corner = h.p(12, s * 8.5, 1.65);
    r.cap(eye, corner, 1.9, 1.25, {
      T: tn('#342834', '#47293b', '#683c4d', '#754254'),
    });
    r.line(eye, corner, hx(shut ? '#4b393b' : '#ffb846'), 0, 2.4);
    if (!shut) {
      r.dot(h.p(8.4, s * 10.65, 1.72), hx('#e99835'), 0, 2.5, 2.4);
      r.dot(h.p(8.6, s * 10.68, 1.72), hx('#422a35'), 0, 1.25, 2.6);
      r.dot(h.p(7.8, s * 10.83, 2.2), hx('#fff3ae'), 0, 1, 2.8);
    }
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
      r.ball(base, 3.45, soil);
      if (i === 1 && s === 1) {
        const blunt = b.p(x - 4, s * (sideBand + 2), z + 3.8 + wave);
        r.cap(base, blunt, 3, 1.6, horn);
        r.dot(blunt, cambium.T[3], 0, 1.45, 0.9);
      } else r.cap(base, tip, 3, 0.25, horn);
      if (i === 2 && s === 1) spine = tip;
    }
  addBriar(r, b, h, materials, l.q);
  const points = { ...ground, snout: h.p(20, 0, -2), spine };
  scaleFigure(r, points, scale, 1.36);
  const frame = projectFigure(r, 96, [46, 72], points, '#28242e');
  return {
    ...frame,
    planted,
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
  frame: (anim, t, side, variant, steer) =>
    buildFrame(
      anim,
      t,
      side,
      variant,
      pose(anim, t),
      steer ? ((((steer.headSide - side + 24) % 16) - 8) * Math.PI) / 8 : 0,
    ),
};
export default creature;
