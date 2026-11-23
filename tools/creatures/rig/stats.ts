// Counters for the studio (ws review, ws profile): what one run really computed [research 23.11, R01 / VIII.6.1].
// compose — whole frames; history — earlier/later poses built only to answer pointAt (effect trails, flights);
// raster — renderRig calls and their pixels; wasted — rasters made inside a points-only build, where nobody looks at
// the picture (a skin's own front/wide renders that ignore the mode); skipped — rasters the points-only mode avoided.
// Pure counting: no pixel depends on it.
export const rigStats = { compose: 0, history: 0, raster: 0, rasterPixels: 0, wasted: 0, skipped: 0 };
export const rigMode = { pointsOnly: false };
export function resetRigStats() {
  for (const k of Object.keys(rigStats) as (keyof typeof rigStats)[]) rigStats[k] = 0;
}
