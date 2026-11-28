// Compact review sheet: the frames that matter (keys, contacts, flagged frames, a few in-betweens),
// cropped to where the action is, ×2, in one PNG. With --against <git-ref> it shows only the frames that
// changed since that commit, old above new. One small picture replaces a GIF plus a dozen screenshots.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { loadPainting } from '../render';
import { playbackKeys } from '../technique';
import { compose, frameCount, hitFrame } from '../engine';
import { findings, sampleAnimation, studioConfig } from './checks';

const tools = join(import.meta.dirname, '..');
type RGBA = [number, number, number, number];
export interface Img {
  w: number;
  h: number;
  data: Uint8Array | Uint8ClampedArray | Buffer;
}

// 3×5 digits, rows top to bottom, 3 bits each.
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];
function text(dst: PNG, x: number, y: number, s: string, c: RGBA, k = 2) {
  for (const ch of s) {
    const g = DIGITS[ch.charCodeAt(0) - 48];
    if (g)
      for (let r = 0; r < 5; r++)
        for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') rect(dst, x + q * k, y + r * k, k, k, c);
    x += 4 * k;
  }
}
function rect(dst: PNG, x: number, y: number, w: number, h: number, c: RGBA) {
  for (let j = Math.max(0, y); j < Math.min(dst.height, y + h); j++)
    for (let i = Math.max(0, x); i < Math.min(dst.width, x + w); i++) {
      const o = 4 * (j * dst.width + i);
      dst.data[o] = c[0];
      dst.data[o + 1] = c[1];
      dst.data[o + 2] = c[2];
      dst.data[o + 3] = c[3];
    }
}
function paste(dst: PNG, src: Img, box: number[], x: number, y: number, k: number) {
  const [bx, by, bw, bh] = box;
  for (let j = 0; j < bh * k; j++)
    for (let i = 0; i < bw * k; i++) {
      const sx = bx + ((i / k) | 0),
        sy = by + ((j / k) | 0);
      if (sx < 0 || sy < 0 || sx >= src.w || sy >= src.h) continue;
      const s = 4 * (sy * src.w + sx),
        d = 4 * ((y + j) * dst.width + x + i);
      dst.data[d] = src.data[s];
      dst.data[d + 1] = src.data[s + 1];
      dst.data[d + 2] = src.data[s + 2];
      dst.data[d + 3] = 255;
    }
}
function frameRect(dst: PNG, x: number, y: number, w: number, h: number, c: RGBA, t = 2) {
  rect(dst, x - t, y - t, w + 2 * t, t, c);
  rect(dst, x - t, y + h, w + 2 * t, t, c);
  rect(dst, x - t, y, t, h, c);
  rect(dst, x + w, y, t, h, c);
}

export const COLORS = {
  bg: [24, 22, 28, 255] as RGBA,
  label: [230, 224, 200, 255] as RGBA,
  hit: [255, 210, 60, 255] as RGBA,
  key: [90, 200, 255, 255] as RGBA,
  error: [235, 64, 64, 255] as RGBA,
  warn: [240, 150, 50, 255] as RGBA,
};

export interface Tile {
  n: number;
  pics: Img[]; // one picture, or old + new
  marks: (keyof typeof COLORS)[];
}

export function layout(tiles: Tile[], box: number[], k: number, maxWidth = 1400) {
  const tw = box[2] * k,
    th = box[3] * k,
    rows = Math.max(...tiles.map((t) => t.pics.length));
  const cellW = tw + 8,
    cellH = rows * (th + 4) + 18;
  const cols = Math.max(1, Math.min(tiles.length, Math.floor(maxWidth / cellW)));
  const png = new PNG({ width: cols * cellW + 4, height: Math.ceil(tiles.length / cols) * cellH + 4 });
  rect(png, 0, 0, png.width, png.height, COLORS.bg);
  tiles.forEach((t, i) => {
    const x = 6 + (i % cols) * cellW,
      y = 4 + Math.floor(i / cols) * cellH;
    text(png, x, y, String(t.n), COLORS.label);
    t.marks.forEach((m, j) => rect(png, x + tw - 10 - j * 12, y, 10, 10, COLORS[m]));
    t.pics.forEach((p, r) => {
      const py = y + 14 + r * (th + 4);
      paste(png, p, box, x, py, k);
      const border = t.marks.includes('error') ? 'error' : t.marks.includes('warn') ? 'warn' : null;
      if (border) frameRect(png, x, py, tw, th, COLORS[border]);
    });
  });
  return png;
}

