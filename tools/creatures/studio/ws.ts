// Мастерская существ — one entry point for the fast loop. Run from tools/creatures:
//   npm run ws -- check <id|all> [anim...]       automatic critic: clips, pops, hidden contacts, weak impacts
//   npm run ws -- gate <id|all>                  check + detail bar + technique metrics, exit 1 on failure
//   npm run ws -- probe <id> <anim> <frame>      numbers for one frame (sockets, feet, bbox, clips) — no picture
//   npm run ws -- sheet <id> <anim> [--frames 0,12,19] [--against <git-ref>] [--out file.png]
//   npm run ws -- ref <id> <anim> [sheet.png --grid CxR --frames a,b] [--out file.png]
//   npm run ws -- render [id...|all] [--jobs N] [--force]   cached, parallel render.ts
//   npm run ws -- snap <id|all> [anim...] [--check] [--force] golden frame hashes: write, or list changed frames;
//                                                --check skips a creature whose inputs did not change since its last identical check
//   npm run ws -- clip <id> <anim|all> [a-b] [--tag part] [-v]  limb-in-body on every frame of a clip, clearance of a part
//   npm run ws -- seam <id> [anim...]            pet endpoints vs idle / idle-f2 / sleep in seconds, with the parts that drifted
//   npm run ws -- review <id> <anim> [--frames a,b] [--out f.png]  per-clip loop in one pass: check + sheet + seams
//   npm run ws -- detail <id>                    detail bar of the rest frame (colours, edge, flat, size) — run before the clips
//   npm run ws -- context <id> <anim>            context pack of one clip: events, contacts, source lines, acceptance, last review
//   npm run ws -- help [topic]                   one section of studio/README.md (no topic: the sections and their sizes)
//   npm run ws -- baseline [id,…] [--force]      reference cases: acceptance facts next to the last gate of the exact inputs
// check/gate/snap on several creatures run in parallel child processes (--jobs N, default = cores, at most one per 4.5 GB);
// heavy runs (render, snap, check/gate of several) wait for each other instead of running out of memory together;
// gate remembers a green result per creature and skips it while none of its inputs changed (--force re-runs).
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadPainting } from '../render';
import { checkCreature, defaultAnims, studioConfig } from './checks';
import { defaultJobs, heavyLock } from './lock';

export const pilotIds = [
  'bramble_warden',
  'gem_beetle',
  'silk_dragon',
  'frost_yeti',
  'toad_shaman',
  'crater_titan',
  'coin_dragon',
];

async function ids(arg: string | undefined) {
  if (!arg || arg === 'all') {
    const { creatureIds } = await import('./cache');
    return creatureIds();
  }
  return arg.split(',');
}

function jobsOf(args: string[]) {
  const i = args.indexOf('--jobs');
  return i >= 0 ? Number(args[i + 1]) : defaultJobs();
}

const tools = join(import.meta.dirname, '..');
const studioDir = join(tools, '.studio');
/** Everything a gate result depends on: render inputs, the studio code, the creature's rules, the references. */
async function gateKey(id: string) {
  const { inputsOf, inputHash } = await import('./cache');
  const { c } = await loadPainting(id);
  const { poseRefInputs } = await import('./ref');
  const studio = ['ref', 'capture', 'checks', 'clip', 'contact-audit', 'gate', 'pet-gate', 'visibility', 'ws'].map((f) => join(tools, 'studio', f + '.ts'));
  const extra = [join(tools, '../../assets/creatures', id, 'meta.json'), join(tools, 'studio', 'card.ts'), join(tools, 'studio', 'card.schema.json'), join(tools, 'c', id + '.studio.json'), join(tools, '../../docs/reports/creatures/pilot-3/reference/tech-metrics.json')];
  return inputHash([...new Set([...inputsOf(id, c.theme, c.rarity), ...studio, ...poseRefInputs(id), ...extra.filter((f) => existsSync(f))])]);
}

