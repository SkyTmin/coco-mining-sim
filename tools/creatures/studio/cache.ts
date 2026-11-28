// Cached, parallel rendering. A creature is re-rendered only when one of its inputs changed:
// shared pipeline code, its own c/<id>* files and helpers, its scene and its frame.
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { bodySources } from '../bodies/sources';
import type { CreatureCard } from './card';
import { basename, join, relative, dirname, resolve } from 'node:path';

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
    if (!file.endsWith('.ts')) continue;
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\bfrom\s*['"]\.\/([\w-]+)(?:\.ts)?['"]/g))
      files.add(join(dir, match[1] + '.ts'));
    for (const match of source.matchAll(/new URL\(\s*['"]\.\/([\w-]+\.png)['"]\s*,\s*import\.meta\.url/g))
      files.add(join(dir, match[1]));
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
  // Experiments may reuse another painting's authored body, clocks and props.
  const creatureDir = join(tools, 'c');
  const authors = parent ? [id, parent] : [id];
  const imported = new Set(own.filter(file => {
    const name = basename(file);
    return authors.some(author => name.startsWith(author + '.') || name.startsWith(author + '-'));
  }));
  for (const file of imported) {
    if (!file.endsWith('.ts')) continue;
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\bfrom\s*['"](\.[^'"]+)['"]/g)) {
      const path = resolve(dirname(file), match[1]);
      const target = /\.(ts|json)$/.test(path) ? path : path + '.ts';
      if (dirname(target) !== creatureDir || !existsSync(target)) continue;
      imported.add(target);
      // A painting module loads its matching card at runtime, outside the import graph.
      if (target.endsWith('.ts')) {
        const sourceCard = target.slice(0, -3) + '.card.json';
        if (existsSync(sourceCard)) imported.add(sourceCard);
      }
    }
  }
  const files = [
    ...walk(tools),
    ...own,
    ...imported,
    join(tools, 'viewer/behavior.mjs'),
    join(tools, 'viewer/scenery.mjs'),
    join(tools, 'viewer/water.mjs'),
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

/** Hash of every input file, kept in the render stamp so a miss can say why [research 23.11, R07]. */
export function fileHashes(files: string[]): Record<string, string> {
  return Object.fromEntries(files.map((f) => [relative(tools, f), createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 12)]));
}
/** Why a stamp no longer matches: which inputs changed, appeared or disappeared. */
export function explainMiss(old: Record<string, string> | undefined, now: Record<string, string>): string {
  if (!old) return 'no earlier stamp with file hashes';
  const list = (xs: string[]) => xs.slice(0, 6).join(', ') + (xs.length > 6 ? ` … +${xs.length - 6}` : '');
  const changed = Object.keys(now).filter((k) => k in old && old[k] !== now[k]);
  const added = Object.keys(now).filter((k) => !(k in old));
  const removed = Object.keys(old).filter((k) => !(k in now));
  const parts = [changed.length && `changed ${list(changed)}`, added.length && `new ${list(added)}`, removed.length && `gone ${list(removed)}`].filter(Boolean);
  return parts.length ? parts.join('; ') : 'same files, different stamp format';
}
const gifOf = (id: string, suffix: string, root = assets) => join(root, id, 'gif', `painting-${suffix}.gif`);
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16);
/** What a finished render of a clip left on disk: the GIF's hash and the number of body frames. */
function outputOf(id: string, anim: string, root = assets) {
  const gif = gifOf(id, anim, root),
    body = join(root, id, 'frames', anim, 'body');
  return {
    gif: existsSync(gif) ? sha(gif) : null,
    frames: existsSync(body) ? readdirSync(body).filter((f) => /^\d{3,}\.png$/.test(f)).length : 0,
  };
}
/** Clips whose outputs are missing, cut short or changed since the stamp: the inputs are the same, the files are not. */
export function damagedClips(id: string, counts: Record<string, number>, stamped: Record<string, { gif: string | null; frames: number }> | undefined, root = assets) {
  return Object.keys(counts).filter((anim) => {
    const now = outputOf(id, anim, root),
      was = stamped?.[anim];
    return !now.gif || now.frames !== counts[anim] || (was && was.gif !== now.gif);
  });
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

/** Which clips' authored motion changed since the stamp (a hint printed on a miss, never a reason to skip a clip). */
async function clipsTouched(id: string, before?: Record<string, string>) {
  const { trackFingerprints } = await import('./events');
  const tracks = await trackFingerprints(id);
  if (!tracks) return undefined;
  if (!before) return { tracks, line: '' };
  const clips = Object.keys(tracks).filter((k) => k !== '_module');
  const moved = clips.filter((a) => before[a] !== tracks[a]);
  const line =
    before._module !== tracks._module
      ? 'poses module data changed (beats, lanes or helpers): every clip may move'
      : `authored motion changed in ${moved.length ? moved.join(', ') : 'no clip'}; the other ${clips.length - moved.length} clips keep their tracks (skin, effects and shared code still feed all of them)`;
  return { tracks, line };
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
  const { frameCount } = await import('../engine');
  type Todo = {
    id: string;
    hash: string;
    files: Record<string, string>;
    counts: Record<string, number>;
    tracks?: Record<string, string>;
    previous: { outputs?: Record<string, { gif: string | null; frames: number }> } | null;
    anims: string[];
    left: number;
    failed: boolean;
    started: number;
    ready: boolean;
  };
  const todo: Todo[] = [];
  const units: { t: Todo; anim: string; lead: boolean; frames: number }[] = [];
  for (const id of list) {
    const { c } = await loadPainting(id);
    const inputs = inputsOf(id, c.theme, c.rarity);
    const hash = inputHash(inputs);
    const files = fileHashes(inputs);
    const stamp = join(assets, id, '.ws-render.json');
    const previous = existsSync(stamp) ? JSON.parse(readFileSync(stamp, 'utf8')) : null;
    const counts = Object.fromEntries(Object.keys(c.animations).map((a) => [a, frameCount(c.animations[a].seconds)]));
    let anims = only ? only.filter((a) => c.animations[a]) : Object.keys(c.animations);
    if (!only && !force && previous?.hash === hash) {
      // same inputs: re-render only the clips whose files were deleted, cut short or changed on disk
      const damaged = damagedClips(id, counts, previous.outputs);
      if (!damaged.length) {
        console.log(`= ${id}: unchanged, skipped`);
        continue;
      }
      console.log(`  ${id}: inputs unchanged, outputs missing or changed for ${damaged.join(', ')} → only those`);
      anims = damaged;
    } else if (!only && !force) {
      console.log(`  ${id}: ${explainMiss(previous?.files, files)} → all ${anims.length} clips (which clips a file feeds is not tracked)`);
      const hint = await clipsTouched(id, previous?.tracks);
      if (hint?.line) console.log(`  ${id}: ${hint.line}`);
    }
    if (only && anims.length < only.length) console.log(`  ${id}: no ${only.filter((a) => !c.animations[a]).join(', ')}`);
    if (!anims.length) continue;
    // idle writes the scene and the frame (materials) the other clips read; it goes first and alone for its creature
    // (without idle and without materials, the first named clip writes them and leads)
    const hasMaterials = existsSync(join(assets, id, 'bg', 'base.png'));
    const lead = anims.includes('idle') ? 'idle' : hasMaterials ? undefined : anims[0];
    const t: Todo = { id, hash, files, counts, tracks: (await clipsTouched(id))?.tracks, previous, anims, left: anims.length, failed: false, started: 0, ready: !lead };
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
      // the stamp: inputs (hash and per file, to explain the next miss), what each clip left on disk, the clips' tracks
      const outputs = { ...(t.previous?.outputs ?? {}) };
      for (const anim of t.anims) outputs[anim] = outputOf(t.id, anim);
      mkdirSync(join(assets, t.id), { recursive: true });
      writeFileSync(join(assets, t.id, '.ws-render.json'), JSON.stringify({ hash: t.hash, at: new Date().toISOString(), files: t.files, tracks: t.tracks, outputs }) + '\n');
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
