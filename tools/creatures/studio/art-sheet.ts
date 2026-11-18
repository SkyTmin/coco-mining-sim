// Authoring commands use the same row-major, floor-partitioned grid as ws ref.
import { createCanvas } from '@napi-rs/canvas';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';
import { blit, compose, frameCount } from '../engine';
import { loadPainting } from '../render';
import { Px } from '../rig/px';
import type { XY } from '../types';

export function gridOf(text: string | undefined, png: PNG): XY {
  if (!text || !/^\d+x\d+$/.test(text)) throw new Error('expected --grid CxR, e.g. 3x2');
  const [cols, rows] = text.split('x').map(Number);
  if (cols < 1 || rows < 1 || cols > png.width || rows > png.height) throw new Error('grid leaves an empty cell');
  return [cols, rows];
}

export function cellBox(png: PNG, [cols, rows]: XY, index: number) {
  const col = index % cols, row = Math.floor(index / cols);
  const x = Math.floor(col * png.width / cols), y = Math.floor(row * png.height / rows);
  return { x, y, w: Math.floor((col + 1) * png.width / cols) - x, h: Math.floor((row + 1) * png.height / rows) - y };
}

function save(png: PNG, path: string) {
  mkdirSync(dirname(resolve(path)), { recursive: true });
  writeFileSync(path, PNG.sync.write(png));
}

export function appearance(body: Px, lighting: Px) {
  const actor = new Px(body.w, body.h);
  blit(actor, body);
  blit(actor, lighting);
  let left = actor.w, top = actor.h, right = -1, bottom = -1;
  for (let y = 0; y < actor.h; y++) for (let x = 0; x < actor.w; x++) {
    if (!actor.data[(y * actor.w + x) * 4 + 3]) continue;
    left = Math.min(left, x); right = Math.max(right, x);
    top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left) throw new Error('the body + lit layers are empty in this frame');
  const padding = Math.max(2, Math.ceil(Math.max(right - left + 1, bottom - top + 1) * 0.08));
  const w = right - left + 1 + 2 * padding, h = bottom - top + 1 + 2 * padding;
  const base = new Px(w, h);
  for (let i = 0; i < base.data.length; i += 4) base.data.set([255, 0, 255, 255], i);
  blit(base, actor, padding - left, padding - top);
  const out = new PNG({ width: 4 * w, height: 4 * h });
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
    const src = (Math.floor(y / 4) * w + Math.floor(x / 4)) * 4;
    out.data.set(base.data.subarray(src, src + 4), (y * out.width + x) * 4);
  }
  return out;
}

export async function exportRefCommand(args: string[]) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: { out: { type: 'string' } } });
  const [id, anim = 'idle', frame = '0'] = positionals;
  if (!id || positionals.length > 3) throw new Error('expected <id> [anim] [frame]');
  const n = Number(frame);
  const { c, s, b } = await loadPainting(id);
  const clip = c.animations[anim];
  if (!clip || !Number.isInteger(n) || n < 0 || n >= frameCount(clip.seconds)) throw new Error('unknown clip or frame outside clip');
  const { layers } = compose(c, s, b, anim, n / 24);
  const path = values.out ?? join(import.meta.dirname, '..', '.studio', `${id}-${anim}-${n}-ref.png`);
  save(appearance(layers.body, layers.lit), path);
  console.log(path);
}

export function labelSheet(png: PNG, grid: XY, roles: string[]) {
  const [cols, rows] = grid;
  if (roles.length !== cols * rows || roles.some(role => !role.trim())) throw new Error('expected one nonempty role per cell');
  const fontSize = Math.max(10, Math.min(22, Math.round(png.width / cols / 16)));
  const ctx = createCanvas(1, 1).getContext('2d');
  ctx.font = `${fontSize}px sans-serif`;
  const lines = roles.map((role, i) => {
    const room = cellBox(png, grid, i).w - 4;
    const wrapped = [''];
    for (const word of role.trim().split(/\s+/)) {
      const last = wrapped.length - 1;
      if (ctx.measureText([wrapped[last], word].filter(Boolean).join(' ')).width <= room) {
        wrapped[last] = [wrapped[last], word].filter(Boolean).join(' ');
      } else {
        if (wrapped[last]) wrapped.push('');
        for (const ch of word) {
          if (ctx.measureText(wrapped.at(-1)! + ch).width > room && wrapped.at(-1)) wrapped.push('');
          wrapped[wrapped.length - 1] += ch;
        }
      }
    }
    return wrapped;
  });
  const line = fontSize + 4, captionHeight = 8 + Math.max(...lines.map(words => words.length)) * line;
  const out = new PNG({ width: png.width, height: png.height + rows * captionHeight });
  for (let row = 0; row < rows; row++) {
    const { y, h } = cellBox(png, grid, row * cols);
    const top = y + row * captionHeight;
    const stride = png.width * 4;
    png.data.copy(out.data, top * stride, y * stride, (y + h) * stride);
    const strip = createCanvas(png.width, captionHeight);
    const pen = strip.getContext('2d');
    pen.fillStyle = '#20232a'; pen.fillRect(0, 0, png.width, captionHeight);
    pen.font = ctx.font; pen.fillStyle = '#ffffff'; pen.textAlign = 'center'; pen.textBaseline = 'middle';
    for (let col = 0; col < cols; col++) {
      const i = row * cols + col, box = cellBox(png, grid, i);
      lines[i].forEach((word, j) => pen.fillText(word, box.x + box.w / 2, 4 + line * (j + 0.5), box.w - 2));
    }
    out.data.set(pen.getImageData(0, 0, png.width, captionHeight).data, (top + h) * stride);
  }
  return { png: out, captionHeight };
}

export function labelCommand(args: string[]) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    grid: { type: 'string' }, roles: { type: 'string' }, out: { type: 'string' },
  } });
  if (positionals.length !== 1) throw new Error('expected one PNG path');
  const input = positionals[0], png = PNG.sync.read(readFileSync(input));
  const labeled = labelSheet(png, gridOf(values.grid, png), values.roles?.split(';') ?? []);
  const path = values.out ?? input.slice(0, input.length - extname(input).length) + '.labeled.png';
  if (resolve(input) === resolve(path)) throw new Error('the label output must be separate from the raw sheet');
  save(labeled.png, path);
  console.log(JSON.stringify({ path, captionHeight: labeled.captionHeight }));
}
