// Golden frames: one short hash per frame of every animation, kept in git (tools/creatures/golden/<id>.json).
// `snap --check` re-renders in memory and lists exactly which frames changed — the proof for a refactor
// ("the library draws bramble_warden pixel for pixel like the pilot") in one command, without old checkouts.
//   npm run ws -- snap <id|all> [anim…] [--jobs N]          write the golden hashes
//   npm run ws -- snap <id|all> [anim…] --check [--jobs N]  compare, exit 1 when a frame changed
// One creature is hashed by --jobs worker processes (default: one per core, at most one per 3 GB), each taking frame
// ranges in turn; several creatures run one process each. Every worker keeps at most SNAP_CACHE_MB (default 512) of
// reused poses [22.11: a count limit of 2000 poses grew to 9.7 GB on Zenit's 288-px canvas and was killed].
import { createHash } from 'node:crypto';
import { fork, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { join } from 'node:path';
import { loadPainting } from '../render';
import { compose, frameCount } from '../engine';
import { lifeCycleCount } from '../motion';
import type { BodyFrame, Creature } from '../types';

const tools = join(import.meta.dirname, '..');
const goldenDir = join(tools, 'golden');
type Golden = Record<string, string[]>;

const cacheBytes = (Number(process.env.SNAP_CACHE_MB) || 512) * 2 ** 20;
const rasterBytes = (f: BodyFrame) => f.px.data.byteLength + (f.lit?.data.byteLength ?? 0) + (f.over?.data.byteLength ?? 0);

function reuseTrickPoses(c: Creature): Creature {
  if (!c.behavior?.tricks) return c;
  const poses = new Map<string, BodyFrame>();
  let bytes = 0;
  return {
    ...c,
    frame(anim, time, side, variant, motion) {
      if (motion?.techniquePose) return c.frame(anim, time, side, variant, motion);
      const key = [anim, time, side, variant, motion?.headSide, motion?.gaitPhase].join('/');
      const existing = poses.get(key);
      if (existing) {
        poses.delete(key); // least recently used goes first
        poses.set(key, existing);
        return existing;
      }
      // Life and showreel reuse local poses at different positions and on different
      // scenery frames. Keep their rasters, but release the geometry diagnostics.
      const { rig, joints, ...raster } = c.frame(anim, time, side, variant, motion);
      poses.set(key, raster);
      bytes += rasterBytes(raster);
      while (bytes > cacheBytes && poses.size > 1) {
        const [oldest, frame] = poses.entries().next().value!;
        poses.delete(oldest);
        bytes -= rasterBytes(frame);
      }
      return raster;
    },
  };
}

function ranges(frames: number[]) {
  const out: string[] = [];
  for (let i = 0; i < frames.length; i++) {
    let j = i;
    while (j + 1 < frames.length && frames[j + 1] === frames[j] + 1) j++;
    out.push(i === j ? String(frames[i]) : frames[i] + '–' + frames[j]);
    i = j;
  }
  return out.join(', ');
}

/** The painting as snap hashes it: poses reused through the memory-capped cache. */
export async function loadForHash(id: string) {
  const { c, s, b } = await loadPainting(id);
  return { c: reuseTrickPoses(c), s, b };
}
type ForHash = Awaited<ReturnType<typeof loadForHash>>;

const framesOf = (c: Creature, anim: string) => frameCount(c.animations[anim].seconds) * (anim === 'life' ? lifeCycleCount(c) : 1);

/** Hashes of frames [from, to) of one animation. */
export function hashRange({ c, s, b }: ForHash, anim: string, from: number, to: number) {
  const list: string[] = [];
  for (let i = from; i < to; i++) {
    const f = compose(c, s, b, anim, i / 24);
    list.push(createHash('sha1').update(f.picture.data).digest('hex').slice(0, 10));
  }
  return list;
}

/** Worker processes for one creature: one per core, but no more than one per 3 GB of memory. */
export function snapJobs() {
  return Math.max(1, Math.min(cpus().length, Math.floor(totalmem() / (3 * 2 ** 30))));
}

/** Hashes frame ranges in `jobs` worker processes; each takes the next range when it is free. */
async function hashParallel(id: string, chunks: { anim: string; from: number; to: number }[], jobs: number) {
  const results: string[][] = new Array(chunks.length);
  let next = 0;
  async function worker() {
    const child = fork(join(import.meta.dirname, 'snap-worker.ts'), [], {
      cwd: tools,
      execArgv: ['--import', 'tsx'],
      env: { ...process.env, WS_CHILD: '1' },
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    });
    const ask = (msg: object) =>
      new Promise<{ hashes?: string[]; error?: string }>((done, fail) => {
        const onExit = (code: number | null) => fail(new Error(`snap worker for ${id} exited with code ${code}`));
        child.once('exit', onExit);
        child.once('message', (reply: { hashes?: string[]; error?: string }) => {
          child.off('exit', onExit);
          done(reply);
        });
        child.send(msg);
      });
    try {
      const ready = await ask({ id });
      if (ready.error) throw new Error(ready.error);
      while (next < chunks.length) {
        const k = next++;
        const reply = await ask(chunks[k]);
        if (reply.error || !reply.hashes) throw new Error(reply.error ?? 'snap worker sent no hashes');
        results[k] = reply.hashes;
      }
    } finally {
      child.kill();
    }
  }
  await Promise.all(Array.from({ length: Math.min(jobs, chunks.length) }, worker));
  return results;
}

/** Hashes of the final picture of every frame (life and showreel included: they are what the owner sees). */
export async function hashCreature(id: string, only: string[] = [], jobs = 1): Promise<Golden> {
  const painting = await loadForHash(id);
  const anims = Object.keys(painting.c.animations).filter((anim) => !only.length || only.includes(anim));
  const out: Golden = {};
  if (jobs <= 1) {
    for (const anim of anims) out[anim] = hashRange(painting, anim, 0, framesOf(painting.c, anim));
    return out;
  }
  // Ranges long enough to keep a worker's pose cache useful, short enough to share the long clips (life, showreel).
  const total = anims.reduce((sum, anim) => sum + framesOf(painting.c, anim), 0);
  const size = Math.max(48, Math.ceil(total / (jobs * 6)));
  const chunks: { anim: string; from: number; to: number }[] = [];
  for (const anim of anims)
    for (let from = 0, n = framesOf(painting.c, anim); from < n; from += size) chunks.push({ anim, from, to: Math.min(n, from + size) });
  const results = await hashParallel(id, chunks, jobs);
  for (const anim of anims) out[anim] = [];
  chunks.forEach((chunk, k) => out[chunk.anim].push(...results[k]));
  return out;
}

/** Differences as report lines; empty when identical. */
export function compareGolden(old: Golden, now: Golden, only: string[] = []) {
  const lines: string[] = [];
  const names = new Set([...Object.keys(old), ...Object.keys(now)]);
  for (const anim of names) {
    if (only.length && !only.includes(anim)) continue;
    const a = old[anim],
      z = now[anim];
    if (!a) lines.push(`${anim}: new animation (${z.length} frames)`);
    else if (!z) lines.push(`${anim}: animation removed`);
    else {
      const changed: number[] = [];
      for (let i = 0; i < Math.max(a.length, z.length); i++) if (a[i] !== z[i]) changed.push(i);
      if (a.length !== z.length) lines.push(`${anim}: ${a.length} → ${z.length} frames; changed ${ranges(changed)}`);
      else if (changed.length) lines.push(`${anim}: ${changed.length}/${z.length} frames changed: ${ranges(changed)}`);
    }
  }
  return lines;
}

/** One creature in this process: used by the child workers and by tests. */
/** Render inputs of a creature plus its golden file and this hasher: a check stays valid while none of them change. */
async function snapKey(id: string) {
  const { inputsOf, inputHash } = await import('./cache');
  const { c } = await loadPainting(id);
  return inputHash([...inputsOf(id, c.theme, c.rarity), join(goldenDir, id + '.json'), join(tools, 'studio', 'snap.ts')].filter((f) => existsSync(f)));
}
const stampOf = (id: string) => join(tools, '.studio', 'snap-' + id + '.json');
function remember(id: string, key: string) {
  mkdirSync(join(tools, '.studio'), { recursive: true });
  writeFileSync(stampOf(id), JSON.stringify({ key, at: new Date().toISOString().slice(0, 16) }) + '\n');
}

export async function snapOne(id: string, check: boolean, only: string[], force = false, jobs = 1) {
  // A full check of an unchanged creature is skipped: its own files, the shared pipeline and its golden are the same
  // as at the last identical check. A shared change re-checks everyone; --force re-checks anyway.
  if (check && !only.length && !force && existsSync(stampOf(id))) {
    const old = JSON.parse(readFileSync(stampOf(id), 'utf8'));
    if (old.key === (await snapKey(id))) {
      console.log(`= ${id}: inputs unchanged since the identical check of ${old.at}, skipped (--force re-checks)`);
      return 0;
    }
  }
  const t0 = Date.now();
  const now = await hashCreature(id, only, jobs);
  const file = join(goldenDir, id + '.json');
  const sec = ((Date.now() - t0) / 1000).toFixed(0);
  const frames = Object.values(now).reduce((a, l) => a + l.length, 0);
  if (!check) {
    const old: Golden = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
    mkdirSync(goldenDir, { recursive: true });
    const merged = only.length ? { ...old, ...now } : now;
    const body = '{\n' + Object.entries(merged).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n}\n';
    writeFileSync(file, body);
    if (!only.length) remember(id, await snapKey(id));
    console.log(`✓ ${id}: ${frames} frames written to golden/${id}.json (${sec} s${jobs > 1 ? `, ${jobs} jobs` : ''})`);
    return 0;
  }
  if (!existsSync(file)) {
    console.log(`✗ ${id}: no golden/${id}.json — run snap without --check first`);
    return 1;
  }
  const diff = compareGolden(JSON.parse(readFileSync(file, 'utf8')), now, only);
  if (!diff.length) {
    if (!only.length) remember(id, await snapKey(id));
    console.log(`✓ ${id}: ${frames} frames identical (${sec} s${jobs > 1 ? `, ${jobs} jobs` : ''})`);
  }
  else {
    console.log(`✗ ${id}: frames differ (${sec} s)`);
    for (const l of diff) console.log('  ' + l);
  }
  return diff.length ? 1 : 0;
}

