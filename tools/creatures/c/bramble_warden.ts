// The pale thorns grow out of three braided vines. All markings turn with the hide.
import { Rig, type Mat, type V3 } from '../rig/f15-rig';
import { hx, tn } from '../kit/f11-mobkit';
import { everyday, projectFigure, scaleFigure } from '../rig/figure';
import plan from './bramble_warden-life';
import { withTechniques } from '../technique';
import keys from './bramble_warden-keys';
import { heavySkeleton, type HeavyPose } from '../bodies/heavy-quadruped';
import { readCreatureCard } from '../bodies/card-data';
import { forestMaterials, addBriar, visorGrain } from './bramble-bark';
import { ramp } from './engraving';
import { animations, pose, effects, props } from './bramble_warden-actions';
import type { Creature, Variant } from '../types';

const card = readCreatureCard('bramble_warden');

export type BramblePose = HeavyPose;
export function buildFrame(
  anim: string,
  t: number,
  side: number,
  variant: Variant,
  a: BramblePose = {},
  headLead = 0,
) {
  const r = new Rig(), gold = variant === 'gold';
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
  if (anim === 'tech_volley' && keys.tech_volley.interpolate) {
    // The second and third volleys kick back through the open launch thorn and shoulder.
    const tick = t * 24;
    const recoil = [22, 26].reduce((total, pulse) => {
      const d = tick - pulse;
      return total + (d > -2 && d < 2 ? Math.cos(d * Math.PI / 4) ** 2 : 0);
    }, 0);
    if (recoil) a = {...a, spineAim:(a.spineAim ?? 0) - recoil * .26,
      pitch:(a.pitch ?? 0) - recoil * .092, lift:(a.lift ?? 0) - recoil * 2.5};
  }
  const sk = heavySkeleton(anim, t, side, a, headLead, plan, card.proportions);
  const { body: b, head: h, points: ground, planted, life: l, scale } = sk;
  const flare = (a.flare ?? 0) + 0.5 * l.happy;
  for (const { fore: k, side: s, name, hip, foot, hoof: F } of sk.legs) {
    r.tag = name;
    r.cap(hip, foot, 5.2, 3.2, {
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
    r.tag = name + 'Vine';
    r.cap(F.p(-1.6, -s * 2, 4), F.p(2.0, s * 2.8, 3), 1.05, 0.8, vine);
    r.tag = name;
    if (k === 1)
      r.line(
        F.p(-1.2, s * 3, 5.1),
        F.p(1.8, s * 2.8, 6.5),
        cambium.T[3],
        0,
        0.82,
      );
    else r.ell(F, [-1, s * 2.1, 0.7], [1.8, 1.2, 1.7], vine);
  }
  r.tag = 'torso';
  r.ell(b, [-4, 0, 0], [24, 15.5, 16], armour);
  r.tag = 'belly';
  r.ell(b, [-1, 0, -8.4], [17.5, 13.8, 7.6], {
    ...soil,
    pat: ([x, y, z], l) =>
      ramp(soil, l - 0.24, 0.7 * Math.cos(x * 13 + z * 4), x * 24, z * 10),
  });
  r.tag = 'head';
  r.ell(h, [4, 0, 0], [11.8, 10.7, 9.4], mask);
  r.ell(h, [12.9, 0, -6.2], [6.8, 6.5, 2.45], soil);
  r.line(h.p(9, 7.4, -4.2), h.p(17, 5.4, -3.5), soil.T[0], 0, 1);
  r.ell(h, [13, 0, -2.8], [7, 6.7, 4.2], bark);
  r.ell(h, [18, 0, -2], [2.8, 4.9, 2.5], {
    T: tn('#282331', '#47323b', '#6d514a', '#ab8970'),
  });
  for (const s of [-1, 1]) {
    r.tag = 'headVisor';
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
    r.tag = s > 0 ? 'eyeR' : 'eyeL';
    const eye = h.p(7.3, s * 11.8, 1.55);
    const shut = l.blink || (a.squint ?? 0) > 0.8;
    const corner = h.p(12, s * 8.5, 1.65);
    r.cap(eye, corner, 1.9, 1.25, {
      T: tn('#342834', '#47293b', '#683c4d', '#754254'),
    });
    r.line(eye, corner, hx(shut ? '#4b393b' : '#ffb846'), 0, 2.4);
    if (!shut) {
      r.dot(h.p(8.4, s * 12.0, 1.72), hx('#ffb938'), 0, 3.3, 2.4);
      r.dot(h.p(8.6, s * 12.08, 1.72), hx('#382435'), 0, 1.45, 2.6);
      r.dot(h.p(7.6, s * 12.2, 2.5), hx('#fff2ad'), 0, 1.35, 2.8);
    }
    if (s === 1) r.eye = eye;
  }
  let spine = b.p(-1, 0, 20);
  for (const s of [-1, 1])
    for (let i = 0; i < 4; i++) {
      r.tag = (s > 0 ? 'spineR' : 'spineL') + i;
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
      const shot = anim === 'tech_volley' && i === 3 && s === -1;
      const aim = shot ? (a.spineAim ?? 0) : 0;
      const tip = b.p(
        x - 7.4 + 2.5 * flare + 18 * aim,
        s * (sideBand + 3.6),
        z + 7.1 + wave + 7 * Math.abs(aim),
      );
      r.ball(base, 3.45, soil);
      if (i === 1 && s === 1) {
        const blunt = b.p(x - 4, s * (sideBand + 2), z + 3.8 + wave);
        r.cap(base, blunt, 3, 1.6, horn);
        r.dot(blunt, cambium.T[3], 0, 1.45, 0.9);
      } else r.cap(base, tip, 3, 0.25, horn);
      if (anim === 'tech_volley' ? shot : i === 2 && s === 1) {
        spine = tip;
        if (shot) ground.spineBase = base;
      }
    }
  addBriar(r, b, h, materials, l.q);
  // The working point of this skin is the nose; its rear sprig is its short tail.
  const tailTip = b.p(-26, 11, 13);
  const points = {
    ...ground, weaponTip: ground.snout, weaponTipGround: ground.snoutGround, tailTip,
    tailTipGround: [tailTip[0], tailTip[1], 0] as V3, spine,
  };
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
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...everyday, ...animations },
  effects,
  props,
  frame: (anim, t, side, variant, steer) =>
    buildFrame(
      anim,
      t,
      side,
      variant,
      steer?.techniquePose ?? pose(anim, t),
      steer ? ((((steer.headSide - side + 24) % 16) - 8) * Math.PI) / 8 : 0,
    ),
};
export default withTechniques(creature, keys);
