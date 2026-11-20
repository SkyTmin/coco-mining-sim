import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { puffEffects } from './puff_kit-fx';
import { clips, gesture, loops } from './puff_kit-poses';
import { puffFrame } from './puff_kit-skin';

const card = readCreatureCard('puff_kit');
const puff: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...clips },
  frame: puffFrame(card, card.life, gesture, loops),
  effects: puffEffects,
  overClips: ['trick_b'],
  titles: {
    trick: 'Трюк: детки-пушинки',
    trick_b: 'Трюк: парашютик',
    trick_c: 'Трюк: цветёт',
    trick_d: 'Трюк: желание',
    hatch: 'Из бутона',
    fidget_a: 'Умывается',
    fidget_b: 'Пушинка-беглянка',
    fidget_c: 'Ловит ветер',
    happy: 'Скачет',
  },
};
export default puff;
