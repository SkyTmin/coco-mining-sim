import { armedFrame } from '../bodies/armed-biped';
import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { clips, gesture } from './astral_seer-poses';
import { seerFigure } from './astral_seer-skin';

const card = readCreatureCard('astral_seer');
const seer: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: { ...clips },
  frame: armedFrame(card, card.life, { pose: gesture, figure: seerFigure(gesture) }),
};
export default seer;
