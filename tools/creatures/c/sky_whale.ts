import { readCreatureCard } from '../bodies/card-data';
import { withTechniques } from '../technique';
import { effects } from './sky_whale-fx';
import book from './sky_whale-keys';
import { clips, gesture } from './sky_whale-poses';
import { whaleFrame } from './sky_whale-rig';
const card = readCreatureCard('sky_whale');
export default withTechniques(
  {
    id: card.id,
    rarity: card.rarity,
    theme: card.theme,
    animations: {
      ...clips,
      ...Object.fromEntries(Object.entries(book).map(([name, m]) => [name, { seconds: m.seconds! }])),
    },
    frame: whaleFrame(card, card.life, gesture),
    effects,
  },
  book,
);
