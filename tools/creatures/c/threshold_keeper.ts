import type { Creature } from '../types';
import { card } from './threshold_keeper-craft';
import { gestures } from './threshold_keeper-fx';
import { figure } from './threshold_keeper-figure';
import { clips, home } from './threshold_keeper-score';
import { size, toWorld } from './threshold_keeper-stage';
const keeper: Creature = {
  id: 'threshold_keeper',
  rarity: card.rarity,
  theme: card.theme,
  size,
  portraitOrigin: toWorld(home),
  animations: clips,
  frame: figure,
  effects: gestures,
  overClips: ['trick', 'trick-f2', 'trick_b-f2'],
  titles: {
    life: 'Жизнь',
    fidget_a: 'Перестукивается с домиком',
    fidget_b: 'Проверяет ключ',
    look: 'Слушает за дверью',
    happy: 'Кланяется и прижимает лапки к груди',
    tired: 'Домик стал тяжёлым',
    trick: 'Через маленькую дверь — за небесным паромом',
    trick_b: 'Доставляет письмо по складному мосту',
    phase: 'Дом раскрывается в часовую башню',
    'idle-f2': 'Покой часовой башни',
    'happy-f2': 'Звонят башенные часы',
    'trick-f2': 'Поднимается зажечь маяк над облаками',
    'trick_b-f2': 'Проводит свет по карте между маяками',
    show: 'Кто живёт за маленькой дверью',
    peek: 'Выглядывает из-за косяка',
    hatch: 'Первый порог',
  },
};
export default keeper;
