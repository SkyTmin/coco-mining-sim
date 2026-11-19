import { fieldJuggle } from './ink_admiral-field';
import { readCreatureCard } from '../bodies/card-data';
import { withTechniques } from '../technique';
import { effects } from './ink_admiral-fx';
import book from './ink_admiral-keys';
import { clips, gesture } from './ink_admiral-poses';
import { admiralFrame } from './ink_admiral-rig';
const card = readCreatureCard('ink_admiral');
const { frame, props } = fieldJuggle(admiralFrame(card, card.life, gesture));
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
    props,
    effects,
  },
  book,
);
