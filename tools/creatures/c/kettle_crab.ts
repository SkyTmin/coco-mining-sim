import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { crabEffects } from './kettle_crab-fx';
import { clips, gesture } from './kettle_crab-poses';
import { crabFrame } from './kettle_crab-skin';

const card = readCreatureCard('kettle_crab');
const crab: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...clips },
  frame: crabFrame(card, card.life, gesture),
  effects: crabEffects,
  // The helmet rockets out through the top rail; the big bubble carries the crab up over the frame.
  overClips: ['trick', 'trick_b'],
  titles: {
    trick: 'Трюк: паровая ракета',
    trick_b: 'Трюк: пузыри',
    hatch: 'Вылезает из песка',
    fidget_a: 'Протирает иллюминатор',
    fidget_b: 'Стучит по шлему',
    happy: 'Крабья пляска',
  },
};
export default crab;
