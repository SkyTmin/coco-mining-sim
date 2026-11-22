// Shared projection for the articulated bodies and the action sockets carried by them.
import { Px } from './px';
import { proj, renderRig, Rig, type RigOut, type V3 } from './f15-rig';
import { hx, sstep, TAU } from '../kit/f11-mobkit';
import type { Animation, BodyFrame, XY } from '../types';

export const everyday: Record<string, Animation> = {
  idle: { seconds: 3, loop: true },
  walk: { seconds: 1, loop: true },
  look: { seconds: 1.5 },
  sleep: { seconds: 3, loop: true },
  turn: { seconds: 4, loop: true },
  happy: { seconds: 1.1 },
  tired: { seconds: 1.5 },
  hatch: { seconds: 1.5 },
};
export function life(anim: string, t: number, offset: number) {
  const loop =
    anim === 'idle' ||
    anim === 'idle-f2' ||
    anim === 'sleep' ||
    anim === 'walk';
  const q = (loop ? t / (anim === 'walk' ? 1 : 3) : 0) * TAU + offset;
  const g = (len: number) =>
    Math.pow(Math.sin(Math.PI * Math.max(0, Math.min(1, t / len))), 2);
  return {
    q,
    walk: anim === 'walk' ? Math.sin(t * TAU) : 0,
    look: anim === 'look' ? g(1.5) : 0,
    sleep: anim === 'sleep' ? 1 : 0,
    happy: anim === 'happy' ? g(1.1) : 0,
    tired: anim === 'tired' ? g(1.5) : 0,
    hatch: anim === 'hatch' ? 1 - sstep(0.15, 0.98, t) : 0,
    pop: anim === 'hatch' ? g(0.98) * sstep(0.14, 0.55, t) : 0,
    blink: anim === 'sleep' || ((q % TAU) + TAU) % TAU > 5.98 ? 1 : 0,
  };
}
function touchesEdge(p: Px) {
  for (let i = 0; i < p.w; i++)
    if (p.solid(i, 0) || p.solid(i, p.h - 1)) return true;
  for (let i = 1; i < p.h - 1; i++)
    if (p.solid(0, i) || p.solid(p.w - 1, i)) return true;
  return false;
}

function cut(p: Px, x: number, y: number, size: number): Px {
  const frame = new Px(size, size);
  for (let row = 0; row < size; row++) {
    const start = ((y + row) * p.w + x) * 4;
    frame.data.set(p.data.subarray(start, start + size * 4), row * size * 4);
  }
  return frame;
}

// Scale the articulated geometry before rasterisation, including sockets and eye.
// A separate vertical factor lets a low, wide animal fill a taller portrait.
export function scaleFigure(
  rig: Rig,
  sockets: Record<string, V3>,
  scale: number,
  vertical = scale,
) {
  if (scale <= 0 || vertical <= 0)
    throw new Error('Figure scale must be positive');
  const point = ([x, y, z]: V3): V3 => [x * scale, y * scale, z * vertical];
  for (const p of rig.prims) {
    if (p.k === 0) {
      p.c = point(p.c);
      p.a = [point(p.a[0]), point(p.a[1]), point(p.a[2])];
    } else if (p.k === 1) {
      p.a = point(p.a);
      p.b = point(p.b);
      p.r0 *= scale;
      p.r1 *= scale;
    } else if (p.k === 2) {
      p.pts = p.pts.map(point);
      const mat = p.m,
        pat = mat.pat,
        gpat = mat.gpat;
      const inverse = ([x, y, z]: V3): V3 => [
        x / scale,
        y / scale,
        z / vertical,
      ];
      if (pat || gpat)
        p.m = {
          ...mat,
          pat: pat ? (q, l) => pat(inverse(q), l) : undefined,
          gpat: gpat ? (q) => gpat(inverse(q)) : undefined,
        };
    } else if (p.k === 3) {
      p.p = point(p.p);
      p.s *= scale;
    } else {
      p.a = point(p.a);
      p.b = point(p.b);
    }
  }
  if (rig.eye) rig.eye = point(rig.eye);
  for (const [key, value] of Object.entries(sockets))
    sockets[key] = point(value);
}
export type FigureSetup = (
  rig: Rig,
  sockets: Record<string, V3>,
  size: number,
  anchor: XY,
) => { size: number; anchor: XY } | void;
let activeSetup: FigureSetup | undefined;
let pointsOnly = false;

