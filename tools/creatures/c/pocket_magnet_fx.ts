import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import accepted from './pocket_magnet';
import { benchToys } from './pocket_magnet-fx';
import { catchStar, fishLatch, fishReturn, magneticContact } from './pocket_magnet_fx-beats';

const card = readCreatureCard('pocket_magnet_fx');
const painting: Creature = {
  ...accepted,
  id: card.id,
  theme: card.theme,
  fxOptions: { spread: 1 },
  animations: {
    ...accepted.animations,
    trick: {
      ...accepted.animations.trick,
      contacts: [{ frame: fishLatch }, { frame: fishReturn }],
    },
    trick_b: {
      ...accepted.animations.trick_b,
      contacts: [{ frame: catchStar, freeze: 2, shake: 5, amp: 2 }],
    },
  },
  props: benchToys,
  effects: magneticContact,
};
export default painting;
