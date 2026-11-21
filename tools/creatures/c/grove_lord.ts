import { readCreatureCard } from '../bodies/card-data';
import { withTechniques } from '../technique';
import { effects } from './grove_lord-fx';
import book from './grove_lord-keys';
import { clips, gesture } from './grove_lord-poses';
import { groveFrame } from './grove_lord-rig';
const card = readCreatureCard('grove_lord');
export default withTechniques(
  {
    id: card.id,
    rarity: card.rarity,
    theme: card.theme,
    animations: {
      ...clips,
      ...Object.fromEntries(Object.entries(book).map(([name, m]) => [name, { seconds: m.seconds! }])),
    },
    frame: groveFrame(card, card.life, gesture),
    effects,
  },
  book,
);
