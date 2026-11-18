// Golden frames: one short hash per frame of every animation, kept in git (tools/creatures/golden/<id>.json).
// `snap --check` re-renders in memory and lists exactly which frames changed — the proof for a refactor
// ("the library draws bramble_warden pixel for pixel like the pilot") in one command, without old checkouts.
//   npm run ws -- snap <id|all> [anim…] [--jobs N]          write the golden hashes
//   npm run ws -- snap <id|all> [anim…] --check [--jobs N]  compare, exit 1 when a frame changed
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';
import { loadPainting } from '../render';
import { compose, frameCount } from '../engine';

const tools = join(import.meta.dirname, '..');
const goldenDir = join(tools, 'golden');
type Golden = Record<string, string[]>;

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

/** Hashes of the final picture of every frame (life and showreel included: they are what the owner sees). */
export async function hashCreature(id: string, only: string[] = []): Promise<Golden> {
  const { c, s, b } = await loadPainting(id);
  const out: Golden = {};
  for (const anim of Object.keys(c.animations)) {
    if (only.length && !only.includes(anim)) continue;
    const n = frameCount(c.animations[anim].seconds);
    const list: string[] = [];
    for (let i = 0; i < n; i++) {
      const f = compose(c, s, b, anim, i / 24);
      list.push(createHash('sha1').update(f.picture.data).digest('hex').slice(0, 10));
    }
    out[anim] = list;
  }
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
export async function snapOne(id: string, check: boolean, only: string[]) {
  const t0 = Date.now();
  const now = await hashCreature(id, only);
  const file = join(goldenDir, id + '.json');
  const sec = ((Date.now() - t0) / 1000).toFixed(0);
  const frames = Object.values(now).reduce((a, l) => a + l.length, 0);
  if (!check) {
    const old: Golden = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
    mkdirSync(goldenDir, { recursive: true });
    const merged = only.length ? { ...old, ...now } : now;
    const body = '{\n' + Object.entries(merged).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n}\n';
    writeFileSync(file, body);
    console.log(`✓ ${id}: ${frames} frames written to golden/${id}.json (${sec} s)`);
    return 0;
  }
  if (!existsSync(file)) {
    console.log(`✗ ${id}: no golden/${id}.json — run snap without --check first`);
    return 1;
  }
  const diff = compareGolden(JSON.parse(readFileSync(file, 'utf8')), now, only);
  if (!diff.length) console.log(`✓ ${id}: ${frames} frames identical (${sec} s)`);
  else {
    console.log(`✗ ${id}: frames differ (${sec} s)`);
    for (const l of diff) console.log('  ' + l);
  }
  return diff.length ? 1 : 0;
}

function child(args: string[]) {
  return new Promise<{ code: number; out: string }>((done) => {
    const p = spawn(process.execPath, ['--import', 'tsx', 'studio/ws.ts', ...args], { cwd: tools, stdio: ['ignore', 'pipe', 'pipe'] });
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
  const jobsArg = args.indexOf('--jobs');
  const jobs = jobsArg >= 0 ? Number(args[jobsArg + 1]) : Math.max(1, cpus().length);
  const only = args.slice(1).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--jobs');
  const t0 = Date.now();
  let failed = 0;
  if (ids.length === 1) failed = await snapOne(ids[0], check, only);
  else {
    const rest = [...only, ...(check ? ['--check'] : [])];
    failed = await pool('snap', ids, rest, jobs);
    console.log(`${ids.length - failed}/${ids.length} ${check ? 'identical' : 'written'} in ${((Date.now() - t0) / 1000).toFixed(0)} s with ${Math.min(jobs, ids.length)} jobs`);
  }
  if (failed) process.exitCode = 1;
}
