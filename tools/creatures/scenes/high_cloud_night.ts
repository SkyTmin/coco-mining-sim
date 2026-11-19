// Above the landing islands. Through openings in three banks of cloud the old
// aqueduct and two little navigation fires can still be seen from the upper air.
import { hash, hx, mixc, TAU } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import type { Scene } from '../types';
import { cloudbank, island } from './sky_islands';

const night = hx('#111c39'),
  dusk = hx('#4b5375'),
  moonlit = hx('#9db0b8');
function cloud(p: Px, x: number, y: number, w: number, depth: number, seed: number) {
  const shadow = hx('#394662'),
    rim = hx('#768aa1');
  const scales = [0.48, 0.75, 1, 0.68, 0.43];
  for (let i = 0; i < scales.length; i++) {
    const cx = x + (i - 2) * w * 0.29,
      r = scales[i] * w * 0.32;
    const cy = y + hash(seed, i) * depth * 0.38;
    p.ell(cx, cy, r, depth * scales[i], shadow);
    p.ell(cx - 1, cy - 1.5, r * 0.91, depth * scales[i] * 0.58, hx('#566781'));
    p.line(cx - r * 0.65, cy - depth * scales[i] * 0.42, cx - r * 0.13, cy - depth * scales[i] * 0.72, rim);
    // Wisps curl back underneath each lobe and break at the rim.
    const h = depth * scales[i];
    if (r > 5) {
      p.line(cx - r * 0.72, cy + h * 0.33, cx - r * 0.33, cy + h * 0.52, hx('#495b77'));
      p.line(cx - r * 0.33, cy + h * 0.52, cx + r * 0.18, cy + h * 0.35, hx('#495b77'));
      p.line(cx + r * 0.2, cy - h * 0.31, cx + r * 0.43, cy - h * 0.22, hx('#697e96'));
      p.set(cx - r * 0.24, cy - h * 0.78, hx('#a0b0b9'));
    }
  }
}
function viaduct(p: Px) {
  const masonry = hx('#515d76'),
    coping = hx('#73859a');
  for (let i = 0; i < 5; i++) {
    const x = 156 + i * 7,
      y = 84 - i;
    p.rect(x, y, x + 7, y + 4, masonry);
    p.rect(x + 1, y + 4, x + 2, y + 11, masonry);
    p.line(x, y, x + 6, y, coping);
    p.set(x + 3, y + 4, coping);
  }
}
function still(p: Px) {
  for (let y = 0; y < p.h; y++) {
    const t = Math.floor((50 * y) / p.h) / 50;
    p.rect(0, y, p.w - 1, y, mixc(night, dusk, Math.pow(t, 0.8)));
  }
  // The broken diagonal of the galaxy gives the sky a different depth from
  // the much sharper, lower cloud rims. A crescent leaves the middle in shade.
  for (let i = 0; i < 760; i++) {
    const x = hash(i, 15) * (p.w + 10) - 5,
      axis = 76 - 0.27 * x + 7 * Math.sin(x / 41);
    const y = axis + (hash(i, 17) + hash(i, 33) - 1) * 28;
    if (y < 0 || y > p.h - 1) continue;
    const density = 1 - Math.min(1, Math.abs(y - axis) / 25);
    p.set(
      x,
      y,
      mixc(
        p.get(Math.max(0, Math.min(p.w - 1, Math.round(x))), Math.round(y)),
        hx('#8b789c'),
        0.08 + 0.19 * density * hash(i, 9),
      ),
    );
  }
  for (let i = 0; i < 107; i++) {
    const x = 2 + hash(i, 57) * (p.w - 4),
      y = 1 + hash(i, 85) * 95,
      a = hash(i, 12);
    p.set(x, y, a > 0.82 ? hx('#a6b2c2') : hx('#677991'));
    if (a > 0.96) {
      p.line(x - 1, y, x + 1, y, hx('#8294ab'));
      p.set(x, y, hx('#d1cac0'));
    }
  }
  const cx = 205,
    cy = 24;
  for (let y = cy - 11; y <= cy + 11; y++)
    for (let x = cx - 11; x <= cx + 11; x++) {
      const outer = Math.hypot(x - cx, y - cy),
        eclipse = Math.hypot(x - cx - 3, y - cy + 3);
      if (outer < 9.5 && eclipse >= 9.0) p.set(x, y, outer > 8.4 ? hx('#8799ae') : hx('#c9cece'));
    }
  cloudbank(p, 73, 9, '#414d6e', '#526783');
  island(p, 30, 89, 0.42);
  island(p, 150, 86, 0.37);
  island(p, 194, 81, 0.51);
  viaduct(p);
  // The last watchtower sits below the viewpoint; its tiny lit windows
  // provide a scale for the sky mammal crossing in front of it.
  p.rect(25, 77, 29, 85, hx('#465670'));
  p.line(25, 76, 29, 76, hx('#8896a8'));
  p.line(27, 73, 30, 77, hx('#6c7d91'));
  p.set(27, 79, hx('#dfbd92'));
  for (let i = 0; i < 10; i++) {
    const u = i / 9;
    p.line(
      35 + Math.sin(u * 4),
      94 + i * 1.25,
      36 + Math.sin(u * 4),
      95 + i * 1.25,
      mixc(hx('#9bb3c2'), hx('#53647e'), u),
    );
  }
  cloudbank(p, 108, 12, '#53647e', '#76879b');
  for (let j = 0; j < 12; j++) {
    const x = hash(j, 2) * p.w,
      y = 115 + hash(j, 8) * 42;
    p.line(x, y, x + 5 + hash(j, 4) * 20, y - 1, hx('#687992'));
  }
  cloud(p, 36, 143, 81, 11, 2);
  cloud(p, 200, 158, 105, 15, 5);
  cloudbank(p, 177, 4, '#5b6a85', '#8d9ead');
  cloud(p, -3, 185, 94, 19, 9);
  cloud(p, p.w - 9, 195, 96, 24, 7);
}
let cache: Px;
const paint: Scene = (p, t) => {
  if (!cache || cache.w !== p.w || cache.h !== p.h) {
    cache = new Px(p.w, p.h);
    still(cache);
  }
  p.data.set(cache.data);
  const a = (TAU * t) / 3;
  for (let i = 0; i < 13; i++) {
    const x = 9 + hash(i, 645) * (p.w - 18),
      y = 7 + hash(i, 63) * 61;
    const glint = (1 + Math.cos(a - (i + 1) * 0.81)) / 2;
    p.set(x, y, mixc(hx('#657d9e'), hx('#e6d9c9'), glint));
    if (glint > 0.86) {
      p.set(x - 1, y, hx('#73859b'));
      p.set(x + 1, y, hx('#73859b'));
    }
  }
  for (const [x, y, phase] of [
    [30, 84, 0.42],
    [195, 73, 2.9],
  ]) {
    const fire = mixc(hx('#796d78'), hx('#f2d6a9'), (1 + Math.sin(a + phase)) / 2);
    p.set(x, y, fire);
  }
  for (let i = 0; i < 5; i++) {
    const x = 23 + i * 50 + 5 * Math.sin(a + i * 0.8),
      y = 125 + 11 * (i % 3) + Math.cos(a + i * 0.7) * 1.5;
    p.line(x, y, x + 4 + i, y - 1, i % 2 ? hx('#8394a7') : moonlit);
  }
};
export default paint;
