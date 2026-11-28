import { armedFrame } from '../bodies/armed-biped';
import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { sneakEffects } from './dream_sneak-fx';
import { clips, gesture } from './dream_sneak-poses';
import { sneakFigure } from './dream_sneak-skin';

const card = readCreatureCard('dream_sneak');
const sneak: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...clips },
  frame: armedFrame(card, card.life, { pose: gesture, figure: sneakFigure(gesture) }),
  effects: sneakEffects,
  // «БУ!» at the glass, the viewer's eyelids and the hang from the top rail, the swoop at the glass on the umbrella.
  overClips: ['trick', 'trick_b', 'trick_b-f2'],
  titles: {
    trick: 'Трюк: невидимка',
    trick_b: 'Трюк: сонный песок',
    phase: 'Сон наяву',
    'idle-f2': 'Покой во сне наяву',
    'happy-f2': 'Радость с барашками',
    'trick-f2': 'Трюк: счёт барашков',
    'trick_b-f2': 'Трюк: полёт на зонтике',
    show: 'Появление: спуск на зонтике',
    peek: 'Выглядывает из-за рамы',
    hatch: 'Вылупляется с зонтиком',
    fidget_a: 'Зонт на носу',
    fidget_b: 'Зевок до ушей',
    happy: 'Сальто и зонт',
    look: 'Крадётся и озирается',
  },
};
export default sneak;
