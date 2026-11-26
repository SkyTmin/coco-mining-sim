import type { Creature } from '../types';
import { card } from './threshold_keeper-craft';
import { gestures } from './threshold_keeper-fx';
import { figure } from './threshold_keeper-figure';
import { clips, home } from './threshold_keeper-score';
const keeper: Creature = {
  id: 'threshold_keeper',
  rarity: card.rarity,
  theme: card.theme,
  portraitOrigin: home,
  animations: clips,
  frame: figure,
  effects: gestures,
  overClips: ['trick', 'trick-f2', 'trick_b-f2'],
  titles: {
    life: 'Жизнь',
    fidget_a: 'Перестукивается с домиком',
    fidget_b: 'Проверяет ключ',
    look: 'Слушает за дверью',
    happy: 'Подпрыгивает вместе с домиком',
    tired: 'Домик стал тяжёлым',
    trick: 'Входит в дом на спине и выходит из рамы',
    trick_b: 'Разворачивает лестницу из порога',
    phase: 'Дом раскрывается в часовую башню',
    'idle-f2': 'Покой часовой башни',
    'happy-f2': 'Звонят башенные часы',
    'trick-f2': 'Поворачивает лестницу в небе',
    'trick_b-f2': 'Сворачивает город в карту',
    show: 'Кто живёт за маленькой дверью',
    peek: 'Выглядывает из-за косяка',
    hatch: 'Первый порог',
  },
};
export default keeper;
