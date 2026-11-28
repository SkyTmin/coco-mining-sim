import { readCreatureCard } from '../bodies/card-data';
import { armedFrame } from '../bodies/armed-biped';
import { buildEffects } from '../fx/presets';
import { withTechniques } from '../technique';
import type { Creature } from '../types';
import book from './penguin_marshal-keys';
import { clips, gesture } from './penguin_marshal-poses';
import { marshalFigure } from './penguin_marshal-skin';

const card = readCreatureCard('penguin_marshal');
const figures = armedFrame(card, card.life, { pose: gesture, figure: marshalFigure });
const body: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: {
    ...clips,
    ...Object.fromEntries(Object.entries(book).map(([id, move]) => [id, { seconds: move.seconds! }])),
  },
  frame: figures,
  ...buildEffects(card, book),
};
export default withTechniques(body, book);
