import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { pandaEffects } from './bun_panda-fx';
import { clips, gesture } from './bun_panda-poses';
import { pandaFrame } from './bun_panda-skin';

const card = readCreatureCard('bun_panda');
const panda: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...clips },
  size: [384, 312, 288, 27],
  frame: pandaFrame(gesture),
  effects: pandaEffects,
  overClips: ['trick', 'trick_b', 'trick_b-f2'],
  titles: {
    trick: 'Трюк: пирожок',
    trick_b: 'Трюк: бамбук',
    trick_c: 'Трюк: горшок мёда',
    phase: 'Рыцарь из кастрюль',
    'idle-f2': 'Покой рыцаря',
    'happy-f2': 'Радость рыцаря',
    'trick-f2': 'Трюк: поединок',
    'trick_b-f2': 'Трюк: таран',
    'trick_c-f2': 'Трюк: сковородка',
    show: 'Появление',
    peek: 'Голова из-за рамы',
    hatch: 'Вылупляются из двух яиц',
    fidget_a: 'Зевок',
    fidget_b: 'Чих',
    happy: 'Хлопок пятками',
    look: 'Пахнет пирожками',
  },
};
export default panda;
