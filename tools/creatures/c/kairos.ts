import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { clips } from './kairos-poses';
import { kairosFigure } from './kairos-skin';
import { kairosEffects } from './kairos-fx';

const card = readCreatureCard('kairos');
const kairos: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  portraitOrigin: [92, 178],
  animations: { ...clips },
  frame: kairosFigure,
  effects: kairosEffects,
  titles: {
    fidget_a: 'Щепотка времени',
    trick: 'Миг назад',
    look: 'Прислушивается к саду',
  },
};
export default kairos;
