import { readCreatureCard } from '../bodies/card-data';
import type { Creature } from '../types';
import { clips, home } from './pocket_magnet-poses';
import { magnetCub } from './pocket_magnet-skin';
import { benchToys } from './pocket_magnet-fx';
import { catchStar, fishLatch, fishReturn, magneticContact } from './pocket_magnet_fx-beats';
const card = readCreatureCard('pocket_magnet');
const painting: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  portraitOrigin: home,
  frame: magnetCub,
  fxOptions: { spread: 1 },
  animations: {
    ...clips,
    trick: { ...clips.trick, contacts: [{ frame: fishLatch }, { frame: fishReturn }] },
    trick_b: { ...clips.trick_b, contacts: [{ frame: catchStar, freeze: 2, shake: 5, amp: 2 }] },
  },
  props: benchToys,
  effects: magneticContact,
  reelWalkRoute: ['nw', 'e', 'sw', 'n', 'se', 'w', 'ne', 's'],
  reelGroups: [
    ['hatch', 'idle', 'fidget_a', 'fidget_b'],
    ['prepare_walk'],
    ['look', 'trick', 'happy'],
    ['tired', 'sleep_in', 'sleep', 'sleep_out'],
    ['trick_b'],
    ['sleep_in', 'sleep', 'wake_startled'],
  ],
  titles: {
    look: 'Оглядывает мастерскую',
    prepare_walk: 'Переносит вес на лапку',
    fidget_a: 'Трёт щёчку',
    fidget_b: 'Оглядывается на магнит',
    happy: 'Подскакивает от радости',
    hatch: 'Подпрыгивает и прислушивается',
    tired: 'Сонно щурится',
    trick: 'Поднимает жестяную рыбку',
    trick_b: 'Раскачивает и ловит звезду',
  },
};
export default painting;
