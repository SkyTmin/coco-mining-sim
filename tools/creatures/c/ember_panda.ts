import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { pandaEffects } from './ember_panda-fx';
import { clips, gesture, loops } from './ember_panda-poses';
import { pandaFrame } from './ember_panda-skin';

const card = readCreatureCard('ember_panda');
const panda: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...clips },
  frame: pandaFrame(card, card.life, gesture, loops),
  effects: pandaEffects,
  overClips: ['trick', 'trick_b'],
  titles: {
    trick: 'Трюк: страшилка',
    trick_b: 'Трюк: хвост-пропеллер',
    hatch: 'Сваливается с бамбука',
    fidget_a: 'Умывается',
    fidget_b: 'Ловит свой хвост',
    happy: 'Скачет',
  },
};
export default panda;
