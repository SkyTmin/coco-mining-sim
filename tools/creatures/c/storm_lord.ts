import { armedFrame } from '../bodies/armed-biped';
import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { stormEffects } from './storm_lord-fx';
import { clips, gesture } from './storm_lord-poses';
import { stormFigure } from './storm_lord-skin';

const card = readCreatureCard('storm_lord');
const storm: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...clips },
  frame: armedFrame(card, card.life, { pose: gesture, figure: stormFigure(gesture) }),
  effects: stormEffects,
  overClips: ['trick', 'trick-f2', 'trick_b-f2'],
  titles: {
    trick: 'Трюк: громовой рывок',
    trick_b: 'Трюк: зов молнии',
    trick_c: 'Трюк: барабаны войны',
    phase: 'Пробуждение бури',
    'idle-f2': 'Покой Бури',
    'happy-f2': 'Радость Бури',
    'trick-f2': 'Трюк: ураган',
    'trick_b-f2': 'Трюк: шаровая молния',
    'trick_c-f2': 'Трюк: удар с неба',
    show: 'Появление: удар молнии',
    peek: 'Глаза из-за рамы',
    hatch: 'Вылупляется из грозового камня',
    fidget_a: 'Разряд в когтях',
    fidget_b: 'Встряхивается',
    happy: 'Громовое сальто',
    look: 'Оглядывает вершину',
  },
};
export default storm;
