import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { icePlay } from './opal_skater-fx';
import { clips, home } from './opal_skater-keys';
import { skater } from './opal_skater-skin';

const card = readCreatureCard('opal_skater');
const pet: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  portraitOrigin: home,
  animations: clips,
  frame: skater(card),
  effects: icePlay,
  reelGroups: [
    ['hatch', 'idle', 'fidget_a', 'fidget_b'],
    ['prepare_walk'],
    ['look', 'trick', 'happy'],
    ['tired', 'sleep_in', 'sleep', 'sleep_out'],
    ['trick_b'],
    ['sleep_in', 'sleep', 'wake_startled'],
  ],
  titles: {
    hatch: 'Делает первый круг',
    look: 'Осматривает каток',
    prepare_walk: 'Переносит вес',
    fidget_a: 'Раскрывает веера',
    fidget_b: 'Кланяется зрителю',
    happy: 'Подскакивает на льду',
    tired: 'Зевает',
    wake_startled: 'Встрепенулся спросонья',
    trick: 'Ловит шайбу после отскока',
    trick_b: 'Обводит снежинки восьмёркой',
  },
};
export default pet;
