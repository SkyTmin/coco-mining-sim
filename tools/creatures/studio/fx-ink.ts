// FX authors paint with field-space Pens. The production canvas clips at its edge; inspecting its final
// pixels cannot distinguish a mark on the edge from a mark a hundred pixels outside it.
import { createCanvas, type SKRSContext2D } from '@napi-rs/canvas';
import { Pen } from '../fx/pen';
import { paintSceneryRays } from '../viewer/scenery.mjs';
import type { FxInput, XY } from '../types';

const names = ['under', 'above', 'backdrop', 'light'] as const;
type Layer = typeof names[number];
type Brush = (f: FxInput) => void;
type Rect = [number, number, number, number]; // left, top, exclusive right, bottom
type Dirty = Map<string, XY>;
const tile = 32;

function remap(input: FxInput, make: (name: Layer) => Pen) {
  const f: FxInput = Object.create(input);
  for (const name of names) {
    let pen: Pen | undefined;
    Object.defineProperty(f, name, { get: () => pen ??= make(name) });
  }
  return f;
}

/** Only queue tiles touched by an actual draw request. Transparent sprite margins are checked by raster below. */
function queueTiles(dirty: Dirty, rect: Rect, w: number, h: number) {
  const [x0, y0, x1, y1] = rect;
  if (x0 >= 0 && y0 >= 0 && x1 <= w && y1 <= h) return;
  if (!rect.every(Number.isFinite) || x0 === x1 || y0 === y1) return;
  for (let y = Math.floor(y0 / tile) * tile; y < y1; y += tile) {
    for (let x = Math.floor(x0 / tile) * tile; x < x1; x += tile) {
      if (x < 0 || y < 0 || x + tile > w || y + tile > h) dirty.set(x + ',' + y, [x, y]);
    }
  }
}

function watched(pen: Pen, w: number, h: number, dirty: Dirty): Pen {
  const g = pen.g;
  let matrix = g.getTransform();
  function box(x: number, y: number, width: number, height: number) {
    if (matrix.isIdentity && x >= 0 && y >= 0 && width >= 0 && height >= 0 && x + width <= w && y + height <= h) return;
    if (g.globalAlpha <= 0) return;
    const xs = [x, x + width], ys = [y, y + height];
    const screen = xs.flatMap(a => ys.map(b => [a * matrix.a + b * matrix.c + matrix.e, a * matrix.b + b * matrix.d + matrix.f]));
    queueTiles(dirty, [Math.min(...screen.map(p => p[0])), Math.min(...screen.map(p => p[1])),
      Math.max(...screen.map(p => p[0])), Math.max(...screen.map(p => p[1]))], w, h);
  }
  // All Pen shapes, including lines, polygon fills, the glow kernels and sprites, use these two native calls.
  const methods: Record<string, Function> = {
    fillRect(x: number, y: number, width: number, height: number) {
      box(x, y, width, height);
      g.fillRect(x, y, width, height);
    },
    drawImage(image: { width: number; height: number }, ...args: number[]) {
      const [x, y, width = image.width, height = image.height] = args.length === 8 ? args.slice(4) : args;
      box(x, y, width, height);
      Reflect.apply(g.drawImage, g, [image, ...args]);
    },
  };
  for (const name of ['translate', 'scale', 'rotate', 'transform', 'setTransform', 'resetTransform', 'restore'] as const)
    methods[name] = (...args: unknown[]) => { Reflect.apply(g[name], g, args); matrix = g.getTransform(); };
  const ctx = new Proxy(g, {
    get(target, key) {
      if (typeof key === 'string' && methods[key]) return methods[key];
      const v = Reflect.get(target, key, target);
      if (typeof v !== 'function') return v;
      const bound = v.bind(target);
      if (typeof key === 'string') methods[key] = bound;
      return bound;
    },
    set(target, key, value) { return Reflect.set(target, key, value, target); },
  });
  return Object.create(pen, { g: { value: ctx } });
}

export function observeInk(f: FxInput, draw: Brush, dirty: Dirty) {
  const observed = remap(f, name => watched(f[name], f.w, f.h, dirty));
  observed.sceneryRay = (from, to, color, alpha) => {
    if (alpha > 0) queueTiles(dirty, [Math.min(from[0], to[0]), Math.min(from[1], to[1]),
      Math.max(from[0], to[0]) + 2, Math.max(from[1], to[1]) + 2], f.w, f.h);
    f.sceneryRay(from, to, color, alpha);
  };
  draw(observed);
}

// Keep one tile and one full-field surface per used size and layer. Large paintings can have thousands
// of off-field marks. A clean native context preserves masks, alpha and sprite edges for each probe.
const probeContexts = new Map<string, SKRSContext2D>();
function raster(input: FxInput, draw: Brush, x: number, y: number, width: number, height: number) {
  const layers = new Map<Layer, SKRSContext2D>();
  const f = remap(input, name => {
    const key = name + '/' + width + 'x' + height;
    let ctx = probeContexts.get(key);
    if (ctx) ctx.reset();
    else {
      ctx = createCanvas(width, height).getContext('2d');
      probeContexts.set(key, ctx);
    }
    ctx.translate(-x, -y);
    if (name === 'light') ctx.globalCompositeOperation = 'lighter';
    layers.set(name, ctx);
    return new Pen(ctx, 0, 0, 0, 0);
  });
  f.sceneryRay = (a, b, c, alpha) => paintSceneryRays(f.backdrop.g, [[...a, ...b, c, alpha]]);
  f.techniqueTrace = undefined;
  f.propAt = undefined;
  draw(f);
  return new Map([...layers].map(([name, ctx]) => [name, ctx.getImageData(0, 0, width, height).data]));
}

function ink(name: Layer, data: Uint8ClampedArray, i: number) {
  return data[i + 3] !== 0 && (name !== 'light' || (data[i] | data[i + 1] | data[i + 2]) !== 0);
}

export function outsidePixel(f: FxInput, draw: Brush, dirty: Dirty,
  allowed: (name: Layer, x: number, y: number) => boolean = () => false) {
  for (const [x, y] of dirty.values()) {
    for (const [name, data] of raster(f, draw, x, y, tile, tile)) {
      for (let j = 0; j < tile * tile; j++) {
        const px = x + j % tile, py = y + Math.floor(j / tile);
        if ((px < 0 || py < 0 || px >= f.w || py >= f.h) && ink(name, data, j * 4) && !allowed(name, px, py)) return { name, x: px, y: py };
      }
    }
  }
}

/** Count remaining FX ink against the resting effect at the same sockets and clock. Static stage props
 * rendered by old effects match their rest baseline. Props in Creature.props never enter this comparison. */
export function residualPixels(f: FxInput, draw: Brush, rest: FxInput) {
  const last = raster(f, draw, 0, 0, f.w, f.h);
  if (!last.size) return 0;
  const baseline = raster(rest, draw, 0, 0, f.w, f.h);
  let different = 0;
  for (const [name, data] of last) {
    const idle = baseline.get(name);
    for (let i = 0; i < data.length; i += 4) {
      if (!ink(name, data, i)) continue;
      if (!idle || data[i] !== idle[i] || data[i + 1] !== idle[i + 1] || data[i + 2] !== idle[i + 2] || data[i + 3] !== idle[i + 3])
        different++;
    }
  }
  return different;
}
