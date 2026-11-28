import { readCreatureCard } from '../bodies/card-data';
import { withTechniques } from '../technique';
import { effects } from './sand_scorpion-fx';
import book from './sand_scorpion-keys';
import { clips, gesture } from './sand_scorpion-poses';
import { scorpionFrame } from './sand_scorpion-rig';
const card = readCreatureCard('sand_scorpion');
const frame = scorpionFrame(card, card.life, gesture);
export default withTechniques(
  {
    id: card.id,
    rarity: card.rarity,
    theme: card.theme,
    animations: {
      ...clips,
      ...Object.fromEntries(Object.entries(book).map(([name, m]) => [name, { seconds: m.seconds! }])),
    },
    frame,
    effects,
  },
  book,
);
