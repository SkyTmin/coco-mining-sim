import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { home, clips } from './velvet_tabor-poses';
import { tabor } from './velvet_tabor-skin';
const card = readCreatureCard('velvet_tabor');
const painting: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  portraitOrigin: home,
  animations: clips,
  frame: tabor,
  reelGroups: [
    ['hatch', 'idle', 'fidget_a', 'fidget_b'],
    ['prepare_walk'],
    ['look', 'trick', 'happy'],
    ['tired', 'sleep_in', 'sleep', 'sleep_out'],
    ['trick_b'],
    ['sleep_in', 'sleep', 'wake_startled'],
  ],
  titles: {
    look: 'Оглядывает мастерскую',
    prepare_walk: 'Готовится выйти',
    fidget_a: 'Склоняет ухо и слушает',
    fidget_b: 'Показывает мячик',
    happy: 'Подпрыгивает от радости',
    tired: 'Зевает',
    hatch: 'Кружится с барабаном',
    trick: 'Выстукивает дробь',
    trick_b: 'Подбрасывает мячик на барабане',
  },
};
export default painting;
