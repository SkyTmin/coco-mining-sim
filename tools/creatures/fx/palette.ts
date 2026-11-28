// Pixel art keeps the artist's inks when fitting a material to more or fewer steps.
import { effectPresets, type PresetId } from './presets/materials';

export type FxPalette = `material:${PresetId}` | readonly string[];
export const defaultPalette: FxPalette = 'material:coins';

export function resolveRamp(palette: FxPalette): readonly string[] {
  if (typeof palette !== 'string') {
    if (!palette.length) throw Error('An FX ramp needs at least one ink');
    return palette;
  }
  const key = palette.slice('material:'.length) as PresetId;
  if (!palette.startsWith('material:') || !Object.hasOwn(effectPresets, key))
    throw Error('Unknown FX material ' + palette);
  return effectPresets[key].ramp;
}

/** Order is dark to light. Keep both endpoints when n >= 2; a single step takes the shadow. */
export function fit(palette: FxPalette, n: number): string[] {
  if (!Number.isSafeInteger(n) || n < 1) throw RangeError('FX ramp length must be a positive integer');
  const ramp = resolveRamp(palette);
  return Array.from({ length: n }, (_, i) => ramp[Math.round(i * (ramp.length - 1) / Math.max(1, n - 1))]);
}
