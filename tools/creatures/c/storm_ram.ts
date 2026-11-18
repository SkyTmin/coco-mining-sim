import { readCreatureCard } from '../studio/card';
import { makeBodyCreature } from '../bodies';
import book from './storm_ram-keys';
import route from './storm_ram-life';
import { stormSkin } from './storm_ram-skin';
import { stormEffects } from './storm_ram-actions';

const ram = makeBodyCreature(readCreatureCard('storm_ram'), book, route, { heavy: stormSkin });
// The ram strikes the deck itself. Its cue is the lowered horn before the actual discharge.
delete ram.props;
ram.effects = stormEffects;
const frame = ram.frame;
ram.frame = (anim, t, side, variant, steer) => {
  if (anim === 'look') {
    const turn = Math.sin((Math.PI * t) / ram.animations.look.seconds) ** 2;
    return frame(anim, t, side, variant, {
      headSide: side,
      gaitPhase: 0,
      ...steer,
      techniquePose: { ...steer?.techniquePose, 'head.yaw': -0.62 * turn, twist: 0.24 * turn },
    });
  }
  return frame(anim, t, side, variant, steer);
};
export default ram;