/** Bounding box of everything that is not background/frame, over the chosen frames, plus a margin. */
export function actionBox(frames: { layers: Record<string, Img> }[], W: number, H: number, margin = 8) {
  let x0 = W,
    y0 = H,
    x1 = -1,
    y1 = -1;
  for (const f of frames)
    for (const name of ['body', 'lit', 'fxu', 'fxo', 'light', 'over']) {
      const p = f.layers[name];
      if (!p) continue;
      for (let y = 0; y < p.h; y++)
        for (let x = 0; x < p.w; x++)
          if (p.data[4 * (y * p.w + x) + 3] > 0) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
    }
  if (x1 < 0) return [0, 0, W, H];
  x0 = Math.max(0, x0 - margin);
  y0 = Math.max(0, y0 - margin);
  x1 = Math.min(W - 1, x1 + margin);
  y1 = Math.min(H - 1, y1 + margin);
  return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}

/** A limb or effect in the old pose can extend beyond the new pose's crop. */
function comparisonBox(tiles: Tile[], box: number[], margin = 8) {
  let [left, top, w, h] = box;
  let right = left + w, bottom = top + h;
  for (const { pics } of tiles) {
    if (pics.length !== 2) continue;
    const [old, now] = pics;
    if (old.w !== now.w || old.h !== now.h) {
      left = top = 0;
      right = Math.max(right, old.w, now.w);
      bottom = Math.max(bottom, old.h, now.h);
      continue;
    }
    const a = old.data, b = now.data;
    for (let y = 0; y < old.h; y++) {
      for (let x = 0; x < old.w; x++) {
        const i = (y * old.w + x) * 4;
        if (a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2] && a[i + 3] === b[i + 3])
          continue;
        left = Math.min(left, Math.max(0, x - margin));
        top = Math.min(top, Math.max(0, y - margin));
        right = Math.max(right, Math.min(old.w, x + margin + 1));
        bottom = Math.max(bottom, Math.min(old.h, y + margin + 1));
      }
    }
  }
  return [left, top, right - left, bottom - top];
}

function option(args: string[], name: string) {
  const i = args.indexOf(name);
  return i < 0 ? undefined : args[i + 1];
}

/** Renders frames of an older commit through its own pipeline (git worktree), returns pictures by frame. */
function framesAt(ref: string, id: string, anim: string, frames: number[]): Map<number, Img> {
  const sha = execFileSync('git', ['rev-parse', '--short', ref], { cwd: tools }).toString().trim();
  const dir = join(tmpdir(), 'ws-tree-' + sha);
  if (!existsSync(dir)) execFileSync('git', ['worktree', 'add', '--detach', dir, sha], { cwd: tools, stdio: 'ignore' });
  const oldTools = join(dir, 'tools/creatures');
  if (!existsSync(join(oldTools, 'node_modules'))) symlinkSync(join(tools, 'node_modules'), join(oldTools, 'node_modules'));
  const out = join(dir, '.ws-dump-' + id + '-' + anim);
  mkdirSync(out, { recursive: true });
  const r = spawnSync(process.execPath, ['--import', 'tsx', join(tools, 'studio/dump.ts'), oldTools, id, anim, frames.join(','), out], {
    cwd: tools,
    encoding: 'utf8',
  });
  if (r.status) throw new Error('old render failed: ' + (r.stderr || '').slice(-1500));
  const map = new Map<number, Img>();
  for (const n of frames) {
    const f = join(out, n + '.png');
    if (!existsSync(f)) continue;
    const png = PNG.sync.read(readFileSync(f));
    map.set(n, { w: png.width, h: png.height, data: png.data });
  }
  return map;
}

