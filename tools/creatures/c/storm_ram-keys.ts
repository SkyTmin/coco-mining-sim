import { readCreatureCard } from '../studio/card';
import { buildMoveBook } from '../moves';

const card = readCreatureCard('storm_ram');
const book = buildMoveBook(card.moves, card.body, {
  tech_ram: {
    targets: [[23, 11, 26], [24, 10, 22], [28, 9, 0], [29, 10, 1]],
    advance: [-16, -11, 14, 18],
    pitch: [-0.18, -0.14, 0.31, 0.38],
    crouch: [4, 4, 2, 3],
  },
  tech_volley: {
    targets: [[22, 10, 10], [22, 9, 14], [20, 10, 39], [17, 12, 42]],
    advance: [-4, -5, 4, 7],
    pitch: [0.21, 0.15, -0.56, -0.64],
    crouch: [7, 6, -3, -4],
  },
});
for (const move of Object.values(book)) move.interpolate = false;
export default book;
