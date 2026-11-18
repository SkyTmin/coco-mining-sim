// Local material coordinates for woven panels, fur locks and the shaman's small accoutrements.
// Ellipsoids use angular coordinates, capsules wrap around their own axis and cloth facets use their warp.
import {
  type F3,
  type Mat,
  type RGBA,
  type Rig,
  type Tones,
  type V3,
  SE,
  CE,
  vcross,
  vdot,
  vlen,
  vnorm,
  vsub,
} from '../rig/f15-rig';
import { mixc, hx } from '../kit/f11-mobkit';

type Swatch = 'body' | 'dark' | 'bright';
export type Finish =
  | 'brocade'
  | 'lacquer'
  | 'bamboo'
  | 'paper'
  | 'fur'
  | 'granite'
  | 'ice'
  | 'strap'
  | 'ivory'
  | 'skin'
  | 'wattle'
  | 'moss'
  | 'shell'
  | 'root'
  | 'cap'
  | 'gill'
  | 'iris';
type Mark = [number, Swatch];
const fract = (t: number) => t - Math.floor(t);
function mark(f: Finish, x: number, y: number): Mark {
  let shift = 0,
    swatch: Swatch = 'body';
  switch (f) {
    case 'brocade': {
      // Two over, one under twill, with occasional raised gold stitches at the hems.
      const warp = Math.floor(x * 0.91),
        weft = Math.floor(y * 0.93);
      const crossing = (((warp - weft) % 3) + 3) % 3;
      shift = [-0.52, 0.12, 0.39][crossing];
      const hem = fract(y / 11);
      if (hem < 0.083 && fract(x / 4.5) < 0.7) {
        swatch = 'bright';
        shift += 0.45;
      }
      break;
    }
    case 'paper':
    case 'lacquer':
    case 'ivory': {
      const ripple = Math.sin(0.4 * x + 0.14 * y + 1.25 * Math.sin(y * 0.3)),
        seal = Math.sin(x * 0.24 - y * 0.08);
      shift = ripple * 0.41 + seal * 0.22;
      if (ripple > 0.83 && seal > 0.42) {
        swatch = f === 'lacquer' ? 'bright' : 'dark';
        shift += 0.3;
      }
      break;
    }
    case 'bamboo':
    case 'strap':
    case 'root': {
      const groove = Math.sin(
        y * 0.92 + Math.sin(x * 0.19) * 1.2 + Math.sin(x * 0.5 + y * 0.13) * 0.35,
      );
      const band = fract(x / (f === 'strap' ? 5.2 : 10.5));
      shift = groove * 0.53;
      if (band < 0.1) {
        shift -= 0.9;
        swatch = 'dark';
      }
      if (band > 0.12 && band < 0.24 && groove > 0.1) {
        shift += 0.85;
        swatch = 'bright';
      }
      break;
    }
    case 'fur': {
      // Tapering shingles: the split darkens in the hollow and leaves a pale hooked tip below.
      const row = Math.floor(y / 9.2),
        d = fract(y / 9.2);
      const lane = fract(
        (x + (row % 2) * 4.3 + 1.5 * Math.sin(y * 0.14) + 0.55 * Math.sin(x * 0.12)) / 8.9,
      );
      const center = Math.abs(lane - 0.5) * 2;
      const notch = center - (1 - d) * 0.82;
      if (notch > 0.35) {
        shift = -0.92;
        swatch = 'dark';
      } else if (notch > 0.15) {
        shift = -0.3;
      } else if (notch < -0.23 && lane < 0.56) {
        shift = 0.86;
        swatch = 'bright';
      } else shift = 0.14;
      shift += 0.13 * Math.sin(x * 0.71 + y * 0.17);
      break;
    }
    case 'ice': {
      // Two families of cleavage planes. Only selected intersections contain trapped white bubbles.
      const x1 = x * 0.109 + y * 0.064 + 0.12 * Math.sin(y * 0.18),
        x2 = y * 0.152 - x * 0.046;
      const p = fract(x1),
        q = fract(x2);
      shift = (Math.floor(x1 + x2) % 3) * 0.18 + 0.24 * Math.cos((x - y) * 0.46);
      if (p < 0.095) {
        swatch = 'bright';
        shift += 1.25;
      } else if (q < 0.16) {
        swatch = 'dark';
        shift -= 0.75;
      } else if (p > 0.59 && p < 0.78 && q > 0.42 && q < 0.64) {
        swatch = 'bright';
        shift += 0.56;
      }
      break;
    }
    case 'granite':
    case 'skin': {
      const row = Math.floor(y / 4.7),
        u = fract((x + (row % 2) * 2.6 + 0.5 * Math.sin(y * 0.21)) / 5.4) - 0.5,
        v = fract(y / 4.7) - 0.5,
        rad = u * u * 1.26 + v * v;
      if (rad < 0.055) {
        shift = 0.61;
        swatch = 'bright';
      } else if (rad < 0.145 && u + v > 0.1) {
        shift = -0.88;
        swatch = 'dark';
      } else if (rad < 0.18 && u + v < -0.1) shift = 0.58;
      else shift = 0.25 * Math.sin(x * 0.93 + y * 0.73);
      break;
    }
    case 'wattle':
    case 'gill': {
      const rib = Math.sin(x * 0.69 + y * 0.15 + 1.3 * Math.sin(y * 0.2));
      shift = rib * 0.84;
      if (rib < -0.62) swatch = 'dark';
      else if (rib > 0.7) swatch = 'bright';
      break;
    }
    case 'moss': {
      const row = Math.floor(y / 7),
        a = fract((x + row * 3.3 + 0.7 * Math.sin(y * 0.22)) / 6.2),
        b = fract(y / 7);
      const leaf = Math.abs(a - 0.49) - 0.42 * Math.sin(b * Math.PI);
      if (leaf > 0) {
        swatch = 'dark';
        shift = -0.6;
      } else if (Math.abs(a - 0.49) < 0.1) {
        swatch = 'bright';
        shift = 0.86;
      } else {
        shift = Math.sin(b * 18 + Math.abs(a - 0.49) * 12) > 0.36 ? 0.45 : -0.08;
      }
      break;
    }
    case 'shell':
    case 'iris':
    case 'cap': {
      const sectors = f === 'iris' ? 2.1 : f === 'shell' ? 1.15 : 0.59;
      const pleat = Math.sin(x * sectors + 1.7 * Math.sin(y * 0.19));
      shift = pleat * 0.61;
      if (pleat < -0.74) {
        shift -= 0.38;
        swatch = 'dark';
      }
      if (pleat > 0.78) {
        shift += 0.45;
        swatch = 'bright';
      }
      break;
    }
  }
  return [shift, swatch];
}
export function finishSurfaces(rig: Rig, basis: F3, sets: [Mat, Finish][], fallback: Finish) {
  const lut = new Map<Tones, Finish>(sets.map(([m, f]) => [m.T, f]));
  const palettes = new Map<Tones, Record<Swatch, RGBA[]>>();
  const ramp = (T: Tones) => [
    T[0],
    mixc(T[0], T[1], 0.52),
    T[1],
    mixc(T[1], T[2], 0.5),
    T[2],
    mixc(T[2], T[3], 0.5),
    T[3],
  ];
  for (const primitive of rig.prims) {
    if (primitive.k > 2 || !('m' in primitive)) continue;
    const mat = primitive.m,
      f = lut.get(mat.T) ?? fallback;
    let colors = palettes.get(mat.T);
    if (!colors) {
      const body = ramp(mat.T);
      colors = {
        body,
        dark: body.map((c) => mixc(c, hx('#343145'), 0.2)),
        bright: body.map((c) => mixc(c, hx('#f4d7a5'), 0.17)),
      };
      palettes.set(mat.T, colors);
    }
    const palette = colors;
    let coords: (q: V3) => [number, number];
    if (primitive.k === 0) {
      const [a, b, c] = primitive.a,
        rx = vlen(a),
        ry = vlen(b),
        rz = vlen(c);
      coords = (q) => [
        Math.atan2(q[1], q[0]) * (rx + ry) * 0.51,
        Math.asin(Math.max(-1, Math.min(1, q[2]))) * rz,
      ];
    } else if (primitive.k === 1) {
      const axis = vsub(primitive.b, primitive.a),
        length = vlen(axis),
        v = vnorm(axis),
        r = (primitive.r0 + primitive.r1) * 0.5;
      const u = vnorm(vcross(Math.abs(vdot(v, basis.u)) < 0.86 ? basis.u : basis.f, v)),
        w = vcross(v, u);
      coords = (q) => {
        const front = Math.sqrt(Math.max(0, 1 - q[1] * q[1] - q[2] * q[2]));
        const n: V3 = [q[1], q[2] * SE + front * CE, -q[2] * CE + front * SE];
        const sweep = Math.atan2(vdot(n, w), vdot(n, u)) * r;
        return f === 'fur' || f === 'skin' ? [sweep, q[0] * length] : [q[0] * length, sweep];
      };
    } else {
      const [a, b, c] = primitive.pts,
        u = vnorm(vsub(b, a)),
        n = vnorm(vcross(u, vsub(c, a))),
        v = vcross(n, u);
      const ax = vdot(a, u),
        ay = vdot(a, v);
      coords = (q) => [vdot(q, u) - ax, vdot(q, v) - ay];
    }
    const previous = mat.pat;
    primitive.m = {
      ...mat,
      pat(q, L) {
        const accent = previous?.(q, L);
        if (accent && !mat.T.includes(accent)) return accent;
        const [x, y] = coords(q),
          [offset, swatch] = mark(f, x, y);
        // At a tonal boundary the two neighbours interleave over a one-pixel strip.
        const value = Math.max(
          0,
          Math.min(
            6,
            Math.max(0.67, Math.min(5.58, (L + 0.36) * 4.3)) + offset + (accent?.length ? -0.21 : 0),
          ),
        );
        const base = Math.floor(value),
          parity = (Math.floor(x) + Math.floor(y)) & 1;
        const tick = (Math.floor(x * 0.5) - Math.floor(y * 0.5)) & 1;
        const quiet = f === 'fur' || f === 'skin' || f === 'moss';
        const cutoff = quiet
          ? parity
            ? 0.56
            : 0.4
          : parity
            ? 0.62 + tick * 0.18
            : 0.18 + tick * 0.18;
        return palette[swatch][Math.min(6, base + (value - base > cutoff ? 1 : 0))];
      },
    };
  }
}
