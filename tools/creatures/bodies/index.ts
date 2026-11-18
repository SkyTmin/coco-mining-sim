import { armedFrame, type ArmedAppearance } from './armed-biped';
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
  heavy?: HeavyAppearance;
  armed?: ArmedAppearance;
  draw?: PilotAppearance;
  effects?: PaintHooks;
}

export function makeBodyCreature(
  card: CreatureCard,
  book: TechniqueBook,
  route: MotionPlan = card.life,
  appearance: BodyAppearance = {},
): Creature {
  const frame =
    card.body === 'heavy-quadruped'
      ? heavyFrame(card, route, appearance.heavy)
      : card.body === 'armed-biped'
        ? armedFrame(card, route, appearance.armed)
        : pilotFrame(card, route, appearance.draw);
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
    frame,
    ...buildEffects(card, book, appearance.effects),
  };
  return attachMotion(withTechniques(creature, book), route);
}
