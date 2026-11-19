import { armedFrame, type ArmedAppearance } from './armed-biped';
import { arachnidFrame, type ArachnidAppearance } from './arachnid';
import { cephalopodFrame, type CephalopodAppearance } from './cephalopod';
import { lightFrame, type LightAppearance } from './light-quadruped';
import { heavyFrame, type HeavyAppearance } from './heavy-quadruped';
import { pilotFrame, type PilotAppearance } from './families';
import { bodySources } from './sources';
import type { BodyType, CreatureCard } from './card-data';
import { buildEffects, type PaintHooks } from '../fx/presets';
import { everyday } from '../rig/figure';
import { attachMotion } from '../motion';
import { withTechniques, type TechniqueBook } from '../technique';
import type { Animation, Creature, MotionPlan } from '../types';

export { bodySources };
export const bodyTypes = Object.keys(bodySources) as BodyType[];

export interface BodyAppearance {
  arachnid?: ArachnidAppearance;
  heavy?: HeavyAppearance;
  light?: LightAppearance;
  armed?: ArmedAppearance;
  cephalopod?: CephalopodAppearance;
  draw?: PilotAppearance;
  effects?: PaintHooks;
}

function frameFor(card: CreatureCard, route: MotionPlan, appearance: BodyAppearance): Creature['frame'] {
  switch (card.body) {
    case 'arachnid': return arachnidFrame(card, route, appearance.arachnid);
    case 'heavy-quadruped': return heavyFrame(card, route, appearance.heavy);
    case 'armed-biped': return armedFrame(card, route, appearance.armed);
    case 'light-quadruped': return lightFrame(card, route, appearance.light);
    case 'cephalopod': return cephalopodFrame(card, route, appearance.cephalopod);
    default: return pilotFrame(card, route, appearance.draw);
  }
}

export function makeBodyCreature(
  card: CreatureCard,
  book: TechniqueBook,
  route: MotionPlan = card.life,
  appearance: BodyAppearance = {},
): Creature {
  const animations: Record<string, Animation> = { ...everyday };
  if (card.body === 'long-flier' || card.body === 'winged-dragon')
    animations.fly = { seconds: 1, loop: true };
  for (const [id, technique] of Object.entries(book)) {
    animations[id] = { seconds: technique.seconds ?? (technique.keys.at(-1)!.frame + 1) / 24 };
  }
  const creature: Creature = {
    id: card.id,
    rarity: card.rarity,
    theme: card.theme,
    animations,
    frame: frameFor(card, route, appearance),
    ...buildEffects(card, book, appearance.effects),
  };
  return attachMotion(withTechniques(creature, book), route);
}