/** Build frames whose pictures nobody looks at: compose asks earlier poses only for socket positions (effect
 * trails), and rasterizing each of them took ~70% of a trick frame [22.11, Zenit]. Sockets, anchor and the
 * post-raster offsets stay exact; the picture is left empty. */
export function withPointsOnly<T>(build: () => T): T {
  const previous = pointsOnly;
  pointsOnly = true;
  try {
    return build();
  } finally {
    pointsOnly = previous;
  }
}
/** True inside withPointsOnly: a skin may skip its own extra rasters (front layers) but must keep points exact. */
export const pointsOnlyActive = () => pointsOnly;

/** Configure a borrowed, articulated rig once it has all of its sockets, before rasterization.
 * Frame builds are synchronous. Nested builds restore their caller's setup even on errors. */
export function withFigureSetup<T>(setup: FigureSetup, build: () => T): T {
  const previous = activeSetup;
  activeSetup = setup;
  try {
    return build();
  } finally {
    activeSetup = previous;
  }
}

// Moving the local origin together with the socket projections preserves every
// world-space pixel, including the floor position and independently sampled FX.
export function projectFigure(
  rig: Rig,
  size: number,
  anchor: XY,
  sockets: Record<string, V3>,
  ink?: string,
  inner = 3.8,
  expandForAction = false,
): BodyFrame {
  const canvas = activeSetup?.(rig, sockets, size, anchor);
  if (canvas) ({ size, anchor } = canvas);
  const paint = { outline: ink ? hx(ink) : undefined, inner };
  let image: RigOut = pointsOnly ? { p: new Px(size, size), lit: null, eye: null } : renderRig(rig, size, size, ...anchor, paint);
  if (!pointsOnly && touchesEdge(image.p)) {
    const pad = expandForAction ? size : Math.ceil(size / 2),
      big = size + 2 * pad;
    const full = renderRig(
      rig,
      big,
      big,
      anchor[0] + pad,
      anchor[1] + pad,
      paint,
    );
    let left = big,
      top = big,
      right = -1,
      bottom = -1;
    for (let y = 0; y < big; y++)
      for (let x = 0; x < big; x++)
        if (full.p.solid(x, y)) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
    const width = right - left + 1,
      height = bottom - top + 1;
    // Some action profiles extend a rigid weapon beyond the standing portrait.
    // Preserve the world pixels and pivot, enlarging only their local backing image.
    if (expandForAction && (width > size || height > size))
      size = Math.min(big, Math.max(width, height) + 4);
    if (width > size || height > size || touchesEdge(full.p)) {
      throw Error(
        `Rig silhouette ${width}×${height} exceeds ${size}×${size} body frame`,
      );
    }
    function cropOrigin(lo: number, hi: number) {
      const spare = size - (hi - lo + 1),
        margin = Math.min(2, Math.floor(spare / 2));
      return Math.max(
        0,
        Math.min(
          big - size,
          Math.max(hi - size + 1 + margin, Math.min(pad, lo - margin)),
        ),
      );
    }
    const x = cropOrigin(left, right),
      y = cropOrigin(top, bottom);
    anchor = [anchor[0] + pad - x, anchor[1] + pad - y];
    image = {
      p: cut(full.p, x, y, size),
      lit: full.lit ? cut(full.lit, x, y, size) : null,
      eye: full.eye ? [full.eye[0] - x, full.eye[1] - y] : null,
    };
  }
  const points: Record<string, XY> = {};
  for (const [key, P] of Object.entries(sockets)) {
    const [x, y] = proj(P, ...anchor);
    points[key] = [x, y];
  }
  return {
    px: image.p,
    lit: image.lit,
    anchor,
    points,
    eye: image.eye,
    primitives: rig.size,
    rig,
    joints: sockets,
  };
}
