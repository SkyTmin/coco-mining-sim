import { trk } from '../kit/f11-mobkit';
import { overheadCrown } from './frost_yeti-reference-poses';
import { battingPose } from './frost_yeti-footwork';
import route from './frost_yeti-life';
import keys from './frost_yeti-keys';
import { readCreatureCard } from '../bodies/card-data';
import { armedFrame } from '../bodies/armed-biped';
export { bodyFrame } from '../bodies/armed-biped';
export type { FrostPose } from '../bodies/armed-biped';
import { withTechniques } from '../technique';
import { attachMotion } from '../motion';
import { everyday } from '../rig/figure';
import { animations, props, effects, pose, presentation } from './frost_yeti-actions';
import type { Creature } from '../types';
const card = readCreatureCard('frost_yeti');
const draw = armedFrame(card, route, { pose, presentation });
const creature: Creature = {
  id: 'frost_yeti',
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...everyday, ...animations },
  props,
  effects,
  frame(anim, t, side, variant, motion) {
    if (anim === 'tech_slam' && motion?.techniquePose && t > 14 / 24 && t < 16 / 24) {
      return draw(anim, t, side, variant, { ...motion, techniquePose:
        overheadCrown(t * 24, motion.techniquePose, route.yaw, 53 * (card.proportions.weapon ?? 1)) });
    }
    if (anim === 'tech_slam' && motion?.techniquePose && t > 19 / 24 && t < 23 / 24) {
      // The impact turns the wrists back toward the shoulder as the club springs off hard snow.
      const recoil = trk(t * 24, [[19, 0], [19.5, -12], [20.25, -20], [21, -14], [22, -2], [23, 0]]) / 1.23;
      const controls = motion.techniquePose;
      return draw(anim, t, side, variant, { ...motion, techniquePose: {
        ...controls,
        clubForward: (controls.clubForward ?? 0) + recoil * Math.cos(route.yaw),
        clubSide: (controls.clubSide ?? 0) - recoil * Math.sin(route.yaw),
      } });
    }
    if (anim === 'tech_snowball' && motion?.techniquePose) {
      const yaw = route.yaw + side * Math.PI / 8;
      return draw(anim, t, side, variant, { ...motion, techniquePose: battingPose(t, yaw, motion.techniquePose) });
    }
    return draw(anim, t, side, variant, motion);
  },
};
export default attachMotion(withTechniques(creature, keys), route);
