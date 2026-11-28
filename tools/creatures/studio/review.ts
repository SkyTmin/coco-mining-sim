// ws review <id> <anim> [--goal overview|contact|timing|refactor|final] [--frames a,b,…] [--out file.png] [--fresh]
// The per-clip loop in one pass [research 23.11, VIII.10 stage 1, C02/C06–C09, R01/R04]. One walk over the clip composes
// every frame once and serves what used to be separate commands: the critic of `ws check <id> <anim>`, a sheet of the
// frames that matter, the seams with the rest pose and, for a refactor or the final pass, the frame hashes against
// golden/<id>.json. The goal decides the coverage and the size of the answer:
//   overview  critic + seams + sheet (flagged runs, contacts, keys, even in-betweens)
//   contact   critic + seams + sheet of the contacts and their neighbours
//   timing    critic + seams + hold + sheet of key poses and even spacing
//   refactor  critic + seams + golden (pixels must stay identical); a sheet only of frames that changed
//   final     critic + seams + hold + golden + detail bar + sheet
// The answer is short: coverage with an honest status per check (passed / failed / incomplete / n-a), issues with stable
// ids split into new / fixed / still there against the previous review of this clip, the clip's check exceptions with
// their recorded reasons, what the run computed (composes, history poses, rasters, rasters wasted in points-only builds),
// the sheet path. The whole result is kept in .studio/review/<id>-<anim>.json under a key of every input (creature
// inputs, checker code, goal, frames, golden): the same key is answered from that file without composing, and a red
// result stays red. Exit code 1 when any check failed.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { PNG } from 'pngjs';
import { loadPainting } from '../render';
import { playbackKeys } from '../technique';
import { compose, frameCount, hitFrame } from '../engine';
import { resetRigStats, rigStats } from '../rig/stats';
import { findings, sampleAnimation, studioConfig, type Finding } from './checks';
import { actionBox, layout, type COLORS, type Img, type Tile } from './sheet';
import { endpointSeams } from './pet-gate';
import { inputHash, inputsOf } from './cache';
import { checkerFingerprint, exceptionRules, readAcceptance } from './baseline';
import { clipReport, recordFx } from './events';

const tools = join(import.meta.dirname, '..');
const SHOWN = ['body', 'lit', 'fxu', 'fxo', 'light', 'over'];
const GOALS = ['overview', 'contact', 'timing', 'refactor', 'final'] as const;
type Goal = (typeof GOALS)[number];
/** Most flagged frames kept from the walk (pictures are ~0.6 MB a layer on a 384×312 field). */
const KEEP_FLAGGED = 40;
const CAP = 15;

type Status = 'passed' | 'failed' | 'incomplete' | 'n/a';
interface Coverage {
  check: string;
  status: Status;
  note?: string;
}
interface Issue {
  id: string;
  level: 'error' | 'warn';
  kind: string;
  frames: string;
  note: string;
}
interface ReviewState {
  key: string;
  goal: Goal;
  at: string;
  ok: boolean;
  coverage: Coverage[];
  issues: Issue[];
  lines: string[];
  sheet: string | null;
  stats: Record<string, number>;
}

type Kept = { picture: Img; layers: Record<string, Img> };
const copy = (p: Img): Img => ({ w: p.w, h: p.h, data: Uint8ClampedArray.from(p.data) as unknown as Img['data'] });
function keep(f: ReturnType<typeof compose>): Kept {
  const layers: Record<string, Img> = {};
  for (const name of SHOWN) {
    const l = (f.layers as unknown as Record<string, Img | undefined>)[name];
    if (l) layers[name] = copy(l);
  }
  return { picture: copy(f.picture as unknown as Img), layers };
}
const option = (args: string[], name: string) => (args.indexOf(name) < 0 ? undefined : args[args.indexOf(name) + 1]);
const ranges = (frames: number[]) => {
  const out: string[] = [];
  for (let i = 0; i < frames.length; i++) {
    let j = i;
    while (j + 1 < frames.length && frames[j + 1] === frames[j] + 1) j++;
    out.push(i === j ? String(frames[i]) : `${frames[i]}–${frames[j]}`);
    i = j;
  }
  return out.join(', ');
};
/** A stable id: the kind and what the note names, without frame numbers and magnitudes. */
const issueId = (f: Finding) =>
  `${f.kind}:${f.note.replace(/^[\d–,\s]+—\s*/, '').replace(/worst \d+:\s*/, '').replace(/[@×]?\d+(\.\d+)?%?/g, '#').replace(/\s+/g, ' ').trim()}`;