export async function sheetCommand(args: string[]) {
  const [id, anim] = args;
  if (!id || !anim) throw new Error('usage: ws sheet <id> <anim> [--frames a,b] [--every N] [--against ref] [--scale 2] [--out file]');
  const painting = await loadPainting(id);
  const { c, s, b } = painting;
  const spec = c.animations[anim];
  if (!spec) throw new Error(`${id} has no animation ${anim}`);
  const count = frameCount(spec.seconds);
  const askedScale = option(args, '--scale');
  const hits = new Set((spec.hits ?? []).map(hitFrame));
  const technique = c.techniques?.[anim];
  const keys = new Set((technique ? playbackKeys(technique) : []).map((x) => x.frame));
  const marks = new Map<number, Set<keyof typeof COLORS>>();
  const mark = (n: number, m: keyof typeof COLORS) => {
    if (!marks.has(n)) marks.set(n, new Set());
    marks.get(n)!.add(m);
  };
  hits.forEach((n) => mark(n, 'hit'));
  keys.forEach((n) => mark(n, 'key'));
  if (!args.includes('--no-check')) {
    const cfg = studioConfig(id);
    for (const f of findings(painting, anim, sampleAnimation(painting, anim, cfg), cfg)) {
      // a long flagged run is shown by its ends and its middle, not frame by frame
      const runs: number[][] = [];
      for (const n of f.frames) {
        const last = runs[runs.length - 1];
        if (last && n === last[last.length - 1] + 1) last.push(n);
        else runs.push([n]);
      }
      for (const r of runs)
        for (const n of new Set([r[0], r[r.length >> 1], r[r.length - 1]])) mark(n, f.level === 'error' ? 'error' : 'warn');
    }
  }
  let chosen: number[];
  const listed = option(args, '--frames');
  if (listed) chosen = listed.split(',').map(Number);
  else {
    const every = Number(option(args, '--every') ?? Math.max(1, Math.ceil(count / 8)));
    const set = new Set<number>([...marks.keys()]);
    for (let n = 0; n < count; n += every) set.add(n);
    set.add(count - 1);
    chosen = [...set].filter((n) => n >= 0 && n < count).sort((a, z) => a - z);
    // keep the sheet small: marked frames first, in-betweens fill up to 18
    const cap = 18;
    if (chosen.length > cap) {
      const must = chosen.filter((n) => marks.has(n));
      const rest = chosen.filter((n) => !marks.has(n));
      const room = Math.max(0, cap - must.length);
      chosen = [...must, ...rest.filter((_, i) => room > 0 && i % Math.ceil(rest.length / room) === 0)].sort((a, z) => a - z);
    }
  }
  const now = new Map(chosen.map((n) => [n, compose(c, s, b, anim, n / 24)]));
  const any = now.values().next().value!;
  let box = actionBox([...now.values()] as never, any.picture.w, any.picture.h);
  let tiles: Tile[];
  const against = option(args, '--against');
  if (against) {
    const old = framesAt(against, id, anim, chosen);
    tiles = [];
    for (const n of chosen) {
      const a = old.get(n),
        z = now.get(n)!.picture;
      const same = a && a.w === z.w && a.h === z.h && Buffer.compare(Buffer.from(a.data), Buffer.from(z.data)) === 0;
      if (!same) tiles.push({ n, pics: a ? [a, z] : [z], marks: [...(marks.get(n) ?? [])] });
    }
    if (!tiles.length) {
      console.log(`${id} ${anim}: no visible change against ${against} in ${chosen.length} sampled frames`);
      return;
    }
    box = comparisonBox(tiles, box);
  } else tiles = chosen.map((n) => ({ n, pics: [now.get(n)!.picture], marks: [...(marks.get(n) ?? [])] }));
  // ×2 for small crops, ×1 when the action spans most of the painting: the sheet stays near 1 MP
  const k = Number(askedScale ?? (box[2] * box[3] <= 180 * 150 ? 2 : 1));
  const png = layout(tiles, box, k);
  const out = option(args, '--out') ?? join(tools, '.studio', `${id}-${anim}${against ? '-diff' : ''}.png`);
  mkdirSync(join(out, '..'), { recursive: true });
  writeFileSync(out, PNG.sync.write(png));
  console.log(`${out}  ${png.width}×${png.height}  frames ${tiles.map((t) => t.n).join(',')}`);
  console.log('legend: yellow = contact, blue = key pose, red border = error, orange border = warning' + (against ? '; old above new' : ''));
}
