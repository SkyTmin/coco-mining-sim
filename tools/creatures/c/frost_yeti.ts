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
const creature: Creature = {
  id: 'frost_yeti',
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...everyday, ...animations },
  props,
  effects,
  frame: armedFrame(card, route, { pose, presentation }),
};
export default attachMotion(withTechniques(creature, keys), route);
