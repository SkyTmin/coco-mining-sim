// All positions are in the painting field, before camera shake and frame padding.
import { createCanvas, type Canvas } from '@napi-rs/canvas';
import { Pen } from './fx/pen';
import type { FxInput, XY } from './types';

type Layer = 'above' | 'under';
export interface MaterialInk {
  id: string;
  layer: Layer;
  at: XY;
  /** Local floor at this depth, when the painter has an independent ground projection. */
  groundY?: number;
  pixels: XY[];
  /** Same-layer RGBA immediately after this object was drawn, one value per pixel. */
  colors: number[];
}
export interface TechniqueTrace {
  materials: MaterialInk[];
  births: { socket: string; at: XY; pixels: XY[] }[];
  trails: { socket: string; from: number; to: number; pixels: XY[]; path: XY[] }[];
  trailPixels: XY[];
  trailPath: XY[];
  projectiles: {
    id: string;
    socket: string;
    at: XY;
    origin: XY;
    landing: XY;
    release: number;
    hit: number;
  }[];
}
export function emptyTechniqueTrace(): TechniqueTrace {
  return { materials: [], births: [], trails: [], trailPixels: [], trailPath: [], projectiles: [] };
}

const scratch = new Map<string, Canvas>();
function isolatedPen(f: FxInput, layer: Layer, draw: (pen: Pen) => void): XY[] {
  const key = f.w + 'x' + f.h;
  let canvas = scratch.get(key);
  if (!canvas) {
    canvas = createCanvas(f.w, f.h);
    scratch.set(key, canvas);
  }
  const ctx = canvas.getContext('2d');
  ctx.reset();
  draw(new Pen(ctx, 0, 0, 0, 0));
  const g = f[layer].g;
  g.save();
  g.globalAlpha = 1;
  g.drawImage(canvas, 0, 0);
  g.restore();
  if (!f.techniqueTrace) return [];
  const rgba = ctx.getImageData(0, 0, f.w, f.h).data,
    pixels: XY[] = [];
  for (let i = 3; i < rgba.length; i += 4)
    if (rgba[i] > 0) {
      const p = (i - 3) / 4;
      pixels.push([p % f.w, Math.floor(p / f.w)]);
    }
  return pixels;
}
// Keep the normal painter (and its compositing/order) untouched. The workshop records
// only still-unseen items, on the actual FX canvas, including held props before release.
let observed: ReadonlySet<string> | undefined;
export function traceMaterials<T>(alreadySeen: ReadonlySet<string>, draw: () => T): T {
  const outer = observed;
  observed = alreadySeen;
  try { return draw(); } finally { observed = outer; }
}
let mutedMaterial: string | undefined;
/** Draw the complete painting without this item, retaining all normal pen state for subsequent strokes. */
export function withoutMaterial<T>(id: string, draw: () => T): T {
  const outer = mutedMaterial;
  mutedMaterial = id;
  try { return draw(); } finally { mutedMaterial = outer; }
}
export function paintMaterial(
  f: FxInput, layer: Layer, id: string, at: XY,
  brush: (pen: Pen, x: number, y: number) => void, groundY?: number,
) {
  const pen = f[layer];
  if (mutedMaterial === id) {
    const before = pen.g.getImageData(0, 0, f.w, f.h);
    brush(pen, ...at);
    pen.g.putImageData(before, 0, 0);
    return;
  }
  if (!observed || observed.has(id) || !f.techniqueTrace) {
    brush(pen, ...at);
    return;
  }
  // Several coins can share one pixel at release. A before/after color delta would
  // miss a second coin of the same color, then mistake its first flight frame for birth.
  const key = 'material:' + f.w + 'x' + f.h;
  let canvas = scratch.get(key);
  if (!canvas) { canvas = createCanvas(f.w, f.h); scratch.set(key, canvas); }
  const ctx = canvas.getContext('2d');
  ctx.reset();
  ctx.fillStyle = pen.g.fillStyle;
  ctx.globalAlpha = pen.g.globalAlpha;
  brush(new Pen(ctx, 0, 0, 0, 0), ...at);
  brush(pen, ...at);
  const after = ctx.getImageData(0, 0, f.w, f.h).data;
  const actual = new Uint32Array(pen.g.getImageData(0, 0, f.w, f.h).data.buffer);
  const colors: number[] = [], pixels: XY[] = [];
  for (let i = 0; i < after.length; i += 4) {
    if (after[i + 3]) {
      const n = i / 4;
      pixels.push([n % f.w, Math.floor(n / f.w)]);
      colors.push(actual[n]);
    }
  }
  if (pixels.length) f.techniqueTrace.materials.push({ id, layer, at, groundY, pixels, colors });
}
/** Paint the visible contact mark itself. Evidence comes from ink actually deposited. */
export function paintImpact(
  f: FxInput,
  layer: Layer,
  socket: string,
  at: XY,
  brush: (pen: Pen, x: number, y: number) => void,
) {
  const pixels = isolatedPen(f, layer, (p) => brush(p, at[0], at[1]));
  if (pixels.length) f.techniqueTrace?.births.push({ socket, at: [...at], pixels });
}

