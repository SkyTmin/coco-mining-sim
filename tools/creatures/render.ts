import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  existsSync,
  copyFileSync,
  readFileSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
  renameSync,
} from 'node:fs';
import {
  sizes,
  type Creature,
  type Border,
  type Scene,
  type Variant,
  type XY,
} from './types';
import {
  compose,
  frameCount,
  hitFrame,
  layerNames,
  blit,
  foregroundObjects,
  ground,
} from './engine';
import { reelChapters, attachMotion, attachPetBehavior, directions, directionVector } from './motion';
import { GifWriter, savePNG } from './render-io';
import { frameImage } from './frame-kit';
import { Px } from './rig/px';
import { hx } from './kit/f11-mobkit';

const tools = dirname(fileURLToPath(import.meta.url));
const root = resolve(tools, '../../assets/creatures');
function safeID(id: string) {
  if (!/^[a-z][a-z0-9_-]*$/.test(id)) throw new Error('Unsupported id ' + id);
  return id;
}
export async function loadPainting(id: string) {
  const c: Creature = (await import('./c/' + safeID(id) + '.ts')).default;
  if (c.id !== id) throw new Error('Creature id mismatch');
  const s: Scene = (await import('./scenes/' + safeID(c.theme) + '.ts'))
    .default;
  const b: Border = (await import('./frames/' + safeID(c.rarity) + '.ts'))
    .default;
  const lifeFile = join(tools, 'c', id + '-life.ts');
  if (existsSync(lifeFile)) {
    const plan = (await import('./c/' + id + '-life.ts')).default;
    const behaviorFile = join(root, id, 'behavior.json');
    if (existsSync(behaviorFile)) {
      const behavior = JSON.parse(readFileSync(behaviorFile, 'utf8'));
      return { c: attachPetBehavior(c, plan, behavior), s, b };
    }
    return { c: attachMotion(c, plan), s, b };
  }
  return { c, s, b };
}
// Reframing a long limb can move the local crop but must not move the floor
// in the isolated turntable. Find one feasible pivot for all 16 directions.
function turnPivots(c: Creature, size: number, frames: number) {
  const limits: number[][] = [];
  for (let n = 0; n < frames; n++) {
    const body = c.frame('turn', n / 24, Math.floor(n / 6) % 16, 'normal');
    const [ax, ay] = body.anchor,
      p = body.px;
    let x0 = p.w,
      y0 = p.h,
      x1 = -1,
      y1 = -1;
    for (let y = 0; y < p.h; y++)
      for (let x = 0; x < p.w; x++) {
        if (!p.solid(x, y) && !body.lit?.solid(x, y)) continue;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
    limits.push([ax - x0, size - 1 - x1 + ax, ay - y0, size - 1 - y1 + ay]);
  }
  const base = c.frame('idle', 0, 0, 'normal').anchor;
  const clamp = (p: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, p));
  const pivot = (k: number) => {
    const lo = Math.max(...limits.map((r) => r[k])),
      hi = Math.min(...limits.map((r) => r[k + 1]));
    return lo <= hi ? clamp(base[k / 2], lo, hi) : Math.round((lo + hi) / 2);
  };
  const x = pivot(0),
    y = pivot(2);
  return limits.map((r) => [clamp(x, r[0], r[1]), clamp(y, r[2], r[3])] as XY);
}
function writePainting(
  c: Creature,
  s: Scene,
  b: Border,
  name: string,
  variant: Variant,
  scale: number,
  output: string,
) {
  const spec = c.animations[name],
    frames = frameCount(spec.seconds),
    suffix = name + (variant === 'gold' ? '-gold' : '');
  const gif = new GifWriter(scale, true),
    turn =
      name === 'turn' && variant === 'normal'
        ? new GifWriter(scale, true)
        : null;
  const [, , size] = sizes[c.rarity];
  const pivots = turn ? turnPivots(c, size, frames) : [];
  const dir = join(output, 'frames', suffix),
    movedFrames = new Set<string>();
  const track = [];
  for (let f = 0; f < frames; f++) {
    const t = f / 24,
      r = compose(c, s, b, name, t, 0, variant);
    gif.add(r.picture, f);
    track.push({
      feet: r.worldFeet,
      camera: r.camera,
      backgroundFrame: r.backgroundFrame,
      side: r.motion.side,
      headSide: r.motion.headSide,
      pose: r.motion.anim,
      poseTime: r.motion.t,
      lift: r.motion.lift,
      planted: r.body.planted ?? [],
      contacts: r.contact,
    });
    const file = String(f).padStart(3, '0') + '.png';
    for (const layer of [
      'fxu',
      'body',
      'lit',
      'fxo',
      ...(['show', 'peek'].includes(name) ? ['over'] : []),
    ] as const) {
      savePNG(
        join(output, 'frames', suffix, layer, file),
        r.layers[layer as keyof typeof r.layers],
      );
    }
    if (r.camera.some(Boolean)) {
      savePNG(join(dir, 'bg', file), r.layers.bg);
      movedFrames.add(file);
    }
    if (turn) {
      const p = new Px(size, size);
      p.rect(0, 0, size - 1, size - 1, hx('#1e1c24'));
      const body = r.body;
      const x = Math.round(pivots[f][0] - body.anchor[0]),
        y = Math.round(pivots[f][1] - body.anchor[1]);
      blit(p, body.px, x, y);
      if (body.lit) blit(p, body.lit, x, y);
      turn.add(p, f);
    }
  }
  // Re-rendering a technique can move its contact or shorten its animation.
  // Remove obsolete generated PNGs only after the new frames succeeded.
  for (const layer of readdirSync(dir, { withFileTypes: true })) {
    if (!layer.isDirectory()) continue;
    for (const file of readdirSync(join(dir, layer.name))) {
      if (!/^\d{3,}\.png$/.test(file)) continue;
      if (
        parseInt(file, 10) >= frames ||
        (layer.name === 'bg' && !movedFrames.has(file))
      )
        unlinkSync(join(dir, layer.name, file));
    }
  }
  writeFileSync(join(dir, 'motion.json'), JSON.stringify(track));
  gif.write(join(output, 'gif', 'painting-' + suffix + '.gif'));
  turn?.write(join(output, 'gif', 'turn.gif'));
}
export function writePaintingMaterials(
  c: Creature,
  s: Scene,
  b: Border,
  output: string,
) {
  const [w, h, , thickness] = sizes[c.rarity];
  const objects = foregroundObjects(s, w, h),
    front = new Px(w + 2 * thickness, h + 2 * thickness);
  for (const obj of objects) {
    const framed = new Px(front.w, front.h);
    blit(framed, obj.pixels, thickness, thickness);
    savePNG(join(output, 'bg', 'front', safeID(obj.id) + '.png'), framed);
    blit(front, framed);
  }
  savePNG(join(output, 'bg', 'front.png'), front);
  writeFileSync(
    join(output, 'bg', 'front-depth.json'),
    JSON.stringify(
      objects.map((x) => ({ id: x.id, depth: x.depth })),
      null,
      2,
    ) + '\n',
  );
  for (let f = 0; f < 72; f++) {
    const t = f / 24,
      file = String(f).padStart(3, '0') + '.png';
    const bg = new Px(w, h);
    s(bg, t);
    const framed = new Px(w + thickness * 2, h + thickness * 2);
    blit(framed, bg, thickness, thickness);
    savePNG(join(output, 'bg', 'loop', file), framed);
    const border = frameImage(b, w, h, thickness, t),
      frameDir = join(dirname(output), 'frames', c.rarity);
    savePNG(join(frameDir, 'loop', file), border);
    if (f === 0) {
      savePNG(join(output, 'bg', 'base.png'), framed);
      savePNG(join(frameDir, 'base.png'), border);
    }
  }
}
// Also usable independently: --anim idle --scale 1 renders just its two variants.
export async function render(
  id: string,
  name: string | undefined,
  scale: number,
  assetRoot = root,
) {
  const { c, s, b } = await loadPainting(id);
  const output = join(assetRoot, c.id);
  mkdirSync(output, { recursive: true });
  if (c.behavior && resolve(assetRoot) !== root)
    copyFileSync(join(root, id, 'behavior.json'), join(output, 'behavior.json'));
  const names = name ? [name] : Object.keys(c.animations);
  const main = Object.keys(c.animations).find((a) => a.startsWith('tech_'));
  if (
    !name ||
    name === 'idle' ||
    !existsSync(join(output, 'bg', 'base.png')) ||
    !existsSync(join(assetRoot, 'frames', c.rarity, 'base.png'))
  )
    writePaintingMaterials(c, s, b, output);
  for (const anim of names) {
    if (!c.animations[anim]) throw new Error('Unknown animation ' + anim);
    writePainting(c, s, b, anim, 'normal', scale, output);
    if (anim === 'life' && c.behavior)
      copyFileSync(join(output, 'gif', 'painting-life.gif'), join(output, 'gif', 'paintings.gif'));
    if (anim === 'idle' || anim === main)
      writePainting(c, s, b, anim, 'gold', scale, output);
  }
  const [w, h, bodySize, thickness] = sizes[c.rarity],
    idle = c.frame('idle', 0, 0, 'normal');
  const meta = {
    id: c.id,
    rarity: c.rarity,
    theme: c.theme,
    fps: 24,
    scale,
    field: [w, h],
    thickness,
    bodySize,
    canvas: [w + 2 * thickness, h + 2 * thickness],
    anchor: idle.anchor,
    eye: idle.eye,
    primitives: idle.primitives,
    feet: (c.portraitOrigin ?? ground(w, h)).map(v => v + thickness),
    points: idle.points,
    motion: c.motion
      ? {
          life: c.behavior ? { behavior: 'behavior.json', seed: c.behavior.seed, seconds: c.behavior.previewSeconds } : c.motion,
          track: 'frames/<anim>/motion.json',
          directions: Object.fromEntries(
            directions.map((d) => {
              const v = directionVector(d, c.motion!.stride);
              const start = c.portraitOrigin ?? ground(w, h);
              return [
                'walk_' + d,
                {
                  velocity: v,
                  pixelsPerSecond: Math.hypot(...v),
                  worldStride: c.motion!.stride,
                  feet: [start[0] - v[0] / 2, start[1] - v[1] / 2],
                },
              ];
            }),
          ),
        }
      : undefined,
    layers: layerNames,
    showreel: c.animations.showreel ? reelChapters(c) : undefined,
    foreground:
      'Use bg/front-depth.json and bg/front/<id>.png sorted by depth. Objects with depth > motion.feet[1] go into bgf; the rest into bgfBack. Apply motion.camera to all field layers.',
    background:
      'use frames/<anim>/bg/NNN.png when present, otherwise use bg/loop/<motion.backgroundFrame>.png',
    animations: Object.fromEntries(
      Object.entries(c.animations).map(([a, v]) => [
        a,
        {
          seconds: v.seconds,
          frames: frameCount(v.seconds),
          loop: v.loop ?? false,
          hit: v.hits?.map(hitFrame) ?? [],
          shake: v.shake ?? 0,
          stop: v.stop ?? 0,
          interrupt: v.interrupt,
          bearings: v.bearings,
        },
      ]),
    ),
  };
  const path = join(output, 'meta.json');
  const part = path + '.' + process.pid + '.part';
  writeFileSync(part, JSON.stringify(meta, null, 2) + '\n');
  renameSync(part, path);
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const get = (k: string) => {
    const i = process.argv.indexOf(k);
    return i < 0 ? undefined : process.argv[i + 1];
  };
  const id = get('--id');
  if (!id)
    throw new Error(
      'Usage: npx tsx render.ts --id ID [--anim NAME] [--scale N]',
    );
  await render(id, get('--anim'), Number(get('--scale') ?? 3));
}
