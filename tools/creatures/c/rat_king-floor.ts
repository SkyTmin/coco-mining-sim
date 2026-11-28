import { oval } from '../fx/field';
import { fillPoly } from '../fx/pen';
import type { FxInput, XY } from '../types';
import { techniqueContacts } from '../technique';
import book from './rat_king-keys';

const crack = '#352a2b',
  lip = '#b9a080',
  dust = '#a88e71';
function chips(f: FxInput, [x, y]: XY, t: number, polarity: number) {
  if (t > 0.46) return;
  for (let i = 0; i < 6; i++) {
    const u = t / 0.46,
      flight = Math.sin(Math.PI * u),
      sx = x + polarity * (1 + (i % 3)) + u * (i - 4) * 5;
    const sy = y + u * ((i % 3) - 1) * 11 - flight * (6 + ((i * 7) % 12));
    f.above.col(i % 2 ? lip : dust, 1 - u * 0.8);
    fillPoly(f.above, [sx - 2, sy, sx, sy - 1 - (i % 2), sx + 2, sy + 1, sx, sy + 2]);
  }
}
function fissure(f: FxInput, [x, y]: XY, t: number) {
  const grow = Math.min(1, t * 10 + 0.22);
  const fade = Math.min(1, (0.83 - t) * 5);
  const face = (col: string, coords: number[]) => {
    f.under.col(col, fade);
    fillPoly(
      f.under,
      coords.map((v, i) => (i % 2 ? y : x) + v * grow),
    );
  };
  face('#d9c3a0', [3, -2, -4, 4, -11, 4, -21, 6, -13, 2, -6, 1, -2, -2]);
  face('#25202a', [4, -3, -4, 3, -12, 3, -21, 5, -14, 0, -7, 0, -3, -3]);
  face('#342831', [-6, 1, -9, 6, -15, 10, -12, 5, -11, 3]);
  const u = Math.min(1, t / 0.48);
  for (const [dx, dy, height, size] of [
    [-19, 4, 17, 3],
    [-13, 8, 28, 4],
    [-9, -4, 12, 3],
    [4, 3, 20, 3],
    [-3, 8, 8, 2],
  ]) {
    const sx = Math.round(x + dx * (0.15 + 0.85 * u));
    const sy = Math.round(y + dy * u - height * Math.sin(u * Math.PI));
    f.above.col('#39313b', fade);
    fillPoly(f.above, [
      sx - size,
      sy - 1,
      sx - 1,
      sy - size,
      sx + size,
      sy - size + 1,
      sx + size,
      sy + 1,
      sx,
      sy + size,
      sx - size,
      sy + 1,
    ]);
    f.above.col('#a58f80', fade);
    fillPoly(f.above, [
      sx - size,
      sy - 1,
      sx - 1,
      sy - size,
      sx + size,
      sy - size + 1,
      sx,
      sy + 1,
      sx - size,
      sy + 1,
    ]);
    f.above.lineS(sx - size, sy - 1, sx - 1, sy - size, '#f1dac0', fade);
  }
}
function groove(f: FxInput, [x, y]: XY, t: number, index: number) {
  const u = Math.min(1, 0.1 + t * 10),
    alpha = Math.min(1, (0.83 - t) * 4);
  const width = 13 + index * 2;
  for (let i = 0; i <= 6; i++) {
    const a = (i / 7) * u,
      b = ((i + 1) / 7) * u;
    const pt = (v: number): XY => [x + v * width, y + v * (5 + index) + Math.sin(v * Math.PI) * 2];
    const A = pt(a),
      B = pt(b);
    f.under.lineS(A[0], A[1] + 1, B[0], B[1] + 1, lip, alpha);
    f.under.lineS(...A, ...B, crack, alpha);
  }
  chips(f, [x, y], t, -1);
}
function pulse(f: FxInput, [x, y]: XY, t: number, strength: number) {
  if (t > 0.65) return;
  const u = t / 0.65;
  const fade = Math.min(1, (1 - u) * 4);
  const radius = (4 + 39 * (1 - (1 - u) ** 2)) * strength;
  for (let i = 0; i < 8; i++) {
    const start = (i * Math.PI) / 4 + 0.09;
    const end = start + 0.6;
    const angle = start + 0.27;
    const ground = (a: number, dy: number): XY => [x + radius * Math.cos(a), y + radius * 0.34 * Math.sin(a) + dy];
    const ridge = (color: string, low: number, high: number) => {
      f.under.col(color, fade);
      fillPoly(f.under, [
        ...ground(start, low),
        ...ground(angle, low),
        ...ground(end, low),
        ...ground(end, high + 1),
        ...ground(angle, high),
        ...ground(start, high + 1),
      ]);
    };
    ridge('#654b4c', 2, -2);
    ridge('#c59b76', 0, -4);
    const [sx, sy] = ground(angle, -3);
    f.under.lineS(...ground(start + 0.09, -2), sx, sy - 1, '#f3d6a5', fade);
    if (i % 2 === 0 || i === 1) {
      const lift = Math.sin(Math.PI * u) * (4 + (i % 3));
      const px = x + (sx - x) * 0.87,
        py = sy - lift;
      f.under.col('#ab8068', fade);
      fillPoly(f.under, [
        px - 3,
        py + 1,
        px - 2,
        py - 2,
        px,
        py - 3,
        px + 2,
        py - 2,
        px + 3,
        py + 1,
        px + 1,
        py + 2,
      ]);
      f.under.lineS(px - 2, py - 1, px, py - 3, '#f3d6ad', fade);
    }
  }
}
export function floorDamage(f: FxInput) {
  if (!['tech_cleave', 'tech_sweep', 'tech_leap', 'tech_whip'].includes(f.anim)) return;
  for (const [i, hit] of techniqueContacts(book[f.anim]).entries()) {
    const age = f.t - hit.frame / 24;
    if (age < 0 || age >= 0.83) continue;
    const pt = f.pointAt(hit.frame / 24, hit.socket);
    if (f.anim === 'tech_cleave') fissure(f, pt, age);
    else if (f.anim === 'tech_sweep') groove(f, pt, age, i);
    else if (f.anim === 'tech_leap') pulse(f, pt, age, i === 0 ? 1 : 0.65);
    else {
      const u = Math.min(1, 0.1 + age * 8),
        alpha = Math.min(1, (0.83 - age) * 4);
      oval(f.under, [pt[0] + 5, pt[1] - 2], 18 * u, 6 * u, lip, alpha, 0.4, 2.8);
      chips(f, pt, age, -1);
    }
  }
}
