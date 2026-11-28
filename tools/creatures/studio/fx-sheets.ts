// Side-by-side workshop proofs. Production frames go through compose; a draft changes a private copy of its inputs.
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join } from 'node:path';
import { parseArgs } from 'node:util';
import omggif from 'omggif';
import { PNG } from 'pngjs';
import { compose, frameCount, hitFrame } from '../engine';
import { loadPainting } from '../render';
import { Px } from '../rig/px';
import { techniqueContacts } from '../technique';
import type { Animation, Creature } from '../types';
import { displayFrame, impactClock, timedAnimation } from '../kit/impact-clock';
import { cellBox, gridOf } from './art-sheet';

const tools = join(import.meta.dirname, '..');
const common = { frames: { type: 'string' }, scale: { type: 'string' }, out: { type: 'string' } } as const;
type Value = number | string | boolean;
type Painting = Awaited<ReturnType<typeof loadPainting>>;
type Column = { label: string; frame: number; picture: Px };
type Sequence = { label: string; count: number; read: (frame: number) => Px };

function boundedInt(raw: string, min: number, max: number, label: string) {
  const n = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(n) || n < min || n > max)
    throw new Error(`${label} must be an integer from ${min} to ${max}`);
  return n;
}

function listedFrames(raw: string, count: number) {
  return raw.split(',').map(x => boundedInt(x.trim(), 0, count - 1, 'frame'));
}

export function draftValues(seeds?: string, vary?: string): { key: string; values: Value[] } {
  if ((seeds === undefined) === (vary === undefined)) throw new Error('Choose --seeds 1..3 or --vary key=a,b,c');
  let key: string, values: Value[];
  if (seeds !== undefined) {
    const range = /^(\d+)\.\.(\d+)$/.exec(seeds);
    if (!range) throw new Error('--seeds expects an inclusive range such as 1..3');
    const first = boundedInt(range[1], 0, 0xffffffff, 'seed'), last = boundedInt(range[2], 0, 0xffffffff, 'seed');
    if (last - first < 2 || last - first > 4) throw new Error('Choose 3 to 5 consecutive seeds');
    key = 'seed';
    values = Array.from({ length: last - first + 1 }, (_, i) => first + i);
  } else {
    const assignment = /^([A-Za-z][\w-]*)=(.+)$/.exec(vary!);
    if (!assignment) throw new Error('--vary expects a scalar effect option, e.g. spread=0.6,1,1.4');
    key = assignment[1];
    values = assignment[2].split(',').map(x => {
      const v = x.trim();
      if (!v) throw new Error(`Empty value for ${key}`);
      if (key === 'seed') return boundedInt(v, 0, 0xffffffff, 'seed');
      if (v === 'true' || v === 'false') return v === 'true';
      return Number.isFinite(Number(v)) ? Number(v) : v;
    });
  }
  if (values.length < 3 || values.length > 5 || new Set(values).size !== values.length)
    throw new Error('Choose 3 to 5 different values');
  return { key, values };
}

function checkedClip(c: Creature, anim: string) {
  const spec = c.animations[anim];
  if (!spec) throw new Error(`${c.id} has no animation ${anim}`);
  return timedAnimation(spec);
}

/** Include the contact, the release after a freeze, the early flight and the fading tail. */
export function comparisonFrames(c: Creature, anim: string): number[] {
  const spec = checkedClip(c, anim), count = frameCount(spec.seconds);
  const contacts = new Map<number, number>();
  for (const t of spec.hits ?? []) contacts.set(hitFrame(t), 0);
  const technique = c.techniques?.[anim];
  for (const contact of [...(technique ? techniqueContacts(technique) : []), ...(spec.contacts ?? [])]) {
    const visible = displayFrame(contact.frame, spec.contacts ?? []);
    contacts.set(visible, Math.max(contacts.get(visible) ?? 0, contact.freeze ?? 0));
  }
  const ordered = [...contacts.entries()].sort((a, b) => a[0] - b[0]);
  const samples = new Set<number>();
  if (ordered.length) {
    const chosen = ordered.length <= 3 ? ordered : [ordered[0], ordered[Math.floor(ordered.length / 2)], ordered.at(-1)!];
    for (const [frame, freeze] of chosen) {
      const offsets = ordered.length === 1 ? [-2, 0, freeze, freeze + 1, freeze + 2, freeze + 5, freeze + 10, freeze + 18, freeze + 27]
        : [-1, 0, freeze, freeze + 1, freeze + 3, freeze + 8, freeze + 16];
      for (const offset of offsets) samples.add(Math.max(0, Math.min(count - 1, frame + offset)));
    }
  } else {
    for (let i = 0; i < 8; i++) samples.add(Math.round(i / 7 * (count - 1)));
  }
  return [...samples].sort((a, b) => a - b);
}

