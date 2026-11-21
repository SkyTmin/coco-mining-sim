import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { serpentEffects } from './prism_serpent-fx';
import { clips, gesture, loops } from './prism_serpent-poses';
import { serpentFrame } from './prism_serpent-skin';

const card = readCreatureCard('prism_serpent');
const serpent: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...clips },
  frame: serpentFrame(card, card.life, gesture, loops, Object.fromEntries(Object.entries(clips).map(([k, c]) => [k, c.seconds]))),
  effects: serpentEffects,
  overClips: ['trick', 'trick_d'],
  titles: {
    trick: 'Трюк: радужная горка',
    trick_b: 'Трюк: колесо',
    trick_c: 'Трюк: сердечко',
    trick_d: 'Трюк: пружинка',
    hatch: 'Из яйца',
    fidget_a: 'Чистит перья',
    fidget_b: 'Ловит свой хвост',
    fidget_c: 'Хвастается веером',
    happy: 'Пируэт в воздухе',
  },
};
export default serpent;
