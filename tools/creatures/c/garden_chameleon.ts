import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { glasshouseEffects } from './garden_chameleon-fx';
import { clips, home } from './garden_chameleon-poses';
import { chameleonFrame } from './garden_chameleon-skin';

const card = readCreatureCard('garden_chameleon');
const chameleon: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  portraitOrigin: home,
  animations: clips,
  frame: chameleonFrame(card),
  effects: glasshouseEffects,
  overClips: ['trick_b'],
  titles: {
    hatch: 'Выходит из листьев',
    prepare_walk: 'Распускает хвост',
    fidget_a: 'Высматривает мошку',
    fidget_b: 'Вытирает подбородок',
    happy: 'Приветствует лапкой',
    trick: 'Ловит крылатку',
    trick_b: 'Тень на стекле',
  },
};
export default chameleon;