/** Match the authored motion before adding the reference's own holds. A caught prop stays caught in both columns. */
export function matchingFrame(n: number, left: Animation, right: Animation) {
  const local = Math.round(impactClock(n / 24, left.contacts ?? []).time * 24);
  const from = frameCount(left.authoredSeconds ?? left.seconds);
  const to = frameCount(right.authoredSeconds ?? right.seconds);
  const target = Math.round(local / Math.max(1, from - 1) * (to - 1));
  const heldFor = n - displayFrame(local, left.contacts ?? []);
  const rightHold = right.contacts?.find(c => c.frame === target)?.freeze ?? 0;
  return displayFrame(target, right.contacts ?? []) + Math.min(heldFor, rightHold);
}

function clipSequence(painting: Painting, anim: string, label: string, creature = painting.c): Sequence {
  const count = frameCount(checkedClip(creature, anim).seconds);
  return { label, count, read: n => compose(creature, painting.s, painting.b, anim, n / 24).picture };
}

function different(a: Px, b: Px) {
  const bytes = (p: Px) => Buffer.from(p.data.buffer, p.data.byteOffset, p.data.byteLength);
  return a.w !== b.w || a.h !== b.h || !bytes(a).equals(bytes(b));
}

/** Keep only selected pictures plus frames which prove otherwise indistinguishable draft pairs differ. */
export function distinctDrafts(sequences: Sequence[], chosen: number[], explicit: boolean) {
  const rows = new Map<number, Column[]>();
  let similar = sequences.flatMap((_, i) => sequences.slice(i + 1).map((_, j) => [i, i + j + 1]));
  const inspect = (n: number, keep: boolean) => {
    const pictures = sequences.map(s => ({ label: s.label, frame: n, picture: s.read(n) }));
    const pending = similar.filter(([a, b]) => !different(pictures[a].picture, pictures[b].picture));
    if (keep || pending.length < similar.length) rows.set(n, pictures);
    similar = pending;
  };
  for (const n of chosen) inspect(n, true);
  if (!explicit) for (let n = 0; similar.length && n < sequences[0].count; n++)
    if (!rows.has(n)) inspect(n, false);
  if (similar.length) {
    const names = similar.map(([a, b]) => sequences[a].label + ' / ' + sequences[b].label);
    const where = explicit ? 'on the requested frames. Choose --frames at the effect or omit it to search the clip'
      : 'throughout the clip. Check that the effect reads this option';
    throw new Error(`Indistinguishable drafts (${names.join(', ')}) ${where}`);
  }
  return [...rows].sort(([a], [b]) => a - b).map(([, columns]) => columns);
}

function writeSheet(title: string, rows: Column[][], scale: number, output: string) {
  const pad = 10, gap = 10, top = 60;
  const displayH = rows[0][0].picture.h * scale;
  const displayW = (p: Px) => Math.max(1, Math.round(p.w / p.h * displayH));
  const measure = createCanvas(1, 1).getContext('2d');
  measure.font = 'bold 14px sans-serif';
  const widths = rows[0].map(({ label }, col) => Math.max(Math.ceil(measure.measureText(label).width),
    ...rows.map(row => displayW(row[col].picture))));
  const width = Math.max(Math.ceil(measure.measureText(title).width) + 2 * pad, 2 * pad + widths.reduce((a, b) => a + b) + (widths.length - 1) * gap);
  const pitch = displayH + 24;
  const canvas = createCanvas(width, top + rows.length * pitch + pad), ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#19212c'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 15px sans-serif'; ctx.fillStyle = '#f3e2c4'; ctx.fillText(title, pad, 20, width - 2 * pad);
  let x = pad;
  widths.forEach((w, col) => {
    ctx.fillStyle = '#b8ccd9'; ctx.font = 'bold 14px sans-serif'; ctx.fillText(rows[0][col].label, x, 46, w);
    rows.forEach((row, i) => {
      const { frame, picture } = row[col], y = top + i * pitch, dw = displayW(picture);
      const left = x + Math.floor((w - dw) / 2);
      ctx.fillStyle = '#272635'; ctx.fillRect(left, y, dw, displayH);
      ctx.drawImage(picture.canvas(), left, y, dw, displayH);
      ctx.font = '12px sans-serif'; ctx.fillStyle = '#cfdae1'; ctx.fillText('#' + frame, left + 1, y + displayH + 14);
    });
    x += w + gap;
  });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, canvas.toBuffer('image/png'));
  console.log(`${output}   ${widths.length} columns × ${rows.length} rows, ${displayH} px per frame on screen`);
}

