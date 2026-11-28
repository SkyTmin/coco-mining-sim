// ws baseline [id,…] [--force] — the reference cases and what each must keep [research 23.11, VIII.10 stage 0].
// Art acceptance (studio/acceptance.json: who accepted, when, basis) and the technical result (the last gate of the exact
// current input key) are kept side by side and never overwrite each other: an accepted painting can be red under a
// stricter checker, and a green gate is not acceptance. For each case the snapshot records the source revision (last
// commit of its own files), fingerprints of its inputs, of the shared renderer and of the checker, the golden digest,
// the gate counts and issue lines, and every check exception with its recorded reason (null = not recorded).
// Output: studio/baseline.json (committed: a later comparison knows exactly what it must preserve) and a short table.
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { loadPainting } from '../render';
import { inputHash, inputsOf } from './cache';

const tools = join(import.meta.dirname, '..');
const repo = join(tools, '../..');

interface Acceptance {
  owner: 'accepted' | 'pending' | 'unknown' | 'rejected';
  date?: string;
  basis: string;
  role?: string;
  remarks: string[];
  covers: string[];
  exceptions: Record<string, string | null>;
}

export function readAcceptance(): Record<string, Acceptance> {
  return JSON.parse(readFileSync(join(tools, 'studio', 'acceptance.json'), 'utf8')).creatures;
}

function digest(file: string) {
  return existsSync(file) ? createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 16) : null;
}

/** Every check exception of a creature as a stable rule string, the key used in acceptance.json. */
export function exceptionRules(id: string): string[] {
  const file = join(tools, 'c', id + '.studio.json');
  if (!existsSync(file)) return [];
  const cfg = JSON.parse(readFileSync(file, 'utf8'));
  const out: string[] = [];
  for (const [rule, entries] of Object.entries((cfg.skip ?? {}) as Record<string, string[]>)) {
    if (rule === 'clip') for (const e of entries) out.push(`skip clip ${e}`);
    else out.push(`skip ${rule} ${entries.join(',')}`);
  }
  if (Array.isArray(cfg.clipAllow) && cfg.clipAllow.length) out.push('clipAllow');
  return out;
}

export function checkerFingerprint() {
  const studio = readdirSync(join(tools, 'studio')).filter((f) => f.endsWith('.ts')).map((f) => join(tools, 'studio', f));
  return inputHash([...studio, join(tools, 'detail.ts'), join(tools, 'tech-metrics.ts')].sort());
}

export async function baselineCommand(args: string[], gateKey: (id: string) => Promise<string>) {
  const acceptance = readAcceptance();
  const named = args.filter((a) => !a.startsWith('--'));
  const list = named.length ? named.flatMap((a) => a.split(',')) : Object.keys(acceptance);
  const force = args.includes('--force');
  const stampOf = (id: string) => join(tools, '.studio', `gate-${id}.json`);
  const keys = Object.fromEntries(await Promise.all(list.map(async (id) => [id, await gateKey(id)] as const)));
  // a gate result is reused only for the identical input key and only when it carries its counts
  const stale = list.filter((id) => {
    if (force || !existsSync(stampOf(id))) return true;
    const s = JSON.parse(readFileSync(stampOf(id), 'utf8'));
    return s.key !== keys[id] || s.errors === undefined;
  });
  if (stale.length) {
    console.log(`gate for ${stale.join(', ')} (results of the current inputs are missing or stale)…`);
    const r = spawnSync(process.execPath, ['--import', 'tsx', 'studio/ws.ts', 'gate', stale.join(','), '--force'], {
      cwd: tools,
      encoding: 'utf8',
      maxBuffer: 64 * 2 ** 20,
    });
    const last = (r.stdout ?? '').trim().split('\n').pop();
    if (last) console.log('  ' + last);
  }
  const checker = checkerFingerprint();
  const creatures: Record<string, unknown> = {};
  const rows: string[] = [];
  for (const id of list) {
    const { c } = await loadPainting(id);
    const inputs = inputsOf(id, c.theme, c.rarity);
    const shared = inputs.filter((f) => !/[\\/](c|scenes|frames)[\\/]/.test(relative(tools, f)) && !f.includes('assets'));
    let revision = '';
    try {
      revision = execFileSync('git', ['log', '-1', '--format=%h %cs', '--', `tools/creatures/c/${id}*`], { cwd: repo, encoding: 'utf8' }).trim();
    } catch {
      revision = 'unknown';
    }
    const stamp = existsSync(stampOf(id)) ? JSON.parse(readFileSync(stampOf(id), 'utf8')) : null;
    const gate = stamp && stamp.key === keys[id] ? stamp : null;
    const acc = acceptance[id];
    const exceptions = exceptionRules(id).map((rule) => ({ rule, reason: acc?.exceptions?.[rule] ?? null }));
    creatures[id] = {
      acceptance: acc ? { owner: acc.owner, date: acc.date, basis: acc.basis, remarks: acc.remarks } : { owner: 'unknown', basis: 'not in studio/acceptance.json' },
      covers: acc?.covers ?? [],
      source: { revision, fingerprint: inputHash(inputs) },
      renderer: inputHash(shared),
      checker,
      golden: digest(join(tools, 'golden', id + '.json')),
      gate: gate
        ? { key: gate.key, ok: gate.ok, at: gate.at, errors: gate.errors, warnings: gate.warnings, issues: gate.issues.slice(0, 12), more: gate.more + Math.max(0, gate.issues.length - 12) }
        : { ok: null, note: 'no gate result for the current inputs' },
      exceptions,
    };
    const unexplained = exceptions.filter((e) => !e.reason).length;
    rows.push(
      `${id.padEnd(14)} ${(acc?.owner ?? 'unknown').padEnd(9)} gate ${gate ? (gate.ok ? 'green' : 'red  ') : '—    '} ` +
        `${gate ? `${String(gate.errors).padStart(2)} !, ${String(gate.warnings).padStart(2)} ·` : '       '}  ` +
        `exceptions ${exceptions.length}${unexplained ? ` (${unexplained} without a recorded reason)` : ''}  src ${revision}`,
    );
  }
  const out = join(tools, 'studio', 'baseline.json');
  const old = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')).creatures : {};
  writeFileSync(out, JSON.stringify({ _doc: 'ws baseline: acceptance facts next to the last gate of the exact inputs (studio/baseline.ts)', at: new Date().toISOString().slice(0, 16), creatures: { ...old, ...creatures } }, null, 1) + '\n');
  console.log(rows.join('\n'));
  console.log(`→ ${relative(tools, out)}`);
}
