import { armedFrame } from '../bodies/armed-biped';
import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { seerEffects } from './astral_seer-fx';
import { clips, gesture } from './astral_seer-poses';
import { seerFigure } from './astral_seer-skin';

const card = readCreatureCard('astral_seer');
const seer: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...clips },
  frame: armedFrame(card, card.life, { pose: gesture, figure: seerFigure(gesture) }),
  effects: seerEffects,
  // The crystal leaves through the top rail, the seer taps the glass, the star ball flies at the viewer.
  overClips: ['trick', 'trick_b', 'trick-f2'],
  titles: {
    trick: 'Трюк: камень в звезду',
    trick_b: 'Трюк: телепорт',
    phase: 'Пробуждение третьего глаза',
    'idle-f2': 'Покой пробуждённого',
    'happy-f2': 'Радость пробуждённого',
    'trick-f2': 'Трюк: звёздная буря',
    'trick_b-f2': 'Трюк: двойник',
    show: 'Появление: разрыв в небе',
    peek: 'Выглядывает из-за рамы',
    hatch: 'Рождение из кристалла',
    fidget_a: 'Перекидывает огонёк',
    fidget_b: 'Танец кристаллов',
    happy: 'Сальто в воздухе',
  },
};
export default seer;