function crop(png: PNG, { x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const pixels = new Px(w, h);
  for (let row = 0; row < h; row++) {
    const start = ((y + row) * png.width + x) * 4;
    pixels.data.set(png.data.subarray(start, start + w * 4), row * w * 4);
  }
  return pixels;
}

/** Decode the requested GIF frames in display order, including partial frames and both common disposal modes. */
function gifSequence(path: string): Sequence {
  const reader = new omggif.GifReader(readFileSync(path));
  const w = reader.width, h = reader.height, image = new Uint8ClampedArray(w * h * 4);
  let last = -1, previous: Uint8ClampedArray | undefined;
  return { label: basename(path), count: reader.numFrames(), read(n) {
    if (n < last) { last = -1; image.fill(0); previous = undefined; }
    while (last < n) {
      if (last >= 0) {
        const disposed = reader.frameInfo(last);
        if (disposed.disposal === 3 && previous) image.set(previous);
        if (disposed.disposal === 2) for (let y = disposed.y; y < disposed.y + disposed.height; y++) {
          const start = (y * w + disposed.x) * 4;
          image.fill(0, start, start + disposed.width * 4);
        }
      }
      const next = ++last;
      previous = reader.frameInfo(next).disposal === 3 ? image.slice() : undefined;
      reader.decodeAndBlitFrameRGBA(next, image);
    }
    const pixels = new Px(w, h); pixels.data.set(image); return pixels;
  }};
}

async function referenceFile(path: string, grid?: string): Promise<Sequence> {
  if (!statSync(path).isFile()) throw new Error('Reference path must be a PNG, WebP, JPEG or GIF file');
  if (extname(path).toLowerCase() === '.gif') {
    if (grid) throw new Error('--ref-grid applies to a static image sheet');
    return gifSequence(path);
  }
  const bytes = readFileSync(path);
  let png: PNG;
  if (extname(path).toLowerCase() === '.png') png = PNG.sync.read(bytes);
  else {
    const image = await loadImage(bytes);
    const ctx = createCanvas(image.width, image.height).getContext('2d');
    ctx.drawImage(image, 0, 0);
    png = new PNG({ width: image.width, height: image.height });
    png.data.set(ctx.getImageData(0, 0, image.width, image.height).data);
  }
  const shape = grid ? gridOf(grid, png) : [1, 1] as [number, number];
  return { label: basename(path), count: shape[0] * shape[1], read: n => crop(png, cellBox(png, shape, n)) };
}

function pixelfxReference(id: string): Sequence {
  if (!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(id)) throw new Error('Expected pixelfx:category/name');
  const vendor = join(tools, 'vendor/pixelfx'), tmp = mkdtempSync(join(tmpdir(), 'ws-pixelfx-'));
  try {
    if (!existsSync(join(vendor, 'src/fx', id + '.js'))) throw new Error('Unknown pixelfx effect ' + id);
    execFileSync(process.execPath, ['tools/render.mjs', id, '--sheet', '--zoom', '1', '--max', '2', '--out', tmp],
      { cwd: vendor, stdio: ['ignore', 'pipe', 'pipe'] });
    const prefix = join(tmp, id, basename(id));
    const atlas = JSON.parse(readFileSync(prefix + '.json', 'utf8'));
    const png = PNG.sync.read(readFileSync(prefix + '.png'));
    return { label: 'pixelfx:' + id, count: atlas.frames.length, read: n => crop(png, atlas.frames[n].frame) };
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

export function renderDrafts(painting: Painting, anim: string, variations: ReturnType<typeof draftValues>, listed?: string) {
  const sequences = variations.values.map(value => clipSequence(painting, anim, variations.key + ' = ' + value,
    { ...painting.c, fxOptions: { ...painting.c.fxOptions, [variations.key]: value } }));
  const frames = listed === undefined ? comparisonFrames(painting.c, anim) : listedFrames(listed, sequences[0].count);
  return distinctDrafts(sequences, frames, listed !== undefined);
}

export async function draftsCommand(args: string[]) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true,
    options: { ...common, seeds: { type: 'string' }, vary: { type: 'string' } } });
  if (positionals.length !== 2) throw new Error('usage: ws drafts <id> <anim> --seeds 1..3 | --vary key=a,b,c');
  const [id, anim] = positionals, variations = draftValues(values.seeds, values.vary);
  const painting = await loadPainting(id);
  const scale = boundedInt(values.scale ?? '1', 1, 4, '--scale');
  const rows = renderDrafts(painting, anim, variations, values.frames);
  writeSheet(id + ' / ' + anim, rows, scale, values.out ?? join(tools, '.studio', `${id}-${anim}-drafts.png`));
}

