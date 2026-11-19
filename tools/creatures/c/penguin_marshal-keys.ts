import { readCreatureCard } from '../bodies/card-data';
import { buildMoveBook } from '../moves';
import { aim } from '../bodies/goals';

const card = readCreatureCard('penguin_marshal');
const book = buildMoveBook(card.moves, card.body);
book.tech_slide.pathKeys = [
  { role: 'prep', frame: 10, pose: { ...aim('weaponTip', [19, 23, 62]), pitch: -0.13, dx: -5 } },
  {
    role: 'follow',
    frame: 34,
    pose: {
      ...book.tech_slide.keys[3].pose,
      ...aim('weaponTip', [58, 19, 0]),
      'goal.weaponTip.contactFrame': 34,
      dx: 22,
    },
  },
];
book.tech_leap.contacts = [
  { frame: 27, kind: 'floor', socket: 'footL', floorSocket: 'footLGround' },
  { frame: 30, kind: 'floor', socket: 'footR', floorSocket: 'footRGround' },
];
export default book;
