// Transform authored primitives in place. Their order and all z-buffer biases stay intact.
import { type Rig, type V3, vadd, vsub, vmul, vnorm, vdot, vcross, vlen } from '../rig/f15-rig';

export function rotateFromTo(from: V3, to: V3): (v: V3) => V3 {
  const a = vnorm(from),
    b = vnorm(to);
  const cosine = Math.min(1, Math.max(-1, vdot(a, b)));
  const cross = vcross(a, b),
    sine = vlen(cross);
  if (sine < 1e-8 && cosine >= 0) return (v) => v;
  const axis =
    sine > 1e-8 ? vmul(cross, 1 / sine) : vnorm(vcross(a, Math.abs(a[2]) < 0.8 ? [0, 0, 1] : [1, 0, 0]));
  return (v) =>
    vadd(vadd(vmul(v, cosine), vmul(vcross(axis, v), sine)), vmul(axis, vdot(axis, v) * (1 - cosine)));
}

export function transformPrimitive(p: Rig['prims'][number], map: (q: V3) => V3, radialScale = 1) {
  switch (p.k) {
    case 0: {
      const center = map(p.c);
      p.a = p.a.map((axis) => vsub(map(vadd(p.c, axis)), center)) as [V3, V3, V3];
      p.c = center;
      break;
    }
    case 1:
      p.a = map(p.a);
      p.b = map(p.b);
      p.r0 *= radialScale;
      p.r1 *= radialScale;
      break;
    case 2:
      p.pts = p.pts.map(map);
      break;
    case 3:
      p.p = map(p.p);
      p.s *= radialScale;
      break;
    case 4:
      p.a = map(p.a);
      p.b = map(p.b);
      break;
  }
}
export function transformPart(
  rig: Rig,
  match: (tag: string) => boolean,
  map: (q: V3) => V3,
  radialScale = 1,
) {
  for (const prim of rig.prims) if (match(prim.t ?? '')) transformPrimitive(prim, map, radialScale);
}
