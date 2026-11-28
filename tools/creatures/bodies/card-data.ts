import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FxPalette } from '../fx/palette';
import type { ImpactContact, MotionPlan, Rarity } from '../types';

export const cardDirectory = join(import.meta.dirname, '../c');

export type BodyType =
  | 'sky-swimmer'
  | 'arachnid'
  | 'cephalopod'
  | 'light-quadruped'
  | 'heavy-quadruped'
  | 'hexapod'
  | 'long-flier'
  | 'armed-biped'
  | 'squat-mage'
  | 'giant'
  | 'winged-dragon';
export type TemplateId =
  | 'overhead'
  | 'ram'
  | 'sweep'
  | 'slide'
  | 'volley'
  | 'breath'
  | 'leap'
  | 'pillars'
  | 'roar'
  | 'summon'
  | 'dive';
export type EffectId = 'ice' | 'lava' | 'crystal' | 'spores' | 'coins' | 'silk-wind' | 'thorns';
export interface CardMove {
  id: string;
  title: string;
  template: TemplateId;
  weapon: string;
  reference: string;
  parameters: { strength: number; amplitude: number; side: number; repeats: number };
  logic: string[];
  contacts?: ImpactContact[];
}
export interface CreatureCard {
  id: string;
  name: string;
  body: BodyType;
  theme: string;
  rarity: Rarity;
  proportions: Record<string, number>;
  parts: string[];
  secondaryMotion?: Record<string, string>;
  materials: { name: string; tones: string[]; texture: string }[];
  details: string[];
  effects: EffectId;
  fxRamp?: FxPalette;
  moves: CardMove[];
  life: MotionPlan;
}

export function cardPath(id: string, dir: string) {
  if (!/^[a-z][a-z0-9_]*$/.test(id)) throw Error('Некорректный id существа: ' + id);
  return join(dir, id + '.card.json');
}

/** Drafts can already render while the artist is still filling in the detail inventory. */
export function readCreatureCard(id: string, dir = cardDirectory): CreatureCard {
  return JSON.parse(readFileSync(cardPath(id, dir), 'utf8')) as CreatureCard;
}
