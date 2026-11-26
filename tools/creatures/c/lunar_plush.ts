import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { clips, home } from './lunar_plush-keys';
import { plush } from './lunar_plush-skin';
import { nurseryPlay } from './lunar_plush-fx';

const card = readCreatureCard('lunar_plush');
const pet: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  portraitOrigin: home,
  animations: clips,
  frame: plush(card),
  effects: nurseryPlay,
  titles: {
    hatch: 'Скачет на коврик',
    wake_startled: 'Сонно навостряет ушки',
    prepare_walk: 'Переходит на шаг',
    fidget_a: 'Машет лапкой',
    fidget_b: 'Трёт щёчки лапками',
    happy: 'Подпрыгивает от радости',
    trick: 'Обнимает звёздочку',
    trick_b: 'Играет в ку-ку со светлячком',
  },
};
export default pet;
