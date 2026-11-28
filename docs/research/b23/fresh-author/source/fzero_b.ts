import { makeBodyCreature } from '../bodies';
import { readCreatureCard } from '../bodies/card-data';
import { keyframer } from '../kit/pet-moves';
import { draw } from './fzero_b-skin';
import book from './fzero_b-keys';
import route from './fzero_b-life';

const card = readCreatureCard('fzero_b');
const pose = keyframer({tracks: {fidget_a: [
  [0, {}], [8, {}],
  [11, {'head.pitch': -0.16, 'head.yaw': -0.15}], [18, {'head.pitch': -0.16, 'head.yaw': -0.15}],
  [26, {lean: 3.2, reach: 4.3, 'neck.pitch': 0.32, 'head.pitch': 0.13}],
  [30, {lean: 3.2, reach: 4.3, 'neck.pitch': 0.32, 'head.pitch': 0.13}],
  [34, {lean: -2.3, reach: -3.8, 'neck.pitch': -0.24, 'head.pitch': -0.43, 'tail.pitch': -0.35}],
  [40, {lean: -2, reach: -3.4, 'neck.pitch': -0.20, 'head.pitch': -0.36}],
  [48, {'head.pitch': 0.18,'head.yaw': 0.12}], [60, {'head.pitch': 0.25,'head.yaw': 0.18}],
  [71, {}]
]}});
const creature = makeBodyCreature(card, book, route, {light:{draw,pose}});
creature.animations.fidget_a = {seconds: 3};
export default creature;

import { drawPod } from './fzero_b-props';
creature.props = drawPod;
