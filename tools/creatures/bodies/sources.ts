import type { BodyType } from './card-data';

/** Accepted anatomy and walk cycle used by each family. */
export const bodySources: Record<BodyType, string> = {
  arachnid: 'sand_scorpion',
  cephalopod: 'ink_admiral',
  'light-quadruped': 'root_stag',
  'heavy-quadruped': 'bramble_warden',
  hexapod: 'gem_beetle',
  'long-flier': 'silk_dragon',
  'armed-biped': 'frost_yeti',
  'squat-mage': 'toad_shaman',
  giant: 'crater_titan',
  'winged-dragon': 'coin_dragon',
};
