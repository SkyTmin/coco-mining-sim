import { hx } from '../kit/f11-mobkit';
import { Px } from '../rig/px';
import type { XY } from '../types';

const ink = hx('#372e41'),
  dark = hx('#4c3d4c'),
  brass = hx('#c59362'),
  light = hx('#ffe6aa');
const panel = hx('#477778'),
  wood = hx('#9a6357');
export const doorHalfWidth = 11;

// The cross-section is the original cottage arch, projected with the same slope as the stone sill.
export function floorAt(x: number, sill: XY) {
  return sill[1] - (x - sill[0]) * 0.21;
}
export function topAt(x: number, sill: XY) {
  const t = (x - sill[0]) / doorHalfWidth;
  return floorAt(x, sill) - 22 - 6 * Math.sqrt(Math.max(0, 1 - t * t));
}
export function visibleAtDoor(x: number, y: number, sill: XY, far: boolean) {
  const across = (x - sill[0]) * (far ? -1 : 1);
  if (across > doorHalfWidth) return true; // On the landing, in front of the wall.
  return across > -doorHalfWidth + 4 && y >= topAt(x, sill) + 2 && y <= floorAt(x, sill) - 1;
}

// The remote wicket is built into the great frame. Its leaf swings on a fixed hinge.
export function frameWicket(p: Px, sill: XY, open: number) {
  if (open <= 0) return;
  const [x, y] = sill,
    hinge = x + doorHalfWidth;
  for (let u = -doorHalfWidth - 2; u <= doorHalfWidth + 2; u++) {
    const X = x + u,
      floor = floorAt(X, sill),
      top = topAt(X, sill);
    p.line(X, top - 2, X, floor + 1, Math.abs(u) >= doorHalfWidth ? brass : ink);
    p.set(X, top - 2, light);
    if (Math.abs(u) < doorHalfWidth - 2) {
      p.line(X, top + 3, X, floor - 3, u % 4 === 0 ? dark : ink);
      p.line(X, floor - 2, X, floor, wood);
    }
  }
  const free = hinge - 22 * Math.cos(open * 1.83);
  for (let i = 0; i <= Math.ceil(Math.abs(hinge - free)); i++) {
    const u = i / Math.max(1, Math.abs(hinge - free)),
      X = hinge + (free - hinge) * u;
    p.line(X, y - 24 + u * (1 + open * 4), X, y - 4 + u * (3 + open * 3), i % 4 ? panel : dark);
    p.set(X, y - 24 + u * (1 + open * 4), brass);
  }
  p.ell(free, y - 12 + 4 * open, 1.2, 1.2, light);
}