export async function reviewCommand(args: string[]) {
  const valued = ['--frames', '--out', '--goal'];
  const [id, anim] = args.filter((a, i) => !a.startsWith('--') && !valued.includes(args[i - 1]));
  const goal = (option(args, '--goal') ?? 'overview') as Goal;
  if (!id || !anim || !GOALS.includes(goal)) {
    console.log(`usage: npm run ws -- review <id> <anim> [--goal ${GOALS.join('|')}] [--frames a,b,c] [--out file.png] [--fresh]`);
    process.exitCode = 1;
    return;
  }
  const t0 = Date.now();
  const painting = await loadPainting(id);
  const { c, s, b } = painting;
  const spec = c.animations[anim];
  if (!spec) throw new Error(`${id} has no animation ${anim}`);
  const count = frameCount(spec.seconds);
  const cfg = studioConfig(id);
  const goldenFile = join(tools, 'golden', id + '.json');
  const wantsGolden = goal === 'refactor' || goal === 'final';
  const golden: string[] | undefined = wantsGolden && existsSync(goldenFile) ? JSON.parse(readFileSync(goldenFile, 'utf8'))[anim] : undefined;
  const framesArg = option(args, '--frames');
  const outArg = option(args, '--out');

  // ---- the key of every input: the same key is answered from the stored result
  const key = createHash('sha256')
    .update([inputHash(inputsOf(id, c.theme, c.rarity)), checkerFingerprint(), goal, framesArg ?? '', golden ? golden.join('') : '', outArg ?? ''].join('|'))
    .digest('hex')
    .slice(0, 16);
  const stateDir = join(tools, '.studio', 'review');
  const stateFile = join(stateDir, `${id}-${anim}.json`);
  const previous: ReviewState | null = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : null;
  if (previous && previous.key === key && !args.includes('--fresh') && (!previous.sheet || existsSync(previous.sheet))) {
    console.log(`= reused: same inputs, checker and goal as the review of ${previous.at} (--fresh recomputes)`);
    for (const line of previous.lines) console.log(line);
    if (!previous.ok) process.exitCode = 1;
    return;
  }

  // ---- one walk
  const listed = framesArg?.split(',').map(Number).filter((n) => n >= 0 && n < count);
  const every = Math.max(1, Math.ceil(count / 10));
  const contactFrames = new Set<number>();
  for (const h of spec.hits ?? []) contactFrames.add(hitFrame(h));
  const technique = c.techniques?.[anim];
  const keyFrames = technique ? playbackKeys(technique).map((k) => k.frame) : [];
  const wanted = new Set<number>(listed ?? []);
  if (!listed) {
    if (goal === 'contact') for (const h of contactFrames) for (const d of [-2, 0, 2]) if (h + d >= 0 && h + d < count) wanted.add(h + d);
    else {
      for (let n = 0; n < count; n += every) wanted.add(n);
      wanted.add(count - 1);
      for (const h of contactFrames) wanted.add(h);
      if (goal === 'timing') for (const k of keyFrames) wanted.add(k);
    }
  }
  resetRigStats();
  const kept = new Map<number, Kept>();
  const hashes: string[] = [];
  let flaggedKept = 0;
  // the same walk also records what the effects read and drew off the body (ws events), so no second compose
  const { result: samples, fx } = recordFx(() => sampleAnimation(painting, anim, cfg, (n, f, sample) => {
    if (wantsGolden) hashes[n] = createHash('sha1').update(f.picture.data).digest('hex').slice(0, 10);
    const flagged = !!(sample.clip || sample.gone || sample.hidden || sample.contactIssues?.length);
    if (wanted.has(n)) kept.set(n, keep(f));
    else if (flagged && !listed && goal !== 'refactor' && flaggedKept < KEEP_FLAGGED) {
      kept.set(n, keep(f));
      flaggedKept++;
    }
    if (goal === 'refactor' && golden && golden[n] !== hashes[n] && kept.size < CAP) kept.set(n, keep(f));
  }));
  const found = findings(painting, anim, samples, cfg);
  const coverage: Coverage[] = [];
  const errors = found.filter((f) => f.level === 'error');
  coverage.push({ check: 'critic', status: errors.length ? 'failed' : 'passed', note: `${errors.length} errors, ${found.length - errors.length} warnings` });

  // ---- events: required sockets, effects asking a pose that has no such socket, declared props (ws events)
  const ev = await clipReport(id, anim, false, {}, fx);
  const evIssues = ev.issues.filter((i) => i.level !== 'info');
  const evErrors = evIssues.filter((i) => i.level === 'error').length;
  coverage.push({ check: 'events', status: evErrors ? 'failed' : 'passed', note: `${ev.events.filter((e) => e.from !== 'switch').length} events, ${evErrors} errors, ${evIssues.length - evErrors} warnings` });

  // ---- seams and the held last pose (one-shot clips only)
  const { seams, hold } = spec.loop ? { seams: [], hold: [] } : endpointSeams(painting, [anim]);
  const badSeams = seams.filter((sm) => !sm.birth && sm.iou < 0.9);
  if (spec.loop) coverage.push({ check: 'seams', status: 'n/a', note: 'loop' });
  else coverage.push({ check: 'seams', status: badSeams.length ? 'failed' : 'passed', note: seams.map((sm) => `${sm.frame}:${sm.iou.toFixed(3)}`).join(' ') });
  if (hold.length) coverage.push({ check: 'hold', status: hold.some((h) => h.iou < 0.9) ? 'failed' : 'passed', note: `min IoU ${Math.min(...hold.map((h) => h.iou)).toFixed(3)}` });

  // ---- golden
  let changed: number[] = [];
  if (wantsGolden) {
    if (!golden) coverage.push({ check: 'golden', status: 'incomplete', note: `no golden/${id}.json entry for ${anim}` });
    else {
      changed = hashes.map((h, n) => (h !== golden[n] ? n : -1)).filter((n) => n >= 0);
      if (golden.length !== count) coverage.push({ check: 'golden', status: 'failed', note: `golden has ${golden.length} frames, clip ${count}` });
      else coverage.push({ check: 'golden', status: changed.length ? 'failed' : 'passed', note: changed.length ? `${changed.length}/${count} frames differ: ${ranges(changed)}` : `${count}/${count} identical` });
    }
  }
  if (goal === 'final') {
    const { detailBar } = await import('./gate');
    const { line, issues } = detailBar(painting, cfg);
    coverage.push({ check: 'detail', status: issues.length ? 'failed' : 'passed', note: line.replace(/^[✓✗] \S+ detail: /, '') });
  }

  // ---- sheet: marks as in ws sheet — a flagged run by its ends and middle
  const marks = new Map<number, Set<keyof typeof COLORS>>();
  const mark = (n: number, m: keyof typeof COLORS) => {
    if (!marks.has(n)) marks.set(n, new Set());
    marks.get(n)!.add(m);
  };
  for (const h of contactFrames) mark(h, 'hit');
  for (const k of keyFrames) mark(k, 'key');
  for (const f of found) {
    const runs: number[][] = [];
    for (const n of f.frames) {
      const last = runs[runs.length - 1];
      if (last && n === last[last.length - 1] + 1) last.push(n);
      else runs.push([n]);
    }
    for (const r of runs) for (const n of new Set([r[0], r[r.length >> 1], r[r.length - 1]])) mark(n, f.level === 'error' ? 'error' : 'warn');
  }
  let chosen: number[];
  if (listed) chosen = listed;
  else if (goal === 'refactor') chosen = changed.slice(0, CAP);
  else {
    const flagged = [...marks.keys()].filter((n) => marks.get(n)!.has('error') || marks.get(n)!.has('warn'));
    const must = [...new Set([...(goal === 'contact' ? [] : flagged), ...contactFrames, ...(goal === 'timing' ? keyFrames : [])])]
      .filter((n) => n >= 0 && n < count)
      .sort((a, z) => a - z);
    const rest = [...wanted].filter((n) => !must.includes(n)).sort((a, z) => a - z);
    const room = Math.max(2, CAP - must.length);
    const step = Math.max(1, Math.ceil(rest.length / room));
    chosen = [...new Set([...must.slice(0, CAP), ...rest.filter((_, i) => i % step === 0), ...(goal === 'contact' ? [] : [0, count - 1])])].sort((a, z) => a - z);
  }
  let sheet: string | null = null;
  if (chosen.length) {
    for (const n of chosen)
      if (!kept.has(n)) {
        kept.set(n, keep(compose(c, s, b, anim, n / 24)));
      }
    const frames = chosen.map((n) => kept.get(n)!);
    const box = actionBox(frames, frames[0].picture.w, frames[0].picture.h);
    const k = box[2] * box[3] <= 180 * 150 ? 2 : 1;
    const tiles: Tile[] = chosen.map((n) => ({ n, pics: [kept.get(n)!.picture], marks: [...(marks.get(n) ?? [])] }));
    const png = layout(tiles, box, k);
    sheet = outArg ?? join(tools, '.studio', `${id}-${anim}-${goal}.png`);
    mkdirSync(join(sheet, '..'), { recursive: true });
    writeFileSync(sheet, PNG.sync.write(png));
    coverage.push({ check: 'sheet', status: 'passed', note: `${png.width}×${png.height}, frames ${chosen.join(',')}` });
  } else coverage.push({ check: 'sheet', status: 'n/a', note: goal === 'refactor' ? 'no frame changed' : 'nothing to show' });

  // ---- issues: stable ids, new / fixed / still there against the previous review of this clip
  const issues: Issue[] = [
    ...found.map((f) => ({ id: issueId(f), level: f.level, kind: f.kind, frames: ranges(f.frames), note: f.note })),
    ...evIssues.map((i) => ({ id: `events:${i.kind}:${i.note.replace(/[\d.]+/g, '#')}`, level: i.level as 'error' | 'warn', kind: i.kind, frames: i.frame === undefined ? '' : String(i.frame), note: i.note })),
  ];
  const before = new Set((previous?.issues ?? []).map((i) => i.id));
  const now = new Set(issues.map((i) => i.id));
  const fresh = issues.filter((i) => !before.has(i.id));
  const fixed = (previous?.issues ?? []).filter((i) => !now.has(i.id));

  // ---- exceptions of this clip with their recorded reasons
  const reasons = readAcceptance()[id]?.exceptions ?? {};
  const exceptions = exceptionRules(id).filter((r) => r === 'clipAllow' || r.includes(` ${anim}:`) || r.split(' ').pop()!.split(',').includes(anim));

  const ok = coverage.every((x) => x.status !== 'failed');
  const stats = { ...rigStats };
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  const icon: Record<Status, string> = { passed: '✓', failed: '✗', incomplete: '?', 'n/a': '–' };
  const lines: string[] = [];
  lines.push(`${ok ? '✓' : '✗'} ${id} ${anim} [${goal}]: ${count} frames, ${sec} s · composes ${stats.compose} (history ${stats.history}), rasters ${stats.raster} (wasted ${stats.wasted}, skipped ${stats.skipped})`);
  lines.push('  coverage: ' + coverage.map((x) => `${x.check} ${icon[x.status]}`).join(' · '));
  for (const x of coverage) if (x.status === 'failed' || x.status === 'incomplete' || x.check === 'golden' || x.check === 'detail') lines.push(`    ${x.check}: ${x.note}`);
  if (previous) lines.push(`  issues: ${fresh.length} new, ${fixed.length} fixed, ${issues.length - fresh.length} still there (against ${previous.at})`);
  for (const i of issues) lines.push(`  ${i.level === 'error' ? '!' : '·'}${previous && !before.has(i.id) ? ' NEW' : ''} ${i.kind.padEnd(14)} ${i.note}`);
  for (const i of fixed) lines.push(`  ✓ fixed ${i.kind.padEnd(14)} ${i.note}`);
  for (const r of exceptions) lines.push(`  exception ${r}: ${reasons[r] ?? 'основание не записано'}`);
  if (sheet) lines.push(`  sheet ${relative(process.cwd(), sheet)}`);
  for (const line of lines) console.log(line);

  mkdirSync(stateDir, { recursive: true });
  const state: ReviewState = { key, goal, at: new Date().toISOString().slice(0, 16), ok, coverage, issues, lines, sheet, stats };
  writeFileSync(stateFile, JSON.stringify(state, null, 1) + '\n');
  if (!ok) process.exitCode = 1;
}
