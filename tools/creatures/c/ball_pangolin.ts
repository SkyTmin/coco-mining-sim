import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { pangolinEffects } from './ball_pangolin-fx';
import { clips, gesture } from './ball_pangolin-poses';
import { pangolinFrame } from './ball_pangolin-skin';

const card = readCreatureCard('ball_pangolin');
const pangolin: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...clips },
  frame: pangolinFrame(card, card.life, gesture),
  effects: pangolinEffects,
  overClips: ['trick', 'trick_b'],
  titles: {
    trick: 'Трюк: колобок',
    trick_b: 'Трюк: термиты',
    hatch: 'Выкатывается из норы',
    fidget_a: 'Чистит когти',
    fidget_b: 'Чешет спину хвостом',
    happy: 'Шишка',
  },
};
export default pangolin;
