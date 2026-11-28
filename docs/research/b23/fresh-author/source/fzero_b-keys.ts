import { readCreatureCard } from '../bodies/card-data';
import { buildMoveBook } from '../moves';

const card = readCreatureCard('fzero_b');
export default buildMoveBook(card.moves, card.body);
