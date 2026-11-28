// Surface coordinates and small material ramps for the volcanic crag and the dragon's hoard.
import {
  vcross,
  vdot,
  vlen,
  vnorm,
  vsub,
  type Mat,
  type Rig,
  type Tones,
  type V3,
  type RGBA,
} from '../rig/f15-rig';
import { hx, mixc } from '../kit/f11-mobkit';

type Surface =
  | 'basalt'
  | 'slate'
  | 'pumice'
  | 'leather'
  | 'wing'
  | 'brass'
  | 'silver'
  | 'wood'
  | 'coin';
const inclusions: Record<Surface, [string, string]> = {
  basalt: ['#7b8492', '#9a6856'],
  slate: ['#718499', '#a77a65'],
  pumice: ['#a8a19a', '#865c54'],
  leather: ['#637571', '#875944'],
  wing: ['#7e8171', '#a4714f'],
  brass: ['#617f79', '#d3b88a'],
  silver: ['#78909c', '#b7a486'],
  wood: ['#856b4b', '#ad7c51'],
  coin: ['#648579', '#dcc9a4'],
};
const ramps = new WeakMap<Tones, Map<Surface, RGBA[][]>>();
function colours(T: Tones, surface: Surface) {
  let bySurface = ramps.get(T);
  if (!bySurface) {
    bySurface = new Map();
    ramps.set(T, bySurface);
  }
  let ramp = bySurface.get(surface);
  if (ramp) return ramp;
  const pigments = inclusions[surface].map((c) => hx(c));
  ramp = Array.from({ length: 3 }, (_, kind) =>
    Array.from({ length: 7 }, (_, i) => {
      const c = mixc(T[Math.floor(i / 2)], T[Math.ceil(i / 2)], (i % 2) * 0.5);
      return kind ? mixc(c, pigments[kind - 1], 0.12 + i * 0.014) : c;
    }),
  );
  bySurface.set(surface, ramp);
  return ramp;
}
function mod(x: number, n: number) {
  return x - Math.floor(x / n) * n;
}
function relief(surface: Surface, T: Tones) {
  const ramp = colours(T, surface);
  return (u: number, v: number, l: number, seed: number): RGBA => {
    const a = u + seed * 3.3,
      b = v + seed * 1.7;
    const checker = mod(Math.floor(a) + Math.floor(b), 2);
    let pigment = 0,
      bevel = 0;
    if (surface === 'basalt' || surface === 'slate' || surface === 'pumice') {
      // A broken bed tapers around a dark vesicle with a pale mineral lip.
      const bed = b + 0.22 * a + 1.15 * Math.sin(a * 0.21),
        seam = mod(bed, 4.7);
      pigment = mod(Math.floor(bed / 4.7) + Math.floor(a / 13), 5) > 2 ? 1 : 0;
      bevel =
        seam < 0.85 ? -0.28 : seam < 1.65 ? 0.2 : seam < 2.35 ? -0.035 : 0.055;
      const row = Math.floor(b / 7),
        x = mod(a + row * 3.7, 9.6) - 4.8,
        y = mod(b, 7) - 3.5;
      const pit = x * x * 0.55 + y * y;
      if (pit < 2.7) {
        pigment = 2;
        bevel = y < -0.45 ? 0.18 : -0.28;
      }
      const vein = mod(a - 0.48 * b + Math.floor(b / 3) * 0.8, 18);
      if (vein < 1.05 && mod(b + seed, 12) < 7) {
        pigment = 2;
        bevel = 0.18;
      }
    } else if (surface === 'leather' || surface === 'wing') {
      // Lapped hide scales and the longer branching folds of bat-wing membrane.
      const wy = surface === 'wing' ? 8 : 4.8,
        wx = surface === 'wing' ? 12 : 6.1;
      const row = Math.floor(b / wy),
        x = mod(a + row * wx * 0.5, wx) / wx - 0.5;
      const scale = mod(b, wy) / wy + 0.85 * x * x;
      pigment = mod(row + Math.floor(a / wx), 4) < 1 ? 1 : 0;
      bevel =
        scale > 0.88 ? -0.24 : scale > 0.68 ? 0.13 : scale < 0.2 ? 0.05 : -0.03;
      if (
        surface === 'wing' &&
        Math.abs(Math.sin(a * 0.25 + b * 0.08)) < 0.14
      ) {
        pigment = 2;
        bevel = 0.12;
      }
    } else if (surface === 'wood') {
      const fibre = mod(
        a * 0.32 + b + 1.1 * Math.sin(a * 0.33) + 0.6 * Math.sin(a * 0.17),
        4.8,
      );
      pigment = mod(Math.floor((b + 0.2 * a) / 5), 3);
      bevel = fibre < 0.8 ? -0.25 : fibre < 1.55 ? 0.17 : 0.04;
      const knot = Math.hypot(mod(a, 18) - 8, 2.3 * (mod(b, 9) - 4));
      if (knot < 3.4) {
        pigment = 2;
        bevel = knot < 1.8 ? -0.32 : 0.18;
      }
    } else {
      // A worn metal face alternates long burnished strokes, shallow scratches and patina islands.
      const scratch = mod(a + 0.27 * b + 0.45 * Math.sin(b * 0.33), 5.3);
      pigment =
        Math.sin(a * 0.28 + b * 0.43) + Math.cos(b * 0.34) > 0.9
          ? 1
          : Math.sin(a * 0.16 - 0.45 * b) > 0.6
            ? 2
            : 0;
      bevel =
        scratch < 0.75
          ? -0.17
          : scratch < 1.4
            ? 0.16
            : 0.035 * Math.sin(0.8 * b);
      if (surface === 'coin') {
        const ring = Math.hypot(u, v);
        if (ring > 3.3 && ring < 4.1) bevel += 0.17;
      }
    }
    const tone = Math.max(0, Math.min(6, 1.8 + 3.35 * l + 3.15 * bevel));
    const lower = Math.floor(tone),
      fract = tone - lower;
    return ramp[pigment][
      Math.min(6, lower + (fract > (checker ? 0.28 : 0.76) ? 1 : 0))
    ];
  };
}
export function textureFigure(
  r: Rig,
  material: (m: Mat) => Surface | undefined,
) {
  // Convert polygon points to their own face axes before painting. Ellipsoids and
  // capsules already supply their own barycentric / surface coordinates.
  for (const [seed, p] of r.prims.entries()) {
    if (p.k === 3 || p.k === 4) continue;
    const m = p.m,
      kind = material(m);
    if (!kind) continue;
    const draw = relief(kind, m.T),
      original = m.pat;
    let uv: (q: V3) => [number, number];
    if (p.k === 0) {
      const a = vlen(p.a[0]),
        b = vlen(p.a[1]),
        h = vlen(p.a[2]);
      uv =
        kind === 'coin'
          ? (q) => [q[0] * a, q[2] * h]
          : (q) => [(Math.atan2(q[1], q[0]) * (a + b)) / 2, q[2] * h];
    } else if (p.k === 1) {
      const length = vlen(vsub(p.b, p.a)),
        radius = (p.r0 + p.r1) / 2;
      uv = (q) => [q[0] * length, Math.atan2(q[2], q[1]) * radius];
    } else {
      const origin = p.pts[0],
        u = vnorm(vsub(p.pts[1], origin)),
        n = vnorm(vcross(u, vsub(p.pts[2], origin))),
        v = vcross(n, u);
      uv = (q) => {
        const d = vsub(q, origin);
        return [vdot(d, u), vdot(d, v)];
      };
    }
    p.m = {
      ...m,
      pat(q, l) {
        const c = original?.(q, l);
        // Keep minted stamps, lava and original highly local accents; relight the surrounding material.
        if (c && !m.T.includes(c)) return c;
        const [u, v] = uv(q);
        const adjusted = c ? l + (m.T.indexOf(c) - 1.5) * 0.11 : l;
        return draw(u, v, adjusted, seed % 13);
      },
    };
  }
}
