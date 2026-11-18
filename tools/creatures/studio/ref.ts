// Compare the painted pose to an independently drawn cell, in native painting pixels.
import { createCanvas } from '@napi-rs/canvas';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { PNG } from 'pngjs';
import { measureDetail } from '../detail';
import { compose, frameCount } from '../engine';
import { loadPainting } from '../render';
import { Px } from '../rig/px';
import { traceMaterials } from '../technique-fx';
import type { XY } from '../types';

const root = join(import.meta.dirname, '..');
type Anchor = { ground: XY; points?: Record<string, XY> };
type RefSpec = { sheet: string; study?: string; grid: XY; frames: number[]; idleHeight?: number; captionHeight?: number; keys?: Anchor[] };
type Painting = Awaited<ReturnType<typeof loadPainting>>;
type Frame = ReturnType<typeof compose>;
type Distance = { name: string; target: XY; actual?: XY; error?: number };
type Bounds = [number, number, number, number]; // left, top, exclusive right and bottom
export const refLimits = { minIoU: 0.60, maxPointError: 18 };

const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const int = (x: unknown): x is number => finite(x) && Number.isSafeInteger(x);
const xy = (v: unknown): v is XY => Array.isArray(v) && v.length === 2 && v.every(finite);
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
function validate(spec: RefSpec, where: string) {
  const fail = (message: string): never => { throw new Error(where + ': ' + message); };
  if (!record(spec)) fail('expected a reference object');
  if (typeof spec.sheet !== 'string' || extname(spec.sheet).toLowerCase() !== '.png') fail('sheet must name a PNG');
  if (!xy(spec.grid) || !spec.grid.every(n => int(n) && n > 0)) fail('grid must be [positive columns, positive rows]');
  if (!Array.isArray(spec.frames) || !spec.frames.length || spec.frames.length > spec.grid[0] * spec.grid[1] ||
      !spec.frames.every(n => int(n) && n >= 0)) fail('frames must fit the grid and be nonnegative integers');
  if (spec.idleHeight !== undefined && (!finite(spec.idleHeight) || spec.idleHeight <= 0)) fail('idleHeight must be positive');
  if (spec.captionHeight !== undefined && (!int(spec.captionHeight) || spec.captionHeight < 0)) fail('invalid captionHeight');
  if (spec.keys !== undefined) {
    if (!Array.isArray(spec.keys) || spec.keys.length !== spec.frames.length) fail('supply one key per frame');
    for (const [index, key] of spec.keys.entries()) {
      if (!record(key) || !xy(key.ground)) fail('key ' + index + ' needs a ground point');
      if (key.points !== undefined && (!record(key.points) || !Object.entries(key.points).every(([name, p]) => name.length && xy(p))))
        fail('invalid landmark in key ' + index);
    }
  }
}

function configPath(id: string, toolsDir: string) {
  if (!/^[a-z][a-z0-9_]*$/.test(id)) throw new Error('invalid creature id: ' + id);
  return join(toolsDir, 'c', id + '.ref.json');
}
export function readPoseRefs(id: string, toolsDir = root): Record<string, RefSpec> {
  const file = configPath(id, toolsDir);
  if (!existsSync(file)) return {};
  const obj: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!record(obj)) throw new Error(file + ' must map animation names to references');
  for (const [anim, value] of Object.entries(obj)) {
    const spec = value as RefSpec;
    validate(spec, file + ' ' + anim);
    if (isAbsolute(spec.sheet)) throw new Error(anim + ': sheet path must be relative to ' + dirname(file));
    spec.sheet = resolve(dirname(file), spec.sheet);
    const rel = relative(resolve(toolsDir, '../..'), spec.sheet);
    if (rel === '..' || rel.startsWith('..' + sep)) throw new Error(anim + ': registered PNG must be inside the repository');
    if (!existsSync(spec.sheet)) throw new Error(anim + ' reference PNG missing: ' + spec.sheet);
  }
  return obj as Record<string, RefSpec>;
}
export function poseRefInputs(id: string, toolsDir = root) {
  const file = configPath(id, toolsDir);
  if (!existsSync(file)) return [];
  return [file, ...new Set(Object.values(readPoseRefs(id, toolsDir)).map(s => s.sheet))];
}

