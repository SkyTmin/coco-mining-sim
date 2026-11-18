// The same schema serves the editor, the generator and the gate.
import Ajv from 'ajv';
import { resolveTechniqueBeats } from '../motion';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Creature, MotionPlan, Rarity } from '../types';
import schema from './card.schema.json' with { type: 'json' };

import {
  cardDirectory as source,
  cardPath,
  readCreatureCard,
  type CreatureCard,
  type BodyType,
  type TemplateId,
  type EffectId,
} from '../bodies/card-data';
export type { CreatureCard, BodyType, TemplateId, EffectId, CardMove } from '../bodies/card-data';
export { readCreatureCard } from '../bodies/card-data';

const validator = new Ajv({ allErrors: true, strictTypes: false }).compile<CreatureCard>(schema);
const legacy = new Set(['gem_beetle', 'silk_dragon', 'toad_shaman', 'crater_titan', 'coin_dragon']);
export const bodyIds = schema.definitions.body.enum as BodyType[];
export const effectIds = schema.definitions.effects.enum as EffectId[];
export const templateIds = schema.definitions.template.enum as TemplateId[];
export const techniqueCounts: Record<Rarity, number> = {
  common: 2,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6,
  secret: 6,
};

export function cardIssues(data: unknown, id: string): string[] {
  if (!validator(data))
    return (validator.errors ?? [])
      .filter((e) => e.keyword !== 'if')
      .map((e) => (e.instancePath || '/') + ' ' + e.message);
  const errors: string[] = [];
  if (data.id !== id) errors.push('ID в карточке должен совпадать с именем файла');
  if (new Set(data.moves.map((m) => m.id)).size !== data.moves.length)
    errors.push('Повторяется id приёма');
  const normalize = (s: string) => s.trim().toLocaleLowerCase('ru').replace(/\s+/g, ' ');
  if (new Set(data.details.map(normalize)).size !== data.details.length)
    errors.push('Повторяется подробность');
  if (new Set(data.materials.map((m) => normalize(m.name))).size !== data.materials.length)
    errors.push('Повторяется название материала');
  const actions = new Set(data.moves.map((m) => m.id));
  for (const beat of data.life.beats) {
    if (beat.anim.startsWith('tech_') && !actions.has(beat.anim))
      errors.push('В маршруте отсутствующий приём ' + beat.anim);
  }
  return errors;
}

export function checkCardFile(id: string, dir = source): string[] {
  try {
    if (legacy.has(id) && !existsSync(cardPath(id, dir))) return [];
    const data = readCreatureCard(id, dir);
    const errors = cardIssues(data, id);
    if (!errors.length && !existsSync(join(dir, '../scenes', data.theme + '.ts')))
      errors.push('Нет сцены ' + data.theme);
    return errors;
  } catch (e) {
    return ['Карточка ' + id + ': ' + (e instanceof Error ? e.message : String(e))];
  }
}

/** Run after schema validation. Compare the authored data with the skeleton and the actual route. */
export function cardRuntimeIssues(c: Creature): string[] {
  if (!existsSync(cardPath(c.id, source))) return [];
  const data = readCreatureCard(c.id),
    errors: string[] = [];
  if (c.rarity !== data.rarity || c.theme !== data.theme)
    errors.push('Тема или редкость отличаются от карточки');
  const actual = Object.keys(c.animations)
    .filter((a) => a.startsWith('tech_'))
    .sort();
  const ids = data.moves.map((m) => m.id).sort();
  if (ids.join(',') !== actual.join(',')) errors.push('Список приёмов отличается от карточки');
  for (const m of data.moves) {
    const move = c.techniques?.[m.id];
    if (!move || move.reference !== m.reference || move.weapon !== m.weapon)
      errors.push(m.id + ': сокет или эталон отличаются от карточки');
  }
  if (!c.motion || !sameRoute(resolveTechniqueBeats(c, data.life), c.motion))
    errors.push('Сценарий life отличается от карточки');
  return errors;
}

function sameRoute(a: MotionPlan, b: MotionPlan) {
  return (
    a.yaw === b.yaw &&
    a.stride === b.stride &&
    Boolean(a.fly) === Boolean(b.fly) &&
    a.beats.length === b.beats.length &&
    a.beats.every((beat, i) => {
      const other = b.beats[i];
      return (
        beat.anim === other.anim &&
        beat.seconds === other.seconds &&
        beat.side === other.side &&
        beat.lift === other.lift &&
        beat.at.every((coord, j) => Math.abs(coord - other.at[j]) < 1e-12)
      );
    })
  );
}
