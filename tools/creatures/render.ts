import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  existsSync,
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
} from './types';
import { compose, frameCount, hitFrame, layerNames, blit } from './engine';
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
  return { c, s, b };
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
  const gif = new GifWriter(scale),
    turn =
      name === 'turn' && variant === 'normal' ? new GifWriter(scale) : null;
  const [, , size] = sizes[c.rarity];
  const dir = join(output, 'frames', suffix),
    movedFrames = new Set<string>();
  for (let f = 0; f < frames; f++) {
    const t = f / 24,
      r = compose(c, s, b, name, t, 0, variant);
    gif.add(r.picture, f);
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
    if (spec.shake && r.camera.some(Boolean)) {
      savePNG(join(dir, 'bg', file), r.layers.bg);
      movedFrames.add(file);
    }
    if (turn) {
      const p = new Px(size, size);
      p.rect(0, 0, size - 1, size - 1, hx('#1e1c24'));
      const body = r.body;
      const x =
        body.px.w === size ? 0 : Math.round(size * 0.5 - body.anchor[0]);
      const y =
        body.px.h === size ? 0 : Math.round(size * 0.8 - body.anchor[1]);
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
    feet: [Math.round(w * 0.48) + thickness, Math.round(h * 0.77) + thickness],
    points: idle.points,
    layers: layerNames,
    background:
      'use frames/<anim>/bg/NNN.png when present, otherwise bg/loop/(frame % 72).png',
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
