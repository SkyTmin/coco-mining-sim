import { readCreatureCard } from '../studio/card';
import { makeBodyCreature } from '../bodies';
import book from './storm_ram-keys';
import route from './storm_ram-life';
import { stormSkin } from './storm_ram-skin';

export default makeBodyCreature(readCreatureCard('storm_ram'), book, route, { heavy: stormSkin });
