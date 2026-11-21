import { hx, mixc } from '../kit/f11-mobkit';
import type { Rig, Mat, RGBA, Tones } from '../rig/f15-rig';
import type { CreatureCard } from './card-data';

// Preserve engraved lines and material patterns as the source for the lightness
// of each pixel. Recolour the pattern's result as well as the four base tones.
export function cardMaterials(materials: CreatureCard['materials']) {
  const ramps = materials.map((m) => m.tones.map((c) => hx(c)));
  const caches = ramps.map(() => new Map<number, RGBA>());
  const paint = (index: number, c: RGBA) => {
    const cache = caches[index],
      key = c[0] * 0x1000000 + c[1] * 0x10000 + c[2] * 0x100 + c[3];
    const found = cache.get(key);
    if (found) return found;
    const shades = ramps[index],
      v = ((0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255) * (shades.length - 1);
    const color = mixc(shades[Math.floor(v)], shades[Math.min(Math.floor(v) + 1, shades.length - 1)], v % 1);
    color[3] = c[3];
    cache.set(key, color);
    return color;
  };
  return (rig: Rig) => {
    const seen = ramps.map(() => new Map<Mat, Mat>());
    for (const q of rig.prims) {
      const tag = q.t ?? '';
      const group = /horn|staff|claw|tassel|purse|coin|bead|eye/i.test(tag)
        ? 2
        : /wing|cloak|fin|belly|chest|steam|leg/i.test(tag)
          ? 1
          : 0;
      const index = group % ramps.length;
      if (q.k === 3 || q.k === 4) {
        q.c = paint(index, q.c);
        continue;
      }
      const source = q.m,
        prior = seen[index].get(source);
      if (prior) {
        q.m = prior;
        continue;
      }
      const pattern = source.pat;
      const m: Mat = { ...source, T: source.T.map((c) => paint(index, c)) as Tones };
      if (pattern)
        m.pat = (p, l) => {
          const c = pattern(p, l);
          return c ? paint(index, c) : null;
        };
      seen[index].set(source, m);
      q.m = m;
    }
  };
}
