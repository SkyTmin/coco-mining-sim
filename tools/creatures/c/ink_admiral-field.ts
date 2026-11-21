import type { Canvas } from '@napi-rs/canvas';
import { Px } from '../rig/px';
import type { BodyFrame, Creature, FxInput, XY } from '../types';

// Split the already depth-tested picture. An object crossing the boundary
// keeps its exact edge, lighting and per-pixel order on either side.
export function splitJuggleFrame(frame: BodyFrame) {
  const size = 128;
  if (frame.px.w <= size && frame.px.h <= size) return { body: frame };
  const x = Math.max(0, Math.min(frame.px.w - size, frame.anchor[0] - 64));
  const y = Math.max(0, Math.min(frame.px.h - size, frame.anchor[1] - 99));
  const outside = new Px(frame.px.w, frame.px.h);
  function slice(src: Px, collect: boolean) {
    const portrait = new Px(size, size);
    for (let row = 0; row < src.h; row++) {
      const start = (row * src.w + x) * 4;
      if (row >= y && row < y + size)
        portrait.data.set(src.data.subarray(start, start + 4 * size), (row - y) * size * 4);
      if (!collect) continue;
      const first = row * src.w * 4,
        last = first + 4 * src.w;
      outside.data.set(src.data.subarray(first, last), first);
      if (row >= y && row < y + size) outside.data.fill(0, start, start + 4 * size);
    }
    return portrait;
  }
  const shift = ([a, b]: XY): XY => [a - x, b - y];
  const body: BodyFrame = {
    ...frame,
    px: slice(frame.px, true),
    lit: frame.lit ? slice(frame.lit, false) : null,
    anchor: shift(frame.anchor),
    eye: frame.eye ? shift(frame.eye) : null,
    points: Object.fromEntries(Object.entries(frame.points).map(([key, point]) => [key, shift(point)])),
  };
  return { body, field: outside, origin: frame.anchor };
}

export function fieldJuggle(draw: Creature['frame']) {
  // compose calls props synchronously on this frame before it samples past
  // sockets for effects. Each creature instance owns its own pending picture.
  let pending: { image: Canvas; origin: XY } | undefined;
  const frame: Creature['frame'] = (...args) => {
    const raw = draw(...args);
    if (args[0] !== 'trick') return raw;
    const { body, field, origin } = splitJuggleFrame(raw);
    pending = field && origin ? { image: field.canvas(), origin } : undefined;
    return body;
  };
  function props(f: FxInput) {
    if (f.anim !== 'trick' || !pending) return;
    const [x, y] = f.points.floor;
    f.above.g.drawImage(pending.image, Math.round(x - pending.origin[0]), Math.round(y - pending.origin[1]));
  }
  return { frame, props };
}
