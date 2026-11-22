import { armedFrame } from '../bodies/armed-biped';
import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { drakeEffects } from './eclipse_drake-fx';
import { clips, gesture } from './eclipse_drake-poses';
import { drakeFigure } from './eclipse_drake-skin';

const card = readCreatureCard('eclipse_drake');
const drake: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...clips },
  frame: armedFrame(card, card.life, { pose: gesture, figure: drakeFigure(gesture) }),
  effects: drakeEffects,
  overClips: ['trick_b', 'trick-f2', 'trick_b-f2', 'trick_c-f2'],
  titles: {
    trick: 'Трюк: солнечный луч',
    trick_b: 'Трюк: к зениту',
    trick_c: 'Трюк: зеркала зенита',
    phase: 'Затмение',
    'idle-f2': 'Покой Затмения',
    'happy-f2': 'Радость Затмения',
    'trick-f2': 'Трюк: вихрь короны',
    'trick_b-f2': 'Трюк: лунная тень',
    'trick_c-f2': 'Трюк: звездопад',
    show: 'Появление: восход',
    peek: 'Голова сверху',
    hatch: 'Вылупляется из солнечного яйца',
    fidget_a: 'Чистит крыло',
    fidget_b: 'Зевок',
    happy: 'Оборот в воздухе',
    look: 'Смотрит вдаль из-под крыла',
  },
};
export default drake;