export async function againstCommand(args: string[]) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: { ...common,
    ref: { type: 'string' }, 'ref-frames': { type: 'string' }, 'ref-grid': { type: 'string' },
    'ref-anim': { type: 'string' }, 'pose-step': { type: 'string' } } });
  if (positionals.length !== 2 || !values.ref) throw new Error('usage: ws against <id> <anim> --ref <creature|pixelfx:category/name|file>');
  const [id, anim] = positionals, painting = await loadPainting(id);
  const spec = checkedClip(painting.c, anim);
  const step = values['pose-step'] === undefined ? undefined : boundedInt(values['pose-step'], 1, 2, '--pose-step');
  const local = step === undefined ? painting.c : { ...painting.c, animations: {
    ...painting.c.animations, [anim]: { ...spec, poseStep: step === 2 ? 2 as const : undefined } } };
  const left = clipSequence(painting, anim, id + (step ? ' · poseStep ' + step : ''), local);
  const ref = values.ref, file = existsSync(ref), vendor = ref.startsWith('pixelfx:');
  if (values['ref-grid'] && !file) throw new Error('--ref-grid expects an image file');
  if (values['ref-anim'] && (file || vendor)) throw new Error('--ref-anim expects a creature');
  let right: Sequence, refClip: Animation | undefined;
  if (vendor) right = pixelfxReference(ref.slice('pixelfx:'.length));
  else if (file) right = await referenceFile(ref, values['ref-grid']);
  else {
    const reference = await loadPainting(ref), refAnim = values['ref-anim'] ?? anim;
    refClip = checkedClip(reference.c, refAnim);
    const label = ref + (values['ref-anim'] ? ' / ' + refAnim : '');
    right = clipSequence(reference, refAnim, step ? label + ' · poseStep ' + (refClip.poseStep ?? 1) : label);
  }
  const frames = values.frames === undefined ? comparisonFrames(local, anim) : listedFrames(values.frames, left.count);
  // A short external benchmark spans the visible comparison window; different clips match at equal authored phases.
  const rightFrames = values['ref-frames'] === undefined ? frames.map((n, i) => refClip
    ? matchingFrame(n, spec, refClip)
    : Math.round(i / Math.max(1, frames.length - 1) * (right.count - 1)))
    : listedFrames(values['ref-frames'], right.count);
  if (frames.length !== rightFrames.length) throw new Error('Provide one --ref-frames index for each selected frame');
  const scale = boundedInt(values.scale ?? '1', 1, 4, '--scale');
  const rows = frames.map((frame, i) => [
    { label: left.label, frame, picture: left.read(frame) },
    { label: right.label, frame: rightFrames[i], picture: right.read(rightFrames[i]) },
  ]);
  const refTag = right.label.replace(/[^\p{L}\p{N}_.-]+/gu, '-');
  writeSheet(anim, rows, scale, values.out ?? join(tools, '.studio', `${id}-${anim}-against-${refTag}${step ? '-step' + step : ''}.png`));
}
