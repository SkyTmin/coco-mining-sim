import { F3, type Mat, type Rig, type V3, vadd, vcross, vlen, vlerp, vmul, vnorm, vsub } from '../../rig/f15-rig';

// Forward follows the grain, the other axes span the cut face.
export function timberAxis(a: V3, b: V3, pole: V3): F3 {
  const axis = vnorm(vsub(b, a));
  let side = vcross(pole, axis);
  if (vlen(side) < 0.001) side = vcross(Math.abs(axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1], axis);
  side = vnorm(side);
  return new F3(a, axis, side, vcross(axis, side));
}

// A slab peels away at one long edge. Four facets meet at the raised vein.
export function barkFlake(r: Rig, base: V3, tip: V3, across: V3, out: V3, wood: Mat, edge: Mat) {
  const left = vadd(vlerp(base, tip, 0.16), across),
    right = vsub(vlerp(base, tip, 0.31), across),
    ridge = vadd(vlerp(base, tip, 0.41), out);
  r.poly([base, left, ridge], wood);
  r.poly([left, tip, ridge], edge);
  r.poly([base, ridge, right], wood);
  r.poly([right, ridge, tip], wood);
}
export function barkLimb(
  r: Rig,
  a: V3,
  b: V3,
  ra: number,
  rb: number,
  n: number,
  wood: Mat,
  edge: Mat,
  axis: V3 = [0, 1, 0],
) {
  const f = timberAxis(a, b, axis),
    len = vlen(vsub(b, a));
  r.cap(a, b, ra, rb, wood);
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n,
      c = Math.cos(t),
      s = Math.sin(t);
    const base = f.p(len * 0.08, ra * 0.93 * c, ra * 0.93 * s),
      tip = f.p(len * (0.72 + 0.16 * (i % 2)), rb * 1.1 * c, rb * 1.1 * s);
    barkFlake(r, base, tip, f.v(0, -s * ra * 0.34, c * ra * 0.34), f.v(0, 0.92 * c, 0.92 * s), wood, edge);
  }
}
export function mossFringe(
  r: Rig,
  f: F3,
  width: number,
  length: number,
  n: number,
  moss: Mat,
  light: Mat,
  swing = 0,
) {
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1,
      z = (i % 3) * 0.54;
    const base = f.p(0, u * width, z),
      tip = f.p(0.8 + swing, u * width + 0.7 * Math.sin(i * 1.6), z - length * (0.68 + 0.32 * Math.cos(i * 1.66)));
    barkFlake(r, base, tip, f.v(0, (width / (n + 1)) * 1.65, 0), f.v(1.1, 0, -0.35), moss, light);
  }
}
// A lobed oak leaf, two angular lobes and a pointed third on each half-blade.
export function oakLeaf(r: Rig, f: F3, len: number, w: number, leaf: Mat, shadow: Mat) {
  const half = [
    [-0.03, 0],
    [0.22, 0.54],
    [0.32, 0.31],
    [0.48, 1],
    [0.6, 0.55],
    [0.73, 0.77],
    [0.8, 0.38],
    [1, 0],
  ];
  for (const side of [-1, 1]) {
    const rim = half.map(([x, y]) => f.p(x * len, side * y * w, 0.24 * w * Math.sin(Math.PI * x)));
    const ridge = f.p(0.51 * len, 0, 0.44 * w);
    for (let i = 1; i < rim.length; i += 2)
      r.poly([rim[i - 1], rim[i], rim[Math.min(i + 1, rim.length - 1)], ridge], side < 0 ? leaf : shadow);
  }
  r.line(f.p(0, 0, 0.15), f.p(0.85 * len, 0, 0.31 * w), leaf.T[2], 0, 0.36);
}
export function cutKnot(r: Rig, f: F3, width: number, height: number, wood: Mat, cut: Mat) {
  r.ell(f, [0, 0, 0], [0.75, width, height], wood);
  for (let ring = 2; ring >= 0; ring--)
    r.ell(
      f,
      [0.65 + (2 - ring) * 0.32, -0.09 * width * (2 - ring), 0.05 * height * (2 - ring)],
      [0.51, width * (0.23 + 0.26 * ring), height * (0.26 + 0.24 * ring)],
      ring === 1 ? wood : cut,
    );
}
export function shelfFungus(r: Rig, f: F3, w: number, m: Mat, edge: Mat) {
  r.ell(f, [w * 0.26, 0, 0], [w * 0.68, w, 0.84], edge);
  r.ell(f, [w * 0.22, 0, 0.55], [w * 0.61, w * 0.9, 1.15], m);
  r.line(f.p(w * 0.85, -w * 0.28, 0.3), f.p(w * 0.91, w * 0.23, 0.45), edge.T[3], 0, 0.46);
}
