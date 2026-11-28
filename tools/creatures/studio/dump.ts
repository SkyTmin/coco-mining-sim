// Helper for `ws sheet --against`: renders frames with the pipeline of another checkout.
// usage: node --import tsx studio/dump.ts <tools-dir> <id> <anim> <f1,f2,…> <out-dir>
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';

const [root, id, anim, list, out] = process.argv.slice(2);
const { loadPainting } = await import(pathToFileURL(join(root, 'render.ts')).href);
const { compose } = await import(pathToFileURL(join(root, 'engine.ts')).href);
const { c, s, b } = await loadPainting(id);
if (!c.animations[anim]) process.exit(0);
for (const n of list.split(',').map(Number)) {
  const p = compose(c, s, b, anim, n / 24).picture;
  const png = new PNG({ width: p.w, height: p.h });
  png.data = Buffer.from(p.data.buffer, p.data.byteOffset, p.data.byteLength);
  writeFileSync(join(out, n + '.png'), PNG.sync.write(png));
}
