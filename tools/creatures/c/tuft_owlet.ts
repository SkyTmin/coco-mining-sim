import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { owletEffects } from './tuft_owlet-fx';
import { clips, gesture, loops } from './tuft_owlet-poses';
import { owletFrame } from './tuft_owlet-skin';

const card = readCreatureCard('tuft_owlet');
const owlet: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...clips },
  frame: owletFrame(card, card.life, gesture, loops),
  effects: owletEffects,
  overClips: ['trick', 'trick_b'],
  titles: {
    trick: 'Трюк: мотылёк',
    trick_b: 'Трюк: мёртвая петля',
    hatch: 'Выскакивает из тыквы',
    fidget_a: 'Чистит пёрышки',
    fidget_b: 'Вертит головой',
    happy: 'Пух-пух',
  },
};
export default owlet;
