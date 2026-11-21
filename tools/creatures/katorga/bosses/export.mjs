// Usage: PORT=5201 PLAYWRIGHT_PATH=/.../playwright/index.mjs CHROMIUM=/usr/bin/chromium
// node export.mjs /path/to/coco-instruments /tmp/b4b/bosses [kind ...]
// Start Vite from a clean copy of the pinned revision after npm ci.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { specs } from './specs.mjs';

const [source, outArg, ...only] = process.argv.slice(2);
if (!source || !outArg) throw Error('expected source checkout and output directory');
const out = path.resolve(outArg);
const entry = path.resolve(source, 'scripts/dungeon/anim-sheet.mjs');
const digest = createHash('sha256').update(fs.readFileSync(entry)).digest('hex');
if (digest !== 'c52eb361dc390b6c5fe49bbe1e4fedf32201f205c38951613a7b8308cd5dd92e')
  throw Error('Review anim-sheet adapter for the new source revision');
const adapter = pathToFileURL(fileURLToPath(new URL('./playwright-export.mjs', import.meta.url))).href;
fs.mkdirSync(out, { recursive: true });
for (const spec of specs.filter((s) => !only.length || only.includes(s.kind))) {
  const dir = path.join(out, spec.kind);
  fs.mkdirSync(dir, { recursive: true });
  const specFile = path.join(dir, 'spec.json');
  fs.writeFileSync(specFile, JSON.stringify(spec));
  const run = spawnSync(process.execPath, [entry, specFile, path.join(dir, 'sheet-preview.png')], {
    stdio: 'inherit',
    env: { ...process.env, PLAYWRIGHT_MODULE: adapter, BOSS_OUT: out },
  });
  if (run.status !== 0) process.exit(run.status || 1);
}
const manifests = specs.map((s) => path.join(out, s.kind, 'manifest.json'));
if (manifests.every((file) => fs.existsSync(file))) {
  fs.writeFileSync(
    path.join(out, 'manifest.json'),
    JSON.stringify(
      manifests.map((file) => JSON.parse(fs.readFileSync(file))),
      null,
      2,
    ),
  );
}
