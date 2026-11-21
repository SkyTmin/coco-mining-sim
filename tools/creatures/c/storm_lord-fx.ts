// Effects of Раскат. The storm language: lightning is a jagged line with branches — a white core, a turquoise-blue
// glow, a violet edge — for 2–3 frames, then an afterglow and the painting's flash; a dash leaves a zigzag of light
// and fading afterimages; a drum hit flashes the hide and rolls a shock ring over the stone; scorch marks and cracks
// keep a smouldering turquoise edge that cools by the end of the clip; floating stones rise on a ring and tremble.
// Always: a cold aura behind him that separates him from the night (in the storm a violet-white halo with sparks).
import { hash, TAU } from '../kit/f11-mobkit';
import { ellFill } from '../fx/field';
import type { Pen } from '../fx/pen';
import type { FxInput, XY } from '../types';

export const boltC = { core: '#ffffff', glow: '#a8e8ff', edge: '#8a7aff' };
const F2 = new Set(['idle-f2', 'happy-f2', 'trick-f2', 'trick_b-f2', 'trick_c-f2']);
const frameOf = (f: FxInput) => f.t * 24;
/** A socket now; null where it does not exist. */
export function pt(f: FxInput, name: string, frame?: number): XY | null {
  if (frame === undefined) return f.points[name] ?? null;
  try {
    return f.pointAt(Math.max(0, frame) / 24, name);
  } catch {
    return null;
  }
}
/** A soft glow: rings of falling alpha (banded, pixel style). */
export function glow(p: Pen, at: XY, rx: number, ry: number, color: string, a: number, bands = 5) {
  for (let i = bands; i >= 1; i--) {
    const k = i / bands;
    ellFill(p, at, rx * k, ry * k, color, (a / bands) * (1.2 - k * 0.4));
  }
}
/** The aura behind him: a cold turquoise haze round the body; in the storm a violet-white halo and drifting sparks. */
function aura(f: FxInput, frame: number, k: number) {
  const body = pt(f, 'body'),
    head = pt(f, 'head');
  if (!body || !head) return;
  const c: XY = [(body[0] + head[0]) / 2, (body[1] + head[1]) / 2];
  const pulse = 0.85 + 0.15 * Math.sin((frame / 24) * TAU * 0.5);
  glow(f.under, c, 52 + 10 * k, 66 + 12 * k, k > 0.5 ? '#7a6ae0' : '#2a8a9a', (1.0 + 0.3 * k) * pulse, 7);
  glow(f.under, c, 26 + 8 * k, 38 + 10 * k, k > 0.5 ? '#c8c0ff' : '#3ab4c4', (0.35 + 0.2 * k) * pulse, 4);
  if (k > 0.5)
    for (let i = 0; i < 10; i++) {
      const life = 30,
        age = (frame + i * 7) % life;
      const a = hash(i, Math.floor((frame + i * 7) / life)) * TAU;
      const d = 30 + age * 1.2;
      f.under.col(i % 3 ? '#a8e8ff' : '#fff2b0', 0.9 * (1 - age / life));
      f.under.dot(Math.round(c[0] + Math.cos(a) * d * 0.8), Math.round(c[1] + Math.sin(a) * d - age * 0.6), 1, 1);
    }
}

export function stormEffects(f: FxInput) {
  const frame = frameOf(f);
  aura(f, frame, F2.has(f.anim) ? 1 : 0);
}
