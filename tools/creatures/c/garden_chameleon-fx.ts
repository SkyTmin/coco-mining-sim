import { fillPoly, type Pen } from '../fx/pen';
import { TAU } from '../kit/f11-mobkit';
import type { FxInput, XY } from '../types';
import { seedBeat, seedContact } from './garden_chameleon-poses';

function mapleKey(p: Pen, [x, y]: XY, angle: number, breadth: number) {
  // The dark nut stays at the point of attachment. The papery wing turns around it.
  const dx = Math.cos(angle),
    dy = Math.sin(angle);
  const point = (long: number, across: number): XY => [
    x + long * dx - across * dy * breadth,
    y + long * dy + across * dx * breadth,
  ];
  const shape = (color: string, verts: XY[]) => {
    p.col(color);
    fillPoly(
      p,
      verts.flatMap(([u, v]) => point(u, v)),
    );
  };
  shape('#793843', [
    [0, 0],
    [3, -1],
    [9, -4],
    [13, -3],
    [14, -1],
    [11, 2],
    [5, 2],
  ]);
  shape('#ec7651', [
    [2, 0],
    [8, -2],
    [12, -3],
    [13, -1],
    [10, 1],
    [5, 1],
  ]);
  p.col('#ffdf95');
  p.line(...point(2, 0), ...point(10, -2));
  p.col('#6c4435');
  p.rect(x - 1, y - 1, 4, 3);
  p.col('#d7904e');
  p.dot(x, y - 1, 2, 1);
}
function falling(n: number): XY {
  const u = Math.max(0, Math.min(1, n / seedBeat.touch)),
    swirl = Math.sin(TAU * u * 1.65) * Math.sin(u * Math.PI);
  return [
    134 + (seedContact[0] - 134) * u + swirl * 6 - 34 * Math.sin(Math.PI * u),
    -8 + (seedContact[1] + 8) * u + swirl * 1.4,
  ];
}
function shootSeed(f: FxInput, n: number) {
  const b = seedBeat;
  if (n <= b.touch) {
    const nut = falling(n);
    f.propAt?.('samara', nut);
    mapleKey(f.above, nut, -1.31 + Math.sin(n * 0.32) * 1.03, 0.64 + 0.32 * Math.cos(n * 0.44));
    return;
  }
  if (n <= b.release) {
    const angle =
      n < b.lip
        ? -1.31 + Math.sin(b.touch * 0.32) * 1.03 + (n - b.touch) * 0.023
        : -0.72 + 0.09 * Math.sin((n - b.lip) * 0.35);
    mapleKey(f.above, f.points.tongueTip, angle, 0.92);
    f.propAt?.('samara', f.points.tongueTip);
    return;
  }
  if (n < 107) {
    const at = f.pointAt(b.release / 24, 'tongueTip'),
      u = (n - b.release) / 29;
    const spot: XY = [at[0] + (178 - at[0]) * u, at[1] - Math.sin(Math.PI * u) * 18 + u * 8];
    mapleKey(f.above, spot, -0.72 + u * 8, 0.75 + 0.25 * Math.cos(u * 14));
    f.propAt?.('samara', spot);
  }
}
function swallow(p: Pen, n: number) {
  const u = n / 64,
    x = 178 - 205 * u,
    y = 13 + 15 * Math.sin(u * Math.PI) + 2 * u;
  const wing = Math.sin((n / 19) * TAU);
  // Hard glazing bars occlude the silhouette. Its deeply forked tail follows its beak.
  p.occ = [0, 24, 160, 26];
  for (const ix of [2, 42, 82, 122]) p.occ.push(ix, 26, ix + 2, 54);
  const silhouette = [
    [-17, 0],
    [-13, -1],
    [-11, -3],
    [-8, -3],
    [-5, -2],
    [-2, -4],
    [4, -10 - wing * 4],
    [13, -12 - wing * 6],
    [6, -5 - wing * 2],
    [3, -1],
    [12, -2],
    [20, -5],
    [15, 0],
    [20, 4],
    [10, 2],
    [3, 3],
    [6, 8 + wing * 3],
    [8, 12 + wing * 4],
    [1, 8 + wing * 2],
    [-4, 3],
    [-9, 2],
    [-12, 1],
  ];
  p.col('#465a61', 0.74);
  fillPoly(
    p,
    silhouette.flatMap(([a, b]) => [x + a, y + b]),
  );
  p.occ = null;
}
export function glasshouseEffects(f: FxInput) {
  const n = f.t * 24;
  if (f.anim === 'trick') shootSeed(f, n);
  if (f.anim === 'trick_b' && n <= 65) swallow(f.backdrop, n);
}
