// Мастерская существ — one entry point for the fast loop. Run from tools/creatures:
//   npm run ws -- check <id|all> [anim...]       automatic critic: clips, pops, hidden contacts, weak impacts
//   npm run ws -- gate <id|all>                  check + detail bar + technique metrics, exit 1 on failure
//   npm run ws -- probe <id> <anim> <frame>      numbers for one frame (sockets, feet, bbox, clips) — no picture
//   npm run ws -- sheet <id> <anim> [--frames 0,12,19] [--against <git-ref>] [--out file.png]
//   npm run ws -- render [id...|all] [--jobs N] [--force]   cached, parallel render.ts
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

async function check(args: string[], strict: boolean) {
  const list = await ids(args[0]);
  const animFilter = args.slice(1).filter((a) => !a.startsWith('--'));
  let failed = 0;
  for (const id of list) {
    const p = await loadPainting(id);
    const anims = animFilter.length ? animFilter : defaultAnims(p.c);
    const t0 = Date.now();
    const found = checkCreature(p, anims, studioConfig(id));
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
  if (failed) process.exitCode = 1;
}

const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
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
  case 'sheet': {
    const { sheetCommand } = await import('./sheet');
    await sheetCommand(rest);
    break;
  }
  case 'render': {
    const { renderCommand } = await import('./cache');
    await renderCommand(rest);
    break;
  }
  default:
    console.log('usage: npm run ws -- check|gate|probe|sheet|render … (see studio/README.md)');
    process.exitCode = cmd ? 1 : 0;
}