function bounds(p: Px): Bounds {
  let left = p.w, top = p.h, right = 0, bottom = 0;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (p.data[4 * (y * p.w + x) + 3] < 128) continue;
    left = Math.min(left, x); right = Math.max(right, x + 1);
    top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
  }
  return [left, top, right, bottom];
}
export function extractCell(png: PNG, grid: XY, index: number, captionHeight?: number) {
  const [cols, rows] = grid;
  const col = index % cols, row = Math.floor(index / cols);
  const left = Math.floor(col * png.width / cols), top = Math.floor(row * png.height / rows);
  const w = Math.floor((col + 1) * png.width / cols) - left;
  const fullHeight = Math.floor((row + 1) * png.height / rows) - top;
  const h = fullHeight - (captionHeight ?? Math.round(fullHeight * 0.12));
  if (w < 1 || h < 1) throw new Error('grid or caption leaves no drawing area in cell ' + (index + 1));
  const p = new Px(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const src = 4 * ((top + y) * png.width + left + x);
    const r = png.data[src], g = png.data[src + 1], b = png.data[src + 2], a = png.data[src + 3];
    if (a < 128 || (r >= 213 && g <= 42 && b >= 213)) continue;
    const dest = 4 * (y * w + x);
    p.data[dest] = r; p.data[dest + 1] = g; p.data[dest + 2] = b; p.data[dest + 3] = 255;
  }
  const box = bounds(p);
  if (box[2] <= box[0]) throw new Error('empty reference silhouette in cell ' + (index + 1));
  return { p, box, fullHeight };
}

type Cell = ReturnType<typeof extractCell>;
function inferredGround(cell: Cell): XY {
  // First cell is the standing calibration in an unregistered sheet. Use its bottom footprint.
  const [left, top, right, bottom] = cell.box;
  const band = Math.min(bottom - top, Math.max(1, Math.ceil((bottom - top) * 0.04)));
  let x0 = right, x1 = left;
  for (let y = bottom - band; y < bottom; y++) for (let x = left; x < right; x++) {
    if (!cell.p.data[(y * cell.p.w + x) * 4 + 3]) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1);
  }
  return [(x0 + x1) / 2, bottom];
}
export function registerCell(cell: Cell, ground: XY, feet: XY, scale: number) {
  const transform = (p: XY): XY => [feet[0] + (p[0] - ground[0]) * scale, feet[1] + (p[1] - ground[1]) * scale];
  const [l, t, r, b] = cell.box;
  const lo = transform([l, t]), hi = transform([r, b]);
  const left = Math.floor(lo[0]), top = Math.floor(lo[1]);
  const w = Math.ceil(hi[0]) - left, h = Math.ceil(hi[1]) - top;
  if (w > 4096 || h > 4096 || w * h > 4_000_000) throw new Error('reference scale exceeds painting resolution; check idleHeight');
  const p = new Px(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.floor(ground[0] + (left + x + 0.5 - feet[0]) / scale);
    const sy = Math.floor(ground[1] + (top + y + 0.5 - feet[1]) / scale);
    if (sx < l || sx >= r || sy < t || sy >= b) continue;
    const src = (sy * cell.p.w + sx) * 4;
    p.data.set(cell.p.data.subarray(src, src + 4), (y * w + x) * 4);
  }
  return { p, left, top, transform };
}

