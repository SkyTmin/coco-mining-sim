// ws review <id> <anim> [--frames a,b,…] [--out file.png] — the per-clip loop in one pass.
// One walk over the clip composes every frame once and serves three answers that used to be three commands, each
// composing the clip again: the critic of `ws check <id> <anim>` (clips, pops, hidden contacts, weak impacts), a sheet
// of the frames that matter (`ws sheet`: flagged runs by their ends and middle, contacts, evenly spaced in-betweens)
// and the clip's seams with the rest pose (`ws seam`). Pictures of the kept frames are copied during the walk, so the
// sheet costs no extra compose unless an asked frame was not kept. The answer is short: status, findings, seams,
// the sheet path, the time and the number of composes. Exit code 1 on an error finding or a seam below 0.9.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { loadPainting } from '../render';
import { playbackKeys } from '../technique';
import { compose, frameCount, hitFrame } from '../engine';
import { findings, sampleAnimation, studioConfig } from './checks';
import { actionBox, layout, type COLORS, type Img, type Tile } from './sheet';
import { endpointSeams } from './pet-gate';

const tools = join(import.meta.dirname, '..');
const SHOWN = ['body', 'lit', 'fxu', 'fxo', 'over'];
/** Most flagged frames kept from the walk (pictures are ~0.6 MB a layer on a 384×312 field). */
const KEEP_FLAGGED = 40;
const CAP = 15;

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

function option(args: string[], name: string) {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1];
}

export async function reviewCommand(args: string[]) {
  const positional = args.filter((a, i) => !a.startsWith('--') && !['--frames', '--out'].includes(args[i - 1]));
  const [id, anim] = positional;
  if (!id || !anim) {
    console.log('usage: npm run ws -- review <id> <anim> [--frames a,b,c] [--out file.png]');
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
  const listed = option(args, '--frames')?.split(',').map(Number).filter((n) => n >= 0 && n < count);
  const every = Math.max(1, Math.ceil(count / 10));
  const wanted = new Set<number>(listed ?? []);
  if (!listed) {
    for (let n = 0; n < count; n += every) wanted.add(n);
    wanted.add(count - 1);
    for (const h of spec.hits ?? []) wanted.add(hitFrame(h));
  }
  const kept = new Map<number, Kept>();
  let flaggedKept = 0,
    composes = 0;
  const samples = sampleAnimation(painting, anim, cfg, (n, f, sample) => {
    composes++;
    const flagged = !!(sample.clip || sample.gone || sample.hidden || sample.contactIssues?.length);
    if (wanted.has(n)) kept.set(n, keep(f));
    else if (flagged && !listed && flaggedKept < KEEP_FLAGGED) {
      kept.set(n, keep(f));
      flaggedKept++;
    }
  });
  const found = findings(painting, anim, samples, cfg);

  // marks: as in ws sheet — a flagged run by its ends and middle
  const marks = new Map<number, Set<keyof typeof COLORS>>();
  const mark = (n: number, m: keyof typeof COLORS) => {
    if (!marks.has(n)) marks.set(n, new Set());
    marks.get(n)!.add(m);
  };
  for (const h of spec.hits ?? []) mark(hitFrame(h), 'hit');
  const technique = c.techniques?.[anim];
  for (const k of technique ? playbackKeys(technique) : []) mark(k.frame, 'key');
  for (const f of found) {
    const runs: number[][] = [];
    for (const n of f.frames) {
      const last = runs[runs.length - 1];
      if (last && n === last[last.length - 1] + 1) last.push(n);
      else runs.push([n]);
    }
    for (const r of runs)
      for (const n of new Set([r[0], r[r.length >> 1], r[r.length - 1]])) mark(n, f.level === 'error' ? 'error' : 'warn');
  }
  let chosen: number[];
  if (listed) chosen = listed;
  else {
    const flagged = [...marks.keys()].filter((n) => marks.get(n)!.has('error') || marks.get(n)!.has('warn'));
    const must = [...new Set([...flagged, ...[...marks.keys()].filter((n) => marks.get(n)!.has('hit'))])].sort((a, z) => a - z);
    const rest = [...wanted].filter((n) => !must.includes(n)).sort((a, z) => a - z);
    const room = Math.max(2, CAP - must.length);
    const step = Math.max(1, Math.ceil(rest.length / room));
    chosen = [...new Set([...must.slice(0, CAP), ...rest.filter((_, i) => i % step === 0), 0, count - 1])].sort((a, z) => a - z);
  }
  // a chosen frame that was not kept during the walk (an over-cap flagged frame) is composed once more
  for (const n of chosen)
    if (!kept.has(n)) {
      kept.set(n, keep(compose(c, s, b, anim, n / 24)));
      composes++;
    }
  const frames = chosen.map((n) => kept.get(n)!);
  const box = actionBox(frames, frames[0].picture.w, frames[0].picture.h);
  const k = box[2] * box[3] <= 180 * 150 ? 2 : 1;
  const tiles: Tile[] = chosen.map((n) => ({ n, pics: [kept.get(n)!.picture], marks: [...(marks.get(n) ?? [])] }));
  const png = layout(tiles, box, k);
  const out = option(args, '--out') ?? join(tools, '.studio', `${id}-${anim}-review.png`);
  mkdirSync(join(out, '..'), { recursive: true });
  writeFileSync(out, PNG.sync.write(png));

  // seams with the rest pose (a one-shot clip only)
  const { seams, hold } = spec.loop ? { seams: [], hold: [] } : endpointSeams(painting, [anim]);
  const badSeams = seams.filter((sm) => !sm.birth && sm.iou < 0.9);
  const badHold = hold.filter((h) => h.iou < 0.9);

  const errors = found.filter((f) => f.level === 'error');
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  const ok = !errors.length && !badSeams.length && !badHold.length;
  console.log(
    `${ok ? '✓' : '✗'} ${id} ${anim}: ${count} frames, ${errors.length} errors, ${found.length - errors.length} warnings · ` +
      `${composes} composes in one pass, ${sec} s`,
  );
  for (const f of found) console.log(`  ${f.level === 'error' ? '!' : '·'} ${f.kind.padEnd(14)} ${f.note}`);
  for (const sm of seams)
    console.log(
      `  ${sm.birth ? '·' : sm.iou < 0.9 ? '!' : '✓'} seam frame ${String(sm.frame).padStart(3)} vs ${sm.against.padEnd(7)} IoU ${sm.iou.toFixed(3)}` +
        (sm.birth ? ' (birth image, measured against its sheet)' : ''),
    );
  if (hold.length)
    console.log(`  ${badHold.length ? '!' : '✓'} show holds its last pose: lowest IoU ${Math.min(...hold.map((h) => h.iou)).toFixed(3)}`);
  console.log(`  sheet ${out}  ${png.width}×${png.height}  frames ${chosen.join(',')}`);
  if (!ok) process.exitCode = 1;
}
