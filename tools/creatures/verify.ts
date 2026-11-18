// Check the published files as a player would load them, independently of the encoder.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import omggif from 'omggif';
import { PNG } from 'pngjs';
import { frameCount, hitFrame, layerNames, stack, type Layers } from './engine';
import { indexed } from './render-io';
import { loadPainting } from './render';
import { Px } from './rig/px';

const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../assets/creatures');
function pixels(file: string, w: number, h: number) {
  const src = PNG.sync.read(readFileSync(file));
  assert.equal(src.width, w, file);
  assert.equal(src.height, h, file);
  const result = new Px(w, h);
  result.data.set(src.data);
  return result;
}
const frameName = (n: number) => String(n).padStart(3, '0') + '.png';
function imageFiles(dir: string, count: number) {
  const files = new Set(readdirSync(dir));
  assert.equal(files.size, count, dir);
  for (let n = 0; n < count; n++)
    assert.ok(files.has(frameName(n)), join(dir, frameName(n)));
}
export async function verifyRelease(id: string, assetRoot = root) {
  const { c } = await loadPainting(id);
  const output = join(assetRoot, id),
    meta = JSON.parse(readFileSync(join(output, 'meta.json'), 'utf8'));
  const [w, h] = meta.canvas;
  assert.equal(meta.id, id);
  assert.equal(meta.fps, 24);
  const frameLoop = join(assetRoot, 'frames', c.rarity, 'loop'),
    bgLoop = join(output, 'bg', 'loop');
  imageFiles(frameLoop, 72);
  imageFiles(bgLoop, 72);
  const main = Object.keys(c.animations).find((name) =>
    name.startsWith('tech_'),
  );
  let gifCount = 0,
    checkedFrames = 0;
  for (const [anim, spec] of Object.entries(c.animations)) {
    const count = frameCount(spec.seconds),
      contacts = (spec.hits ?? []).map(hitFrame);
    assert.equal(meta.animations[anim].frames, count, anim);
    assert.deepEqual(meta.animations[anim].hit, contacts, anim);
    if (anim.startsWith('tech_'))
      assert.ok(contacts.length, anim + ' must declare a contact');
    for (const n of contacts)
      assert.ok(n >= 0 && n < count, anim + ' contact outside animation');
    for (const suffix of anim === 'idle' || anim === main
      ? [anim, anim + '-gold']
      : [anim]) {
      const dir = join(output, 'frames', suffix),
        gif = join(output, 'gif', 'painting-' + suffix + '.gif');
      const reader = new omggif.GifReader(readFileSync(gif));
      gifCount++;
      assert.equal(reader.numFrames(), count, gif);
      assert.equal(reader.width, w * meta.scale, gif);
      assert.equal(reader.height, h * meta.scale, gif);
      const hasOver = ['show', 'peek'].includes(anim);
      for (const key of [
        'fxu',
        'body',
        'lit',
        'fxo',
        ...(hasOver ? ['over'] : []),
      ])
        imageFiles(join(dir, key), count);
      for (let n = 0; n < count; n++)
        assert.equal(
          reader.frameInfo(n).delay,
          Math.round(((n + 1) * 100) / 24) - Math.round((n * 100) / 24),
          gif,
        );
      // The contact and release frames catch accidental layer offsets, shake and stale variant exports.
      const sample = new Set([
        0,
        Math.floor(count / 2),
        count - 1,
        ...contacts,
        ...contacts.map((n) => Math.min(count - 1, n + 1)),
      ]);
      const raw = new Uint8Array(reader.width * reader.height * 4);
      for (const n of sample) {
        const file = frameName(n),
          loopFile = frameName(n % 72),
          layers = {} as Layers;
        const moved = join(dir, 'bg', file);
        for (const key of layerNames) {
          if (key === 'over' && !hasOver) {
            layers.over = new Px(w, h);
            continue;
          }
          const source =
            key === 'bg'
              ? existsSync(moved)
                ? moved
                : join(bgLoop, loopFile)
              : key === 'frame'
                ? join(frameLoop, loopFile)
                : join(dir, key, file);
          layers[key] = pixels(source, w, h);
        }
        const p = stack(layers),
          table = indexed(p);
        raw.fill(0);
        reader.decodeAndBlitFrameRGBA(n, raw);
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) {
            const i = y * w + x,
              k = table.indices[i];
            const j = (y * meta.scale * reader.width + x * meta.scale) * 4;
            if (table.transparent && k === table.transparentIndex) {
              assert.equal(raw[j + 3], 0, gif);
              continue;
            }
            const color = table.palette[k];
            if (
              raw[j] !== color[0] ||
              raw[j + 1] !== color[1] ||
              raw[j + 2] !== color[2] ||
              raw[j + 3] !== 255
            )
              assert.fail(
                gif +
                  ' differs from its PNG layers at frame ' +
                  n +
                  ' pixel ' +
                  x +
                  ',' +
                  y,
              );
          }
        checkedFrames++;
      }
    }
  }
  const turn = new omggif.GifReader(
    readFileSync(join(output, 'gif', 'turn.gif')),
  );
  assert.equal(turn.numFrames(), 96);
  assert.equal(turn.width, meta.bodySize * meta.scale);
  assert.equal(turn.height, turn.width);
  return {
    id,
    animations: Object.keys(c.animations).length,
    gifs: gifCount + 1,
    comparedFrames: checkedFrames,
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const ids = process.argv.slice(2);
  if (!ids.length) throw new Error('Usage: npm run verify -- <id> [id ...]');
  for (const id of ids) console.log(await verifyRelease(id));
}
