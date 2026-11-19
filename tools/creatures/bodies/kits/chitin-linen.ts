// Embossed dorsal scutes, cut stones and woven ceremonial linen.
import { F3, Rig, type Mat, type V3 } from '../../rig/f15-rig';
import { engraving, type Surface } from './tailoring';

export function goldGlyph(r: Rig, f: F3, size: number, kind: number, edge: Mat, glow = 0) {
  const p = (x: number, y: number, z = 0) => f.p(x * size, y * size, z + 0.13);
  const stroke = (a: V3, b: V3) => r.line(a, b, edge.T[glow ? 3 : 1], glow, 0.6);
  if (kind % 3 === 0) {
    const disk = Array.from({ length: 8 }, (_, i) =>
      p(0.34 * Math.cos((i * Math.PI) / 4), 0.34 * Math.sin((i * Math.PI) / 4)),
    );
    for (let i = 0; i < 8; i++) {
      stroke(disk[i], disk[(i + 1) % 8]);
      const a = (i * Math.PI) / 4;
      stroke(p(0.47 * Math.cos(a), 0.47 * Math.sin(a)), p(0.8 * Math.cos(a), 0.8 * Math.sin(a)));
    }
    r.dot(f.o, edge.T[3], glow, 0.85);
  } else if (kind % 3 === 1) {
    stroke(p(-0.73, 0), p(0.48, 0));
    for (const sign of [-1, 1]) {
      stroke(p(-0.23, 0), p(0.23, sign * 0.52));
      stroke(p(0.23, sign * 0.52), p(0.48, sign * 0.55));
      stroke(p(0.15, 0), p(0.65, sign * 0.32));
      stroke(p(0.65, sign * 0.32), p(0.72, sign * 0.2));
    }
  } else {
    const outline = [p(-0.65, 0), p(0, -0.48), p(0.75, 0), p(0, 0.43), p(-0.65, 0)];
    for (let i = 1; i < outline.length; i++) stroke(outline[i - 1], outline[i]);
    stroke(p(-0.21, 0.33), p(-0.47, 0.79));
    stroke(p(-0.47, 0.79), p(-0.74, 0.78));
    r.ball(p(0, 0, 0.2), 0.61, edge);
  }
}
// Convex scute built around a raised broad face. Rims have genuine rolled metal
// and an underside, which becomes visible when a hinge opens the plate.
export function embossedScute(
  r: Rig,
  f: F3,
  length: number,
  width: number,
  rise: number,
  metal: Mat,
  shadow: Mat,
  edge: Mat,
) {
  const outline = [
    [-0.95, -0.54],
    [-0.57, -0.92],
    [0.26, -1],
    [0.94, -0.62],
    [1, 0.12],
    [0.65, 0.8],
    [-0.2, 1],
    [-0.85, 0.63],
  ];
  const rim = outline.map(([x, y]) => f.p(x * length, y * width, 0));
  const inner = outline.map(([x, y]) => f.p((x * 0.63 + 0.05) * length, y * width * 0.63, rise));
  r.poly([...rim].reverse(), shadow);
  for (let i = 0; i < rim.length; i++) {
    const j = (i + 1) % rim.length;
    r.poly([rim[i], rim[j], inner[j], inner[i]], i % 4 === 1 ? shadow : metal);
    r.cap(rim[i], rim[j], 0.38, 0.38, edge);
    if (i % 2 === 0) engraving(r, [inner[i], inner[j]], edge, true);
  }
  r.poly(inner, metal);
  for (const sign of [-1, 1])
    r.ell(f, [-0.45 * length, sign * 0.73 * width, rise * 0.66], [0.57, 0.57, 0.38], edge);
}
export function stripedLinen(r: Rig, surface: Surface, rows: number, light: Mat, dark: Mat, gold: Mat) {
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < 6; i++) {
      const x = i / 6,
        y = (i + 1) / 6,
        u = j / rows,
        v = (j + 1) / rows;
      r.poly([surface(x, u), surface(y, u), surface(y, v), surface(x, v)], j % 2 ? dark : light);
      if (i === 0 || i === 5)
        r.cap(surface(i === 0 ? x : y, u), surface(i === 0 ? x : y, v), 0.37, 0.36, gold);
      if (j === rows - 1) r.cap(surface(x, v), surface(y, v), 0.5, 0.48, gold);
    }
}
export function cutStone(r: Rig, f: F3, length: number, radius: number, glass: Mat, dark: Mat, shine: Mat) {
  const waist = Array.from({ length: 6 }, (_, i) =>
    f.p(length * 0.24, radius * Math.cos((i * Math.PI) / 3), radius * Math.sin((i * Math.PI) / 3)),
  );
  const tip = f.p(length, 0, 0);
  for (let i = 0; i < waist.length; i++) {
    const j = (i + 1) % 6;
    r.poly([f.o, waist[i], waist[j]], dark);
    const mat = [glass, shine, glass, dark, glass, shine][i];
    // Broad stable facets stay distinct even under the lapis socket.
    const color = mat.T[([1, 2, 2, 1, 0, 1] as const)[i]];
    r.poly([waist[i], tip, waist[j]], { ...mat, pat: () => [color[0], color[1], color[2], 255] });
    if (i === 1 || i === 4) r.cap(waist[i], waist[j], 0.28, 0.28, dark);
    if (i % 2 === 0) {
      const p = waist[i],
        q = waist[j];
      const blend = (s: number, t: number): V3 =>
        [0, 1, 2].map((k) => (p[k] * (1 - s) + q[k] * s) * (1 - t) + tip[k] * t) as V3;
      r.poly(
        [blend(0.08, 0.03), blend(0.5, 0.14), blend(0.24, 0.64)],
        { ...shine, flat: 2, pat: () => shine.T[2] },
        0.18,
      );
    }
    if (i % 2 === 0) r.line(waist[i], tip, shine.T[3], shine.glow ?? 0, 0.18);
  }
}
