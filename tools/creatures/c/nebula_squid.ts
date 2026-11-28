import { readCreatureCard } from '../bodies/card-data';
import { withTechniques } from '../technique';
import { effects } from './nebula_squid-fx';
import book from './nebula_squid-keys';
import { clips, gesture } from './nebula_squid-poses';
import { squidFrame } from './nebula_squid-rig';
const card = readCreatureCard('nebula_squid');
export default withTechniques(
  {
    id: card.id,
    rarity: card.rarity,
    theme: card.theme,
    animations: {
      ...clips,
      ...Object.fromEntries(Object.entries(book).map(([name, m]) => [name, { seconds: m.seconds! }])),
    },
    frame: squidFrame(card, card.life, gesture),
    effects,
  },
  book,
);
