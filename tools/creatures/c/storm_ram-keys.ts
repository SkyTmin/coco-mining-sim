import { readCreatureCard } from '../studio/card';
import { buildMoveBook } from '../moves';

const card = readCreatureCard('storm_ram');
const book = buildMoveBook(card.moves, card.body, {
  tech_ram: {
    targets: [
      [23, 11, 26],
      [24, 10, 22],
      [28, 9, 0],
      [29, 10, 1],
    ],
    advance: [-16, -11, 14, 18],
    pitch: [-0.18, -0.14, 0.31, 0.38],
    crouch: [4, 4, 2, 3],
  },
  tech_volley: {
    targets: [
      [23, 13, 10],
      [24, 13, 10],
      [18, 6, 43],
      [16, 5, 46],
    ],
    advance: [-4, -5, 4, 9],
    pitch: [0.21, 0.15, -0.56, -0.64],
    crouch: [7, 6, -3, -4],
  },
});

book.tech_ram.contactKind = 'floor';
book.tech_ram.floorSocket = 'hornTipGround';
book.tech_ram.contacts = book.tech_ram.contacts?.map((contact) => ({
  ...contact,
  kind: 'floor',
  floorSocket: 'hornTipGround',
}));
export default book;
