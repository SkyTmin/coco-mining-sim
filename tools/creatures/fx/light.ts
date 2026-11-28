// Light is sampled once per pixel. Crossed lines, flash cores and pools add on f.light.
import type { Pen } from './pen';

import { resolveRamp, type FxPalette } from './palette';

type Colors = FxPalette | string;
function inks(colors: Colors): readonly string[] {
  return typeof colors === 'string' && colors.startsWith('#') ? [colors] : resolveRamp(colors as FxPalette);
}

function wash(p: Pen, x0: number, y0: number, x1: number, y1: number, colors: Colors, power: number, falloff: (x: number, y: number) => number) {
  if (!(power > 0)) return;
  const ramp = inks(colors);
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const k = Math.max(0, 1 - falloff(x, y));
      if (power * k * k < 0.5 / 255) continue;
      p.col(ramp[Math.min(ramp.length - 1, Math.floor(k * ramp.length))], power * k * k);
      p.dot(x, y);
    }
  }
}

export function glow(p: Pen, x: number, y: number, r: number, colors: Colors, strength = 1, aspect = 1) {
  if (!(r > 0 && aspect > 0)) return;
  const ry = r * aspect;
  wash(p, x - r, y - ry, x + r, y + ry, colors, strength,
    (px, py) => Math.hypot((px - x) / r, (py - y) / ry));
}

export function glowLine(p: Pen, x0: number, y0: number, x1: number, y1: number, r: number, colors: Colors, strength = 1) {
  if (!(r > 0)) return;
  const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy;
  wash(p, Math.min(x0, x1) - r, Math.min(y0, y1) - r, Math.max(x0, x1) + r, Math.max(y0, y1) + r, colors, strength, (x, y) => {
    const u = len2 ? Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / len2)) : 0;
    return Math.hypot(x - x0 - u * dx, y - y0 - u * dy) / r;
  });
}

export function glowRing(p: Pen, x: number, y: number, r: number, width: number, colors: Colors, strength = 1, aspect = 1) {
  if (!(r > 0 && width > 0 && aspect > 0)) return;
  const rx = r + width, ry = rx * aspect;
  wash(p, x - rx, y - ry, x + rx, y + ry, colors, strength,
    (px, py) => Math.abs(Math.hypot(px - x, (py - y) / aspect) - r) / width);
}

export function pointLight(p: Pen, x: number, y: number, colors: Colors, strength = 1) {
  if (!(strength > 0)) return;
  const ramp = inks(colors);
  p.col(ramp[ramp.length - 1], strength);
  p.dot(Math.round(x), Math.round(y));
}

/** Fast ignition, a shrinking radius and a quadratic tail. Age and life are seconds. */
export function flash(p: Pen, x: number, y: number, r: number, colors: Colors, age: number, life: number, strength = 1, aspect = 1) {
  if (age < 0 || age >= life) return;
  const phase = age / life;
  const k = phase < 0.12 ? 0.6 + 0.4 * phase / 0.12 : ((1 - phase) / 0.88) ** 2;
  glow(p, x, y, r * (0.55 + k * 0.45), colors, strength * k, aspect);
}
