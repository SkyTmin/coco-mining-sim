import { createCanvas, type Canvas } from '@napi-rs/canvas';
import { Px } from './rig/px';
import { placement } from './motion';
import { Pen } from './fx/pen';
import { emptyTechniqueTrace } from './technique-fx';
import { frameImage } from './frame-kit';
import {
  sizes,
  type Creature,
  type FxInput,
  type Scene,
  type Border,
  type BodyFrame,
  type Variant,
  type XY,
} from './types';

const fps = 24;
export const frameCount = (seconds: number) =>
  Math.max(1, Math.round(seconds * fps));
export const hitFrame = (seconds: number) => Math.round(seconds * fps);
export const ground = (w: number, h: number): XY => [
  Math.round(w * 0.48),
  Math.round(h * 0.77),
];
export const layerNames = [
  'bg',
  'bgfBack',
  'fxu',
  'body',
  'lit',
  'fxo',
  'bgf',
  'frame',
  'over',
] as const;
export type Layers = Record<(typeof layerNames)[number], Px>;
const caches = new WeakMap<object, Map<string, Px>>();
function cached(owner: object, key: string, paint: () => Px) {
  let m = caches.get(owner);
  if (!m) caches.set(owner, (m = new Map()));
  let p = m.get(key);
  if (!p) {
    if (m.size >= 144) m.clear();
    p = paint();
    m.set(key, p);
  }
  return p;
}
export function blit(
  dst: Px,
  src: Px,
  ox = 0,
  oy = 0,
  clip?: [number, number, number, number],
) {
  const x0 = Math.max(0, -ox, (clip?.[0] ?? 0) - ox),
    y0 = Math.max(0, -oy, (clip?.[1] ?? 0) - oy);
  const x1 = Math.min(src.w, dst.w - ox, (clip?.[2] ?? dst.w) - ox),
    y1 = Math.min(src.h, dst.h - oy, (clip?.[3] ?? dst.h) - oy);
  const src32 = new Uint32Array(src.data.buffer),
    dst32 = new Uint32Array(dst.data.buffer);
  for (let y = y0; y < y1; y++) {
    let i = y * src.w + x0,
      j = (y + oy) * dst.w + ox + x0;
    for (let x = x0; x < x1; x++, i++, j++) {
      const a = src.data[4 * i + 3];
      if (a === 255 || (a && !dst.data[4 * j + 3])) dst32[j] = src32[i];
      else if (a) dst.set(x + ox, y + oy, src.get(x, y));
    }
  }
}
export function stack(layers: Layers) {
  const p = new Px(layers.bg.w, layers.bg.h);
  for (const key of layerNames) blit(p, layers[key]);
  return p;
}
export function screenPoint(fr: BodyFrame, p: XY, feet: XY): XY {
  const x = (p[0] - fr.anchor[0]) * (fr.sx ?? 1),
    y = (p[1] - fr.anchor[1]) * (fr.sy ?? 1);
  const a = fr.rot ?? 0;
  return [
    feet[0] + (fr.dx ?? 0) + x * Math.cos(a) - y * Math.sin(a),
    feet[1] + (fr.dy ?? 0) + x * Math.sin(a) + y * Math.cos(a),
  ];
}
// Inverse-map each destination pixel once; forward mapping leaves holes in a rotated arm.
export function sprite(
  dst: Px,
  p: Px,
  fr: BodyFrame,
  feet: XY,
  clip: [number, number, number, number],
  alpha = 1,
) {
  const sx = fr.sx ?? 1,
    sy = fr.sy ?? 1,
    a = fr.rot ?? 0;
  if (!sx || !sy) return;
  if (sx === 1 && sy === 1 && a === 0 && alpha === 1) {
    const [x, y] = screenPoint(fr, [0, 0], feet);
    blit(dst, p, Math.round(x), Math.round(y), clip);
    return;
  }
  const corners = (
    [
      [0, 0],
      [p.w, 0],
      [0, p.h],
      [p.w, p.h],
    ] as XY[]
  ).map((v) => screenPoint(fr, v, feet));
  const xs = corners.map((v) => v[0]),
    ys = corners.map((v) => v[1]);
  const cos = Math.cos(a),
    sin = Math.sin(a);
  for (
    let y = Math.max(clip[1], Math.floor(Math.min(...ys)));
    y < Math.min(clip[3], Math.ceil(Math.max(...ys)));
    y++
  )
    for (
      let x = Math.max(clip[0], Math.floor(Math.min(...xs)));
      x < Math.min(clip[2], Math.ceil(Math.max(...xs)));
      x++
    ) {
      const u = x + 0.5 - feet[0] - (fr.dx ?? 0),
        v = y + 0.5 - feet[1] - (fr.dy ?? 0);
      const ix = Math.floor(fr.anchor[0] + (u * cos + v * sin) / sx),
        iy = Math.floor(fr.anchor[1] + (v * cos - u * sin) / sy);
      if (!p.solid(ix, iy)) continue;
      const col = p.get(ix, iy);
      col[3] = Math.round(col[3] * alpha);
      dst.set(x, y, col);
    }
}
function asPx(canvas: Canvas) {
  const p = new Px(canvas.width, canvas.height);
  p.data.set(canvas.getContext('2d').getImageData(0, 0, p.w, p.h).data);
  return p;
}
const fxCanvases = new Map<string, [Canvas, Canvas]>();
function getFxCanvases(w: number, h: number): [Canvas, Canvas] {
  const key = w + 'x' + h;
  let pair = fxCanvases.get(key);
  if (!pair) {
    pair = [createCanvas(w, h), createCanvas(w, h)];
    fxCanvases.set(key, pair);
  }
  for (const canvas of pair) {
    const g = canvas.getContext('2d');
    g.reset();
  }
  return pair;
}
// Source layers are field-sized. Keep the soft contact and the golden reflection
// off the outside rail even when a creature departs the painting.
function clipFloor(p: Px, b: number, w: number, h: number) {
  const stride = p.w * 4;
  p.data.fill(0, 0, b * stride);
  p.data.fill(0, (b + h) * stride);
  for (let y = b; y < b + h; y++) {
    p.data.fill(0, y * stride, y * stride + b * 4);
    p.data.fill(0, y * stride + (b + w) * 4, (y + 1) * stride);
  }
}
export function foregroundObjects(scene: Scene, w: number, h: number) {
  return (scene.front ?? [])
    .map((prop) => ({
      id: prop.id,
      depth: prop.depth,
      pixels: cached(prop, w + '-' + h, () => {
        const pixels = new Px(w, h);
        prop.paint(pixels);
        return pixels;
      }),
    }))
    .sort((a, b) => a.depth - b.depth);
}
export function splitForeground(
  objects: ReturnType<typeof foregroundObjects>,
  layers: Pick<Layers, 'bgf' | 'bgfBack'>,
  footY: number,
  b: number,
  dx: number,
  dy: number,
) {
  const w = layers.bgf.w - 2 * b,
    h = layers.bgf.h - 2 * b;
  for (const obj of objects)
    blit(
      obj.depth > footY ? layers.bgf : layers.bgfBack,
      obj.pixels,
      b + dx,
      b + dy,
      [b, b, b + w, b + h],
    );
}
export function loopSample(t: number, anim: string, seconds: number) {
  const u = (anim === 'life' || anim === 'showreel') ? (t * 3 * Math.round(seconds / 3)) / seconds : t;
  return ((Math.round(u * fps) % 72) + 72) % 72;
}
export function compose(
  c: Creature,
  scene: Scene,
  border: Border,
  anim: string,
  t: number,
  side = 0,
  variant: Variant = 'normal',
) {
  const requested = anim,
    clock = t,
    outer = c.animations[anim];
  if (!outer) throw new Error('Unknown animation ' + c.id + '/' + anim);
  const [w, h, , b] = sizes[c.rarity],
    W = w + b * 2,
    H = h + b * 2;
  const at = placement(c, requested, t, side, ground(w, h));
  anim = at.anim;
  t = at.t;
  const spec = c.animations[anim] ?? outer,
    feet = at.feet,
    loopFrame = loopSample(clock, requested, outer.seconds);

  const bg = cached(scene, w + '-' + h + '-' + loopFrame, () => {
    const p = new Px(w, h);
    scene(p, loopFrame / fps);
    return p;
  });
  const frame = cached(border, w + '-' + h + '-' + loopFrame, () =>
    frameImage(border, w, h, b, loopFrame / fps),
  );
  const n = Math.round(t * fps);
  const hits = spec.hits ?? [];
  const beat =
    requested === 'life' && c.motion ? c.motion.beats[at.beat] : undefined;
  const actionBeat =
    beat && beat.anim === anim && anim.startsWith('tech_') ? beat : undefined;
  const timeToWorld = (local: number) =>
    actionBeat ? at.start + (local * actionBeat.seconds) / spec.seconds : local;
  const contactFrames = hits.map((h) => hitFrame(timeToWorld(h)));
  const onTimeline = actionBeat
    ? hitFrame(((clock % outer.seconds) + outer.seconds) % outer.seconds)
    : n;
  const last = contactFrames.findLastIndex((f) => f <= onTimeline);
  const since = last < 0 ? Infinity : (onTimeline - contactFrames[last]) / fps;
  const hold = spec.stop ?? 0;
  const sample = last >= 0 && onTimeline - contactFrames[last] <= Math.round(hold * fps) ? hits[last] : t;
  const contact = hits.filter((h, i) => contactFrames[i] === onTimeline);
  const dir = anim === 'turn' ? Math.floor(t * 4) % 16 : at.side;
  const finalFrame = !spec.loop && n >= frameCount(spec.seconds) - 1;
  const poseAnim =
    finalFrame && anim !== 'away'
      ? anim === 'phase' && c.animations['idle-f2']
        ? 'idle-f2'
        : 'idle'
      : anim;
  const poseTime = finalFrame ? (anim === 'away' ? spec.seconds : 0) : sample;
  const projected = (time: number, position = at): BodyFrame => {
    const body = c.frame(
      poseAnim,
      time,
      position === at ? dir : position.side,
      variant,
      { headSide: position.headSide, gaitPhase: position.t },
    );
    return position.lift
      ? { ...body, dy: (body.dy ?? 0) - position.lift }
      : body;
  };
  const body = projected(poseTime);
  const env = finalFrame
    ? 0
    : Math.max(0, 1 - since / 0.24) * (spec.shake ?? 0);
  const dx = Math.round(Math.sin(n * 2.3) * 10 * env) || 0,
    dy = Math.round(Math.cos(n * 2.1) * 6 * env) || 0;
  const fullFeet: XY = [feet[0] + b + dx, feet[1] + b + dy];
  const layers = {} as Layers;
  for (const key of layerNames)
    layers[key] = key === 'frame' ? frame : new Px(W, H);
  const clip: [number, number, number, number] = [b, b, b + w, b + h];
  // Edge-clamp the backdrop during shake so the field never reveals a transparent seam.
  blit(layers.bg, bg, b, b);
  if (dx || dy) blit(layers.bg, bg, b + dx, b + dy, clip);
  splitForeground(foregroundObjects(scene, w, h), layers, feet[1], b, dx, dy);
  const origin = screenPoint(body, body.anchor, feet);
  const floorXY: XY = [origin[0] + b + dx, feet[1] + b + dy];
  const scaleX = Math.abs(body.sx ?? 1),
    scaleY = Math.abs(body.sy ?? 1);
  const visible =
    scaleX > 0 &&
    scaleY > 0 &&
    body.px.data.some((v, i) => i % 4 === 3 && v !== 0);
  if (visible) {
    const r = (body.px.w * 0.26 * scaleX) / (1 + at.lift * 0.025);
    layers.fxu.ell(floorXY[0], floorXY[1] + 1, r, r * 0.21, [18, 13, 21, 72]);
    layers.fxu.ell(
      floorXY[0],
      floorXY[1] + 1,
      r * 0.7,
      r * 0.14,
      [17, 13, 22, 65],
    );
    if (body.lit) {
      let r = 0,
        g = 0,
        bv = 0,
        count = 0;
      for (let i = 0; i < body.lit.data.length; i += 4)
        if (body.lit.data[i + 3] > 65) {
          r += body.lit.data[i];
          g += body.lit.data[i + 1];
          bv += body.lit.data[i + 2];
          count++;
        }
      if (count)
        layers.fxu.ell(
          floorXY[0],
          floorXY[1],
          body.px.w * 0.16 * scaleX,
          body.px.h * 0.035 * scaleY,
          [r / count, g / count, bv / count, 42],
        );
    }
  }
  const points = Object.fromEntries(
    Object.entries(body.points).map(([k, p]) => [
      k,
      screenPoint(body, p, feet),
    ]),
  );
  const techniqueTrace = emptyTechniqueTrace();
  if ((c.props || c.effects) && !(finalFrame && anim === 'away')) {
    const [under, above] = getFxCanvases(w, h);
    const historical = new Map<number, BodyFrame>([[poseTime, body]]);
    const fx: FxInput = {
      anim: poseAnim,
      t: finalFrame ? 0 : (contact[0] ?? t),
      duration: c.animations[poseAnim]?.seconds ?? spec.seconds,
      hits: finalFrame ? [] : hits,
      variant,
      feet,
      points,
      techniqueTrace,
      w,
      h,
      under: new Pen(under.getContext('2d'), 0, 0, 0, 0),
      above: new Pen(above.getContext('2d'), 0, 0, 0, 0),
      pointAt: (when, name) => {
        const source =
          (actionBeat || spec.groundOffset) && when !== poseTime
            ? placement(c, requested, timeToWorld(when) + (requested === 'showreel' ? at.start : 0), side, ground(w, h))
            : at;
        let fr = historical.get(when);
        if (!fr) {
          fr = projected(when, source);
          historical.set(when, fr);
        }
        if (!fr.points[name])
          throw new Error(c.id + '/' + anim + ' missing socket ' + name);
        return screenPoint(fr, fr.points[name], source.feet);
      },
    };
    c.props?.(fx);
    c.effects?.(fx);
    blit(layers.fxu, asPx(under), b + dx, b + dy, clip);
    blit(layers.fxo, asPx(above), b + dx, b + dy, clip);
  }
  if (body.ghost)
    sprite(
      layers.body,
      body.px,
      body,
      [fullFeet[0] + body.ghost.dx, fullFeet[1] + body.ghost.dy],
      clip,
      body.ghost.alpha,
    );
  const flash =
    body.flash ??
    (!finalFrame && hits.length === 1 && since < 0.1
      ? 0.09 * (1 - since / 0.1)
      : 0);
  sprite(
    layers.body,
    flash ? body.px.tint([255, 240, 211, 255], flash) : body.px,
    body,
    fullFeet,
    clip,
  );
  if (body.lit) sprite(layers.lit, body.lit, body, fullFeet, clip);
  if (body.over && (anim === 'peek' || anim === 'show'))
    sprite(layers.over, body.over, body, fullFeet, [0, 0, W, H]);
  if (variant === 'gold' && visible) {
    const x = floorXY[0],
      y = floorXY[1],
      r = body.px.w * 0.25 * scaleX;
    for (let i = 0; i < 100; i++) {
      const a = (i * 2 * Math.PI) / 100;
      layers.fxu.set(
        x + r * Math.cos(a),
        y + r * 0.24 * Math.sin(a),
        [244, 198, 105, 106],
      );
    }
  }
  clipFloor(layers.fxu, b, w, h);
  return {
    layers,
    picture: stack(layers),
    body,
    feet: fullFeet,
    worldFeet: feet,
    techniqueTrace,
    contact,
    motion: at,
    backgroundFrame: loopFrame,
    points,
    camera: [dx, dy] as XY,
  };
}