export function socketPath(
  f: Pick<FxInput, 'pointAt'>,
  socket: string,
  fromSec: number,
  toSec: number,
): XY[] {
  if (toSec < fromSec) return [];
  const result = [f.pointAt(fromSec, socket)];
  for (let k = Math.floor(fromSec * 48) + 1; k < toSec * 48 - 1e-8; k++)
    result.push(f.pointAt(k / 48, socket));
  if (toSec > fromSec) result.push(f.pointAt(toSec, socket));
  return result;
}
/** Raster the sweep along unheld weapon poses at 48 Hz using the figure's own grip and socket. */
export function paintSocketTrail(
  f: FxInput,
  layer: Layer,
  socket: string,
  fromSec: number,
  toSec: number,
  style: { color: string; width?: number; alpha?: number },
) {
  const end = Math.min(toSec, f.t);
  const path = socketPath(f, socket, Math.max(0, fromSec), end);
  if (path.length < 2 || (style.alpha ?? 1) <= 0) return;
  const width = Math.max(1, Math.min(3, Math.round(style.width ?? 1)));
  const pixels = isolatedPen(f, layer, (p) => {
    p.col(style.color, style.alpha ?? 1);
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1],
        b = path[i],
        dx = b[0] - a[0],
        dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      for (let j = 0; j < width; j++) {
        const offset = j - (width - 1) / 2,
          ox = (-dy / len) * offset,
          oy = (dx / len) * offset;
        p.line(a[0] + ox, a[1] + oy, b[0] + ox, b[1] + oy);
      }
    }
  });
  if (f.techniqueTrace && pixels.length) {
    f.techniqueTrace.trails.push({ socket, from: Math.max(0, fromSec), to: end, pixels, path });
    f.techniqueTrace.trailPixels.push(...pixels);
    f.techniqueTrace.trailPath.push(...path);
  }
}
/** Time-based missile at arbitrary age, launched from its real historical socket. */
export function projectileAt(
  f: FxInput,
  id: string,
  socket: string,
  release: number,
  hit: number,
  landing: XY,
  height: number,
): XY {
  if (!(hit > release)) throw Error(id + ' projectile must land after release');
  const origin = f.pointAt(release, socket);
  const u = Math.max(0, Math.min(1, (f.t - release) / (hit - release)));
  const at: XY = [
    origin[0] + u * (landing[0] - origin[0]),
    origin[1] + u * (landing[1] - origin[1]) - 4 * height * u * (1 - u),
  ];
  if (f.t >= release - 1e-8 && f.t <= hit + 1 / 24) {
    f.techniqueTrace?.projectiles.push({
      id,
      socket,
      at,
      origin,
      landing: [...landing],
      release,
      hit,
    });
  }
  return at;
}
