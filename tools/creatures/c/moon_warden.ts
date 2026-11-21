import { armedFrame } from '../bodies/armed-biped';
import { readCreatureCard } from '../bodies/card-data';
import { techniquePoseAt, withTechniques } from '../technique';
import type { Creature } from '../types';
import { moonEffects } from './moon_warden-fx';
import book from './moon_warden-keys';
import { clips, gesture } from './moon_warden-poses';
import { moonFigureWithHistory } from './moon_warden-skin';

const card = readCreatureCard('moon_warden');
const figure = moonFigureWithHistory((anim, t) =>
  book[anim] ? techniquePoseAt(book[anim], t) : gesture(anim, t),
);
const warden: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: {
    ...clips,
    ...Object.fromEntries(Object.entries(book).map(([id, move]) => [id, { seconds: move.seconds! }])),
  },
  frame: armedFrame(card, card.life, { pose: gesture, figure }),
  effects: moonEffects,
};
export default withTechniques(warden, book);
