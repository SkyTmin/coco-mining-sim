import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { clips, home } from './bell_magpie-keys';
import { magpieFrame } from './bell_magpie-skin';
import { courtyardEffects } from './bell_magpie-fx';

const card = readCreatureCard('bell_magpie');
const bird: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  portraitOrigin: home,
  animations: clips,
  frame: magpieFrame(card),
  effects: courtyardEffects,
  overClips: ['trick_b'],
  titles: {
    hatch: 'Прилетает во двор',
    prepare_walk: 'Подаётся вперёд',
    fidget_a: 'Чистит крыло',
    fidget_b: 'Раскрывает хвост веером',
    happy: 'Приветствует прыжком',
    trick: 'Звонит в колокол',
    trick_b: 'Купается в пыли',
  },
};
export default bird;