async function check(args: string[], strict: boolean) {
  let list = await ids(args[0]);
  const animFilter = args.slice(1).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--jobs');
  const jobs = jobsOf(args);
  if (list.length > 1 && jobs > 1) {
    const { pool } = await import('./snap');
    const release = await heavyLock((strict ? 'gate ' : 'check ') + list.length + ' creatures');
    const t0 = Date.now();
    const rest = args.slice(1).filter((a, i, all) => a !== '--jobs' && all[i - 1] !== '--jobs');
    const bad = await pool(strict ? 'gate' : 'check', list, rest, jobs);
    release();
    console.log(`${strict ? 'gate' : 'check'}: ${list.length - bad}/${list.length} green in ${((Date.now() - t0) / 1000).toFixed(0)} s with ${Math.min(jobs, list.length)} jobs`);
    if (bad) process.exitCode = 1;
    return;
  }
  if (strict) {
    const { checkCardFile } = await import('./card');
    list = list.filter(id => {
      const errors = checkCardFile(id);
      if (!errors.length) return true;
      console.log('✗ ' + id + ' card: ' + errors.join('; '));
      process.exitCode = 1;
      return false;
    });
    if (!list.length) return;
  }
  // A green gate is remembered: an unchanged creature is not checked again (the slowest step of a batch).
  const cacheable = strict && list.length === 1 && !animFilter.length && !args.includes('--force');
  const key = strict && list.length === 1 && !animFilter.length ? await gateKey(list[0]) : '';
  const stamp = join(studioDir, 'gate-' + list[0] + '.json');
  if (cacheable && existsSync(stamp)) {
    const old = JSON.parse(readFileSync(stamp, 'utf8'));
    if (old.key === key && old.ok) {
      console.log(`= ${list[0]}: unchanged since the green gate of ${old.at}, skipped (--force re-runs)`);
      return;
    }
  }
  let failed = 0;
  // the gate keeps its own short result (C07): the stamp holds counts and the issue lines, so a baseline or a review can
  // read the last honest result of this exact input key instead of re-running or re-reading the console
  const lines: string[] = [];
  const log = console.log;
  if (key) console.log = (...a: unknown[]) => (lines.push(a.map(String).join(' ')), log(...a));
  for (const id of list) {
    const p = await loadPainting(id);
    const anims = animFilter.length ? animFilter : defaultAnims(p.c);
    const t0 = Date.now();
    const found = checkCreature(p, anims, studioConfig(id), !animFilter.length || animFilter.some((a) => a.startsWith('walk')));
    const sec = ((Date.now() - t0) / 1000).toFixed(1);
    const errors = found.filter((f) => f.level === 'error'),
      warns = found.length - errors.length;
    if (!errors.length) console.log(`✓ ${id}: ${anims.length} animations, no errors, ${warns} warnings (${sec} s)`);
    else {
      failed++;
      console.log(`✗ ${id}: ${errors.length} errors, ${warns} warnings in ${anims.length} animations (${sec} s)`);
    }
    const quiet = args.includes('--errors');
    for (const f of found)
      if (f.level === 'error' || !quiet)
        console.log(`  ${f.level === 'error' ? '!' : '·'} ${f.anim.padEnd(14)} ${f.kind.padEnd(14)} ${f.note}`);
  }
  if (strict) {
    const { gateExtras } = await import('./gate');
    failed += await gateExtras(list);
  }
  if (key) {
    console.log = log;
    const issues = lines.filter((l) => l.startsWith('✗') || l.startsWith('  !'));
    const summary = {
      errors: lines.filter((l) => l.startsWith('  !')).length,
      warnings: lines.filter((l) => l.startsWith('  ·')).length,
      issues: issues.slice(0, 60),
      more: Math.max(0, issues.length - 60),
    };
    mkdirSync(studioDir, { recursive: true });
    writeFileSync(stamp, JSON.stringify({ key, ok: !failed, at: new Date().toISOString().slice(0, 16), ...summary }) + '\n');
  }
  if (failed) process.exitCode = 1;
}

