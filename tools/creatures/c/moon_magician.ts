import { armedFrame } from '../bodies/armed-biped';
import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { magicianEffects } from './moon_magician-fx';
import { clips, gesture } from './moon_magician-poses';
import { magicianFigure } from './moon_magician-skin';

const card = readCreatureCard('moon_magician');
const magician: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  border: 'moon_magician',
  animations: { ...clips },
  frame: armedFrame(card, card.life, { pose: gesture, figure: magicianFigure(gesture) }),
  effects: magicianEffects,
  titles: {
    trick: 'Трюк: голуби из цилиндра',
    trick_b: 'Трюк: карта-дверь',
    phase: 'Лунный выход',
    'idle-f2': 'Покой в лунном облике',
    'happy-f2': 'Радость в лунном облике',
    'trick-f2': 'Трюк: левитация',
    'trick_b-f2': 'Трюк: исчезновение',
    show: 'Представление: шляпа на сцене',
    peek: 'Приподнимает цилиндр над рамой',
    hatch: 'Появление из дыма',
    fidget_a: 'Крутит палочку',
    fidget_b: 'Карта между пальцев',
  },
};
export default magician;