type Registered = ReturnType<typeof registerCell>;
export function silhouetteIoU(body: Px, drawing: Registered) {
  let actual = 0, reference = 0, both = 0;
  for (let i = 3; i < body.data.length; i += 4) if (body.data[i] >= 128) actual++;
  const { p, left, top } = drawing;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (!p.data[4 * (y * p.w + x) + 3]) continue;
    reference++;
    const sx = left + x, sy = top + y;
    if (sx >= 0 && sx < body.w && sy >= 0 && sy < body.h && body.data[4 * (sy * body.w + sx) + 3] >= 128) both++;
  }
  return both / Math.max(1, actual + reference - both);
}
export function pointErrors(frame: Frame, drawing: Registered, points: Record<string, XY>) {
  return Object.entries(points).map(([name, p]): Distance => {
    const target = drawing.transform(p);
    const at = name.startsWith('projectile:')
      ? (frame.techniqueTrace.materials.find(s => s.id === name.slice('projectile:'.length))?.at ??
         frame.techniqueTrace.projectiles.find(s => s.id === name.slice('projectile:'.length))?.at)
      : Object.hasOwn(frame.points, name) ? frame.points[name] : undefined;
    if (!at) return { name, target };
    const actual: XY = [at[0] + frame.feet[0] - frame.worldFeet[0], at[1] + frame.feet[1] - frame.worldFeet[1]];
    return { name, target, actual, error: Math.hypot(actual[0] - target[0], actual[1] - target[1]) };
  });
}
type Row = { n: number; frame: Frame; drawing: Registered; iou: number; distances: Distance[] };
export function measureRef({ c, s, b }: Painting, anim: string, spec: RefSpec): Row[] {
  validate(spec, c.id + '/' + anim);
  const animation = c.animations[anim];
  if (!animation) throw new Error(c.id + ' has no animation ' + anim);
  const count = frameCount(animation.seconds);
  if (spec.frames.some(n => n >= count)) throw new Error(anim + ': frames must be between 0 and ' + (count - 1));
  const png = PNG.sync.read(readFileSync(spec.sheet));
  const cells = spec.frames.map((_, i) => extractCell(png, spec.grid, i, spec.captionHeight));
  const first = cells[0];
  const scale = measureDetail(c.frame('idle', 0, 0, 'normal').px).height / (spec.idleHeight ?? first.box[3] - first.box[1]);
  const defaultGround = inferredGround(first);
  return spec.frames.map((n, i) => {
    const key = spec.keys?.[i], ground = key?.ground ?? defaultGround, cell = cells[i];
    if (ground[0] < 0 || ground[0] > cell.p.w || ground[1] < 0 || ground[1] > cell.fullHeight)
      throw new Error('ground outside cell ' + (i + 1));
    for (const [name, [x, y]] of Object.entries(key?.points ?? {}))
      if (x < 0 || x >= cell.p.w || y < 0 || y >= cell.p.h) throw new Error(name + ' outside art in cell ' + (i + 1));
    const frame = traceMaterials(new Set(), () => compose(c, s, b, anim, n / 24));
    const body = frame.layers.body;
    // A held or airborne physical prop on the drawing is also part of its silhouette.
    // Use the original brush's coverage, excluding trails, flashes and scenery.
    for (const material of frame.techniqueTrace.materials) {
      if (!Object.hasOwn(key?.points ?? {}, 'projectile:' + material.id)) continue;
      const offsetX = Math.round(frame.feet[0] - frame.worldFeet[0]);
      const offsetY = Math.round(frame.feet[1] - frame.worldFeet[1]);
      const ink = frame.layers[material.layer === 'above' ? 'fxo' : 'fxu'];
      for (const [x, y] of material.pixels) {
        const px = x + offsetX, py = y + offsetY;
        if (px < 0 || px >= body.w || py < 0 || py >= body.h) continue;
        const alpha = (py * body.w + px) * 4 + 3;
        if (ink.data[alpha] >= 128) body.data[alpha] = 255;
      }
    }
    const drawing = registerCell(cell, ground, frame.feet, scale);
    return { n, frame, drawing, iou: silhouetteIoU(frame.layers.body, drawing), distances: pointErrors(frame, drawing, key?.points ?? {}) };
  });
}
export function refIssues(rows: Pick<Row, 'n' | 'iou' | 'distances'>[]) {
  const errors: string[] = [];
  for (const row of rows) {
    if (row.iou < refLimits.minIoU) errors.push('f' + row.n + ' IoU ' + row.iou.toFixed(3) + ' < ' + refLimits.minIoU);
    for (const d of row.distances) {
      if (d.error === undefined) errors.push('f' + row.n + ' missing ' + d.name);
      else if (d.error > refLimits.maxPointError)
        errors.push('f' + row.n + ' ' + d.name + ' ' + d.error.toFixed(2) + ' px > ' + refLimits.maxPointError);
    }
  }
  return errors;
}