function child(args: string[]) {
  return new Promise<{ code: number; out: string }>((done) => {
    const p = spawn(process.execPath, ['--import', 'tsx', 'studio/ws.ts', ...args], {
      cwd: tools,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, WS_CHILD: '1' },
    });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => done({ code: code ?? 1, out }));
  });
}

/** Runs `ws <cmd> <id> …rest` for every id in parallel child processes and prints each block when it ends. */
export async function pool(cmd: string, ids: string[], rest: string[], jobs: number) {
  let next = 0,
    failed = 0;
  async function worker() {
    while (next < ids.length) {
      const id = ids[next++];
      const r = await child([cmd, id, ...rest]);
      process.stdout.write(r.out.endsWith('\n') ? r.out : r.out + '\n');
      if (r.code) failed++;
    }
  }
  await Promise.all(Array.from({ length: Math.min(jobs, ids.length) }, worker));
  return failed;
}

export async function snapCommand(args: string[], ids: string[]) {
  const check = args.includes('--check');
  const force = args.includes('--force');
  const jobsArg = args.indexOf('--jobs');
  const { defaultJobs, heavyLock } = await import('./lock');
  const jobs = jobsArg >= 0 ? Number(args[jobsArg + 1]) : defaultJobs();
  const release = await heavyLock('snap ' + (ids.length === 1 ? ids[0] : ids.length + ' creatures'));
  const only = args.slice(1).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--jobs');
  const t0 = Date.now();
  let failed = 0;
  // A single creature splits its frames over worker processes; inside a pool child (WS_CHILD) it runs alone.
  if (ids.length === 1) failed = await snapOne(ids[0], check, only, force, process.env.WS_CHILD ? 1 : jobsArg >= 0 ? jobs : snapJobs());
  else {
    const rest = [...only, ...(check ? ['--check'] : []), ...(force ? ['--force'] : [])];
    failed = await pool('snap', ids, rest, jobs);
    console.log(`${ids.length - failed}/${ids.length} ${check ? 'identical' : 'written'} in ${((Date.now() - t0) / 1000).toFixed(0)} s with ${Math.min(jobs, ids.length)} jobs`);
  }
  release();
  if (failed) process.exitCode = 1;
}
