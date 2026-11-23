// Cached, parallel rendering. A creature is re-rendered only when one of its inputs changed:
// shared pipeline code, its own c/<id>* files and helpers, its scene and its frame.
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { bodySources } from '../bodies/sources';
import type { CreatureCard } from './card';
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
    // checker settings (clipAllow, skip) do not change a single pixel: the gate key adds them itself
    .filter((f) => !f.endsWith('.studio.json'))
    .map((f) => join(tools, 'c', f));
  const files = [
    ...walk(tools),
    ...own,
    join(tools, 'viewer/behavior.mjs'),
    join(tools, 'viewer/scenery.mjs'),
    join(assets, id, 'behavior.json'),
    ...sceneInputs(theme),
    join(tools, 'frames', rarity + '.ts'),
    join(tools, 'frames', id + '.ts'),
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
  const opt = (k: string) => (args.indexOf(k) >= 0 ? args[args.indexOf(k) + 1] : undefined);
  const { defaultJobs, heavyLock } = await import('./lock');
  const jobs = Number(opt('--jobs') ?? defaultJobs());
  // --anim a,b renders only those clips of each named creature; a partial run never writes the stamp
  const only = opt('--anim')?.split(',');
  const named = args.filter((a, i) => !a.startsWith('--') && !['--jobs', '--anim'].includes(args[i - 1]));
  const list = !named.length || named[0] === 'all' ? creatureIds() : named.flatMap((a) => a.split(','));
  const { loadPainting } = await import('../render');
  type Todo = { id: string; hash: string; anims: string[]; left: number; failed: boolean; started: number; ready: boolean };
  const todo: Todo[] = [];
  const units: { t: Todo; anim: string; lead: boolean; frames: number }[] = [];
  for (const id of list) {
    const { c } = await loadPainting(id);
    const hash = inputHash(inputsOf(id, c.theme, c.rarity));
    const stamp = join(assets, id, '.ws-render.json');
    const old = existsSync(stamp) ? JSON.parse(readFileSync(stamp, 'utf8')).hash : null;
    if (!only && !force && old === hash) {
      console.log(`= ${id}: unchanged, skipped`);
      continue;
    }
    const anims = only ? only.filter((a) => c.animations[a]) : Object.keys(c.animations);
    if (only && anims.length < only.length) console.log(`  ${id}: no ${only.filter((a) => !c.animations[a]).join(', ')}`);
    if (!anims.length) continue;
    // idle writes the scene and the frame (materials) the other clips read; it goes first and alone for its creature
    // (without idle and without materials, the first named clip writes them and leads)
    const hasMaterials = existsSync(join(assets, id, 'bg', 'base.png'));
    const lead = anims.includes('idle') ? 'idle' : hasMaterials ? undefined : anims[0];
    const t: Todo = { id, hash, anims, left: anims.length, failed: false, started: 0, ready: !lead };
    todo.push(t);
    for (const anim of anims) units.push({ t, anim, lead: anim === lead, frames: Math.round(c.animations[anim].seconds * 24) });
  }
  // longest clips first (showreel, life, tricks), so the last minutes are not one long clip on one core
  units.sort((a, z) => Number(z.lead) - Number(a.lead) || z.frames - a.frames);
  const release = units.length ? await heavyLock('render ' + todo.map((t) => t.id).join(',')) : () => {};
  const t0 = Date.now();
  let failed = 0;
  const finish = (t: Todo) => {
    if (t.failed) {
      failed++;
      console.log(`✗ ${t.id}: render failed`);
      return;
    }
    if (!only) {
      mkdirSync(join(assets, t.id), { recursive: true });
      writeFileSync(join(assets, t.id, '.ws-render.json'), JSON.stringify({ hash: t.hash, at: new Date().toISOString() }) + '\n');
    }
    console.log(`✓ ${t.id}: ${t.anims.length} clips, ${((Date.now() - t.started) / 1000).toFixed(0)} s`);
  };
  const waiting: (() => void)[] = [];
  async function worker() {
    for (;;) {
      const i = units.findIndex((u) => u.lead || u.t.ready);
      if (i < 0) {
        if (!units.length) return;
        await new Promise<void>((r) => waiting.push(r)); // the rest of a creature waits for its lead clip
        continue;
      }
      const { t, anim, lead } = units.splice(i, 1)[0];
      t.started ||= Date.now();
      const code = t.failed ? 1 : await run(['render.ts', '--id', t.id, '--anim', anim]);
      if (code && !t.failed) {
        t.failed = true;
        console.log(`  ✗ ${t.id} ${anim}`);
      }
      if (lead) t.ready = true;
      if (--t.left === 0) finish(t);
      for (const w of waiting.splice(0)) w();
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(jobs, units.length)) }, worker));
  release();
  if (todo.length)
    console.log(`rendered ${todo.length - failed}/${todo.length} in ${((Date.now() - t0) / 1000).toFixed(0)} s with ${jobs} jobs, one process a clip`);
  if (failed) process.exitCode = 1;
}