function contour(drawing: Registered) {
  const { p } = drawing, outline = new Px(p.w + 2, p.h + 2);
  const on = (x: number, y: number) => x >= 0 && x < p.w && y >= 0 && y < p.h && p.data[(y * p.w + x) * 4 + 3] > 0;
  for (let y = -1; y <= p.h; y++) for (let x = -1; x <= p.w; x++) {
    if (on(x, y)) {
      if (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1)) outline.set(x + 1, y + 1, [29, 255, 230, 255]);
    } else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) outline.set(x + 1, y + 1, [12, 36, 45, 255]);
  }
  return outline.canvas();
}
function describe(d: Distance) { return d.name + ' ' + (d.error === undefined ? 'MISSING' : d.error.toFixed(1) + ' px'); }

function writeReview(id: string, anim: string, rows: Row[], out: string) {
  // All panels share a camera-relative crop and pixel scale, including frames above the floor.
  let l = 0, t = 0, r = 0, b = 0;
  for (const { frame, drawing, distances } of rows) {
    const [x, y] = frame.feet;
    const include = (px: number, py: number) => {
      l = Math.min(l, px - x); r = Math.max(r, px - x); t = Math.min(t, py - y); b = Math.max(b, py - y);
    };
    const [x0, y0, x1, y1] = bounds(frame.layers.body);
    include(x0, y0); include(x1, y1);
    include(drawing.left, drawing.top); include(drawing.left + drawing.p.w, drawing.top + drawing.p.h);
    for (const d of distances) { include(...d.target); if (d.actual) include(...d.actual); }
  }
  l = Math.floor(l) - 6; t = Math.floor(t) - 6; r = Math.ceil(r) + 6; b = Math.ceil(b) + 6;
  const zoom = r - l <= 180 ? 2 : 1;
  const width = Math.max(130, (r - l) * zoom), height = (b - t) * zoom;
  const group = 3 * (width + 5) + 11, cols = group <= 900 && rows.length > 1 ? 2 : 1;
  const perLine = 3, maxLabels = Math.max(...rows.map(x => x.distances.length));
  const rowHeight = height + 64 + 16 * Math.ceil(maxLabels / perLine);
  const canvas = createCanvas(group * cols + 10, Math.ceil(rows.length / cols) * rowHeight + 45);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#192433'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 16px sans-serif'; ctx.fillStyle = '#ffffff';
  ctx.fillText(id + ' / ' + anim + '     |     native pixels     |     cyan = drawing, gold = socket / projectile', 10, 25);
  ctx.imageSmoothingEnabled = false;
  rows.forEach(({ frame, drawing, n, iou, distances }, i) => {
    const x = 10 + i % cols * group, y = 43 + Math.floor(i / cols) * rowHeight;
    const dx = Math.floor(frame.feet[0] + l), dy = Math.floor(frame.feet[1] + t);
    const actual = frame.picture.canvas(), ref = drawing.p.canvas(), outline = contour(drawing);
    ['FRAME ' + n, 'REFERENCE', 'OVERLAY'].forEach((name, k) => {
      const left = x + k * (width + 5), top = y + 8;
      ctx.fillStyle = '#acc0d4'; ctx.font = 'bold 12px sans-serif'; ctx.fillText(name, left, y);
      ctx.save(); ctx.beginPath(); ctx.rect(left, top, width, height); ctx.clip();
      ctx.fillStyle = '#2e3c4b'; ctx.fillRect(left, top, width, height);
      ctx.translate(left - dx * zoom, top - dy * zoom); ctx.scale(zoom, zoom);
      if (k !== 1) ctx.drawImage(actual, 0, 0);
      if (k === 1) ctx.drawImage(ref, drawing.left, drawing.top);
      if (k === 2) ctx.drawImage(outline, drawing.left - 1, drawing.top - 1);
      if (k > 0) for (const d of distances) {
        ctx.strokeStyle = '#20ffde'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(...d.target, 2, 0, 2 * Math.PI); ctx.stroke();
        if (k === 2 && d.actual) {
          ctx.strokeStyle = '#ffcf54'; ctx.beginPath(); ctx.moveTo(...d.target); ctx.lineTo(...d.actual); ctx.stroke();
          ctx.fillStyle = '#ffcf54'; ctx.fillRect(d.actual[0] - 1, d.actual[1] - 1, 3, 3);
        }
      }
      ctx.restore();
    });
    ctx.font = 'bold 14px sans-serif'; ctx.fillStyle = iou < refLimits.minIoU ? '#ffb8a7' : '#dcf8dd';
    const baseline = y + 27 + height;
    ctx.fillText('f' + n + '   IoU ' + iou.toFixed(3), x, baseline);
    ctx.font = '13px sans-serif'; ctx.fillStyle = '#d8e4eb';
    for (let j = 0; j < distances.length; j += perLine)
      ctx.fillText(distances.slice(j, j + perLine).map(describe).join('     '), x, baseline + 16 * (1 + j / perLine));
  });
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, canvas.toBuffer('image/png'));
}

