import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { clips, home } from './zephyr_whorl-keys';
import { windling } from './zephyr_whorl-skin';
import { meadowTricks } from './zephyr_whorl-fx';

const card = readCreatureCard('zephyr_whorl');
const pet: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  portraitOrigin: home,
  animations: clips,
  frame: windling(card),
  effects: meadowTricks,
  overClips: ['trick_b'],
  titles: {
    hatch: 'Прилетает на луг',
    prepare_walk: 'Переходит на шаг',
    happy: 'Прыгает от радости',
    fidget_a: 'Надувает щёки',
    fidget_b: 'Складывает хохолок в бутон',
    trick: 'Раскручивает вертушку',
    trick_b: 'Ловит и запускает самолётик',
  },
};
export default pet;
