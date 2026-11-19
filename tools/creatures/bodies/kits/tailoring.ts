// Small pieces of construction that follow the surface supplied by their wearer.
import { Rig, F3, vadd, vlerp, vmul, type Mat, type V3 } from '../../rig/f15-rig';

export type Surface = (across: number, down: number) => V3;

export function engraving(r: Rig, points: V3[], metal: Mat, shine = false) {
  for (let i = 1; i < points.length; i++) r.line(points[i - 1], points[i], metal.T[shine ? 3 : 1], 0, 0.35);
}

export function embroideredStar(r: Rig, surface: Surface, u: number, v: number, size: number, thread: Mat) {
  const span = size * 0.065;
  const rays: V3[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4,
      length = span * (i % 2 ? 0.24 : 1);
    rays.push(surface(u + Math.cos(a) * length, v + Math.sin(a) * length * 0.75));
  }
  r.poly(rays, thread, 0.3);
  r.dot(surface(u, v), thread.T[3], 0, 0.8);
}

// Each strip shares its edge with the next. The hem and the embroidery therefore
// still lie on the pleats when the caller bends or turns the garment.
export function foldedCloth(r: Rig, surface: Surface, folds: number, cloth: Mat, lining: Mat, hem: Mat) {
  const rows = [0, 0.3, 0.65, 1];
  for (let i = 0; i < folds; i++) {
    const l = i / folds,
      h = (i + 1) / folds;
    for (let j = 1; j < rows.length; j++) {
      const a = rows[j - 1],
        b = rows[j];
      r.poly([surface(l, a), surface(h, a), surface(h, b), surface(l, b)], i % 2 ? cloth : lining);
    }
    r.cap(surface(l, 1), surface(h, 1), 0.58, 0.58, hem);
    engraving(r, [surface(l, 0.955), surface(h, 0.955)], hem, true);
  }
  for (const u of [0, 1]) {
    for (let j = 1; j < rows.length; j++) r.cap(surface(u, rows[j - 1]), surface(u, rows[j]), 0.48, 0.64, hem);
  }
}

// A tapered guard with a convex spine, a folded metal rim and two domed rivets.
// The mounting face is f=0 in the supplied frame. Works for armour and bucklers.
export function rivetedPlate(r: Rig, frame: F3, w: number, h: number, depth: number, metal: Mat, trim: Mat) {
  const xy = [
    [-0.73, 0.88],
    [0.68, 0.86],
    [1, 0.28],
    [0.77, -0.42],
    [0, -1],
    [-0.84, -0.4],
    [-1, 0.33],
  ];
  const outline = xy.map(([y, z]) => frame.p(0, y * w, z * h));
  const crown = frame.p(depth, 0, h * 0.15);
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length];
    r.poly([a, b, crown], metal);
    if (i === 0 || (i >= 2 && i <= 5)) r.cap(a, b, 0.46, 0.46, trim);
  }
  for (const s of [-1, 1]) {
    const p = frame.p(depth * 0.37, s * w * 0.59, h * 0.45);
    r.ball(p, Math.min(1.05, w * 0.2), trim);
  }
}

// Sparse pointed locks: two sloped facets around a raised centre, with the
// dark and the light root alternated in the animal's own coordinate system.
export function furLock(r: Rig, base: V3, tip: V3, halfWidth: V3, ridge: V3, fur: Mat, shadow: Mat) {
  const a = vadd(base, halfWidth),
    b = vadd(base, vmul(halfWidth, -1));
  const peak = vadd(base, ridge);
  r.poly([a, peak, tip], fur);
  r.poly([peak, b, tip], shadow);
  r.poly([b, a, tip], fur);
}

// A ribbon around a curved surface. The outside points carry the topstitch.
export function stitchedStrap(r: Rig, points: V3[], halfWidth: V3, hide: Mat, seam: Mat) {
  const edge = (p: V3, s: number) => vadd(p, vmul(halfWidth, s));
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    r.poly([edge(a, -1), edge(b, -1), edge(b, 1), edge(a, 1)], hide);
    for (const s of [-0.8, 0.8])
      r.line(edge(vlerp(a, b, 0.12), s), edge(vlerp(a, b, 0.67), s), seam.T[2], 0, 0.26);
  }
}
