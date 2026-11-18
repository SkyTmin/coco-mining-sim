// Мастерская существ — one entry point for the fast loop. Run from tools/creatures:
//   npm run ws -- check <id|all> [anim...]       automatic critic: clips, pops, hidden contacts, weak impacts
//   npm run ws -- gate <id|all>                  check + detail bar + technique metrics, exit 1 on failure
//   npm run ws -- probe <id> <anim> <frame>      numbers for one frame (sockets, feet, bbox, clips) — no picture
//   npm run ws -- sheet <id> <anim> [--frames 0,12,19] [--against <git-ref>] [--out file.png]
//   npm run ws -- ref <id> <anim> [sheet.png --grid CxR --frames a,b] [--out file.png]
//   npm run ws -- render [id...|all] [--jobs N] [--force]   cached, parallel render.ts
//   npm run ws -- snap <id|all> [anim...] [--check]          golden frame hashes: write, or list changed frames
// check/gate/snap on several creatures run in parallel child processes (--jobs N, default = cores);
// gate remembers a green result per creature and skips it while none of its inputs changed (--force re-runs).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';
import { loadPainting } from '../render';
import { checkCreature, defaultAnims, studioConfig } from './checks';

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
  return i >= 0 ? Number(args[i + 1]) : Math.max(1, cpus().length);
}

const tools = join(import.meta.dirname, '..');
const studioDir = join(tools, '.studio');
/** Everything a gate result depends on: render inputs, the studio code, the creature's rules, the references. */
async function gateKey(id: string) {
  const { inputsOf, inputHash } = await import('./cache');
  const { c } = await loadPainting(id);
  const { poseRefInputs } = await import('./ref');
  const studio = ['ref', 'capture', 'checks', 'clip', 'contact-audit', 'gate', 'visibility', 'ws'].map((f) => join(tools, 'studio', f + '.ts'));
  const extra = [join(tools, 'studio', 'card.ts'), join(tools, 'studio', 'card.schema.json'), join(tools, 'c', id + '.studio.json'), join(tools, '../../docs/reports/creatures/pilot-3/reference/tech-metrics.json')];
  return inputHash([...new Set([...inputsOf(id, c.theme, c.rarity), ...studio, ...poseRefInputs(id), ...extra.filter((f) => existsSync(f))])]);
}

async function check(args: string[], strict: boolean) {
  let list = await ids(args[0]);
  const animFilter = args.slice(1).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--jobs');
  const jobs = jobsOf(args);
  if (list.length > 1 && jobs > 1) {
    const { pool } = await import('./snap');
    const t0 = Date.now();
    const rest = args.slice(1).filter((a, i, all) => a !== '--jobs' && all[i - 1] !== '--jobs');
    const bad = await pool(strict ? 'gate' : 'check', list, rest, jobs);
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
    mkdirSync(studioDir, { recursive: true });
    writeFileSync(stamp, JSON.stringify({ key, ok: !failed, at: new Date().toISOString().slice(0, 16) }) + '\n');
  }
  if (failed) process.exitCode = 1;
}

const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
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
  case 'render': {
    const { renderCommand } = await import('./cache');
    await renderCommand(rest);
    break;
  }
  default:
    console.log('usage: npm run ws -- new|check|gate|probe|sheet|ref|render|snap … (see studio/README.md)');
    process.exitCode = cmd ? 1 : 0;
}
