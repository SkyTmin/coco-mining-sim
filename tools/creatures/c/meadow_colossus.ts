import { heavyFrame } from '../bodies/heavy-quadruped';
import { readCreatureCard } from '../bodies/card-data';
import { withTechniques } from '../technique';
import type { Creature } from '../types';
import book from './meadow_colossus-keys';
import { meadowAnimations, meadowPose } from './meadow_colossus-poses';
import { meadowEffects } from './meadow_colossus-fx';
import { meadowSkin } from './meadow_colossus-skin';

const card = readCreatureCard('meadow_colossus');
const body = heavyFrame(card, card.life, meadowSkin);
const colossus: Creature = {
  id: card.id,
  rarity: card.rarity,
  theme: card.theme,
  animations: meadowAnimations,
  effects: meadowEffects,
  frame(anim, t, side, variant, steer) {
    // All body motion, including the breathing envelope, belongs to the authored keys.
    // Use the library's neutral skeleton here to avoid applying its default gait twice.
    const pose = steer?.techniquePose ?? meadowPose(anim, t, side);
    const drawSide = pose['turn.side'] ?? side;
    const frame = body('gesture', 0, drawSide, variant, {
      headSide: (steer?.headSide ?? side) + drawSide - side,
      gaitPhase: steer?.gaitPhase ?? t,
      techniquePose: pose,
    });
    // The reference sheets register the deck at the front edge of the near
    // support polygon. Its projection lies six pixels below the body's origin.
    frame.dy = (frame.dy ?? 0) - 6;
    return frame;
  },
};
export default withTechniques(colossus, book);