export async function refCommand([id, anim, ...args]: string[]) {
  if (!id || !anim) throw new Error('usage: ws ref <id> <anim> [sheet.png --grid CxR --frames a,b,...] [--out file.png]');
  const saved = readPoseRefs(id)[anim];
  const sheet = args[0] && !args[0].startsWith('--') ? resolve(args.shift()!) : saved?.sheet;
  if (!sheet) throw new Error('supply the PNG path, --grid and --frames, or register a sheet in c/' + id + '.ref.json');
  const options: Record<string, string> = {};
  while (args.length) {
    const name = args.shift()!, value = args.shift();
    if (!['--grid', '--frames', '--out'].includes(name) || !value || value.startsWith('--') || Object.hasOwn(options, name))
      throw new Error('invalid or duplicate ref option: ' + name);
    options[name] = value;
  }
  const gridOption = options['--grid'], frameOption = options['--frames'];
  if (gridOption && !/^\d+x\d+$/.test(gridOption)) throw new Error('--grid requires CxR');
  if (frameOption && !/^\d+(,\d+)*$/.test(frameOption)) throw new Error('--frames requires comma-separated nonnegative integers');
  const sameSheet = saved?.sheet === sheet ? saved : undefined;
  const grid = gridOption ? gridOption.split('x').map(Number) as XY : sameSheet?.grid;
  const frames = frameOption ? frameOption.split(',').map(Number) : sameSheet?.frames;
  if (!grid || !frames) throw new Error('a new sheet requires both --grid and --frames');
  const sameCells = sameSheet && grid[0] === sameSheet.grid[0] && grid[1] === sameSheet.grid[1] ? sameSheet : undefined;
  if (sameCells?.keys && frames.length > sameCells.keys.length) throw new Error('more frames than annotated cells');
  const spec = { ...sameCells, sheet, grid, frames, keys: sameCells?.keys?.slice(0, frames.length) };
  const rows = measureRef(await loadPainting(id), anim, spec);
  for (const row of rows)
    console.log('f' + row.n + ' IoU ' + row.iou.toFixed(3) + '  ' + row.distances.map(describe).join('  '));
  const out = options['--out'] ?? join(root, '.studio', id + '-' + anim + '-ref.png');
  if (resolve(out) === sheet) throw new Error('output would overwrite the reference PNG');
  writeReview(id, anim, rows, out);
  console.log(out);
}
