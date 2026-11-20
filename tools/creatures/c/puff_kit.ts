import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { puffEffects } from './puff_kit-fx';
import { clips, gesture, loops } from './puff_kit-poses';
import { puffFrame } from './puff_kit-skin';

const card = readCreatureCard('puff_kit');
const puff: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...clips },
  frame: puffFrame(card, card.life, gesture, loops),
  effects: puffEffects,
  titles: {},
};
export default puff;
