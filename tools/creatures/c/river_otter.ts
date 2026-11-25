import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { otterEffects } from './river_otter-fx';
import { clips } from './river_otter-poses';
import { otterFrame } from './river_otter-skin';

const card = readCreatureCard('river_otter');
const otter: Creature = {
  id: card.id, rarity: card.rarity, theme: card.theme,
  animations: clips, frame: otterFrame(card), effects: otterEffects,
  overClips: ['trick_b'],
  titles: {
    hatch: 'Выныривает из заводи', fidget_a: 'Умывает щёки', fidget_b: 'Переворачивает гальку',
    happy: 'Двойной подскок', trick: 'Камешек на носу', trick_b: 'С горки на брюхе',
  },
};
export default otter;
