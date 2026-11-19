// Cached, parallel rendering. A creature is re-rendered only when one of its inputs changed:
// shared pipeline code, its own c/<id>* files and helpers, its scene and its rarity frame.
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { bodySources } from '../bodies/sources';
import type { CreatureCard } from './card';
import { cpus } from 'node:os';
import { join, relative } from 'node:path';

const tools = join(import.meta.dirname, '..');
const assets = join(tools, '../../assets/creatures');
const sharedSkip = new Set(['test', 'studio', 'review', 'node_modules', 'c', 'scenes', 'frames', '.studio', 'golden', 'viewer']);

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const f = join(dir, name);
    if (statSync(f).isDirectory()) {
      if (!sharedSkip.has(name) || dir !== tools) walk(f, out);
    } else if (/\.(ts|json)$/.test(name) && name !== 'package-lock.json') out.push(f);
  }
  return out;
}

/** Creature ids: c/<id>.ts without a hyphen that names its own id (helpers like engraving.ts do not). */
export function creatureIds() {
  return readdirSync(join(tools, 'c'))
    .filter((f) => /^[a-z][a-z0-9_]*\.ts$/.test(f))
    .map((f) => f.slice(0, -3))
    .filter((id) => readFileSync(join(tools, 'c', id + '.ts'), 'utf8').includes("'" + id + "'"));
}

// A glade, lagoon or station imports its parent landscape and may share drawing helpers.
function sceneInputs(theme: string) {
  const dir = join(tools, 'scenes');
  const files = new Set([join(dir, theme + '.ts')]);
  for (const file of files) {
    if (!existsSync(file)) continue;
    for (const match of readFileSync(file, 'utf8').matchAll(/\bfrom\s*['"]\.\/([\w-]+)(?:\.ts)?['"]/g))
      files.add(join(dir, match[1] + '.ts'));
  }
  return files;
}

export function inputsOf(id: string, theme: string, rarity: string) {
  const cardFile = join(tools, 'c', id + '.card.json');
  const card = existsSync(cardFile) ? JSON.parse(readFileSync(cardFile, 'utf8')) as CreatureCard : undefined;
  const parent = card && bodySources[card.body];
  const others = creatureIds().filter((x) => x !== id && x !== parent);
  const own = readdirSync(join(tools, 'c'))
    .filter((f) => !others.some((o) => f === o + '.ts' || f.startsWith(o + '-') || f.startsWith(o + '.')))
    .map((f) => join(tools, 'c', f));
  const files = [
    ...walk(tools),
    ...own,
    join(tools, 'viewer/behavior.mjs'),
    join(tools, 'viewer/scenery.mjs'),
    join(assets, id, 'behavior.json'),
    ...sceneInputs(theme),
    join(tools, 'frames', rarity + '.ts'),
    join(tools, 'frame-kit.ts'),
  ].filter((f) => existsSync(f));
  return [...new Set(files)].sort();
}

export function inputHash(files: string[]) {
  const h = createHash('sha256');
  for (const f of files) {
    h.update(relative(tools, f));
    h.update(readFileSync(f));
  }
  return h.digest('hex').slice(0, 16);
}

function run(args: string[]) {
  return new Promise<number>((done) => {
    const p = spawn(process.execPath, ['--import', 'tsx', ...args], { cwd: tools, stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => {
      if (code) process.stderr.write(err.slice(-2000));
      done(code ?? 1);
    });
  });
}

export async function renderCommand(args: string[]) {
  const force = args.includes('--force');
  const jobsArg = args.indexOf('--jobs');
  const jobs = jobsArg >= 0 ? Number(args[jobsArg + 1]) : Math.max(1, cpus().length);
  const named = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--jobs');
  const list = !named.length || named[0] === 'all' ? creatureIds() : named.flatMap((a) => a.split(','));
  const { loadPainting } = await import('../render');
  const todo: { id: string; hash: string }[] = [];
  for (const id of list) {
    const { c } = await loadPainting(id);
    const hash = inputHash(inputsOf(id, c.theme, c.rarity));
    const stamp = join(assets, id, '.ws-render.json');
    const old = existsSync(stamp) ? JSON.parse(readFileSync(stamp, 'utf8')).hash : null;
    if (!force && old === hash) console.log(`= ${id}: unchanged, skipped`);
    else todo.push({ id, hash });
  }
  const t0 = Date.now();
  let next = 0,
    failed = 0;
  async function worker() {
    while (next < todo.length) {
      const { id, hash } = todo[next++];
      const t = Date.now();
      const code = await run(['render.ts', '--id', id]);
      if (code) {
        failed++;
        console.log(`✗ ${id}: render failed`);
        continue;
      }
      mkdirSync(join(assets, id), { recursive: true });
      writeFileSync(join(assets, id, '.ws-render.json'), JSON.stringify({ hash, at: new Date().toISOString() }) + '\n');
      console.log(`✓ ${id}: ${((Date.now() - t) / 1000).toFixed(0)} s`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(jobs, todo.length) }, worker));
  if (todo.length) console.log(`rendered ${todo.length - failed}/${todo.length} in ${((Date.now() - t0) / 1000).toFixed(0)} s with ${jobs} jobs`);
  if (failed) process.exitCode = 1;
}
