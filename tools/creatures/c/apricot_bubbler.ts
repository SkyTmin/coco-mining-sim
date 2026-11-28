import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { home, clips } from './apricot_bubbler-poses';
import { bubbler } from './apricot_bubbler-skin';
import { courtyardPlay } from './apricot_bubbler-fx';
const card = readCreatureCard('apricot_bubbler');
const painting: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  portraitOrigin: home,
  animations: clips,
  frame: bubbler,
  effects: courtyardPlay,
  // Begin away from the water. All eight strides fit on the tiled promenade.
  reelWalkRoute: ['ne', 'se', 'n', 'w', 'sw', 'nw', 'e', 's'],
  reelGroups: [
    ['hatch', 'idle', 'fidget_a', 'fidget_b'],
    ['prepare_walk'],
    ['look', 'trick', 'happy'],
    ['tired', 'sleep_in', 'sleep', 'sleep_out'],
    ['trick_b'],
    ['sleep_in', 'sleep', 'wake_startled'],
  ],
  titles: {
    look: 'Оглядывает двор',
    prepare_walk: 'Готовится шагнуть',
    fidget_a: 'Надувает щёчки',
    fidget_b: 'Виляет хвостом',
    happy: 'Подпрыгивает от радости',
    tired: 'Зевает',
    hatch: 'Подпрыгивает и оглядывается',
    trick: 'Выдувает и лопает пузырь',
    trick_b: 'Гоняет кораблик по воде',
  },
};
export default painting;
