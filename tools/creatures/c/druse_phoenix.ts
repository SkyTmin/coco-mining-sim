import { readCreatureCard } from '../bodies/card-data';
import { reactGeode } from '../scenes/druse_phoenix';
import type { Creature } from '../types';
import { clips, gesture } from './druse_phoenix-clips';
import { effects } from './druse_phoenix-effects';
import { phoenixFrame } from './druse_phoenix-rig';

const card = readCreatureCard('druse_phoenix');

export default {
  id: card.id,
  theme: card.theme,
  rarity: card.rarity,
  portraitOrigin: [125, 166],
  animations: clips,
  frame: phoenixFrame(gesture, card.life.stride, card.life.yaw),
  effects(input) {
    reactGeode(input);
    effects(input);
  },
} satisfies Creature;