const [cmd, ...rest] = process.argv.slice(2);
// timing log: one line per command in .studio/ws-log.jsonl (gitignored) — what the loop really costs, measured, not guessed.
// maxRssMB is this process only; render/snap/check of several creatures add their children on top.
const startedAt = Date.now();
// what the command handed back to the model (C01: the cost of talking to the tool, measured separately from the CPU)
let outBytes = 0;
const write = process.stdout.write.bind(process.stdout);
process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
  outBytes += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;
  return (write as (...a: unknown[]) => boolean)(chunk, ...rest);
}) as typeof process.stdout.write;
process.on('exit', (code) => {
  if (!cmd) return;
  try {
    mkdirSync(studioDir, { recursive: true });
    const line = { at: new Date(startedAt).toISOString().slice(0, 19), cmd, args: rest, sec: +((Date.now() - startedAt) / 1000).toFixed(1), maxRssMB: Math.round(process.resourceUsage().maxRSS / 1024), outBytes, code };
    appendFileSync(join(studioDir, 'ws-log.jsonl'), JSON.stringify(line) + '\n');
  } catch {
    // the log is a convenience; a read-only checkout must not fail the command
  }
});
switch (cmd) {
  case 'profile': {
    const { profileCommand } = await import('./profile');
    await profileCommand(rest);
    break;
  }
  case 'events': {
    const { eventsCommand } = await import('./events');
    await eventsCommand(rest);
    break;
  }
  case 'context': {
    const { contextCommand } = await import('./context');
    await contextCommand(rest);
    break;
  }
  case 'help': {
    const { helpCommand } = await import('./help');
    helpCommand(rest);
    break;
  }
  case 'baseline': {
    const { baselineCommand } = await import('./baseline');
    await baselineCommand(rest, gateKey);
    break;
  }
  case 'review': {
    const { reviewCommand } = await import('./review');
    await reviewCommand(rest);
    break;
  }
  case 'detail': {
    const { detailBar } = await import('./gate');
    for (const id of await ids(rest[0])) {
      const { line, issues } = detailBar(await loadPainting(id));
      console.log(line);
      if (issues.length) process.exitCode = 1;
    }
    break;
  }
  case 'export-ref': {
    const { exportRefCommand } = await import('./art-sheet');
    await exportRefCommand(rest);
    break;
  }
  case 'label': {
    const { labelCommand } = await import('./art-sheet');
    labelCommand(rest);
    break;
  }
  case 'sheet-lint': {
    const { lintCommand } = await import('./sheet-lint');
    lintCommand(rest);
    break;
  }
  case 'new': {
    const { newCommand } = await import('./new');
    await newCommand(rest);
    break;
  }
  case 'check':
    await check(rest, false);
    break;
  case 'gate':
    await check(rest, true);
    break;
  case 'probe': {
    const { probe } = await import('./probe');
    await probe(rest[0], rest[1], Number(rest[2] ?? 0));
    break;
  }
  case 'ref': {
    const { refCommand } = await import('./ref');
    await refCommand(rest);
    break;
  }
  case 'sheet': {
    const { sheetCommand } = await import('./sheet');
    await sheetCommand(rest);
    break;
  }
  case 'snap': {
    const { snapCommand } = await import('./snap');
    await snapCommand(rest, await ids(rest[0]));
    break;
  }
  case 'clip': {
    const { clipCommand } = await import('./clipscan');
    await clipCommand(rest);
    break;
  }
  case 'seam': {
    const { seamCommand } = await import('./seam');
    await seamCommand(rest);
    break;
  }
  case 'render': {
    const { renderCommand } = await import('./cache');
    await renderCommand(rest);
    break;
  }
  default:
    console.log('usage: npm run ws -- new|check|gate|review|context|help|detail|baseline|probe|seam|clip|sheet|ref|export-ref|sheet-lint|label|render|snap … (see studio/README.md)');
    process.exitCode = cmd ? 1 : 0;
}
